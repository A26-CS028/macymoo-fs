const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const ExcelJS = require('exceljs');

process.env.JWT_SECRET = 'rahasia-uji-minimal-32-karakter-xx';
process.env.DATABASE_URL = 'postgres://uji@localhost/uji';
process.env.TURNSTILE_SECRET_KEY = 'rahasia-uji';
process.env.FRONTEND_ORIGIN = 'http://localhost:5173';

// Pool palsu: admin 7 selalu ada; dua query rekap dijawab per nama view dan dicatat.
const calls = [];
const pool = {
  query: async (sql, params) => {
    if (sql.includes('admin_users')) return { rows: [{ id: 7, username: 'nabila' }] };
    calls.push({ sql, params });
    if (sql.includes('recap_deliveries')) return { rows: [{ period_start: '2026-11-27', subtotal: '270000', shipping_total: '40000' }] };
    if (sql.includes('recap_orders')) return { rows: [{ period_start: '2026-11-27', orders_count: '2', discount_total: '6000', paid_net: '30000', outstanding: '310000' }] };
    return { rows: [] };
  },
};
require.cache[require.resolve('../src/db/pool')] = { id: 'p', filename: 'p', loaded: true, exports: pool };

const app = require('../src/app');
const { COOKIE_NAME } = require('../src/middleware/auth');

let server, base;
before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api/v1/admin/recap`;
});
after(() => server.close());

const cookie = `${COOKIE_NAME}=${jwt.sign({ sub: '7', username: 'nabila' }, process.env.JWT_SECRET)}`;
const get = (path, admin = true) => fetch(`${base}${path}`, { headers: admin ? { cookie } : {} });
const Q = '?from=2026-11-27&to=2026-11-29&period=daily';

test('tanpa sesi admin: kedua route 401', async () => {
  assert.equal((await get(Q, false)).status, 401);
  assert.equal((await get(`/export.xlsx${Q}`, false)).status, 401);
});

test('validasi: parameter wajib, period, tanggal nyata, urutan, rentang maksimal -> 400 VALIDATION_ERROR', async () => {
  const bad = [
    '', '?from=2026-11-27&to=2026-11-29', '?from=2026-11-27&to=2026-11-29&period=monthly',
    '?from=27-11-2026&to=2026-11-29&period=daily', '?from=2026-02-31&to=2026-03-02&period=daily',
    '?from=2026-11-29&to=2026-11-27&period=daily', '?from=2025-01-01&to=2026-11-29&period=weekly',
  ];
  for (const q of bad) {
    const res = await get(q);
    assert.equal(res.status, 400, q);
    assert.equal((await res.json()).error.code, 'VALIDATION_ERROR', q);
  }
  const body = await (await get('?from=2026-11-27&to=2026-11-29&period=monthly')).json();
  assert.equal(body.error.details[0].field, 'period');
});

test('harian: bentuk respons sesuai RecapRow, angka dari kedua view digabung', async () => {
  calls.length = 0;
  const res = await get(Q);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(Object.keys(body), ['period', 'from', 'to', 'rows']);
  assert.equal(body.rows.length, 3);
  assert.deepEqual(body.rows[0], { period_start: '2026-11-27', period_end: '2026-11-27', orders_count: 2, subtotal: 270000, shipping_total: 40000, discount_total: 6000, paid_net: 30000, outstanding: 310000 });
  assert.equal(body.rows[2].subtotal, 0);
  assert.equal(calls.length, 2);
  for (const c of calls) assert.deepEqual(c.params, ['2026-11-27', '2026-11-29']);
});

test('SQL: hanya diproses + selesai di kedua sisi, tidak menyentuh nama/HP/alamat', async () => {
  calls.length = 0;
  await get('?from=2026-11-23&to=2026-11-29&period=weekly');
  const orders = calls.find((c) => c.sql.includes('COUNT(*)')).sql;
  assert.match(orders, /FROM recap_orders\s+WHERE status IN \('diproses', 'selesai'\)/);
  // recap_deliveries hanya membuang dibatalkan; menunggu_* harus disaring lewat recap_orders
  const deliveries = calls.find((c) => c.sql.includes('FROM recap_deliveries')).sql;
  assert.match(deliveries, /order_id IN \(SELECT order_id FROM recap_orders WHERE status IN \('diproses', 'selesai'\)\)/);
  assert.match(calls[0].sql + calls[1].sql, /ISODOW/);
  for (const c of calls) assert.ok(!/customer_name|phone|address|public_token|order_code/.test(c.sql));
});

test('export.xlsx: tipe, nama file, dan isi sama dengan JSON', async () => {
  const res = await get(`/export.xlsx${Q}`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /spreadsheetml\.sheet/);
  assert.match(res.headers.get('content-disposition'), /filename="rekap-daily-2026-11-27-2026-11-29\.xlsx"/);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(Buffer.from(await res.arrayBuffer()));
  assert.deepEqual(wb.getWorksheet('Rekap').getRow(2).values.slice(1), ['2026-11-27', '2026-11-27', 2, 270000, 40000, 6000, 30000, 310000]);
});

test('export.xlsx: parameter tidak valid tetap 400, bukan file', async () => {
  assert.equal((await get('/export.xlsx?period=daily')).status, 400);
});