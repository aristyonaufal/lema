// Batas pemakaian harian untuk pencarian makna.
//
// Dua hal yang diperbaiki dari versi sebelumnya:
// 1. Yang dihitung adalah jumlah KATA, bukan jumlah permintaan. Satu foto boleh
//    berisi lima kata, dan tiap kata adalah satu hasil bagi pengguna. Menghitung
//    permintaan membuat batas "60 kata" sebenarnya melewatkan 300 kata.
// 2. Ada penghitung bersama opsional. Memori proses hilang setiap kali server
//    dimulai ulang, dan di hosting tanpa server tiap permintaan bisa mendarat di
//    proses berbeda, sehingga batas per proses nyaris tidak berlaku.
//
// Penting: penghitung ini hanya untuk batas pemakaian. Koleksi kata pengguna
// tetap di browser masing masing dan tidak pernah dikirim ke sini.

export type LimitVerdict = {
  allowed: boolean;
  used: number;
  limit: number;
  shared: boolean;   // true bila hitungan berasal dari penghitung bersama
  reason?: string;
};

type Bucket = { day: string; used: number };

const memory = new Map<string, Bucket>();

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function dailyLimit(): number {
  const raw = Number(process.env.DAILY_LOOKUP_LIMIT);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 60;
}

function upstash(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/+$/, ''), token } : null;
}

export function sharedCounterConfigured(): boolean {
  return upstash() !== null;
}

// INCRBY mengembalikan nilai sesudah penambahan, jadi dua permintaan bersamaan
// tidak bisa sama sama lolos tepat di ambang batas. EXPIRE dipasang sekali saja
// lewat NX supaya masa hidup kunci tidak diperpanjang terus menerus.
async function bumpShared(key: string, cost: number): Promise<number | null> {
  const cfg = upstash();
  if (!cfg) return null;
  try {
    const res = await fetch(`${cfg.url}/pipeline`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${cfg.token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify([
        ['INCRBY', key, String(cost)],
        ['EXPIRE', key, '172800', 'NX'],
      ]),
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ result?: unknown }>;
    const used = Number(data?.[0]?.result);
    return Number.isFinite(used) ? used : null;
  } catch {
    // Termasuk waktu habis dan jaringan gagal.
    return null;
  }
}

function bumpMemory(key: string, cost: number): number {
  const day = today();
  const cur = memory.get(key);
  if (!cur || cur.day !== day) {
    memory.set(key, { day, used: cost });
    return cost;
  }
  cur.used += cost;
  return cur.used;
}

function bucketKey(ip: string): string {
  return `lema:lookup:${today()}:${ip}`;
}

// Menambah dulu, baru memutuskan. Urutan ini yang membuat permintaan bersamaan
// tidak bisa menembus batas bersama sama.
export async function consume(ip: string, cost: number): Promise<LimitVerdict> {
  const limit = dailyLimit();
  const key = bucketKey(ip);

  const sharedUsed = await bumpShared(key, cost);
  // Kalau layanan pembatas mati atau belum dikonfigurasi, jangan menolak
  // pengguna. Turun ke hitungan per proses dan tandai bahwa hitungannya
  // tidak dibagi antar proses.
  const used = sharedUsed ?? bumpMemory(key, cost);

  if (used > limit) {
    return {
      allowed: false,
      used,
      limit,
      shared: sharedUsed !== null,
      reason: `Batas ${limit} kata per hari sudah tercapai. Coba lagi besok.`,
    };
  }
  return { allowed: true, used, limit, shared: sharedUsed !== null };
}

// Dikembalikan bila tidak ada satu pun hasil yang sampai ke pengguna.
// Tanpa ini, kegagalan model tetap memakan jatah harian orang.
export async function refund(ip: string, cost: number): Promise<void> {
  if (cost <= 0) return;
  const key = bucketKey(ip);
  const shared = await bumpShared(key, -cost);
  if (shared === null) {
    const cur = memory.get(key);
    if (cur && cur.day === today()) cur.used = Math.max(0, cur.used - cost);
  }
}

// Alamat pengunjung di belakang proxy hosting. Nilai pertama pada
// x-forwarded-for adalah klien; sisanya ditambahkan oleh proxy.
export function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (forwarded) return forwarded;
  return req.headers.get('x-real-ip')?.trim() || 'local';
}
