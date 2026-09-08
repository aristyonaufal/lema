// Route debug. Dipakai sekali untuk melihat model apa saja yang bisa dipakai
// API key kamu, supaya nama model di .env.local tidak asal tebak.
// Buka http://localhost:3000/api/models

export const runtime = 'nodejs';

export async function GET() {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key.startsWith('PASTE_')) {
    return Response.json(
      { ok: false, error: 'GEMINI_API_KEY belum diisi di .env.local' },
      { status: 500 }
    );
  }

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
