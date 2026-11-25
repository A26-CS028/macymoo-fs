const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'rahasia-uji-minimal-32-karakter-xx';
process.env.DATABASE_URL = 'postgres://uji@localhost/uji';
process.env.TURNSTILE_SECRET_KEY = 'rahasia-uji';
process.env.FRONTEND_ORIGIN = 'http://localhost:5173';

// Pool palsu: tabel settings di memori, meniru query yang dipakai route; admin 7 selalu ada.
const store = new Map();
const pool = {
  query: async (sql, p = []) => {
    if (sql.includes('admin_users')) return { rows: [{ id: 7, username: 'nabila' }] };
    if (sql.startsWith('SELECT')) return { rows: [...store].filter(([k]) => p[0].includes(k)).map(([key, value]) => ({ key, value })) };
    if (sql.startsWith('INSERT')) p[0].forEach((k, i) => store.set(k, p[1][i]));
    return { rows: [] };
  },
};
require.cache[require.resolve('../src/db/pool')] = { id: 'p', filename: 'p', loaded: true, exports: pool };

// App dan requireAdmin asli, supaya tes 401 memeriksa middleware yang benar-benar dipasang.
const app = require('../src/app');
const { COOKIE_NAME } = require('../src/middleware/auth');

let server, base;
before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api/v1/admin/settings`;
});
after(() => server.close());

const cookie = `${COOKIE_NAME}=${jwt.sign({ sub: '7', username: 'nabila' }, process.env.JWT_SECRET)}`;
const call = (method, body, admin = true) =>
  fetch(base, { method, headers: { 'content-type': 'application/json', ...(admin ? { cookie } : {}) }, body: body && JSON.stringify(body) });

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
  assert.equal(store.get('wa_number'), null);
});

test('PUT tidak valid -> 400 dan DB tak berubah', async () => {
  const before = JSON.stringify([...store]);
  const r = await call('PUT', { wa_number: '0812' });
  assert.equal(r.status, 400);
  assert.equal((await r.json()).error.details[0].field, 'wa_number');
  assert.equal(JSON.stringify([...store]), before);
});