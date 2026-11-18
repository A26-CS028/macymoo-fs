import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../../api/client'
import { rupiah } from '../../utils/format'
import { menuPhoto, fallbackToLocal } from '../../utils/menuPhoto'

// Sama dengan OPTION_GROUPS di backend/src/validators/menu.js
const GROUP_LABEL = {
  pedas: 'Pedas',
  keju: 'Keju',
  ayam: 'Ayam',
  tanpa_makaroni: 'Tanpa makaroni',
  tanpa_brokoli: 'Tanpa brokoli',
}
const MAX_PHOTO = 2 * 1024 * 1024 // 2 MB, sama dengan batas server

const inputCls = 'w-full rounded-lg border border-abu-label bg-white px-3 py-2 text-sm'
const btnCls =
  'rounded-lg border border-abu-label px-3 py-1.5 text-sm font-semibold hover:bg-krem-field disabled:opacity-50'
const btnPrimaryCls =
  'rounded-lg bg-ungu-gelap px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50'
const errCls = 'mt-1 text-xs text-red-700'

// details dari server: [{ field, message }] -> { field: message }
function fieldErrors(err) {
  const out = {}
  for (const d of err.details || []) out[d.field] = d.message
  return out
}

export default function Menus() {
  const [menus, setMenus] = useState(null) // null = belum dimuat
  const [loadError, setLoadError] = useState('')
  const [editing, setEditing] = useState(null) // null | 'new' | id menu
  const [notice, setNotice] = useState('')
  const timer = useRef(null)

  const say = useCallback((msg) => {
    setNotice(msg)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setNotice(''), 3000)
  }, [])
  useEffect(() => () => clearTimeout(timer.current), [])

  const load = useCallback(async () => {
    try {
      const data = await api('/admin/menus')
      setMenus(data.menus)
      setLoadError('')
    } catch (err) {
      setLoadError(err.message)
    }
  }, [])
  useEffect(() => {
    load()
  }, [load])

  const replaceMenu = (updated) =>
    setMenus((list) => list.map((m) => (m.id === updated.id ? updated : m)))

  function handleSaved(saved, isNew) {
    if (isNew) setMenus((list) => [...list, saved])
    else replaceMenu(saved)
    setEditing(null)
    say(isNew ? 'Menu ditambahkan' : 'Perubahan disimpan')
  }

  async function toggleAvailable(menu) {
    try {
      const updated = await api(`/admin/menus/${menu.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_available: !menu.is_available }),
      })
      replaceMenu(updated)
      say(updated.is_available ? `${menu.name} ditandai tersedia` : `${menu.name} ditandai habis`)
    } catch (err) {
      say(err.message)
    }
  }

  const editingMenu = editing && editing !== 'new' ? menus?.find((m) => m.id === editing) : null

  return (
    <section className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Kelola menu</h1>
        <button type="button" className={btnPrimaryCls} onClick={() => setEditing('new')} disabled={!menus}>
          Tambah menu
        </button>
      </div>

      <p role="status" className="min-h-5 text-sm text-abu">
        {notice}
      </p>

      {editing && (
        <MenuForm
          key={editing}
          menu={editingMenu}
          onSaved={(saved) => handleSaved(saved, editing === 'new')}
          onCancel={() => setEditing(null)}
        />
      )}

      {loadError && (
        <div className="rounded-lg bg-white p-4 text-sm">
          <p className="text-red-700">Menu gagal dimuat: {loadError}</p>
          <button type="button" className={`${btnCls} mt-2`} onClick={load}>
            Coba lagi
          </button>
        </div>
      )}
      {!menus && !loadError && <p className="text-sm text-abu">Memuat menu…</p>}
      {menus?.length === 0 && (
        <p className="rounded-lg bg-white p-4 text-sm">Belum ada menu. Pilih Tambah menu untuk mulai.</p>
      )}

      <ul className="space-y-3">
        {menus?.map((menu) => (
          <li key={menu.id} className="rounded-xl bg-white p-4 shadow-sm">
            <div className="flex gap-3">
              <img
                src={menuPhoto(menu)}
                onError={fallbackToLocal(menu)}
                alt={`Foto ${menu.name}`}
                className="h-20 w-20 flex-none rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-bold">{menu.name}</h2>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      menu.is_available ? 'bg-krem-field' : 'border border-abu-label text-abu'
                    }`}
                  >
                    {menu.is_available ? 'Tersedia' : 'Habis'}
                  </span>
                </div>
                <p className="text-sm font-semibold">{rupiah(menu.price)}</p>
                {menu.description && <p className="mt-1 text-sm text-abu">{menu.description}</p>}
              </div>
              <div className="flex flex-none flex-col gap-2">
                <button type="button" className={btnCls} onClick={() => setEditing(menu.id)}>
                  Ubah
                </button>
                <button type="button" className={btnCls} onClick={() => toggleAvailable(menu)}>
                  {menu.is_available ? 'Tandai habis' : 'Tandai tersedia'}
                </button>
              </div>
            </div>
            <Options menu={menu} onChange={replaceMenu} say={say} />
          </li>
        ))}
      </ul>
    </section>
  )
}

