const express = require('express');
const pool = require('../../db/pool');

const router = express.Router();

router.get('/menus', async (req, res, next) => {
  try {
    const { rows: menus } = await pool.query(
      `SELECT id, name, description, price, photo_url, is_available
       FROM menus WHERE is_available = true ORDER BY id`
    );
    const { rows: options } = await pool.query(
      `SELECT id, menu_id, option_group, name, extra_price
       FROM menu_options WHERE menu_id = ANY($1::int[]) ORDER BY id`,
      [menus.map((m) => m.id)]
    );
    res.json({
      menus: menus.map((m) => ({ ...m, options: options.filter((o) => o.menu_id === m.id) })),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;