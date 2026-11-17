const crypto = require('crypto');
const { put } = require('@vercel/blob');
const { httpError } = require('../middleware/errorHandler');

// Tipe file dikenali dari isinya (magic bytes), bukan dari nama atau Content-Type kiriman klien,
// karena keduanya bisa dipalsukan.
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function detectImageType(buf) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { mime: 'image/jpeg', ext: 'jpg' };
  }
  if (buf.length >= 8 && buf.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return { mime: 'image/png', ext: 'png' };
  }
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    return { mime: 'image/webp', ext: 'webp' };
  }
  return null;
}

// Mengembalikan URL publik file. Nama file dibuat server (acak), bukan dari klien.
async function uploadImage(buffer, purpose) {
  const type = detectImageType(buffer);
  if (!type) {
    throw httpError(400, 'FILE_TYPE_NOT_ALLOWED', 'Hanya file JPG, PNG, atau WebP yang diizinkan');
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw httpError(500, 'STORAGE_NOT_CONFIGURED', 'Penyimpanan foto belum dikonfigurasi');
  }
  const pathname = `${purpose}/${crypto.randomBytes(16).toString('hex')}.${type.ext}`;
  const blob = await put(pathname, buffer, {
    access: 'public',
    contentType: type.mime,
    addRandomSuffix: false,
  });
  return blob.url;
}

module.exports = { detectImageType, uploadImage };