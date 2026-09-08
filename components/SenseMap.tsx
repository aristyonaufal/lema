'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import type { Entry } from '@/lib/store';
import type { Candidate } from '@/lib/types';
import { findTextRanges, sentenceSegments } from '@/lib/text-matches';

const triggerColors = [
  'bg-accent/15 text-foreground',
  'bg-amber-400/25 text-foreground',
];

function Explanation({ candidate, index, inSentence }: {
  candidate: Candidate;
  index: number;
  inSentence: boolean;
}) {
  const trigger = typeof candidate.trigger === 'string' ? candidate.trigger : '';
  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-muted text-xs font-medium">Pemicu makna</p>
        {trigger.trim() ? (
          <>
            <p className="mt-1.5 text-sm leading-relaxed">
              <q lang="en" className={`${triggerColors[index]} rounded px-1 py-0.5 whitespace-pre-wrap`}>
                {trigger}
              </q>
            </p>
            {!inSentence && (
              <p className="text-muted mt-2 text-xs leading-relaxed">
                Potongan ini tidak muncul persis dalam kalimat di atas.
              </p>
            )}
          </>
        ) : (
          <p className="text-muted mt-1 text-sm">Pemicu belum tersedia.</p>
        )}
      </div>
      <div>
        <p className="text-muted text-xs font-medium">Kenapa maknanya ini</p>
        <p className="mt-1 text-sm leading-relaxed">{candidate.why_id}</p>
      </div>
    </div>
  );
}

