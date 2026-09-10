import { MARKED_SYSTEM_PROMPT, markedUserPrompt, SYSTEM_PROMPT, userPrompt, RESPONSE_SCHEMA } from '@/lib/prompt';
import type { LookupResult } from '@/lib/types';
import { clientIp, consume, refund } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Model yang boleh dipakai. Daftar putih ini mencegah nilai sembarangan
// dikirim dari browser ke API Google.
const ALLOWED_MODELS = new Set([
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-3.8-flash',
  'gemini-pro-latest',
]);

// Urutan cadangan kalau model utama penuh atau bermasalah.
const FALLBACK_CHAIN = [
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
];

// Batas kata per foto pada mode tandai. Sama dengan batas mode ketik, supaya
// satu foto tidak pernah lebih mahal dari yang sudah dijanjikan ke pengguna.
const MARKED_MAX = 5;

// Pesan yang dibaca pengguna, bukan JSON mentah dari Google.
function friendly(status: number): string {
  if (status === 503) return 'Model lagi penuh. Otomatis dicoba ke model cadangan.';
  if (status === 429) return 'Kuota harian API kamu habis. Coba lagi besok.';
  if (status === 404) return 'Model ini sudah tidak tersedia.';
  if (status === 403) return 'API key ditolak. Cek lagi isinya di .env.local.';
  if (status === 400) return 'Permintaan ditolak model. Kemungkinan fotonya bermasalah.';
  return `Model sedang bermasalah (${status}).`;
}

function validate(r: unknown): r is LookupResult {
  if (typeof r !== 'object' || r === null) return false;
  const o = r as Record<string, unknown>;
  return (
    typeof o.word === 'string' &&
    typeof o.lemma === 'string' &&
    typeof o.is_phrase === 'boolean' &&
    typeof o.sentence === 'string' &&
    typeof o.ambiguous === 'boolean' &&
    Array.isArray(o.candidates) &&
    o.candidates.length > 0 &&
    Array.isArray(o.other_senses) &&
    typeof o.caution_id === 'string' &&
    typeof o.new_sentence === 'string'
  );
}

function keyProblem(): string | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || !key.trim()) {
    return 'GEMINI_API_KEY belum tersedia di server. Saat lokal, isi di .env.local lalu nyalakan ulang server. Saat online, isi sebagai Environment Variable di hosting lalu deploy ulang, karena variabel baru tidak berlaku pada deploy yang sudah jadi.';
  }
  if (key.startsWith('PASTE_')) {
    return 'GEMINI_API_KEY masih berisi teks contoh, belum diganti kunci sungguhan.';
  }
  if (key !== key.trim()) {
    return 'GEMINI_API_KEY punya spasi di awal atau akhir. Hapus spasinya, lalu deploy ulang.';
  }
  return null;
}

