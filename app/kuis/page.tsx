'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useDb } from '@/lib/useDb';
import QuizCard from '@/components/QuizCard';
import { ProgressBar, SectionHeader } from '@/components/ui';
import { buildDeck, quizCount, type Question } from '@/lib/quiz';

// Satu sesi paling banyak sepuluh soal: cukup untuk terasa seperti latihan,
// cukup pendek untuk diselesaikan di sela bacaan.
const SESSION = 10;

type Session = { deck: Question[]; index: number; results: boolean[] };

// Kuis sendiri, dari semua buku dan semua jadwal.
//
// Sengaja tidak menulis apa pun ke koleksi. Jadwal review mengandalkan jeda:
// kata yang dijawab benar tiga kali dalam sepuluh menit belum tentu masih
// diingat minggu depan. Kalau kuis ini ikut menaikkan jadwal, jadwalnya
// berhenti mengukur ingatan dan mulai mengukur seberapa sering orang main kuis.
// Kuis yang memang menentukan jadwal ada di layar review, sebagai gerbang
// sebelum tombol "Inget".
export default function Kuis() {
  const { db, ready } = useDb();
  const [session, setSession] = useState<Session | null>(null);

  if (!ready) {
    return (
      <main className="page page-narrow flex-1 pt-10">
        <div className="shimmer h-4 w-24 rounded-full" />
        <div className="shimmer mt-3 h-9 w-52 rounded-lg" />
        <div className="shimmer mt-6 h-40 w-full rounded-[1.25rem]" />
      </main>
    );
  }

  const available = quizCount(db);

  // Urutan soal dan urutan pilihannya diacak di sini, saat tombol ditekan.
  // Mengacak saat layar digambar membuat soal berganti sendiri setiap kali
  // komponen diperbarui.
  function start() {
    const deck = buildDeck(db, SESSION);
    if (deck.length > 0) setSession({ deck, index: 0, results: [] });
  }

  if (!session) {
    return (
      <main className="page page-narrow flex flex-1 flex-col gap-6 pt-6">
        <header className="flex flex-col gap-2">
          <p className="eyebrow">Kuis</p>
          <h1 className="font-display text-[2.125rem] leading-[1.08] tracking-tight sm:text-[2.5rem]">
            Seberapa nempel kata katamu?
          </h1>
          <p className="text-muted text-sm leading-relaxed">
            Soal diambil dari semua bukumu, termasuk kata yang belum jatuh tempo dan yang
            sudah kamu tandai hafal.
          </p>
        </header>

        {available === 0 ? (
          <div className="card flex flex-col items-center gap-3 p-8 text-center">
            <p className="font-medium">Belum ada kata yang bisa dikuiskan</p>
            <p className="text-muted text-sm leading-relaxed">
              Satu soal butuh satu kata yang maknanya sudah ada, plus minimal satu makna lain
              sebagai pilihan pengecoh. Kumpulkan beberapa kata dulu.
            </p>
            <Link href="/baca" className="btn btn-primary mt-1">
              Tandai kata baru
            </Link>
          </div>
        ) : (
          <div className="card flex flex-col gap-4 p-5">
            <p className="font-medium">
              {Math.min(available, SESSION)} soal dari {available} kata
            </p>
            <ul className="text-muted flex flex-col gap-2 text-sm leading-relaxed">
              <li className="flex gap-2">
                <span aria-hidden="true" className="bg-line mt-2 h-1 w-1 shrink-0 rounded-full" />
                <span>
                  Pilihan pengecohnya diambil dari makna lain kata yang sama. Jadi yang diuji
                  bukan artinya apa, tapi makna yang mana yang pas di kalimat itu.
                </span>
              </li>
              <li className="flex gap-2">
                <span aria-hidden="true" className="bg-line mt-2 h-1 w-1 shrink-0 rounded-full" />
                <span>Ini latihan bebas. Jadwal review-mu nggak berubah.</span>
              </li>
            </ul>
            <button onClick={start} className="btn btn-primary w-full">
              Mulai kuis
            </button>
          </div>
        )}
      </main>
    );
  }

  const { deck, index, results } = session;
  const correctCount = results.filter(Boolean).length;

  if (index >= deck.length) {
    const missed = deck.filter((_, i) => !results[i]);
    const ratio = correctCount / deck.length;
    return (
      <main className="page page-narrow flex flex-1 flex-col gap-6 pt-6">
        <header className="flex flex-col gap-2">
          <p className="eyebrow">Hasil kuis</p>
          <h1 className="font-display text-[2.125rem] leading-[1.08] tracking-tight sm:text-[2.5rem]">
            {correctCount} dari {deck.length} benar
          </h1>
          <p className="text-muted text-sm leading-relaxed">
            {ratio === 1
              ? 'Semuanya benar. Kata kata ini sudah nempel.'
              : ratio >= 0.7
                ? 'Sebagian besar sudah nempel. Sisanya ada di bawah.'
                : 'Beberapa kata masih perlu diulang, dan itu wajar. Lihat lagi kartunya di bawah.'}
          </p>
        </header>

        {missed.length > 0 && (
          <section aria-label="Perlu dilihat lagi" className="flex flex-col gap-3">
            <SectionHeader title="Perlu dilihat lagi" hint={`${missed.length} kata`} />
            <ul className="flex flex-col gap-2">
              {missed.map((q) => (
                <li key={q.entryId}>
                  <Link
                    href={{ pathname: '/kata', query: { entry: q.entryId } }}
                    className="card hover:border-muted flex flex-col gap-1 px-3.5 py-3 transition-colors"
                  >
                    <span lang="en" className="font-display text-[1.25rem] leading-none tracking-tight">{q.word}</span>
                    <span className="text-muted text-sm">{q.options[q.answer]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="flex flex-col gap-2 pb-2">
          <button onClick={start} className="btn btn-primary w-full">
            Kuis lagi
          </button>
          <Link href="/" className="btn btn-quiet w-full text-sm">
            Ke beranda
          </Link>
        </div>
      </main>
    );
  }

  const question = deck[index];
  const book = db.books.find((b) => b.id === question.bookId);

  return (
    <main className="page page-narrow flex flex-1 flex-col gap-6 pt-6">
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <p className="eyebrow">Kuis · soal {index + 1} dari {deck.length}</p>
          <button onClick={() => setSession(null)} className="text-muted shrink-0 text-sm">
            Berhenti
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <ProgressBar value={index} max={deck.length} />
          </div>
          <span className="text-muted text-xs tabular-nums">{correctCount} benar</span>
        </div>
      </header>

      <QuizCard
        key={`${index}-${question.entryId}`}
        question={question}
        label={book ? `Dari ${book.title}` : 'Kuis'}
        onAnswer={(correct) => setSession((current) => current && { ...current, results: [...current.results, correct] })}
      >
        {() => (
          <button
            onClick={() => setSession((current) => current && { ...current, index: current.index + 1 })}
            className="btn btn-primary w-full"
          >
            {index + 1 < deck.length ? 'Soal berikutnya' : 'Lihat hasil'}
          </button>
        )}
      </QuizCard>
    </main>
  );
}
