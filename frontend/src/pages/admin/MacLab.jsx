import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../../api/client'
import { rupiah } from '../../utils/format'

// MacLab: Nabila mengisi pesanan kolaborasi / mendadak langsung di dasbor.
// Harga item menu dihitung server. Total di layar ini hanya pratinjau.

const ITEM_TYPES = [
  ['menu', 'Menu'],
  ['item_bebas', 'Item bebas'],
  ['bundling', 'Bundling'],
  ['bonus', 'Bonus'],
  ['kolaborasi', 'Kolaborasi'],
]

const inputCls = 'w-full rounded-lg border border-abu-label bg-white px-3 py-2 text-sm'
const btnCls =
  'rounded-lg border border-abu-label px-3 py-1.5 text-sm font-semibold hover:bg-krem-field disabled:opacity-50'
const btnPrimaryCls =
  'rounded-lg bg-ungu-gelap px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50'
const errCls = 'mt-1 text-xs text-red-700'
const labelCls = 'block text-sm font-semibold'

const todayJakarta = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })

const newDelivery = () => ({ delivery_date: todayJakarta(), method: 'antar_nabila', address: '', shipping_fee: '' })
const newItem = (delivery_index = 0) => ({
  delivery_index,
  item_type: 'menu',
  menu_id: '',
  custom_name: '',
  unit_price: '',
  qty: '1',
  option_ids: [],
  note: '',
})

// details dari server: [{ field, message }] -> { field: message }
function fieldErrors(err) {
  const out = {}
  for (const d of err.details || []) out[d.field] = d.message
  return out
}

