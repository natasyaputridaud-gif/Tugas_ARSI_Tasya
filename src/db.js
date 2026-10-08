'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { hashPassword } = require('./password');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'app.db');

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    role          TEXT NOT NULL CHECK (role IN ('owner', 'tenant')),
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS rooms (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    nomor     TEXT NOT NULL UNIQUE,
    tipe      TEXT NOT NULL,
    harga     INTEGER NOT NULL,
    fasilitas TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS tenants (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    nama         TEXT NOT NULL,
    telepon      TEXT NOT NULL DEFAULT '',
    tanggal_masuk TEXT NOT NULL DEFAULT '',
    room_id      INTEGER UNIQUE REFERENCES rooms(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

/** Isi data contoh awal bila database masih kosong. */
function seed() {
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM users').get();
  if (n > 0) return;

  const insertUser = db.prepare(
    'INSERT INTO users (role, username, password_hash) VALUES (?, ?, ?)'
  );
  const insertRoom = db.prepare(
    'INSERT INTO rooms (nomor, tipe, harga, fasilitas) VALUES (?, ?, ?, ?)'
  );
  const insertTenant = db.prepare(
    'INSERT INTO tenants (user_id, nama, telepon, tanggal_masuk, room_id) VALUES (?, ?, ?, ?, ?)'
  );

  const ownerId = insertUser.run('owner', 'admin', hashPassword('admin123')).lastInsertRowid;

  insertRoom.run('A1', 'Standar', 900000, 'Kasur, Lemari, Kipas angin, Kamar mandi dalam');
  insertRoom.run('A2', 'Standar', 900000, 'Kasur, Lemari, Kipas angin, Kamar mandi dalam');
  insertRoom.run('B1', 'AC', 1400000, 'Kasur, Lemari, AC, Kulkas, Kamar mandi dalam');
  insertRoom.run('B2', 'AC', 1400000, 'Kasur, Lemari, AC, Kulkas, Kamar mandi dalam');

  const a1 = db.prepare('SELECT id FROM rooms WHERE nomor = ?').get('A1');
  const tenantUserId = insertUser.run('tenant', 'budi', hashPassword('budi123')).lastInsertRowid;
  insertTenant.run(tenantUserId, 'Budi Santoso', '081234567890', '2025-01-15', a1.id);

  void ownerId;
}

seed();

module.exports = db;
