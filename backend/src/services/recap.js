// Rekap keuangan (hanya angka, tanpa data pribadi). Murni: tidak menyentuh database.
// Sumber angka (openapi RecapRow, pilihan b):
//   subtotal, shipping_total  <- recap_deliveries, dikelompokkan menurut delivery_date
//   orders_count, discount_total, paid_net, outstanding <- recap_orders, menurut first_delivery_date
// exceljs dimuat saat ekspor diminta (lihat catatan di invoicePdf.js): gagal muat hanya merusak ekspor xlsx.

const DAY_MS = 86400000;
const toMs = (ymd) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};
const fromMs = (ms) => new Date(ms).toISOString().slice(0, 10);
// Senin dari minggu tanggal itu (sama dengan ISODOW Postgres: Senin = 1)
const mondayOf = (ymd) => fromMs(toMs(ymd) - ((new Date(toMs(ymd)).getUTCDay() + 6) % 7) * DAY_MS);

// Ekspresi pengelompokan, dipakai route. Nama kolom tetap (bukan input pengguna).
const BUCKET_SQL = {
  daily: (col) => col,
  weekly: (col) => `(${col} - (EXTRACT(ISODOW FROM ${col})::int - 1))`,
};

const n = (v) => Number(v || 0);

/**
 * @param period 'daily' | 'weekly'
 * @param from, to  'YYYY-MM-DD'
 * @param deliveryRows  [{ period_start, subtotal, shipping_total }]   (dari recap_deliveries)
 * @param orderRows     [{ period_start, orders_count, discount_total, paid_net, outstanding }] (dari recap_orders)
 * Semua periode dalam rentang selalu ada (nol bila kosong), supaya grafik tidak bolong.
 */
function buildRecap({ period, from, to, deliveryRows, orderRows }) {
  const byDelivery = new Map(deliveryRows.map((r) => [r.period_start, r]));
  const byOrder = new Map(orderRows.map((r) => [r.period_start, r]));
  const weekly = period === 'weekly';
  const step = weekly ? 7 : 1;

  const rows = [];
  for (let ms = toMs(weekly ? mondayOf(from) : from); ms <= toMs(to); ms += step * DAY_MS) {
    const start = fromMs(ms);
    const d = byDelivery.get(start) || {};
    const o = byOrder.get(start) || {};
    rows.push({
      period_start: start,
      period_end: weekly ? fromMs(ms + 6 * DAY_MS) : start,
      orders_count: n(o.orders_count),
      subtotal: n(d.subtotal),
      shipping_total: n(d.shipping_total),
      discount_total: n(o.discount_total),
      paid_net: n(o.paid_net),
      outstanding: n(o.outstanding),
    });
  }
  return { period, from, to, rows };
}

const COLUMNS = [
  { header: 'Periode mulai', key: 'period_start', width: 14 },
  { header: 'Periode selesai', key: 'period_end', width: 15 },
  { header: 'Jumlah pesanan', key: 'orders_count', width: 15 },
  { header: 'Omzet (subtotal)', key: 'subtotal', width: 18 },
  { header: 'Ongkir', key: 'shipping_total', width: 14 },
  { header: 'Diskon', key: 'discount_total', width: 14 },
  { header: 'Dibayar bersih', key: 'paid_net', width: 16 },
  { header: 'Tagihan belum terbayar', key: 'outstanding', width: 22 },
];

// Satu tabel bersih (baris 1 = judul kolom, angka asli bukan rumus) supaya langsung terbaca pandas.
async function buildRecapWorkbook(recap) {
  const ExcelJS = require('exceljs');
  const wb = new ExcelJS.Workbook();
  wb.creator = 'macymoo';
  const ws = wb.addWorksheet('Rekap');
  ws.columns = COLUMNS;
  ws.getRow(1).font = { name: 'Arial', bold: true };
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  for (const r of recap.rows) ws.addRow(r);
  for (const key of ['subtotal', 'shipping_total', 'discount_total', 'paid_net', 'outstanding']) {
    ws.getColumn(key).numFmt = '#,##0';
  }
  ws.eachRow((row, i) => { if (i > 1) row.font = { name: 'Arial' }; });
  return Buffer.from(await wb.xlsx.writeBuffer());
}

module.exports = { buildRecap, buildRecapWorkbook, BUCKET_SQL, mondayOf };