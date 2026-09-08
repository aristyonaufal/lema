import { test as base, expect, type Page, type Route } from '@playwright/test';
import type { Db, Entry } from '../lib/store';
import type { LookupResult } from '../lib/types';

const KEY = 'lema.v1';
const BOOK_ID = 'storage-test-book';
const photo = {
  name: 'test-page.png',
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64',
  ),
};

type LookupMock = {
  calls: Route[];
  reply: (index: number, results: LookupResult[]) => Promise<void>;
  fail: (index: number) => Promise<void>;
};

// Every test intercepts lookup before opening the app. These tests never send a
// photo to the real API or consume Gemini quota.
const test = base.extend<{ lookup: LookupMock }>({
  lookup: [async ({ page }, use) => {
    const calls: Route[] = [];
    await page.route('**/api/lookup', (route) => { calls.push(route); });
    await use({
      calls,
      async reply(index, results) {
        await expect.poll(() => calls.length).toBeGreaterThan(index);
        await calls[index].fulfill({ json: { ok: true, results, ms: 10 } });
      },
      async fail(index) {
        await expect.poll(() => calls.length).toBeGreaterThan(index);
        await calls[index].abort('failed');
      },
    });
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  }, { auto: true }],
});

function result(word: string): LookupResult {
  return {
    word,
    lemma: word.trim().toLowerCase(),
    is_phrase: false,
    found: true,
    page_excerpt: 'This is a synthetic page used only to check saving vocabulary.',
    sentence: `The example uses ${word.trim()} in a simple sentence.`,
    ambiguous: false,
    candidates: [{
      meaning_id: `Makna uji ${word.trim()}`,
      meaning_en: `Test meaning of ${word.trim()}`,
      confidence: 0.95,
      trigger: 'simple sentence',
      why_id: 'Konteks uji membantu menentukan arti.',
    }],
    other_senses: [],
    caution_id: '',
    new_sentence: `Another topic also uses ${word.trim()}.`,
  };
}

async function seed(page: Page, entries: Entry[] = []) {
  const db: Db = {
    books: [{ id: BOOK_ID, title: 'Buku uji penyimpanan', createdAt: 1 }],
    activeBookId: BOOK_ID,
    entries,
  };
  await page.addInitScript(({ key, value }) => {
    // Keep the application's saved version when a test refreshes the page.
    if (localStorage.getItem(key) === null) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }, { key: KEY, value: db });
}

async function savedDb(page: Page): Promise<Db> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), KEY);
}

async function preparePhoto(page: Page, words: string[]) {
  await page.locator('input[type="file"]').setInputFiles(photo);
  await expect(page.getByRole('img', { name: 'halaman', exact: true })).toBeVisible();
  for (const word of words) {
    await page.getByPlaceholder('Kata yang bikin kamu berhenti').fill(word);
    await page.getByRole('button', { name: 'Tambah', exact: true }).click();
  }
  await expect(page.getByRole('button', { name: 'Simpan, lanjut baca' })).toBeEnabled();
}

async function submit(page: Page, words: string[]) {
  await preparePhoto(page, words);
  await page.getByRole('button', { name: 'Simpan, lanjut baca' }).click();
}

async function openCollection(page: Page) {
  // Use the app's Link so that the document and in-flight request stay alive.
  await page.getByRole('link', { name: /^Koleksi kata/ }).click();
  await expect(page).toHaveURL('/kata');
  await expect(page.getByRole('heading', { name: 'Koleksi kata', exact: true })).toBeVisible();
}

function card(page: Page, word: string) {
  return page.locator('article').filter({
    has: page.getByRole('heading', { name: word, exact: true }),
  });
}

async function failStorageWrites(page: Page, fail: boolean) {
  await page.evaluate((shouldFail) => {
    const flags = window as typeof window & {
      lemaTestStorageInstalled?: boolean;
      lemaTestStorageFails?: boolean;
    };
    if (!flags.lemaTestStorageInstalled) {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key: string, value: string) {
        if (key === 'lema.v1' && flags.lemaTestStorageFails) {
          throw new DOMException('Simulated full storage', 'QuotaExceededError');
        }
        return original.call(this, key, value);
      };
      flags.lemaTestStorageInstalled = true;
    }
    flags.lemaTestStorageFails = shouldFail;
  }, fail);
}

