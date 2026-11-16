import { useEffect, useState } from 'react'
import { api } from '../api/client'
import bintang from '../assets/landing/icon-bintang.svg'
import bintangKosong from '../assets/landing/icon-bintang-kosong.svg'
import pola from '../assets/landing/ulasan-desktop.webp'

// "Kata mereka" (Figma: Ulasan Pilihan Nabila / Ulasan Berjalan). Data dari GET /reviews: hanya review
// yang lolos moderasi, tanpa nama (kontrak), jadi kartu diberi label "Pembeli terverifikasi" (KF 9.1).
// Bagian ini tidak tampil bila belum ada review atau gagal dimuat.
function Bintang({ rating, size }) {
  return (
    <div className="flex gap-0.5" role="img" aria-label={`${rating} dari 5 bintang`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`flex items-center justify-center ${size}`}>
          <img src={i <= rating ? bintang : bintangKosong} alt="" className="size-[85%]" />
        </span>
      ))}
    </div>
  )
}

const tanggal = (iso) => new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta' })

function Kartu({ r, hidden }) {
  return (
    <li aria-hidden={hidden || undefined}
      className="flex h-[186px] w-[290px] shrink-0 flex-col gap-2.5 rounded-[18px] bg-krem p-[18px] lg:h-[196px] lg:w-[400px] lg:p-[22px]">
      <Bintang rating={r.rating} size="size-3.5" />
      <p className="line-clamp-4 text-sm font-medium leading-5 lg:text-[15px] lg:leading-[22px]">{r.comment || 'Tanpa komentar.'}</p>
      <p className="mt-auto text-xs font-medium text-abu">
        <span className="block text-sm font-bold text-ungu-gelap">Pembeli terverifikasi</span>
        {tanggal(r.created_at)}
      </p>
    </li>
  )
}

export default function Reviews() {
  const [reviews, setReviews] = useState([])

  useEffect(() => {
    api('/reviews').then((r) => setReviews(Array.isArray(r?.reviews) ? r.reviews : [])).catch(() => setReviews([]))
  }, [])

  if (!reviews.length) return null
  const rata = reviews.reduce((a, r) => a + r.rating, 0) / reviews.length

  return (
    <section id="ulasan" aria-labelledby="judul-ulasan" className="relative scroll-mt-4 overflow-hidden bg-ungu-gelap pb-6 pt-2.5 lg:pb-12 lg:pt-11">
      <img src={pola} alt="" className="absolute inset-0 size-full object-cover" />
      <div className="relative flex items-end justify-between px-5 lg:px-16">
        <h2 id="judul-ulasan" className="font-lilita text-[28px] leading-[1.15] text-white lg:text-[40px]">Kata mereka</h2>
        <div className="flex items-center gap-3">
          <p className="font-lilita text-[22px] leading-none text-kuning lg:text-[40px]">{rata.toFixed(1)}</p>
          <div className="flex flex-col gap-1">
            <Bintang rating={Math.round(rata)} size="size-3.5" />
            <p className="text-[11px] font-semibold text-abu-label lg:text-xs">{reviews.length} ulasan disetujui Nabila</p>
          </div>
        </div>
      </div>
      {/* Pita berjalan: daftar diulang dua kali supaya putarannya menyambung; berhenti saat disentuh/hover */}
      <div className="relative mt-6 overflow-hidden">
        <ul className="flex w-max animate-ulasan gap-3 hover:[animation-play-state:paused] lg:gap-5"
          style={{ animationDuration: `${reviews.length * 6}s` }}>
          {reviews.map((r) => <Kartu key={r.id} r={r} />)}
          {reviews.map((r) => <Kartu key={`ulang-${r.id}`} r={r} hidden />)}
        </ul>
      </div>
    </section>
  )
}
