'use client';

// Halaman tes untuk Tahap 2. Belum ada desain apa pun di sini.
// Tujuannya dua: membuktikan endpoint mengembalikan JSON yang benar,
// dan membandingkan beberapa model pakai foto yang sama.

import { useState } from 'react';
import { shrink } from '@/lib/image';

const MODELS = [
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-pro-latest',
];

type Run = { model: string; ms: number; ok: boolean; body: string };

export default function Lab() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [words, setWords] = useState('');
  const [model, setModel] = useState(MODELS[0]);
  const [busy, setBusy] = useState(false);
  const [runs, setRuns] = useState<Run[]>([]);
  const [meta, setMeta] = useState('');

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const small = await shrink(f);
    setFile(small);
    setPreview(URL.createObjectURL(small));
    setMeta(
      `asli ${(f.size / 1024 / 1024).toFixed(2)} MB, dikecilkan jadi ${(
        small.size / 1024
      ).toFixed(0)} KB`
    );
  }

  async function call(m: string): Promise<Run> {
    const t0 = performance.now();
    const fd = new FormData();
    fd.append('image', file as File);
    fd.append('words', JSON.stringify(words.split(',').map((w) => w.trim()).filter(Boolean)));
    fd.append('model', m);
    try {
      const res = await fetch('/api/lookup', { method: 'POST', body: fd });
      const json = await res.json();
      return {
        model: m,
        ms: Math.round(performance.now() - t0),
        ok: !!json.ok,
        body: JSON.stringify(json, null, 2),
      };
    } catch (err) {
      return { model: m, ms: Math.round(performance.now() - t0), ok: false, body: String(err) };
    }
  }

  async function runOne() {
    if (!guard()) return;
    setBusy(true);
    setRuns([]);
    setRuns([await call(model)]);
    setBusy(false);
  }

  async function runCompare() {
    if (!guard()) return;
    setBusy(true);
    setRuns([]);
    // berurutan, bukan barengan, supaya tidak kena batas laju
    const out: Run[] = [];
    for (const m of ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.1-flash-lite']) {
      out.push(await call(m));
      setRuns([...out]);
    }
    setBusy(false);
  }

  function guard() {
    if (!file) {
      setRuns([{ model: '-', ms: 0, ok: false, body: 'Belum ada foto.' }]);
      return false;
    }
    if (words.split(',').map((w) => w.trim()).filter(Boolean).length === 0) {
      setRuns([{ model: '-', ms: 0, ok: false, body: 'Belum ada kata.' }]);
      return false;
    }
    return true;
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-5 p-6">
      <div>
        <h1 className="text-xl font-semibold">Lab lookup</h1>
        <p className="text-sm opacity-70">
          Halaman tes internal. Foto satu halaman buku, tulis katanya, bandingkan modelnya.
        </p>
      </div>

      <input type="file" accept="image/*" onChange={pick} className="text-sm" />
      {meta && <p className="text-xs opacity-60">{meta}</p>}
      {preview && (
        <img src={preview} alt="pratinjau halaman" className="max-h-72 w-auto rounded border" />
      )}

      <input
        type="text"
        value={words}
        onChange={(e) => setWords(e.target.value)}
        placeholder="kata dipisah koma, misal: made out, keen, spell"
        className="rounded border px-3 py-2 text-sm"
      />

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="rounded border bg-transparent px-2 py-2 text-sm"
        >
          {MODELS.map((m) => (
            <option key={m} value={m} className="text-black">
              {m}
            </option>
          ))}
        </select>

        <button
          onClick={runOne}
          disabled={busy}
          className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-black"
        >
          {busy ? 'Memproses...' : 'Kirim'}
        </button>

        <button
          onClick={runCompare}
          disabled={busy}
          className="rounded border px-4 py-2 text-sm font-medium disabled:opacity-40"
        >
          Bandingkan 3 model
        </button>
      </div>

      {runs.map((r, i) => (
        <div key={i} className="flex flex-col gap-1">
          <div className="flex items-center gap-3 text-xs">
            <span className="font-semibold">{r.model}</span>
            <span className="opacity-60">{r.ms} ms</span>
            <span className={r.ok ? 'text-green-500' : 'text-red-500'}>
              {r.ok ? 'ok' : 'gagal'}
            </span>
          </div>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded bg-black/5 p-3 text-xs dark:bg-white/10">
            {r.body}
          </pre>
        </div>
      ))}
    </main>
  );
}
