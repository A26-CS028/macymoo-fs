const test = require('node:test');
const assert = require('node:assert/strict');
const { buildKitchen } = require('../src/services/kitchen');

const base = { moolabelActive: true, labels: [], chosen: [], menuOptions: [] };
const d = (over) => ({ id: 1, delivery_id: 10, order_code: 'MYM-AAAAA', customer_name: 'Budi', method: 'ambil_sendiri', status: 'diproses', pay_status: 'lunas', pay_timing: 'setelah_kirim', invoice_sent_at: null, ...over });

test('daftar masak: Diproses di in_progress, Menunggu Pembayaran terpisah di unpaid', () => {
  const r = buildKitchen({
    ...base, date: '2026-11-27',
    deliveries: [d({}), d({ id: 2, delivery_id: 11, order_code: 'MYM-BBBBB', status: 'menunggu_pembayaran', pay_status: 'belum_bayar', pay_timing: 'di_muka' })],
    items: [
      { id: 100, delivery_id: 10, item_type: 'menu', menu_id: 1, name: 'Mackster', qty: 2, note: 'sausnya dipisah ya' },
      { id: 101, delivery_id: 10, item_type: 'menu', menu_id: 2, name: 'Nutrimac', qty: 1, note: null },
      { id: 102, delivery_id: 11, item_type: 'menu', menu_id: 1, name: 'Mackster', qty: 5, note: null },
    ],
  });
  assert.equal(r.in_progress.length, 1);
  assert.equal(r.unpaid.length, 1);
  assert.equal(r.unpaid[0].order_code, 'MYM-BBBBB');
  assert.equal(r.portions_total, 3); // pesanan belum dibayar tidak dihitung
  assert.deepEqual(r.portions_by_menu, [{ name: 'Mackster', qty: 2 }, { name: 'Nutrimac', qty: 1 }]);
  assert.equal(r.moolabel_active, true);
});

test('opsi, label, dan catatan asli tampil; flag dari aturan backend', () => {
  const r = buildKitchen({
    ...base, date: '2026-11-27', deliveries: [d({})],
    items: [{ id: 100, delivery_id: 10, item_type: 'menu', menu_id: 3, name: 'Wraphoria', qty: 1, note: 'pedes banget ya kak' }],
    chosen: [{ order_item_id: 100, option_group: 'pedas', name: 'Light' }],
    labels: [{ order_item_id: 100, label: 'saus_terpisah' }],
    menuOptions: [{ menu_id: 3, option_group: 'pedas', name: 'Light', extra_price: 0 }],
  });
  const it = r.in_progress[0].items[0];
  assert.deepEqual(it.options, ['Light']);
  assert.deepEqual(it.labels, ['saus_terpisah']);
  assert.equal(it.note, 'pedes banget ya kak');
  assert.equal(it.note_flags.length, 1);
});

test('tanggal tanpa pesanan: daftar kosong, total 0', () => {
  const r = buildKitchen({ ...base, date: '2026-11-28', deliveries: [], items: [], moolabelActive: false });
  assert.deepEqual([r.portions_total, r.in_progress, r.unpaid, r.moolabel_active], [0, [], [], false]);
});
