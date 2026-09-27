import { test, expect, type Page } from '@playwright/test';
import type { Db, Entry } from '../lib/store';
import type { LookupResult } from '../lib/types';

// Alur cadangan di browser sungguhan: simpan berkas, pilih berkas, gabungkan,
// ganti. Yang paling penting diuji bukan tombolnya, melainkan bahwa koleksi
// lama tidak hilang tanpa diminta.

const KEY = 'lema.v1';

function result(word: string): LookupResult {
  return {
    word,
    lemma: word,
    is_phrase: false,
    found: true,
    page_excerpt: 'Halaman uji cadangan.',
    sentence: `A page sentence with ${word}.`,
    ambiguous: false,
    candidates: [{
      meaning_id: `Makna ${word}`,
      meaning_en: `meaning of ${word}`,
      confidence: 0.9,
      trigger: 'page sentence',
      why_id: 'Alasan uji.',
    }],
    other_senses: [{ meaning_id: 'makna lain', meaning_en: 'another sense' }],
    caution_id: '',
    new_sentence: `A new sentence with ${word}.`,
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

const HERE: Db = {
  books: [{ id: 'b1', title: 'Sapiens', createdAt: 1 }],
  entries: [entry({ id: 'e1', bookId: 'b1', word: 'ubiquitous' })],
  activeBookId: 'b1',
};

const ELSEWHERE: Db = {
  books: [{ id: 'b2', title: 'Educated', createdAt: 2 }],
  entries: [
    entry({ id: 'e2', bookId: 'b2', word: 'candour' }),
    entry({ id: 'e3', bookId: 'b2', word: 'forbearance' }),
  ],
  activeBookId: 'b2',
};

async function seed(page: Page, db: Db) {
  // Hanya menanam kalau memang masih kosong. addInitScript berjalan pada
  // setiap navigasi, jadi menulis tanpa syarat akan mengembalikan koleksi ke
  // keadaan awal setiap kali pengujian berpindah halaman.
  await page.addInitScript(({ key, value }) => {
    if (localStorage.getItem(key) === null) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }, { key: KEY, value: db });
}

const stored = (page: Page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null') as Db, KEY);

const backupFile = (db: Db, name = 'lema-cadangan.json') => ({
  name,
  mimeType: 'application/json',
  buffer: Buffer.from(JSON.stringify({ lema: 1, exportedAt: 1_700_000_000_000, db })),
});

test('cadangan bisa diunduh, dan isinya koleksi yang sedang dipakai', async ({ page }) => {
  await seed(page, HERE);
  await page.goto('/data');

  await expect(page.getByRole('heading', { name: 'Cadangan koleksi' })).toBeVisible();

  const download = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Simpan cadangan' }).click(),
  ]).then(([d]) => d);

  expect(download.suggestedFilename()).toMatch(/^lema-\d{4}-\d{2}-\d{2}\.json$/);

  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  const saved = JSON.parse(Buffer.concat(chunks).toString('utf8'));

  expect(saved.lema).toBe(1);
  expect(saved.db.books).toHaveLength(1);
  expect(saved.db.entries[0].word).toBe('ubiquitous');
});

test('ekspor CSV memuat baris judul dan satu baris per kata', async ({ page }) => {
  await seed(page, HERE);
  await page.goto('/data');

  const download = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Ekspor buat Anki (.csv)' }).click(),
  ]).then(([d]) => d);

  expect(download.suggestedFilename()).toMatch(/\.csv$/);
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  const text = Buffer.concat(chunks).toString('utf8');

  expect(text.split('\r\n')).toHaveLength(2);
  expect(text).toContain('ubiquitous');
  expect(text).toContain('Sapiens');
});

