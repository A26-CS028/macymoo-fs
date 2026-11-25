const test = require('node:test');
const assert = require('node:assert/strict');
const { assertCanSendBill, assertCanDeliver, assertCanComplete } = require('../src/services/fulfillmentRules');

const is = (code) => (e) => e.status === 409 && e.code === code;

test('send-bill: ditolak untuk menunggu_konfirmasi dan dibatalkan, boleh untuk status lain', () => {
  assert.throws(() => assertCanSendBill('menunggu_konfirmasi', 50000), is('INVALID_STATUS_TRANSITION'));
  assert.throws(() => assertCanSendBill('dibatalkan', 50000), is('INVALID_STATUS_TRANSITION'));
  for (const s of ['menunggu_pembayaran', 'diproses', 'selesai']) assert.doesNotThrow(() => assertCanSendBill(s, 50000));
});

test('send-bill: tagihan yang sudah lunas tidak dikirim (pesan WA "sebesar Rp0")', () => {
  for (const s of ['diproses', 'selesai']) assert.throws(() => assertCanSendBill(s, 0), is('NOTHING_TO_BILL'));
});

test('terkirim: hanya pesanan diproses; pengiriman yang sudah terkirim ditolak', () => {
  assert.doesNotThrow(() => assertCanDeliver('diproses', 'dijadwalkan'));
  assert.throws(() => assertCanDeliver('menunggu_pembayaran', 'dijadwalkan'), is('INVALID_STATUS_TRANSITION'));
  assert.throws(() => assertCanDeliver('diproses', 'terkirim'), is('DELIVERY_ALREADY_DELIVERED'));
});

test('complete: hanya diproses dan semua pengiriman terkirim', () => {
  assert.doesNotThrow(() => assertCanComplete('diproses', 0));
  assert.throws(() => assertCanComplete('diproses', 1), is('DELIVERIES_NOT_DELIVERED'));
  assert.throws(() => assertCanComplete('menunggu_konfirmasi', 0), is('INVALID_STATUS_TRANSITION'));
  assert.throws(() => assertCanComplete('selesai', 0), is('INVALID_STATUS_TRANSITION'));
});