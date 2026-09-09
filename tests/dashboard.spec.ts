import { test, expect, type Page } from '@playwright/test';
import type { Db, Entry } from '../lib/store';
import type { LookupResult } from '../lib/types';

const KEY = 'lema.v1';
const BOOK_A = 'dash-sapiens';
const BOOK_B = 'dash-educated';

function result(word: string): LookupResult {
  return {
    word,
    lemma: word,
    is_phrase: false,
    found: true,
    page_excerpt: 'A synthetic page used only for dashboard tests.',
    sentence: `The example uses ${word} in a simple sentence.`,
    ambiguous: false,
    candidates: [{
      meaning_id: `Makna uji ${word}`,
      meaning_en: `Test meaning of ${word}`,
      confidence: 0.9,
      trigger: 'simple sentence',
      why_id: 'Konteks uji membantu menentukan arti.',
    }],
    other_senses: [],
    caution_id: '',
    new_sentence: `Another topic also uses ${word}.`,
  };
}

function entry(over: Partial<Entry> & Pick<Entry, 'id' | 'bookId' | 'word'>): Entry {
  return {
    status: 'done',
    result: result(over.word),
    known: false,
    stage: 0,
    dueAt: Date.now() + 86_400_000,
    createdAt: 10,
    ...over,
  };
}

async function seed(page: Page, db: Db) {
  await page.addInitScript(({ key, value }) => {
    if (localStorage.getItem(key) === null) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }, { key: KEY, value: db });
  // Beranda dan review tidak boleh memanggil model sama sekali.
  await page.route('**/api/lookup', (route) => route.abort());
}

const stat = (page: Page, label: string) =>
  page.getByRole('region', { name: 'Ringkasan', exact: true }).locator('> div').filter({ hasText: label });

test('beranda meringkas koleksi dan mengantar ke layar foto', async ({ page }) => {
  await seed(page, {
    books: [
      { id: BOOK_A, title: 'Sapiens', createdAt: 1 },
      { id: BOOK_B, title: 'Educated', createdAt: 2 },
    ],
    activeBookId: BOOK_A,
    entries: [
      entry({ id: 'a1', bookId: BOOK_A, word: 'keen', passedReview: true }),
      entry({ id: 'a2', bookId: BOOK_A, word: 'still' }),
      entry({ id: 'a3', bookId: BOOK_A, word: 'bank', status: 'pending', result: undefined }),
      entry({ id: 'b1', bookId: BOOK_B, word: 'vast', known: true }),
    ],
  });
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Progres bacamu', exact: true })).toBeVisible();
  await expect(stat(page, 'Kata terkumpul')).toContainText('4');
  // Dua kata punya makna dan masih ikut review; satu ditandai sudah tahu dan
  // satu masih diproses, jadi keduanya tidak dihitung siap dibaca.
  await expect(stat(page, 'Siap dibaca')).toContainText('2');
  await expect(stat(page, 'Lolos review')).toContainText('1');

  await expect(page.getByRole('region', { name: 'Rak buku', exact: true })).toContainText('Sapiens');
  // Kata yang tersimpan dengan status "diproses" dipulihkan menjadi galat saat
  // aplikasi dimuat, karena fotonya memang tidak ikut disimpan. Beranda harus
  // menyebutnya gagal, bukan menggantungnya sebagai proses yang tidak pernah usai.
  await expect(page.getByRole('link', { name: /^1 kata gagal diproses/ })).toBeVisible();

  await page.getByRole('link', { name: /^Foto halaman baru/ }).click();
  await expect(page).toHaveURL('/baca');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sapiens');
});

