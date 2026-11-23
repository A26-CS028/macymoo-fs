// Aturan kirim tagihan, tandai terkirim, dan selesai (openapi: send-bill, complete, PATCH deliveries). Fungsi murni.
const { httpError } = require('../middleware/errorHandler');

const conflict = (code, message) => httpError(409, code, message);

function assertCanSendBill(status) {
  if (status === 'menunggu_konfirmasi') throw conflict('INVALID_STATUS_TRANSITION', 'Pesanan belum dikonfirmasi, tagihan belum bisa dikirim');
  if (status === 'dibatalkan') throw conflict('INVALID_STATUS_TRANSITION', 'Pesanan dibatalkan, tagihan tidak bisa dikirim');
}

function assertCanDeliver(status, deliveryStatus) {
  if (status !== 'diproses') throw conflict('INVALID_STATUS_TRANSITION', 'Pengiriman hanya bisa ditandai terkirim pada pesanan Diproses');
  if (deliveryStatus === 'terkirim') throw conflict('DELIVERY_ALREADY_DELIVERED', 'Pengiriman ini sudah terkirim');
}

function assertCanComplete(status, pendingDeliveries) {
  if (status !== 'diproses') throw conflict('INVALID_STATUS_TRANSITION', 'Hanya pesanan Diproses yang bisa ditandai selesai');
  if (pendingDeliveries > 0) throw conflict('DELIVERIES_NOT_DELIVERED', `${pendingDeliveries} pengiriman belum terkirim`);
}

module.exports = { assertCanSendBill, assertCanDeliver, assertCanComplete };