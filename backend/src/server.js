const app = require('./app');

const port = process.env.PORT || 3000;
// Hanya loopback: server dev memuat .env asli, jangan terbuka ke perangkat lain di jaringan.
app.listen(port, '127.0.0.1', () => console.log(`API jalan di http://localhost:${port}`));