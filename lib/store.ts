// Penyimpanan lokal Lema. v1 sengaja tanpa basis data server.
// Koleksi buku dan kata disimpan di browser pengguna, tanpa akun.

import type { LookupResult } from './types';

const KEY = 'lema.v1';

// Tangga review, dalam hari. Sengaja tetap, bukan SM-2 atau FSRS.
// Cukup untuk v1 dan gampang diganti nanti tanpa mengubah bentuk data.
export const LADDER = [1, 3, 7, 21];

export type Entry = {
  id: string;
  bookId: string;
  word: string;
  status: 'pending' | 'done' | 'error';
  result?: LookupResult;
  error?: string;
  known: boolean;
  stage: number;    // indeks di LADDER
  dueAt: number;    // timestamp jatuh tempo review berikutnya
  createdAt: number;
};

export type Book = {
  id: string;
  title: string;
  createdAt: number;
};

export type Db = { books: Book[]; entries: Entry[]; activeBookId: string | null };

const EMPTY: Db = { books: [], entries: [], activeBookId: null };

export function load(): Db {
  if (typeof window === 'undefined') return EMPTY;
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return EMPTY;
  const parsed = JSON.parse(raw) as Db;
  if (!parsed || !Array.isArray(parsed.books) || !Array.isArray(parsed.entries)) {
    throw new Error('Koleksi yang tersimpan tidak dapat dibaca.');
  }
  return {
    books: parsed.books,
    entries: parsed.entries,
    activeBookId: parsed.activeBookId ?? null,
  };
}

export function save(db: Db): void {
  // Pemanggil menangani kegagalan, supaya UI tidak mengaku sudah menyimpan.
  window.localStorage.setItem(KEY, JSON.stringify(db));
}

// Hanya dipanggil saat aplikasi dimuat penuh, bukan saat berganti halaman.
// Foto tidak disimpan, jadi permintaan yang terputus perlu dikirim ulang.
export function recoverInterrupted(db: Db): Db {
  return {
    ...db,
    entries: db.entries.map((entry) => entry.status === 'pending'
      ? {
          ...entry,
          status: 'error',
          error: 'Proses sebelumnya terputus. Pilih ulang foto dan kirim kata ini lagi.',
        }
      : entry),
  };
}

export function id(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// Judul dianggap sama bila hanya berbeda huruf besar kecil atau jumlah spasi.
// Tanpa ini, "Sapiens" dan "sapiens " menjadi dua buku dengan koleksi terpisah.
export function normalizeTitle(title: string): string {
  return title.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function cleanTitle(title: string): string {
  return title.trim().replace(/\s+/g, ' ') || 'Tanpa judul';
}

export function findBookByTitle(db: Db, title: string): Book | null {
  const key = normalizeTitle(cleanTitle(title));
  return db.books.find((b) => normalizeTitle(b.title) === key) ?? null;
}

// Membuat buku baru, atau melanjutkan buku lama bila judulnya sudah ada.
// Judul yang sama tidak pernah menghasilkan dua buku.
export function addBook(db: Db, title: string): Db {
  const clean = cleanTitle(title);
  const existing = findBookByTitle(db, clean);
  if (existing) return { ...db, activeBookId: existing.id };
  const book: Book = { id: id(), title: clean, createdAt: Date.now() };
  return { ...db, books: [...db.books, book], activeBookId: book.id };
}

// Berpindah ke buku yang sudah ada. Id yang tidak dikenal diabaikan,
// supaya data lama atau tautan usang tidak mengosongkan buku aktif.
export function selectBook(db: Db, bookId: string): Db {
  return db.books.some((b) => b.id === bookId) ? { ...db, activeBookId: bookId } : db;
}

export type BookSummary = {
  total: number;
  pending: number;
  done: number;
  failed: number;
  known: number;
  lastAt: number; // 0 bila buku belum punya kata
};

export function bookSummary(db: Db, bookId: string): BookSummary {
  const entries = db.entries.filter((e) => e.bookId === bookId);
  return {
    total: entries.length,
    pending: entries.filter((e) => e.status === 'pending').length,
    done: entries.filter((e) => e.status === 'done').length,
    failed: entries.filter((e) => e.status === 'error').length,
    known: entries.filter((e) => e.known).length,
    lastAt: entries.reduce((max, e) => Math.max(max, e.createdAt), 0),
  };
}

// Buku dengan aktivitas terbaru di atas. Buku kosong memakai waktu dibuat,
// jadi buku yang baru dibuat tidak tenggelam di bawah daftar.
export function booksByRecent(db: Db): Book[] {
  return [...db.books].sort((a, b) => {
    const aAt = Math.max(bookSummary(db, a.id).lastAt, a.createdAt);
    const bAt = Math.max(bookSummary(db, b.id).lastAt, b.createdAt);
    return bAt - aAt;
  });
}

export function addPending(db: Db, bookId: string, words: string[]): { db: Db; ids: string[] } {
  const now = Date.now();
  const fresh: Entry[] = words.map((w) => ({
    id: id(),
    bookId,
    word: w,
    status: 'pending',
    known: false,
    stage: 0,
    dueAt: now,
    createdAt: now,
  }));
  return { db: { ...db, entries: [...db.entries, ...fresh] }, ids: fresh.map((e) => e.id) };
}

export function resolveEntry(
  db: Db,
  entryId: string,
  patch: { result?: LookupResult; error?: string }
): Db {
  return {
    ...db,
    entries: db.entries.map((e) =>
      e.id !== entryId
        ? e
        : {
            ...e,
            status: patch.result ? 'done' : 'error',
            result: patch.result,
            error: patch.error,
            dueAt: Date.now() + LADDER[0] * 86400000,
          }
    ),
  };
}

export function markKnown(db: Db, entryId: string): Db {
  return {
    ...db,
    entries: db.entries.map((e) => (e.id === entryId ? { ...e, known: true } : e)),
  };
}

export function remove(db: Db, entryId: string): Db {
  return { ...db, entries: db.entries.filter((e) => e.id !== entryId) };
}

// Naik satu anak tangga kalau ingat, balik ke awal kalau lupa.
export function grade(db: Db, entryId: string, remembered: boolean): Db {
  return {
    ...db,
    entries: db.entries.map((e) => {
      if (e.id !== entryId) return e;
      const stage = remembered ? Math.min(e.stage + 1, LADDER.length - 1) : 0;
      return { ...e, stage, dueAt: Date.now() + LADDER[stage] * 86400000 };
    }),
  };
}

export function due(db: Db, at = Date.now()): Entry[] {
  return db.entries.filter(
    (e) => e.status === 'done' && !e.known && e.dueAt <= at && e.result?.new_sentence
  );
}

export function byBook(db: Db, bookId: string): Entry[] {
  return db.entries.filter((e) => e.bookId === bookId).sort((a, b) => b.createdAt - a.createdAt);
}
