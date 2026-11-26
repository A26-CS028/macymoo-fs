import Spinner from './Spinner'

// Tombol (Figma: Komponen — Button, 6 gaya × 2 ukuran; Komponen Umpan Balik — tombol memuat & nonaktif).
// memuat: spinner + teksMemuat dan tombol tidak bisa diklik lagi (mencegah kirim ganda).
const GAYA = {
  utama: 'bg-ungu text-white hover:bg-ungu-tua',
  sekunder: 'bg-krem-field text-ungu-gelap hover:bg-[#ece4d6]',
  gelap: 'bg-ungu-gelap text-white hover:bg-[#2c0a6b]',
  kuning: 'bg-kuning text-ungu-gelap hover:bg-[#f0ad12]',
  bahaya: 'bg-[#dc2626] text-white hover:bg-[#b91c1c]',
  lembut: 'bg-krem-field text-abu hover:text-ungu-gelap',
}
const UKURAN = {
  md: 'h-12 rounded-[10px] px-[22px] text-[15px]',
  sm: 'h-9 rounded-[8px] px-3.5 text-[13px]',
}

export default function Button({ varian = 'utama', ukuran = 'md', memuat = false, teksMemuat = 'Mengirim…', disabled, className = '', children, type = 'button', ...props }) {
  const mati = disabled || memuat
  return (
    <button type={type} disabled={mati} aria-busy={memuat || undefined} {...props}
      className={`inline-flex items-center justify-center gap-2 font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ungu focus-visible:ring-offset-2 ${UKURAN[ukuran]} ${
        disabled && !memuat ? 'cursor-not-allowed bg-[#d9d2e6] text-white' : GAYA[varian]} ${memuat ? 'cursor-wait' : ''} ${className}`}>
      {memuat ? <><Spinner className={ukuran === 'sm' ? 'size-4' : 'size-5'} />{teksMemuat}</> : children}
    </button>
  )
}
