'use strict';

const express = require('express');
const db = require('../db');
const { hashPassword } = require('../password');
const { requireOwner, requireOwnerApi, requireAuthJson } = require('../auth');
const { halamanDashboard, halamanKamar, halamanPenghuni } = require('../views/admin');

const router = express.Router();

/* ---------------- Util ---------------- */

function statistik() {
  const total = db.prepare('SELECT COUNT(*) AS n FROM rooms').get().n;
  const terisi = db
    .prepare('SELECT COUNT(DISTINCT room_id) AS n FROM tenants WHERE room_id IS NOT NULL')
    .get().n;
  return { total, terisi, kosong: total - terisi };
}

function daftarKamar() {
  return db
    .prepare(
      `SELECT r.*,
              CASE WHEN EXISTS (SELECT 1 FROM tenants t WHERE t.room_id = r.id)
                   THEN 'terisi' ELSE 'kosong' END AS status,
              (SELECT COUNT(*) FROM tenants t WHERE t.room_id = r.id) AS jumlah_penghuni
         FROM rooms r
        ORDER BY r.nomor COLLATE NOCASE`
    )
    .all();
}

function daftarKamarKosong() {
  return db
    .prepare(
      `SELECT * FROM rooms
        WHERE NOT EXISTS (SELECT 1 FROM tenants t WHERE t.room_id = rooms.id)
        ORDER BY nomor COLLATE NOCASE`
    )
    .all();
}

function daftarPenghuni() {
  return db
    .prepare(
      `SELECT t.*, u.username, r.nomor, r.tipe
         FROM tenants t
         JOIN users u ON u.id = t.user_id
         LEFT JOIN rooms r ON r.id = t.room_id
        ORDER BY t.nama COLLATE NOCASE`
    )
    .all();
}

/** Kirim error validasi dengan pesan Bahasa Indonesia yang jelas. */
function kirimError(res, pesan, status = 400) {
  return res.status(status).json({ ok: false, pesan });
}

/* ---------------- Halaman ---------------- */

router.get('/admin', requireOwner, (req, res) => {
  const kosongRows = daftarKamarKosong();
  res.send(
    halamanDashboard({
      user: req.user,
      stats: statistik(),
      kamarKosong: kosongRows,
    })
  );
});

router.get('/admin/kamar', requireOwner, (req, res) => {
  res.send(halamanKamar({ user: req.user, kamar: daftarKamar() }));
});

router.get('/admin/penghuni', requireOwner, (req, res) => {
  res.send(
    halamanPenghuni({
      user: req.user,
      penghuni: daftarPenghuni(),
      kamarKosong: daftarKamarKosong(),
    })
  );
});

/* ---------------- API kamar ---------------- */

const apiKamar = express.Router();
apiKamar.use(requireOwnerApi, express.json());

function validasiKamar(body) {
  const nomor = String(body?.nomor || '').trim();
  const tipe = String(body?.tipe || '').trim();
  const fasilitas = String(body?.fasilitas || '').trim();
  const harga = Number(body?.harga);

  if (!nomor) return { pesan: 'Nomor kamar wajib diisi.' };
  if (!tipe) return { pesan: 'Tipe kamar wajib diisi.' };
  if (!Number.isFinite(harga) || harga < 0) return { pesan: 'Harga per bulan harus angka yang valid.' };
  return { nilai: { nomor, tipe, harga: Math.round(harga), fasilitas } };
}

apiKamar.post('/', (req, res) => {
  const v = validasiKamar(req.body);
  if (v.pesan) return kirimError(res, v.pesan);

  const ada = db.prepare('SELECT id FROM rooms WHERE LOWER(nomor) = LOWER(?)').get(v.nilai.nomor);
  if (ada) return kirimError(res, 'Nomor kamar sudah dipakai.');

  db.prepare('INSERT INTO rooms (nomor, tipe, harga, fasilitas) VALUES (?, ?, ?, ?)').run(
    v.nilai.nomor,
    v.nilai.tipe,
    v.nilai.harga,
    v.nilai.fasilitas
  );
  res.json({ ok: true, pesan: 'Kamar berhasil ditambahkan.' });
});

