import { useCallback, useEffect, useState } from 'react'
import { api } from '../../api/client'
import { rupiah } from '../../utils/format'
import { menuPhoto, fallbackToLocal } from '../../utils/menuPhoto'
import Modal, { ErrorBox, btnSekunder, btnUtama, fieldCls, labelCls } from '../../components/admin/Modal'

// Kelola Menu & Harga (Figma: Admin — Kelola Menu & Harga / Mobile — Kelola Menu & Harga).
// Harga dan status Tersedia diubah di kartu lalu disimpan (per kartu atau Simpan Semua); foto langsung tersimpan.
// Nama, deskripsi, dan opsi lewat "Detail & opsi". Pesanan lama tetap memakai harga saat dipesan (unit_price).
// shortcut: "Riwayat Perubahan Harga" dari Figma belum ada karena belum ada endpoint riwayatnya.
const GROUP_LABEL = { pedas: 'Pedas', keju: 'Keju', ayam: 'Ayam', tanpa_makaroni: 'Tanpa makaroni', tanpa_brokoli: 'Tanpa brokoli' } // = OPTION_GROUPS backend
const MAX_PHOTO = 2 * 1024 * 1024 // sama dengan batas server
const angka = (s) => Number(String(s).replace(/\D/g, '')) || 0
const fieldErrors = (err) => Object.fromEntries((err.details || []).map((d) => [d.field, d.message]))
const Svg = ({ d, className = 'size-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
)
const IKON_FOTO = 'M4 5h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1zM8.5 11a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM21 15l-5-5L5 19'

async function unggahFoto(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Foto harus JPG, PNG, atau WebP')
  if (file.size > MAX_PHOTO) throw new Error('Ukuran foto maksimal 2 MB')
  const body = new FormData()
  body.append('purpose', 'menu_photo')
  body.append('file', file)
  return (await api('/admin/uploads', { method: 'POST', body })).url
}

function Toggle({ on, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className={`relative h-8 w-14 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ungu focus-visible:ring-offset-2 ${on ? 'bg-ungu' : 'bg-[#ddd5ec]'}`}>
      <span className={`absolute top-1 size-6 rounded-full bg-white shadow transition-[left] ${on ? 'left-7' : 'left-1'}`} />
    </button>
  )
}

function GantiFoto({ menu, onSaved, onError, className, children }) {
  const [busy, setBusy] = useState(false)
  async function pilih(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      const url = await unggahFoto(file)
      onSaved(await api(`/admin/menus/${menu.id}`, { method: 'PATCH', body: JSON.stringify({ photo_url: url }) }), `Foto ${menu.name} diganti`)
    } catch (err) {
      onError(err)
    } finally {
      setBusy(false)
    }
  }
  return (
    <label className={`cursor-pointer focus-within:ring-2 focus-within:ring-ungu ${busy ? 'pointer-events-none opacity-60' : ''} ${className}`}>
      {busy ? 'Mengunggah…' : children}
      <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={pilih} disabled={busy} aria-label={`Ganti foto ${menu.name}`} />
    </label>
  )
}

