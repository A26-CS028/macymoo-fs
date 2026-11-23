// Menyusun respons daftar masak (openapi: KitchenResponse). Fungsi murni: data dari query diberikan.
// Isi daftar masak = pesanan Diproses; Menunggu Pembayaran tampil terpisah di `unpaid` (KF 5).
const { isOverdue } = require('./paymentDeadline');
const { noteFlags } = require('./noteRules');

function groupBy(rows, key) {
  const map = new Map();
  for (const r of rows) {
    if (!map.has(r[key])) map.set(r[key], []);
    map.get(r[key]).push(r);
  }
  return map;
}

function buildKitchen({ date, deliveries, items, chosen, labels, menuOptions, moolabelActive }) {
  const itemsByDelivery = groupBy(items, 'delivery_id');
  const chosenByItem = groupBy(chosen, 'order_item_id');
  const labelsByItem = groupBy(labels, 'order_item_id');
  const optionsByMenu = groupBy(menuOptions, 'menu_id');

  const toDelivery = (d) => ({
    order_id: d.id,
    order_code: d.order_code,
    delivery_id: d.delivery_id,
    customer_name: d.customer_name,
    method: d.method,
    pay_status: d.pay_status,
    payment_overdue: isOverdue(d),
    items: (itemsByDelivery.get(d.delivery_id) || []).map((it) => {
      const picked = chosenByItem.get(it.id) || [];
      return {
        order_item_id: it.id,
        item_type: it.item_type,
        name: it.name,
        qty: it.qty,
        options: picked.map((o) => o.name),
        note: it.note,
        labels: (labelsByItem.get(it.id) || []).map((l) => l.label),
        note_flags: noteFlags({ note: it.note, chosen: picked, menuOptions: optionsByMenu.get(it.menu_id) || [] }),
      };
    }),
  });

  const inProgress = deliveries.filter((d) => d.status === 'diproses').map(toDelivery);
  const unpaid = deliveries.filter((d) => d.status === 'menunggu_pembayaran').map(toDelivery);

  const byMenu = new Map();
  let total = 0;
  for (const d of inProgress) {
    for (const it of d.items) {
      total += it.qty;
      byMenu.set(it.name, (byMenu.get(it.name) || 0) + it.qty);
    }
  }
  return {
    date,
    portions_total: total,
    portions_by_menu: [...byMenu].map(([name, qty]) => ({ name, qty })),
    in_progress: inProgress,
    unpaid,
    moolabel_active: moolabelActive,
  };
}

module.exports = { buildKitchen };
