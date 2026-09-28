// Cadangan koleksi: keluar sebagai berkas, masuk lagi lewat berkas.
//
// Lema tidak punya akun dan tidak punya basis data server. Konsekuensinya satu
// dan tidak bisa dihindari: seluruh koleksi cuma ada di satu browser. Sekali
// pengguna membersihkan data situs atau berganti HP, kata hasil sebulan membaca
// hilang tanpa jejak. Berkas cadangan adalah satu satunya jalan keluar yang
// tidak melanggar prinsip 4 PRD (nol setup), karena tidak ada yang perlu
// didaftarkan: pengguna menekan satu tombol dan mendapat satu berkas.
//
// Semua fungsi di sini murni. Tidak ada yang menyentuh localStorage maupun DOM,
// supaya aturan penggabungannya bisa diuji langsung tanpa browser.

import {
  cleanTitle,
  mainMeaning,
  normalizeTitle,
  id as newId,
  type Bacaan,
  type Book,
  type Db,
  type Entry,
} from './store';

// Versi format berkas, bukan versi aplikasi. Dinaikkan hanya kalau bentuk
// datanya berubah sedemikian rupa sehingga berkas lama perlu diterjemahkan.
export const FORMAT = 1;

export type Backup = {
  lema: number;
  exportedAt: number;
  db: Db;
};

export function toJson(db: Db, at = Date.now()): string {
  const backup: Backup = { lema: FORMAT, exportedAt: at, db };
  return JSON.stringify(backup, null, 2);
}

// Nama berkas memuat tanggal supaya beberapa cadangan bisa hidup berdampingan
// di folder unduhan tanpa saling menimpa.
export function fileName(at = Date.now(), ext = 'json'): string {
  const d = new Date(at);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `lema-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.${ext}`;
}

const cell = (value: string) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const CSV_HEADER = [
  'Kata',
  'Bentuk dasar',
  'Makna (Indonesia)',
  'Makna (Inggris)',
  'Kalimat dari buku',
  'Kalimat latihan',
  'Buku',
  'Sumber makna',
];

// Ekspor mendatar untuk Anki, Quizlet, atau sekadar dibuka di spreadsheet.
// Keluhan yang paling sering ditulis tentang Kindle Vocabulary Builder persis
// ini: katanya tersimpan rapi tapi tidak bisa dibawa ke mana mana.
//
// Diawali BOM supaya Excel membaca UTF-8 dengan benar. Tanpa itu, kata
// berhuruf beraksen dan tanda kutip lengkung tampil rusak di Windows.
export function toCsv(db: Db): string {
  const title = new Map(db.books.map((b) => [b.id, b.title]));
  const rows = db.entries
    .filter((e) => e.status === 'done' && e.result?.candidates?.[0])
    .map((e) => {
      const r = e.result!;
      const meaning = mainMeaning(e);
      return [
        r.word,
        r.lemma || r.word,
        meaning.meaning_id,
        meaning.meaning_en,
        r.sentence,
        r.new_sentence,
        title.get(e.bookId) ?? '',
        meaning.corrected ? 'diperbaiki pengguna' : 'model',
      ];
    });
  return '﻿' + [CSV_HEADER, ...rows].map((row) => row.map(cell).join(',')).join('\r\n');
}

export type ParseResult =
  | { ok: true; db: Db; exportedAt: number | null }
  | { ok: false; error: string };

const STATUSES = new Set(['pending', 'done', 'error']);

const isText = (value: unknown): value is string => typeof value === 'string' && value.length > 0;

function readBacaan(value: unknown): Bacaan | null {
  if (!value || typeof value !== 'object') return null;
  const b = value as Record<string, unknown>;
  if (!isText(b.slug)) return null;
  if (typeof b.bab !== 'number' || typeof b.paragraf !== 'number') return null;
  return {
    slug: b.slug,
    bab: b.bab,
    paragraf: b.paragraf,
    at: typeof b.at === 'number' ? b.at : Date.now(),
  };
}