export default function SenseMap({ entry, onKnown, onRemove, onRetry }: {
  entry: Entry;
  onKnown?: () => void;
  onRemove?: () => void;
  onRetry?: () => boolean;
}) {
  if (entry.status === 'pending') {
    return (
      <div className="border-line rounded-xl border p-5">
        <p className="text-muted text-sm">Sedang diproses: {entry.word}</p>
      </div>
    );
  }

  if (entry.status === 'error' || !entry.result?.candidates?.[0]) {
    return (
      <div className="border-line flex flex-col items-start gap-2 rounded-xl border p-5">
        <p className="font-medium">{entry.word}</p>
        <p className="text-muted text-sm">{entry.error ?? 'Makna belum lengkap. Pilih ulang foto dan coba lagi.'}</p>
        {onRetry && (
          <Link
            href="/"
            onClick={(event) => { if (!onRetry()) event.preventDefault(); }}
            className="text-accent text-sm underline underline-offset-4"
          >
            Pilih ulang foto
          </Link>
        )}
        {onRemove && (
          <button onClick={onRemove} className="border-line text-muted hover:text-foreground rounded-lg border px-3 py-1.5 text-sm">
            Hapus
          </button>
        )}
      </div>
    );
  }

  const r = entry.result;
  const main = r.candidates[0];
  const notFound = r.found === false;
  const alt = r.ambiguous && !notFound ? r.candidates[1] : undefined;
  const incompleteAmbiguity = r.ambiguous && !notFound && !alt;
  const sentence = typeof r.sentence === 'string' ? r.sentence : '';
  const candidates = alt ? [main, alt] : [main];
  let targets = notFound ? [] : findTextRanges(sentence, r.word);
  if (!notFound && targets.length === 0) targets = findTextRanges(sentence, r.lemma);
  const triggers = candidates.map((candidate) => notFound ? [] : findTextRanges(sentence, candidate.trigger));
  const segments = sentenceSegments(sentence, targets, triggers);

  return (
    <article className="border-line bg-surface flex min-w-0 flex-col gap-5 rounded-xl border p-5 [overflow-wrap:anywhere]">
      <header className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-2xl font-semibold tracking-tight">{r.word}</h2>
          {r.is_phrase && <span className="text-muted border-line rounded border px-1.5 py-0.5 text-xs">Frasa</span>}
        </div>
        {r.lemma && r.lemma.toLowerCase() !== r.word.toLowerCase() && (
          <p className="text-muted text-sm">Bentuk dasar: <span lang="en">{r.lemma}</span></p>
        )}
      </header>

      {notFound && (
        <section aria-label="Kata tidak ditemukan" className="border-line bg-background rounded-lg border border-dashed p-3">
          <p className="text-sm font-medium">Kata ini tidak ketemu di halaman yang kamu foto.</p>
          <p className="text-muted mt-1 text-sm leading-relaxed">
            Arti di bawah cuma arti kamus umum, jadi belum tentu cocok sama bukumu.
            Periksa ejaan katanya atau pilih ulang foto yang lebih jelas.
          </p>
          <div className="border-line mt-3 border-t pt-2">
            <p className="text-muted text-xs font-medium">Yang kebaca dari fotomu</p>
            <p className="text-muted mt-1 text-sm leading-relaxed">
              {r.page_excerpt ? (
                <q lang="en" className="italic">{r.page_excerpt}</q>
              ) : 'Kosong. Coba foto ulang lebih dekat dan lebih terang.'}
            </p>
          </div>
        </section>
      )}

      {sentence && (
        <section aria-label="Kalimat asal" className="flex flex-col gap-2.5">
          <p className="text-muted text-xs font-medium tracking-wider uppercase">Dari halaman bukumu</p>
          <blockquote lang="en" className="border-line border-l-2 pl-3 text-base leading-relaxed whitespace-pre-wrap">
            {segments.map((segment) => {
              const text = segment.target
                ? <strong className="font-bold">{segment.text}</strong>
                : segment.text;
              return (
                <Fragment key={segment.start}>
                  {segment.triggers.length > 0 ? (
                    <mark
                      title={alt ? `Pemicu makna ${segment.triggers.map((index) => index + 1).join(' dan ')}` : 'Pemicu makna'}
                      className={`rounded-sm ${triggerColors[segment.triggers[0]]} ${segment.triggers.length > 1 ? 'underline decoration-amber-500 decoration-2 underline-offset-4' : ''}`}
                    >
                      {text}
                    </mark>
                  ) : text}
                </Fragment>
              );
            })}
          </blockquote>
          {!notFound && (
            <div className="text-muted flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              {targets.length > 0 && <span><strong className="text-foreground font-bold">Tebal</strong> = kata yang ditanyakan</span>}
              {candidates.map((_, index) => triggers[index].length > 0 && (
                <span key={index} className={`${triggerColors[index]} rounded px-1.5 py-0.5`}>
                  {alt ? `Pemicu ${index + 1}` : 'Pemicu makna'}
                </span>
              ))}
            </div>
          )}
          {!notFound && targets.length === 0 && (
            <p className="text-muted text-xs leading-relaxed">Kata yang ditanyakan tidak tampak persis dalam kalimat ini.</p>
          )}
        </section>
      )}

      {incompleteAmbiguity && (
        <p className="text-muted text-sm leading-relaxed">Model masih ragu, tetapi kandidat makna kedua belum tersedia.</p>
      )}

      {alt ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium">Dua makna sama masuk akalnya di sini. Ini sengaja tidak dipilihkan.</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {candidates.map((candidate, index) => (
              <section key={index} aria-label={`Makna ${index + 1}`} className="border-line flex min-w-0 flex-col gap-4 rounded-lg border p-3">
                <div>
                  <p className={`mb-2 w-fit rounded px-1.5 py-0.5 text-xs font-medium ${triggerColors[index]}`}>Kemungkinan {index + 1}</p>
                  <h3 className="text-lg leading-snug font-semibold">{candidate.meaning_id}</h3>
                  <p lang="en" className="text-muted mt-1 text-sm leading-relaxed">{candidate.meaning_en}</p>
                </div>
                <Explanation candidate={candidate} index={index} inSentence={triggers[index].length > 0} />
              </section>
            ))}
          </div>
        </div>
      ) : (
        <section aria-label={notFound ? 'Arti umum' : incompleteAmbiguity ? 'Makna yang tersedia' : 'Makna di sini'} className="flex flex-col gap-4">
          <div>
            <p className="text-accent mb-1.5 text-xs font-medium tracking-wider uppercase">{notFound ? 'Arti umum' : incompleteAmbiguity ? 'Makna yang tersedia' : 'Makna di sini'}</p>
            <h3 className="text-xl leading-snug font-semibold">{main.meaning_id}</h3>
            <p lang="en" className="text-muted mt-1 text-sm leading-relaxed">{main.meaning_en}</p>
          </div>
          {!notFound && <Explanation candidate={main} index={0} inSentence={triggers[0].length > 0} />}
        </section>
      )}

      {r.caution_id && (
        <aside aria-label="Catatan makna" className="border-accent bg-accent/10 rounded-r-lg border-l-2 p-3">
          <p className="text-accent text-xs font-semibold tracking-wider uppercase">Hati hati</p>
          <p className="mt-1 text-sm leading-relaxed">{r.caution_id}</p>
        </aside>
      )}

      {r.other_senses.length > 0 && (
        <section aria-label="Makna lain" className="border-line flex flex-col gap-2 border-t pt-4">
          <h3 className="text-muted text-xs font-semibold tracking-wider uppercase">Makna lain</h3>
          <p className="text-muted text-xs">Bisa dipakai pada konteks berbeda.</p>
          <ul className="text-muted flex flex-col gap-2 text-sm leading-relaxed">
            {r.other_senses.map((sense, index) => (
              <li key={index}>
                {sense.meaning_id} <span lang="en">({sense.meaning_en})</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {onKnown && !entry.known && (
        <button onClick={onKnown} className="border-line text-muted hover:text-foreground w-fit rounded-lg border px-3 py-1.5 text-sm">
          Aku udah tahu kata ini
        </button>
      )}
      {entry.known && <p className="text-muted text-sm">Ditandai sudah tahu, tidak akan direview.</p>}
    </article>
  );
}
