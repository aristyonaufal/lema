'use client';

import Nav from '@/components/Nav';
import { useDb } from '@/lib/useDb';

// Kerangka halaman. Tugasnya cuma satu: memutuskan apakah navigasi utama sudah
// pantas muncul, lalu memberi isi halaman ruang yang sesuai.
//
// Ruangnya berbeda di dua arah. Di HP navigasi menempel di bawah, jadi yang
// dibutuhkan adalah penahan setinggi bilah itu supaya isi terakhir tidak
// tertutup. Di laptop navigasi menempel di kiri, jadi yang dibutuhkan adalah
// jarak kiri selebar sidebar. Keduanya ikut hilang ketika navigasinya sendiri
// belum muncul, supaya layar pertama pengguna baru tidak punya lubang kosong.
export default function Shell({ children }: { children: React.ReactNode }) {
  const { db, ready } = useDb();
  const show = ready && db.books.length > 0;

  return (
    <div className={`flex flex-1 flex-col ${show ? 'lg:pl-64' : ''}`}>
      {children}
      {show && (
        <>
          <div
            aria-hidden="true"
            className="w-full shrink-0 lg:hidden"
            style={{ height: 'calc(var(--tab-h) + env(safe-area-inset-bottom, 0px))' }}
          />
          <Nav />
        </>
      )}
    </div>
  );
}
