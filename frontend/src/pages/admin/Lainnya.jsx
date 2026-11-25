import { useEffect, useState } from 'react'
import { Link, Navigate, useOutletContext } from 'react-router-dom'
import { api } from '../../api/client'
import Ikon from '../../components/admin/Ikon'

// Lainnya (Figma: Admin Mobile — Lainnya). Menu pengaturan di HP; di desktop semua ada di sidebar.
export default function Lainnya() {
  const admin = useOutletContext()
  const [menus, setMenus] = useState(null)
  const [tutup, setTutup] = useState(null)
  const desktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches

  useEffect(() => {
    api('/admin/menus').then((d) => setMenus(d.menus)).catch(() => {})
    api('/closed-dates').then((d) => setTutup(d.closed_dates.length)).catch(() => {})
  }, [])

  if (desktop) return <Navigate to="/dapur/beranda" replace />

  const habis = menus?.filter((m) => !m.is_available).length
  const ulasan = admin.ringkasan?.ulasan
  const BARIS = [
    ['menu', 'Kelola Menu & Harga', menus ? `${menus.length} menu${habis ? ` · ${habis} habis hari ini` : ''}` : 'Harga, foto, dan status', '/dapur/menu'],
    ['kalender', 'Tutup Tanggal, Bank & QRIS', tutup ? `${tutup} tanggal ditutup` : 'Jadwal kuliah Nabila', '/dapur/pengaturan'],
    ['pesananBesar', 'Form Pesanan Besar', 'Kafe & kolaborasi, multi-tanggal kirim', '/dapur/maclab'],
    ['perisai', 'Moderasi & Privasi PDP', ulasan ? `${ulasan} ulasan menunggu` : 'Ulasan & anonimisasi data', '/dapur/ulasan'],
  ]
  const isi = (ikon, judul, sub) => (
    <>
      <Ikon d={ikon} className="size-6 shrink-0 text-ungu" />
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-[17px] font-bold">{judul}</span>
        <span className="block text-[13px] font-medium text-abu">{sub}</span>
      </span>
      <Ikon d="kanan" className="size-5 shrink-0 text-abu" />
    </>
  )

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-[28px] font-extrabold">Lainnya</h1>
      <div className="mt-4 flex items-center gap-4 rounded-[20px] bg-white p-4">
        <span className="flex size-14 items-center justify-center rounded-full bg-ungu text-xl font-bold text-white">{admin.username[0]?.toUpperCase()}</span>
        <span>
          <span className="block text-lg font-bold">{admin.username}</span>
          <span className="block text-sm text-abu">Admin</span>
        </span>
      </div>
      <ul className="mt-4 flex flex-col rounded-[20px] bg-white px-4 py-2">
        {BARIS.map(([ikon, judul, sub, to]) => (
          <li key={to}><Link to={to} className="flex items-center gap-4 py-4">{isi(ikon, judul, sub)}</Link></li>
        ))}
        <li><button type="button" onClick={admin.bukaPanduan} className="flex w-full items-center gap-4 py-4">{isi('putar', 'Panduan Dasbor', 'Video & buku saku PDF')}</button></li>
        <li><button type="button" onClick={admin.keluar} className="flex w-full items-center gap-4 py-4">{isi('keluar', 'Keluar', 'Hapus sesi di perangkat ini')}</button></li>
      </ul>
    </div>
  )
}
