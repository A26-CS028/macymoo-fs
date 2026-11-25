import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import { rupiah } from '../utils/format'
import { todayJakarta, addDays, labelTanggal } from '../utils/date'
import { menuPhoto, fallbackToLocal } from '../utils/menuPhoto'
import { useSessionState } from '../hooks/useSessionState'
import { optionSummary, selectedOptions } from './MenuOptions'
import RacikanList from './RacikanList'
import { racikanOf, MAX_RACIKAN } from '../utils/racikan'
import Turnstile from './Turnstile'
import iconMinus from '../assets/landing/icon-minus-abu.svg'
import iconPlus from '../assets/landing/icon-plus-ungu.svg'
import iconAlert from '../assets/landing/icon-alert.svg'
import iconPin from '../assets/landing/icon-pin.svg'
import iconCheck from '../assets/landing/icon-check.svg'
import iconRadio from '../assets/landing/icon-radio-on.svg'
import iconArrowGelap from '../assets/landing/icon-arrow-gelap.svg'

// Form pre-order tanpa login (Figma: bagian "Pre-order" desktop dan "Mobile — Pesananmu").
// Harga di sini hanya pratinjau; server menghitung ulang dari database.
const NOTE_MAX = 200
const MAX_ITEMS = 20 // batas items di POST /orders
const PHONE_RE = /^(?:\+62|62|0)8\d{8,12}$/ // sama dengan backend/src/validators/order.js
const EMPTY_FORM = { customer_name: '', phone: '', delivery_date: '', method: 'antar_nabila', address: '', note: '', agree_rules: false }

const card = 'min-w-0 rounded-[20px] bg-white p-4 lg:p-7' // min-w-0: deretan tanggal boleh digulir tanpa melebarkan halaman
const field = 'h-12 w-full rounded-[10px] bg-krem-field px-4 text-[15px] font-medium text-ungu-gelap outline-none placeholder:text-abu focus:ring-2 focus:ring-ungu'
const label = 'mb-2 block text-[13px] font-bold'

