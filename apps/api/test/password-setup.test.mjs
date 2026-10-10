/* global structuredClone, fetch */
import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { Module, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
const require = createRequire(import.meta.url);
const { JwtService } = require('@nestjs/jwt');
const { hash, compare } = require('bcryptjs');
const { AuthService } = require('../dist/auth/auth.service.js');
const { AuthController } = require('../dist/auth/auth.controller.js');
const { AuthSessionService } = require('../dist/auth/auth-session.service.js');
const { AuthSecurityService } = require('../dist/auth/auth-security.service.js');
const { EmailVerificationService } = require('../dist/auth/email-verification.service.js');
const { EmailCaptchaService } = require('../dist/auth/email-captcha.service.js');
const { UsersService } = require('../dist/users/users.service.js');
const { PrismaService } = require('../dist/prisma/prisma.service.js');
const { JwtAuthGuard } = require('../dist/common/guards/jwt-auth.guard.js');
const { ResponseInterceptor } = require('../dist/common/interceptors/response.interceptor.js');
const { HttpExceptionFilter } = require('../dist/common/filters/http-exception.filter.js');
const codeError = (code) => (error) => error.getResponse().code === code;

async function fixture(hasPassword = false) {
  const makeUser = (id) => ({
    id,
    email: `${id}@example.invalid`,
    hasPassword,
    passwordHash: '',
    tokenVersion: 0,
    nickname: null,
    avatarUrl: null,
    gender: 'UNSPECIFIED',
    goalType: null,
    goalStartWeight: null,
    targetWeight: null,
    targetDate: null,
    goalStartedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  let state = {
    users: new Map([
      ['owner', makeUser('owner')],
      ['other', makeUser('other')],
    ]),
    codes: new Map(),
    sessions: [],
  };
  for (const user of state.users.values()) user.passwordHash = await hash('old-password', 4);
  let queue = Promise.resolve();
  let failSession = false;
  const codesKey = ({ email, purpose }) => `${email}:${purpose}`;
  const prisma = {
    user: {
      findUnique: async ({ where }) => {
        const row = where.id
          ? state.users.get(where.id)
          : [...state.users.values()].find((row) => row.email === where.email);
        return row ? { ...row } : null;
      },
      updateMany: async ({ where, data }) => {
        const row = state.users.get(where.id);
        if (
          !row ||
          row.passwordHash !== where.passwordHash ||
          row.tokenVersion !== where.tokenVersion
        )
          return { count: 0 };
        Object.assign(row, {
          ...data,
          tokenVersion: row.tokenVersion + data.tokenVersion.increment,
        });
        return { count: 1 };
      },
    },
    emailVerification: {
      upsert: async ({ create, update }) => {
        const current = state.codes.get(codesKey(create));
        const row = current ? { ...current, ...update } : { id: randomUUID(), ...create };
        state.codes.set(codesKey(row), row);
        return { ...row };
      },
      update: async ({ where, data }) => {
        const row = where.id
          ? [...state.codes.values()].find((row) => row.id === where.id)
          : state.codes.get(codesKey(where.email_purpose));
        for (const [key, value] of Object.entries(data)) {
          if (key === 'attempts' && typeof value === 'object') row.attempts += value.increment;
          else row[key] = value;
        }
        return { ...row };
      },
    },
    authSession: {
      create: async ({ data }) => {
        if (failSession) throw new Error('session write failed');
        const row = { id: randomUUID(), revokedAt: null, ...data };
        state.sessions.push(row);
        return row;
      },
      findUnique: async ({ where }) => {
        const row = state.sessions.find((row) =>
          where.id ? row.id === where.id : row.tokenHash === where.tokenHash,
        );
        return row
          ? { ...row, user: { tokenVersion: state.users.get(row.userId).tokenVersion } }
          : null;
      },
      updateMany: async ({ where, data }) => {
        let count = 0;
        for (const row of state.sessions) {
          if (
            (where.userId && where.userId !== row.userId) ||
            (where.id && where.id !== row.id) ||
            (where.tokenHash && where.tokenHash !== row.tokenHash) ||
            row.revokedAt
          )
            continue;
          Object.assign(row, data);
          count++;
        }
        return { count };
      },
    },
    $queryRaw: async (_, email, purpose) => {
      const row = state.codes.get(codesKey({ email, purpose }));
      return row ? [{ ...row }] : [];
    },
    $transaction: (action) => {
      const result = queue.then(async () => {
        const previous = structuredClone(state);
        try {
          return await action(prisma);
        } catch (error) {
          state = previous;
          throw error;
        }
      });
      queue = result.catch(() => undefined);
      return result;
    },
  };
  const security = new AuthSecurityService(prisma, { get: () => 'test-only-secret' });
  security.limit = async () => {};
  security.reserveEmailCode = async () => [];
  security.cleanup = async () => {};
  security.needsCaptcha = async () => false;
  security.loginSucceeded = async () => {};
  const sent = [];
  const verification = new EmailVerificationService(
    prisma,
    security,
    {
      assertConfigured() {},
      sendCode: async (...args) => sent.push(args),
    },
    { verify: async () => {} },
  );
  const users = new UsersService(prisma);
  const jwt = new JwtService({ secret: 'test-only-secret', signOptions: { expiresIn: 900 } });
  const sessions = new AuthSessionService(prisma, users, jwt);
  const auth = new AuthService(users, sessions, security, verification);
  const current = await sessions.create(await users.findPublicById('owner'), 0);
  const second = await sessions.create(await users.findPublicById('owner'), 0);
  const other = await sessions.create(await users.findPublicById('other'), 0);
  const payload = jwt.verify(current.accessToken);
  const guard = new JwtAuthGuard(jwt, prisma);
  const check = (token) =>
    guard.canActivate({
      switchToHttp: () => ({
        getRequest: () => ({ headers: { authorization: `Bearer ${token}` } }),
      }),
    });
  return {
    prisma,
    security,
    verification,
    users,
    jwt,
    sessions,
    auth,
    current,
    second,
    other,
    payload,
    sent,
    check,
    state: () => state,
    code: () => sent.at(-1)[2],
    row: () => state.codes.get('owner@example.invalid:RESET_PASSWORD'),
    failSession: (value) => {
      failSession = value;
    },
    grant: async () => {
      await auth.sendPasswordCode(payload, 'ip');
      return (await auth.verifyPasswordCode(payload, { emailCode: sent.at(-1)[2] }, 'ip'))
        .resetToken;
    },
  };
}

test('email setup requires verification and marks password set while keeping only the current device signed in', async () => {
  const f = await fixture();
  const untouched = structuredClone(f.state().users.get('other'));
  await assert.rejects(
    f.auth.setPassword(f.payload, { resetToken: randomUUID(), password: 'new-password' }, 'ip'),
    codeError('RESET_VERIFICATION_INVALID'),
  );
  assert.equal(f.state().users.get('owner').hasPassword, false);
  const resetToken = await f.grant();
  assert.equal(f.sent[0][0], 'owner@example.invalid');
  const result = await f.auth.setPassword(
    f.payload,
    { resetToken, password: 'new-password' },
    'ip',
  );
  assert.equal(result.user.hasPassword, true);
  assert.equal(await compare('new-password', f.state().users.get('owner').passwordHash), true);
  assert.equal(f.state().users.get('owner').tokenVersion, 1);
  assert.equal(await f.check(result.accessToken), true);
  assert.equal((await f.sessions.refresh(result.refreshToken)).user.hasPassword, true);
  for (const old of [f.current, f.second]) {
    await assert.rejects(f.check(old.accessToken), codeError('UNAUTHORIZED'));
    await assert.rejects(f.sessions.refresh(old.refreshToken), codeError('UNAUTHORIZED'));
  }
  assert.equal(await f.check(f.other.accessToken), true);
  assert.deepEqual(f.state().users.get('other'), untouched);
  assert.notEqual(result.refreshToken, f.current.refreshToken);
  assert.notEqual(f.state().sessions.at(-1).tokenHash, result.refreshToken);
  await assert.rejects(
    f.auth.setPassword(
      f.jwt.verify(result.accessToken),
      { resetToken, password: 'another-password' },
      'ip',
    ),
    codeError('RESET_VERIFICATION_INVALID'),
  );
});

test('expired grant and login-purpose code cannot set a password', async () => {
  const f = await fixture();
  await f.verification.send('owner@example.invalid', 'LOGIN', 'ip');
  await assert.rejects(
    f.auth.verifyPasswordCode(f.payload, { emailCode: f.code() }, 'ip'),
    codeError('EMAIL_CODE_EXPIRED'),
  );
  const resetToken = await f.grant();
  f.row().expiresAt = new Date(0);
  await assert.rejects(
    f.auth.setPassword(f.payload, { resetToken, password: 'new-password' }, 'ip'),
    codeError('RESET_VERIFICATION_INVALID'),
  );
  assert.equal(f.state().users.get('owner').tokenVersion, 0);
});

test('session creation failure rolls back password, verification grant and session revocations', async () => {
  const f = await fixture();
  const resetToken = await f.grant();
  f.failSession(true);
  await assert.rejects(
    f.auth.setPassword(f.payload, { resetToken, password: 'new-password' }, 'ip'),
    /session write failed/,
  );
  assert.equal(f.state().users.get('owner').hasPassword, false);
  assert.equal(f.state().users.get('owner').tokenVersion, 0);
  assert.equal(f.row().consumedAt, null);
  assert.equal(await f.check(f.current.accessToken), true);
  assert.equal(await f.check(f.second.accessToken), true);
  f.failSession(false);
  const result = await f.auth.setPassword(
    f.payload,
    { resetToken, password: 'new-password' },
    'ip',
  );
  assert.equal(await f.check(result.accessToken), true);
});

test('current-password change preserves login and concurrent attempts cannot overwrite it', async () => {
  const f = await fixture(true);
  await assert.rejects(
    f.auth.changePasswordWithSession(f.payload, {
      currentPassword: 'wrong-password',
      password: 'new-password',
    }),
    codeError('CURRENT_PASSWORD_INCORRECT'),
  );
  await assert.rejects(
    f.auth.changePasswordWithSession(f.payload, {
      currentPassword: 'old-password',
      password: 'old-password',
    }),
    codeError('PASSWORD_UNCHANGED'),
  );
  const results = await Promise.allSettled([
    f.auth.changePasswordWithSession(f.payload, {
      currentPassword: 'old-password',
      password: 'new-password-a',
    }),
    f.auth.changePasswordWithSession(f.payload, {
      currentPassword: 'old-password',
      password: 'new-password-b',
    }),
  ]);
  assert.equal(results.filter((row) => row.status === 'fulfilled').length, 1);
  const result = results.find((row) => row.status === 'fulfilled').value;
  assert.equal(await f.check(result.accessToken), true);
  assert.equal(f.state().users.get('owner').tokenVersion, 1);
  assert.equal(
    f.state().sessions.filter((row) => row.userId === 'owner' && !row.revokedAt).length,
    1,
  );
});

test('legacy accounts can use email verification; grants stay bound to their account and revoked sessions cannot use them', async () => {
  const f = await fixture(null);
  assert.equal((await f.users.findPublicById('owner')).hasPassword, null);
  const resetToken = await f.grant();
  await assert.rejects(
    f.auth.setPassword(
      f.jwt.verify(f.other.accessToken),
      { resetToken, password: 'new-password' },
      'ip',
    ),
    codeError('RESET_VERIFICATION_INVALID'),
  );
  await f.sessions.logout(f.current.refreshToken);
  await assert.rejects(
    f.auth.setPassword(f.payload, { resetToken, password: 'new-password' }, 'ip'),
    codeError('UNAUTHORIZED'),
  );
  assert.equal(f.row().consumedAt, null);
  assert.equal(f.state().users.get('owner').tokenVersion, 0);
});

test('password HTTP routes require authentication, reject client identity and complete two-step setup', async () => {
  const f = await fixture();
  class TestModule {}
  Module({
    controllers: [AuthController],
    providers: [
      [AuthService, f.auth],
      [UsersService, f.users],
      [AuthSecurityService, f.security],
      [EmailVerificationService, f.verification],
      [AuthSessionService, f.sessions],
      [EmailCaptchaService, { getConfig: () => ({ enabled: false }) }],
      [PrismaService, f.prisma],
      [JwtService, f.jwt],
    ].map(([provide, useValue]) => ({ provide, useValue })),
  })(TestModule);
  const app = await NestFactory.create(TestModule, { logger: false, abortOnError: false });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  try {
    await app.listen(0, '127.0.0.1');
    const base = `${await app.getUrl()}/api/v1/auth/password`;
    const request = (path, body = {}, token = f.current.accessToken, method = 'POST') =>
      fetch(`${base}/${path}`, {
        method: method === 'PATCH' ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
    for (const [path, method] of [
      ['email-code', 'POST'],
      ['verify-code', 'POST'],
      ['email', 'PATCH'],
      ['session', 'PATCH'],
    ]) {
      assert.equal((await request(path, {}, null, method)).status, 401);
    }
    assert.equal((await request('email-code', { email: 'other@example.invalid' })).status, 400);
    assert.equal((await request('email-code', {})).status, 201);
    assert.equal(f.sent.at(-1)[0], 'owner@example.invalid');
    for (const bad of [
      { emailCode: f.code(), email: 'other@example.invalid' },
      { emailCode: '12' },
      { emailCode: f.code(), userId: 'other' },
    ]) {
      assert.equal((await request('verify-code', bad)).status, 400);
    }
    const verified = await (await request('verify-code', { emailCode: f.code() })).json();
    const input = { resetToken: verified.data.resetToken, password: 'new-password' };
    assert.equal(
      (
        await request(
          'email',
          { ...input, email: 'other@example.invalid' },
          f.current.accessToken,
          'PATCH',
        )
      ).status,
      400,
    );
    const saved = await request('email', input, f.current.accessToken, 'PATCH');
    assert.equal(saved.status, 200);
    const result = await saved.json();
    assert.equal(result.code, 'OK');
    assert.equal(result.data.user.hasPassword, true);
    assert.equal(await f.check(result.data.accessToken), true);
    assert.deepEqual(Object.keys(result).sort(), ['code', 'data', 'message', 'meta']);
  } finally {
    await app.close();
  }
});
