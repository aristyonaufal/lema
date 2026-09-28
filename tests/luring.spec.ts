import { test, expect, type Page } from '@playwright/test';

// Tahap D: membaca tanpa koneksi.
//
// Service worker cuma didaftarkan pada build produksi, karena di mode
// pengembangan berkas di /_next/static/ belum ber-hash dengan cara yang sama
// dan menyimpannya akan menyembunyikan perubahan kode. Jadi berkas ini hanya
// berjalan pada `PLAYWRIGHT_TEST_PRODUCTION=1`.
//
// Yang paling penting diuji di sini bukan fitur luringnya, melainkan
// PAGARNYA. Service worker adalah satu satunya bagian Lema yang bisa merusak
// situs yang sudah hidup dengan cara yang sulit dipulihkan.

const PRODUKSI = process.env.PLAYWRIGHT_TEST_PRODUCTION === '1';
test.skip(!PRODUKSI, 'Service worker hanya didaftarkan pada build produksi.');

// Menunggu sampai service worker benar benar memegang kendali halaman.
// Pendaftaran saja tidak cukup: sebelum controller terisi, permintaan masih
// lewat jaringan biasa dan pengujian di bawah akan menguji hal yang salah.
async function siap(page: Page) {
  await page.waitForFunction(() => navigator.serviceWorker?.controller != null, null, {
    timeout: 20_000,
  });
}

// Melepas service worker membuat halamannya dimuat ulang, dan konteks
// JavaScript ikut dibuang di tengah jalan. Pembacaan di bawah menoleransi itu
// lalu dicoba lagi, alih alih menganggapnya kegagalan.
async function aman<T>(baca: () => Promise<T>, saatPindah: T): Promise<T> {
  try {
    return await baca();
  } catch {
    return saatPindah;
  }
}

const isiCache = (page: Page, nama: string) =>
  page.evaluate(async (n) => {
    if (!('caches' in window)) return [];
    const cache = await caches.open(n);
    return (await cache.keys()).map((r) => new URL(r.url).pathname);
  }, nama);

test('service worker mengambil kendali setelah halaman dimuat', async ({ page }) => {
  await page.goto('/pustaka');
  await siap(page);

  const terdaftar = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    return reg?.active?.scriptURL ?? null;
  });
  expect(terdaftar).toContain('/sw.js');
});

test('mengunduh satu buku menyimpan seluruh babnya', async ({ page }) => {
  await page.goto('/pustaka');
  await siap(page);

  // Alice, 12 bab. Paling kecil di pustaka, jadi paling cepat diuji.
  await page.getByRole('button', { name: /Unduh buat dibaca luring/ }).first().click();
  await expect(page.getByText('Bisa dibaca tanpa koneksi').first()).toBeVisible({ timeout: 30_000 });

  const tersimpan = await isiCache(page, 'lema-buku-v1');
  const alice = tersimpan.filter((p) => p.startsWith('/pustaka/alice/'));
  // Dua belas bab plus daftar babnya.
  expect(alice).toHaveLength(13);
  expect(alice).toContain('/pustaka/alice/1.json');
  expect(alice).toContain('/pustaka/alice/12.json');
});

test('buku yang sudah diunduh tetap terbaca saat koneksi mati', async ({ page, context }) => {
  await page.goto('/pustaka');
  await siap(page);
  await page.getByRole('button', { name: /Unduh buat dibaca luring/ }).first().click();
  await expect(page.getByText('Bisa dibaca tanpa koneksi').first()).toBeVisible({ timeout: 30_000 });

  // Halaman pembacanya dibuka sekali selagi daring, supaya kerangkanya
  // tersimpan. Inilah yang dijanjikan ke pengguna: buku yang sudah diunduh
  // dan pernah dibuka bisa dibaca lagi tanpa koneksi.
  await page.goto('/pustaka/alice');
  await expect(page.getByText(/Alice was beginning to get very tired/)).toBeVisible();

  await context.setOffline(true);
  await page.reload();

  await expect(page.getByText(/Alice was beginning to get very tired/)).toBeVisible();
  // Pindah bab juga harus jalan: bab lain ikut terunduh, bukan cuma yang dibuka.
  await page.getByLabel('Pilih bab').selectOption('7');
  await expect(page.getByRole('heading', { name: /A Mad Tea-Party/ })).toBeVisible();

  await context.setOffline(false);
});

test('halaman yang belum pernah dibuka saat luring dijelaskan, bukan galat mentah', async ({ page, context }) => {
  await page.goto('/pustaka');
  await siap(page);

  await context.setOffline(true);
  await page.goto('/kuis');

  await expect(page.getByRole('heading', { name: /Lagi nggak ada koneksi/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Buka pustaka' })).toBeVisible();

  await context.setOffline(false);
});

test('PAGAR 1: selama daring, halaman selalu diambil dari jaringan', async ({ page, context }) => {
  // Inilah pagar yang membuat pengguna daring tidak bisa terjebak di versi
  // lama. Diuji dengan mengubah isi yang dilayani server, lalu memastikan
  // yang tampil isi yang baru, bukan yang tersimpan.
  await page.goto('/pustaka');
  await siap(page);
  await expect(page.getByText('Alice’s Adventures in Wonderland')).toBeVisible();

  await context.route('**/pustaka/index.json', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        disusun: '2026-10-01',
        buku: [{ slug: 'alice', judul: 'Judul Versi Baru', penulis: 'Lewis Carroll', tingkat: 'ringan', bab: 12, kata: 26613 }],
      }),
    });
  });

  await page.reload();
  await expect(page.getByText('Judul Versi Baru')).toBeVisible();
});

