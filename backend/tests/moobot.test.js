// POST /moobot/chat: konteks dari database, Turnstile, batas pesan, dan AI gagal -> 503, tanpa database dan tanpa jaringan.
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');

process.env.JWT_SECRET = 'rahasia-uji-minimal-32-karakter-xx';
process.env.DATABASE_URL = 'postgres://uji@localhost/uji';
process.env.TURNSTILE_SECRET_KEY = 'rahasia-uji';
process.env.FRONTEND_ORIGIN = 'http://localhost:5173';
const env = require('../src/config/env');
const pool = require('../src/db/pool');

let logs;
let aiCalls;
let aiReply;
let turnstileOk;
pool.query = async (sql, params = []) => {
  if (sql.includes('INSERT INTO rate_limits')) return { rows: [{ hits: 1 }] };
  if (sql.includes('DELETE FROM rate_limits')) return { rows: [] };
  if (sql.includes('FROM menus')) {
    return { rows: [{ id: 1, name: 'Mackster', description: 'Mac & cheese, saus keju kornet', price: 35000 }] };
  }
  if (sql.includes('FROM menu_options')) {
    return {
      rows: [
        { menu_id: 1, option_group: 'pedas', name: 'Light', extra_price: 0 },
        { menu_id: 1, option_group: 'pedas', name: 'Spicy', extra_price: 0 },
        { menu_id: 1, option_group: 'keju', name: 'Tambah keju', extra_price: 3000 },
      ],
    };
  }
  if (sql.includes('FROM closed_dates')) return { rows: [{ d: '2026-11-25' }] };
  if (sql.includes('INSERT INTO chat_logs')) {
    logs.push(params);
    return { rows: [] };
  }
  throw new Error(`query tak terduga: ${sql}`);
};

const realFetch = global.fetch;
global.fetch = async (url, opts) => {
  const u = String(url);
  if (u.startsWith('http://127.0.0.1')) return realFetch(url, opts); // permintaan tes ke app
  if (u.includes('challenges.cloudflare.com')) return { json: async () => ({ success: turnstileOk }) };
  aiCalls.push({ url: u, opts, body: JSON.parse(opts.body) });
  return aiReply();
};

const app = require('../src/app');
let server;
let base;
before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api/v1`;
});
after(() => server.close());
beforeEach(() => {
  logs = [];
  aiCalls = [];
  turnstileOk = true;
  env.aiServiceUrl = 'http://ai.uji';
  env.aiInternalSecret = 'secret-uji';
  aiReply = () => ({ ok: true, status: 200, json: async () => ({ reply: 'Mackster harganya Rp35.000.' }) });
});

const ask = (body) =>
  fetch(`${base}/moobot/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ turnstile_token: 'token', ...body }),
  });

test('menjawab dari konteks database, dengan secret, lalu dicatat di chat_logs', async () => {
  const res = await ask({ message: '  Mackster berapa?  ' });
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(await res.json(), { reply: 'Mackster harganya Rp35.000.' });

  assert.strictEqual(aiCalls.length, 1);
  assert.strictEqual(aiCalls[0].url, 'http://ai.uji/v1/moobot/chat');
  assert.strictEqual(aiCalls[0].opts.headers['X-Internal-Secret'], 'secret-uji');
  const { message, context } = aiCalls[0].body;
  assert.strictEqual(message, 'Mackster berapa?');
  assert.match(context, /^MENU\n- Mackster: Rp35\.000\. Mac & cheese, saus keju kornet\. Opsi: pedas \(Light, Spicy\); keju \(Tambah keju \+Rp3\.000\)\.$/m);
  assert.match(context, /TANGGAL DITUTUP\n- 2026-11-25/);
  assert.match(context, /ATURAN\n- Tanggal kirim paling cepat besok/);
  assert.ok(context.length <= 8000);
  assert.deepStrictEqual(logs, [['Mackster berapa?', 'Mackster harganya Rp35.000.']]);
});

test('AI 503, putus, atau belum dipasang: 503 AI_UNAVAILABLE, pesan tetap dicatat tanpa jawaban', async () => {
  for (const setup of [
    () => { aiReply = () => ({ ok: false, status: 503 }); },
    () => { aiReply = () => { throw new TypeError('fetch failed'); }; },
    () => { env.aiServiceUrl = undefined; },
  ]) {
    setup();
    const res = await ask({ message: 'Ada menu apa?' });
    assert.strictEqual(res.status, 503);
    assert.strictEqual((await res.json()).error.code, 'AI_UNAVAILABLE');
  }
  assert.deepStrictEqual(logs, Array(3).fill(['Ada menu apa?', null]));
});

test('pesan kosong, lebih dari 500 karakter, atau Turnstile gagal: ditolak sebelum memanggil AI', async () => {
  assert.strictEqual((await ask({ message: '   ' })).status, 400);
  assert.strictEqual((await ask({ message: 'a'.repeat(501) })).status, 400);
  turnstileOk = false;
  const res = await ask({ message: 'Halo' });
  assert.strictEqual(res.status, 400);
  assert.strictEqual((await res.json()).error.code, 'TURNSTILE_FAILED');
  assert.strictEqual(aiCalls.length, 0);
  assert.strictEqual(logs.length, 0);
});
