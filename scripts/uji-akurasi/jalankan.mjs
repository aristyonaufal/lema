// Menjalankan uji akurasi Lema terhadap /api/lookup yang sungguhan.
//
// Setiap halaman di kasus.json dirender sebagai "foto" halaman buku, lalu
// dikirim ke endpoint yang sama dengan yang dipakai aplikasi. Jadi yang diuji
// adalah prompt, rantai model, dan validasi yang benar benar hidup, bukan
// panggilan model yang disederhanakan.
//
// Pemakaian, dengan server Lema berjalan:
//   node scripts/uji-akurasi/jalankan.mjs http://127.0.0.1:3300 [folder gambar]
//
// Hasil mentah ditulis ke hasil.json di folder ini, tanpa penilaian. Penilaian
// dilakukan terpisah terhadap kunci di kasus.json, supaya jawaban model tidak
// pernah ikut disunting.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const server = process.argv[2] ?? 'http://127.0.0.1:3300';
const imageDir = process.argv[3];
if (imageDir) mkdirSync(imageDir, { recursive: true });

const cases = JSON.parse(readFileSync(new URL('./kasus.json', import.meta.url), 'utf8'));
const MARKER = '#e6007e';

const escapeHtml = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Menyusun HTML halaman. Kata sasaran dibungkus span supaya letaknya bisa
// diukur untuk mode tandai; span tidak mengubah tampilan sedikit pun.
function pageHtml(page, index) {
  const sorted = [...page.sasaran].map((t, i) => ({ ...t, i })).sort((a, b) => a.offset - b.offset);
  let html = '';
  let cursor = 0;
  for (const target of sorted) {
    html += escapeHtml(page.teks.slice(cursor, target.offset));
    html += `<span class="t" data-i="${target.i}">${escapeHtml(target.kata)}</span>`;
    cursor = target.offset + target.kata.length;
  }
  html += escapeHtml(page.teks.slice(cursor));
  // Dialog dipecah menjadi paragraf seperti di buku cetak.
  const paragraphs = html.split(/(?<=[.!?]”)\s+(?=“)/).map((p) => `<p>${p}</p>`).join('');
  const header = page.sumber.gutenberg ? page.sumber.title : '';
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html, body { margin: 0; background: #6f6a62; }
    #desk { padding: 34px; display: inline-block; }
    #page { position: relative; width: 600px; padding: 52px 58px 44px; background: #fbf6ea;
      box-shadow: 0 10px 30px rgba(0,0,0,.35), inset -28px 0 40px -30px rgba(0,0,0,.18);
      transform: rotate(-0.7deg); font-family: Georgia, 'Times New Roman', serif; font-size: 17px;
      line-height: 1.58; color: #1c1b19; text-align: justify; hyphens: auto; }
    #page p { margin: 0; text-indent: 1.6em; }
    #page p:first-of-type { text-indent: 0; }
    .head { font-size: 10.5px; letter-spacing: .18em; text-transform: uppercase; color: #7c776d;
      text-align: center; margin-bottom: 20px; }
    .folio { text-align: center; font-size: 12px; color: #7c776d; margin-top: 18px; }
    #marks { position: absolute; inset: 0; pointer-events: none; }
  </style></head><body><div id="desk"><div id="page">
    <div class="head">${escapeHtml(header)}</div>${paragraphs}
    <div class="folio">${40 + index * 7}</div><div id="marks"></div>
  </div></div></body></html>`;
}

// Oval magenta dengan geometri yang sama seperti drawMarkers di aplikasi:
// lebar 10% dan tinggi 4,4% lebar foto, nomor di sudut kanan atas. Garis
// pensil dibuat sedikit bergelombang dan tidak rata, seperti coretan tangan.
async function drawMarks(browserPage, marks) {
  return browserPage.evaluate(({ marks, color }) => {
    const page = document.getElementById('page');
    const layer = document.getElementById('marks');
    const photoWidth = document.getElementById('desk').getBoundingClientRect().width;
    const rx = photoWidth * 0.05;
    const ry = photoWidth * 0.022;
    let ovals = 0;
    for (const [index, kind] of marks) {
      const span = document.querySelector(`.t[data-i="${index}"]`);
      const rects = [...span.getClientRects()];
      // Ukuran diambil sebelum rotasi halaman, jadi hitung terhadap offset
      // di dalam halaman, bukan terhadap layar.
      const left = span.offsetLeft;
      const top = span.offsetTop;
      if (kind === 'oval') {
        ovals += 1;
        const first = rects[0];
        const cx = left + first.width / 2;
        const cy = top + first.height / 2;
        const oval = document.createElement('div');
        oval.style.cssText = `position:absolute;left:${cx - rx}px;top:${cy - ry}px;width:${rx * 2}px;height:${ry * 2}px;border:${Math.max(3, photoWidth * 0.005)}px solid ${color};border-radius:50%;box-sizing:border-box;`;
        const badge = document.createElement('div');
        const size = Math.max(20, photoWidth * 0.036);
        badge.textContent = String(ovals);
        badge.style.cssText = `position:absolute;left:${cx + rx - size / 2}px;top:${cy - ry - size / 2}px;width:${size}px;height:${size}px;border-radius:50%;background:${color};color:#fff;font:bold ${size * 0.6}px sans-serif;display:flex;align-items:center;justify-content:center;`;
        layer.append(oval, badge);
      } else {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', String(page.offsetWidth));
        svg.setAttribute('height', String(page.offsetHeight));
        svg.style.cssText = 'position:absolute;left:0;top:0;overflow:visible;';
        // Satu garis per baris, untuk frasa yang terpotong ke baris berikutnya.
        let x = left;
        let y = top;
        rects.forEach((rect, line) => {
          if (line > 0) {
            x = span.offsetLeft - (rects[0].left - rect.left);
            y = top + (rect.top - rects[0].top);
          }
          const baseY = y + rect.height - 1;
          for (const [dy, opacity] of [[0, 0.72], [1.4, 0.35]]) {
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const x0 = x - 3;
            const x1 = x + rect.width + 4;
            path.setAttribute('d', `M ${x0} ${baseY + dy} Q ${(x0 + x1) / 2} ${baseY + dy + 2.2} ${x1} ${baseY + dy - 0.8}`);
            path.setAttribute('stroke', `rgba(70,70,74,${opacity})`);
            path.setAttribute('stroke-width', '1.7');
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke-linecap', 'round');
            svg.append(path);
          }
        });
        layer.append(svg);
      }
    }
    return ovals;
  }, { marks, color: MARKER });
}

