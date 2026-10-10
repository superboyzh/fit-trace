/* global setTimeout, clearTimeout */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EmailCaptchaClient } from '../src/utils/email-captcha.ts';
const config = { enabled: true, region: 'cn', prefix: 'prefix', sceneId: 'web', appSceneId: 'app' };
function fixture(t, platform = 'web') {
  let options;
  const nodes = [];
  const oldWindow = globalThis.window,
    oldDocument = globalThis.document;
  globalThis.window = {
    setTimeout,
    clearTimeout,
    innerWidth: 390,
    initAliyunCaptcha: (value) => {
      options = value;
    },
  };
  globalThis.document = {
    createElement: () => ({
      remove() {
        this.removed = true;
      },
      click() {},
    }),
    body: { append: (...items) => nodes.push(...items) },
  };
  const client = new EmailCaptchaClient(platform, async () => config);
  t.after(() => {
    client.dispose();
    globalThis.window = oldWindow;
    globalThis.document = oldDocument;
  });
  return { client, nodes, options: () => options };
}
async function initialized(f) {
  const result = f.client.verify();
  // prepare includes asynchronous config and SDK loading.
  for (let i = 0; i < 6; i++) await Promise.resolve();
  assert.ok(f.options());
  return { result };
}
test('disabled config does not load SDK and failed configuration can retry', async () => {
  let attempts = 0;
  const client = new EmailCaptchaClient('web', async () => {
    if (++attempts === 1) throw new Error('offline');
    return { enabled: false };
  });
  await assert.rejects(client.verify(), /offline/);
  assert.equal(await client.verify(), undefined);
  client.dispose();
  assert.equal(await client.verify(), null);
});
test('verification works without randomUUID or crypto; repeated attempts get distinct DOM IDs', async (t) => {
  const f = fixture(t);
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  t.after(() => {
    if (descriptor) Object.defineProperty(globalThis, 'crypto', descriptor);
    else delete globalThis.crypto;
  });
  t.mock.method(Date, 'now', () => 1234567890);
  for (const value of [{}, undefined]) {
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value });
    const { result } = await initialized(f);
    f.options().success('valid');
    assert.equal((await result).captchaVerifyParam, 'valid');
  }
  assert.equal(new Set(f.nodes.map((node) => node.id)).size, f.nodes.length);
  assert.ok(f.nodes.every((node) => node.removed));
});
test('opaque proof is unchanged, app selects own scene, cleanup exceptions do not lose success', async (t) => {
  const f = fixture(t, 'app');
  const { result } = await initialized(f);
  assert.equal(f.options().SceneId, 'app');
  f.options().getInstance({
    hide: () => {
      throw new Error('cleanup');
    },
  });
  f.options().success(' opaque-token ');
  assert.deepEqual(await result, { captchaVerifyParam: ' opaque-token ', captchaPlatform: 'app' });
  assert.ok(f.nodes.every((node) => node.removed));
});
test('cancel and unmount ignore late success; automatic close does not cancel a successful proof', async (t) => {
  const f = fixture(t);
  let run = await initialized(f);
  const old = f.options();
  old.onClose('userDismiss');
  old.success('late-proof');
  assert.equal(await run.result, null);
  run = await initialized(f);
  f.options().onClose('verifyComplete');
  f.options().success('valid');
  assert.equal((await run.result).captchaVerifyParam, 'valid');
  run = await initialized(f);
  f.client.dispose();
  f.options().success('after-unmount');
  assert.equal(await run.result, null);
  assert.ok(f.nodes.every((node) => node.removed));
});
test('SDK error and empty proof reject and clean up; a later attempt works', async (t) => {
  const f = fixture(t);
  let run = await initialized(f);
  f.options().onError();
  await assert.rejects(run.result, /加载失败/);
  run = await initialized(f);
  f.options().success(' ');
  await assert.rejects(run.result, /未完成/);
  run = await initialized(f);
  f.options().success('retry');
  assert.equal((await run.result).captchaVerifyParam, 'retry');
  assert.ok(f.nodes.every((node) => node.removed));
});