test('lookup finishes after client navigation and survives refresh', async ({ page, lookup }) => {
  await seed(page);
  await page.goto('/');
  await submit(page, ['bank']);
  await expect.poll(() => lookup.calls.length).toBe(1);
  await openCollection(page);
  await expect(page.getByText('Sedang diproses: bank', { exact: true })).toBeVisible();

  await lookup.reply(0, [result('bank')]);
  await expect(card(page, 'bank')).toContainText('Makna uji bank');
  await expect.poll(async () => (await savedDb(page)).entries[0]?.status).toBe('done');
  await page.reload();
  await expect(card(page, 'bank')).toContainText('Makna uji bank');
  expect(lookup.calls).toHaveLength(1);
});

test('reverse completion preserves both batches and edits made in collection', async ({ page, lookup }) => {
  await seed(page, [{
    id: 'existing-word',
    bookId: BOOK_ID,
    word: 'steady',
    status: 'done',
    result: result('steady'),
    known: false,
    stage: 0,
    dueAt: Date.now() + 86_400_000,
    createdAt: 2,
  }]);
  await page.goto('/');
  await submit(page, ['bank']);
  await expect.poll(() => lookup.calls.length).toBe(1);
  await openCollection(page);
  await card(page, 'steady').getByRole('button', { name: 'Aku udah tahu kata ini' }).click();
  await expect(card(page, 'steady')).toContainText('Ditandai sudah tahu');

  await page.getByRole('link', { name: 'Kembali', exact: true }).click();
  await submit(page, ['bright']);
  await expect.poll(() => lookup.calls.length).toBe(2);
  await openCollection(page);
  await expect(page.getByText('Sedang diproses: bank', { exact: true })).toBeVisible();
  await expect(page.getByText('Sedang diproses: bright', { exact: true })).toBeVisible();

  await lookup.reply(1, [result('bright')]);
  await expect(card(page, 'bright')).toBeVisible();
  await expect(page.getByText('Sedang diproses: bank', { exact: true })).toBeVisible();
  await expect(card(page, 'steady')).toContainText('Ditandai sudah tahu');
  await lookup.reply(0, [result('bank')]);
  await expect(card(page, 'bank')).toBeVisible();
  await expect.poll(async () => (await savedDb(page)).entries.map(({ word, status, known }) =>
    ({ word, status, known }),
  )).toEqual([
    { word: 'steady', status: 'done', known: true },
    { word: 'bank', status: 'done', known: false },
    { word: 'bright', status: 'done', known: false },
  ]);

  await page.reload();
  await expect(card(page, 'bank')).toBeVisible();
  await expect(card(page, 'bright')).toBeVisible();
  await expect(card(page, 'steady')).toContainText('Ditandai sudah tahu');
  expect(lookup.calls).toHaveLength(2);
});

test('network failure becomes a saved error after navigation', async ({ page, lookup }) => {
  await seed(page);
  await page.goto('/');
  await submit(page, ['bank']);
  await openCollection(page);
  await lookup.fail(0);

  await expect(page.getByText(/Gagal menghubungi server/i)).toBeVisible();
  await expect(page.getByText('Sedang diproses: bank', { exact: true })).toHaveCount(0);
  await expect.poll(async () => (await savedDb(page)).entries[0]?.status).toBe('error');
  await page.reload();
  await expect(page.getByText(/Gagal menghubungi server/i)).toBeVisible();
});

test('partial lookup matches normalized words rather than response positions', async ({ page, lookup }) => {
  await seed(page);
  await page.goto('/');
  await submit(page, ['bank', 'bright']);
  await openCollection(page);
  await lookup.reply(0, [result(' BRIGHT ')]);

  await expect(page.getByRole('heading', { name: 'BRIGHT', exact: true })).toHaveCount(1);
  await expect.poll(async () => (await savedDb(page)).entries.map(({ word, status, result: value }) =>
    ({ word, status, resultWord: value?.word }),
  )).toEqual([
    { word: 'bank', status: 'error', resultWord: undefined },
    { word: 'bright', status: 'done', resultWord: ' BRIGHT ' },
  ]);
  await expect(page.getByText('bank', { exact: true })).toBeVisible();
  await expect(page.getByText(/Sedang diproses:/)).toHaveCount(0);
});

