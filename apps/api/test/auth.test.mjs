import 'reflect-metadata';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';
const require = createRequire(import.meta.url);
const { AuthSecurityService } = require('../dist/auth/auth-security.service.js');
const { EmailVerificationService } = require('../dist/auth/email-verification.service.js');
const { JwtAuthGuard } = require('../dist/common/guards/jwt-auth.guard.js');
const { MailService } = require('../dist/auth/mail.service.js');
const { AuthService } = require('../dist/auth/auth.service.js');
const { hash, compare } = require('bcryptjs');
const config = { get: () => 'test-only-secret' };
const codeError = (code) => (error) => error.getResponse().code === code;
function fixture() {
  let row;
  let sent;
  const prisma = {
    user: { findUnique: async () => null },
    emailVerification: {
      upsert: async ({ create }) => (row = { id: 'code', ...create }),
      deleteMany: async () => {
        row = undefined;
      },
    },
    $transaction: async (action) => {
      const previous = row && { ...row };
      try {
        return await action({
          $queryRaw: async (_, email, purpose) =>
            row?.email === email && row?.purpose === purpose ? [{ ...row }] : [],
          emailVerification: {
            update: async ({ data }) => {
              if (typeof data.attempts === 'object') row.attempts += data.attempts.increment;
              for (const [key, value] of Object.entries(data))
                if (key !== 'attempts' || typeof value !== 'object') row[key] = value;
            },
          },
        });
      } catch (error) {
        row = previous;
        throw error;
      }
    },
  };
  const security = new AuthSecurityService(prisma, config);
  security.limit = async () => {};
  security.cleanup = async () => {};
  const mail = {
    assertConfigured() {},
    sendCode: async (_, __, code) => {
      sent = code;
    },
  };
  const service = new EmailVerificationService(prisma, security, mail);
  return { service, prisma, mail, row: () => row, code: () => sent };
}
test('email code is purpose-bound, hashed, expires and can only be consumed once', async () => {
  const f = fixture();
  assert.deepEqual(await f.service.send('a@example.com', 'REGISTER', 'ip'), {
    retryAfterSeconds: 60,
    expiresInSeconds: 600,
  });
  assert.match(f.code(), /^\d{6}$/);
  assert.notEqual(f.row().codeHash, f.code());
  await assert.rejects(
    f.service.withCode('a@example.com', 'RESET_PASSWORD', f.code(), async () => 1),
    codeError('EMAIL_CODE_EXPIRED'),
  );
  assert.equal(await f.service.withCode('a@example.com', 'REGISTER', f.code(), async () => 42), 42);
  await assert.rejects(
    f.service.withCode('a@example.com', 'REGISTER', f.code(), async () => 1),
    codeError('EMAIL_CODE_EXPIRED'),
  );
  await f.service.send('a@example.com', 'REGISTER', 'ip');
  f.row().expiresAt = new Date(0);
  await assert.rejects(
    f.service.withCode('a@example.com', 'REGISTER', f.code(), async () => 1),
    codeError('EMAIL_CODE_EXPIRED'),
  );
});
test('wrong attempts persist and fifth failure blocks even the correct code', async () => {
  const f = fixture();
  await f.service.send('a@example.com', 'REGISTER', 'ip');
  const wrong = f.code() === '000000' ? '111111' : '000000';
  for (let i = 0; i < 5; i++)
    await assert.rejects(
      f.service.withCode('a@example.com', 'REGISTER', wrong, async () => 1),
      codeError('EMAIL_CODE_INVALID'),
    );
  assert.equal(f.row().attempts, 5);
  await assert.rejects(
    f.service.withCode('a@example.com', 'REGISTER', f.code(), async () => 1),
    codeError('EMAIL_CODE_INVALID'),
  );
});
test('business failure rolls back consumption; delivery failure removes pending code', async () => {
  const f = fixture();
  await f.service.send('a@example.com', 'REGISTER', 'ip');
  await assert.rejects(
    f.service.withCode('a@example.com', 'REGISTER', f.code(), async () => {
      throw new Error('business failed');
    }),
    /business failed/,
  );
  assert.equal(f.row().consumedAt, null);
  assert.equal(await f.service.withCode('a@example.com', 'REGISTER', f.code(), async () => 7), 7);
  f.mail.sendCode = async () => {
    throw new Error('SMTP unavailable');
  };
  await assert.rejects(f.service.send('b@example.com', 'REGISTER', 'ip'), /SMTP unavailable/);
  assert.equal(f.row(), undefined);
});
test('nonexistent reset and existing registration have the same reply without sending', async () => {
  const f = fixture();
  const reset = await f.service.send('a@example.com', 'RESET_PASSWORD', 'ip');
  f.prisma.user.findUnique = async () => ({ id: 'existing' });
  const register = await f.service.send('a@example.com', 'REGISTER', 'ip');
  assert.deepEqual(reset, register);
  assert.equal(f.code(), undefined);
});
test('captcha is IP-bound, single-use and required after three failures', async () => {
  let row = {
    id: 'captcha',
    ipHash: '',
    codeHash: '',
    expiresAt: new Date(Date.now() + 60000),
    consumedAt: null,
  };
  const security = new AuthSecurityService(
    {
      authRateLimit: {
        findUnique: async () => ({ count: 3, expiresAt: new Date(Date.now() + 60000) }),
      },
      loginCaptchaChallenge: {
        findUnique: async () => row,
        updateMany: async () => {
          if (row.consumedAt) return { count: 0 };
          row.consumedAt = new Date();
          return { count: 1 };
        },
      },
    },
    config,
  );
  row.ipHash = security.digest('ip');
  row.codeHash = security.digest('captcha:AB23');
  assert.equal(await security.needsCaptcha('a', 'ip'), true);
  await assert.rejects(
    security.verifyCaptcha(undefined, undefined, 'ip'),
    codeError('LOGIN_CAPTCHA_REQUIRED'),
  );
  await assert.rejects(
    security.verifyCaptcha('captcha', 'AB23', 'other'),
    codeError('CAPTCHA_INVALID'),
  );
  await security.verifyCaptcha('captcha', 'ab23', 'ip');
  await assert.rejects(
    security.verifyCaptcha('captcha', 'AB23', 'ip'),
    codeError('CAPTCHA_INVALID'),
  );
});
test('rate-limit overflow returns 429, SMTP missing config fails closed', async () => {
  const security = new AuthSecurityService({}, config);
  security.hit = async () => 6;
  await assert.rejects(
    security.limit('scope', 'value', 5, 60),
    (e) => e.getStatus() === 429 && codeError('AUTH_RATE_LIMITED')(e),
  );
  const mail = new MailService({ get: () => undefined });
  assert.throws(() => mail.assertConfigured(), codeError('MAIL_NOT_CONFIGURED'));
});
test('JWT version rejects old sessions after reset and permits legacy version zero', async () => {
  let version = 0;
  const guard = new JwtAuthGuard(
    { verifyAsync: async () => ({ sub: 'user' }) },
    { user: { findUnique: async () => ({ tokenVersion: version }) } },
  );
  const context = {
    switchToHttp: () => ({ getRequest: () => ({ headers: { authorization: 'Bearer token' } }) }),
  };
  assert.equal(await guard.canActivate(context), true);
  version = 1;
  await assert.rejects(guard.canActivate(context), codeError('UNAUTHORIZED'));
});
test('login third failure requires captcha and reset increments session version', async () => {
  let failures = 0;
  let update;
  const security = {
    limit: async () => {},
    needsCaptcha: async () => failures >= 3,
    loginFailed: async () => {
      failures++;
    },
    loginSucceeded: async () => {},
    verifyCaptcha: async () => {
      throw Object.assign(new Error('captcha gate'), { gated: true });
    },
  };
  const user = { passwordHash: await hash('correct-password', 4), id: 'owner', tokenVersion: 0 };
  const auth = new AuthService({ findByEmail: async () => user }, {}, security, {
    withResetToken: async (_, token, action) => {
      assert.equal(token, 'test-reset-token');
      return action({
        user: {
          update: async (value) => {
            update = value;
          },
        },
      });
    },
  });
  for (let i = 0; i < 2; i++)
    await assert.rejects(
      auth.login({ email: 'a@example.com', password: 'wrong' }, 'ip'),
      codeError('INVALID_CREDENTIALS'),
    );
  await assert.rejects(
    auth.login({ email: 'a@example.com', password: 'wrong' }, 'ip'),
    codeError('LOGIN_CAPTCHA_REQUIRED'),
  );
  await assert.rejects(
    auth.login({ email: 'a@example.com', password: 'correct-password' }, 'ip'),
    (e) => e.gated,
  );
  await auth.resetPassword(
    { email: 'a@example.com', resetToken: 'test-reset-token', password: 'new-password' },
    'ip',
  );
  assert.deepEqual(update.data.tokenVersion, { increment: 1 });
  assert.equal(await compare('new-password', update.data.passwordHash), true);
});

