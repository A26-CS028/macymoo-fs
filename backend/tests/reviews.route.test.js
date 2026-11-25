const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

// Pool palsu: satu tabel reviews di memori, meniru UPDATE bersyarat dan SELECT di route.
const reviews = new Map(); // token -> { id, rating, comment, expires }
const pool = {
  query: async (sql, p = []) => {
    if (sql.startsWith('UPDATE')) {
      const r = reviews.get(p[0]);
      if (!r || r.rating !== null || r.expires <= Date.now()) return { rows: [] };
      Object.assign(r, { rating: p[1], comment: p[2] });
      return { rows: [{ id: r.id, rating: r.rating, comment: r.comment, created_at: 'x' }] };
    }
    if (sql.startsWith('SELECT rating')) {
      const r = reviews.get(p[0]);
      return { rows: r ? [{ rating: r.rating, expired: r.expires <= Date.now() }] : [] };
    }
    return { rows: [] };
  },
};
require.cache[require.resolve('../src/db/pool')] = { id: 'p', filename: 'p', loaded: true, exports: pool };
require.cache[require.resolve('../src/middleware/rateLimit')] = { id: 'r', filename: 'r', loaded: true, exports: () => (q, s, n) => n() };
require.cache[require.resolve('../src/middleware/turnstile')] = { id: 't', filename: 't', loaded: true, exports: (q, s, n) => n() };

const router = require('../src/routes/public/reviews');
let server, base;
before(() => {
  const app = express();
  app.use(express.json());
  app.use(router);
  app.use((err, req, res, next) => res.status(err.status || 500).json({ code: err.code }));
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}/reviews/`;
});
after(() => server.close());

const kirim = (token, body) => fetch(base + token, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ turnstile_token: 'x', ...body }) });

test('kirim sekali 201, kedua kali 409 REVIEW_ALREADY_SUBMITTED', async () => {
  reviews.set('aktif', { id: 1, rating: null, comment: null, expires: Date.now() + 864e5 });
  assert.equal((await kirim('aktif', { rating: 5, comment: 'Enak' })).status, 201);
  const r = await kirim('aktif', { rating: 4 });
  assert.equal(r.status, 409);
  assert.equal((await r.json()).code, 'REVIEW_ALREADY_SUBMITTED');
});

test('token lewat 7 hari -> 409 REVIEW_TOKEN_EXPIRED; tidak dikenal -> 404', async () => {
  reviews.set('lama', { id: 2, rating: null, comment: null, expires: Date.now() - 1 });
  const r = await kirim('lama', { rating: 5 });
  assert.equal(r.status, 409);
  assert.equal((await r.json()).code, 'REVIEW_TOKEN_EXPIRED');
  assert.equal((await kirim('ngawur', { rating: 5 })).status, 404);
});

test('rating di luar 1-5 atau komentar > 200 karakter -> 400', async () => {
  reviews.set('baru', { id: 3, rating: null, comment: null, expires: Date.now() + 864e5 });
  assert.equal((await kirim('baru', { rating: 6 })).status, 400);
  assert.equal((await kirim('baru', { rating: 0 })).status, 400);
  assert.equal((await kirim('baru', { rating: 5, comment: 'x'.repeat(201) })).status, 400);
});
