import { test, expect, type Page } from '@playwright/test';
import type { Db } from '../lib/store';
import type { LookupResult } from '../lib/types';

function meaning(overrides: Partial<LookupResult> = {}): LookupResult {
  return {
    word: 'made out',
    lemma: 'make out',
    is_phrase: true,
    found: true,
    page_excerpt: 'She made out the shape of a house in the fog.',
    sentence: 'She made out the shape of a house in the fog.',
    ambiguous: false,
    candidates: [{
      meaning_id: 'berhasil melihat sesuatu yang samar',
      meaning_en: 'to manage to see something with difficulty',
      confidence: 0.86,
      trigger: 'in the fog',
      why_id: 'Kabut menghalangi pandangannya, jadi frasa ini berarti berusaha melihat.',
    }],
    other_senses: [{ meaning_id: 'mengisi dokumen', meaning_en: 'to write out a document' }],
    caution_id: 'Dalam konteks lain, frasa yang sama bisa memiliki arti berbeda.',
    new_sentence: 'He could make out the road through the rain.',
    ...overrides,
  };
}

function ambiguousMeaning(): LookupResult {
  return meaning({
    word: 'duck', lemma: 'duck', is_phrase: false, ambiguous: true,
    sentence: 'He saw her duck near the pond.',
    candidates: [
      {
        meaning_id: 'bebek miliknya', meaning_en: 'her bird', confidence: 0.5,
        trigger: 'her duck',
        why_id: 'Kata her dapat menunjukkan kepemilikan: bebek yang dimiliki perempuan itu.',
      },
      {
        meaning_id: 'menunduk', meaning_en: 'to lower her head', confidence: 0.5,
        trigger: 'duck near the pond',
        why_id: 'Duck juga dapat menjadi gerakan yang ia lihat dilakukan perempuan itu di dekat kolam.',
      },
    ],
  });
}

async function openEntry(page: Page, result: LookupResult) {
  const db: Db = {
    books: [{ id: 'sense-book', title: 'Buku contoh', createdAt: 1 }],
    activeBookId: 'sense-book',
    entries: [{
      id: 'sense-entry', bookId: 'sense-book', word: result.word, status: 'done', result,
      known: false, stage: 0, dueAt: Date.now() + 86_400_000, createdAt: 2,
    }],
  };
  await page.addInitScript((data) => localStorage.setItem('lema.v1', JSON.stringify(data)), db);
  // Seeded results suffice for these rendering tests. Any lookup is a regression.
  const requests: string[] = [];
  await page.route('**/api/lookup', (route) => {
    requests.push(route.request().url());
    return route.abort();
  });
  await page.goto('/kata?entry=sense-entry');
  await expect(page.getByRole('heading', { name: result.word, exact: true })).toBeVisible();
  expect(requests).toEqual([]);
  return page.locator('article');
}

test('a phrase is bold at every occurrence while the original spacing and text stay intact', async ({ page }) => {
  const sentence = 'She MADE  OUT the shape of a house\nin the fog. Later, she made out a doorway.';
  const card = await openEntry(page, meaning({ sentence }));
  const source = card.locator('blockquote');
  expect(await source.textContent()).toBe(sentence);
  await expect(source.locator('strong')).toHaveText(['MADE  OUT', 'made out']);
  await expect(source.locator('mark')).toHaveText(['in the fog']);
  await expect(card.getByText('Bentuk dasar:', { exact: false })).toContainText('make out');
  await expect(card.getByText('Frasa', { exact: true })).toBeVisible();
  await expect(card.getByRole('region', { name: 'Makna di sini', exact: true }).locator('q')).toHaveText('in the fog');
  await expect(card.getByRole('region', { name: 'Makna lain', exact: true })).toContainText('mengisi dokumen');
  await card.getByRole('button', { name: 'Aku udah tahu kata ini', exact: true }).click();
  await expect(card).toContainText('Ditandai sudah tahu');
});

test('both ambiguous candidates show their own evidence and overlapping highlights preserve the sentence', async ({ page }) => {
  const result = ambiguousMeaning();
  const card = await openEntry(page, result);
  const source = card.locator('blockquote');
  expect(await source.textContent()).toBe(result.sentence);
  await expect(source.locator('strong')).toHaveText(['duck']);
  await expect(source.locator('mark[title="Pemicu makna 1 dan 2"] strong')).toHaveText('duck');
  await expect(source.locator('mark[title="Pemicu makna 1"]')).toHaveText('her ');
  await expect(source.locator('mark[title="Pemicu makna 2"]')).toHaveText(' near the pond');
  for (let index = 0; index < 2; index++) {
    const candidate = card.getByRole('region', { name: `Makna ${index + 1}`, exact: true });
    await expect(candidate.locator('q')).toHaveText(result.candidates[index].trigger);
    await expect(candidate).toContainText(result.candidates[index].why_id);
  }
});

