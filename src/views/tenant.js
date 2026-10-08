'use strict';

const { esc, rupiah, tanggalIndo, badgeKamar, layout } = require('./layout');

function halamanDataDiri({ user, tenant }) {
  const baris = tenant
    ? [
        ['Nama lengkap', esc(tenant.nama)],
        ['Nomor telepon', esc(tenant.telepon) || '<span class="teks-redup">-</span>'],
        ['Username', esc(user.username)],
        ['Tanggal mulai menghuni', tanggalIndo(tenant.tanggal_masuk)],
        [
          'Kamar',
          tenant.room_id
            ? `<strong>${esc(tenant.nomor)}</strong> <span class="teks-redup">(${esc(tenant.tipe)})</span>`
            : '<span class="badge badge-kosong">Belum ada kamar</span>',
        ],
      ]
        .map(([label, isi]) => `<div class="baris-detail"><dt>${label}</dt><dd>${isi}</dd></div>`)
        .join('')
    : '';

  const body = `
  <div class="kepala-halaman">
    <div>
      <h1>Data diri</h1>
      <p class="teks-bantu">Informasi akun Anda. Halaman ini hanya bisa dilihat, tidak bisa diubah.</p>
    </div>
  </div>

  ${
    tenant
      ? `<div class="kartu"><dl class="detail">${baris}</dl></div>`
      : `<div class="kartu">
          <div class="kosong">
            <span class="kosong-ikon" aria-hidden="true">👤</span>
            <p>Data diri Anda belum lengkap. Hubungi pemilik kos.</p>
          </div>
        </div>`
  }`;

  return layout({ title: 'Data diri', user, active: 'datadiri', body });
}

function halamanKamarSaya({ user, tenant, kamar }) {
  const isi = !tenant || !kamar
    ? `<div class="kartu">
        <div class="kosong">
          <span class="kosong-ikon" aria-hidden="true">🔑</span>
          <p>Kamu belum ditempatkan di kamar. Hubungi pemilik kos.</p>
        </div>
      </div>`
    : `<div class="kartu kartu-kamar">
        <div class="kamar-kepala">
          <div>
            <span class="kamar-nomor">${esc(kamar.nomor)}</span>
            <span class="badge ${kamar.status === 'terisi' ? 'badge-terisi' : 'badge-kosong'}">${
              kamar.status === 'terisi' ? 'Terisi' : 'Kosong'
            }</span>
          </div>
          <span class="kamar-tipe">${esc(kamar.tipe)}</span>
        </div>
        <p class="kamar-harga">${rupiah(kamar.harga)}<span>/bulan</span></p>
        <div class="kamar-fasilitas">
          <h2>Fasilitas</h2>
          <ul>${kamar.fasilitas
            .split(',')
            .map((f) => f.trim())
            .filter(Boolean)
            .map((f) => `<li>${esc(f)}</li>`)
            .join('')}</ul>
        </div>
        <p class="teks-bantu">Status kamar dihitung otomatis dari data penghuni.</p>
      </div>`;

  const body = `
  <div class="kepala-halaman">
    <div>
      <h1>Kamar saya</h1>
      <p class="teks-bantu">Detail kamar yang kamu tempati.</p>
    </div>
  </div>
  ${isi}
  <div class="kartu">
    <p class="teks-bantu">Ada perubahan data? Hubungi pemilik kos.</p>
  </div>`;

  return layout({ title: 'Kamar saya', user, active: 'kamar', body });
}

module.exports = { halamanDataDiri, halamanKamarSaya };
