// Menjalankan uji 1.000 kata Lema terhadap /api/lookup yang sungguhan.
//
// Sama seperti scripts/uji-akurasi/jalankan.mjs: setiap halaman di kasus.json
// dirender sebagai foto halaman buku, kata sasarannya ditandai (oval magenta
// dengan geometri aplikasi, atau garis pensil), lalu dikirim ke endpoint yang
// sama dengan aplikasi dalam mode tandai. Yang diuji adalah prompt, rantai
// model, dan validasi yang hidup.
//
// Bedanya: 200 halaman, tiga permintaan berjalan bersamaan, setiap halaman
// dicoba sampai tiga kali, dan separuh halaman dibuat seperti foto HP
// (miring, perspektif, buram, bayangan, noise, JPEG lebih kasar).
//
// Pemakaian, dengan server Lema berjalan:
//   node scripts/uji-1000/jalankan.mjs http://127.0.0.1:3300 [folder gambar]
// KERING=1 hanya merender gambar, tanpa memanggil model.
// Hasil ditulis ke hasil.json setelah setiap halaman selesai; menjalankan
// ulang melanjutkan halaman yang belum berhasil.

import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from 'node:fs';
import { chromium } from '@playwright/test';

const server = process.argv[2] ?? 'http://127.0.0.1:3300';
const imageDir = process.argv[3];
if (imageDir) mkdirSync(imageDir, { recursive: true });
const dry = process.env.KERING === '1';
const only = process.env.HANYA ? new Set(process.env.HANYA.split(',')) : null;
const CONCURRENCY = Number(process.env.PARALEL ?? 3);
const ATTEMPTS = 3;
const MARKER = '#e6007e';

const cases = JSON.parse(readFileSync(new URL('./kasus.json', import.meta.url), 'utf8'));
const resultFile = new URL('./hasil.json', import.meta.url);
const out = existsSync(resultFile) && !dry
  ? JSON.parse(readFileSync(resultFile, 'utf8'))
  : { dimulai: new Date().toISOString(), server, halaman: {} };

