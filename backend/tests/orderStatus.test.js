// KF uji #7: jalankan tiap baris tabel transisi; perpindahan di luar tabel ditolak 409.
// Bayar dan Selesai (termasuk lompatan Menunggu Konfirmasi -> Selesai) diuji di paymentRules dan fulfillmentRules.
// Plus validasi permintaan dasbor pesanan (konfirmasi, jadwal ulang, batal).
const { test } = require('node:test');
const assert = require('node:assert');

const { nextStatus } = require('../src/services/orderStatus');
const { confirmOrder, rescheduleOrder, cancelOrder, listQuery } = require('../src/validators/adminOrder');
const { todayJakarta, addDays } = require('../src/utils/date');

test('setiap baris tabel transisi KF bagian 5 berhasil', () => {
  assert.strictEqual(nextStatus('menunggu_konfirmasi', 'confirm', { pay_timing: 'di_muka' }), 'menunggu_pembayaran');
  assert.strictEqual(nextStatus('menunggu_konfirmasi', 'confirm', { pay_timing: 'setelah_kirim' }), 'diproses');
  assert.strictEqual(nextStatus('menunggu_konfirmasi', 'cancel'), 'dibatalkan');
  assert.strictEqual(nextStatus('menunggu_pembayaran', 'cancel'), 'dibatalkan');
  assert.strictEqual(nextStatus('diproses', 'cancel'), 'dibatalkan');
});

test('perpindahan di luar tabel ditolak 409 INVALID_STATUS_TRANSITION', () => {
  const ditolak = [
    ['menunggu_pembayaran', 'confirm'],
    ['diproses', 'confirm'],
    ['selesai', 'cancel'],
    ['dibatalkan', 'cancel'],
    ['dibatalkan', 'confirm'],
  ];
  for (const [from, event] of ditolak) {
    assert.throws(() => nextStatus(from, event), (e) => e.status === 409 && e.code === 'INVALID_STATUS_TRANSITION' && /tidak bisa/.test(e.message), `${from} -> ${event}`);
  }
});

const check = (schema, body) => schema.validate(body, { abortEarly: false, stripUnknown: true });
const fields = (r) => (r.error ? r.error.details.map((d) => d.path.join('.')) : []);

test('konfirmasi: waktu bayar wajib, diskon/ongkir Rupiah bulat, pengiriman tidak dobel', () => {
  assert.deepStrictEqual(check(confirmOrder, { pay_timing: 'di_muka' }).value, { pay_timing: 'di_muka', discount: 0, shipping_fees: [] });
  assert.deepStrictEqual(fields(check(confirmOrder, {})), ['pay_timing']);
  assert.deepStrictEqual(fields(check(confirmOrder, { pay_timing: 'nanti' })), ['pay_timing']);
  assert.deepStrictEqual(fields(check(confirmOrder, { pay_timing: 'di_muka', discount: -1 })), ['discount']);
  assert.deepStrictEqual(fields(check(confirmOrder, { pay_timing: 'di_muka', shipping_fees: [{ delivery_id: 1, shipping_fee: 1.5 }] })), ['shipping_fees.0.shipping_fee']);
  const dobel = check(confirmOrder, { pay_timing: 'di_muka', shipping_fees: [{ delivery_id: 1, shipping_fee: 1 }, { delivery_id: 1, shipping_fee: 2 }] });
  assert.deepStrictEqual(fields(dobel), ['shipping_fees.1']);
});

test('jadwal ulang: tanggal baru tidak boleh lewat, alasan wajib', () => {
  const ok = { delivery_id: 3, new_date: todayJakarta(), reason: 'Brokoli belum tersedia' };
  assert.deepStrictEqual(fields(check(rescheduleOrder, ok)), []);
  assert.deepStrictEqual(fields(check(rescheduleOrder, { ...ok, new_date: addDays(todayJakarta(), -1) })), ['new_date']);
  assert.deepStrictEqual(fields(check(rescheduleOrder, { ...ok, new_date: '2026-02-30' })), ['new_date']);
  assert.deepStrictEqual(fields(check(rescheduleOrder, { ...ok, reason: '   ' })), ['reason']);
});

test('batal: alasan wajib dan maksimal 300 karakter', () => {
  assert.deepStrictEqual(fields(check(cancelOrder, { reason: 'Lewat batas bayar 4 jam' })), []);
  assert.deepStrictEqual(fields(check(cancelOrder, {})), ['reason']);
  assert.deepStrictEqual(fields(check(cancelOrder, { reason: 'x'.repeat(301) })), ['reason']);
});

test('filter daftar pesanan: status dan tanggal divalidasi', () => {
  assert.deepStrictEqual(fields(check(listQuery, { status: 'diproses', date: '2026-11-20', q: 'MYM' })), []);
  assert.deepStrictEqual(fields(check(listQuery, { status: 'hilang' })), ['status']);
  assert.deepStrictEqual(fields(check(listQuery, { date: '20-11-2026' })), ['date']);
});
