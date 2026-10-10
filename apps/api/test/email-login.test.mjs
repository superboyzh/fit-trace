/* global fetch, structuredClone */
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
const { ResponseInterceptor } = require('../dist/common/interceptors/response.interceptor.js');
const { HttpExceptionFilter } = require('../dist/common/filters/http-exception.filter.js');
const codeError = (code) => (error) => error.getResponse().code === code;
const email = 'login@example.invalid';
const input = (emailCode, acceptedTerms = true) => ({ email, emailCode, acceptedTerms });

// 使用真实验证、用户映射与会话服务；数据库替身提供串行事务和回滚，不连接真实库或 SMTP。
function fixture(existingUser = null) {
  let state = { user: existingUser, codes: new Map(), sessions: [] };
  let queue = Promise.resolve();
  let failSession = false;
  const sent = [];
  const limits = [];
  const key = ({ email, purpose }) => `${email}:${purpose}`;
  const prisma = {
    user: {
      findUnique: async ({ where }) =>
        state.user && (state.user.email === where.email || state.user.id === where.id)
          ? { ...state.user }
          : null,
      upsert: async ({ create, update }) => {
        assert.deepEqual(update, {});
        state.user ??= {
          id: randomUUID(),
          ...create,
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
        };
        return { ...state.user };
      },
    },
    emailVerification: {
      upsert: async ({ create, update }) => {
        const current = state.codes.get(key(create));
        const row = current ? { ...current, ...update } : { id: randomUUID(), ...create };
        state.codes.set(key(row), row);
        return { ...row };
      },
      update: async ({ where, data }) => {
        const row = Array.from(state.codes.values()).find((row) => row.id === where.id);
        for (const [field, value] of Object.entries(data)) {
          if (field === 'attempts' && typeof value === 'object') row.attempts += value.increment;
          else row[field] = value;
        }
        return { ...row };
      },
      deleteMany: async ({ where }) => {
        for (const [key, row] of state.codes) {
          if (row.id === where.id && row.codeHash === where.codeHash) state.codes.delete(key);
        }
      },
    },
    authSession: {
      create: async ({ data }) => {
        if (failSession) throw new Error('session write failed');
        const row = { id: randomUUID(), ...data };
        state.sessions.push(row);
        return row;
      },
    },
    authRateLimit: { deleteMany: async () => ({ count: 0 }) },
    $queryRaw: async (_, email, purpose) => {
      const row = state.codes.get(key({ email, purpose }));
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
  security.limit = async (...args) => limits.push(args);
  security.reserveEmailCode = async () => [];
  security.releaseEmailCode = async () => {};
  security.cleanup = async () => {};
  const verification = new EmailVerificationService(
    prisma,
    security,
    {
      assertConfigured() {},
      sendCode: async (email, purpose, code) => sent.push({ email, purpose, code }),
    },
    { verify: async () => {} },
  );
  const users = new UsersService(prisma);
  const jwt = new JwtService({ secret: 'test-only-secret', signOptions: { expiresIn: 900 } });
  const sessions = new AuthSessionService(prisma, users, jwt);
  const auth = new AuthService(users, sessions, security, verification);
  return {
    prisma,
    security,
    verification,
    users,
    jwt,
    sessions,
    auth,
    sent,
    limits,
    state: () => state,
    row: (purpose = 'LOGIN') => state.codes.get(key({ email, purpose })),
    code: () => sent.at(-1).code,
    failSession: (value) => {
      failSession = value;
    },
  };
}

test('email login registers only after verification and returns a persistent device session', async () => {
  const f = fixture();
  assert.deepEqual(await f.verification.send(email, 'LOGIN', 'ip'), {
    retryAfterSeconds: 60,
    expiresInSeconds: 600,
  });
  assert.equal(f.state().user, null);
  const result = await f.auth.loginByEmail(input(f.code()), 'ip');
  assert.equal(result.user.email, email);
  assert.equal(result.user.nickname, null);
  assert.equal(result.user.hasPassword, false);
  assert.equal('passwordHash' in result.user, false);
  assert.match(result.refreshToken, /^[a-f0-9]{64}$/);
  assert.notEqual(f.state().sessions[0].tokenHash, result.refreshToken);
  assert.equal(f.jwt.verify(result.accessToken).sid, f.state().sessions[0].id);
  assert.ok(new Date(result.accessTokenExpiresAt) > new Date());
  assert.equal(await compare('12345678', f.state().user.passwordHash), false);
  assert.ok(f.row().consumedAt);
  assert.ok(f.limits.some(([scope]) => scope === 'email-login-email'));
});

test('existing account receives LOGIN code and keeps its password, profile and token version', async () => {
  const first = fixture();
  await first.verification.send(email, 'LOGIN', 'ip');
  await first.auth.loginByEmail(input(first.code()), 'ip');
  const existing = {
    ...first.state().user,
    passwordHash: await hash('existing-password', 4),
    nickname: '已有用户',
    tokenVersion: 7,
  };
  const f = fixture(existing);
  await f.verification.send(email, 'LOGIN', 'ip');
  assert.equal(f.sent.length, 1);
  const result = await f.auth.loginByEmail(input(f.code()), 'ip');
  assert.equal(result.user.id, existing.id);
  assert.equal(result.user.nickname, existing.nickname);
  assert.deepEqual(f.state().user, existing);
  assert.equal(f.jwt.verify(result.accessToken).ver, 7);
});

test('consent is required before consuming the code or creating an account', async () => {
  const f = fixture();
  await f.verification.send(email, 'LOGIN', 'ip');
  for (const consent of [false, undefined, 'true']) {
    await assert.rejects(
      f.auth.loginByEmail({ ...input(f.code()), acceptedTerms: consent }, 'ip'),
      codeError('AGREEMENT_REQUIRED'),
    );
  }
  assert.equal(f.row().consumedAt, null);
  assert.equal(f.state().user, null);
  assert.equal(f.state().sessions.length, 0);
});

test('registration/reset codes and expired codes cannot be used for login', async () => {
  const f = fixture();
  await f.verification.send(email, 'REGISTER', 'ip');
  await assert.rejects(f.auth.loginByEmail(input(f.code()), 'ip'), codeError('EMAIL_CODE_EXPIRED'));
  await f.verification.send(email, 'LOGIN', 'ip');
  f.row().expiresAt = new Date(0);
  await assert.rejects(f.auth.loginByEmail(input(f.code()), 'ip'), codeError('EMAIL_CODE_EXPIRED'));
  assert.equal(f.state().user, null);
  const first = fixture();
  await first.verification.send(email, 'LOGIN', 'ip');
  await first.auth.loginByEmail(input(first.code()), 'ip');
  const reset = fixture(first.state().user);
  await reset.verification.send(email, 'RESET_PASSWORD', 'ip');
  await assert.rejects(
    reset.auth.loginByEmail(input(reset.code()), 'ip'),
    codeError('EMAIL_CODE_EXPIRED'),
  );
});

test('five incorrect attempts block even the right LOGIN code; a resend replaces the old code', async () => {
  const f = fixture();
  await f.verification.send(email, 'LOGIN', 'ip');
  const correct = f.code();
  const wrong = correct === '000000' ? '111111' : '000000';
  for (let attempt = 0; attempt < 5; attempt++) {
    await assert.rejects(f.auth.loginByEmail(input(wrong), 'ip'), codeError('EMAIL_CODE_INVALID'));
  }
  await assert.rejects(f.auth.loginByEmail(input(correct), 'ip'), codeError('EMAIL_CODE_INVALID'));
  assert.equal(f.state().user, null);
  do {
    await f.verification.send(email, 'LOGIN', 'ip');
  } while (f.code() === correct);
  await assert.rejects(f.auth.loginByEmail(input(correct), 'ip'), codeError('EMAIL_CODE_INVALID'));
  await f.auth.loginByEmail(input(f.code()), 'ip');
});

test('concurrent reuse grants only one session, and failed session creation rolls back registration', async () => {
  const f = fixture();
  await f.verification.send(email, 'LOGIN', 'ip');
  f.failSession(true);
  await assert.rejects(f.auth.loginByEmail(input(f.code()), 'ip'), /session write failed/);
  assert.equal(f.state().user, null);
  assert.equal(f.row().consumedAt, null);
  f.failSession(false);
  const results = await Promise.allSettled([
    f.auth.loginByEmail(input(f.code()), 'ip'),
    f.auth.loginByEmail(input(f.code()), 'ip'),
  ]);
  assert.equal(results.filter(({ status }) => status === 'fulfilled').length, 1);
  assert.equal(f.state().sessions.length, 1);
  assert.equal(
    results.find(({ status }) => status === 'rejected').reason.getResponse().code,
    'EMAIL_CODE_EXPIRED',
  );
});

test('HTTP email login normalizes email, validates consent/code, and returns the shared envelope', async () => {
  const f = fixture();
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
    const base = `${await app.getUrl()}/api/v1/auth`;
    const post = (path, body) =>
      fetch(`${base}/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    assert.equal(
      (await post('email-code', { email: ` ${email.toUpperCase()} `, purpose: 'LOGIN' })).status,
      201,
    );
    assert.equal(f.sent[0].email, email);
    for (const bad of [
      { ...input(f.code()), acceptedTerms: false },
      { email, emailCode: f.code() },
      { ...input(f.code()), acceptedTerms: 'true' },
      input('12'),
      { ...input(f.code()), email: 'invalid' },
    ]) {
      const response = await post('login/email', bad);
      assert.equal(response.status, 400);
      assert.equal((await response.json()).code, 'VALIDATION_ERROR');
    }
    assert.equal(f.state().user, null);
    const response = await post('login/email', {
      ...input(f.code()),
      email: ` ${email.toUpperCase()} `,
    });
    assert.equal(response.status, 201);
    const body = await response.json();
    assert.equal(body.code, 'OK');
    assert.equal(body.data.user.email, email);
    assert.deepEqual(Object.keys(body).sort(), ['code', 'data', 'message', 'meta']);
  } finally {
    await app.close();
  }
});