function readBook(value: unknown): Book | null {
  if (!value || typeof value !== 'object') return null;
  const b = value as Record<string, unknown>;
  if (!isText(b.id) || !isText(b.title)) return null;
  return {
    id: b.id,
    title: cleanTitle(b.title),
    createdAt: typeof b.createdAt === 'number' ? b.createdAt : Date.now(),
  };
}

function readEntry(value: unknown): Entry | null {
  if (!value || typeof value !== 'object') return null;
  const e = value as Record<string, unknown>;
  if (!isText(e.id) || !isText(e.bookId) || !isText(e.word)) return null;
  if (!isText(e.status) || !STATUSES.has(e.status)) return null;
  // Isi `result` sengaja tidak diperiksa lapis demi lapis. Layar sudah
  // menangani hasil yang tidak lengkap sejak awal (kartu "Gagal"), jadi
  // pemeriksaan ketat di sini cuma akan menolak cadangan yang masih berguna.
  return {
    ...(e as unknown as Entry),
    id: e.id,
    bookId: e.bookId,
    word: e.word,
    status: e.status as Entry['status'],
    known: e.known === true,
    stage: typeof e.stage === 'number' ? e.stage : 0,
    dueAt: typeof e.dueAt === 'number' ? e.dueAt : Date.now(),
    createdAt: typeof e.createdAt === 'number' ? e.createdAt : Date.now(),
  };
}

// Membaca berkas cadangan. Menerima dua bentuk: amplop bikinan Lema, dan isi
// mentah `lema.v1` yang disalin langsung dari penyimpanan browser. Bentuk kedua
// diterima karena itulah yang bisa diselamatkan pengguna dari browser yang
// sudah bermasalah, dan menolaknya tidak membantu siapa pun.
export function parseBackup(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Berkas ini bukan JSON yang bisa dibaca. Pastikan yang dipilih berkas cadangan dari Lema.' };
  }
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'Isi berkas tidak berbentuk data Lema.' };
  }

  const envelope = raw as Record<string, unknown>;
  const body = (envelope.db && typeof envelope.db === 'object' ? envelope.db : envelope) as Record<string, unknown>;

  if (typeof envelope.lema === 'number' && envelope.lema > FORMAT) {
    return {
      ok: false,
      error: `Berkas ini dibuat Lema versi yang lebih baru (format ${envelope.lema}). Buka Lema versi terbaru, lalu impor lagi.`,
    };
  }
  if (!Array.isArray(body.books) || !Array.isArray(body.entries)) {
    return { ok: false, error: 'Berkas tidak memuat daftar buku dan daftar kata. Mungkin ini berkas lain.' };
  }

  const books = body.books.map(readBook).filter((b): b is Book => b !== null);
  const entries = body.entries.map(readEntry).filter((e): e is Entry => e !== null);
  const bacaan = Array.isArray(body.bacaan)
    ? body.bacaan.map(readBacaan).filter((b): b is Bacaan => b !== null)
    : [];

  if (books.length === 0 && entries.length === 0) {
    return { ok: false, error: 'Berkas terbaca, tetapi tidak ada satu pun buku atau kata di dalamnya.' };
  }

  const activeBookId = isText(body.activeBookId) ? body.activeBookId : null;
  return {
    ok: true,
    db: { books, entries, activeBookId, bacaan },
    exportedAt: typeof envelope.exportedAt === 'number' ? envelope.exportedAt : null,
  };
}

export type MergeReport = {
  db: Db;
  addedBooks: number;
  addedEntries: number;
  /** Kata yang sudah ada di koleksi ini, dikenali dari id yang sama. */
  duplicates: number;
  /** Kata yang bukunya tidak ikut di berkas, jadi tidak punya tempat. */
  orphans: number;
};

