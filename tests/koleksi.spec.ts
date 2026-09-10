import { test, expect, type Page, type Route } from '@playwright/test';
import type { Db, Entry } from '../lib/store';
import type { LookupResult } from '../lib/types';

// Revisi 9 September: daftar koleksi yang ringkas, rak buku di sidebar,
// mode latihan, dan penandaan frasa.

const KEY = 'lema.v1';
const BOOK_A = 'kol-sapiens';
const BOOK_B = 'kol-educated';

const photo = {
  name: 'page.png',
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64',
  ),
};

function result(word: string): LookupResult {
  return {
    word,
    lemma: word,
    is_phrase: word.includes(' '),
    found: true,
    page_excerpt: 'A synthetic page used only for collection tests.',
    sentence: `The example uses ${word} in a simple sentence.`,
    ambiguous: false,
    candidates: [{
      meaning_id: `Makna uji ${word}`,
      meaning_en: `Test meaning of ${word}`,
      confidence: 0.9,
      trigger: 'simple sentence',
      why_id: 'Konteks uji membantu menentukan arti.',
    }],
    other_senses: [{ meaning_id: 'makna lain', meaning_en: 'another sense' }],
    caution_id: 'Hati hati, di percakapan sehari hari artinya bisa berbeda.',
    new_sentence: `Another topic also uses ${word}.`,
  };
}

function entry(over: Partial<Entry> & Pick<Entry, 'id' | 'bookId' | 'word'>): Entry {
  return {
    status: 'done',
    result: result(over.word),
    known: false,
    stage: 0,
    dueAt: Date.now() + 30 * 86_400_000,
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
}

async function savedDb(page: Page): Promise<Db> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), KEY);
}

const twoBooks: Db = {
  books: [
    { id: BOOK_A, title: 'Sapiens', createdAt: 1 },
    { id: BOOK_B, title: 'Educated', createdAt: 2 },
  ],
  activeBookId: BOOK_A,
  entries: [
    entry({ id: 'a1', bookId: BOOK_A, word: 'keen', createdAt: 30 }),
    entry({ id: 'a2', bookId: BOOK_A, word: 'steady', createdAt: 20 }),
    entry({ id: 'b1', bookId: BOOK_B, word: 'vast', createdAt: 10 }),
  ],
};

test('koleksi menampilkan daftar ringkas, kartu maknanya baru digambar saat dibuka', async ({ page }) => {
  await seed(page, twoBooks);
  await page.route('**/api/lookup', (route) => route.abort());
  await page.goto('/kata');

  // Inti keluhannya: tiga kata tidak boleh langsung berarti tiga kartu penuh.
  await expect(page.locator('article')).toHaveCount(0);
  await expect(page.getByText('Pemicu makna')).toHaveCount(0);
  await expect(page.getByText('Hati hati')).toHaveCount(0);

  // Barisnya tetap memberi tahu kata dan artinya tanpa perlu dibuka.
  const keen = page.getByRole('button', { name: 'keen' });
  await expect(keen).toContainText('Makna uji keen');
  await expect(keen).toHaveAttribute('aria-expanded', 'false');

  await keen.click();
  await expect(keen).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('article')).toHaveCount(1);
  await expect(page.locator('article')).toContainText('Pemicu makna');

  // Membuka satu kata tidak ikut membuka yang lain.
  await expect(page.getByRole('button', { name: 'steady' })).toHaveAttribute('aria-expanded', 'false');

  await keen.click();
  await expect(page.locator('article')).toHaveCount(0);
});

