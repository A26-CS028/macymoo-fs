import { useCallback, useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { api } from '../../api/client'
import { todayJakarta, addDays, labelTanggal } from '../../utils/date'
import { localPhoto } from '../../utils/menuPhoto'
import { porsiPerTanggal, seninDari, jumlah, DIMASAK } from '../../utils/porsi'
import { STATUS, menuLabel } from '../../components/admin/OrderTable'
import ConfirmDialog from '../../components/admin/ConfirmDialog'
import RescheduleDialog from '../../components/admin/RescheduleDialog'
import PaymentForm from '../../components/admin/PaymentForm'

// Dashboard Operasional (Figma: Admin — Dashboard / Admin Mobile — Beranda). Semua angka dihitung dari
// endpoint yang sudah ada (daftar pesanan, daftar masak, tanggal tutup); belum ada endpoint rekap.
// shortcut: "Unduh Rekap Excel" dan garis kapasitas harian dari Figma belum dibuat (rekap milik DS; angka kapasitas tidak ada di KF).
// Warna menu = palet merek yang lolos validator dataviz (warna mengikuti menu, bukan peringkat).
const WARNA = { Nutrimac: '#5b21d6', Mackster: '#e5a50a', Wraphoria: '#a78bfa', 'Mac Bites': '#b45309' }
const LAINNYA = '#8a8299'
const warna = (m) => WARNA[m] || LAINNYA
const urutMenu = (names) => [...Object.keys(WARNA).filter((m) => names.includes(m)), ...names.filter((m) => !WARNA[m]).sort()]
const jam = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })
const hariPanjang = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString('id-ID', { weekday: 'long', timeZone: 'UTC' })
const kartu = 'rounded-[20px] bg-white p-5 lg:p-6'
const Svg = ({ d, className = 'size-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
)
const PANAH = 'M7 17L17 7M9 7h8v8'

function Stat({ to, label, angka, sub, subCls = 'text-abu', utama }) {
  return (
    <Link to={to} className={`flex flex-col rounded-[20px] p-4 transition-shadow hover:shadow-md lg:p-5 ${utama ? 'bg-ungu text-white' : 'bg-white'}`}>
      <span className="flex items-start justify-between gap-2 text-[13px] font-semibold lg:text-sm">{label}<Svg d={PANAH} /></span>
      <span className="mt-1 text-[34px] font-extrabold leading-tight lg:text-[40px]">{angka}</span>
      <span className={`text-xs font-semibold ${utama ? 'text-kuning' : subCls}`}>{sub}</span>
    </Link>
  )
}

function Mingguan({ hari, data, today, closed, menus }) {
  const [hover, setHover] = useState(null)
  const max = Math.max(1, ...hari.map((d) => jumlah(data[d])))
  return (
    <>
      <div className="relative mt-6 grid h-[200px] grid-cols-7 items-end gap-2 border-t border-krem-field lg:gap-4" onMouseLeave={() => setHover(null)}>
        {hari.map((d) => {
          const total = jumlah(data[d])
          const libur = closed.includes(d)
          return (
            <div key={d} className="relative flex h-full flex-col items-center justify-end" onMouseEnter={() => setHover(d)} onFocus={() => setHover(d)} tabIndex={0}
              aria-label={`${labelTanggal(d).panjang}: ${libur ? 'libur' : `${total} porsi`}`}>
              {libur && !total
                ? <><span className="mb-1 text-xs font-semibold text-abu">Libur</span><span className="h-7 w-full max-w-12 rounded-[4px] bg-[#e8dcc6]" /></>
                : (
                  <>
                    <span className="mb-1 text-xs font-bold">{total}</span>
                    {/* Segmen bertumpuk dengan celah 2px; ujung data membulat 4px */}
                    <span className="flex w-full max-w-12 flex-col-reverse gap-[2px] overflow-hidden rounded-t-[4px]" style={{ height: `${(total / max) * 150}px` }}>
                      {menus.filter((m) => data[d][m]).map((m) => <span key={m} style={{ flexGrow: data[d][m], background: warna(m) }} />)}
                    </span>
                  </>
                )}
              {hover === d && total > 0 && (
                <div role="tooltip" className="absolute bottom-full z-10 mb-2 w-max rounded-[10px] bg-ungu-gelap px-3 py-2 text-xs text-white shadow-lg">
                  <p className="font-bold">{labelTanggal(d).panjang} · {total} porsi</p>
                  {menus.filter((m) => data[d][m]).map((m) => (
                    <p key={m} className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: warna(m) }} />{m} {data[d][m]}</p>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-2 text-center text-xs font-semibold text-abu lg:gap-4">
        {hari.map((d) => <span key={d} className={d === today ? 'font-extrabold text-ungu-gelap' : ''}>{labelTanggal(d).hari}{d === today && <span className="hidden lg:inline"> · hari ini</span>}</span>)}
      </div>
      <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-abu">
        {menus.map((m) => <span key={m} className="flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{ background: warna(m) }} />{m}</span>)}
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[#e8dcc6]" />Libur</span>
      </p>
      {/* Tampilan tabel untuk pembaca layar; dibungkus div karena <table> mengabaikan lebar sr-only */}
      <div className="sr-only"><table>
        <caption>Porsi per hari minggu ini</caption>
        <thead><tr><th>Hari</th>{menus.map((m) => <th key={m}>{m}</th>)}<th>Total</th></tr></thead>
        <tbody>{hari.map((d) => <tr key={d}><td>{labelTanggal(d).panjang}</td>{menus.map((m) => <td key={m}>{data[d][m] || 0}</td>)}<td>{jumlah(data[d])}</td></tr>)}</tbody>
      </table></div>
    </>
  )
}

function Donat({ perMenu, menus }) {
  const total = jumlah(perMenu)
  const ada = menus.filter((m) => perMenu[m])
  const top = [...ada].sort((a, b) => perMenu[b] - perMenu[a])[0]
  const R = 70, K = 2 * Math.PI * R, CELAH = ada.length > 1 ? 3 : 0
  let jalan = 0
  return (
    <>
      <div className="relative mx-auto mt-4 size-[180px]">
        <svg viewBox="0 0 180 180" className="size-full -rotate-90" role="img" aria-label={ada.map((m) => `${m} ${perMenu[m]} porsi`).join(', ') || 'Belum ada porsi'}>
          <circle cx="90" cy="90" r={R} fill="none" stroke="#f5f2eb" strokeWidth="22" />
          {ada.map((m) => {
            const len = (perMenu[m] / total) * K
            const el = (
              <circle key={m} cx="90" cy="90" r={R} fill="none" stroke={warna(m)} strokeWidth="22"
                strokeDasharray={`${Math.max(0, len - CELAH)} ${K}`} strokeDashoffset={-jalan}>
                <title>{`${m}: ${perMenu[m]} porsi (${Math.round((perMenu[m] / total) * 100)}%)`}</title>
              </circle>
            )
            jalan += len
            return el
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[34px] font-extrabold leading-none">{total ? `${Math.round((perMenu[top] / total) * 100)}%` : '–'}</span>
          <span className="mt-1 text-xs font-semibold text-abu">{total ? `${top} terlaris` : 'Belum ada porsi'}</span>
        </div>
      </div>
      <ul className="mt-4 flex flex-col gap-2 text-sm">
        {menus.map((m) => (
          <li key={m} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 font-medium"><span className="size-2.5 rounded-full" style={{ background: warna(m) }} />{m}</span>
            <span className="font-bold">{perMenu[m] || 0} porsi · {total ? Math.round(((perMenu[m] || 0) / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </>
  )
}

function Hitung({ deadline }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])
  const ms = new Date(deadline) - now
  if (ms <= 0) return <p className="mt-2 text-[34px] font-extrabold text-[#f87171]">Lewat batas</p>
  const s = Math.floor(ms / 1000)
  return (
    <>
      <p className="mt-2 font-mono text-[40px] font-bold leading-none text-kuning" role="timer">
        {[Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map((n) => String(n).padStart(2, '0')).join(':')}
      </p>
      <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-white/20"><span className="block h-full rounded-full bg-kuning" style={{ width: `${Math.min(100, (ms / (4 * 3600e3)) * 100)}%` }} /></span>
    </>
  )
}

export default function Dashboard() {
  const admin = useOutletContext()
  const today = todayJakarta()
  const senin = seninDari(today)
  const minggu = Array.from({ length: 7 }, (_, i) => addDays(senin, i))
  const mingguLalu = minggu.map((d) => addDays(d, -7))
  const [d, setD] = useState(null)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null)
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setError('')
    try {
      const [{ orders }, closedRes, kitchen] = await Promise.all([
        api('/admin/orders'), api('/closed-dates').catch(() => ({ closed_dates: [] })), api(`/admin/kitchen?date=${today}`),
      ])
      const rentang = new Set([...mingguLalu, ...minggu])
      // Pesanan beberapa tanggal kirim (pesanan besar) dipecah dari detailnya
      const multi = orders.filter((o) => DIMASAK.includes(o.status) && o.delivery_dates.length > 1 && o.delivery_dates.some((x) => rentang.has(x)))
      const tunggu = orders.filter((o) => o.status === 'menunggu_pembayaran')
      const [details, tagih] = await Promise.all([
        Promise.all(multi.map((o) => api(`/admin/orders/${o.id}`))).then((l) => Object.fromEntries(l.map((x) => [x.id, x]))),
        tunggu.length ? Promise.all(tunggu.map((o) => api(`/admin/orders/${o.id}`))) : [],
      ])
      setD({ orders, closed: closedRes.closed_dates.map((c) => c.closed_date), kitchen, details, tagih })
    } catch (e) {
      setError(e.message)
    }
  }, [today]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [load])

  const close = useCallback(() => setModal(null), [])
  const done = useCallback((_, m) => { setModal(null); setNotice(m); load() }, [load])

  if (error) return <p role="alert" className="mx-auto max-w-[1180px] rounded-[10px] bg-[#fde8e8] px-4 py-3 text-sm font-semibold text-[#b91c1c]">Dashboard belum bisa dimuat: {error} <button type="button" onClick={load} className="ml-2 underline">Coba lagi</button></p>
  if (!d) return <p role="status" className="py-8 text-center text-sm font-semibold text-abu">Memuat dashboard…</p>

  const { orders, closed, kitchen, details, tagih } = d
  const ini = porsiPerTanggal(orders, details, minggu)
  const lalu = porsiPerTanggal(orders, details, mingguLalu)
  const totalIni = minggu.reduce((a, x) => a + jumlah(ini[x]), 0)
  const totalLalu = mingguLalu.reduce((a, x) => a + jumlah(lalu[x]), 0)
  const perMenu = {}
  minggu.forEach((x) => Object.entries(ini[x]).forEach(([m, q]) => { perMenu[m] = (perMenu[m] || 0) + q }))
  const menus = urutMenu([...new Set([...Object.keys(WARNA), ...Object.keys(perMenu)])])
  const terpadat = [...minggu].sort((a, b) => jumlah(ini[b]) - jumlah(ini[a]))[0]
  const porsiHariIni = jumlah(ini[today])

  const pesananMinggu = orders.filter((o) => o.status !== 'dibatalkan' && o.delivery_dates.some((x) => minggu.includes(x))).length
  const hitung = (s) => orders.filter((o) => o.status === s).length
  const telat = orders.filter((o) => o.status === 'menunggu_pembayaran' && o.payment_overdue).length
  const terbaru = [...orders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5)
  const masak = kitchen.in_progress.flatMap((x) => x.items.map((it) => ({ ...it, order_code: x.order_code })))
  // Perlu tindakan: tagihan dengan batas bayar terdekat, lalu antrean konfirmasi paling lama
  const urgent = tagih.filter((o) => o.pay_deadline_at && o.pay_status === 'belum_bayar').sort((a, b) => new Date(a.pay_deadline_at) - new Date(b.pay_deadline_at))[0]
  const antre = orders.filter((o) => o.status === 'menunggu_konfirmasi').sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  const naik = totalLalu ? Math.round(((totalIni - totalLalu) / totalLalu) * 100) : null
  const inisial = (n) => (n || '?').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="mx-auto max-w-[1180px] pb-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-extrabold lg:text-[30px]"><span className="lg:hidden">Halo, {admin?.username}</span><span className="hidden lg:inline">Dashboard Operasional</span></h1>
          <p className="text-sm font-medium text-abu">
            <span className="lg:hidden">{hariPanjang(today)}, {labelTanggal(today).panjang.split(', ')[1]} · {porsiHariIni} porsi hari ini</span>
            <span className="hidden lg:inline">Kelola kapasitas masak, konfirmasi ongkir, dan tagihan pesanan MYM</span>
          </p>
        </div>
        <Link to="/dapur/maclab" className="hidden rounded-[10px] bg-ungu px-5 py-3 text-[15px] font-bold text-white lg:block">+ Buat Pesanan Besar</Link>
      </div>

      {notice && <p role="status" className="mt-4 rounded-[10px] bg-ungu-gelap px-4 py-3 text-sm font-bold text-white">✓ {notice}</p>}

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
        <Stat utama to="/dapur/pesanan" label="Pesanan minggu ini" angka={pesananMinggu} sub={`${porsiHariIni} porsi hari ini`} />
        <Stat to="/dapur/pesanan" label="Menunggu konfirmasi" angka={hitung('menunggu_konfirmasi')} sub="Perlu ongkir & waktu bayar" />
        <Stat to="/dapur/masak" label="Siap dimasak" angka={hitung('diproses')} sub="Sudah DP, lunas, atau bayar setelah kirim" />
        <Stat to="/dapur/pesanan" label="Menunggu pembayaran" angka={hitung('menunggu_pembayaran')} sub={telat ? `${telat} lewat batas 4 jam` : 'Belum ada yang lewat batas'} subCls={telat ? 'text-[#dc2626]' : 'text-abu'} />
      </div>

      <div className="mt-4 grid gap-4 lg:mt-5 lg:grid-cols-[1fr_1fr_1fr] lg:gap-5">
        {/* Perlu tindakan: di HP tampil paling atas (Figma Mobile) */}
        <section className="order-first rounded-[20px] bg-ungu-gelap p-5 text-white lg:order-last lg:col-start-3 lg:row-start-2 lg:p-6" aria-labelledby="judul-tindakan">
          <h2 id="judul-tindakan" className="text-lg font-bold">Perlu tindakan</h2>
          {urgent ? (
            <div className="mt-3">
              <p className="text-[13px] font-medium text-abu-label">Batas bayar 4 jam · {urgent.customer_name || urgent.order_code} · {jam.format(new Date(urgent.pay_deadline_at))}</p>
              <Hitung deadline={urgent.pay_deadline_at} />
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm font-bold">
                <button type="button" onClick={() => setModal({ jenis: 'bayar', id: urgent.id })} className="h-10 rounded-[10px] bg-kuning text-ungu-gelap">Catat bayar</button>
                <button type="button" onClick={() => setModal({ jenis: 'jadwal', id: urgent.id })} className="h-10 rounded-[10px] bg-ungu">Jadwal ulang</button>
              </div>
            </div>
          ) : <p className="mt-3 text-sm font-medium text-abu-label">Tidak ada tagihan yang sedang berjalan.</p>}
          <div className="mt-5 border-t border-white/15 pt-4">
            <p className="text-[13px] font-medium text-abu-label">Menunggu konfirmasi · {antre.length} antre</p>
            {antre[0] ? (
              <>
                <Link to={`/dapur/pesanan/${antre[0].id}`} className="mt-1 block font-bold hover:underline">{antre[0].order_code}{antre[0].customer_name && ` · ${antre[0].customer_name}`}</Link>
                <p className="text-[13px] font-medium text-abu-label">{menuLabel(antre[0])}{antre[0].delivery_methods.includes('antar_nabila') && ' · ongkir belum diisi'}</p>
                <button type="button" onClick={() => setModal({ jenis: 'konfirmasi', id: antre[0].id })} className="mt-3 h-11 w-full rounded-[10px] bg-kuning text-sm font-bold text-ungu-gelap">Konfirmasi pesanan</button>
              </>
            ) : <p className="mt-1 text-sm font-medium">Semua pesanan sudah dikonfirmasi.</p>}
          </div>
        </section>

        <section className={`${kartu} lg:col-span-2`} aria-labelledby="judul-mingguan">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 id="judul-mingguan" className="text-lg font-bold">Analitik Porsi Masak Mingguan</h2>
              <p className="text-[13px] font-medium text-abu">{labelTanggal(senin).panjang} – {labelTanggal(minggu[6]).panjang} · pesanan yang sudah dikonfirmasi</p>
            </div>
            <dl className="flex gap-5 text-right">
              <div><dt className="sr-only">Porsi minggu ini</dt><dd className="text-xl font-extrabold">{totalIni} porsi</dd><dd className="text-xs font-medium text-abu">minggu ini</dd></div>
              {naik !== null && <div><dt className="sr-only">Perubahan</dt><dd className={`text-xl font-extrabold ${naik >= 0 ? 'text-[#15803d]' : 'text-[#dc2626]'}`}>{naik >= 0 ? '+' : ''}{naik}%</dd><dd className="text-xs font-medium text-abu">vs minggu lalu</dd></div>}
              {totalIni > 0 && <div><dt className="sr-only">Hari terpadat</dt><dd className="text-xl font-extrabold text-ungu">{hariPanjang(terpadat)} · {jumlah(ini[terpadat])}</dd><dd className="text-xs font-medium text-abu">hari terpadat</dd></div>}
            </dl>
          </div>
          <Mingguan hari={minggu} data={ini} today={today} closed={closed} menus={menus} />
        </section>

        <section className={kartu} aria-labelledby="judul-terlaris">
          <h2 id="judul-terlaris" className="text-lg font-bold">Porsi Menu Terlaris</h2>
          <p className="text-[13px] font-medium text-abu">Minggu ini</p>
          <Donat perMenu={perMenu} menus={menus} />
        </section>

        <section className={kartu} aria-labelledby="judul-terbaru">
          <div className="flex items-center justify-between">
            <h2 id="judul-terbaru" className="text-lg font-bold">Pesanan terbaru</h2>
            <Link to="/dapur/pesanan" className="text-sm font-bold text-ungu">Lihat semua</Link>
          </div>
          <ul className="mt-4 flex flex-col gap-3.5">
            {terbaru.map((o) => {
              const [label, text, dot] = STATUS[o.status]
              return (
                <li key={o.id}>
                  <Link to={`/dapur/pesanan/${o.id}`} className="flex items-center gap-3 hover:opacity-80">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ungu text-sm font-bold text-white">{inisial(o.customer_name)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-bold">{o.customer_name || 'Dianonimkan'}</span>
                      <span className="block truncate text-xs font-medium text-abu">{o.payment_overdue ? 'Lewat batas bayar' : `${o.items_summary.reduce((a, i) => a + i.qty, 0)} porsi · ${labelTanggal(o.delivery_dates[0]).panjang}`}</span>
                    </span>
                    <span className={`flex shrink-0 items-center gap-1.5 text-xs font-semibold ${text}`}><span className={`size-1.5 rounded-full ${dot}`} />{label}</span>
                  </Link>
                </li>
              )
            })}
            {!terbaru.length && <li className="text-sm font-semibold text-abu">Belum ada pesanan.</li>}
          </ul>
        </section>

        <section className={kartu} aria-labelledby="judul-masak">
          <div className="flex items-center justify-between">
            <h2 id="judul-masak" className="text-lg font-bold">Masak hari ini</h2>
            <Link to="/dapur/masak" className="text-sm font-bold text-ungu">Daftar masak</Link>
          </div>
          <p className="text-[13px] font-medium text-abu">{labelTanggal(today).panjang} · {kitchen.portions_total} porsi siap dimasak</p>
          <ul className="mt-4 flex flex-col gap-3">
            {masak.slice(0, 5).map((it) => (
              <li key={it.order_item_id} className="flex items-center gap-3">
                <img src={localPhoto({ name: it.name })} alt="" className="size-10 shrink-0 object-contain" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">{it.name} ×{it.qty}</span>
                  <span className="block truncate text-xs font-medium text-abu">{[it.options.join(' · '), it.note && `“${it.note}”`].filter(Boolean).join(' · ') || it.order_code}</span>
                </span>
                {it.note_flags.length > 0 ? <span className="shrink-0 text-xs font-bold text-[#d97706]">⚠ Konflik</span> : it.labels[0] && <span className="shrink-0 text-xs font-bold">{it.labels[0]}</span>}
              </li>
            ))}
            {masak.length > 5 && <li className="text-xs font-semibold text-abu">+{masak.length - 5} item lagi di Daftar Masak</li>}
            {!masak.length && <li className="text-sm font-semibold text-abu">Belum ada yang siap dimasak hari ini.</li>}
          </ul>
        </section>
      </div>

      {modal?.jenis === 'bayar' && <PaymentForm orderId={modal.id} onClose={close} onDone={done} />}
      {modal?.jenis === 'jadwal' && <RescheduleDialog orderId={modal.id} onClose={close} onDone={done} />}
      {modal?.jenis === 'konfirmasi' && <ConfirmDialog orderId={modal.id} onClose={close} onDone={done} />}
    </div>
  )
}
