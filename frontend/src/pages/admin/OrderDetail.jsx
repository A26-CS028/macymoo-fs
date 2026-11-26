import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../api/client'
import { rupiah } from '../../utils/format'
import { labelTanggal, todayJakarta } from '../../utils/date'
import { STATUS } from '../../components/admin/OrderTable'
import ConfirmDialog from '../../components/admin/ConfirmDialog'
import RescheduleDialog from '../../components/admin/RescheduleDialog'
import CancelDialog from '../../components/admin/CancelDialog'
import PaymentForm from '../../components/admin/PaymentForm'
import { Memuat } from '../../components/ui/Spinner'
import Button, { kelasTombol } from '../../components/ui/Button'

// Detail pesanan: alur setelah konfirmasi (KF 5) — Kirim Tagihan, Catat Pembayaran, Terkirim per pengiriman,
// Selesai, dan Invoice PDF. Figma tidak punya layar ini; disusun dari kartu dan modal dasbor yang sama.
const API = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/$/, '')
const jam = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })
const EVENT = {
  order_created: 'Pesanan masuk',
  confirmed: 'Dikonfirmasi',
  rescheduled: 'Dijadwalkan ulang',
  bill_sent: 'Tagihan dikirim',
  payment_recorded: 'Pembayaran dicatat',
  delivery_delivered: 'Pengiriman terkirim',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
}
const BAYAR = { belum_bayar: 'Belum bayar', dp: 'DP', lunas: 'Lunas', dikembalikan: 'Dikembalikan' }
const JENIS_BAYAR = { dp: 'DP', pelunasan: 'Pelunasan', refund: 'Refund' }
const METODE = { qris: 'QRIS', transfer: 'Transfer', tunai: 'Tunai' }

const kartu = 'rounded-[20px] bg-white p-5 lg:p-6'

