import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../../api/client'
import OrderTable, { STATUS } from '../../components/admin/OrderTable'
import ConfirmDialog from '../../components/admin/ConfirmDialog'
import RescheduleDialog from '../../components/admin/RescheduleDialog'
import CancelDialog from '../../components/admin/CancelDialog'
import PaymentForm from '../../components/admin/PaymentForm'
import Toast from '../../components/ui/Toast'
import { Memuat } from '../../components/ui/Spinner'

// Pesanan Masuk (Figma: Admin — Pesanan Masuk / Admin Mobile — Pesanan): daftar, cari, filter status,
// lalu konfirmasi, jadwalkan ulang, atau batalkan lewat modal.
const PER_HALAMAN = 10
const TABS = [['semua', 'Semua'], ...Object.entries(STATUS).map(([k, [label]]) => [k, label])]

export default function Orders() {
  const [orders, setOrders] = useState(null)
  const [error, setError] = useState('')
  const [params] = useSearchParams()
  const [q, setQ] = useState(params.get('q') || '') // dari kotak cari di top bar
  useEffect(() => { if (params.has('q')) setQ(params.get('q')) }, [params])
  const [tab, setTab] = useState('semua')
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(null) // { jenis, order }
  const [notice, setNotice] = useState('')

  // Pencarian ke server (kode, nama, nomor HP); status disaring di sini supaya jumlah per tab tetap tampil
  const load = useCallback((query) => {
    setError('')
    api(`/admin/orders${query ? `?q=${encodeURIComponent(query)}` : ''}`)
      .then((r) => setOrders(r.orders))
      .catch((e) => setError(e.message))
  }, [])

  useEffect(() => {
    const t = setTimeout(() => load(q.trim()), 300)
    return () => clearTimeout(t)
  }, [q, load])

  useEffect(() => setPage(1), [q, tab])

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(''), 5000)
    return () => clearTimeout(t)
  }, [notice])

  const count = (k) => (orders || []).filter((o) => k === 'semua' || o.status === k).length
  const filtered = (orders || []).filter((o) => tab === 'semua' || o.status === tab)
  const pages = Math.max(1, Math.ceil(filtered.length / PER_HALAMAN))
  const current = Math.min(page, pages) // setelah aksi, halaman terakhir bisa hilang
  const shown = filtered.slice((current - 1) * PER_HALAMAN, current * PER_HALAMAN)

  const close = useCallback(() => setModal(null), [])
  const done = useCallback((_, message) => { setModal(null); setNotice(message); load(q.trim()) }, [load, q])

  return (
    <div className="mx-auto max-w-[1180px] pb-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-extrabold lg:text-[30px]">Pesanan Masuk</h1>
          <p className="text-sm font-medium text-abu">Konfirmasi, jadwalkan ulang, atau batalkan dari satu tabel</p>
        </div>
        <Link to="/dapur/maclab" className="rounded-[10px] bg-ungu px-5 py-3 text-[15px] font-bold text-white">+ Buat Pesanan Besar</Link>
      </div>

      {/* Desktop memakai kotak cari di top bar (Figma); di HP kotak cari ada di halaman */}
      <div className="mt-5 lg:hidden">
        <label htmlFor="cari" className="sr-only">Cari pesanan</label>
        <div className="relative max-w-md">
          <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-abu" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          <input id="cari" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari kode MYM, nama, atau WA"
            className="h-12 w-full rounded-[12px] bg-white pl-11 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-ungu" />
        </div>
      </div>

      <div role="tablist" aria-label="Filter status" className="mt-4 flex gap-5 overflow-x-auto border-b border-abu-label/40 text-sm font-semibold">
        {TABS.map(([k, label]) => (
          <button key={k} role="tab" type="button" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`-mb-px shrink-0 border-b-2 pb-2 ${tab === k ? 'border-ungu-gelap text-ungu-gelap' : 'border-transparent text-abu hover:text-ungu-gelap'}`}>
            {label} {orders && count(k)}
          </button>
        ))}
      </div>

      {notice && <Toast judul={notice} onClose={() => setNotice('')} />}

      <div className="mt-4 xl:rounded-[20px] xl:bg-white xl:p-5">
        {error && (
          <div role="alert" className="flex flex-wrap items-center gap-3 rounded-[10px] bg-[#fde8e8] px-4 py-3 text-sm font-semibold text-[#b91c1c]">
            Pesanan belum bisa dimuat: {error}
            <button type="button" onClick={() => load(q.trim())} className="rounded-lg bg-white px-3 py-1 text-ungu-gelap">Coba lagi</button>
          </div>
        )}
        {!orders && !error && <Memuat>Memuat pesanan…</Memuat>}
        {orders && !filtered.length && (
          <p className="py-8 text-center text-sm font-semibold text-abu">{q ? `Tidak ada pesanan yang cocok dengan "${q}".` : 'Belum ada pesanan di sini.'}</p>
        )}
        {shown.length > 0 && <OrderTable orders={shown} onAction={(jenis, order) => setModal({ jenis, order })} />}

        {filtered.length > 0 && (
          <div className="mt-4 flex items-center justify-between text-xs font-semibold text-abu">
            <span>Menampilkan {shown.length} dari {filtered.length} pesanan</span>
            {pages > 1 && (
              <nav aria-label="Halaman" className="flex items-center gap-1">
                {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                  <button key={n} type="button" onClick={() => setPage(n)} aria-current={current === n ? 'page' : undefined}
                    className={`size-9 rounded-full text-sm font-bold ${current === n ? 'bg-ungu-gelap text-white' : 'bg-krem-field text-ungu-gelap'}`}>{n}</button>
                ))}
              </nav>
            )}
          </div>
        )}
      </div>

      {modal?.jenis === 'konfirmasi' && <ConfirmDialog orderId={modal.order.id} onClose={close} onDone={done} />}
      {modal?.jenis === 'jadwal' && <RescheduleDialog orderId={modal.order.id} onClose={close} onDone={done} />}
      {modal?.jenis === 'batal' && <CancelDialog order={modal.order} onClose={close} onDone={done} />}
      {modal?.jenis === 'bayar' && <PaymentForm orderId={modal.order.id} onClose={close} onDone={done} />}
    </div>
  )
}
