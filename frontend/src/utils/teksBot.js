// Jawaban MooBot dari Gemini memakai markdown ringan (`* **Mackster**: Rp35.000`).
// Diurai menjadi data (paragraf, daftar, potongan tebal) lalu dirender sebagai elemen React,
// bukan HTML: teks dari AI tidak pernah masuk ke innerHTML.

const BUTIR = /^\s*[*\-•]\s+(.*)$/
const JUDUL = /^\s*#{1,6}\s+(.*)$/

// Teks satu baris -> [{ text, bold }]. `**x**` dan `__x__` tebal; `*x*` dan `_x_` (miring) dibuang tandanya.
export function uraiBaris(baris) {
  const hasil = []
  const bagian = baris.split(/(\*\*[^*\n]+?\*\*|__[^_\n]+?__)/)
  bagian.forEach((b, i) => {
    if (!b) return
    const tebal = i % 2 === 1
    const text = tebal ? b.slice(2, -2) : b.replace(/(^|[^*\w])\*(?!\s)([^*\n]+?)\*(?!\w)/g, '$1$2').replace(/(^|[^_\w])_(?!\s)([^_\n]+?)_(?!\w)/g, '$1$2')
    if (text) hasil.push({ text, bold: tebal })
  })
  return hasil
}

// Teks penuh -> [{ type: 'p', lines: [[potongan]] } | { type: 'list', items: [[potongan]] }]
export function uraiTeksBot(teks) {
  const blok = []
  let para = null
  for (const baris of String(teks ?? '').replace(/\r\n?/g, '\n').split('\n')) {
    const butir = baris.match(BUTIR)
    if (butir) {
      para = null
      const akhir = blok[blok.length - 1]
      const isi = uraiBaris(butir[1])
      if (akhir?.type === 'list') akhir.items.push(isi)
      else blok.push({ type: 'list', items: [isi] })
      continue
    }
    if (!baris.trim()) { para = null; continue }
    const judul = baris.match(JUDUL)
    const isi = judul ? [{ text: judul[1].replace(/\*\*/g, ''), bold: true }] : uraiBaris(baris.trim())
    if (para) para.lines.push(isi)
    else { para = { type: 'p', lines: [isi] }; blok.push(para) }
  }
  return blok
}