test('impor menggabungkan koleksi lain tanpa membuang yang sudah ada', async ({ page }) => {
  await seed(page, HERE);
  await page.goto('/data');

  await page.getByLabel('Pilih berkas cadangan').setInputFiles(backupFile(ELSEWHERE));

  // Isinya ditunjukkan dulu. Belum ada yang berubah pada tahap ini.
  await expect(page.getByText('Berisi 1 buku dan 2 kata')).toBeVisible();
  expect((await stored(page)).entries).toHaveLength(1);

  await page.getByRole('button', { name: 'Gabung ke koleksi' }).click();
  await expect(page.getByText('2 kata baru masuk')).toBeVisible();

  const after = await stored(page);
  expect(after.entries.map((e) => e.word).sort()).toEqual(['candour', 'forbearance', 'ubiquitous']);
  expect(after.books.map((b) => b.title)).toEqual(['Sapiens', 'Educated']);
  // Buku yang sedang dibaca di perangkat ini tidak digeser oleh berkas.
  expect(after.activeBookId).toBe('b1');
});

test('mengimpor berkas yang sama dua kali tidak menggandakan kata', async ({ page }) => {
  await seed(page, HERE);
  await page.goto('/data');

  for (let round = 0; round < 2; round += 1) {
    await page.getByLabel('Pilih berkas cadangan').setInputFiles(backupFile(HERE));
    await page.getByRole('button', { name: 'Gabung ke koleksi' }).click();
    await expect(page.getByRole('status')).toBeVisible();
  }

  await expect(page.getByText('1 kata dilewati karena sudah ada')).toBeVisible();
  expect((await stored(page)).entries).toHaveLength(1);
});

test('mengganti seluruh koleksi butuh konfirmasi kedua', async ({ page }) => {
  await seed(page, HERE);
  await page.goto('/data');
  await page.getByLabel('Pilih berkas cadangan').setInputFiles(backupFile(ELSEWHERE));

  // Ketukan pertama belum menghapus apa pun.
  await page.getByRole('button', { name: 'Ganti semua' }).click();
  expect((await stored(page)).entries.map((e) => e.word)).toEqual(['ubiquitous']);

  // Langkah kedua menyebut angkanya terang terangan.
  const confirm = page.getByRole('button', { name: 'Ya, buang 1 kata yang sekarang' });
  await expect(confirm).toBeVisible();
  await confirm.click();

  await expect(page.getByText('Koleksi diganti')).toBeVisible();
  const after = await stored(page);
  expect(after.entries.map((e) => e.word)).toEqual(['candour', 'forbearance']);
  expect(after.books.map((b) => b.title)).toEqual(['Educated']);
});

test('batal membuang berkas yang sudah dipilih tanpa mengubah koleksi', async ({ page }) => {
  await seed(page, HERE);
  await page.goto('/data');
  await page.getByLabel('Pilih berkas cadangan').setInputFiles(backupFile(ELSEWHERE));

  await page.getByRole('button', { name: 'Batal' }).click();
  await expect(page.getByRole('button', { name: 'Gabung ke koleksi' })).toBeHidden();
  expect((await stored(page)).entries).toHaveLength(1);
});

test('berkas yang bukan cadangan Lema ditolak dan koleksi tidak tersentuh', async ({ page }) => {
  await seed(page, HERE);
  await page.goto('/data');

  await page.getByLabel('Pilih berkas cadangan').setInputFiles({
    name: 'catatan.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{ "catatan": "ini bukan koleksi" }'),
  });

  // Dicari di dalam bagiannya, karena Next.js juga memasang role="alert"
  // tersembunyi untuk mengumumkan perpindahan halaman.
  const section = page.getByRole('region', { name: 'Pulihkan dari berkas' });
  await expect(section.getByRole('alert')).toContainText('buku dan daftar kata');
  await expect(page.getByRole('button', { name: 'Gabung ke koleksi' })).toBeHidden();
  expect((await stored(page)).entries).toHaveLength(1);
});

test('jalan ke cadangan bisa ditemukan dari beranda di layar HP', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page, HERE);
  await page.goto('/');

  await page.getByRole('link', { name: /Simpan cadangan koleksi/ }).click();
  await expect(page).toHaveURL(/\/data$/);
});

test('jalan ke cadangan ada di sidebar layar laptop', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await seed(page, HERE);
  await page.goto('/');

  await page.getByRole('link', { name: 'Cadangan koleksi' }).click();
  await expect(page).toHaveURL(/\/data$/);
});
