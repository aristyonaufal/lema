'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import BookSpine from '@/components/BookSpine';
import { useDb } from '@/lib/useDb';
import { bacaanFor } from '@/lib/store';
import { muatKatalog, perkiraanJam, TINGKAT, type KatalogBuku } from '@/lib/pustaka';

// Pustaka: buku Inggris domain publik yang bisa dibaca langsung di dalam Lema.
//
// Ada karena selama ini Lema tidak bisa dicoba sama sekali tanpa buku kertas di
// tangan. Siapa pun yang membuka tautannya cuma melihat layar yang menanyakan
// judul buku, dan berhenti di situ.

const warnaTingkat: Record<KatalogBuku['tingkat'], string> = {
  ringan: 'bg-accent-soft text-accent',
  menengah: 'bg-warn-soft text-warn',
  berat: 'bg-sunken text-muted',
};

export default function Pustaka() {
  const { db, ready } = useDb();
  const [buku, setBuku] = useState<KatalogBuku[] | null>(null);
  const [galat, setGalat] = useState<string | null>(null);

  useEffect(() => {
    let batal = false;
    muatKatalog()
      .then((katalog) => { if (!batal) setBuku(katalog.buku); })
      .catch(() => { if (!batal) setGalat('Daftar buku belum bisa dimuat. Coba muat ulang halaman ini.'); });
    return () => { batal = true; };
  }, []);

  return (
    <main className="page flex flex-1 flex-col gap-6 pt-6">
      <header className="flex flex-col gap-2">
        <p className="eyebrow">Baca di Lema</p>
        <h1 className="font-display text-[2rem] leading-tight tracking-tight sm:text-[2.25rem]">
          Pustaka
        </h1>
        <p className="text-muted max-w-prose text-sm leading-relaxed">
          Buku Inggris yang hak ciptanya sudah habis, jadi bebas dibaca siapa saja. Nggak punya buku
          fisik pun kamu bisa langsung mulai.
        </p>
      </header>

      {galat && (
        <p role="alert" className="border-danger/40 bg-danger-soft/50 text-danger rounded-xl border p-3.5 text-sm leading-relaxed">
          {galat}
        </p>
      )}

      {!buku && !galat && (
        <ul className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => <li key={i} className="shimmer h-28 w-full rounded-[1.25rem]" />)}
        </ul>
      )}

      {buku && (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {buku.map((b) => {
            // Posisi baca baru boleh dibaca setelah penyimpanan siap, supaya
            // render di server dan di browser tidak berbeda.
            const bacaan = ready ? bacaanFor(db, b.slug) : null;
            return (
              <li key={b.slug}>
                <Link
                  href={`/pustaka/${b.slug}`}
                  className="card hover:border-muted flex h-full items-start gap-3.5 p-4 transition-colors"
                >
                  <BookSpine title={b.judul} />
                  <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span className="flex flex-wrap items-center gap-2">
                      <span lang="en" className="font-display text-[1.25rem] leading-tight tracking-tight">
                        {b.judul}
                      </span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ${warnaTingkat[b.tingkat]}`}>
                        {TINGKAT[b.tingkat]}
                      </span>
                    </span>
                    <span lang="en" className="text-muted text-sm">{b.penulis}</span>
                    <span className="text-faint text-xs tabular-nums">
                      {b.bab} bab · {b.kata.toLocaleString('id-ID')} kata · sekitar {perkiraanJam(b.kata)}
                    </span>
                    <span className="text-accent mt-1 text-sm font-medium">
                      {bacaan ? `Lanjut baca · bab ${bacaan.bab}` : 'Mulai baca'}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-faint max-w-prose text-xs leading-relaxed">
        Teksnya dari Standard Ebooks, yang mendedikasikan hasil kerjanya ke domain publik. Semua
        judul di sini sudah bebas hak cipta di Indonesia maupun Amerika.
      </p>
    </main>
  );
}
