import { addDays } from './date.js'

// Porsi yang dimasak = pesanan yang sudah dikonfirmasi dan tidak dibatalkan.
export const DIMASAK = ['menunggu_pembayaran', 'diproses', 'selesai']

// Senin minggu berjalan (YYYY-MM-DD, zona sudah Jakarta dari todayJakarta)
export function seninDari(ymd) {
  const hari = (new Date(`${ymd}T00:00:00Z`).getUTCDay() + 6) % 7 // Senin = 0
  return addDays(ymd, -hari)
}

// orders: daftar GET /admin/orders; details: { [id]: detail } untuk pesanan beberapa tanggal kirim
// (items_summary di daftar menjumlah semua tanggal, jadi dipecah dari detail per pengiriman).
// Hasil: { [tanggal]: { [menu]: porsi } } hanya untuk tanggal di `dates`.
export function porsiPerTanggal(orders, details, dates) {
  const out = Object.fromEntries(dates.map((d) => [d, {}]))
  const tambah = (d, name, qty) => { if (out[d]) out[d][name] = (out[d][name] || 0) + qty }
  for (const o of orders) {
    if (!DIMASAK.includes(o.status)) continue
    if (o.delivery_dates.length === 1) {
      for (const it of o.items_summary) tambah(o.delivery_dates[0], it.name, it.qty)
      continue
    }
    const det = details[o.id]
    if (!det) continue
    const tgl = Object.fromEntries(det.deliveries.map((d) => [d.id, d.delivery_date]))
    for (const it of det.items) tambah(tgl[it.delivery_id], it.name, it.qty)
  }
  return out
}

export const jumlah = (perMenu) => Object.values(perMenu).reduce((a, b) => a + b, 0)
