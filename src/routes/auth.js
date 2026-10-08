'use strict';

const express = require('express');
const db = require('../db');
const {
  verifyPassword,
  buatSesi,
  hapusSesi,
  setSessionCookie,
  clearSessionCookie,
} = require('../auth');
const { halamanLogin } = require('../views/login');

const router = express.Router();

router.get('/login', (req, res) => {
  if (req.user) return res.redirect(req.user.role === 'owner' ? '/admin' : '/penghuni');
  const pesan = req.query.pesan ? String(req.query.pesan).slice(0, 200) : null;
  res.send(halamanLogin({ pesan }));
});

router.post('/login', (req, res) => {
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  if (!user || !password || !verifyPassword(password, user.password_hash)) {
    return res
      .status(401)
      .send(halamanLogin({ error: 'Username atau password salah.', username }));
  }

  setSessionCookie(res, buatSesi(user.id));
  res.redirect(user.role === 'owner' ? '/admin' : '/penghuni');
});

router.post('/logout', (req, res) => {
  hapusSesi(req.sessionToken);
  clearSessionCookie(res);
  res.redirect('/login');
});

/** Halaman awal: arahkan sesuai peran. */
router.get('/', (req, res) => {
  if (!req.user) return res.redirect('/login');
  res.redirect(req.user.role === 'owner' ? '/admin' : '/penghuni');
});

module.exports = router;
