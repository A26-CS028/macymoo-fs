import { Navigate, Outlet } from 'react-router-dom'
import { api } from '../../api/client'
import { useAuth } from '../../hooks/useAuth'

// Pembungkus semua halaman admin: tanpa sesi sah, dialihkan ke halaman login /dapur.
export default function AdminLayout() {
  const { admin, setAdmin } = useAuth()

  if (admin === undefined) {
    return <p className="p-6 text-sm text-abu" role="status">Memeriksa sesi…</p>
  }
  if (!admin) return <Navigate to="/dapur" replace />

  async function logout() {
    await api('/auth/logout', { method: 'POST' }).catch(() => {})
    setAdmin(null)
  }

  return (
    <div className="min-h-screen bg-krem-field text-ungu-gelap">
      <header className="flex items-center justify-between bg-white px-4 py-3 shadow-sm">
        <span className="font-bold">Macyourmoo</span>
        <div className="flex items-center gap-3 text-sm">
          <span>{admin.username}</span>
          <button
            type="button"
            onClick={logout}
            className="rounded-lg border border-abu-label px-3 py-1.5 font-semibold hover:bg-krem-field"
          >
            Keluar
          </button>
        </div>
      </header>
      <main className="p-4">
        <Outlet context={admin} />
      </main>
    </div>
  )
}
