const PAY_WINDOW_MS = 4 * 60 * 60 * 1000; // batas bayar 4 jam setelah Kirim Tagihan (KF 6)

// Batas bayar dan tanda lewat batas dihitung saat dibaca, tanpa cron (KF 11).
function payDeadline(o) {
  if (o.pay_timing !== 'di_muka' || !o.invoice_sent_at) return null;
  return new Date(new Date(o.invoice_sent_at).getTime() + PAY_WINDOW_MS);
}
const isOverdue = (o) => o.status === 'menunggu_pembayaran' && !!payDeadline(o) && payDeadline(o) < new Date();

module.exports = { payDeadline, isOverdue };
