# Sistem Manajemen Kos

Aplikasi web sederhana untuk mengelola kamar dan penghuni kos. Antarmuka seluruhnya dalam Bahasa Indonesia, responsif di HP, dan mendukung mode terang/gelap.

## Teknologi

- Node.js + Express 5
- SQLite lewat `node:sqlite` (bawaan Node, tanpa driver tambahan)
- Hash password: `scrypt` + salt acak (bukan teks biasa)
- Halaman dirender server + JavaScript ringan di sisi klien (modal, fetch API)

## Cara Menjalankan

```bash
cd sistem-manajemen-kos
npm install      # sekali saja
npm start        # buka http://localhost:3000
```

Server memakai port `3000` (ubah dengan env `PORT=8080 npm start`) dan mendengarkan di `0.0.0.0`, sehingga bisa dibuka dari perangkat lain di jaringan yang sama (lihat IP komputer Anda, contoh `http://192.168.1.5:3000`).

Database otomatis dibuat di `data/app.db` beserta data contoh. Untuk memulai ulang dari data contoh, hapus file tersebut lalu jalankan ulang aplikasi.

## Akun contoh

| Peran    | Username | Password  |
| -------- | -------- | --------- |
| Pemilik  | `admin`  | `admin123` |
| Penghuni | `budi`   | `budi123`  |

Data awal: 4 kamar (A1, A2 tipe Standar Rp900.000 dan B1, B2 tipe AC Rp1.400.000) serta 1 penghuni Budi Santoso di kamar A1.

## Fitur

**Pemilik (admin)**

- Dashboard ringkasan: total kamar, kamar terisi, kamar kosong.
- Kelola kamar (tambah/ubah/hapus): nomor unik, kamar yang masih dihuni tidak bisa dihapus.
- Kelola penghuni (tambah/ubah/hapus): satu kamar hanya satu penghuni, pilihan kamar hanya menampilkan kamar kosong.
- Aksi "Keluarkan" mengosongkan kamar tanpa menghapus akun penghuni; "Hapus" menghapus penghuni beserta akunnya.
- Status kamar (Kosong/Terisi) dihitung otomatis dari data penghuni dan ditampilkan sebagai badge.

**Penghuni**

- Halaman "Data diri": nama, telepon, username, tanggal mulai menghuni (hanya bisa dilihat).
- Halaman "Kamar saya": nomor, tipe, harga, fasilitas, status; bila belum punya kamar muncul pesan "Kamu belum ditempatkan di kamar. Hubungi pemilik kos."

**Keamanan**

- Login berbasis peran; halaman pemilik tidak bisa diakses penghuni (dan sebaliknya).
- Password disimpan sebagai hash scrypt + salt.
- Sesi memakai cookie `httpOnly`, dengan tombol Keluar (logout).
- Semua input divalidasi di server, output di-escape untuk mencegah XSS.

## Struktur proyek

```
sistem-manajemen-kos/
├── server.js           # entry point Express
├── data/app.db         # database SQLite (dibuat otomatis)
├── public/             # style.css + app.js (sisi klien)
└── src/
    ├── db.js           # skema, koneksi, data contoh
    ├── password.js     # hash password
    ├── auth.js         # sesi & middleware peran
    ├── routes/         # auth, admin (halaman + API), tenant
    └── views/          # template HTML (layout, login, admin, tenant)
```

## Model data

- `users`: id, role (owner/tenant), username, password_hash
- `rooms`: id, nomor, tipe, harga, fasilitas
- `tenants`: id, user_id, nama, telepon, tanggal_masuk, room_id (nullable)
- `sessions`: token, user_id

Relasi: `tenants.room_id` bernilai `UNIQUE`, sehingga satu kamar hanya boleh memiliki paling banyak satu penghuni aktif.
