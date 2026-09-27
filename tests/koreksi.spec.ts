import { test, expect, type Page } from '@playwright/test';
import type { Db, Entry } from '../lib/store';
import type { LookupResult } from '../lib/types';

// Membetulkan makna yang salah dipilih model.
//
// Sebelum ini, satu satunya tanggapan yang tersedia untuk jawaban yang keliru
// adalah menghapus katanya, dan itu ikut membuang kalimat asal dari buku. Yang
// diuji di sini: koreksi berlaku di semua layar, jawaban model tetap tersimpan,
// dan koreksinya bisa dibatalkan.

const KEY = 'lema.v1';

// "want" di buku abad ke-19 berarti kekurangan, bukan menginginkan. Ini kasus
// yang memang muncul di uji akurasi, jadi dipakai juga di sini.
function wantResult(): LookupResult {
  return {
    word: 'want',
    lemma: 'want',
    is_phrase: false,
    found: true,
    page_excerpt: 'They suffered for want of bread that winter.',
    sentence: 'They suffered for want of bread that winter.',
    ambiguous: false,
    candidates: [{
      meaning_id: 'menginginkan sesuatu',
      meaning_en: 'to desire something',
      confidence: 0.72,
      trigger: 'suffered',
      why_id: 'Model mengira ini soal keinginan.',
    }],
    other_senses: [
      { meaning_id: 'kekurangan atau ketiadaan', meaning_en: 'lack or absence' },
      { meaning_id: 'kebutuhan yang mendesak', meaning_en: 'a pressing need' },
    ],
    caution_id: '',
    new_sentence: 'The garden died for want of rain.',
  };
}

function entry(over: Partial<Entry> & Pick<Entry, 'id' | 'bookId' | 'word'>): Entry {
  return {
    status: 'done',
    result: wantResult(),
    known: false,
    stage: 0,
    dueAt: Date.now() + 30 * 86_400_000,
    createdAt: 10,
    ...over,
  };
}

const DB: Db = {
  books: [{ id: 'b1', title: 'Middlemarch', createdAt: 1 }],
  entries: [entry({ id: 'e1', bookId: 'b1', word: 'want' })],
  activeBookId: 'b1',
};

