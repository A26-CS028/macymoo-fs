import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'

// Aturan & Privasi (Figma: Modal Aturan & Privasi desktop / sheet HP). Halaman /aturan dan /privasi
// karena ditautkan dari footer dan form PO (dibuka di tab baru supaya isian form tidak hilang).
// Isi mengikuti KF bagian 4, 6, 8, 11, dan 12.
const Svg = ({ d }) => (
  <svg viewBox="0 0 24 24" className="size-6 shrink-0 text-ungu" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
)
const IKON = {
  kalender: 'M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z',
  jam: 'M12 7v5l3 2M12 21a9 9 0 100-18 9 9 0 000 18z',
  truk: 'M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a2 2 0 100-4 2 2 0 000 4zM17 19a2 2 0 100-4 2 2 0 000 4z',
  ulang: 'M3 12a9 9 0 109-9 9 9 0 00-6.4 2.6L3 8M3 3v5h5',
  dompet: 'M3 7h15a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7zm0 0V6a2 2 0 012-2h11v3M16 13h1',
  batal: 'M6 6l12 12M18 6L6 18',
  dokumen: 'M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5zM14 3v5h5M9 13h6M9 17h6',
  perisai: 'M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z',
  orang: 'M9 11a4 4 0 100-8 4 4 0 000 8zM3 21v-1a6 6 0 0112 0v1M17 8l4 4M21 8l-4 4',
  bot: 'M12 7V4H9M7 7h10a2 2 0 012 2v8a2 2 0 01-2 2H7a2 2 0 01-2-2V9a2 2 0 012-2zM15 12v2M9 12v2',
  gembok: 'M6 11h12v10H6zM8 11V7a4 4 0 018 0v4',
}

const ATURAN = [
  ['kalender', 'Pre-Order H-1', 'Pesan paling lambat sehari sebelum tanggal kirim. Pesanan untuk hari ini lewat WhatsApp, keputusan Nabila.'],
  ['jam', 'Bayar dalam 4 jam', 'Untuk bayar di muka: paling lambat 4 jam setelah tagihan dikirim. Lewat batas, pesanan dibatalkan.'],
  ['truk', 'Ongkir dikonfirmasi', 'Antar dihitung Nabila per alamat. Ambil sendiri Rp0, boleh pesan GoSend sendiri.'],
  ['ulang', 'Jadwal ulang & refund', 'Jika ada kendala, Nabila mengabari tanggal baru via WA. Tidak setuju: pesanan dibatalkan dan uang dikembalikan.'],
  ['dompet', 'Cara bayar', 'QRIS GoPay, transfer bank, atau tunai. DP tidak ada di form; bicarakan dengan Nabila lewat WA.'],
  ['batal', 'Ubah atau batal', 'Hubungi Nabila lewat WhatsApp. Pesanan dimasak setelah dikonfirmasi dan dibayar.'],
]
const PRIVASI = [
  ['dokumen', 'Data yang disimpan', 'Nama, nomor WhatsApp, alamat antar, dan isi pesanan.'],
  ['perisai', 'Untuk apa', 'Hanya untuk memproses & mengantar pesanan. Tidak dijual atau dibagikan.'],
  ['orang', 'Hak kamu', 'Minta data dianonimkan kapan saja lewat WhatsApp Nabila.'],
  ['bot', 'Chat MooBot', 'Disimpan tanpa identitas. Diproses Gemini API (Google) dan dapat dipakai Google; jangan tulis data pribadi.'],
  ['gembok', 'Keamanan', 'Link status memakai token acak. Halaman ini memakai verifikasi Cloudflare Turnstile untuk menangkal bot.'],
]

function Kartu({ ikon, judul, isi }) {
  return (
    <li className="flex gap-3 lg:flex-col lg:gap-3 lg:rounded-[20px] lg:bg-krem-field lg:p-5">
      <Svg d={IKON[ikon]} />
      <div>
        <h3 className="text-[17px] font-bold lg:text-lg">{judul}</h3>
        <p className="mt-0.5 text-[15px] font-medium text-abu lg:mt-1.5">{isi}</p>
      </div>
    </li>
  )
}

export default function Rules({ tab = 'aturan' }) {
  const navigate = useNavigate()
  const privasi = tab === 'privasi'
  // Dibuka di tab baru dari form: "Saya mengerti" menutup tab itu; selain itu kembali ke halaman sebelumnya
  const mengerti = () => (window.opener ? window.close() : window.history.length > 1 ? navigate(-1) : navigate('/'))

  return (
    <div className="min-h-screen bg-krem font-sans text-ungu-gelap">
      <Navbar cta={<Link to="/pesan" className="flex h-12 items-center rounded-[10px] bg-ungu-gelap px-5 text-[15px] font-bold text-white">Pesan sekarang</Link>} />
      <main className="mx-auto max-w-[960px] px-4 py-6 lg:py-12">
        <article className="rounded-[24px] bg-white px-5 pb-6 pt-5 lg:px-10 lg:pb-10 lg:pt-9">
          <h1 className="text-[26px] font-bold lg:text-[32px]">Aturan & Privasi</h1>
          <nav aria-label="Bagian" className="mt-4 grid grid-cols-2 text-center text-[15px] font-semibold">
            {[['aturan', '/aturan', 'Aturan', 'Aturan Pemesanan'], ['privasi', '/privasi', 'Privasi (UU PDP)', 'Kebijakan Privasi (UU PDP)']].map(([k, to, pendek, panjang]) => (
              <Link key={k} to={to} replace aria-current={tab === k ? 'page' : undefined}
                className={`pb-2 ${tab === k ? 'font-bold after:mx-auto after:mt-2 after:block after:h-1 after:w-8 after:rounded-full after:bg-ungu' : 'text-abu hover:text-ungu-gelap'}`}>
                <span className="lg:hidden">{pendek}</span><span className="hidden lg:inline">{panjang}</span>
              </Link>
            ))}
          </nav>

          {!privasi ? (
            <>
              <ul className="mt-5 flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:gap-4">{ATURAN.map(([i, j, s]) => <Kartu key={j} ikon={i} judul={j} isi={s} />)}</ul>
              <h2 className="mt-8 text-lg font-bold lg:mt-6">Kebijakan Privasi (UU PDP)</h2>
              <ul className="mt-4 flex flex-col gap-6 lg:grid lg:grid-cols-3 lg:gap-4">{PRIVASI.slice(0, 3).map(([i, j, s]) => <Kartu key={j} ikon={i} judul={j} isi={s} />)}</ul>
              <p className="mt-4 text-sm font-medium text-abu">Rincian lengkap ada di tab <Link to="/privasi" replace className="font-bold text-ungu underline">Kebijakan Privasi</Link>.</p>
            </>
          ) : (
            <>
              <p className="mt-5 text-[15px] font-medium text-abu">Macyourmoo mengikuti Undang-Undang Pelindungan Data Pribadi (UU PDP). Data dipakai seperlunya dan hanya untuk pesananmu.</p>
              <ul className="mt-5 flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:gap-4">{PRIVASI.map(([i, j, s]) => <Kartu key={j} ikon={i} judul={j} isi={s} />)}</ul>
            </>
          )}

          <button type="button" onClick={mengerti} className="mt-8 h-14 w-full rounded-[12px] bg-ungu text-[17px] font-bold text-white">Saya mengerti</button>
        </article>
      </main>
      <Footer />
    </div>
  )
}
