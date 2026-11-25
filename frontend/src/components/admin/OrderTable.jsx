import { Link } from 'react-router-dom'
import { rupiah } from '../../utils/format'
import { labelTanggal } from '../../utils/date'
import { localPhoto } from '../../utils/menuPhoto'

// Tabel Pesanan Masuk (Figma: Admin — Pesanan Masuk) dan kartu versi HP (Admin Mobile — Pesanan).
// shortcut: ikon garis digambar ulang (bukan aset Figma); ganti dengan aset Figma bila sudah diekspor.
export const STATUS = {
  menunggu_konfirmasi: ['Menunggu Konfirmasi', 'text-[#d97706]', 'bg-[#d97706]'],
  menunggu_pembayaran: ['Menunggu Pembayaran', 'text-[#2563eb]', 'bg-[#2563eb]'],
  diproses: ['Diproses', 'text-ungu', 'bg-ungu'],
  selesai: ['Selesai', 'text-[#16a34a]', 'bg-[#16a34a]'],
  dibatalkan: ['Dibatalkan', 'text-[#dc2626]', 'bg-[#dc2626]'],
}

const Ikon = ({ d, className = 'size-[18px]' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
)
const I = {
  centang: 'M5 12l5 5 9-10',
  kalender: 'M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z',
  silang: 'M6 6l12 12M18 6L6 18',
  truk: 'M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a2 2 0 100-4 2 2 0 000 4zM17 19a2 2 0 100-4 2 2 0 000 4z',
  tas: 'M6 8h12l-1 12H7L6 8zM9 8a3 3 0 016 0',
  dompet: 'M3 7h15a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7zm0 0V6a2 2 0 012-2h11v3M16 13h1',
  dokumen: 'M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5zM14 3v5h5M9 13h6M9 17h6',
}

// "Jum, 7 Nov" atau rentang "9–13 Nov" untuk pesanan beberapa pengiriman
export function kirimLabel(dates) {
  if (dates.length === 1) return labelTanggal(dates[0]).panjang
  const a = labelTanggal(dates[0]).panjang.split(' ')
  const b = labelTanggal(dates.at(-1)).panjang.split(' ')
  return a[2] === b[2] ? `${a[1]}–${b[1]} ${b[2]}` : `${a[1]} ${a[2]} – ${b[1]} ${b[2]}`
}

export function menuLabel(o) {
  if (o.source === 'admin_form' && o.delivery_dates.length > 1) return `Pesanan besar · ${o.delivery_dates.length} tanggal kirim`
  return o.items_summary.map((i) => `${i.qty}× ${i.name}`).join(', ')
}

// Aksi per status (KF 5): konfirmasi hanya dari Menunggu Konfirmasi; jadwal ulang & batal sampai Diproses;
// catat bayar setelah dikonfirmasi selama belum lunas; invoice setelah dikonfirmasi.
const API = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/$/, '')
function aksiUntuk(status, payStatus) {
  return {
    bayar: ['menunggu_pembayaran', 'diproses'].includes(status) && payStatus !== 'lunas',
    invoice: ['menunggu_pembayaran', 'diproses', 'selesai'].includes(status),
    konfirmasi: status === 'menunggu_konfirmasi',
    jadwal: ['menunggu_konfirmasi', 'menunggu_pembayaran', 'diproses'].includes(status),
    batal: ['menunggu_konfirmasi', 'menunggu_pembayaran', 'diproses'].includes(status),
  }
}

function StatusBadge({ o }) {
  const [label, text, dot] = STATUS[o.status]
  return (
    <span className={`inline-flex flex-col text-[13px] font-semibold ${text}`}>
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><span className={`size-1.5 rounded-full ${dot}`} />{label}</span>
      {o.payment_overdue && <span className="pl-3 text-[11px] font-bold text-[#dc2626]">Lewat batas bayar</span>}
    </span>
  )
}

function Metode({ o }) {
  return (
    <span className="flex flex-col gap-0.5">
      {o.delivery_methods.map((m) => (
        <span key={m} className="inline-flex items-center gap-1 text-xs font-bold text-ungu">
          <Ikon d={m === 'antar_nabila' ? I.truk : I.tas} className="size-3.5" />{m === 'antar_nabila' ? 'Antar' : 'Ambil'}
        </span>
      ))}
    </span>
  )
}

// Total pesanan Antar Nabila yang belum dikonfirmasi belum termasuk ongkir
const belumOngkir = (o) => o.status === 'menunggu_konfirmasi' && o.delivery_methods.includes('antar_nabila')

