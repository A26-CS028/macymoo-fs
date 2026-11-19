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

// Aksi per status (KF 5): konfirmasi hanya dari Menunggu Konfirmasi; jadwal ulang & batal sampai Diproses.
function aksiUntuk(status) {
  return {
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
      <table className="hidden w-full text-left text-sm lg:table">
        <thead>
          <tr className="text-xs font-semibold text-abu [&>th]:bg-krem-field [&>th]:px-4 [&>th]:py-3 first:[&>th]:rounded-l-[12px] last:[&>th]:rounded-r-[12px]">
            <th scope="col">Kode</th><th scope="col">Pelanggan</th><th scope="col">Menu</th><th scope="col">Kirim</th>
            <th scope="col">Metode</th><th scope="col">Total</th><th scope="col">Status</th><th scope="col">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => {
            const a = aksiUntuk(o.status)
            return (
              <tr key={o.id} className="[&>td]:px-4 [&>td]:py-4">
                <td className="whitespace-nowrap font-bold text-ungu">{o.order_code}</td>
                <td className="font-bold">{o.customer_name || <span className="font-medium text-abu">Dianonimkan</span>}</td>
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

      {/* HP */}
      <ul className="flex flex-col gap-3 lg:hidden">
        {orders.map((o) => {
          const a = aksiUntuk(o.status)
          const [label, text, dot] = STATUS[o.status]
          const first = o.items_summary[0]?.name || ''
          return (
            <li key={o.id} className="rounded-[18px] bg-white p-4">
              <div className="flex items-center justify-between gap-2 text-[13px] font-bold">
                <span className="text-ungu">{o.order_code}</span>
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
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm font-bold">
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