const escapeHtml = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function pageHtml(page, index) {
  let html = '';
  let cursor = 0;
  page.sasaran.forEach((t, i) => {
    html += escapeHtml(page.teks.slice(cursor, t.offset));
    html += `<span class="t" data-i="${i}">${escapeHtml(t.kata)}</span>`;
    cursor = t.offset + t.kata.length;
  });
  html += escapeHtml(page.teks.slice(cursor));
  const paragraphs = html.split(/(?<=[.!?]”?)\s+(?=“)/).map((p) => `<p>${p}</p>`).join('');
  const f = page.foto;
  const transform = f ? `perspective(1400px) rotateX(${f.miring_x}deg) rotate(${f.rotasi}deg)` : 'rotate(-0.7deg)';
  const textFilter = f ? `filter: blur(${f.buram}px) contrast(.93) brightness(.96);` : '';
  const shadow = f ? `linear-gradient(${f.bayangan === 'kiri' ? '90deg' : '270deg'}, rgba(0,0,0,.26), rgba(0,0,0,0) 55%)` : 'none';
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html, body { margin: 0; background: #6f6a62; }
    #desk { padding: 34px; display: inline-block; }
    #page { position: relative; width: 600px; padding: 52px 58px 44px; background: #fbf6ea;
      box-shadow: 0 10px 30px rgba(0,0,0,.35), inset -28px 0 40px -30px rgba(0,0,0,.18);
      transform: ${transform}; font-family: Georgia, 'Times New Roman', serif; font-size: 17px;
      line-height: 1.58; color: #1c1b19; text-align: justify; hyphens: auto; }
    #page p { margin: 0; text-indent: 1.6em; ${textFilter} }
    #page p:first-of-type { text-indent: 0; }
    .folio { text-align: center; font-size: 12px; color: #7c776d; margin-top: 18px; ${textFilter} }
    #fx { position: absolute; inset: 0; pointer-events: none; background: ${shadow}; }
    #noise { position: absolute; inset: 0; pointer-events: none; opacity: ${f ? f.noise : 0}; }
    #marks { position: absolute; inset: 0; pointer-events: none; }
  </style></head><body><div id="desk"><div id="page">
    ${paragraphs}<div class="folio">${40 + index * 3}</div>
    <div id="fx"></div><canvas id="noise"></canvas><div id="marks"></div>
  </div></div></body></html>`;
}

// Oval dan garis pensil: kode yang sama dengan uji sebelumnya (geometri
// drawMarkers di aplikasi: lebar 10% dan tinggi 4,4% lebar foto).
async function drawMarks(browserPage, kind, count) {
  return browserPage.evaluate(({ kind, count, color }) => {
    const page = document.getElementById('page');
    const noise = document.getElementById('noise');
    noise.width = page.offsetWidth; noise.height = page.offsetHeight;
    const ctx = noise.getContext('2d');
    const img = ctx.createImageData(noise.width, noise.height);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    const layer = document.getElementById('marks');
    const photoWidth = document.getElementById('desk').getBoundingClientRect().width;
    const rx = photoWidth * 0.05;
    const ry = photoWidth * 0.022;
    // Letak kata dalam koordinat halaman. Filter blur pada paragraf membuat
    // paragraf itu menjadi offsetParent kata, jadi offset dijumlahkan sampai
    // ke #page. Ukuran memakai offsetWidth/Height (sebelum rotasi), bukan
    // kotak di layar yang ikut miring.
    const offsetIn = (el) => {
      let x = 0; let y = 0; let n = el;
      while (n && n !== page) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
      return { x, y };
    };
    let ovals = 0;
    for (let index = 0; index < count; index += 1) {
      const span = document.querySelector(`.t[data-i="${index}"]`);
      const { x: left, y: top } = offsetIn(span);
      const w = span.offsetWidth;
      const h = span.offsetHeight;
      if (kind === 'oval') {
        ovals += 1;
        const cx = left + w / 2;
        const cy = top + h / 2;
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
        const baseY = top + h - 1;
        for (const [dy, opacity] of [[0, 0.72], [1.4, 0.35]]) {
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          const x0 = left - 3;
          const x1 = left + w + 4;
          path.setAttribute('d', `M ${x0} ${baseY + dy} Q ${(x0 + x1) / 2} ${baseY + dy + 2.2} ${x1} ${baseY + dy - 0.8}`);
          path.setAttribute('stroke', `rgba(70,70,74,${opacity})`);
          path.setAttribute('stroke-width', '1.7');
          path.setAttribute('fill', 'none');
          path.setAttribute('stroke-linecap', 'round');
          svg.append(path);
        }
        layer.append(svg);
      }
    }
    return ovals;
  }, { kind, count, color: MARKER });
}

// Sisi terpanjang foto dibatasi 1.600 piksel, sama dengan pengecil di aplikasi.
async function render(browser, page, index) {
  const html = pageHtml(page, index);
  const probe = await browser.newPage({ viewport: { width: 900, height: 900 } });
  await probe.setContent(html);
  const size = await probe.locator('#desk').boundingBox();
  await probe.close();
  const scale = Math.min(2, 1600 / Math.max(size.width, size.height));
  const context = await browser.newContext({ viewport: { width: 900, height: 900 }, deviceScaleFactor: scale });
  const tab = await context.newPage();
  await tab.setContent(html);
  const ovals = await drawMarks(tab, page.tanda, page.sasaran.length);
  const image = await tab.locator('#desk').screenshot({ type: 'jpeg', quality: page.foto ? page.foto.jpeg : 85 });
  await context.close();
  return { image, ovals };
}

async function lookup(image, ovals) {
  const form = new FormData();
  form.append('image', new Blob([image], { type: 'image/jpeg' }), 'halaman.jpg');
  form.append('mode', 'marked');
  form.append('markers', String(ovals));
  const started = Date.now();
  try {
    const res = await fetch(`${server}/api/lookup`, { method: 'POST', body: form, signal: AbortSignal.timeout(90_000) });
    const json = await res.json();
    return { http: res.status, ms: Date.now() - started, ok: json.ok === true, model: json.model ?? null, fellBack: json.fellBack ?? null, hasil: json.results ?? [], error: json.error ?? null };
  } catch (error) {
    return { http: 0, ms: Date.now() - started, ok: false, model: null, fellBack: null, hasil: [], error: String(error) };
  }
}

function save() {
  const tmp = new URL('./hasil.json.tmp', import.meta.url);
  writeFileSync(tmp, `${JSON.stringify(out, null, 1)}\n`);
  renameSync(tmp, resultFile);
}

const browser = await chromium.launch({ channel: 'chromium' });
const queue = cases.halaman
  .map((page, index) => ({ page, index }))
  .filter(({ page }) => (!only || only.has(page.id)) && (dry || !out.halaman[page.id]?.ok));
let done = 0;
const total = queue.length;

async function worker() {
  while (queue.length) {
    const { page, index } = queue.shift();
    const { image, ovals } = await render(browser, page, index);
    if (imageDir) writeFileSync(`${imageDir}/${page.id}-${page.tanda}-${page.kondisi}.jpg`, image);
    if (dry) { done += 1; continue; }
    const previous = out.halaman[page.id]?.percobaan ?? [];
    const attempts = [...previous];
    let final = null;
    for (let a = 0; a < ATTEMPTS; a += 1) {
      const r = await lookup(image, ovals);
      attempts.push({ http: r.http, ms: r.ms, ok: r.ok, model: r.model, fellBack: r.fellBack, error: r.error, waktu: new Date().toISOString() });
      if (r.ok) { final = r; break; }
      if (r.http === 429) break;   // kuota harian habis: berhenti mencoba halaman ini
      await new Promise((resolve) => setTimeout(resolve, 4000 * (a + 1)));
    }
    out.halaman[page.id] = {
      tanda: page.tanda, kondisi: page.kondisi, oval: ovals, ok: Boolean(final),
      model: final?.model ?? null, hasil: final?.hasil ?? [], percobaan: attempts,
    };
    done += 1;
    save();
    const words = final ? final.hasil.map((r) => r.word).join(', ') : attempts.at(-1).error;
    console.log(`[${String(done).padStart(3)}/${total}] ${page.id} ${page.tanda.padEnd(6)} ${page.kondisi.padEnd(6)} ${final ? 'ok   ' : 'GAGAL'} ${attempts.length - previous.length}x ${final?.model ?? '-'}  ${words}`);
  }
}

await Promise.all(Array.from({ length: dry ? 4 : CONCURRENCY }, worker));
await browser.close();
if (!dry) { out.selesai = new Date().toISOString(); save(); }
const okCount = Object.values(out.halaman).filter((h) => h.ok).length;
console.log(dry ? `SELESAI (kering): ${done} gambar.` : `SELESAI: ${okCount} dari ${cases.halaman.length} halaman berhasil. hasil.json ditulis.`);
