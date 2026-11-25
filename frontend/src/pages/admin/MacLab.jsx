import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client'
import { rupiah } from '../../utils/format'
import { todayJakarta, labelTanggal } from '../../utils/date'
import { fieldCls, labelCls } from '../../components/admin/Modal'

// MacLab / Form Pesanan Besar (Figma: Admin — Form Pesanan Besar / Mobile — Pesanan besar).
// Pesanan kolaborasi atau mendadak: item menu, item bebas, bundling, bonus; satu invoice, beberapa tanggal kirim.
// Harga item menu dihitung server; total di layar ini hanya pratinjau.
// shortcut: "Jenis" pesanan, DP, dan "Simpan draf" dari Figma tidak ada di kontrak; DP dicatat lewat Catat Pembayaran.
const ITEM_TYPES = [['menu', 'Menu standar'], ['item_bebas', 'Item bebas'], ['bundling', 'Bundling'], ['bonus', 'Bonus'], ['kolaborasi', 'Kolaborasi']]
const JENIS_CLS = { menu: 'text-ungu', bonus: 'text-[#15803d]' }
const angka = (s) => String(s).replace(/\D/g, '').slice(0, 9)
const kecil = 'h-10 w-full min-w-0 rounded-[8px] bg-white px-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-ungu'
const errCls = 'mt-1 text-xs font-semibold text-[#dc2626]'
const Svg = ({ d, className = 'size-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
)
const TRUK = 'M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a2 2 0 100-4 2 2 0 000 4zM17 19a2 2 0 100-4 2 2 0 000 4z'

const newDelivery = () => ({ delivery_date: todayJakarta(), method: 'antar_nabila', address: '', shipping_fee: '' })
const newItem = (delivery_index = 0, item_type = 'menu') => ({ delivery_index, item_type, menu_id: '', custom_name: '', unit_price: '', qty: '1', option_ids: [], note: '' })
// details dari server: [{ field, message }] -> { field: message }
const fieldErrors = (err) => Object.fromEntries((err.details || []).map((d) => [d.field, d.message]))

export default function MacLab() {
  const [menus, setMenus] = useState(null)
  const [closed, setClosed] = useState([])
  const [loadError, setLoadError] = useState('')

  const [customerName, setCustomerName] = useState('')
  const [phone, setPhone] = useState('')
  const [payTiming, setPayTiming] = useState('di_muka')
  const [discount, setDiscount] = useState('')
  const [deliveries, setDeliveries] = useState([newDelivery()])
  const [items, setItems] = useState([newItem()])
  const [open, setOpen] = useState(null) // indeks item yang opsi & catatannya terbuka

  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [created, setCreated] = useState(null)

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
    api('/closed-dates').then((r) => setClosed(r.closed_dates.map((c) => c.closed_date))).catch(() => {})
  }, [load])

  const menuById = useMemo(() => new Map((menus || []).map((m) => [m.id, m])), [menus])

  // Harga satuan pratinjau: menu dari database (+ opsi), lainnya dari isian
  const hargaSatuan = (it) => {
    if (it.item_type !== 'menu') return Number(it.unit_price) || 0
    const menu = menuById.get(Number(it.menu_id))
    return menu ? menu.price + menu.options.filter((o) => it.option_ids.includes(o.id)).reduce((s, o) => s + o.extra_price, 0) : 0
  }
  const namaItem = (it) => (it.item_type === 'menu' ? menuById.get(Number(it.menu_id))?.name : it.custom_name.trim()) || 'Item'
  const preview = useMemo(() => {
    const subtotal = items.reduce((s, it) => s + (Number(it.qty) || 0) * hargaSatuan(it), 0)
    const antar = deliveries.filter((d) => d.method === 'antar_nabila')
    const shipping = antar.reduce((s, d) => s + (Number(d.shipping_fee) || 0), 0)
    const disc = Number(discount) || 0
    return { subtotal, shipping, kirim: antar.length, disc, grand: subtotal + shipping - disc }
  }, [items, deliveries, discount, menuById]) // eslint-disable-line react-hooks/exhaustive-deps

  const setDelivery = (i, patch) => setDeliveries((l) => l.map((d, k) => (k === i ? { ...d, ...patch } : d)))
  const setItem = (i, patch) => setItems((l) => l.map((it, k) => (k === i ? { ...it, ...patch } : it)))

  function removeDelivery(i) {
    if (deliveries.length === 1) return
    setDeliveries((l) => l.filter((_, k) => k !== i))
    // item milik pengiriman yang dihapus pindah ke pengiriman 1; indeks sesudahnya bergeser satu
    setItems((l) => l.map((it) => (it.delivery_index === i ? { ...it, delivery_index: 0 } : it.delivery_index > i ? { ...it, delivery_index: it.delivery_index - 1 } : it)))
  }

  function addItem(type) {
    setItems((l) => [...l, newItem(Math.min(l.at(-1)?.delivery_index ?? 0, deliveries.length - 1), type)])
  }

  // paling banyak satu opsi per kelompok (sama dengan aturan server)
  function toggleOption(i, menu, option) {
    const current = items[i].option_ids
    if (current.includes(option.id)) return setItem(i, { option_ids: current.filter((id) => id !== option.id) })
    const sameGroup = menu.options.filter((o) => o.option_group === option.option_group).map((o) => o.id)
    setItem(i, { option_ids: [...current.filter((id) => !sameGroup.includes(id)), option.id] })
  }

  function resetForm() {
    setCustomerName(''); setPhone(''); setPayTiming('di_muka'); setDiscount('')
    setDeliveries([newDelivery()]); setItems([newItem()]); setErrors({}); setFormError(''); setOpen(null)
  }

  async function submit(e) {
    e.preventDefault()
    setSaving(true); setErrors({}); setFormError('')
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
        const out = { delivery_index: it.delivery_index, item_type: it.item_type, qty: it.qty === '' ? undefined : Number(it.qty), note: it.note.trim() }
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
      setCreated(await api('/admin/orders', { method: 'POST', body: JSON.stringify(payload) }))
      resetForm()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      const fe = fieldErrors(err)
      setErrors(fe)
      // Item yang error dibuka supaya pesan di opsi & catatan terlihat
      const salah = Object.keys(fe).map((k) => k.match(/^items\.(\d+)\.(option_ids|note)/)?.[1]).find(Boolean)
      if (salah !== undefined) setOpen(Number(salah))
      setFormError(Object.keys(fe).length ? 'Ada isian yang belum benar. Periksa kolom bertanda merah.' : err.message)
    } finally {
      setSaving(false)
    }
  }

  // Ringkasan item per pengiriman, mis. "Nutrimac 10 · Bonus Mac Bites 5"
  const isiKirim = (k) => items.filter((it) => it.delivery_index === k && Number(it.qty)).map((it) => `${namaItem(it)} ${it.qty}`).join(' · ') || 'Belum ada item'

  return (
    <div className="mx-auto max-w-[1180px] pb-32 lg:pb-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-extrabold max-lg:hidden lg:text-[30px]">Form Pesanan Besar</h1>
          <p className="text-sm font-medium text-abu max-lg:hidden">Untuk kafe, kantor, atau kolaborasi — satu invoice, beberapa tanggal kirim</p>
        </div>
      </div>

      {created && (
        <div role="status" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[16px] bg-ungu-gelap px-5 py-4 text-white">
          <div>
            <p className="font-bold">✓ Pesanan tercatat: {created.order_code}</p>
            <p className="text-sm text-abu-label">
              {created.status === 'diproses' ? 'Diproses' : 'Menunggu Pembayaran'} · Total {rupiah(created.totals.grand_total)} (subtotal {rupiah(created.totals.subtotal)}, ongkir {rupiah(created.totals.shipping_total)}{created.totals.discount > 0 ? `, diskon ${rupiah(created.totals.discount)}` : ''})
            </p>
          </div>
          <div className="flex gap-2">
            <Link to={`/dapur/pesanan/${created.id}`} className="rounded-[10px] bg-kuning px-4 py-2.5 text-sm font-bold text-ungu-gelap">Lihat detail pesanan (kirim tagihan, catat bayar)</Link>
            <button type="button" onClick={() => setCreated(null)} aria-label="Tutup" className="rounded-[10px] px-2 text-white/80 hover:text-white">✕</button>
          </div>
        </div>
      )}

      {loadError && (
        <p role="alert" className="mt-4 rounded-[10px] bg-[#fde8e8] px-4 py-3 text-sm font-semibold text-[#b91c1c]">
          Menu gagal dimuat: {loadError} <button type="button" onClick={load} className="ml-2 underline">Coba lagi</button>
        </p>
      )}
      {!menus && !loadError && <p role="status" className="py-8 text-center text-sm font-semibold text-abu">Memuat menu…</p>}

      {menus && (
        <form onSubmit={submit} noValidate className="mt-5 flex flex-col gap-4 lg:gap-5">
          {/* Pelanggan */}
          <section className="rounded-[20px] bg-white p-5 lg:p-6" aria-labelledby="judul-pelanggan">
            <h2 id="judul-pelanggan" className="mb-3 text-lg font-bold lg:sr-only">Pelanggan</h2>
            <div className="grid gap-4 lg:grid-cols-4 lg:gap-3">
              <div>
                <label htmlFor="ml-name" className={labelCls}>Nama pelanggan</label>
                <input id="ml-name" className={fieldCls} value={customerName} maxLength={100} onChange={(e) => setCustomerName(e.target.value)} placeholder="Kafe Kopi Senja" />
                {errors.customer_name && <p className={errCls}>{errors.customer_name}</p>}
              </div>
              <div>
                <label htmlFor="ml-phone" className={labelCls}>WhatsApp <span className="font-medium text-abu">(boleh kosong)</span></label>
                <input id="ml-phone" inputMode="tel" className={fieldCls} value={phone} placeholder="0812…" onChange={(e) => setPhone(e.target.value)} />
                {errors.phone && <p className={errCls}>{errors.phone}</p>}
              </div>
              <div>
                <label htmlFor="ml-pay" className={labelCls}>Waktu bayar</label>
                <select id="ml-pay" className={fieldCls} value={payTiming} onChange={(e) => setPayTiming(e.target.value)}>
                  <option value="di_muka">Bayar di muka</option>
                  <option value="setelah_kirim">Bayar setelah kirim</option>
                </select>
                {errors.pay_timing && <p className={errCls}>{errors.pay_timing}</p>}
              </div>
              <div>
                <label htmlFor="ml-disc" className={labelCls}>Diskon</label>
                <input id="ml-disc" inputMode="numeric" className={fieldCls} value={discount ? rupiah(Number(discount)) : ''} placeholder="Rp0" onChange={(e) => setDiscount(angka(e.target.value))} />
                {errors.discount && <p className={errCls}>{errors.discount}</p>}
              </div>
            </div>
          </section>

          {/* Item */}
          <section className="rounded-[20px] bg-white p-5 lg:bg-krem-field lg:p-6" aria-labelledby="judul-item">
            <h2 id="judul-item" className="text-lg font-bold lg:sr-only">Item</h2>
            {errors.items && <p className={errCls}>{errors.items}</p>}
            <div className="hidden grid-cols-[minmax(0,2.2fr)_minmax(0,1.1fr)_minmax(0,1.2fr)_70px_minmax(0,1fr)_minmax(0,1fr)_32px] gap-3 px-1 pb-2 text-xs font-semibold text-abu lg:grid">
              <span>Item</span><span>Jenis</span><span>Kirim</span><span>Qty</span><span>Harga</span><span>Subtotal</span><span />
            </div>
            <ul className="flex flex-col divide-y divide-krem-field lg:divide-white/70">
              {items.map((it, i) => {
                const err = (f) => errors[`items.${i}.${f}`]
                const menu = it.item_type === 'menu' ? menuById.get(Number(it.menu_id)) : null
                const unit = hargaSatuan(it)
                const sub = (Number(it.qty) || 0) * unit
                const opsiTerpilih = menu ? menu.options.filter((o) => it.option_ids.includes(o.id)).map((o) => o.name) : []
                return (
                  <li key={i} className="py-3 first:pt-1 lg:py-2.5">
                    <div className="grid grid-cols-2 gap-2 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.1fr)_minmax(0,1.2fr)_70px_minmax(0,1fr)_minmax(0,1fr)_32px] lg:items-start lg:gap-3">
                      <div className="col-span-2 lg:col-span-1">
                        <label htmlFor={it.item_type === 'menu' ? `i-menu-${i}` : `i-name-${i}`} className="mb-1 block text-xs font-bold lg:sr-only">Item {i + 1}</label>
                        {it.item_type === 'menu' ? (
                          <select id={`i-menu-${i}`} className={`${kecil} font-bold max-lg:bg-krem-field`} value={it.menu_id} onChange={(e) => setItem(i, { menu_id: e.target.value, option_ids: [] })}>
                            <option value="">Pilih menu…</option>
                            {menus.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                          </select>
                        ) : (
                          <input id={`i-name-${i}`} className={`${kecil} font-bold max-lg:bg-krem-field`} value={it.custom_name} maxLength={100} placeholder="Nama item, mis. Nutrimac Small"
                            onChange={(e) => setItem(i, { custom_name: e.target.value })} />
                        )}
                        {(err('menu_id') || err('custom_name')) && <p className={errCls}>{err('menu_id') || err('custom_name')}</p>}
                        <button type="button" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}
                          className="mt-1 text-left text-xs font-bold text-ungu hover:underline">
                          {open === i ? 'Tutup opsi & catatan' : [opsiTerpilih.join(' · '), it.note && `“${it.note}”`].filter(Boolean).join(' · ') || (menu?.options.length ? '+ Opsi & catatan' : '+ Catatan')}
                        </button>
                      </div>
                      <div>
                        <label htmlFor={`i-type-${i}`} className="mb-1 block text-xs font-bold lg:sr-only">Jenis</label>
                        <select id={`i-type-${i}`} className={`${kecil} text-xs font-bold max-lg:bg-krem-field ${JENIS_CLS[it.item_type] || ''}`} value={it.item_type}
                          onChange={(e) => setItem(i, { item_type: e.target.value, menu_id: '', option_ids: [] })}>
                          {ITEM_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                      </div>
                      <div>
                        <label htmlFor={`i-del-${i}`} className="mb-1 block text-xs font-bold lg:sr-only">Dikirim di</label>
                        <select id={`i-del-${i}`} className={`${kecil} max-lg:bg-krem-field`} value={it.delivery_index} onChange={(e) => setItem(i, { delivery_index: Number(e.target.value) })}>
                          {deliveries.map((d, k) => <option key={k} value={k}>{d.delivery_date ? labelTanggal(d.delivery_date).panjang : `Pengiriman ${k + 1}`}</option>)}
                        </select>
                        {err('delivery_index') && <p className={errCls}>{err('delivery_index')}</p>}
                      </div>
                      <div>
                        <label htmlFor={`i-qty-${i}`} className="mb-1 block text-xs font-bold lg:sr-only">Qty</label>
                        <input id={`i-qty-${i}`} inputMode="numeric" className={`${kecil} font-bold max-lg:bg-krem-field`} value={it.qty} onChange={(e) => setItem(i, { qty: angka(e.target.value).slice(0, 3) })} />
                        {err('qty') && <p className={errCls}>{err('qty')}</p>}
                      </div>
                      <div>
                        <label htmlFor={`i-price-${i}`} className="mb-1 block text-xs font-bold lg:sr-only">Harga satuan</label>
                        {it.item_type === 'menu'
                          ? <p id={`i-price-${i}`} className="flex h-10 items-center text-sm font-medium">{menu ? rupiah(unit) : '–'}</p>
                          : <input id={`i-price-${i}`} inputMode="numeric" className={`${kecil} max-lg:bg-krem-field`} placeholder="Rp0" value={it.unit_price === '' ? '' : rupiah(Number(it.unit_price))}
                              onChange={(e) => setItem(i, { unit_price: angka(e.target.value) })} />}
                        {err('unit_price') && <p className={errCls}>{err('unit_price')}</p>}
                      </div>
                      <p className="flex h-10 items-center text-sm font-extrabold lg:text-[15px]"><span className="mr-1 text-xs font-semibold text-abu lg:hidden">Subtotal</span>{rupiah(sub)}</p>
                      <button type="button" onClick={() => { setItems((l) => l.filter((_, k) => k !== i)); setOpen(null) }} disabled={items.length === 1}
                        aria-label={`Hapus item ${i + 1}`} className="flex h-10 items-center justify-center rounded-[8px] text-[#dc2626] hover:bg-white disabled:opacity-30 max-lg:col-start-2 max-lg:justify-self-end max-lg:px-3">
                        <Svg d="M6 6l12 12M18 6L6 18" />
                      </button>
                    </div>

                    {open === i && (
                      <div className="mt-2 grid gap-3 rounded-[12px] bg-krem-field p-3 lg:bg-white">
                        {menu && menu.options.length > 0 && (
                          <fieldset>
                            <legend className="mb-1.5 text-xs font-bold">Opsi (satu per kelompok)</legend>
                            <div className="flex flex-wrap gap-1.5">
                              {menu.options.map((o) => {
                                const on = it.option_ids.includes(o.id)
                                return (
                                  <button key={o.id} type="button" aria-pressed={on} onClick={() => toggleOption(i, menu, o)}
                                    className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${on ? 'bg-ungu-gelap text-white' : 'bg-white text-ungu-gelap hover:bg-[#ece4d6] lg:bg-krem-field'}`}>
                                    {o.name}{o.extra_price > 0 && ` +${rupiah(o.extra_price)}`}
                                  </button>
                                )
                              })}
                            </div>
                            {err('option_ids') && <p className={errCls}>{err('option_ids')}</p>}
                          </fieldset>
                        )}
                        <div>
                          <label htmlFor={`i-note-${i}`} className="mb-1 block text-xs font-bold">Catatan (boleh kosong)</label>
                          <input id={`i-note-${i}`} className={`${kecil} lg:bg-krem-field`} value={it.note} maxLength={500} onChange={(e) => setItem(i, { note: e.target.value })} placeholder="Mis. saus dipisah" />
                          {err('note') && <p className={errCls}>{err('note')}</p>}
                        </div>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm font-bold text-ungu lg:px-1">
              <button type="button" disabled={items.length >= 50} onClick={() => addItem('menu')} className="hover:underline disabled:opacity-40">+ Menu standar</button>
              <button type="button" disabled={items.length >= 50} onClick={() => addItem('item_bebas')} className="hover:underline disabled:opacity-40">+ Item bebas</button>
            </div>
          </section>

          {/* Tanggal kirim */}
          <section className="rounded-[20px] bg-white p-5 lg:bg-transparent lg:p-0" aria-labelledby="judul-kirim">
            <h2 id="judul-kirim" className="text-lg font-bold lg:text-[15px]">Tanggal kirim <span className="hidden text-xs font-medium text-abu lg:inline">Input manual · tanpa AI</span></h2>
            {errors.deliveries && <p className={errCls}>{errors.deliveries}</p>}
            <ul className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {deliveries.map((d, i) => {
                const err = (f) => errors[`deliveries.${i}.${f}`]
                return (
                  <li key={i} className="flex flex-col gap-2 rounded-[16px] bg-krem-field p-4 lg:bg-white">
                    <div className="flex items-center gap-2">
                      <Svg d={TRUK} className="size-5 shrink-0 text-ungu" />
                      <label htmlFor={`d-date-${i}`} className="sr-only">Tanggal kirim {i + 1}</label>
                      <input id={`d-date-${i}`} type="date" min={todayJakarta()} value={d.delivery_date} onChange={(e) => setDelivery(i, { delivery_date: e.target.value })}
                        className="h-9 min-w-0 flex-1 rounded-[8px] bg-transparent px-1 text-[15px] font-extrabold outline-none focus:bg-white focus:ring-2 focus:ring-ungu lg:focus:bg-krem-field" />
                      {deliveries.length > 1 && (
                        <button type="button" onClick={() => removeDelivery(i)} aria-label={`Hapus pengiriman ${i + 1}`} className="rounded-[8px] p-1 text-[#dc2626] hover:bg-white lg:hover:bg-krem-field"><Svg d="M6 6l12 12M18 6L6 18" /></button>
                      )}
                    </div>
                    {err('delivery_date') && <p className={errCls}>{err('delivery_date')}</p>}
                    {/* Admin boleh tetap mengirim di tanggal tutup (keputusan Nabila), tapi diberi tahu */}
                    {closed.includes(d.delivery_date) && <p className="text-xs font-semibold text-[#d97706]">Tanggal ini ditutup di Pengaturan. Pastikan memang mau kirim di tanggal ini.</p>}
                    <p className="text-[13px] font-medium text-abu">{isiKirim(i)}</p>
                    <label htmlFor={`d-method-${i}`} className="sr-only">Cara kirim {i + 1}</label>
                    <select id={`d-method-${i}`} className={`${kecil} lg:bg-krem-field`} value={d.method} onChange={(e) => setDelivery(i, { method: e.target.value })}>
                      <option value="antar_nabila">Antar oleh Nabila</option>
                      <option value="ambil_sendiri">Ambil sendiri</option>
                    </select>
                    {d.method === 'antar_nabila' && (
                      <>
                        <label htmlFor={`d-addr-${i}`} className="sr-only">Alamat {i + 1}</label>
                        <input id={`d-addr-${i}`} className={`${kecil} lg:bg-krem-field`} value={d.address} maxLength={300} placeholder="Alamat antar" onChange={(e) => setDelivery(i, { address: e.target.value })} />
                        {err('address') && <p className={errCls}>{err('address')}</p>}
                        <div className="flex items-center gap-2">
                          <label htmlFor={`d-fee-${i}`} className="shrink-0 text-sm font-bold">Ongkir</label>
                          <input id={`d-fee-${i}`} inputMode="numeric" className={`${kecil} font-bold lg:bg-krem-field`} placeholder="Rp0" value={d.shipping_fee === '' ? '' : rupiah(Number(d.shipping_fee))}
                            onChange={(e) => setDelivery(i, { shipping_fee: angka(e.target.value) })} />
                        </div>
                        {err('shipping_fee') && <p className={errCls}>{err('shipping_fee')}</p>}
                      </>
                    )}
                  </li>
                )
              })}
              {deliveries.length < 10 && (
                <li>
                  <button type="button" onClick={() => setDeliveries((l) => [...l, newDelivery()])}
                    className="flex h-full min-h-[64px] w-full flex-col items-center justify-center gap-1 rounded-[16px] text-[15px] font-bold text-ungu hover:bg-[#ece4d6] lg:min-h-[120px] lg:bg-krem-field">
                    <span className="text-2xl leading-none" aria-hidden="true">+</span>Tambah tanggal
                  </button>
                </li>
              )}
            </ul>
          </section>

          {/* Ringkasan + simpan */}
          <div className="grid gap-3 lg:grid-cols-[1fr_290px] lg:items-stretch">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-[20px] bg-ungu-gelap p-5 text-white sm:grid-cols-4 lg:items-end lg:px-6">
              <div><dt className="text-[13px] font-medium text-abu-label">Subtotal</dt><dd className="text-lg font-extrabold">{rupiah(preview.subtotal)}</dd></div>
              <div><dt className="text-[13px] font-medium text-abu-label">Ongkir {preview.kirim}×</dt><dd className="text-lg font-extrabold">{rupiah(preview.shipping)}</dd></div>
              <div><dt className="text-[13px] font-medium text-abu-label">Diskon</dt><dd className="text-lg font-extrabold">−{rupiah(preview.disc)}</dd></div>
              <div className="col-span-2 sm:col-span-1"><dt className="text-[13px] font-medium text-abu-label">Grand Total</dt><dd className="text-[28px] font-extrabold leading-tight text-kuning">{rupiah(preview.grand)}</dd></div>
              <p className="col-span-full text-xs font-medium text-abu-label">Pratinjau; angka final dihitung server saat disimpan.</p>
            </dl>
            <div className="flex flex-col gap-2">
              {formError && <p role="alert" className="rounded-[10px] bg-[#fde8e8] px-3 py-2 text-sm font-semibold text-[#b91c1c]">{formError}</p>}
              <div className="fixed inset-x-0 bottom-0 z-40 bg-white p-4 shadow-[0_-8px_24px_rgba(30,5,77,0.08)] lg:static lg:bg-transparent lg:p-0 lg:shadow-none">
                <button type="submit" disabled={saving} className="h-14 w-full rounded-[12px] bg-ungu text-[17px] font-bold text-white disabled:opacity-60 lg:h-12 lg:rounded-[10px] lg:text-[15px]">
                  {saving ? 'Menyimpan…' : 'Simpan pesanan'}
                </button>
              </div>
              <button type="button" onClick={resetForm} disabled={saving} className="text-sm font-bold underline lg:h-11 lg:rounded-[10px] lg:bg-white lg:no-underline">Kosongkan</button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}
