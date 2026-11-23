const test = require('node:test');
const assert = require('node:assert/strict');
const { todayJakarta } = require('../src/utils/date');
const { formatInvoiceNo, displayNo, fileName, nextInvoiceNo, issueInvoice, reviseInvoice } = require('../src/services/invoiceNumber');

// db palsu: mengembalikan respons berurutan dan mencatat query
function fakeDb(responses) {
  const calls = [];
  return { calls, query: async (sql, params) => { calls.push({ sql, params }); return responses.shift() ?? { rows: [] }; } };
}

test('format nomor invoice dan nomor tampil revisi', () => {
  assert.equal(formatInvoiceNo('2026-11-20', 1), 'INV/20261120/MYM/001');
  assert.equal(formatInvoiceNo('2026-11-20', 42), 'INV/20261120/MYM/042');
  assert.equal(displayNo('INV/20261120/MYM/001', 1), 'INV/20261120/MYM/001');
  assert.equal(displayNo('INV/20261120/MYM/001', 2), 'INV/20261120/MYM/001-v2');
  assert.equal(fileName('INV/20261120/MYM/001', 2), 'INV-20261120-MYM-001-v2.pdf');
});

test('tanggal invoice memakai zona Asia/Jakarta (UTC+7), bukan UTC', () => {
  assert.equal(todayJakarta(new Date('2026-11-20T16:59:00Z')), '2026-11-20');
  assert.equal(todayJakarta(new Date('2026-11-20T17:01:00Z')), '2026-11-21');
});

test('nomor berikutnya: urutan dimulai 001 dan lanjut dari yang terbesar; lock diambil dulu', async () => {
  const db = fakeDb([{ rows: [] }, { rows: [{ last: 0 }] }]);
  assert.equal(await nextInvoiceNo(db, '2026-11-20'), 'INV/20261120/MYM/001');
  assert.match(db.calls[0].sql, /pg_advisory_xact_lock/);

  const db2 = fakeDb([{ rows: [] }, { rows: [{ last: 4 }] }]);
  assert.equal(await nextInvoiceNo(db2, '2026-11-20'), 'INV/20261120/MYM/005');
});

test('issueInvoice: invoice yang sudah ada dikembalikan tanpa menerbitkan baru', async () => {
  const db = fakeDb([{ rows: [{ id: 1, invoice_no: 'INV/20261120/MYM/001', revision: 1, issued_at: '2026-11-20' }] }]);
  const inv = await issueInvoice(db, 7);
  assert.equal(inv.created, false);
  assert.equal(db.calls.length, 1);
});

test('issueInvoice: pertama kali menerbitkan revision 1 dengan nomor sesuai tanggal Jakarta', async () => {
  const db = fakeDb([
    { rows: [] }, // belum ada invoice
    { rows: [] }, // advisory lock
    { rows: [{ last: 2 }] },
    { rows: [{ id: 9, invoice_no: 'INV/20261121/MYM/003', revision: 1, issued_at: '2026-11-21' }] },
  ]);
  const inv = await issueInvoice(db, 7, new Date('2026-11-20T18:30:00Z'));
  assert.equal(inv.created, true);
  assert.deepEqual(db.calls[3].params, [7, 'INV/20261121/MYM/003', 1, '2026-11-21']);
});

test('uji 5: revisi memakai nomor sama, revision + 1, tampil -v2', async () => {
  const db = fakeDb([
    { rows: [{ id: 1, invoice_no: 'INV/20261120/MYM/001', revision: 1, issued_at: '2026-11-20' }] },
    { rows: [{ id: 2, invoice_no: 'INV/20261120/MYM/001', revision: 2, issued_at: '2026-11-21' }] },
  ]);
  const inv = await reviseInvoice(db, 7, new Date('2026-11-21T03:00:00Z'));
  assert.deepEqual(db.calls[1].params, [7, 'INV/20261120/MYM/001', 2, '2026-11-21']);
  assert.equal(inv.display_no, 'INV/20261120/MYM/001-v2');
});

test('revisi tanpa invoice sebelumnya ditolak 409', async () => {
  await assert.rejects(reviseInvoice(fakeDb([{ rows: [] }]), 7), (e) => e.status === 409 && e.code === 'INVOICE_NOT_ISSUED');
});