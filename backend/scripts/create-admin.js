// Buat akun admin, atau ganti kata sandinya bila username sudah ada (tidak ada endpoint daftar admin).
// Pakai dari folder backend:  ADMIN_PASSWORD='kata-sandi-panjang' npm run create-admin -- nabila
const bcrypt = require('bcryptjs');
const pool = require('../src/db/pool');

async function main() {
  const username = (process.argv[2] || '').trim();
  const password = process.env.ADMIN_PASSWORD || '';
  if (!username || username.length > 50) throw new Error('Username wajib diisi, maksimal 50 karakter');
  if (password.length < 10) throw new Error('ADMIN_PASSWORD wajib diisi, minimal 10 karakter');

  const hash = await bcrypt.hash(password, 12);
  const { rows } = await pool.query(
    `INSERT INTO admin_users (username, password_hash) VALUES ($1, $2)
     ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash
     RETURNING id, (xmax = 0) AS created`,
    [username, hash]
  );
  console.log(`${rows[0].created ? 'Admin dibuat' : 'Kata sandi diganti'}: ${username} (id ${rows[0].id})`);
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
