import { Link, Navigate, Outlet } from 'react-router-dom'
import { api } from '../../api/client'
import { useAuth } from '../../hooks/useAuth'

// Pembungkus semua halaman admin: tanpa sesi sah, dialihkan ke halaman login /dapur.
// shortcut: sidebar dan tab bar dari Figma belum ada, ditambahkan bersama halaman Dashboard Operasional.
// Tautan MacLab di header bersifat sementara sampai sidebar ada.
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
        <div className="flex items-center gap-4">
          <span className="font-bold">Macyourmoo</span>
          <Link to="/dapur/maclab" className="text-sm font-semibold hover:underline">
            MacLab
          </Link>
        </div>
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