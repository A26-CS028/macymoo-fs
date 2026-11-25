import { Routes, Route } from 'react-router-dom'
import Landing from './pages/public/Landing.jsx'
import Order from './pages/public/Order.jsx'
import OrderSummary from './pages/public/OrderSummary.jsx'
import OrderStatus from './pages/public/OrderStatus.jsx'
import NotFound from './pages/public/NotFound.jsx'
import Login from './pages/admin/Login.jsx'
import MacLab from './pages/admin/MacLab.jsx'
import Menus from './pages/admin/Menus.jsx'
import Orders from './pages/admin/Orders.jsx'
import OrderDetail from './pages/admin/OrderDetail.jsx'
import AdminLayout from './components/admin/AdminLayout.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/pesan" element={<Order />} />
      <Route path="/pesanan/terkirim" element={<OrderSummary />} />
      <Route path="/s/:token" element={<OrderStatus />} />
      {/* Rute admin tersembunyi (KF 9.2): /dapur = login, halaman lain wajib sesi */}
      <Route path="/dapur">
        <Route index element={<Login />} />
        <Route element={<AdminLayout />}>
          <Route path="beranda" element={<p>Dashboard Operasional (segera)</p>} />
          <Route path="pesanan" element={<Orders />} />
          <Route path="pesanan/:id" element={<OrderDetail />} />
          <Route path="maclab" element={<MacLab />} />
          <Route path="menu" element={<Menus />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}