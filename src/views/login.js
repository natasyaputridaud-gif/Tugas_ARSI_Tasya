'use strict';

const { esc, layout } = require('./layout');

function halamanLogin({ pesan = null, error = null, username = '' } = {}) {
  const body = `
  <div class="kartu-login">
    <div class="login-kepala">
      <span class="login-ikon" aria-hidden="true">🏠</span>
      <h1>Sistem Manajemen Kos</h1>
      <p>Masuk untuk melanjutkan</p>
    </div>

    ${pesan ? `<div class="alert alert-info" role="status">${esc(pesan)}</div>` : ''}
    ${error ? `<div class="alert alert-error" role="alert">${esc(error)}</div>` : ''}

    <form method="post" action="/login" class="form-login" autocomplete="off">
      <label class="isian">
        <span>Username</span>
        <input type="text" name="username" value="${esc(username)}" required autofocus placeholder="cth. admin">
      </label>
      <label class="isian">
        <span>Password</span>
        <input type="password" name="password" required placeholder="••••••••">
      </label>
      <button type="submit" class="tombol tombol-utama tombol-lebar">Masuk</button>
    </form>

    <div class="login-catatan">
      <p><strong>Pemilik kos</strong> → admin / admin123</p>
      <p><strong>Penghuni</strong> → budi / budi123</p>
    </div>
  </div>`;

  return layout({ title: 'Masuk', body });
}

module.exports = { halamanLogin };
