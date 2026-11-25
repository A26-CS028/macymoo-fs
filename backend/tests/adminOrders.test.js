// /admin/orders dipasang oleh dua router (maclab.js dan orders.js); sesi admin harus dicek sekali saja.
const { test, before, after } = require('node:test');
const assert = require('node:assert');

process.env.JWT_SECRET = 'rahasia-uji-minimal-32-karakter-xx';
process.env.DATABASE_URL = 'postgres://uji@localhost/uji';
process.env.TURNSTILE_SECRET_KEY = 'rahasia-uji';
process.env.FRONTEND_ORIGIN = 'http://localhost:5173';
const jwt = require('jsonwebtoken');
const pool = require('../src/db/pool');

let adminChecks = 0;
pool.query = async (sql) => {
  if (sql.includes('admin_users')) adminChecks++;
  return { rows: [{ id: 7, username: 'nabila' }] };
};
const app = require('../src/app');
const { COOKIE_NAME } = require('../src/middleware/auth');
const { maclabOrderCreate } = require('../src/validators/maclab');

let server;
let base;
before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api/v1`;
});
after(() => server.close());

const cookie = () => `${COOKIE_NAME}=${jwt.sign({ sub: '7', username: 'nabila' }, process.env.JWT_SECRET)}`;

test('tanpa login, GET dan POST /admin/orders ditolak 401', async () => {
  for (const method of ['GET', 'POST']) {
    const res = await fetch(`${base}/admin/orders`, { method, headers: { 'Content-Type': 'application/json' }, body: method === 'POST' ? '{}' : undefined });
    assert.strictEqual(res.status, 401);
  }
});

test('request ke router orders.js hanya sekali mengecek sesi admin', async () => {
  adminChecks = 0;
  // id di luar batas INTEGER langsung 404 tanpa query pesanan
  const res = await fetch(`${base}/admin/orders/99999999999`, { headers: { Cookie: cookie() } });
  assert.strictEqual(res.status, 404);
  assert.strictEqual(adminChecks, 1);
});

test('POST MacLab tetap mengecek sesi admin', async () => {
  adminChecks = 0;
  const res = await fetch(`${base}/admin/orders`, { method: 'POST', headers: { Cookie: cookie(), 'Content-Type': 'application/json' }, body: '{}' });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(adminChecks, 1);
});

test('POST MacLab membalas 201 dengan bentuk detail pesanan (OrderDetail)', async () => {
  const saved = { query: pool.query, connect: pool.connect };
  const order = {
    id: 11, order_code: 'MYM-UJI', source: 'admin_form', customer_name: 'Kafe Contoh', phone: null, status: 'diproses',
    pay_status: 'belum_bayar', pay_timing: 'setelah_kirim', discount: 0, invoice_sent_at: null, public_token: 'x', created_at: new Date(),
  };
  const delivery = { id: 11, order_id: 11, delivery_date: '2099-01-01', method: 'ambil_sendiri', shipping_fee: 0 };
  pool.query = async (sql) => ({
    rows: sql.includes('admin_users') ? [{ id: 7, username: 'nabila' }]
      : sql.includes('FROM orders') ? [order]
      : sql.includes('FROM deliveries') ? [delivery] : [],
  });
  pool.connect = async () => ({
    query: async (sql) => ({
      rows: sql.includes('FROM menus') ? [{ id: 1, name: 'Mackster', price: 35000, is_available: true }]
        : sql.includes('RETURNING id') ? [{ id: 11 }] : [],
    }),
    release() {},
  });
  try {
    const res = await fetch(`${base}/admin/orders`, {
      method: 'POST',
      headers: { Cookie: cookie(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: 'Kafe Contoh',
        pay_timing: 'setelah_kirim',
        deliveries: [{ delivery_date: '2099-01-01', method: 'ambil_sendiri' }],
        items: [{ item_type: 'menu', menu_id: 1, qty: 5 }],
      }),
    });
    const body = await res.json();
    assert.strictEqual(res.status, 201, JSON.stringify(body));
    for (const key of ['order_code', 'discount', 'payments', 'invoices', 'events', 'totals']) assert.ok(key in body, key);
    assert.strictEqual(body.totals.per_delivery, undefined);
  } finally {
    Object.assign(pool, saved);
  }
});

test('MacLab: option_ids per item paling banyak 5', () => {
  const body = {
    customer_name: 'Kafe Contoh',
    pay_timing: 'setelah_kirim',
    deliveries: [{ delivery_date: '2099-01-01', method: 'ambil_sendiri' }],
    items: [{ item_type: 'menu', menu_id: 1, qty: 1, option_ids: [1, 2, 3, 4, 5, 6] }],
  };
  const { error } = maclabOrderCreate.validate(body, { abortEarly: false, stripUnknown: true });
  assert.deepStrictEqual(error.details.map((d) => d.path.join('.')), ['items.0.option_ids']);
});