// Menggabungkan cadangan ke koleksi yang sedang dipakai.
//
// Tiga aturan, dan semuanya memilih untuk tidak menghapus apa pun:
//
// 1. Buku dicocokkan lewat judul yang dinormalkan, aturan yang sama dengan
//    addBook. Jadi "Sapiens" dari HP lama menyatu dengan "sapiens" di HP baru,
//    bukan menjadi dua rak.
// 2. Kata yang id-nya sudah ada dilewati, dan yang menang adalah yang sudah ada
//    di sini. Mengimpor berkas yang sama dua kali karena itu tidak menggandakan
//    apa pun, dan kemajuan review yang sudah berjalan di perangkat ini tidak
//    tertimpa oleh cadangan yang lebih tua.
// 3. Kata yang bukunya tidak ikut serta dihitung, bukan dibuang diam diam.
//    Pemanggil menampilkan angkanya supaya pengguna tahu ada yang tidak masuk.
export function merge(current: Db, incoming: Db, makeId: () => string = newId): MergeReport {
  const books = [...current.books];
  const usedIds = new Set(books.map((b) => b.id));
  const byTitle = new Map(books.map((b) => [normalizeTitle(b.title), b.id]));
  // Buku pustaka dicocokkan lewat slug lebih dulu. Judulnya berasal dari berkas
  // yang sama di kedua perangkat, jadi judul saja sebenarnya sudah cukup, tetapi
  // slug tidak ikut berubah kalau judul di katalog nanti disunting.
  const bySlug = new Map(
    books.filter((b) => b.pustaka).map((b) => [b.pustaka as string, b.id]),
  );

  // Peta dari id buku di berkas ke id buku di koleksi ini.
  const bookMap = new Map<string, string>();
  let addedBooks = 0;

  for (const book of incoming.books) {
    const key = normalizeTitle(book.title);
    const existing = (book.pustaka ? bySlug.get(book.pustaka) : undefined) ?? byTitle.get(key);
    if (existing) {
      bookMap.set(book.id, existing);
      continue;
    }
    // Judul baru. Id dari berkas dipakai ulang kalau belum terpakai, supaya
    // tautan lama seperti /kata?buku=<id> tetap hidup setelah pindah perangkat.
    const id = usedIds.has(book.id) ? makeId() : book.id;
    const added: Book = { ...book, id };
    books.push(added);
    usedIds.add(id);
    byTitle.set(key, id);
    if (added.pustaka) bySlug.set(added.pustaka, id);
    bookMap.set(book.id, id);
    addedBooks += 1;
  }

  const entries = [...current.entries];
  const seen = new Set(entries.map((e) => e.id));
  let addedEntries = 0;
  let duplicates = 0;
  let orphans = 0;

  for (const entry of incoming.entries) {
    if (seen.has(entry.id)) {
      duplicates += 1;
      continue;
    }
    const bookId = bookMap.get(entry.bookId);
    if (!bookId) {
      orphans += 1;
      continue;
    }
    entries.push({ ...entry, bookId });
    seen.add(entry.id);
    addedEntries += 1;
  }

  // Buku yang sedang dibaca di perangkat ini tidak digeser oleh berkas.
  // Kalau memang belum ada, barulah pilihan dari berkas dipakai.
  const incomingActive = incoming.activeBookId ? bookMap.get(incoming.activeBookId) ?? null : null;
  const activeBookId = current.activeBookId && usedIds.has(current.activeBookId)
    ? current.activeBookId
    : incomingActive ?? books[0]?.id ?? null;

  // Posisi baca: satu per buku, dan yang menang yang paling baru dibaca. Di sini
  // cadangan boleh mengalahkan perangkat ini, berbeda dengan aturan untuk kata.
  // Alasannya beda: kemajuan review adalah hasil kerja yang bisa hilang, sedangkan
  // posisi baca cuma penunjuk, dan yang benar memang yang terakhir dibaca.
  const bacaan = [...(current.bacaan ?? [])];
  for (const masuk of incoming.bacaan ?? []) {
    const at = bacaan.findIndex((b) => b.slug === masuk.slug);
    if (at === -1) bacaan.push(masuk);
    else if (masuk.at > bacaan[at].at) bacaan[at] = masuk;
  }

  return {
    db: { books, entries, activeBookId, bacaan },
    addedBooks,
    addedEntries,
    duplicates,
    orphans,
  };
}

export function countWords(db: Db): number {
  return db.entries.filter((e) => e.status === 'done' && e.result?.candidates?.[0]).length;
}
