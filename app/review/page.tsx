'use client';

import { Fragment, Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useDb } from '@/lib/useDb';
import { findTextRanges, sentenceSegments } from '@/lib/text-matches';
import { ProgressBar } from '@/components/ui';
import { due, grade, markKnown, practicePool, LADDER } from '@/lib/store';

export default function Review() {
  return (
    <Suspense fallback={<main className="page page-narrow text-muted flex-1 pt-10 text-sm">Menyiapkan review...</main>}>
      <ReviewSession />
    </Suspense>
  );
}

function nextInterval(stage: number, remembered: boolean): string {
  const next = remembered ? Math.min(stage + 1, LADDER.length - 1) : 0;
  const days = LADDER[next];
  return days === 1 ? 'besok' : `${days} hari lagi`;
}

// Dua mode di satu layar.
//
// Review biasa hanya mengambil kata yang jatuh tempo, dan menggeser jadwalnya.
// Latihan mengambil kata mana pun yang sudah punya makna, kapan saja, dan
// sengaja TIDAK menyentuh jadwal maupun riwayat "pernah lolos review". Kalau
// latihan ikut menggeser jadwal, angka progres berubah menjadi ukuran seberapa
// sering seseorang menekan tombol, bukan seberapa lama dia masih ingat.
function ReviewSession() {
  const params = useSearchParams();
  const { db, update, ready } = useDb();
  const [shown, setShown] = useState(false);
  const [seen, setSeen] = useState<string[]>([]);

  const practice = params.get('latihan') === '1';
  const bookParam = params.get('buku');

  if (!ready) {
    return (
      <main className="page page-narrow flex-1 pt-10">
        <div className="shimmer h-4 w-24 rounded-full" />
        <div className="shimmer mt-6 h-28 w-full rounded-[1.25rem]" />
      </main>
    );
  }

  const book = bookParam ? db.books.find((b) => b.id === bookParam) ?? null : null;
  const pool = practice ? practicePool(db, book?.id ?? null) : due(db);
  const queue = pool.filter((e) => !seen.includes(e.id));
  const entry = queue[0];
  const count = seen.length;

  if (!entry) {
    // Antreannya kosong. Untuk review biasa itu berarti belum ada yang jatuh
    // tempo, jadi tanggal terdekatnya disebutkan. Tanggal itu dibaca dari data
    // yang tersimpan, bukan dari jam saat render, supaya hasilnya sama setiap
    // kali komponen digambar ulang.
    const upcoming = db.entries
      .filter((e) => e.status === 'done' && !e.known && e.result?.new_sentence)
      .sort((a, b) => a.dueAt - b.dueAt)[0];
    const when = upcoming
      ? new Date(upcoming.dueAt).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })
      : '';
    const canPractice = practicePool(db).length > 0;

    return (
      <main className="page page-narrow flex flex-1 flex-col items-center gap-4 pt-20 text-center">
        <span className="bg-accent-soft text-accent flex h-16 w-16 items-center justify-center rounded-full">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-8 w-8">
            <path d="m5 12.5 4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <h1 className="font-display text-[2rem] leading-tight tracking-tight">
          {count > 0
            ? practice ? 'Latihan beres' : 'Review beres'
            : practice ? 'Belum ada yang bisa dilatih' : 'Belum ada yang jatuh tempo'}
        </h1>
        <p className="text-muted text-sm leading-relaxed">
          {count > 0
            ? practice
              ? `${count} kata dilatih. Jadwal review aslinya nggak berubah.`
              : `${count} kata selesai hari ini. Sisanya nanti sesuai jadwalnya.`
            : practice
              ? book
                ? `Buku ${book.title} belum punya kata yang siap dilatih.`
                : 'Simpan beberapa kata dulu, baru ada yang bisa dilatih.'
              : upcoming
                ? `Kata berikutnya nunggu sampai ${when}. Kalau nggak sabar, kamu bisa latihan sekarang tanpa nunggu jadwal.`
                : 'Simpan beberapa kata dulu, nanti Lema yang mengingatkan kamu.'}
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {!practice && canPractice && (
            <Link href="/review?latihan=1" className="btn btn-primary">
              Latihan sekarang
            </Link>
          )}
          <Link href="/baca" className={!practice && canPractice ? 'btn btn-ghost' : 'btn btn-primary'}>
            Lanjut baca
          </Link>
        </div>
      </main>
    );
  }

  const r = entry.result!;
  const main = r.candidates[0];
  const entryBook = db.books.find((b) => b.id === entry.bookId);
  const total = queue.length + count;
  const target = r.lemma || r.word;

  // Kalimat baru, bukan kalimat asal dari buku. Kalau yang direview kalimat yang sama,
  // yang kehafal itu kalimatnya, bukan katanya.
  //
  // Pencocokan memakai pembantu yang sama dengan peta makna: tanda baca di dalam
  // kata di-escape, dan batas kata dijaga. Membangun RegExp langsung dari lemma
  // bisa gagal untuk kata seperti "make (out)".
  let ranges = findTextRanges(r.new_sentence, r.word);
  if (ranges.length === 0) ranges = findTextRanges(r.new_sentence, target);
  const segments = sentenceSegments(r.new_sentence, ranges, []);

  function answer(remembered: boolean) {
    // Latihan tidak menulis apa pun ke penyimpanan, jadi tidak ada yang bisa
    // gagal disimpan dan tidak ada jadwal yang bergeser.
    if (!practice && !update((current) => grade(current, entry.id, remembered))) return;
    setShown(false);
    setSeen((current) => [...current, entry.id]);
  }

  return (
    <main className="page page-narrow flex flex-1 flex-col gap-6 pt-6">
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <p className="eyebrow">
            {practice ? 'Latihan' : 'Review'}{entryBook ? ` · ${entryBook.title}` : ''}
          </p>
          <Link href="/" className="text-muted shrink-0 text-sm">
            Nanti aja
          </Link>
        </div>
        {/* Kemajuan sesi dibuat terlihat, supaya antrean terasa berujung. */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <ProgressBar value={count} max={total} />
          </div>
          <span className="text-muted text-xs tabular-nums">
            {count} / {total}
          </span>
        </div>
        {practice && (
          <p className="text-faint text-xs leading-relaxed">
            Latihan bebas, nggak nunggu jatuh tempo. Jawabanmu di sini nggak menggeser
            jadwal review dan nggak dihitung sebagai lolos review.
          </p>
        )}
      </header>

      <section aria-label="Kalimat review" className="card mt-auto flex flex-col gap-4 p-5">
        <p className="eyebrow">Kalimat baru</p>
        <p lang="en" className="font-display text-[1.6rem] leading-[1.35] tracking-tight">
          {segments.map((segment) => (
            <Fragment key={segment.start}>
              {segment.target ? (
                <strong className="text-accent decoration-accent/40 font-semibold underline decoration-2 underline-offset-4">
                  {segment.text}
                </strong>
              ) : (
                segment.text
              )}
            </Fragment>
          ))}
        </p>
        <p className="text-muted text-sm leading-relaxed">
          Kalimat ini baru, bukan kalimat dari bukumu. Masih inget artinya?
        </p>
      </section>

      {shown ? (
        <section aria-label="Jawaban" className="rise flex flex-col gap-4 lg:mb-auto">
          <div className="card flex flex-col gap-3 p-5">
            <p className="eyebrow">Artinya</p>
            <p className="text-xl leading-snug font-semibold">{main.meaning_id}</p>
            <p lang="en" className="text-muted text-sm">{main.meaning_en}</p>
            {r.sentence && (
              <div className="border-line mt-1 border-t pt-3">
                <p className="eyebrow mb-1.5">Kalimat asal dari bukumu</p>
                <blockquote lang="en" className="border-accent text-muted border-l-2 pl-3 text-sm leading-relaxed italic">
                  {r.sentence}
                </blockquote>
              </div>
            )}
          </div>

          {/* Dua jawaban berdampingan dan sama besar: tidak ada yang "benar",
              jadi tidak ada yang perlu dibuat lebih menonjol. */}
          <div className="grid grid-cols-2 gap-2.5">
            <button onClick={() => answer(false)} className="btn btn-ghost h-14 flex-col gap-0.5">
              Lupa
              <span className="text-faint text-[0.6875rem] font-normal">
                {practice ? 'cuma latihan' : `ulang ${nextInterval(entry.stage, false)}`}
              </span>
            </button>
            <button onClick={() => answer(true)} className="btn btn-primary h-14 flex-col gap-0.5">
              Inget
              <span className="text-[0.6875rem] font-normal opacity-70">
                {practice ? 'cuma latihan' : `ulang ${nextInterval(entry.stage, true)}`}
              </span>
            </button>
          </div>

          <button
            onClick={() => {
              if (!update((current) => markKnown(current, entry.id))) return;
              setShown(false);
              setSeen((current) => [...current, entry.id]);
            }}
            className="btn btn-quiet mx-auto text-sm"
          >
            Udah hafal, stop tanya
          </button>
        </section>
      ) : (
        <div className="mt-auto pb-2 lg:mt-4 lg:mb-auto">
          <button onClick={() => setShown(true)} className="btn btn-primary w-full">
            Buka artinya
          </button>
        </div>
      )}
    </main>
  );
}
