// Indikator memuat (Figma: Komponen Umpan Balik — Tombol memuat). Warna mengikuti teks di sekitarnya.
export default function Spinner({ className = 'size-5', label }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`shrink-0 animate-spin ${className}`} role={label ? 'status' : undefined}
      aria-label={label} aria-hidden={label ? undefined : 'true'}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
      <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

// Baris "Memuat …" untuk halaman yang datanya belum tiba
export function Memuat({ children }) {
  return (
    <p role="status" className="flex items-center justify-center gap-2.5 py-8 text-sm font-semibold text-abu">
      <Spinner className="size-4" />{children}
    </p>
  )
}
