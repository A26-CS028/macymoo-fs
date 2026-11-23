// Kunci = properti Settings di openapi.yaml.
const KEYS = ['bank_name', 'bank_account_number', 'bank_account_holder', 'qris_image_url', 'wa_number'];

// Baris tabel -> objek; key yang tidak ada atau bernilai NULL menjadi null. Key lain di tabel diabaikan.
function rowsToSettings(rows) {
  const byKey = new Map(rows.map((r) => [r.key, r.value]));
  return Object.fromEntries(KEYS.map((k) => [k, byKey.get(k) ?? null]));
}

function settingsToRows(settings) {
  return KEYS.map((k) => [k, settings[k] ?? null]);
}

module.exports = { KEYS, rowsToSettings, settingsToRows };