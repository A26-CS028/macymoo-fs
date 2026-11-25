// Catat pembayaran. Dipasang di /admin/orders SEBELUM router orders.js
// (requireAdmin dipasang per route supaya sesi admin hanya dicek sekali).
const express = require('express');
const validate = require('../../middleware/validate');
const { requireAdmin } = require('../../middleware/auth');
const { httpError } = require('../../middleware/errorHandler');
const { paymentCreate } = require('../../validators/payment');
const { evaluatePayment } = require('../../services/paymentRules');
const { withOrder, loadDetail } = require('./orders'); // transaksi + detail yang sama dengan dasbor

const router = express.Router();
const MAX_INT = 2147483647;

router.post('/:id(\\d+)/payments', requireAdmin, validate(paymentCreate), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (id > MAX_INT) throw httpError(404, 'NOT_FOUND', 'Pesanan tidak ditemukan');
    const { type, method, amount } = req.body;

    const { detail, payment } = await withOrder(id, async (db, o) => {
      const { totals } = await loadDetail(db, o.id); // totals sebelum pembayaran ini
      const { to_status, pay_status } = evaluatePayment({ status: o.status, totals, type, amount });

      const { rows } = await db.query(
        'INSERT INTO payments (order_id, type, method, amount) VALUES ($1, $2, $3, $4) RETURNING id, type, method, amount, paid_at',
        [o.id, type, method, amount]
      );
      await db.query('UPDATE orders SET status = $1, pay_status = COALESCE($2::text, pay_status) WHERE id = $3', [to_status, pay_status, o.id]);
      await db.query(
        `INSERT INTO order_events (order_id, admin_id, event_type, from_status, to_status) VALUES ($1, $2, 'payment_recorded', $3, $4)`,
        [o.id, req.admin.id, o.status, to_status]
      );
      return { payment: rows[0] };
    });
    res.status(201).json({ payment, order: detail });
  } catch (err) {
    next(err);
  }
});

module.exports = router;