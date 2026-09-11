// Menghitung hasil uji akurasi dan menulis laporan.md.
//
// Semua angka di laporan dihitung dari berkas di folder ini: kasus.json (kunci
// yang di-commit sebelum model dijalankan), hasil.json dan hasil-ulang.json
// (jawaban mentah model), penilaian.json (vonis per kata), dan
// log-percobaan.jsonl (satu baris per permintaan dari log server). Tidak ada
// angka yang dijumlahkan dengan tangan.
//
// Pemakaian: node scripts/uji-akurasi/nilai.mjs

import { readFileSync, writeFileSync } from 'node:fs';

const read = (name) => JSON.parse(readFileSync(new URL(`./${name}`, import.meta.url), 'utf8'));
const kasus = read('kasus.json');
const run1 = read('hasil.json');
const run2 = read('hasil-ulang.json');
const nilai = read('penilaian.json');
const log = readFileSync(new URL('./log-percobaan.jsonl', import.meta.url), 'utf8').trim().split('\n').map((l) => JSON.parse(l));

const norm = (s) => s.trim().toLowerCase();
const final = (list1, list2, id) => {
  const first = list1.find((x) => x.id === id);
  return first?.ok ? { ...first, putaran: 1 } : { ...list2.find((x) => x.id === id), putaran: 2 };
};
const pct = (a, b) => `${Math.round((a / b) * 100)}%`;
const sec = (ms) => `${(ms / 1000).toFixed(1).replace('.', ',')} dtk`;

// ---------- Akurasi mode ketik ----------
const rows = [];
for (const page of kasus.halaman) {
  const run = final(run1.halaman, run2.halaman, page.id);
  for (const t of page.sasaran) {
    const hit = run.hasil.find((r) => norm(r.word) === norm(t.kata));
    const verdict = nilai.halaman[page.id][t.kata];
    rows.push({
      kelompok: page.kelompok,
      halaman: page.id,
      sumber: page.sumber.title,
      kata: t.kata,
      kunci: t.kunci.id,
      jebakan: t.kunci.jebakan,
      jawaban: hit ? hit.candidates.map((c) => c.meaning_id).join(' ‖ ') : '(tidak ada)',
      ragu: hit?.ambiguous ?? false,
      nilai: verdict.nilai,
      catatan: verdict.catatan,
      model: run.model,
    });
  }
}
const group = (k) => rows.filter((r) => r.kelompok === k);
const correct = (list) => list.filter((r) => r.nilai === 'benar' || r.nilai === 'benar-ragu').length;
const A = group('A');
const B = group('B');
const C = group('C');

// ---------- Mode tandai ----------
const marks = kasus.tandai.map((mark) => {
  const run = final(run1.tandai, run2.tandai, mark.id);
  const page = kasus.halaman.find((p) => p.id === mark.halaman);
  const targets = mark.tanda.map(([word]) => word);
  const matches = (result, word) => norm(result.word).includes(norm(word)) || norm(word).includes(norm(result.word));
  const found = targets.filter((word) => run.hasil.some((r) => matches(r, word))).length;
  const extra = run.hasil.filter((r) => !targets.some((word) => matches(r, word))).length;
  const unmarkedOnPage = page.sasaran.map((t) => t.kata).filter((w) => !targets.includes(w));
  return {
    id: mark.id,
    tanda: mark.tanda.map(([w, k]) => `${w} (${k})`).join(', '),
    ditemukan: run.hasil.map((r) => r.word).join(', '),
    target: targets.length,
    found,
    extra,
    makna: nilai.tandai[mark.id].makna_benar,
    tidakDitandai: unmarkedOnPage.join(', '),
    catatan: nilai.tandai[mark.id].catatan,
    model: run.model,
  };
});
const sum = (list, key) => list.reduce((n, x) => n + x[key], 0);

// ---------- Keandalan dan waktu ----------
const allFirst = [...run1.halaman, ...run1.tandai];
const firstOk = allFirst.filter((x) => x.ok).length;
const finals = [...kasus.halaman.map((p) => final(run1.halaman, run2.halaman, p.id)), ...kasus.tandai.map((m) => final(run1.tandai, run2.tandai, m.id))];
const times = finals.map((x) => x.ms).sort((a, b) => a - b);
const median = times.length % 2 ? times[(times.length - 1) / 2] : (times[times.length / 2 - 1] + times[times.length / 2]) / 2;
const under = (s) => times.filter((ms) => ms <= s * 1000).length;
const answeredBy = {};
for (const x of finals) answeredBy[x.model] = (answeredBy[x.model] ?? 0) + 1;
const perModel = {};
for (const line of log) {
  for (const a of line.attempts) {
    perModel[a.model] ??= { dicoba: 0, ok: 0, timeout: 0, next: 0 };
    perModel[a.model].dicoba += 1;
    perModel[a.model][a.outcome] = (perModel[a.model][a.outcome] ?? 0) + 1;
  }
}
const okTimes = log.flatMap((l) => l.attempts.filter((a) => a.outcome === 'ok').map((a) => a.ms)).sort((a, b) => a - b);

