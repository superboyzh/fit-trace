import 'reflect-metadata';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
const require = createRequire(import.meta.url);
const { EmailCaptchaService } = require('../dist/auth/email-captcha.service.js');
const { EmailVerificationService } = require('../dist/auth/email-verification.service.js');
const { EmailCodeDto } = require('../dist/auth/dto/email-code.dto.js');
const { EmailCaptchaDto } = require('../dist/auth/dto/email-captcha.dto.js');
const values = {
  ALIYUN_CAPTCHA_ENABLED: 'true',
  ALIYUN_CAPTCHA_PREFIX: 'public-prefix',
  ALIYUN_CAPTCHA_SCENE_ID: 'web-scene',
  ALIYUN_CAPTCHA_APP_SCENE_ID: 'app-scene',
  ALIYUN_CAPTCHA_ACCESS_KEY_ID: 'test-only-id',
  ALIYUN_CAPTCHA_ACCESS_KEY_SECRET: 'test-only-secret',
};
function fixture(overrides = {}) {
  const limits = [],
    requests = [];
  const config = { ...values, ...overrides };
  const service = new EmailCaptchaService(
    { get: (key, fallback) => config[key] ?? fallback },
    {
      limit: async (...args) => limits.push(args),
    },
  );
  let body = { success: true, code: 'Success', result: { verifyResult: true } };
  if (service.client)
    service.client.verifyIntelligentCaptchaWithOptions = async (request, runtime) => {
      requests.push({ request, runtime });
      return { body };
    };
  return {
    service,
    limits,
    requests,
    setBody: (value) => {
      body = value;
    },
  };
}
const proof = { captchaVerifyParam: ' raw-opaque-proof ', captchaPlatform: 'web' };
const codeIs = (code) => (error) => error.getResponse().code === code;

test('disabled mode requires no credentials; enabled configuration fails early and never exposes secrets', async () => {
  const off = fixture({ ALIYUN_CAPTCHA_ENABLED: 'false' });
  await off.service.verify(undefined, 'ip');
  assert.deepEqual(off.service.getConfig(), { enabled: false });
  assert.throws(() => fixture({ ALIYUN_CAPTCHA_ACCESS_KEY_SECRET: '' }), /ACCESS_KEY_SECRET/);
  assert.throws(() => fixture({ ALIYUN_CAPTCHA_REGION: 'invalid' }), /REGION/);
  assert.throws(() => fixture({ ALIYUN_CAPTCHA_ENABLED: 'yes' }), /ENABLED/);
  assert.deepEqual(Object.keys(fixture().service.getConfig()).sort(), [
    'appSceneId',
    'enabled',
    'prefix',
    'region',
    'sceneId',
  ]);
});

test('fixed server scenes and unchanged opaque proof; independent limit and bounded SDK request', async () => {
  const f = fixture();
  await f.service.verify(proof, 'ip');
  await f.service.verify({ ...proof, captchaPlatform: 'app' }, 'ip');
  assert.deepEqual(
    f.requests.map(({ request }) => request.sceneId),
    ['web-scene', 'app-scene'],
  );
  assert.equal(f.requests[0].request.captchaVerifyParam, proof.captchaVerifyParam);
  assert.deepEqual(f.limits[0], ['email-captcha-ip', 'ip', 20, 60]);
  assert.equal(f.requests[0].runtime.autoretry, false);
  await assert.rejects(
    fixture({ ALIYUN_CAPTCHA_APP_SCENE_ID: '' }).service.verify(
      { ...proof, captchaPlatform: 'app' },
      'ip',
    ),
    codeIs('EMAIL_CAPTCHA_UNAVAILABLE'),
  );
});

