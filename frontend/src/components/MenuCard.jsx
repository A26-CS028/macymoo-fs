import iconMinus from '../assets/landing/icon-minus.svg'
import iconPlus from '../assets/landing/icon-plus.svg'
import { menuPhoto, fallbackToLocal, shortPrice } from '../utils/menuPhoto'

// Kartu menu "Menu hari ini" (Figma: Menu/Desktop dan Menu/Mobile).
// Klik kartu = tambah 1 porsi; tombol -/+ mengubah jumlah. Kartu terpilih tampil "tertekan" (kuning).
// photoLeft / photoLeftLg: posisi foto di mobile dan desktop (desain memakai pola berbeda).
const STYLE = {
  default: { slab: 'bg-ungu', edge: 'bg-ungu-tua', title: 'text-kuning', desc: 'text-white', badge: 'bg-ungu-gelap' },
  dipilih: { slab: 'bg-kuning', edge: 'bg-kuning-tua', title: 'text-ungu-gelap', desc: 'text-ungu-gelap', badge: 'bg-ungu' },
  habis: { slab: 'bg-abu-muda', edge: 'bg-abu-tua', title: 'text-white', desc: 'text-white', badge: 'bg-abu' },
}

export default function MenuCard({ menu, qty, onAdd, onRemove, photoLeft, photoLeftLg }) {
  const state = !menu.is_available ? 'habis' : qty > 0 ? 'dipilih' : 'default'
  const s = STYLE[state]
  const pressed = state === 'dipilih'
  // Figma State=Hover: kartu naik 4px dan muncul "+ Tambah ke pesanan" (hanya kartu belum dipilih)
  const lift = state === 'default' ? 'group-hover:-translate-y-1 group-focus-within:-translate-y-1' : ''
  const move = `transition-all duration-200 ease-out ${lift}`
  // Sisi foto per ukuran layar. Kartu tertekan turun 5px (mobile) / 7px (desktop).
  const photoPos = `${photoLeft ? '-left-2' : '-right-2'} ${photoLeftLg ? 'lg:-left-3 lg:right-auto' : 'lg:-right-3 lg:left-auto'}`
  const badgePos = `${photoLeft ? 'left-[100px]' : 'right-[100px]'} ${photoLeftLg ? 'lg:left-[172px] lg:right-auto' : 'lg:right-[172px] lg:left-auto'}`
  const infoPos = `${photoLeft ? 'right-6 items-end text-right' : 'left-6 items-start text-left'} ${
    photoLeftLg ? 'lg:right-14 lg:left-auto lg:items-end lg:text-right' : 'lg:left-14 lg:right-auto lg:items-start lg:text-left'
  }`

  return (
    <div className="group relative h-[182px] w-full lg:h-[270px]">
      <div className={`absolute inset-x-1.5 top-2 h-[172px] rounded-[26px] lg:inset-x-6 lg:top-[50px] lg:h-[204px] ${s.edge}`} />
      <div className={`absolute inset-x-1.5 h-[172px] rounded-[26px] lg:inset-x-6 lg:h-[204px] ${move} ${s.slab} ${
        pressed ? 'top-[5px] lg:top-[47px]' : 'top-0 lg:top-10'}`} />

      {/* Tombol transparan seukuran kartu: klik kartu = tambah porsi */}
      {menu.is_available && (
        <button type="button" onClick={onAdd} disabled={qty >= 50}
          className="absolute inset-x-1.5 top-0 z-10 h-[180px] rounded-[26px] lg:inset-x-6 lg:top-10 lg:h-[214px]"
          aria-label={`Tambah ${menu.name}${qty ? `, sekarang ${qty} porsi` : ''}`} />
      )}

      <div className={`absolute flex w-[180px] flex-col gap-2 lg:w-[316px] ${move} ${infoPos} ${
        pressed ? 'top-[21px] lg:top-[75px]' : 'top-4 lg:top-[68px]'}`}>
        <h3 className={`whitespace-nowrap font-lilita text-[30px] leading-[1.15] lg:text-[46px] ${s.title}`}>{menu.name}</h3>
        {menu.description && (
          <p className={`text-xs font-semibold leading-4 lg:text-[15px] lg:leading-5 ${s.desc}`}>{menu.description}</p>
        )}
        {state === 'habis' && <p className="text-xs font-extrabold text-white lg:text-sm">Habis hari ini</p>}
        {state === 'default' && (
          <p aria-hidden="true" className="hidden text-sm font-extrabold text-kuning opacity-0 transition-opacity duration-200 lg:block lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
            + Tambah ke pesanan
          </p>
        )}
        {pressed && (
          <div className="relative z-20 flex h-[34px] items-center gap-0.5 rounded-[10px] bg-ungu-gelap px-1 lg:h-10">
            <button type="button" onClick={onRemove} aria-label={`Kurangi ${menu.name}`}
              className="flex size-7 items-center justify-center rounded-lg lg:size-[34px]">
              <img src={iconMinus} alt="" width="10" height="1.25" />
            </button>
            <span className="w-[26px] text-center text-sm font-extrabold text-white lg:text-base" aria-live="polite">{qty}</span>
            <button type="button" onClick={onAdd} disabled={qty >= 50} aria-label={`Tambah ${menu.name}`}
              className="flex size-7 items-center justify-center rounded-lg disabled:opacity-40 lg:size-[34px]">
              <img src={iconPlus} alt="" width="10" height="10" />
            </button>
          </div>
        )}
      </div>

      <img src={menuPhoto(menu)} onError={fallbackToLocal(menu)} alt={`Foto ${menu.name}`}
        className={`pointer-events-none absolute size-[154px] object-contain lg:size-[252px] ${move} ${photoPos} ${
          pressed ? 'top-[41px] lg:top-[31px]' : 'top-9 lg:top-6'} ${state === 'habis' ? 'grayscale-[30%]' : ''}`} />

      <div className={`pointer-events-none absolute flex size-[52px] items-center justify-center rounded-full font-lilita text-[19px] text-white lg:size-[70px] lg:text-[25px] ${move} ${badgePos} ${s.badge} ${
        pressed ? 'top-[119px] lg:top-[175px]' : 'top-[114px] lg:top-[168px]'}`}>
        {shortPrice(menu.price)}
      </div>
    </div>
  )
}
