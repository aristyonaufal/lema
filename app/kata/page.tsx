'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import SenseMap from '@/components/SenseMap';
import { useDb } from '@/lib/useDb';
import { byBook, markKnown, remove } from '@/lib/store';

export default function Kata() {
  return (
    <Suspense fallback={<main className="p-6 text-sm text-muted">Membuka koleksi...</main>}>
      <KataContent />
    </Suspense>
  );
}

function KataContent() {
  const searchParams = useSearchParams();
  const { db, update, ready } = useDb();
  // Parameter berisi ID lokal, bukan kata, agar dua lookup kata yang sama
  // tetap dapat dibuka secara terpisah tanpa membuat entri baru.
  const focused = searchParams.has('entry');
  const selectedIds = new Set(searchParams.getAll('entry').filter(Boolean));
  const selectedEntries = db.entries.filter((entry) => selectedIds.has(entry.id));
  const pendingCount = selectedEntries.filter((entry) => entry.status === 'pending').length;
  if (!ready) return <main className="p-6" />;

  if (db.books.length === 0 && !focused) {
    return (
      <main className="mx-auto flex max-w-md flex-col gap-2 p-6">
        <p className="text-muted">Belum ada buku. Mulai dari halaman depan.</p>
        <Link href="/" className="text-accent underline underline-offset-4">
          Ke halaman depan
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 p-5">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">{focused ? 'Peta makna' : 'Koleksi kata'}</h1>
        <div className="flex items-center gap-4">
          {process.env.NODE_ENV === 'development' && (
            <button
              onClick={() =>
                update((current) => ({
                  ...current,
                  entries: current.entries.map((e) => ({ ...e, dueAt: Date.now() - 1000 })),
                }))
              }
              className="text-muted text-xs underline underline-offset-4"
              title="Hanya muncul saat npm run dev"
            >
              Paksa jatuh tempo
            </button>
          )}
          <Link href="/" className="text-muted text-sm underline underline-offset-4">
            {focused ? 'Lanjut baca' : 'Kembali'}
          </Link>
        </div>
      </header>

      {focused && (
        <div className="flex flex-col gap-2 text-sm">
          <Link href="/kata" className="text-accent w-fit underline underline-offset-4">
            Lihat semua kata
          </Link>
          {pendingCount > 0 && (
            <p role="status" className="text-muted">
              {pendingCount} kata masih diproses. Hasil akan muncul otomatis; kamu boleh lanjut baca dulu.
            </p>
          )}
          {selectedEntries.length === 0 ? (
            <p className="text-muted">Kata yang kamu buka tidak ada di koleksi ini. Mungkin sudah dihapus atau tersimpan di browser lain.</p>
          ) : selectedEntries.length < selectedIds.size && (
            <p className="text-muted">Sebagian kata yang kamu buka sudah tidak ada di koleksi ini.</p>
          )}
        </div>
      )}

      {db.books.map((b) => {
        const entries = byBook(db, b.id).filter((entry) => !focused || selectedIds.has(entry.id));
        if (entries.length === 0) return null;
        const done = entries.filter((e) => e.status === 'done').length;
        return (
          <section key={b.id} className="flex flex-col gap-3">
            <div className="border-line flex items-baseline justify-between border-b pb-2">
              <h2 className="font-medium">{b.title}</h2>
              <span className="text-muted text-sm">
                {done} dari {entries.length} kata siap
              </span>
            </div>
            {entries.map((e) => (
              <SenseMap
                key={e.id}
                entry={e}
                onKnown={() => update((current) => markKnown(current, e.id))}
                onRemove={() => update((current) => remove(current, e.id))}
                onRetry={() => update((current) => ({ ...current, activeBookId: e.bookId }))}
              />
            ))}
          </section>
        );
      })}
    </main>
  );
}
