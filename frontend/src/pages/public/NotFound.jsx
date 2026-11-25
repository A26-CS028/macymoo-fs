import { Link } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import logo from '../../assets/landing/logo.webp'
import pola from '../../assets/landing/pola-brokoli.svg'

// 404 (Figma: Token 404 desktop/HP). token=true untuk link status yang salah; selain itu halaman umum.
// shortcut: tombol "Tanya Nabila via WA" dari desain belum ada karena nomor Nabila belum punya endpoint publik.
export default function NotFound({ token = false }) {
  return (
    <div className="flex min-h-screen flex-col bg-krem font-sans text-ungu-gelap">
      <Navbar cta={<Link to="/pesan" className="flex h-12 items-center rounded-[10px] bg-ungu-gelap px-5 text-[15px] font-bold text-white">Pesan sekarang</Link>} />
      <main className="flex flex-1 flex-col items-center justify-center bg-repeat px-6 py-16 text-center" style={{ backgroundImage: `url("${pola}")` }}>
        <p className="flex items-center gap-4 font-sans text-[120px] font-extrabold leading-none text-ungu lg:text-[132px]" aria-hidden="true">
          4<img src={logo} alt="" className="h-[96px] w-auto lg:h-[108px]" />4
        </p>
        <h1 className="mt-6 text-[26px] font-extrabold lg:text-[34px]">{token ? 'Link status tidak ditemukan' : 'Halaman tidak ditemukan'}</h1>
        <p className="mt-3 max-w-[520px] text-[15px] font-medium text-abu lg:text-base">
          {token ? 'Token pada link salah atau sudah tidak berlaku. Cek kembali link dari pesan WhatsApp Nabila' : 'Alamat yang kamu buka tidak ada. Mungkin salah ketik, atau halamannya sudah dipindah.'}
        </p>
        <Link to="/" className="mt-6 flex h-12 w-full max-w-[340px] items-center justify-center rounded-[10px] bg-ungu px-6 text-[15px] font-bold text-white lg:w-auto">Kembali ke Beranda</Link>
      </main>
    </div>
  )
}
