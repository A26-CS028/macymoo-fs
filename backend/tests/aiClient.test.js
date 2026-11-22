// MooLabel lewat aiClient: catatan terkirim dengan secret, label tersimpan, dan AI gagal tidak mengganggu pesanan (uji 13).
const { test, beforeEach } = require('node:test');
const assert = require('node:assert');

process.env.JWT_SECRET = 'rahasia-uji-minimal-32-karakter-xx';
process.env.DATABASE_URL = 'postgres://uji@localhost/uji';
process.env.TURNSTILE_SECRET_KEY = 'rahasia-uji';
process.env.FRONTEND_ORIGIN = 'http://localhost:5173';
const env = require('../src/config/env');
const pool = require('../src/db/pool');
const { labelItems } = require('../src/services/aiClient');

let calls;
let inserts;
let reply;
global.fetch = async (url, opts) => {
  calls.push({ url: String(url), opts, body: JSON.parse(opts.body) });
  return reply(JSON.parse(opts.body));
};
pool.query = async (sql, params) => {
  inserts.push({ sql, params });
  return { rows: [] };
};
const ok = (data) => ({ ok: true, status: 200, json: async () => data });

beforeEach(() => {
  calls = [];
  inserts = [];
  env.aiServiceUrl = 'http://ai.uji';
  env.aiInternalSecret = 'secret-uji';
  reply = (body) =>
    ok({
      model_version: 'linsvm-v2',
      items: body.items.map((i) => ({ order_item_id: i.order_item_id, labels: ['saus_terpisah', 'alergi'], scores: {} })),
    });
});

test('hanya catatan berisi yang dikirim, dengan X-Internal-Secret, lalu label tersimpan', async () => {
  await labelItems([
    { order_item_id: 1, note: 'saus dipisah, alergi kacang' },
    { order_item_id: 2, note: '' },
    { order_item_id: 3, note: ' - ' },
    { order_item_id: 4, note: null },
  ]);
  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0].url, 'http://ai.uji/v1/moolabel/predict');
  assert.strictEqual(calls[0].opts.headers['X-Internal-Secret'], 'secret-uji');
  assert.deepStrictEqual(calls[0].body, { items: [{ order_item_id: 1, note: 'saus dipisah, alergi kacang' }] });
  assert.strictEqual(inserts.length, 1);
  assert.deepStrictEqual(inserts[0].params, [[1, 1], ['saus_terpisah', 'alergi'], 'linsvm-v2']);
});

test('tanpa catatan atau tanpa AI_SERVICE_URL: AI tidak dipanggil', async () => {
  await labelItems([{ order_item_id: 1, note: '' }]);
  env.aiServiceUrl = undefined;
  await labelItems([{ order_item_id: 1, note: 'saus dipisah' }]);
  assert.strictEqual(calls.length, 0);
  assert.strictEqual(inserts.length, 0);
});

test('AI 503, 401, jaringan putus, atau timeout: tidak throw dan tidak menyimpan apa pun', async () => {
  for (const r of [
    () => ({ ok: false, status: 503 }),
    () => ({ ok: false, status: 401 }),
    () => { throw new TypeError('fetch failed'); },
    () => { throw new DOMException('The operation was aborted due to timeout', 'TimeoutError'); },
  ]) {
    reply = r;
    await labelItems([{ order_item_id: 1, note: 'saus dipisah' }]);
  }
  assert.strictEqual(calls.length, 4);
  assert.strictEqual(inserts.length, 0);
});

test('item yang tidak dikirim atau tanpa label diabaikan; database gagal tidak throw', async () => {
  reply = () =>
    ok({
      model_version: 'linsvm-v2',
      items: [
        { order_item_id: 1, labels: [] },
        { order_item_id: 99, labels: ['alergi'] },
      ],
    });
  await labelItems([{ order_item_id: 1, note: 'tolong cepat' }]);
  assert.strictEqual(inserts.length, 0);

  reply = () => ok({ model_version: 'linsvm-v2', items: [{ order_item_id: 1, labels: ['kemasan'] }] });
  pool.query = async () => { throw new Error('koneksi putus'); };
  await labelItems([{ order_item_id: 1, note: 'bungkus rapat' }]);
});
