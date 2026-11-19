const { httpError } = require('../middleware/errorHandler');

// Tabel transisi status (KF bagian 5). Perpindahan di luar tabel ditolak 409.
// Nilai berupa status tujuan, atau fungsi bila tujuan bergantung pada data (konfirmasi: waktu bayar).
const TRANSITIONS = {
  confirm: {
    menunggu_konfirmasi: ({ pay_timing }) => (pay_timing === 'setelah_kirim' ? 'diproses' : 'menunggu_pembayaran'),
  },
  pay: { menunggu_pembayaran: 'diproses' },
  cancel: { menunggu_konfirmasi: 'dibatalkan', menunggu_pembayaran: 'dibatalkan', diproses: 'dibatalkan' },
  complete: { diproses: 'selesai' },
};

const LABEL = {
  menunggu_konfirmasi: 'Menunggu Konfirmasi',
  menunggu_pembayaran: 'Menunggu Pembayaran',
  diproses: 'Diproses',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan',
};
const ACTION = { confirm: 'dikonfirmasi', pay: 'dibayar', cancel: 'dibatalkan', complete: 'ditandai selesai' };

// Status yang masih boleh dijadwalkan ulang (status tidak berubah)
const RESCHEDULABLE = ['menunggu_konfirmasi', 'menunggu_pembayaran', 'diproses'];

function nextStatus(from, event, ctx = {}) {
  const to = TRANSITIONS[event]?.[from];
  if (!to) {
    throw httpError(409, 'INVALID_STATUS_TRANSITION', `Pesanan berstatus ${LABEL[from] || from} tidak bisa ${ACTION[event] || event}`);
  }
  return typeof to === 'function' ? to(ctx) : to;
}

module.exports = { TRANSITIONS, RESCHEDULABLE, LABEL, nextStatus };
