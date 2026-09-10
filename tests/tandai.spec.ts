import { test, expect, type Page, type Route } from '@playwright/test';
import type { Db } from '../lib/store';
import type { LookupResult } from '../lib/types';

// Mode tandai: kata dipilih tanpa mengetik, lewat ketukan di foto atau lewat
// coretan pensil di buku. Semua pengujian di sini mencegat /api/lookup, jadi
// tidak ada yang memanggil model sungguhan. Ketepatan model membaca penanda
// dan coretan belum diuji di sini dan harus diuji dengan halaman buku asli.

const KEY = 'lema.v1';
const BOOK = 'tandai-buku';

function result(word: string): LookupResult {
  return {
    word,
    lemma: word,
    is_phrase: word.includes(' '),
    found: true,
    page_excerpt: 'She made out the shape of a house in the fog.',
    sentence: 'She made out the shape of a house in the fog.',
    ambiguous: false,
    candidates: [{
      meaning_id: `Makna uji ${word}`,
      meaning_en: `Test meaning of ${word}`,
      confidence: 0.9,
      trigger: 'in the fog',
      why_id: 'Konteks uji membantu menentukan arti.',
    }],
    other_senses: [],
    caution_id: '',
    new_sentence: `Another topic also uses ${word}.`,
  };
}

async function seed(page: Page) {
  const db: Db = { books: [{ id: BOOK, title: 'Buku uji tandai', createdAt: 1 }], activeBookId: BOOK, entries: [] };
  await page.addInitScript(({ key, value }) => {
    if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(value));
  }, { key: KEY, value: db });
}

async function savedDb(page: Page): Promise<Db> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), KEY);
}

// Halaman tiruan yang cukup besar untuk diketuk. Foto 1x1 piksel yang dipakai
// pengujian lain akan tergambar sebesar satu piksel dan tidak bisa ditandai.
async function pagePhoto(page: Page) {
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 800;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 600, 800);
    ctx.fillStyle = '#111111';
    ctx.font = '24px serif';
    for (let line = 0; line < 20; line += 1) {
      ctx.fillText('She made out the shape of a house in the fog.', 30, 60 + line * 36);
    }
    return canvas.toDataURL('image/png').split(',')[1];
  });
  return { name: 'halaman.png', mimeType: 'image/png', buffer: Buffer.from(base64, 'base64') };
}

// Isi satu kolom teks dari badan multipart. Kepala tiap bagian selalu ASCII,
// jadi tetap terbaca walaupun bagian gambarnya berupa data biner.
function field(route: Route, name: string): string | null {
  const body = route.request().postData() ?? '';
  const match = body.match(new RegExp(`name="${name}"\\r\\n\\r\\n([^\\r]*)`));
  return match ? match[1] : null;
}

function imageName(route: Route): string | null {
  const body = route.request().postData() ?? '';
  const match = body.match(/name="image"; filename="([^"]+)"/);
  return match ? match[1] : null;
}

