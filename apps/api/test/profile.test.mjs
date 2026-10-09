/* global fetch */
import 'reflect-metadata';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Module, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

const require = createRequire(import.meta.url);
const { hash, compare } = require('bcryptjs');
const { JwtService } = require('@nestjs/jwt');
const { UsersService } = require('../dist/users/users.service.js');
const { UsersController } = require('../dist/users/users.controller.js');
const { UpdateProfileDto } = require('../dist/users/dto/update-profile.dto.js');
const { ChangePasswordDto } = require('../dist/auth/dto/change-password.dto.js');
const { AuthService } = require('../dist/auth/auth.service.js');
const { JwtAuthGuard } = require('../dist/common/guards/jwt-auth.guard.js');
const { PrismaService } = require('../dist/prisma/prisma.service.js');
const { ResponseInterceptor } = require('../dist/common/interceptors/response.interceptor.js');
const { HttpExceptionFilter } = require('../dist/common/filters/http-exception.filter.js');

function fixture() {
  const row = {
    id: 'owner',
    email: 'owner@example.com',
    nickname: '原昵称',
    gender: 'UNSPECIFIED',
    avatarUrl: 'http://localhost:3000/uploads/owner/old.jpg',
    passwordHash: 'private',
    tokenVersion: 0,
    goalType: null,
    goalStartWeight: null,
    targetWeight: null,
    targetDate: null,
    goalStartedAt: null,
    createdAt: new Date('2026-10-01T00:00:00Z'),
    updatedAt: new Date('2026-10-01T00:00:00Z'),
  };
  const prisma = {
    user: {
      findUnique: async ({ where }) => (where.id === row.id ? { ...row } : null),
      update: async ({ where, data }) => {
        assert.equal(where.id, 'owner');
        Object.assign(row, data);
        return { ...row };
      },
      updateMany: async ({ where, data }) => {
        if (where.id !== row.id || where.passwordHash !== row.passwordHash) return { count: 0 };
        row.passwordHash = data.passwordHash;
        row.tokenVersion += data.tokenVersion.increment;
        return { count: 1 };
      },
    },
  };
  const users = new UsersService(prisma);
  const auth = new AuthService(users, {}, { limit: async () => {} }, {});
  return { row, prisma, users, auth };
}

test('profile saves nickname, gender and avatar without changing email, password or goal', async () => {
  const { row, users } = fixture();
  const changed = await users.updateProfile('owner', {
    nickname: '新的昵称',
    gender: 'FEMALE',
    avatarUrl: 'http://localhost:3000/uploads/2026/10/09/owner/avatar.jpg',
    email: 'attacker@example.com',
    passwordHash: 'attacker',
    tokenVersion: 999,
  });
  assert.equal(changed.nickname, '新的昵称');
  assert.equal(changed.gender, 'FEMALE');
  assert.equal(changed.avatarUrl, row.avatarUrl);
  assert.equal(changed.email, 'owner@example.com');
  assert.equal(row.passwordHash, 'private');
  assert.equal(row.tokenVersion, 0);
  assert.equal(changed.goal, null);
  assert.equal('passwordHash' in changed, false);
  assert.equal('tokenVersion' in changed, false);
  const cleared = await users.updateProfile('owner', { avatarUrl: null });
  assert.equal(cleared.avatarUrl, null);
  assert.equal(cleared.nickname, '新的昵称');
  assert.equal(cleared.gender, 'FEMALE');
});

test('profile validation trims names and rejects empty names, invalid gender, unsafe URLs and identity fields', async () => {
  const options = { whitelist: true, forbidNonWhitelisted: true };
  const valid = plainToInstance(UpdateProfileDto, {
    nickname: '  昵称  ',
    gender: 'MALE',
    avatarUrl: null,
  });
  assert.equal(valid.nickname, '昵称');
  assert.deepEqual(await validate(valid, options), []);
  for (const input of [
    { nickname: '   ' },
    { nickname: 'a'.repeat(41) },
    { nickname: null },
    { gender: 'INVALID' },
    { gender: null },
    { avatarUrl: 'javascript:alert(1)' },
    { avatarUrl: 'data:image/png;base64,AAAA' },
    { userId: 'other' },
    { email: 'other@example.com' },
  ]) {
    assert.ok((await validate(plainToInstance(UpdateProfileDto, input), options)).length > 0);
  }
  assert.deepEqual(
    await validate(
      plainToInstance(UpdateProfileDto, { avatarUrl: 'http://localhost:3000/uploads/a.jpg' }),
      options,
    ),
    [],
  );
});