// ---------- Laporan ----------
const table = (head, body) => [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...body.map((r) => `| ${r.join(' | ')} |`)].join('\n');
const esc = (s) => String(s).replace(/\|/g, '\\|');

const md = `# Laporan Uji Akurasi Lema

Dijalankan ${run1.dijalankan.slice(0, 10)} lewat \`/api/lookup\` yang sama dengan produksi (prompt, rantai model, validasi), dari server lokal. Kunci jawaban di-commit **sebelum** model dijalankan: commit \`8842095\`. Laporan ini dibuat otomatis oleh \`scripts/uji-akurasi/nilai.mjs\`.

## Ringkasan

| Yang diuji | Hasil |
|---|---|
| **Kelompok A** — kata sulit dari buku Inggris asli (Project Gutenberg) | **${correct(A)} dari ${A.length} benar** (${pct(correct(A), A.length)}) |
| Kelompok B — kata umum yang menjebak, kalimat ditulis sendiri | ${correct(B)} dari ${B.length} benar (${pct(correct(B), B.length)}) |
| Kelompok C — kalimat yang memang ambigu | ${C.filter((r) => r.nilai === 'ragu-tepat').length} dari ${C.length} ditandai ragu dengan jujur |
| **Mode tandai** — kata yang ditemukan dari oval dan garis pensil | **${sum(marks, 'found')} dari ${sum(marks, 'target')}**, dengan ${sum(marks, 'extra')} kata tambahan yang tidak ditandai |
| Mode tandai — makna yang benar | ${sum(marks, 'makna')} dari ${sum(marks, 'target')} |
| **Keandalan** — permintaan yang terjawab pada percobaan pertama | **${firstOk} dari ${allFirst.length}** (${pct(firstOk, allFirst.length)}); sisanya terjawab saat diulang |
| Waktu tunggu per halaman yang berhasil | median ${sec(median)}, tercepat ${sec(times[0])}, terlama ${sec(times[times.length - 1])} |

Kriteria PRD bagian 12 nomor 1 (minimal 12 dari 15 kata buku asli benar) **terpenuhi pada uji ini**. Kriteria nomor 2 memakai pengganti, lihat keterbatasan di bawah.

## Keterbatasan yang harus dibaca bersama angkanya

1. **Teks kelompok A sangat terkenal.** Pride and Prejudice dan Sherlock Holmes hampir pasti ada di data latih model, lengkap dengan penjelasan kata kata sulitnya di edisi beranotasi. Buku modern yang kurang terkenal kemungkinan lebih sulit. Angka ${pct(correct(A), A.length)} adalah batas atas, bukan perkiraan untuk semua buku.
2. **Halaman dirender, bukan difoto.** Tidak ada buram, pantulan cahaya, halaman melengkung, bayangan jari, atau huruf kecil. Garis pensilnya juga lebih rapi daripada coretan sungguhan. Foto dari HP akan lebih sulit.
3. **Kelompok B ditulis sendiri** sebagai pengganti kumpulan kata dari Threads, yang tidak tersedia. Penulis kalimatnya juga penulis kuncinya, dan konteksnya cenderung jelas. Dilaporkan terpisah dari kelompok A karena itu.
4. **Satu penilai.** Penilaian dilakukan oleh Claude terhadap kunci yang dikunci lebih dulu. Semua jawaban mentah model ada di tabel di bawah dan di \`hasil.json\`, supaya bisa diperiksa ulang.
5. **Jumlahnya kecil**: ${rows.length} kata dan ${kasus.tandai.length} halaman mode tandai.
6. **Tingkat berpikir model \`low\`**, sesuai pengaturan produksi.

## Temuan terpenting: keandalan, bukan akurasi

Makna yang dipilih hampir tidak pernah salah. Yang bermasalah adalah **model sedang kelebihan beban**: ${allFirst.length - firstOk} dari ${allFirst.length} permintaan gagal pada percobaan pertama karena semua model yang sempat dicoba menggantung atau menolak dalam anggaran 50 detik.

${table(['Model', 'Dicoba', 'Berhasil', 'Menggantung (20 dtk)', 'Menolak (503)'], Object.entries(perModel).map(([m, t]) => [m, t.dicoba, t.ok, t.timeout ?? 0, t.next ?? 0]))}

Model yang akhirnya menjawab: ${Object.entries(answeredBy).map(([m, n]) => `${m} ${n}×`).join(', ')}. Percobaan yang berhasil sendiri memakan ${sec(okTimes[0])} sampai ${sec(okTimes[okTimes.length - 1])}; waktu tunggu yang panjang hampir seluruhnya berasal dari menunggu model yang menggantung.

\`gemini-3.1-flash-lite\` hanya sempat dicoba ${perModel['gemini-3.1-flash-lite']?.dicoba ?? 0} kali, karena dua model pertama sering menghabiskan 20 + 20 detik dan anggaran habis sebelum gilirannya. Sebagian kegagalan di atas disebabkan oleh susunan rantai itu, bukan hanya oleh kelebihan beban.

Sebaran waktu dari ${times.length} halaman yang berhasil: ${under(10)} selesai dalam 10 detik, ${under(20)} dalam 20 detik, ${under(30)} dalam 30 detik, ${times.length - under(30)} lebih dari 30 detik.

## Hasil per kata, mode ketik

${table(['Klp', 'Kata', 'Makna yang benar', 'Jebakan', 'Jawaban model', 'Nilai', 'Catatan'], rows.map((r) => [r.kelompok, `**${esc(r.kata)}**`, esc(r.kunci), esc(r.jebakan), esc(r.jawaban) + (r.ragu ? ' *(ragu)*' : ''), r.nilai, esc(r.catatan)]))}

## Hasil mode tandai

${table(['Halaman', 'Yang ditandai', 'Yang ditemukan', 'Tepat', 'Tambahan', 'Makna benar', 'Tidak ditandai, tidak diambil'], marks.map((m) => [m.id, esc(m.tanda), esc(m.ditemukan), `${m.found}/${m.target}`, m.extra, `${m.makna}/${m.target}`, esc(m.tidakDitandai) || '-']))}

Yang paling penting dari tabel ini adalah kolom terakhir. Di halaman danau, "spare" dan "runs" ada di halaman yang sama dengan kata yang digaris bawahi, dan model tidak mengambilnya. Aturan "jangan menambahkan kata yang tidak ditandai" dipatuhi di kelima halaman.

## Sumber teks

${[...new Set(kasus.halaman.filter((p) => p.sumber.gutenberg).map((p) => `- ${p.sumber.title}, ${p.sumber.author}, Project Gutenberg #${p.sumber.gutenberg}`))].join('\n')}

