const test = require('node:test')
const assert = require('node:assert/strict')
const { calculateOrder, resolveItems, computeTotals, PricingError } = require('../src/services/pricing')

// Katalog contoh (harga dari KF bagian 3). Harga opsi paha dan keju bersifat contoh uji.
const catalog = {
  menus: new Map([
    [1, { id: 1, price: 35000 }], // Mackster
    [2, { id: 2, price: 37000 }], // Nutrimac
    [3, { id: 3, price: 27000 }], // Wraphoria
    [4, { id: 4, price: 25000 }], // Mac Bites
  ]),
  options: new Map([
    [1, { id: 1, menu_id: 1, extra_price: 3000 }], // keju untuk Mackster
    [2, { id: 2, menu_id: 3, extra_price: 3000 }], // keju untuk Wraphoria
    [3, { id: 3, menu_id: 3, extra_price: 5000 }], // ayam paha untuk Wraphoria (contoh)
    [4, { id: 4, menu_id: 1, extra_price: 0 }], // pedas light
  ]),
}
const pickup = { method: 'ambil_sendiri', shipping_fee: 0 }
const antar = (fee) => ({ method: 'antar_nabila', shipping_fee: fee })

test('Uji KF 1: 2 Mackster + 1 Nutrimac, Ambil Sendiri = Rp107.000', () => {
  const { totals } = calculateOrder(
    {
      items: [
        { delivery_index: 0, item_type: 'menu', menu_id: 1, qty: 2 },
        { delivery_index: 0, item_type: 'menu', menu_id: 2, qty: 1 },
      ],
      deliveries: [pickup],
    },
    catalog
  )
  assert.equal(totals.subtotal, 107000)
  assert.equal(totals.shipping_total, 0)
  assert.equal(totals.grand_total, 107000)
})

test('Uji KF 1: harga dari browser diabaikan untuk item menu', () => {
  const { totals } = calculateOrder(
    {
      items: [
        { delivery_index: 0, item_type: 'menu', menu_id: 1, qty: 2, unit_price: 1 },
        { delivery_index: 0, item_type: 'menu', menu_id: 2, qty: 1, unit_price: 1 },
      ],
      deliveries: [pickup],
    },
    catalog
  )
  assert.equal(totals.grand_total, 107000)
})

test('Uji KF 3: 2 pengiriman, Wraphoria 5 pcs, ongkir Rp20.000 per kirim = Rp310.000', () => {
  const { totals } = calculateOrder(
    {
      items: [
        { delivery_index: 0, item_type: 'menu', menu_id: 3, qty: 5 },
        { delivery_index: 1, item_type: 'menu', menu_id: 3, qty: 5 },
      ],
      deliveries: [antar(20000), antar(20000)],
    },
    catalog
  )
  assert.equal(totals.subtotal, 270000)
  assert.equal(totals.shipping_total, 40000)
  assert.equal(totals.grand_total, 310000)
  assert.deepEqual(totals.per_delivery, [
    { delivery_index: 0, subtotal: 135000, shipping_fee: 20000 },
    { delivery_index: 1, subtotal: 135000, shipping_fee: 20000 },
  ])
})

test('Opsi: harga tambahan dikalikan qty dan disalin ke item', () => {
  const { items, totals } = calculateOrder(
    { items: [{ delivery_index: 0, item_type: 'menu', menu_id: 1, qty: 2, option_ids: [1, 4] }], deliveries: [pickup] },
    catalog
  )
  assert.equal(totals.grand_total, 76000) // 2 x (35000 + 3000 + 0)
  assert.deepEqual(items[0].options, [
    { menu_option_id: 1, extra_price: 3000 },
    { menu_option_id: 4, extra_price: 0 },
  ])
})

test('Opsi milik menu lain ditolak', () => {
  assert.throws(
    () => resolveItems([{ item_type: 'menu', menu_id: 1, qty: 1, option_ids: [3] }], catalog),
    PricingError
  )
})

test('Item bebas, bundling, bonus Rp0, dan kolaborasi memakai unit_price dari MacLab', () => {
  const { totals } = calculateOrder(
    {
      items: [
        { delivery_index: 0, item_type: 'item_bebas', custom_name: 'Nutrimac Small', unit_price: 30000, qty: 2 },
        { delivery_index: 0, item_type: 'bundling', custom_name: 'Paket 2 Mackster', unit_price: 65000, qty: 1 },
        { delivery_index: 0, item_type: 'bonus', custom_name: 'Bonus Mac Bites', unit_price: 0, qty: 1 },
      ],
      deliveries: [antar(20000)],
    },
    catalog
  )
  assert.equal(totals.subtotal, 125000)
  assert.equal(totals.grand_total, 145000)
})

