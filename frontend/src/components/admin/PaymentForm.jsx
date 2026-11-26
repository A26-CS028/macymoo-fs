import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { rupiah } from '../../utils/format'
import Modal, { ErrorBox, fieldCls, labelCls } from './Modal'
import Button from '../ui/Button'

// Catat Pembayaran (Figma: Modal — Catat Pembayaran / sheet "Catat pembayaran" HP).
// DP = nominal bebas di bawah sisa tagihan, Lunas = sisa tagihan, Dikembalikan = refund untuk pesanan dibatalkan.
// Aturan akhir tetap di server (paymentRules): angka di sini hanya pratinjau.
const Ikon = ({ d }) => (
  <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
)
const JENIS = [
  { key: 'belum', label: 'Belum bayar', sub: '', d: 'M12 7v5l3 2M12 21a9 9 0 100-18 9 9 0 000 18z' },
  { key: 'dp', label: 'DP', sub: 'Nominal bebas', d: 'M3 7h15a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7zm0 0V6a2 2 0 012-2h11v3M16 13h1' },
  { key: 'pelunasan', label: 'Lunas', sub: '', d: 'M5 12l5 5 9-10' },
  { key: 'refund', label: 'Dikembalikan', sub: 'Refund manual', d: 'M3 12a9 9 0 109-9 9 9 0 00-6.4 2.6L3 8M3 3v5h5' },
]
const METODE = [['qris', 'QRIS'], ['transfer', 'Transfer bank'], ['tunai', 'Tunai']]
const angka = (s) => Number(String(s).replace(/\D/g, '')) || 0
const waktu = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })

