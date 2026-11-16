import logo from '../assets/landing/logo.webp'

// Handle Instagram di Figma tidak konsisten (desktop @macyourmoo, mobile @mackyourmoo); pastikan ke Nabila.
const INSTAGRAM = 'macyourmoo'

export default function Footer() {
  return (
    <footer className="bg-ungu-gelap px-5 pb-8 pt-7 text-white lg:flex lg:h-[116px] lg:items-center lg:justify-between lg:px-16 lg:py-0">
      <a href="/" className="flex items-center gap-2.5">
        <img src={logo} alt="" className="h-[30px] w-[37px] object-contain lg:h-9 lg:w-[45px]" />
        <span className="text-[17px] font-extrabold lg:text-xl">Macyourmoo</span>
      </a>
      <nav aria-label="Tautan kaki" className="mt-4 flex flex-wrap gap-x-4 gap-y-3 text-[13px] font-semibold lg:mt-0 lg:gap-x-[29px] lg:text-sm">
        <a href="/aturan">Aturan Pemesanan</a>
        <a href="/privasi">Kebijakan Privasi</a>
        <a href={`https://instagram.com/${INSTAGRAM}`} target="_blank" rel="noopener noreferrer" className="basis-full lg:basis-auto">
          Instagram @{INSTAGRAM}
        </a>
      </nav>
      <p className="mt-4 text-xs text-abu-label lg:mt-0 lg:text-[13px]">© 2026 Macyourmoo</p>
    </footer>
  )
}
