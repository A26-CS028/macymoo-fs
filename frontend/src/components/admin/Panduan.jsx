import Modal from './Modal'
import Ikon from './Ikon'
import sampul from '../../assets/landing/menu-desktop.webp'
import Button from '../ui/Button'

// Panduan Dasbor Nabila (Figma: Modal Panduan Dasbor / Mobile — Panduan dasbor).
// shortcut: video dan buku saku PDF belum dibuat; tempatnya disiapkan dengan label "Segera". Isi src/href bila sudah ada.
const ISI = [
  ['dokumen', 'Buku Saku Operasional', 'PDF · 12 halaman'],
  ['putar', 'Konfirmasi & Tagihan', 'Video · 2:10'],
  ['putar', 'Daftar Masak & MooLabel', 'Video · 1:45'],
]

export default function Panduan({ onClose }) {
  return (
    <Modal title="Panduan Dasbor Nabila" subtitle="Video singkat & buku saku PDF operasional" onClose={onClose} titleId="judul-panduan" width="lg:w-[800px]">
      <div className="relative overflow-hidden rounded-[20px] bg-kuning">
        <img src={sampul} alt="" className="h-[180px] w-full object-cover lg:h-[330px]" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <span className="flex size-16 items-center justify-center rounded-[14px] bg-kuning text-ungu-gelap shadow-lg lg:size-20" aria-hidden="true">
            <Ikon d="putar" fill="currentColor" className="size-7 lg:size-8" />
          </span>
          <span className="rounded-lg bg-ungu-gelap px-3 py-1.5 text-sm font-bold text-white">Tur dasbor · 6 menit · segera</span>
        </div>
      </div>
      <ul className="mt-4 grid gap-3 sm:grid-cols-3">
        {ISI.map(([ikon, judul, sub]) => (
          <li key={judul} className="rounded-[16px] bg-krem-field p-4" aria-disabled="true">
            <Ikon d={ikon} className="size-6 text-ungu" />
            <p className="mt-3 font-bold">{judul}</p>
            <p className="text-sm font-medium text-abu">{sub} · <span className="font-bold text-[#d97706]">Segera</span></p>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button varian="sekunder" onClick={onClose}>Tutup</Button>
        <Button disabled title="Buku saku PDF segera tersedia">
          <Ikon d="unduh" />Unduh Buku Saku PDF <span className="text-xs font-semibold">(segera)</span>
        </Button>
      </div>
    </Modal>
  )
}
