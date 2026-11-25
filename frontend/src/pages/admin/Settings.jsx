import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { todayJakarta, addDays, labelTanggal } from '../../utils/date'
import { ErrorBox, fieldCls, labelCls } from '../../components/admin/Modal'

// Bank, QRIS & Tutup Tanggal (Figma: Admin — Bank, QRIS & Tutup Tanggal / Mobile — Tutup Tanggal & Pembayaran).
// Rekening, QRIS, dan WhatsApp disimpan sekaligus (PUT /admin/settings mengganti seluruh objek).
const KOSONG = { bank_name: '', bank_account_number: '', bank_account_holder: '', qris_image_url: '', wa_number: '' }
const BANK = ['BCA', 'BRI', 'BNI', 'Mandiri', 'BSI', 'CIMB Niaga', 'Permata', 'SeaBank', 'Bank Jago', 'blu by BCA Digital']
const HARI = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
const kartu = 'rounded-[20px] bg-white p-5 lg:p-6'
const btnUtama = 'flex h-11 items-center justify-center rounded-[10px] bg-ungu px-5 text-[15px] font-bold text-white disabled:opacity-50'
const rek = (n) => (n || '').replace(/(\d{4})(?=\d)/g, '$1 ')
// Isian WA boleh 08…/+62…; disimpan 62… sesuai validator backend
const waSimpan = (s) => s.replace(/[\s-]/g, '').replace(/^\+/, '').replace(/^0/, '62')
const Svg = ({ d, className = 'size-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
)

function Kalender({ closed, onToggle, busy }) {
  const today = todayJakarta()
  const [bulan, setBulan] = useState(today.slice(0, 7)) // YYYY-MM
  const [y, m] = bulan.split('-').map(Number)
  const first = `${bulan}-01`
  const jumlah = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const offset = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7 // Senin = 0
  const geser = (n) => setBulan(new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7))
  const judul = new Date(`${first}T00:00:00Z`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' })

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-lg font-extrabold">{judul}</p>
        <div className="flex gap-1">
          <button type="button" onClick={() => geser(-1)} disabled={bulan <= today.slice(0, 7)} aria-label="Bulan sebelumnya" className="rounded-lg p-1.5 hover:bg-krem-field disabled:opacity-30"><Svg d="M15 6l-6 6 6 6" className="size-5" /></button>
          <button type="button" onClick={() => geser(1)} aria-label="Bulan berikutnya" className="rounded-lg p-1.5 hover:bg-krem-field"><Svg d="M9 6l6 6-6 6" className="size-5" /></button>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1.5 text-center lg:gap-2" role="grid" aria-label={`Kalender ${judul}`}>
        {HARI.map((h) => <span key={h} className="pb-1 text-[13px] font-semibold text-abu">{h}</span>)}
        {Array.from({ length: offset }, (_, i) => <span key={`k${i}`} />)}
        {Array.from({ length: jumlah }, (_, i) => {
          const d = addDays(first, i)
          const tutup = closed.find((c) => c.closed_date === d)
          const lewat = d < today
          const kini = d === today
          return (
            <button key={d} type="button" disabled={lewat || kini || busy === d} onClick={() => onToggle(d, tutup)}
              aria-pressed={!!tutup} aria-label={`${labelTanggal(d).panjang}${tutup ? ', ditutup. Klik untuk membuka' : lewat ? ', sudah lewat' : kini ? ', hari ini' : ', buka. Klik untuk menutup'}`}
              className={`flex h-11 items-center justify-center rounded-[10px] text-[15px] font-semibold transition-colors lg:h-12 ${
                kini ? 'bg-kuning font-extrabold' : tutup ? 'bg-[#e8dcc6] font-bold text-[#dc2626] line-through hover:bg-[#dccdb2]' : lewat ? 'text-abu' : 'bg-krem-field hover:bg-[#ece4d6]'
              } ${busy === d ? 'animate-pulse' : ''}`}>
              {Number(d.slice(8))}
            </button>
          )
        })}
      </div>
      <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-abu">
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-kuning" />Hari ini</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-krem-field ring-1 ring-[#e4dccb]" />Buka</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[#e8dcc6]" />Tutup</span>
      </p>
    </div>
  )
}

export default function Settings() {
  const [saved, setSaved] = useState(null)
  const [form, setForm] = useState(KOSONG)
  const [closed, setClosed] = useState([])
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [busyDate, setBusyDate] = useState(null)
  const [editHp, setEditHp] = useState(false)
  const [tambah, setTambah] = useState(false)
  const [tglBaru, setTglBaru] = useState('')

  const loadClosed = () => api('/closed-dates').then((r) => setClosed(r.closed_dates)).catch(setError)
  useEffect(() => {
    api('/admin/settings').then((s) => {
      setSaved(s)
      setForm(Object.fromEntries(Object.keys(KOSONG).map((k) => [k, s[k] ?? ''])))
      setEditHp(!s.bank_account_number)
    }).catch(setError)
    loadClosed()
  }, [])
  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(''), 4000)
    return () => clearTimeout(t)
  }, [notice])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const body = (f) => ({ ...f, wa_number: f.wa_number ? waSimpan(f.wa_number) : '' })

  async function simpan(e, next = form) {
    e?.preventDefault()
    setSaving(true); setError(null)
    try {
      const s = await api('/admin/settings', { method: 'PUT', body: JSON.stringify(body(next)) })
      setSaved(s)
      setForm(Object.fromEntries(Object.keys(KOSONG).map((k) => [k, s[k] ?? ''])))
      setNotice('Pengaturan tersimpan; halaman tagihan pelanggan memakai data ini')
      setEditHp(false)
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  // Gambar QRIS langsung disimpan setelah terunggah (bersama isian rekening yang sudah tersimpan)
  async function unggah(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > 2 * 1024 * 1024) return setError({ message: 'Ukuran gambar QRIS maksimal 2 MB' })
    setUploading(true); setError(null)
    try {
      const fd = new FormData()
      fd.append('purpose', 'qris')
      fd.append('file', file)
      const { url } = await api('/admin/uploads', { method: 'POST', body: fd })
      const base = Object.fromEntries(Object.keys(KOSONG).map((k) => [k, saved?.[k] ?? '']))
      const s = await api('/admin/settings', { method: 'PUT', body: JSON.stringify({ ...base, qris_image_url: url }) })
      setSaved(s)
      setForm((f) => ({ ...f, qris_image_url: s.qris_image_url ?? '' })) // isian rekening yang belum disimpan tetap
      setNotice('Gambar QRIS diganti; langsung tampil di halaman tagihan')
    } catch (err) {
      setError(err)
    } finally {
      setUploading(false)
    }
  }

  async function toggle(d, tutup) {
    setBusyDate(d); setError(null)
    try {
      if (tutup) await api(`/admin/closed-dates/${tutup.id}`, { method: 'DELETE' })
      else {
        // Menutup tanggal tidak memindahkan pesanan yang sudah ada di tanggal itu
        const { orders } = await api(`/admin/orders?date=${d}`)
        const aktif = orders.filter((o) => !['selesai', 'dibatalkan'].includes(o.status))
        if (aktif.length && !window.confirm(`Sudah ada ${aktif.length} pesanan aktif untuk ${labelTanggal(d).panjang} (${aktif.map((o) => o.order_code).join(', ')}). Menutup tanggal tidak membatalkan atau memindahkan pesanan itu; jadwalkan ulang dari Pesanan Masuk bila perlu. Tetap tutup?`)) return
        await api('/admin/closed-dates', { method: 'POST', body: JSON.stringify({ closed_date: d }) })
      }
      setNotice(`${labelTanggal(d).panjang} ${tutup ? 'dibuka lagi' : 'ditutup; tidak bisa dipilih di Form PO'}`)
      await loadClosed()
    } catch (err) {
      setError(err)
    } finally {
      setBusyDate(null)
    }
  }

  if (!saved && !error) return <p role="status" className="py-8 text-center text-sm font-semibold text-abu">Memuat pengaturan…</p>

  const berubah = saved && Object.keys(KOSONG).some((k) => k !== 'qris_image_url' && (saved[k] ?? '') !== (k === 'wa_number' && form[k] ? waSimpan(form[k]) : form[k]))

  return (
    <form onSubmit={simpan} className="mx-auto max-w-[1180px] pb-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-extrabold max-lg:hidden lg:text-[30px]">Bank, QRIS & Tutup Tanggal</h1>
          <p className="text-sm font-medium text-abu max-lg:hidden">Atur cara bayar dan tanggal Nabila tidak menerima pesanan</p>
        </div>
        <button type="submit" disabled={saving || !berubah} className={`${btnUtama} hidden lg:flex`}>{saving ? 'Menyimpan…' : 'Simpan Pengaturan'}</button>
      </div>

      {notice && <p role="status" className="mt-4 rounded-[10px] bg-ungu-gelap px-4 py-3 text-sm font-bold text-white">✓ {notice}</p>}
      {error && <div className="mt-4"><ErrorBox error={error} /></div>}

      <div className="mt-5 grid gap-4 lg:grid-cols-[290fr_320fr_480fr] lg:gap-5">
        {/* Rekening bank + nomor WA (tombol Kabari Nabila) */}
        <section className={`${kartu} order-3 flex flex-col lg:order-none`} aria-labelledby="judul-rekening">
          <h2 id="judul-rekening" className="text-lg font-bold">Rekening Bank</h2>
          <p className="hidden text-[13px] font-medium text-abu lg:block">Tampil di halaman tagihan pelanggan</p>
          {/* HP: ringkasan dulu, isian muncul saat Ubah rekening */}
          {!editHp && (
            <div className="lg:hidden">
              <dl className="mt-3 flex flex-col gap-2 text-[15px]">
                <div className="flex justify-between"><dt className="text-abu">Bank</dt><dd className="font-bold">{saved.bank_name || '-'}</dd></div>
                <div className="flex justify-between"><dt className="text-abu">Nomor</dt><dd className="font-bold">{rek(saved.bank_account_number) || '-'}</dd></div>
                <div className="flex justify-between"><dt className="text-abu">Atas nama</dt><dd className="font-bold">{saved.bank_account_holder || '-'}</dd></div>
                <div className="flex justify-between"><dt className="text-abu">WhatsApp</dt><dd className="font-bold">{saved.wa_number ? `+${saved.wa_number}` : '-'}</dd></div>
              </dl>
              <button type="button" onClick={() => setEditHp(true)} className="mt-4 h-11 w-full rounded-[10px] bg-krem-field text-[15px] font-bold">Ubah rekening</button>
            </div>
          )}
          <div className={`${editHp ? 'flex' : 'hidden'} mt-3 flex-1 flex-col gap-3 lg:flex`}>
            <div>
              <label htmlFor="bank" className={labelCls}>Nama bank</label>
              <input id="bank" list="daftar-bank" className={fieldCls} maxLength={60} value={form.bank_name} onChange={set('bank_name')} placeholder="BCA" />
              <datalist id="daftar-bank">{BANK.map((b) => <option key={b} value={b} />)}</datalist>
            </div>
            <div>
              <label htmlFor="rekening" className={labelCls}>Nomor rekening</label>
              <input id="rekening" inputMode="numeric" className={fieldCls} maxLength={40} value={rek(form.bank_account_number)}
                onChange={(e) => setForm((f) => ({ ...f, bank_account_number: e.target.value.replace(/\D/g, '') }))} placeholder="1234567890" />
            </div>
            <div>
              <label htmlFor="pemilik" className={labelCls}>Atas nama</label>
              <input id="pemilik" className={fieldCls} maxLength={100} value={form.bank_account_holder} onChange={set('bank_account_holder')} placeholder="Nabila Putri" />
            </div>
            <div>
              <label htmlFor="wa" className={labelCls}>Nomor WhatsApp Nabila</label>
              <input id="wa" type="tel" inputMode="tel" className={fieldCls} maxLength={20} value={form.wa_number} onChange={set('wa_number')} placeholder="0812…" aria-describedby="wa-info" />
              <p id="wa-info" className="mt-1 text-xs font-medium text-abu">Untuk tombol "Kabari Nabila" dan "Kirim bukti via WA" di halaman pelanggan</p>
            </div>
            {form.bank_account_number && (
              <div className="rounded-[16px] bg-ungu-gelap px-4 py-3.5 text-white">
                <p className="text-xs font-bold text-kuning">Pratinjau</p>
                <p className="text-lg font-extrabold">{form.bank_name || 'Bank'} · {rek(form.bank_account_number)}</p>
                {form.bank_account_holder && <p className="text-xs font-medium text-abu-label">a.n. {form.bank_account_holder}</p>}
              </div>
            )}
            <button type="submit" disabled={saving || !berubah} className={`${btnUtama} mt-auto w-full`}>{saving ? 'Menyimpan…' : 'Simpan Rekening'}</button>
          </div>
        </section>

        {/* QRIS statis */}
        <section className={`${kartu} order-2 lg:order-none`} aria-labelledby="judul-qris">
          <div className="flex items-center justify-between">
            <h2 id="judul-qris" className="text-lg font-bold">QRIS Statis</h2>
            {saved.qris_image_url
              ? <span className="flex items-center gap-1.5 text-xs font-bold text-[#16a34a]"><span className="size-2 rounded-full bg-[#16a34a]" />Aktif</span>
              : <span className="text-xs font-bold text-abu">Belum ada</span>}
          </div>
          <div className="mt-4 flex items-center gap-4 lg:flex-col">
            {saved.qris_image_url
              ? <img src={saved.qris_image_url} alt="QRIS yang tampil ke pelanggan" className="size-[136px] rounded-lg object-contain lg:size-[200px]" />
              : <div className="flex size-[136px] items-center justify-center rounded-lg bg-krem-field text-center text-xs font-semibold text-abu lg:size-[200px]">Belum ada gambar QRIS</div>}
            <label className={`flex cursor-pointer flex-col items-center gap-1 rounded-[16px] bg-krem-field px-4 py-3 text-center transition-colors hover:bg-[#ece4d6] focus-within:ring-2 focus-within:ring-ungu lg:w-full lg:py-6 ${uploading ? 'pointer-events-none opacity-60' : ''}`}>
              <Svg d="M12 16V4M7 9l5-5 5 5M4 20h16" className="size-5 text-ungu" />
              <span className="text-[15px] font-bold">{uploading ? 'Mengunggah…' : saved.qris_image_url ? 'Ganti gambar QRIS' : 'Unggah gambar QRIS'}</span>
              <span className="hidden text-xs font-medium text-abu lg:block">PNG/JPG maks 2 MB</span>
              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={unggah} disabled={uploading} />
            </label>
          </div>
          <p className="mt-4 hidden text-center text-[13px] font-medium text-abu lg:block">Pelanggan memasukkan nominal sendiri saat scan</p>
        </section>

        {/* Tutup tanggal */}
        <section className={`${kartu} order-1 lg:order-none`} aria-labelledby="judul-tutup">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="judul-tutup" className="text-lg font-bold">Tutup Tanggal</h2>
              <p className="text-[13px] font-medium text-abu">Otomatis nonaktif di Form PO</p>
            </div>
            <button type="button" onClick={() => setTambah((v) => !v)} aria-expanded={tambah} className="h-10 shrink-0 rounded-[10px] bg-ungu px-4 text-sm font-bold text-white">+ Tutup tanggal</button>
          </div>
          {tambah && (
            <div className="mt-3 flex gap-2">
              <label htmlFor="tgl-tutup" className="sr-only">Tanggal yang ditutup</label>
              <input id="tgl-tutup" type="date" min={addDays(todayJakarta(), 1)} value={tglBaru} onChange={(e) => setTglBaru(e.target.value)} className={fieldCls} />
              <button type="button" disabled={!tglBaru || !!busyDate} onClick={() => { toggle(tglBaru); setTglBaru(''); setTambah(false) }}
                className="h-12 shrink-0 rounded-[10px] bg-ungu-gelap px-4 text-sm font-bold text-white disabled:opacity-50">Tutup</button>
            </div>
          )}
          <p className="mt-3 text-xs font-medium text-abu">Klik tanggal untuk menutup atau membuka lagi.</p>
          <div className="mt-3"><Kalender closed={closed} onToggle={toggle} busy={busyDate} /></div>
          {closed.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {closed.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => toggle(c.closed_date, c)} aria-label={`Buka lagi ${labelTanggal(c.closed_date).panjang}`}
                    className="flex items-center gap-1 text-xs font-bold text-[#dc2626] hover:underline">
                    <Svg d="M6 6l12 12M18 6L6 18" className="size-3" />{labelTanggal(c.closed_date).panjang}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </form>
  )
}