test('missing proof, failed/replayed/expired proofs, malformed cloud responses and outage fail closed', async () => {
  const f = fixture();
  for (const value of [undefined, {}, { captchaVerifyParam: ' ' }]) {
    await assert.rejects(f.service.verify(value, 'ip'), codeIs('EMAIL_CAPTCHA_REQUIRED'));
  }
  assert.equal(f.requests.length, 0);
  for (const verifyCode of ['F001', 'F008', 'F018', 'F019', 'F020']) {
    f.setBody({ success: true, code: 'Success', result: { verifyResult: false, verifyCode } });
    await assert.rejects(f.service.verify(proof, 'ip'), codeIs('EMAIL_CAPTCHA_INVALID'));
  }
  for (const body of [undefined, { success: false }, { success: true, code: 'Success' }]) {
    f.setBody(body);
    await assert.rejects(f.service.verify(proof, 'ip'), codeIs('EMAIL_CAPTCHA_UNAVAILABLE'));
  }
  f.service.client.verifyIntelligentCaptchaWithOptions = async () => {
    throw new Error('private upstream details');
  };
  await assert.rejects(f.service.verify(proof, 'ip'), (error) => {
    assert.equal(JSON.stringify(error.getResponse()).includes('private upstream'), false);
    return codeIs('EMAIL_CAPTCHA_UNAVAILABLE')(error);
  });
});

test('every email purpose verifies before database, email quotas and SMTP; rejected cloud requests do not send', async () => {
  const f = fixture();
  const calls = [];
  const service = new EmailVerificationService(
    { $transaction: async () => calls.push('database') },
    { cleanup: async () => calls.push('cleanup') },
    { assertConfigured() {}, sendCode: async () => calls.push('SMTP') },
    f.service,
  );
  for (const purpose of ['LOGIN', 'REGISTER', 'RESET_PASSWORD']) {
    await assert.rejects(
      service.send('a@example.invalid', purpose, 'ip'),
      codeIs('EMAIL_CAPTCHA_REQUIRED'),
    );
    f.setBody({ success: true, code: 'Success', result: { verifyResult: false } });
    await assert.rejects(
      service.send('a@example.invalid', purpose, 'ip', proof),
      codeIs('EMAIL_CAPTCHA_INVALID'),
    );
  }
  assert.deepEqual(calls, []);
  f.service.security.limit = async () => {
    throw new Error('rate limited');
  };
  const previous = f.requests.length;
  await assert.rejects(f.service.verify(proof, 'ip'), /rate limited/);
  assert.equal(f.requests.length, previous);
});

test('both public and authenticated DTOs validate proof and platform', async () => {
  for (const Dto of [EmailCodeDto, EmailCaptchaDto]) {
    const base = Dto === EmailCodeDto ? { email: 'a@example.invalid', purpose: 'LOGIN' } : {};
    assert.equal((await validate(plainToInstance(Dto, { ...base, ...proof }))).length, 0);
    for (const invalid of [
      { captchaVerifyParam: 1 },
      { captchaVerifyParam: 'x'.repeat(32769) },
      { captchaPlatform: 'other' },
    ]) {
      assert.ok((await validate(plainToInstance(Dto, { ...base, ...invalid }))).length > 0);
    }
  }
});

test('public and authenticated controllers forward proof; settings email comes only from current account', async () => {
  const { AuthController } = require('../dist/auth/auth.controller.js');
  const { AuthService } = require('../dist/auth/auth.service.js');
  const calls = [];
  const verification = {
    send: async (...args) => {
      calls.push(args);
      return { retryAfterSeconds: 60 };
    },
  };
  const auth = new AuthService(
    { findById: async () => ({ email: 'owner@example.invalid', tokenVersion: 0 }) },
    {},
    {},
    verification,
  );
  const controller = new AuthController(auth, {}, {}, verification, {}, fixture().service);
  const request = { ip: 'ip' };
  const dto = { email: 'login@example.invalid', purpose: 'LOGIN', ...proof };
  await controller.sendEmailCode(dto, request);
  await controller.sendPasswordCode({ sub: 'owner', ver: 0 }, proof, request);
  assert.deepEqual(calls, [
    [dto.email, 'LOGIN', 'ip', dto],
    ['owner@example.invalid', 'RESET_PASSWORD', 'ip', proof],
  ]);
  assert.equal(JSON.stringify(controller.emailCaptchaConfig()).includes('test-only-secret'), false);
});
