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
// Bawaan: klik dari dasbor di browser modern (Sec-Fetch-Site same-origin). `extra` bisa menggantinya;
// nilai undefined menghapus header (browser lama tanpa Fetch Metadata).
const get = (path, admin = true, extra = {}) => {
  const headers = { 'Sec-Fetch-Site': 'same-origin', ...(admin ? { cookie } : {}), ...extra };
  for (const k of Object.keys(headers)) if (headers[k] === undefined) delete headers[k];
  return fetch(`${base}${path}`, { headers });
};
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

test('GET invoice.pdf dari situs lain (Sec-Fetch-Site cross-site/same-site): 403, tanpa menyentuh database', async () => {
  orderStatus = 'diproses';
  for (const site of ['cross-site', 'same-site']) {
    log.length = 0;
    const res = await get('/5/invoice.pdf', true, { 'Sec-Fetch-Site': site });
    assert.equal(res.status, 403);
    assert.equal((await res.json()).error.code, 'CROSS_SITE_REQUEST');
    assert.equal(log.length, 0); // tidak ada BEGIN, apalagi INSERT invoices
  }
});

test('GET invoice.pdf dari dasbor (same-origin) atau URL diketik (none) tetap lewat pemeriksaan asal', async () => {
  orderStatus = 'menunggu_konfirmasi'; // berhenti di requireConfirmed: bukti permintaan sampai ke route
  for (const site of ['same-origin', 'none']) {
    const res = await get('/5/invoice.pdf', true, { 'Sec-Fetch-Site': site });
    assert.equal((await res.json()).error.code, 'ORDER_NOT_CONFIRMED');
  }
});

// Browser lama tanpa Sec-Fetch-Site: asal dari Origin/Referer harus FRONTEND_ORIGIN (http://localhost:5173 di tes ini).
test('tanpa Sec-Fetch-Site: Origin/Referer dari dasbor lewat, situs lain atau tanpa asal 403 tanpa menyentuh database', async () => {
  orderStatus = 'menunggu_konfirmasi'; // yang lewat berhenti di requireConfirmed
  const tanpaFetchMetadata = { 'Sec-Fetch-Site': undefined };
  for (const asal of [{ Referer: 'http://localhost:5173/dapur/pesanan/5' }, { Origin: 'http://localhost:5173' }]) {
    const res = await get('/5/invoice.pdf', true, { ...tanpaFetchMetadata, ...asal });
    assert.equal((await res.json()).error.code, 'ORDER_NOT_CONFIRMED');
  }
  orderStatus = 'diproses';
  const ditolak = [
    {}, // tanpa Origin dan Referer: situs lain bisa membuang Referer
    { Referer: 'https://situs-lain.contoh/halaman' },
    { Referer: 'http://localhost:5173.contoh.com/' },
    { Origin: 'null' },
    { Origin: 'https://situs-lain.contoh' },
    { Referer: 'bukan url' },
  ];
  for (const asal of ditolak) {
    log.length = 0;
    const res = await get('/5/invoice.pdf', true, { ...tanpaFetchMetadata, ...asal });
    assert.equal(res.status, 403, JSON.stringify(asal));
    assert.equal((await res.json()).error.code, 'CROSS_SITE_REQUEST');
    assert.equal(log.length, 0);
  }
});

test('pesanan dibatalkan tanpa invoice: 409 ORDER_CANCELLED, tidak ada INSERT invoices', async () => {
  orderStatus = 'dibatalkan';
  log.length = 0;
  const res = await get('/5/invoice.pdf');
  assert.equal(res.status, 409);
  assert.equal((await res.json()).error.code, 'ORDER_CANCELLED');
  assert.ok(!log.some((s) => s.includes('INSERT INTO invoices')));
  assert.ok(log.includes('ROLLBACK'));
});

test('revisi sebelum invoice pernah terbit: 409 INVOICE_NOT_ISSUED', async () => {
  orderStatus = 'diproses';
  const res = await post('/5/invoice/revise');
  assert.equal(res.status, 409);
  assert.equal((await res.json()).error.code, 'INVOICE_NOT_ISSUED');
});
