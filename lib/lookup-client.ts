import type { ClientDb } from './client-db';
import { addPending, resolveEntry } from './store';
import type { LookupResponse, LookupResult } from './types';

const normalize = (word: string) => word.trim().toLowerCase();

// Mengembalikan ID segera setelah antrean benar-benar tersimpan. Proses async
// memegang store bersama, tidak menggunakan setState layar pengambilan foto.
export function startLookup(store: ClientDb, file: File, bookId: string, words: string[]) {
  const requested = words.map((word) => word.trim()).filter((word, index, all) =>
    word && all.findIndex((other) => normalize(other) === normalize(word)) === index,
  ).slice(0, 5);
  if (!requested.length) return null;
  let ids: string[] = [];
  const saved = store.update((current) => {
    if (!current.books.some((book) => book.id === bookId)) return current;
    const pending = addPending(current, bookId, requested);
    ids = pending.ids;
    return pending.db;
  });
  if (!saved || !ids.length) return null;

  void processLookup(store, file, requested, ids);
  return ids;
}

async function processLookup(store: ClientDb, file: File, words: string[], ids: string[]) {
  let response: LookupResponse;
  // Lebih panjang dari batas 60 detik endpoint. Permintaan macet tidak boleh
  // meninggalkan status pending tanpa akhir selama aplikasi masih terbuka.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 75_000);

  try {
    const form = new FormData();
    form.append('image', file);
    form.append('words', JSON.stringify(words));
    const res = await fetch('/api/lookup', {
      method: 'POST',
      body: form,
      signal: controller.signal,
    });
    const json = await res.json();
    response = res.ok && json?.ok === true && Array.isArray(json.results)
      ? { ok: true, results: json.results, ms: json.ms }
      : {
          ok: false,
          error: typeof json?.error === 'string'
            ? json.error
            : 'Balasan server tidak lengkap. Pilih ulang foto dan coba lagi.',
        };
  } catch {
    response = {
      ok: false,
      error: controller.signal.aborted
        ? 'Proses terlalu lama. Pilih ulang foto dan coba lagi.'
        : 'Gagal menghubungi server. Pilih ulang foto dan coba lagi.',
    };
  } finally {
    clearTimeout(timeout);
  }

  store.complete((current) => {
    let next = current;
    ids.forEach((entryId, i) => {
      const matches: LookupResult[] = response.ok
        ? response.results.filter((result) =>
            result && typeof result.word === 'string' && normalize(result.word) === normalize(words[i]))
        : [];
      // Hasil sebagian/tertukar tidak boleh dipasangkan berdasarkan indeks.
      const result = matches.length === 1 ? matches[0] : undefined;
      next = resolveEntry(next, entryId, {
        result,
        error: result ? undefined : response.ok
          ? 'Hasil untuk kata ini belum tersedia. Pilih ulang foto dan coba lagi.'
          : response.error,
      });
    });
    return next;
  });
}
