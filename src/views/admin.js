'use strict';

const { esc, rupiah, tanggalIndo, badgeKamar, layout, kartuStatistik, kosong } = require('./layout');

/* ---------------- Dashboard ---------------- */

function halamanDashboard({ user, stats, kamarKosong }) {
  const daftarKosong = kamarKosong.length
    ? `<div class="kartu">
        <h2 class="kartu-judul">Kamar kosong</h2>
        <ul class="chip-wrap">
          ${kamarKosong
            .map(
              (r) =>
                `<li class="chip"><strong>${esc(r.nomor)}</strong> · ${esc(r.tipe)} · ${rupiah(r.harga)}</li>`
            )
            .join('')}
        </ul>
        <p class="teks-bantu">Tambahkan penghuni baru untuk kamar di atas lewat menu <a href="/admin/penghuni">Penghuni</a>.</p>
      </div>`
    : `<div class="kartu"><h2 class="kartu-judul">Kamar kosong</h2>
        ${kosong({ pesan: 'Semua kamar sudah terisi. Hebat!' })}</div>`;

  const body = `
  <div class="kepala-halaman">
    <div>
      <h1>Dashboard</h1>
      <p class="teks-bantu">Ringkasan kos Anda saat ini.</p>
    </div>
  </div>

  <div class="grid-statistik">
    ${kartuStatistik({ label: 'Total kamar', nilai: stats.total, ikon: '🚪', warna: 'netral' })}
    ${kartuStatistik({ label: 'Kamar terisi', nilai: stats.terisi, ikon: '🛏️', warna: 'positif' })}
    ${kartuStatistik({ label: 'Kamar kosong', nilai: stats.kosong, ikon: '🔑', warna: 'aksen' })}
  </div>

  ${daftarKosong}

  <div class="kartu">
    <h2 class="kartu-judul">Langkah cepat</h2>
    <div class="aksi-cepat">
      <a class="tombol tombol-utama" href="/admin/kamar">Kelola kamar</a>
      <a class="tombol tombol-sekunder" href="/admin/penghuni">Kelola penghuni</a>
    </div>
  </div>`;

  return layout({ title: 'Dashboard', user, active: 'dashboard', body });
}

function modalKonfirmasiMarkup() {
  return `<div class="modal-latar" id="modal-konfirmasi" hidden>
    <div class="modal modal-kecil" role="alertdialog" aria-modal="true" aria-labelledby="modal-konfirmasi-judul">
      <div class="modal-kepala">
        <h2 id="modal-konfirmasi-judul">Konfirmasi</h2>
        <button type="button" class="tombol-ikon modal-tutup" data-tutup aria-label="Tutup">✕</button>
      </div>
      <div class="modal-isi">
        <p data-pesan-konfirmasi>Yakin melanjutkan?</p>
        <div class="modal-aksi">
          <button type="button" class="tombol tombol-sekunder" data-tutup>Batal</button>
          <button type="button" class="tombol tombol-bahaya" data-konfirmasi-ya>Ya, lanjutkan</button>
        </div>
      </div>
    </div>
  </div>`;
}

/* ---------------- Modal (dipakai di kamar & penghuni) ---------------- */

function modal({ id, judul, isi, aksiSimpanLabel = 'Simpan' }) {
  return `<div class="modal-latar" id="${esc(id)}" hidden>
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="${esc(id)}-judul">
      <div class="modal-kepala">
        <h2 id="${esc(id)}-judul">${esc(judul)}</h2>
        <button type="button" class="tombol-ikon modal-tutup" data-tutup aria-label="Tutup">✕</button>
      </div>
      <form class="modal-isi" data-form-modal novalidate>
        <div class="pesanan-error" data-pesanan-error hidden></div>
        ${isi}
        <div class="modal-aksi">
          <button type="button" class="tombol tombol-sekunder" data-tutup>Batal</button>
          <button type="submit" class="tombol tombol-utama">${esc(aksiSimpanLabel)}</button>
        </div>
      </form>
    </div>
  </div>`;
}

/* ---------------- Kelola kamar ---------------- */