apiKamar.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const kamar = db.prepare('SELECT * FROM rooms WHERE id = ?').get(id);
  if (!kamar) return kirimError(res, 'Kamar tidak ditemukan.', 404);

  const v = validasiKamar(req.body);
  if (v.pesan) return kirimError(res, v.pesan);

  const bentrok = db
    .prepare('SELECT id FROM rooms WHERE LOWER(nomor) = LOWER(?) AND id <> ?')
    .get(v.nilai.nomor, id);
  if (bentrok) return kirimError(res, 'Nomor kamar sudah dipakai.');

  db.prepare('UPDATE rooms SET nomor = ?, tipe = ?, harga = ?, fasilitas = ? WHERE id = ?').run(
    v.nilai.nomor,
    v.nilai.tipe,
    v.nilai.harga,
    v.nilai.fasilitas,
    id
  );
  res.json({ ok: true, pesan: 'Kamar berhasil diperbarui.' });
});

apiKamar.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const kamar = db.prepare('SELECT * FROM rooms WHERE id = ?').get(id);
  if (!kamar) return kirimError(res, 'Kamar tidak ditemukan.', 404);

  const penghuni = db.prepare('SELECT nama FROM tenants WHERE room_id = ?').get(id);
  if (penghuni) {
    return kirimError(res, `Kamar masih dihuni ${penghuni.nama}. Keluarkan penghuni dulu.`);
  }

  db.prepare('DELETE FROM rooms WHERE id = ?').run(id);
  res.json({ ok: true, pesan: 'Kamar berhasil dihapus.' });
});

/* ---------------- API penghuni ---------------- */

const apiPenghuni = express.Router();
apiPenghuni.use(requireOwnerApi, express.json());

function validasiPenghuni(body, { barukan = false } = {}) {
  const nama = String(body?.nama || '').trim();
  const telepon = String(body?.telepon || '').trim();
  const tanggal_masuk = String(body?.tanggal_masuk || '').trim();
  const username = String(body?.username || '').trim();
  const password = String(body?.password || '');
  const room_id = body?.room_id === '' || body?.room_id == null ? null : Number(body.room_id);

  if (!nama) return { pesan: 'Nama lengkap wajib diisi.' };
  if (!telepon) return { pesan: 'Nomor telepon wajib diisi.' };
  if (!tanggal_masuk) return { pesan: 'Tanggal masuk wajib diisi.' };
  if (!username) return { pesan: 'Username wajib diisi.' };
  if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
    return { pesan: 'Username hanya boleh berisi huruf, angka, titik, garis bawah, dan strip.' };
  }
  if (!barukan && password.length < 6) return { pesan: 'Password minimal 6 karakter.' };
  if (barukan && password && password.length < 6) return { pesan: 'Password minimal 6 karakter.' };
  if (room_id !== null && !Number.isFinite(room_id)) return { pesan: 'Pilihan kamar tidak valid.' };

  return { nilai: { nama, telepon, tanggal_masuk, username, password, room_id } };
}

function kamarAmanUntuk(room_id, tenantSekarang = null) {
  if (room_id === null) return { ok: true };
  const kamar = db.prepare('SELECT * FROM rooms WHERE id = ?').get(room_id);
  if (!kamar) return { pesan: 'Kamar tidak ditemukan.' };
  const penghuni = db.prepare('SELECT id, nama FROM tenants WHERE room_id = ?').get(room_id);
  if (penghuni && penghuni.id !== tenantSekarang) {
    return { pesan: 'Kamar sudah terisi penghuni lain. Pilih kamar yang kosong.' };
  }
  return { ok: true };
}

