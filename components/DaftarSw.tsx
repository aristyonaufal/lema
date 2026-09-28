'use client';

import { useEffect } from 'react';
import { daftarkanSw } from '@/lib/offline';

// Mendaftarkan service worker sekali saat aplikasi dimuat. Tidak menggambar
// apa pun. Dipisah jadi komponen sendiri supaya layout tetap komponen server.
export default function DaftarSw() {
  useEffect(() => { void daftarkanSw(); }, []);
  return null;
}
