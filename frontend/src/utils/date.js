// Tanggal dalam zona Asia/Jakarta (sama dengan backend), format YYYY-MM-DD.
const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' })

export const todayJakarta = () => fmt.format(new Date())

export function addDays(ymd, days) {
  const d = new Date(`${ymd}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

// "2026-11-07" -> { hari: "Jum", tgl: 7, panjang: "Jum, 7 Nov" }
export function labelTanggal(ymd) {
  const d = new Date(`${ymd}T00:00:00Z`)
  const hari = d.toLocaleDateString('id-ID', { weekday: 'short', timeZone: 'UTC' })
  const bulan = d.toLocaleDateString('id-ID', { month: 'short', timeZone: 'UTC' })
  return { hari, tgl: d.getUTCDate(), panjang: `${hari}, ${d.getUTCDate()} ${bulan}` }
}