// ---- Form tambah / ubah menu ----------------------------------------------

function MenuForm({ menu, onSaved, onCancel }) {
  const [name, setName] = useState(menu?.name ?? '')
  const [description, setDescription] = useState(menu?.description ?? '')
  const [price, setPrice] = useState(menu ? String(menu.price) : '')
  const [photoUrl, setPhotoUrl] = useState(menu?.photo_url ?? '')
  const [available, setAvailable] = useState(menu?.is_available ?? true)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')

  async function pickPhoto(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // boleh pilih file yang sama lagi
    if (!file) return
    if (file.size > MAX_PHOTO) {
      setErrors((p) => ({ ...p, photo_url: 'Ukuran foto maksimal 2 MB' }))
      return
    }
    setUploading(true)
    setErrors((p) => ({ ...p, photo_url: undefined }))
    try {
      const body = new FormData()
      body.append('purpose', 'menu_photo')
      body.append('file', file)
      const { url } = await api('/admin/uploads', { method: 'POST', body })
      setPhotoUrl(url)
    } catch (err) {
      setErrors((p) => ({ ...p, photo_url: err.message }))
    } finally {
      setUploading(false)
    }
  }

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    setErrors({})
    setFormError('')
    const payload = {
      name: name.trim(),
      description: description.trim(),
      price: price === '' ? undefined : Number(price),
      is_available: available,
    }
    // photo_url tidak boleh kosong di server, jadi hanya dikirim bila ada
    if (photoUrl) payload.photo_url = photoUrl
    try {
      const saved = await api(menu ? `/admin/menus/${menu.id}` : '/admin/menus', {
        method: menu ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      })
      onSaved(saved)
    } catch (err) {
      const fe = fieldErrors(err)
      setErrors(fe)
      if (Object.keys(fe).length === 0) setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl bg-white p-4 shadow-sm" noValidate>
      <h2 className="font-bold">{menu ? `Ubah ${menu.name}` : 'Tambah menu'}</h2>

      <div>
        <label htmlFor="menu-name" className="text-sm font-semibold">
          Nama
        </label>
        <input id="menu-name" className={inputCls} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
        {errors.name && <p className={errCls}>{errors.name}</p>}
      </div>

      <div>
        <label htmlFor="menu-desc" className="text-sm font-semibold">
          Deskripsi
        </label>
        <textarea
          id="menu-desc"
          className={inputCls}
          rows={2}
          maxLength={300}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        {errors.description && <p className={errCls}>{errors.description}</p>}
      </div>

      <div>
        <label htmlFor="menu-price" className="text-sm font-semibold">
          Harga (Rupiah)
        </label>
        <input
          id="menu-price"
          type="number"
          min="0"
          step="1"
          inputMode="numeric"
          className={inputCls}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        {errors.price && <p className={errCls}>{errors.price}</p>}
      </div>

      <div>
        <label htmlFor="menu-photo" className="text-sm font-semibold">
          Foto (JPG, PNG, atau WebP, maks 2 MB)
        </label>
        <div className="mt-1 flex items-center gap-3">
          {photoUrl && <img src={photoUrl} alt="Pratinjau foto" className="h-16 w-16 rounded-lg object-cover" />}
          <input id="menu-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={pickPhoto} className="text-sm" />
        </div>
        {uploading && <p className="mt-1 text-xs text-abu">Mengunggah foto…</p>}
        {errors.photo_url && <p className={errCls}>{errors.photo_url}</p>}
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} />
        Tersedia untuk dipesan
      </label>

      {formError && (
        <p role="alert" className={errCls}>
          {formError}
        </p>
      )}

      <div className="flex gap-2">
        <button type="submit" className={btnPrimaryCls} disabled={saving || uploading}>
          {saving ? 'Menyimpan…' : 'Simpan'}
        </button>
        <button type="button" className={btnCls} onClick={onCancel} disabled={saving}>
          Batal
        </button>
      </div>
    </form>
  )
}

