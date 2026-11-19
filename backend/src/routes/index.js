const express = require('express');

const router = express.Router();

router.get('/health', (req, res) => res.json({ ok: true }));

router.use('/auth', require('./admin/auth'));
router.use('/admin/menus', require('./admin/menus'));
router.use('/admin/uploads', require('./admin/uploads'));
router.use('/admin/orders', require('./admin/maclab'));

router.use(require('./public/menus'));
router.use(require('./public/closedDates'));
router.use(require('./public/orders'));

module.exports = router;