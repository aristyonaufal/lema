'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { shrink } from '@/lib/image';
import { useDb } from '@/lib/useDb';
import BookSpine from '@/components/BookSpine';
import { StatusChip, SectionHeader, type EntryTone } from '@/components/ui';
import {
  addBook, booksByRecent, bookSummary, byBook, findBookByTitle, selectBook,
  type BookSummary, type Entry,
} from '@/lib/store';

const MAX_WORDS = 5;

// Ringkasan singkat di daftar buku. Kata yang masih diproses dan yang gagal
// disebut terpisah supaya jumlah totalnya tidak menyesatkan.
function summaryText(s: BookSummary): string {
  if (s.total === 0) return 'Belum ada kata';
  const parts = [`${s.total} kata`];
  if (s.pending > 0) parts.push(`${s.pending} diproses`);
  if (s.failed > 0) parts.push(`${s.failed} gagal`);
  return parts.join(', ');
}

function toneOf(entry: Entry): EntryTone {
  if (entry.status === 'pending') return 'pending';
  if (entry.status === 'error') return 'error';
  return entry.known ? 'known' : 'done';
}

export default function Capture() {
  const router = useRouter();
  const { db, update, ready, lookup } = useDb();
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [draft, setDraft] = useState('');
  const [words, setWords] = useState<string[]>([]);
  const [flash, setFlash] = useState('');
  const [choosing, setChoosing] = useState(false);
  const submitted = useRef(false);

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  useEffect(() => {
    if (!flash) return;
    const timeout = setTimeout(() => setFlash(''), 4000);
    return () => clearTimeout(timeout);
  }, [flash]);

  const book = db.books.find((b) => b.id === db.activeBookId) ?? null;
  const recent = book ? byBook(db, book.id).slice(0, 4) : [];

  async function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const small = await shrink(f);
    submitted.current = false;
    setFile(small);
    setPreview(URL.createObjectURL(small));
  }

  function addWord() {
    const w = draft.trim();
    if (!w || words.length >= MAX_WORDS || words.some((word) => word.toLowerCase() === w.toLowerCase())) return;
    setWords([...words, w]);
    setDraft('');
  }

  // Kirim ke server tanpa menahan pengguna. Dia balik membaca,
  // jawabannya menyusul dan langsung masuk ke koleksi.
  function saveWords(openNow: boolean) {
    if (!file || words.length === 0 || !book || submitted.current) return;
    const ids = lookup(file, book.id, words);
    // Jika antrean gagal disimpan, pertahankan foto dan kata untuk dicoba lagi.
    if (!ids) return;
    submitted.current = true;
    setFlash(`${ids.length} kata masuk antrean. Lanjut baca aja.`);
    setWords([]);
    setDraft('');
    setFile(null);
    setPreview('');
    if (openNow) {
      // Membuka entri yang sudah tersimpan tidak mengulang lookup.
      const params = new URLSearchParams(ids.map((id) => ['entry', id]));
      router.push(`/kata?${params.toString()}`);
    }
  }

  if (!ready) {
    return (
      <main className="mx-auto w-full max-w-md flex-1 px-5 pt-10">
        <div className="shimmer h-4 w-24 rounded-full" />
        <div className="shimmer mt-3 h-9 w-52 rounded-lg" />
        <div className="shimmer mt-6 h-48 w-full rounded-[1.25rem]" />
      </main>
    );
  }

  function chooseBook(bookId: string) {
    update((current) => selectBook(current, bookId));
    setChoosing(false);
  }

  function createBook() {
    if (!title.trim()) return;
    // addBook melanjutkan buku lama bila judulnya sudah ada, jadi tidak ada duplikat.
    update((current) => addBook(current, title));
    setTitle('');
    setChoosing(false);
  }

  if (!book || choosing) {
    const shelf = booksByRecent(db);
    const match = findBookByTitle(db, title);
    const firstRun = shelf.length === 0;

    return (
      <main className="rise mx-auto flex w-full max-w-md flex-1 flex-col gap-7 px-5 pt-10 pb-10">
        <div className="flex flex-col gap-3">
          <p className="eyebrow">{firstRun ? 'Selamat datang di Lema' : 'Rak buku kamu'}</p>
          <h1 className="font-display text-[2.125rem] leading-[1.08] tracking-tight">
            {firstRun ? 'Lagi baca buku apa?' : 'Mau lanjut buku yang mana?'}
          </h1>
          <p className="text-muted text-sm leading-relaxed">
            {firstRun
              ? 'Kata yang kamu simpan bakal dikelompokkan per buku, jadi progresmu kelihatan.'
              : 'Pilih buku yang pernah kamu baca, atau tambah buku baru.'}
          </p>
        </div>

        {shelf.length > 0 && (
          <ul aria-label="Buku kamu" className="flex flex-col gap-2.5">
            {shelf.map((b) => {
              const active = b.id === db.activeBookId;
              return (
                <li key={b.id}>
                  <button
                    onClick={() => chooseBook(b.id)}
                    aria-current={active ? 'true' : undefined}
                    className={`card hover:border-muted flex w-full items-center gap-3.5 p-3 text-left transition-colors ${active ? 'border-accent ring-accent/25 ring-2' : ''}`}
                  >
                    <BookSpine title={b.title} />
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="font-medium break-words">{b.title}</span>
                      <span className="text-muted text-xs">
                        {summaryText(bookSummary(db, b.id))}
                        {active ? ', lagi dibaca' : ''}
                      </span>
                    </span>
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-faint h-5 w-5 shrink-0">
                      <path d="m9.5 6 6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="card flex flex-col gap-3 p-4">
          <label htmlFor="judul-buku" className="eyebrow">
            {shelf.length > 0 ? 'Buku baru' : 'Judul bukunya'}
          </label>
          <input
            id="judul-buku"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createBook()}
            placeholder="Contoh: Sapiens"
            autoComplete="off"
            className="border-line bg-sunken focus:border-accent min-h-12 rounded-xl border px-3.5 text-base outline-none"
          />
          {match && (
            <p className="text-accent text-xs leading-relaxed">
              Judul ini sudah ada. Kamu bakal dilanjutin ke buku itu, bukan bikin buku kedua.
            </p>
          )}
          <button onClick={createBook} disabled={!title.trim()} className="btn btn-primary w-full">
            {match ? 'Lanjutkan buku ini' : 'Mulai'}
          </button>
        </div>

        {book && (
          <button onClick={() => { setTitle(''); setChoosing(false); }} className="btn btn-quiet mx-auto text-sm">
            Batal, balik ke {book.title}
          </button>
        )}
      </main>
    );
  }

  const canSubmit = Boolean(file) && words.length > 0;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-5 pt-6">
      <header className="flex items-center gap-3">
        <BookSpine title={book.title} />
        <div className="min-w-0 flex-1">
          <p className="eyebrow">Lagi baca</p>
          <h1 className="font-display truncate text-[1.75rem] leading-tight tracking-tight">{book.title}</h1>
        </div>
        <button onClick={() => setChoosing(true)} className="chip shrink-0">
          Ganti
        </button>
      </header>

      {/* Satu bidang ketuk untuk seluruh langkah foto: sebelum dan sesudah ada
          gambar, sasarannya tetap besar dan berada di tempat yang sama. */}
      <label className="border-line hover:border-accent bg-surface flex cursor-pointer flex-col overflow-hidden rounded-[1.25rem] border border-dashed shadow-[var(--shadow-sm)] transition-colors">
        {preview ? (
          <>
            <img src={preview} alt="halaman" className="bg-sunken max-h-64 w-full object-contain" />
            <span className="text-muted flex items-center justify-center gap-2 py-3 text-sm">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
                <path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.7M20 12a8 8 0 0 1-13.7 5.6L4 15.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Ketuk buat ganti fotonya
            </span>
          </>
        ) : (
          <span className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <span className="bg-accent-soft text-accent mb-1 flex h-14 w-14 items-center justify-center rounded-full">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-7 w-7">
                <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.2a1 1 0 0 0 .84-.46l.72-1.1A1 1 0 0 1 10.1 4h3.8a1 1 0 0 1 .84.44l.72 1.1a1 1 0 0 0 .84.46h1.2A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-8Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <circle cx="12" cy="12.5" r="3.2" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </span>
            <span className="font-medium">Foto halaman yang lagi kamu baca</span>
            <span className="text-muted text-sm">Ambil dari kamera atau pilih file</span>
          </span>
        )}
        <input type="file" accept="image/*" onChange={pickPhoto} className="sr-only" />
      </label>

      {/* Keterangan ditulis sebatas yang benar benar bisa dijamin. Perlakuan data
          di sisi penyedia model bukan sesuatu yang aplikasi ini kendalikan, jadi
          tidak diklaim di sini. */}
      <p className="text-muted flex gap-2 text-xs leading-relaxed">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="mt-px h-4 w-4 shrink-0">
          <rect x="5" y="10.5" width="14" height="9.5" rx="2.4" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8.5 10.5V8a3.5 3.5 0 1 1 7 0v2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span>
          Fotonya dikirim ke Google supaya modelnya bisa baca halamannya. Lema sendiri
          gak nyimpen foto itu, dan kata yang kamu kumpulin cuma ada di browser ini.
        </span>
      </p>

      <section aria-label="Kata yang ditandai" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <p className="eyebrow">Tandai kata</p>
          <p className="text-faint text-xs tabular-nums">{words.length} dari {MAX_WORDS}</p>
        </div>

        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addWord()}
            placeholder="Kata yang bikin kamu berhenti"
            aria-label="Kata yang bikin kamu berhenti"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            disabled={words.length >= MAX_WORDS}
            className="border-line bg-surface focus:border-accent min-h-12 flex-1 rounded-xl border px-3.5 text-base outline-none disabled:opacity-50"
          />
          <button onClick={addWord} disabled={!draft.trim() || words.length >= MAX_WORDS} className="btn btn-ghost px-4">
            Tambah
          </button>
        </div>

        {words.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {words.map((w) => (
              <li key={w}>
                <button
                  onClick={() => setWords(words.filter((x) => x !== w))}
                  aria-label={`${w}, hapus dari daftar`}
                  className="chip hover:border-danger hover:text-danger gap-1.5"
                >
                  {w}
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-3.5 w-3.5">
                    <path d="m7 7 10 10M17 7 7 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className="text-muted text-xs">
          Maksimal {MAX_WORDS} kata per halaman. Jawabannya nyusul, kamu gak perlu nungguin.
        </p>
      </section>

      {/* Aksi utama menempel di dekat jempol dan tetap terlihat saat menggulung. */}
      <div className="sticky z-30 -mx-1 mt-auto" style={{ bottom: 'calc(var(--tab-h) + env(safe-area-inset-bottom, 0px) + 0.5rem)' }}>
        <div className="border-line bg-surface/90 flex flex-col gap-2 rounded-[1.25rem] border p-2.5 shadow-[var(--shadow-md)] backdrop-blur-xl">
          {flash && (
            <p aria-live="polite" className="text-accent flex items-center justify-center gap-1.5 pt-1 text-center text-sm">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4 shrink-0">
                <path d="m5 12.5 4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {flash}
            </p>
          )}
          <button onClick={() => saveWords(false)} disabled={!canSubmit} className="btn btn-primary w-full">
            Simpan, lanjut baca
          </button>
          <button onClick={() => saveWords(true)} disabled={!canSubmit} className="btn btn-quiet w-full text-sm">
            Buka sekarang
          </button>
          {!canSubmit && !flash && (
            <p className="text-faint pb-1 text-center text-xs">
              {!file && words.length === 0
                ? 'Ambil fotonya dulu, terus tandai katanya.'
                : !file
                  ? 'Tinggal fotonya nih.'
                  : 'Tinggal tandai minimal satu kata.'}
            </p>
          )}
        </div>
      </div>

      {recent.length > 0 && (
        <section aria-label="Kata terbaru" className="flex flex-col gap-3 pb-2">
          <SectionHeader
            title="Kata terbaru"
            hint="di buku ini"
            action={<Link href="/kata" className="text-accent shrink-0 text-sm font-medium">Lihat semua</Link>}
          />
          <ul className="flex flex-col gap-2">
            {recent.map((entry) => (
              <li key={entry.id}>
                <Link
                  href={{ pathname: '/kata', query: { entry: entry.id } }}
                  aria-label={`Buka sekarang: ${entry.word}`}
                  className="card hover:border-muted flex items-center gap-3 px-3.5 py-3 transition-colors"
                >
                  <span className="min-w-0 flex-1 truncate font-medium">{entry.word}</span>
                  <StatusChip tone={toneOf(entry)} />
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-faint h-4 w-4 shrink-0">
                    <path d="m9.5 6 6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
