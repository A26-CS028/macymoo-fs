// Nomor invoice INV/YYYYMMDD/MYM/NNN. Urutan reset tiap hari (zona Asia/Jakarta).
// invoice_no disimpan tanpa -v2; revisi ada di kolom revision (001_init.sql).
// Fungsi DB harus dipanggil di dalam transaksi dengan baris pesanan sudah dikunci (withOrder).
const { httpError } = require('../middleware/errorHandler');
const { todayJakarta } = require('../utils/date');

const formatInvoiceNo = (date, seq) => `INV/${date.replaceAll('-', '')}/MYM/${String(seq).padStart(3, '0')}`;
const displayNo = (invoiceNo, revision) => (revision > 1 ? `${invoiceNo}-v${revision}` : invoiceNo);
const fileName = (invoiceNo, revision) => `${displayNo(invoiceNo, revision).replaceAll('/', '-')}.pdf`;

// Nomor berikutnya hari itu. Advisory lock mencegah dua pesanan berbeda mendapat nomor sama.
async function nextInvoiceNo(db, date) {
  await db.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`invoice:${date}`]);
  const prefix = `INV/${date.replaceAll('-', '')}/MYM/`;
  const { rows } = await db.query(
    `SELECT COALESCE(MAX(split_part(invoice_no, '/', 4)::int), 0) AS last FROM invoices WHERE invoice_no LIKE $1`,
    [`${prefix}%`]
  );
  return formatInvoiceNo(date, rows[0].last + 1);
}

async function latestInvoice(db, orderId) {
  const { rows } = await db.query(
    'SELECT id, invoice_no, revision, issued_at::text FROM invoices WHERE order_id = $1 ORDER BY revision DESC LIMIT 1',
    [orderId]
  );
  return rows[0] || null;
}

async function insertInvoice(db, orderId, invoiceNo, revision, issuedAt) {
  const { rows } = await db.query(
    `INSERT INTO invoices (order_id, invoice_no, revision, issued_at) VALUES ($1, $2, $3, $4)
     RETURNING id, invoice_no, revision, issued_at::text`,
    [orderId, invoiceNo, revision, issuedAt]
  );
  return { ...rows[0], display_no: displayNo(rows[0].invoice_no, rows[0].revision) };
}

// GET invoice.pdf: permintaan pertama menerbitkan, berikutnya mengembalikan yang sama (tidak pernah revisi).
// allowNew false (pesanan dibatalkan): invoice lama tetap bisa diunduh, invoice baru tidak diterbitkan.
async function issueInvoice(db, orderId, now = new Date(), { allowNew = true } = {}) {
  const existing = await latestInvoice(db, orderId);
  if (existing) return { ...existing, display_no: displayNo(existing.invoice_no, existing.revision), created: false };
  if (!allowNew) throw httpError(409, 'ORDER_CANCELLED', 'Pesanan dibatalkan, invoice baru tidak diterbitkan');
  const date = todayJakarta(now);
  const invoice = await insertInvoice(db, orderId, await nextInvoiceNo(db, date), 1, date);
  return { ...invoice, created: true };
}

// POST invoice/revise: nomor sama, revision + 1.
async function reviseInvoice(db, orderId, now = new Date()) {
  const latest = await latestInvoice(db, orderId);
  if (!latest) throw httpError(409, 'INVOICE_NOT_ISSUED', 'Invoice belum pernah diterbitkan, tidak ada yang bisa direvisi');
  return insertInvoice(db, orderId, latest.invoice_no, latest.revision + 1, todayJakarta(now));
}

module.exports = { formatInvoiceNo, displayNo, fileName, nextInvoiceNo, issueInvoice, reviseInvoice };