function FieldError({ id, children }) {
  if (!children) return null
  return (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-xs font-semibold text-[#dc2626]">
      <img src={iconAlert} alt="" width="12.8" height="11.7" className="mt-px" />{children}
    </p>
  )
}

export default function OrderForm({ menus, cart, setCart, onSubmitted }) {
  const [opsi, setOpsi] = useSessionState('mm-opsi', {}) // { [menuId]: [{ sel, note, qty }] }, lihat utils/racikan
  const [form, setForm] = useSessionState('mm-form', EMPTY_FORM)
  const [website, setWebsite] = useState('') // honeypot
  const [activeKey, setActiveKey] = useState(null) // "menuId:indeksRacikan"; null = racikan 1 menu pertama
  const [closed, setClosed] = useState([])
  const [token, setToken] = useState(null)
  const [tsKey, setTsKey] = useState(0)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    api('/closed-dates').then((r) => setClosed(r.closed_dates.map((c) => c.closed_date))).catch(() => {})
  }, [])

  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e })); setErrors((x) => ({ ...x, [k]: '' })); setMessage('') }

  const lines = useMemo(() => menus.filter((m) => cart[m.id]).map((m) => {
    const rs = racikanOf(cart[m.id], opsi[m.id]).map((r) => {
      const opts = selectedOptions(m, r.sel)
      const extra = opts.reduce((a, o) => a + o.extra_price, 0)
      return { ...r, menu: m, opts, base: m.price * r.qty, extras: opts.filter((o) => o.extra_price), total: r.qty * (m.price + extra) }
    })
    return { menu: m, qty: cart[m.id], rs, total: rs.reduce((a, r) => a + r.total, 0) }
  }), [menus, cart, opsi])
  const subtotal = lines.reduce((a, l) => a + l.total, 0)
  const itemCount = lines.reduce((a, l) => a + l.rs.length, 0)
  const [activeMenu, activeIdx] = (activeKey && cart[activeKey.split(':')[0]] ? activeKey : `${lines[0]?.menu.id}:0`).split(':').map(Number)

  // Ubah racikan satu menu; jumlah dihitung ulang dari keranjang supaya selalu cocok
  const editRacikan = (id, fn) => setOpsi((o) => ({ ...o, [id]: fn(racikanOf(cart[id], o[id])).map(({ sel, note, qty }) => ({ sel, note, qty })) }))
  function splitPorsi(id) {
    const n = racikanOf(cart[id], opsi[id]).length
    editRacikan(id, (rs) => [...rs, { sel: rs[0].sel, qty: 1 }]) // mulai dari pilihan racikan 1, tinggal diubah
    setActiveKey(`${id}:${n}`)
  }
  function changeRacikanQty(id, i, delta) {
    const qty = racikanOf(cart[id], opsi[id])[i].qty + delta
    editRacikan(id, (rs) => (qty > 0 ? rs.map((r, j) => (j === i ? { ...r, qty } : r)) : rs.filter((_, j) => j !== i))) // 0 = gabung ke racikan 1
    if (qty <= 0) setActiveKey(`${id}:0`)
  }

  const today = todayJakarta()
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i))
  const antar = form.method === 'antar_nabila'

  function changeQty(id, delta) {
    // menu keluar dari keranjang: racikannya ikut dibuang supaya tidak muncul lagi saat ditambah ulang
    if (delta < 0 && cart[id] <= 1) setOpsi((o) => { const next = { ...o }; delete next[id]; return next })
    setCart((c) => {
      const qty = Math.min(50, Math.max(0, (c[id] || 0) + delta))
      const next = { ...c, [id]: qty }
      if (!qty) delete next[id]
      return next
    })
  }

  function validate() {
    const e = {}
    if (!lines.length) e.items = 'Pilih minimal 1 menu'
    if (!form.customer_name.trim()) e.customer_name = 'Nama wajib diisi'
    if (!PHONE_RE.test(form.phone.replace(/[\s-]/g, ''))) e.phone = 'Diawali 08 atau +62. Contoh: 081234567890'
    if (!form.delivery_date || form.delivery_date <= today || closed.includes(form.delivery_date)) e.delivery_date = 'Pilih tanggal kirim mulai besok'
    if (antar && !form.address.trim()) e.address = 'Alamat wajib diisi bila diantar Nabila'
    if (!form.agree_rules) e.agree_rules = 'Setujui Aturan & Kebijakan Privasi dulu'
    if (!token) e.turnstile = 'Tunggu verifikasi keamanan selesai'
    return e
  }

  async function submit(ev) {
    ev.preventDefault()
    setMessage('')
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length) { setMessage('Periksa lagi isian yang ditandai merah.'); return }

    const note = form.note.trim()
    const body = {
      customer_name: form.customer_name.trim(),
      phone: form.phone.replace(/[\s-]/g, ''), // backend hanya menerima angka (boleh diawali +62)
      delivery_date: form.delivery_date,
      method: form.method,
      ...(antar && { address: form.address.trim() }),
      // Satu racikan = satu item. shortcut: kontrak belum punya catatan level pesanan, jadi catatan umum
      // ditempel di depan catatan item pertama sampai kontrak punya kolomnya.
      items: lines.flatMap((l) => l.rs).map((r, i) => {
        const itemNote = [i === 0 && note, r.note?.trim()].filter(Boolean).join(' — ')
        return { menu_id: r.menu.id, qty: r.qty, option_ids: r.opts.map((o) => o.id), ...(itemNote && { note: itemNote }) }
      }),
      agree_rules: true,
      turnstile_token: token,
      website,
    }

    setSending(true)
    try {
      const order = await api('/orders', { method: 'POST', body: JSON.stringify(body) })
      setCart({}); setOpsi({}); setForm(EMPTY_FORM)
      onSubmitted(order, { address: body.address, delivery_date: body.delivery_date, method: body.method })
    } catch (err) {
      const fieldErrs = {}
      err.details?.forEach((d) => { fieldErrs[d.field.split('.')[0]] ||= d.message })
      if (err.code === 'DATE_CLOSED') fieldErrs.delivery_date = err.message
      setErrors(fieldErrs)
      setMessage(err.status === 429 ? 'Terlalu banyak pesanan dari jaringan ini. Coba lagi nanti.' : err.status ? err.message : 'Tidak bisa terhubung ke server. Coba lagi.')
    } finally {
      // Token Turnstile sekali pakai: minta yang baru setelah setiap percobaan kirim
      setToken(null); setTsKey((k) => k + 1); setSending(false)
    }
  }

  const agreeBox = (dark) => (
    <div>
      <label className="flex cursor-pointer items-start gap-2.5">
        <input type="checkbox" className="peer sr-only" checked={form.agree_rules} onChange={(e) => set('agree_rules')(e.target.checked)} />
        <span className={`flex size-[22px] shrink-0 items-center justify-center rounded-md peer-focus-visible:ring-2 peer-focus-visible:ring-kuning ${
          form.agree_rules ? 'bg-ungu' : dark ? 'border-2 border-abu-label' : 'border-2 border-abu-muda'}`}>
          {form.agree_rules && <img src={iconCheck} alt="" width="11" height="8" />}
        </span>
        <span className={`text-[13px] font-semibold leading-[18px] ${dark ? 'text-white' : ''}`}>
          Saya setuju dengan<br />
          <a href="/aturan" target="_blank" rel="noopener" className={`underline ${dark ? 'text-kuning' : 'text-ungu'}`}>Aturan & Kebijakan Privasi</a>
        </span>
      </label>
      <FieldError>{errors.agree_rules}</FieldError>
    </div>
  )

  const submitLabel = sending ? 'Mengirim…' : null

  return (
    <form onSubmit={submit} noValidate className="grid gap-5 lg:grid-cols-[520fr_392fr_360fr]">
      {/* Honeypot: disembunyikan dari pengguna, diisi bot */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" value={website}
        onChange={(e) => setWebsite(e.target.value)} className="absolute -left-[9999px] h-px w-px opacity-0" />

      {/* Pesananmu */}
      <section className={card} aria-labelledby="judul-pesananmu">
        <h3 id="judul-pesananmu" className="hidden text-[22px] font-bold lg:block">Pesananmu</h3>
        {!lines.length && (
          <p className="text-sm font-semibold text-abu lg:mt-6">
            Belum ada menu. <a href="/#menu" className="text-ungu underline">Pilih dari Menu hari ini</a>.
          </p>
        )}
        <FieldError>{errors.items}</FieldError>
        <ul className="flex flex-col gap-5 lg:mt-6">
          {lines.map(({ menu, qty, total, rs }) => (
            <li key={menu.id}>
              <div className="flex gap-3.5">
                <button type="button" onClick={() => setActiveKey(`${menu.id}:0`)} aria-expanded={activeMenu === menu.id}
                  aria-label={`Ubah opsi ${menu.name}`} className="flex flex-1 gap-3.5 text-left">
                  <img src={menuPhoto(menu)} onError={fallbackToLocal(menu)} alt="" className="size-[68px] shrink-0 object-contain" />
                  <span className="min-w-0">
                    <span className="block font-lilita text-xl leading-tight">{menu.name}</span>
                    <span className="mt-0.5 block text-[13px] font-medium leading-4 text-abu">
                      {rs.length > 1
                        ? <span className="font-bold text-ungu">Dibedakan jadi {rs.length} racikan</span>
                        : activeMenu === menu.id ? menu.description : optionSummary(menu, rs[0].sel)}
                    </span>
                  </span>
                </button>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <span className="text-[15px] font-extrabold">{rupiah(total)}</span>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => changeQty(menu.id, -1)} aria-label={`Kurangi ${menu.name}`} className="flex size-6 items-center justify-center">
                      <img src={iconMinus} alt="" width="12" height="1.5" />
                    </button>
                    <span className="w-3 text-center text-base font-extrabold" aria-live="polite">{qty}</span>
                    <button type="button" onClick={() => changeQty(menu.id, 1)} disabled={qty >= 50} aria-label={`Tambah ${menu.name}`} className="flex size-6 items-center justify-center disabled:opacity-40">
                      <img src={iconPlus} alt="" width="12" height="12" />
                    </button>
                  </div>
                </div>
              </div>
              <RacikanList menu={menu} rs={rs} active={activeMenu === menu.id ? activeIdx : null}
                onActive={(i) => setActiveKey(`${menu.id}:${i ?? -1}`)}
                onSel={(i, sel) => editRacikan(menu.id, (x) => x.map((r, j) => (j === i ? { ...r, sel } : r)))}
                onNote={(i, note) => editRacikan(menu.id, (x) => x.map((r, j) => (j === i ? { ...r, note } : r)))}
                onQty={(i, d) => changeRacikanQty(menu.id, i, d)}
                onSplit={() => splitPorsi(menu.id)}
                canSplit={rs[0].qty >= 2 && rs.length < MAX_RACIKAN && itemCount < MAX_ITEMS}
                splitHint={rs[0].qty < 2 ? (rs.length > 1 ? 'Tambah porsi dulu untuk racikan baru' : 'Tambah jadi 2 porsi atau lebih untuk membedakan') : null} />
            </li>
          ))}
        </ul>

        <label htmlFor="po-note" className={`${label} mt-6`}>Catatan untuk Nabila</label>
        <div className="relative">
          <textarea id="po-note" rows={3} maxLength={NOTE_MAX} value={form.note} onChange={set('note')}
            placeholder="Misalnya: saus kejunya dipisah ya"
            className={`${field} h-20 resize-none py-3 pb-7 lg:h-[84px]`} />
          <span className="pointer-events-none absolute bottom-2.5 right-4 text-xs font-semibold text-abu">{form.note.length}/{NOTE_MAX}</span>
        </div>
      </section>

      {/* Kirim ke */}
      <section className={card} aria-labelledby="judul-kirim">
        <h3 id="judul-kirim" className="text-[15px] font-bold lg:text-[22px]">Kirim ke</h3>
        <div className="mt-4 grid gap-4 lg:mt-6 lg:grid-cols-2 lg:gap-3">
          <div>
            <label htmlFor="po-nama" className={label}>Nama</label>
            <input id="po-nama" className={field} autoComplete="name" maxLength={100} value={form.customer_name} onChange={set('customer_name')}
              aria-invalid={!!errors.customer_name} aria-describedby="err-nama" />
            <FieldError id="err-nama">{errors.customer_name}</FieldError>
          </div>
          <div>
            <label htmlFor="po-wa" className={label}>Nomor WhatsApp</label>
            <input id="po-wa" className={field} type="tel" inputMode="tel" autoComplete="tel" placeholder="08…" maxLength={20}
              value={form.phone} onChange={set('phone')} aria-invalid={!!errors.phone} aria-describedby="err-wa" />
            <FieldError id="err-wa">{errors.phone}</FieldError>
          </div>
        </div>

        {/* min-w-0: fieldset bawaan browser tidak menyusut, deretan tanggal jadi melebarkan halaman */}
        <fieldset className="mt-5 min-w-0">
          <legend className={label}>Tanggal kirim</legend>
          <div className="-mx-1 flex gap-0.5 overflow-x-auto px-1 pb-1" role="radiogroup" aria-label="Tanggal kirim">
            {days.map((d, i) => {
              const { hari, tgl } = labelTanggal(d)
              const lewat = i === 0
              const libur = closed.includes(d)
              const disabled = lewat || libur
              const sel = form.delivery_date === d
              return (
                <button key={d} type="button" role="radio" aria-checked={sel} disabled={disabled} onClick={() => set('delivery_date')(d)}
                  aria-label={`${labelTanggal(d).panjang}${lewat ? ', lewat batas pesan' : libur ? ', libur' : ''}`}
                  className={`flex h-[81px] w-[45px] shrink-0 flex-col items-center justify-start rounded-[10px] pt-2.5 lg:w-[45px] ${sel ? 'bg-kuning' : ''} max-lg:w-[52px]`}>
                  <span className={`text-xs font-semibold ${sel ? 'text-ungu-gelap' : 'text-abu'}`}>{hari}</span>
                  <span className={`text-[22px] font-extrabold leading-7 ${disabled ? 'text-abu' : ''} ${libur ? 'line-through' : ''}`}>{tgl}</span>
                  <span className={`text-[11px] font-semibold ${libur ? 'text-[#dc2626]' : 'text-abu'}`}>{lewat ? 'Lewat' : libur ? 'Libur' : ''}</span>
                </button>
              )
            })}
          </div>
          <FieldError>{errors.delivery_date}</FieldError>
        </fieldset>

        <fieldset className="mt-5">
          <legend className={label}>Cara terima</legend>
          <div className="flex flex-col gap-3">
            {[
              ['antar_nabila', 'Antar oleh Nabila', 'Ongkir dikabari lewat WhatsApp'],
              ['ambil_sendiri', 'Ambil sendiri', 'Gratis ongkir'],
            ].map(([value, title, sub]) => (
              <label key={value} className="flex cursor-pointer items-center gap-3 py-2">
                <input type="radio" name="method" value={value} className="peer sr-only" checked={form.method === value} onChange={set('method')} />
                {form.method === value
                  ? <img src={iconRadio} alt="" width="22" height="22" className="rounded-full peer-focus-visible:ring-2 peer-focus-visible:ring-ungu" />
                  : <span className="size-[22px] rounded-full bg-[#e4dccb] peer-focus-visible:ring-2 peer-focus-visible:ring-ungu" />}
                <span>
                  <span className="block text-[15px] font-bold">{title}</span>
                  <span className="block text-[13px] font-medium text-abu">{sub}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {antar && (
          <div className="mt-4">
            <label htmlFor="po-alamat" className={label}>Alamat</label>
            <div className="relative">
              <img src={iconPin} alt="" width="13.5" height="16.5" className="pointer-events-none absolute left-[18px] top-1/2 -translate-y-1/2" />
              <input id="po-alamat" className={`${field} pl-11`} autoComplete="street-address" maxLength={300} value={form.address}
                onChange={set('address')} aria-invalid={!!errors.address} aria-describedby="err-alamat" placeholder="Jalan, nomor, kelurahan" />
            </div>
            <FieldError id="err-alamat">{errors.address}</FieldError>
          </div>
        )}
      </section>

      {/* Ringkasan: kartu gelap di desktop; di HP setuju + Turnstile di alur halaman dan total di bar bawah */}
      <aside className="flex min-w-0 flex-col gap-4 lg:rounded-[20px] lg:bg-ungu-gelap lg:p-7 lg:text-white" aria-labelledby="judul-ringkasan">
        <div className="hidden lg:block">
          <h3 id="judul-ringkasan" className="text-[22px] font-bold">Ringkasan</h3>
          <dl className="mt-4 flex flex-col gap-2.5 text-sm">
            {lines.flatMap((l) => l.rs.map((r, i) => (
              <div key={`${l.menu.id}:${i}`} className="contents">
                <div className="flex justify-between gap-3">
                  <dt className="text-abu-label">{l.menu.name} ×{r.qty}{l.rs.length > 1 && <span className="block text-xs">{optionSummary(l.menu, r.sel)}</span>}</dt>
                  <dd className="font-bold">{rupiah(r.base)}</dd>
                </div>
                {r.extras.map((o) => (
                  <div key={o.id} className="flex justify-between"><dt className="pl-3 text-abu-label">{o.name}</dt><dd className="font-bold">{rupiah(o.extra_price * r.qty)}</dd></div>
                ))}
              </div>
            )))}
          </dl>
          <p className="mt-5 font-lilita text-[44px] leading-tight text-kuning" aria-live="polite">{rupiah(subtotal)}</p>
          <p className="text-[13px] font-medium text-abu-label">{antar ? 'Belum termasuk ongkir' : 'Estimasi total, final setelah Nabila konfirmasi'}</p>
        </div>

        <div className="flex flex-col gap-4 lg:mt-auto">
          <div className="hidden lg:block">{agreeBox(true)}</div>
          <div className="lg:hidden">{agreeBox(false)}</div>
          <div>
            <Turnstile resetKey={tsKey} onToken={(t) => { setToken(t); if (t) setErrors((x) => ({ ...x, turnstile: '' })) }} />
            <FieldError>{errors.turnstile}</FieldError>
          </div>
          {message && <p role="alert" className="rounded-[10px] bg-[#fde8e8] px-3 py-2 text-sm font-semibold text-[#b91c1c]">{message}</p>}
          <button type="submit" disabled={sending}
            className="hidden h-14 items-center justify-center gap-2 rounded-[10px] bg-kuning text-base font-bold text-ungu-gelap disabled:opacity-60 lg:flex">
            {submitLabel || 'Kirim pre-order'} <img src={iconArrowGelap} alt="" width="12" height="12" />
          </button>
        </div>
      </aside>

      {/* Bar bawah HP (Figma: Bottom Bar "Kirim") */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex h-[92px] items-center justify-between bg-white px-4 shadow-[0_-8px_24px_rgba(30,5,77,0.08)] lg:hidden">
        <div>
          <p className="text-xs font-semibold text-abu">{antar ? 'Belum termasuk ongkir' : 'Estimasi total'}</p>
          <p className="text-xl font-extrabold" aria-live="polite">{rupiah(subtotal)}</p>
        </div>
        <button type="submit" disabled={sending}
          className="flex h-[52px] w-[112px] items-center justify-center gap-2 rounded-[10px] bg-kuning text-[15px] font-bold text-ungu-gelap disabled:opacity-60">
          {submitLabel || 'Kirim'} <img src={iconArrowGelap} alt="" width="12" height="12" />
        </button>
      </div>
    </form>
  )
}
