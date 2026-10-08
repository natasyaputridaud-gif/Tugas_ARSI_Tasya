'use strict';

/**
 * Uji asap end-to-end. Jalankan dengan server aktif:
 *   npm start   (terminal 1)
 *   npm test    (terminal 2)
 */

const BASE = process.env.BASE_URL || 'http://localhost:3000';

let lulus = 0;
const gagal = [];

/** Balikkan entitas HTML pada atribut sebelum dibaca sebagai JSON. */
function dekodeAtribut(teks) {
  return String(teks)
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function cek(nama, kondisi, detail = '') {
  if (kondisi) {
    lulus += 1;
    console.log(`  ✓ ${nama}`);
  } else {
    gagal.push(nama);
    console.log(`  ✗ ${nama}${detail ? ` — ${detail}` : ''}`);
  }
}

/** Klien mini dengan cookie jar. */
function buatKlien() {
  const cookie = new Map();
  async function minta(method, path, { body = null, form = null, json = false } = {}) {
    const headers = {};
    if (cookie.size) headers.Cookie = Array.from(cookie.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
    let payload;
    if (json) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    } else if (form) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      payload = new URLSearchParams(form).toString();
    }
    const res = await fetch(BASE + path, { method, headers, body: payload, redirect: 'manual' });
    for (const sertifikasi of res.headers.getSetCookie?.() || []) {
      const [pasangan] = sertifikasi.split(';');
      const idx = pasangan.indexOf('=');
      const kunci = pasangan.slice(0, idx).trim();
      const nilai = pasangan.slice(idx + 1).trim();
      if (nilai === '' || sertifikasi.includes('Max-Age=0')) cookie.delete(kunci);
      else cookie.set(kunci, nilai);
    }
    const teks = await res.text();
    return { status: res.status, teks, lokasi: res.headers.get('location') };
  }
  return {
    get: (p) => minta('GET', p),
    login: (username, password) => minta('POST', '/login', { form: { username, password } }),
    post: (p, body) => minta('POST', p, { body, json: true }),
    put: (p, body) => minta('PUT', p, { body, json: true }),
    del: (p) => minta('DELETE', p),
    logout: () => minta('POST', '/logout', { form: {} }),
  };
}