export default function OrderTable({ orders, onAction }) {
  return (
    <>
      {/* Desktop */}
      {/* Tabel mulai 1280px; di bawahnya kolom terlalu sempit (nama panjang turun belasan baris) */}
      <table className="hidden w-full text-left text-sm xl:table">
        <thead>
          <tr className="text-xs font-semibold text-abu [&>th]:bg-krem-field [&>th]:px-4 [&>th]:py-3 first:[&>th]:rounded-l-[12px] last:[&>th]:rounded-r-[12px]">
            <th scope="col">Kode</th><th scope="col">Pelanggan</th><th scope="col">Menu</th><th scope="col">Kirim</th>
            <th scope="col">Metode</th><th scope="col">Total</th><th scope="col">Status</th><th scope="col">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => {
            const a = aksiUntuk(o.status, o.pay_status)
            return (
              <tr key={o.id} className="[&>td]:px-4 [&>td]:py-4">
                <td className="whitespace-nowrap font-bold text-ungu"><Link to={`/dapur/pesanan/${o.id}`} className="hover:underline">{o.order_code}</Link></td>
                <td className="max-w-[200px] font-bold"><span className="line-clamp-2" title={o.customer_name || undefined}>{o.customer_name || <span className="font-medium text-abu">Dianonimkan</span>}</span></td>
                <td className="max-w-[170px] text-xs font-medium">{menuLabel(o)}</td>
                <td className="whitespace-nowrap text-xs font-medium">{kirimLabel(o.delivery_dates)}</td>
                <td><Metode o={o} /></td>
                <td className="whitespace-nowrap">
                  <span className="font-extrabold">{rupiah(o.grand_total)}</span>
                  {belumOngkir(o) && <span className="block text-[11px] font-semibold text-abu">belum ongkir</span>}
                </td>
                <td><StatusBadge o={o} /></td>
                <td>
                  <div className="flex items-center gap-1.5">
                    {a.konfirmasi && (
                      <button type="button" onClick={() => onAction('konfirmasi', o)} title="Konfirmasi" aria-label={`Konfirmasi ${o.order_code}`}
                        className="flex size-8 items-center justify-center rounded-lg bg-ungu text-white hover:bg-ungu-tua"><Ikon d={I.centang} /></button>
                    )}
                    {a.bayar && (
                      <button type="button" onClick={() => onAction('bayar', o)} title="Catat pembayaran" aria-label={`Catat pembayaran ${o.order_code}`}
                        className={`flex size-8 items-center justify-center rounded-lg ${o.status === 'menunggu_pembayaran' ? 'bg-[#2563eb] text-white hover:bg-[#1d4ed8]' : 'hover:bg-krem-field'}`}><Ikon d={I.dompet} /></button>
                    )}
                    {a.invoice && (
                      <a href={`${API}/admin/orders/${o.id}/invoice.pdf`} target="_blank" rel="noopener" title="Invoice PDF" aria-label={`Invoice PDF ${o.order_code}`}
                        className="flex size-8 items-center justify-center rounded-lg hover:bg-krem-field"><Ikon d={I.dokumen} /></a>
                    )}
                    {a.jadwal && (
                      <button type="button" onClick={() => onAction('jadwal', o)} title="Jadwalkan ulang" aria-label={`Jadwalkan ulang ${o.order_code}`}
                        className="flex size-8 items-center justify-center rounded-lg hover:bg-krem-field"><Ikon d={I.kalender} /></button>
                    )}
                    {a.batal && (
                      <button type="button" onClick={() => onAction('batal', o)} title="Batalkan" aria-label={`Batalkan ${o.order_code}`}
                        className="flex size-8 items-center justify-center rounded-lg text-[#dc2626] hover:bg-[#fde8e8]"><Ikon d={I.silang} /></button>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* HP dan tablet: kartu, dua kolom mulai 768px */}
      <ul className="grid gap-3 md:grid-cols-2 xl:hidden">
        {orders.map((o) => {
          const a = aksiUntuk(o.status, o.pay_status)
          const [label, text, dot] = STATUS[o.status]
          const first = o.items_summary[0]?.name || ''
          return (
            <li key={o.id} className="flex flex-col rounded-[18px] bg-white p-4">
              <div className="flex items-center justify-between gap-2 text-[13px] font-bold">
                <Link to={`/dapur/pesanan/${o.id}`} className="text-ungu underline-offset-2 hover:underline">{o.order_code}</Link>
                <span className={`inline-flex items-center gap-1.5 ${text}`}><span className={`size-1.5 rounded-full ${dot}`} />{label}</span>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <img src={localPhoto({ name: first })} alt="" className="size-11 shrink-0 object-contain" />
                <div className="min-w-0">
                  <p className="font-bold">{o.customer_name || 'Dianonimkan'}</p>
                  <p className="text-xs font-medium text-abu">
                    {[menuLabel(o).replace(/×\s/g, ' '), o.payment_overdue ? 'lewat batas bayar' : null, kirimLabel(o.delivery_dates)].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>
              {(a.konfirmasi || a.jadwal) && (
                <div className="mt-auto grid grid-cols-2 gap-2 pt-3 text-sm font-bold">
                  {a.bayar && (
                    <button type="button" onClick={() => onAction('bayar', o)} className={`col-span-2 flex h-10 items-center justify-center gap-2 rounded-[10px] ${o.status === 'menunggu_pembayaran' ? 'bg-[#2563eb] text-white' : 'bg-krem-field'}`}><Ikon d={I.dompet} />Catat pembayaran</button>
                  )}
                  {a.konfirmasi
                    ? <button type="button" onClick={() => onAction('konfirmasi', o)} className="flex h-10 items-center justify-center gap-2 rounded-[10px] bg-ungu text-white"><Ikon d={I.centang} />Konfirmasi</button>
                    : <button type="button" onClick={() => onAction('jadwal', o)} className="flex h-10 items-center justify-center gap-2 rounded-[10px] bg-krem-field"><Ikon d={I.kalender} />Jadwal ulang</button>}
                  <button type="button" onClick={() => onAction('batal', o)} className="flex h-10 items-center justify-center gap-2 rounded-[10px] bg-krem-field text-[#dc2626]">
                    <Ikon d={I.silang} />{o.status === 'menunggu_konfirmasi' ? 'Tolak' : 'Batalkan'}
                  </button>
                  {a.konfirmasi && (
                    <button type="button" onClick={() => onAction('jadwal', o)} className="col-span-2 flex h-10 items-center justify-center gap-2 rounded-[10px] bg-krem-field"><Ikon d={I.kalender} />Usulkan tanggal lain</button>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </>
  )
}