test('password reset requires email verification, binds grant to email and consumes it once', async () => {
  const f = fixture();
  f.prisma.user.findUnique = async () => ({ id: 'existing' });
  await f.service.send('a@example.com', 'RESET_PASSWORD', 'ip');
  const emailCode = f.code();
  await assert.rejects(
    f.service.withResetToken('a@example.com', emailCode, async () => 1),
    codeError('RESET_VERIFICATION_INVALID'),
  );
  const grant = await f.service.verifyResetCode('a@example.com', emailCode);
  assert.equal(grant.expiresInSeconds, 300);
  assert.match(grant.resetToken, /^[a-f0-9-]{36}$/);
  assert.notEqual(f.row().codeHash, grant.resetToken);
  await assert.rejects(
    f.service.verifyResetCode('a@example.com', emailCode),
    codeError('EMAIL_CODE_INVALID'),
  );
  await assert.rejects(
    f.service.withResetToken('other@example.com', grant.resetToken, async () => 1),
    codeError('RESET_VERIFICATION_INVALID'),
  );
  await assert.rejects(
    f.service.withResetToken('a@example.com', grant.resetToken, async () => {
      throw new Error('write failed');
    }),
    /write failed/,
  );
  assert.equal(
    await f.service.withResetToken('a@example.com', grant.resetToken, async () => 42),
    42,
  );
  await assert.rejects(
    f.service.withResetToken('a@example.com', grant.resetToken, async () => 1),
    codeError('RESET_VERIFICATION_INVALID'),
  );
});

