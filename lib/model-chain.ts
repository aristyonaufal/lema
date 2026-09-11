// Rantai model cadangan dengan batas waktu.
//
// Dipisah dari route handler supaya aturannya bisa diuji tanpa jaringan dan
// tanpa kuota model. Route cukup menyediakan satu fungsi yang mencoba satu
// model; modul ini yang memutuskan kapan menyerah pada model itu, kapan pindah
// ke berikutnya, dan kapan berhenti sama sekali.
//
// Alasan modul ini ada: sebelumnya tiap percobaan boleh berjalan tanpa batas.
// Pada 10 September satu permintaan memakan 58,8 detik karena model utama
// gagal lalu pindah ke cadangan, padahal fungsi di hosting diputus pada detik
// ke-60. Satu model yang lambat tidak boleh menghabiskan waktu seluruh rantai.

export type Attempt<T> =
  | { kind: 'ok'; value: T }
  // Model ini gagal, tetapi model lain mungkin berhasil.
  | { kind: 'next'; error: string; status?: number }
  // Model lain tidak akan menolong, misalnya kunci ditolak atau fotonya rusak.
  | { kind: 'stop'; error: string; status?: number };

export type AttemptRecord = {
  model: string;
  ms: number;
  outcome: 'ok' | 'next' | 'stop' | 'timeout' | 'network';
  status?: number;
};

export type ChainResult<T> =
  | { ok: true; value: T; model: string; log: AttemptRecord[] }
  | { ok: false; error: string; status: number; log: AttemptRecord[] };

export const TIMEOUT_MESSAGE = 'Model terlalu lama menjawab. Coba lagi sebentar lagi.';

export async function runChain<T>({
  chain,
  attempt,
  budgetMs,
  perAttemptMs,
  minAttemptMs,
}: {
  chain: string[];
  // Wajib meneruskan `signal` ke fetch dan membiarkan galat jaringan terlempar.
  // Dari galat itulah modul ini membedakan batas waktu dari jaringan putus.
  attempt: (model: string, signal: AbortSignal) => Promise<Attempt<T>>;
  // Waktu total untuk seluruh percobaan, di bawah batas fungsi hosting.
  budgetMs: number;
  // Waktu paling lama untuk satu model sebelum ditinggal.
  perAttemptMs: number;
  // Percobaan yang sisa waktunya kurang dari ini tidak dimulai sama sekali.
  minAttemptMs: number;
}): Promise<ChainResult<T>> {
  const started = Date.now();
  const log: AttemptRecord[] = [];
  let lastError = 'Semua model sedang tidak bisa dihubungi.';
  let lastStatus = 0;

  for (const model of chain) {
    const remaining = budgetMs - (Date.now() - started);
    // Percobaan yang pasti tidak sempat selesai tidak dimulai. Memulainya cuma
    // memakan kuota model, lalu tetap terputus oleh batas waktu hosting.
    if (remaining < minAttemptMs) break;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(perAttemptMs, remaining));
    const t0 = Date.now();
    let outcome: Attempt<T> | 'timeout' | 'network';
    try {
      outcome = await attempt(model, controller.signal);
    } catch {
      outcome = controller.signal.aborted ? 'timeout' : 'network';
    } finally {
      clearTimeout(timer);
    }
    const ms = Date.now() - t0;

    if (outcome === 'timeout') {
      log.push({ model, ms, outcome: 'timeout' });
      lastError = TIMEOUT_MESSAGE;
      lastStatus = 504;
      continue;
    }
    if (outcome === 'network') {
      log.push({ model, ms, outcome: 'network' });
      lastError = 'Gagal menghubungi model.';
      continue;
    }

    log.push({ model, ms, outcome: outcome.kind, ...(outcome.kind !== 'ok' && outcome.status ? { status: outcome.status } : {}) });
    if (outcome.kind === 'ok') return { ok: true, value: outcome.value, model, log };

    lastError = outcome.error;
    if (outcome.status) lastStatus = outcome.status;
    if (outcome.kind === 'stop') break;
  }

  return { ok: false, error: lastError, status: lastStatus, log };
}
