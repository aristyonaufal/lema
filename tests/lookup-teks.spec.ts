import { test, expect, type Page, type Route } from '@playwright/test';
import type { Db } from '../lib/store';
import type { LookupResult } from '../lib/types';

// Tahap B: ketuk kata di pustaka untuk membuka maknanya.
//
// Model tidak pernah benar benar dipanggil di sini. Yang diuji alurnya: apa
// yang dikirim ke /api/lookup, apa yang terjadi selama menunggu, dan ke mana
// katanya mendarat sesudahnya.

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

function hasil(word: string): LookupResult {
  return {
    word,
    lemma: word,
    is_phrase: word.includes(' '),
    found: true,
    page_excerpt: '',
    sentence: `A sentence that contains ${word}.`,
    ambiguous: false,
    candidates: [{
      meaning_id: `Makna uji ${word}`,
      meaning_en: `test meaning of ${word}`,
      confidence: 0.88,
      trigger: 'contains',
      why_id: 'Konteks uji menentukan maknanya.',
    }],
    other_senses: [{ meaning_id: 'makna lain', meaning_en: 'another sense' }],
    caution_id: '',
    new_sentence: `Another topic also uses ${word}.`,
  };
}

/** Menangkap permintaan ke API dan membalasnya sendiri. */
async function tiruApi(page: Page, balas: (form: Record<string, string>) => unknown, tunda = 0) {
  const terkirim: Record<string, string>[] = [];
  await page.route('**/api/lookup', async (route: Route) => {
    const body = route.request().postData() ?? '';
    // Multipart sederhana: yang dibutuhkan cuma nama dan isi tiap bagian.
    const form: Record<string, string> = {};
    for (const bagian of body.split(/------[^\r\n]*/)) {
      const nama = bagian.match(/name="([^"]+)"/)?.[1];
      const isi = bagian.split('\r\n\r\n')[1]?.replace(/\r\n$/, '');
      if (nama && isi !== undefined) form[nama] = isi;
    }
    terkirim.push(form);
    if (tunda) await new Promise((r) => setTimeout(r, tunda));
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(balas(form)) });
  });
  return terkirim;
}

const sukses = (form: Record<string, string>) => ({
  ok: true,
  model: 'gemini-3.5-flash',
  results: [hasil(form.word ?? '')],
  used: 1,
  limit: 60,
  ms: 900,
});

