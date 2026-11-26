const test = require('node:test');
const assert = require('node:assert/strict');
const { rupiah, formatDate, buildInvoiceModel, buildInvoicePdf } = require('../src/services/invoicePdf');

// Kasus uji 3 (KF 16): 2 pengiriman Wraphoria 5 pcs, ongkir Rp20.000 per kirim -> Rp310.000
function detail3(overrides = {}) {
  return {
    order_code: 'MYM-0001',
    customer_name: 'Kafe Contoh',
    deliveries: [
      { id: 1, delivery_date: '2026-11-20', method: 'antar_nabila', shipping_fee: 20000 },
      { id: 2, delivery_date: '2026-11-21', method: 'antar_nabila', shipping_fee: 20000 },
    ],
    items: [
      { id: 1, delivery_id: 1, name: 'Wraphoria', unit_price: 27000, qty: 5, line_total: 135000, options: [] },
      { id: 2, delivery_id: 2, name: 'Wraphoria', unit_price: 27000, qty: 5, line_total: 135000, options: [] },
    ],
    payments: [],
    totals: { subtotal: 270000, shipping_total: 40000, discount: 0, grand_total: 310000, paid_net: 0, balance_due: 310000, refund_due: 0 },
    ...overrides,
  };
}
const inv = { display_no: 'INV/20261120/MYM/001', issued_at: '2026-11-20' };

test('format Rupiah dan tanggal', () => {
  assert.equal(rupiah(0), 'Rp0');
  assert.equal(rupiah(35000), 'Rp35.000');
  assert.equal(rupiah(1250000), 'Rp1.250.000');
  assert.equal(rupiah(-5000), '-Rp5.000');
  assert.equal(formatDate('2026-11-20'), '20 November 2026');
});

test('model: ongkir per pengiriman dan total Rp310.000 (uji 3)', () => {
  const m = buildInvoiceModel(detail3(), inv);
  assert.equal(m.sections.length, 2);
  assert.deepEqual(m.sections.map((s) => s.shipping_fee), [20000, 20000]);
  assert.deepEqual(m.sections.map((s) => s.title), ['Pengiriman 1', 'Pengiriman 2']);
  const byLabel = Object.fromEntries(m.totals.map((r) => [r.label, r.value]));
  assert.equal(byLabel.Subtotal, 'Rp270.000');
  assert.equal(byLabel.Ongkir, 'Rp40.000');
  assert.equal(byLabel.Total, 'Rp310.000');
  assert.equal(byLabel['Sisa tagihan'], 'Rp310.000');
  assert.equal('Diskon' in byLabel, false);
});

test('model: opsi menambah harga satuan, diskon tampil sebagai baris, Ambil Sendiri tanpa ongkir', () => {
  const d = detail3({
    deliveries: [{ id: 1, delivery_date: '2026-11-20', method: 'ambil_sendiri', shipping_fee: 0 }],
    items: [{ id: 1, delivery_id: 1, name: 'Mackster', unit_price: 35000, qty: 2, line_total: 76000, options: [{ name: 'tambah keju', extra_price: 3000 }, { name: 'spicy', extra_price: 0 }] }],
    totals: { subtotal: 76000, shipping_total: 0, discount: 6000, grand_total: 70000, paid_net: 0, balance_due: 70000, refund_due: 0 },
  });
  const m = buildInvoiceModel(d, inv);
  assert.equal(m.sections[0].title, 'Pengiriman');
  assert.equal(m.sections[0].shipping_fee, null);
  assert.equal(m.sections[0].items[0].unit, 38000);
  assert.equal(m.sections[0].items[0].qty * m.sections[0].items[0].unit, m.sections[0].items[0].total);
  assert.deepEqual(m.sections[0].items[0].options, ['tambah keju (+Rp3.000)', 'spicy']);
  assert.equal(m.totals.find((r) => r.label === 'Diskon').value, '-Rp6.000');
});

test('model: nama pelanggan kosong (Anonimkan) jadi "-"; pesanan batal menampilkan refund', () => {
  const d = detail3({
    customer_name: null,
    payments: [{ type: 'pelunasan', amount: 310000 }],
    totals: { ...detail3().totals, paid_net: 310000, balance_due: 0, refund_due: 310000 },
  });
  const m = buildInvoiceModel(d, inv);
  assert.equal(m.customer, '-');
  const labels = m.totals.map((r) => r.label);
  assert.ok(labels.includes('Perlu dikembalikan'));
  assert.ok(!labels.includes('Sisa tagihan'));
});

test('buildInvoicePdf menghasilkan berkas PDF sah, termasuk pesanan panjang (banyak halaman)', async () => {
  const pdf = await buildInvoicePdf({ detail: detail3(), invoice: inv });
  assert.ok(Buffer.isBuffer(pdf));
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  assert.match(pdf.subarray(-16).toString(), /%%EOF/);

  const items = Array.from({ length: 80 }, (_, i) => ({ id: i + 1, delivery_id: 1, name: `Item ${i + 1}`, unit_price: 1000, qty: 1, line_total: 1000, options: [{ name: 'opsi panjang', extra_price: 0 }] }));
  const big = await buildInvoicePdf({ detail: detail3({ items }), invoice: inv });
  assert.equal(big.subarray(0, 5).toString(), '%PDF-');
  assert.ok(big.length > pdf.length);
});