// ---- Opsi menu -------------------------------------------------------------

function Options({ menu, onChange, say }) {
  const [group, setGroup] = useState('pedas')
  const [name, setName] = useState('')
  const [extra, setExtra] = useState('0')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  function updateOption(option) {
    onChange({ ...menu, options: menu.options.map((o) => (o.id === option.id ? option : o)) })
  }

  async function add(e) {
    e.preventDefault()
    setAdding(true)
    setError('')
    try {
      const option = await api(`/admin/menus/${menu.id}/options`, {
        method: 'POST',
        body: JSON.stringify({ option_group: group, name: name.trim(), extra_price: Number(extra) }),
      })
      onChange({ ...menu, options: [...menu.options, option] })
      setName('')
      setExtra('0')
      say('Opsi ditambahkan')
    } catch (err) {
      const fe = fieldErrors(err)
      setError(Object.values(fe)[0] || err.message)
    } finally {
      setAdding(false)
    }
  }

  return (
    <details className="mt-3 border-t border-abu-label pt-3">
      <summary className="cursor-pointer text-sm font-semibold">Opsi ({menu.options.length})</summary>

      {menu.options.length === 0 && <p className="mt-2 text-sm text-abu">Belum ada opsi.</p>}
      <ul className="mt-2 space-y-2">
        {menu.options.map((o) => (
          <OptionRow key={o.id} menuId={menu.id} option={o} onSaved={updateOption} say={say} />
        ))}
      </ul>

      <form onSubmit={add} className="mt-3 flex flex-wrap items-end gap-2" noValidate>
        <div>
          <label htmlFor={`g-${menu.id}`} className="block text-xs font-semibold">
            Kelompok
          </label>
          <select id={`g-${menu.id}`} className={inputCls} value={group} onChange={(e) => setGroup(e.target.value)}>
            {Object.entries(GROUP_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`n-${menu.id}`} className="block text-xs font-semibold">
            Nama opsi
          </label>
          <input id={`n-${menu.id}`} className={inputCls} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="w-28">
          <label htmlFor={`e-${menu.id}`} className="block text-xs font-semibold">
            Harga tambahan
          </label>
          <input
            id={`e-${menu.id}`}
            type="number"
            min="0"
            step="1"
            className={inputCls}
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
          />
        </div>
        <button type="submit" className={btnCls} disabled={adding}>
          {adding ? 'Menambah…' : 'Tambah opsi'}
        </button>
      </form>
      {error && (
        <p role="alert" className={errCls}>
          {error}
        </p>
      )}
    </details>
  )
}

function OptionRow({ menuId, option, onSaved, say }) {
  const [name, setName] = useState(option.name)
  const [extra, setExtra] = useState(String(option.extra_price))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const dirty = name.trim() !== option.name || Number(extra) !== option.extra_price

  async function save() {
    setSaving(true)
    setError('')
    try {
      const saved = await api(`/admin/menus/${menuId}/options/${option.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: name.trim(), extra_price: Number(extra) }),
      })
      onSaved(saved)
      say('Opsi disimpan')
    } catch (err) {
      const fe = fieldErrors(err)
      setError(Object.values(fe)[0] || err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <li>
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-32 flex-none text-xs text-abu">{GROUP_LABEL[option.option_group] || option.option_group}</span>
        <input
          aria-label={`Nama opsi ${option.name}`}
          className={`${inputCls} w-auto flex-1`}
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          aria-label={`Harga tambahan ${option.name}`}
          type="number"
          min="0"
          step="1"
          className={`${inputCls} w-28`}
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
        />
        <button type="button" className={btnCls} onClick={save} disabled={!dirty || saving}>
          {saving ? 'Menyimpan…' : 'Simpan'}
        </button>
      </div>
      {error && (
        <p role="alert" className={errCls}>
          {error}
        </p>
      )}
    </li>
  )
}