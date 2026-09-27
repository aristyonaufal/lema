import { test, expect } from '@playwright/test';
import { countWords, fileName, merge, parseBackup, toCsv, toJson } from '../lib/transfer';
import type { Db, Entry } from '../lib/store';
import type { LookupResult } from '../lib/types';

// Aturan cadangan diuji langsung di Node, tanpa browser. Yang diuji di sini
// bukan tombolnya, melainkan janji yang paling mahal kalau dilanggar: impor
// tidak boleh menghapus atau menimpa apa pun yang sudah ada di perangkat ini.

function result(word: string, meaning = `Makna ${word}`): LookupResult {
  return {
    word,
    lemma: word,
    is_phrase: false,
    found: true,
    page_excerpt: 'Halaman uji.',
    sentence: `A sentence with ${word}.`,
    ambiguous: false,
    candidates: [{
      meaning_id: meaning,
      meaning_en: `meaning of ${word}`,
      confidence: 0.9,
      trigger: 'sentence',
      why_id: 'Alasan uji.',
    }],
    other_senses: [{ meaning_id: 'makna lain', meaning_en: 'another sense' }],
    caution_id: '',
    new_sentence: `Another sentence with ${word}.`,
  };
}

function entry(over: Partial<Entry> & Pick<Entry, 'id' | 'bookId' | 'word'>): Entry {
  return {
    status: 'done',
    result: result(over.word),
    known: false,
    stage: 0,
    dueAt: 1_000,
    createdAt: 10,
    ...over,
  };
}

const db = (over: Partial<Db> = {}): Db => ({
  books: [{ id: 'b1', title: 'Sapiens', createdAt: 1 }],
  entries: [entry({ id: 'e1', bookId: 'b1', word: 'ubiquitous' })],
  activeBookId: 'b1',
  ...over,
});

let seq = 0;
const ids = () => `baru${(seq += 1)}`;

test.beforeEach(() => { seq = 0; });

test('berkas cadangan bisa dibaca kembali persis seperti saat disimpan', () => {
  const original = db();
  const parsed = parseBackup(toJson(original, 1_700_000_000_000));
  expect(parsed.ok).toBe(true);
  if (!parsed.ok) return;
  expect(parsed.db.books).toEqual(original.books);
  expect(parsed.db.entries).toEqual(original.entries);
  expect(parsed.db.activeBookId).toBe('b1');
  expect(parsed.exportedAt).toBe(1_700_000_000_000);
});

test('isi mentah lema.v1 tanpa amplop tetap diterima', () => {
  // Inilah yang bisa disalin pengguna dari browser yang sudah bermasalah.
  const parsed = parseBackup(JSON.stringify(db()));
  expect(parsed.ok).toBe(true);
  if (!parsed.ok) return;
  expect(parsed.db.entries).toHaveLength(1);
  expect(parsed.exportedAt).toBeNull();
});

test('berkas yang bukan cadangan Lema ditolak dengan alasan yang bisa dibaca', () => {
  for (const text of ['bukan json', '{}', '[]', JSON.stringify({ hello: 'world' })]) {
    const parsed = parseBackup(text);
    expect(parsed.ok, text).toBe(false);
    if (parsed.ok) continue;
    expect(parsed.error.length).toBeGreaterThan(20);
  }
});

test('format yang lebih baru ditolak, bukan dibaca setengah setengah', () => {
  const parsed = parseBackup(JSON.stringify({ lema: 99, db: db() }));
  expect(parsed.ok).toBe(false);
  if (parsed.ok) return;
  expect(parsed.error).toContain('lebih baru');
});

test('kata yang bentuknya rusak dibuang, kata yang sehat tetap masuk', () => {
  const parsed = parseBackup(JSON.stringify({
    books: [{ id: 'b1', title: 'Sapiens' }, { title: 'tanpa id' }],
    entries: [
      entry({ id: 'e1', bookId: 'b1', word: 'ubiquitous' }),
      { id: 'e2', bookId: 'b1' },                       // tanpa kata
      { id: 'e3', bookId: 'b1', word: 'x', status: 'aneh' }, // status tidak dikenal
    ],
  }));
  expect(parsed.ok).toBe(true);
  if (!parsed.ok) return;
  expect(parsed.db.books).toHaveLength(1);
  expect(parsed.db.entries.map((e) => e.id)).toEqual(['e1']);
});

test('gabung: buku berjudul sama menyatu, tidak jadi dua rak', () => {
  const current = db();
  const incoming: Db = {
    books: [{ id: 'lain', title: '  sapiens ', createdAt: 5 }],
    entries: [entry({ id: 'e2', bookId: 'lain', word: 'candour' })],
    activeBookId: 'lain',
  };

  const report = merge(current, incoming, ids);
  expect(report.addedBooks).toBe(0);
  expect(report.addedEntries).toBe(1);
  expect(report.db.books).toHaveLength(1);
  // Kata dari berkas ikut rak yang sudah ada di perangkat ini.
  expect(report.db.entries.map((e) => e.bookId)).toEqual(['b1', 'b1']);
});

test('gabung: berkas yang sama diimpor dua kali tidak menggandakan apa pun', () => {
  const current = db();
  const backup = parseBackup(toJson(current));
  expect(backup.ok).toBe(true);
  if (!backup.ok) return;

  const once = merge(current, backup.db, ids);
  expect(once.addedEntries).toBe(0);
  expect(once.duplicates).toBe(1);

  const twice = merge(once.db, backup.db, ids);
  expect(twice.db.entries).toHaveLength(1);
  expect(twice.db.books).toHaveLength(1);
});

