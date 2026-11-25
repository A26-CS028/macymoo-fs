import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import { useAuth } from '../../hooks/useAuth'
import Ikon from './Ikon'
import Panduan from './Panduan'
import logo from '../../assets/landing/logo.webp'

// Kerangka semua halaman admin (Figma: Admin Nabila — Desktop: sidebar + top bar; Mobile: tab bar bawah).
// Tanpa sesi sah, dialihkan ke halaman login /dapur. Halaman turunan di HP memakai header dengan tombol kembali.
const OPERASIONAL = [
  { to: '/dapur/beranda', label: 'Dashboard', ikon: 'dashboard' },
  { to: '/dapur/pesanan', label: 'Pesanan Masuk', ikon: 'pesanan', badge: true },
  { to: '/dapur/masak', label: 'Daftar Masak', ikon: 'masak' },
  { to: '/dapur/maclab', label: 'Form Pesanan Besar', ikon: 'pesananBesar' },
  { to: '/dapur/rekap', label: 'Rekap Keuangan', ikon: 'rekap' },
]
const PENGATURAN = [
  { to: '/dapur/menu', label: 'Kelola Menu & Harga', ikon: 'menu' },
  { to: '/dapur/pengaturan', label: 'Bank, QRIS & Tutup Tanggal', ikon: 'bank' },
  { to: '/dapur/ulasan', label: 'Moderasi & Privasi PDP', ikon: 'perisai' },
]
const TAB = [
  { to: '/dapur/beranda', label: 'Beranda', ikon: 'dashboard' },
  { to: '/dapur/pesanan', label: 'Pesanan', ikon: 'pesanan', badge: true, end: true },
  { to: '/dapur/masak', label: 'Masak', ikon: 'masak' },
  { to: '/dapur/rekap', label: 'Rekap', ikon: 'rekap' },
  { to: '/dapur/lainnya', label: 'Lainnya', ikon: 'lainnya' },
]
// Halaman turunan di HP (dibuka dari Lainnya): judul header + tujuan tombol kembali
const TURUNAN = {
  '/dapur/menu': 'Kelola Menu & Harga',
  '/dapur/pengaturan': 'Tutup Tanggal & Pembayaran',
  '/dapur/maclab': 'Pesanan besar',
  '/dapur/ulasan': 'Moderasi & Privasi',
}
const MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

