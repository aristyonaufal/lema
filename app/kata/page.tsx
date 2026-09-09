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
    <Suspense fallback={<main className="page text-muted flex-1 pt-6 text-sm">Membuka koleksi...</main>}>
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

// Baris ringkas untuk kata yang maknanya sudah ada.
//
// Sebelumnya tiap kata langsung menampilkan kartu makna penuh: kalimat asal,
// pemicu, alasan, catatan hati hati, dan daftar makna lain. Koleksi berisi dua
// puluh kata jadi halaman sepanjang beberapa layar, dan mencari satu kata
// berarti menggulung lama. Sekarang isinya baru digambar ketika dibuka, jadi
// yang panjang cuma yang memang sedang dibaca.
function WordRow({ entry, open, onToggle, children }: {
  entry: Entry;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const r = entry.result!;
  const main = r.candidates[0];

  return (
    <li className="flex flex-col">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className={`card hover:border-muted flex w-full items-center gap-3 p-3.5 text-left transition-colors ${open ? 'border-accent/50' : ''}`}
      >
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span lang="en" className="font-display text-[1.35rem] leading-none tracking-tight">
              {r.word}
            </span>
            {r.ambiguous && (
              <span className="bg-warn-soft text-warn rounded-full px-2 py-0.5 text-[0.6875rem] font-medium">
                Ragu
              </span>
            )}
            {r.found === false && (
              <span className="bg-warn-soft text-warn rounded-full px-2 py-0.5 text-[0.6875rem] font-medium">
                Tidak ketemu di halaman
              </span>
            )}
            {entry.known && (
              <span className="bg-sunken text-muted rounded-full px-2 py-0.5 text-[0.6875rem]">
                Sudah tahu
              </span>
            )}
          </span>
          {/* Saat terbuka, arti singkatnya dilepas: kartu di bawahnya sudah
              menuliskannya dengan lengkap, jadi baris ini tinggal jadi kepala. */}
          {!open && <span className="text-muted truncate text-sm">{main.meaning_id}</span>}
        </span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className={`text-faint h-5 w-5 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`}
        >
          <path d="m9.5 6 6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && <div className="rise mt-2">{children}</div>}
    </li>
  );
}

function KataContent() {
  const searchParams = useSearchParams();
  const { db, update, ready } = useDb();
  const [filter, setFilter] = useState<FilterId>('semua');
  const [open, setOpen] = useState<string[]>([]);

  // Parameter berisi ID lokal, bukan kata, agar dua lookup kata yang sama
  // tetap dapat dibuka secara terpisah tanpa membuat entri baru.
  const focused = searchParams.has('entry');
  const selectedIds = new Set(searchParams.getAll('entry').filter(Boolean));
  const selectedEntries = db.entries.filter((entry) => selectedIds.has(entry.id));
  const pendingCount = selectedEntries.filter((entry) => entry.status === 'pending').length;
  const bookParam = searchParams.get('buku');

  if (!ready) {
    return (
      <main className="page flex-1 pt-8">
        <div className="shimmer h-9 w-44 rounded-lg" />
        <div className="shimmer mt-6 h-32 w-full rounded-[1.25rem]" />
      </main>
    );
  }

  if (db.books.length === 0 && !focused) {
    return (
      <main className="page page-narrow flex flex-1 flex-col items-center gap-4 pt-20 text-center">
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

  // Buku yang disaring lewat alamat. Id yang tidak dikenal diabaikan supaya
  // tautan usang menampilkan seluruh koleksi, bukan halaman kosong.
  const book = bookParam ? db.books.find((b) => b.id === bookParam) ?? null : null;
  const shownBooks = book ? [book] : db.books;
  const scoped = book ? db.entries.filter((e) => e.bookId === book.id) : db.entries;

  const dueCount = due(db).length;
  const activeFilter = FILTERS.find((f) => f.id === filter) ?? FILTERS[0];
  // Penyaring yang tidak punya isi tidak ditampilkan, supaya barisnya tidak
  // penuh pilihan yang pasti kosong.
  const available = FILTERS.filter(
    (f) => f.id === 'semua' || f.id === filter || scoped.some((entry) => f.match(entry)),
  );
  const shown = scoped.filter(activeFilter.match);

  function toggle(id: string) {
    setOpen((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  }

  return (
    <main className="page flex flex-1 flex-col gap-6 pt-6">
      <header className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="eyebrow">{focused ? 'Hasil pencarian' : book ? 'Koleksi buku' : 'Kumpulan kamu'}</p>
            <h1 className="font-display mt-1 truncate text-[2rem] leading-tight tracking-tight sm:text-[2.25rem]">
              {focused ? 'Peta makna' : book ? book.title : 'Koleksi kata'}
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
            <Link href="/baca" className="chip">
              Lanjut baca
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
          <>
            {book && (
              <div className="flex flex-wrap items-center gap-3">
                <Link href="/kata" className="text-accent text-sm font-medium">
                  Lihat semua buku
                </Link>
                <span className="text-faint text-sm tabular-nums">{scoped.length} kata di buku ini</span>
              </div>
            )}
            {scoped.length > 0 && (
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
                <div className="rail -mx-5 flex gap-2 px-5 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
                  {available.map((f) => {
                    const count = scoped.filter(f.match).length;
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
            )}
          </>
        )}
      </header>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-8">
        <div className="flex min-w-0 flex-col gap-6">
          {shownBooks.map((b) => {
            const entries = byBook(db, b.id).filter((entry) =>
              focused ? selectedIds.has(entry.id) : activeFilter.match(entry),
            );
            if (entries.length === 0) return null;
            const done = entries.filter((e) => e.status === 'done').length;
            const color = spineColor(b.title);
            return (
              <section key={b.id} id={`buku-${b.id}`} className="flex scroll-mt-6 flex-col gap-4">
                <div className="flex flex-col gap-2.5">
                  {/* Saat koleksi disaring ke satu buku, judulnya sudah menjadi
                      kepala halaman. Mengulangnya di sini cuma menambah baris. */}
                  <div className="flex items-center gap-3">
                    {!book && (
                      <>
                        <BookSpine title={b.title} size="sm" />
                        <h2 className="min-w-0 flex-1 truncate font-medium">{b.title}</h2>
                      </>
                    )}
                    <span className={`text-muted shrink-0 text-sm tabular-nums ${book ? 'ml-auto' : ''}`}>
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
                <ul className="flex flex-col gap-2.5">
                  {entries.map((e) => {
                    const card = (
                      <SenseMap
                        entry={e}
                        onKnown={() => update((current) => markKnown(current, e.id))}
                        onRemove={() => update((current) => remove(current, e.id))}
                        onRetry={() => update((current) => ({ ...current, activeBookId: e.bookId }))}
                      />
                    );
                    // Kata yang masih diproses atau gagal sudah pendek dengan
                    // sendirinya, dan justru butuh dibaca segera. Yang dilipat
                    // hanya kartu makna yang panjang. Tampilan terfokus selalu
                    // terbuka, karena ke situlah pengguna baru saja diantar.
                    if (e.status !== 'done' || !e.result?.candidates?.[0]) {
                      return <li key={e.id}>{card}</li>;
                    }
                    if (focused) return <li key={e.id}>{card}</li>;
                    return (
                      <WordRow key={e.id} entry={e} open={open.includes(e.id)} onToggle={() => toggle(e.id)}>
                        {card}
                      </WordRow>
                    );
                  })}
                </ul>
              </section>
            );
          })}

          {!focused && scoped.length > 0 && shown.length === 0 && (
            <div className="card flex flex-col items-center gap-3 p-8 text-center">
              <p className="text-muted text-sm">Belum ada kata di saringan ini.</p>
              <button onClick={() => setFilter('semua')} className="btn btn-ghost">
                Tampilkan semua
              </button>
            </div>
          )}

          {!focused && scoped.length === 0 && (
            <div className="card flex flex-col items-center gap-3 p-8 text-center">
              <p className="font-medium">{book ? 'Buku ini belum punya kata' : 'Koleksinya masih kosong'}</p>
              <p className="text-muted text-sm leading-relaxed">
                Foto satu halaman, tandai kata yang bikin kamu berhenti, terus lanjut baca.
              </p>
              <Link href="/baca" className="btn btn-primary mt-1">
                Mulai dari foto
              </Link>
            </div>
          )}
        </div>

        {!focused && scoped.length > 0 && (
          <aside aria-label="Ringkasan koleksi" className="top-6 hidden flex-col gap-5 lg:sticky lg:flex">
            <div className="card flex flex-col gap-3 p-4">
              <p className="eyebrow">Ringkasan</p>
              <dl className="flex flex-col gap-2 text-sm">
                {[
                  ['Total kata', scoped.length],
                  ['Sudah ada maknanya', scoped.filter((e) => e.status === 'done' && !e.known).length],
                  ['Menunggu model', scoped.filter((e) => e.status === 'pending').length],
                  ['Pernah lolos review', scoped.filter((e) => e.passedReview === true).length],
                ].map(([label, value]) => (
                  <div key={label as string} className="flex items-baseline justify-between gap-3">
                    <dt className="text-muted">{label}</dt>
                    <dd className="font-medium tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <Link
              href={book ? `/review?latihan=1&buku=${book.id}` : '/review?latihan=1'}
              className="btn btn-ghost w-full"
            >
              Latihan kata di sini
            </Link>
          </aside>
        )}
      </div>
    </main>
  );
}
