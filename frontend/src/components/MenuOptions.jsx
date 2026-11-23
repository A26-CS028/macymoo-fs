import { useState } from 'react'
import cabaiOn from '../assets/landing/icon-cabai-on.svg'
import cabaiOff from '../assets/landing/icon-cabai-off.svg'
import chevronDown from '../assets/landing/icon-chevron-down.svg'
import { rupiah } from '../utils/format'

// Opsi per menu (KF 7) dari GET /menus: pedas, ayam (dada/paha), dan tambahan (keju, tanpa makaroni, tanpa brokoli).
// sel = { pedas: optionId|null, ayam: optionId|null, tambahan: [optionId] }

export const groupOf = (menu, g) => menu.options?.filter((o) => o.option_group === g) || []
const TAMBAHAN = ['keju', 'tanpa_makaroni', 'tanpa_brokoli']
export const tambahanOf = (menu) => menu.options?.filter((o) => TAMBAHAN.includes(o.option_group)) || []

// Pilihan efektif: ayam default = opsi ayam pertama (dada), sesuai desain
export function resolveSel(menu, sel = {}) {
  const ayam = groupOf(menu, 'ayam')
  return {
    pedas: sel.pedas ?? null,
    ayam: ayam.length ? (sel.ayam ?? ayam[0].id) : null,
    tambahan: sel.tambahan ?? [],
  }
}

export function selectedOptions(menu, sel) {
  const s = resolveSel(menu, sel)
  const ids = [s.pedas, s.ayam, ...s.tambahan].filter(Boolean)
  return menu.options.filter((o) => ids.includes(o.id))
}

// Ringkasan satu baris, mis. "Tidak pedas · Dada · tanpa brokoli"
export function optionSummary(menu, sel) {
  const s = resolveSel(menu, sel)
  const name = (id) => menu.options.find((o) => o.id === id)?.name
  const parts = []
  if (groupOf(menu, 'pedas').length) parts.push(s.pedas ? `Pedas ${name(s.pedas).toLowerCase()}` : 'Tidak pedas')
  if (s.ayam) parts.push(name(s.ayam).replace(/^ayam\s+/i, '').replace(/^./, (c) => c.toUpperCase()))
  s.tambahan.forEach((id) => parts.push(name(id).toLowerCase()))
  return parts.join(' · ')
}

export default function MenuOptions({ menu, sel, onChange }) {
  const s = resolveSel(menu, sel)
  const pedas = groupOf(menu, 'pedas')
  const ayam = groupOf(menu, 'ayam')
  const tambahan = tambahanOf(menu)
  const [open, setOpen] = useState(false)
  const level = s.pedas ? pedas.findIndex((o) => o.id === s.pedas) + 1 : 0
  const [hover, setHover] = useState(0)
  const shown = hover || level // level yang ditampilkan: pratinjau saat disorot, selain itu pilihan
  const set = (patch) => onChange({ ...s, ...patch })

  return (
    <div className="mt-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {pedas.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Klik cabai ke-n = level n (bukan klik berulang). Arahkan kursor untuk pratinjau level. */}
            <div role="radiogroup" aria-label="Level pedas" className="flex items-center gap-0.5 py-1" onMouseLeave={() => setHover(0)}>
              {pedas.map((o, i) => (
                <button key={o.id} type="button" role="radio" aria-checked={level === i + 1}
                  aria-label={`Pedas ${o.name.toLowerCase()}`} onClick={() => set({ pedas: o.id })}
                  onMouseEnter={() => setHover(i + 1)} onFocus={() => setHover(i + 1)} onBlur={() => setHover(0)}
                  className="flex size-7 items-center justify-center rounded-full transition-transform duration-150 hover:-translate-y-0.5 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ungu">
                  <img src={i < shown ? cabaiOn : cabaiOff} alt="" width="17.6" height="21.1"
                    className={`transition-opacity ${hover && hover !== level && i < shown ? 'opacity-60' : ''}`} />
                </button>
              ))}
              {/* Lebar tetap supaya baris tidak bergeser saat pratinjau/pilihan berganti */}
              <span aria-hidden="true" className={`ml-1.5 min-w-[84px] whitespace-nowrap text-sm font-bold ${shown ? 'text-[#dc2626]' : 'text-abu'} ${hover && hover !== level ? 'opacity-60' : ''}`}>
                {shown ? pedas[shown - 1].name : 'Tidak pedas'}
              </span>
            </div>
            {/* Muncul setelah memilih level: kembali ke tidak pedas */}
            {level > 0 && (
              <button type="button" onClick={() => { set({ pedas: null }); setHover(0) }}
                className="flex h-[30px] animate-muncul items-center gap-1.5 rounded-full bg-krem-field pl-1.5 pr-3 text-xs font-bold text-abu transition-colors hover:bg-ungu-gelap hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ungu">
                <span className="relative flex size-5 items-center justify-center rounded-full bg-white" aria-hidden="true">
                  <img src={cabaiOff} alt="" width="11" height="13" />
                  <span className="absolute h-[2px] w-4 -rotate-45 rounded-full bg-[#dc2626]" />
                </span>
                Tidak pedas
              </button>
            )}
          </div>
        )}
        {ayam.length > 0 && (
          <div role="radiogroup" aria-label="Bagian ayam" className="flex gap-1 rounded-[10px] bg-krem-field p-1">
            {ayam.map((o) => (
              <button key={o.id} type="button" role="radio" aria-checked={s.ayam === o.id} onClick={() => set({ ayam: o.id })}
                className={`h-[34px] rounded-lg px-4 text-[13px] font-bold ${s.ayam === o.id ? 'bg-ungu-gelap text-white' : 'text-abu'}`}>
                {o.name.replace(/^ayam\s+/i, '').replace(/^./, (c) => c.toUpperCase())}
              </button>
            ))}
          </div>
        )}
      </div>

      {tambahan.length > 0 && (
        <div className="rounded-[10px] bg-krem-field">
          <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
            className="flex h-12 w-full items-center gap-2.5 px-3.5 text-left text-sm">
            <span className="font-extrabold">Tambahan</span>
            <span className="flex-1 truncate font-medium text-abu">
              {s.tambahan.length ? tambahan.filter((o) => s.tambahan.includes(o.id)).map((o) => o.name).join(', ') : 'Pilih tambahan'}
            </span>
            <img src={chevronDown} alt="" width="10.5" height="6" className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
          {open && (
            <ul className="px-3.5 pb-3">
              {tambahan.map((o) => (
                <li key={o.id}>
                  <label className="flex cursor-pointer items-center gap-3 py-2 text-sm font-semibold">
                    <input type="checkbox" className="size-[18px] accent-ungu" checked={s.tambahan.includes(o.id)}
                      onChange={(e) => set({ tambahan: e.target.checked ? [...s.tambahan, o.id] : s.tambahan.filter((x) => x !== o.id) })} />
                    <span className="flex-1">{o.name}</span>
                    <span className="text-abu">{o.extra_price ? `+${rupiah(o.extra_price)}` : 'Gratis'}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
