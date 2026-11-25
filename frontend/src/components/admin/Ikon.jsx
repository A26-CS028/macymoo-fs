// Ikon garis admin (Figma memakai set ikon gaya Lucide: garis 2px, ujung bulat). Satu tempat supaya seragam.
export const IKON = {
  dashboard: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  pesanan: 'M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z',
  masak: 'M9 2h6a1 1 0 011 1v2a1 1 0 01-1 1H9a1 1 0 01-1-1V3a1 1 0 011-1zM16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2M12 11h4M12 16h4M8 11h.01M8 16h.01',
  pesananBesar: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  rekap: 'M3 3v18h18M18 17V9M13 17V5M8 17v-3',
  menu: 'M3 2v7a2 2 0 002 2h4a2 2 0 002-2V2M7 2v20M21 15V2a5 5 0 00-5 5v6a2 2 0 002 2h3zm0 0v7',
  bank: 'M3 22h18M6 18v-7M10 18v-7M14 18v-7M18 18v-7M12 2l8 5H4z',
  kalender: 'M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z',
  perisai: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  keluar: 'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9',
  putar: 'M6 3l14 9-14 9V3z',
  lonceng: 'M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 003.4 0',
  chat: 'M7.9 20A9 9 0 104 16.1L2 22z',
  cari: 'M11 18a7 7 0 100-14 7 7 0 000 14zM21 21l-4.35-4.35',
  lainnya: 'M4 6h16M4 12h16M4 18h16',
  kanan: 'M9 6l6 6-6 6',
  kembali: 'M15 6l-6 6 6 6',
  unduh: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3',
  dokumen: 'M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5zM14 3v5h5M9 13h6M9 17h6',
  anonim: 'M9 11a4 4 0 100-8 4 4 0 000 8zM3 21v-1a6 6 0 0112 0v1M17 8l4 4M21 8l-4 4',
  tutup: 'M6 6l12 12M18 6L6 18',
  panah: 'M7 17L17 7M9 7h8v8',
}

export default function Ikon({ d, className = 'size-5', fill }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill={fill || 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={IKON[d] || d} />
    </svg>
  )
}
