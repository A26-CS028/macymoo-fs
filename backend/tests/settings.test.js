const { test } = require('node:test');
const assert = require('node:assert/strict');
const { settingsUpdate } = require('../src/validators/settings');
const { KEYS, rowsToSettings, settingsToRows } = require('../src/services/settings');

const opts = { abortEarly: false, stripUnknown: true };
const ok = (body) => {
  const { value, error } = settingsUpdate.validate(body, opts);
  assert.equal(error, undefined, error && error.message);
  return value;
};
const bad = (body, field) => {
  const { error } = settingsUpdate.validate(body, opts);
  assert.ok(error, 'seharusnya ditolak');
  assert.ok(error.details.some((d) => d.path[0] === field), `field ${field} seharusnya salah`);
};

const lengkap = {
  bank_name: 'BCA',
  bank_account_number: '1234567890',
  bank_account_holder: 'Pemilik Uji',
  qris_image_url: 'https://abc.public.blob.vercel-storage.com/qris-xyz.png',
  wa_number: '6281200000000',
};

test('objek lengkap lolos dan tidak berubah', () => {
  assert.deepEqual(ok(lengkap), lengkap);
});

test('field yang tidak dikirim menjadi null (mengganti seluruh objek)', () => {
  assert.deepEqual(ok({}), {
    bank_name: null, bank_account_number: null, bank_account_holder: null, qris_image_url: null, wa_number: null,
  });
  assert.equal(ok({ wa_number: '6281200000000' }).bank_name, null);
});

test('null dan string kosong sama-sama menghapus nilai', () => {
  const v = ok({ ...lengkap, wa_number: null, bank_name: '', qris_image_url: '' });
  assert.equal(v.wa_number, null);
  assert.equal(v.bank_name, null);
  assert.equal(v.qris_image_url, null);
});

test('spasi di ujung dibuang', () => {
  assert.equal(ok({ ...lengkap, bank_name: '  BCA  ' }).bank_name, 'BCA');
});

test('wa_number: hanya angka berawalan 62, 10 sampai 15 digit', () => {
  bad({ wa_number: '081200000000' }, 'wa_number');
  bad({ wa_number: '+6281200000000' }, 'wa_number');
  bad({ wa_number: '62812abc0000' }, 'wa_number');
  bad({ wa_number: '62123' }, 'wa_number');
  bad({ wa_number: '62' + '1'.repeat(14) }, 'wa_number');
  ok({ wa_number: '62' + '8'.repeat(8) });
  ok({ wa_number: '62' + '8'.repeat(13) });
});

test('batas panjang: bank 60, rekening 40, pemilik 100', () => {
  bad({ bank_name: 'a'.repeat(61) }, 'bank_name');
  bad({ bank_account_number: '1'.repeat(41) }, 'bank_account_number');
  bad({ bank_account_holder: 'a'.repeat(101) }, 'bank_account_holder');
  ok({ bank_name: 'a'.repeat(60), bank_account_number: '1'.repeat(40), bank_account_holder: 'a'.repeat(100) });
});

test('qris_image_url: harus URL https', () => {
  bad({ qris_image_url: 'http://x.com/a.png' }, 'qris_image_url');
  bad({ qris_image_url: 'bukan url' }, 'qris_image_url');
  bad({ qris_image_url: 'javascript:alert(1)' }, 'qris_image_url');
});

test('tipe salah ditolak', () => {
  bad({ bank_name: 123 }, 'bank_name');
  bad({ wa_number: 6281200000000 }, 'wa_number');
});

test('field asing dibuang', () => {
  assert.equal('admin' in ok({ ...lengkap, admin: true }), false);
});

test('pesan error berbahasa Indonesia dengan label', () => {
  const { error } = settingsUpdate.validate({ bank_name: 'a'.repeat(61), qris_image_url: 'https://x.com/' + 'a'.repeat(500) }, opts);
  assert.deepEqual(error.details.map((d) => d.message), ['Nama bank maksimal 60 karakter', 'Gambar QRIS maksimal 500 karakter']);
});

test('rowsToSettings: key hilang atau NULL menjadi null, key asing diabaikan', () => {
  const s = rowsToSettings([
    { key: 'bank_name', value: 'BCA' },
    { key: 'wa_number', value: null },
    { key: 'lain', value: 'x' },
  ]);
  assert.deepEqual(Object.keys(s), KEYS);
  assert.equal(s.bank_name, 'BCA');
  assert.equal(s.wa_number, null);
  assert.equal(s.qris_image_url, null);
});

test('settingsToRows: selalu lima key, yang tidak ada menjadi null', () => {
  const rows = settingsToRows({ bank_name: 'BCA' });
  assert.equal(rows.length, 5);
  assert.deepEqual(rows.find(([k]) => k === 'bank_name'), ['bank_name', 'BCA']);
  assert.deepEqual(rows.find(([k]) => k === 'wa_number'), ['wa_number', null]);
});

test('bolak-balik: objek -> baris -> objek sama', () => {
  const rows = settingsToRows(lengkap).map(([key, value]) => ({ key, value }));
  assert.deepEqual(rowsToSettings(rows), lengkap);
});