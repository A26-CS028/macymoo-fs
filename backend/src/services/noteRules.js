// Tanda catatan yang bertentangan dengan pilihan pelanggan (KF 9.6 contoh 11–13).
// Aturan backend, bukan model. Fungsi murni: tidak menyentuh database.
// chosen     = opsi yang dipilih pada item: [{ option_group, name }]
// menuOptions = semua opsi milik menu item itu: [{ option_group, name, extra_price }]
const PEDAS_BERLEBIH = /\bped[ae]s\b.{0,15}\b(?:banget|bgt|bngt|sekali|parah)\b|\b(?:extra|ekstra|lebih)\s+ped[ae]s\b/i;
const MINTA_LEBIH = /\b(?:banyak|banyakin|dibanyakin|diperbanyak|tambah|ditambah|tambahin|extra|ekstra|lebih)\b/i;
const MINTA_KURANG = /\b(?:jangan|dikit|sedikit|kurangi|dikurangi|tanpa|gak|ga|nggak)\b/i;
// "jangan pedes banget" selaras dengan pilihan Light, jadi tidak ditandai.
const NEGASI = /\b(?:jangan|jgn|gak|ga|nggak|ngga|tidak|tanpa)\b[^,.;!?]*$/i;
const LAWAN_AYAM = { dada: 'paha', paha: 'dada' };

const flag = (message) => ({ code: 'note_conflict', message });
// pg mengembalikan NUMERIC/BIGINT sebagai string ("3000.00"), jadi ubah ke angka dulu.
const rp = (n) => `Rp${Math.round(Number(n)).toLocaleString('id-ID')}`;

function noteFlags({ note, chosen = [], menuOptions = [] }) {
  const text = typeof note === 'string' ? note.trim() : '';
  if (!text) return [];
  const flags = [];

  // Contoh 11: pilih pedas Light, catatan minta lebih pedas
  const light = chosen.find((o) => o.option_group === 'pedas' && o.name.toLowerCase() === 'light');
  const pedas = light && text.match(PEDAS_BERLEBIH);
  const pedasDinegasi = pedas && NEGASI.test(text.slice(0, pedas.index));
  if (pedas && !pedasDinegasi) flags.push(flag(`Catatan "${pedas[0].toLowerCase()}" bertentangan dengan pilihan ${light.name.toLowerCase()}`));

  // Contoh 12: menu punya opsi tambah keju tetapi tidak dipilih, catatan minta keju lebih
  const kejuOpt = menuOptions.find((o) => o.option_group === 'keju');
  if (kejuOpt && !chosen.some((o) => o.option_group === 'keju')
      && /\bkeju/i.test(text) && MINTA_LEBIH.test(text) && !MINTA_KURANG.test(text)) {
    flags.push(flag(`Catatan meminta keju lebih, tetapi opsi ${kejuOpt.name} (+${rp(kejuOpt.extra_price)}) tidak dipilih. Konfirmasi harga ke pelanggan`));
  }

  // Contoh 13: pilih ayam dada, catatan menyebut paha (atau sebaliknya)
  for (const opt of chosen.filter((o) => o.option_group === 'ayam')) {
    const nama = opt.name.toLowerCase();
    const key = Object.keys(LAWAN_AYAM).find((k) => nama.includes(k));
    if (key && new RegExp(`\\b${LAWAN_AYAM[key]}\\b`, 'i').test(text)) {
      flags.push(flag(`Catatan menyebut ${LAWAN_AYAM[key]}, bertentangan dengan pilihan ${nama}`));
    }
  }
  return flags;
}

module.exports = { noteFlags };
