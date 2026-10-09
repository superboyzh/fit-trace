import 'reflect-metadata';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const { JwtService } = require('@nestjs/jwt');
const { accessTokenLifetime } = require('../dist/auth/auth-config.js');
const { AuthSessionService } = require('../dist/auth/auth-session.service.js');
const { JwtAuthGuard } = require('../dist/common/guards/jwt-auth.guard.js');
const unauthorized = (error) => error.getResponse().code === 'UNAUTHORIZED';

function fixture() {
  let row;
  let version = 0;
  const user = { id: 'owner', email: 'owner@example.com' };
  const jwt = new JwtService({ secret: 'test-only-secret', signOptions: { expiresIn: 900 } });
  const prisma = {
    user: { findUnique: async () => ({ tokenVersion: version }) },
    authSession: {
      create: async ({ data }) => (row = { id: 'session', revokedAt: null, ...data }),
      findUnique: async ({ where }) => {
        if (!row || (where.tokenHash && where.tokenHash !== row.tokenHash)) return null;
        return { ...row, user: { tokenVersion: version } };
      },
      updateMany: async ({ where, data }) => {
        if (!row || row.revokedAt || (where.tokenHash && where.tokenHash !== row.tokenHash)) {
          return { count: 0 };
        }
        Object.assign(row, data);
        return { count: 1 };
      },
    },
  };
  const service = new AuthSessionService(prisma, { findPublicById: async () => user }, jwt);
  const guard = new JwtAuthGuard(jwt, prisma);
  const check = (token) =>
    guard.canActivate({
      switchToHttp: () => ({
        getRequest: () => ({ headers: { authorization: `Bearer ${token}` } }),
      }),
    });
  return { service, jwt, prisma, user, row: () => row, reset: () => version++, check };
}

test('JWT environment strings are parsed as seconds, with invalid configuration rejected', async () => {
  const jwt = new JwtService({
    secret: 'test-only-secret',
    signOptions: { expiresIn: accessTokenLifetime('604800') },
  });
  const token = await jwt.signAsync({ sub: 'owner' });
  const payload = jwt.decode(token);
  assert.equal(payload.exp - payload.iat, 604800);
  assert.equal(accessTokenLifetime(undefined), 900);
  assert.equal(accessTokenLifetime('900'), 900);
  for (const value of ['', '7d', '900ms', '1.5', 0, -1, NaN, '9007199254740992', null]) {
    assert.throws(() => accessTokenLifetime(value), /以秒为单位的正整数/);
  }
});

test('refresh credential is random and digest-backed, JWT expires in 15 minutes', async () => {
  const f = fixture();
  const login = await f.service.create(f.user, 0);
  assert.match(login.refreshToken, /^[a-f0-9]{64}$/);
  assert.notEqual(f.row().tokenHash, login.refreshToken);
  const payload = f.jwt.decode(login.accessToken);
  assert.equal(payload.exp - payload.iat, 900);
  assert.equal(Date.parse(login.accessTokenExpiresAt), payload.exp * 1000);
  assert.equal(await f.check(login.accessToken), true);
  const renewed = await f.service.refresh(login.refreshToken);
  assert.equal(renewed.user.id, 'owner');
  assert.equal(renewed.refreshToken, login.refreshToken);
  await assert.rejects(f.service.refresh('0'.repeat(64)), unauthorized);
});

test('parallel refreshes remain valid and logout immediately revokes refresh and access tokens', async () => {
  const f = fixture();
  const login = await f.service.create(f.user, 0);
  const renewed = await Promise.all(
    Array.from({ length: 5 }, () => f.service.refresh(login.refreshToken)),
  );
  assert.equal(renewed.length, 5);
  await f.service.logout(login.refreshToken);
  await f.service.logout(login.refreshToken);
  await assert.rejects(f.service.refresh(login.refreshToken), unauthorized);
  await assert.rejects(f.check(login.accessToken), unauthorized);
});

test('password reset invalidates both token types; session ownership is checked', async () => {
  const f = fixture();
  const login = await f.service.create(f.user, 0);
  const otherToken = await f.jwt.signAsync({ sub: 'someone-else', ver: 0, sid: 'session' });
  await assert.rejects(f.check(otherToken), unauthorized);
  f.reset();
  await assert.rejects(f.service.refresh(login.refreshToken), unauthorized);
  await assert.rejects(f.check(login.accessToken), unauthorized);
});

test('logout winning the refresh update race cannot recreate a session', async () => {
  const f = fixture();
  const login = await f.service.create(f.user, 0);
  const original = f.prisma.authSession.updateMany;
  f.prisma.authSession.updateMany = async (args) => {
    if (args.data.lastUsedAt) await f.service.logout(login.refreshToken);
    return original(args);
  };
  await assert.rejects(f.service.refresh(login.refreshToken), unauthorized);
});

test('legacy login upgrades with its existing version, without surviving a password reset', async () => {
  const f = fixture();
  const legacy = await f.jwt.signAsync({ sub: 'owner', email: f.user.email });
  assert.equal(await f.check(legacy), true);
  const session = await f.service.upgrade(f.jwt.decode(legacy));
  assert.equal(session.user.id, 'owner');
  await assert.rejects(f.service.upgrade(f.jwt.decode(session.accessToken)), unauthorized);
  f.reset();
  await assert.rejects(f.service.refresh(session.refreshToken), unauthorized);
});