function halamanKamar({ user, kamar }) {
  const baris = kamar
    .map(
      (r) => `<tr
        data-id="${r.id}"
        data-nomor="${esc(r.nomor)}"
        data-tipe="${esc(r.tipe)}"
        data-harga="${r.harga}"
        data-fasilitas="${esc(r.fasilitas)}">
        <td data-label="Nomor"><strong>${esc(r.nomor)}</strong></td>
        <td data-label="Tipe">${esc(r.tipe)}</td>
        <td data-label="Harga / bulan">${rupiah(r.harga)}</td>
        <td data-label="Fasilitas">${esc(r.fasilitas) || '<span class="teks-redup">-</span>'}</td>
        <td data-label="Status">${badgeKamar(r.status)}</td>
        <td data-label="Aksi" class="kolom-aksi">
          <button type="button" class="tombol tombol-kecil tombol-sekunder" data-edit-kamar>Ubah</button>
          <button type="button" class="tombol tombol-kecil tombol-bahaya" data-hapus-kamar>Hapus</button>
        </td>
      </tr>`
    )
    .join('');

  const tabel = kamar.length
    ? `<div class="kartu kartu-tanpa-padat">
        <div class="tabel-bungkus">
          <table class="tabel">
            <thead>
              <tr>
                <th>Nomor</th><th>Tipe</th><th>Harga / bulan</th><th>Fasilitas</th><th>Status</th><th>Aksi</th>
              </tr>
            </thead>
            <tbody>${baris}</tbody>
          </table>
        </div>
      </div>`
    : kosong({
        pesan: 'Belum ada kamar. Tambahkan kamar pertama.',
        aksiHtml:
          '<button type="button" class="tombol tombol-utama" data-buka="modal-kamar">Tambah kamar pertama</button>',
      });

  const modalKamar = modal({
    id: 'modal-kamar',
    judul: 'Tambah kamar',
    isi: `
      <input type="hidden" name="id">
      <label class="isian"><span>Nomor kamar <b class="wajib">*</b></span>
        <input name="nomor" required maxlength="20" placeholder="cth. A1"></label>
      <label class="isian"><span>Tipe <b class="wajib">*</b></span>
        <input name="tipe" required list="daftar-tipe" placeholder="cth. Standar">
        <datalist id="daftar-tipe">
          <option value="Standar"><option value="AC"><option value="Deluxe"><option value="Suite">
        </datalist></label>
      <label class="isian"><span>Harga per bulan (Rp) <b class="wajib">*</b></span>
        <input name="harga" type="number" min="0" step="10000" required placeholder="cth. 900000"></label>
      <label class="isian"><span>Fasilitas</span>
        <textarea name="fasilitas" rows="3" placeholder="cth. Kasur, Lemari, Kipas angin"></textarea></label>`,
  });

  const modalKonfirmasi = modalKonfirmasiMarkup();

  const body = `
  <div class="kepala-halaman">
    <div>
      <h1>Kelola kamar</h1>
      <p class="teks-bantu">Status kamar dihitung otomatis dari data penghuni.</p>
    </div>
    <button type="button" class="tombol tombol-utama" data-buka="modal-kamar">+ Tambah kamar</button>
  </div>

  ${tabel}
  ${modalKamar}
  ${modalKonfirmasi}`;

  return layout({ title: 'Kelola kamar', user, active: 'kamar', body });
}

/* ---------------- Kelola penghuni ---------------- */

function opsiKamar(kamarKosong, terpilih = null) {
  const daftar = kamarKosong
    .map(
      (r) =>
        `<option value="${r.id}"${String(terpilih) === String(r.id) ? ' selected' : ''}>${esc(r.nomor)} — ${esc(
          r.tipe
        )} (${rupiah(r.harga)})</option>`
    )
    .join('');
  return `<option value=""${terpilih ? '' : ' selected'}>— Belum ditempatkan —</option>${daftar}`;
}

