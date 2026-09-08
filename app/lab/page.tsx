import { notFound } from 'next/navigation';
import Lab from './lab-client';

// Halaman uji internal. Hidup hanya saat npm run dev.
//
// Sengaja dijaga, bukan dihapus, karena tombol pembanding model masih dipakai
// untuk uji akurasi. Di versi online halaman ini tertutup, sebab sekali klik
// pembanding memanggil model tiga kali dan siapa pun bisa menemukannya.
//
// Pemeriksaan dilakukan di sisi server pada jalur render, jadi halaman ini
// tidak ikut terkirim ke browser pengunjung versi online.
export default function LabPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <Lab />;
}
