// Racikan: porsi satu menu yang dibedakan (pedas, ayam, tambahan, catatan). Keranjang tetap { [menuId]: jumlah };
// racikan pertama (utama) menampung sisa porsi, racikan lain menyimpan jumlahnya sendiri.
// list = [{ sel, note, qty }] dengan qty utama diabaikan. Data lama (satu objek pilihan) tetap terbaca.
export const MAX_RACIKAN = 5 // 4 menu × 5 = 20 item, batas items di backend

export function racikanOf(qty, list) {
  const rs = (Array.isArray(list) ? list : [{ sel: list }]).map((r) => ({ ...r }))
  if (!rs.length) rs.push({})
  let sisa = qty - 1 // racikan utama selalu minimal 1 porsi
  for (const r of rs.slice(1)) {
    r.qty = Math.max(0, Math.min(r.qty || 1, sisa)) // keranjang berkurang: racikan terakhir dipotong lebih dulu
    sisa -= r.qty
  }
  const out = rs.filter((r, i) => i === 0 || r.qty > 0)
  out[0].qty = qty - out.slice(1).reduce((a, r) => a + r.qty, 0)
  return out
}
