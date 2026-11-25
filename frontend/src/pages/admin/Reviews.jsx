import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import bintang from '../../assets/landing/icon-bintang.svg'
import bintangKosong from '../../assets/landing/icon-bintang-kosong.svg'

// Moderasi Ulasan (Figma: Moderasi & Privasi PDP, bagian ulasan). Tolak hanya spam, kata kasar,
// atau data pribadi; bukan ulasan negatif. Ulasan yang tampil ada di beranda ("Kata mereka").
const TAB = [['pending', 'Menunggu'], ['approved', 'Tampil'], ['rejected', 'Disembunyikan']]
const tgl = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })
// Penanda bantu: kemungkinan nomor HP di komentar (data pribadi)
const adaNomor = (s) => /(?:\+?62|0)8[\d\s-]{7,}/.test(s || '')

export default function Reviews() {
  const [list, setList] = useState(null)
  const [tab, setTab] = useState('pending')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(null)

  const load = () => api('/admin/reviews').then((r) => setList(r.reviews)).catch((e) => setError(e.message))
  useEffect(() => { load() }, [])

  async function moderasi(r, status) {
    setBusy(r.id); setError('')
    try {
      const updated = await api(`/admin/reviews/${r.id}`, { method: 'PATCH', body: JSON.stringify({ moderation_status: status }) })
      setList((l) => l.map((x) => (x.id === r.id ? updated : x)))
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(null)
    }
  }

  const shown = (list || []).filter((r) => r.moderation_status === tab)

  return (
    <div className="mx-auto max-w-[900px] pb-10">
      <h1 className="text-[26px] font-extrabold lg:text-[30px]">Moderasi Ulasan</h1>
      <p className="text-sm font-medium text-abu">Hanya dari link token, maks 7 hari setelah pesanan Selesai. Tolak hanya spam, kata kasar, atau data pribadi.</p>

      <div role="tablist" aria-label="Status ulasan" className="mt-4 flex gap-5 border-b border-abu-label/40 text-sm font-semibold">
        {TAB.map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`-mb-px border-b-2 pb-2 ${tab === k ? 'border-ungu-gelap text-ungu-gelap' : 'border-transparent text-abu hover:text-ungu-gelap'}`}>
            {label} {list && list.filter((r) => r.moderation_status === k).length}
          </button>
        ))}
      </div>

      {error && <p role="alert" className="mt-4 rounded-[10px] bg-[#fde8e8] px-4 py-3 text-sm font-semibold text-[#b91c1c]">{error}</p>}
      {!list && !error && <p role="status" className="py-8 text-center text-sm font-semibold text-abu">Memuat ulasan…</p>}
      {list && !shown.length && <p className="py-8 text-center text-sm font-semibold text-abu">Tidak ada ulasan di sini.</p>}

      <ul className="mt-4 flex flex-col gap-3">
        {shown.map((r) => (
          <li key={r.id} className="rounded-[18px] bg-white p-4 lg:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex gap-0.5" role="img" aria-label={`${r.rating} dari 5 bintang`}>
                  {[1, 2, 3, 4, 5].map((n) => <img key={n} src={n <= r.rating ? bintang : bintangKosong} alt="" className="size-4" />)}
                </span>
                <span className="text-sm font-bold text-ungu">{r.order_code}</span>
              </div>
              <span className="text-xs font-medium text-abu">{tgl.format(new Date(r.created_at))}</span>
            </div>
            <p className="mt-2 text-[15px] font-medium">{r.comment || <span className="text-abu">Tanpa komentar</span>}</p>
            {adaNomor(r.comment) && <p className="mt-1 text-xs font-bold text-[#d97706]">⚠ Terdeteksi nomor HP · sembunyikan bila berisi data pribadi</p>}
            <div className="mt-3 flex gap-2">
              {r.moderation_status !== 'approved' && (
                <button type="button" disabled={busy === r.id} onClick={() => moderasi(r, 'approved')} className="h-9 rounded-[10px] bg-ungu px-4 text-sm font-bold text-white disabled:opacity-50">Tampilkan</button>
              )}
              {r.moderation_status !== 'rejected' && (
                <button type="button" disabled={busy === r.id} onClick={() => moderasi(r, 'rejected')} className="h-9 rounded-[10px] px-4 text-sm font-bold hover:bg-krem-field disabled:opacity-50">Sembunyikan</button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
