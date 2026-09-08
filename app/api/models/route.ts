// Route debug. Dipakai sekali untuk melihat model apa saja yang bisa dipakai
// API key kamu, supaya nama model di .env.local tidak asal tebak.
// Buka http://localhost:3000/api/models

export const runtime = 'nodejs';

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

export async function GET() {
  // Alat bantu internal. Di versi online endpoint ini ditutup, karena
  // membeberkan daftar model yang tersedia bagi akun pemilik aplikasi.
  if (process.env.NODE_ENV === 'production') {
    return new Response('Not Found', { status: 404 });
  }

  const masalahKunci = keyProblem();
  if (masalahKunci) {
    return Response.json({ ok: false, error: masalahKunci }, { status: 500 });
  }
  const key = process.env.GEMINI_API_KEY as string;

  const res = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models?pageSize=200',
    { headers: { 'x-goog-api-key': key } }
  );

  if (!res.ok) {
    return Response.json(
      { ok: false, status: res.status, error: await res.text() },
      { status: 500 }
    );
  }

  const data = await res.json();
  const usable = (data.models ?? [])
    .filter((m: { supportedGenerationMethods?: string[] }) =>
      m.supportedGenerationMethods?.includes('generateContent')
    )
    .map((m: { name: string; displayName?: string; inputTokenLimit?: number }) => ({
      name: m.name.replace('models/', ''),
      displayName: m.displayName,
      inputTokenLimit: m.inputTokenLimit,
    }));

  return Response.json({ ok: true, count: usable.length, models: usable });
}