test('ketukan di foto menaruh penanda bernomor, bisa dihapus, dan dibatasi lima', async ({ page }) => {
  await seed(page);
  await page.route('**/api/lookup', (route) => route.abort());
  await page.goto('/baca');

  // Mode tandai adalah bawaan: tidak mengetik adalah jalan utamanya.
  await expect(page.getByRole('radio', { name: 'Tandai di foto' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByPlaceholder('Kata atau frasa yang bikin berhenti')).toHaveCount(0);

  await page.locator('input[type="file"]').setInputFiles(await pagePhoto(page));
  const photo = page.getByRole('img', { name: 'halaman' });
  await photo.click({ position: { x: 80, y: 120 } });
  await photo.click({ position: { x: 220, y: 300 } });

  const markers = page.getByRole('button', { name: /^Hapus penanda/ });
  await expect(markers).toHaveCount(2);
  await expect(page.getByText('2 dari 5 penanda')).toBeVisible();

  // Menghapus penanda pertama merapatkan nomornya lagi, supaya nomor di layar
  // tetap sama dengan nomor yang nanti digambar ke foto.
  await page.getByRole('button', { name: 'Hapus penanda 1' }).click();
  await expect(markers).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Hapus penanda 1' })).toBeVisible();

  for (const [x, y] of [[60, 400], [300, 80], [120, 480], [340, 200], [200, 520]]) {
    await photo.click({ position: { x, y } });
  }
  await expect(markers).toHaveCount(5);
  await expect(page.getByText(/batas satu foto/)).toBeVisible();
});

test('foto bertanda dikirim tanpa daftar kata, lalu kata temuan menggantikan penampung', async ({ page }) => {
  await seed(page);
  const calls: Route[] = [];
  let release = () => {};
  const held = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/api/lookup', async (route) => {
    calls.push(route);
    await held;
    await route.fulfill({ json: { ok: true, results: [result('made out'), result('fog')], ms: 10 } });
  });
  await page.goto('/baca');

  await page.locator('input[type="file"]').setInputFiles(await pagePhoto(page));
  const photo = page.getByRole('img', { name: 'halaman' });
  await photo.click({ position: { x: 80, y: 120 } });
  await photo.click({ position: { x: 220, y: 300 } });
  await page.getByRole('button', { name: 'Simpan & lihat makna', exact: true }).click();

  // Layar pindah seketika, sebelum model menjawab.
  await expect(page).toHaveURL(/\/kata\?entry=/);
  await expect(page.getByText('Lagi mencari kata yang kamu tandai di foto…')).toBeVisible();

  await expect.poll(() => calls.length).toBe(1);
  expect(field(calls[0], 'mode')).toBe('marked');
  expect(field(calls[0], 'markers')).toBe('2');
  // Tidak ada kata yang dikirim: modelnya yang menemukan.
  expect(field(calls[0], 'words')).toBeNull();
  // Yang dikirim adalah foto yang sudah digambari penanda, bukan foto polos.
  expect(imageName(calls[0])).toBe('halaman-bertanda.jpg');

  release();
  await expect(page.locator('article')).toHaveCount(2);
  await expect(page.getByRole('heading', { name: 'made out', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'fog', exact: true })).toBeVisible();

  const saved = await savedDb(page);
  expect(saved.entries.map((e) => e.word)).toEqual(['made out', 'fog']);
  expect(saved.entries.every((e) => e.marked === true && e.status === 'done')).toBe(true);
  // Semua kata dari satu foto berbagi satu batch, yaitu id penampungnya, dan
  // penampung itu sendiri tidak ikut tersimpan sebagai kata ketiga.
  expect(new Set(saved.entries.map((e) => e.batch)).size).toBe(1);
  expect(saved.entries.some((e) => e.word === 'Kata yang kamu tandai')).toBe(false);
  expect(new URL(page.url()).searchParams.get('entry')).toBe(saved.entries[0].batch);
});

test('tanpa ketukan, foto dikirim polos supaya Lema mencari coretan pensil', async ({ page }) => {
  await seed(page);
  const calls: Route[] = [];
  await page.route('**/api/lookup', (route) => { calls.push(route); });
  await page.goto('/baca');

  await page.locator('input[type="file"]').setInputFiles(await pagePhoto(page));
  await expect(page.getByRole('status')).toContainText('mencari coretan');
  await expect(page.getByRole('button', { name: 'Simpan, lanjut baca' })).toBeEnabled();
  await page.getByRole('button', { name: 'Simpan, lanjut baca' }).click();

  await expect.poll(() => calls.length).toBe(1);
  expect(field(calls[0], 'mode')).toBe('marked');
  expect(field(calls[0], 'markers')).toBe('0');
  // Tanpa penanda, foto tidak digambar ulang; coretan pensilnya dibaca apa adanya.
  expect(imageName(calls[0])).toBe('halaman.jpg');
});

test('foto tanpa tanda yang terbaca menjadi galat yang menjelaskan, bukan hilang', async ({ page }) => {
  await seed(page);
  await page.route('**/api/lookup', (route) => route.fulfill({ json: { ok: true, results: [], ms: 10 } }));
  await page.goto('/baca');

  await page.locator('input[type="file"]').setInputFiles(await pagePhoto(page));
  await page.getByRole('button', { name: 'Simpan & lihat makna', exact: true }).click();

  await expect(page.getByText(/belum menemukan kata yang kamu tandai/)).toBeVisible();
  // Jalan keluarnya ditawarkan, bukan cuma pesan buntu.
  await expect(page.getByRole('link', { name: 'Pilih ulang foto', exact: true })).toHaveAttribute('href', '/baca');
  const saved = await savedDb(page);
  expect(saved.entries).toHaveLength(1);
  expect(saved.entries[0].status).toBe('error');
});

test('pilihan cara menandai diingat setelah halaman dimuat ulang', async ({ page }) => {
  await seed(page);
  await page.route('**/api/lookup', (route) => route.abort());
  await page.goto('/baca');

  await page.getByRole('radio', { name: 'Ketik kata' }).click();
  await expect(page.getByPlaceholder('Kata atau frasa yang bikin berhenti')).toBeVisible();

  await page.reload();
  await expect(page.getByRole('radio', { name: 'Ketik kata' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByPlaceholder('Kata atau frasa yang bikin berhenti')).toBeVisible();
});
