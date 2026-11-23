import { useEffect, useLayoutEffect, useRef } from 'react'

// Widget Cloudflare Turnstile. Saat dev tanpa VITE_TURNSTILE_SITE_KEY dipakai kunci uji Cloudflare (selalu lolos).
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || (import.meta.env.DEV ? '1x00000000000000000000AA' : '')
const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

let loader
function loadScript() {
  loader ||= new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = SCRIPT
    s.async = true
    s.onload = () => resolve(window.turnstile)
    s.onerror = () => { loader = null; reject(new Error('Turnstile gagal dimuat')) }
    document.head.appendChild(s)
  })
  return loader
}

// onToken(token) dipanggil saat lolos; onToken(null) saat kedaluwarsa atau gagal.
// Ganti prop `resetKey` untuk meminta token baru (token sekali pakai).
// appearance 'interaction-only': widget hanya tampil bila Cloudflare perlu interaksi (dipakai MooBot).
export default function Turnstile({ onToken, resetKey, className, appearance = 'always' }) {
  const box = useRef(null)
  const cb = useRef(onToken)
  cb.current = onToken

  const widget = useRef()

  // useLayoutEffect: widget dihapus sebelum elemennya dilepas dari halaman. Menghapus widget
  // yang elemennya sudah lepas membuat skrip Turnstile berputar tanpa henti (halaman membeku).
  useLayoutEffect(() => {
    let cancelled = false
    if (!SITE_KEY) { cb.current(null); return }
    loadScript()
      .then((ts) => {
        if (cancelled || !box.current) return
        widget.current = ts.render(box.current, {
          sitekey: SITE_KEY,
          language: 'id',
          theme: 'light',
          appearance,
          callback: (t) => cb.current(t),
          'expired-callback': () => cb.current(null),
          'error-callback': () => cb.current(null),
        })
      })
      .catch(() => cb.current(null))
    return () => {
      cancelled = true
      if (widget.current !== undefined) window.turnstile?.remove(widget.current)
      widget.current = undefined
    }
  }, [])

  // Token sekali pakai: minta token baru tanpa membuat ulang widget
  useEffect(() => {
    if (resetKey && widget.current !== undefined) window.turnstile?.reset(widget.current)
  }, [resetKey])

  if (!SITE_KEY) return <p role="alert" className="text-sm text-red-600">Verifikasi keamanan belum dikonfigurasi.</p>
  return <div ref={box} className={className} />
}
