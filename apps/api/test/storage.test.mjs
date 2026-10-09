/* global fetch, FormData */
import 'reflect-metadata';
import assert from 'node:assert/strict';
import { Blob, Buffer } from 'node:buffer';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { test } from 'node:test';
import { URL } from 'node:url';

const require = createRequire(import.meta.url);
const { Module } = require('@nestjs/common');
const { NestFactory } = require('@nestjs/core');
const { JwtService } = require('@nestjs/jwt');
const { JwtAuthGuard } = require('../dist/common/guards/jwt-auth.guard.js');
const { PrismaService } = require('../dist/prisma/prisma.service.js');
const { LocalStorageProvider } = require('../dist/providers/storage/local-storage.provider.js');
const { STORAGE_PROVIDER } = require('../dist/providers/storage/storage.types.js');
const { UploadsController } = require('../dist/uploads/uploads.controller.js');
const { UploadsService } = require('../dist/uploads/uploads.service.js');

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'fit-trace-storage-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const values = {
    STORAGE_LOCAL_DIR: directory,
    STORAGE_PUBLIC_PREFIX: '/uploads',
    STORAGE_PUBLIC_URL: 'http://localhost:3000',
  };
  const storage = new LocalStorageProvider({ get: (key, fallback) => values[key] ?? fallback });
  return { directory, storage };
}

test('upload dates use Shanghai midnight, including year rollover and leap day', async (t) => {
  const { directory, storage } = await fixture(t);
  const cases = [
    ['2026-10-08T15:59:59.999Z', '2026/10/08'],
    ['2026-10-08T16:00:00.000Z', '2026/10/09'],
    ['2026-12-31T15:59:59.999Z', '2026/12/31'],
    ['2026-12-31T16:00:00.000Z', '2027/01/01'],
    ['2028-02-28T16:00:00.000Z', '2028/02/29'],
    ['2028-02-29T16:00:00.000Z', '2028/03/01'],
  ];
  t.mock.timers.enable({ apis: ['Date'], now: 0 });
  for (const [now, date] of cases) {
    t.mock.timers.setTime(Date.parse(now));
    const file = Buffer.from(now);
    const result = await storage.upload(file, { directory: 'owner', extension: 'jpg' });
    assert.ok(result.key.startsWith(`${date}/owner/`), result.key);
    assert.equal(result.url, `http://localhost:3000/uploads/${result.key}`);
    assert.deepEqual(await readFile(join(directory, result.key)), file);
  }
});

test('concurrent uploads create a shared date directory with unique files and user grouping', async (t) => {
  const { directory, storage } = await fixture(t);
  t.mock.timers.enable({ apis: ['Date'], now: Date.parse('2026-10-09T01:00:00Z') });
  const results = await Promise.all(
    Array.from({ length: 12 }, (_, index) =>
      storage.upload(Buffer.from(`image ${index}`), {
        directory: index % 2 ? 'owner-b' : 'owner-a',
        extension: 'png',
      }),
    ),
  );
  assert.equal(new Set(results.map(({ key }) => key)).size, results.length);
  for (const [index, { key }] of results.entries()) {
    assert.ok(key.startsWith(`2026/10/09/${index % 2 ? 'owner-b' : 'owner-a'}/`));
    assert.equal(await readFile(join(directory, key), 'utf8'), `image ${index}`);
  }
});

test('HTTP image upload, static access, AI reference and deletion work with date directories', async (t) => {
  const { directory, storage } = await fixture(t);
  class TestModule {}
  Module({
    controllers: [UploadsController],
    providers: [
      UploadsService,
      JwtAuthGuard,
      { provide: STORAGE_PROVIDER, useValue: storage },
      {
        provide: PrismaService,
        useValue: { user: { findUnique: async () => ({ tokenVersion: 0 }) } },
      },
      {
        provide: JwtService,
        useValue: {
          async verifyAsync(token) {
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
  app.useStaticAssets(storage.directory, { prefix: `${storage.prefix}/` });
  await app.listen(0, '127.0.0.1');
  const baseUrl = await app.getUrl();
  const file = Buffer.from('89504e470d0a1a0a', 'hex');
  const form = new FormData();
  form.append('file', new Blob([file], { type: 'image/png' }), 'image.png');
  const uploaded = await fetch(`${baseUrl}/api/v1/uploads`, {
    method: 'POST',
    headers: { Authorization: 'Bearer valid' },
    body: form,
  });
  assert.equal(uploaded.status, 201);
  const { data: result } = await uploaded.json();
  assert.match(result.key, /^\d{4}\/\d{2}\/\d{2}\/owner\/[a-f0-9-]+\.png$/);
  const imageUrl = `${baseUrl}${new URL(result.url).pathname}`;
  const image = await fetch(imageUrl);
  assert.equal(image.status, 200);
  assert.equal(image.headers.get('content-type'), 'image/png');
  assert.deepEqual(Buffer.from(await image.arrayBuffer()), file);
  assert.equal(
    await storage.resolveExternalRef(result.url),
    `data:image/png;base64,${file.toString('base64')}`,
  );

  await mkdir(join(directory, 'owner'), { recursive: true });
  await writeFile(join(directory, 'owner', 'old.png'), file);
  const oldImage = await fetch(`${baseUrl}/uploads/owner/old.png`);
  assert.equal(oldImage.status, 200);
  assert.deepEqual(Buffer.from(await oldImage.arrayBuffer()), file);

  await new UploadsService(storage).removeByUrl(result.url);
  assert.equal((await fetch(imageUrl)).status, 404);
  assert.equal(await storage.resolveExternalRef(result.url), result.url);
});

test('existing flat and user-directory images remain readable and removable', async (t) => {
  const { directory, storage } = await fixture(t);
  for (const key of ['old.jpg', 'owner/old.png']) {
    const file = Buffer.from(`existing image ${key}`);
    const target = join(directory, key);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, file);
    const url = storage.toPublicUrl(key);
    const type = key.endsWith('.png') ? 'image/png' : 'image/jpeg';
    assert.equal(
      await storage.resolveExternalRef(url),
      `data:${type};base64,${file.toString('base64')}`,
    );
    await storage.deleteByUrl(url);
    await assert.rejects(readFile(target), { code: 'ENOENT' });
  }
});

test('dated nested keys cannot delete or read outside the storage root', async (t) => {
  const { storage } = await fixture(t);
  const outside = await mkdtemp(join(tmpdir(), 'fit-trace-outside-'));
  t.after(() => rm(outside, { recursive: true, force: true }));
  const protectedFile = join(outside, 'image.jpg');
  await writeFile(protectedFile, 'outside');
  const key = `2026/10/09/../../../../${basename(outside)}/image.jpg`;
  await storage.delete(key);
  assert.equal(await readFile(protectedFile, 'utf8'), 'outside');
  const url = storage.toPublicUrl(key);
  assert.equal(await storage.resolveExternalRef(url), url);
});
