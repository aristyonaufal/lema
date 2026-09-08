'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { shrink } from '@/lib/image';
import { useDb } from '@/lib/useDb';
import {
  addBook, booksByRecent, bookSummary, byBook, due, findBookByTitle, selectBook,
  type BookSummary,
} from '@/lib/store';

// Ringkasan singkat di daftar buku. Kata yang masih diproses dan yang gagal
// disebut terpisah supaya jumlah totalnya tidak menyesatkan.
function summaryText(s: BookSummary): string {
  if (s.total === 0) return 'Belum ada kata';
  const parts = [`${s.total} kata`];
  if (s.pending > 0) parts.push(`${s.pending} diproses`);
  if (s.failed > 0) parts.push(`${s.failed} gagal`);
  return parts.join(', ');
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
  const pending = db.entries.filter((e) => e.status === 'pending').length;
  const dueCount = ready ? due(db).length : 0;
  const recent = book ? byBook(db, book.id).slice(0, 5) : [];

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
    if (!w || words.length >= 5 || words.some((word) => word.toLowerCase() === w.toLowerCase())) return;
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

  if (!ready) return <main className="p-6" />;

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

    return (
      <main className="mx-auto flex max-w-md flex-col gap-6 p-6 pt-12">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {shelf.length > 0 ? 'Mau lanjut buku yang mana?' : 'Lagi baca buku apa?'}
          </h1>
          <p className="text-muted text-sm">
            {shelf.length > 0
              ? 'Pilih buku yang pernah kamu baca, atau tambah buku baru.'
              : 'Kata yang kamu simpan bakal dikelompokkan per buku, jadi progresmu kelihatan.'}
          </p>
        </div>

        {shelf.length > 0 && (
          <ul aria-label="Buku kamu" className="flex flex-col gap-2">
            {shelf.map((b) => {
              const active = b.id === db.activeBookId;
              return (
                <li key={b.id}>
                  <button
                    onClick={() => chooseBook(b.id)}
                    aria-current={active ? 'true' : undefined}
                    className={`border-line hover:border-accent flex w-full flex-col items-start gap-0.5 rounded-lg border px-4 py-3 text-left ${active ? 'border-accent' : ''}`}
                  >
                    <span className="font-medium break-words">{b.title}</span>
                    <span className="text-muted text-xs">
                      {summaryText(bookSummary(db, b.id))}
                      {active ? ', lagi dibaca' : ''}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="border-line flex flex-col gap-2 border-t pt-5">
          <label htmlFor="judul-buku" className="text-muted text-xs tracking-wider uppercase">
            {shelf.length > 0 ? 'Buku baru' : 'Judul bukunya'}
          </label>
          <input
            id="judul-buku"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createBook()}
            placeholder="Judul bukunya"
            className="border-line bg-surface rounded-lg border px-3 py-2.5"
          />
          {match && (
            <p className="text-muted text-xs">
              Judul ini sudah ada. Kamu bakal dilanjutin ke buku itu, bukan bikin buku kedua.
            </p>
          )}
          <button
            onClick={createBook}
            disabled={!title.trim()}
            className="bg-accent w-fit rounded-lg px-4 py-2.5 font-medium text-white disabled:opacity-40"
          >
            {match ? 'Lanjutkan buku ini' : 'Mulai'}
          </button>
        </div>

        {book && (
          <button
            onClick={() => { setTitle(''); setChoosing(false); }}
            className="text-muted w-fit text-sm underline underline-offset-4"
          >
            Batal, balik ke {book.title}
          </button>
        )}
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-5 p-5">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-muted text-xs tracking-wider uppercase">Lagi baca</p>
          <h1 className="truncate font-medium">{book.title}</h1>
        </div>
        <button
          onClick={() => setChoosing(true)}
          className="text-muted shrink-0 text-sm underline underline-offset-4"
        >
          Ganti
        </button>
      </header>

      <label className="border-line hover:border-accent flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-10 text-center">
        <span className="font-medium">Foto halaman yang lagi kamu baca</span>
        <span className="text-muted text-sm">Ambil dari kamera atau pilih file</span>
        <input type="file" accept="image/*" onChange={pickPhoto} className="hidden" />
      </label>

      {/* Keterangan ditulis sebatas yang benar benar bisa dijamin. Perlakuan data
          di sisi penyedia model bukan sesuatu yang aplikasi ini kendalikan, jadi
          tidak diklaim di sini. */}
      <p className="text-muted text-xs">
        Fotonya dikirim ke Google supaya modelnya bisa baca halamannya. Lema sendiri
        gak nyimpen foto itu, dan kata yang kamu kumpulin cuma ada di browser ini.
      </p>

      {preview && (
        <img src={preview} alt="halaman" className="border-line max-h-56 rounded-lg border object-contain" />
      )}

      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addWord()}
            placeholder="Kata yang bikin kamu berhenti"
            className="border-line bg-surface flex-1 rounded-lg border px-3 py-2.5"
          />
          <button onClick={addWord} className="border-line rounded-lg border px-3">
            Tambah
          </button>
        </div>
        {words.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {words.map((w) => (
              <button
                key={w}
                onClick={() => setWords(words.filter((x) => x !== w))}
                className="border-line rounded-full border px-3 py-1 text-sm"
              >
                {w} <span className="text-muted">&times;</span>
              </button>
            ))}
          </div>
        )}
        <p className="text-muted text-xs">Maksimal 5 kata per halaman.</p>
      </div>

      <button
        onClick={() => saveWords(false)}
        disabled={!file || words.length === 0}
        className="bg-accent rounded-lg px-4 py-3 font-medium text-white disabled:opacity-40"
      >
        Simpan, lanjut baca
      </button>

      <button
        onClick={() => saveWords(true)}
        disabled={!file || words.length === 0}
        className="border-line rounded-lg border px-4 py-2.5 text-sm disabled:opacity-40"
      >
        Buka sekarang
      </button>

      {flash && <p className="text-accent text-sm">{flash}</p>}

      {recent.length > 0 && (
        <section aria-label="Kata terbaru" className="border-line flex flex-col gap-3 border-t pt-4">
          <h2 className="text-muted text-xs tracking-wider uppercase">Kata terbaru</h2>
          <ul className="flex flex-col gap-3">
            {recent.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words text-sm font-medium">{entry.word}</p>
                  <p className="text-muted text-xs">
                    {entry.status === 'pending' ? 'Diproses' : entry.status === 'done' ? 'Siap dibuka' : 'Gagal diproses'}
                  </p>
                </div>
                <Link
                  href={{ pathname: '/kata', query: { entry: entry.id } }}
                  aria-label={`Buka sekarang: ${entry.word}`}
                  className="text-accent shrink-0 text-sm underline underline-offset-4"
                >
                  Buka sekarang
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <nav className="border-line text-muted flex gap-4 border-t pt-4 text-sm">
        <Link href="/kata" className="underline underline-offset-4">
          Koleksi kata{pending > 0 ? ` (${pending} diproses)` : ''}
        </Link>
        {dueCount > 0 && (
          <Link href="/review" className="text-accent underline underline-offset-4">
            Review {dueCount} kata
          </Link>
        )}
      </nav>
    </main>
  );
}
