'use strict';

const path = require('node:path');
const express = require('express');

require('./src/db'); // inisialisasi skema + data contoh

const { loadUser } = require('./src/auth');
const authRoutes = require('./src/routes/auth');
const adminRoutes = require('./src/routes/admin');
const tenantRoutes = require('./src/routes/tenant');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.set('trust proxy', true);
app.use(loadUser);
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(authRoutes);
app.use(adminRoutes);
app.use(tenantRoutes);

app.use((req, res) => {
  res
    .status(404)
    .type('html')
    .send(
      `<!doctype html><html lang="id"><head><meta charset="utf-8">
       <meta name="viewport" content="width=device-width, initial-scale=1"><title>Halaman tidak ditemukan</title>
       <link rel="stylesheet" href="/style.css"></head>
       <body class="halaman-pesan"><div class="kartu" style="text-align:center">
       <h1 style="margin-top:0">404</h1>
       <p>Halaman yang kamu tuju tidak ditemukan.</p>
       <a class="tombol tombol-utama" href="/">Kembali ke beranda</a>
       </div></body></html>`
    );
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Sistem Manajemen Kos berjalan di http://localhost:${PORT}`);
  console.log(`Pemilik : admin / admin123`);
  console.log(`Penghuni: budi / budi123`);
});
