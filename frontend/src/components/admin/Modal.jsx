import { useEffect, useRef } from 'react'

// Modal dasbor (Figma: Modal — Konfirmasi/Jadwalkan Ulang/Batalkan). Di HP tampil sebagai sheet dari bawah.
// Esc atau klik latar menutup; fokus dipindah ke dalam modal dan dikembalikan saat ditutup.
export default function Modal({ title, subtitle, onClose, children, width = 'lg:w-[580px]', titleId = 'judul-modal', hideHeader, boxClass }) {
  const box = useRef(null)
  const close = useRef(onClose)
  close.current = onClose

  useEffect(() => {
    const prev = document.activeElement
    // Fokus ke kotak modal dulu (isi bisa masih dimuat), supaya pembaca layar langsung membaca judulnya
    box.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') return close.current()
      if (e.key !== 'Tab' || !box.current) return
      // Tab dikurung di dalam modal: dari elemen terakhir kembali ke pertama, dan sebaliknya
      const items = [...box.current.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled])')]
        .filter((el) => el.offsetParent !== null || el.getClientRects().length)
      if (!items.length) return e.preventDefault()
      const first = items[0], last = items.at(-1)
      const inside = box.current.contains(document.activeElement)
      if (e.shiftKey && (document.activeElement === first || !inside || document.activeElement === box.current)) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && (document.activeElement === last || !inside)) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      prev?.focus?.()
    }
  }, []) // sekali saat dibuka; onClose lewat ref supaya fokus tidak melompat tiap render

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ungu-gelap/40 lg:items-center" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={box} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}
        className={boxClass || `max-h-[92vh] w-full overflow-y-auto rounded-t-[24px] bg-white px-5 pb-6 pt-2.5 text-ungu-gelap shadow-xl outline-none lg:rounded-[24px] lg:p-7 ${width}`}>
        {!boxClass && <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#e4dccb] lg:hidden" />}
        {!hideHeader && (
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 id={titleId} className="text-xl font-bold lg:text-2xl">{title}</h2>
              {subtitle && <p className="mt-0.5 text-[13px] font-medium text-abu">{subtitle}</p>}
            </div>
            <button type="button" data-tutup onClick={onClose} aria-label="Tutup" className="rounded-lg p-1 hover:bg-krem-field">
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

// Kotak info abu (Figma: catatan di bawah isian modal)
export function Info({ children }) {
  return (
    <p className="flex items-start gap-2 rounded-[10px] bg-krem-field px-3 py-2.5 text-xs font-semibold">
      <svg viewBox="0 0 24 24" className="mt-px size-4 shrink-0 text-ungu" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
      {children}
    </p>
  )
}

export function ErrorBox({ error }) {
  if (!error) return null
  return (
    <div role="alert" className="rounded-[10px] bg-[#fde8e8] px-3 py-2 text-sm font-semibold text-[#b91c1c]">
      {error.message}
      {error.details?.length > 0 && (
        <ul className="mt-1 list-disc pl-5 font-medium">{error.details.map((d, i) => <li key={i}>{d.message}</li>)}</ul>
      )}
    </div>
  )
}

export const fieldCls = 'h-12 w-full rounded-[10px] bg-krem-field px-4 text-[15px] font-medium outline-none focus:ring-2 focus:ring-ungu'
export const labelCls = 'mb-2 block text-[13px] font-bold'
