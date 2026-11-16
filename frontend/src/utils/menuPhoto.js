import mackster from '../assets/menu/mackster.webp'
import nutrimac from '../assets/menu/nutrimac.webp'
import wraphoria from '../assets/menu/wraphoria.webp'
import macBites from '../assets/menu/mac-bites.webp'

// Foto bawaan per menu (dari folder references), dipakai bila menu belum punya foto dari Kelola menu.
const LOCAL = { mackster, nutrimac, wraphoria, 'mac bites': macBites }

export const localPhoto = (menu) => LOCAL[menu.name.trim().toLowerCase()] || mackster

export const menuPhoto = (menu) => menu.photo_url || localPhoto(menu)

// Pasang di <img onError>: kalau foto dari server gagal dimuat, pakai foto bawaan.
export const fallbackToLocal = (menu) => (e) => {
  const local = localPhoto(menu)
  if (!e.currentTarget.src.endsWith(local)) e.currentTarget.src = local
}

// 35000 -> "35k" untuk lencana harga
export const shortPrice = (price) => `${(price / 1000).toLocaleString('id-ID')}k`
