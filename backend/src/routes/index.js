const express = require('express');

const router = express.Router();

router.get('/health', (req, res) => res.json({ ok: true }));

router.use('/auth', require('./admin/auth'));

router.use(require('./public/menus'));
router.use(require('./public/closedDates'));
router.use(require('./public/orders'));

module.exports = router;