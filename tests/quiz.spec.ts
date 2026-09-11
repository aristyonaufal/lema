import { test, expect } from '@playwright/test';
import { buildDeck, buildQuestion, quizCount, quizzable } from '../lib/quiz';
import type { Db, Entry } from '../lib/store';
import type { LookupResult, OtherSense } from '../lib/types';

// Pengujian ini berjalan di sisi Node, tanpa browser dan tanpa memanggil model.
// Pengacaknya diberi benih supaya urutan soal bisa diulang persis.

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function entry(id: string, word: string, meaning: string, over: {
  others?: OtherSense[];
  entry?: Partial<Entry>;
  result?: Partial<LookupResult>;
} = {}): Entry {
  return {
    id,
    bookId: 'buku-a',
    word,
    status: 'done',
    known: false,
    stage: 0,
    dueAt: 0,
    createdAt: 1,
    result: {
      word,
      lemma: word,
      is_phrase: false,
      found: true,
      page_excerpt: '',
      sentence: `The book used ${word} here.`,
      ambiguous: false,
      candidates: [{ meaning_id: meaning, meaning_en: `en ${word}`, confidence: 0.9, trigger: 'here', why_id: '' }],
      other_senses: over.others ?? [],
      caution_id: '',
      new_sentence: `A new sentence also uses ${word}.`,
      ...over.result,
    },
    ...over.entry,
  };
}

const sense = (meaning_id: string): OtherSense => ({ meaning_id, meaning_en: meaning_id });

test('pengecoh diambil lebih dulu dari makna lain kata yang sama', () => {
  const bank = entry('b', 'bank', 'tepi sungai', {
    others: [sense('lembaga keuangan'), sense('menyimpan untuk nanti'), sense('bersandar')],
  });
  const pool = [bank, entry('x', 'vast', 'sangat luas'), entry('y', 'keen', 'bersemangat')];

  const question = buildQuestion(bank, pool, seeded(1))!;
  expect(question.options).toHaveLength(4);
  expect(question.options[question.answer]).toBe('tepi sungai');
  // Tiga makna lain kata "bank" sudah cukup, jadi arti kata lain tidak dipakai.
  expect(new Set(question.options)).toEqual(new Set(['tepi sungai', 'lembaga keuangan', 'menyimpan untuk nanti', 'bersandar']));
  expect(question.sentence).toBe('A new sentence also uses bank.');
  expect(question.source).toBe('The book used bank here.');
});

test('makna lain yang kurang diisi dengan arti kata lain dari koleksi', () => {
  const bank = entry('b', 'bank', 'tepi sungai', { others: [sense('lembaga keuangan')] });
  const pool = [bank, entry('x', 'vast', 'sangat luas'), entry('y', 'keen', 'bersemangat'), entry('z', 'still', 'tetap saja')];

  const question = buildQuestion(bank, pool, seeded(2))!;
  expect(question.options).toHaveLength(4);
  expect(question.options).toContain('lembaga keuangan');
  expect(question.options[question.answer]).toBe('tepi sungai');
});

test('pilihan kembar tidak muncul dua kali, termasuk yang sama dengan jawaban', () => {
  const bank = entry('b', 'bank', 'tepi sungai', {
    others: [sense('Tepi Sungai '), sense('lembaga keuangan'), sense('lembaga keuangan')],
  });
  const question = buildQuestion(bank, [bank, entry('x', 'vast', 'Lembaga keuangan')], seeded(3))!;

  expect(question.options).toHaveLength(2);
  expect(question.options.filter((o) => o.toLowerCase().trim() === 'tepi sungai')).toHaveLength(1);
  expect(question.options[question.answer]).toBe('tepi sungai');
});

test('tanpa satu pun pengecoh, soal tidak dibuat', () => {
  const only = entry('b', 'bank', 'tepi sungai');
  expect(buildQuestion(only, [only])).toBeNull();
});

test('kata ragu, yang belum selesai, dan yang tanpa kalimat baru tidak dijadikan soal', () => {
  expect(quizzable(entry('a', 'duck', 'bebek', { result: { ambiguous: true } }))).toBe(false);
  expect(quizzable(entry('b', 'bank', 'tepi sungai', { entry: { status: 'pending' } }))).toBe(false);
  expect(quizzable(entry('c', 'keen', 'bersemangat', { result: { new_sentence: '  ' } }))).toBe(false);
  expect(quizzable(entry('d', 'vast', 'sangat luas'))).toBe(true);
});

test('satu sesi mengambil dari semua buku dan semua jadwal, termasuk kata yang sudah tahu', () => {
  const db: Db = {
    books: [{ id: 'buku-a', title: 'A', createdAt: 1 }, { id: 'buku-b', title: 'B', createdAt: 2 }],
    activeBookId: 'buku-a',
    entries: [
      entry('a1', 'bank', 'tepi sungai', { entry: { dueAt: Date.now() + 30 * 86_400_000 } }),
      entry('a2', 'keen', 'bersemangat', { entry: { known: true } }),
      entry('b1', 'vast', 'sangat luas', { entry: { bookId: 'buku-b', dueAt: 0 } }),
      entry('b2', 'duck', 'bebek', { entry: { bookId: 'buku-b' }, result: { ambiguous: true } }),
    ],
  };

  const deck = buildDeck(db, 10, seeded(4));
  // Kata ragu dikeluarkan; tiga sisanya masuk dari dua buku dengan jadwal
  // yang berbeda beda, termasuk yang ditandai sudah tahu.
  expect(deck.map((q) => q.entryId).sort()).toEqual(['a1', 'a2', 'b1']);
  expect(quizCount(db)).toBe(3);

  // Batas jumlah soal dipatuhi, dan benih yang sama memberi urutan yang sama.
  expect(buildDeck(db, 2, seeded(5))).toHaveLength(2);
  expect(buildDeck(db, 10, seeded(6)).map((q) => q.entryId)).toEqual(buildDeck(db, 10, seeded(6)).map((q) => q.entryId));
});
