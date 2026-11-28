import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import Ikon from '../../components/admin/Ikon'
import { Memuat } from '../../components/ui/Spinner'
import { rupiah } from '../../utils/format'
import { addDays, labelTanggal, todayJakarta } from '../../utils/date'

// Rekap Keuangan (Figma: Admin — Rekap Keuangan / Admin Mobile — Rekap). Angka dari GET /admin/recap (RecapRow):
// omzet = nilai item pesanan diproses dan selesai, tanpa ongkir dan tanpa potongan diskon (aturan DS D01/D02).
// shortcut: panel DS Q1–Q5 masih tempat kosong karena RecapRow belum memuat porsi, menu, opsi, dan pembayaran per jam.
const API = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/$/, '')
const PERIODE = [['Harian', 'daily'], ['Mingguan', 'weekly']] // backend hanya menerima daily dan weekly
const MAKS_HARI = 366 // sama dengan validators/recap.js
const jumlah = (rows, k) => rows.reduce((s, r) => s + r[k], 0)
const MENU = ['Nutrimac', 'Mackster', 'Wraphoria', 'Mac Bites']
const HARI = ['S', 'S', 'R', 'K', 'J', 'S', 'M']

function Kosong({ teks = 'Menunggu data dari tim Data Science' }) {
  return <p className="mt-3 rounded-[10px] bg-krem-field px-3 py-2 text-xs font-semibold text-abu">{teks}</p>
}
function Kartu({ q, judul, children, className = '' }) {
  return (
    <section className={`rounded-[20px] bg-white p-5 lg:p-6 ${className}`} aria-label={judul}>
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-bold">{judul}</h2>
        <span className="shrink-0 text-xs font-bold text-ungu">{q}</span>
      </div>
      {children}
    </section>
  )
}
const Unduh = ({ className, href, children, ...rest }) => href
  ? <a href={href} className={`flex items-center justify-center gap-2 rounded-[10px] bg-ungu font-bold text-white ${className}`} {...rest}><Ikon d="unduh" />{children}</a>
  : <span aria-disabled="true" className={`flex items-center justify-center gap-2 rounded-[10px] bg-ungu font-bold text-white opacity-60 ${className}`} {...rest}><Ikon d="unduh" />{children}</span>

