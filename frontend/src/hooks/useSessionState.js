import { useEffect, useState } from 'react'

// useState yang disimpan di sessionStorage: keranjang dan isian form tetap ada saat pindah halaman
// (landing -> /pesan di HP) atau muat ulang, dan hilang saat tab ditutup.
export function useSessionState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const saved = sessionStorage.getItem(key)
      return saved ? JSON.parse(saved) : initial
    } catch {
      return initial
    }
  })
  useEffect(() => {
    sessionStorage.setItem(key, JSON.stringify(value))
  }, [key, value])
  return [value, setValue]
}