export default function Menus() {
  const [menus, setMenus] = useState(null)
  const [draft, setDraft] = useState({}) // { [id]: { price, is_available } } yang belum disimpan
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(null) // id | 'semua'
  const [detail, setDetail] = useState(null) // menu | 'baru'

  const load = useCallback(() => api('/admin/menus').then((d) => setMenus(d.menus)).catch(setError), [])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(''), 4000)
    return () => clearTimeout(t)
  }, [notice])

  const nilai = (m) => ({ price: m.price, is_available: m.is_available, ...draft[m.id] })
  const ubah = (m, patch) => setDraft((d) => {
    const next = { ...nilai(m), ...patch }
    const sama = next.price === m.price && next.is_available === m.is_available
    const out = { ...d }
    if (sama) delete out[m.id]
    else out[m.id] = next
    return out
  })
  const replace = (saved) => setMenus((l) => l.map((m) => (m.id === saved.id ? saved : m)))
  const terima = useCallback((saved, msg) => { replace(saved); setNotice(msg); setError(null) }, [])

  async function simpan(ids) {
    setSaving(ids.length > 1 ? 'semua' : ids[0]); setError(null)
    try {
      for (const id of ids) {
        const m = menus.find((x) => x.id === id)
        const v = nilai(m)
        if (!v.price || v.price < 1) throw new Error(`Harga ${m.name} belum diisi`)
        replace(await api(`/admin/menus/${id}`, { method: 'PATCH', body: JSON.stringify({ price: v.price, is_available: v.is_available }) }))
        setDraft((d) => { const out = { ...d }; delete out[id]; return out })
      }
      setNotice(ids.length > 1 ? 'Semua perubahan disimpan' : `${menus.find((x) => x.id === ids[0]).name} disimpan`)
    } catch (err) {
      setError(err)
    } finally {
      setSaving(null)
    }
  }

  const kotor = Object.keys(draft).map(Number)

  return (
    <div className={`mx-auto max-w-[1180px] ${kotor.length ? 'pb-28 lg:pb-10' : 'pb-10'}`}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-extrabold lg:text-[30px]">Kelola Menu & Harga</h1>
          <p className="text-sm font-medium text-abu">Ubah harga, ganti foto, dan atur status Tersedia / Habis</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setDetail('baru')} className="h-11 rounded-[10px] bg-white px-4 text-[15px] font-bold">+ Tambah menu</button>
          <button type="button" onClick={() => simpan(kotor)} disabled={!kotor.length || !!saving} className={`${btnUtama} hidden h-11 lg:flex`}>
            {saving === 'semua' ? 'Menyimpan…' : 'Simpan Semua'}
          </button>
        </div>
      </div>

      {notice && <p role="status" className="mt-4 rounded-[10px] bg-ungu-gelap px-4 py-3 text-sm font-bold text-white">✓ {notice}</p>}
      {error && <div className="mt-4"><ErrorBox error={error} /></div>}
      {!menus && !error && <p role="status" className="py-8 text-center text-sm font-semibold text-abu">Memuat menu…</p>}
      {menus?.length === 0 && <p className="mt-5 rounded-[16px] bg-white p-5 text-sm font-semibold">Belum ada menu. Pilih + Tambah menu untuk mulai.</p>}

      <ul className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4 lg:gap-5">
        {menus?.map((m) => {
          const v = nilai(m)
          const berubah = !!draft[m.id]
          const naik = v.price !== m.price && v.price > 0
          return (
            <li key={m.id} className="flex gap-3 rounded-[20px] bg-white p-4 lg:flex-col lg:gap-0">
              <div className="relative shrink-0">
                <img src={menuPhoto(m)} onError={fallbackToLocal(m)} alt={`Foto ${m.name}`}
                  className="size-20 rounded-[14px] bg-krem-field object-contain lg:h-[170px] lg:w-full lg:rounded-[16px]" />
                <GantiFoto menu={m} onSaved={terima} onError={setError}
                  className="absolute bottom-2.5 left-2.5 hidden items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold shadow-sm lg:flex">
                  <Svg d={IKON_FOTO} />Ganti foto
                </GantiFoto>
              </div>

              <div className="min-w-0 flex-1 lg:mt-4 lg:flex lg:flex-col">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-lg font-extrabold leading-tight lg:text-[22px]">{m.name}</h2>
                  <span className={`hidden items-center gap-1.5 whitespace-nowrap text-xs font-bold lg:flex ${v.is_available ? 'text-[#16a34a]' : 'text-[#dc2626]'}`}>
                    <span className={`size-2 rounded-full ${v.is_available ? 'bg-[#16a34a]' : 'bg-[#dc2626]'}`} />{v.is_available ? 'Tersedia' : 'Habis'}
                  </span>
                </div>
                <label htmlFor={`harga-${m.id}`} className="mt-3 hidden text-sm font-semibold lg:block">Harga</label>
                <input id={`harga-${m.id}`} inputMode="numeric" aria-label={`Harga ${m.name}`} value={v.price ? rupiah(v.price) : ''}
                  onChange={(e) => ubah(m, { price: angka(e.target.value) })} placeholder="Rp0"
                  className="mt-1 h-11 w-full max-w-[200px] rounded-[10px] bg-krem-field px-3 text-[17px] font-bold outline-none focus:ring-2 focus:ring-ungu lg:mt-2 lg:h-12 lg:max-w-none lg:text-base lg:font-medium" />
                <p className={`mt-1.5 text-xs font-medium ${naik ? 'text-ungu' : 'text-abu'}`}>
                  {naik ? `${v.price > m.price ? 'Naik' : 'Turun'} dari ${rupiah(m.price)} · berlaku untuk pesanan berikutnya` : 'Harga baru berlaku untuk pesanan berikutnya'}
                </p>
                <div className="mt-1 flex flex-wrap gap-x-3 text-xs font-bold text-ungu lg:hidden">
                  <GantiFoto menu={m} onSaved={terima} onError={setError} className="underline-offset-2 hover:underline">Ganti foto</GantiFoto>
                  <button type="button" onClick={() => setDetail(m)} className="underline-offset-2 hover:underline">Detail & opsi</button>
                </div>

                <div className="mt-3 hidden items-center justify-between rounded-[12px] bg-krem-field px-3 py-2.5 lg:flex">
                  <span className="text-sm font-semibold">Tersedia hari ini</span>
                  <Toggle on={v.is_available} onChange={(on) => ubah(m, { is_available: on })} label={`${m.name} tersedia`} />
                </div>
                <button type="button" onClick={() => setDetail(m)} className="mt-3 hidden text-left text-xs font-bold text-ungu hover:underline lg:block">
                  Detail & opsi ({m.options.length} opsi)
                </button>
                <button type="button" onClick={() => simpan([m.id])} disabled={!berubah || !!saving}
                  className={`mt-auto hidden h-10 rounded-[10px] text-sm font-bold transition-colors lg:mt-4 lg:block ${berubah ? 'bg-ungu text-white' : 'bg-krem-field text-ungu-gelap disabled:opacity-60'}`}>
                  {saving === m.id ? 'Menyimpan…' : berubah ? 'Simpan perubahan' : 'Simpan'}
                </button>
              </div>

              {/* HP: tombol status di kanan */}
              <div className="flex shrink-0 flex-col items-center gap-1 lg:hidden">
                <Toggle on={v.is_available} onChange={(on) => ubah(m, { is_available: on })} label={`${m.name} tersedia`} />
                <span className={`text-xs font-bold ${v.is_available ? 'text-[#16a34a]' : 'text-[#dc2626]'}`}>{v.is_available ? 'Tersedia' : 'Habis'}</span>
              </div>
            </li>
          )
        })}
      </ul>

      {menus?.length > 0 && (
        <p className="mt-5 flex items-start gap-3 rounded-[20px] bg-kuning p-5 text-[15px] font-bold lg:mt-6">
          <Svg d="M12 11v5M12 8h.01M12 21a9 9 0 100-18 9 9 0 000 18z" className="mt-0.5 size-5 shrink-0" />
          Status Habis langsung menonaktifkan tombol pilih di katalog pelanggan. Pesanan lama tetap memakai harga saat dipesan.
        </p>
      )}

      {/* HP: simpan semua perubahan */}
      {kotor.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 bg-white p-4 shadow-[0_-8px_24px_rgba(30,5,77,0.08)] lg:hidden">
          <button type="button" onClick={() => simpan(kotor)} disabled={!!saving} className={`${btnUtama} h-14 w-full text-[17px]`}>
            {saving ? 'Menyimpan…' : `Simpan perubahan (${kotor.length})`}
          </button>
        </div>
      )}

      {detail && (
        <DetailMenu menu={detail === 'baru' ? null : menus.find((m) => m.id === detail.id)} onClose={() => setDetail(null)}
          onSaved={(saved, baru) => {
            setMenus((l) => (baru ? [...l, saved] : l.map((m) => (m.id === saved.id ? saved : m))))
            setNotice(baru ? `${saved.name} ditambahkan` : `${saved.name} disimpan`)
            if (baru) setDetail(null)
          }} />
      )}
    </div>
  )
}

