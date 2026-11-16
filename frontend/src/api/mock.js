// Mock API di browser, hanya aktif saat `npm run dev` (lihat client.js); tidak ikut ke build produksi.
// Data mengikuti contoh di docs/openapi.yaml. Endpoint yang tidak ada di sini diteruskan ke backend asli.
// Tambah endpoint baru di ROUTES: kunci "METHOD /path", nilai fungsi (body) => data respons.

const opsi = (menuId, startId, ayam) => [
  ['pedas', 'Light', 0],
  ['pedas', 'Medium', 0],
  ['pedas', 'Spicy', 0],
  ['keju', 'Tambah keju', 3000],
  ...(menuId === 2 ? [['tanpa_makaroni', 'Tanpa makaroni', 0], ['tanpa_brokoli', 'Tanpa brokoli', 0]] : []),
  ...(ayam ? [['ayam', 'Ayam dada', 0], ['ayam', 'Ayam paha', 2000]] : []),
].map(([option_group, name, extra_price], i) => ({ id: startId + i, menu_id: menuId, option_group, name, extra_price }))

// photo_url null: frontend memakai foto bawaan dari src/assets/menu
const MENUS = [
  { id: 1, name: 'Mackster', description: 'Mac & cheese, saus keju kornet', price: 35000, photo_url: null, is_available: true, options: opsi(1, 1, false) },
  { id: 2, name: 'Nutrimac', description: 'Mac & cheese, brokoli, dada ayam panggang', price: 37000, photo_url: null, is_available: true, options: opsi(2, 5, true) },
  { id: 3, name: 'Wraphoria', description: 'Mac & cheese dan ayam krispi dalam tortila', price: 27000, photo_url: null, is_available: true, options: opsi(3, 13, true) },
  { id: 4, name: 'Mac Bites', description: '4 bites berbalut paper rice, isian ayam krispi, saus keju', price: 25000, photo_url: null, is_available: true, options: opsi(4, 19, true) },
]

const ymd = (offset) => {
  const d = new Date(Date.now() + 7 * 3600e3) // kira-kira Asia/Jakarta, cukup untuk data tiruan
  d.setUTCDate(d.getUTCDate() + offset)
  return d.toISOString().slice(0, 10)
}
const acak = (n, chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789') =>
  Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('')

// Meniru respons PublicOrder dari POST /orders (harga dihitung dari data menu di atas)
function createOrder(body) {
  const items = body.items.map((it, i) => {
    const menu = MENUS.find((m) => m.id === it.menu_id)
    const options = menu.options.filter((o) => it.option_ids.includes(o.id))
      .map((o) => ({ menu_option_id: o.id, name: o.name, option_group: o.option_group, extra_price: o.extra_price }))
    const line_total = it.qty * (menu.price + options.reduce((a, o) => a + o.extra_price, 0))
    return { id: 100 + i, delivery_id: 1, item_type: 'menu', menu_id: menu.id, name: menu.name, unit_price: menu.price, qty: it.qty, line_total, options, note: it.note || null }
  })
  const subtotal = items.reduce((a, it) => a + it.line_total, 0)
  const order_code = `MYM-${acak(5)}`
  return {
    order_code,
    public_token: acak(32, 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'),
    status: 'menunggu_konfirmasi',
    pay_status: 'belum_bayar',
    pay_timing: 'di_muka',
    pay_deadline_at: null,
    payment_overdue: false,
    deliveries: [{ id: 1, delivery_date: body.delivery_date, method: body.method, shipping_fee: 0, delivery_status: 'dijadwalkan', delivered_at: null }],
    items,
    totals: { subtotal, shipping_total: 0, discount: 0, grand_total: subtotal, paid_net: 0, balance_due: subtotal, refund_due: 0, shipping_pending: body.method === 'antar_nabila' },
    wa_link: `https://wa.me/6281200000000?text=${encodeURIComponent(`Halo Kak Nabila, saya sudah pesan dengan kode ${order_code}`)}`,
    created_at: new Date().toISOString(),
  }
}

// Contoh ulasan dari desain Figma (hanya untuk dev, tidak ikut ke produksi)
const REVIEWS = [
  [5, 'Saus kejunya beneran lumer, ayamnya juicy. Pesan lagi minggu depan!', 1],
  [5, 'Brokolinya masih renyah dan dada ayamnya nggak kering. Pas buat makan siang.', 3],
  [5, 'Gampang dibawa ke kampus, kejunya tetap creamy walau sudah dingin.', 4],
  [4, 'Pesan buat acara kantor, Nabila cepat banget konfirmasi ongkirnya.', 6],
  [5, 'Level pedasnya pas. Porsinya besar, kenyang sampai sore.', 9],
].map(([rating, comment, hariLalu], i) => ({ id: i + 1, rating, comment, created_at: new Date(Date.now() - hariLalu * 864e5).toISOString() }))

const ROUTES = {
  'GET /reviews': () => ({ reviews: REVIEWS }),
  'GET /menus': () => ({ menus: MENUS }),
  'GET /closed-dates': () => ({ closed_dates: [{ id: 1, closed_date: ymd(3) }, { id: 2, closed_date: ymd(5) }] }),
  'POST /orders': createOrder,
}

// Mengembalikan undefined bila endpoint tidak di-mock, supaya client.js meneruskan ke backend asli.
export async function mockApi(path, options = {}) {
  const handler = ROUTES[`${(options.method || 'GET').toUpperCase()} ${path.split('?')[0]}`]
  if (!handler) return undefined
  await new Promise((r) => setTimeout(r, 300)) // jeda kecil supaya tampilan "memuat" ikut teruji
  return structuredClone(handler(options.body ? JSON.parse(options.body) : undefined))
}
