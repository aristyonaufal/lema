'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import BookSpine from '@/components/BookSpine';
import { useDb } from '@/lib/useDb';
import { bacaanFor } from '@/lib/store';
import { muatKatalog, perkiraanJam, TINGKAT, type KatalogBuku } from '@/lib/pustaka';
import { babTersimpan, dukungLuring, hapusBuku, unduhBuku } from '@/lib/offline';

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
  // Berapa bab tiap buku yang sudah tersimpan di peramban ini.
  const [tersimpan, setTersimpan] = useState<Map<string, number>>(new Map());
  // Buku yang sedang diunduh, beserta kemajuannya.
  const [sedang, setSedang] = useState<{ slug: string; selesai: number; total: number } | null>(null);
  const bisaLuring = dukungLuring();

  const segarkanSimpanan = () => { void babTersimpan().then(setTersimpan); };
  useEffect(() => { void babTersimpan().then(setTersimpan); }, []);

  async function unduh(b: KatalogBuku) {
    setSedang({ slug: b.slug, selesai: 0, total: b.bab + 1 });
    try {
      await unduhBuku(b.slug, b.bab, (k) => setSedang({ slug: b.slug, ...k }));
    } catch {
      setGalat('Unduhan gagal. Coba lagi saat koneksinya lebih stabil.');
    }
    setSedang(null);
    segarkanSimpanan();
  }

  async function hapus(slug: string) {
    await hapusBuku(slug).catch(() => {});
    segarkanSimpanan();
  }

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
            const sudah = tersimpan.get(b.slug) ?? 0;
            const lengkap = sudah >= b.bab;
            return (
              <li key={b.slug} className="flex flex-col">
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

                {/* Unduhan ditaruh di luar kartu, bukan di dalamnya: kartunya
                    sendiri sudah sebuah tautan, dan tombol di dalam tautan
                    bukan HTML yang sah. */}
                {bisaLuring && (
                  <div className="mt-1.5 flex items-center gap-3 px-1">
                    {sedang?.slug === b.slug ? (
                      <span role="status" className="text-muted text-xs tabular-nums">
                        Mengunduh {sedang.selesai} dari {sedang.total} berkas…
                      </span>
                    ) : lengkap ? (
                      <>
                        <span className="text-accent flex items-center gap-1 text-xs font-medium">
                          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-3.5 w-3.5">
                            <path d="m5 12.5 4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Bisa dibaca tanpa koneksi
                        </span>
                        <button
                          onClick={() => hapus(b.slug)}
                          className="text-muted hover:text-foreground text-xs underline"
                        >
                          Hapus unduhan
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => unduh(b)}
                        disabled={sedang !== null}
                        className="text-accent hover:text-foreground text-xs font-medium disabled:opacity-40"
                      >
                        {sudah > 0 ? `Lanjutkan unduhan (${sudah} dari ${b.bab} bab)` : 'Unduh buat dibaca luring'}
                      </button>
                    )}
                  </div>
                )}
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