test('Item selain menu wajib punya nama dan harga bulat', () => {
  assert.throws(() => resolveItems([{ item_type: 'bonus', unit_price: 0, qty: 1 }], catalog), PricingError)
  assert.throws(() => resolveItems([{ item_type: 'bonus', custom_name: 'x', unit_price: 1.5, qty: 1 }], catalog), PricingError)
  assert.throws(() => resolveItems([{ item_type: 'bonus', custom_name: 'x', qty: 1 }], catalog), PricingError)
})

test('Diskon dikurangkan dari subtotal dan ongkir', () => {
  const { totals } = calculateOrder(
    { items: [{ delivery_index: 0, item_type: 'menu', menu_id: 2, qty: 1 }], deliveries: [antar(20000)], discount: 7000 },
    catalog
  )
  assert.equal(totals.discount, 7000)
  assert.equal(totals.grand_total, 50000) // 37000 + 20000 - 7000
})

test('Diskon melebihi total ditolak', () => {
  assert.throws(
    () => calculateOrder({ items: [{ delivery_index: 0, item_type: 'menu', menu_id: 4, qty: 1 }], deliveries: [pickup], discount: 25001 }, catalog),
    PricingError
  )
})

test('Antar Nabila tanpa ongkir: subtotal saja dan shipping_pending true', () => {
  const { totals } = calculateOrder(
    { items: [{ delivery_index: 0, item_type: 'menu', menu_id: 1, qty: 1 }], deliveries: [antar(null)] },
    catalog
  )
  assert.equal(totals.shipping_pending, true)
  assert.equal(totals.shipping_total, 0)
  assert.equal(totals.grand_total, 35000)
})

test('Ambil Sendiri dengan ongkir lebih dari 0 ditolak', () => {
  assert.throws(
    () => calculateOrder({ items: [{ delivery_index: 0, item_type: 'menu', menu_id: 1, qty: 1 }], deliveries: [{ method: 'ambil_sendiri', shipping_fee: 5000 }] }, catalog),
    PricingError
  )
})

test('qty 0, menu tidak ada, dan delivery_index di luar daftar ditolak', () => {
  assert.throws(() => resolveItems([{ item_type: 'menu', menu_id: 1, qty: 0 }], catalog), PricingError)
  assert.throws(() => resolveItems([{ item_type: 'menu', menu_id: 99, qty: 1 }], catalog), PricingError)
  const items = resolveItems([{ delivery_index: 3, item_type: 'menu', menu_id: 1, qty: 1 }], catalog)
  assert.throws(() => computeTotals({ items, deliveries: [pickup] }), PricingError)
})

test('Pembayaran: DP lalu Lunas, sisa tagihan benar', () => {
  const base = { items: [{ delivery_index: 0, item_type: 'menu', menu_id: 1, qty: 2 }], deliveries: [pickup], status: 'diproses' }
  const afterDp = calculateOrder({ ...base, payments: [{ type: 'dp', amount: 30000 }] }, catalog).totals
  assert.equal(afterDp.paid_net, 30000)
  assert.equal(afterDp.balance_due, 40000)
  const afterLunas = calculateOrder({ ...base, payments: [{ type: 'dp', amount: 30000 }, { type: 'pelunasan', amount: 40000 }] }, catalog).totals
  assert.equal(afterLunas.balance_due, 0)
})

test('Pesanan dibatalkan: sisa tagihan 0 dan refund_due terisi bila sudah bayar', () => {
  const t = calculateOrder(
    {
      items: [{ delivery_index: 0, item_type: 'menu', menu_id: 1, qty: 2 }],
      deliveries: [pickup],
      status: 'dibatalkan',
      payments: [{ type: 'pelunasan', amount: 70000 }],
    },
    catalog
  ).totals
  assert.equal(t.balance_due, 0)
  assert.equal(t.refund_due, 70000)
  const refunded = calculateOrder(
    {
      items: [{ delivery_index: 0, item_type: 'menu', menu_id: 1, qty: 2 }],
      deliveries: [pickup],
      status: 'dibatalkan',
      payments: [{ type: 'pelunasan', amount: 70000 }, { type: 'refund', amount: 70000 }],
    },
    catalog
  ).totals
  assert.equal(refunded.paid_net, 0)
  assert.equal(refunded.refund_due, 0)
})

test('Semua angka hasil adalah bilangan bulat', () => {
  const { totals } = calculateOrder(
    { items: [{ delivery_index: 0, item_type: 'menu', menu_id: 3, qty: 3, option_ids: [2, 3] }], deliveries: [antar(15000)], discount: 1000 },
    catalog
  )
  for (const k of ['subtotal', 'shipping_total', 'discount', 'grand_total', 'paid_net', 'balance_due', 'refund_due']) {
    assert.ok(Number.isInteger(totals[k]), k)
  }
  assert.equal(totals.grand_total, 3 * (27000 + 3000 + 5000) + 15000 - 1000) // 119000
})
