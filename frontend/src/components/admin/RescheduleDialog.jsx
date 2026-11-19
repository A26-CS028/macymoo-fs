import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { todayJakarta, addDays, labelTanggal } from '../../utils/date'
import Modal, { Info, ErrorBox, btnSekunder, btnUtama, fieldCls, labelCls } from './Modal'

// Jadwalkan ulang satu pengiriman (Figma: Modal — Jadwalkan Ulang). Status pesanan tidak berubah;
// alasan masuk riwayat, lalu pelanggan dikabari lewat wa.me (KF 6).
const MAX = 200

export default function RescheduleDialog({ orderId, onClose, onDone }) {
  const [order, setOrder] = useState(null)
  const [closed, setClosed] = useState([])
  const [deliveryId, setDeliveryId] = useState(null)
  const [date, setDate] = useState('')
  const [reason, setReason] = useState('')
  const [notify, setNotify] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api(`/admin/orders/${orderId}`).then((o) => {
      setOrder(o)
      setDeliveryId(o.deliveries.find((d) => d.delivery_status !== 'terkirim')?.id ?? null)
    }).catch(setError)
    api('/closed-dates').then((r) => setClosed(r.closed_dates.map((c) => c.closed_date))).catch(() => {})
  }, [orderId])

  const delivery = order?.deliveries.find((d) => d.id === deliveryId)
  const days = Array.from({ length: 21 }, (_, i) => addDays(todayJakarta(), i))
  const canNotify = !!order?.phone

  async function submit(e) {
    e.preventDefault()
    setError(null)
    if (!date) return setError({ message: 'Pilih tanggal kirim baru.' })
    if (!reason.trim()) return setError({ message: 'Alasan wajib diisi.' })
    // Jendela WhatsApp dibuka langsung saat diklik supaya tidak diblokir browser, lalu diarahkan setelah tersimpan
    const wa = notify && canNotify ? window.open('', '_blank') : null
    setSaving(true)
    try {
      const res = await api(`/admin/orders/${orderId}/reschedule`, {
        method: 'POST',
        body: JSON.stringify({ delivery_id: deliveryId, new_date: date, reason: reason.trim() }),
      })
      if (wa && res.wa_link) { wa.opener = null; wa.location.href = res.wa_link } else wa?.close()
      onDone(res.order, `${res.order.order_code} dijadwalkan ulang ke ${labelTanggal(date).panjang}`)
    } catch (err) {
      wa?.close()
      setError(err)
      setSaving(false)
    }
  }

  return (
    <Modal title="Jadwalkan Ulang" subtitle={order && `${order.order_code} · ${order.customer_name || 'Tanpa nama'}`} onClose={onClose} width="lg:w-[560px]">
      {!order ? (
        error ? <ErrorBox error={error} /> : <p role="status" className="py-6 text-sm font-semibold text-abu">Memuat pesanan…</p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          {order.deliveries.length > 1 && (
            <div>
              <label htmlFor="pengiriman" className={labelCls}>Pengiriman yang dijadwalkan ulang</label>
              <select id="pengiriman" className={fieldCls} value={deliveryId ?? ''} onChange={(e) => { setDeliveryId(Number(e.target.value)); setDate('') }}>
                {order.deliveries.map((d) => (
                  <option key={d.id} value={d.id} disabled={d.delivery_status === 'terkirim'}>
                    {labelTanggal(d.delivery_date).panjang} · {d.method === 'antar_nabila' ? 'Antar' : 'Ambil'}{d.delivery_status === 'terkirim' ? ' (terkirim)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* min-w-0: fieldset bawaan browser tidak menyusut, deretan tanggal jadi melebarkan modal */}
          <fieldset className="min-w-0">
            <legend className={labelCls}>Tanggal kirim baru{delivery ? ` (sekarang ${labelTanggal(delivery.delivery_date).panjang})` : ''}</legend>
            <div role="radiogroup" aria-label="Tanggal kirim baru" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
              {days.map((d) => {
                const { hari, panjang } = labelTanggal(d)
                const [, bln] = panjang.split(' ').slice(1)
                const libur = closed.includes(d)
                const sama = d === delivery?.delivery_date
                const sel = d === date
                return (
                  <button key={d} type="button" role="radio" aria-checked={sel} disabled={libur || sama} onClick={() => setDate(d)}
                    aria-label={`${panjang}${libur ? ', libur' : sama ? ', tanggal saat ini' : ''}`}
                    className={`flex h-[56px] w-[92px] shrink-0 flex-col justify-center rounded-[12px] px-3 text-left ${sel ? 'bg-ungu text-white' : 'hover:bg-krem-field'} disabled:cursor-not-allowed`}>
                    <span className={`text-xs font-medium ${sel ? 'text-white/80' : 'text-abu'}`}>{d === todayJakarta() ? 'Hari ini' : hari}</span>
                    <span className={`text-[15px] font-bold ${libur || sama ? 'text-abu line-through' : ''}`}>{labelTanggal(d).tgl} {bln}</span>
                  </button>
                )
              })}
            </div>
          </fieldset>

          <div>
            <label htmlFor="alasan" className={labelCls}>Alasan</label>
            <div className="relative">
              <textarea id="alasan" rows={3} maxLength={MAX} value={reason} onChange={(e) => setReason(e.target.value)}
                placeholder="Misalnya: brokoli segar belum tersedia hari Jumat" className={`${fieldCls} h-[100px] resize-none py-3 pb-7`} />
              <span className="pointer-events-none absolute bottom-2.5 right-4 text-xs font-semibold text-abu">{reason.length}/{MAX}</span>
            </div>
          </div>

          <Info>Alasan disimpan ke riwayat pesanan (order_events)</Info>

          <label className={`flex items-center gap-3 text-sm font-semibold ${canNotify ? 'cursor-pointer' : 'opacity-60'}`}>
            <input type="checkbox" role="switch" className="peer sr-only" checked={notify && canNotify} disabled={!canNotify} onChange={(e) => setNotify(e.target.checked)} />
            <span className="relative h-6 w-11 shrink-0 rounded-full bg-abu-label transition-colors peer-checked:bg-ungu peer-focus-visible:ring-2 peer-focus-visible:ring-ungu peer-focus-visible:ring-offset-2 after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5" />
            {canNotify ? 'Kabari pelanggan lewat WhatsApp (wa.me)' : 'Nomor pelanggan tidak ada, kabari manual'}
          </label>

          <ErrorBox error={error} />
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className={btnSekunder}>Batal</button>
            <button type="submit" disabled={saving} className={btnUtama}>
              {saving ? 'Menyimpan…' : notify && canNotify ? 'Simpan & Buka WhatsApp' : 'Simpan'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