export default function Recap() {
  const [periode, setPeriode] = useState('weekly')
  const [akhir, setAkhir] = useState(todayJakarta)
  const [awal, setAwal] = useState(() => addDays(todayJakarta(), -27))
  const [rekap, setRekap] = useState(null)
  const [error, setError] = useState('')

  const hari = (Date.parse(akhir) - Date.parse(awal)) / 864e5 + 1
  const salahRentang = !awal || !akhir ? 'Pilih tanggal awal dan akhir'
    : hari < 1 ? 'Tanggal akhir tidak boleh sebelum tanggal awal'
      : hari > MAKS_HARI ? `Rentang maksimal ${MAKS_HARI} hari` : ''
  const query = `from=${awal}&to=${akhir}&period=${periode}`

  useEffect(() => {
    if (salahRentang) return
    let batal = false // abaikan jawaban lama bila filter sudah berubah
    setRekap(null); setError('')
    api(`/admin/recap?${query}`).then((r) => { if (!batal) setRekap(r) }).catch((e) => { if (!batal) setError(e.message) })
    return () => { batal = true }
  }, [query, salahRentang])

  const rows = rekap?.rows || []
  const omzet = jumlah(rows, 'subtotal')
  const pesanan = jumlah(rows, 'orders_count')
  const kartu = rekap && [
    ['Omzet', rupiah(omzet), `Ongkir ${rupiah(jumlah(rows, 'shipping_total'))} tidak termasuk`, true],
    ['Pesanan', pesanan, 'Diproses dan Selesai'],
    ['Rata-rata per Pesanan', pesanan ? rupiah(Math.round(omzet / pesanan)) : '—', 'omzet ÷ pesanan'],
    ['Tagihan Belum Terbayar', rupiah(jumlah(rows, 'outstanding')), `Dibayar bersih ${rupiah(jumlah(rows, 'paid_net'))}`],
  ]
  const tertinggi = Math.max(1, ...rows.map((r) => r.subtotal))
  const tglBulan = (ymd) => labelTanggal(ymd).panjang.split(', ')[1] // "7 Nov"
  // Minggu pertama/terakhir bisa terpotong filter: tampilkan tanggal yang benar-benar dihitung, bukan Senin/Minggu penuh
  const labelPeriode = (r) => periode === 'weekly'
    ? `${tglBulan(r.period_start < rekap.from ? rekap.from : r.period_start)} – ${tglBulan(r.period_end > rekap.to ? rekap.to : r.period_end)}`
    : labelTanggal(r.period_start).panjang
  const unduh = salahRentang ? {} : { href: `${API}/admin/recap/export.xlsx?${query}`, download: true }
  const tab = (cls, aktif) => PERIODE.map(([label, v]) => (
    <button key={v} type="button" role="tab" aria-selected={periode === v} onClick={() => setPeriode(v)}
      className={`${cls} ${periode === v ? aktif : 'text-abu hover:text-ungu-gelap'}`}>{label}</button>
  ))

  return (
    <div className="mx-auto max-w-[1180px] pb-6">
      <div className="flex flex-wrap items-start justify-between gap-4 lg:items-end">
        <div>
          <h1 className="text-[28px] font-extrabold lg:text-[30px]"><span className="lg:hidden">Rekap</span><span className="hidden lg:inline">Rekap Keuangan</span></h1>
          <p className="text-sm font-medium text-abu">Menjawab 5 pertanyaan bisnis dari data pesanan</p>
        </div>
        <div className="flex items-center gap-5">
          <div role="tablist" aria-label="Periode" className="hidden gap-5 text-sm font-semibold lg:flex">
            {tab('pb-1', 'border-b-2 border-ungu font-bold text-ungu-gelap')}
          </div>
          <Unduh className="hidden h-12 px-5 text-[15px] lg:flex" {...unduh}>Unduh Excel</Unduh>
          <Unduh className="size-12 rounded-[12px] lg:hidden" aria-label="Unduh Excel (tanpa data pribadi)" {...unduh} />
        </div>
      </div>
      <div role="tablist" aria-label="Periode" className="mt-4 grid grid-cols-2 text-center text-[15px] font-semibold lg:hidden">
        {tab('pb-2', 'font-bold text-ungu-gelap after:mx-auto after:mt-2 after:block after:h-1 after:w-8 after:rounded-full after:bg-ungu')}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3 text-sm font-semibold">
        <label className="flex flex-col gap-1">Tanggal kirim dari
          <input type="date" value={awal} max={akhir} onChange={(e) => setAwal(e.target.value)} className="rounded-[10px] bg-white px-3 py-2 font-medium" />
        </label>
        <label className="flex flex-col gap-1">sampai
          <input type="date" value={akhir} min={awal} onChange={(e) => setAkhir(e.target.value)} className="rounded-[10px] bg-white px-3 py-2 font-medium" />
        </label>
      </div>
      {(salahRentang || error) && <p role="alert" className="mt-3 rounded-[14px] bg-kuning px-4 py-3 text-sm font-bold">{salahRentang || error}</p>}

      {!rekap && !salahRentang && !error && <Memuat>Memuat rekap…</Memuat>}
      {kartu && !salahRentang && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:mt-5 lg:grid-cols-4 lg:gap-5">
            {kartu.map(([judul, nilai, sub, utama]) => (
              <div key={judul} className={`flex flex-col rounded-[20px] p-4 lg:p-5 ${utama ? 'col-span-2 bg-ungu text-white lg:col-span-1' : 'bg-white'}`}>
                <span className="text-[13px] font-semibold lg:text-sm">{judul}</span>
                <span className="mt-1 whitespace-nowrap text-[20px] font-extrabold leading-tight lg:text-[26px]">{nilai}</span>
                <span className={`text-xs font-semibold ${utama ? 'text-kuning' : 'text-abu'}`}>{sub}</span>
              </div>
            ))}
          </div>

          <Kartu judul={`Omzet ${periode === 'weekly' ? 'per minggu (Senin–Minggu)' : 'per hari'}`} className="mt-4 lg:mt-5">
            <p className="text-[13px] font-medium text-abu">Menurut tanggal kirim. Tanpa ongkir, diskon tidak dikurangi.</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full whitespace-nowrap text-left text-sm">
                <thead className="text-xs text-abu">
                  <tr><th className="py-2 font-semibold">{periode === 'weekly' ? 'Minggu' : 'Tanggal'}</th><th className="hidden w-2/5 font-semibold sm:table-cell"><span className="sr-only">Grafik</span></th>
                    <th className="text-right font-semibold">Omzet</th><th className="hidden text-right font-semibold sm:table-cell">Ongkir</th><th className="text-right font-semibold">Pesanan</th></tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.period_start} className="border-t border-abu-label/30">
                      <td className="whitespace-nowrap py-2 font-semibold">{labelPeriode(r)}</td>
                      <td className="hidden px-3 sm:table-cell"><span className="block h-2.5 rounded-full bg-ungu" style={{ width: `${(r.subtotal / tertinggi) * 100}%` }} /></td>
                      <td className="text-right font-bold">{rupiah(r.subtotal)}</td>
                      <td className="hidden pl-3 text-right text-abu sm:table-cell">{rupiah(r.shipping_total)}</td>
                      <td className="pl-3 text-right">{r.orders_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Kartu>
        </>
      )}

      <div className="mt-4 grid gap-4 lg:mt-5 lg:grid-cols-3 lg:gap-5">
        <Kartu q="DS Q1" judul="Menu apa yang paling laris?">
          <ul className="mt-3 flex flex-col gap-3">
            {MENU.map((m) => (
              <li key={m}>
                <p className="flex justify-between text-sm font-bold">{m}<span className="font-medium text-abu">— porsi</span></p>
                <span className="mt-1.5 block h-3 rounded-full bg-krem-field" />
              </li>
            ))}
          </ul>
        </Kartu>
        <Kartu q="DS Q2" judul="Hari apa paling padat?">
          <div className="mt-6 flex h-[180px] items-end justify-between gap-2 px-1">
            {HARI.map((h, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                <span className="w-full max-w-8 rounded-full bg-krem-field" style={{ height: `${40 + ((i * 37) % 70)}%` }} />
                <span className="text-xs font-semibold text-abu">{h}</span>
              </div>
            ))}
          </div>
          <Kosong />
        </Kartu>
        <Kartu q="DS Q3" judul="Lebih banyak antar atau ambil?">
          <div className="mt-4 flex gap-8">
            <p><span className="block text-[40px] font-extrabold leading-none text-ungu">—%</span><span className="text-sm font-semibold">Antar oleh Nabila</span></p>
            <p><span className="block text-[40px] font-extrabold leading-none text-kuning">—%</span><span className="text-sm font-semibold">Ambil sendiri</span></p>
          </div>
          <span className="mt-4 block h-3 rounded-full bg-krem-field" />
          <dl className="mt-6 flex flex-col gap-2 text-sm">
            {['Ongkir rata-rata', 'Area terbanyak', 'Jam antar favorit'].map((x) => <div key={x} className="flex justify-between"><dt className="text-abu">{x}</dt><dd className="font-bold">—</dd></div>)}
          </dl>
        </Kartu>
      </div>

      <div className="mt-4 grid gap-4 lg:mt-5 lg:grid-cols-2 lg:gap-5">
        <Kartu q="DS Q4" judul="Opsi kustom apa yang paling sering dipilih?">
          <p className="mt-3 text-sm font-semibold text-abu">Tambah keju · —% &nbsp; Level pedas · —% &nbsp; Tanpa brokoli · —% &nbsp; Paha · —%</p>
          <Kosong />
        </Kartu>
        <Kartu q="DS Q5" judul="Seberapa cepat pembeli membayar?">
          <p className="mt-3 flex items-center gap-4"><span className="text-[40px] font-extrabold leading-none text-[#15803d]">—%</span><span className="text-sm font-medium text-abu">membayar kurang dari 1 jam setelah tagihan</span></p>
          <span className="mt-4 block h-3 rounded-full bg-krem-field" />
          <p className="mt-3 flex flex-wrap gap-x-4 text-xs font-medium text-abu">
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#15803d]" />&lt; 1 jam</span>
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#d97706]" />1–4 jam</span>
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#dc2626]" />Lewat 4 jam</span>
          </p>
        </Kartu>
      </div>

      <Unduh className="mt-4 h-14 w-full text-[15px] lg:hidden" {...unduh}>Unduh Excel (tanpa data pribadi)</Unduh>
    </div>
  )
}
