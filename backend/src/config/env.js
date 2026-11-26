const env = {
  databaseUrl: process.env.DATABASE_URL,
  frontendOrigin: process.env.FRONTEND_ORIGIN,
  jwtSecret: process.env.JWT_SECRET,
  turnstileSecretKey: process.env.TURNSTILE_SECRET_KEY,
  // Layanan AI boleh tidak aktif (uji 13), jadi tidak ikut dicek di bawah.
  aiServiceUrl: process.env.AI_SERVICE_URL?.trim() || undefined,
  aiInternalSecret: process.env.AI_INTERNAL_SECRET?.trim() || undefined,
  aiTimeoutMs: Number(process.env.AI_TIMEOUT_MS) || 3000,
};

// Gagal saat start, bukan 500 di setiap login dan pesanan.
const problems = [];
if (!env.databaseUrl) problems.push('DATABASE_URL kosong');
if (!env.jwtSecret || env.jwtSecret.length < 32) problems.push('JWT_SECRET minimal 32 karakter');
// Tanpa FRONTEND_ORIGIN, cors() jatuh ke Access-Control-Allow-Origin: *.
if (!env.frontendOrigin) problems.push('FRONTEND_ORIGIN kosong');
if (!env.turnstileSecretKey) problems.push('TURNSTILE_SECRET_KEY kosong');
if (problems.length) throw new Error(`Konfigurasi tidak valid: ${problems.join(', ')}`);

// Diurai dengan URL, bukan dicocokkan dengan pola awalan: 'http://localhost:80@contoh.com' diawali
// 'http://localhost:' padahal host sebenarnya contoh.com (bagian sebelum @ hanya nama pengguna).
function aiUrlAman(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol === 'https:') return true;
  return url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
}

// Catatan pelanggan dan X-Internal-Secret dikirim ke AI_SERVICE_URL: wajib https (kecuali lokal) dan secret wajib ada.
// AI opsional (uji 13/14), jadi salah konfigurasi TIDAK menghentikan backend: AI dimatikan
// (aiServiceUrl dikosongkan, callAI mengembalikan null) dan alasannya dicatat tanpa nilai env.
const aiProblems = [];
if (env.aiServiceUrl) {
  if (!aiUrlAman(env.aiServiceUrl)) aiProblems.push('AI_SERVICE_URL wajib https');
  if (!env.aiInternalSecret) aiProblems.push('AI_INTERNAL_SECRET kosong');
}
if (aiProblems.length) {
  console.warn(`[config] Layanan AI dimatikan: ${aiProblems.join(', ')}`);
  env.aiServiceUrl = undefined;
}
env.aiProblems = aiProblems;

module.exports = env;