export default function PaymentForm({ orderId, onClose, onDone }) {
  const [order, setOrder] = useState(null)
  const [jenis, setJenis] = useState(null)
  const [nominal, setNominal] = useState('')
  const [metode, setMetode] = useState('qris')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api(`/admin/orders/${orderId}`).then((o) => {
      setOrder(o)
      const t = o.totals
      setJenis(o.status === 'dibatalkan' ? (t.paid_net ? 'refund' : null) : t.balance_due ? (o.pay_status === 'dp' ? 'pelunasan' : 'dp') : null)
      if (o.status === 'dibatalkan' && t.paid_net) setNominal(String(t.paid_net)) // refund penuh sebagai awal
    }).catch(setError)
  }, [orderId])

  const t = order?.totals
  const bisa = {
    belum: false, // keadaan awal, bukan pembayaran
    dp: !!order && order.status !== 'dibatalkan' && order.status !== 'menunggu_konfirmasi' && t.balance_due > 1,
    pelunasan: !!order && order.status !== 'dibatalkan' && order.status !== 'menunggu_konfirmasi' && t.balance_due > 0,
    refund: !!order && order.status === 'dibatalkan' && t.paid_net > 0,
  }
  const amount = jenis === 'pelunasan' ? t?.balance_due : angka(nominal)
  const batas = jenis === 'refund' ? t?.paid_net : jenis === 'dp' ? t?.balance_due - 1 : t?.balance_due
  const salah = jenis !== 'pelunasan' && amount > 0 && amount > batas
    ? (jenis === 'refund' ? `Refund maksimal ${rupiah(t.paid_net)}` : `DP harus di bawah sisa tagihan ${rupiah(t.balance_due)}; pilih Lunas bila dibayar penuh`)
    : ''
  const sudah = !t ? 0 : jenis === 'refund' ? t.paid_net - amount : t.paid_net + (amount || 0)
  const sisa = !t ? 0 : jenis === 'refund' ? t.balance_due : Math.max(0, t.balance_due - (amount || 0))

  async function submit(e) {
    e.preventDefault()
    if (!jenis || !amount || salah) return setError({ message: salah || 'Isi nominal pembayaran.' })
    setError(null)
    setSaving(true)
    try {
      const res = await api(`/admin/orders/${orderId}/payments`, { method: 'POST', body: JSON.stringify({ type: jenis, method: metode, amount }) })
      const label = { dp: 'DP', pelunasan: 'Pelunasan', refund: 'Refund' }[jenis]
      onDone(res.order, `${label} ${rupiah(amount)} untuk ${res.order.order_code} tercatat`)
    } catch (err) {
      setError(err)
      setSaving(false)
    }
  }

  const sub = order && [order.invoices.at(-1)?.display_no || order.order_code, order.customer_name, `Total ${rupiah(t.grand_total)}`].filter(Boolean).join(' · ')

  return (
    <Modal title="Catat Pembayaran" subtitle={sub || 'Memuat…'} onClose={onClose} width="lg:w-[724px]" titleId="judul-bayar">
      {!order ? <ErrorBox error={error} /> : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div role="radiogroup" aria-label="Jenis pembayaran" className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {JENIS.map((j) => {
              const sel = jenis === j.key || (j.key === 'belum' && !jenis && t.paid_net === 0)
              return (
                <button key={j.key} type="button" role="radio" aria-checked={sel} disabled={!bisa[j.key]}
                  onClick={() => { setJenis(j.key); setNominal(j.key === 'refund' ? String(t.paid_net) : ''); setError(null) }}
                  className={`flex min-h-[64px] flex-col items-start rounded-[16px] px-3.5 py-3 text-left transition-colors ${sel ? 'bg-krem-field' : 'hover:bg-krem-field/60'} disabled:cursor-not-allowed disabled:hover:bg-transparent`}>
                  <span className={`flex items-center gap-2 whitespace-nowrap text-[15px] font-bold ${sel && j.key !== 'belum' ? 'text-ungu' : ''} ${!bisa[j.key] && !sel ? 'opacity-40' : ''}`}><Ikon d={j.d} />{j.label}</span>
                  {j.sub && <span className={`mt-1 text-[13px] font-medium text-abu ${!bisa[j.key] && !sel ? 'opacity-40' : ''}`}>{j.sub}</span>}
                </button>
              )
            })}
          </div>

          {!jenis ? (
            <p className="rounded-[10px] bg-krem-field px-4 py-3 text-sm font-semibold">
              {order.status === 'menunggu_konfirmasi' ? 'Konfirmasi pesanan dulu sebelum mencatat pembayaran.'
                : order.status === 'dibatalkan' ? 'Pesanan dibatalkan tanpa pembayaran, tidak ada yang perlu dikembalikan.'
                  : 'Pesanan sudah lunas.'}
            </p>
          ) : (
            <>
              <div>
                <label htmlFor="nominal-bayar" className={labelCls}>{{ dp: 'Nominal DP', pelunasan: 'Nominal pelunasan', refund: 'Nominal dikembalikan' }[jenis]}</label>
                <input id="nominal-bayar" inputMode="numeric" autoComplete="off" readOnly={jenis === 'pelunasan'}
                  value={jenis === 'pelunasan' ? rupiah(amount) : nominal ? rupiah(angka(nominal)) : ''}
                  onChange={(e) => setNominal(String(angka(e.target.value)).slice(0, 10))}
                  placeholder="Rp0" aria-invalid={!!salah} aria-describedby="nominal-salah"
                  className={`${fieldCls} ${jenis === 'pelunasan' ? 'text-abu' : ''}`} />
                {salah && <p id="nominal-salah" className="mt-1.5 text-xs font-semibold text-[#dc2626]">{salah}</p>}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="tanggal-bayar" className={labelCls}>Tanggal bayar</label>
                  {/* Server mencatat waktu saat disimpan (kontrak belum menerima paid_at) */}
                  <input id="tanggal-bayar" readOnly value={waktu.format(new Date())} className={`${fieldCls} text-abu`} />
                </div>
                <div>
                  <label htmlFor="metode-bayar" className={labelCls}>Metode</label>
                  <select id="metode-bayar" value={metode} onChange={(e) => setMetode(e.target.value)} className={fieldCls}>
                    {METODE.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>
              <dl className="flex flex-col gap-2 rounded-[16px] bg-krem-field px-4 py-3.5 text-[15px]">
                <div className="flex justify-between"><dt className="font-medium text-abu">Sudah dibayar</dt><dd className="font-bold">{rupiah(sudah)}</dd></div>
                <div className="flex items-baseline justify-between"><dt className="font-medium text-abu">Sisa tagihan</dt><dd className="text-xl font-extrabold text-ungu">{rupiah(sisa)}</dd></div>
              </dl>
              <p className="text-xs font-medium text-abu">
                {jenis === 'refund' ? 'Status pembayaran jadi Dikembalikan bila seluruh pembayaran sudah dikembalikan' : 'Status otomatis berubah ke Diproses setelah DP atau Lunas tercatat'}
              </p>
            </>
          )}

          <ErrorBox error={error} />
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button varian="sekunder" onClick={onClose} className="hidden sm:inline-flex">Batal</Button>
            <Button type="submit" memuat={saving} teksMemuat="Menyimpan…" disabled={!jenis || !!salah || !amount}>Simpan Pembayaran</Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
