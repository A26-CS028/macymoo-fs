// Uji validasi Form PO (Joi + honeypot) dan middleware Turnstile, tanpa database.
const { test } = require('node:test');
const assert = require('node:assert');

process.env.TURNSTILE_SECRET_KEY = 'rahasia-uji';
const { orderSchema } = require('../src/validators/order');
const turnstile = require('../src/middleware/turnstile');
const { todayJakarta, addDays } = require('../src/utils/date');

const besok = addDays(todayJakarta(), 1);
const valid = () => ({
  customer_name: 'Sinta Aulia',
  phone: '0812-3456-7890',
  delivery_date: besok,
  method: 'ambil_sendiri',
  items: [{ menu_id: 1, qty: 2, option_ids: [1, 4], note: 'saus dipisah' }],
  agree_rules: true,
  turnstile_token: 'token',
  website: '',
});
const check = (body) => orderSchema.validate(body, { abortEarly: false, stripUnknown: true });
const fields = (r) => (r.error ? r.error.details.map((d) => d.path.join('.')) : []);

test('pesanan valid lolos; nomor HP dinormalkan dan alamat Ambil Sendiri dibuang', () => {
  const r = check({ ...valid(), address: 'Jl. Contoh' });
  assert.strictEqual(r.error, undefined);
  assert.strictEqual(r.value.phone, '081234567890');
  assert.strictEqual(r.value.address, undefined);
});

test('KF uji #2: nomor HP berisi huruf, tanggal kirim hari ini, porsi 0 ditolak', () => {
  const r = check({ ...valid(), phone: '08abc123456', delivery_date: todayJakarta(), items: [{ menu_id: 1, qty: 0 }] });
  assert.deepStrictEqual(fields(r).sort(), ['delivery_date', 'items.0.qty', 'phone']);
  assert.match(r.error.details.find((d) => d.path[0] === 'delivery_date').message, /paling cepat besok/);
});

test('nomor HP harus 08 dan 10-13 angka', () => {
  for (const bad of ['0812345', '62812345678', '08123456789012']) assert.deepStrictEqual(fields(check({ ...valid(), phone: bad })), ['phone']);
  for (const ok of ['0812345678', '0812345678901']) assert.deepStrictEqual(fields(check({ ...valid(), phone: ok })), []);
});

test('antar Nabila wajib alamat', () => {
  assert.deepStrictEqual(fields(check({ ...valid(), method: 'antar_nabila' })), ['address']);
  assert.deepStrictEqual(fields(check({ ...valid(), method: 'antar_nabila', address: 'Jl. Cempaka 12' })), []);
});

test('honeypot terisi, aturan tidak disetujui, dan tanpa menu ditolak', () => {
  assert.deepStrictEqual(fields(check({ ...valid(), website: 'http://spam' })), ['website']);
  assert.deepStrictEqual(fields(check({ ...valid(), agree_rules: false })), ['agree_rules']);
  assert.deepStrictEqual(fields(check({ ...valid(), items: [] })), ['items']);
});

test('harga dari browser dibuang', () => {
  const r = check({ ...valid(), total: 1, items: [{ menu_id: 1, qty: 1, unit_price: 1 }] });
  assert.strictEqual(r.value.total, undefined);
  assert.strictEqual(r.value.items[0].unit_price, undefined);
});

// Turnstile: fetch diganti tiruan
async function runTurnstile(success) {
  const real = global.fetch;
  let sent;
  global.fetch = async (url, opts) => { sent = opts.body; return { json: async () => ({ success }) }; };
  const req = { body: { turnstile_token: 'abc' }, ip: '1.2.3.4' };
  let error;
  await turnstile(req, {}, (err) => { error = err; });
  global.fetch = real;
  return { req, error, sent };
}

test('Turnstile sukses: lanjut dan token dibuang dari body', async () => {
  const { req, error, sent } = await runTurnstile(true);
  assert.strictEqual(error, undefined);
  assert.strictEqual(req.body.turnstile_token, undefined);
  assert.strictEqual(sent.get('secret'), 'rahasia-uji');
  assert.strictEqual(sent.get('response'), 'abc');
});

test('Turnstile gagal: 400 TURNSTILE_FAILED', async () => {
  const { error } = await runTurnstile(false);
  assert.strictEqual(error.status, 400);
  assert.strictEqual(error.code, 'TURNSTILE_FAILED');
});