test('refresh marks interrupted requests as retryable errors without resending the photo', async ({ page, lookup }) => {
  await seed(page);
  await page.goto('/');
  await submit(page, ['bank']);
  await expect.poll(() => lookup.calls.length).toBe(1);
  await openCollection(page);
  await expect(page.getByText('Sedang diproses: bank', { exact: true })).toBeVisible();
  await page.reload();

  // A graceful reload can let fetch reject and save its network error before
  // the document unloads. Either path must leave a retryable error, not pending.
  await expect(page.getByText(/terputus|Gagal menghubungi server/i)).toBeVisible();
  await expect(page.getByRole('link', { name: /foto|ulang/i })).toHaveAttribute('href', '/');
  await expect.poll(async () => (await savedDb(page)).entries[0]?.status).toBe('error');
  expect(lookup.calls).toHaveLength(1);
  await page.getByRole('link', { name: /foto|ulang/i }).click();
  await expect(page.getByRole('button', { name: 'Simpan, lanjut baca' })).toBeDisabled();
});

test('opening saved pending entries recovers a browser interruption without an API request', async ({ page, lookup }) => {
  // Simulate a closed/crashed browser that could not execute a fetch catch.
  await seed(page, [{
    id: 'interrupted-word',
    bookId: BOOK_ID,
    word: 'bank',
    status: 'pending',
    known: false,
    stage: 0,
    dueAt: 2,
    createdAt: 2,
  }]);
  await page.goto('/kata');
  await expect(page.getByText(/terputus/i)).toBeVisible();
  await expect(page.getByRole('link', { name: /foto|ulang/i })).toHaveAttribute('href', '/');
  await expect.poll(async () => (await savedDb(page)).entries[0]?.status).toBe('error');
  await page.reload();
  await expect(page.getByText(/terputus/i)).toBeVisible();
  expect(lookup.calls).toHaveLength(0);
});

