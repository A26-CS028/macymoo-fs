// Uji 8 (KF 16): tagihan bayar di muka dibiarkan lewat 4 jam -> tanda "Lewat batas bayar"
// muncul, status pesanan tidak berubah. Fungsi murni, tanpa database.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { payDeadline, isOverdue } = require('../src/services/paymentDeadline');

const HOUR = 60 * 60 * 1000;
const ago = (ms) => new Date(Date.now() - ms);
const order = (over = {}) => ({
  status: 'menunggu_pembayaran',
  pay_timing: 'di_muka',
  invoice_sent_at: ago(5 * HOUR),
  ...over,
});

test('payDeadline: tepat 4 jam setelah tagihan dikirim', () => {
  const sent = new Date('2026-11-23T03:00:00.000Z');
  const deadline = payDeadline(order({ invoice_sent_at: sent }));
  assert.equal(deadline.toISOString(), '2026-11-23T07:00:00.000Z');
});

test('payDeadline: menerima invoice_sent_at berupa string ISO', () => {
  const deadline = payDeadline(order({ invoice_sent_at: '2026-11-23T03:00:00.000Z' }));
  assert.equal(deadline.toISOString(), '2026-11-23T07:00:00.000Z');
});

test('payDeadline: null bila bayar setelah kirim', () => {
  assert.equal(payDeadline(order({ pay_timing: 'setelah_kirim' })), null);
});

test('payDeadline: null bila tagihan belum dikirim', () => {
  assert.equal(payDeadline(order({ invoice_sent_at: null })), null);
  assert.equal(payDeadline(order({ invoice_sent_at: undefined })), null);
});

test('isOverdue: true bila menunggu pembayaran dan sudah lewat 4 jam', () => {
  assert.equal(isOverdue(order({ invoice_sent_at: ago(5 * HOUR) })), true);
});

test('isOverdue: false bila belum 4 jam', () => {
  assert.equal(isOverdue(order({ invoice_sent_at: ago(1 * HOUR) })), false);
  assert.equal(isOverdue(order({ invoice_sent_at: ago(3 * HOUR) })), false);
});

test('isOverdue: false bila tagihan belum dikirim', () => {
  assert.equal(isOverdue(order({ invoice_sent_at: null })), false);
});

test('isOverdue: false untuk bayar setelah kirim, berapa pun umur tagihan', () => {
  assert.equal(isOverdue(order({ pay_timing: 'setelah_kirim', invoice_sent_at: ago(48 * HOUR) })), false);
});

test('isOverdue: hanya berlaku untuk status menunggu_pembayaran', () => {
  for (const status of ['menunggu_konfirmasi', 'diproses', 'selesai', 'dibatalkan']) {
    assert.equal(isOverdue(order({ status, invoice_sent_at: ago(48 * HOUR) })), false, status);
  }
});

test('isOverdue: hanya tanda, status pesanan tidak diubah', () => {
  const o = order({ invoice_sent_at: ago(5 * HOUR) });
  const before = JSON.stringify(o);
  assert.equal(isOverdue(o), true);
  assert.equal(JSON.stringify(o), before);
});