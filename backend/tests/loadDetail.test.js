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

test('loadDetail memberi note_flags dari aturan catatan, sama dengan daftar masak', async () => {
  const order = {
    id: 1, order_code: 'MYM-UJI', source: 'web_form', customer_name: 'Uji', phone: null, status: 'diproses',
    pay_status: 'belum_bayar', pay_timing: 'setelah_kirim', discount: 0, invoice_sent_at: null, public_token: 'x', created_at: new Date(),
  };
  const rows = [
    ['FROM orders', [order]],
    ['FROM deliveries', [{ id: 1, order_id: 1, delivery_date: '2026-11-30', method: 'ambil_sendiri', shipping_fee: 0 }]],
    ['FROM order_items', [{ id: 5, order_id: 1, delivery_id: 1, item_type: 'menu', menu_id: 2, name: 'Wraphoria', unit_price: 27000, qty: 1, note: 'pedes banget ya kak', extra: 0 }]],
    ['FROM order_item_options', [{ order_item_id: 5, menu_option_id: 9, name: 'Light', option_group: 'pedas', extra_price: 0 }]],
    ['FROM menu_options', [{ menu_id: 2, option_group: 'pedas', name: 'Light', extra_price: 0 }]],
  ];
  const client = { query: async (sql) => ({ rows: rows.find(([k]) => sql.includes(k))?.[1] || [] }) };

  const detail = await loadDetail(client, 1);
  assert.strictEqual(detail.items[0].note_flags.length, 1);
  assert.strictEqual(detail.items[0].note_flags[0].code, 'note_conflict');
});
