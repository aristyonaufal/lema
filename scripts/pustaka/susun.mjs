// Menyusun pustaka Lema dari berkas EPUB Standard Ebooks.
//
// Dijalankan sekali saat menyiapkan buku, dan hasilnya di-commit. Aplikasi tidak
// pernah memanggil skrip ini, dan tidak pernah mengurai EPUB saat berjalan.
//
//   node scripts/pustaka/susun.mjs            # semua buku di daftar.json
//   node scripts/pustaka/susun.mjs alice       # satu buku saja
//
// Keluarannya di public/pustaka/:
//
//   index.json              katalog: judul, penulis, tingkat, jumlah bab dan kata
//   <slug>/buku.json        daftar bab satu buku
//   <slug>/<n>.json         paragraf bab ke-n, dimulai dari 1
//
// Dipecah per bab supaya pembaca cuma mengunduh yang sedang dibaca. Moby-Dick
// utuh lebih dari satu megabyte, dan itu tidak boleh dikirim sekali jalan ke HP.

import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openZip } from './zip.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const cacheDir = join(here, '.unduhan');
const outDir = join(root, 'public', 'pustaka');

const SITE = 'https://standardebooks.org';

// ---------- pengunduhan ----------

// Alamat unduhan memuat slug ilustrator, misalnya .../john-tenniel/downloads/...,
// jadi tidak bisa disusun dari judul saja. Yang stabil cuma alamat halaman
// bukunya, dan dari situ alamat berkasnya dibaca.
async function findEpubUrl(page) {
  const res = await fetch(`${SITE}/ebooks/${page}`);
  if (!res.ok) throw new Error(`Halaman buku tidak bisa dibuka (${res.status}): ${page}`);
  const html = await res.text();

  const paths = [...html.matchAll(/\/ebooks\/[^"']*?\/downloads\/[^"']*?\.epub/g)].map((m) => m[0]);
  // Tiga varian lain ikut tertangkap pola di atas. Yang dipakai versi biasa:
  // 'advanced' memakai fitur EPUB3 yang tidak dibutuhkan, dan kepub khusus Kobo.
  const plain = paths.find((p) => !p.includes('_advanced') && !p.includes('.kepub.'));
  if (!plain) throw new Error(`Tautan epub tidak ditemukan di halaman ${page}.`);
  return `${SITE}${plain}?source=download`;
}

// Tanpa ?source=download, situsnya membalas halaman "Your Download Has Started!"
// dengan status 200, dan yang tersimpan jadi HTML alih alih arsip.
async function download(page, slug) {
  const file = join(cacheDir, `${slug}.epub`);
  if (existsSync(file)) {
    console.log(`  ${slug}: pakai unduhan yang sudah ada`);
    return readFile(file);
  }
  const url = await findEpubUrl(page);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Unduhan gagal (${res.status}): ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.subarray(0, 2).toString() !== 'PK') {
    throw new Error(`Yang terunduh bukan arsip EPUB: ${url}`);
  }
  await mkdir(cacheDir, { recursive: true });
  await writeFile(file, buf);
  console.log(`  ${slug}: terunduh ${(buf.length / 1e6).toFixed(1)} MB`);
  return buf;
}

// ---------- pembacaan EPUB ----------

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…',
  mdash: '—', ndash: '–', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
};

function decode(text) {
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, body) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X'
        ? parseInt(body.slice(2), 16)
        : parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? fromCodePointSafe(code) : whole;
    }
    return ENTITIES[body] ?? whole;
  });
}

function fromCodePointSafe(code) {
  try { return String.fromCodePoint(code); } catch { return ''; }
}

const attr = (tag, name) => tag.match(new RegExp(`${name}="([^"]*)"`))?.[1] ?? '';

// Satu paragraf jadi satu potong teks bersih. Semua tanda di dalamnya dibuang,
// termasuk penekanan: yang dibutuhkan pembaca makna cuma kata katanya, dan
// menyimpan tanda berarti menyimpan HTML dari sumber luar ke dalam aplikasi.
//
// Satu satunya yang dipertahankan adalah pindah baris di dalam paragraf, karena
// puisi memakainya. Tanpa itu, Lobster Quadrille dan sajak sajak di Alice jadi
// satu gumpalan prosa. Pembaca menampilkannya dengan white-space: pre-line.
function plainText(html) {
  return decode(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ''),
  )
    // Karakter perekat tanpa lebar dibuang lebih dulu, dan urutannya penting.
    // Standard Ebooks menyelipkan U+FEFF sebelum em dash supaya tanda itu tidak
    // pindah baris. Di JavaScript, \s ikut menangkap U+FEFF, jadi kalau spasi
    // dirapikan duluan, "ago—never" berubah jadi "ago —never".
    .replace(/[﻿​‌‍⁠]/g, '')
    // Hanya spasi mendatar yang dirapikan, supaya \n dari <br> selamat.
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function chapterTitle(html, fallback) {
  const raw = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1];
  const clean = raw ? plainText(raw) : '';
  return clean || fallback;
}