test('authenticated profile API saves and reloads changes and rejects client-selected identity', async (t) => {
  const f = fixture();
  class TestModule {}
  Module({
    controllers: [UsersController],
    providers: [
      JwtAuthGuard,
      { provide: UsersService, useValue: f.users },
      { provide: PrismaService, useValue: f.prisma },
      {
        provide: JwtService,
        useValue: {
          verifyAsync: async (token) => {
            assert.equal(token, 'valid');
            return { sub: 'owner' };
          },
        },
      },
    ],
  })(TestModule);
  const app = await NestFactory.create(TestModule, { logger: false, abortOnError: false });
  t.after(() => app.close());
  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalPipes(
    new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
  );
  await app.listen(0, '127.0.0.1');
  const url = `${await app.getUrl()}/api/v1/users/me/profile`;
  const headers = { Authorization: 'Bearer valid', 'Content-Type': 'application/json' };
  const saved = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ nickname: '  新昵称  ', gender: 'MALE', avatarUrl: null }),
  });
  assert.equal(saved.status, 200);
  const body = await saved.json();
  assert.equal(body.code, 'OK');
  assert.equal(body.data.nickname, '新昵称');
  assert.equal(body.data.gender, 'MALE');
  assert.deepEqual(await f.users.findPublicById('owner'), body.data);
  const forbidden = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ userId: 'other', nickname: '非法修改' }),
  });
  assert.equal(forbidden.status, 400);
  assert.equal(f.row.nickname, '新昵称');
  assert.equal(
    (
      await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
    ).status,
    401,
  );
});

test('wrong current password stays a business error and does not invalidate the account', async () => {
  const f = fixture();
  f.row.passwordHash = await hash('old-password', 4);
  await assert.rejects(
    f.auth.changePassword('owner', { currentPassword: 'wrong-password', password: 'new-password' }),
    (error) =>
      error.getStatus() === 400 && error.getResponse().code === 'CURRENT_PASSWORD_INCORRECT',
  );
  assert.equal(f.row.tokenVersion, 0);
  assert.equal(await compare('old-password', f.row.passwordHash), true);
  await assert.rejects(
    f.auth.changePassword('owner', { currentPassword: 'old-password', password: 'old-password' }),
    (error) => error.getResponse().code === 'PASSWORD_UNCHANGED',
  );
});

test('password change hashes the new password and invalidates previous JWT versions', async () => {
  const f = fixture();
  f.row.passwordHash = await hash('old-password', 4);
  await f.auth.changePassword('owner', {
    currentPassword: 'old-password',
    password: 'new-password',
  });
  assert.equal(await compare('new-password', f.row.passwordHash), true);
  assert.equal(await compare('old-password', f.row.passwordHash), false);
  assert.equal(f.row.tokenVersion, 1);
  const guard = new JwtAuthGuard({ verifyAsync: async () => ({ sub: 'owner', ver: 0 }) }, f.prisma);
  await assert.rejects(
    guard.canActivate({
      switchToHttp: () => ({ getRequest: () => ({ headers: { authorization: 'Bearer old' } }) }),
    }),
    (error) => error.getResponse().code === 'UNAUTHORIZED',
  );
  const invalid = plainToInstance(ChangePasswordDto, {
    currentPassword: 'short',
    password: 'short',
  });
  assert.ok((await validate(invalid)).length > 0);
});

test('concurrent password changes cannot overwrite a password that already changed', async () => {
  const f = fixture();
  f.row.passwordHash = await hash('old-password', 4);
  const settled = await Promise.allSettled([
    f.auth.changePassword('owner', { currentPassword: 'old-password', password: 'new-password-a' }),
    f.auth.changePassword('owner', { currentPassword: 'old-password', password: 'new-password-b' }),
  ]);
  assert.equal(settled.filter(({ status }) => status === 'fulfilled').length, 1);
  assert.equal(
    settled.find(({ status }) => status === 'rejected').reason.getResponse().code,
    'PASSWORD_CHANGED',
  );
  assert.equal(f.row.tokenVersion, 1);
});