test('gabung: kemajuan review di perangkat ini menang atas cadangan yang lebih tua', () => {
  // Kata yang sama sudah naik tangga di HP ini. Cadangan lama memuat versi
  // yang belum pernah lolos. Yang menang harus yang di sini.
  const current = db({
    entries: [entry({ id: 'e1', bookId: 'b1', word: 'ubiquitous', stage: 3, passedReview: true })],
  });
  const stale: Db = {
    books: [{ id: 'b1', title: 'Sapiens', createdAt: 1 }],
    entries: [entry({ id: 'e1', bookId: 'b1', word: 'ubiquitous', stage: 0 })],
    activeBookId: 'b1',
  };

  const report = merge(current, stale, ids);
  expect(report.db.entries).toHaveLength(1);
  expect(report.db.entries[0].stage).toBe(3);
  expect(report.db.entries[0].passedReview).toBe(true);
});

test('gabung: buku baru masuk tanpa mengganggu buku yang sudah ada', () => {
  const incoming: Db = {
    books: [{ id: 'b9', title: 'Educated', createdAt: 5 }],
    entries: [entry({ id: 'e9', bookId: 'b9', word: 'candour' })],
    activeBookId: 'b9',
  };
  const report = merge(db(), incoming, ids);

  expect(report.addedBooks).toBe(1);
  expect(report.addedEntries).toBe(1);
  expect(report.db.books.map((b) => b.title)).toEqual(['Sapiens', 'Educated']);
  // Id asli dipertahankan supaya tautan /kata?buku=b9 tetap hidup.
  expect(report.db.books[1].id).toBe('b9');
  // Buku yang sedang dibaca di perangkat ini tidak digeser oleh berkas.
  expect(report.db.activeBookId).toBe('b1');
});

test('gabung: id buku yang bentrok diberi id baru, bukan menimpa', () => {
  const incoming: Db = {
    books: [{ id: 'b1', title: 'Educated', createdAt: 5 }], // id sama, judul beda
    entries: [entry({ id: 'e9', bookId: 'b1', word: 'candour' })],
    activeBookId: 'b1',
  };
  const report = merge(db(), incoming, ids);

  expect(report.db.books).toHaveLength(2);
  expect(report.db.books[0]).toEqual({ id: 'b1', title: 'Sapiens', createdAt: 1 });
  expect(report.db.books[1].id).toBe('baru1');
  // Katanya ikut buku barunya, bukan nyasar ke Sapiens.
  expect(report.db.entries.find((e) => e.id === 'e9')?.bookId).toBe('baru1');
});

test('gabung: kata tanpa buku dihitung, bukan dibuang diam diam', () => {
  const incoming: Db = {
    books: [],
    entries: [entry({ id: 'e9', bookId: 'hilang', word: 'candour' })],
    activeBookId: null,
  };
  const report = merge(db(), incoming, ids);
  expect(report.orphans).toBe(1);
  expect(report.addedEntries).toBe(0);
  expect(report.db.entries).toHaveLength(1);
});

test('koreksi pembaca ikut terbawa di cadangan dan di CSV', () => {
  const corrected = db({
    entries: [entry({
      id: 'e1',
      bookId: 'b1',
      word: 'ubiquitous',
      correction: { meaning_id: 'ada di mana mana', meaning_en: 'everywhere', source: 'sendiri', at: 5 },
    })],
  });

  const parsed = parseBackup(toJson(corrected));
  expect(parsed.ok).toBe(true);
  if (!parsed.ok) return;
  expect(parsed.db.entries[0].correction?.meaning_id).toBe('ada di mana mana');

  const csv = toCsv(corrected);
  expect(csv).toContain('ada di mana mana');
  expect(csv).toContain('diperbaiki pengguna');
  // Makna model yang keliru tidak ikut ke kolom makna.
  expect(csv).not.toContain('"Makna ubiquitous"');
});

test('CSV: tanda kutip di dalam makna tidak merusak kolom', () => {
  const tricky = db({
    entries: [entry({
      id: 'e1',
      bookId: 'b1',
      word: 'make out',
      correction: { meaning_id: 'berhasil melihat, "samar samar"', meaning_en: '', source: 'sendiri', at: 5 },
    })],
  });
  const csv = toCsv(tricky);
  const rows = csv.split('\r\n');
  expect(rows).toHaveLength(2);
  expect(rows[1]).toContain('"berhasil melihat, ""samar samar"""');
});

test('CSV: kata yang belum punya makna tidak ikut diekspor', () => {
  const mixed = db({
    entries: [
      entry({ id: 'e1', bookId: 'b1', word: 'ubiquitous' }),
      entry({ id: 'e2', bookId: 'b1', word: 'gagal', status: 'error', result: undefined }),
      entry({ id: 'e3', bookId: 'b1', word: 'nunggu', status: 'pending', result: undefined }),
    ],
  });
  expect(countWords(mixed)).toBe(1);
  expect(toCsv(mixed).split('\r\n')).toHaveLength(2);
});

test('nama berkas memuat tanggal supaya cadangan lama tidak tertimpa', () => {
  const at = new Date(2026, 8, 27).getTime();
  expect(fileName(at)).toBe('lema-2026-09-27.json');
  expect(fileName(at, 'csv')).toBe('lema-2026-09-27.csv');
});
