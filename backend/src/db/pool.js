const { Pool } = require('pg');
const { databaseUrl } = require('../config/env');

// max kecil karena serverless: tiap instance Vercel membuat pool sendiri
const pool = new Pool({
  connectionString: databaseUrl,
  max: 3,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
  ssl: { rejectUnauthorized: false },
});

// Tanpa ini, koneksi idle yang diputus Neon membuat proses crash
pool.on('error', (err) => {
  console.error('pg pool error:', err.message);
});

module.exports = pool;