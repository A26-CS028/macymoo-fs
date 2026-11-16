const crypto = require('crypto');

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // tanpa I, L, O, 0, 1

// 24 byte acak = 32 karakter base64url (tidak bisa ditebak)
function publicToken() {
  return crypto.randomBytes(24).toString('base64url');
}

// contoh: MYM-7K2QF
function orderCode() {
  let s = '';
  for (let i = 0; i < 5; i++) s += ALPHABET[crypto.randomInt(ALPHABET.length)];
  return `MYM-${s}`;
}

module.exports = { publicToken, orderCode };