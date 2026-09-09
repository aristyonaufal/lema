'use client';

import { useState } from 'react';
import { useDb } from '@/lib/useDb';
import BookSpine from '@/components/BookSpine';
import {
  addBook, booksByRecent, bookSummary, findBookByTitle, selectBook, type BookSummary,
} from '@/lib/store';

// Pemilih buku. Dipakai di dua tempat: beranda saat pengguna belum punya buku
// sama sekali, dan layar foto saat menekan "Ganti". Sebelumnya kode ini hanya
// ada di dalam layar foto, jadi pengguna baru tidak punya jalan lain untuk
// mulai selain lewat layar itu.

// Ringkasan singkat di daftar buku. Kata yang masih diproses dan yang gagal
// disebut terpisah supaya jumlah totalnya tidak menyesatkan.
function summaryText(s: BookSummary): string {
  if (s.total === 0) return 'Belum ada kata';
  const parts = [`${s.total} kata`];
  if (s.pending > 0) parts.push(`${s.pending} diproses`);
  if (s.failed > 0) parts.push(`${s.failed} gagal`);
  return parts.join(', ');
}

export default function BookPicker({ onPicked, onCancel }: {
  onPicked?: () => void;
  onCancel?: () => void;
}) {
  const { db, update } = useDb();
  const [title, setTitle] = useState('');

  const shelf = booksByRecent(db);
  const match = findBookByTitle(db, title);
  const firstRun = shelf.length === 0;
  const active = db.books.find((b) => b.id === db.activeBookId) ?? null;

  function chooseBook(bookId: string) {
    if (!update((current) => selectBook(current, bookId))) return;
    onPicked?.();
  }

  function createBook() {
    if (!title.trim()) return;
    // addBook melanjutkan buku lama bila judulnya sudah ada, jadi tidak ada duplikat.
    if (!update((current) => addBook(current, title))) return;
    setTitle('');
    onPicked?.();
  }

  return (
    // my-auto di layar besar: isinya pendek, dan kalau dibiarkan menempel ke
    // atas layar laptop sisanya jadi bidang kosong yang lebar sekali.
    <div className="rise mx-auto flex w-full max-w-lg flex-col gap-7 lg:my-auto">
      <div className="flex flex-col gap-3">
        <p className="eyebrow">{firstRun ? 'Selamat datang di Lema' : 'Rak buku kamu'}</p>
        <h1 className="font-display text-[2.125rem] leading-[1.08] tracking-tight sm:text-[2.5rem]">
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
            const current = b.id === db.activeBookId;
            return (
              <li key={b.id}>
                <button
                  onClick={() => chooseBook(b.id)}
                  aria-current={current ? 'true' : undefined}
                  className={`card hover:border-muted flex w-full items-center gap-3.5 p-3 text-left transition-colors ${current ? 'border-accent ring-accent/25 ring-2' : ''}`}
                >
                  <BookSpine title={b.title} />
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="font-medium break-words">{b.title}</span>
                    <span className="text-muted text-xs">
                      {summaryText(bookSummary(db, b.id))}
                      {current ? ', lagi dibaca' : ''}
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

      {onCancel && active && (
        <button onClick={() => { setTitle(''); onCancel(); }} className="btn btn-quiet mx-auto text-sm">
          Batal, balik ke {active.title}
        </button>
      )}
    </div>
  );
}
