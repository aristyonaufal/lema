import { test, expect, type Page } from '@playwright/test';
import type { Db, Entry } from '../lib/store';
import type { LookupResult } from '../lib/types';

// Tahap C: buku pustaka dan buku kertas jadi satu rak.
//
// Yang diuji di sini bukan tampilannya, melainkan satu janji: pembaca yang
// menutup Lema di tengah bab bisa kembali ke sana tanpa mencari. Dan kemajuan
// membaca tidak boleh tertukar dengan kemajuan hafalan; keduanya angka yang
// berbeda artinya.

const KEY = 'lema.v1';

async function seed(page: Page, db: Db) {
  await page.addInitScript(({ key, value }) => {
    if (localStorage.getItem(key) === null) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }, { key: KEY, value: db });
}

function hasil(word: string): LookupResult {
  return {
    word, lemma: word, is_phrase: false, found: true,
    page_excerpt: '', sentence: `A sentence with ${word}.`, ambiguous: false,
    candidates: [{
      meaning_id: `Makna ${word}`, meaning_en: `meaning of ${word}`,
      confidence: 0.9, trigger: 'sentence', why_id: 'Alasan uji.',
    }],
    other_senses: [], caution_id: '', new_sentence: `Another use of ${word}.`,
  };
}

function entry(over: Partial<Entry> & Pick<Entry, 'id' | 'bookId' | 'word'>): Entry {
  return {
    status: 'done', result: hasil(over.word), known: false,
    stage: 0, dueAt: Date.now() + 30 * 86_400_000, createdAt: 10, ...over,
  };
}

// Satu buku pustaka yang sudah dibaca sampai bab 5, plus satu buku kertas.
const DUA_BUKU: Db = {
  books: [
    { id: 'b-kertas', title: 'Sapiens', createdAt: 1 },
    { id: 'b-alice', title: 'Alice’s Adventures in Wonderland', createdAt: 2, pustaka: 'alice' },
  ],
  entries: [
    entry({ id: 'e1', bookId: 'b-kertas', word: 'ubiquitous' }),
    entry({ id: 'e2', bookId: 'b-alice', word: 'curious', passedReview: true }),
  ],
  activeBookId: 'b-kertas',
  bacaan: [{ slug: 'alice', bab: 5, paragraf: 3, at: Date.now() }],
};

test('beranda menawarkan lanjut baca dari buku yang terakhir dibuka', async ({ page }) => {
  await seed(page, DUA_BUKU);
  await page.goto('/');

  const kartu = page.getByRole('link', { name: /Lanjut baca/ }).first();
  await expect(kartu).toBeVisible();
  // Nomor babnya disebut, dan totalnya diambil dari katalog pustaka.
  await expect(kartu).toContainText('Bab 5 dari 12');

  await kartu.click();
  await expect(page).toHaveURL(/\/pustaka\/alice$/);
});

test('tanpa riwayat baca, tawaran lanjut baca tidak muncul', async ({ page }) => {
  await seed(page, { ...DUA_BUKU, bacaan: [] });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Rak buku' })).toBeVisible();
  await expect(page.getByText('Lanjut baca')).toBeHidden();
});

test('yang ditawarkan buku yang paling terakhir dibaca', async ({ page }) => {
  await seed(page, {
    ...DUA_BUKU,
    books: [
      ...DUA_BUKU.books,
      { id: 'b-moby', title: 'Moby Dick', createdAt: 3, pustaka: 'moby-dick' },
    ],
    bacaan: [
      { slug: 'alice', bab: 5, paragraf: 3, at: 1_000 },
      { slug: 'moby-dick', bab: 40, paragraf: 2, at: 9_000 },
    ],
  });
  await page.goto('/');

  const kartu = page.getByRole('link', { name: /Lanjut baca/ }).first();
  await expect(kartu).toContainText('Moby Dick');
  await expect(kartu).toContainText('Bab 40 dari 136');
});

test('rak buku memisahkan kemajuan baca dari kemajuan hafalan', async ({ page }) => {
  await seed(page, DUA_BUKU);
  await page.goto('/');

  const rak = page.getByRole('region', { name: 'Rak buku' });
  // Kemajuan hafalan: satu kata, satu lolos review.
  await expect(rak.getByText('1 kata, 1 lolos review')).toBeVisible();
  // Kemajuan baca: bab, dan hanya untuk buku pustaka.
  await expect(rak.getByRole('link', { name: /Lanjut baca · bab 5 dari 12/ })).toBeVisible();
});

test('buku kertas tidak kebagian tautan baca', async ({ page }) => {
  await seed(page, {
    books: [{ id: 'b-kertas', title: 'Sapiens', createdAt: 1 }],
    entries: [entry({ id: 'e1', bookId: 'b-kertas', word: 'ubiquitous' })],
    activeBookId: 'b-kertas',
    bacaan: [],
  });
  await page.goto('/');

  const rak = page.getByRole('region', { name: 'Rak buku' });
  await expect(rak.getByText('Sapiens')).toBeVisible();
  await expect(rak.getByRole('link', { name: /Mulai baca|Lanjut baca/ })).toBeHidden();
});

test('buku pustaka yang belum dibaca menawarkan mulai baca', async ({ page }) => {
  await seed(page, { ...DUA_BUKU, bacaan: [] });
  await page.goto('/');

  const rak = page.getByRole('region', { name: 'Rak buku' });
  await expect(rak.getByRole('link', { name: /Mulai baca/ })).toBeVisible();
});

test('koleksi kata satu buku pustaka punya jalan balik ke bacaannya', async ({ page }) => {
  await seed(page, DUA_BUKU);
  await page.goto('/kata?buku=b-alice');

  await expect(page.getByRole('heading', { name: 'Alice’s Adventures in Wonderland' })).toBeVisible();
  await page.getByRole('link', { name: /Balik ke bacaan/ }).click();
  await expect(page).toHaveURL(/\/pustaka\/alice$/);
});

test('koleksi buku kertas tidak menawarkan jalan baca', async ({ page }) => {
  await seed(page, DUA_BUKU);
  await page.goto('/kata?buku=b-kertas');

  await expect(page.getByRole('heading', { name: 'Sapiens' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Balik ke bacaan/ })).toBeHidden();
});

test('sidebar menyebut sampai bab berapa buku pustaka dibaca', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await seed(page, DUA_BUKU);
  await page.goto('/');

  const tautan = page.getByRole('link', { name: /Kata dari buku Alice/ });
  await expect(tautan).toContainText('bab 5');
});

test('lanjut baca benar benar kembali ke bab yang tersimpan', async ({ page }) => {
  await seed(page, DUA_BUKU);
  await page.goto('/');
  const kartu = page.getByRole('link', { name: /Lanjut baca/ }).first();
  await expect(kartu).toBeVisible();
  await kartu.click();
  await expect(page).toHaveURL(/\/pustaka\/alice$/);

  // Bab 5 Alice, bukan bab 1. Inilah janji yang sebenarnya diuji berkas ini.
  await expect(page.getByRole('heading', { name: /Advice from a Caterpillar/ })).toBeVisible();
  await expect(page.getByLabel('Pilih bab')).toHaveValue('5');
});