function Popover({ ikon, label, titik, children }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const tutup = (e) => { if (e.type === 'keydown' ? e.key === 'Escape' : !ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', tutup)
    document.addEventListener('keydown', tutup)
    return () => { document.removeEventListener('mousedown', tutup); document.removeEventListener('keydown', tutup) }
  }, [open])
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label={label}
        className="relative flex size-11 items-center justify-center rounded-full text-ungu-gelap hover:bg-krem-field">
        <Ikon d={ikon} className="size-6" />
        {titik && <span className="absolute right-2.5 top-2.5 size-2.5 rounded-full bg-[#dc2626] ring-2 ring-white" />}
      </button>
      {open && (
        <div role="dialog" aria-label={label} className="absolute right-0 top-full z-50 mt-2 w-[300px] rounded-[16px] bg-white p-4 text-ungu-gelap shadow-xl ring-1 ring-black/5" onClick={() => setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  )
}

// Isi lonceng: ringkasan yang perlu ditindak. shortcut: belum ada notifikasi real-time/WA; tempatnya disiapkan.
function Notifikasi({ r }) {
  const baris = [
    [r?.konfirmasi, 'pesanan menunggu konfirmasi', '/dapur/pesanan'],
    [r?.telat, 'pesanan lewat batas bayar', '/dapur/pesanan'],
    [r?.ulasan, 'ulasan menunggu moderasi', '/dapur/ulasan'],
  ].filter(([n]) => n > 0)
  return (
    <>
      <p className="text-sm font-bold">Notifikasi</p>
      {baris.length ? (
        <ul className="mt-2 flex flex-col">
          {baris.map(([n, teks, to]) => (
            <li key={teks}><Link to={to} className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-sm hover:bg-krem-field"><span><b>{n}</b> {teks}</span><Ikon d="kanan" className="size-4 text-abu" /></Link></li>
          ))}
        </ul>
      ) : <p className="mt-2 text-sm text-abu">Tidak ada yang perlu ditindak.</p>}
      <p className="mt-3 border-t border-krem-field pt-2 text-xs font-medium text-abu">Notifikasi otomatis segera hadir.</p>
    </>
  )
}

export function NotifLonceng({ r }) {
  const ada = r && r.konfirmasi + r.telat + r.ulasan > 0
  return <Popover ikon="lonceng" label="Notifikasi" titik={ada}><Notifikasi r={r} /></Popover>
}

export default function AdminLayout() {
  const { admin, setAdmin } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [ringkasan, setRingkasan] = useState(null) // { konfirmasi, telat, ulasan }
  const [panduan, setPanduan] = useState(false)
  const [cari, setCari] = useState('')
  const cariRef = useRef(null)

  // Angka badge dan notifikasi; dimuat ulang saat pindah halaman supaya ikut berubah setelah aksi
  useEffect(() => {
    if (!admin) return
    Promise.all([api('/admin/orders'), api('/admin/reviews?status=pending').catch(() => ({ reviews: [] }))])
      .then(([{ orders }, { reviews }]) => setRingkasan({
        konfirmasi: orders.filter((o) => o.status === 'menunggu_konfirmasi').length,
        telat: orders.filter((o) => o.status === 'menunggu_pembayaran' && o.payment_overdue).length,
        ulasan: reviews.length,
      }))
      .catch(() => {})
  }, [admin, pathname])

  // ⌘F / Ctrl+F memfokuskan pencarian pesanan (seperti di Figma)
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f' && cariRef.current?.offsetParent) { e.preventDefault(); cariRef.current.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  if (admin === undefined) return <p className="p-6 text-sm text-abu" role="status">Memeriksa sesi…</p>
  if (!admin) return <Navigate to="/dapur" replace />

  async function keluar() {
    await api('/auth/logout', { method: 'POST' }).catch(() => {})
    setAdmin(null)
  }
  function kirimCari(e) {
    e.preventDefault()
    navigate(`/dapur/pesanan?q=${encodeURIComponent(cari.trim())}`)
  }

  const badge = (r) => (r?.konfirmasi > 0 ? (r.konfirmasi > 12 ? '12+' : String(r.konfirmasi)) : null)
  const tabBar = TAB.some((t) => pathname === t.to)
  const turunan = TURUNAN[pathname]
  const navItem = (item) => (
    <li key={item.to}>
      <NavLink to={item.to}
        className={({ isActive }) => `relative flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-[14.5px] tracking-[-0.01em] transition-colors ${isActive ? 'bg-krem-field font-bold text-ungu-gelap before:absolute before:-left-5 before:top-1/2 before:h-8 before:w-1 before:-translate-y-1/2 before:rounded-r-full before:bg-ungu' : 'font-medium text-abu hover:bg-krem-field/60 hover:text-ungu-gelap'}`}>
        {({ isActive }) => (
          <>
            <Ikon d={item.ikon} className={`size-5 shrink-0 ${isActive ? 'text-ungu' : ''}`} />
            <span className="flex-1 leading-tight">{item.label}</span>
            {item.badge && badge(ringkasan) && <span className="text-xs font-bold text-ungu-gelap">{badge(ringkasan)}</span>}
          </>
        )}
      </NavLink>
    </li>
  )

  return (
    <div className="min-h-screen bg-krem-field text-ungu-gelap lg:flex lg:gap-5 lg:p-5">
      {/* Sidebar desktop */}
      <aside className="sticky top-5 hidden h-[calc(100vh-40px)] w-[250px] shrink-0 flex-col overflow-y-auto rounded-[24px] bg-white px-5 py-6 lg:flex print:hidden">
        <Link to="/dapur/beranda" className="flex items-center gap-2.5 px-1">
          <img src={logo} alt="" className="h-9 w-auto" />
          <span className="text-[21px] font-extrabold">Macyourmoo</span>
        </Link>
        <nav aria-label="Menu admin" className="mt-8 flex flex-col gap-6">
          <div>
            <p className="mb-2 px-3.5 text-sm font-semibold text-abu">Operasional</p>
            <ul className="flex flex-col gap-1">{OPERASIONAL.map(navItem)}</ul>
          </div>
          <div>
            <p className="mb-2 px-3.5 text-sm font-semibold text-abu">Pengaturan</p>
            <ul className="flex flex-col gap-1">
              {PENGATURAN.map(navItem)}
              <li>
                <button type="button" onClick={keluar} className="flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-[14.5px] font-medium text-abu hover:bg-krem-field/60 hover:text-ungu-gelap">
                  <Ikon d="keluar" className="size-5" />Keluar (Logout)
                </button>
              </li>
            </ul>
          </div>
        </nav>
        <div className="relative mt-auto overflow-hidden rounded-[20px] bg-ungu-gelap p-4 pt-4 text-white">
          <span className="absolute -right-10 -top-10 size-32 rounded-full bg-ungu" aria-hidden="true" />
          <span className="relative flex size-8 items-center justify-center rounded-full bg-kuning text-ungu-gelap"><Ikon d="putar" fill="currentColor" className="size-3.5" /></span>
          <p className="relative mt-3 whitespace-nowrap text-[15px] font-bold">Panduan Dasbor Nabila</p>
          <p className="relative text-xs text-abu-label">Video singkat & buku saku PDF operasional</p>
          <button type="button" onClick={() => setPanduan(true)} className="relative mt-3 h-10 w-full rounded-[10px] bg-kuning text-sm font-bold text-ungu-gelap">Buka Panduan</button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Top bar desktop */}
        <header className="mb-5 hidden items-center justify-between gap-4 rounded-[24px] bg-white px-4 py-3 lg:flex print:hidden">
          <form onSubmit={kirimCari} role="search" className="relative w-full max-w-[360px]">
            <label htmlFor="cari-global" className="sr-only">Cari pesanan</label>
            <Ikon d="cari" className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-abu" />
            <input id="cari-global" ref={cariRef} type="search" value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari kode MYM, nama, atau WA"
              className="h-11 w-full rounded-[12px] bg-krem-field pl-11 pr-14 text-sm font-medium outline-none focus:ring-2 focus:ring-ungu" />
            <kbd className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 font-sans text-xs font-semibold text-abu">{MAC ? '⌘F' : 'Ctrl F'}</kbd>
          </form>
          <div className="flex items-center gap-2">
            <NotifLonceng r={ringkasan} />
            <Popover ikon="chat" label="Pesan">
              <p className="text-sm font-bold">Pesan</p>
              <p className="mt-2 text-sm text-abu">Kotak pesan pelanggan segera hadir. Untuk sekarang, balas pelanggan lewat WhatsApp.</p>
            </Popover>
            <span className="mx-2 h-8 w-px bg-krem-field" aria-hidden="true" />
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-full bg-ungu text-lg font-bold text-white">{admin.username[0]?.toUpperCase()}</span>
              <span className="leading-tight">
                <span className="block font-bold">{admin.username}</span>
                <span className="block text-sm text-abu">Admin</span>
              </span>
            </div>
          </div>
        </header>

        {/* HP: header halaman turunan */}
        {turunan && (
          <header className="flex items-center gap-4 px-5 pb-1 pt-5 lg:hidden">
            <Link to="/dapur/lainnya" aria-label="Kembali ke Lainnya"><Ikon d="kembali" className="size-6" /></Link>
            <h1 className="text-xl font-extrabold">{turunan}</h1>
          </header>
        )}

        <main className={`px-4 pt-4 lg:p-0 ${tabBar ? 'pb-24 lg:pb-0' : 'pb-6'}`}>
          <Outlet context={{ ...admin, ringkasan, bukaPanduan: () => setPanduan(true), keluar }} />
        </main>
      </div>

      {/* HP: tab bar bawah di halaman utama */}
      {tabBar && (
        <nav aria-label="Menu admin" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(30,5,77,0.08)] lg:hidden print:hidden">
          {TAB.map((t) => (
            <NavLink key={t.to} to={t.to} end={t.end}
              className={({ isActive }) => `relative flex flex-col items-center gap-1 pb-2.5 pt-3 text-xs font-semibold ${isActive ? 'font-bold text-ungu before:absolute before:top-0 before:h-1 before:w-10 before:rounded-b-full before:bg-ungu' : 'text-abu'}`}>
              <span className="relative">
                <Ikon d={t.ikon} className="size-6" />
                {t.badge && badge(ringkasan) && <span className="absolute -right-3 -top-1.5 text-[10px] font-bold text-[#dc2626]">{badge(ringkasan)}</span>}
              </span>
              {t.label}
            </NavLink>
          ))}
        </nav>
      )}

      {panduan && <Panduan onClose={() => setPanduan(false)} />}
    </div>
  )
}
