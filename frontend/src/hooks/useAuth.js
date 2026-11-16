import { useEffect, useState } from 'react'
import { api } from '../api/client'

// Cek sesi admin lewat GET /auth/me (cookie httpOnly tidak bisa dibaca JavaScript).
// admin: undefined = sedang dicek, null = belum masuk, objek = sudah masuk.
export function useAuth() {
  const [admin, setAdmin] = useState(undefined)

  useEffect(() => {
    api('/auth/me').then(setAdmin).catch(() => setAdmin(null))
  }, [])

  return { admin, setAdmin }
}
