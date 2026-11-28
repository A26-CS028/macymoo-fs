// Rekap keuangan harian/mingguan (KF 9.3, side quest; dibaca dari view recap_orders dan recap_deliveries).
// Hanya baca. Tanpa nama, HP, atau alamat. Dipasang di routes/index.js: /admin/recap.
const express = require('express');
const pool = require('../../db/pool');
const { requireAdmin } = require('../../middleware/auth');
const { httpError } = require('../../middleware/errorHandler');
const { recapQuery } = require('../../validators/recap');
const { buildRecap, buildRecapWorkbook, BUCKET_SQL } = require('../../services/recap');

const router = express.Router();

function parse(query) {
  const { error, value } = recapQuery.validate(query, { abortEarly: false, stripUnknown: true });
  if (error) throw httpError(400, 'VALIDATION_ERROR', 'Data tidak valid', error.details.map((d) => ({ field: d.path.join('.') || 'query', message: d.message })));
  return value;
}

async function loadRecap({ from, to, period }) {
  const bucket = BUCKET_SQL[period];
  const [deliveries, orders] = await Promise.all([
    // omzet dan ongkir per pengiriman. View recap_deliveries hanya membuang pesanan dibatalkan
    // (o.status <> 'dibatalkan'), jadi status disaring di sini lewat recap_orders agar
    // sama dengan sisi pesanan: hanya diproses + selesai.
    pool.query(
      `SELECT ${bucket('delivery_date')}::text AS period_start,
              SUM(subtotal) AS subtotal, SUM(shipping_fee) AS shipping_total
         FROM recap_deliveries
        WHERE delivery_date BETWEEN $1 AND $2
          AND order_id IN (SELECT order_id FROM recap_orders WHERE status IN ('diproses', 'selesai'))
        GROUP BY 1 ORDER BY 1`,
      [from, to]
    ),
    // per pesanan; view memuat semua status selain dibatalkan.
    // orders_count, discount_total, paid_net: hanya diproses + selesai (D01/D02).
    // outstanding (DS Q4): tagihan yang sudah dikirim (orders.invoice_sent_at terisi) tapi
    // belum dibayar; ikut menunggu_pembayaran (bayar di muka yang belum dibayar).
    pool.query(
      `SELECT ${bucket('first_delivery_date')}::text AS period_start,
              COUNT(*) FILTER (WHERE status IN ('diproses', 'selesai')) AS orders_count,
              COALESCE(SUM(discount_total) FILTER (WHERE status IN ('diproses', 'selesai')), 0) AS discount_total,
              COALESCE(SUM(paid_net) FILTER (WHERE status IN ('diproses', 'selesai')), 0) AS paid_net,
              COALESCE(SUM(outstanding) FILTER (
                WHERE order_id IN (SELECT id FROM orders WHERE invoice_sent_at IS NOT NULL)
              ), 0) AS outstanding
         FROM recap_orders
        WHERE status IN ('diproses', 'selesai', 'menunggu_pembayaran')
          AND first_delivery_date BETWEEN $1 AND $2
        GROUP BY 1 ORDER BY 1`,
      [from, to]
    ),
  ]);
  return buildRecap({ period, from, to, deliveryRows: deliveries.rows, orderRows: orders.rows });
}

router.get('/', requireAdmin, async (req, res, next) => {
  try {
    res.json(await loadRecap(parse(req.query)));
  } catch (err) {
    next(err);
  }
});

router.get('/export.xlsx', requireAdmin, async (req, res, next) => {
  try {
    const q = parse(req.query);
    const buf = await buildRecapWorkbook(await loadRecap(q));
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="rekap-${q.period}-${q.from}-${q.to}.xlsx"`,
      'Cache-Control': 'private, no-store',
    });
    res.send(buf);
  } catch (err) {
    next(err);
  }
});

module.exports = router;