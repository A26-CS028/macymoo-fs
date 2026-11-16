const express = require('express');
const Joi = require('joi');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../../db/pool');
const { jwtSecret } = require('../../config/env');
const validate = require('../../middleware/validate');
const rateLimit = require('../../middleware/rateLimit');
const { COOKIE_NAME, requireAdmin } = require('../../middleware/auth');
const { httpError } = require('../../middleware/errorHandler');

const router = express.Router();

const SESSION_MS = 7 * 24 * 60 * 60 * 1000; // 7 hari
// Dipakai saat username tidak ada, supaya waktu respons sama dan username terdaftar tidak bisa ditebak.
const DUMMY_HASH = '$2b$12$4UPla0b4TCWs6/DvWHaLLuffUFaAmm.LOegtklUJotv6XAtC15OBq';

const loginSchema = Joi.object({
  username: Joi.string().trim().max(50).required(),
  password: Joi.string().max(200).required(),
});

// secure mengikuti protokol (https di Vercel, http di localhost); trust proxy sudah dipasang di app.js
const cookieOptions = (req) => ({ httpOnly: true, sameSite: 'lax', secure: req.secure, path: '/' });

router.post(
  '/login',
  rateLimit({ name: 'login', max: 5, windowMs: 15 * 60 * 1000 }),
  validate(loginSchema),
  async (req, res, next) => {
    try {
      const { username, password } = req.body;
      const { rows } = await pool.query(
        'SELECT id, username, password_hash FROM admin_users WHERE username = $1',
        [username]
      );
      const admin = rows[0];
      const valid = await bcrypt.compare(password, admin ? admin.password_hash : DUMMY_HASH);
      if (!admin || !valid) throw httpError(401, 'UNAUTHORIZED', 'Username atau kata sandi salah');

      const token = jwt.sign({ sub: String(admin.id), username: admin.username }, jwtSecret, {
        algorithm: 'HS256',
        expiresIn: '7d',
      });
      res.cookie(COOKIE_NAME, token, { ...cookieOptions(req), maxAge: SESSION_MS });
      res.json({ id: admin.id, username: admin.username });
    } catch (err) {
      next(err);
    }
  }
);

router.post('/logout', requireAdmin, (req, res) => {
  res.clearCookie(COOKIE_NAME, cookieOptions(req));
  res.status(204).end();
});

router.get('/me', requireAdmin, (req, res) => res.json(req.admin));

module.exports = router;