function paragraphs(html) {
  const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? '';
  const cleaned = body
    // Judul bab sudah diambil dari <title>. Kalau hgroup dibiarkan, judulnya
    // muncul lagi sebagai paragraf pertama.
    .replace(/<hgroup[\s\S]*?<\/hgroup>/gi, '')
    // Gambar tidak dibawa ke pembaca Lema. Keterangan gambar ikut dibuang,
    // karena tanpa gambarnya keterangan itu menggantung tanpa rujukan.
    .replace(/<figure[\s\S]*?<\/figure>/gi, '')
    .replace(/<table[\s\S]*?<\/table>/gi, '');

  const out = [];
  for (const match of cleaned.matchAll(/<(p|h[2-6])\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const text = plainText(match[2]);
    if (text) out.push(text);
  }
  return out;
}

const countWords = (text) => (text.match(/[A-Za-z'’]+/g) ?? []).length;

async function readBook(buf, entry) {
  const zip = openZip(buf);

  const container = (await zip.read('META-INF/container.xml')).toString();
  // Batas kata penting: tanpa itu polanya menangkap pembungkus <rootfiles>
  // yang muncul lebih dulu dan tidak punya atribut apa pun.
  const opfPath = attr(container.match(/<rootfile\b[^>]*>/)[0], 'full-path');
  const opfDir = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1) : '';
  const opf = (await zip.read(opfPath)).toString();

  const judul = decode(opf.match(/<dc:title[^>]*>([\s\S]*?)<\/dc:title>/)?.[1] ?? entry.slug);
  const penulis = decode(opf.match(/<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/)?.[1] ?? '');

  // Peta id ke nama berkas, lalu urutan baca dari spine. Urutan di manifest
  // tidak bisa dipakai: chapter-10 muncul sebelum chapter-2 di sana.
  const manifest = new Map();
  for (const tag of opf.match(/<item\b[^>]*>/g) ?? []) {
    manifest.set(attr(tag, 'id'), attr(tag, 'href'));
  }

  const bab = [];
  for (const tag of opf.match(/<itemref\b[^>]*>/g) ?? []) {
    const href = manifest.get(attr(tag, 'idref'));
    if (!href || !href.endsWith('.xhtml')) continue;
    const html = (await zip.read(opfDir + href)).toString();

    // Pemilihan isi dilakukan secara semantik, bukan lewat daftar nama berkas.
    // Standard Ebooks menandai badan karya dengan epub:type="bodymatter" pada
    // <body>, sedangkan halaman judul, imprint, colophon, uncopyright, dan
    // daftar ilustrasi ditandai frontmatter atau backmatter. Jadi aturan ini
    // ikut benar pada buku yang susunannya tidak biasa, misalnya Etymology dan
    // Extracts di Moby-Dick yang memang bagian dari karyanya.
    const bodyTag = html.match(/<body[^>]*>/i)?.[0] ?? '';
    if (!/epub:type="[^"]*bodymatter/.test(bodyTag)) continue;

    const paragraf = paragraphs(html);
    if (paragraf.length === 0) continue;

    bab.push({
      judul: chapterTitle(html, `Bagian ${bab.length + 1}`),
      paragraf,
      kata: paragraf.reduce((sum, p) => sum + countWords(p), 0),
    });
  }

  if (bab.length === 0) throw new Error(`Tidak ada bab yang terbaca dari ${entry.slug}.`);
  return { judul, penulis, bab };
}

// ---------- penulisan ----------

async function writeBook(entry, book) {
  const dir = join(outDir, entry.slug);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });

  for (const [index, bab] of book.bab.entries()) {
    await writeFile(
      join(dir, `${index + 1}.json`),
      JSON.stringify({ judul: bab.judul, paragraf: bab.paragraf }),
    );
  }

  const kata = book.bab.reduce((sum, b) => sum + b.kata, 0);
  const ringkas = {
    slug: entry.slug,
    judul: book.judul,
    penulis: book.penulis,
    tingkat: entry.tingkat,
    sumber: `${SITE}/ebooks/${entry.halaman}`,
    kata,
    bab: book.bab.map((b) => ({ judul: b.judul, kata: b.kata })),
  };
  await writeFile(join(dir, 'buku.json'), JSON.stringify(ringkas, null, 2));
  return ringkas;
}

// ---------- utama ----------

async function main() {
  const pilih = process.argv.slice(2);
  const daftar = JSON.parse(await readFile(join(here, 'daftar.json'), 'utf8'));
  const buku = daftar.buku.filter((b) => pilih.length === 0 || pilih.includes(b.slug));
  if (buku.length === 0) throw new Error(`Tidak ada buku cocok: ${pilih.join(', ')}`);

  await mkdir(outDir, { recursive: true });
  const katalog = [];

  for (const entry of buku) {
    console.log(`\n${entry.slug}`);
    const raw = await download(entry.halaman, entry.slug);
    const book = await readBook(raw, entry);
    const ringkas = await writeBook(entry, book);
    katalog.push({
      slug: ringkas.slug,
      judul: ringkas.judul,
      penulis: ringkas.penulis,
      tingkat: ringkas.tingkat,
      bab: ringkas.bab.length,
      kata: ringkas.kata,
    });
    console.log(`  ${ringkas.judul} — ${ringkas.bab.length} bab, ${ringkas.kata.toLocaleString('id-ID')} kata`);
  }

  // Katalog hanya ditulis ulang saat semua buku disusun. Menjalankan skrip untuk
  // satu buku tidak boleh menghapus buku lain dari katalog.
  if (pilih.length === 0) {
    await writeFile(
      join(outDir, 'index.json'),
      JSON.stringify({ disusun: new Date().toISOString().slice(0, 10), buku: katalog }, null, 2),
    );
    console.log(`\nKatalog: ${katalog.length} buku.`);
  } else {
    console.log('\nKatalog tidak disentuh karena skrip dijalankan untuk sebagian buku.');
  }
}

main().catch((error) => {
  console.error(`\nGagal: ${error.message}`);
  process.exit(1);
});
