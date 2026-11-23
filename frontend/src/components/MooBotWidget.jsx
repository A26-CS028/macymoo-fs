import { useEffect, useRef, useState } from 'react'
import { api } from '../api/client'
import { rupiah } from '../utils/format'
import Modal from './admin/Modal'
import Turnstile from './Turnstile'

// Widget MooBot (Figma: Overlay MooBot FAQ desktop, sheet MooBot HP). Riwayat hanya di state:
// hilang saat refresh atau ditutup (KF 9.4). Tiap pertanyaan butuh token Turnstile baru.
// shortcut: label "Di luar topik" belum ada karena API hanya mengirim `reply`; tambah bila FastAPI mengirim kategori.
const MAX = 500

// Jawaban cadangan saat AI gagal (KF 9.7 F02, F12, F11); harga dari /menus, bukan ditulis tetap
const FAQ = {
  'Harga menu': (menus) => menus.length
    ? `${menus.map((m) => `${m.name} ${rupiah(m.price)}`).join(', ')}. Total akhir (termasuk ongkir bila diantar) muncul setelah pesanan dikonfirmasi Nabila.`
    : 'Harga tiap menu ada di bagian Menu di halaman ini. Total akhir muncul setelah pesanan dikonfirmasi Nabila.',
  'Cara bayar': () => 'QRIS GoPay, transfer bank, atau tunai. QRIS dan rekening tampil di halaman tagihan. Untuk bayar di muka, batasnya 4 jam setelah tagihan dikirim.',
  'Area antar': () => 'Bisa diantar Nabila (ongkir dikonfirmasi Nabila), atau Ambil Sendiri tanpa ongkir. Saat Ambil Sendiri, kamu juga boleh memesan GoSend sendiri.',
}

