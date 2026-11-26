// Invoice PDF dan revisi (openapi: /admin/orders/{id}/invoice.pdf, /admin/orders/{id}/invoice/revise).
// Dipasang di /admin/orders SEBELUM router orders.js (requireAdmin dipasang per route, seperti payments.js).
// Terbit dan revisi dijalankan di dalam withOrder: baris pesanan terkunci, jadi dua request
// bersamaan tidak menerbitkan dua invoice dan revisi tidak bentrok (invoiceNumber.js mensyaratkan ini).
const express = require('express');
const { requireAdmin } = require('../../middleware/auth');
const { httpError } = require('../../middleware/errorHandler');
const { frontendOrigin } = require('../../config/env');
const { issueInvoice, reviseInvoice, fileName } = require('../../services/invoiceNumber');
const { buildInvoicePdf } = require('../../services/invoicePdf');
const { withOrder } = require('./orders'); // transaksi + detail yang sama dengan dasbor

const router = express.Router();

// id di luar batas INTEGER Postgres = pasti tidak ada (tanpa ini query gagal jadi 500)
router.param('id', (req, res, next, id) => (Number(id) > 2147483647 ? next(httpError(404, 'NOT_FOUND', 'Pesanan tidak ditemukan')) : next()));

function requireConfirmed(order) {
  if (order.status === 'menunggu_konfirmasi') {
    throw httpError(409, 'ORDER_NOT_CONFIRMED', 'Pesanan belum dikonfirmasi, invoice belum bisa dibuat');
  }
}

// GET invoice.pdf mengubah data (menerbitkan nomor), padahal cookie admin SameSite=Lax tetap ikut
// saat situs lain membuka link ke URL ini. Browser menandai asal permintaan di Sec-Fetch-Site:
// klik dari dasbor = same-origin, URL diketik/bookmark = none. Selain itu ditolak.
// Browser lama tanpa Sec-Fetch-Site (mis. Safari < 16.4) tetap mengirim cookie Lax, jadi asal
// diambil dari Origin atau Referer dan harus sama dengan FRONTEND_ORIGIN. Klik dari dasbor mengirim
// Referer (Referrer-Policy strict-origin-when-cross-origin, frontend/vercel.json). Tanpa keduanya
// ditolak, karena situs lain bisa membuang Referer (referrerpolicy="no-referrer").
const FRONTEND = (() => {
  try {
    return new URL(frontendOrigin).origin;
  } catch {
    return null;
  }
})();

function dariDasbor(req) {
  const asal = req.get('Origin') || req.get('Referer');
  if (!asal || !FRONTEND) return false;
  try {
    return new URL(asal).origin === FRONTEND;
  } catch {
    return false; // termasuk Origin: null
  }
}

function sameOriginOnly(req, res, next) {
  const site = req.get('Sec-Fetch-Site');
  const lolos = site ? site === 'same-origin' || site === 'none' : dariDasbor(req);
  if (!lolos) return next(httpError(403, 'CROSS_SITE_REQUEST', 'Buka invoice dari dasbor admin'));
  next();
}

// Permintaan pertama menerbitkan; berikutnya mengembalikan invoice yang sama. Tidak pernah revisi.
router.get('/:id(\\d+)/invoice.pdf', sameOriginOnly, requireAdmin, async (req, res, next) => {
  try {
    const { detail, invoice } = await withOrder(Number(req.params.id), async (db, o) => {
      requireConfirmed(o);
      return { invoice: await issueInvoice(db, o.id, new Date(), { allowNew: o.status !== 'dibatalkan' }) };
    });
    // PDF dibuat setelah COMMIT: transaksi dan kunci baris tidak ditahan selama menggambar.
    const pdf = await buildInvoicePdf({ detail, invoice });
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${fileName(invoice.invoice_no, invoice.revision)}"`,
      'Cache-Control': 'private, no-store',
    });
    res.send(pdf);
  } catch (err) {
    next(err);
  }
});

// [Usulan Rama, belum ada di KF 9.8] POST karena mengubah data dan tidak boleh terpicu muat ulang halaman.
router.post('/:id(\\d+)/invoice/revise', requireAdmin, async (req, res, next) => {
  try {
    const { invoice } = await withOrder(Number(req.params.id), async (db, o) => {
      requireConfirmed(o);
      return { invoice: await reviseInvoice(db, o.id) };
    });
    res.status(201).json(invoice);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
