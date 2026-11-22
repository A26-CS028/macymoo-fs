const env = require('../config/env');
const pool = require('../db/pool');

// Express -> FastAPI (KF 9.4). Gagal atau AI tidak dipasang: null, pemanggil jalan terus (uji 13).
async function callAI(path, body) {
  if (!env.aiServiceUrl) return null;
  try {
    const r = await fetch(new URL(path, env.aiServiceUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Internal-Secret': env.aiInternalSecret || '' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(env.aiTimeoutMs),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } catch (err) {
    console.error(`AI ${path} gagal:`, err.message); // isi catatan tidak ikut dicatat
    return null;
  }
}

// Catatan kosong atau hanya tanda strip tidak dikirim ke model (docs/openapi.yaml).
const hasText = (note) => typeof note === 'string' && /[^\s\-–—]/.test(note);

// items: [{ order_item_id, note }]. Tidak pernah throw: pesanan sudah tersimpan sebelum ini.
async function labelItems(items) {
  const send = items.filter((i) => hasText(i.note)).map(({ order_item_id, note }) => ({ order_item_id, note }));
  if (send.length === 0) return;
  const res = await callAI('/v1/moolabel/predict', { items: send });
  if (!Array.isArray(res?.items)) return;

  const sent = new Set(send.map((i) => i.order_item_id));
  const ids = [];
  const labels = [];
  for (const it of res.items) {
    if (!sent.has(it.order_item_id) || !Array.isArray(it.labels)) continue;
    for (const label of it.labels) {
      ids.push(it.order_item_id);
      labels.push(String(label));
    }
  }
  if (ids.length === 0) return;
  try {
    await pool.query(
      `INSERT INTO order_item_labels (order_item_id, label, model_version)
       SELECT x.id, x.label, $3 FROM unnest($1::int[], $2::text[]) AS x(id, label)
       ON CONFLICT (order_item_id, label) DO NOTHING`,
      [ids, labels, res.model_version ?? null]
    );
  } catch (err) {
    console.error('Simpan label MooLabel gagal:', err.message);
  }
}

module.exports = { labelItems };