test('failure to save the queue keeps the selected photo and words without an API request', async ({ page, lookup }) => {
  await seed(page);
  await page.goto('/');
  await preparePhoto(page, ['bank']);
  await failStorageWrites(page, true);
  await page.getByRole('button', { name: 'Simpan, lanjut baca' }).click();

  await expect(page.getByRole('alert').filter({ hasText: /simpan|penyimpanan/i })).toBeVisible();
  await expect(page.getByRole('img', { name: 'halaman', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /^bank/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Simpan, lanjut baca' })).toBeEnabled();
  expect((await savedDb(page)).entries).toEqual([]);
  expect(lookup.calls).toHaveLength(0);

  await failStorageWrites(page, false);
  await page.getByRole('button', { name: 'Simpan, lanjut baca' }).click();
  await lookup.reply(0, [result('bank')]);
  await openCollection(page);
  await expect(card(page, 'bank')).toBeVisible();
  await expect.poll(async () => (await savedDb(page)).entries.length).toBe(1);
  expect(lookup.calls).toHaveLength(1);
});

test('failed result persistence stays visible and retries saving without fetching again', async ({ page, lookup }) => {
  await seed(page);
  await page.goto('/');
  await submit(page, ['bank']);
  await expect.poll(() => lookup.calls.length).toBe(1);
  await openCollection(page);
  await failStorageWrites(page, true);
  await lookup.reply(0, [result('bank')]);

  await expect(card(page, 'bank')).toContainText('Makna uji bank');
  await expect(page.getByRole('alert').filter({ hasText: /simpan|penyimpanan/i })).toBeVisible();
  expect((await savedDb(page)).entries[0]?.status).toBe('pending');
  await page.getByRole('link', { name: 'Kembali', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Coba simpan lagi', exact: true })).toBeVisible();
  await openCollection(page);
  await expect(card(page, 'bank')).toContainText('Makna uji bank');

  await failStorageWrites(page, false);
  await page.getByRole('button', { name: 'Coba simpan lagi', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Coba simpan lagi', exact: true })).toHaveCount(0);
  await expect.poll(async () => (await savedDb(page)).entries[0]?.status).toBe('done');
  expect(lookup.calls).toHaveLength(1);
  await page.reload();
  await expect(card(page, 'bank')).toContainText('Makna uji bank');
});

test('case variants are submitted once while keeping the first spelling', async ({ page, lookup }) => {
  await seed(page);
  await page.goto('/');
  await preparePhoto(page, ['Bank', 'bank']);
  await expect(page.getByRole('button', { name: /^bank/i })).toHaveCount(1);
  await page.getByRole('button', { name: 'Simpan, lanjut baca' }).click();
  await expect.poll(() => lookup.calls.length).toBe(1);
  expect(lookup.calls[0].request().postData()).toContain('["Bank"]');
  await openCollection(page);
  await lookup.reply(0, [result('bank')]);
  await expect(card(page, 'bank')).toBeVisible();
  await expect.poll(async () => (await savedDb(page)).entries.map(({ word, status }) =>
    ({ word, status }),
  )).toEqual([{ word: 'Bank', status: 'done' }]);
});

test('unreadable storage is not overwritten and can be loaded again', async ({ page, lookup }) => {
  const broken = '{"books":';
  await page.addInitScript(({ key, value }) => {
    localStorage.setItem(key, value);
  }, { key: KEY, value: broken });
  await page.goto('/');
  await expect(page.getByRole('alert').filter({ hasText: /belum bisa dibaca/i })).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).toBe(broken);
  expect(lookup.calls).toHaveLength(0);

  const recovered: Db = {
    books: [{ id: BOOK_ID, title: 'Buku yang dipulihkan', createdAt: 1 }],
    entries: [],
    activeBookId: BOOK_ID,
  };
  await page.evaluate(({ key, value }) => {
    localStorage.setItem(key, JSON.stringify(value));
  }, { key: KEY, value: recovered });
  await page.getByRole('button', { name: 'Coba baca lagi', exact: true }).click();
  await expect(page.getByText('Buku yang dipulihkan', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Coba baca lagi', exact: true })).toHaveCount(0);
  expect(await savedDb(page)).toEqual(recovered);
});

test('a stalled request times out and leaves a saved retryable error', async ({ page, lookup }) => {
  await page.clock.install();
  await seed(page);
  await page.goto('/');
  await submit(page, ['bank']);
  await expect.poll(() => lookup.calls.length).toBe(1);
  await openCollection(page);
  await page.clock.fastForward(76_000);
  await expect(page.getByText(/Proses terlalu lama/i)).toBeVisible();
  await expect(page.getByText('Sedang diproses: bank', { exact: true })).toHaveCount(0);
  await expect.poll(async () => (await savedDb(page)).entries[0]?.status).toBe('error');
  expect(lookup.calls).toHaveLength(1);
});

// Lanjutan 2: membuka entri yang sama, tanpa mengulang permintaan model.
test('open now shows only the submitted batch and repeated clicks send it once', async ({ page, lookup }) => {
  const previous = result('bank');
  previous.candidates[0].meaning_id = 'Arti dari pencarian lama';
  await seed(page, [{
    id: 'old-bank', bookId: BOOK_ID, word: 'bank', status: 'done', result: previous,
    known: false, stage: 0, dueAt: Date.now() + 86_400_000, createdAt: 2,
  }]);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Buka sekarang', exact: true })).toBeDisabled();
  await preparePhoto(page, ['bank', 'bright']);
  // Two clicks in the same event turn also exercise the synchronous submit guard.
  await page.getByRole('button', { name: 'Buka sekarang', exact: true }).evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
  await expect(page).toHaveURL(/\/kata\?entry=/);
  await expect(page.getByRole('heading', { name: 'Peta makna', exact: true })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('2 kata masih diproses');
  await expect(page.getByText('Sedang diproses: bank', { exact: true })).toBeVisible();
  await expect(page.getByText('Sedang diproses: bright', { exact: true })).toBeVisible();
  await expect(page.locator('article')).toHaveCount(0);
  await expect.poll(() => lookup.calls.length).toBe(1);
  const ids = new URL(page.url()).searchParams.getAll('entry');
  expect(ids).toHaveLength(2);
  expect(ids).not.toContain('old-bank');

  await lookup.reply(0, [result('bright'), result('bank')]);
  await expect(page.locator('article')).toHaveCount(2);
  await expect(page.getByText('Arti dari pencarian lama', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveCount(0);
  expect((await savedDb(page)).entries).toHaveLength(3);
  await page.reload();
  await expect(page.locator('article')).toHaveCount(2);
  await page.getByRole('link', { name: 'Lihat semua kata', exact: true }).click();
  await expect(page).toHaveURL('/kata');
  await expect(page.locator('article')).toHaveCount(3);
  expect(lookup.calls).toHaveLength(1);
});

test('deferred save keeps meanings hidden and its ready link reuses the saved entry', async ({ page, lookup }) => {
  await seed(page);
  await page.goto('/');
  await submit(page, ['bank']);
  await expect(page).toHaveURL('/');
  const recent = page.getByRole('region', { name: 'Kata terbaru', exact: true });
  await expect(recent).toContainText('Diproses');
  await lookup.reply(0, [result('bank')]);
  await expect(recent).toContainText('Siap dibuka');
  await expect(page).toHaveURL('/');
  await expect(page.getByText('Makna uji bank', { exact: true })).toHaveCount(0);

  await recent.getByRole('link', { name: 'Buka sekarang: bank', exact: true }).click();
  await expect(card(page, 'bank')).toContainText('Makna uji bank');
  await page.getByRole('link', { name: 'Lanjut baca', exact: true }).click();
  await expect(page).toHaveURL('/');
  // The link also survives a full reload because it is derived from the collection.
  await page.reload();
  await page.getByRole('link', { name: 'Buka sekarang: bank', exact: true }).click();
  await expect(card(page, 'bank')).toBeVisible();
  expect(lookup.calls).toHaveLength(1);
  expect((await savedDb(page)).entries).toHaveLength(1);
});

test('a deferred pending word can be opened and displays failures without resubmission', async ({ page, lookup }) => {
  await seed(page);
  await page.goto('/');
  await submit(page, ['bank', 'bright']);
  await page.getByRole('link', { name: 'Buka sekarang: bright', exact: true }).click();
  await expect(page.getByText('Sedang diproses: bright', { exact: true })).toBeVisible();
  await expect(page.getByText('Sedang diproses: bank', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText('1 kata masih diproses');
  await lookup.fail(0);
  await expect(page.getByText(/Gagal menghubungi server/)).toBeVisible();
  await expect(page.getByRole('status')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Pilih ulang foto', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Lanjut baca', exact: true }).click();
  await page.getByRole('link', { name: 'Buka sekarang: bright', exact: true }).click();
  await expect(page.getByText(/Gagal menghubungi server/)).toBeVisible();
  expect(lookup.calls).toHaveLength(1);
  expect((await savedDb(page)).entries).toHaveLength(2);
});

test('open now stays on capture if the queue cannot be saved', async ({ page, lookup }) => {
  await seed(page);
  await page.goto('/');
  await preparePhoto(page, ['bank']);
  await failStorageWrites(page, true);
  await page.getByRole('button', { name: 'Buka sekarang', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: /Perubahan belum disimpan/ })).toBeVisible();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('img', { name: 'halaman', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /^bank/ })).toBeVisible();
  expect(lookup.calls).toHaveLength(0);
  expect((await savedDb(page)).entries).toHaveLength(0);

  await failStorageWrites(page, false);
  await page.getByRole('button', { name: 'Buka sekarang', exact: true }).click();
  await expect(page).toHaveURL(/\/kata\?entry=/);
  await lookup.reply(0, [result('bank')]);
  await expect(card(page, 'bank')).toBeVisible();
  expect(lookup.calls).toHaveLength(1);
  expect((await savedDb(page)).entries).toHaveLength(1);
});

test('missing selected entries show an explanation without opening unrelated results', async ({ page, lookup }) => {
  await seed(page, [{
    id: 'existing-bank', bookId: BOOK_ID, word: 'bank', status: 'done', result: result('bank'),
    known: false, stage: 0, dueAt: Date.now() + 86_400_000, createdAt: 2,
  }]);
  await page.goto('/kata?entry=missing');
  await expect(page.getByText(/Kata yang kamu buka tidak ada di koleksi/)).toBeVisible();
  await expect(page.locator('article')).toHaveCount(0);
  await page.getByRole('link', { name: 'Lihat semua kata', exact: true }).click();
  await expect(card(page, 'bank')).toBeVisible();

  await page.goto('/kata?entry=existing-bank&entry=missing&entry=existing-bank');
  await expect(page.getByText(/Sebagian kata yang kamu buka sudah tidak ada/)).toBeVisible();
  await expect(page.locator('article')).toHaveCount(1);
  expect(lookup.calls).toHaveLength(0);
});
