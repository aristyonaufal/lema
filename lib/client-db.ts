import { load, recoverInterrupted, save, type Db } from './store';

type Snapshot = {
  db: Db;
  ready: boolean;
  storageError: string | null;
};

export type DbUpdate = (current: Db) => Db;
export type ClientDb = ReturnType<typeof createClientDb>;

// Satu instance untuk seluruh layar dalam satu root layout. Dibuat tanpa membaca
// browser agar render server dan hydration memakai snapshot awal yang sama.
export function createClientDb() {
  const initial: Snapshot = {
    db: { books: [], entries: [], activeBookId: null },
    ready: false,
    storageError: null,
  };
  let snapshot = initial;
  let unsavedResults = false;
  const listeners = new Set<() => void>();

  function publish(next: Snapshot) {
    snapshot = next;
    listeners.forEach((listener) => listener());
  }

  function persist(db: Db, keepOnFailure = false): boolean {
    try {
      save(db);
      unsavedResults = false;
      publish({ db, ready: true, storageError: null });
      return true;
    } catch {
      unsavedResults ||= keepOnFailure;
      publish({
        ...snapshot,
        db: keepOnFailure ? db : snapshot.db,
        storageError: unsavedResults
          ? 'Hasil terbaru belum tersimpan di browser. Jangan tutup atau muat ulang halaman. Coba simpan lagi.'
          : 'Penyimpanan browser tidak tersedia atau penuh. Perubahan belum disimpan. Coba simpan lagi, lalu ulangi tindakanmu.',
      });
      return false;
    }
  }

  function initialize() {
    if (snapshot.ready) return;
    let db: Db;
    try {
      db = load();
    } catch {
      publish({
        ...snapshot,
        storageError: 'Koleksi belum bisa dibaca dari penyimpanan browser. Data lama tidak ditimpa. Coba baca lagi.',
      });
      return;
    }

    if (db.entries.some((entry) => entry.status === 'pending')) {
      // Jadikan hasil pemulihan terlihat meskipun penyimpanan sedang penuh.
      publish({ db, ready: true, storageError: null });
      persist(recoverInterrupted(db), true);
    } else {
      publish({ db, ready: true, storageError: null });
    }
  }

  return {
    initialize,
    getSnapshot: () => snapshot,
    getServerSnapshot: () => initial,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    // Selalu hitung dari data terbaru, bukan salinan milik halaman pemanggil.
    update(change: DbUpdate): boolean {
      return snapshot.ready && persist(change(snapshot.db));
    },
    // Hasil jaringan tetap dipertahankan di memori bila disk/browser penuh.
    // Tombol simpan ulang tidak perlu mengirim foto atau memanggil model lagi.
    complete(change: DbUpdate) {
      if (snapshot.ready) persist(change(snapshot.db), true);
    },
    retryStorage() {
      if (!snapshot.ready) initialize();
      else persist(snapshot.db, true);
    },
  };
}
