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

// Seberapa yakin model, ditulis apa adanya. Prinsip ketiga PRD: ragu itu
// ditampilkan, bukan disembunyikan, jadi angkanya tidak dibulatkan ke atas
// atau disembunyikan ketika rendah.
function Confidence({ value }: { value: number }) {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  const percent = Math.max(0, Math.min(100, Math.round(value * 100)));
  const low = percent < 60;
  return (
    <span className="flex items-center gap-1.5" title={`Keyakinan model ${percent} persen`}>
      <span aria-hidden="true" className="bg-sunken h-1 w-10 overflow-hidden rounded-full">
        <span
          className={`block h-full rounded-full ${low ? 'bg-warn' : 'bg-accent'}`}
          style={{ width: `${percent}%` }}
        />
      </span>
      <span className={`text-[0.6875rem] tabular-nums ${low ? 'text-warn' : 'text-muted'}`}>
        yakin {percent}%
      </span>
    </span>
  );
}

function Explanation({ candidate, index, inSentence }: {
  candidate: Candidate;
  index: number;
  inSentence: boolean;
}) {
  const trigger = typeof candidate.trigger === 'string' ? candidate.trigger : '';
  return (
    <div className="bg-sunken flex flex-col gap-3 rounded-xl p-3.5">
      <div>
        <p className="eyebrow">Pemicu makna</p>
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
        <p className="eyebrow">Kenapa maknanya ini</p>
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
      <div className="card flex items-center gap-3.5 p-5">
        <span aria-hidden="true" className="bg-warn/15 flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
          <span className="bg-warn h-2 w-2 animate-pulse rounded-full" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-muted text-sm">Sedang diproses: {entry.word}</p>
          <div className="shimmer mt-2 h-2 w-4/5 rounded-full" />
        </div>
      </div>
    );
  }

  if (entry.status === 'error' || !entry.result?.candidates?.[0]) {
    return (
      <div className="card border-danger/30 flex flex-col items-start gap-3 p-5">
        <div className="flex w-full items-center gap-2">
          <p className="min-w-0 flex-1 truncate font-medium">{entry.word}</p>
          <span className="bg-danger-soft text-danger shrink-0 rounded-full px-2 py-0.5 text-[0.6875rem] font-medium">
            Gagal
          </span>
        </div>
        <p className="text-muted text-sm leading-relaxed">
          {entry.error ?? 'Makna belum lengkap. Pilih ulang foto dan coba lagi.'}
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {onRetry && (
            <Link
              href="/"
              onClick={(event) => { if (!onRetry()) event.preventDefault(); }}
              className="btn btn-ghost border-accent/40 text-accent text-sm"
            >
              Pilih ulang foto
            </Link>
          )}
          {onRemove && (
            <button onClick={onRemove} className="btn btn-quiet text-sm">
              Hapus
            </button>
          )}
        </div>
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
    <article className="card flex min-w-0 flex-col gap-5 p-5 [overflow-wrap:anywhere]">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <h2 lang="en" className="font-display text-[1.9rem] leading-none tracking-tight">{r.word}</h2>
          {r.is_phrase && (
            <span className="text-muted border-line rounded-full border px-2 py-0.5 text-[0.6875rem]">Frasa</span>
          )}
          {entry.known && (
            <span className="bg-sunken text-muted rounded-full px-2 py-0.5 text-[0.6875rem]">Sudah tahu</span>
          )}
          {!notFound && !alt && <span className="ml-auto"><Confidence value={main.confidence} /></span>}
        </div>
        {r.lemma && r.lemma.toLowerCase() !== r.word.toLowerCase() && (
          <p className="text-muted text-sm">Bentuk dasar: <span lang="en">{r.lemma}</span></p>
        )}
      </header>

      {notFound && (
        <section aria-label="Kata tidak ditemukan" className="border-warn/40 bg-warn-soft/50 rounded-xl border border-dashed p-3.5">
          <p className="text-sm font-medium">Kata ini tidak ketemu di halaman yang kamu foto.</p>
          <p className="text-muted mt-1 text-sm leading-relaxed">
            Arti di bawah cuma arti kamus umum, jadi belum tentu cocok sama bukumu.
            Periksa ejaan katanya atau pilih ulang foto yang lebih jelas.
          </p>
          <div className="border-line mt-3 border-t pt-2">
            <p className="eyebrow">Yang kebaca dari fotomu</p>
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
          <p className="eyebrow">Dari halaman bukumu</p>
          <blockquote lang="en" className="border-accent/40 border-l-2 pl-3.5 text-[1.0625rem] leading-relaxed whitespace-pre-wrap">
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
          <div className="border-warn/40 bg-warn-soft/50 flex items-start gap-2.5 rounded-xl border p-3">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-warn mt-px h-5 w-5 shrink-0">
              <path d="M12 8.5v5M12 16.8v.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <p className="text-sm leading-relaxed font-medium">
              Dua makna sama masuk akalnya di sini. Ini sengaja tidak dipilihkan.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {candidates.map((candidate, index) => (
              <section key={index} aria-label={`Makna ${index + 1}`} className="border-line flex min-w-0 flex-col gap-3.5 rounded-xl border p-3.5">
                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className={`w-fit rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ${triggerColors[index]}`}>
                      Kemungkinan {index + 1}
                    </p>
                    <Confidence value={candidate.confidence} />
                  </div>
                  <h3 className="text-lg leading-snug font-semibold">{candidate.meaning_id}</h3>
                  <p lang="en" className="text-muted mt-1 text-sm leading-relaxed">{candidate.meaning_en}</p>
                </div>
                <Explanation candidate={candidate} index={index} inSentence={triggers[index].length > 0} />
              </section>
            ))}
          </div>
        </div>
      ) : (
        <section aria-label={notFound ? 'Arti umum' : incompleteAmbiguity ? 'Makna yang tersedia' : 'Makna di sini'} className="flex flex-col gap-3.5">
          <div>
            <p className="text-accent eyebrow mb-1.5">{notFound ? 'Arti umum' : incompleteAmbiguity ? 'Makna yang tersedia' : 'Makna di sini'}</p>
            <h3 className="text-xl leading-snug font-semibold">{main.meaning_id}</h3>
            <p lang="en" className="text-muted mt-1 text-sm leading-relaxed">{main.meaning_en}</p>
          </div>
          {!notFound && <Explanation candidate={main} index={0} inSentence={triggers[0].length > 0} />}
        </section>
      )}

      {r.caution_id && (
        <aside aria-label="Catatan makna" className="border-accent bg-accent-soft/60 rounded-r-xl border-l-2 p-3.5">
          <p className="text-accent eyebrow">Hati hati</p>
          <p className="mt-1 text-sm leading-relaxed">{r.caution_id}</p>
        </aside>
      )}

      {r.other_senses.length > 0 && (
        <section aria-label="Makna lain" className="border-line flex flex-col gap-2 border-t pt-4">
          <h3 className="eyebrow">Makna lain</h3>
          <p className="text-faint text-xs">Bisa dipakai pada konteks berbeda.</p>
          <ul className="text-muted flex flex-col gap-2 text-sm leading-relaxed">
            {r.other_senses.map((sense, index) => (
              <li key={index} className="flex gap-2">
                <span aria-hidden="true" className="bg-line mt-2 h-1 w-1 shrink-0 rounded-full" />
                <span>
                  {sense.meaning_id} <span lang="en">({sense.meaning_en})</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {onKnown && !entry.known && (
        <button onClick={onKnown} className="btn btn-ghost text-muted hover:text-foreground w-fit text-sm">
          Aku udah tahu kata ini
        </button>
      )}
      {entry.known && <p className="text-muted text-sm">Ditandai sudah tahu, tidak akan direview.</p>}
    </article>
  );
}
