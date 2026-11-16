import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSessionState } from '../../hooks/useSessionState'
import OrderForm from '../../components/OrderForm'
import { api } from '../../api/client'
import { rupiah } from '../../utils/format'
import { menuPhoto, fallbackToLocal } from '../../utils/menuPhoto'
import Navbar from '../../components/Navbar'
import MenuCard from '../../components/MenuCard'
import Footer from '../../components/Footer'
import Reviews from '../../components/Reviews'
import heroDesktop from '../../assets/landing/hero-desktop.webp'
import heroMobile from '../../assets/landing/hero-mobile.webp'
import menuDesktop from '../../assets/landing/menu-desktop.webp'
import menuMobile from '../../assets/landing/menu-mobile.webp'
import gelombang from '../../assets/landing/gelombang.svg'
import iconArrow from '../../assets/landing/icon-arrow-right.svg'

const TEKS_PUTAR = ['Intip semua varian', 'Cek varian rasa', 'Pilih favoritmu', 'Harga mulai Rp25.000', 'Dibuat fresh setiap hari']

// Posisi foto di "Sorotan Menu" (Figma). Slot 0 = menu aktif; slot lain foto buram di sekitarnya.
// box = kotak luar (ukuran setelah diputar), img = ukuran foto sebelum diputar.
const SLOT_DESKTOP = [
  { box: 'left-[131.92px] top-[106.97px] h-[416.056px] w-[496.156px]', img: 'h-[370px] w-[460px] rotate-6' },
  { box: 'left-[536px] top-[134.62px] h-[200.758px] w-[234.008px]', img: 'h-[170px] w-[210px] -rotate-[9deg] blur-[3.5px]' },
  { box: 'left-[324.14px] -top-[1.51px] h-[135.022px] w-[161.722px]', img: 'h-[120px] w-[150px] -rotate-6 blur-[5px]' },
  { box: '-left-[5.9px] top-[300.43px] h-[200.13px] w-[227.809px]', img: 'h-[165px] w-[200px] rotate-[11deg] blur-[3.5px]' },
]
const SLOT_MOBILE = [
  { box: 'left-[57px] top-[74px] h-[237px] w-[276px]', img: 'h-[206px] w-[256px] rotate-6' },
  { box: 'left-[264px] top-[89px] h-[104px] w-[120px]', img: 'h-[89px] w-[106px] -rotate-[9deg] blur-[2px]' },
  { box: 'left-[162px] top-[23px] h-[76px] w-[89px]', img: 'h-[66px] w-[82px] -rotate-6 blur-[3px]' },
  { box: 'left-[8px] top-[167px] h-[104px] w-[117px]', img: 'h-[86px] w-[102px] rotate-[11deg] blur-[2px]' },
]

function Dots({ count, active, onPick }) {
  return (
    <div className="flex gap-2">
      {Array.from({ length: count }, (_, i) => (
        <button key={i} type="button" onClick={() => onPick(i)} aria-label={`Tampilkan menu ${i + 1}`}
          aria-current={i === active} className={`size-2.5 rounded-full ${i === active ? 'bg-ungu-gelap' : 'bg-[#e4dccb]'}`} />
      ))}
    </div>
  )
}

// Tiap menu punya elemen tetap (key = id) yang berpindah slot saat menu aktif berganti,
// sehingga posisi, ukuran, rotasi, dan blur beranimasi seperti Smart Animate di prototipe Figma.
// Di dalam slot, foto "melayang" (Figma: Gerak 1-3): foto samping naik-turun 6px, foto utama membesar-mengecil.
function Sorotan({ menus, active, setActive, slots }) {
  const n = menus.length
  return menus.map((menu, i) => {
    const slot = (i - active + n) % n
    const s = slots[Math.min(slot, 3)]
    const main = slot === 0
    return (
      <div key={menu.id}
        className={`absolute flex items-center justify-center transition-all duration-700 ease-in-out ${s.box} ${
          main ? 'z-10' : ''} ${slot > 3 ? 'opacity-0' : ''}`}>
        <div className={`flex size-full items-center justify-center ${main ? 'animate-bernapas' : 'animate-melayang'}`}
          style={{ animationDelay: `${-slot * 0.6}s` }}>
          <button type="button" onClick={() => setActive(i)} tabIndex={main ? -1 : 0}
            aria-label={main ? undefined : `Lihat ${menu.name}`}
            className={`flex-none transition-all duration-700 ease-in-out ${s.img}`}>
            <img src={menuPhoto(menu)} onError={fallbackToLocal(menu)} alt={main ? `Foto ${menu.name}` : ''}
              className={`size-full object-contain transition-[filter] duration-700 ${
                main ? 'drop-shadow-[0_30px_40px_rgba(30,5,77,0.28)]' : ''}`} />
          </button>
        </div>
      </div>
    )
  })
}

