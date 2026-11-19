import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { rupiah } from '../../utils/format'
import { labelTanggal } from '../../utils/date'
import Modal, { ErrorBox, btnSekunder, btnUtama, fieldCls, labelCls } from './Modal'

// Konfirmasi pesanan (Figma: Modal — Konfirmasi Pesanan): ongkir per pengiriman Antar Nabila, diskon, waktu bayar.
// Total di modal hanya pratinjau; total resmi dihitung server dan tampil di tabel setelah disimpan.
const toNum = (s) => Number(String(s).replace(/\D/g, '')) || 0
const fmtInput = (s) => (String(s).replace(/\D/g, '') ? rupiah(toNum(s)) : '')

function RupiahInput({ id, value, onChange, ...rest }) {
  return (
    <input id={id} inputMode="numeric" className={fieldCls} placeholder="Rp0" value={fmtInput(value)}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 9))} {...rest} />
  )
}

const WAKTU = [
  ['di_muka', 'Bayar di muka', 'Tagihan dikirim, batas bayar 4 jam', 'M12 7v5l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z'],
  ['setelah_kirim', 'Bayar setelah kirim', 'Untuk pelanggan langganan / kafe', 'M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a2 2 0 100-4 2 2 0 000 4zM17 19a2 2 0 100-4 2 2 0 000 4z'],
]

export default function ConfirmDialog({ orderId, onClose, onDone }) {
  const [order, setOrder] = useState(null)
  const [fees, setFees] = useState({})
  const [discount, setDiscount] = useState('')
  const [payTiming, setPayTiming] = useState('di_muka')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api(`/admin/orders/${orderId}`).then((o) => { setOrder(o); setPayTiming(o.pay_timing) }).catch(setError)
  }, [orderId])

  const antar = order?.deliveries.filter((d) => d.method === 'antar_nabila') || []
  const ongkir = antar.reduce((s, d) => s + toNum(fees[d.id] ?? ''), 0)
  const total = order ? order.totals.subtotal + ongkir - toNum(discount) : 0

  async function submit(e) {
    e.preventDefault()
    setError(null)
    if (antar.some((d) => fees[d.id] === undefined || fees[d.id] === '')) {
      setError({ message: 'Isi ongkir untuk setiap pengiriman Antar Nabila (isi 0 bila gratis).' })
      return
    }
    setSaving(true)
    try {
      const updated = await api(`/admin/orders/${orderId}/confirm`, {
        method: 'PATCH',
        body: JSON.stringify({
          pay_timing: payTiming,
          discount: toNum(discount),
          shipping_fees: antar.map((d) => ({ delivery_id: d.id, shipping_fee: toNum(fees[d.id]) })),
        }),
      })
      onDone(updated, `${updated.order_code} dikonfirmasi`)
    } catch (err) {
      setError(err)
      setSaving(false)
    }
  }

  const sub = order && [order.order_code, order.customer_name || 'Tanpa nama',
    order.deliveries.map((d) => `${d.method === 'antar_nabila' ? 'Antar' : 'Ambil'}, ${labelTanggal(d.delivery_date).panjang}`).join(' · ')].join(' · ')

  return (
    <Modal title="Konfirmasi Pesanan" subtitle={sub} onClose={onClose}>
      {!order ? (
        error ? <ErrorBox error={error} /> : <p role="status" className="py-6 text-sm font-semibold text-abu">Memuat pesanan…</p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <ul className="flex flex-col gap-2 rounded-[14px] bg-krem-field px-4 py-3 text-sm">
            {order.items.map((it) => (
              <li key={it.id} className="flex justify-between gap-4">
                <span className="text-abu">{[`${it.name} ×${it.qty}`, ...it.options.map((o) => o.name)].join(' · ')}</span>
                <span className="shrink-0 font-bold">{rupiah(it.line_total)}</span>
              </li>
            ))}
          </ul>

          <div className="grid gap-3 lg:grid-cols-2">
            {antar.map((d) => (
              <div key={d.id}>
                <label htmlFor={`ongkir-${d.id}`} className={labelCls}>
                  Ongkir antar{antar.length > 1 ? ` · ${labelTanggal(d.delivery_date).panjang}` : ''}
                </label>
                <RupiahInput id={`ongkir-${d.id}`} value={fees[d.id] ?? ''} onChange={(v) => setFees((f) => ({ ...f, [d.id]: v }))} />
              </div>
            ))}
            {antar.length === 0 && (
              <p className="self-end pb-3 text-[13px] font-semibold text-abu">Ambil Sendiri: tanpa ongkir</p>
            )}
            <div>
              <label htmlFor="diskon" className={labelCls}>Diskon</label>
              <RupiahInput id="diskon" value={discount} onChange={setDiscount} />
            </div>
          </div>

          <fieldset>
            <legend className={labelCls}>Waktu bayar</legend>
            <div className="grid gap-3 lg:grid-cols-2">
              {WAKTU.map(([value, title, sub, icon]) => (
                <label key={value} className={`flex cursor-pointer flex-col gap-1 rounded-[14px] p-4 ${payTiming === value ? 'bg-krem-field ring-2 ring-ungu' : 'hover:bg-krem-field'}`}>
                  <input type="radio" name="pay_timing" value={value} checked={payTiming === value} onChange={() => setPayTiming(value)} className="sr-only" />
                  <span className={`flex items-center gap-2 text-sm font-bold ${payTiming === value ? 'text-ungu' : ''}`}>
                    <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={icon} /></svg>
                    {title}
                  </span>
                  <span className="text-xs font-medium text-abu">{sub}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex items-center justify-between rounded-[14px] bg-ungu-gelap px-4 py-4 text-white">
            <span className="text-sm font-medium">Total tagihan</span>
            <span className="font-lilita text-[28px] leading-none text-kuning" aria-live="polite">{rupiah(Math.max(0, total))}</span>
          </div>

          <ErrorBox error={error} />
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className={btnSekunder}>Batal</button>
            <button type="submit" disabled={saving} className={btnUtama}>{saving ? 'Menyimpan…' : 'Konfirmasi Pesanan'}</button>
          </div>
        </form>
      )}
    </Modal>
  )
}