const Svg = ({ d, className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
)
const IKON = {
  bot: 'M12 7V4H9M7 7h10a2 2 0 012 2v8a2 2 0 01-2 2H7a2 2 0 01-2-2V9a2 2 0 012-2zM3 13h2M19 13h2M15 12v2M9 12v2',
  tutup: 'M6 6l12 12M18 6L6 18',
  awas: 'M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z',
  kirim: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
}

function Bubble({ m, onFaq }) {
  if (m.from === 'user') {
    return <p className="ml-auto max-w-[264px] whitespace-pre-line break-words rounded-[20px] bg-ungu px-3.5 py-3 text-sm text-white">{m.text}</p>
  }
  if (m.from === 'istirahat') {
    return (
      <div role="alert" className="rounded-[20px] bg-krem-field px-3.5 py-3.5">
        <p className="flex items-center gap-2.5 text-[13px] font-extrabold">
          <Svg d={IKON.awas} className="size-[18px] shrink-0 text-[#d97706]" />MooBot sedang istirahat
        </p>
        <p className="mt-2 text-xs font-medium">{m.text}</p>
        <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1">
          {Object.keys(FAQ).map((k) => (
            <button key={k} type="button" onClick={() => onFaq(k)} className="text-[11px] font-bold underline-offset-2 hover:underline">{k}</button>
          ))}
        </div>
      </div>
    )
  }
  return (
    <div className={`max-w-[264px] rounded-[20px] px-3.5 py-3 ${m.from === 'galat' ? 'bg-krem-field' : 'bg-white'}`}>
      <p className="whitespace-pre-line break-words text-sm">{m.text}</p>
      {m.label && <p className={`mt-1.5 text-[10px] font-bold ${m.from === 'galat' ? 'text-[#dc2626]' : 'text-[#15803d]'}`}>{m.label}</p>}
    </div>
  )
}

export default function MooBotWidget({ onClose, menus = [] }) {
  const [msgs, setMsgs] = useState([])
  const [text, setText] = useState('')
  const [token, setToken] = useState(null)
  const [resetKey, setResetKey] = useState(0)
  const [busy, setBusy] = useState(false)
  const end = useRef(null)
  const input = useRef(null)

  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [msgs, busy])
  useEffect(() => { input.current?.focus() }, [])

  const add = (...m) => setMsgs((list) => [...list, ...m])

  async function send(e) {
    e.preventDefault()
    const message = text.trim()
    if (!message || !token || busy) return
    add({ from: 'user', text: message })
    setText('')
    setBusy(true)
    try {
      const { reply } = await api('/moobot/chat', { method: 'POST', body: JSON.stringify({ message, turnstile_token: token }) })
      add({ from: 'bot', text: reply, label: 'Jawaban aktif' })
    } catch (err) {
      // 400 (isi pesan/verifikasi) dijawab langsung; 429, 503, atau jaringan putus: tawarkan FAQ singkat
      if (err.status === 400) add({ from: 'galat', text: err.message, label: 'Belum terkirim' })
      else if (err.status === 429) add({ from: 'istirahat', text: 'Terlalu banyak pertanyaan. Coba lagi beberapa menit lagi, pilih FAQ singkat, atau hubungi Nabila.' })
      else add({ from: 'istirahat', text: err.status === 503 ? err.message : 'MooBot tidak bisa dihubungi. Pilih FAQ singkat atau hubungi Nabila lewat WhatsApp.' })
    } finally {
      setBusy(false)
      setToken(null) // token Turnstile sekali pakai
      setResetKey((k) => k + 1)
      input.current?.focus()
    }
  }

  const faq = (k) => add({ from: 'user', text: k }, { from: 'bot', text: FAQ[k](menus), label: 'Jawaban FAQ' })
  const sisa = MAX - text.length

  return (
    <Modal onClose={onClose} hideHeader titleId="judul-moobot"
      boxClass="flex h-[88vh] w-full flex-col overflow-hidden rounded-t-[24px] bg-krem text-ungu-gelap shadow-xl outline-none lg:h-[min(720px,92vh)] lg:w-[400px] lg:rounded-[24px]">
      {/* Kepala: HP polos di atas krem, desktop pita ungu gelap dengan ikon kuning */}
      <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-[#e9e2d4] lg:hidden" />
      <div className="flex shrink-0 items-center gap-2.5 px-5 pb-3 pt-4 lg:h-[72px] lg:bg-ungu-gelap lg:py-0 lg:text-white">
        <span className="hidden size-10 items-center justify-center rounded-full bg-kuning text-ungu-gelap lg:flex"><Svg d={IKON.bot} className="size-5" /></span>
        <div className="flex-1">
          <h2 id="judul-moobot" className="text-xl font-extrabold lg:text-base">MooBot</h2>
          <p className="hidden text-xs font-medium text-[#bcb4ca] lg:block">FAQ menu, harga & aturan</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Tutup MooBot" className="rounded-lg p-1 hover:bg-krem-field lg:hover:bg-white/10">
          <Svg d={IKON.tutup} className="size-5 lg:size-4" />
        </button>
      </div>

      <p className="mx-5 flex shrink-0 items-center gap-2.5 rounded-[18px] bg-krem-field px-3 py-2.5 text-xs font-semibold lg:mx-0 lg:h-9 lg:rounded-none lg:px-4 lg:py-0">
        <Svg d={IKON.awas} className="size-[18px] shrink-0 text-[#d97706]" />
        <span>Jangan tulis data pribadi (alamat, nomor HP) <span className="lg:hidden">di sini</span><span className="hidden lg:inline">di chat ini</span></span>
      </p>

      <div role="log" aria-live="polite" aria-label="Percakapan MooBot" className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
        {!msgs.length && (
          <div className="rounded-[20px] bg-white px-3.5 py-3 text-sm">
            Halo! Tanya soal menu, harga, cara pesan, atau aturan pemesanan Macyourmoo.
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.keys(FAQ).map((k) => (
                <button key={k} type="button" onClick={() => faq(k)} className="rounded-full bg-krem-field px-3 py-1 text-xs font-bold hover:bg-ungu-gelap hover:text-white">{k}</button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m, i) => <Bubble key={i} m={m} onFaq={faq} />)}
        {busy && <p role="status" className="max-w-[264px] rounded-[20px] bg-white px-3.5 py-3 text-sm text-abu">MooBot sedang mengetik…</p>}
        <div ref={end} />
      </div>

      <form onSubmit={send} className="shrink-0 px-5 pb-5 lg:bg-white lg:px-3 lg:py-3">
        <Turnstile onToken={setToken} resetKey={resetKey} appearance="interaction-only" className="mb-2 empty:hidden" />
        <div className="flex gap-2">
          <label htmlFor="tanya-moobot" className="sr-only">Pertanyaan untuk MooBot</label>
          <input id="tanya-moobot" ref={input} value={text} onChange={(e) => setText(e.target.value)} maxLength={MAX}
            placeholder="Tulis pertanyaan…" autoComplete="off"
            className="h-12 min-w-0 flex-1 rounded-[14px] bg-krem-field px-4 text-sm font-medium outline-none placeholder:text-abu focus:ring-2 focus:ring-ungu lg:h-11 lg:rounded-full" />
          <button type="submit" disabled={!text.trim() || !token || busy} aria-label="Kirim pertanyaan"
            className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-ungu text-white disabled:opacity-50 lg:size-11 lg:rounded-[12px]">
            <Svg d={IKON.kirim} className="size-5" />
          </button>
        </div>
        {!token && !busy && text.trim() && <p role="status" className="mt-1 text-[11px] font-semibold text-abu">Menunggu verifikasi keamanan…</p>}
        {sisa < 100 && <p className="mt-1 text-right text-[11px] font-semibold text-abu">Sisa {sisa} karakter</p>}
      </form>
    </Modal>
  )
}
