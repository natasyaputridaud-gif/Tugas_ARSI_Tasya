'use strict';

/* ---------------- Tema terang / gelap ---------------- */

const ROOT = document.documentElement;
const TEMA_KEY = 'tema-kos';

function terapkanTema(tema) {
  ROOT.dataset.theme = tema;
  const tombol = document.getElementById('tombol-tema');
  if (tombol) {
    tombol.textContent = tema === 'gelap' ? '☀️' : '🌙';
    tombol.setAttribute('aria-label', tema === 'gelap' ? 'Ganti ke mode terang' : 'Ganti ke mode gelap');
  }
}

const tersimpan = localStorage.getItem(TEMA_KEY);
terapkanTema(tersimpan || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'gelap' : 'terang'));

document.addEventListener('click', (e) => {
  if (e.target.closest('#tombol-tema')) {
    const baru = ROOT.dataset.theme === 'gelap' ? 'terang' : 'gelap';
    localStorage.setItem(TEMA_KEY, baru);
    terapkanTema(baru);
  }
});

/* ---------------- Modal ---------------- */

function bukaModal(modal) {
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  const fokus = modal.querySelector('input:not([type=hidden]), select, textarea, button');
  if (fokus) fokus.focus();
}

function tutupModal(modal) {
  modal.hidden = true;
  document.body.style.overflow = '';
  const error = modal.querySelector('[data-pesanan-error]');
  if (error) {
    error.hidden = true;
    error.textContent = '';
  }
}

function semuaModal() {
  return Array.from(document.querySelectorAll('.modal-latar'));
}

document.addEventListener('click', (e) => {
  const pembuka = e.target.closest('[data-buka]');
  if (pembuka) {
    const modal = document.getElementById(pembuka.dataset.buka);
    if (modal) {
      if (typeof siapkanModal === 'function') siapkanModal(modal, null);
      bukaModal(modal);
    }
    return;
  }

  if (e.target.closest('[data-tutup]')) {
    const modal = e.target.closest('.modal-latar');
    if (modal) tutupModal(modal);
    return;
  }

  if (e.target.classList.contains('modal-latar')) tutupModal(e.target);
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  semuaModal().filter((m) => !m.hidden).forEach(tutupModal);
});

/* ---------------- Toast ---------------- */

