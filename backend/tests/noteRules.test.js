const test = require('node:test');
const assert = require('node:assert/strict');
const { noteFlags } = require('../src/services/noteRules');

const opt = (option_group, name, extra_price = 0) => ({ option_group, name, extra_price });
const mackster = [opt('pedas', 'Light'), opt('pedas', 'Medium'), opt('pedas', 'Spicy'), opt('keju', 'Tambah keju', 3000)];
const nutrimac = [opt('pedas', 'Light'), opt('ayam', 'Ayam dada'), opt('ayam', 'Ayam paha', 2000)];

test('KF 9.6 contoh 11: pedas Light + "pedes banget" ditandai', () => {
  const f = noteFlags({ note: 'pedes banget ya kak', chosen: [opt('pedas', 'Light')], menuOptions: mackster });
  assert.equal(f.length, 1);
  assert.equal(f[0].code, 'note_conflict');
  assert.equal(f[0].message, 'Catatan "pedes banget" bertentangan dengan pilihan light');
});

test('KF 9.6 contoh 12: tanpa tambah keju + "kejunya dibanyakin" ditandai', () => {
  const f = noteFlags({ note: 'kejunya dibanyakin', chosen: [opt('pedas', 'Medium')], menuOptions: mackster });
  assert.equal(f.length, 1);
  assert.match(f[0].message, /Konfirmasi harga/);
});

test('KF 9.6 contoh 13: ayam dada + "pakai paha" ditandai', () => {
  const f = noteFlags({ note: 'ayamnya pakai paha aja', chosen: [opt('ayam', 'Ayam dada')], menuOptions: nutrimac });
  assert.equal(f.length, 1);
  assert.equal(f[0].message, 'Catatan menyebut paha, bertentangan dengan pilihan ayam dada');
});

test('tidak ditandai: catatan biasa, kosong, atau sesuai pilihan', () => {
  assert.deepEqual(noteFlags({ note: 'makasih kak, semangat jualannya', chosen: [opt('pedas', 'Light')], menuOptions: mackster }), []); // contoh 14
  assert.deepEqual(noteFlags({ note: null, chosen: [], menuOptions: mackster }), []);
  assert.deepEqual(noteFlags({ note: '   ', chosen: [], menuOptions: mackster }), []);
  assert.deepEqual(noteFlags({ note: 'kejunya dibanyakin', chosen: [opt('keju', 'Tambah keju', 3000)], menuOptions: mackster }), []);
  assert.deepEqual(noteFlags({ note: 'pedes banget', chosen: [opt('pedas', 'Spicy')], menuOptions: mackster }), []);
  assert.deepEqual(noteFlags({ note: 'ayamnya dada ya', chosen: [opt('ayam', 'Ayam dada')], menuOptions: nutrimac }), []);
});

test('keju: "jangan banyak-banyak" tidak ditandai', () => {
  assert.deepEqual(noteFlags({ note: 'kejunya dikit aja', chosen: [], menuOptions: mackster }), []);
  assert.deepEqual(noteFlags({ note: 'jangan terlalu banyak keju', chosen: [], menuOptions: mackster }), []);
});

test('harga keju dari database bertipe string tetap diformat Rupiah', () => {
  // pg mengembalikan kolom NUMERIC/BIGINT sebagai string
  const f = noteFlags({ note: 'kejunya dibanyakin', chosen: [], menuOptions: [opt('keju', 'Tambah keju', '3000.00')] });
  assert.equal(f.length, 1);
  assert.match(f[0].message, /\(\+Rp3\.000\)/);
});

test('pedas: negasi seperti "jangan pedes banget" tidak ditandai, "extra pedes" tetap ditandai', () => {
  assert.deepEqual(noteFlags({ note: 'jangan pedes banget ya', chosen: [opt('pedas', 'Light')], menuOptions: mackster }), []);
  assert.equal(noteFlags({ note: 'extra pedes dong', chosen: [opt('pedas', 'Light')], menuOptions: mackster }).length, 1);
});

test('catatan "-" (KF 9.6 contoh 15) dan catatan bukan string tidak ditandai', () => {
  assert.deepEqual(noteFlags({ note: '-', chosen: [opt('pedas', 'Light')], menuOptions: mackster }), []);
  assert.deepEqual(noteFlags({ note: 123, chosen: [opt('pedas', 'Light')], menuOptions: mackster }), []);
});
