const env = {
  databaseUrl: process.env.DATABASE_URL,
  frontendOrigin: process.env.FRONTEND_ORIGIN,
  jwtSecret: process.env.JWT_SECRET,
  turnstileSecretKey: process.env.TURNSTILE_SECRET_KEY,
  // Layanan AI boleh tidak aktif (uji 13), jadi tidak ikut dicek di bawah.
  aiServiceUrl: process.env.AI_SERVICE_URL,
  aiInternalSecret: process.env.AI_INTERNAL_SECRET,
  aiTimeoutMs: Number(process.env.AI_TIMEOUT_MS) || 3000,
};

// Gagal saat start, bukan 500 di setiap login dan pesanan.
const problems = [];
if (!env.databaseUrl) problems.push('DATABASE_URL kosong');
if (!env.jwtSecret || env.jwtSecret.length < 32) problems.push('JWT_SECRET minimal 32 karakter');
// Tanpa FRONTEND_ORIGIN, cors() jatuh ke Access-Control-Allow-Origin: *.
if (!env.frontendOrigin) problems.push('FRONTEND_ORIGIN kosong');
if (!env.turnstileSecretKey) problems.push('TURNSTILE_SECRET_KEY kosong');
// Catatan pelanggan dan X-Internal-Secret dikirim ke AI_SERVICE_URL: wajib https (kecuali lokal) dan secret wajib ada.
if (env.aiServiceUrl) {
  if (!/^(https:\/\/|http:\/\/(localhost|127\.0\.0\.1)(:|\/|$))/.test(env.aiServiceUrl)) problems.push('AI_SERVICE_URL wajib https');
  if (!env.aiInternalSecret) problems.push('AI_INTERNAL_SECRET kosong');
}
if (problems.length) throw new Error(`Konfigurasi tidak valid: ${problems.join(', ')}`);

module.exports = env;