export async function POST(req: Request) {
  const started = Date.now();

  const masalahKunci = keyProblem();
  if (masalahKunci) {
    return Response.json({ ok: false, error: masalahKunci }, { status: 500 });
  }
  const key = process.env.GEMINI_API_KEY as string;

  const ip = clientIp(req);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ ok: false, error: 'Body harus form-data.' }, { status: 400 });
  }

  const image = form.get('image');
  const rawWords = form.get('words');
  // Dua mode. "typed" adalah alur lama: pembaca mengetik katanya. "marked"
  // adalah alur tandai: tidak ada daftar kata, model mencari sendiri coretan
  // pembaca dan penanda magenta yang digambar aplikasi di foto.
  const marked = form.get('mode') === 'marked';
  const markers = Math.max(0, Math.min(MARKED_MAX, Math.floor(Number(form.get('markers')) || 0)));

  if (!(image instanceof File)) {
    return Response.json({ ok: false, error: 'Foto halaman belum ada.' }, { status: 400 });
  }

  let words: string[] = [];
  if (!marked) {
    try {
      words = JSON.parse(String(rawWords ?? '[]'));
    } catch {
      return Response.json({ ok: false, error: 'Daftar kata tidak valid.' }, { status: 400 });
    }

    words = words.map((w) => String(w).trim()).filter(Boolean).slice(0, 5);
    if (words.length === 0) {
      return Response.json({ ok: false, error: 'Belum ada kata yang ditandai.' }, { status: 400 });
    }
  }

  if (image.size > 4 * 1024 * 1024) {
    return Response.json(
      { ok: false, error: 'Foto terlalu besar. Harusnya sudah dikecilkan di browser.' },
      { status: 413 }
    );
  }

  // Batas dihitung per kata dan baru diperiksa setelah jumlah kata diketahui.
  // Permintaan yang ditolak sebelum titik ini tidak memakan jatah siapa pun.
  //
  // Mode tandai belum tahu jumlah katanya sebelum model menjawab, jadi jatah
  // penuh dipesan dulu dan sisanya dikembalikan di bawah. Memesan belakangan
  // berarti memanggil model tanpa tahu apakah pengguna masih punya jatah.
  const cost = marked ? MARKED_MAX : words.length;
  const quota = await consume(ip, cost);
  if (!quota.allowed) {
    return Response.json(
      { ok: false, error: quota.reason, used: quota.used, limit: quota.limit },
      { status: 429 }
    );
  }

  const base64 = Buffer.from(await image.arrayBuffer()).toString('base64');

  const asked = String(form.get('model') ?? '').trim();
  const model =
    asked && ALLOWED_MODELS.has(asked)
      ? asked
      : process.env.GEMINI_MODEL ?? 'gemini-3.8-flash';

  const body = {
    systemInstruction: { parts: [{ text: marked ? MARKED_SYSTEM_PROMPT : SYSTEM_PROMPT }] },
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: image.type || 'image/jpeg', data: base64 } },
          { text: marked ? markedUserPrompt(markers) : userPrompt(words) },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  };

  // Rantai cadangan. Model terbaru paling sering kena 503 karena permintaannya
  // membludak. Daripada pengguna lihat error, pindah ke model berikutnya.
  const chain = [model, ...FALLBACK_CHAIN.filter((m) => m !== model)];

  let lastError = 'Semua model sedang tidak bisa dihubungi.';
  let lastStatus = 0;

  for (const attempt of chain) {
    let res: Response;
    try {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${attempt}:generateContent`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify({ ...body }),
        }
      );
    } catch {
      lastError = 'Gagal menghubungi model.';
      continue;
    }

    if (!res.ok) {
      lastStatus = res.status;
      lastError = friendly(res.status);
      // 400 dan 403 itu salah kita atau soal izin, ganti model tidak menolong.
      if (res.status === 400 || res.status === 403) break;
      continue;
    }

    const data = await res.json();
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      lastError = 'Model tidak mengembalikan teks.';
      continue;
    }

    let parsed: { results?: unknown[] };
    try {
      parsed = JSON.parse(text);
    } catch {
      lastError = 'Balasan model bukan JSON yang valid.';
      continue;
    }

    const raw = Array.isArray(parsed.results) ? parsed.results : [];
    let results = raw
      .filter(validate)
      .map((r) => ({
        ...(r as LookupResult),
        found: (r as LookupResult).found ?? true,
        page_excerpt: (r as LookupResult).page_excerpt ?? '',
      })) as LookupResult[];

    // Pada mode tandai, daftar kosong dari model artinya "tidak ada tanda yang
    // terbaca". Itu jawaban jujur, jadi tidak dilempar ke model cadangan. Yang
    // tetap dianggap gagal hanya daftar berisi tetapi seluruhnya rusak.
    if (results.length === 0 && !(marked && raw.length === 0)) {
      lastError = 'Tidak ada hasil yang lolos validasi.';
      continue;
    }

    let used = quota.used;
    if (marked) {
      // Model diminta paling banyak lima, tetapi batas itu dijaga di sini juga.
      // Kata yang sama ditandai dua kali dihitung sekali.
      const seen = new Set<string>();
      results = results.filter((r) => {
        const key = r.word.trim().toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, MARKED_MAX);
      // Jatah yang dipesan penuh dikembalikan sisanya. Foto tanpa tanda tetap
      // dihitung satu, karena model sudah dipanggil untuk membacanya; tanpa
      // itu foto kosong bisa dikirim berulang kali tanpa batas.
      const unused = cost - Math.max(1, results.length);
      await refund(ip, unused);
      used -= unused;
    }

    // Kata yang gagal terbaca tetap memakai kuota model, jadi tidak dikembalikan.
    // Yang dikembalikan hanya kegagalan total di bawah.
    return Response.json({
      ok: true,
      model: attempt,
      fellBack: attempt !== model,
      results,
      used,
      limit: quota.limit,
      ms: Date.now() - started,
    });
  }

  // Tidak ada hasil yang sampai ke pengguna, jadi jatah hariannya dikembalikan.
  await refund(ip, cost);
  return Response.json({ ok: false, error: lastError, status: lastStatus }, { status: 502 });
}
