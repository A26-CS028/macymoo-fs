// Aturan pencatatan pembayaran (openapi: POST /admin/orders/{id}/payments). Fungsi murni.
// totals = OrderTotals pesanan SEBELUM pembayaran ini dicatat.
// Hasil: to_status (status pesanan baru) dan pay_status (null = tidak berubah).
const { httpError } = require('../middleware/errorHandler');

const rp = (n) => `Rp${n.toLocaleString('id-ID')}`;
const invalidAmount = (message) => httpError(400, 'VALIDATION_ERROR', 'Data tidak valid', [{ field: 'amount', message }]);
const conflict = (message) => httpError(409, 'INVALID_STATUS_TRANSITION', message);

function evaluatePayment({ status, totals, type, amount }) {
  if (status === 'menunggu_konfirmasi') throw conflict('Pesanan belum dikonfirmasi, belum bisa dibayar');

  if (type === 'refund') {
    if (status !== 'dibatalkan') throw conflict('Refund hanya untuk pesanan yang dibatalkan');
    if (amount > totals.paid_net) throw invalidAmount(`Refund melebihi pembayaran bersih (${rp(totals.paid_net)})`);
    return { to_status: status, pay_status: amount === totals.paid_net ? 'dikembalikan' : null };
  }

  if (status === 'dibatalkan') throw conflict('Pesanan dibatalkan tidak bisa dibayar; catat refund bila perlu');
  if (totals.balance_due === 0) throw invalidAmount('Pesanan sudah lunas, tidak ada sisa tagihan');
  if (amount > totals.balance_due) throw invalidAmount(`Nominal melebihi sisa tagihan (${rp(totals.balance_due)})`);

  return {
    // pembayaran pertama (dp atau pelunasan) memindahkan menunggu_pembayaran -> diproses
    to_status: status === 'menunggu_pembayaran' ? 'diproses' : status,
    pay_status: amount === totals.balance_due ? 'lunas' : 'dp',
  };
}

module.exports = { evaluatePayment };