import { test, expect, type Page } from '@playwright/test';
import type { Db, Entry } from '../lib/store';
import type { LookupResult } from '../lib/types';

// Dua fungsi kuis:
// 1. Gerbang sebelum klaim "aku ingat": tombol Inget dan Udah hafal di review,
//    dan tombol Aku udah tahu kata ini di koleksi.
// 2. Tab kuis sendiri, dari semua buku dan semua jadwal, tanpa mengubah jadwal.
//
// Pilihan jawaban diacak, jadi pengujian selalu memilih berdasarkan nama,
// tidak pernah berdasarkan posisi.

const KEY = 'lema.v1';
const BOOK_A = 'kuis-a';
const BOOK_B = 'kuis-b';

// Setiap kata membawa tiga makna lain, jadi setiap soal pasti punya tiga
// pengecoh dari kata yang sama, dan "lain <kata> 1" pasti salah satunya.
function result(word: string): LookupResult {
  return {
    word,
    lemma: word,
    is_phrase: false,
    found: true,
    page_excerpt: '',
    sentence: `The book used ${word} in its own way.`,
    ambiguous: false,
    candidates: [{ meaning_id: `Makna ${word}`, meaning_en: `meaning of ${word}`, confidence: 0.9, trigger: 'own way', why_id: '' }],
    other_senses: [1, 2, 3].map((n) => ({ meaning_id: `lain ${word} ${n}`, meaning_en: `other ${n}` })),
    caution_id: '',
    new_sentence: `A fresh sentence about ${word}.`,
  };
}

function entry(id: string, bookId: string, word: string, over: Partial<Entry> = {}): Entry {
  return { id, bookId, word, status: 'done', result: result(word), known: false, stage: 1, dueAt: Date.now() - 1000, createdAt: 10, ...over };
}

async function seed(page: Page, entries: Entry[]) {
  const db: Db = {
    books: [{ id: BOOK_A, title: 'Sapiens', createdAt: 1 }, { id: BOOK_B, title: 'Educated', createdAt: 2 }],
    activeBookId: BOOK_A,
    entries,
  };
  await page.addInitScript(({ key, value }) => {
    if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(value));
  }, { key: KEY, value: db });
  await page.route('**/api/lookup', (route) => route.abort());
}

async function savedDb(page: Page): Promise<Db> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), KEY);
}

// Kata yang sedang ditanyakan dibaca dari soalnya, lalu dijawab benar atau salah.
async function answer(page: Page, rightly: boolean): Promise<string> {
  const quiz = page.getByRole('region', { name: 'Soal kuis' });
  const word = (await quiz.getByText(/^Apa arti/).locator('strong').textContent())!.trim();
  const options = quiz.getByRole('group', { name: 'Pilihan jawaban' });
  await options.getByRole('button', { name: rightly ? `Makna ${word}` : `lain ${word} 1`, exact: true }).click();
  return word;
}

