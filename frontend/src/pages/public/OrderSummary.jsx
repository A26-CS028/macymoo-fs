import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import { rupiah } from '../../utils/format'
import { labelTanggal } from '../../utils/date'
import { useSessionState } from '../../hooks/useSessionState'
import polaKeju from '../../assets/landing/pola-keju.webp'
import paketMenu from '../../assets/landing/paket-menu.webp'
import iconArrow from '../../assets/landing/icon-arrow-right.svg'

// Ringkasan setelah submit (Figma: "Ringkasan Setelah Submit" dan "Mobile — Pre-Order Terkirim").
const Svg = ({ children, className = 'size-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">{children}</svg>
)
const IconLink = () => <Svg><path d="M10 13a5 5 0 007.5.5l3-3a5 5 0 00-7-7l-1.5 1.5M14 11a5 5 0 00-7.5-.5l-3 3a5 5 0 007 7l1.5-1.5" /></Svg>
const IconCopy = () => <Svg><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 012-2h10" /></Svg>
const IconChat = () => <Svg><path d="M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z" /></Svg>
const IconCheck = () => <Svg className="size-4 text-kuning"><path d="M5 12l5 5 9-10" /></Svg>
const IconClose = () => <Svg className="size-3.5"><path d="M6 6l12 12M18 6L6 18" /></Svg>

export default function OrderSummary() {
  const { state } = useLocation()
  const [saved] = useSessionState('mm-pesanan-terakhir', null)
  const data = state || saved
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState(true)

  if (!data) {
    return (
      <div className="min-h-screen bg-krem font-sans text-ungu-gelap">
        <Navbar />
        <main className="mx-auto max-w-md p-6">
          <h1 className="font-lilita text-4xl">Data pesanan tidak ditemukan</h1>
          <p className="mt-2 text-sm">Buka link status yang kamu simpan, atau pesan lagi dari halaman utama.</p>
          <Link to="/" className="mt-6 inline-block rounded-[10px] bg-ungu px-5 py-3 font-bold text-white">Ke halaman utama</Link>
        </main>
      </div>
    )
  }

  const { order, context } = data
  const statusUrl = `${window.location.origin}/s/${order.public_token}`
  const tanggal = labelTanggal(context.delivery_date).panjang
  const antar = context.method === 'antar_nabila'

  async function copy() {
    try { await navigator.clipboard.writeText(statusUrl); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* biarkan */ }
  }

  const statusLink = (
    <div className="flex items-center gap-2 text-ungu">
      <IconLink />
      <a href={statusUrl} className="min-w-0 flex-1 truncate text-sm font-bold underline lg:text-[15px]">{statusUrl.replace(/^https?:\/\//, '')}</a>
      <button type="button" onClick={copy} aria-label="Salin link status" className="p-1"><IconCopy /></button>
      <span className="sr-only" aria-live="polite">{copied ? 'Link tersalin' : ''}</span>
      {copied && <span className="text-xs font-bold">Tersalin</span>}
    </div>
  )

  return (
    <div className="flex min-h-screen flex-col bg-kuning font-sans text-ungu-gelap lg:block lg:bg-krem">
      <div className="hidden lg:block"><Navbar /></div>

      {toast && (
        <div role="status" className="fixed right-8 top-[100px] z-40 hidden items-center whitespace-nowrap gap-3 rounded-[10px] bg-ungu-gelap px-4 py-3 text-sm font-bold text-white shadow-lg lg:flex">
          <IconCheck /><span className="flex-1">Pre-order berhasil dikirim</span>
          <button type="button" onClick={() => setToast(false)} aria-label="Tutup"><IconClose /></button>
        </div>
      )}

      <main className="flex flex-1 flex-col lg:mx-auto lg:flex-row lg:max-w-[1440px] lg:gap-5 lg:px-16 lg:py-10">
        {/* Kartu kuning */}
        <section className="relative overflow-hidden px-6 pb-0 pt-12 lg:h-[728px] lg:w-[680px] lg:shrink-0 lg:rounded-[20px] lg:px-12 lg:pt-8">
          <img src={polaKeju} alt="" className="absolute inset-0 size-full object-cover" />
          <div className="relative">
            <h1 className="font-lilita text-[60px] leading-[56px] lg:text-[96px] lg:leading-[92px]">Pesanan<br />masuk!</h1>
            <p className="mt-3 text-xl font-extrabold text-ungu lg:text-[28px]">{order.order_code}</p>
            <p className="mt-2 hidden text-[15px] font-semibold lg:block">Simpan kode ini untuk cek status</p>
          </div>
          <img src={paketMenu} alt="Paket menu Macyourmoo" className="relative mx-auto mt-2 h-[250px] w-auto lg:absolute lg:bottom-[-12px] lg:right-[-12px] lg:mt-0 lg:h-[440px]" />
        </section>

        {/* Kartu putih */}
        <section className="relative -mt-6 flex-1 rounded-t-[24px] bg-white px-6 pb-8 pt-6 lg:mt-0 lg:flex lg:flex-1 lg:flex-col lg:rounded-[20px] lg:p-10">
          <h2 className="hidden text-2xl font-bold lg:block">Langkah berikutnya</h2>
          <p className="text-base font-bold lg:hidden">Nabila akan kirim ongkir & tagihan lewat WhatsApp, biasanya 1–2 jam</p>

          <ol className="mt-8 hidden flex-col gap-7 lg:flex">
            {[
              ['Hari ini', 'Nabila kirim ongkir & tagihan', 'Lewat WhatsApp, biasanya 1–2 jam'],
              ['Maks. 4 jam', 'Bayar tagihan', 'QRIS atau transfer bank'],
              [tanggal, antar ? 'Dimasak & diantar' : 'Dimasak & siap diambil', antar ? `Ke ${context.address}` : 'Titik ambil dikirim lewat WhatsApp'],
            ].map(([kapan, judul, sub]) => (
              <li key={judul} className="grid grid-cols-[136px_1fr]">
                <span className="text-[13px] font-bold text-ungu">{kapan}</span>
                <span><span className="block text-[17px] font-bold">{judul}</span><span className="block text-sm text-abu">{sub}</span></span>
              </li>
            ))}
          </ol>

          <div className="mt-5 flex flex-col gap-4 lg:mt-auto">
            <div className="flex justify-between text-sm lg:items-baseline">
              <span className="text-abu">{antar ? 'Estimasi subtotal' : 'Estimasi total'}</span>
              <span className="font-bold lg:text-xl lg:font-extrabold">{rupiah(order.totals.grand_total)}</span>
            </div>
            <div className="flex justify-between text-sm lg:hidden">
              <span className="text-abu">Dikirim</span>
              <span className="font-bold">{tanggal} · {antar ? 'Antar' : 'Ambil sendiri'}</span>
            </div>
            {statusLink}
            <div className="mt-16 flex flex-col items-center gap-4 lg:mt-2 lg:flex-row lg:gap-2">
              <a href={statusUrl} className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[10px] bg-ungu px-5 text-[15px] font-bold text-white lg:w-auto">
                Lihat status & tagihan <img src={iconArrow} alt="" width="12" height="12" />
              </a>
              {order.wa_link && (
                <a href={order.wa_link} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm font-bold underline lg:h-[52px] lg:rounded-[10px] lg:bg-ungu-gelap lg:px-5 lg:text-[15px] lg:text-white lg:no-underline">
                  <IconChat /> Kabari Nabila<span className="lg:hidden"> di WhatsApp</span>
                </a>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