// Mengetuk tepat di tengah sebuah kata di dalam paragraf pertama.
async function ketukKata(page: Page, kata: string) {
  const titik = await page.evaluate((cari) => {
    const p = document.querySelector('[data-paragraf="0"]') as HTMLElement;
    const teks = p.firstChild as Text;
    const at = teks.data.indexOf(cari);
    const range = document.createRange();
    range.setStart(teks, at);
    range.setEnd(teks, at + cari.length);
    const r = range.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, kata);
  await page.mouse.move(titik.x, titik.y);
  await page.mouse.down();
  await page.mouse.up();
}

test('ketuk satu kata mengirim kata itu beserta paragrafnya, tanpa foto', async ({ page }) => {
  const terkirim = await tiruApi(page, sukses);
  await seed(page, KOSONG);
  await page.goto('/pustaka/alice');
  await expect(page.getByText(/Alice was beginning to get very tired/)).toBeVisible();

  await ketukKata(page, 'peeped');

  await expect.poll(() => terkirim.length).toBe(1);
  expect(terkirim[0].mode).toBe('text');
  expect(terkirim[0].word).toBe('peeped');
  // Konteksnya paragraf utuh, bukan cuma katanya.
  expect(terkirim[0].context).toContain('Alice was beginning to get very tired');
  expect(terkirim[0].context.length).toBeGreaterThan(200);
  expect(terkirim[0].image).toBeUndefined();
});

test('panel terbuka seketika dan menunggu jawabannya di tempat', async ({ page }) => {
  // Median mode teks 14 detik. Panel yang menahan diri sampai jawabannya
  // datang berarti pembaca menatap layar diam selama itu.
  await tiruApi(page, sukses, 1200);
  await seed(page, KOSONG);
  await page.goto('/pustaka/alice');
  await expect(page.getByText(/Alice was beginning/)).toBeVisible();

  await ketukKata(page, 'peeped');

  const panel = page.getByRole('dialog', { name: /Makna peeped/ });
  await expect(panel).toBeVisible();
  await expect(panel.getByText(/Sedang diproses/)).toBeVisible();

  await expect(panel.getByRole('heading', { name: 'Makna uji peeped' })).toBeVisible();
  await expect(panel.getByText(/A sentence that contains peeped/)).toBeVisible();
});

test('kata dari pustaka mendarat di koleksi buku itu', async ({ page }) => {
  await tiruApi(page, sukses);
  await seed(page, KOSONG);
  await page.goto('/pustaka/alice');
  await expect(page.getByText(/Alice was beginning/)).toBeVisible();

  await ketukKata(page, 'peeped');
  await expect(page.getByRole('heading', { name: 'Makna uji peeped' })).toBeVisible();

  const db = await stored(page);
  const buku = db.books.find((b) => b.pustaka === 'alice')!;
  const entri = db.entries.find((e) => e.word === 'peeped')!;
  expect(entri.bookId).toBe(buku.id);
  expect(entri.status).toBe('done');
  // Masuk jadwal review seperti kata dari foto.
  expect(entri.dueAt).toBeGreaterThan(0);

  await page.goto('/kata');
  await expect(page.getByRole('button', { name: /peeped/ })).toBeVisible();
});

test('menyapu beberapa kata menawarkan frasa, bukan langsung mencari', async ({ page }) => {
  const terkirim = await tiruApi(page, sukses);
  await seed(page, KOSONG);
  await page.goto('/pustaka/alice');
  await expect(page.getByText(/Alice was beginning/)).toBeVisible();

  await page.evaluate(() => {
    const p = document.querySelector('[data-paragraf="0"]') as HTMLElement;
    const teks = p.firstChild as Text;
    const at = teks.data.indexOf('once or twice');
    const range = document.createRange();
    range.setStart(teks, at);
    range.setEnd(teks, at + 'once or twice'.length);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
    // Titiknya diambil dari sapuannya sendiri, bukan angka karangan: tombol
    // melayang muncul di situ, dan koordinat di luar kolom baca akan mendarat
    // di bawah sidebar.
    const r = range.getBoundingClientRect();
    p.dispatchEvent(new PointerEvent('pointerup', {
      bubbles: true,
      clientX: r.x + r.width / 2,
      clientY: r.y + r.height / 2,
    }));
  });

  // Belum ada yang dikirim: sapuan masih bisa digeser pegangannya.
  const tombol = page.getByRole('button', { name: /Cari makna/ });
  await expect(tombol).toBeVisible();
  expect(terkirim).toHaveLength(0);

  await tombol.click();
  await expect.poll(() => terkirim.length).toBe(1);
  expect(terkirim[0].word).toBe('once or twice');
});

test('menggulir tidak dianggap ketukan', async ({ page }) => {
  const terkirim = await tiruApi(page, sukses);
  await seed(page, KOSONG);
  await page.goto('/pustaka/alice');
  await expect(page.getByText(/Alice was beginning/)).toBeVisible();

  const kotak = await page.locator('[data-paragraf="0"]').boundingBox();
  await page.mouse.move(kotak!.x + 40, kotak!.y + 10);
  await page.mouse.down();
  await page.mouse.move(kotak!.x + 40, kotak!.y - 180, { steps: 8 });
  await page.mouse.up();

  await page.waitForTimeout(400);
  expect(terkirim).toHaveLength(0);
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('kegagalan model dijelaskan di panel, bukan dibiarkan menggantung', async ({ page }) => {
  await tiruApi(page, () => ({ ok: false, error: 'Model lagi penuh. Coba lagi sebentar.' }));
  await seed(page, KOSONG);
  await page.goto('/pustaka/alice');
  await expect(page.getByText(/Alice was beginning/)).toBeVisible();

  await ketukKata(page, 'peeped');

  const panel = page.getByRole('dialog');
  await expect(panel.getByText('Gagal')).toBeVisible();
  await expect(panel.getByText(/Model lagi penuh/)).toBeVisible();
});

test('panel bisa ditutup dan teksnya tetap di tempat yang sama', async ({ page }) => {
  await tiruApi(page, sukses);
  await seed(page, KOSONG);
  await page.goto('/pustaka/alice');
  await expect(page.getByText(/Alice was beginning/)).toBeVisible();

  await ketukKata(page, 'peeped');
  await expect(page.getByRole('dialog')).toBeVisible();

  await page.getByRole('button', { name: 'Tutup makna' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByText(/Alice was beginning/)).toBeVisible();
});

test('makna dari pustaka bisa dibetulkan di tempat', async ({ page }) => {
  await tiruApi(page, sukses);
  await seed(page, KOSONG);
  await page.goto('/pustaka/alice');
  await expect(page.getByText(/Alice was beginning/)).toBeVisible();

  await ketukKata(page, 'peeped');
  await expect(page.getByRole('heading', { name: 'Makna uji peeped' })).toBeVisible();

  await page.getByRole('button', { name: 'Bukan ini maknanya' }).click();
  await page.getByRole('button', { name: /makna lain/ }).click();

  // exact membedakan makna yang dipilih dari judul bagian "Makna lain".
  await expect(page.getByRole('heading', { name: 'makna lain', exact: true })).toBeVisible();
  expect((await stored(page)).entries[0].correction?.source).toBe('lain');
});

// Validasi di sisi server. Permintaan yang ditolak di sini tidak pernah sampai
// ke model, jadi tidak memakan jatah harian siapa pun dan tidak perlu kunci API.
test('permintaan mode teks tanpa kata ditolak dengan alasan yang bisa dibaca', async ({ request }) => {
  const form = new FormData();
  form.set('mode', 'text');
  form.set('context', 'They suffered for want of bread that winter.');
  const res = await request.post('/api/lookup', { multipart: form });

  expect(res.status()).toBe(400);
  expect((await res.json()).error).toContain('Belum ada kata');
});

test('permintaan mode teks tanpa paragraf ditolak, bukan dikirim tanpa konteks', async ({ request }) => {
  // Mengirimnya tanpa konteks berarti meminta model menebak makna tanpa bahan,
  // dan itu persis yang dilakukan kamus biasa.
  const form = new FormData();
  form.set('mode', 'text');
  form.set('word', 'want');
  const res = await request.post('/api/lookup', { multipart: form });

  expect(res.status()).toBe(400);
  expect((await res.json()).error).toContain('Paragraf');
});

test('mode foto tetap menuntut fotonya ada', async ({ request }) => {
  const form = new FormData();
  form.set('words', JSON.stringify(['want']));
  const res = await request.post('/api/lookup', { multipart: form });

  expect(res.status()).toBe(400);
  expect((await res.json()).error).toContain('Foto halaman');
});
