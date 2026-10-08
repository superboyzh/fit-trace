import assert from 'node:assert/strict';
import { test } from 'node:test';
import axios, { AxiosError, CanceledError } from 'axios';
import { installResponseHandlers } from '../src/api/response-handler.ts';

function fixture(adapter) {
  const client = axios.create({ adapter });
  const notices = [];
  let unauthorizedCount = 0;
  installResponseHandlers(client, {
    notify: (error) => notices.push(error),
    onUnauthorized: () => unauthorizedCount++,
  });
  return { client, notices, unauthorizedCount: () => unauthorizedCount };
}
function response(config, status, data) {
  return { config, status, data, headers: {}, statusText: '' };
}

test('OK response preserves the data and pagination envelope', async () => {
  const data = { code: 'OK', message: '请求成功', data: [], meta: { total: 0 } };
  const { client, notices } = fixture(async (config) => response(config, 200, data));
  assert.deepEqual((await client.get('/list')).data, data);
  assert.equal(notices.length, 0);
});
test('HTTP 401 notifies before clearing the session; the error still reaches the page', async () => {
  const data = { code: 'UNAUTHORIZED', message: '请先登录或重新登录', data: null, meta: null };
  const fixtureValue = fixture(async (config) => {
    throw new AxiosError(
      '401',
      AxiosError.ERR_BAD_REQUEST,
      config,
      null,
      response(config, 401, data),
    );
  });
  await assert.rejects(fixtureValue.client.get('/protected'), (error) => {
    assert.equal(fixtureValue.notices[0], error);
    assert.equal(error.response.data.message, data.message);
    assert.equal(fixtureValue.unauthorizedCount(), 1);
    return true;
  });
});
test('HTTP 200 business errors notify and reject instead of appearing successful', async () => {
  const data = { code: 'BODY_RECORD_NOT_FOUND', message: '身体记录不存在', data: null, meta: null };
  const { client, notices, unauthorizedCount } = fixture(async (config) =>
    response(config, 200, data),
  );
  await assert.rejects(client.get('/record'), (error) => error.response.data === data);
  assert.equal(notices.length, 1);
  assert.equal(unauthorizedCount(), 0);
});
test('UNAUTHORIZED business code on HTTP 200 also clears the session', async () => {
  const { client, notices, unauthorizedCount } = fixture(async (config) =>
    response(config, 200, { code: 'UNAUTHORIZED', message: '登录失效' }),
  );
  await assert.rejects(client.get('/protected'));
  assert.equal(notices.length, 1);
  assert.equal(unauthorizedCount(), 1);
});
for (const code of [AxiosError.ERR_NETWORK, AxiosError.ECONNABORTED, AxiosError.ERR_BAD_RESPONSE]) {
  test(`${code}: transport failures notify and propagate`, async () => {
    const { client, notices } = fixture(async (config) => {
      throw new AxiosError('failure', code, config);
    });
    await assert.rejects(client.get('/request'));
    assert.equal(notices.length, 1);
  });
}
test('cancelled requests stay quiet and still reject', async () => {
  const { client, notices, unauthorizedCount } = fixture(async () => {
    throw new CanceledError();
  });
  await assert.rejects(client.get('/cancelled'), axios.isCancel);
  assert.equal(notices.length, 0);
  assert.equal(unauthorizedCount(), 0);
});
