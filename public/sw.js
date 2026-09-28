// Service worker Lema. Satu tugas: membuat buku yang sudah diunduh bisa dibaca
// tanpa koneksi.
//
// ================= BACA INI SEBELUM MENGUBAH APA PUN =================
//
// Service worker adalah satu satunya bagian Lema yang bisa merusak situs yang
// sudah hidup dengan cara yang sulit dipulihkan. Kalau ia menyimpan HTML lama
// lalu menyajikannya terus, pengguna terjebak di versi lama walaupun perbaikan
// sudah di-deploy, dan mereka tidak punya cara membersihkannya sendiri.
//
// Empat pagar di bawah ini yang membuat hal itu tidak bisa terjadi. Jangan
// dilepas tanpa mengganti dengan pagar lain yang setara.
//
// PAGAR 1. Halaman selalu diambil dari jaringan dulu.
//   Selama ada koneksi, pengguna SELALU mendapat HTML terbaru. Simpanan cuma
//   dipakai ketika jaringannya benar benar tidak ada. Inilah pagar utamanya:
//   tidak ada jalan bagi pengguna daring untuk terjebak di versi lama.
//
// PAGAR 2. Yang disimpan duluan cuma berkas dengan nama ber-hash.
//   /_next/static/ memuat hash isi di dalam namanya, jadi berkas dengan nama
//   yang sama tidak pernah berubah isinya. Menyimpannya selamanya aman.
//
// PAGAR 3. Katalog dan daftar bab juga jaringan dulu.
//   Kalau teks buku diperbaiki dan disusun ulang, nama berkasnya tetap sama.
//   Dengan katalog yang selalu segar, pengguna setidaknya melihat perubahan
//   jumlah bab atau judul, dan bisa mengunduh ulang.
//
// PAGAR 4. Ada tombol lepas di layar Cadangan.
//   Kalau semua di atas ternyata masih kurang, pengguna bisa melepas service
//   worker ini sendiri tanpa perlu tahu cara membuka alat pengembang.
//
// =====================================================================

// Versi simpanan. Dinaikkan kalau aturan di bawah berubah, supaya simpanan lama
// dibuang saat pemasangan berikutnya.
const APP = 'lema-app-v1';
const BUKU = 'lema-buku-v1';
const MILIK_KITA = new Set([APP, BUKU]);

self.addEventListener('install', (event) => {
  // Langsung menggantikan versi lama. Tanpa ini, service worker baru menunggu
  // semua tab lama ditutup, dan perbaikan bisa tertunda berhari hari.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const nama of await caches.keys()) {
      if (!MILIK_KITA.has(nama)) await caches.delete(nama);
    }
    await self.clients.claim();
  })());
});

// Sedang melepas diri. Sejak saat itu, semua permintaan dilewatkan apa adanya.
//
// Tanpa penanda ini, melepas diri tidak pernah benar benar bersih: langkah
// terakhirnya memuat ulang halaman, dan pemuatan ulang itu masih melewati
// penangan di bawah, yang lalu membuat simpanan baru berisi halaman yang baru
// saja diambil. Simpanan yang sudah dihapus pun muncul lagi.
let melepas = false;

// Perintah dari halaman: mengunduh satu buku, menghapusnya, atau melepas diri.
self.addEventListener('message', (event) => {
  const { type, payload } = event.data ?? {};
  if (type === 'unduh-buku') event.waitUntil(unduhBuku(payload, event.source));
  if (type === 'hapus-buku') event.waitUntil(hapusBuku(payload, event.source));
  if (type === 'lepas') {
    melepas = true;
    event.waitUntil(lepasDiri());
  }
});

async function lepasDiri() {
  for (const nama of await caches.keys()) await caches.delete(nama);
  await self.registration.unregister();
  for (const client of await self.clients.matchAll()) client.navigate(client.url);
}