export default function MacLab() {
  const [menus, setMenus] = useState(null)
  const [loadError, setLoadError] = useState('')

  const [customerName, setCustomerName] = useState('')
  const [phone, setPhone] = useState('')
  const [payTiming, setPayTiming] = useState('di_muka')
  const [discount, setDiscount] = useState('')
  const [deliveries, setDeliveries] = useState([newDelivery()])
  const [items, setItems] = useState([newItem()])

  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [created, setCreated] = useState(null)
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
      setMenus(data.menus.filter((m) => m.is_available))
      setLoadError('')
    } catch (err) {
      setLoadError(err.message)
    }
  }, [])
  useEffect(() => {
    load()
  }, [load])

  const menuById = useMemo(() => new Map((menus || []).map((m) => [m.id, m])), [menus])

  // ---- Pratinjau total (server tetap menghitung ulang) ----
  const preview = useMemo(() => {
    let subtotal = 0
    for (const it of items) {
      const qty = Number(it.qty) || 0
      let unit = 0
      let extra = 0
      if (it.item_type === 'menu') {
        const menu = menuById.get(Number(it.menu_id))
        if (menu) {
          unit = menu.price
          extra = menu.options.filter((o) => it.option_ids.includes(o.id)).reduce((s, o) => s + o.extra_price, 0)
        }
      } else {
        unit = Number(it.unit_price) || 0
      }
      subtotal += qty * (unit + extra)
    }
    const shipping = deliveries.reduce(
      (s, d) => s + (d.method === 'antar_nabila' ? Number(d.shipping_fee) || 0 : 0),
      0
    )
    const disc = Number(discount) || 0
    return { subtotal, shipping, disc, grand: subtotal + shipping - disc }
  }, [items, deliveries, discount, menuById])

  // ---- Ubah state ----
  const setDelivery = (i, patch) => setDeliveries((l) => l.map((d, k) => (k === i ? { ...d, ...patch } : d)))
  const setItem = (i, patch) => setItems((l) => l.map((it, k) => (k === i ? { ...it, ...patch } : it)))

  function removeDelivery(i) {
    if (deliveries.length === 1) return
    setDeliveries((l) => l.filter((_, k) => k !== i))
    // item milik pengiriman yang dihapus pindah ke pengiriman 0; indeks sesudahnya bergeser satu
    setItems((l) =>
      l.map((it) => {
        if (it.delivery_index === i) return { ...it, delivery_index: 0 }
        if (it.delivery_index > i) return { ...it, delivery_index: it.delivery_index - 1 }
        return it
      })
    )
  }

  function changeMenu(i, menuId) {
    setItem(i, { menu_id: menuId, option_ids: [] })
  }

  // paling banyak satu opsi per kelompok (sama dengan aturan server)
  function toggleOption(i, menu, option) {
    const current = items[i].option_ids
    if (current.includes(option.id)) {
      setItem(i, { option_ids: current.filter((id) => id !== option.id) })
      return
    }
    const sameGroup = menu.options.filter((o) => o.option_group === option.option_group).map((o) => o.id)
    setItem(i, { option_ids: [...current.filter((id) => !sameGroup.includes(id)), option.id] })
  }

  function resetForm() {
    setCustomerName('')
    setPhone('')
    setPayTiming('di_muka')
    setDiscount('')
    setDeliveries([newDelivery()])
    setItems([newItem()])
    setErrors({})
    setFormError('')
  }

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    setErrors({})
    setFormError('')
    const payload = {
      customer_name: customerName.trim(),
      phone: phone.trim(),
      pay_timing: payTiming,
      discount: discount === '' ? 0 : Number(discount),
      deliveries: deliveries.map((d) => {
        const out = { delivery_date: d.delivery_date, method: d.method }
        if (d.method === 'antar_nabila') {
          out.address = d.address.trim()
          out.shipping_fee = d.shipping_fee === '' ? undefined : Number(d.shipping_fee)
        }
        return out
      }),
      items: items.map((it) => {
        const out = {
          delivery_index: it.delivery_index,
          item_type: it.item_type,
          qty: it.qty === '' ? undefined : Number(it.qty),
          note: it.note.trim(),
        }
        if (it.item_type === 'menu') {
          out.menu_id = it.menu_id === '' ? undefined : Number(it.menu_id)
          out.option_ids = it.option_ids
        } else {
          out.custom_name = it.custom_name.trim()
          out.unit_price = it.unit_price === '' ? undefined : Number(it.unit_price)
        }
        return out
      }),
    }
    try {
      const result = await api('/admin/orders', { method: 'POST', body: JSON.stringify(payload) })
      setCreated(result)
      resetForm()
      say('Pesanan dicatat')
    } catch (err) {
      const fe = fieldErrors(err)
      setErrors(fe)
      if (Object.keys(fe).length === 0) setFormError(err.message)
      else setFormError('Ada isian yang belum benar. Periksa kolom bertanda merah.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="mx-auto max-w-4xl space-y-4">
      <h1 className="text-xl font-bold">MacLab</h1>
      <p className="text-sm text-abu">
        Catat pesanan kolaborasi atau mendadak: item bebas, bundling, bonus, dan beberapa tanggal kirim.
      </p>

      <p role="status" className="min-h-5 text-sm text-abu">
        {notice}
      </p>

      {created && <CreatedCard order={created} onClose={() => setCreated(null)} />}

      {loadError && (
        <div className="rounded-lg bg-white p-4 text-sm">
          <p className="text-red-700">Menu gagal dimuat: {loadError}</p>
          <button type="button" className={`${btnCls} mt-2`} onClick={load}>
            Coba lagi
          </button>
        </div>
      )}
      {!menus && !loadError && <p className="text-sm text-abu">Memuat menu…</p>}

      {menus && (
        <form onSubmit={submit} className="space-y-4" noValidate>
          {/* Pelanggan */}
          <div className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
            <h2 className="font-bold">Pelanggan</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="ml-name" className={labelCls}>
                  Nama
                </label>
                <input
                  id="ml-name"
                  className={inputCls}
                  value={customerName}
                  maxLength={100}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
                {errors.customer_name && <p className={errCls}>{errors.customer_name}</p>}
              </div>
              <div>
                <label htmlFor="ml-phone" className={labelCls}>
                  Nomor HP (boleh kosong)
                </label>
                <input
                  id="ml-phone"
                  inputMode="tel"
                  className={inputCls}
                  value={phone}
                  placeholder="081234567890"
                  onChange={(e) => setPhone(e.target.value)}
                />
                {errors.phone && <p className={errCls}>{errors.phone}</p>}
              </div>
              <div>
                <label htmlFor="ml-pay" className={labelCls}>
                  Waktu bayar
                </label>
                <select id="ml-pay" className={inputCls} value={payTiming} onChange={(e) => setPayTiming(e.target.value)}>
                  <option value="di_muka">Bayar di muka</option>
                  <option value="setelah_kirim">Bayar setelah kirim</option>
                </select>
                {errors.pay_timing && <p className={errCls}>{errors.pay_timing}</p>}
              </div>
              <div>
                <label htmlFor="ml-disc" className={labelCls}>
                  Diskon (Rupiah)
                </label>
                <input
                  id="ml-disc"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  className={inputCls}
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
                {errors.discount && <p className={errCls}>{errors.discount}</p>}
              </div>
            </div>
          </div>

          {/* Pengiriman */}
          <div className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Pengiriman</h2>
              <button
                type="button"
                className={btnCls}
                disabled={deliveries.length >= 10}
                onClick={() => setDeliveries((l) => [...l, newDelivery()])}
              >
                Tambah pengiriman
              </button>
            </div>
            {errors.deliveries && <p className={errCls}>{errors.deliveries}</p>}

            {deliveries.map((d, i) => (
              <div key={i} className="space-y-3 rounded-lg border border-abu-label p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Pengiriman {i + 1}</p>
                  {deliveries.length > 1 && (
                    <button type="button" className={btnCls} onClick={() => removeDelivery(i)}>
                      Hapus
                    </button>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label htmlFor={`d-date-${i}`} className={labelCls}>
                      Tanggal kirim
                    </label>
                    <input
                      id={`d-date-${i}`}
                      type="date"
                      min={todayJakarta()}
                      className={inputCls}
                      value={d.delivery_date}
                      onChange={(e) => setDelivery(i, { delivery_date: e.target.value })}
                    />
                    {errors[`deliveries.${i}.delivery_date`] && (
                      <p className={errCls}>{errors[`deliveries.${i}.delivery_date`]}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor={`d-method-${i}`} className={labelCls}>
                      Cara antar
                    </label>
                    <select
                      id={`d-method-${i}`}
                      className={inputCls}
                      value={d.method}
                      onChange={(e) => setDelivery(i, { method: e.target.value })}
                    >
                      <option value="antar_nabila">Antar Nabila</option>
                      <option value="ambil_sendiri">Ambil Sendiri</option>
                    </select>
                  </div>
                  {d.method === 'antar_nabila' && (
                    <div>
                      <label htmlFor={`d-fee-${i}`} className={labelCls}>
                        Ongkir (Rupiah)
                      </label>
                      <input
                        id={`d-fee-${i}`}
                        type="number"
                        min="0"
                        step="1"
                        inputMode="numeric"
                        className={inputCls}
                        value={d.shipping_fee}
                        onChange={(e) => setDelivery(i, { shipping_fee: e.target.value })}
                      />
                      {errors[`deliveries.${i}.shipping_fee`] && (
                        <p className={errCls}>{errors[`deliveries.${i}.shipping_fee`]}</p>
                      )}
                    </div>
                  )}
                </div>
                {d.method === 'antar_nabila' && (
                  <div>
                    <label htmlFor={`d-addr-${i}`} className={labelCls}>
                      Alamat
                    </label>
                    <textarea
                      id={`d-addr-${i}`}
                      rows={2}
                      maxLength={300}
                      className={inputCls}
                      value={d.address}
                      onChange={(e) => setDelivery(i, { address: e.target.value })}
                    />
                    {errors[`deliveries.${i}.address`] && <p className={errCls}>{errors[`deliveries.${i}.address`]}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Item */}
          <div className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Item pesanan</h2>
              <button
                type="button"
                className={btnCls}
                disabled={items.length >= 50}
                onClick={() => setItems((l) => [...l, newItem(Math.min(l[l.length - 1].delivery_index, deliveries.length - 1))])}
              >
                Tambah item
              </button>
            </div>
            {errors.items && <p className={errCls}>{errors.items}</p>}

            {items.map((it, i) => {
              const menu = it.item_type === 'menu' ? menuById.get(Number(it.menu_id)) : null
              const err = (f) => errors[`items.${i}.${f}`]
              return (
                <div key={i} className="space-y-3 rounded-lg border border-abu-label p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">Item {i + 1}</p>
                    {items.length > 1 && (
                      <button type="button" className={btnCls} onClick={() => setItems((l) => l.filter((_, k) => k !== i))}>
                        Hapus
                      </button>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label htmlFor={`i-type-${i}`} className={labelCls}>
                        Jenis
                      </label>
                      <select
                        id={`i-type-${i}`}
                        className={inputCls}
                        value={it.item_type}
                        onChange={(e) => setItem(i, { item_type: e.target.value, menu_id: '', option_ids: [] })}
                      >
                        {ITEM_TYPES.map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor={`i-del-${i}`} className={labelCls}>
                        Dikirim di
                      </label>
                      <select
                        id={`i-del-${i}`}
                        className={inputCls}
                        value={it.delivery_index}
                        onChange={(e) => setItem(i, { delivery_index: Number(e.target.value) })}
                      >
                        {deliveries.map((d, k) => (
                          <option key={k} value={k}>
                            Pengiriman {k + 1}
                            {d.delivery_date ? ` (${d.delivery_date})` : ''}
                          </option>
                        ))}
                      </select>
                      {err('delivery_index') && <p className={errCls}>{err('delivery_index')}</p>}
                    </div>
                    <div>
                      <label htmlFor={`i-qty-${i}`} className={labelCls}>
                        Jumlah
                      </label>
                      <input
                        id={`i-qty-${i}`}
                        type="number"
                        min="1"
                        step="1"
                        inputMode="numeric"
                        className={inputCls}
                        value={it.qty}
                        onChange={(e) => setItem(i, { qty: e.target.value })}
                      />
                      {err('qty') && <p className={errCls}>{err('qty')}</p>}
                    </div>
                  </div>

                  {it.item_type === 'menu' ? (
                    <div className="space-y-2">
                      <div>
                        <label htmlFor={`i-menu-${i}`} className={labelCls}>
                          Menu
                        </label>
                        <select
                          id={`i-menu-${i}`}
                          className={inputCls}
                          value={it.menu_id}
                          onChange={(e) => changeMenu(i, e.target.value)}
                        >
                          <option value="">Pilih menu…</option>
                          {menus.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({rupiah(m.price)})
                            </option>
                          ))}
                        </select>
                        {err('menu_id') && <p className={errCls}>{err('menu_id')}</p>}
                      </div>
                      {menu && menu.options.length > 0 && (
                        <fieldset>
                          <legend className="text-sm font-semibold">Opsi (satu per kelompok)</legend>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {menu.options.map((o) => (
                              <label
                                key={o.id}
                                className="flex items-center gap-1.5 rounded-lg border border-abu-label px-2 py-1 text-xs"
                              >
                                <input
                                  type="checkbox"
                                  checked={it.option_ids.includes(o.id)}
                                  onChange={() => toggleOption(i, menu, o)}
                                />
                                {o.name}
                                {o.extra_price > 0 && <span className="text-abu">+{rupiah(o.extra_price)}</span>}
                              </label>
                            ))}
                          </div>
                          {err('option_ids') && <p className={errCls}>{err('option_ids')}</p>}
                        </fieldset>
                      )}
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label htmlFor={`i-name-${i}`} className={labelCls}>
                          Nama item
                        </label>
                        <input
                          id={`i-name-${i}`}
                          className={inputCls}
                          value={it.custom_name}
                          maxLength={100}
                          onChange={(e) => setItem(i, { custom_name: e.target.value })}
                        />
                        {err('custom_name') && <p className={errCls}>{err('custom_name')}</p>}
                      </div>
                      <div>
                        <label htmlFor={`i-price-${i}`} className={labelCls}>
                          Harga satuan (Rupiah, 0 untuk bonus)
                        </label>
                        <input
                          id={`i-price-${i}`}
                          type="number"
                          min="0"
                          step="1"
                          inputMode="numeric"
                          className={inputCls}
                          value={it.unit_price}
                          onChange={(e) => setItem(i, { unit_price: e.target.value })}
                        />
                        {err('unit_price') && <p className={errCls}>{err('unit_price')}</p>}
                      </div>
                    </div>
                  )}

                  <div>
                    <label htmlFor={`i-note-${i}`} className={labelCls}>
                      Catatan (boleh kosong)
                    </label>
                    <input
                      id={`i-note-${i}`}
                      className={inputCls}
                      value={it.note}
                      maxLength={500}
                      onChange={(e) => setItem(i, { note: e.target.value })}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pratinjau total */}
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <h2 className="font-bold">Pratinjau total</h2>
            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between">
                <dt>Subtotal</dt>
                <dd>{rupiah(preview.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Ongkir</dt>
                <dd>{rupiah(preview.shipping)}</dd>
              </div>
              {preview.disc > 0 && (
                <div className="flex justify-between">
                  <dt>Diskon</dt>
                  <dd>-{rupiah(preview.disc)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-abu-label pt-1 font-bold">
                <dt>Total</dt>
                <dd>{rupiah(preview.grand)}</dd>
              </div>
            </dl>
            <p className="mt-2 text-xs text-abu">Angka final dihitung server saat disimpan.</p>
          </div>

          {formError && (
            <p role="alert" className={errCls}>
              {formError}
            </p>
          )}

          <div className="flex gap-2">
            <button type="submit" className={btnPrimaryCls} disabled={saving}>
              {saving ? 'Menyimpan…' : 'Catat pesanan'}
            </button>
            <button type="button" className={btnCls} onClick={resetForm} disabled={saving}>
              Kosongkan
            </button>
          </div>
        </form>
      )}
    </section>
  )
}

function CreatedCard({ order, onClose }) {
  const statusLabel = {
    menunggu_pembayaran: 'Menunggu Pembayaran',
    diproses: 'Diproses',
  }
  return (
    <div role="status" className="space-y-2 rounded-xl border border-ungu-gelap bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-bold">Pesanan tercatat: {order.order_code}</h2>
        <button type="button" className={btnCls} onClick={onClose}>
          Tutup
        </button>
      </div>
      <p className="text-sm">
        Status: <strong>{statusLabel[order.status] || order.status}</strong>
      </p>
      <p className="text-sm">
        Total: <strong>{rupiah(order.totals.grand_total)}</strong> (subtotal {rupiah(order.totals.subtotal)}, ongkir{' '}
        {rupiah(order.totals.shipping_total)}
        {order.totals.discount > 0 ? `, diskon ${rupiah(order.totals.discount)}` : ''})
      </p>
    </div>
  )
}