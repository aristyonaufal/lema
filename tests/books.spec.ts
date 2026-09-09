import { test, expect, type Page } from '@playwright/test';
import type { Db, Entry } from '../lib/store';

const KEY = 'lema.v1';
const BOOK_A = 'book-sapiens';
const BOOK_B = 'book-educated';

function entry(id: string, bookId: string, word: string, createdAt: number): Entry {
  return {
    id, bookId, word,
    status: 'done',
    known: false,
    stage: 0,
    dueAt: createdAt + 86400000,
    createdAt,
  };
}

// Dua buku: satu punya kata, satu masih kosong. Buku kosong yang sedang aktif
// meniru keadaan pengguna yang baru saja membuat buku lalu ingin balik ke buku lama.
async function seed(page: Page) {
  const db: Db = {
    books: [
      { id: BOOK_A, title: 'Sapiens', createdAt: 1 },
      { id: BOOK_B, title: 'Educated', createdAt: 2 },
    ],
    activeBookId: BOOK_B,
    entries: [
      entry('e1', BOOK_A, 'keen', 10),
      entry('e2', BOOK_A, 'still', 20),
    ],
  };
  await page.addInitScript(({ key, value }) => {
    if (localStorage.getItem(key) === null) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }, { key: KEY, value: db });
}

async function savedDb(page: Page): Promise<Db> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), KEY);
}

const heading = (page: Page) => page.getByRole('heading', { level: 1 });

test.beforeEach(async ({ page }) => {
  await seed(page);
  await page.goto('/baca');
});

test('memilih buku lama tidak membuat buku kedua', async ({ page }) => {
  await expect(heading(page)).toHaveText('Educated');

  await page.getByRole('button', { name: 'Ganti' }).click();
  await expect(page.getByRole('heading', { name: 'Mau lanjut buku yang mana?' })).toBeVisible();

  const shelf = page.getByRole('list', { name: 'Buku kamu' });
  await expect(shelf.getByRole('button')).toHaveCount(2);
  await shelf.getByRole('button', { name: /Sapiens/ }).click();

  await expect(heading(page)).toHaveText('Sapiens');
  const db = await savedDb(page);
  expect(db.books).toHaveLength(2);
  expect(db.activeBookId).toBe(BOOK_A);
});

test('judul yang sudah ada melanjutkan buku itu, walau beda huruf besar dan spasi', async ({ page }) => {
  await page.getByRole('button', { name: 'Ganti' }).click();
  await page.getByLabel('Buku baru').fill('  sApIeNs   ');

  await expect(page.getByText('Judul ini sudah ada')).toBeVisible();
  await page.getByRole('button', { name: 'Lanjutkan buku ini' }).click();

  await expect(heading(page)).toHaveText('Sapiens');
  const db = await savedDb(page);
  expect(db.books).toHaveLength(2);
  expect(db.activeBookId).toBe(BOOK_A);
});

test('judul baru membuat buku baru', async ({ page }) => {
  await page.getByRole('button', { name: 'Ganti' }).click();
  await page.getByLabel('Buku baru').fill('Dune');
  await page.getByRole('button', { name: 'Mulai' }).click();

  await expect(heading(page)).toHaveText('Dune');
  const db = await savedDb(page);
  expect(db.books).toHaveLength(3);
  expect(db.books.map((b) => b.title)).toContain('Dune');
});

test('batal kembali ke buku aktif tanpa mengubah koleksi', async ({ page }) => {
  const before = await savedDb(page);

  await page.getByRole('button', { name: 'Ganti' }).click();
  await page.getByRole('button', { name: /^Batal, balik ke/ }).click();

  await expect(heading(page)).toHaveText('Educated');
  expect(await savedDb(page)).toEqual(before);
});

test('daftar buku menampilkan jumlah kata dan menandai buku yang sedang dibaca', async ({ page }) => {
  await page.getByRole('button', { name: 'Ganti' }).click();
  const shelf = page.getByRole('list', { name: 'Buku kamu' });

  await expect(shelf.getByRole('button', { name: /Sapiens/ })).toContainText('2 kata');
  await expect(shelf.getByRole('button', { name: /Educated/ })).toContainText('Belum ada kata');
  await expect(shelf.getByRole('button', { name: /Educated/ })).toContainText('lagi dibaca');
});

test('layar pengambilan foto menjelaskan ke mana foto dikirim', async ({ page }) => {
  await expect(page.getByText(/Fotonya dikirim ke Google/)).toBeVisible();
  await expect(page.getByText(/cuma ada di browser ini/)).toBeVisible();
});
