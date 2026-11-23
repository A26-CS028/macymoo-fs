// loadDetail dipanggil withOrder dengan client transaksi: query harus berurutan (pg@9 menolak query paralel di satu client).
const { test } = require('node:test');
const assert = require('node:assert');

process.env.JWT_SECRET = 'rahasia-uji-minimal-32-karakter-xx';
process.env.DATABASE_URL = 'postgres://uji@localhost/uji';
process.env.TURNSTILE_SECRET_KEY = 'rahasia-uji';
process.env.FRONTEND_ORIGIN = 'http://localhost:5173';
const { loadDetail } = require('../src/routes/admin/orders');

test('loadDetail tidak menjalankan dua query bersamaan di satu client', async () => {
  let running = 0;
  let maxRunning = 0;
  const order = {
    id: 1, order_code: 'MYM-UJI', source: 'web', customer_name: 'Uji', phone: '6281234567890', status: 'menunggu_konfirmasi',
    pay_status: 'belum_bayar', pay_timing: 'di_muka', discount: 0, invoice_sent_at: null, public_token: 'x', created_at: new Date(),
  };
  const client = {
    async query(sql) {
      maxRunning = Math.max(maxRunning, ++running);
      await new Promise((resolve) => setImmediate(resolve));
      running--;
      if (sql.includes('FROM orders')) return { rows: [order] };
      if (sql.includes('FROM deliveries')) return { rows: [{ id: 1, order_id: 1, delivery_date: '2026-11-30', method: 'ambil_sendiri', shipping_fee: 0 }] };
      return { rows: [] };
    },
  };

  const detail = await loadDetail(client, 1);
  assert.strictEqual(maxRunning, 1);
  assert.strictEqual(detail.order_code, 'MYM-UJI');
});
