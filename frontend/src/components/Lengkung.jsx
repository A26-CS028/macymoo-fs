// Lengkungan pemisah antarbagian, bentuknya sama dengan gelombang hero (assets/landing/gelombang.svg).
// warna = [pita, dasar]: pita tampil sebagai garis lengkung di depan, dasar mengisi sisi bawah (atau atas bila `balik`).
// balik: warna mengisi dari atas (untuk transisi dari bagian sebelumnya); cermin: lengkung dibalik kiri-kanan.
export default function Lengkung({ warna, balik, cermin, className = '' }) {
  const t = `${cermin ? 'translate(1440 0) scale(-1 1)' : ''} ${balik ? 'translate(0 150) scale(1 -1)' : ''}`.trim()
  return (
    <svg viewBox="0 0 1440 150" preserveAspectRatio="none" aria-hidden="true" className={`pointer-events-none block w-full ${className}`}>
      <g transform={t || undefined}>
        <path d="M0 92C288 128 547.2 78 806.4 44C1065.6 10 1267.2-2 1440 30V150H0V92Z" fill={warna[0]} />
        <path d="M0 118C316.8 150 604.8 108 864 76C1123.2 44 1296 36 1440 62V150H0V118Z" fill={warna[1]} />
      </g>
    </svg>
  )
}
