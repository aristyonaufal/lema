// Pustaka buku Inggris domain publik yang bisa dibaca di dalam Lema.
//
// Isinya disiapkan sekali oleh scripts/pustaka/susun.mjs dan disajikan sebagai
// berkas statis dari public/pustaka/. Aplikasi tidak pernah mengurai EPUB.
//
// Yang penting dari berkas berkas ini: teksnya TIDAK PERNAH masuk localStorage.
// Satu kunci `lema.v1` hidup di jatah kira kira 5 MB per origin, sedangkan
// Moby-Dick saja 1,6 MB. Menyimpan teks buku di sana berarti mendorong koleksi
// kata pengguna ke jalur galat "penyimpanan penuh". Teks diambil saat dibaca,
// lalu dilepas; yang disimpan cuma posisi bacanya, dan itu beberapa byte.

export type KatalogBuku = {
  slug: string;
  judul: string;
  penulis: string;
  tingkat: 'ringan' | 'menengah' | 'berat';
  bab: number;
  kata: number;
};

export type Katalog = { disusun: string; buku: KatalogBuku[] };

export type RingkasBab = { judul: string; kata: number };

export type Buku = {
  slug: string;
  judul: string;
  penulis: string;
  tingkat: KatalogBuku['tingkat'];
  sumber: string;
  kata: number;
  bab: RingkasBab[];
};

export type Bab = { judul: string; paragraf: string[] };

// Satu bab yang sudah diambil dipakai lagi kalau pembaca bolak balik. Peta ini
// sengaja tidak dibatasi ukurannya: satu sesi baca paling banyak menyentuh
// belasan bab, dan semuanya hilang begitu tab ditutup.
const cache = new Map<string, unknown>();

async function ambil<T>(path: string): Promise<T> {
  const hit = cache.get(path);
  if (hit) return hit as T;
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Gagal memuat ${path} (${res.status}).`);
  const data = (await res.json()) as T;
  cache.set(path, data);
  return data;
}

export const muatKatalog = () => ambil<Katalog>('/pustaka/index.json');
export const muatBuku = (slug: string) => ambil<Buku>(`/pustaka/${slug}/buku.json`);
export const muatBab = (slug: string, bab: number) => ambil<Bab>(`/pustaka/${slug}/${bab}.json`);

export const TINGKAT: Record<KatalogBuku['tingkat'], string> = {
  ringan: 'Ringan',
  menengah: 'Menengah',
  berat: 'Berat',
};

// Perkiraan waktu baca. 150 kata per menit sengaja dipilih rendah, karena
// sasaran Lema adalah pembaca Indonesia yang membaca Inggris dengan pelan;
// angka 250 yang biasa dipakai berasal dari pembaca bahasa ibu.
export function perkiraanJam(kata: number): string {
  const menit = Math.round(kata / 150);
  if (menit < 60) return `${menit} menit`;
  const jam = Math.round(menit / 60);
  return `${jam} jam`;
}

export const UKURAN = ['kecil', 'sedang', 'besar'] as const;
export type Ukuran = (typeof UKURAN)[number];

export const KELAS_UKURAN: Record<Ukuran, string> = {
  kecil: 'text-[1rem] leading-[1.75]',
  sedang: 'text-[1.125rem] leading-[1.8]',
  besar: 'text-[1.3125rem] leading-[1.75]',
};

const KUNCI_UKURAN = 'lema.baca.ukuran';

// Ukuran huruf adalah kenyamanan per perangkat, bukan bagian dari koleksi, jadi
// disimpan terpisah dan tidak ikut ke berkas cadangan. Pembacaan dibungkus
// try/catch karena penyimpanan browser bisa ditolak di mode penyamaran.
export function bacaUkuran(): Ukuran {
  if (typeof window === 'undefined') return 'sedang';
  try {
    const tersimpan = window.localStorage.getItem(KUNCI_UKURAN);
    return UKURAN.includes(tersimpan as Ukuran) ? (tersimpan as Ukuran) : 'sedang';
  } catch {
    return 'sedang';
  }
}

export function simpanUkuran(ukuran: Ukuran): void {
  try {
    window.localStorage.setItem(KUNCI_UKURAN, ukuran);
  } catch {
    // Tidak apa apa. Ukurannya tetap berlaku sampai tab ditutup.
  }
}
