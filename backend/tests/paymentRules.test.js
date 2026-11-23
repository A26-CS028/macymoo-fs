const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluatePayment } = require('../src/services/paymentRules');

const totals = (grand, paid) => ({ grand_total: grand, paid_net: paid, balance_due: Math.max(0, grand - paid) });
const is = (status, code) => (e) => e.status === status && e.code === code;

test('uji 4: DP pertama pada menunggu_pembayaran -> diproses, pay_status dp', () => {
  assert.deepEqual(evaluatePayment({ status: 'menunggu_pembayaran', totals: totals(107000, 0), type: 'dp', amount: 50000 }), { to_status: 'diproses', pay_status: 'dp' });
});

test('uji 4: pelunasan menutup sisa -> lunas, status tetap', () => {
  assert.deepEqual(evaluatePayment({ status: 'diproses', totals: totals(107000, 50000), type: 'pelunasan', amount: 57000 }), { to_status: 'diproses', pay_status: 'lunas' });
});

test('pelunasan pesanan Selesai (bayar setelah kirim) -> tetap selesai, lunas', () => {
  assert.deepEqual(evaluatePayment({ status: 'selesai', totals: totals(107000, 0), type: 'pelunasan', amount: 107000 }), { to_status: 'selesai', pay_status: 'lunas' });
});

test('nominal melebihi sisa tagihan atau pesanan sudah lunas ditolak 400', () => {
  assert.throws(() => evaluatePayment({ status: 'diproses', totals: totals(107000, 50000), type: 'dp', amount: 57001 }), is(400, 'VALIDATION_ERROR'));
  assert.throws(() => evaluatePayment({ status: 'selesai', totals: totals(107000, 107000), type: 'pelunasan', amount: 1000 }), is(400, 'VALIDATION_ERROR'));
});

test('pesanan menunggu_konfirmasi atau dibatalkan tidak bisa dibayar (409)', () => {
  assert.throws(() => evaluatePayment({ status: 'menunggu_konfirmasi', totals: totals(107000, 0), type: 'dp', amount: 1000 }), is(409, 'INVALID_STATUS_TRANSITION'));
  assert.throws(() => evaluatePayment({ status: 'dibatalkan', totals: totals(107000, 50000), type: 'dp', amount: 1000 }), is(409, 'INVALID_STATUS_TRANSITION'));
});

test('refund: hanya pesanan dibatalkan; penuh -> dikembalikan, sebagian -> pay_status tetap', () => {
  assert.deepEqual(evaluatePayment({ status: 'dibatalkan', totals: totals(107000, 50000), type: 'refund', amount: 50000 }), { to_status: 'dibatalkan', pay_status: 'dikembalikan' });
  assert.deepEqual(evaluatePayment({ status: 'dibatalkan', totals: totals(107000, 50000), type: 'refund', amount: 20000 }), { to_status: 'dibatalkan', pay_status: null });
  assert.throws(() => evaluatePayment({ status: 'dibatalkan', totals: totals(107000, 50000), type: 'refund', amount: 60000 }), is(400, 'VALIDATION_ERROR'));
  assert.throws(() => evaluatePayment({ status: 'diproses', totals: totals(107000, 50000), type: 'refund', amount: 1000 }), is(409, 'INVALID_STATUS_TRANSITION'));
});