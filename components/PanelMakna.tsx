'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import SenseMap, { type Correction } from '@/components/SenseMap';
import type { Entry } from '@/lib/store';

// Panel makna di dalam pembaca pustaka.
//
// Muncul dari bawah layar, tidak menutupi seluruh halaman, dan tidak menunggu
// jawaban model sebelum terbuka. Pengukuran 28 September memberi median 14
// detik untuk mode teks; menahan panel sampai jawabannya datang berarti
// pembaca menatap layar diam selama itu. Jadi panelnya terbuka seketika dan
// SenseMap sendiri yang menampilkan keadaan sedang diproses.

export default function PanelMakna({ entry, onClose, onCorrect, onUncorrect }: {
  entry: Entry;
  onClose: () => void;
  onCorrect: (correction: Correction) => void;
  onUncorrect: () => void;
}) {
  const tutup = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  // Fokus dipindah ke panel supaya pembaca yang memakai papan ketik atau
  // pembaca layar tidak tertinggal di paragraf.
  useEffect(() => { tutup.current?.focus(); }, [entry.id]);

  return (
    <>
      {/* Latar gelap sengaja tipis: teks yang sedang dibaca tetap terlihat di
          atas panel, karena maknanya cuma masuk akal bersama kalimatnya. */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/20 lg:left-64"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Makna ${entry.word}`}
        // lg:left-64 menghindari sidebar. Panelnya melayang di atas viewport,
        // jadi ia tidak ikut pergeseran isi yang dilakukan Shell, dan tanpa ini
        // sidebar menutupi tombol tombol di sisi kirinya.
        className="border-line bg-background rise fixed inset-x-0 bottom-0 z-50 flex max-h-[78svh] flex-col rounded-t-[1.5rem] border-t shadow-[0_-8px_40px_rgba(0,0,0,0.18)] lg:left-64"
      >
        <div className="flex items-center gap-3 px-5 pt-3 pb-2">
          <span aria-hidden="true" className="bg-line mx-auto h-1 w-10 rounded-full" />
        </div>
        <div className="flex items-center justify-between gap-3 px-5 pb-3">
          <p lang="en" className="font-display min-w-0 flex-1 truncate text-[1.35rem] leading-none tracking-tight">
            {entry.word}
          </p>
          <button
            ref={tutup}
            onClick={onClose}
            aria-label="Tutup makna"
            className="btn btn-quiet shrink-0 px-3 text-sm"
          >
            Tutup
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
          <SenseMap
            entry={entry}
            onCorrect={onCorrect}
            onUncorrect={onUncorrect}
          />
          <p className="text-muted mt-4 text-xs leading-relaxed">
            Kata ini sudah masuk koleksi bukumu dan bakal ditanyain lagi nanti.{' '}
            <Link href={{ pathname: '/kata', query: { entry: entry.id } }} className="text-accent font-medium">
              Buka di koleksi
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