apiPenghuni.post('/', (req, res) => {
  const v = validasiPenghuni(req.body);
  if (v.pesan) return kirimError(res, v.pesan);

  const ada = db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?)').get(v.nilai.username);
  if (ada) return kirimError(res, 'Username sudah dipakai.');

  const cekKamar = kamarAmanUntuk(v.nilai.room_id);
  if (cekKamar.pesan) return kirimError(res, cekKamar.pesan);

  db.exec('BEGIN');
  try {
    const userId = db
      .prepare('INSERT INTO users (role, username, password_hash) VALUES (?, ?, ?)')
      .run('tenant', v.nilai.username, hashPassword(v.nilai.password)).lastInsertRowid;
    db.prepare(
      'INSERT INTO tenants (user_id, nama, telepon, tanggal_masuk, room_id) VALUES (?, ?, ?, ?, ?)'
    ).run(userId, v.nilai.nama, v.nilai.telepon, v.nilai.tanggal_masuk, v.nilai.room_id);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    if (String(err.message).includes('UNIQUE')) {
      return kirimError(res, 'Username sudah dipakai.');
    }
    throw err;
  }

  res.json({ ok: true, pesan: 'Penghuni berhasil ditambahkan.' });
});

apiPenghuni.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(id);
  if (!tenant) return kirimError(res, 'Penghuni tidak ditemukan.', 404);

  const v = validasiPenghuni(req.body, { barukan: true });
  if (v.pesan) return kirimError(res, v.pesan);

  const bentrok = db
    .prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND id <> ?')
    .get(v.nilai.username, tenant.user_id);
  if (bentrok) return kirimError(res, 'Username sudah dipakai.');

  const cekKamar = kamarAmanUntuk(v.nilai.room_id, tenant.id);
  if (cekKamar.pesan) return kirimError(res, cekKamar.pesan);

  db.exec('BEGIN');
  try {
    db.prepare('UPDATE users SET username = ? WHERE id = ?').run(v.nilai.username, tenant.user_id);
    if (v.nilai.password) {
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(
        hashPassword(v.nilai.password),
        tenant.user_id
      );
    }
    db.prepare(
      'UPDATE tenants SET nama = ?, telepon = ?, tanggal_masuk = ?, room_id = ? WHERE id = ?'
    ).run(v.nilai.nama, v.nilai.telepon, v.nilai.tanggal_masuk, v.nilai.room_id, id);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    if (String(err.message).includes('UNIQUE')) {
      return kirimError(res, 'Nomor kamar atau username sudah dipakai.');
    }
    throw err;
  }

  res.json({ ok: true, pesan: 'Data penghuni berhasil diperbarui.' });
});

/** Keluarkan penghuni dari kamarnya (kembali kosong), akun tetap ada. */
apiPenghuni.post('/:id/keluarkan', (req, res) => {
  const id = Number(req.params.id);
  const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(id);
  if (!tenant) return kirimError(res, 'Penghuni tidak ditemukan.', 404);
  if (!tenant.room_id) return kirimError(res, 'Penghuni ini tidak menempati kamar mana pun.');

  db.prepare('UPDATE tenants SET room_id = NULL WHERE id = ?').run(id);
  res.json({ ok: true, pesan: `${tenant.nama} dikeluarkan dari kamar. Kamar kembali kosong.` });
});

/** Hapus penghuni beserta akun loginnya. */
apiPenghuni.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(id);
  if (!tenant) return kirimError(res, 'Penghuni tidak ditemukan.', 404);

  db.prepare('DELETE FROM users WHERE id = ?').run(tenant.user_id);
  res.json({ ok: true, pesan: 'Penghuni berhasil dihapus.' });
});

/* ---------------- API ringkasan (opsional) ---------------- */

router.get('/api/statistik', requireAuthJson, (req, res) => {
  if (req.user.role !== 'owner') return kirimError(res, 'Akses ditolak.', 403);
  res.json({ ok: true, data: statistik() });
});

router.use('/api/kamar', apiKamar);
router.use('/api/penghuni', apiPenghuni);

module.exports = router;