function Badge({ status }) {
  const [label, text, dot] = STATUS[status]
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-bold ${text}`}><span className={`size-2 rounded-full ${dot}`} />{label}</span>
}

const opsiLabel = (it) => it.options.map((o) => (o.option_group === 'pedas' ? `Pedas ${o.name.toLowerCase()}` : o.name)).join(' · ')

export default function OrderDetail() {
  const { id } = useParams()
  const [o, setO] = useState(null)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null)
  const [notice, setNotice] = useState(null) // { text, wa }
  const [busy, setBusy] = useState('')

  const load = useCallback(() => {
    api(`/admin/orders/${encodeURIComponent(id)}`).then(setO).catch((e) => setError(e.status === 404 ? 'Pesanan tidak ditemukan.' : e.message))
  }, [id])
  useEffect(load, [load])

  const done = useCallback((_, text) => { setModal(null); setNotice({ text }); load() }, [load])
  const close = useCallback(() => setModal(null), [])

  async function aksi(key, path, opts, text) {
    setBusy(key); setNotice(null)
    try {
      const res = await api(path, opts)
      setNotice({ text: typeof text === 'function' ? text(res) : text, wa: res?.wa_link })
      load()
    } catch (e) {
      setNotice({ error: e.message })
    } finally {
      setBusy('')
    }
  }

  if (error) return <p role="alert" className="mx-auto max-w-[1180px] rounded-[10px] bg-[#fde8e8] px-4 py-3 text-sm font-semibold text-[#b91c1c]">{error} <Link to="/dapur/pesanan" className="underline">Kembali ke Pesanan Masuk</Link></p>
  if (!o) return <Memuat>Memuat pesanan…</Memuat>

  const t = o.totals
  const aktif = ['menunggu_konfirmasi', 'menunggu_pembayaran', 'diproses'].includes(o.status)
  const sudahKonfirmasi = o.status !== 'menunggu_konfirmasi'
  const tertagih = ['menunggu_pembayaran', 'diproses', 'selesai'].includes(o.status) && t.balance_due > 0 // selesai: bayar setelah kirim
  const bisaBayar = tertagih || (o.status === 'dibatalkan' && t.paid_net > 0)
  const belumTerkirim = o.deliveries.filter((d) => d.delivery_status !== 'terkirim').length
  const multi = o.deliveries.length > 1

  return (
    <div className="mx-auto max-w-[1180px] pb-10">
      <Link to="/dapur/pesanan" className="inline-flex items-center gap-1.5 text-sm font-bold text-abu hover:text-ungu-gelap">
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
        Pesanan Masuk
      </Link>

      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-extrabold text-ungu lg:text-[30px]">{o.order_code}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium text-abu">
            <Badge status={o.status} />
            <span>Bayar: <b className="text-ungu-gelap">{BAYAR[o.pay_status] || o.pay_status}</b></span>
            {o.payment_overdue && <span className="font-bold text-[#dc2626]">Lewat batas bayar</span>}
            <span>Masuk {jam.format(new Date(o.created_at))}</span>
          </p>
        </div>
        {/* Aksi utama sesuai status (KF 5) */}
        <div className="flex flex-wrap gap-2">
          {o.status === 'menunggu_konfirmasi' && <Button onClick={() => setModal('konfirmasi')}>Konfirmasi</Button>}
          {tertagih && (
            <Button varian="gelap" memuat={busy === 'tagih'} onClick={() => aksi('tagih', `/admin/orders/${o.id}/send-bill`, { method: 'POST' }, (r) => `Tagihan ${rupiah(t.balance_due)} siap dikirim${r.pay_deadline_at ? `; batas bayar ${jam.format(new Date(r.pay_deadline_at))}` : ''}`)}
            >{o.invoice_sent_at ? 'Kirim ulang tagihan' : 'Kirim Tagihan'}</Button>
          )}
          {bisaBayar && <Button varian="biru" onClick={() => setModal('bayar')}>{o.status === 'dibatalkan' ? 'Catat Refund' : 'Catat Pembayaran'}</Button>}
          {o.status === 'diproses' && (
            <Button varian="hijau" memuat={busy === 'selesai'} teksMemuat="Menyimpan…" disabled={!!belumTerkirim} title={belumTerkirim ? `${belumTerkirim} pengiriman belum terkirim` : undefined}
              onClick={() => (t.balance_due === 0 || window.confirm(`Masih ada sisa tagihan ${rupiah(t.balance_due)}. Tetap tandai selesai? Pembayaran masih bisa dicatat setelahnya.`))
                && aksi('selesai', `/admin/orders/${o.id}/complete`, { method: 'POST' }, `${o.order_code} selesai`)}
            >Tandai Selesai</Button>
          )}
          {/* Pesanan dibatalkan tidak mendapat invoice baru; invoice yang terbit sebelum batal tetap bisa diunduh */}
          {sudahKonfirmasi && (o.status !== 'dibatalkan' || o.invoices.length > 0) && (
            <a href={`${API}/admin/orders/${o.id}/invoice.pdf`} target="_blank" rel="noopener" className={`${kelasTombol('putih')} text-ungu-gelap`}>Invoice PDF</a>
          )}
          {aktif && <Button varian="putih" onClick={() => setModal('jadwal')}>Jadwal ulang</Button>}
          {aktif && <Button varian="putih" onClick={() => setModal('batal')} className="text-[#dc2626]">Batalkan</Button>}
        </div>
      </div>

      {notice && (
        <div role={notice.error ? 'alert' : 'status'} className={`mt-4 flex flex-wrap items-center gap-3 rounded-[10px] px-4 py-3 text-sm font-bold ${notice.error ? 'bg-[#fde8e8] text-[#b91c1c]' : 'bg-ungu-gelap text-white'}`}>
          {notice.error || `✓ ${notice.text}`}
          {notice.wa && <a href={notice.wa} target="_blank" rel="noopener" className="rounded-lg bg-kuning px-3 py-1.5 text-ungu-gelap">Kirim lewat WhatsApp</a>}
        </div>
      )}

      <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="contents xl:flex xl:min-w-0 xl:flex-col xl:gap-4">
          {/* Item dikelompokkan per pengiriman (pesanan besar bisa beberapa tanggal) */}
          {o.deliveries.map((d, i) => {
            const items = o.items.filter((it) => it.delivery_id === d.id)
            const terkirim = d.delivery_status === 'terkirim'
            return (
              <section key={d.id} className={kartu} aria-label={`Pengiriman ${i + 1}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-extrabold">{multi ? `Pengiriman ${i + 1} · ` : ''}{labelTanggal(d.delivery_date).panjang}</h2>
                    <p className="text-sm font-medium text-abu">
                      {d.method === 'antar_nabila' ? `Antar Nabila · ${d.address || '-'}` : 'Ambil sendiri'}
                      {d.method === 'antar_nabila' && ` · ongkir ${o.status === 'menunggu_konfirmasi' ? 'belum ditentukan' : rupiah(d.shipping_fee)}`}
                    </p>
                  </div>
                  {terkirim
                    ? <span className="rounded-full bg-[#dcfce7] px-3 py-1 text-xs font-bold text-[#16a34a]">Terkirim {d.delivered_at && jam.format(new Date(d.delivered_at))}</span>
                    : o.status === 'diproses' && (
                      <Button varian="sekunder" ukuran="sm" memuat={busy === `kirim-${d.id}`} teksMemuat="Menyimpan…"
                        onClick={() => (d.delivery_date <= todayJakarta() || window.confirm(`Tanggal kirimnya ${labelTanggal(d.delivery_date).panjang}, belum tiba. Tetap tandai terkirim?`))
                          && aksi(`kirim-${d.id}`, `/admin/deliveries/${d.id}`, { method: 'PATCH', body: JSON.stringify({ delivery_status: 'terkirim' }) }, `Pengiriman ${labelTanggal(d.delivery_date).panjang} ditandai terkirim`)}
                      >Tandai Terkirim</Button>
                    )}
                </div>
                <ul className="mt-4 divide-y divide-krem-field">
                  {items.map((it) => (
                    <li key={it.id} className="flex gap-3 py-3">
                      <span className="w-9 shrink-0 text-[15px] font-extrabold text-ungu">{it.qty}×</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold">{it.name}</p>
                        {it.options.length > 0 && <p className="text-xs font-semibold text-abu">{opsiLabel(it)}</p>}
                        {it.note && <p className="mt-1 rounded-lg bg-krem px-2.5 py-1.5 text-xs font-semibold">“{it.note}”</p>}
                        {it.labels?.length > 0 && (
                          <p className="mt-1 flex flex-wrap gap-1">{it.labels.map((l) => <span key={l.label} className="rounded-full bg-[#ede4ff] px-2 py-0.5 text-[11px] font-bold text-ungu">{l.label}</span>)}</p>
                        )}
                      </div>
                      <span className="shrink-0 text-sm font-bold">{rupiah(it.line_total)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}

          <section className={`${kartu} order-last xl:order-none`} aria-labelledby="judul-riwayat">
            <h2 id="judul-riwayat" className="text-lg font-extrabold">Riwayat</h2>
            <ol className="mt-3 flex flex-col gap-3 border-l-2 border-krem-field pl-4">
              {o.events.map((e) => (
                <li key={e.id} className="relative text-sm">
                  <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-ungu" />
                  <p className="font-bold">{EVENT[e.event_type] || e.event_type}
                    {e.event_type === 'rescheduled' && e.new_date && <span className="font-medium"> ke {labelTanggal(e.new_date).panjang}</span>}
                  </p>
                  {e.reason && <p className="text-xs font-medium text-abu">Alasan: {e.reason}</p>}
                  <p className="text-xs font-medium text-abu">{jam.format(new Date(e.created_at))}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="flex flex-col gap-4">
          <section className={kartu} aria-labelledby="judul-pelanggan">
            <h2 id="judul-pelanggan" className="text-lg font-extrabold">Pelanggan</h2>
            <p className="mt-2 font-bold">{o.customer_name || <span className="text-abu">Dianonimkan</span>}</p>
            {o.phone && <a href={`https://wa.me/${o.phone}`} target="_blank" rel="noopener" className="text-sm font-bold text-ungu underline">+{o.phone}</a>}
            <p className="mt-2 text-xs font-semibold text-abu">
              Waktu bayar: {o.pay_timing === 'di_muka' ? 'di muka (batas 4 jam setelah tagihan dikirim)' : o.pay_timing === 'setelah_kirim' ? 'setelah pesanan dikirim' : o.pay_timing || '-'}
            </p>
            {o.public_token && <a href={`/s/${o.public_token}`} target="_blank" rel="noopener" className="mt-1 block text-xs font-bold text-ungu underline">Lihat halaman status pelanggan</a>}
          </section>

          <section className="rounded-[20px] bg-ungu-gelap p-5 text-white lg:p-6" aria-labelledby="judul-tagihan">
            <h2 id="judul-tagihan" className="text-lg font-extrabold">Tagihan</h2>
            <dl className="mt-3 flex flex-col gap-2 text-sm">
              <div className="flex justify-between"><dt className="text-abu-label">Subtotal</dt><dd className="font-bold">{rupiah(t.subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-abu-label">Ongkir</dt><dd className="font-bold">{t.shipping_pending ? 'menunggu konfirmasi' : rupiah(t.shipping_total)}</dd></div>
              {t.discount > 0 && <div className="flex justify-between"><dt className="text-abu-label">Diskon</dt><dd className="font-bold">−{rupiah(t.discount)}</dd></div>}
              <div className="flex justify-between border-t border-white/15 pt-2"><dt className="text-abu-label">Total</dt><dd className="font-extrabold">{rupiah(t.grand_total)}</dd></div>
              <div className="flex justify-between"><dt className="text-abu-label">Sudah dibayar</dt><dd className="font-bold">{rupiah(t.paid_net)}</dd></div>
            </dl>
            <p className="mt-3 text-[13px] font-medium text-abu-label">{t.refund_due > 0 ? 'Perlu dikembalikan' : 'Sisa tagihan'}</p>
            <p className="font-lilita text-[34px] leading-tight text-kuning">{rupiah(t.refund_due > 0 ? t.refund_due : t.balance_due)}</p>
            {o.invoice_sent_at && (
              <p className="mt-1 text-xs font-semibold text-abu-label">
                Tagihan dikirim {jam.format(new Date(o.invoice_sent_at))}{o.pay_deadline_at && o.pay_status === 'belum_bayar' && ` · batas bayar ${jam.format(new Date(o.pay_deadline_at))}`}
              </p>
            )}
            {o.payments.length > 0 && (
              <ul className="mt-4 flex flex-col gap-1.5 border-t border-white/15 pt-3 text-xs">
                {o.payments.map((p) => (
                  <li key={p.id} className="flex justify-between gap-2">
                    <span className="text-abu-label">{JENIS_BAYAR[p.type]} · {METODE[p.method]} · {jam.format(new Date(p.paid_at))}</span>
                    <span className="font-bold">{p.type === 'refund' ? '−' : ''}{rupiah(p.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
            {o.invoices.length > 0 && <p className="mt-3 text-xs font-semibold text-abu-label">Invoice {o.invoices.at(-1).display_no}</p>}
          </section>
        </div>
      </div>

      {modal === 'konfirmasi' && <ConfirmDialog orderId={o.id} onClose={close} onDone={done} />}
      {modal === 'jadwal' && <RescheduleDialog orderId={o.id} onClose={close} onDone={done} />}
      {modal === 'batal' && <CancelDialog order={o} onClose={close} onDone={done} />}
      {modal === 'bayar' && <PaymentForm orderId={o.id} onClose={close} onDone={done} />}
    </div>
  )
}
