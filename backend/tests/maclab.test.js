const { test } = require('node:test');
const assert = require('node:assert');

const { maclabOrderCreate } = require('../src/validators/maclab');
const { todayJakarta } = require('../src/utils/date');

const valid = () => ({
  customer_name: 'Kafe Contoh',
  phone: '081234567890',
  pay_timing: 'setelah_kirim',
  deliveries: [{ delivery_date: todayJakarta(), method: 'ambil_sendiri' }],
  items: [{ item_type: 'menu', menu_id: 1, qty: 5 }],
});
const check = (body) => maclabOrderCreate.validate(body, { abortEarly: false, stripUnknown: true });
const fields = (r) => (r.error ? r.error.details.map((d) => d.path.join('.')) : []);

test('nomor HP MacLab diterima dalam format yang sama dengan form publik dan disimpan sebagai 62…', () => {
  for (const phone of ['081234567890', '6281234567890', '+6281234567890']) {
    assert.strictEqual(check({ ...valid(), phone }).value.phone, '6281234567890');
  }
  assert.strictEqual(check({ ...valid(), phone: '' }).error, undefined);
  assert.deepStrictEqual(fields(check({ ...valid(), phone: '08abc123456' })), ['phone']);
});

test('diskon MacLab dibatasi Rp10.000.000, sama dengan konfirmasi pesanan', () => {
  assert.strictEqual(check({ ...valid(), discount: 10000000 }).error, undefined);
  assert.deepStrictEqual(fields(check({ ...valid(), discount: 10000001 })), ['discount']);
});

// Kunci ini dibaca MacLab.jsx untuk menampilkan error di baris pengiriman dan item.
test('error per baris memakai kunci titik: deliveries.0.x dan items.0.x', () => {
  const r = check({
    ...valid(),
    deliveries: [{ delivery_date: '2000-01-01', method: 'antar_nabila', shipping_fee: 0 }],
    items: [{ item_type: 'item_bebas', unit_price: 1000, qty: 0 }],
  });
  assert.deepStrictEqual(fields(r).sort(), [
    'deliveries.0.address',
    'deliveries.0.delivery_date',
    'items.0.custom_name',
    'items.0.qty',
  ]);
});
