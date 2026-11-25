import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../api/client'
import Navbar from '../../components/Navbar'
import Turnstile from '../../components/Turnstile'
import NotFound from './NotFound'
import { localPhoto } from '../../utils/menuPhoto'
import bintang from '../../assets/landing/icon-bintang.svg'
import bintangKosong from '../../assets/landing/icon-bintang-kosong.svg'

// Tulis ulasan (Figma: Ulasan desktop / Mobile — Tulis ulasan). URL memakai token status pesanan;
// token ulasan diambil dari GET /orders/status (hanya ada untuk pesanan Selesai, belum diulas, < 7 hari).
// shortcut: centang "Tampilkan nama sebagai …" dari desain tidak dibuat; kontrak ulasan publik tanpa nama.
const MAX = 200
const KATA = ['', 'Kurang', 'Biasa saja', 'Lumayan', 'Enak banget', 'Juara!']
const tgl = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' })
const Svg = ({ d, className = 'size-5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
)
const I = {
  jam: 'M12 7v5l3 2M12 21a9 9 0 100-18 9 9 0 000 18z',
  bintang: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z',
  link: 'M10 13a5 5 0 007.5.5l3-3a5 5 0 00-7-7l-1.5 1.5M14 11a5 5 0 00-7.5-.5l-3 3a5 5 0 007 7l1.5-1.5',
  perisai: 'M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z',
  kembali: 'M15 6l-6 6 6 6',
  centang: 'M5 12l5 5 9-10',
}

export default function Review() {
  const { token } = useParams()
  const [o, setO] = useState(null)
  const [error, setError] = useState(null)
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [ts, setTs] = useState(null)
  const [tsKey, setTsKey] = useState(0)
  const [sending, setSending] = useState(false)
  const [msg, setMsg] = useState(null)
  const [done, setDone] = useState(false)

  useEffect(() => { api(`/orders/status/${encodeURIComponent(token)}`).then(setO).catch(setError) }, [token])

  if (error?.status === 404) return <NotFound token />
  const shell = (children) => (
    <div className="min-h-screen bg-krem font-sans text-ungu-gelap">
      <div className="hidden lg:block"><Navbar cta={<Link to="/pesan" className="flex h-12 items-center rounded-[10px] bg-ungu-gelap px-5 text-[15px] font-bold text-white">Pesan sekarang</Link>} /></div>
      <header className="flex items-center gap-4 px-5 pt-5 lg:hidden">
        <Link to={`/s/${token}`} aria-label="Kembali ke status pesanan"><Svg d={I.kembali} className="size-6" /></Link>
        <span className="text-xl font-bold">Tulis ulasan</span>
      </header>
      {children}
    </div>
  )
  if (!o) return shell(<p role={error ? 'alert' : 'status'} className="p-10 text-center font-semibold text-abu">{error ? error.message : 'Memuat…'}</p>)

  const menu = o.items.map((i) => `${i.name} ×${i.qty}`).join(', ')
  const selesaiTgl = o.deliveries.at(-1)?.delivered_at || o.deliveries.at(-1)?.delivery_date
  const sisaHari = o.review && Math.max(0, Math.ceil((new Date(o.review.expires_at) - Date.now()) / 864e5))
  const tutup = done || !o.review

  async function kirim(e) {
    e.preventDefault()
    if (!rating) return setMsg({ error: 'Pilih 1 sampai 5 bintang dulu.' })
    if (!ts) return setMsg({ error: 'Tunggu verifikasi keamanan selesai.' })
    setSending(true); setMsg(null)
    try {
      await api(`/reviews/${o.review.token}`, { method: 'POST', body: JSON.stringify({ rating, comment: comment.trim(), turnstile_token: ts }) })
      setDone(true)
    } catch (err) {
      setMsg({ error: err.message })
      if (err.status === 409) setO((x) => ({ ...x, review: null }))
    } finally {
      setSending(false); setTs(null); setTsKey((k) => k + 1)
    }
  }

  const info = (
    <section className="rounded-[20px] bg-ungu-gelap p-5 text-white lg:rounded-[24px] lg:p-7" aria-label="Ketentuan link ulasan">
      <div className="flex items-start gap-3 lg:block">
        <Svg d={I.jam} className="size-6 shrink-0 text-kuning lg:size-8" />
        <div>
          <p className="text-[17px] font-bold lg:mt-3 lg:text-2xl lg:font-extrabold">Link berlaku 7 hari</p>
          {o.review && <p className="text-[13px] font-medium text-abu-label lg:mt-2 lg:text-sm lg:font-bold lg:text-kuning">Sisa {sisaHari} hari · berakhir {tgl.format(new Date(o.review.expires_at))}<span className="lg:hidden"> · ditinjau Nabila sebelum tampil</span></p>}
        </div>
      </div>
      <ul className="mt-4 hidden flex-col gap-3 text-sm font-medium lg:flex">
        <li className="flex items-center gap-3"><Svg d={I.bintang} className="size-[18px] text-kuning" />1–5 bintang, maksimal 200 karakter</li>
        <li className="flex items-center gap-3"><Svg d={I.link} className="size-[18px] text-kuning" />Satu link untuk satu ulasan</li>
        <li className="flex items-center gap-3"><Svg d={I.perisai} className="size-[18px] text-kuning" />Ditinjau Nabila sebelum tampil</li>
      </ul>
    </section>
  )

  return shell(
    <main className="mx-auto grid max-w-[1312px] gap-4 px-4 py-5 pb-28 lg:grid-cols-[872fr_420fr] lg:gap-5 lg:px-16 lg:py-10">
      <form onSubmit={kirim} noValidate className="flex flex-col lg:rounded-[24px] lg:bg-white lg:p-10">
        <h1 className="hidden text-[40px] font-extrabold leading-tight lg:block">Bagaimana pesananmu?</h1>
        <div className="flex items-center gap-3 rounded-[20px] bg-white p-4 lg:mt-5 lg:p-0">
          <img src={localPhoto({ name: o.items[0]?.name || '' })} alt="" className="size-14 shrink-0 rounded-xl bg-krem-field object-contain lg:bg-transparent" />
          <div className="min-w-0">
            <p className="text-lg font-bold lg:text-base">{menu}</p>
            <p className="text-[13px] font-medium text-abu">{o.order_code}{selesaiTgl && ` · Selesai ${tgl.format(new Date(selesaiTgl))}`}</p>
          </div>
        </div>

        {done ? (
          <div role="status" className="mt-6 flex flex-col items-center gap-3 rounded-[20px] bg-white p-8 text-center lg:bg-krem-field">
            <span className="flex size-14 items-center justify-center rounded-full bg-ungu text-white"><Svg d={I.centang} className="size-7" /></span>
            <p className="text-xl font-extrabold">Terima kasih atas ulasanmu!</p>
            <p className="text-sm font-medium text-abu">Ulasan tampil di halaman Macyourmoo setelah ditinjau Nabila.</p>
            <Link to="/" className="mt-2 rounded-[10px] bg-ungu px-5 py-3 text-[15px] font-bold text-white">Kembali ke Beranda</Link>
          </div>
        ) : tutup ? (
          <div role="alert" className="mt-6 rounded-[20px] bg-white p-6 text-center lg:bg-krem-field">
            <p className="text-lg font-extrabold">{o.status === 'selesai' ? 'Link ulasan sudah tidak berlaku' : 'Ulasan dibuka setelah pesanan selesai'}</p>
            <p className="mt-1 text-sm font-medium text-abu">
              {msg?.error || (o.status === 'selesai' ? 'Ulasan sudah dikirim atau link sudah lewat 7 hari. Terima kasih sudah memesan Macyourmoo!' : 'Cek lagi link ini setelah pesananmu ditandai Selesai.')}
            </p>
            <Link to={`/s/${token}`} className="mt-4 inline-block text-sm font-bold text-ungu underline">Lihat status pesanan</Link>
          </div>
        ) : (
          <>
            <fieldset className="mt-6">
              <legend className="text-lg font-bold lg:sr-only">Seberapa enak?</legend>
              <div role="radiogroup" aria-label="Rating" className="mt-2 flex gap-2" onMouseLeave={() => setHover(0)}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} bintang`}
                    onClick={() => { setRating(n); setMsg(null) }} onMouseEnter={() => setHover(n)}
                    className="size-10 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ungu lg:size-11">
                    <img src={n <= (hover || rating) ? bintang : bintangKosong} alt="" className="size-full" />
                  </button>
                ))}
              </div>
              {(hover || rating) > 0 && <p className="mt-2 text-sm font-bold">{hover || rating} dari 5 · {KATA[hover || rating]}</p>}
            </fieldset>

            <label htmlFor="komentar" className="mt-6 text-sm font-bold lg:text-[13px]">Ceritakan pengalamanmu</label>
            <div className="relative mt-2">
              <textarea id="komentar" rows={4} maxLength={MAX} value={comment} onChange={(e) => setComment(e.target.value)}
                placeholder="Rasa, porsi, atau pengantarannya…"
                className="h-[136px] w-full resize-none rounded-[14px] bg-krem-field px-4 pb-8 pt-3 text-[15px] font-medium outline-none placeholder:text-abu focus:ring-2 focus:ring-ungu lg:h-[120px]" />
              <span className="pointer-events-none absolute bottom-3 right-4 text-xs font-semibold text-abu">{comment.length}/{MAX}</span>
            </div>
            <p className="mt-2 text-xs font-medium text-abu">Ulasan tampil tanpa nama sebagai "Pembeli terverifikasi". Jangan tulis nomor HP atau alamat.</p>

            <div className="mt-5 lg:hidden">{info}</div>
            <div className="mt-5"><Turnstile resetKey={tsKey} onToken={setTs} /></div>
            {msg?.error && <p role="alert" className="mt-3 rounded-[10px] bg-[#fde8e8] px-3 py-2 text-sm font-semibold text-[#b91c1c]">{msg.error}</p>}

            <div className="fixed inset-x-0 bottom-0 z-40 bg-white p-4 shadow-[0_-8px_24px_rgba(30,5,77,0.08)] lg:static lg:mt-auto lg:bg-transparent lg:p-0 lg:pt-8 lg:shadow-none">
              <button type="submit" disabled={sending} className="h-14 w-full rounded-[12px] bg-ungu text-[17px] font-bold text-white disabled:opacity-60 lg:h-12 lg:w-auto lg:rounded-[10px] lg:px-6 lg:text-[15px]">
                {sending ? 'Mengirim…' : 'Kirim Ulasan'}
              </button>
            </div>
          </>
        )}
      </form>
      <aside className="hidden lg:block">{info}</aside>
    </main>
  )
}
