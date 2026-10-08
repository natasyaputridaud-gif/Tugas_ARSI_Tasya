'use strict';

const crypto = require('node:crypto');
const db = require('./db');
const { hashPassword, verifyPassword } = require('./password');

const SESSION_COOKIE = 'kos_session';
const SESSION_HARI = 7;

/* ---------------- Sesi ---------------- */

function buatSesi(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)').run(token, userId);
  return token;
}

function hapusSesi(token) {
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

function ambilSesi(token) {
  if (!token) return null;
  const row = db
    .prepare(
      `SELECT u.id, u.role, u.username, t.nama AS nama_tenant, t.id AS tenant_id
         FROM sessions s
         JOIN users u ON u.id = s.user_id
         LEFT JOIN tenants t ON t.user_id = u.id
        WHERE s.token = ?`
    )
    .get(token);
  return row || null;
}

function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie;
  if (!raw) return out;
  for (const bagian of raw.split(';')) {
    const idx = bagian.indexOf('=');
    if (idx === -1) continue;
    out[bagian.slice(0, idx).trim()] = decodeURIComponent(bagian.slice(idx + 1).trim());
  }
  return out;
}

/** Lampirkan `req.user` (atau null) berdasarkan cookie sesi. */
function loadUser(req, res, next) {
  const token = parseCookies(req)[SESSION_COOKIE] || null;
  req.sessionToken = token;
  req.user = ambilSesi(token);
  next();
}

function setSessionCookie(res, token) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_HARI * 24 * 60 * 60 * 1000,
  });
}

function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

/* ---------------- Proteksi peran ---------------- */

const halamanAksesDitolak = (pesan) =>
  `<!doctype html><html lang="id"><head><meta charset="utf-8">
   <meta name="viewport" content="width=device-width, initial-scale=1">
   <title>Akses ditolak</title></head>
   <body style="font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#f8fafc;color:#0f172a">
   <div style="text-align:center;padding:24px">
     <h1 style="font-size:20px;margin:0 0 8px">Akses ditolak</h1>
     <p style="margin:0 0 16px;color:#475569">${pesan}</p>
     <a href="/login" style="color:#2563eb">Kembali ke halaman login</a>
   </div></body></html>`;

function requireOwner(req, res, next) {
  if (!req.user) {
    return res.redirect('/login?pesan=' + encodeURIComponent('Silakan login terlebih dahulu.'));
  }
  if (req.user.role !== 'owner') {
    return res.status(403).type('html').send(halamanAksesDitolak('Halaman ini hanya untuk pemilik kos.'));
  }
  next();
}

function requireTenant(req, res, next) {
  if (!req.user) {
    return res.redirect('/login?pesan=' + encodeURIComponent('Silakan login terlebih dahulu.'));
  }
  if (req.user.role !== 'tenant') {
    return res.status(403).type('html').send(halamanAksesDitolak('Halaman ini hanya untuk penghuni kos.'));
  }
  next();
}

/** Untuk endpoint JSON API: wajib login, balas JSON (bukan redirect). */
function requireAuthJson(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ ok: false, pesan: 'Sesi berakhir. Silakan login ulang.' });
  }
  next();
}

/** Untuk API khusus pemilik: balas JSON 401/403, bukan halaman redirect. */
function requireOwnerApi(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ ok: false, pesan: 'Sesi berakhir. Silakan login ulang.' });
  }
  if (req.user.role !== 'owner') {
    return res.status(403).json({ ok: false, pesan: 'Akses ditolak. Fitur ini hanya untuk pemilik kos.' });
  }
  next();
}

module.exports = {
  hashPassword,
  verifyPassword,
  buatSesi,
  hapusSesi,
  loadUser,
  setSessionCookie,
  clearSessionCookie,
  requireOwner,
  requireTenant,
  requireAuthJson,
  requireOwnerApi,
  SESSION_COOKIE,
};