function Hero({ menus }) {
  const [active, setActive] = useState(0)

  // Ganti menu sorotan tiap 3,5 detik (tidak berputar bila pengguna meminta gerak minimal)
  useEffect(() => {
    if (menus.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => setActive((a) => (a + 1) % menus.length), 3500)
    return () => clearInterval(t)
  }, [menus.length])

  const current = menus[active]

  return (
    <section className="relative h-[788px] overflow-hidden bg-kuning lg:h-[680px]">
      <picture>
        <source media="(min-width: 1024px)" srcSet={heroDesktop} />
        <img src={heroMobile} alt="" className="absolute inset-0 size-full object-cover object-top" />
      </picture>
      <img src={gelombang} alt="" className="absolute inset-x-0 bottom-0 h-[295px] w-full lg:h-[680px]" />

      <div className="relative mx-auto flex max-w-[1440px] flex-col px-4 pt-0.5 lg:h-full lg:flex-row lg:items-center lg:gap-8 lg:p-16">
        <div className="flex flex-col lg:w-[520px] lg:shrink-0 lg:gap-[26px]">
          <h1 className="font-lilita text-[64px] uppercase leading-[62px] text-ungu-gelap lg:text-[104px] lg:leading-[100px]">
            The<br />Creamy<br />Mac
          </h1>
          <div className="mt-[26px] flex flex-col items-center gap-4 lg:mt-0 lg:flex-row lg:gap-6">
            <a href="#menu" className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[10px] bg-ungu px-7 text-base font-bold text-white lg:h-14 lg:w-auto">
              Pesan sekarang
              <span className="flex size-[18px] items-center justify-center"><img src={iconArrow} alt="" width="12" height="12" /></span>
            </a>
            <a href="#menu" className="h-6 w-[169px] overflow-hidden text-center text-[15px] font-bold italic leading-6 text-ungu-gelap lg:text-left">
              <span className="sr-only">Lihat semua menu</span>
              <span className="flex animate-teks-putar flex-col" aria-hidden="true">
                {[...TEKS_PUTAR, TEKS_PUTAR[0]].map((t, i) => <span key={i} className="whitespace-nowrap">{t}</span>)}
              </span>
            </a>
          </div>
        </div>

        {current && (
          <>
            {/* Mobile */}
            <div className="relative mx-auto mt-4 h-[390px] w-[390px] shrink-0 lg:hidden">
              <Sorotan menus={menus} active={active} setActive={setActive} slots={SLOT_MOBILE} />
              <div className="absolute inset-x-0 top-[290px] flex flex-col items-center gap-1.5 text-center">
                <div key={current.id} className="flex animate-muncul flex-col items-center gap-1.5">
                  <p className="font-lilita text-[30px] leading-[1.15] text-ungu-gelap">{current.name}</p>
                  <p className="text-base font-extrabold text-ungu">{rupiah(current.price)}</p>
                </div>
                <div className="mt-2"><Dots count={Math.min(menus.length, 4)} active={active} onPick={setActive} /></div>
              </div>
            </div>
            {/* Desktop: kanvas 760x552 sesuai Figma, diperkecil di layar < 1440px */}
            <div className="relative hidden h-[552px] w-[760px] shrink-0 lg:block lg:[zoom:0.5] xl:[zoom:0.8] min-[1440px]:[zoom:1]">
              <Sorotan menus={menus} active={active} setActive={setActive} slots={SLOT_DESKTOP} />
              <div className="absolute left-[566px] top-[340px] flex flex-col gap-1.5">
                <div key={current.id} className="flex animate-muncul flex-col gap-1.5">
                  <p className="font-lilita text-[38px] leading-[1.15] text-ungu-gelap">{current.name}</p>
                  <p className="text-lg font-extrabold text-ungu">{rupiah(current.price)}</p>
                </div>
                <Dots count={Math.min(menus.length, 4)} active={active} onPick={setActive} />
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  )
}

export default function Landing() {
  const [menus, setMenus] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [cart, setCart] = useSessionState('mm-keranjang', {}) // { [menuId]: qty }, dipakai juga di /pesan
  const [, setLastOrder] = useSessionState('mm-pesanan-terakhir', null)
  const navigate = useNavigate()

  function loadMenus() {
    setStatus('loading')
    api('/menus')
      .then((res) => {
        // Respons di luar kontrak ({ menus: [...] }) diperlakukan sebagai gagal, bukan dibiarkan crash
        if (!Array.isArray(res?.menus)) throw new Error('Format respons /menus tidak sesuai kontrak')
        setMenus(res.menus)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }
  useEffect(loadMenus, [])

  const change = (id, delta) =>
    setCart((c) => {
      const qty = Math.min(50, Math.max(0, (c[id] || 0) + delta))
      const next = { ...c, [id]: qty }
      if (!qty) delete next[id]
      return next
    })

  const porsi = Object.values(cart).reduce((a, b) => a + b, 0)
  // Hanya untuk tampilan; total resmi tetap dihitung server
  const subtotal = menus.reduce((sum, m) => sum + (cart[m.id] || 0) * m.price, 0)

  return (
    <div className={`bg-krem font-sans text-ungu-gelap ${porsi ? 'pb-[92px] lg:pb-0' : ''}`}>
      <Navbar />
      <main>
        <Hero menus={menus} />
        <Reviews />

        <section id="menu" className="relative scroll-mt-4 overflow-hidden bg-kuning px-5 pb-10 pt-6 lg:px-16 lg:pb-[88px] lg:pt-[72px]">
          <picture>
            <source media="(min-width: 1024px)" srcSet={menuDesktop} />
            <img src={menuMobile} alt="" className="absolute inset-0 size-full object-cover object-top" />
          </picture>
          <div className="relative mx-auto max-w-[1312px]">
            <div className="lg:flex lg:items-end lg:justify-between">
              <h2 className="font-lilita text-[44px] leading-[1.15] text-ungu lg:text-[72px]">Menu hari ini</h2>
              <p className="mt-3 text-[13px] font-bold lg:mt-0 lg:text-base">
                Klik menu untuk menambahkan<span className="hidden lg:inline">, klik lagi jumlahnya</span>
              </p>
            </div>

            {status === 'loading' && <p role="status" className="mt-10 text-base font-bold">Memuat menu…</p>}
            {status === 'error' && (
              <div role="alert" className="mt-10 flex flex-wrap items-center gap-3 text-base font-bold">
                Menu belum bisa dimuat.
                <button type="button" onClick={loadMenus} className="rounded-[10px] bg-ungu-gelap px-4 py-2 text-white">Coba lagi</button>
              </div>
            )}
            {status === 'ready' && !menus.length && (
              <p role="status" className="mt-10 text-base font-bold">Belum ada menu yang tersedia hari ini.</p>
            )}
            {status === 'ready' && menus.length > 0 && (
              <div className="mx-auto mt-[47px] grid max-w-[430px] gap-12 lg:mt-7 lg:max-w-[640px] lg:gap-6 min-[1440px]:max-w-none min-[1440px]:grid-cols-2 min-[1440px]:gap-x-8">
                {menus.map((menu, i) => (
                  <MenuCard
                    key={menu.id}
                    menu={menu}
                    qty={cart[menu.id] || 0}
                    onAdd={() => change(menu.id, 1)}
                    onRemove={() => change(menu.id, -1)}
                    photoLeft={i % 2 === 1}
                    photoLeftLg={i % 4 === 1 || i % 4 === 2}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Form pre-order desktop (Figma: bagian "Pre-order"); di HP form ada di halaman /pesan */}
        <section id="pre-order" className="hidden scroll-mt-4 bg-krem px-16 pb-24 pt-20 lg:block" aria-labelledby="judul-preorder">
          <div className="mx-auto max-w-[1312px]">
            <div className="mb-7 flex items-end justify-between">
              <h2 id="judul-preorder" className="font-lilita text-[56px] leading-[1.15]">Pre-order</h2>
              <p className="text-base font-bold text-abu">Tanpa login · paling lambat H-1 · area Jakarta</p>
            </div>
            <OrderForm menus={menus} cart={cart} setCart={setCart}
              onSubmitted={(order, context) => { setLastOrder({ order, context }); navigate('/pesanan/terkirim', { state: { order, context } }) }} />
          </div>
        </section>
      </main>
      <Footer />

      {/* Ringkasan keranjang di HP (Figma: Bottom Bar) */}
      {porsi > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex h-[92px] items-center justify-between bg-white px-4 shadow-[0_-8px_24px_rgba(30,5,77,0.08)] lg:hidden">
          <div>
            <p className="text-xs font-semibold text-abu">{porsi} porsi</p>
            <p className="text-xl font-extrabold" aria-live="polite">{rupiah(subtotal)}</p>
          </div>
          <Link to="/pesan" className="flex h-[52px] w-[115px] items-center justify-center gap-2 rounded-[10px] bg-ungu text-[15px] font-bold text-white">
            Lanjut <img src={iconArrow} alt="" width="12" height="12" />
          </Link>
        </div>
      )}
    </div>
  )
}
