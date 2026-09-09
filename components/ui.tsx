// Potongan tampilan kecil yang dipakai lebih dari satu layar.
// Dikumpulkan di sini supaya status yang sama selalu tampil sama di mana pun.

import type { ReactNode } from 'react';

export type EntryTone = 'pending' | 'done' | 'error' | 'known';

const TONES: Record<EntryTone, { label: string; className: string }> = {
  pending: { label: 'Diproses', className: 'bg-warn-soft text-warn' },
  done: { label: 'Siap dibuka', className: 'bg-accent-soft text-accent' },
  error: { label: 'Gagal diproses', className: 'bg-danger-soft text-danger' },
  known: { label: 'Sudah tahu', className: 'bg-sunken text-muted' },
};

export function StatusChip({ tone, children }: { tone: EntryTone; children?: ReactNode }) {
  const { label, className } = TONES[tone];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ${className}`}
    >
      {tone === 'pending' && (
        <span aria-hidden="true" className="bg-warn h-1.5 w-1.5 animate-pulse rounded-full" />
      )}
      {children ?? label}
    </span>
  );
}

// Judul bagian dengan berat huruf campuran, mengikuti pola "Trending This Week"
// pada rujukan desain: bagian penting tebal, keterangannya redup.
export function SectionHeader({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="text-[0.9375rem] font-semibold">
        {title}
        {hint && <span className="text-muted font-normal"> {hint}</span>}
      </h2>
      {action}
    </div>
  );
}

// Batang kemajuan. Angkanya selalu ditulis juga sebagai teks di dekatnya,
// jadi batang ini murni penguat visual dan disembunyikan dari pembaca layar.
export function ProgressBar({ value, max }: { value: number; max: number }) {
  const percent = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div aria-hidden="true" className="bg-sunken h-1.5 w-full overflow-hidden rounded-full">
      <div
        className="bg-accent h-full rounded-full transition-[width] duration-500"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
