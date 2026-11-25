import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../../api/client'
import { todayJakarta, addDays, labelTanggal } from '../../utils/date'
import { localPhoto } from '../../utils/menuPhoto'

// Daftar Masak (Figma: Admin — Daftar Masak / Mobile — Daftar Masak). Per tanggal kirim:
// Siap Dimasak = Diproses; Belum Dibayar = Menunggu Pembayaran, jangan dimasak dulu (KF 5).
const HARI_PANJANG = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'UTC' })
const Svg = ({ d, className = 'size-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
)
const I = {
  bot: 'M12 7V4H9M7 7h10a2 2 0 012 2v8a2 2 0 01-2 2H7a2 2 0 01-2-2V9a2 2 0 012-2zM15 12v2M9 12v2',
  awas: 'M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z',
  cetak: 'M6 9V3h12v6M6 18H4a1 1 0 01-1-1v-6a2 2 0 012-2h14a2 2 0 012 2v6a1 1 0 01-1 1h-2M6 14h12v7H6z',
  kalender: 'M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z',
}
const panjang = (d) => HARI_PANJANG.format(new Date(`${d}T00:00:00Z`))

// Satu baris item: setiap item punya kode pesanan sendiri karena satu pesanan bisa beberapa racikan
function Item({ it, d }) {
  return (
    <li className="flex gap-3 rounded-[18px] bg-white p-4 lg:items-center lg:bg-krem-field lg:px-4 lg:py-3.5">
      <img src={localPhoto({ name: it.name })} alt="" className="size-14 shrink-0 rounded-xl bg-krem-field object-contain lg:size-16 lg:bg-transparent" />
      <div className="min-w-0 flex-1 lg:flex lg:items-start lg:justify-between lg:gap-4">
        <div className="min-w-0">
          <p className="text-lg font-extrabold leading-tight">{it.name} ×{it.qty}</p>
          <Link to={`/dapur/pesanan/${d.order_id}`} className="text-sm font-bold text-ungu lg:hidden">{d.order_code}</Link>
          {it.options.length > 0 && <p className="mt-1 text-[15px] font-medium lg:mt-0.5 lg:text-sm lg:text-abu">{it.options.join(' · ')}</p>}
          {it.note && <p className="mt-1 text-sm font-medium text-abu lg:mt-0.5 lg:font-semibold lg:text-ungu-gelap">Catatan: {it.note}</p>}
        </div>
        <div className="mt-2 flex flex-col gap-1 lg:mt-0 lg:shrink-0 lg:items-end">
          <Link to={`/dapur/pesanan/${d.order_id}`} className="hidden text-sm font-bold text-ungu hover:underline lg:block">{d.order_code}</Link>
          {(it.labels.length > 0 || it.note_flags.length > 0) && (
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-bold">
              {it.labels.length > 0 && <span className="flex items-center gap-1 text-ungu"><Svg d={I.bot} className="size-3.5" />MooLabel AI</span>}
              {it.labels.map((l) => <span key={l} className={/pedas/i.test(l) ? 'text-[#dc2626]' : ''}>{l}</span>)}
              {it.note_flags.map((f) => <span key={f.message} title={f.message} className="flex items-center gap-1 text-[#d97706]"><Svg d={I.awas} className="size-3.5" />{f.message}</span>)}
            </p>
          )}
        </div>
      </div>
    </li>
  )
}

export default function Kitchen() {
  const today = todayJakarta()
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i))
  const [date, setDate] = useState(today)
  const [data, setData] = useState({}) // { [tanggal]: KitchenResponse }
  const [closed, setClosed] = useState([])
  const [error, setError] = useState('')
  const [tab, setTab] = useState('siap') // HP: siap | belum

  // Tujuh hari sekaligus supaya jumlah porsi tiap tanggal tampil di deretan tanggal
  function load() {
    setError('')
    Promise.all(days.map((d) => api(`/admin/kitchen?date=${d}`).then((r) => [d, r])))
      .then((rows) => setData(Object.fromEntries(rows)))
      .catch((e) => setError(e.message))
    api('/closed-dates').then((r) => setClosed(r.closed_dates.map((c) => c.closed_date))).catch(() => {})
  }
  useEffect(load, []) // eslint-disable-line react-hooks/exhaustive-deps
  const [params, setParams] = useSearchParams()
  useEffect(() => {
    if (params.get('cetak') && data[date]) { setParams({}, { replace: true }); setTimeout(() => window.print(), 300) }
  }, [params, data, date, setParams])

  const k = data[date]
  const siap = k?.in_progress || []
  const belum = k?.unpaid || []
  const jumlahItem = (list) => list.reduce((a, d) => a + d.items.length, 0)

  return (
    <div className="mx-auto max-w-[1180px] pb-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold lg:text-[30px]">Daftar Masak</h1>
          <p className="text-sm font-medium text-abu">
            <span className="lg:hidden">{panjang(date)} · {k ? `${k.portions_total} porsi` : '…'}</span>
            <span className="hidden lg:inline">Per tanggal kirim, terpisah antara yang sudah dibayar dan yang belum</span>
          </p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <button type="button" onClick={() => window.print()} aria-label="Cetak daftar masak" className="flex h-11 items-center gap-2 rounded-[10px] px-3 text-[15px] font-bold hover:bg-white">
            <Svg d={I.cetak} className="size-6 lg:size-5" /><span className="hidden lg:inline">Cetak Daftar Masak</span>
          </button>
          <Link to="/dapur/pengaturan" className="hidden h-11 items-center gap-2 rounded-[10px] bg-ungu px-5 text-[15px] font-bold text-white lg:flex">
            <Svg d={I.kalender} className="size-5" />Kalender Tutup
          </Link>
        </div>
      </div>

      {/* Deretan tanggal: kartu di desktop, kolom ringkas di HP */}
      <div role="tablist" aria-label="Tanggal kirim" className="mt-4 grid grid-cols-5 gap-1 overflow-x-auto lg:grid-cols-7 lg:gap-3 print:hidden">
        {days.map((d, i) => {
          const { hari, tgl } = labelTanggal(d)
          const tutup = closed.includes(d)
          const sel = d === date
          const porsi = data[d]?.portions_total
          return (
            <button key={d} type="button" role="tab" aria-selected={sel} onClick={() => setDate(d)}
              className={`${i >= 5 ? 'hidden lg:flex' : 'flex'} flex-col items-center rounded-[16px] py-2 transition-colors lg:items-start lg:px-4 lg:py-3 ${
                sel ? 'bg-kuning lg:bg-ungu lg:text-white' : tutup ? 'lg:bg-[#e8dcc6]' : 'hover:bg-white lg:bg-white'}`}>
              <span className={`text-[15px] font-semibold lg:text-[13px] lg:font-medium ${sel ? '' : 'text-abu'}`}>{hari}</span>
              <span className={`text-[28px] font-extrabold leading-tight lg:text-lg ${tutup ? 'text-abu line-through lg:text-ungu-gelap' : ''}`}>
                {tgl}<span className="hidden lg:inline"> {labelTanggal(d).panjang.split(' ')[2]}</span>
              </span>
              <span className={`text-[13px] font-semibold lg:text-xs ${tutup ? 'text-[#dc2626]' : sel ? 'lg:text-kuning' : 'text-abu'}`}>
                {tutup ? 'Tutup' : porsi === undefined ? '…' : <>{porsi}<span className="hidden lg:inline"> porsi</span></>}
              </span>
            </button>
          )
        })}
      </div>

      {error && (
        <p role="alert" className="mt-4 flex flex-wrap items-center gap-3 rounded-[10px] bg-[#fde8e8] px-4 py-3 text-sm font-semibold text-[#b91c1c]">
          Daftar masak belum bisa dimuat: {error}
          <button type="button" onClick={load} className="rounded-lg bg-white px-3 py-1 text-ungu-gelap">Coba lagi</button>
        </p>
      )}

      {/* HP: dua tab */}
      <div role="tablist" aria-label="Kelompok" className="mt-4 grid grid-cols-2 text-center text-[15px] font-bold lg:hidden print:hidden">
        {[['siap', `Siap dimasak · ${jumlahItem(siap)}`], ['belum', `Belum dibayar · ${jumlahItem(belum)}`]].map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
            className={`pb-2 ${tab === key ? 'text-ungu-gelap after:mx-auto after:mt-2 after:block after:h-1 after:w-8 after:rounded-full after:bg-ungu' : 'text-abu'}`}>{label}</button>
        ))}
      </div>

      {!k && !error && <p role="status" className="py-8 text-center text-sm font-semibold text-abu">Memuat daftar masak…</p>}
      {k && (
        <div className="mt-4 grid gap-4 lg:mt-5 lg:grid-cols-[730fr_380fr] lg:gap-5">
          <section className={`${tab === 'siap' ? '' : 'hidden'} lg:block lg:rounded-[20px] lg:bg-white lg:p-6 print:block`} aria-labelledby="judul-siap">
            <div className="hidden items-start justify-between lg:flex">
              <div>
                <h2 id="judul-siap" className="text-xl font-bold">Siap Dimasak · Diproses</h2>
                <p className="text-sm font-medium text-abu">Sudah DP / Lunas / Bayar setelah kirim</p>
              </div>
              <span className="text-sm font-bold text-ungu">{k.portions_total} porsi</span>
            </div>
            {!siap.length
              ? <p className="rounded-[18px] bg-white py-8 text-center text-sm font-semibold text-abu lg:mt-4 lg:bg-krem-field">{closed.includes(date) ? 'Tanggal ini ditutup.' : 'Belum ada pesanan yang siap dimasak untuk tanggal ini.'}</p>
              : <ul className="flex flex-col gap-3 lg:mt-4">{siap.flatMap((d) => d.items.map((it) => <Item key={it.order_item_id} it={it} d={d} />))}</ul>}
            {k.moolabel_active === false && siap.length > 0 && <p className="mt-3 text-xs font-medium text-abu">MooLabel AI sedang nonaktif; catatan asli tetap tampil.</p>}
          </section>

          <div className={`${tab === 'belum' ? 'flex' : 'hidden'} flex-col gap-4 lg:flex lg:gap-5 print:hidden`}>
            <section className="rounded-[20px] bg-white p-5 lg:p-6" aria-labelledby="judul-belum">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 id="judul-belum" className="text-xl font-bold">Belum Dibayar</h2>
                  <p className="text-sm font-medium text-abu">Jangan dimasak dulu sampai pembayaran tercatat</p>
                </div>
                <span className="hidden text-xs font-bold text-[#2563eb] lg:block">Menunggu Pembayaran</span>
              </div>
              {!belum.length
                ? <p className="mt-4 text-sm font-semibold text-abu">Tidak ada.</p>
                : (
                  <ul className="mt-4 flex flex-col gap-3">
                    {belum.flatMap((d) => d.items.map((it) => (
                      <li key={it.order_item_id} className="flex items-center gap-3">
                        <img src={localPhoto({ name: it.name })} alt="" className="size-10 shrink-0 object-contain" />
                        <Link to={`/dapur/pesanan/${d.order_id}`} className="min-w-0 flex-1 hover:underline">
                          <span className="block text-[15px] font-bold">{it.name} ×{it.qty}{d.customer_name && ` · ${d.customer_name}`}</span>
                          <span className={`block text-xs font-semibold ${d.payment_overdue ? 'text-[#dc2626]' : 'text-abu'}`}>{d.payment_overdue ? 'Lewat batas bayar' : `${d.order_code} · menunggu pembayaran`}</span>
                        </Link>
                      </li>
                    )))}
                  </ul>
                )}
            </section>
            <section className="hidden rounded-[20px] bg-ungu-gelap p-6 text-white lg:block" aria-labelledby="judul-total">
              <h2 id="judul-total" className="text-lg font-bold">Total porsi {panjang(date)}</h2>
              <p className="mt-2 font-lilita text-[64px] leading-none text-kuning">{k.portions_total}</p>
              <dl className="mt-4 flex flex-col gap-2.5 text-[15px]">
                {k.portions_by_menu.map((m) => <div key={m.name} className="flex justify-between"><dt>{m.name}</dt><dd className="font-bold">{m.qty}</dd></div>)}
              </dl>
            </section>
          </div>
        </div>
      )}
    </div>
  )
}
