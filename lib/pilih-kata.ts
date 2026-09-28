// Memilih kata atau frasa dari teks yang sedang dibaca.
//
// Dua gerakan, dan keduanya sudah dikenal pembaca dari aplikasi lain:
// mengetuk satu kata, atau menyapu beberapa kata untuk satu frasa. Tidak ada
// yang perlu diketik, sesuai prinsip 5 PRD.

// Huruf yang dianggap bagian dari satu kata. Tanda kutip lengkung ikut, karena
// "don't" dan "o’clock" adalah satu kata; tanda hubung juga, karena teks abad
// ke-19 penuh dengan "rabbit-hole" dan "waistcoat-pocket".
const HURUF = /[\p{L}\p{M}'’-]/u;

// Tanda baca yang menempel di ujung tidak pernah menjadi bagian dari katanya.
const rapikan = (teks: string) => teks.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '');

export type Pilihan = {
  kata: string;
  /** Paragraf tempat kata itu berada, dipakai sebagai konteks untuk model. */
  konteks: string;
  /** Nomor paragraf di dalam babnya, untuk menandai mana yang sedang dibuka. */
  paragraf: number;
};

function paragrafDari(node: Node | null): HTMLElement | null {
  let at: Node | null = node;
  while (at && at.nodeType !== 1) at = at.parentNode;
  return (at as HTMLElement | null)?.closest<HTMLElement>('[data-paragraf]') ?? null;
}

function jadiPilihan(el: HTMLElement | null, kata: string): Pilihan | null {
  const bersih = rapikan(kata);
  const konteks = el?.textContent ?? '';
  if (!el || !bersih || !konteks.trim()) return null;
  return { kata: bersih, konteks, paragraf: Number(el.dataset.paragraf) };
}

// Kata di bawah titik yang diketuk. Caret dipakai, bukan pembungkusan tiap kata
// dalam span: satu bab bisa berisi belasan ribu kata, dan membungkus semuanya
// berarti belasan ribu elemen yang harus digambar browser cuma untuk berjaga
// jaga kalau kata itu diketuk.
export function kataDiTitik(x: number, y: number): Pilihan | null {
  const doc = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };

  let node: Node | null = null;
  let offset = 0;
  // caretPositionFromPoint yang standar belum ada di semua peramban, dan
  // caretRangeFromPoint yang lama justru yang didukung WebKit. Keduanya dicoba.
  if (typeof doc.caretPositionFromPoint === 'function') {
    const pos = doc.caretPositionFromPoint(x, y);
    if (pos) { node = pos.offsetNode; offset = pos.offset; }
  }
  if (!node && typeof doc.caretRangeFromPoint === 'function') {
    const range = doc.caretRangeFromPoint(x, y);
    if (range) { node = range.startContainer; offset = range.startOffset; }
  }
  if (!node || node.nodeType !== 3) return null;

  const teks = node.textContent ?? '';
  if (!teks) return null;

  // Ketukan tepat di sela dua kata memberi offset di spasi. Mundur satu huruf
  // supaya ketukan di ujung kanan sebuah kata tetap memilih kata itu.
  let mulai = Math.min(offset, teks.length - 1);
  if (mulai >= 0 && !HURUF.test(teks[mulai] ?? '') && mulai > 0) mulai -= 1;
  if (!HURUF.test(teks[mulai] ?? '')) return null;

  let akhir = mulai;
  while (mulai > 0 && HURUF.test(teks[mulai - 1])) mulai -= 1;
  while (akhir < teks.length - 1 && HURUF.test(teks[akhir + 1])) akhir += 1;

  return jadiPilihan(paragrafDari(node), teks.slice(mulai, akhir + 1));
}

/** Berapa kata paling banyak boleh disapu sebagai satu frasa. */
export const FRASA_MAX_KATA = 6;

// Frasa yang sedang disapu pembaca. Dikembalikan null kalau sapuannya melewati
// batas paragraf, karena konteks yang dikirim ke model adalah satu paragraf.
export function frasaTerpilih(): Pilihan | null {
  const pilihan = typeof window === 'undefined' ? null : window.getSelection();
  if (!pilihan || pilihan.isCollapsed || pilihan.rangeCount === 0) return null;

  const range = pilihan.getRangeAt(0);
  const awal = paragrafDari(range.startContainer);
  const ujung = paragrafDari(range.endContainer);
  if (!awal || awal !== ujung) return null;

  const teks = rapikan(pilihan.toString());
  if (!teks) return null;
  // Menyapu satu paragraf penuh bukan permintaan makna kata. Prompt Lema
  // dirancang memilih makna, bukan menjelaskan kalimat.
  if (teks.split(/\s+/).length > FRASA_MAX_KATA) return null;

  return jadiPilihan(awal, teks);
}
