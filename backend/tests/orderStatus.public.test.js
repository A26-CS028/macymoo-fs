const { test } = require('node:test');
const assert = require('node:assert/strict');

// Modul ikut memuat route admin; pool, auth, dan rate limit dipalsukan supaya tidak butuh env/database.
require.cache[require.resolve('../src/db/pool')] = { id: 'p', filename: 'p', loaded: true, exports: { query: async () => ({ rows: [] }) } };
require.cache[require.resolve('../src/middleware/auth')] = { id: 'a', filename: 'a', loaded: true, exports: { requireAdmin: (q, s, n) => n() } };
require.cache[require.resolve('../src/middleware/rateLimit')] = { id: 'r', filename: 'r', loaded: true, exports: () => (q, s, n) => n() };
const { toPublic } = require('../src/routes/public/orderStatus');

const detail = (status) => ({
  id: 9, order_code: 'MYM-ABCDE', public_token: 't'.repeat(32), customer_name: 'Sinta', phone: '6281234567890', source: 'web_form',
  status, pay_status: 'belum_bayar', pay_timing: 'di_muka', pay_deadline_at: null, payment_overdue: false, discount: 0,
  deliveries: [{ id: 1, delivery_date: '2026-11-28', method: 'antar_nabila', address: 'Jl. Rahasia 1', shipping_fee: 15000 }],
  items: [{ id: 2, name: 'Nutrimac', qty: 1, note: 'saus dipisah', labels: [{ label: 'x' }], note_flags: [], options: [] }],
  payments: [{ id: 1 }], invoices: [], events: [{ id: 1 }], totals: { grand_total: 52000, balance_due: 52000 }, created_at: 'x',
});
const settings = { bank_name: 'BCA', bank_account_number: '123', bank_account_holder: 'Nabila', qris_image_url: null, wa_number: '6281200000000' };

test('tanpa data pribadi, label, pembayaran, dan riwayat admin', () => {
  const p = toPublic(detail('menunggu_pembayaran'), settings);
  const json = JSON.stringify(p);
  for (const bocor of ['Sinta', '6281234567890', 'Jl. Rahasia', 'labels', 'note_flags', 'events', 'payments', '"id":9']) {
    assert.ok(!json.includes(bocor), `bocor: ${bocor}`);
  }
  assert.equal(p.items[0].note, 'saus dipisah'); // catatan pelanggan sendiri tetap tampil
  assert.match(p.wa_link, /wa\.me\/6281200000000.*MYM-ABCDE/);
});

test('payment_info hanya setelah dikonfirmasi dan tidak dibatalkan', () => {
  assert.equal(toPublic(detail('menunggu_konfirmasi'), settings).payment_info, undefined);
  assert.equal(toPublic(detail('dibatalkan'), settings).payment_info, undefined);
  assert.equal(toPublic(detail('menunggu_pembayaran'), settings).payment_info.bank_name, 'BCA');
});

test('link ulasan hanya untuk pesanan Selesai yang belum diulas dan belum kedaluwarsa', () => {
  const besok = new Date(Date.now() + 864e5).toISOString();
  const kemarin = new Date(Date.now() - 864e5).toISOString();
  const r = { token: 'r'.repeat(32), token_expires_at: besok, rating: null };
  assert.equal(toPublic(detail('selesai'), settings, r).review.token, r.token);
  assert.equal(toPublic(detail('diproses'), settings, r).review, null);
  assert.equal(toPublic(detail('selesai'), settings, { ...r, rating: 5 }).review, null);
  assert.equal(toPublic(detail('selesai'), settings, { ...r, token_expires_at: kemarin }).review, null);
  assert.equal(toPublic(detail('selesai'), settings).review, null);
});

test('wa_link null bila nomor Nabila belum diisi', () => {
  assert.equal(toPublic(detail('diproses'), { ...settings, wa_number: null }).wa_link, null);
});
