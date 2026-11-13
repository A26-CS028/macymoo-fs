const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { frontendOrigin } = require('./config/env');
const routes = require('./routes');

const app = express();

app.set('trust proxy', 1); // di balik proxy Vercel
app.use(cors({ origin: frontendOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use('/api/v1', routes);

// cek cepat: alamat root
app.get('/', (req, res) => res.json({ name: 'macymoo-api', status: 'ok' }));

// 404 (harus paling bawah, setelah semua route)
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// error handler (nanti diganti middleware/errorHandler.js sesuai kontrak API)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app; // jangan panggil app.listen() di sini