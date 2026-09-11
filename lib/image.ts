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

// Penanda yang digambar di foto pada mode tandai.
//
// Warnanya magenta pekat karena hampir tidak pernah muncul di halaman buku:
// tinta cetak hitam, pensil abu abu, pena biasanya biru atau hitam, dan stabilo
// cenderung kuning atau hijau. Prompt menyebut warna ini dengan kata, jadi kalau
// warnanya diganti, kalimat di MARKED_RULES pada lib/prompt.ts ikut diganti.
export const MARKER_COLOR = '#e6007e';

// Posisi relatif terhadap foto, 0 sampai 1, supaya tetap benar di ukuran layar
// mana pun dan di resolusi foto yang dikirim.
export type Marker = { x: number; y: number };

// Oval mendatar yang berongga, bukan lingkaran atau bulatan penuh.
//
// Berongga supaya kata yang ditunjuk tetap terbaca oleh model. Mendatar karena
// kata memang lebih lebar daripada tingginya: versi pertama berupa lingkaran,
// dan di foto buku sungguhan lingkaran selebar satu kata ternyata setinggi dua
// sampai tiga baris, sehingga model harus menebak baris mana yang dimaksud.
//
// Ukurannya persen lebar foto: lebar 10%, tinggi 4,4%. Angka yang sama dipakai
// oval di layar foto, jadi yang terlihat pengguna persis yang dibaca model.
// Nomornya diletakkan tepat di sudut kanan atas kotak oval, juga sama dengan
// di layar, dan urutannya mengikuti urutan ketukan.
export const MARKER_RX = 0.05;
export const MARKER_RY = 0.022;

export async function drawMarkers(file: File, markers: Marker[]): Promise<File> {
  if (markers.length === 0) return file;

  const bitmap = await createImageBitmap(file);
  const w = bitmap.width;
  const h = bitmap.height;

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

  const rx = w * MARKER_RX;
  const ry = w * MARKER_RY;
  const badge = Math.max(10, w * 0.018);

  markers.forEach((marker, index) => {
    const cx = marker.x * w;
    const cy = marker.y * h;

    ctx.lineWidth = Math.max(3, w * 0.005);
    ctx.strokeStyle = MARKER_COLOR;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();

    const bx = cx + rx;
    const by = cy - ry;
    ctx.fillStyle = MARKER_COLOR;
    ctx.beginPath();
    ctx.arc(bx, by, badge, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(badge * 1.3)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(index + 1), bx, by);
  });

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', QUALITY)
  );

  if (!blob) return file;

  return new File([blob], 'halaman-bertanda.jpg', { type: 'image/jpeg' });
}
