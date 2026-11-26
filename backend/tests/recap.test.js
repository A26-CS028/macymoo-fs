const test = require('node:test');
const assert = require('node:assert/strict');
const ExcelJS = require('exceljs');
const { buildRecap, buildRecapWorkbook, mondayOf, BUCKET_SQL } = require('../src/services/recap');

test('mondayOf: Senin tetap, Minggu mundur ke Senin sebelumnya', () => {
  assert.equal(mondayOf('2026-11-23'), '2026-11-23'); // Senin
  assert.equal(mondayOf('2026-11-26'), '2026-11-23'); // Kamis
  assert.equal(mondayOf('2026-11-29'), '2026-11-23'); // Minggu
  assert.equal(mondayOf('2026-12-01'), '2026-11-30'); // Selasa, lintas bulan
});

test('harian: semua tanggal ada (nol bila kosong), angka string dari pg jadi number', () => {
  const r = buildRecap({
    period: 'daily', from: '2026-11-27', to: '2026-11-29',
    deliveryRows: [{ period_start: '2026-11-27', subtotal: '270000', shipping_total: '40000' }],
    orderRows: [{ period_start: '2026-11-27', orders_count: '1', discount_total: '0', paid_net: '30000', outstanding: '280000' }],
  });
  assert.deepEqual(r.rows.map((x) => x.period_start), ['2026-11-27', '2026-11-28', '2026-11-29']);
  assert.deepEqual(r.rows[0], { period_start: '2026-11-27', period_end: '2026-11-27', orders_count: 1, subtotal: 270000, shipping_total: 40000, discount_total: 0, paid_net: 30000, outstanding: 280000 });
  assert.deepEqual(r.rows[1], { period_start: '2026-11-28', period_end: '2026-11-28', orders_count: 0, subtotal: 0, shipping_total: 0, discount_total: 0, paid_net: 0, outstanding: 0 });
  assert.equal(r.period, 'daily');
});

test('mingguan: mulai dari Senin minggu "from", akhir Minggu, lintas bulan', () => {
  const r = buildRecap({
    period: 'weekly', from: '2026-11-26', to: '2026-12-06',
    deliveryRows: [{ period_start: '2026-11-30', subtotal: '100000', shipping_total: '20000' }],
    orderRows: [],
  });
  assert.deepEqual(r.rows.map((x) => [x.period_start, x.period_end]), [['2026-11-23', '2026-11-29'], ['2026-11-30', '2026-12-06']]);
  assert.equal(r.rows[1].subtotal, 100000);
  assert.equal(r.rows[0].subtotal, 0);
});

test('mingguan: "to" hari Senin membuka minggu baru; "from" = "to" tetap satu baris', () => {
  assert.equal(buildRecap({ period: 'weekly', from: '2026-11-23', to: '2026-11-30', deliveryRows: [], orderRows: [] }).rows.length, 2);
  assert.equal(buildRecap({ period: 'weekly', from: '2026-11-29', to: '2026-11-29', deliveryRows: [], orderRows: [] }).rows.length, 1);
});

test('ekspresi pengelompokan mingguan memakai ISODOW (Senin = 1), harian apa adanya', () => {
  assert.equal(BUCKET_SQL.daily('delivery_date'), 'delivery_date');
  assert.match(BUCKET_SQL.weekly('delivery_date'), /ISODOW FROM delivery_date\)::int - 1/);
});

test('Excel: satu sheet "Rekap", judul di baris 1, angka asli, tanpa kolom data pribadi', async () => {
  const recap = buildRecap({
    period: 'daily', from: '2026-11-27', to: '2026-11-28',
    deliveryRows: [{ period_start: '2026-11-27', subtotal: '270000', shipping_total: '40000' }],
    orderRows: [{ period_start: '2026-11-27', orders_count: '1', discount_total: '0', paid_net: '0', outstanding: '310000' }],
  });
  const buf = await buildRecapWorkbook(recap);
  assert.equal(buf.subarray(0, 2).toString(), 'PK');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  assert.deepEqual(wb.worksheets.map((s) => s.name), ['Rekap']);
  const ws = wb.getWorksheet('Rekap');
  const head = ws.getRow(1).values.slice(1);
  assert.deepEqual(head, ['Periode mulai', 'Periode selesai', 'Jumlah pesanan', 'Omzet (subtotal)', 'Ongkir', 'Diskon', 'Dibayar bersih', 'Tagihan belum terbayar']);
  assert.ok(!head.some((h) => /nama|hp|telepon|alamat|kode/i.test(h)));
  assert.deepEqual(ws.getRow(2).values.slice(1), ['2026-11-27', '2026-11-27', 1, 270000, 40000, 0, 0, 310000]);
  assert.equal(ws.rowCount, 3);
  assert.equal(typeof ws.getRow(2).getCell(4).value, 'number'); // bukan rumus, bukan teks
});