// Login, rate limit, unggahan, dan token publik (KF 12), tanpa database dan tanpa Vercel Blob.
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');

process.env.JWT_SECRET = 'rahasia-uji-minimal-32-karakter-xx';
process.env.DATABASE_URL = 'postgres://uji@localhost/uji';
process.env.TURNSTILE_SECRET_KEY = 'rahasia-uji';
process.env.FRONTEND_ORIGIN = 'http://localhost:5173';
delete process.env.BLOB_READ_WRITE_TOKEN;
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../src/db/pool');

const PASSWORD = 'kata-sandi-uji';
const admin = { id: 7, username: 'nabila', password_hash: bcrypt.hashSync(PASSWORD, 4) };
const hits = new Map();
pool.query = async (sql, params = []) => {
  if (sql.includes('INSERT INTO rate_limits')) {
    const key = `${params[0]}|${params[1].toISOString()}`;
    hits.set(key, (hits.get(key) || 0) + 1);
    return { rows: [{ hits: hits.get(key) }] };
  }
  if (sql.includes('DELETE FROM rate_limits')) return { rows: [] };
  if (sql.includes('WHERE username')) return { rows: params[0] === admin.username ? [admin] : [] };
  if (sql.includes('FROM admin_users')) return { rows: [{ id: admin.id, username: admin.username }] };
  throw new Error(`query tak terduga: ${sql}`);
};
const app = require('../src/app');
const { COOKIE_NAME } = require('../src/middleware/auth');
const { publicToken, orderCode } = require('../src/services/token');

let server;
let base;
before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api/v1`;
});
after(() => server.close());
beforeEach(() => hits.clear());

const login = (username, password) =>
  fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
const adminCookie = () => `${COOKIE_NAME}=${jwt.sign({ sub: '7', username: 'nabila' }, process.env.JWT_SECRET)}`;

test('login: kata sandi salah dan username tidak ada dibalas 401 dengan pesan yang sama', async () => {
  const wrong = await login('nabila', 'salah');
  const unknown = await login('bukan-admin', PASSWORD);
  assert.strictEqual(wrong.status, 401);
  assert.strictEqual(unknown.status, 401);
  assert.deepStrictEqual(await wrong.json(), await unknown.json());
  assert.strictEqual(wrong.headers.get('set-cookie'), null);
});

test('login: berhasil memasang cookie sesi httpOnly + SameSite', async () => {
  const res = await login('nabila', PASSWORD);
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(await res.json(), { id: 7, username: 'nabila' });
  const cookie = res.headers.get('set-cookie');
  assert.match(cookie, new RegExp(`^${COOKIE_NAME}=`));
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  assert.doesNotMatch(cookie, /password/i);
});

test('rate limit login: percobaan ke-6 dalam 15 menit dibalas 429 dengan Retry-After', async () => {
  for (let i = 0; i < 5; i++) assert.strictEqual((await login('nabila', 'salah')).status, 401);
  const res = await login('nabila', PASSWORD);
  assert.strictEqual(res.status, 429);
  assert.strictEqual((await res.json()).error.code, 'RATE_LIMITED');
  const retry = Number(res.headers.get('retry-after'));
  assert.ok(retry > 0 && retry <= 15 * 60);
});

const uploadForm = (bytes, purpose = 'menu_photo') => {
  const form = new FormData();
  form.append('purpose', purpose);
  form.append('file', new Blob([bytes]), 'foto.jpg');
  return form;
};
const jpeg = (size) => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(size - 3)]);

test('unggah: tanpa login ditolak 401', async () => {
  const res = await fetch(`${base}/admin/uploads`, { method: 'POST', body: uploadForm(jpeg(100)) });
  assert.strictEqual(res.status, 401);
});

test('unggah: file lebih dari 2 MB ditolak 400 FILE_TOO_LARGE', async () => {
  const res = await fetch(`${base}/admin/uploads`, {
    method: 'POST',
    headers: { Cookie: adminCookie() },
    body: uploadForm(jpeg(2 * 1024 * 1024 + 1)),
  });
  assert.strictEqual(res.status, 400);
  assert.strictEqual((await res.json()).error.code, 'FILE_TOO_LARGE');
});

test('unggah: isi bukan gambar ditolak dari magic bytes, walau namanya .jpg', async () => {
  const res = await fetch(`${base}/admin/uploads`, {
    method: 'POST',
    headers: { Cookie: adminCookie() },
    body: uploadForm(Buffer.from('<svg onload="alert(1)"></svg>')),
  });
  assert.strictEqual(res.status, 400);
  assert.strictEqual((await res.json()).error.code, 'FILE_TYPE_NOT_ALLOWED');
});

test('token publik: 32 karakter base64url dan tidak berulang; kode pesanan berformat MYM-XXXXX', () => {
  const tokens = new Set(Array.from({ length: 1000 }, publicToken));
  assert.strictEqual(tokens.size, 1000);
  for (const t of tokens) assert.match(t, /^[A-Za-z0-9_-]{32}$/);
  for (let i = 0; i < 100; i++) assert.match(orderCode(), /^MYM-[A-HJKMNP-Z2-9]{5}$/);
});