// ---- Detail menu: tambah menu baru, atau ubah nama/deskripsi dan opsi -------

function DetailMenu({ menu, onClose, onSaved }) {
  const baru = !menu
  const [name, setName] = useState(menu?.name ?? '')
  const [description, setDescription] = useState(menu?.description ?? '')
  const [price, setPrice] = useState(menu?.price ?? 0)
  const [photoUrl, setPhotoUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [error, setError] = useState(null)

  async function pilihFoto(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true); setError(null)
    try { setPhotoUrl(await unggahFoto(file)) } catch (err) { setError(err) } finally { setUploading(false) }
  }

  async function submit(e) {
    e.preventDefault()
    setSaving(true); setErrors({}); setError(null)
    const body = baru
      ? { name: name.trim(), description: description.trim(), price, is_available: true, ...(photoUrl && { photo_url: photoUrl }) }
      : { name: name.trim(), description: description.trim() }
    try {
      onSaved(await api(baru ? '/admin/menus' : `/admin/menus/${menu.id}`, { method: baru ? 'POST' : 'PATCH', body: JSON.stringify(body) }), baru)
    } catch (err) {
      const fe = fieldErrors(err)
      setErrors(fe)
      if (!Object.keys(fe).length) setError(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={baru ? 'Tambah menu' : `Detail ${menu.name}`} subtitle={baru ? 'Menu baru langsung tampil di katalog pelanggan' : 'Nama, deskripsi, dan opsi menu'}
      onClose={onClose} titleId="judul-detail-menu" width="lg:w-[640px]">
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <div>
          <label htmlFor="menu-name" className={labelCls}>Nama</label>
          <input id="menu-name" className={fieldCls} maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
          {errors.name && <p className="mt-1 text-xs font-semibold text-[#dc2626]">{errors.name}</p>}
        </div>
        <div>
          <label htmlFor="menu-desc" className={labelCls}>Deskripsi</label>
          <textarea id="menu-desc" rows={2} maxLength={300} value={description} onChange={(e) => setDescription(e.target.value)}
            className={`${fieldCls} h-auto resize-none py-3`} />
          {errors.description && <p className="mt-1 text-xs font-semibold text-[#dc2626]">{errors.description}</p>}
        </div>
        {baru && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="menu-price" className={labelCls}>Harga</label>
              <input id="menu-price" inputMode="numeric" className={fieldCls} value={price ? rupiah(price) : ''} placeholder="Rp0" onChange={(e) => setPrice(angka(e.target.value))} />
              {errors.price && <p className="mt-1 text-xs font-semibold text-[#dc2626]">{errors.price}</p>}
            </div>
            <div>
              <span className={labelCls}>Foto (JPG/PNG/WebP, maks 2 MB)</span>
              <label className={`flex h-12 cursor-pointer items-center gap-2 rounded-[10px] bg-krem-field px-4 text-sm font-bold focus-within:ring-2 focus-within:ring-ungu ${uploading ? 'opacity-60' : ''}`}>
                {photoUrl ? <img src={photoUrl} alt="" className="size-8 rounded object-cover" /> : <Svg d={IKON_FOTO} className="size-5 text-ungu" />}
                {uploading ? 'Mengunggah…' : photoUrl ? 'Ganti foto' : 'Pilih foto'}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={pilihFoto} disabled={uploading} />
              </label>
            </div>
          </div>
        )}
        <ErrorBox error={error} />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btnSekunder}>{baru ? 'Batal' : 'Tutup'}</button>
          <button type="submit" disabled={saving || uploading} className={btnUtama}>{saving ? 'Menyimpan…' : baru ? 'Tambah menu' : 'Simpan nama & deskripsi'}</button>
        </div>
      </form>
      {!baru && <Opsi menu={menu} onChange={(m) => onSaved(m, false)} />}
    </Modal>
  )
}

