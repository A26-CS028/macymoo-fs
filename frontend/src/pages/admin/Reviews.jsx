import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import Ikon from '../../components/admin/Ikon'
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

  const jumlah = (k) => (list ? list.filter((r) => r.moderation_status === k).length : '–')

  return (
    <div className="mx-auto max-w-[1180px] pb-10">
      <div className="hidden lg:block">
        <h1 className="text-[30px] font-extrabold">Moderasi & Privasi PDP</h1>
        <p className="text-sm font-medium text-abu">Tinjau ulasan dan penuhi permintaan anonimisasi data</p>
      </div>

      <div className="grid gap-4 lg:mt-5 lg:grid-cols-[650fr_420fr] lg:gap-5">
        <section className="lg:rounded-[20px] lg:bg-white lg:p-6" aria-labelledby="judul-moderasi">
          <div className="hidden items-start justify-between gap-3 lg:flex">
            <div>
              <h2 id="judul-moderasi" className="text-lg font-bold">Moderasi Ulasan Terverifikasi</h2>
              <p className="text-[13px] font-medium text-abu">Hanya dari link token, maks 7 hari setelah pesanan Selesai</p>
            </div>
            <p className="shrink-0 text-xs font-bold">Menunggu {jumlah('pending')} · Tampil {jumlah('approved')} · Disembunyikan {jumlah('rejected')}</p>
          </div>
          <div role="tablist" aria-label="Status ulasan" className="flex gap-5 border-b border-abu-label/40 text-sm font-semibold lg:mt-4">
            {TAB.map(([k, label]) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                className={`-mb-px border-b-2 pb-2 ${tab === k ? 'border-ungu-gelap text-ungu-gelap' : 'border-transparent text-abu hover:text-ungu-gelap'}`}>
                {label} {list && jumlah(k)}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs font-medium text-abu">Tolak hanya spam, kata kasar, atau data pribadi; bukan ulasan negatif.</p>

          {error && <p role="alert" className="mt-4 rounded-[10px] bg-[#fde8e8] px-4 py-3 text-sm font-semibold text-[#b91c1c]">{error}</p>}
          {!list && !error && <p role="status" className="py-8 text-center text-sm font-semibold text-abu">Memuat ulasan…</p>}
          {list && !shown.length && <p className="py-8 text-center text-sm font-semibold text-abu">Tidak ada ulasan di sini.</p>}

          <ul className="mt-4 flex flex-col gap-3">
        {shown.map((r) => (
          <li key={r.id} className="rounded-[18px] bg-white p-4 lg:bg-krem-field lg:p-5">
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
                <button type="button" disabled={busy === r.id} onClick={() => moderasi(r, 'approved')} className="h-10 flex-1 rounded-[10px] bg-ungu px-4 text-sm font-bold text-white disabled:opacity-50 lg:h-9 lg:flex-none">Tampilkan</button>
              )}
              {r.moderation_status !== 'rejected' && (
                <button type="button" disabled={busy === r.id} onClick={() => moderasi(r, 'rejected')} className="h-10 flex-1 rounded-[10px] bg-krem-field px-4 text-sm font-bold hover:bg-[#ece4d6] disabled:opacity-50 lg:h-9 lg:flex-none lg:bg-transparent lg:hover:bg-white">Sembunyikan</button>
              )}
            </div>
          </li>
        ))}
          </ul>
        </section>

        {/* Anonimisasi data pelanggan (UU PDP). shortcut: endpoint POST /admin/customers/anonymize belum dibuat; tempatnya disiapkan. */}
        <div className="flex flex-col gap-4 lg:gap-5">
          <section className="rounded-[20px] bg-white p-5 lg:p-6" aria-labelledby="judul-anonim">
            <div className="flex items-start justify-between gap-2">
              <h2 id="judul-anonim" className="text-lg font-bold">Anonimkan Data Pelanggan</h2>
              <span className="text-xs font-bold text-ungu">UU PDP</span>
            </div>
            <p className="mt-1 text-[13px] font-medium text-abu">Hapus jejak data pribadi atas permintaan pelanggan. Omzet & rekap tetap tersimpan.</p>
            <label htmlFor="anonim-hp" className="sr-only">Nomor HP pelanggan</label>
            <div className="relative mt-4">
              <Ikon d="cari" className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-abu" />
              <input id="anonim-hp" type="tel" inputMode="tel" disabled placeholder="0812-3456-7781"
                className="h-12 w-full rounded-[12px] bg-krem-field pl-11 pr-4 text-[15px] font-medium outline-none disabled:cursor-not-allowed" />
            </div>
            <button type="button" disabled title="Segera: endpoint anonimisasi belum tersedia"
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[12px] bg-[#dc2626] text-[15px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
              <Ikon d="anonim" />Anonimkan Nomor HP
            </button>
            <p className="mt-2 text-xs font-semibold text-[#dc2626]">Tindakan permanen dan tercatat di riwayat · fitur segera tersedia</p>
          </section>
          <section className="rounded-[20px] bg-white p-5 lg:p-6" aria-labelledby="judul-riwayat-anonim">
            <h2 id="judul-riwayat-anonim" className="text-lg font-bold">Riwayat anonimisasi</h2>
            <p className="mt-2 text-sm font-medium text-abu">Belum ada.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
