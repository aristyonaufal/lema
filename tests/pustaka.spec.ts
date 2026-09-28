import { test, expect, type Page } from '@playwright/test';
import type { Db } from '../lib/store';

// Pustaka dan pembacanya.
//
// Yang paling penting diuji di sini bukan tampilannya, melainkan janji yang
// paling mudah dilanggar tanpa ketahuan: posisi baca harus selamat dari tutup
// buka halaman dan dari perubahan ukuran huruf, dan teks buku tidak boleh
// pernah masuk ke localStorage.

const KEY = 'lema.v1';

async function seed(page: Page, db: Db) {
  await page.addInitScript(({ key, value }) => {
    if (localStorage.getItem(key) === null) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }, { key: KEY, value: db });
}

const stored = (page: Page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null') as Db, KEY);

const KOSONG: Db = { books: [], entries: [], activeBookId: null, bacaan: [] };

// Menggulir sejauh piksel yang pasti, bukan scrollIntoViewIfNeeded. Yang
// terakhir tidak melakukan apa apa kalau sasarannya sudah terlihat, dan pengamat
// paragraf memang tidak akan pernah berubah kalau layarnya tidak bergerak.
async function gulir(page: Page, ke: number) {
  await page.evaluate((y) => window.scrollTo(0, y), ke);
}

// Paragraf teratas yang tercatat untuk satu buku, setelah jeda penyimpanan lewat.
async function posisi(page: Page, slug: string) {
  await expect.poll(async () => (await stored(page)).bacaan?.some((b) => b.slug === slug)).toBe(true);
  return (await stored(page)).bacaan!.find((b) => b.slug === slug)!;
}

test('katalog menampilkan lima buku dengan tingkat dan perkiraan waktunya', async ({ page }) => {
  await page.goto('/pustaka');

  await expect(page.getByRole('heading', { name: 'Pustaka' })).toBeVisible();
  const kartu = page.getByRole('link', { name: /Mulai baca|Lanjut baca/ });
  await expect(kartu).toHaveCount(5);

  await expect(page.getByText('Alice’s Adventures in Wonderland')).toBeVisible();
  await expect(page.getByText('Moby Dick')).toBeVisible();
  // Tingkat kesulitan dipakai pembaca untuk memilih, jadi harus terbaca.
  await expect(page.getByText('Ringan').first()).toBeVisible();
  await expect(page.getByText('Berat').first()).toBeVisible();
});

test('buku bisa dibuka dan bab pertamanya terbaca', async ({ page }) => {
  await page.goto('/pustaka/alice');

  await expect(page.getByRole('heading', { name: 'I: Down the Rabbit-Hole' })).toBeVisible();
  await expect(page.getByText(/Alice was beginning to get very tired/)).toBeVisible();
  await expect(page.getByText('Bab 1 dari 12')).toBeVisible();
});

test('em dash tidak kebagian spasi nyasar dari perekat tanpa lebar', async ({ page }) => {
  // Standard Ebooks menyelipkan U+FEFF sebelum em dash. Kalau spasi dirapikan
  // sebelum karakter itu dibuang, "ago—never" berubah jadi "ago —never".
  await page.goto('/pustaka/moby-dick');
  await expect(page.getByText(/Call me Ishmael/)).toContainText('ago—never mind how long precisely—having');
});

test('puisi tetap punya baris, tidak jadi satu gumpalan prosa', async ({ page }) => {
  await page.goto('/pustaka/alice');
  await page.getByLabel('Pilih bab').selectOption('2');
  await expect(page.getByRole('heading', { name: /The Pool of Tears/ })).toBeVisible();

  const barisan = page.locator('article p', { hasText: 'Alice’s Right Foot' });
  await expect(barisan).toContainText('Hearthrug');
  // pre-line yang membuat baris puisi tetap terpisah di layar.
  await expect(barisan).toHaveCSS('white-space', 'pre-line');
});

test('pindah bab lewat daftar dan lewat tombol', async ({ page }) => {
  await page.goto('/pustaka/alice');

  await page.getByRole('button', { name: /Bab berikutnya/ }).click();
  await expect(page.getByText('Bab 2 dari 12')).toBeVisible();

  await page.getByLabel('Pilih bab').selectOption('12');
  await expect(page.getByRole('heading', { name: /Alice’s Evidence/ })).toBeVisible();
  // Di bab terakhir tidak ada bab berikutnya.
  await expect(page.getByRole('button', { name: /Bab berikutnya/ })).toBeDisabled();

  await page.getByRole('button', { name: /Bab sebelumnya/ }).click();
  await expect(page.getByText('Bab 11 dari 12')).toBeVisible();
});

test('posisi baca tersimpan, lalu dilanjutkan saat halaman dibuka lagi', async ({ page }) => {
  await seed(page, KOSONG);
  await page.goto('/pustaka/alice');
  await page.getByLabel('Pilih bab').selectOption('4');
  await expect(page.getByText('Bab 4 dari 12')).toBeVisible();

  await gulir(page, 1500);
  const disimpan = await posisi(page, 'alice');
  expect(disimpan.bab).toBe(4);
  expect(disimpan.paragraf).toBeGreaterThan(0);

  // Buka lagi dari awal: harus melanjutkan, bukan kembali ke bab satu.
  await page.goto('/pustaka/alice');
  await expect(page.getByText('Bab 4 dari 12')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
});

test('katalog menawarkan lanjut baca setelah buku pernah dibuka', async ({ page }) => {
  await seed(page, { ...KOSONG, bacaan: [{ slug: 'alice', bab: 5, paragraf: 3, at: Date.now() }] });
  await page.goto('/pustaka');
  await expect(page.getByText('Lanjut baca · bab 5')).toBeVisible();
});

test('mengubah ukuran huruf tidak membuat pembaca kehilangan tempatnya', async ({ page }) => {
  await seed(page, KOSONG);
  await page.goto('/pustaka/alice');
  // Menggulir sebelum teksnya tergambar tidak menghasilkan apa apa, karena
  // halamannya belum cukup tinggi untuk digulir.
  await expect(page.getByText(/Alice was beginning to get very tired/)).toBeVisible();

  await gulir(page, 1500);
  const { paragraf: index } = await posisi(page, 'alice');
  expect(index).toBeGreaterThan(0);

  const dibaca = page.locator('article p').nth(index);
  const atasnya = async () => (await dibaca.boundingBox())?.y ?? Number.NaN;
  await expect.poll(atasnya).toBeLessThan(200);

  await page.getByRole('button', { name: 'Huruf besar' }).click();
  await expect(page.getByRole('button', { name: 'Huruf besar' })).toHaveAttribute('aria-pressed', 'true');

  // Semua teks jadi lebih tinggi, jadi posisi gulir dalam piksel pasti berubah.
  // Yang harus tetap: paragraf yang sedang dibaca masih di dekat atas layar.
  // Ditunggu, bukan diambil sekali: penarikan kembali terjadi di efek tata letak
  // setelah React menggambar ulang seluruh teks dengan ukuran baru.
  await expect.poll(atasnya).toBeLessThan(200);
});

test('tombol ukuran huruf tetap terjangkau di tengah bab', async ({ page }) => {
  // Elemen sticky terkurung di dalam kotak induknya. Kalau baris kepala ini
  // dikembalikan ke dalam <header>, ia berhenti menempel setelah beberapa ratus
  // piksel, dan pembaca harus naik ke puncak halaman cuma untuk membesarkan
  // huruf. Perjalanan naik itu sendiri sudah menghilangkan tempatnya.
  await page.goto('/pustaka/alice');
  await expect(page.getByText(/Alice was beginning to get very tired/)).toBeVisible();
  await gulir(page, 2500);

  const tombol = page.getByRole('button', { name: 'Huruf besar' });
  const kotak = await tombol.boundingBox();
  expect(kotak!.y).toBeGreaterThanOrEqual(0);
  expect(kotak!.y).toBeLessThan(120);
});

test('ukuran huruf diingat setelah halaman dimuat ulang', async ({ page }) => {
  await page.goto('/pustaka/alice');
  await page.getByRole('button', { name: 'Huruf besar' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Huruf besar' })).toHaveAttribute('aria-pressed', 'true');
});

test('buku pustaka masuk rak buku yang sama, dengan penanda asalnya', async ({ page }) => {
  await seed(page, KOSONG);
  await page.goto('/pustaka/alice');
  await expect(page.getByRole('heading', { name: /Down the Rabbit-Hole/ })).toBeVisible();

  await expect.poll(async () => (await stored(page)).books.length).toBe(1);
  const buku = (await stored(page)).books[0];
  expect(buku.title).toBe('Alice’s Adventures in Wonderland');
  expect(buku.pustaka).toBe('alice');

  // Membuka buku yang sama lagi tidak membuat rak kedua.
  await page.goto('/pustaka/alice');
  await expect(page.getByRole('heading', { name: /Down the Rabbit-Hole/ })).toBeVisible();
  expect((await stored(page)).books).toHaveLength(1);
});

test('teks buku tidak pernah masuk ke penyimpanan browser', async ({ page }) => {
  // Aturan paling penting di Tahap A. localStorage cuma sekitar 5 MB per origin
  // dan dipakai bersama koleksi kata; satu novel saja bisa mendorong koleksi
  // pengguna ke jalur galat "penyimpanan penuh".
  await seed(page, KOSONG);
  await page.goto('/pustaka/moby-dick');
  await expect(page.getByText(/Call me Ishmael/)).toBeVisible();
  await gulir(page, 1500);
  await posisi(page, 'moby-dick');

  const isi = await page.evaluate((key) => localStorage.getItem(key) ?? '', KEY);
  expect(isi).not.toContain('Ishmael');
  // Seluruh koleksi plus posisi baca harus tetap jauh di bawah satu kilobyte.
  expect(isi.length).toBeLessThan(1000);
});

test('pengguna baru tanpa buku punya jalan ke pustaka', async ({ page }) => {
  await page.goto('/');
  const jalan = page.getByRole('link', { name: /Belum pegang buku Inggris/ });
  await expect(jalan).toBeVisible();
  await jalan.click();
  await expect(page).toHaveURL(/\/pustaka$/);
});

test('bab yang tidak ada dijelaskan, bukan dibiarkan kosong', async ({ page }) => {
  await page.goto('/pustaka/buku-yang-tidak-ada');
  // Dicari di dalam main, karena Next juga memasang role="alert" tersembunyi
  // untuk mengumumkan perpindahan halaman.
  await expect(page.getByRole('main').getByRole('alert')).toContainText('belum bisa dimuat');
  await expect(page.getByRole('link', { name: 'Balik ke pustaka' })).toBeVisible();
});
