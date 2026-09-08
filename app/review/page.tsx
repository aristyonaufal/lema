'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useDb } from '@/lib/useDb';
import { due, grade, markKnown } from '@/lib/store';

export default function Review() {
  const { db, update, ready } = useDb();
  const [shown, setShown] = useState(false);
  const [count, setCount] = useState(0);

  if (!ready) return <main className="p-6" />;

  const queue = due(db);
  const entry = queue[0];

  if (!entry) {
    return (
      <main className="mx-auto flex max-w-md flex-col gap-3 p-6 pt-16">
        <h1 className="text-xl font-semibold tracking-tight">Review beres</h1>
        <p className="text-muted text-sm">
          {count > 0
            ? `${count} kata selesai hari ini. Sisanya nanti sesuai jadwalnya.`
            : 'Belum ada kata yang jatuh tempo. Balik lagi besok.'}
        </p>
        <Link href="/" className="text-accent underline underline-offset-4">
          Kembali
        </Link>
      </main>
    );
  }

  const r = entry.result!;
  const main = r.candidates[0];

  // Kalimat baru, bukan kalimat asal dari buku. Kalau yang direview kalimat yang sama,
  // yang kehafal itu kalimatnya, bukan katanya.
  const parts = r.new_sentence.split(new RegExp(`(${r.lemma || r.word})`, 'i'));

  function answer(remembered: boolean) {
    if (!update((current) => grade(current, entry.id, remembered))) return;
    setShown(false);
    setCount((c) => c + 1);
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 p-5 pt-10">
      <header className="flex items-center justify-between">
        <span className="text-muted text-xs tracking-wider uppercase">
          Sisa {queue.length} kata
        </span>
        <Link href="/" className="text-muted text-sm underline underline-offset-4">
          Nanti aja
        </Link>
      </header>

      <p className="text-lg leading-relaxed">
        {parts.map((p, i) =>
          p.toLowerCase() === (r.lemma || r.word).toLowerCase() ? (
            <strong key={i} className="text-accent font-semibold">
              {p}
            </strong>
          ) : (
            <span key={i}>{p}</span>
          )
        )}
      </p>

      <p className="text-muted text-sm">
        Kalimat ini baru, bukan kalimat dari bukumu. Masih inget artinya?
      </p>

      {shown ? (
        <div className="border-line bg-surface flex flex-col gap-3 rounded-xl border p-4">
          <p className="text-lg font-medium">{main.meaning_id}</p>
          {r.sentence && (
            <p className="text-muted border-line border-l-2 pl-3 text-sm italic">{r.sentence}</p>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={() => answer(true)}
              className="bg-accent rounded-lg px-4 py-2 font-medium text-white"
            >
              Inget
            </button>
            <button onClick={() => answer(false)} className="border-line rounded-lg border px-4 py-2">
              Lupa
            </button>
            <button
              onClick={() => {
                if (!update((current) => markKnown(current, entry.id))) return;
                setShown(false);
              }}
              className="text-muted px-2 py-2 text-sm underline underline-offset-4"
            >
              Udah hafal, stop tanya
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShown(true)}
          className="border-line rounded-lg border px-4 py-3 font-medium"
        >
          Buka artinya
        </button>
      )}
    </main>
  );
}
