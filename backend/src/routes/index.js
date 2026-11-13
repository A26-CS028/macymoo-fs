const express = require('express');
const pool = require('../db/pool');

const router = express.Router();

router.get('/health', (req, res) => res.json({ ok: true }));

router.get('/menus', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, price, photo_url, is_available FROM menus ORDER BY id'
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;