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
  const set = (patch) => onChange({ ...s, ...patch })

  return (
    <div className="mt-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {pedas.length > 0 && (
          // Figma "Pedas (klik untuk naik level)": klik menaikkan level, setelah level tertinggi kembali ke tidak pedas
          <button type="button" onClick={() => set({ pedas: level >= pedas.length ? null : pedas[level].id })}
            className="flex items-center gap-1 py-1" aria-label={`Level pedas: ${level ? pedas[level - 1].name : 'tidak pedas'}. Klik untuk ganti`}>
            {pedas.map((o, i) => (
              <span key={o.id} className="flex size-6 items-center justify-center">
                <img src={i < level ? cabaiOn : cabaiOff} alt="" width="17.6" height="21.1" />
              </span>
            ))}
            <span className={`ml-1.5 text-sm font-bold ${level ? 'text-[#dc2626]' : 'text-abu'}`}>
              {level ? `Pedas ${pedas[level - 1].name.toLowerCase()}` : 'Tidak pedas'}
            </span>
          </button>
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
