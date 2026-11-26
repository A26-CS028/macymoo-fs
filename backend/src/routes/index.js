const express = require('express');

const router = express.Router();

router.get('/health', (req, res) => res.json({ ok: true }));

// Respons admin berisi data pelanggan: jangan disimpan di cache browser.
router.use(['/auth', '/admin'], (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
router.use('/auth', require('./admin/auth'));
router.use('/admin/menus', require('./admin/menus'));
router.use('/admin/uploads', require('./admin/uploads'));
router.use('/admin/settings', require('./admin/settings'));
router.use('/admin/closed-dates', require('./admin/closedDates'));
router.use('/admin/orders', require('./admin/maclab'));
router.use('/admin', require('./admin/fulfillment'));
router.use('/admin/orders', require('./admin/payments'));
router.use('/admin/orders', require('./admin/invoices'));
router.use('/admin/orders', require('./admin/orders'));

router.use(require('./public/menus'));
router.use(require('./public/closedDates'));
router.use('/admin/kitchen', require('./admin/kitchen'));
router.use('/admin/reviews', require('./admin/reviews'));
router.use(require('./public/reviews'));
router.use(require('./public/orderStatus')); // GET /orders/status/:token
router.use(require('./public/orders'));
router.use(require('./public/moobot'));

module.exports = router;