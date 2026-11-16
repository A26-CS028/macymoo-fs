import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import { useSessionState } from '../../hooks/useSessionState'
import OrderForm from '../../components/OrderForm'

// Halaman form pre-order di HP (Figma: "Mobile — Pesananmu"); di desktop form ada di landing (#pre-order).
export default function Order() {
  const [menus, setMenus] = useState(null)
  const [cart, setCart] = useSessionState('mm-keranjang', {})
  const [, setLastOrder] = useSessionState('mm-pesanan-terakhir', null)
  const navigate = useNavigate()

  useEffect(() => {
    api('/menus').then((r) => setMenus(Array.isArray(r?.menus) ? r.menus : [])).catch(() => setMenus([]))
  }, [])

  function done(order, context) {
    setLastOrder({ order, context })
    navigate('/pesanan/terkirim', { state: { order, context } })
  }

  return (
    <div className="min-h-screen bg-krem pb-[108px] font-sans text-ungu-gelap">
      <header className="flex h-16 items-center gap-3 px-4">
        <Link to="/#menu" aria-label="Kembali ke menu" className="p-1">
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
        </Link>
        <h1 className="text-lg font-bold">Pesananmu</h1>
      </header>
      <main className="px-4">
        {menus === null
          ? <p role="status" className="py-10 text-center font-bold">Memuat…</p>
          : <OrderForm menus={menus} cart={cart} setCart={setCart} onSubmitted={done} />}
      </main>
    </div>
  )
}