test('rak buku di sidebar membuka koleksi satu buku saja', async ({ page }) => {
  await seed(page, twoBooks);
  await page.route('**/api/lookup', (route) => route.abort());
  await page.goto('/kata');

  await expect(page.getByRole('button', { name: 'keen' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'vast' })).toBeVisible();

  await page.getByRole('link', { name: 'Kata dari buku Educated' }).click();

  await expect(page).toHaveURL(`/kata?buku=${BOOK_B}`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Educated');
  await expect(page.getByRole('button', { name: 'vast' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'keen' })).toHaveCount(0);

  await page.getByRole('link', { name: 'Lihat semua buku', exact: true }).click();
  await expect(page).toHaveURL('/kata');
  await expect(page.getByRole('button', { name: 'keen' })).toBeVisible();
});

test('latihan jalan tanpa menunggu jatuh tempo dan tidak menggeser jadwal', async ({ page }) => {
  const dueAt = Date.now() + 30 * 86_400_000;
  await seed(page, {
    books: [{ id: BOOK_A, title: 'Sapiens', createdAt: 1 }],
    activeBookId: BOOK_A,
    entries: [entry({ id: 'a1', bookId: BOOK_A, word: 'keen', stage: 2, dueAt })],
  });
  await page.route('**/api/lookup', (route) => route.abort());
  await page.goto('/review');

  await expect(page.getByRole('heading', { name: 'Belum ada yang jatuh tempo' })).toBeVisible();
  await page.getByRole('link', { name: 'Latihan sekarang', exact: true }).click();
  await expect(page).toHaveURL('/review?latihan=1');

  await expect(page.getByText(/nggak menggeser\s+jadwal review/)).toBeVisible();
  await page.getByRole('button', { name: 'Buka artinya', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Inget/ })).toContainText('cuma latihan');
  await page.getByRole('button', { name: /^Inget/ }).click();

  await expect(page.getByRole('heading', { name: 'Latihan beres' })).toBeVisible();

  // Inti aturannya: sesi latihan tidak boleh menyentuh jadwal maupun riwayat,
  // supaya angka progres tetap mengukur ingatan, bukan jumlah ketukan tombol.
  const saved = await savedDb(page);
  expect(saved.entries[0].stage).toBe(2);
  expect(saved.entries[0].dueAt).toBe(dueAt);
  expect(saved.entries[0].passedReview).toBeUndefined();
});

test('frasa multi kata dikirim utuh sebagai satu tandaan', async ({ page }) => {
  const calls: Route[] = [];
  await page.route('**/api/lookup', (route) => { calls.push(route); });
  await seed(page, {
    books: [{ id: BOOK_A, title: 'Sapiens', createdAt: 1 }],
    activeBookId: BOOK_A,
    entries: [],
  });
  await page.goto('/baca');

  await page.getByRole('radio', { name: 'Ketik kata' }).click();
  await page.locator('input[type="file"]').setInputFiles(photo);
  await page.getByPlaceholder('Kata atau frasa yang bikin berhenti').fill('in the long run');
  await page.getByRole('button', { name: 'Tambah', exact: true }).click();
  await expect(page.getByRole('button', { name: 'in the long run, hapus dari daftar' })).toBeVisible();

  await page.getByRole('button', { name: 'Simpan, lanjut baca' }).click();
  await expect.poll(() => calls.length).toBe(1);
  // Frasanya tetap satu tandaan, tidak dipecah jadi empat kata.
  expect(calls[0].request().postData()).toContain('["in the long run"]');
  await expect.poll(async () => (await savedDb(page)).entries.map((e) => e.word)).toEqual(['in the long run']);
});

test('teks sepanjang kalimat ditolak dengan penjelasan, bukan dijawab asal', async ({ page }) => {
  await page.route('**/api/lookup', (route) => route.abort());
  await seed(page, {
    books: [{ id: BOOK_A, title: 'Sapiens', createdAt: 1 }],
    activeBookId: BOOK_A,
    entries: [],
  });
  await page.goto('/baca');

  await page.getByRole('radio', { name: 'Ketik kata' }).click();
  const input = page.getByPlaceholder('Kata atau frasa yang bikin berhenti');
  await input.fill('She made out the shape of a house in the fog and kept walking north');

  await expect(page.getByRole('status')).toContainText('belum bisa menjelaskan kalimat utuh');
  await expect(page.getByRole('button', { name: 'Tambah', exact: true })).toBeDisabled();

  await input.fill('made out');
  await expect(page.getByRole('status')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Tambah', exact: true })).toBeEnabled();
});
