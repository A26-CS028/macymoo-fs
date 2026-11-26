// Notifikasi singkat (Figma: Komponen Umpan Balik — Notifikasi berhasil / gagal).
// Halaman pemanggil yang mengatur kapan toast hilang; onClose untuk menutup lebih cepat.
// Melayang di pojok kanan atas (desktop) / atas tengah (HP) supaya tidak menggeser isi halaman.
export default function Toast({ jenis = 'berhasil', judul, isi, onClose, children }) {
  const gagal = jenis === 'gagal'
  return (
    <div role={gagal ? 'alert' : 'status'}
      className={`fixed inset-x-4 top-4 z-[60] mx-auto flex max-w-[480px] animate-muncul items-start gap-3.5 rounded-[18px] px-4 py-3.5 shadow-xl lg:left-auto lg:right-8 lg:top-6 lg:mx-0 ${
        gagal ? 'bg-white text-ungu-gelap ring-1 ring-black/5' : 'bg-ungu-gelap text-white'}`}>
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${gagal ? 'bg-krem-field text-[#dc2626]' : 'bg-[#16a34a] text-white'}`} aria-hidden="true">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d={gagal ? 'M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z' : 'M5 12l5 5 9-10'} />
        </svg>
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className={`text-[15px] font-bold ${gagal ? 'text-[#dc2626]' : ''}`}>{judul}</p>
        {isi && <p className={`text-[13px] font-medium ${gagal ? 'text-abu' : 'text-abu-label'}`}>{isi}</p>}
        {children}
      </div>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Tutup notifikasi" className={`rounded-lg p-1 ${gagal ? 'text-abu hover:bg-krem-field' : 'text-white/70 hover:text-white'}`}>
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      )}
    </div>
  )
}