test('reset grant expires and resending the email invalidates an earlier grant', async () => {
  const f = fixture();
  f.prisma.user.findUnique = async () => ({ id: 'existing' });
  await f.service.send('a@example.com', 'RESET_PASSWORD', 'ip');
  const grant = await f.service.verifyResetCode('a@example.com', f.code());
  f.row().expiresAt = new Date(0);
  await assert.rejects(
    f.service.withResetToken('a@example.com', grant.resetToken, async () => 1),
    codeError('RESET_VERIFICATION_INVALID'),
  );
  await f.service.send('a@example.com', 'RESET_PASSWORD', 'ip');
  const next = await f.service.verifyResetCode('a@example.com', f.code());
  await f.service.send('a@example.com', 'RESET_PASSWORD', 'ip');
  await assert.rejects(
    f.service.withResetToken('a@example.com', next.resetToken, async () => 1),
    codeError('RESET_VERIFICATION_INVALID'),
  );
});

test('reset DTO requires the server grant; email code alone cannot reset password', () => {
  const { plainToInstance } = require('class-transformer');
  const { validateSync } = require('class-validator');
  const { ResetPasswordDto } = require('../dist/auth/dto/reset-password.dto.js');
  const input = plainToInstance(ResetPasswordDto, {
    email: ' A@EXAMPLE.COM ',
    emailCode: '123456',
    password: 'new-password',
  });
  assert.equal(input.email, 'a@example.com');
  const errors = validateSync(input, { whitelist: true, forbidNonWhitelisted: true });
  assert.ok(errors.some((error) => error.property === 'resetToken'));
  assert.ok(errors.some((error) => error.property === 'emailCode'));
});
