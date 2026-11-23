const express = require('express');

const router = express.Router();

router.get('/health', (req, res) => res.json({ ok: true }));

router.use('/auth', require('./admin/auth'));
router.use('/admin/menus', require('./admin/menus'));
router.use('/admin/uploads', require('./admin/uploads'));
router.use('/admin/orders', require('./admin/maclab'));
router.use('/admin', require('./admin/fulfillment'));
router.use('/admin/orders', require('./admin/payments'));
router.use('/admin/orders', require('./admin/orders'));

router.use(require('./public/menus'));
router.use(require('./public/closedDates'));
router.use('/admin/kitchen', require('./admin/kitchen'));
router.use(require('./public/orders'));
router.use(require('./public/moobot'));

module.exports = router;