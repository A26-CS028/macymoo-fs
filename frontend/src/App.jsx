import { Routes, Route } from 'react-router-dom'
import Login from './pages/admin/Login.jsx'
import AdminLayout from './components/admin/AdminLayout.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<p className="p-4 text-xl">macyourmoo</p>} />
      {/* Rute admin tersembunyi (KF 9.2): /dapur = login, halaman lain wajib sesi */}
      <Route path="/dapur">
        <Route index element={<Login />} />
        <Route element={<AdminLayout />}>
          <Route path="beranda" element={<p>Dashboard Operasional (segera)</p>} />
        </Route>
      </Route>
    </Routes>
  )
}
