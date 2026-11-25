const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const { frontendOrigin } = require('./config/env');
const routes = require('./routes');
const { httpError, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.set('trust proxy', 1); // di balik proxy Vercel
app.use(helmet()); // header keamanan, sekaligus menghapus X-Powered-By
// Retry-After dibuka supaya halaman login bisa menampilkan hitung mundur saat kena rate limit
app.use(cors({ origin: frontendOrigin, credentials: true, exposedHeaders: ['Retry-After'] }));
app.use(express.json());
app.use(cookieParser());

app.use('/api/v1', routes);

app.get('/', (req, res) => res.json({ name: 'macymoo-api', status: 'ok' }));

// 404 dan error handler (harus paling bawah, setelah semua route)
app.use((req, res, next) => next(httpError(404, 'NOT_FOUND', 'Endpoint tidak ditemukan')));
app.use(errorHandler);

module.exports = app; // jangan panggil app.listen() di sini