// Sisi terpanjang foto dibatasi 1.600 piksel, sama dengan pengecil foto di
// aplikasi, supaya model menerima ukuran yang sama dengan foto pengguna.
async function render(browser, html, marks) {
  const probe = await browser.newPage({ viewport: { width: 900, height: 900 } });
  await probe.setContent(html);
  const size = await probe.locator('#desk').boundingBox();
  await probe.close();
  const scale = Math.min(2, 1600 / Math.max(size.width, size.height));
  const context = await browser.newContext({ viewport: { width: 900, height: 900 }, deviceScaleFactor: scale });
  const page = await context.newPage();
  await page.setContent(html);
  const ovals = marks ? await drawMarks(page, marks) : 0;
  const image = await page.locator('#desk').screenshot({ type: 'jpeg', quality: 85 });
  await context.close();
  return { image, ovals };
}

// KERING=1 hanya merender gambar tanpa memanggil model, untuk memeriksa
// tampilan halaman dan letak tanda sebelum memakai kuota.
const dry = process.env.KERING === '1';

async function lookup(image, fields) {
  if (dry) return { http: 0, ms: 0, ok: false, model: null, fellBack: null, hasil: [], error: 'kering' };
  const form = new FormData();
  form.append('image', new Blob([image], { type: 'image/jpeg' }), 'halaman.jpg');
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  const started = Date.now();
  try {
    const res = await fetch(`${server}/api/lookup`, { method: 'POST', body: form, signal: AbortSignal.timeout(90_000) });
    const json = await res.json();
    return { http: res.status, ms: Date.now() - started, ok: json.ok === true, model: json.model ?? null, fellBack: json.fellBack ?? null, hasil: json.results ?? [], error: json.error ?? null };
  } catch (error) {
    return { http: 0, ms: Date.now() - started, ok: false, model: null, fellBack: null, hasil: [], error: String(error) };
  }
}

// Sama dengan playwright.config.ts: peramban yang terpasang adalah kanal chromium.
const browser = await chromium.launch({ channel: 'chromium' });
const out = { dijalankan: new Date().toISOString(), server, halaman: [], tandai: [] };
const htmlById = new Map();

// ULANG=A-presently,A-countenance hanya menjalankan halaman yang disebut, dan
// menulis ke hasil-ulang.json. Putaran pertama tidak pernah ditimpa, supaya
// kegagalannya tetap tercatat sebagai data keandalan.
const retry = process.env.ULANG ? new Set(process.env.ULANG.split(',')) : null;

for (const [index, page] of cases.halaman.entries()) {
  if (retry && !retry.has(page.id)) {
    htmlById.set(page.id, pageHtml(page, index));
    continue;
  }
  const html = pageHtml(page, index);
  htmlById.set(page.id, html);
  const { image } = await render(browser, html, null);
  if (imageDir) writeFileSync(`${imageDir}/${page.id}.jpg`, image);
  const result = await lookup(image, { words: JSON.stringify(page.sasaran.map((t) => t.kata)) });
  out.halaman.push({ id: page.id, mode: 'ketik', ...result });
  console.log(`${page.id.padEnd(20)} ${result.ok ? 'ok ' : 'GAGAL'} ${String(result.ms).padStart(6)} ms  ${result.model ?? '-'}  ${result.hasil.map((r) => r.word).join(', ') || result.error}`);
}

for (const mark of cases.tandai) {
  if (retry && !retry.has(mark.id)) continue;
  const page = cases.halaman.find((p) => p.id === mark.halaman);
  const marks = mark.tanda.map(([word, kind]) => [page.sasaran.findIndex((t) => t.kata === word), kind]);
  const { image, ovals } = await render(browser, htmlById.get(page.id), marks);
  if (imageDir) writeFileSync(`${imageDir}/${mark.id}.jpg`, image);
  const result = await lookup(image, { mode: 'marked', markers: String(ovals) });
  out.tandai.push({ id: mark.id, halaman: page.id, tanda: mark.tanda, oval: ovals, ...result });
  console.log(`${mark.id.padEnd(20)} ${result.ok ? 'ok ' : 'GAGAL'} ${String(result.ms).padStart(6)} ms  ${result.model ?? '-'}  ${result.hasil.map((r) => r.word).join(', ') || result.error || '(kosong)'}`);
}

await browser.close();
out.selesai = new Date().toISOString();
if (!dry) writeFileSync(new URL(retry ? './hasil-ulang.json' : './hasil.json', import.meta.url), `${JSON.stringify(out, null, 2)}\n`);
console.log(dry ? 'SELESAI (kering): hanya gambar.' : `SELESAI: ${retry ? 'hasil-ulang.json' : 'hasil.json'} ditulis.`);
