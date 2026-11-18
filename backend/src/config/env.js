const env = {
  databaseUrl: process.env.DATABASE_URL,
  frontendOrigin: process.env.FRONTEND_ORIGIN,
  jwtSecret: process.env.JWT_SECRET,
  turnstileSecretKey: process.env.TURNSTILE_SECRET_KEY,
};

// Gagal saat start, bukan 500 di setiap login dan pesanan.
const problems = [];
if (!env.databaseUrl) problems.push('DATABASE_URL kosong');
if (!env.jwtSecret || env.jwtSecret.length < 32) problems.push('JWT_SECRET minimal 32 karakter');
// Tanpa FRONTEND_ORIGIN, cors() jatuh ke Access-Control-Allow-Origin: *.
if (!env.frontendOrigin) problems.push('FRONTEND_ORIGIN kosong');
if (!env.turnstileSecretKey) problems.push('TURNSTILE_SECRET_KEY kosong');
if (problems.length) throw new Error(`Konfigurasi tidak valid: ${problems.join(', ')}`);

module.exports = env;
