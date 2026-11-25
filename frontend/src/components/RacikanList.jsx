import { useState } from 'react'
import MenuOptions, { optionSummary } from './MenuOptions'
import { rupiah } from '../utils/format'
import iconMinus from '../assets/landing/icon-minus-abu.svg'
import iconPlus from '../assets/landing/icon-plus-ungu.svg'
import chevronDown from '../assets/landing/icon-chevron-down.svg'

// Porsi satu menu bisa dibedakan jadi beberapa racikan (mis. 3 pedas sedang + 2 tidak pedas tanpa brokoli),
// masing-masing dengan catatan sendiri. Satu racikan = satu item di POST /orders.
export const NOTE_RACIKAN_MAX = 150

function Catatan({ value, onChange, id }) {
  const [open, setOpen] = useState(!!value)
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="self-start text-xs font-bold text-ungu underline-offset-2 hover:underline">
        + Catatan khusus porsi ini
      </button>
    )
  }
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-bold">Catatan khusus porsi ini</label>
      <input id={id} value={value || ''} maxLength={NOTE_RACIKAN_MAX} autoFocus={!value} onChange={(e) => onChange(e.target.value)}
        placeholder="Misalnya: sausnya dipisah"
        className="h-10 w-full rounded-[10px] bg-white px-3 text-sm font-medium outline-none ring-1 ring-[#e4dccb] placeholder:text-abu focus:ring-2 focus:ring-ungu" />
    </div>
  )
}

function Stepper({ label, qty, onMinus, onPlus, plusDisabled }) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-white px-1.5 py-1">
      <button type="button" onClick={onMinus} aria-label={`Kurangi ${label}`} className="flex size-6 items-center justify-center">
        <img src={iconMinus} alt="" width="10" height="1.5" />
      </button>
      <span className="min-w-4 text-center text-sm font-extrabold" aria-live="polite">{qty}</span>
      <button type="button" onClick={onPlus} disabled={plusDisabled} aria-label={`Tambah ${label}`} className="flex size-6 items-center justify-center disabled:opacity-30">
        <img src={iconPlus} alt="" width="10" height="10" />
      </button>
    </div>
  )
}

// rs: hasil racikanOf + { total }; active: indeks racikan yang terbuka (null = tertutup)
export default function RacikanList({ menu, rs, active, onActive, onSel, onNote, onQty, onSplit, canSplit, splitHint }) {
  const split = (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <button type="button" onClick={onSplit} disabled={!canSplit}
        className="flex h-8 items-center gap-1.5 rounded-full border border-dashed border-ungu px-3 text-xs font-bold text-ungu transition-colors hover:bg-ungu hover:text-white disabled:border-abu-muda disabled:text-abu disabled:hover:bg-transparent">
        <span aria-hidden="true" className="text-sm leading-none">+</span>
        {rs.length > 1 ? 'Bedakan porsi lagi' : 'Bedakan sebagian porsi'}
      </button>
      {splitHint && <span className="text-[11px] font-semibold text-abu">{splitHint}</span>}
    </div>
  )

  // Satu racikan: tampilan seperti biasa (opsi di bawah menu), plus catatan dan tombol bedakan
  if (rs.length === 1) {
    if (active !== 0) return null
    return (
      <div>
        <MenuOptions menu={menu} sel={rs[0].sel} onChange={(sel) => onSel(0, sel)} />
        <div className="mt-3 flex flex-col gap-3">
          <Catatan id={`catatan-${menu.id}-0`} value={rs[0].note} onChange={(v) => onNote(0, v)} />
          {split}
        </div>
      </div>
    )
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      <ol className="flex flex-col gap-2">
        {rs.map((r, i) => {
          const open = active === i
          const label = `racikan ${i + 1} ${menu.name}`
          return (
            <li key={i} className={`animate-muncul rounded-[14px] transition-colors ${open ? 'bg-krem-field' : 'bg-krem'}`}>
              <div className="flex items-center gap-2.5 p-2.5">
                <button type="button" onClick={() => onActive(open ? null : i)} aria-expanded={open} aria-label={`Ubah ${label}`}
                  className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ungu-gelap text-xs font-extrabold text-white">{i + 1}</span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-extrabold">{r.qty} porsi · {rupiah(r.total)}</span>
                    <span className="block truncate text-xs font-medium text-abu">
                      {optionSummary(menu, r.sel)}{r.note ? ` · “${r.note}”` : ''}
                    </span>
                  </span>
                  <img src={chevronDown} alt="" width="10.5" height="6" className={`ml-auto shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
                {/* Racikan 1 menampung sisa porsi; jumlahnya ikut tombol +/− menu di atas */}
                {i > 0 && <Stepper label={label} qty={r.qty} onMinus={() => onQty(i, -1)} onPlus={() => onQty(i, 1)} plusDisabled={rs[0].qty <= 1} />}
              </div>
              {open && (
                <div className="flex flex-col gap-3 px-2.5 pb-3">
                  <MenuOptions menu={menu} sel={r.sel} onChange={(sel) => onSel(i, sel)} />
                  <Catatan id={`catatan-${menu.id}-${i}`} value={r.note} onChange={(v) => onNote(i, v)} />
                  {i > 0 && (
                    <button type="button" onClick={() => onQty(i, -r.qty)} className="self-start text-xs font-bold text-[#dc2626] underline-offset-2 hover:underline">
                      Gabungkan ke racikan 1
                    </button>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ol>
      {split}
    </div>
  )
}
