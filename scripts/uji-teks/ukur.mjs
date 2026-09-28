// Mengukur mode teks terhadap mode foto.
//
//   node scripts/uji-teks/ukur.mjs
//
// Dijalankan terhadap server produksi lokal, lewat /api/lookup yang sama dengan
// yang dipakai pengguna. Yang diukur dua hal, dan keduanya menentukan bentuk
// layar pembaca:
//
// 1. Waktu tunggu. Mode foto punya median 28,2 detik pada uji 11 September.
//    Kalau mode teks tidak jauh lebih cepat, panel makna harus dibuat seperti
//    peta makna di alur foto: terbuka seketika lalu terisi sendiri. Kalau jauh
//    lebih cepat, panelnya boleh menunggu jawabannya.
// 2. Ketepatan makna. Bukan uji akurasi penuh; kata katanya dipilih karena
//    maknanya bergantung konteks, dan jawabannya dibaca manusia.
//
// Kata diambil dari pustaka yang benar benar ada di aplikasi, bukan dari
// kalimat karangan, dan paragrafnya dikirim apa adanya seperti yang akan
// dikirim pembaca.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const PUSTAKA = join(root, 'public', 'pustaka');
const BASE = process.env.LEMA_BASE ?? 'http://127.0.0.1:3300';

// Kata yang maknanya benar benar bergantung konteks, diambil dari buku yang
// ada di pustaka. `bab` dimulai dari 1, sama dengan penomoran berkasnya.
const SASARAN = [
  { slug: 'pride-and-prejudice', bab: 1, kata: 'fortune' },
  { slug: 'pride-and-prejudice', bab: 1, kata: 'want' },
  { slug: 'pride-and-prejudice', bab: 3, kata: 'countenance' },
  { slug: 'sherlock', bab: 1, kata: 'singular' },
  { slug: 'sherlock', bab: 1, kata: 'cold' },
  { slug: 'frankenstein', bab: 1, kata: 'want' },
  { slug: 'moby-dick', bab: 1, kata: 'spleen' },
  { slug: 'moby-dick', bab: 1, kata: 'hazy' },
  { slug: 'alice', bab: 1, kata: 'remarkable' },
  { slug: 'alice', bab: 2, kata: 'curious' },
];

const kataAda = (teks, kata) =>
  new RegExp(`\\b${kata.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(teks);

async function cariParagraf(slug, bab, kata) {
  const isi = JSON.parse(await readFile(join(PUSTAKA, slug, `${bab}.json`), 'utf8'));
  // Paragraf terpanjang yang memuat katanya. Yang panjang memberi konteks
  // paling banyak, dan itulah yang sebenarnya dikirim pembaca.
  const cocok = isi.paragraf.filter((p) => kataAda(p, kata));
  if (cocok.length === 0) return null;
  return cocok.sort((a, b) => b.length - a.length)[0];
}

async function tanya(kata, konteks) {
  const form = new FormData();
  form.set('mode', 'text');
  form.set('word', kata);
  form.set('context', konteks);

  const mulai = Date.now();
  const res = await fetch(`${BASE}/api/lookup`, { method: 'POST', body: form });
  const ms = Date.now() - mulai;
  const data = await res.json().catch(() => ({ ok: false, error: 'balasan bukan JSON' }));
  return { ms, status: res.status, data };
}

const median = (angka) => {
  const urut = [...angka].sort((a, b) => a - b);
  const t = Math.floor(urut.length / 2);
  return urut.length % 2 ? urut[t] : Math.round((urut[t - 1] + urut[t]) / 2);
};

async function main() {
  const hasil = [];

  for (const s of SASARAN) {
    const konteks = await cariParagraf(s.slug, s.bab, s.kata);
    if (!konteks) {
      console.log(`  ${s.kata} (${s.slug} bab ${s.bab}): TIDAK KETEMU di paragraf mana pun`);
      continue;
    }

    const { ms, status, data } = await tanya(s.kata, konteks);
    const r = data?.results?.[0];
    hasil.push({
      ...s,
      ms,
      status,
      ok: Boolean(data?.ok && r),
      model: data?.model ?? null,
      panjangKonteks: konteks.length,
      makna: r?.candidates?.[0]?.meaning_id ?? null,
      pemicu: r?.candidates?.[0]?.trigger ?? null,
      ragu: r?.ambiguous ?? null,
      kalimat: r?.sentence ?? null,
      galat: data?.ok ? null : data?.error ?? null,
    });

    const tanda = data?.ok && r ? `${(ms / 1000).toFixed(1)}s` : `GAGAL ${status}`;
    console.log(`  ${s.kata.padEnd(12)} ${tanda.padStart(8)}  ${r?.candidates?.[0]?.meaning_id ?? data?.error ?? ''}`);
  }

  const berhasil = hasil.filter((h) => h.ok);
  const waktu = berhasil.map((h) => h.ms);

  console.log('\n--- ringkasan ---');
  console.log(`Terjawab pada percobaan pertama : ${berhasil.length} dari ${hasil.length}`);
  if (waktu.length > 0) {
    console.log(`Median waktu tunggu             : ${(median(waktu) / 1000).toFixed(1)} detik`);
    console.log(`Tercepat sampai terlama         : ${(Math.min(...waktu) / 1000).toFixed(1)}s sampai ${(Math.max(...waktu) / 1000).toFixed(1)}s`);
  }
  console.log('Pembanding mode foto            : median 28,2 detik, 14 dari 20 pada percobaan pertama');

  await mkdir(here, { recursive: true });
  await writeFile(join(here, 'hasil.json'), JSON.stringify({ pada: new Date().toISOString(), hasil }, null, 2));
  console.log('\nJawaban lengkapnya di scripts/uji-teks/hasil.json');
}

main().catch((e) => { console.error(e); process.exit(1); });
