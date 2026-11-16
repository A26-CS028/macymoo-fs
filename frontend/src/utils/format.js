// Format untuk tampilan saja; perhitungan harga tetap di server.
export function rupiah(n) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  })
    .format(n)
    .replace(/\s/g, ''); // "Rp 35.000" -> "Rp35.000" sesuai desain Figma
}
