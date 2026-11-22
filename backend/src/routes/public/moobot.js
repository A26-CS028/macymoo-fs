const express = require('express');
const pool = require('../../db/pool');
const { chat } = require('../../services/aiClient');
const rateLimit = require('../../middleware/rateLimit');
const validate = require('../../middleware/validate');
const verifyTurnstile = require('../../middleware/turnstile');
const { moobotChat } = require('../../validators/order');
const { httpError } = require('../../middleware/errorHandler');
const { todayJakarta } = require('../../utils/date');

const router = express.Router();

// Aturan pemesanan (KF) belum punya tabel, jadi teks tetap; sama dengan context.example.txt macymoo-ai.
const ATURAN = `ATURAN
- Tanggal kirim paling cepat besok. Pesanan hari ini lewat WhatsApp, keputusan Nabila.
- Pesanan dimasak setelah dikonfirmasi Nabila.
- Pengiriman: diantar Nabila (ongkir dikonfirmasi Nabila) atau Ambil Sendiri (Rp0).
- Pembayaran: QRIS GoPay, transfer bank, atau tunai. Batas bayar di muka 4 jam setelah tagihan dikirim.
- DP tidak ada di form; hubungi Nabila lewat WhatsApp.
- Pembatalan dan jadwal ulang dilakukan Nabila lewat WhatsApp.`;
const MAX_CONTEXT = 8000; // batas FastAPI (MooBotChatRequest)

const rp = (n) => `Rp${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

// Menu dan harga dari database (KF 9.4), tanpa data pesanan.
async function buildContext() {
  const { rows: menus } = await pool.query(
    'SELECT id, name, description, price FROM menus WHERE is_available = true ORDER BY id'
  );
  const { rows: options } = await pool.query(
    'SELECT menu_id, option_group, name, extra_price FROM menu_options WHERE menu_id = ANY($1::int[]) ORDER BY id',
    [menus.map((m) => m.id)]
  );
  const { rows: closed } = await pool.query(
    `SELECT to_char(closed_date, 'YYYY-MM-DD') AS d FROM closed_dates
     WHERE closed_date >= $1 ORDER BY closed_date LIMIT 30`,
    [todayJakarta()]
  );

  const menuLines = menus.map((m) => {
    const groups = new Map();
    for (const o of options.filter((x) => x.menu_id === m.id)) {
      const label = o.extra_price > 0 ? `${o.name} +${rp(o.extra_price)}` : o.name;
      const key = o.option_group ?? o.name;
      groups.set(key, [...(groups.get(key) ?? []), label]);
    }
    const opsi = [...groups].map(([g, names]) => `${g} (${names.join(', ')})`).join('; ');
    return `- ${m.name}: ${rp(m.price)}.${m.description ? ` ${m.description}.` : ''}${opsi ? ` Opsi: ${opsi}.` : ''}`;
  });

  const context = [
    `MENU\n${menuLines.join('\n') || '- Belum ada menu yang tersedia'}`,
    `TANGGAL DITUTUP\n${closed.map((c) => `- ${c.d}`).join('\n') || '- Tidak ada'}`,
    ATURAN,
  ].join('\n\n');
  return context.slice(0, MAX_CONTEXT); // shortcut: dipotong bila menu sangat banyak; ringkas bila menu > ±30
}

router.post(
  '/moobot/chat',
  rateLimit({ name: 'moobot', max: 20, windowMs: 10 * 60 * 1000 }),
  validate(moobotChat),
  verifyTurnstile,
  async (req, res, next) => {
    try {
      const reply = await chat(req.body.message, await buildContext());
      // tanpa identitas (KF 11); gagal simpan log tidak menggagalkan jawaban
      await pool
        .query('INSERT INTO chat_logs (user_message, bot_reply) VALUES ($1, $2)', [req.body.message, reply])
        .catch((err) => console.error('Simpan chat_logs gagal:', err.message));
      if (reply === null) {
        throw httpError(503, 'AI_UNAVAILABLE', 'MooBot sedang tidak bisa menjawab. Coba lagi nanti atau hubungi Nabila lewat WhatsApp.');
      }
      res.json({ reply });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