async function seed(page: Page, db: Db = DB) {
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

// Kartu dibuka lewat tampilan terfokus, yang memang selalu terbuka penuh.
const openCard = async (page: Page) => page.goto('/kata?entry=e1');

test('makna lain bisa dipilih jadi yang benar dengan satu ketukan', async ({ page }) => {
  await seed(page);
  await openCard(page);

  await expect(page.getByRole('heading', { name: 'menginginkan sesuatu' })).toBeVisible();

  await page.getByRole('button', { name: 'Bukan ini maknanya' }).click();
  await page.getByRole('button', { name: /kekurangan atau ketiadaan/ }).click();

  await expect(page.getByRole('heading', { name: 'kekurangan atau ketiadaan' })).toBeVisible();
  await expect(page.getByText('Kamu betulkan').first()).toBeVisible();
  // Jawaban model tidak dihapus, cuma turun jadi catatan.
  await expect(page.getByText('Model tadinya menjawab')).toContainText('menginginkan sesuatu');

  const after = await stored(page);
  expect(after.entries[0].correction).toMatchObject({
    meaning_id: 'kekurangan atau ketiadaan',
    meaning_en: 'lack or absence',
    source: 'lain',
  });
  // Jawaban model tetap utuh di penyimpanan, supaya masih bisa diperiksa.
  expect(after.entries[0].result?.candidates[0].meaning_id).toBe('menginginkan sesuatu');
});

test('makna bisa ditulis sendiri kalau model tidak menyebutnya sama sekali', async ({ page }) => {
  await seed(page);
  await openCard(page);

  await page.getByRole('button', { name: 'Bukan ini maknanya' }).click();
  await page.getByLabel('Atau tulis sendiri').fill('serba kekurangan');
  await page.getByLabel('Makna dalam Bahasa Inggris, boleh dikosongkan').fill('destitution');
  await page.getByRole('button', { name: 'Simpan makna ini' }).click();

  await expect(page.getByRole('heading', { name: 'serba kekurangan' })).toBeVisible();
  expect((await stored(page)).entries[0].correction).toMatchObject({
    meaning_id: 'serba kekurangan',
    meaning_en: 'destitution',
    source: 'sendiri',
  });
});

test('koreksi bisa dibatalkan dan jawaban model kembali', async ({ page }) => {
  await seed(page, {
    ...DB,
    entries: [entry({
      id: 'e1',
      bookId: 'b1',
      word: 'want',
      correction: { meaning_id: 'kekurangan', meaning_en: 'lack', source: 'lain', at: 5 },
    })],
  });
  await openCard(page);

  await expect(page.getByRole('heading', { name: 'kekurangan' })).toBeVisible();
  await page.getByRole('button', { name: 'Kembalikan jawaban model' }).click();

  await expect(page.getByRole('heading', { name: 'menginginkan sesuatu' })).toBeVisible();
  await expect(page.getByText('Kamu betulkan')).toBeHidden();
  expect((await stored(page)).entries[0].correction).toBeUndefined();
});

test('makna yang dibetulkan ikut terbaca di daftar koleksi', async ({ page }) => {
  await seed(page);
  await openCard(page);
  await page.getByRole('button', { name: 'Bukan ini maknanya' }).click();
  await page.getByRole('button', { name: /kekurangan atau ketiadaan/ }).click();

  await page.goto('/kata');
  // Baris ringkas menampilkan makna yang berlaku, bukan jawaban lama model.
  await expect(page.getByText('kekurangan atau ketiadaan')).toBeVisible();
  await expect(page.getByText('menginginkan sesuatu')).toBeHidden();
  await expect(page.getByText('Kamu betulkan')).toBeVisible();
});

test('kuis memakai makna yang dibetulkan sebagai jawaban benar', async ({ page }) => {
  await seed(page, {
    ...DB,
    entries: [entry({
      id: 'e1',
      bookId: 'b1',
      word: 'want',
      correction: { meaning_id: 'kekurangan atau ketiadaan', meaning_en: 'lack', source: 'lain', at: 5 },
    })],
  });
  await page.goto('/kuis');
  await page.getByRole('button', { name: /Mulai kuis/ }).click();

  // Jawaban model yang keliru justru jadi pengecoh: itu makna yang memang
  // sempat menipu di kata ini.
  await expect(page.getByRole('button', { name: 'menginginkan sesuatu' })).toBeVisible();
  await page.getByRole('button', { name: 'kekurangan atau ketiadaan' }).click();

  await expect(page.getByText(/Betul|Tepat|Benar/).first()).toBeVisible();
});

test('kata yang ditandai ragu boleh dibetulkan, lalu jadi bisa dikuiskan', async ({ page }) => {
  const ragu = wantResult();
  ragu.ambiguous = true;
  ragu.candidates.push({
    meaning_id: 'kekurangan atau ketiadaan',
    meaning_en: 'lack or absence',
    confidence: 0.68,
    trigger: 'suffered',
    why_id: 'Bisa juga soal kekurangan.',
  });

  await seed(page, { ...DB, entries: [entry({ id: 'e1', bookId: 'b1', word: 'want', result: ragu })] });
  await openCard(page);

  // Selama masih ragu, dua kandidat ditampilkan sejajar.
  await expect(page.getByText('Dua makna sama masuk akalnya')).toBeVisible();

  await page.getByRole('button', { name: 'Bukan ini maknanya' }).click();
  await page.getByRole('button', { name: /kekurangan atau ketiadaan/ }).click();

  // Setelah pembaca memutuskan, kartunya berhenti menawar dua pilihan.
  await expect(page.getByText('Dua makna sama masuk akalnya')).toBeHidden();
  await expect(page.getByRole('heading', { name: 'kekurangan atau ketiadaan' })).toBeVisible();

  // Dan kata itu sekarang punya jawaban benar, jadi boleh masuk kuis.
  await page.goto('/kuis');
  await expect(page.getByRole('button', { name: /Mulai kuis/ })).toBeEnabled();
});

test('layar review tidak menawarkan koreksi saat sedang menguji ingatan', async ({ page }) => {
  await seed(page, {
    ...DB,
    entries: [entry({ id: 'e1', bookId: 'b1', word: 'want', dueAt: Date.now() - 1000 })],
  });
  await page.goto('/review');

  await page.getByRole('button', { name: 'Lupa' }).click();
  await expect(page.getByText('menginginkan sesuatu')).toBeVisible();
  // Tombol koreksi sengaja tidak ada di sini: yang sedang diuji ingatan,
  // dan menyunting jawaban di tengah ujian mengaburkan keduanya.
  await expect(page.getByRole('button', { name: 'Bukan ini maknanya' })).toBeHidden();
});