async function unduhBuku({ slug, bab }, pengirim) {
  const cache = await caches.open(BUKU);
  const alamat = [
    `/pustaka/${slug}/buku.json`,
    ...Array.from({ length: bab }, (_, i) => `/pustaka/${slug}/${i + 1}.json`),
  ];

  let selesai = 0;
  for (const url of alamat) {
    try {
      const res = await fetch(url, { cache: 'reload' });
      if (res.ok) await cache.put(url, res.clone());
    } catch {
      // Satu bab gagal tidak membatalkan sisanya. Yang sudah masuk tetap
      // berguna, dan pengguna bisa mengunduh ulang untuk melengkapi.
    }
    selesai += 1;
    pengirim?.postMessage({ type: 'unduh-maju', slug, selesai, total: alamat.length });
  }
  pengirim?.postMessage({ type: 'unduh-selesai', slug });
}

async function hapusBuku({ slug }, pengirim) {
  const cache = await caches.open(BUKU);
  for (const req of await cache.keys()) {
    if (new URL(req.url).pathname.startsWith(`/pustaka/${slug}/`)) await cache.delete(req);
  }
  pengirim?.postMessage({ type: 'hapus-selesai', slug });
}

const isiBab = (path) => /^\/pustaka\/[^/]+\/\d+\.json$/.test(path);

self.addEventListener('fetch', (event) => {
  if (melepas) return;

  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // API tidak pernah disentuh. Jawaban model selalu baru, dan menyimpannya
  // berarti menyajikan makna lama untuk kata yang berbeda.
  if (url.pathname.startsWith('/api/')) return;

  // PAGAR 3: isi bab boleh dari simpanan dulu, katalog dan daftar bab tidak.
  if (isiBab(url.pathname)) {
    event.respondWith(simpananDulu(req, BUKU));
    return;
  }

  // PAGAR 2: berkas ber-hash, isinya tidak pernah berubah.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(simpananDulu(req, APP));
    return;
  }

  // PAGAR 1: semua sisanya, termasuk halaman, jaringan dulu.
  event.respondWith(jaringanDulu(req));
});

async function simpananDulu(req, namaCache) {
  const cache = await caches.open(namaCache);
  const tersimpan = await cache.match(req);
  if (tersimpan) return tersimpan;

  const res = await fetch(req);
  if (res.ok) await cache.put(req, res.clone());
  return res;
}

async function jaringanDulu(req) {
  try {
    const res = await fetch(req);
    // Hanya halaman dan berkas pustaka kecil yang disimpan sebagai cadangan
    // saat luring. Sisanya dilewatkan begitu saja.
    if (res.ok && (req.mode === 'navigate' || new URL(req.url).pathname.startsWith('/pustaka/'))) {
      const cache = await caches.open(APP);
      await cache.put(req, res.clone());
    }
    return res;
  } catch (err) {
    const tersimpan = await caches.match(req);
    if (tersimpan) return tersimpan;
    // Halaman yang belum pernah dibuka saat daring memang tidak ada
    // cadangannya. Jawab dengan halaman yang menjelaskan, bukan galat mentah.
    if (req.mode === 'navigate') {
      return new Response(HALAMAN_LURING, {
        status: 503,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });
    }
    throw err;
  }
}

const HALAMAN_LURING = `<!doctype html>
<html lang="id"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Lema sedang luring</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; min-height: 100svh; display: grid; place-items: center;
    background: #f1efe9; color: #26241f; padding: 24px;
    font: 16px/1.6 system-ui, -apple-system, "Segoe UI", sans-serif; }
  @media (prefers-color-scheme: dark) { body { background: #121110; color: #eceae4; } }
  main { max-width: 22rem; text-align: center; }
  h1 { font-size: 1.35rem; margin: 0 0 .5rem; }
  p { margin: 0 0 1.25rem; opacity: .75; }
  a { display: inline-block; padding: .7rem 1.2rem; border-radius: .8rem;
    background: #26241f; color: #f1efe9; text-decoration: none; font-weight: 600; }
  @media (prefers-color-scheme: dark) { a { background: #eceae4; color: #121110; } }
</style></head>
<body><main>
  <h1>Lagi nggak ada koneksi</h1>
  <p>Halaman ini belum pernah kamu buka, jadi belum tersimpan. Buku yang sudah kamu unduh tetap bisa dibaca.</p>
  <a href="/pustaka">Buka pustaka</a>
</main></body></html>`;