function halamanPenghuni({ user, penghuni, kamarKosong }) {
  const baris = penghuni
    .map((t) => {
      const json = esc(
        JSON.stringify({
          id: t.id,
          nama: t.nama,
          telepon: t.telepon,
          tanggal_masuk: t.tanggal_masuk,
          username: t.username,
          room_id: t.room_id,
          nomor: t.nomor || '',
          tipe: t.tipe || '',
        })
      );

      return `<tr data-penghuni='${json}'>
        <td data-label="Nama"><strong>${esc(t.nama)}</strong></td>
        <td data-label="Telepon">${esc(t.telepon) || '<span class="teks-redup">-</span>'}</td>
        <td data-label="Username">${esc(t.username)}</td>
        <td data-label="Masuk">${tanggalIndo(t.tanggal_masuk)}</td>
        <td data-label="Kamar">${
          t.room_id
            ? `<strong>${esc(t.nomor)}</strong> <span class="teks-redup">(${esc(t.tipe)})</span>`
            : '<span class="badge badge-kosong">Tanpa kamar</span>'
        }</td>
        <td data-label="Aksi" class="kolom-aksi">
          <button type="button" class="tombol tombol-kecil tombol-sekunder" data-edit-penghuni>Ubah</button>
          ${
            t.room_id
              ? `<button type="button" class="tombol tombol-kecil tombol-peringatan" data-keluarkan>Keluarkan</button>`
              : ''
          }
          <button type="button" class="tombol tombol-kecil tombol-bahaya" data-hapus-penghuni>Hapus</button>
        </td>
      </tr>`;
    })
    .join('');

  const tabel = penghuni.length
    ? `<div class="kartu kartu-tanpa-padat">
        <div class="tabel-bungkus">
          <table class="tabel">
            <thead>
              <tr><th>Nama</th><th>Telepon</th><th>Username</th><th>Tanggal masuk</th><th>Kamar</th><th>Aksi</th></tr>
            </thead>
            <tbody>${baris}</tbody>
          </table>
        </div>
      </div>`
    : kosong({
        pesan: 'Belum ada penghuni. Tambahkan penghuni pertama.',
        aksiHtml:
          '<button type="button" class="tombol tombol-utama" data-buka="modal-penghuni">Tambah penghuni pertama</button>',
      });

  const modalPenghuni = modal({
    id: 'modal-penghuni',
    judul: 'Tambah penghuni',
    isi: `
      <input type="hidden" name="id">
      <label class="isian"><span>Nama lengkap <b class="wajib">*</b></span>
        <input name="nama" required maxlength="100" placeholder="cth. Budi Santoso"></label>
      <label class="isian"><span>Nomor telepon <b class="wajib">*</b></span>
        <input name="telepon" required maxlength="30" placeholder="cth. 081234567890"></label>
      <label class="isian"><span>Tanggal masuk <b class="wajib">*</b></span>
        <input name="tanggal_masuk" type="date" required></label>
      <div class="isian-ganda">
        <label class="isian"><span>Username <b class="wajib">*</b></span>
          <input name="username" required maxlength="50" placeholder="cth. budi"></label>
        <label class="isian"><span>Password <b class="wajib" data-wajib-password>*</b> <span class="teks-redup" data-catatan-password></span></span>
          <input name="password" type="password" autocomplete="new-password" placeholder="minimal 6 karakter"></label>
      </div>
      <label class="isian"><span>Kamar yang ditempati</span>
        <select name="room_id" data-kamar-select>${opsiKamar(kamarKosong)}</select>
        <small class="teks-bantu">Hanya kamar kosong yang ditampilkan.</small></label>`,
  });

  const body = `
  <div class="kepala-halaman">
    <div>
      <h1>Kelola penghuni</h1>
      <p class="teks-bantu">Satu kamar hanya boleh ditempati satu penghuni.</p>
    </div>
    <button type="button" class="tombol tombol-utama" data-buka="modal-penghuni">+ Tambah penghuni</button>
  </div>

  ${tabel}
  ${modalPenghuni}

  ${modalKonfirmasiMarkup()}`;

  return layout({ title: 'Kelola penghuni', user, active: 'penghuni', body });
}

module.exports = { halamanDashboard, halamanKamar, halamanPenghuni };
