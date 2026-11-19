// Uji middleware requireAdmin dan format error, tanpa database.
const { test } = require('node:test');
const assert = require('node:assert');

process.env.JWT_SECRET = 'rahasia-uji-minimal-32-karakter-xx';
process.env.DATABASE_URL = 'postgres://uji@localhost/uji';
process.env.TURNSTILE_SECRET_KEY = 'rahasia-uji';
process.env.FRONTEND_ORIGIN = 'http://localhost:5173';
const jwt = require('jsonwebtoken');
// Database tiruan: hanya admin id 7 yang masih ada
const pool = require('../src/db/pool');
pool.query = async (sql, [id]) => ({ rows: id === 7 ? [{ id: 7, username: 'nabila' }] : [] });
const { requireAdmin, COOKIE_NAME } = require('../src/middleware/auth');
const { errorHandler } = require('../src/middleware/errorHandler');

// Jalankan requireAdmin, lalu teruskan error (jika ada) ke errorHandler seperti Express.
async function run(cookies) {
  const req = { cookies };
  const res = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  let passed = false;
  await requireAdmin(req, res, (err) => (err ? errorHandler(err, req, res, () => {}) : (passed = true)));
  return { req, res, passed };
}

test('tanpa cookie ditolak 401 dengan format error kontrak', async () => {
  const { res, passed } = await run({});
  assert.strictEqual(passed, false);
  assert.strictEqual(res.statusCode, 401);
  assert.strictEqual(res.body.error.code, 'UNAUTHORIZED');
  assert.ok(res.body.error.message);
});

test('token dengan secret lain ditolak 401', async () => {
  const token = jwt.sign({ sub: '1', username: 'nabila' }, 'secret-palsu');
  const { res, passed } = await run({ [COOKIE_NAME]: token });
  assert.strictEqual(passed, false);
  assert.strictEqual(res.statusCode, 401);
});

test('token kedaluwarsa ditolak 401', async () => {
  const token = jwt.sign({ sub: '1', username: 'nabila', exp: Math.floor(Date.now() / 1000) - 60 }, process.env.JWT_SECRET);
  const { res, passed } = await run({ [COOKIE_NAME]: token });
  assert.strictEqual(passed, false);
  assert.strictEqual(res.statusCode, 401);
});

test('token "none" (tanpa tanda tangan) ditolak 401', async () => {
  const token = jwt.sign({ sub: '1', username: 'nabila' }, null, { algorithm: 'none' });
  const { passed } = await run({ [COOKIE_NAME]: token });
  assert.strictEqual(passed, false);
});

test('token sah lolos dan req.admin terisi', async () => {
  const token = jwt.sign({ sub: '7', username: 'nabila' }, process.env.JWT_SECRET, { expiresIn: '7d' });
  const { req, passed } = await run({ [COOKIE_NAME]: token });
  assert.strictEqual(passed, true);
  assert.deepStrictEqual(req.admin, { id: 7, username: 'nabila' });
});

test('error 500 tidak membocorkan pesan internal', () => {
  const res = { status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; } };
  const log = console.error;
  console.error = () => {};
  errorHandler(new Error('password=rahasia di query'), {}, res, () => {});
  console.error = log;
  assert.strictEqual(res.statusCode, 500);
  assert.strictEqual(res.body.error.code, 'INTERNAL_ERROR');
  assert.ok(!res.body.error.message.includes('rahasia'));
});

test('error pg (punya code, tanpa status) tetap disembunyikan', () => {
  const res = { status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; } };
  const err = Object.assign(new Error('duplicate key value violates unique constraint "orders_public_token_key"'), { code: '23505' });
  const log = console.error;
  let logged = false;
  console.error = () => { logged = true; };
  errorHandler(err, {}, res, () => {});
  console.error = log;
  assert.strictEqual(res.statusCode, 500);
  assert.strictEqual(res.body.error.code, 'INTERNAL_ERROR');
  assert.ok(!res.body.error.message.includes('orders_public_token_key'));
  assert.ok(logged);
});

test('PricingError dibalas 400 dengan details', () => {
  const res = { status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; } };
  const { PricingError } = require('../src/services/pricing');
  errorHandler(new PricingError('Menu tidak ditemukan', [{ field: 'items[0].menu_id', message: 'Menu tidak ditemukan' }]), {}, res, () => {});
  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');
  assert.strictEqual(res.body.error.details[0].field, 'items[0].menu_id');
});

test('admin yang sudah dihapus ditolak 401 walau tokennya masih berlaku', async () => {
  const token = jwt.sign({ sub: '99', username: 'dihapus' }, process.env.JWT_SECRET, { expiresIn: '7d' });
  const { res, passed } = await run({ [COOKIE_NAME]: token });
  assert.strictEqual(passed, false);
  assert.strictEqual(res.statusCode, 401);
});