test('Inget yang lolos kuis menaikkan jadwal dan mencatat lolos review', async ({ page }) => {
  await seed(page, [entry('a1', BOOK_A, 'keen')]);
  await page.goto('/review');

  // Makna belum terlihat sebelum pengguna memilih.
  await expect(page.getByText('Makna keen', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: /^Inget/ }).click();

  await expect(page.getByRole('region', { name: 'Soal kuis' })).toContainText('Buktikan dulu kalau kamu inget');
  await expect(page.getByRole('group', { name: 'Pilihan jawaban' }).getByRole('button')).toHaveCount(4);
  await answer(page, true);

  await expect(page.getByRole('status')).toHaveText('Benar!');
  await expect(page.getByText(/Tercatat inget\. Diulang lagi 7 hari lagi\./)).toBeVisible();
  const saved = await savedDb(page);
  expect(saved.entries[0].stage).toBe(2);
  expect(saved.entries[0].passedReview).toBe(true);

  await page.getByRole('button', { name: 'Lanjut', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Review beres' })).toBeVisible();
});

test('Inget yang gagal kuis dihitung lupa, dan jawaban benarnya ditunjukkan', async ({ page }) => {
  await seed(page, [entry('a1', BOOK_A, 'keen', { stage: 2 })]);
  await page.goto('/review');

  await page.getByRole('button', { name: /^Inget/ }).click();
  await answer(page, false);

  await expect(page.getByRole('status')).toHaveText('Belum tepat.');
  await expect(page.getByText('Jawabannya:')).toContainText('Makna keen');
  // Kalimat asal dari buku ikut ditampilkan, sesuai PRD bagian 8.4.
  await expect(page.getByText('The book used keen in its own way.')).toBeVisible();
  await expect(page.getByText('Dihitung lupa, jadi diulang lagi besok.')).toBeVisible();

  const saved = await savedDb(page);
  expect(saved.entries[0].stage).toBe(0);
  // grade() menulis false secara eksplisit saat lupa; yang penting tidak true.
  expect(saved.entries[0].passedReview).toBeFalsy();
});

test('Lupa tidak perlu kuis: makna dan kalimat asal langsung dibuka', async ({ page }) => {
  await seed(page, [entry('a1', BOOK_A, 'keen', { stage: 2 })]);
  await page.goto('/review');

  await page.getByRole('button', { name: /^Lupa/ }).click();
  await expect(page.getByRole('region', { name: 'Soal kuis' })).toHaveCount(0);
  await expect(page.getByText('Makna keen', { exact: true })).toBeVisible();
  await expect(page.getByText('The book used keen in its own way.')).toBeVisible();
  expect((await savedDb(page)).entries[0].stage).toBe(0);
});

test('Udah hafal hanya menandai kata kalau kuisnya dijawab benar', async ({ page }) => {
  await seed(page, [entry('a1', BOOK_A, 'keen'), entry('a2', BOOK_A, 'vast', { createdAt: 20 })]);
  await page.goto('/review');

  // Kata pertama: klaim hafal, tapi salah jawab. Tidak ditandai, dihitung lupa.
  await page.getByRole('button', { name: 'Udah hafal, stop tanya' }).click();
  await expect(page.getByRole('region', { name: 'Soal kuis' })).toContainText('Buktikan dulu sebelum berhenti ditanya');
  const first = await answer(page, false);
  await expect(page.getByText(/Belum ditandai hafal/)).toBeVisible();
  await page.getByRole('button', { name: 'Lanjut', exact: true }).click();

  // Kata kedua: klaim hafal dan benar. Ditandai sudah tahu.
  await page.getByRole('button', { name: 'Udah hafal, stop tanya' }).click();
  const second = await answer(page, true);
  await expect(page.getByText('Ditandai sudah hafal. Kata ini nggak akan ditanyakan lagi.')).toBeVisible();

  const saved = await savedDb(page);
  const byWord = (word: string) => saved.entries.find((e) => e.word === word)!;
  expect(byWord(first).known).toBe(false);
  expect(byWord(first).stage).toBe(0);
  expect(byWord(second).known).toBe(true);
});

test('Aku udah tahu kata ini di koleksi juga dijaga kuis', async ({ page }) => {
  await seed(page, [entry('a1', BOOK_A, 'keen', { dueAt: Date.now() + 86_400_000 })]);
  await page.goto('/kata?entry=a1');

  const card = page.locator('article');
  await card.getByRole('button', { name: 'Aku udah tahu kata ini', exact: true }).click();
  await answer(page, false);
  await expect(card).toContainText('Belum ditandai sudah tahu');
  expect((await savedDb(page)).entries[0].known).toBe(false);

  // Kartunya kembali seperti semula, dan tombolnya masih bisa dicoba lagi.
  await card.getByRole('button', { name: 'Balik ke kartu', exact: true }).click();
  await expect(card.getByRole('button', { name: 'Aku udah tahu kata ini', exact: true })).toBeVisible();

  await card.getByRole('button', { name: 'Aku udah tahu kata ini', exact: true }).click();
  await answer(page, true);
  await expect.poll(async () => (await savedDb(page)).entries[0].known).toBe(true);
});

test('tab kuis mengambil dari semua buku dan semua jadwal, tanpa mengubah jadwal', async ({ page }) => {
  const later = Date.now() + 30 * 86_400_000;
  const entries = [
    entry('a1', BOOK_A, 'keen', { dueAt: later }),
    entry('a2', BOOK_A, 'still', { dueAt: later, known: true }),
    entry('b1', BOOK_B, 'vast', { dueAt: later }),
  ];
  await seed(page, entries);
  await page.goto('/');

  await page.getByRole('navigation', { name: 'Navigasi utama' })
    .getByRole('link', { name: 'Kuis, uji kata dari semua buku' }).click();
  await expect(page).toHaveURL('/kuis');
  // Tiga kata dari dua buku, semuanya belum jatuh tempo, satu sudah ditandai tahu.
  await expect(page.getByText('3 soal dari 3 kata')).toBeVisible();

  await page.getByRole('button', { name: 'Mulai kuis', exact: true }).click();
  const asked: string[] = [];
  asked.push(await answer(page, true));
  await expect(page.getByText('1 benar')).toBeVisible();
  await page.getByRole('button', { name: 'Soal berikutnya', exact: true }).click();
  asked.push(await answer(page, false));
  await page.getByRole('button', { name: 'Soal berikutnya', exact: true }).click();
  asked.push(await answer(page, true));
  await page.getByRole('button', { name: 'Lihat hasil', exact: true }).click();

  expect(asked.sort()).toEqual(['keen', 'still', 'vast']);
  await expect(page.getByRole('heading', { name: '2 dari 3 benar' })).toBeVisible();
  // Kata yang salah dijawab muncul lagi dengan tautan ke kartunya.
  const missed = page.getByRole('region', { name: 'Perlu dilihat lagi' });
  await expect(missed.getByRole('link')).toHaveCount(1);
  await expect(missed.getByRole('link')).toHaveAttribute('href', /\/kata\?entry=/);

  // Tidak ada satu pun jadwal, riwayat, atau status yang disentuh.
  expect(await savedDb(page).then((db) => db.entries)).toEqual(entries);
});

test('tab kuis menjelaskan kalau belum ada kata yang bisa dikuiskan', async ({ page }) => {
  await seed(page, []);
  await page.goto('/kuis');
  await expect(page.getByText('Belum ada kata yang bisa dikuiskan')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Tandai kata baru', exact: true })).toHaveAttribute('href', '/baca');
});
