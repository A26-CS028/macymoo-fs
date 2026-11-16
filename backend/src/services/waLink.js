// null bila nomor belum diisi; frontend menyembunyikan tombol Kabari Nabila.
function waLink(number, text) {
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

module.exports = { waLink };