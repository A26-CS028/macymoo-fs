import { useState } from 'react'
import Ikon from '../../components/admin/Ikon'

// Rekap Keuangan (Figma: Admin — Rekap Keuangan / Admin Mobile — Rekap). Menjawab 5 pertanyaan bisnis (DS Q1–Q5).
// shortcut: endpoint rekap dari tim DS belum ada; tata letak dan tempatnya disiapkan, angka diisi saat GET rekap tersedia.
const PERIODE = ['Harian', 'Mingguan', 'Bulanan']
const KARTU = [
  ['Omzet Bersih', 'Pesanan Dibatalkan tidak dihitung', true],
  ['Porsi Terjual', 'dibanding periode lalu'],
  ['Rata-rata per Pesanan', 'pesanan valid'],
  ['Tingkat Pembatalan', 'termasuk lewat batas bayar'],
]
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
const Unduh = ({ className, teks }) => (
  <button type="button" disabled title="Segera: menunggu rekap dari tim Data Science"
    className={`flex items-center justify-center gap-2 rounded-[10px] bg-ungu font-bold text-white disabled:cursor-not-allowed disabled:opacity-60 ${className}`}>
    <Ikon d="unduh" />{teks}
  </button>
)

export default function Recap() {
  const [periode, setPeriode] = useState('Mingguan')

  return (
    <div className="mx-auto max-w-[1180px] pb-6">
      <div className="flex flex-wrap items-start justify-between gap-4 lg:items-end">
        <div>
          <h1 className="text-[28px] font-extrabold lg:text-[30px]"><span className="lg:hidden">Rekap</span><span className="hidden lg:inline">Rekap Keuangan</span></h1>
          <p className="text-sm font-medium text-abu">Menjawab 5 pertanyaan bisnis dari data pesanan</p>
        </div>
        <div className="flex items-center gap-5">
          <div role="tablist" aria-label="Periode" className="hidden gap-5 text-sm font-semibold lg:flex">
            {PERIODE.map((p) => (
              <button key={p} type="button" role="tab" aria-selected={periode === p} onClick={() => setPeriode(p)}
                className={`pb-1 ${periode === p ? 'border-b-2 border-ungu font-bold text-ungu-gelap' : 'text-abu hover:text-ungu-gelap'}`}>{p}</button>
            ))}
          </div>
          <Unduh className="hidden h-12 px-5 text-[15px] lg:flex" teks="Unduh Excel" />
          <button type="button" disabled aria-label="Unduh Excel (segera)" className="flex size-12 items-center justify-center rounded-[12px] bg-ungu text-white opacity-60 lg:hidden"><Ikon d="unduh" /></button>
        </div>
      </div>
      <div role="tablist" aria-label="Periode" className="mt-4 grid grid-cols-3 text-center text-[15px] font-semibold lg:hidden">
        {PERIODE.map((p) => (
          <button key={p} type="button" role="tab" aria-selected={periode === p} onClick={() => setPeriode(p)}
            className={`pb-2 ${periode === p ? 'font-bold after:mx-auto after:mt-2 after:block after:h-1 after:w-8 after:rounded-full after:bg-ungu' : 'text-abu'}`}>{p}</button>
        ))}
      </div>

      <p role="status" className="mt-4 flex items-start gap-2.5 rounded-[14px] bg-kuning px-4 py-3 text-sm font-bold">
        <Ikon d="M12 11v5M12 8h.01M12 21a9 9 0 100-18 9 9 0 000 18z" className="mt-px size-5 shrink-0" />
        Rekap {periode.toLowerCase()} sedang disiapkan tim Data Science. Tempatnya sudah siap; angka muncul otomatis setelah data rekap tersedia.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:mt-5 lg:grid-cols-4 lg:gap-5">
        {KARTU.map(([judul, sub, utama], i) => (
          <div key={judul} className={`flex flex-col rounded-[20px] p-4 lg:p-5 ${utama ? 'col-span-2 bg-ungu text-white lg:col-span-1' : 'bg-white'} ${i === 3 ? '' : ''}`}>
            <span className="flex items-start justify-between gap-2 text-[13px] font-semibold lg:text-sm">{judul}<Ikon d="panah" className="size-4" /></span>
            <span className="mt-1 text-[34px] font-extrabold leading-tight lg:text-[44px]" aria-label="belum ada data">—</span>
            <span className={`text-xs font-semibold ${utama ? 'text-kuning' : 'text-abu'}`}>{sub}</span>
          </div>
        ))}
      </div>

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

      <Unduh className="mt-4 h-14 w-full text-[15px] lg:hidden" teks="Unduh Excel (tanpa data pribadi) · segera" />
    </div>
  )
}
