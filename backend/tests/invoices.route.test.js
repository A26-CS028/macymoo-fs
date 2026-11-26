const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'rahasia-uji-minimal-32-karakter-xx';
process.env.DATABASE_URL = 'postgres://uji@localhost/uji';
process.env.TURNSTILE_SECRET_KEY = 'rahasia-uji';
process.env.FRONTEND_ORIGIN = 'http://localhost:5173';

// Pool palsu untuk jalur penolakan: tidak ada query detail pesanan karena fungsi withOrder berhenti sebelum loadDetail.
// Admin 7 selalu ada. Status pesanan bisa diubah per tes; tabel invoices selalu kosong.
let orderStatus = 'menunggu_konfirmasi';
const log = [];
const client = {
  query: async (sql) => {
    log.push(sql);
    if (sql.includes('FROM orders WHERE id')) return { rows: [{ id: 5, status: orderStatus }] };
    return { rows: [] }; // BEGIN, ROLLBACK, SELECT dari invoices
  },
  release: () => {},
};
const pool = {
  query: async (sql) => (sql.includes('admin_users') ? { rows: [{ id: 7, username: 'nabila' }] } : { rows: [] }),
  connect: async () => client,
};
require.cache[require.resolve('../src/db/pool')] = { id: 'p', filename: 'p', loaded: true, exports: pool };

const app = require('../src/app');
const { COOKIE_NAME } = require('../src/middleware/auth');

let server, base;
before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api/v1/admin/orders`;
});
after(() => server.close());

const cookie = `${COOKIE_NAME}=${jwt.sign({ sub: '7', username: 'nabila' }, process.env.JWT_SECRET)}`;
const get = (path, admin = true) => fetch(`${base}${path}`, { headers: admin ? { cookie } : {} });
const post = (path, admin = true) => fetch(`${base}${path}`, { method: 'POST', headers: admin ? { cookie } : {} });

test('tanpa sesi admin: kedua route 401', async () => {
  assert.equal((await get('/5/invoice.pdf', false)).status, 401);
  assert.equal((await post('/5/invoice/revise', false)).status, 401);
});

test('id di luar batas INTEGER: 404, bukan 500', async () => {
  assert.equal((await get('/99999999999/invoice.pdf')).status, 404);
  assert.equal((await post('/99999999999/invoice/revise')).status, 404);
});

test('pesanan menunggu_konfirmasi: 409 ORDER_NOT_CONFIRMED, tanpa menyentuh tabel invoices', async () => {
  orderStatus = 'menunggu_konfirmasi';
  log.length = 0;
  for (const res of [await get('/5/invoice.pdf'), await post('/5/invoice/revise')]) {
    assert.equal(res.status, 409);
    assert.equal((await res.json()).error.code, 'ORDER_NOT_CONFIRMED');
  }
  assert.ok(!log.some((s) => s.includes('invoices')));
  assert.ok(log.includes('ROLLBACK'));
});

test('revisi sebelum invoice pernah terbit: 409 INVOICE_NOT_ISSUED', async () => {
  orderStatus = 'diproses';
  const res = await post('/5/invoice/revise');
  assert.equal(res.status, 409);
  assert.equal((await res.json()).error.code, 'INVOICE_NOT_ISSUED');
});
