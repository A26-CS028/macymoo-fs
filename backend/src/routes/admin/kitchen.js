// Daftar masak per tanggal (Rama, KF 9.2). Hanya baca: tidak mengubah data.
const express = require('express');
const pool = require('../../db/pool');
const { aiServiceUrl } = require('../../config/env');
const { requireAdmin } = require('../../middleware/auth');
const { httpError } = require('../../middleware/errorHandler');
const { kitchenQuery } = require('../../validators/kitchen');
const { buildKitchen } = require('../../services/kitchen');

const router = express.Router();

router.get('/', requireAdmin, async (req, res, next) => {
  try {
    const { error, value } = kitchenQuery.validate(req.query, { abortEarly: false, stripUnknown: true });
    if (error) throw httpError(400, 'VALIDATION_ERROR', 'Data tidak valid', error.details.map((d) => ({ field: d.path.join('.'), message: d.message })));
    const moolabelActive = Boolean(aiServiceUrl);

    const deliveries = (await pool.query(
      `SELECT d.id AS delivery_id, d.method, o.*
         FROM deliveries d JOIN orders o ON o.id = d.order_id
        WHERE d.delivery_date = $1 AND o.status IN ('diproses', 'menunggu_pembayaran')
        ORDER BY d.id`,
      [value.date]
    )).rows;
    if (!deliveries.length) {
      return res.json(buildKitchen({ date: value.date, deliveries: [], items: [], chosen: [], labels: [], menuOptions: [], moolabelActive }));
    }

    const items = (await pool.query(
      `SELECT oi.id, oi.delivery_id, oi.item_type, oi.menu_id, COALESCE(m.name, oi.custom_name) AS name, oi.qty, oi.note
         FROM order_items oi LEFT JOIN menus m ON m.id = oi.menu_id
        WHERE oi.delivery_id = ANY($1::int[]) ORDER BY oi.id`,
      [deliveries.map((d) => d.delivery_id)]
    )).rows;
    const itemIds = items.map((i) => i.id);
    const menuIds = [...new Set(items.map((i) => i.menu_id).filter((id) => id != null))];

    const [chosen, labels, menuOptions] = await Promise.all([
      pool.query(
        `SELECT oio.order_item_id, mo.option_group, mo.name
           FROM order_item_options oio JOIN menu_options mo ON mo.id = oio.menu_option_id
          WHERE oio.order_item_id = ANY($1::int[]) ORDER BY mo.id`,
        [itemIds]
      ),
      pool.query('SELECT order_item_id, label FROM order_item_labels WHERE order_item_id = ANY($1::int[]) ORDER BY id', [itemIds]),
      pool.query('SELECT menu_id, option_group, name, extra_price FROM menu_options WHERE menu_id = ANY($1::int[])', [menuIds]),
    ]);

    res.json(buildKitchen({
      date: value.date, deliveries, items,
      chosen: chosen.rows, labels: labels.rows, menuOptions: menuOptions.rows, moolabelActive,
    }));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
