'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import SenseMap from '@/components/SenseMap';
import BookSpine, { spineColor } from '@/components/BookSpine';
import { useDb } from '@/lib/useDb';
import { byBook, due, markKnown, remove, type Entry } from '@/lib/store';

export default function Kata() {
  return (
    <Suspense fallback={<main className="text-muted flex-1 p-6 text-sm">Membuka koleksi...</main>}>
      <KataContent />
    </Suspense>
  );
}

// Penyaring koleksi. Urutannya mengikuti pertanyaan yang paling sering muncul:
// apa yang sudah bisa dibaca, apa yang masih ditunggu, apa yang gagal.
const FILTERS = [
  { id: 'semua', label: 'Semua', match: () => true },
  { id: 'siap', label: 'Siap dibaca', match: (e: Entry) => e.status === 'done' && !e.known },
  { id: 'diproses', label: 'Diproses', match: (e: Entry) => e.status === 'pending' },
  { id: 'gagal', label: 'Gagal', match: (e: Entry) => e.status === 'error' },
  { id: 'tahu', label: 'Sudah tahu', match: (e: Entry) => e.known },
] as const;

type FilterId = (typeof FILTERS)[number]['id'];

function KataContent() {
  const searchParams = useSearchParams();
  const { db, update, ready } = useDb();
  const [filter, setFilter] = useState<FilterId>('semua');

  // Parameter berisi ID lokal, bukan kata, agar dua lookup kata yang sama
  // tetap dapat dibuka secara terpisah tanpa membuat entri baru.
  const focused = searchParams.has('entry');
  const selectedIds = new Set(searchParams.getAll('entry').filter(Boolean));
  const selectedEntries = db.entries.filter((entry) => selectedIds.has(entry.id));
  const pendingCount = selectedEntries.filter((entry) => entry.status === 'pending').length;

  if (!ready) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 pt-8">
        <div className="shimmer h-9 w-44 rounded-lg" />
        <div className="shimmer mt-6 h-32 w-full rounded-[1.25rem]" />
      </main>
    );
  }

  if (db.books.length === 0 && !focused) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center gap-4 px-5 pt-20 text-center">
        <span className="bg-sunken text-faint flex h-16 w-16 items-center justify-center rounded-full">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-8 w-8">
            <rect x="3.5" y="7.5" width="17" height="12" rx="2.6" stroke="currentColor" strokeWidth="1.5" />
            <path d="M6.5 4.5h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </span>
        <p className="text-muted">Belum ada buku. Mulai dari halaman depan.</p>
        <Link href="/" className="btn btn-primary">
          Ke halaman depan
        </Link>
      </main>
    );
  }

  const all = db.entries;
  const dueCount = due(db).length;
  const activeFilter = FILTERS.find((f) => f.id === filter) ?? FILTERS[0];
  // Penyaring yang tidak punya isi tidak ditampilkan, supaya barisnya tidak
  // penuh pilihan yang pasti kosong.
  const available = FILTERS.filter(
    (f) => f.id === 'semua' || f.id === filter || all.some((entry) => f.match(entry)),
  );

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-5 pt-6">
      <header className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="eyebrow">{focused ? 'Hasil pencarian' : 'Kumpulan kamu'}</p>
            <h1 className="font-display mt-1 text-[2rem] leading-tight tracking-tight">
              {focused ? 'Peta makna' : 'Koleksi kata'}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {process.env.NODE_ENV === 'development' && (
              <button
                onClick={() =>
                  update((current) => ({
                    ...current,
                    entries: current.entries.map((e) => ({ ...e, dueAt: Date.now() - 1000 })),
                  }))
                }
                className="chip text-muted text-xs"
                title="Hanya muncul saat npm run dev"
              >
                Paksa jatuh tempo
              </button>
            )}
            <Link href="/" className="chip">
              {focused ? 'Lanjut baca' : 'Kembali'}
            </Link>
          </div>
        </div>

        {focused ? (
          <div className="flex flex-col gap-2 text-sm">
            <Link href="/kata" className="text-accent w-fit font-medium">
              Lihat semua kata
            </Link>
            {pendingCount > 0 && (
              <p role="status" className="border-line bg-surface text-muted flex items-center gap-2 rounded-xl border p-3">
                <span aria-hidden="true" className="bg-warn h-2 w-2 shrink-0 animate-pulse rounded-full" />
                {pendingCount} kata masih diproses. Hasil akan muncul otomatis; kamu boleh lanjut baca dulu.
              </p>
            )}
            {selectedEntries.length === 0 ? (
              <p className="text-muted">Kata yang kamu buka tidak ada di koleksi ini. Mungkin sudah dihapus atau tersimpan di browser lain.</p>
            ) : selectedEntries.length < selectedIds.size && (
              <p className="text-muted">Sebagian kata yang kamu buka sudah tidak ada di koleksi ini.</p>
            )}
          </div>
        ) : (
          all.length > 0 && (
            <>
              {dueCount > 0 && (
                <Link href="/review" className="bg-accent text-accent-ink flex items-center gap-3 rounded-[1.25rem] px-4 py-3.5 shadow-[var(--shadow-sm)]">
                  <span className="flex-1 text-sm leading-snug font-medium">
                    {dueCount} kata udah waktunya diulang
                    <span className="block font-normal opacity-80">Pakai kalimat baru, bukan kalimat dari bukumu.</span>
                  </span>
                  <span aria-hidden="true" className="text-sm font-semibold whitespace-nowrap">Mulai</span>
                </Link>
              )}
              <div className="rail -mx-5 flex gap-2 px-5">
                {available.map((f) => {
                  const count = all.filter(f.match).length;
                  const on = f.id === filter;
                  return (
                    <button key={f.id} onClick={() => setFilter(f.id)} aria-pressed={on} className={`chip ${on ? 'chip-on' : ''}`}>
                      {f.label}
                      <span className={`text-xs tabular-nums ${on ? 'opacity-70' : 'text-faint'}`}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )
        )}
      </header>

      {db.books.map((b) => {
        const entries = byBook(db, b.id).filter((entry) =>
          focused ? selectedIds.has(entry.id) : activeFilter.match(entry),
        );
        if (entries.length === 0) return null;
        const done = entries.filter((e) => e.status === 'done').length;
        const color = spineColor(b.title);
        return (
          <section key={b.id} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-3">
                <BookSpine title={b.title} size="sm" />
                <h2 className="min-w-0 flex-1 truncate font-medium">{b.title}</h2>
                <span className="text-muted shrink-0 text-sm tabular-nums">
                  {done} dari {entries.length} kata siap
                </span>
              </div>
              {/* Rak berwarna sesuai punggung bukunya, sekaligus lintasan kemajuan.
                  Satu batang saja: dua garis bertumpuk hanya terbaca sebagai hiasan. */}
              <div aria-hidden="true" className="shelf h-2 w-full overflow-hidden" style={{ background: `${color}24`, color }}>
                <div
                  className="h-full rounded-lg transition-[width] duration-500"
                  style={{ width: `${entries.length > 0 ? (done / entries.length) * 100 : 0}%`, background: color }}
                />
              </div>
            </div>
            <div className="flex flex-col gap-4">
              {entries.map((e) => (
                <SenseMap
                  key={e.id}
                  entry={e}
                  onKnown={() => update((current) => markKnown(current, e.id))}
                  onRemove={() => update((current) => remove(current, e.id))}
                  onRetry={() => update((current) => ({ ...current, activeBookId: e.bookId }))}
                />
              ))}
            </div>
          </section>
        );
      })}

      {!focused && all.length > 0 && all.filter(activeFilter.match).length === 0 && (
        <div className="card flex flex-col items-center gap-3 p-8 text-center">
          <p className="text-muted text-sm">Belum ada kata di saringan ini.</p>
          <button onClick={() => setFilter('semua')} className="btn btn-ghost">
            Tampilkan semua
          </button>
        </div>
      )}

      {!focused && all.length === 0 && (
        <div className="card flex flex-col items-center gap-3 p-8 text-center">
          <p className="font-medium">Koleksinya masih kosong</p>
          <p className="text-muted text-sm leading-relaxed">
            Foto satu halaman, tandai kata yang bikin kamu berhenti, terus lanjut baca.
          </p>
          <Link href="/" className="btn btn-primary mt-1">
            Mulai dari foto
          </Link>
        </div>
      )}
    </main>
  );
}
