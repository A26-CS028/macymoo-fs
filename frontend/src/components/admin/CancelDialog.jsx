import { useState } from 'react'
import { api } from '../../api/client'
import { rupiah } from '../../utils/format'
import Modal, { Info, ErrorBox, btnSekunder, fieldCls, labelCls } from './Modal'

// Batalkan pesanan (Figma: Modal — Batalkan Pesanan). Semua pembatalan dilakukan Nabila (KF 5).
const ALASAN = ['Permintaan pelanggan', 'Lewat batas bayar 4 jam', 'Pelanggan menolak jadwal ulang', 'Kapasitas penuh', 'Lainnya']

export default function CancelDialog({ order, onClose, onDone }) {
  const [pilih, setPilih] = useState(order.payment_overdue ? 'Lewat batas bayar 4 jam' : ALASAN[0])
  const [lain, setLain] = useState('')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const reason = pilih === 'Lainnya' ? lain.trim() : pilih

  async function submit(e) {
    e.preventDefault()
    if (!reason) return setError({ message: 'Tulis alasan pembatalan.' })
    setError(null)
    setSaving(true)
    try {
      const updated = await api(`/admin/orders/${order.id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) })
      onDone(updated, `${updated.order_code} dibatalkan${updated.totals.refund_due ? `; refund ${rupiah(updated.totals.refund_due)} perlu dicatat` : ''}`)
    } catch (err) {
      setError(err)
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose} width="lg:w-[480px]" titleId="judul-batal" hideHeader>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="flex flex-col items-center gap-2 pt-2 text-center">
          <svg viewBox="0 0 24 24" className="size-10 text-[#dc2626]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0zM12 9v4M12 17h.01" /></svg>
          <h2 id="judul-batal" className="text-2xl font-bold">Batalkan pesanan ini?</h2>
          <p className="text-sm font-medium text-abu">{order.order_code} · {order.customer_name || 'Tanpa nama'} · {rupiah(order.grand_total)}</p>
        </div>
        <div>
          <label htmlFor="alasan-batal" className={labelCls}>Alasan</label>
          <select id="alasan-batal" className={fieldCls} value={pilih} onChange={(e) => setPilih(e.target.value)}>
            {ALASAN.map((a) => <option key={a}>{a}</option>)}
          </select>
          {pilih === 'Lainnya' && (
            <input className={`${fieldCls} mt-2`} maxLength={300} value={lain} onChange={(e) => setLain(e.target.value)} placeholder="Tulis alasannya" aria-label="Alasan lainnya" />
          )}
        </div>
        <Info>Pesanan Dibatalkan tidak dihitung dalam omzet rekap keuangan</Info>
        {order.pay_status !== 'belum_bayar' && (
          <Info>Pesanan ini sudah dibayar. Setelah dibatalkan, catat refund saat uang dikembalikan.</Info>
        )}
        <ErrorBox error={error} />
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={onClose} className={btnSekunder}>Kembali</button>
          <button type="submit" disabled={saving} className="h-12 rounded-[10px] bg-[#dc2626] text-[15px] font-bold text-white disabled:opacity-50">
            {saving ? 'Membatalkan…' : 'Batalkan Pesanan'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
