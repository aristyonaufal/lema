// Pembuat soal kuis. Tanpa panggilan model: semua bahannya sudah tersimpan di
// koleksi sejak kata itu pertama kali dicari.
//
// Yang membedakan kuis ini dari kuis kosakata biasa ada di pilihan pengecohnya.
// Pengecoh diambil lebih dulu dari MAKNA LAIN KATA YANG SAMA, yaitu daftar
// other_senses yang dibuat model untuk kartu makna. Jadi yang dilatih bukan
// "kata ini artinya apa", tetapi "di kalimat ini, makna yang mana". Itu
// kemampuan inti yang diajarkan Lema. Kalau makna lainnya kurang, sisanya diisi
// dengan arti kata lain dari koleksi.

import type { Db, Entry } from './store';

export type Question = {
  entryId: string;
  bookId: string;
  word: string;
  lemma: string;      // bentuk dasar, untuk menebalkan "make out" saat kata aslinya "made out"
  sentence: string;   // kalimat baru, bukan kalimat dari buku
  options: string[];  // makna dalam Bahasa Indonesia, sudah diacak
  answer: number;     // indeks jawaban yang benar di `options`
  meaningEn: string;
  source: string;     // kalimat asal dari buku, ditampilkan setelah menjawab
};

// Pengacak bisa diganti supaya pengujian bisa mengulang urutan yang sama.
export type Rng = () => number;

export const OPTIONS = 4;

function shuffle<T>(items: T[], rng: Rng): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const key = (text: string) => text.trim().toLowerCase();

// Kata yang bisa dijadikan soal: maknanya sudah ada dan punya kalimat baru.
// Kata yang ditandai ragu sengaja dikeluarkan. Model sendiri bilang dua makna
// sama masuk akalnya, jadi memang tidak ada satu jawaban benar untuk diuji.
export function quizzable(entry: Entry): boolean {
  const r = entry.result;
  return entry.status === 'done'
    && Boolean(r?.candidates?.[0]?.meaning_id?.trim())
    && Boolean(r?.new_sentence?.trim())
    && !r?.ambiguous;
}

// Satu soal untuk satu kata. Mengembalikan null kalau tidak ada satu pun
// pengecoh: soal dengan satu pilihan bukan kuis, dan pemanggil harus
// memutuskan sendiri apa artinya untuk alurnya.
export function buildQuestion(entry: Entry, pool: Entry[], rng: Rng = Math.random): Question | null {
  if (!quizzable(entry)) return null;
  const r = entry.result!;
  const correct = r.candidates[0].meaning_id.trim();

  const taken = new Set([key(correct)]);
  const distractors: string[] = [];
  const add = (text: string | undefined) => {
    const clean = text?.trim();
    if (!clean || taken.has(key(clean)) || distractors.length >= OPTIONS - 1) return;
    taken.add(key(clean));
    distractors.push(clean);
  };

  shuffle(r.other_senses ?? [], rng).forEach((sense) => add(sense.meaning_id));
  shuffle(pool.filter((other) => other.id !== entry.id), rng)
    .forEach((other) => add(other.result?.candidates?.[0]?.meaning_id));

  if (distractors.length === 0) return null;

  const options = shuffle([correct, ...distractors], rng);
  return {
    entryId: entry.id,
    bookId: entry.bookId,
    word: r.word,
    lemma: r.lemma || r.word,
    sentence: r.new_sentence,
    options,
    answer: options.indexOf(correct),
    meaningEn: r.candidates[0].meaning_en,
    source: r.sentence,
  };
}

// Satu sesi kuis dari semua buku dan semua jadwal, termasuk kata yang belum
// jatuh tempo maupun yang sudah ditandai sudah tahu. Urutannya diacak di
// sini, saat sesi dimulai, bukan saat layar digambar ulang.
export function buildDeck(db: Db, limit = 10, rng: Rng = Math.random): Question[] {
  const deck: Question[] = [];
  for (const entry of shuffle(db.entries.filter(quizzable), rng)) {
    if (deck.length >= limit) break;
    const question = buildQuestion(entry, db.entries, rng);
    if (question) deck.push(question);
  }
  return deck;
}

// Berapa kata yang benar benar bisa dijadikan soal. Ada tidaknya pengecoh
// tidak bergantung pada urutan acak, jadi pengacak tetap cukup untuk menjawab
// pertanyaan ini dengan pasti, tanpa mengacak apa pun saat layar digambar.
export function quizCount(db: Db): number {
  return db.entries.filter((entry) => buildQuestion(entry, db.entries, () => 0) !== null).length;
}
