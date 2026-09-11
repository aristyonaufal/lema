// Menyusun kasus uji akurasi Lema.
//
// Kelompok A diambil dari teks asli Project Gutenberg, kata demi kata, oleh
// program ini. Tidak ada kalimat buku yang diketik ulang dengan tangan, supaya
// yang diuji benar benar halaman buku berbahasa Inggris yang asli.
//
// Kunci jawaban (makna yang benar di konteks itu) ditulis di berkas ini dan
// di-commit SEBELUM model dijalankan. Stempel waktu git menjadi bukti bahwa
// kunci tidak disesuaikan setelah hasilnya terlihat.
//
// Pemakaian:
//   node scripts/uji-akurasi/susun-kasus.mjs <folder berisi teks Gutenberg>
// Folder itu berisi pride.txt (1342), holmes.txt (1661), frankenstein.txt (84),
// alice.txt (11), dan mobydick.txt (2701), diunduh dari
// https://www.gutenberg.org/cache/epub/<id>/pg<id>.txt

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const source = process.argv[2];
if (!source) throw new Error('Sebutkan folder teks Gutenberg.');

const BOOKS = {
  pride: { title: 'Pride and Prejudice', author: 'Jane Austen', gutenberg: 1342 },
  holmes: { title: 'The Adventures of Sherlock Holmes', author: 'Arthur Conan Doyle', gutenberg: 1661 },
  frankenstein: { title: 'Frankenstein', author: 'Mary Shelley', gutenberg: 84 },
  alice: { title: "Alice's Adventures in Wonderland", author: 'Lewis Carroll', gutenberg: 11 },
  mobydick: { title: 'Moby Dick', author: 'Herman Melville', gutenberg: 2701 },
};

// Teks dirapikan hanya sebatas yang tidak mengubah kata: baris baru dan spasi
// ganda disatukan, garis bawah penanda huruf miring Gutenberg (_me_) dilepas
// karena di buku cetak itu huruf miring, dan keterangan ilustrasi edisi
// Gutenberg ([Illustration: ...]) dibuang karena bukan bagian dari halaman.
const texts = Object.fromEntries(Object.keys(BOOKS).map((key) => [
  key,
  readFileSync(join(source, `${key}.txt`), 'utf8')
    .replace(/\r/g, '')
    .replace(/\[Illustration:(?:[^[\]]|\[[^\]]*\])*\]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/_([^_]+)_/g, '$1'),
]));

// Titik sesudah singkatan gelar bukan akhir kalimat.
const ABBREVIATION = /(?:Mr|Mrs|Dr|St|Mme|Esq)\.$/;