test('missing words and a long mismatched trigger do not highlight substrings or a truncated prefix', async ({ page }) => {
  const prefix = 'The remarkably long explanation at the beginning of this sentence ';
  const result = meaning({ word: 'he', lemma: 'he', sentence: prefix + 'describes a theater.' });
  result.candidates[0].trigger = prefix + 'describes a spaceship.';
  const card = await openEntry(page, result);
  expect(await card.locator('blockquote').textContent()).toBe(result.sentence);
  await expect(card.locator('blockquote strong, blockquote mark')).toHaveCount(0);
  await expect(card.getByText('Kata yang ditanyakan tidak tampak persis dalam kalimat ini.')).toBeVisible();
  await expect(card.getByText('Potongan ini tidak muncul persis dalam kalimat di atas.')).toBeVisible();
  await expect(card.locator('q')).toHaveText(result.candidates[0].trigger);
});

test('literal punctuation and HTML-like text are preserved as text', async ({ page }) => {
  const sentence = 'The label a+b differs from aaab. <script>alert("demo")</script>';
  const result = meaning({ word: 'a+b', lemma: 'a+b', sentence });
  result.candidates[0].trigger = '<script>alert("demo")</script>';
  const card = await openEntry(page, result);
  const source = card.locator('blockquote');
  expect(await source.textContent()).toBe(sentence);
  await expect(source.locator('strong')).toHaveText(['a+b']);
  await expect(source.locator('mark')).toHaveText([result.candidates[0].trigger]);
  await expect(card.locator('script')).toHaveCount(0);
});

test('the literal lemma is a fallback when the requested form is absent', async ({ page }) => {
  const result = meaning({ word: 'leaves', lemma: 'leave', is_phrase: false, sentence: 'They will leave tomorrow.' });
  result.candidates[0].trigger = '';
  const card = await openEntry(page, result);
  await expect(card.locator('blockquote strong')).toHaveText(['leave']);
  await expect(card.locator('blockquote mark')).toHaveCount(0);
  await expect(card.getByText('Pemicu belum tersedia.')).toBeVisible();
});

test('a word not found on the page is labelled general meaning without contextual evidence', async ({ page }) => {
  const result = meaning({ found: false });
  const card = await openEntry(page, result);
  await expect(card.getByRole('region', { name: 'Kata tidak ditemukan', exact: true })).toContainText('belum tentu cocok');
  await expect(card.getByRole('region', { name: 'Arti umum', exact: true })).toContainText(result.candidates[0].meaning_id);
  await expect(card.locator('blockquote strong, blockquote mark')).toHaveCount(0);
  await expect(card.getByText(result.candidates[0].why_id, { exact: true })).toHaveCount(0);
  expect(await card.locator('blockquote').textContent()).toBe(result.sentence);
});

test('ambiguous cards fit small phones in light and dark themes and compare side by side on desktop', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const card = await openEntry(page, ambiguousMeaning());
  const first = card.getByRole('region', { name: 'Makna 1', exact: true });
  const second = card.getByRole('region', { name: 'Makna 2', exact: true });
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    const a = await first.boundingBox();
    const b = await second.boundingBox();
    expect(b!.y).toBeGreaterThanOrEqual(a!.y + a!.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`sense-map-mobile-${colorScheme}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 320, height: 740 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1000, height: 900 });
  const a = await first.boundingBox();
  const b = await second.boundingBox();
  expect(Math.abs(a!.y - b!.y)).toBeLessThan(1);
  expect(b!.x).toBeGreaterThanOrEqual(a!.x + a!.width);
  await page.screenshot({ path: testInfo.outputPath('sense-map-desktop.png'), fullPage: true });
});

test('long words and evidence wrap without pushing the phone page sideways', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  const word = 'longword'.repeat(16);
  const result = meaning({ word, lemma: word, is_phrase: false, sentence: `The page contains ${word}.` });
  result.candidates[0].trigger = word;
  const card = await openEntry(page, result);
  await expect(card.locator('blockquote mark strong')).toHaveText(word);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('an incomplete ambiguous result keeps its uncertainty visible', async ({ page }) => {
  const card = await openEntry(page, meaning({ ambiguous: true }));
  await expect(card.getByText('Model masih ragu, tetapi kandidat makna kedua belum tersedia.')).toBeVisible();
  await expect(card.getByRole('region', { name: 'Makna yang tersedia', exact: true })).toBeVisible();
  await expect(card.getByRole('region', { name: 'Makna di sini', exact: true })).toHaveCount(0);
});
