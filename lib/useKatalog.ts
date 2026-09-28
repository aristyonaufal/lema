'use client';

import { useEffect, useState } from 'react';
import { muatKatalog, type KatalogBuku } from './pustaka';

// Katalog pustaka untuk layar di luar pustaka itu sendiri.
//
// Dipakai beranda dan rak buku untuk menjawab satu pertanyaan saja: buku ini
// punya berapa bab. Berkasnya kecil dan sudah di-cache di lib/pustaka, jadi
// memanggil hook ini dari beberapa layar tidak menambah permintaan jaringan.
//
// Kegagalan sengaja tidak dilaporkan ke pengguna. Katalog cuma memperkaya
// tampilan rak; kalau tidak datang, kartunya tetap bisa dibuka, hanya tanpa
// keterangan babnya.
export function useKatalog(): Map<string, KatalogBuku> {
  const [katalog, setKatalog] = useState<Map<string, KatalogBuku>>(new Map());

  useEffect(() => {
    let batal = false;
    muatKatalog()
      .then((k) => { if (!batal) setKatalog(new Map(k.buku.map((b) => [b.slug, b]))); })
      .catch(() => {});
    return () => { batal = true; };
  }, []);

  return katalog;
}
