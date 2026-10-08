'use strict';

/** Escape teks aman disisipkan ke HTML. */
function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function rupiah(nilai) {
  const n = Number(nilai) || 0;
  return 'Rp' + new Intl.NumberFormat('id-ID').format(n);
}

function tanggalIndo(iso) {
  if (!iso) return '-';
  const d = new Date(String(iso).slice(0, 10) + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return esc(iso);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function badgeKamar(status) {
  return status === 'terisi'
    ? '<span class="badge badge-terisi">Terisi</span>'
    : '<span class="badge badge-kosong">Kosong</span>';
}

/**
 * Kerangka halaman: navbar, tema terang/gelap, dan slot konten.
 */
function layout({ title, user = null, active = '', body }) {
  const tanda = (kunci) => (active === kunci ? ' aria-current="page"' : '');

  const tautanOwner = `
    <a href="/admin" class="nav-tautan"${tanda('dashboard')}>Dashboard</a>
    <a href="/admin/kamar" class="nav-tautan"${tanda('kamar')}>Kamar</a>
    <a href="/admin/penghuni" class="nav-tautan"${tanda('penghuni')}>Penghuni</a>`;

  const tautanTenant = `
    <a href="/penghuni" class="nav-tautan"${tanda('datadiri')}>Data diri</a>
    <a href="/penghuni/kamar" class="nav-tautan"${tanda('kamar')}>Kamar saya</a>`;

  const nav = user
    ? `
      <nav class="nav-tautan-wrap" aria-label="Menu utama">
        ${user.role === 'owner' ? tautanOwner : tautanTenant}
      </nav>
      <div class="nav-aksi">
        <button type="button" class="tombol-ikon" id="tombol-tema" aria-label="Ganti tema">🌙</button>
        <span class="nav-pengguna">${esc(user.nama_tenant || user.username)}</span>
        <form method="post" action="/logout" class="form-keluar">
          <button type="submit" class="tombol tombol-keluar">Keluar</button>
        </form>
      </div>`
    : `<div class="nav-aksi">
        <button type="button" class="tombol-ikon" id="tombol-tema" aria-label="Ganti tema">🌙</button>
      </div>`;

  return `<!doctype html>
<html lang="id" data-theme="terang">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)} · Sistem Manajemen Kos</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🏠</text></svg>">
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <header class="navbar">
    <div class="navbar-dalam">
      <a href="/" class="merek"><span aria-hidden="true">🏠</span> KosKu</a>
      ${nav}
    </div>
  </header>

  <main class="wadah">
${body}
  </main>

  <footer class="kaki">Sistem Manajemen Kos · Dibuat dengan Node.js, Express &amp; SQLite</footer>

  <script src="/app.js"></script>
</body>
</html>`;
}

/** Kartu statistik untuk dashboard. */
function kartuStatistik({ label, nilai, warna = '', ikon = '' }) {
  return `<div class="kartu-statistik ${warna}">
    <span class="statistik-ikon" aria-hidden="true">${ikon}</span>
    <div><strong>${esc(nilai)}</strong><span>${esc(label)}</span></div>
  </div>`;
}

/** Tampilan kosong yang mengajak bertindak. */
function kosong({ pesan, aksiHtml = '' }) {
  return `<div class="kosong">
    <span class="kosong-ikon" aria-hidden="true">🗂️</span>
    <p>${esc(pesan)}</p>
    ${aksiHtml}
  </div>`;
}

module.exports = { esc, rupiah, tanggalIndo, badgeKamar, layout, kartuStatistik, kosong };
