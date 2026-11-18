// services/pricing.js
// Satu-satunya tempat menghitung harga (CommonJS, sama dengan sisa backend). Fungsi murni: tanpa akses database.
// Uang = Rupiah bulat (integer). Harga dari browser diabaikan untuk item bertipe `menu`:
// harga dasar dan harga opsi selalu diambil dari katalog yang dikirim pemanggil (dibaca dari DB).
//
// Rumus (sama dengan KF dan docs/openapi.yaml):
//   line_total  = qty * (unit_price + jumlah extra_price opsi item itu)
//   subtotal    = jumlah line_total
//   grand_total = subtotal + ongkir semua pengiriman - diskon
//   pembayaran bersih = (dp + pelunasan) - refund

class PricingError extends Error {
  constructor(message, details) {
    super(message)
    this.name = 'PricingError'
    this.status = 400
    this.code = 'VALIDATION_ERROR'
    this.details = details
  }
}

const fail = (message, field) => {
  throw new PricingError(message, field ? [{ field, message }] : undefined)
}
const isRupiah = (n) => Number.isSafeInteger(n) && n >= 0

/**
 * Tetapkan harga setiap item dari katalog server.
 * @param items   item dari request: { delivery_index, item_type, menu_id, custom_name, unit_price, qty, option_ids }
 * @param catalog { menus: Map<id, {id, price}>, options: Map<id, {id, menu_id, extra_price}> }
 */
function resolveItems(items, catalog) {
  if (!Array.isArray(items) || items.length === 0) fail('Pesanan harus berisi minimal satu item', 'items')

  return items.map((item, i) => {
    const at = (f) => `items[${i}].${f}`
    if (!Number.isSafeInteger(item.qty) || item.qty < 1) fail('qty minimal 1', at('qty'))
    const optionIds = item.option_ids ?? []
    const type = item.item_type ?? 'menu'

    let unit_price
    let name = null
    let options = []

    if (type === 'menu') {
      const menu = catalog.menus.get(item.menu_id)
      if (!menu) fail('Menu tidak ditemukan', at('menu_id'))
      unit_price = menu.price // harga dari browser (item.unit_price) sengaja diabaikan
      options = optionIds.map((id) => {
        const opt = catalog.options.get(id)
        if (!opt || opt.menu_id !== menu.id) fail('Opsi tidak sesuai dengan menu', at('option_ids'))
        return { menu_option_id: opt.id, extra_price: opt.extra_price } // harga disalin saat pesan
      })
    } else {
      if (!item.custom_name) fail('Nama item wajib diisi', at('custom_name'))
      if (!isRupiah(item.unit_price)) fail('Harga item harus Rupiah bulat (0 untuk bonus)', at('unit_price'))
      if (optionIds.length > 0) fail('Item selain menu tidak punya opsi', at('option_ids'))
      unit_price = item.unit_price
      name = item.custom_name
    }

    for (const o of options) if (!isRupiah(o.extra_price)) fail('Harga opsi tidak valid', at('option_ids'))
    if (!isRupiah(unit_price)) fail('Harga tidak valid', at('unit_price'))

    const extra = options.reduce((s, o) => s + o.extra_price, 0)
    return {
      delivery_index: item.delivery_index ?? 0,
      item_type: type,
      menu_id: type === 'menu' ? item.menu_id : null,
      custom_name: name,
      qty: item.qty,
      unit_price,
      options,
      line_total: item.qty * (unit_price + extra),
    }
  })
}

/**
 * Hitung semua angka pesanan dari item yang sudah punya harga.
 * @param deliveries [{ method: 'antar_nabila'|'ambil_sendiri', shipping_fee }]
 *                   Antar Nabila dengan shipping_fee null/undefined = ongkir belum diisi (menunggu konfirmasi).
 * @param payments   [{ type: 'dp'|'pelunasan'|'refund', amount }]
 * @param status     status pesanan (kode), dipakai untuk balance_due dan refund_due
 */
function computeTotals({ items, deliveries, discount = 0, payments = [], status }) {
  if (!Array.isArray(deliveries) || deliveries.length === 0) fail('Pesanan harus punya minimal satu pengiriman', 'deliveries')
  if (!isRupiah(discount)) fail('Diskon harus Rupiah bulat', 'discount')

  let shipping_pending = false
  const per_delivery = deliveries.map((d, idx) => {
    let fee
    if (d.method === 'ambil_sendiri') {
      if (d.shipping_fee != null && d.shipping_fee !== 0) fail('Ambil Sendiri tidak dikenai ongkir', `deliveries[${idx}].shipping_fee`)
      fee = 0
    } else if (d.method === 'antar_nabila') {
      if (d.shipping_fee == null) {
        shipping_pending = true
        fee = 0
      } else if (isRupiah(d.shipping_fee)) {
        fee = d.shipping_fee
      } else {
        fail('Ongkir harus Rupiah bulat', `deliveries[${idx}].shipping_fee`)
      }
    } else {
      fail('Cara antar tidak dikenal', `deliveries[${idx}].method`)
    }
    const subtotal = items.filter((it) => it.delivery_index === idx).reduce((s, it) => s + it.line_total, 0)
    return { delivery_index: idx, subtotal, shipping_fee: fee }
  })

  for (const it of items) {
    if (!Number.isInteger(it.delivery_index) || it.delivery_index < 0 || it.delivery_index >= deliveries.length) {
      fail('delivery_index di luar daftar pengiriman', 'items.delivery_index')
    }
  }

  const subtotal = items.reduce((s, it) => s + it.line_total, 0)
  const shipping_total = per_delivery.reduce((s, d) => s + d.shipping_fee, 0)
  if (discount > subtotal + shipping_total) fail('Diskon melebihi total pesanan', 'discount')
  const grand_total = subtotal + shipping_total - discount

  const sum = (types) => payments.filter((p) => types.includes(p.type)).reduce((s, p) => s + p.amount, 0)
  const paid_net = sum(['dp', 'pelunasan']) - sum(['refund'])
  const cancelled = status === 'dibatalkan'

  return {
    subtotal,
    shipping_total,
    discount,
    grand_total,
    paid_net,
    balance_due: cancelled ? 0 : Math.max(0, grand_total - paid_net),
    refund_due: cancelled ? Math.max(0, paid_net) : 0,
    shipping_pending,
    per_delivery,
  }
}

/** Gabungan: tetapkan harga dari katalog, lalu hitung total. */
function calculateOrder({ items, deliveries, discount = 0, payments = [], status }, catalog) {
  const resolved = resolveItems(items, catalog)
  return { items: resolved, totals: computeTotals({ items: resolved, deliveries, discount, payments, status }) }
}

module.exports = { PricingError, resolveItems, computeTotals, calculateOrder }
