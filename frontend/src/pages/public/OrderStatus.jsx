import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../api/client'
import { rupiah } from '../../utils/format'
import { labelTanggal } from '../../utils/date'
import Navbar from '../../components/Navbar'
import NotFound from './NotFound'

// Status & Tagihan pelanggan (Figma: Status & Tagihan desktop / Mobile). Link ber-token dari ringkasan dan WA.
// Setelah dikonfirmasi halaman ini jadi halaman tagihan: nominal yang dibayar = totals.balance_due.
const jam = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })
const tglJam = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })
const BADGE = {
  menunggu_konfirmasi: ['Menunggu Konfirmasi', 'text-[#d97706]', 'bg-[#d97706]'],
  menunggu_pembayaran: ['Menunggu Pembayaran', 'text-[#2563eb]', 'bg-[#2563eb]'],
  diproses: ['Diproses', 'text-ungu', 'bg-ungu'],
  selesai: ['Selesai', 'text-[#16a34a]', 'bg-[#16a34a]'],
  dibatalkan: ['Dibatalkan', 'text-[#dc2626]', 'bg-[#dc2626]'],
}
const URUTAN = ['menunggu_konfirmasi', 'menunggu_pembayaran', 'diproses', 'selesai']

const Svg = ({ d, className = 'size-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
)
const I = {
  centang: 'M5 12l5 5 9-10',
  jam: 'M12 7v5l3 2M12 21a9 9 0 100-18 9 9 0 000 18z',
  silang: 'M6 6l12 12M18 6L6 18',
  salin: 'M9 9h10a2 2 0 012 2v8a2 2 0 01-2 2h-8a2 2 0 01-2-2V9zM5 15H4a1 1 0 01-1-1V5a2 2 0 012-2h9a1 1 0 011 1v1',
  chat: 'M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z',
  info: 'M12 11v5M12 8h.01M12 21a9 9 0 100-18 9 9 0 000 18z',
  kembali: 'M15 6l-6 6 6 6',
}

function Badge({ status }) {
  const [label, text, dot] = BADGE[status]
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold ${text}`}><span className={`size-2 rounded-full ${dot}`} />{label}</span>
}

function Salin({ text, label, className, iconOnly }) {
  const [ok, setOk] = useState(false)
  async function copy() {
    try { await navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 2000) } catch { /* izin clipboard ditolak */ }
  }
  return (
    <button type="button" onClick={copy} className={className} aria-label={label}>
      <Svg d={ok ? I.centang : I.salin} className={iconOnly ? 'size-5' : 'size-4'} />
      <span className={iconOnly ? 'sr-only' : ''} aria-live="polite">{ok ? 'Tersalin' : label}</span>
    </button>
  )
}

// Hitung mundur batas bayar (4 jam setelah tagihan dikirim)
function useSisa(deadline) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!deadline) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [deadline])
  if (!deadline) return null
  const ms = new Date(deadline) - now
  if (ms <= 0) return 'lewat'
  const s = Math.floor(ms / 1000)
  return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map((n) => String(n).padStart(2, '0')).join(':')
}

const opsiLabel = (it) => it.options.map((o) => (o.option_group === 'pedas' ? `Pedas ${o.name.toLowerCase()}` : o.name)).join(' · ')

function Langkah({ o }) {
  const batal = o.status === 'dibatalkan'
  const idx = URUTAN.indexOf(o.status)
  const terakhir = o.deliveries.at(-1)?.delivery_date
  const sub = {
    menunggu_konfirmasi: tglJam.format(new Date(o.created_at)),
    menunggu_pembayaran: o.pay_timing === 'setelah_kirim' ? 'Bayar setelah dikirim'
      : o.status === 'menunggu_pembayaran' ? `Sekarang${o.pay_deadline_at ? ` · batas ${jam.format(new Date(o.pay_deadline_at))}` : ''}` : 'Setelah dikonfirmasi',
    diproses: 'Setelah bayar tercatat',
    selesai: terakhir ? labelTanggal(terakhir).panjang : '',
  }
  return (
    <>
      <ol className="flex flex-col lg:flex-row lg:items-center">
        {URUTAN.map((k, i) => {
          const selesai = !batal && (i < idx || o.status === 'selesai')
          const kini = !batal && i === idx && o.status !== 'selesai'
          return (
            <li key={k} className="flex gap-3 lg:flex-1 lg:items-center" aria-current={kini ? 'step' : undefined}>
              <div className="flex flex-col items-center lg:flex-row lg:gap-3">
                <span className={`flex size-9 shrink-0 items-center justify-center rounded-[10px] lg:rounded-full ${selesai ? 'bg-ungu text-white' : kini ? 'bg-kuning text-ungu-gelap' : 'bg-krem-field text-abu'}`}>
                  <Svg d={selesai ? I.centang : I.jam} className="size-[18px]" />
                </span>
                {i < URUTAN.length - 1 && <span className={`my-1 h-7 w-0.5 lg:hidden ${selesai ? 'bg-ungu' : 'bg-krem-field'}`} />}
              </div>
              <div className="pb-2 lg:whitespace-nowrap lg:pb-0">
                <p className={`text-[15px] font-bold lg:text-sm ${selesai || kini ? '' : 'text-abu'}`}>{BADGE[k][0]}</p>
                <p className="text-[13px] font-medium text-abu lg:text-xs">{sub[k]}</p>
              </div>
              {i < URUTAN.length - 1 && <span className={`mx-4 hidden h-0.5 min-w-6 flex-1 lg:block ${selesai ? 'bg-ungu' : 'bg-krem-field'}`} />}
            </li>
          )
        })}
      </ol>
      <p className={`mt-2 flex items-center gap-2 rounded-[10px] px-4 py-2.5 text-sm font-semibold text-[#dc2626] lg:ml-4 lg:mt-0 lg:shrink-0 lg:px-3 lg:py-2 ${batal ? 'bg-[#fde8e8]' : 'bg-krem-field'}`}>
        <Svg d={I.silang} className="size-4 shrink-0" />
        <span>
          <span className="lg:block">{batal ? 'Pesanan dibatalkan' : 'Dibatalkan'}</span>{' '}
          {!batal && <span className="lg:block lg:text-[11px] lg:font-medium lg:text-abu">{o.pay_timing === 'di_muka' ? 'otomatis jika lewat batas bayar' : 'hanya oleh Nabila'}</span>}
        </span>
      </p>
    </>
  )
}

export default function OrderStatus() {
  const { token } = useParams()
  const [o, setO] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(() => api(`/orders/status/${encodeURIComponent(token)}`).then((d) => { setO(d); setError(null) }).catch(setError), [token])
  useEffect(() => { load() }, [load])
  // Status berubah saat Nabila mencatat bayar: muat ulang tiap menit selama pesanan belum final
  useEffect(() => {
    if (!o || ['selesai', 'dibatalkan'].includes(o.status)) return
    const t = setInterval(load, 60000)
    return () => clearInterval(t)
  }, [o, load])
  const sisaWaktu = useSisa(o?.status === 'menunggu_pembayaran' && o.pay_status === 'belum_bayar' ? o.pay_deadline_at : null)

  if (error?.status === 404) return <NotFound token />
  if (error && !o) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-krem p-6 text-center font-sans text-ungu-gelap">
        <div role="alert">
          <p className="text-lg font-bold">Status pesanan belum bisa dimuat.</p>
          <p className="text-sm text-abu">{error.message}</p>
          <button type="button" onClick={load} className="mt-4 rounded-[10px] bg-ungu px-5 py-3 font-bold text-white">Coba lagi</button>
        </div>
      </div>
    )
  }
  if (!o) return <p role="status" className="min-h-screen bg-krem p-10 text-center font-sans font-semibold text-abu">Memuat status pesanan…</p>

  const t = o.totals
  const dikonfirmasi = !['menunggu_konfirmasi', 'dibatalkan'].includes(o.status)
  const tagih = dikonfirmasi && t.balance_due > 0 && o.payment_info
  const pi = o.payment_info || {}
  const antar = o.deliveries.filter((d) => d.method === 'antar_nabila')
  const tanggalKirim = o.deliveries.map((d) => labelTanggal(d.delivery_date).panjang).join(', ')
  const rekening = (pi.bank_account_number || '').replace(/(\d{4})(?=\d)/g, '$1 ')

  const pesan = {
    menunggu_konfirmasi: 'Nabila sedang mengecek pesananmu. Ongkir dan tagihan dikirim lewat WhatsApp, biasanya 1–2 jam.',
    diproses: t.balance_due > 0 ? null : 'Pembayaran sudah tercatat. Pesananmu sedang disiapkan.',
    selesai: 'Pesanan selesai. Terima kasih sudah pesan di Macyourmoo!',
    dibatalkan: t.refund_due > 0 ? `Pesanan dibatalkan. Dana ${rupiah(t.refund_due)} akan dikembalikan Nabila lewat transfer.` : 'Pesanan ini dibatalkan. Hubungi Nabila bila ada pertanyaan.',
  }[o.status]

  const rincian = (
    <section className="flex flex-col rounded-[20px] bg-white p-5 lg:p-7" aria-labelledby="judul-rincian">
      <h2 id="judul-rincian" className="text-lg font-bold lg:text-[19px]">Rincian {dikonfirmasi ? 'tagihan' : 'pesanan'}</h2>
      <dl className="mt-3 flex flex-col gap-2.5 text-[15px]">
        {o.items.map((it) => (
          <div key={it.id} className="flex justify-between gap-4">
            <dt className="text-abu">{it.name} ×{it.qty}{it.options.length > 0 && ` · ${opsiLabel(it)}`}{it.note && <span className="block text-xs">“{it.note}”</span>}</dt>
            <dd className="shrink-0 font-bold">{rupiah(it.line_total)}</dd>
          </div>
        ))}
        {antar.map((d) => (
          <div key={d.id} className="flex justify-between gap-4">
            <dt className="text-abu">Ongkir · Antar oleh Nabila{antar.length > 1 && ` (${labelTanggal(d.delivery_date).panjang})`}</dt>
            <dd className="shrink-0 font-bold">{t.shipping_pending ? 'menunggu konfirmasi' : rupiah(d.shipping_fee)}</dd>
          </div>
        ))}
        {t.discount > 0 && <div className="flex justify-between"><dt className="text-abu">Diskon</dt><dd className="font-bold">−{rupiah(t.discount)}</dd></div>}
        {t.paid_net > 0 && <div className="flex justify-between"><dt className="text-abu">Sudah dibayar</dt><dd className="font-bold">−{rupiah(t.paid_net)}</dd></div>}
      </dl>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-abu">{!dikonfirmasi ? (t.shipping_pending ? 'Subtotal, belum termasuk ongkir' : 'Estimasi total') : t.paid_net > 0 ? 'Sisa tagihan' : 'Total tagihan'}</p>
          <p className="text-[34px] font-extrabold leading-tight text-ungu lg:text-[40px]">{rupiah(dikonfirmasi ? t.balance_due : t.grand_total)}</p>
        </div>
        {tagih && <Salin text={String(t.balance_due)} label="Salin nominal" className="flex h-10 items-center gap-2 rounded-[10px] bg-krem-field px-4 text-sm font-bold" />}
      </div>
      {sisaWaktu && (
        <p className={`mt-4 flex items-start gap-3 rounded-[14px] px-4 py-3 lg:mt-auto ${sisaWaktu === 'lewat' ? 'bg-[#fde8e8]' : 'bg-krem-field'}`} role="timer">
          <Svg d={I.jam} className="mt-0.5 size-5 shrink-0 text-[#d97706]" />
          <span>
            <span className="block text-[15px] font-bold">
              {sisaWaktu === 'lewat' ? 'Batas bayar sudah lewat' : `Bayar sebelum ${jam.format(new Date(o.pay_deadline_at))} WIB · sisa ${sisaWaktu}`}
            </span>
            <span className="block text-xs font-medium text-abu">{sisaWaktu === 'lewat' ? 'Hubungi Nabila lewat WhatsApp sebelum membayar' : 'Lewat batas 4 jam, pesanan otomatis dibatalkan'}</span>
          </span>
        </p>
      )}
    </section>
  )

  const wa = o.wa_link && (
    <a href={o.wa_link} target="_blank" rel="noopener" className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[10px] bg-ungu text-[15px] font-bold text-white">
      <Svg d={I.chat} className="size-5" />{tagih ? 'Kirim Bukti via WA' : 'Hubungi Nabila via WA'}
    </a>
  )

  return (
    <div className={`min-h-screen bg-krem font-sans text-ungu-gelap ${wa ? 'pb-[96px] lg:pb-0' : ''}`}>
      <div className="hidden lg:block">
        <Navbar cta={<Link to="/pesan" className="flex h-12 items-center rounded-[10px] bg-ungu-gelap px-5 text-[15px] font-bold text-white">Pesan sekarang</Link>} />
      </div>
      <header className="flex items-center gap-4 px-5 pb-2 pt-5 lg:hidden">
        <Link to="/" aria-label="Ke beranda"><Svg d={I.kembali} className="size-6" /></Link>
        <span className="text-xl font-bold">Status & Tagihan</span>
      </header>

      <main className="mx-auto flex max-w-[1312px] flex-col gap-4 px-4 py-4 lg:gap-5 lg:px-16 lg:py-10">
        <div className="hidden items-end justify-between gap-4 lg:flex">
          <div>
            <h1 className="text-[40px] font-extrabold leading-tight">Status & Tagihan</h1>
            <p className="mt-1 text-base font-medium text-abu">{o.order_code} · Kirim {tanggalKirim}</p>
          </div>
          <Badge status={o.status} />
        </div>

        <section className="rounded-[20px] bg-white p-5 lg:flex lg:items-center lg:px-6 lg:py-5" aria-label="Perjalanan pesanan">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 lg:hidden">
            <h1 className="text-lg font-extrabold text-ungu">{o.order_code}</h1>
            <Badge status={o.status} />
          </div>
          <Langkah o={o} />
        </section>

        {pesan && <p role="status" className="flex items-start gap-2.5 rounded-[14px] bg-ungu-gelap px-4 py-3.5 text-sm font-semibold text-white"><Svg d={I.info} className="mt-px size-5 shrink-0 text-kuning" />{pesan}</p>}

        {tagih ? (
          <div className="grid gap-4 lg:grid-cols-[592fr_340fr_340fr] lg:gap-5">
            {rincian}
            {pi.qris_image_url ? (
              <section className="flex flex-col items-center rounded-[20px] bg-white p-5 lg:p-7" aria-labelledby="judul-qris">
                <h2 id="judul-qris" className="self-start text-lg font-bold lg:self-center lg:text-[19px]">Scan QRIS</h2>
                <img src={pi.qris_image_url} alt="QRIS Macyourmoo" className="mt-5 w-full max-w-[240px] rounded-lg" />
                <p className="mt-5 hidden text-sm font-bold lg:block">QRIS statis Macyourmoo</p>
                <p className="mt-4 flex items-start gap-2 self-stretch rounded-[12px] bg-krem-field px-3 py-2.5 text-[13px] font-semibold lg:mt-3">
                  <Svg d={I.info} className="mt-px size-4 shrink-0 text-ungu" />Masukkan nominal {rupiah(t.balance_due)} secara manual saat membayar
                </p>
              </section>
            ) : <div className="hidden lg:block" />}
            <div className="flex flex-col gap-4 lg:gap-5">
              {pi.bank_account_number && (
                <section className="rounded-[20px] bg-ungu-gelap p-5 text-white lg:p-7" aria-labelledby="judul-bank">
                  <h2 id="judul-bank" className="text-sm font-semibold text-abu-label lg:text-[19px] lg:font-bold lg:text-white">Transfer Bank</h2>
                  <p className="mt-2 hidden text-sm font-extrabold text-kuning lg:block">{pi.bank_name}</p>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-2xl font-extrabold lg:text-[30px]"><span className="lg:hidden">{pi.bank_name} </span>{rekening}</p>
                      {pi.bank_account_holder && <p className="text-[13px] font-medium text-abu-label">a.n. {pi.bank_account_holder}</p>}
                    </div>
                    <Salin text={pi.bank_account_number} label="Salin nomor" iconOnly
                      className="flex size-12 shrink-0 items-center justify-center rounded-[12px] bg-kuning text-ungu-gelap lg:hidden" />
                  </div>
                  <Salin text={pi.bank_account_number} label="Salin nomor" className="mt-4 hidden h-10 items-center gap-2 rounded-[10px] bg-kuning px-4 text-sm font-bold text-ungu-gelap lg:inline-flex" />
                </section>
              )}
              <section className="hidden flex-1 flex-col rounded-[20px] bg-white p-6 lg:flex" aria-labelledby="judul-sudah">
                <h2 id="judul-sudah" className="text-[19px] font-bold">Sudah bayar?</h2>
                <p className="mt-2 text-sm font-medium text-abu">{o.status === 'diproses' ? 'Kirim bukti pelunasan ke Nabila. Sisa tagihan berkurang setelah dicek' : 'Kirim bukti transfer ke Nabila. Status berubah jadi Diproses setelah dicek'}</p>
                <div className="mt-auto pt-6">{wa}</div>
              </section>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[592fr_700fr] lg:gap-5">
            {rincian}
            {wa && <div className="hidden self-start rounded-[20px] bg-white p-6 lg:block"><p className="mb-4 text-sm font-medium text-abu">Ada pertanyaan tentang pesanan ini? Sebutkan kode {o.order_code}.</p>{wa}</div>}
          </div>
        )}
      </main>

      {/* Tombol WA tetap di bawah layar HP */}
      {wa && <div className="fixed inset-x-0 bottom-0 z-40 bg-white px-4 py-4 shadow-[0_-8px_24px_rgba(30,5,77,0.08)] lg:hidden">{wa}</div>}
    </div>
  )
}
