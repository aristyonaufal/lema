import type { ClientDb } from './client-db';
import { drawMarkers, type Marker } from './image';
import { addMarkedPending, addPending, MARKED_EMPTY, resolveEntry, resolveMarked } from './store';
import type { LookupResponse, LookupResult } from './types';

const normalize = (word: string) => word.trim().toLowerCase();

// Mengirim satu permintaan ke /api/lookup dan selalu mengembalikan jawaban
// yang bisa dibaca, tidak pernah melempar. Dipakai kedua mode, supaya batas
// waktu dan pesan kegagalannya tidak berbeda antara mengetik dan menandai.
async function send(form: FormData): Promise<LookupResponse> {
  // Lebih panjang dari batas 60 detik endpoint. Permintaan macet tidak boleh
  // meninggalkan status pending tanpa akhir selama aplikasi masih terbuka.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 75_000);

  try {
    const res = await fetch('/api/lookup', {
      method: 'POST',
      body: form,
      signal: controller.signal,
    });
    const json = await res.json();
    return res.ok && json?.ok === true && Array.isArray(json.results)
      ? { ok: true, results: json.results, ms: json.ms }
      : {
          ok: false,
          error: typeof json?.error === 'string'
            ? json.error
            : 'Balasan server tidak lengkap. Pilih ulang foto dan coba lagi.',
        };
  } catch {
    return {
      ok: false,
      error: controller.signal.aborted
        ? 'Proses terlalu lama. Pilih ulang foto dan coba lagi.'
        : 'Gagal menghubungi server. Pilih ulang foto dan coba lagi.',
    };
  } finally {
    clearTimeout(timeout);
  }
}

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
  const form = new FormData();
  form.append('image', file);
  form.append('words', JSON.stringify(words));
  const response = await send(form);

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

// Mode tandai. Tidak ada daftar kata, jadi yang disimpan seketika adalah satu
// entri penampung. Kata sebenarnya baru diketahui setelah model menemukan
// coretan pembaca atau penanda magenta yang digambar di foto.
export function startMarkedLookup(store: ClientDb, file: File, bookId: string, markers: Marker[]) {
  let placeholderId = '';
  const saved = store.update((current) => {
    if (!current.books.some((book) => book.id === bookId)) return current;
    const pending = addMarkedPending(current, bookId);
    placeholderId = pending.id;
    return pending.db;
  });
  if (!saved || !placeholderId) return null;

  void processMarked(store, file, markers.slice(0, 5), placeholderId);
  return [placeholderId];
}

async function processMarked(store: ClientDb, file: File, markers: Marker[], placeholderId: string) {
  // Penanda digambar di latar, setelah penampung tersimpan, supaya perpindahan
  // ke peta makna tidak ikut menunggu kanvas selesai.
  let image: File;
  try {
    image = await drawMarkers(file, markers);
  } catch {
    // Mengirim foto tanpa penanda padahal pengguna sudah mengetuk kata akan
    // membuat model mencari coretan pensil saja, lalu menjawab hal yang lain
    // dari yang diminta. Lebih jujur berhenti di sini.
    store.complete((current) => resolveMarked(current, placeholderId, {
      error: 'Penanda gagal digambar di foto. Pilih ulang foto dan ketuk lagi katanya.',
    }));
    return;
  }

  const form = new FormData();
  form.append('image', image);
  form.append('mode', 'marked');
  form.append('markers', String(markers.length));
  const response = await send(form);

  store.complete((current) => resolveMarked(current, placeholderId, response.ok
    ? { results: response.results, error: MARKED_EMPTY }
    : { error: response.error }));
}
