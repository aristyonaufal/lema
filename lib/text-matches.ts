export type TextRange = { start: number; end: number };

const wordStart = /^[\p{L}\p{M}\p{N}_]/u;
const wordEnd = /[\p{L}\p{M}\p{N}_]$/u;

// Cocokkan kata/frasa utuh, abaikan kapitalisasi dan perbedaan spasi/baris.
// Rentang selalu menunjuk teks asli: tidak menebak imbuhan atau mengganti teks.
export function findTextRanges(text: string, phrase: string): TextRange[] {
  if (typeof text !== 'string' || typeof phrase !== 'string') return [];
  const needle = phrase.trim();
  if (!needle) return [];
  const pattern = needle.split(/\s+/)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('\\s+');
  const ranges: TextRange[] = [];

  for (const match of text.matchAll(new RegExp(pattern, 'giu'))) {
    const start = match.index;
    const end = start + match[0].length;
    // Misalnya, "he" tidak boleh ditebalkan di dalam "the".
    if (wordStart.test(needle) && wordEnd.test(text.slice(0, start))) continue;
    if (wordEnd.test(needle) && wordStart.test(text.slice(end))) continue;
    ranges.push({ start, end });
  }
  return ranges;
}

export function sentenceSegments(text: string, targets: TextRange[], triggers: TextRange[][]) {
  const allRanges = [...targets, ...triggers.flat()];
  const edges = [...new Set([0, text.length, ...allRanges.flatMap(({ start, end }) => [start, end])])]
    .sort((a, b) => a - b);

  // Pecah hanya pada batas sorotan. Bagian yang bertumpang tindih mendapatkan
  // dua penanda sekaligus, tanpa menduplikasi atau menghilangkan karakter.
  return edges.slice(0, -1).map((start, index) => ({
    start,
    text: text.slice(start, edges[index + 1]),
    target: targets.some((range) => range.start <= start && start < range.end),
    triggers: triggers.flatMap((ranges, triggerIndex) =>
      ranges.some((range) => range.start <= start && start < range.end) ? [triggerIndex] : []),
  }));
}
