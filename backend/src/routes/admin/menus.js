const express = require('express');
const pool = require('../../db/pool');
const validate = require('../../middleware/validate');
const { requireAdmin } = require('../../middleware/auth');
const { httpError } = require('../../middleware/errorHandler');
const { menuCreate, menuUpdate, optionCreate, optionUpdate } = require('../../validators/menu');

const router = express.Router();

// Semua route di file ini hanya untuk admin yang sudah masuk (selain itu 401).
router.use(requireAdmin);

const MENU_COLUMNS = 'id, name, description, price, photo_url, is_available';
const OPTION_COLUMNS = 'id, menu_id, option_group, name, extra_price';
const notFound = () => httpError(404, 'NOT_FOUND', 'Data tidak ditemukan');

// Id di path harus bilangan bulat positif; selain itu dianggap tidak ada (404).
function parseId(value) {
  if (!/^\d{1,9}$/.test(value) || Number(value) < 1) throw notFound();
  return Number(value);
}

// Tempelkan daftar opsi ke setiap menu (satu query untuk semua menu).
async function attachOptions(menus) {
  if (menus.length === 0) return [];
  const { rows } = await pool.query(
    `SELECT ${OPTION_COLUMNS} FROM menu_options WHERE menu_id = ANY($1::int[]) ORDER BY id`,
    [menus.map((m) => m.id)]
  );
  return menus.map((m) => ({ ...m, options: rows.filter((o) => o.menu_id === m.id) }));
}

// Susun "kolom = $n" hanya untuk field yang dikirim. Nama kolom dari daftar tetap, bukan dari klien.
function buildSet(body, columns) {
  const sets = [];
  const values = [];
  for (const col of columns) {
    if (body[col] !== undefined) {
      values.push(body[col]);
      sets.push(`${col} = $${values.length}`);
    }
  }
  return { sets, values };
}

// ---- Menu --------------------------------------------------------------

// Semua menu, termasuk yang habis (GET /menus publik hanya yang tersedia).
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`SELECT ${MENU_COLUMNS} FROM menus ORDER BY id`);
    res.json({ menus: await attachOptions(rows) });
  } catch (err) {
    next(err);
  }
});

router.post('/', validate(menuCreate), async (req, res, next) => {
  try {
    const b = req.body;
    const { rows } = await pool.query(
      `INSERT INTO menus (name, description, price, photo_url, is_available)
       VALUES ($1, $2, $3, $4, $5) RETURNING ${MENU_COLUMNS}`,
      [b.name, b.description || null, b.price, b.photo_url || null, b.is_available]
    );
    res.status(201).json({ ...rows[0], options: [] });
  } catch (err) {
    next(err);
  }
});

// Harga baru hanya berlaku untuk pesanan berikutnya: pesanan lama sudah menyalin harga (order_items.unit_price).
router.patch('/:id', validate(menuUpdate), async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const body = { ...req.body };
    if (body.description === '') body.description = null;

    const { sets, values } = buildSet(body, ['name', 'description', 'price', 'photo_url', 'is_available']);
    values.push(id);
    const { rows } = await pool.query(
      `UPDATE menus SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING ${MENU_COLUMNS}`,
      values
    );
    if (rows.length === 0) throw notFound();
    res.json((await attachOptions(rows))[0]);
  } catch (err) {
    next(err);
  }
});

// ---- Opsi menu ---------------------------------------------------------

router.get('/:id/options', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const menu = await pool.query('SELECT 1 FROM menus WHERE id = $1', [id]);
    if (menu.rowCount === 0) throw notFound();
    const { rows } = await pool.query(
      `SELECT ${OPTION_COLUMNS} FROM menu_options WHERE menu_id = $1 ORDER BY id`,
      [id]
    );
    res.json({ options: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/options', validate(optionCreate), async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const b = req.body;
    // INSERT ... SELECT ... WHERE EXISTS: satu query, tidak ada celah antara cek menu dan simpan.
    const { rows } = await pool.query(
      `INSERT INTO menu_options (menu_id, option_group, name, extra_price)
       SELECT $1, $2, $3, $4 WHERE EXISTS (SELECT 1 FROM menus WHERE id = $1)
       RETURNING ${OPTION_COLUMNS}`,
      [id, b.option_group, b.name, b.extra_price]
    );
    if (rows.length === 0) throw notFound();
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// Selisih harga ayam paha dan dada mengikuti harga pasar; diubah di sini. Pesanan lama tidak berubah.
router.patch('/:id/options/:optionId', validate(optionUpdate), async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const optionId = parseId(req.params.optionId);
    const { sets, values } = buildSet(req.body, ['name', 'extra_price']);
    values.push(optionId, id);
    const { rows } = await pool.query(
      `UPDATE menu_options SET ${sets.join(', ')}
       WHERE id = $${values.length - 1} AND menu_id = $${values.length}
       RETURNING ${OPTION_COLUMNS}`,
      values
    );
    if (rows.length === 0) throw notFound();
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;