function Opsi({ menu, onChange }) {
  const [group, setGroup] = useState('pedas')
  const [name, setName] = useState('')
  const [extra, setExtra] = useState(0)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  async function add(e) {
    e.preventDefault()
    setAdding(true); setError('')
    try {
      const option = await api(`/admin/menus/${menu.id}/options`, { method: 'POST', body: JSON.stringify({ option_group: group, name: name.trim(), extra_price: extra }) })
      onChange({ ...menu, options: [...menu.options, option] })
      setName(''); setExtra(0)
    } catch (err) {
      setError(Object.values(fieldErrors(err))[0] || err.message)
    } finally {
      setAdding(false)
    }
  }

  return (
    <section className="mt-6 border-t border-krem-field pt-5" aria-labelledby="judul-opsi">
      <h3 id="judul-opsi" className="text-lg font-bold">Opsi ({menu.options.length})</h3>
      {!menu.options.length && <p className="mt-2 text-sm font-medium text-abu">Belum ada opsi.</p>}
      <ul className="mt-3 flex flex-col gap-2">
        {menu.options.map((o) => (
          <BarisOpsi key={o.id} menuId={menu.id} option={o} onSaved={(saved) => onChange({ ...menu, options: menu.options.map((x) => (x.id === saved.id ? saved : x)) })} />
        ))}
      </ul>
      <form onSubmit={add} className="mt-4 grid gap-2 rounded-[14px] bg-krem-field p-3 sm:grid-cols-[140px_1fr_120px_auto] sm:items-end" noValidate>
        <div>
          <label htmlFor="opsi-grup" className="mb-1 block text-xs font-bold">Kelompok</label>
          <select id="opsi-grup" value={group} onChange={(e) => setGroup(e.target.value)} className="h-10 w-full rounded-[8px] bg-white px-2 text-sm font-medium outline-none focus:ring-2 focus:ring-ungu">
            {Object.entries(GROUP_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="opsi-nama" className="mb-1 block text-xs font-bold">Nama opsi</label>
          <input id="opsi-nama" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} className="h-10 w-full rounded-[8px] bg-white px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-ungu" />
        </div>
        <div>
          <label htmlFor="opsi-harga" className="mb-1 block text-xs font-bold">Harga tambahan</label>
          <input id="opsi-harga" inputMode="numeric" value={rupiah(extra)} onChange={(e) => setExtra(angka(e.target.value))} className="h-10 w-full rounded-[8px] bg-white px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-ungu" />
        </div>
        <button type="submit" disabled={adding || !name.trim()} className="h-10 rounded-[8px] bg-ungu-gelap px-4 text-sm font-bold text-white disabled:opacity-50">{adding ? 'Menambah…' : '+ Tambah'}</button>
      </form>
      {error && <p role="alert" className="mt-2 text-xs font-semibold text-[#dc2626]">{error}</p>}
    </section>
  )
}

function BarisOpsi({ menuId, option, onSaved }) {
  const [name, setName] = useState(option.name)
  const [extra, setExtra] = useState(option.extra_price)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const dirty = name.trim() !== option.name || extra !== option.extra_price

  async function save() {
    setSaving(true); setError('')
    try {
      onSaved(await api(`/admin/menus/${menuId}/options/${option.id}`, { method: 'PATCH', body: JSON.stringify({ name: name.trim(), extra_price: extra }) }))
    } catch (err) {
      setError(Object.values(fieldErrors(err))[0] || err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <li>
      <div className="grid grid-cols-[1fr_96px_auto] items-center gap-2 sm:grid-cols-[110px_1fr_110px_auto]">
        <span className="col-span-3 text-xs font-bold text-abu sm:col-span-1">{GROUP_LABEL[option.option_group] || option.option_group}</span>
        <input aria-label={`Nama opsi ${option.name}`} maxLength={60} value={name} onChange={(e) => setName(e.target.value)}
          className="h-10 min-w-0 rounded-[8px] bg-krem-field px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-ungu" />
        <input aria-label={`Harga tambahan ${option.name}`} inputMode="numeric" value={rupiah(extra)} onChange={(e) => setExtra(angka(e.target.value))}
          className="h-10 min-w-0 rounded-[8px] bg-krem-field px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-ungu" />
        <button type="button" onClick={save} disabled={!dirty || saving} className="h-10 rounded-[8px] px-3 text-sm font-bold text-ungu hover:bg-krem-field disabled:text-abu disabled:opacity-60">
          {saving ? '…' : 'Simpan'}
        </button>
      </div>
      {error && <p role="alert" className="mt-1 text-xs font-semibold text-[#dc2626]">{error}</p>}
    </li>
  )
}