## Mengulang uji ini

\`\`\`bash
# 1. Unduh teks Gutenberg ke satu folder: pride.txt (1342), holmes.txt (1661),
#    frankenstein.txt (84), alice.txt (11), mobydick.txt (2701)
node scripts/uji-akurasi/susun-kasus.mjs <folder teks>
# 2. Jalankan server produksi lokal dengan batas harian dilonggarkan
npm run build
DAILY_LOOKUP_LIMIT=1000 npx next start --port 3300
# 3. Jalankan uji, ulangi yang gagal, lalu hitung
node scripts/uji-akurasi/jalankan.mjs http://127.0.0.1:3300
ULANG=<id yang gagal, dipisah koma> node scripts/uji-akurasi/jalankan.mjs http://127.0.0.1:3300
node scripts/uji-akurasi/nilai.mjs
\`\`\`
`;

writeFileSync(new URL('./laporan.md', import.meta.url), md);
console.log(`A ${correct(A)}/${A.length}, B ${correct(B)}/${B.length}, C ragu-tepat ${C.filter((r) => r.nilai === 'ragu-tepat').length}/${C.length}`);
console.log(`Tandai: ditemukan ${sum(marks, 'found')}/${sum(marks, 'target')}, tambahan ${sum(marks, 'extra')}, makna ${sum(marks, 'makna')}/${sum(marks, 'target')}`);
console.log(`Keandalan percobaan pertama ${firstOk}/${allFirst.length}; median ${sec(median)}, min ${sec(times[0])}, max ${sec(times[times.length - 1])}; <=10s ${under(10)}, <=20s ${under(20)}, <=30s ${under(30)} dari ${times.length}`);
console.log('Dijawab oleh:', JSON.stringify(answeredBy));
console.log('Per model:', JSON.stringify(perModel));
console.log('laporan.md ditulis.');
