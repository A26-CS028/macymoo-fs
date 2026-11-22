import { useState } from 'react'
import logo from '../assets/landing/logo.webp'
import iconBot from '../assets/landing/icon-bot.svg'

const LINKS = [
  { href: '#menu', label: 'Menu' },
  { href: '#pre-order', label: 'Pre-order' },
  { href: '#ulasan', label: 'Ulasan' },
  { href: '/aturan', label: 'Aturan & Privasi' },
]

// shortcut: ikon garis digambar ulang, ganti dengan aset Figma bila sudah diekspor.
const Svg = ({ children, className = 'size-6' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
    strokeLinejoin="round" className={className} aria-hidden="true">{children}</svg>
)
const IconMenu = () => <Svg><path d="M4 7h16M4 12h16M4 17h16" /></Svg>
const IconClose = () => <Svg><path d="M6 6l12 12M18 6L6 18" /></Svg>
const IconChevron = () => <Svg className="size-5"><path d="M9 6l6 6-6 6" /></Svg>
const SHEET_ICONS = {
  Ulasan: <Svg><path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z" /></Svg>,
  'Aturan & Privasi': <Svg><path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z" /></Svg>,
  'Tanya MooBot': <Svg><path d="M12 7V4H9M7 7h10a2 2 0 012 2v8a2 2 0 01-2 2H7a2 2 0 01-2-2V9a2 2 0 012-2zM3 13h2M19 13h2M15 12v2M9 12v2" /></Svg>,
}

function Logo() {
  return (
    <a href="/" className="flex items-center gap-2.5" aria-label="Macyourmoo, ke beranda">
      <img src={logo} alt="" className="h-[30px] w-[37px] object-contain lg:h-10 lg:w-[50px]" />
      <span className="text-[17px] font-extrabold text-ungu-gelap lg:text-[22px]">Macyourmoo</span>
    </a>
  )
}

function MooBotButton({ onClick }) {
  return (
    <button type="button" onClick={onClick}
      className="flex h-12 items-center gap-2.5 rounded-[10px] bg-ungu-gelap pl-4 pr-5 text-[15px] font-bold text-white">
      <span className="flex size-[22px] items-center justify-center">
        <img src={iconBot} alt="" width="20.1667" height="16.5" />
      </span>
      Tanya MooBot
    </button>
  )
}

export default function Navbar({ onMooBot }) {
  const [open, setOpen] = useState(false)

  return (
    <header className="bg-kuning">
      <div className="flex h-16 items-center justify-between px-4 lg:h-[84px] lg:px-16">
        <Logo />
        <nav aria-label="Navigasi utama" className="hidden items-center gap-9 text-[15px] font-bold text-ungu-gelap lg:flex">
          {LINKS.map((l) => <a key={l.href} href={l.href}>{l.label}</a>)}
        </nav>
        <div className="hidden lg:block"><MooBotButton onClick={onMooBot} /></div>
        <button type="button" className="text-ungu-gelap lg:hidden" aria-label="Buka menu"
          aria-expanded={open} onClick={() => setOpen(true)}>
          <IconMenu />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-ungu-gelap/40 lg:hidden" onClick={() => setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="Menu"
            className="w-full rounded-t-[24px] bg-white px-5 pb-6 pt-2.5" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto h-1 w-10 rounded-full bg-[#e4dccb]" />
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xl font-extrabold text-ungu-gelap">Menu</p>
              <button type="button" aria-label="Tutup menu" className="text-ungu-gelap" onClick={() => setOpen(false)}>
                <IconClose />
              </button>
            </div>
            <ul className="mt-2">
              {['Ulasan', 'Aturan & Privasi', 'Tanya MooBot'].map((label) => (
                <li key={label}>
                  <a
                    href={label === 'Ulasan' ? '#ulasan' : label === 'Aturan & Privasi' ? '/aturan' : '#'}
                    onClick={(e) => {
                      setOpen(false)
                      if (label === 'Tanya MooBot') { e.preventDefault(); onMooBot?.() }
                    }}
                    className="flex h-[66px] items-center gap-3 text-base font-bold text-ungu-gelap"
                  >
                    <span className="text-ungu">{SHEET_ICONS[label]}</span>
                    <span className="flex-1">{label}</span>
                    <span className="text-abu"><IconChevron /></span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </header>
  )
}
