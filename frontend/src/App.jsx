import { Routes, Route } from 'react-router-dom'
import Landing from './pages/public/Landing.jsx'
import Order from './pages/public/Order.jsx'
import OrderSummary from './pages/public/OrderSummary.jsx'
import Login from './pages/admin/Login.jsx'
import Menus from './pages/admin/Menus.jsx'
import AdminLayout from './components/admin/AdminLayout.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/pesan" element={<Order />} />
      <Route path="/pesanan/terkirim" element={<OrderSummary />} />
      {/* Rute admin tersembunyi (KF 9.2): /dapur = login, halaman lain wajib sesi */}
      <Route path="/dapur">
        <Route index element={<Login />} />
        <Route element={<AdminLayout />}>
          <Route path="beranda" element={<p>Dashboard Operasional (segera)</p>} />
          <Route path="menu" element={<Menus />} />
        </Route>
      </Route>
    </Routes>
  )
}