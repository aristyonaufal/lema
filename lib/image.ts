// Mengecilkan foto di sisi browser sebelum dikirim ke server.
// Foto mentah kamera HP bisa 3 sampai 5 MB. Tanpa langkah ini,
// unggahannya lambat dan biaya per panggilan jadi jauh lebih mahal.

const MAX_SIDE = 1600;
const QUALITY = 0.85;

export async function shrink(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);

  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return file;
  }

  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', QUALITY)
  );

  if (!blob) return file;

  return new File([blob], 'halaman.jpg', { type: 'image/jpeg' });
}
