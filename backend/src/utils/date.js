// Tanggal dalam zona Asia/Jakarta (KF 9.8), format YYYY-MM-DD.
const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' });

function todayJakarta(now = new Date()) {
  return fmt.format(now);
}

// Tambah hari ke tanggal YYYY-MM-DD (dihitung di UTC supaya tidak terpengaruh zona server).
function addDays(ymd, days) {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

module.exports = { todayJakarta, addDays };