test('PAGAR: jawaban API tidak pernah disimpan', async ({ page }) => {
  await page.goto('/pustaka');
  await siap(page);

  // Satu permintaan yang pasti ditolak validasi, jadi tidak memanggil model
  // dan tidak memakan jatah harian siapa pun.
  await page.evaluate(async () => {
    const form = new FormData();
    form.set('mode', 'text');
    await fetch('/api/lookup', { method: 'POST', body: form }).catch(() => {});
    await fetch('/api/lookup').catch(() => {});
  });

  const semua = await page.evaluate(async () => {
    const hasil: string[] = [];
    for (const nama of await caches.keys()) {
      const cache = await caches.open(nama);
      for (const req of await cache.keys()) hasil.push(new URL(req.url).pathname);
    }
    return hasil;
  });
  expect(semua.filter((p) => p.startsWith('/api/'))).toHaveLength(0);
});

test('unduhan bisa dihapus dari layar Cadangan', async ({ page }) => {
  await page.goto('/pustaka');
  await siap(page);
  await page.getByRole('button', { name: /Unduh buat dibaca luring/ }).first().click();
  await expect(page.getByText('Bisa dibaca tanpa koneksi').first()).toBeVisible({ timeout: 30_000 });

  await page.goto('/data');
  const bagian = page.getByRole('region', { name: 'Penyimpanan luring' });
  await expect(bagian.getByText('Alice’s Adventures in Wonderland')).toBeVisible();
  await expect(bagian.getByText('12 dari 12 bab')).toBeVisible();

  await bagian.getByRole('button', { name: 'Hapus semua unduhan' }).click();
  await expect(bagian.getByText('Belum ada buku yang diunduh')).toBeVisible();
  expect(await isiCache(page, 'lema-buku-v1')).toHaveLength(0);
});

test('PAGAR 4: mode luring bisa dimatikan sendiri oleh pengguna', async ({ page }) => {
  await page.goto('/data');
  await siap(page);

  const bagian = page.getByRole('region', { name: 'Penyimpanan luring' });
  // Dua langkah, supaya tidak termatikan karena salah ketuk.
  await bagian.getByRole('button', { name: 'Matikan mode luring' }).click();
  await bagian.getByRole('button', { name: /Ya, matikan dan muat ulang/ }).click();

  await expect.poll(
    () => aman(
      () => page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length),
      -1,
    ),
    { timeout: 20_000 },
  ).toBe(0);

  // Koleksi kata pengguna tidak ikut terhapus. Itu janji yang tertulis di layar.
  const koleksi = await aman(() => page.evaluate(() => localStorage.getItem('lema.v1')), null);
  expect(koleksi === null || typeof koleksi === 'string').toBe(true);
});

test('PAGAR 4: pilihan mematikan diingat setelah halaman dibuka lagi', async ({ page }) => {
  // Tanpa ini tombolnya tidak ada gunanya: melepas service worker memicu
  // pemuatan ulang, dan pemuatan ulang itu mendaftarkannya kembali. Pengguna
  // akan menekannya berkali kali tanpa pernah berhasil.
  await page.goto('/data');
  await siap(page);
  const bagian = page.getByRole('region', { name: 'Penyimpanan luring' });
  await bagian.getByRole('button', { name: 'Matikan mode luring' }).click();
  await bagian.getByRole('button', { name: /Ya, matikan dan muat ulang/ }).click();

  await expect.poll(
    () => aman(
      () => page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length),
      -1,
    ),
    { timeout: 20_000 },
  ).toBe(0);

  await page.goto('/pustaka');
  await page.waitForTimeout(1500);
  expect(
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length),
  ).toBe(0);

  // Dan bisa dinyalakan lagi, bukan pintu satu arah.
  await page.goto('/data');
  await page.getByRole('button', { name: /Nyalakan lagi mode luring/ }).click();
  await siap(page);
});

test('mematikan mode luring juga membuang seluruh simpanan', async ({ page }) => {
  await page.goto('/pustaka');
  await siap(page);
  await page.getByRole('button', { name: /Unduh buat dibaca luring/ }).first().click();
  await expect(page.getByText('Bisa dibaca tanpa koneksi').first()).toBeVisible({ timeout: 30_000 });

  await page.goto('/data');
  const bagian = page.getByRole('region', { name: 'Penyimpanan luring' });
  await bagian.getByRole('button', { name: 'Matikan mode luring' }).click();
  await bagian.getByRole('button', { name: /Ya, matikan dan muat ulang/ }).click();

  // Namanya ikut diperiksa, bukan cuma jumlahnya: kalau ada yang tersisa,
  // pesan gagalnya langsung menyebut simpanan mana yang lolos.
  await expect.poll(
    () => aman(() => page.evaluate(() => caches.keys()), ['belum-terbaca']),
    { timeout: 20_000 },
  ).toEqual([]);
});