test('pengguna baru langsung ditanya bukunya di beranda', async ({ page }) => {
  await seed(page, { books: [], activeBookId: null, entries: [] });
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Lagi baca buku apa?' })).toBeVisible();
  // Tanpa buku, navigasi utama belum ada gunanya dan sengaja belum muncul.
  await expect(page.getByRole('navigation', { name: 'Navigasi utama' })).toHaveCount(0);

  await page.getByLabel('Judul bukunya').fill('Dune');
  await page.getByRole('button', { name: 'Mulai', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Progres bacamu', exact: true })).toBeVisible();
  const nav = page.getByRole('navigation', { name: 'Navigasi utama' });
  await expect(nav.getByRole('list', { name: 'Tujuan utama' }).getByRole('link')).toHaveCount(4);
  expect((await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), KEY) as Db).books)
    .toHaveLength(1);
});

test('simpan dan lihat makna membawa langsung ke peta makna kata itu', async ({ page }) => {
  await page.addInitScript(({ key, value }) => {
    if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(value));
  }, {
    key: KEY,
    value: { books: [{ id: BOOK_A, title: 'Sapiens', createdAt: 1 }], activeBookId: BOOK_A, entries: [] } as Db,
  });
  // Balasan ditahan supaya keadaan "belum siap" benar benar terlihat, sama
  // seperti yang dilihat pengguna selama model membaca halamannya.
  let release = () => {};
  const held = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/api/lookup', async (route) => {
    await held;
    await route.fulfill({ json: { ok: true, results: [result('bank')], ms: 10 } });
  });

  await page.goto('/baca');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'page.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64',
    ),
  });
  await page.getByPlaceholder('Kata atau frasa yang bikin berhenti').fill('bank');
  await page.getByRole('button', { name: 'Tambah', exact: true }).click();

  await page.getByRole('button', { name: 'Simpan & lihat makna', exact: true }).click();

  // Pindah layar tidak menunggu model selesai; yang ditunggu cuma isinya.
  await expect(page).toHaveURL(/\/kata\?entry=/);
  await expect(page.getByText('Sedang diproses: bank', { exact: true })).toBeVisible();

  release();
  await expect(page.locator('article').filter({
    has: page.getByRole('heading', { name: 'bank', exact: true }),
  })).toContainText('Makna uji bank');
});

test('riwayat lolos review bertahan walau kata itu kemudian terlupa', async ({ page }) => {
  await seed(page, {
    books: [{ id: BOOK_A, title: 'Sapiens', createdAt: 1 }],
    activeBookId: BOOK_A,
    entries: [
      entry({ id: 'a1', bookId: BOOK_A, word: 'keen', dueAt: Date.now() - 1000, passedReview: true }),
    ],
  });
  await page.goto('/review');

  await page.getByRole('button', { name: 'Buka artinya', exact: true }).click();
  await page.getByRole('button', { name: /^Lupa/ }).click();

  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), KEY) as Db;
  // Jadwalnya turun ke anak tangga pertama, tetapi riwayatnya tidak dihapus.
  expect(saved.entries[0].stage).toBe(0);
  expect(saved.entries[0].passedReview).toBe(true);

  await page.goto('/');
  await expect(stat(page, 'Lolos review')).toContainText('1');
});

test('jawaban inget mencatat kata itu pernah lolos review', async ({ page }) => {
  await seed(page, {
    books: [{ id: BOOK_A, title: 'Sapiens', createdAt: 1 }],
    activeBookId: BOOK_A,
    entries: [entry({ id: 'a1', bookId: BOOK_A, word: 'keen', dueAt: Date.now() - 1000 })],
  });
  await page.goto('/');
  await expect(stat(page, 'Lolos review')).toContainText('0');

  await page.getByRole('link', { name: /kata udah waktunya diulang/ }).click();
  await page.getByRole('button', { name: 'Buka artinya', exact: true }).click();
  await page.getByRole('button', { name: /^Inget/ }).click();

  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), KEY) as Db;
  expect(saved.entries[0].passedReview).toBe(true);
  expect(saved.entries[0].stage).toBe(1);

  await page.goto('/');
  await expect(stat(page, 'Lolos review')).toContainText('1');
});
