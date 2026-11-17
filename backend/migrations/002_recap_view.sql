-- 002_recap_view.sql: view untuk rekap keuangan (KF bagian 10 dan 12).
-- Satu baris per pesanan, hanya angka dan tanggal: tanpa nama, HP, alamat, token, atau kode pesanan.
-- Pesanan dibatalkan tidak dihitung. Rumus sama dengan services/pricing.js:
--   line_total  = qty * (unit_price + jumlah extra_price opsi item itu)
--   grand_total = subtotal + ongkir semua pengiriman - diskon
--   paid_net    = (dp + pelunasan) - refund
-- Pengelompokan harian dan mingguan dilakukan di query pemanggil, bukan di view ini.
-- Dijalankan sekali; aman diulang (CREATE OR REPLACE).

CREATE OR REPLACE VIEW recap_orders AS
SELECT
  t.*,
  GREATEST(0, t.grand_total - t.paid_net) AS outstanding
FROM (
  SELECT
    o.id AS order_id,
    o.source,
    o.status,
    o.pay_status,
    (o.created_at AT TIME ZONE 'Asia/Jakarta')::date AS order_date,
    d.first_delivery_date,
    COALESCE(i.subtotal, 0) AS subtotal,
    COALESCE(d.shipping_total, 0) AS shipping_total,
    o.discount AS discount_total,
    COALESCE(i.subtotal, 0) + COALESCE(d.shipping_total, 0) - o.discount AS grand_total,
    COALESCE(p.paid_net, 0) AS paid_net
  FROM orders o
  LEFT JOIN LATERAL (
    SELECT SUM(
      oi.qty * (oi.unit_price + COALESCE(
        (SELECT SUM(oio.extra_price) FROM order_item_options oio WHERE oio.order_item_id = oi.id), 0))
    )::int AS subtotal
    FROM order_items oi
    WHERE oi.order_id = o.id
  ) i ON true
  LEFT JOIN LATERAL (
    SELECT SUM(shipping_fee)::int AS shipping_total, MIN(delivery_date) AS first_delivery_date
    FROM deliveries
    WHERE order_id = o.id
  ) d ON true
  LEFT JOIN LATERAL (
    SELECT (
      COALESCE(SUM(amount) FILTER (WHERE type IN ('dp', 'pelunasan')), 0)
      - COALESCE(SUM(amount) FILTER (WHERE type = 'refund'), 0)
    )::int AS paid_net
    FROM payments
    WHERE order_id = o.id
  ) p ON true
  WHERE o.status <> 'dibatalkan'
) t;