const express = require('express');
const pool = require('../../db/pool');
const { todayJakarta } = require('../../utils/date');

const router = express.Router();

router.get('/closed-dates', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, to_char(closed_date, 'YYYY-MM-DD') AS closed_date
       FROM closed_dates WHERE closed_date >= $1 ORDER BY closed_date`,
      [todayJakarta()]
    );
    res.json({ closed_dates: rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;