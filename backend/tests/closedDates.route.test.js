const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

// Pool palsu: tabel closed_dates di memori, meniru query yang dipakai route.
const rows = new Map(); // id -> tanggal
let nextId = 1;
const pool = {
  query: async (sql, p = []) => {
    if (sql.startsWith('INSERT')) {
      if ([...rows.values()].includes(p[0])) return { rows: [] };
      rows.set(nextId, p[0]);
      return { rows: [{ id: nextId++, closed_date: p[0] }] };
    }
    if (sql.startsWith('DELETE')) return { rowCount: rows.delete(p[0]) ? 1 : 0 };
    return { rows: [] };
  },
};
require.cache[require.resolve('../src/db/pool')] = { id: 'p', filename: 'p', loaded: true, exports: pool };
const requireAdmin = (req, res, next) => (req.headers['x-admin'] ? next() : res.status(401).json({ code: 'UNAUTHORIZED' }));
require.cache[require.resolve('../src/middleware/auth')] = { id: 'a', filename: 'a', loaded: true, exports: { requireAdmin } };

const { todayJakarta, addDays } = require('../src/utils/date');
const router = require('../src/routes/admin/closedDates');
let server, base;
before(() => {
  const app = express();
  app.use(express.json());
  app.use('/admin/closed-dates', router);
  app.use((err, req, res, next) => res.status(err.status || 500).json({ code: err.code }));
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}/admin/closed-dates`;
});
after(() => server.close());

const call = (method, path = '', body, admin = true) =>
  fetch(base + path, { method, headers: { 'content-type': 'application/json', ...(admin ? { 'x-admin': '1' } : {}) }, body: body && JSON.stringify(body) });

test('tanpa sesi admin -> 401', async () => {
  assert.equal((await call('POST', '', { closed_date: addDays(todayJakarta(), 3) }, false)).status, 401);
});

test('tutup, tutup lagi (409), lalu buka (204, kedua kali 404)', async () => {
  const d = addDays(todayJakarta(), 3);
  const r = await call('POST', '', { closed_date: d });
  assert.equal(r.status, 201);
  const { id, closed_date } = await r.json();
  assert.equal(closed_date, d);
  assert.equal((await call('POST', '', { closed_date: d })).status, 409);
  assert.equal((await call('DELETE', `/${id}`)).status, 204);
  assert.equal((await call('DELETE', `/${id}`)).status, 404);
});

test('tanggal lewat atau salah format -> 400', async () => {
  assert.equal((await call('POST', '', { closed_date: addDays(todayJakarta(), -1) })).status, 400);
  assert.equal((await call('POST', '', { closed_date: '2026-02-30' })).status, 400);
  assert.equal((await call('POST', '', {})).status, 400);
});
