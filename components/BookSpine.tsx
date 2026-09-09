// Punggung buku berwarna.
//
// Lema tidak punya gambar sampul dan tidak akan mengambilnya dari layanan lain,
// jadi warnanya diturunkan dari judul buku itu sendiri. Judul yang sama selalu
// mendapat warna yang sama, sehingga pengguna mengenali bukunya dari warna
// sebelum sempat membaca judulnya.

const SPINES = [
  '#c8452c', // merah bata
  '#d98218', // jingga
  '#1f6fbb', // biru
  '#1c7a5e', // hijau
  '#6d4bc4', // ungu
  '#b3306e', // magenta
  '#2f3d55', // biru malam
  '#8a6a1f', // kuning tua
];

function hash(seed: string): number {
  let total = 0;
  for (let i = 0; i < seed.length; i += 1) {
    total = (total * 31 + seed.charCodeAt(i)) % 100_000;
  }
  return total;
}

export function spineColor(title: string): string {
  return SPINES[hash(title.trim().toLowerCase()) % SPINES.length];
}

// Satu atau dua huruf awal, dilewati kata sambung yang tidak membedakan buku.
const SKIP = new Set(['the', 'a', 'an', 'of', 'and', 'di', 'ke', 'dan', 'yang']);

export function initials(title: string): string {
  const words = title
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter((word) => word && !SKIP.has(word.toLowerCase()));
  const source = words.length > 0 ? words : [title.trim() || '?'];
  return source
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

export default function BookSpine({ title, size = 'md' }: { title: string; size?: 'sm' | 'md' | 'lg' }) {
  const color = spineColor(title);
  const box = {
    sm: 'h-9 w-7 text-[0.625rem] rounded-[0.25rem]',
    md: 'h-12 w-9 text-xs rounded-[0.3rem]',
    lg: 'h-16 w-12 text-sm rounded-md',
  }[size];

  return (
    <span
      aria-hidden="true"
      style={{ background: color }}
      className={`relative flex shrink-0 items-center justify-center font-display leading-none text-white shadow-[var(--shadow-sm)] ${box}`}
    >
      {/* Garis tipis di dekat tepi, meniru jilid punggung buku. */}
      <span className="absolute inset-y-1 left-1 w-px bg-white/35" />
      {initials(title)}
    </span>
  );
}
