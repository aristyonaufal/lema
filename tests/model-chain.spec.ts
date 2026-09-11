import { test, expect } from '@playwright/test';
import { runChain, TIMEOUT_MESSAGE, type Attempt } from '../lib/model-chain';

// Pengujian ini berjalan di sisi Node, tanpa browser dan tanpa memanggil model.
// Model tiruan di bawah meniru perilaku fetch: menggantung sampai dibatalkan,
// lalu melempar galat saat sinyalnya berbunyi. Angka waktunya diperkecil ke
// puluhan milidetik supaya pengujiannya cepat; perbandingannya yang diuji.

// Model yang tidak pernah menjawab, seperti model utama yang kelebihan beban.
const hangs = (signal: AbortSignal) =>
  new Promise<never>((_, reject) => {
    signal.addEventListener('abort', () => reject(new Error('aborted')));
  });

const answers = <T>(value: T, afterMs = 0) =>
  new Promise<Attempt<T>>((resolve) => setTimeout(() => resolve({ kind: 'ok', value }), afterMs));

const LIMITS = { budgetMs: 400, perAttemptMs: 100, minAttemptMs: 30 };

test('model utama yang menggantung ditinggal, lalu cadangan menjawab', async () => {
  const tried: string[] = [];
  const started = Date.now();
  const result = await runChain({
    ...LIMITS,
    chain: ['utama', 'cadangan'],
    attempt: (model, signal) => {
      tried.push(model);
      return model === 'utama' ? hangs(signal) : answers(['bank'], 10);
    },
  });

  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.model).toBe('cadangan');
  expect(result.value).toEqual(['bank']);
  expect(tried).toEqual(['utama', 'cadangan']);
  expect(result.log.map((r) => r.outcome)).toEqual(['timeout', 'ok']);
  // Inti perbaikannya: model utama cuma boleh memakan jatah satu percobaan,
  // bukan seluruh anggaran rantai.
  expect(result.log[0].ms).toBeLessThan(LIMITS.perAttemptMs + 60);
  expect(Date.now() - started).toBeLessThan(LIMITS.perAttemptMs + 150);
});

test('kalau semua menggantung, rantai berhenti sebelum melewati anggaran', async () => {
  const started = Date.now();
  const result = await runChain({
    ...LIMITS,
    chain: ['a', 'b', 'c', 'd', 'e', 'f'],
    attempt: (_, signal) => hangs(signal),
  });

  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.error).toBe(TIMEOUT_MESSAGE);
  expect(result.status).toBe(504);
  // Enam model menggantung, tetapi waktu totalnya tetap di bawah anggaran:
  // model yang tidak sempat selesai tidak dimulai sama sekali.
  expect(Date.now() - started).toBeLessThan(LIMITS.budgetMs + 60);
  expect(result.log.length).toBeLessThan(6);
});

test('percobaan terakhir dipotong ke sisa anggaran, bukan jatah penuh', async () => {
  const result = await runChain({
    budgetMs: 150,
    perAttemptMs: 100,
    minAttemptMs: 20,
    chain: ['a', 'b'],
    attempt: (_, signal) => hangs(signal),
  });

  expect(result.ok).toBe(false);
  // Model kedua hanya mendapat sekitar 50 milidetik yang tersisa.
  expect(result.log[1].ms).toBeLessThan(90);
});

test('kunci ditolak atau foto rusak tidak dicoba ke model lain', async () => {
  const tried: string[] = [];
  const result = await runChain({
    ...LIMITS,
    chain: ['a', 'b', 'c'],
    attempt: async (model) => {
      tried.push(model);
      return { kind: 'stop', error: 'API key ditolak.', status: 403 };
    },
  });

  expect(tried).toEqual(['a']);
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.error).toBe('API key ditolak.');
  expect(result.status).toBe(403);
});

test('model penuh dan jaringan putus sama sama pindah ke model berikutnya', async () => {
  const result = await runChain({
    ...LIMITS,
    chain: ['penuh', 'putus', 'sehat'],
    attempt: async (model) => {
      if (model === 'penuh') return { kind: 'next', error: 'Model lagi penuh.', status: 503 };
      if (model === 'putus') throw new Error('ECONNRESET');
      return { kind: 'ok', value: 'hasil' };
    },
  });

  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.model).toBe('sehat');
  expect(result.log.map((r) => [r.model, r.outcome, r.status])).toEqual([
    ['penuh', 'next', 503],
    ['putus', 'network', undefined],
    ['sehat', 'ok', undefined],
  ]);
});

test('model yang menjawab tepat waktu tidak ikut terpotong', async () => {
  const result = await runChain({
    ...LIMITS,
    chain: ['utama'],
    attempt: () => answers('selesai', 60),
  });

  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.value).toBe('selesai');
  expect(result.log).toHaveLength(1);
});
