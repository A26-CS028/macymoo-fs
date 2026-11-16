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

const ROUTES = {
  'GET /menus': () => ({ menus: MENUS }),
}

// Mengembalikan undefined bila endpoint tidak di-mock, supaya client.js meneruskan ke backend asli.
export async function mockApi(path, options = {}) {
  const handler = ROUTES[`${(options.method || 'GET').toUpperCase()} ${path.split('?')[0]}`]
  if (!handler) return undefined
  await new Promise((r) => setTimeout(r, 300)) // jeda kecil supaya tampilan "memuat" ikut teruji
  return structuredClone(handler(options.body ? JSON.parse(options.body) : undefined))
}