// Potong sekitar anchor, lalu rapikan ke batas kalimat supaya halaman tidak
// mulai atau berakhir di tengah kalimat.
function excerpt(book, anchor, before, after) {
  const text = texts[book];
  const at = text.indexOf(anchor);
  if (at < 0) throw new Error(`Anchor tidak ditemukan di ${book}: ${anchor}`);
  if (text.indexOf(anchor, at + 1) >= 0) throw new Error(`Anchor muncul lebih dari sekali di ${book}: ${anchor}`);
  let start = at;
  for (let words = 0; start > 0 && words < before; start -= 1) if (text[start] === ' ') words += 1;
  let end = at + anchor.length;
  for (let words = 0; end < text.length && words < after; end += 1) if (text[end] === ' ') words += 1;
  const head = text.slice(start, at);
  const cut = head.search(/[.!?”"]\s+[“"A-Z]/);
  const from = cut >= 0 ? start + cut + 1 : start;
  const tail = text.slice(at + anchor.length, end);
  let stop = -1;
  for (const match of tail.matchAll(/[.!?]”?(?= )/g)) {
    const through = tail.slice(0, match.index + match[0].length);
    if (!ABBREVIATION.test(through)) stop = match.index + match[0].length;
  }
  const to = stop >= 0 ? at + anchor.length + stop : end;
  return { text: text.slice(from, to).trim().replace(/^[”"]\s*/, ''), anchor };
}

// Letak kata sasaran yang dimaksud: kemunculan di dalam anchor, bukan
// kemunculan lain di halaman yang sama.
function locate(page, word) {
  const inAnchor = page.anchor.indexOf(word);
  if (inAnchor < 0) throw new Error(`"${word}" tidak ada di anchor: ${page.anchor}`);
  return page.text.indexOf(page.anchor) + inAnchor;
}

const gold = (en, id, trap) => ({ en, id, jebakan: trap });

function bookPage(id, book, anchor, before, after, targets) {
  const page = excerpt(book, anchor, before, after);
  return {
    id,
    kelompok: 'A',
    sumber: { ...BOOKS[book], anchor },
    teks: page.text,
    sasaran: targets.map(([word, key]) => ({ kata: word, offset: locate(page, word), kunci: key })),
  };
}

const A = [
  bookPage('A-want', 'pride', 'must be in want of a wife', 20, 80, [
    ['want', gold('lack, be in need of', 'kekurangan / membutuhkan', 'ingin, mau')],
  ]),
  bookPage('A-darcy', 'pride', 'She is tolerable: but not handsome enough to tempt me; and I am in no humour at present to give consequence to young ladies', 120, 90, [
    ['tolerable', gold('passable, just acceptable, not remarkable', 'lumayan, biasa saja', 'dapat ditoleransi atau ditahan')],
    ['humour', gold('mood, state of mind', 'suasana hati', 'humor, lelucon')],
    ['consequence', gold('importance, social standing', 'arti penting, gengsi', 'akibat')],
  ]),
  bookPage('A-sensible', 'pride', 'I am very sensible of the honour of your proposals', 110, 120, [
    ['sensible', gold('aware of, appreciative of', 'menyadari, menghargai', 'masuk akal, bijaksana')],
  ]),
  bookPage('A-condescension', 'pride', 'such affability and condescension, as he had himself experienced from Lady Catherine', 110, 130, [
    ['condescension', gold('gracious kindness shown by a superior to social inferiors (approving)', 'kemurahan hati orang berkedudukan tinggi', 'sikap merendahkan orang lain')],
  ]),
  bookPage('A-engaged', 'pride', 'he readily engaged for taking the earliest opportunity of waiting on her', 130, 110, [
    ['engaged', gold('promised, committed himself', 'berjanji, menyanggupi', 'bertunangan, sibuk')],
  ]),
  bookPage('A-holmes-harness', 'holmes', 'Just a trifle more, I fancy, Watson. And in practice again, I observe. You did not tell me that you intended to go into harness.', 120, 110, [
    ['fancy', gold('think, suppose', 'kira, rasa', 'suka, mewah')],
    ['practice', gold("a doctor's professional work", 'praktik dokter', 'latihan')],
    ['harness', gold('regular work (to go into harness: take up work again)', 'kembali bekerja rutin', 'tali kekang kuda')],
  ]),
  bookPage('A-singular', 'holmes', 'one of the most singular which I have listened to for some time', 130, 110, [
    ['singular', gold('strange, extraordinary', 'aneh, luar biasa', 'tunggal')],
  ]),
  bookPage('A-presently', 'holmes', 'I shall be with you presently', 150, 90, [
    ['presently', gold('soon, in a short while', 'sebentar lagi', 'sekarang, saat ini')],
  ]),
  bookPage('A-countenance', 'frankenstein', 'His countenance instantly assumed an aspect of the deepest gloom', 130, 110, [
    ['countenance', gold('face, facial expression', 'raut wajah', 'dukungan, restu')],
  ]),
  bookPage('A-curious', 'alice', 'What a curious feeling!', 150, 110, [
    ['curious', gold('strange, odd', 'aneh', 'ingin tahu')],
  ]),
  bookPage('A-hands', 'mobydick', 'Thunder and lightning! so near! Call all hands.', 120, 100, [
    ['hands', gold('crew members, sailors', 'awak kapal', 'tangan')],
  ]),
];

// Kelompok B: kata umum yang sering menjebak pembaca Indonesia. Kalimatnya
// DITULIS SENDIRI oleh Claude sebagai pengganti kumpulan kata dari Threads,
// yang tidak tersedia. Dilaporkan terpisah dari kelompok A karena penulis
// kalimat juga yang menulis kuncinya.
function writtenPage(id, text, targets) {
  return {
    id,
    kelompok: 'B',
    sumber: { title: 'Kalimat buatan untuk uji', author: 'Claude', gutenberg: null, anchor: null },
    teks: text,
    sasaran: targets.map(([word, key]) => {
      const offset = text.indexOf(word);
      if (offset < 0) throw new Error(`"${word}" tidak ada di ${id}`);
      return { kata: word, offset, kunci: key };
    }),
  };
}

const B = [
  writtenPage('B-lake',
    'The lake was perfectly still that morning. Maya had only a spare hour before work, so she walked down to the shore with her coffee. Through the thin mist she could barely make out the far bank, where a few boats were tied to the reeds. Her brother runs a small café near the water, and she had promised to stop by on her way back. She was sure he had been baking since five.',
    [
      ['still', gold('calm, motionless', 'tenang, tidak bergerak', 'masih')],
      ['spare', gold('free, available', 'luang', 'cadangan')],
      ['make out', gold('manage to see with difficulty', 'melihat samar samar', 'berciuman')],
      ['bank', gold('land along the edge of a lake or river', 'tepi danau', 'bank, lembaga keuangan')],
      ['runs', gold('manages, operates a business', 'mengelola', 'berlari')],
    ]),
  writtenPage('B-exam',
    'I figured the test would be easy, but the mean score in our class was only sixty. My teacher looked at my answers and said my reasoning was sound, even if my arithmetic was not. She told me to put up with the pressure for one more week. Honestly, I can not bear another exam before the holidays.',
    [
      ['figured', gold('assumed, thought', 'mengira', 'menggambar, tokoh')],
      ['mean', gold('average', 'rata rata', 'jahat, berarti')],
      ['sound', gold('reliable, logically valid', 'masuk akal, kuat', 'suara')],
      ['put up with', gold('tolerate', 'menahan, menoleransi', 'memasang')],
      ['bear', gold('tolerate, endure', 'tahan', 'beruang')],
    ]),
  writtenPage('B-trip',
    'Dad had to pay a fine for parking outside the county fair. Getting to the station afterwards was a close call; he almost missed his train. On the way home he picked up a little Spanish from the other passengers, but he would rather not talk about the whole trip.',
    [
      ['fine', gold('money paid as a penalty', 'denda', 'baik, bagus')],
      ['fair', gold('outdoor event with rides, stalls, and exhibits', 'pasar malam, pameran', 'adil')],
      ['close call', gold('narrow escape from trouble', 'nyaris celaka', 'panggilan dekat')],
      ['picked up', gold('learned informally, without studying', 'mempelajari tanpa sengaja', 'mengambil, menjemput')],
      ['rather', gold('prefer to', 'lebih suka', 'agak')],
    ]),
];

// Kelompok C: satu kalimat yang memang ambigu. Yang dinilai bukan makna
// mana yang dipilih, tetapi apakah model jujur menandainya ragu.
const C = [
  {
    id: 'C-duck',
    kelompok: 'C',
    sumber: { title: 'Kalimat ambigu klasik', author: null, gutenberg: null, anchor: null },
    teks: 'We walked along the path in silence. I saw her duck near the old pond, and then the rain started again.',
    sasaran: [{
      kata: 'duck',
      offset: 'We walked along the path in silence. I saw her '.length,
      kunci: { en: 'AMBIGUOUS: the bird, or the act of lowering her head', id: 'ambigu: bebek, atau menunduk', jebakan: 'memilih satu makna dengan yakin' },
    }],
  },
];

// Kelompok M: mode tandai pada halaman yang sama. Tidak ada daftar kata;
// yang dinilai adalah apakah model menemukan kata yang ditandai dan tidak
// menambah kata lain, lalu apakah maknanya benar.
const M = [
  { id: 'M-darcy-oval', halaman: 'A-darcy', tanda: [['tolerable', 'oval'], ['humour', 'oval'], ['consequence', 'oval']] },
  { id: 'M-holmes-oval', halaman: 'A-holmes-harness', tanda: [['fancy', 'oval'], ['practice', 'oval'], ['harness', 'oval']] },
  { id: 'M-lake-pensil', halaman: 'B-lake', tanda: [['still', 'pensil'], ['make out', 'pensil'], ['bank', 'pensil']] },
  { id: 'M-want-pensil', halaman: 'A-want', tanda: [['want', 'pensil']] },
  { id: 'M-trip-campur', halaman: 'B-trip', tanda: [['fine', 'pensil'], ['rather', 'oval']] },
];

const pages = [...A, ...B, ...C];
const warnings = [];
for (const page of pages) {
  for (const target of page.sasaran) {
    if (page.teks.slice(target.offset, target.offset + target.kata.length) !== target.kata) {
      throw new Error(`Letak "${target.kata}" di ${page.id} tidak cocok.`);
    }
    // Kata yang muncul lebih dari sekali di satu halaman bisa membuat model
    // menjawab kemunculan yang lain. Dicatat supaya bisa dinilai dengan adil.
    const pattern = new RegExp(`\\b${target.kata.replace(/ /g, '\\s+')}\\b`, 'gi');
    const count = (page.teks.match(pattern) ?? []).length;
    target.kemunculan = count;
    if (count > 1) warnings.push(`${page.id}: "${target.kata}" muncul ${count} kali`);
  }
}

const out = {
  dibuat: new Date().toISOString(),
  catatan: 'Kunci jawaban ditetapkan sebelum model dijalankan. Kelompok A dari teks asli Project Gutenberg; kelompok B ditulis sendiri sebagai pengganti kata dari Threads.',
  halaman: pages,
  tandai: M,
};
writeFileSync(new URL('./kasus.json', import.meta.url), `${JSON.stringify(out, null, 2)}\n`);
console.log(`${pages.length} halaman, ${pages.reduce((n, p) => n + p.sasaran.length, 0)} kata sasaran, ${M.length} halaman mode tandai.`);
for (const warning of warnings) console.log(`PERHATIAN ${warning}`);
for (const page of pages) console.log(`- ${page.id.padEnd(20)} ${String(page.teks.split(' ').length).padStart(4)} kata  | ${page.sasaran.map((t) => t.kata).join(', ')}`);