function tampilkanToast(pesan, jenis = 'sukses') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${jenis}`;
  toast.setAttribute('role', 'status');
  toast.textContent = pesan;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('aktif'));
  setTimeout(() => {
    toast.classList.remove('aktif');
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

const toastTersimpan = sessionStorage.getItem('toast-sukses');
if (toastTersimpan) {
  sessionStorage.removeItem('toast-sukses');
  tampilkanToast(toastTersimpan);
}

/* ---------------- Konfirmasi ---------------- */

let aksiKonfirmasi = null;

function konfirmasi(pesan) {
  return new Promise((resolve) => {
    const modal = document.getElementById('modal-konfirmasi');
    if (!modal) return resolve(window.confirm(pesan));
    modal.querySelector('[data-pesan-konfirmasi]').textContent = pesan;
    aksiKonfirmasi = resolve;
    bukaModal(modal);
  });
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('[data-konfirmasi-ya]')) return;
  const modal = document.getElementById('modal-konfirmasi');
  tutupModal(modal);
  if (aksiKonfirmasi) {
    aksiKonfirmasi(true);
    aksiKonfirmasi = null;
  }
});

/* ---------------- Helper API ---------------- */

async function kirimApi(url, { method = 'POST', body = null } = {}) {
  const opsi = { method, headers: {} };
  if (body) {
    opsi.headers['Content-Type'] = 'application/json';
    opsi.body = JSON.stringify(body);
  }
  const res = await fetch(url, opsi);
  let data;
  try {
    data = await res.json();
  } catch {
    data = { ok: false, pesan: 'Terjadi kesalahan server.' };
  }
  if (res.status === 401) {
    window.location.href = '/login?pesan=' + encodeURIComponent('Sesi berakhir. Silakan login ulang.');
    throw new Error('unauthorized');
  }
  return data;
}

function tampilkanError(form, pesan) {
  const box = form.querySelector('[data-pesanan-error]');
  if (!box) return;
  box.textContent = pesan;
  box.hidden = false;
}

function siapkanModal(modal, data) {
  const form = modal.querySelector('[data-form-modal]');
  if (!form) return;
  form.reset();
  const error = form.querySelector('[data-pesanan-error]');
  if (error) error.hidden = true;

  const judul = modal.querySelector('h2');
  const idInput = form.querySelector('input[name=id]');

  if (modal.id === 'modal-kamar') {
    idInput.value = data ? data.id : '';
    if (judul) judul.textContent = data ? `Ubah kamar ${data.nomor}` : 'Tambah kamar';
    if (data) {
      form.elements.nomor.value = data.nomor;
      form.elements.tipe.value = data.tipe;
      form.elements.harga.value = data.harga;
      form.elements.fasilitas.value = data.fasilitas;
    }
  }

  if (modal.id === 'modal-penghuni') {
    idInput.value = data ? data.id : '';
    if (judul) judul.textContent = data ? `Ubah penghuni` : 'Tambah penghuni';

    const password = form.elements.password;
    const catatan = form.querySelector('[data-catatan-password]');
    const tandaWajib = form.querySelector('[data-wajib-password]');
    password.required = !data;
    if (catatan) catatan.textContent = data ? '(kosongkan jika tidak diganti)' : '';
    if (tandaWajib) tandaWajib.hidden = !!data;

    if (data) {
      form.elements.nama.value = data.nama;
      form.elements.telepon.value = data.telepon;
      form.elements.tanggal_masuk.value = String(data.tanggal_masuk || '').slice(0, 10);
      form.elements.username.value = data.username;

      const select = form.elements.room_id;
      const sudahAda = Array.from(select.options).some((o) => o.value === String(data.room_id ?? ''));
      if (data.room_id && !sudahAda) {
        const opsi = document.createElement('option');
        opsi.value = data.room_id;
        opsi.textContent = `${data.nomor} — ${data.tipe}`;
        opsi.selected = true;
        select.appendChild(opsi);
      } else {
        select.value = data.room_id ? String(data.room_id) : '';
      }
    }
  }
}

/* ---------------- Buka modal dari baris tabel ---------------- */

document.addEventListener('click', (e) => {
  const tombolEditKamar = e.target.closest('[data-edit-kamar]');
  if (tombolEditKamar) {
    const tr = tombolEditKamar.closest('tr');
    const modal = document.getElementById('modal-kamar');
    siapkanModal(modal, {
      id: tr.dataset.id,
      nomor: tr.dataset.nomor,
      tipe: tr.dataset.tipe,
      harga: tr.dataset.harga,
      fasilitas: tr.dataset.fasilitas,
    });
    bukaModal(modal);
    return;
  }

  const tombolEditPenghuni = e.target.closest('[data-edit-penghuni]');
  if (tombolEditPenghuni) {
    const tr = tombolEditPenghuni.closest('tr');
    const modal = document.getElementById('modal-penghuni');
    siapkanModal(modal, JSON.parse(tr.dataset.penghuni));
    bukaModal(modal);
  }
});

/* ---------------- Submit form modal ---------------- */

document.addEventListener('submit', async (e) => {
  const form = e.target.closest('[data-form-modal]');
  if (!form) return;
  e.preventDefault();

  const modal = form.closest('.modal-latar');
  const nilai = Object.fromEntries(new FormData(form).entries());
  const tombolSimpan = form.querySelector('button[type=submit]');
  tombolSimpan.disabled = true;

  try {
    let url;
    let method = 'POST';
    if (modal.id === 'modal-kamar') {
      url = nilai.id ? `/api/kamar/${nilai.id}` : '/api/kamar';
      method = nilai.id ? 'PUT' : 'POST';
    } else {
      url = nilai.id ? `/api/penghuni/${nilai.id}` : '/api/penghuni';
      method = nilai.id ? 'PUT' : 'POST';
    }

    const hasil = await kirimApi(url, { method, body: nilai });
    if (!hasil.ok) {
      tampilkanError(form, hasil.pesan || 'Data gagal disimpan.');
      return;
    }
    sessionStorage.setItem('toast-sukses', hasil.pesan);
    tutupModal(modal);
    window.location.reload();
  } catch (err) {
    if (err.message !== 'unauthorized') tampilkanError(form, 'Terjadi kesalahan. Coba lagi.');
  } finally {
    tombolSimpan.disabled = false;
  }
});

/* ---------------- Aksi hapus & keluarkan ---------------- */

document.addEventListener('click', async (e) => {
  const hapusKamar = e.target.closest('[data-hapus-kamar]');
  if (hapusKamar) {
    const tr = hapusKamar.closest('tr');
    const setuju = await konfirmasi(`Hapus kamar ${tr.dataset.nomor}? Tindakan ini tidak bisa dibatalkan.`);
    if (!setuju) return;
    const hasil = await kirimApi(`/api/kamar/${tr.dataset.id}`, { method: 'DELETE' });
    if (hasil.ok) sessionStorage.setItem('toast-sukses', hasil.pesan);
    else tampilkanToast(hasil.pesan, 'galat');
    window.location.reload();
    return;
  }

  const keluarkan = e.target.closest('[data-keluarkan]');
  if (keluarkan) {
    const data = JSON.parse(keluarkan.closest('tr').dataset.penghuni);
    const setuju = await konfirmasi(
      `Keluarkan ${data.nama} dari kamar? Kamar akan kembali kosong dan akun penghuni tetap ada.`
    );
    if (!setuju) return;
    const hasil = await kirimApi(`/api/penghuni/${data.id}/keluarkan`, { method: 'POST' });
    if (hasil.ok) sessionStorage.setItem('toast-sukses', hasil.pesan);
    else tampilkanToast(hasil.pesan, 'galat');
    window.location.reload();
    return;
  }

  const hapusPenghuni = e.target.closest('[data-hapus-penghuni]');
  if (hapusPenghuni) {
    const data = JSON.parse(hapusPenghuni.closest('tr').dataset.penghuni);
    const setuju = await konfirmasi(
      `Hapus penghuni ${data.nama} beserta akun loginnya? Tindakan ini tidak bisa dibatalkan.`
    );
    if (!setuju) return;
    const hasil = await kirimApi(`/api/penghuni/${data.id}`, { method: 'DELETE' });
    if (hasil.ok) sessionStorage.setItem('toast-sukses', hasil.pesan);
    else tampilkanToast(hasil.pesan, 'galat');
    window.location.reload();
  }
});