async function main() {
  const tamu = buatKlien();

  console.log('\n[Tamu / autentikasi]');
  const beranda = await tamu.get('/');
  cek('Beranda mengarah ke /login', beranda.status === 302 && beranda.lokasi === '/login');

  const halLogin = await tamu.get('/login');
  cek('Halaman login tampil', halLogin.status === 200 && halLogin.teks.includes('Sistem Manajemen Kos'));

  const salah = await tamu.login('admin', 'salah');
  cek(
    'Login salah ditolak',
    salah.status === 401 && salah.teks.includes('Username atau password salah.')
  );

  const takDikenal = await tamu.login('tidakada', 'x');
  cek('Username tak dikenal ditolak', takDikenal.status === 401);

  /* -------- Pemilik -------- */
  const pemilik = buatKlien();
  console.log('\n[Pemilik]');
  const masukPemilik = await pemilik.login('admin', 'admin123');
  cek('Login pemilik sukses', masukPemilik.status === 302 && masukPemilik.lokasi === '/admin');

  // Bersihkan sisa data uji dari percobaan sebelumnya (biar ulangan selalu start dari data contoh).
  const halPenghuniAwal = await pemilik.get('/admin/penghuni');
  const sisaPenghuni = [...halPenghuniAwal.teks.matchAll(/data-penghuni='([^']+)'/g)]
    .map((m) => JSON.parse(dekodeAtribut(m[1])))
    .filter((t) => t.username !== 'budi');
  for (const t of sisaPenghuni) await pemilik.del(`/api/penghuni/${t.id}`);

  const halKamarAwal = await pemilik.get('/admin/kamar');
  const sisaKamar = [...halKamarAwal.teks.matchAll(/data-id="(\d+)"\s+data-nomor="([^"]+)"/g)]
    .map((m) => ({ id: Number(m[1]), nomor: dekodeAtribut(m[2]) }))
    .filter((r) => !['A1', 'A2', 'B1', 'B2'].includes(r.nomor));
  for (const r of sisaKamar) await pemilik.del(`/api/kamar/${r.id}`);
  console.log(
    `  (info) sisa data uji dibersihkan: ${sisaPenghuni.length} penghuni, ${sisaKamar.length} kamar`
  );

  const dash = await pemilik.get('/admin');
  const dashRata = dash.teks.replace(/\s+/g, ' ');
  cek('Dashboard terbuka', dash.status === 200);
  cek('Dashboard menampilkan 3 ringkasan', /Total kamar/.test(dash.teks) && /Kamar terisi/.test(dash.teks) && /Kamar kosong/.test(dash.teks));
  cek('Dashboard hitung 4 kamar', dashRata.includes('<strong>4</strong><span>Total kamar</span>'));

  const halKamar = await pemilik.get('/admin/kamar');
  cek('Halaman kamar terbuka', halKamar.status === 200);
  cek('Kamar A1..B2 ada', ['A1', 'A2', 'B1', 'B2'].every((n) => halKamar.teks.includes(`>${n}<`)));
  cek('Status kamar memakai badge', halKamar.teks.includes('badge-terisi') && halKamar.teks.includes('badge-kosong'));

  const halPenghuni = await pemilik.get('/admin/penghuni');
  cek('Halaman penghuni terbuka', halPenghuni.status === 200);
  cek('Budi Santoso terdaftar', halPenghuni.teks.includes('Budi Santoso'));

  console.log('\n[Proteksi peran]');
  cek('Pemilik ditolak di halaman penghuni', (await pemilik.get('/penghuni')).status === 403);

  console.log('\n[API kamar]');
  const duplikat = await pemilik.post('/api/kamar', { nomor: 'A1', tipe: 'Standar', harga: 900000, fasilitas: '' });
  cek('Nomor kamar ganda ditolak', duplikat.status === 400 && duplikat.teks.includes('Nomor kamar sudah dipakai.'));

  const kosongTotal = await pemilik.post('/api/kamar', { nomor: '', tipe: '', harga: 'abc' });
  cek('Validasi kosong ditolak', kosongTotal.status === 400 && kosongTotal.teks.includes('Nomor kamar wajib diisi.'));

  const tambah = await pemilik.post('/api/kamar', { nomor: 'C1', tipe: 'Deluxe', harga: 1200000, fasilitas: 'Kasur, AC' });
  cek('Tambah kamar sukses', tambah.status === 200 && tambah.teks.includes('Kamar berhasil ditambahkan.'));

  const halSetelahTambah = await pemilik.get('/admin/kamar');
  const kamarC1 = halSetelahTambah.teks;
  cek('Kamar C1 muncul di tabel', kamarC1.includes('C1'));
  const idC1 = Number(kamarC1.match(/data-id="(\d+)"\s+data-nomor="C1"/)?.[1]);
  cek('Dapat id kamar C1', Number.isFinite(idC1), 'id tidak ditemukan');

  const ubah = await pemilik.put(`/api/kamar/${idC1}`, { nomor: 'C1', tipe: 'Deluxe', harga: 1250000, fasilitas: 'Kasur' });
  cek('Ubah kamar sukses', ubah.status === 200 && ubah.teks.includes('Kamar berhasil diperbarui.'));

  const ubahBentrok = await pemilik.put(`/api/kamar/${idC1}`, { nomor: 'A1', tipe: 'Deluxe', harga: 1, fasilitas: '' });
  cek('Ubah ke nomor terpakai ditolak', ubahBentrok.status === 400 && ubahBentrok.teks.includes('Nomor kamar sudah dipakai.'));

  const hapusTerisi = await pemilik.del('/api/kamar/1');
  cek('Kamar terisi tidak bisa dihapus', hapusTerisi.status === 400 && hapusTerisi.teks.includes('Kamar masih dihuni'));

  const hapusC1 = await pemilik.del(`/api/kamar/${idC1}`);
  cek('Kamar kosong bisa dihapus', hapusC1.status === 200 && hapusC1.teks.includes('Kamar berhasil dihapus.'));

  console.log('\n[API penghuni]');
  const penghuniBaru = await pemilik.post('/api/penghuni', {
    nama: 'Siti Aminah',
    telepon: '08111111111',
    tanggal_masuk: '2025-06-01',
    username: 'siti',
    password: 'siti123',
    room_id: 2, // A2
  });
  cek('Tambah penghuni sukses', penghuniBaru.status === 200 && penghuniBaru.teks.includes('Penghuni berhasil ditambahkan.'));

  const daftarPenghuniHal = (await pemilik.get('/admin/penghuni')).teks;
  const segmenPilih = daftarPenghuniHal.split('data-kamar-select')[1] || '';
  cek('Kamar terisi penghuni tidak ditawarkan', !segmenPilih.includes('value="2"'));
  cek('Kamar kosong ditawarkan', segmenPilih.includes('value="3"'));

  const kamarDipakai = await pemilik.post('/api/penghuni', {
    nama: 'Palsu',
    telepon: '08222',
    tanggal_masuk: '2025-07-01',
    username: 'palsu',
    password: 'palsu123',
    room_id: 2,
  });
  cek('Kamar terisi ditolak', kamarDipakai.status === 400 && kamarDipakai.teks.includes('Kamar sudah terisi penghuni lain.'));

  const usernameGanda = await pemilik.post('/api/penghuni', {
    nama: 'Palsu 2',
    telepon: '08333',
    tanggal_masuk: '2025-07-01',
    username: 'budi',
    password: 'palsu123',
    room_id: '',
  });
  cek('Username ganda ditolak', usernameGanda.status === 400 && usernameGanda.teks.includes('Username sudah dipakai.'));

  const daftarSekarang = await pemilik.get('/admin/penghuni');
  const barisSiti = daftarSekarang.teks.match(/data-penghuni='([^']*Siti[^']*)'/);
  const idSitiSebenarnya = barisSiti ? JSON.parse(dekodeAtribut(barisSiti[1])).id : NaN;
  cek('Dapat id penghuni baru', Number.isFinite(idSitiSebenarnya), 'id tidak ditemukan');

  if (Number.isFinite(idSitiSebenarnya)) {
    const keluarkan = await pemilik.post(`/api/penghuni/${idSitiSebenarnya}/keluarkan`, {});
    cek(
      'Keluarkan penghuni sukses',
      keluarkan.status === 200 && keluarkan.teks.includes('kembali kosong')
    );

    const setelahKosong = (await pemilik.get('/admin/kamar')).teks;
    cek('A2 kembali kosong', setelahKosong.includes('badge-kosong'));

    const hapusPenghuni = await pemilik.del(`/api/penghuni/${idSitiSebenarnya}`);
    cek('Hapus penghuni sukses', hapusPenghuni.status === 200 && hapusPenghuni.teks.includes('Penghuni berhasil dihapus.'));
  }

  const sitiTerkunci = await pemilik.del('/api/penghuni/99999');
  cek('Penghuni tak dikenal → 404', sitiTerkunci.status === 404);

  /* -------- Penghuni -------- */
  console.log('\n[Penghuni]');
  const pengguna = buatKlien();
  const masukPenghuni = await pengguna.login('budi', 'budi123');
  cek('Login penghuni sukses', masukPenghuni.status === 302 && masukPenghuni.lokasi === '/penghuni');

  const dataDiri = await pengguna.get('/penghuni');
  cek('Data diri terbuka', dataDiri.status === 200);
  cek('Data diri memuat nama & username', dataDiri.teks.includes('Budi Santoso') && dataDiri.teks.includes('budi'));
  cek('Data diri tidak bocor ke penghuni lain', !dataDiri.teks.includes('Siti Aminah'));

  const kamarSaya = await pengguna.get('/penghuni/kamar');
  cek('Kamar saya terbuka', kamarSaya.status === 200);
  cek('Kamar saya menampilkan A1 + fasilitas', kamarSaya.teks.includes('A1') && kamarSaya.teks.includes('Kasur'));
  cek('Kamar saya menampilkan harga', kamarSaya.teks.includes('900.000'));

  cek('Penghuni ditolak di dashboard', (await pengguna.get('/admin')).status === 403);
  cek('Penghuni ditolak di halaman kamar', (await pengguna.get('/admin/kamar')).status === 403);
  cek('Penghuni ditolak di API kamar', (await pengguna.post('/api/kamar', { nomor: 'X', tipe: 'Y', harga: 1 })).status === 403);
  cek('Penghuni ditolak di API penghuni', (await pengguna.del('/api/penghuni/1')).status === 403);

  console.log('\n[Penghuni tanpa kamar]');
  const tanpaKamar = await pemilik.post('/api/penghuni', {
    nama: 'Tanpa Kamar',
    telepon: '08999',
    tanggal_masuk: '2025-08-01',
    username: 'tanpa',
    password: 'tanpa123',
    room_id: '',
  });
  cek('Tambah penghuni tanpa kamar sukses', tanpaKamar.status === 200);

  const klienTanpa = buatKlien();
  await klienTanpa.login('tanpa', 'tanpa123');
  const halKamarKosong = await klienTanpa.get('/penghuni/kamar');
  cek(
    'Muncul pesan belum ditempatkan',
    halKamarKosong.teks.includes('Kamu belum ditempatkan di kamar. Hubungi pemilik kos.')
  );
  const halDiriKosong = await klienTanpa.get('/penghuni');
  cek('Data diri menampilkan status tanpa kamar', halDiriKosong.teks.includes('Belum ada kamar'));

  const daftarAkhir = await pemilik.get('/admin/penghuni');
  const barisTanpa = daftarAkhir.teks.match(/data-penghuni='([^']*Tanpa Kamar[^']*)'/);
  const idTanpa = barisTanpa ? JSON.parse(dekodeAtribut(barisTanpa[1])).id : NaN;
  if (Number.isFinite(idTanpa)) {
    await pemilik.del(`/api/penghuni/${idTanpa}`);
    cek('Penghuni tanpa kamar bisa dihapus', !(await pemilik.get('/admin/penghuni')).teks.includes('Tanpa Kamar'));
  } else {
    cek('Dapat id penghuni tanpa kamar', false, 'id tidak ditemukan');
  }

  console.log('\n[Tanpa sesi]');
  const anonim = buatKlien();
  cek('API tanpa sesi → 401', (await anonim.post('/api/kamar', { nomor: 'Z', tipe: 'Y', harga: 1 })).status === 401);
  const halamanAnonim = await anonim.get('/admin');
  cek('Halaman admin tanpa sesi → redirect login', halamanAnonim.status === 302 && halamanAnonim.lokasi.startsWith('/login'));

  console.log('\n[Logout]');
  const keluar = await pemilik.logout();
  cek('Logout mengarah ke /login', keluar.status === 302 && keluar.lokasi === '/login');
  cek('Sesi pemilik hangus setelah logout', (await pemilik.get('/admin')).status === 302);

  console.log('\n[XSS]');
  await pemilik.login('admin', 'admin123'); // sesi dipakai lagi setelah logout di atas
  const xss = await pemilik.post('/api/kamar', { nomor: '<script>alert(1)</script>', tipe: 'X', harga: 1000, fasilitas: '' });
  if (xss.status === 200) {
    const sebelum = await pemilik.get('/admin/kamar');
    const tampil = sebelum.teks;
    cek('Konten berbahaya di-escape', !tampil.includes('<script>alert(1)</script>') && tampil.includes('&lt;script&gt;'));
    const idXss = Number(tampil.match(/data-id="(\d+)"\s+data-nomor="&lt;script&gt;/)?.[1]);
    if (Number.isFinite(idXss)) {
      const hapusXss = await pemilik.del(`/api/kamar/${idXss}`);
      cek('Kamar XSS bisa dibersihkan', hapusXss.status === 200);
    } else {
      cek('Dapat id kamar XSS', false, 'id tidak ditemukan');
    }
  } else {
    cek('Input berbahaya ditolak/di-safe', xss.status === 400);
  }

  console.log(`\n=== Lulus: ${lulus} | Gagal: ${gagal.length} ===`);
  if (gagal.length) {
    console.log('Gagal:', gagal.join(' | '));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Kesalahan uji:', err);
  process.exit(1);
});
