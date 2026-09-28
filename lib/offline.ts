'use client';

// Sisi halaman dari service worker: mendaftarkannya, menyuruhnya mengunduh
// buku, dan melaporkan apa saja yang sudah tersimpan.
//
// Semua di sini dibungkus pemeriksaan dukungan dan try/catch. Service worker
// dan Cache API tidak tersedia di jendela penyamaran sebagian peramban, dan
// Lema harus tetap jalan penuh tanpa keduanya: yang hilang cuma kemampuan
// membaca tanpa koneksi.

const NAMA_CACHE_BUKU = 'lema-buku-v1';

// Pilihan pengguna untuk mematikan mode luring, disimpan terpisah dari koleksi.
//
// Tanpa penanda ini, tombol matikan tidak ada gunanya: melepas service worker
// membuat halaman dimuat ulang, dan pemuatan ulang itu mendaftarkannya lagi.
// Pengguna akan menekan tombolnya berkali kali tanpa pernah berhasil.
const KUNCI_MATI = 'lema.luring.mati';

export function luringDimatikan(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(KUNCI_MATI) === '1';
  } catch {
    return false;
  }
}

function catatPilihan(mati: boolean): void {
  try {
    if (mati) window.localStorage.setItem(KUNCI_MATI, '1');
    else window.localStorage.removeItem(KUNCI_MATI);
  } catch {
    // Penyimpanan ditolak. Pilihannya tetap berlaku sampai tab ditutup.
  }
}

export const dukungLuring = () =>
  typeof navigator !== 'undefined' && 'serviceWorker' in navigator && 'caches' in window;

// Didaftarkan hanya pada build produksi. Di mode pengembangan, berkas di
// /_next/static/ belum ber-hash dengan cara yang sama, dan menyimpannya
// selamanya akan membuat perubahan kode tidak kelihatan sampai simpanannya
// dibersihkan manual.
export async function daftarkanSw(): Promise<void> {
  if (!dukungLuring() || process.env.NODE_ENV !== 'production') return;
  if (luringDimatikan()) return;
  try {
    await navigator.serviceWorker.register('/sw.js');
  } catch {
    // Pendaftaran gagal berarti tidak ada fitur luring. Bukan alasan
    // mengganggu pembaca dengan pesan galat.
  }
}

async function kirim(pesan: unknown): Promise<ServiceWorkerRegistration | null> {
  if (!dukungLuring()) return null;
  const reg = await navigator.serviceWorker.ready;
  reg.active?.postMessage(pesan);
  return reg;
}

export type Kemajuan = { selesai: number; total: number };

/**
 * Mengunduh seluruh bab satu buku ke simpanan peramban.
 * Mengembalikan janji yang selesai setelah service worker melapor beres.
 */
export function unduhBuku(
  slug: string,
  bab: number,
  onMaju?: (k: Kemajuan) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!dukungLuring()) { reject(new Error('Peramban ini belum mendukung unduhan luring.')); return; }

    const dengar = (event: MessageEvent) => {
      const d = event.data ?? {};
      if (d.slug !== slug) return;
      if (d.type === 'unduh-maju') onMaju?.({ selesai: d.selesai, total: d.total });
      if (d.type === 'unduh-selesai') {
        navigator.serviceWorker.removeEventListener('message', dengar);
        resolve();
      }
    };
    navigator.serviceWorker.addEventListener('message', dengar);
    void kirim({ type: 'unduh-buku', payload: { slug, bab } }).catch(reject);
  });
}

export function hapusBuku(slug: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!dukungLuring()) { reject(new Error('Peramban ini belum mendukung unduhan luring.')); return; }

    const dengar = (event: MessageEvent) => {
      const d = event.data ?? {};
      if (d.type === 'hapus-selesai' && d.slug === slug) {
        navigator.serviceWorker.removeEventListener('message', dengar);
        resolve();
      }
    };
    navigator.serviceWorker.addEventListener('message', dengar);
    void kirim({ type: 'hapus-buku', payload: { slug } }).catch(reject);
  });
}

/** Berapa bab tiap buku yang sudah tersimpan. Dibaca langsung dari Cache API. */
export async function babTersimpan(): Promise<Map<string, number>> {
  const hasil = new Map<string, number>();
  if (!dukungLuring()) return hasil;
  try {
    // caches.open MEMBUAT simpanan kalau belum ada. Membacanya tanpa
    // pemeriksaan ini akan menghidupkan kembali simpanan kosong tepat setelah
    // pengguna mematikan mode luring, dan janji "semuanya dibuang" jadi bohong.
    if (!(await caches.has(NAMA_CACHE_BUKU))) return hasil;
    const cache = await caches.open(NAMA_CACHE_BUKU);
    for (const req of await cache.keys()) {
      const cocok = new URL(req.url).pathname.match(/^\/pustaka\/([^/]+)\/\d+\.json$/);
      if (cocok) hasil.set(cocok[1], (hasil.get(cocok[1]) ?? 0) + 1);
    }
  } catch {
    // Simpanan tidak bisa dibaca. Laporkan kosong, jangan melempar.
  }
  return hasil;
}

/** Perkiraan pemakaian penyimpanan dari peramban, dalam byte. */
export async function pemakaian(): Promise<number | null> {
  try {
    const perkiraan = await navigator.storage?.estimate?.();
    return typeof perkiraan?.usage === 'number' ? perkiraan.usage : null;
  } catch {
    return null;
  }
}

export function ukuranTerbaca(byte: number): string {
  if (byte < 1024) return `${byte} B`;
  if (byte < 1024 * 1024) return `${Math.round(byte / 1024)} KB`;
  return `${(byte / (1024 * 1024)).toFixed(1)} MB`;
}

// Tombol lepas. Pagar terakhir kalau service worker ternyata bermasalah:
// pengguna bisa membuangnya sendiri tanpa perlu tahu cara membuka alat
// pengembang peramban.
export async function lepasSw(): Promise<void> {
  // Pilihannya dicatat LEBIH DULU. Melepas service worker memicu pemuatan
  // ulang, dan kalau penandanya belum tersimpan saat itu, halaman yang baru
  // akan langsung mendaftarkannya kembali.
  catatPilihan(true);
  if (!dukungLuring()) return;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) { window.location.reload(); return; }
  reg.active?.postMessage({ type: 'lepas' });
}

export async function nyalakanSw(): Promise<void> {
  catatPilihan(false);
  await daftarkanSw();
}
