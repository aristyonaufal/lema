'use client';

import { Fragment, useState, type ReactNode } from 'react';
import { findTextRanges, sentenceSegments } from '@/lib/text-matches';
import type { Question } from '@/lib/quiz';

const LETTERS = ['A', 'B', 'C', 'D', 'E'];

// Satu soal kuis. Dipakai di tiga tempat: layar kuis sendiri, gerbang sebelum
// tombol "Inget" dan "Udah hafal" di review, dan gerbang sebelum "Aku udah tahu
// kata ini" di koleksi. Ketiganya memakai soal yang sama bentuknya supaya
// pengguna tidak perlu belajar dua cara menjawab.
//
// Komponen ini hanya melaporkan benar atau salah lewat onAnswer, satu kali.
// Apa akibatnya, misalnya jadwal naik atau kata ditandai sudah tahu, diputuskan
// pemanggil. Pemanggil wajib memberi `key` berbeda untuk setiap soal supaya
// pilihan dari soal sebelumnya tidak terbawa.
export default function QuizCard({ question, label = 'Kuis', onAnswer, children }: {
  question: Question;
  label?: string;
  onAnswer: (correct: boolean) => void;
  // Ditampilkan setelah menjawab, misalnya tombol lanjut.
  children?: (correct: boolean) => ReactNode;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const correct = picked === question.answer;

  // Pencocokan memakai pembantu yang sama dengan peta makna, jadi frasa dan
  // tanda baca di dalam kata tetap aman ditebalkan. Kalau bentuk di buku tidak
  // muncul di kalimat baru, misalnya "made out" di buku dan "make out" di
  // kalimat soal, bentuk dasarnya yang dicari, sama seperti layar review.
  let ranges = findTextRanges(question.sentence, question.word);
  if (ranges.length === 0) ranges = findTextRanges(question.sentence, question.lemma);
  const segments = sentenceSegments(question.sentence, ranges, []);

  function pick(index: number) {
    if (answered) return;
    setPicked(index);
    onAnswer(index === question.answer);
  }

  return (
    <section aria-label="Soal kuis" className="card flex flex-col gap-4 p-5">
      <p className="eyebrow">{label}</p>
      <p lang="en" className="font-display text-[1.5rem] leading-[1.35] tracking-tight">
        {segments.map((segment) => (
          <Fragment key={segment.start}>
            {segment.target ? (
              <strong className="text-accent decoration-accent/40 font-semibold underline decoration-2 underline-offset-4">
                {segment.text}
              </strong>
            ) : segment.text}
          </Fragment>
        ))}
      </p>
      <p className="text-sm leading-relaxed">
        Apa arti <strong lang="en" className="font-semibold">{question.word}</strong> di kalimat ini?
      </p>

      <div role="group" aria-label="Pilihan jawaban" className="flex flex-col gap-2">
        {question.options.map((option, index) => {
          const isAnswer = index === question.answer;
          const isPicked = index === picked;
          const tone = !answered
            ? 'border-line bg-surface hover:border-muted'
            : isAnswer
              ? 'border-accent bg-accent-soft'
              : isPicked
                ? 'border-danger bg-danger-soft'
                : 'border-line bg-surface opacity-50';
          return (
            <button
              key={option}
              type="button"
              onClick={() => pick(index)}
              disabled={answered}
              className={`flex min-h-12 w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left text-sm transition-colors disabled:cursor-default ${tone}`}
            >
              <span
                aria-hidden="true"
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[0.6875rem] font-semibold ${
                  answered && isAnswer ? 'bg-accent text-accent-ink' : answered && isPicked ? 'bg-danger text-white' : 'bg-sunken text-muted'
                }`}
              >
                {LETTERS[index]}
              </span>
              <span className="flex-1 leading-snug">{option}</span>
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="rise border-line flex flex-col gap-3 border-t pt-4">
          <p role="status" className={`text-sm font-semibold ${correct ? 'text-accent' : 'text-danger'}`}>
            {correct ? 'Benar!' : 'Belum tepat.'}
          </p>
          {!correct && (
            <p className="text-sm leading-relaxed">
              Jawabannya: <strong className="font-semibold">{question.options[question.answer]}</strong>
            </p>
          )}
          <p lang="en" className="text-muted text-sm">{question.meaningEn}</p>
          {question.source && (
            <div>
              <p className="eyebrow mb-1.5">Kalimat asal dari bukumu</p>
              <blockquote lang="en" className="border-accent text-muted border-l-2 pl-3 text-sm leading-relaxed italic">
                {question.source}
              </blockquote>
            </div>
          )}
          {children?.(correct)}
        </div>
      )}
    </section>
  );
}
