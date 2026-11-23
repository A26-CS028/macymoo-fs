const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

// Pool palsir: tabel settings di memori, meniru query yang dipakai route.
const store = new Map();
const calls = [];
const run = async (sql, p = []) => {
  calls.push(sql.trim().split(/\s+/)[0]);
  if (sql.startsWith('SELECT')) return { rows: [...store].filter(([k]) => p[0].includes(k)).map(([key, value]) => ({ key, value })) };
  if (sql.startsWith('DELETE')) p[0].forEach((k) => store.delete(k));
  if (sql.startsWith('INSERT')) p[0].forEach((k, i) => store.set(k, p[1][i]));
  return { rows: [] };
};
const pool = { query: run, connect: async () => ({ query: run, release() {} }) };
require.cache[require.resolve('../src/db/pool')] = { id: 'p', filename: 'p', loaded: true, exports: pool };
// auth.js asli membaca config/env.js yang melempar error bila env kosong, jadi dipalsukan juga.
// Sesi admin yang sebenarnya sudah diuji di tes auth; di sini hanya dicek requireAdmin terpasang di router.
const requireAdmin = (req, res, next) => (req.headers['x-admin'] ? next() : res.status(401).json({ code: 'UNAUTHORIZED' }));
require.cache[require.resolve('../src/middleware/auth')] = { id: 'a', filename: 'a', loaded: true, exports: { requireAdmin } };

const router = require('../src/routes/admin/settings');
let server, base;
before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/admin/settings', router);
  app.use((err, req, res, next) => res.status(err.status || 500).json({ code: err.code, details: err.details }));
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}/admin/settings`;
});
after(() => server.close());

const call = (method, body, admin = true) =>
  fetch(base, { method, headers: { 'content-type': 'application/json', ...(admin ? { 'x-admin': '1' } : {}) }, body: body && JSON.stringify(body) });

test('requireAdmin terpasang: tanpa sesi -> 401', async () => {
  assert.equal((await call('GET', undefined, false)).status, 401);
  assert.equal((await call('PUT', {}, false)).status, 401);
});

test('GET awal: lima key null', async () => {
  const j = await (await call('GET')).json();
  assert.equal(Object.keys(j).length, 5);
  assert.ok(Object.values(j).every((v) => v === null));
});

test('PUT simpan lalu GET sama', async () => {
  const body = { bank_name: 'BCA', bank_account_number: '123', bank_account_holder: 'Nabila', qris_image_url: 'https://a.public.blob.vercel-storage.com/q.png', wa_number: '6281200000000' };
  const r = await call('PUT', body);
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), body);
  assert.deepEqual(await (await call('GET')).json(), body);
});

test('PUT ganti seluruh objek: wa_number null + field lain hilang', async () => {
  const j = await (await call('PUT', { wa_number: null, bank_name: 'BNI' })).json();
  assert.equal(j.wa_number, null);
  assert.equal(j.bank_name, 'BNI');
  assert.equal(j.bank_account_number, null);
  assert.equal(store.has('wa_number'), false);
});

test('PUT tidak valid -> 400 dan DB tak berubah', async () => {
  const before = JSON.stringify([...store]);
  const r = await call('PUT', { wa_number: '0812' });
  assert.equal(r.status, 400);
  assert.equal((await r.json()).details[0].field, 'wa_number');
  assert.equal(JSON.stringify([...store]), before);
});

test('PUT memakai transaksi', async () => {
  calls.length = 0;
  await call('PUT', { bank_name: 'X' });
  assert.equal(calls[0], 'BEGIN');
  assert.equal(calls.at(-1), 'COMMIT');
});