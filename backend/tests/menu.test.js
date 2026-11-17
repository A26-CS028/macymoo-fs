// Uji validator Kelola menu dan deteksi tipe gambar, tanpa database dan tanpa Vercel Blob.
const { test } = require('node:test');
const assert = require('node:assert');

const { menuCreate, menuUpdate, optionCreate, optionUpdate, uploadPurpose } = require('../src/validators/menu');
const { detectImageType } = require('../src/services/blob');

const check = (schema, body) => schema.validate(body, { abortEarly: false, stripUnknown: true });
const fields = (r) => (r.error ? r.error.details.map((d) => d.path.join('.')).sort() : []);

test('menu valid lolos; is_available default true; field asing dibuang', () => {
  const r = check(menuCreate, { name: 'Mac Pizza', price: 30000, id: 99, extra: 'x' });
  assert.strictEqual(r.error, undefined);
  assert.strictEqual(r.value.is_available, true);
  assert.strictEqual(r.value.id, undefined);
  assert.strictEqual(r.value.extra, undefined);
});

test('menu: nama kosong, harga negatif atau desimal, foto bukan https ditolak', () => {
  assert.deepStrictEqual(fields(check(menuCreate, { name: '  ', price: 1000 })), ['name']);
  assert.deepStrictEqual(fields(check(menuCreate, { name: 'A', price: -1 })), ['price']);
  assert.deepStrictEqual(fields(check(menuCreate, { name: 'A', price: 1000.5 })), ['price']);
  assert.deepStrictEqual(fields(check(menuCreate, { name: 'A', price: 1000, photo_url: 'http://x.com/a.jpg' })), ['photo_url']);
  assert.deepStrictEqual(fields(check(menuCreate, { price: 1000 })), ['name']);
});

test('ubah menu: minimal satu field; tandai habis saja boleh', () => {
  assert.ok(check(menuUpdate, {}).error);
  assert.strictEqual(check(menuUpdate, { is_available: false }).error, undefined);
  assert.deepStrictEqual(fields(check(menuUpdate, { price: 'murah' })), ['price']);
});

test('opsi: kelompok harus dari daftar, harga tambahan wajib dan tidak negatif', () => {
  assert.strictEqual(check(optionCreate, { option_group: 'ayam', name: 'Ayam paha', extra_price: 2000 }).error, undefined);
  assert.deepStrictEqual(fields(check(optionCreate, { option_group: 'warna', name: 'Merah', extra_price: 0 })), ['option_group']);
  assert.deepStrictEqual(fields(check(optionCreate, { option_group: 'ayam', name: 'Ayam paha' })), ['extra_price']);
  assert.deepStrictEqual(fields(check(optionCreate, { option_group: 'ayam', name: 'Ayam paha', extra_price: -5 })), ['extra_price']);
});

test('ubah opsi: kelompok tidak bisa diubah (dibuang), kosong ditolak', () => {
  assert.ok(check(optionUpdate, { option_group: 'keju' }).error); // setelah dibuang, body kosong
  assert.strictEqual(check(optionUpdate, { extra_price: 2500 }).error, undefined);
});

test('tujuan unggah hanya menu_photo atau qris', () => {
  assert.strictEqual(check(uploadPurpose, { purpose: 'qris' }).error, undefined);
  assert.strictEqual(check(uploadPurpose, { purpose: 'menu_photo' }).error, undefined);
  assert.ok(check(uploadPurpose, { purpose: 'avatar' }).error);
  assert.ok(check(uploadPurpose, {}).error);
});

test('deteksi tipe gambar dari isi file, bukan dari nama', () => {
  const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(8)]);
  const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP')]);
  assert.strictEqual(detectImageType(jpg).mime, 'image/jpeg');
  assert.strictEqual(detectImageType(png).mime, 'image/png');
  assert.strictEqual(detectImageType(webp).mime, 'image/webp');
  assert.strictEqual(detectImageType(Buffer.from('<svg onload=alert(1)>')), null);
  assert.strictEqual(detectImageType(Buffer.from('%PDF-1.7')), null);
  assert.strictEqual(detectImageType(Buffer.alloc(0)), null);
});