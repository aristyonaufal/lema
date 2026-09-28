'use client';

import Link from 'next/link';
import { use, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import PanelMakna from '@/components/PanelMakna';
import { useDb } from '@/lib/useDb';
import {
  bacaanFor,
  bookForPustaka,
  clearCorrection,
  correctMeaning,
  simpanBacaan,
} from '@/lib/store';
import { frasaTerpilih, kataDiTitik, type Pilihan } from '@/lib/pilih-kata';
import {
  bacaUkuran,
  KELAS_UKURAN,
  muatBab,
  muatBuku,
  simpanUkuran,
  UKURAN,
  type Bab,
  type Buku,
  type Ukuran,
} from '@/lib/pustaka';

// Pembaca buku pustaka.
//
// Posisi baca dicatat sebagai nomor bab dan nomor paragraf, bukan posisi piksel.
// Itu keputusan yang menentukan seluruh berkas ini: paragraf ke-47 tetap
// paragraf ke-47 setelah ukuran huruf diubah atau HP diputar, sedangkan posisi
// gulir tidak. Semua penyimpanan dan pemulihan di bawah bekerja pada nomor.

const JEDA_SIMPAN = 800;

export default function BacaBuku({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { db, update, ready, lookupText } = useDb();

  const [buku, setBuku] = useState<Buku | null>(null);
  const [bab, setBab] = useState(1);
  // Bab yang sudah termuat dibawa bersama nomornya. Tanpa itu, isi bab lama
  // sempat tergambar saat pembaca meloncat cepat ke bab berikutnya.
  const [isi, setIsi] = useState<{ bab: number; data: Bab } | null>(null);
  // Pola yang sama dengan pilihan cara menandai di layar Baca: dibaca sekali
  // saat state dibuat, bukan lewat efek yang memicu render kedua.
  const [ukuran, setUkuran] = useState<Ukuran>(bacaUkuran);
  const [galat, setGalat] = useState<string | null>(null);

  // Paragraf yang sedang berada paling atas di layar. Disimpan di ref, bukan di
  // state, karena berubah pada tiap gulir dan tidak boleh memicu render ulang.
  const teratas = useRef(0);
  // Wadah paragraf disimpan sebagai state, bukan ref, dan itu bukan selera.
  // Manifes buku dan isi bab diambil bersamaan, dan urutan tibanya tidak tetap:
  // buku.json Moby-Dick memuat 136 bab sehingga sering kalah cepat dari isi bab
  // pertamanya. Kalau isi bab tiba duluan, komponen masih menggambar kerangka,
  // <article> belum ada, dan efek yang memasang pengamat paragraf berjalan
  // terhadap ref kosong lalu tidak pernah terpicu lagi. Sebagai state, elemennya
  // ikut menjadi kebergantungan efek, jadi efeknya berjalan tepat saat wadahnya
  // benar benar muncul.
  const [artikel, setArtikel] = useState<HTMLElement | null>(null);
  // Entri yang sedang dibuka panelnya, dan frasa yang sedang disapu.
  const [panelId, setPanelId] = useState<string | null>(null);
  const [frasa, setFrasa] = useState<{ pilihan: Pilihan; x: number; y: number } | null>(null);
  // Titik dan waktu sentuhan dimulai, untuk membedakan ketukan dari gulir.
  const mulaiSentuh = useRef<{ x: number; y: number; pada: number } | null>(null);
  const paragrafKe = (index: number) =>
    artikel?.querySelector<HTMLElement>(`[data-paragraf="${index}"]`) ?? null;

  // Paragraf teratas yang terlihat, dihitung dari DOM saat itu juga. Dipakai
  // ketika jawabannya harus benar SEKARANG dan tidak boleh menunggu pengamat
  // paragraf melapor, misalnya tepat sebelum ukuran huruf diubah.
  function paragrafTeratas(): number {
    for (const el of artikel?.querySelectorAll<HTMLElement>('[data-paragraf]') ?? []) {
      if (el.getBoundingClientRect().bottom > 0) return Number(el.dataset.paragraf);
    }
    return teratas.current;
  }
  // Paragraf yang harus dituju setelah bab termuat. Null berarti mulai dari atas.
  const tujuan = useRef<number | null>(null);
  const sudahMasukRak = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Memuat buku, lalu melanjutkan dari posisi terakhir. Menunggu `ready` supaya
  // posisinya dibaca dari penyimpanan yang sudah terbuka, bukan dari snapshot
  // kosong yang dipakai saat render server.
  useEffect(() => {
    if (!ready) return;
    let batal = false;
    muatBuku(slug)
      .then((data) => {
        if (batal) return;
        setBuku(data);
        const lanjut = bacaanFor(db, slug);
        if (lanjut && lanjut.bab >= 1 && lanjut.bab <= data.bab.length) {
          tujuan.current = lanjut.paragraf;
          setBab(lanjut.bab);
        }
      })
      .catch(() => { if (!batal) setGalat('Buku ini belum bisa dimuat. Coba muat ulang halaman.'); });
    return () => { batal = true; };
    // Sengaja hanya bergantung pada slug dan kesiapan penyimpanan. `db` berubah
    // tiap kali posisi baca disimpan, dan ikut melacaknya akan memuat ulang buku
    // lalu melompat mundur ke posisi yang baru saja ditulis.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, ready]);

  // Rak buku diisi begitu pembaca benar benar membuka bukunya, bukan saat cuma
  // melihat lihat katalog. Satu kali saja per kunjungan.
  useEffect(() => {
    if (!buku || sudahMasukRak.current) return;
    sudahMasukRak.current = true;
    update((current) => bookForPustaka(current, slug, buku.judul).db);
  }, [buku, slug, update]);

  useEffect(() => {
    let batal = false;
    muatBab(slug, bab)
      .then((data) => { if (!batal) setIsi({ bab, data }); })
      .catch(() => { if (!batal) setGalat(`Bab ${bab} belum bisa dimuat.`); });
    return () => { batal = true; };
  }, [slug, bab]);

  // Isi yang boleh digambar cuma milik bab yang sedang dibuka.
  const konten = isi && isi.bab === bab ? isi.data : null;

  // Lompat ke paragraf tujuan sesudah babnya tergambar. useLayoutEffect supaya
  // lompatannya terjadi sebelum layar dicat, jadi pembaca tidak melihat kedipan
  // dari atas bab ke tengah bab.
  useLayoutEffect(() => {
    if (!konten || !artikel) return;
    const index = tujuan.current;
    tujuan.current = null;
    if (index === null || index <= 0) {
      window.scrollTo(0, 0);
      teratas.current = 0;
      return;
    }
    teratas.current = index;
    paragrafKe(index)?.scrollIntoView({ block: 'start' });
  }, [konten, artikel]);

  const catat = useCallback((paragraf: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      update((current) => simpanBacaan(current, slug, bab, paragraf));
    }, JEDA_SIMPAN);
  }, [slug, bab, update]);

  // Mencari paragraf teratas yang masih terlihat. Pengamat dipakai supaya tidak
  // ada pendengar gulir yang berjalan pada tiap piksel.
  useEffect(() => {
    if (!konten || !artikel) return;
    const terlihat = new Set<number>();
    const pengamat = new IntersectionObserver((masuk) => {
      for (const entry of masuk) {
        const index = Number(entry.target.getAttribute('data-paragraf'));
        if (entry.isIntersecting) terlihat.add(index);
        else terlihat.delete(index);
      }
      if (terlihat.size === 0) return;
      const atas = Math.min(...terlihat);
      if (atas === teratas.current) return;
      teratas.current = atas;
      catat(atas);
    });
    for (const el of artikel.querySelectorAll('[data-paragraf]')) pengamat.observe(el);
    return () => pengamat.disconnect();
  }, [konten, artikel, catat]);

  // Mengubah ukuran huruf menggeser semua teks. Paragraf yang sedang dibaca
  // ditarik kembali ke atas layar supaya pembaca tidak kehilangan tempatnya.
  useLayoutEffect(() => {
    if (!konten || !artikel) return;
    paragrafKe(teratas.current)?.scrollIntoView({ block: 'start' });
    // Hanya saat ukuran berubah. Menyertakan konten akan menabrak pemulihan posisi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ukuran]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  // Buku pustaka ini di rak. Diturunkan dari penyimpanan, bukan disimpan
  // sebagai state tersendiri, supaya tidak ada dua sumber kebenaran.
  const bookId = db.books.find((b) => b.pustaka === slug)?.id ?? null;
  const entriPanel = panelId ? db.entries.find((e) => e.id === panelId) ?? null : null;

  function cari(pilihan: Pilihan) {
    if (!bookId) return;
    const id = lookupText(bookId, pilihan.kata, pilihan.konteks);
    if (id) setPanelId(id);
    setFrasa(null);
    window.getSelection()?.removeAllRanges();
  }

  // Ketukan pada satu kata langsung membuka maknanya. Gerakan yang jauh atau
  // lama bukan ketukan melainkan gulir atau awal sapuan, jadi diabaikan.
  function selesaiSentuh(event: React.PointerEvent<HTMLElement>) {
    const awal = mulaiSentuh.current;
    mulaiSentuh.current = null;

    const disapu = frasaTerpilih();
    if (disapu) {
      // Sapuan tidak langsung dicari. Di HP, sapuan masih bisa digeser pegangannya
      // setelah jari diangkat, dan mencari terlalu dini berarti mencari frasa
      // yang belum selesai dipilih.
      setFrasa({ pilihan: disapu, x: event.clientX, y: event.clientY });
      return;
    }
    setFrasa(null);

    if (!awal) return;
    const jauh = Math.hypot(event.clientX - awal.x, event.clientY - awal.y);
    if (jauh > 10 || Date.now() - awal.pada > 600) return;

    const pilihan = kataDiTitik(event.clientX, event.clientY);
    if (pilihan) cari(pilihan);
  }

  function pindahBab(ke: number) {
    if (!buku || ke < 1 || ke > buku.bab.length) return;
    tujuan.current = 0;
    setBab(ke);
  }

  function gantiUkuran(pilih: Ukuran) {
    // Tempat pembaca dikunci sebelum tekstnya berubah tinggi. Tanpa ini,
    // penarikan kembali memakai catatan pengamat yang bisa saja belum sempat
    // melapor sejak gulir terakhir, dan pembaca terlempar ke awal bab.
    teratas.current = paragrafTeratas();
    setUkuran(pilih);
    simpanUkuran(pilih);
  }

  if (galat) {
    return (
      <main className="page page-narrow flex flex-1 flex-col items-start gap-4 pt-8">
        <p role="alert" className="border-danger/40 bg-danger-soft/50 text-danger rounded-xl border p-3.5 text-sm leading-relaxed">
          {galat}
        </p>
        <Link href="/pustaka" className="btn btn-ghost">Balik ke pustaka</Link>
      </main>
    );
  }

  if (!buku) {
    return (
      <main className="page page-narrow flex-1 pt-8">
        <div className="shimmer h-8 w-64 rounded-lg" />
        <div className="shimmer mt-6 h-64 w-full rounded-[1.25rem]" />
      </main>
    );
  }

  const total = buku.bab.length;
  const sebelum = buku.bab.slice(0, bab - 1).reduce((n, b) => n + b.kata, 0);
  const persen = Math.round(((sebelum + (buku.bab[bab - 1]?.kata ?? 0) / 2) / buku.kata) * 100);

  return (
    <main className="page page-narrow flex flex-1 flex-col gap-5 pt-5">
      {/* Baris ini menempel di atas selama menggulir, dan sengaja menjadi anak
          langsung <main>. Elemen sticky terkurung di dalam kotak induknya: kalau
          ia tetap di dalam <header> yang cuma setinggi seratusan piksel, ia
          berhenti menempel begitu header itu tergulir lewat. Akibatnya pembaca
          harus naik ke puncak halaman cuma untuk mengubah ukuran huruf, dan
          perjalanan naik itu sendiri sudah menghilangkan tempatnya. */}
      <div className="bg-background sticky top-0 z-20 -mx-5 flex items-center justify-between gap-3 px-5 py-2 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <Link href="/pustaka" className="text-muted hover:text-foreground shrink-0 text-sm">
          ‹ Pustaka
        </Link>
        <div className="flex items-center gap-1" role="group" aria-label="Ukuran huruf">
          {UKURAN.map((u) => (
            <button
              key={u}
              onClick={() => gantiUkuran(u)}
              aria-pressed={u === ukuran}
              aria-label={`Huruf ${u}`}
              className={`chip px-2.5 ${u === ukuran ? 'chip-on' : ''}`}
            >
              <span aria-hidden="true" className={u === 'kecil' ? 'text-xs' : u === 'sedang' ? 'text-sm' : 'text-base'}>A</span>
            </button>
          ))}
        </div>
      </div>

      <header className="flex flex-col gap-3">
        <div>
          <p lang="en" className="text-muted truncate text-sm">{buku.judul}</p>
          <h1 lang="en" className="font-display mt-0.5 text-[1.75rem] leading-tight tracking-tight">
            {buku.bab[bab - 1]?.judul ?? `Bab ${bab}`}
          </h1>
        </div>

        {/* Ketuk kata itu gerakan yang tidak kelihatan kalau tidak disebut.
            Barisnya tetap ada supaya pembaca baru menemukannya di bab mana pun
            ia mulai, bukan cuma di bab pertama. */}
        <p className="text-muted text-sm leading-relaxed">
          Ketuk kata yang bikin kamu berhenti buat lihat maknanya. Sapu beberapa kata kalau yang
          bikin bingung satu frasa.
        </p>

        <div className="flex flex-col gap-1.5">
          <div aria-hidden="true" className="bg-sunken h-1 w-full overflow-hidden rounded-full">
            <div className="bg-accent h-full rounded-full transition-[width] duration-500" style={{ width: `${persen}%` }} />
          </div>
          <label className="flex items-center gap-2 text-xs">
            <span className="text-faint shrink-0 tabular-nums">Bab {bab} dari {total}</span>
            <span className="sr-only">Pilih bab</span>
            <select
              value={bab}
              onChange={(event) => pindahBab(Number(event.target.value))}
              className="border-line bg-surface text-muted ml-auto min-w-0 max-w-[60%] truncate rounded-lg border px-2 py-1 text-xs outline-none"
            >
              {buku.bab.map((b, i) => (
                <option key={i} value={i + 1}>{b.judul}</option>
              ))}
            </select>
          </label>
        </div>
      </header>

      {!konten ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2, 3].map((i) => <div key={i} className="shimmer h-20 w-full rounded-xl" />)}
        </div>
      ) : (
        <article
          ref={setArtikel}
          lang="en"
          onPointerDown={(e) => { mulaiSentuh.current = { x: e.clientX, y: e.clientY, pada: Date.now() }; }}
          onPointerUp={selesaiSentuh}
          className={`flex flex-col gap-4 ${KELAS_UKURAN[ukuran]}`}
          style={{ textWrap: 'pretty' }}
        >
          {konten.paragraf.map((teks, index) => (
            <p
              key={index}
              data-paragraf={index}
              // Pindah baris di dalam paragraf dipertahankan untuk puisi.
              // scroll-mt menjaga paragraf yang dituju tidak tersembunyi di
              // balik baris kepala yang menempel.
              className="scroll-mt-16 whitespace-pre-line"
            >
              {teks}
            </p>
          ))}
        </article>
      )}

      <nav aria-label="Pindah bab" className="border-line flex items-center justify-between gap-3 border-t pt-4">
        <button onClick={() => pindahBab(bab - 1)} disabled={bab <= 1} className="btn btn-ghost text-sm">
          ‹ Bab sebelumnya
        </button>
        <button onClick={() => pindahBab(bab + 1)} disabled={bab >= total} className="btn btn-primary text-sm">
          Bab berikutnya ›
        </button>
      </nav>

      {frasa && (
        <button
          onClick={() => cari(frasa.pilihan)}
          style={{ left: frasa.x, top: frasa.y }}
          className="btn btn-primary fixed z-50 -translate-x-1/2 -translate-y-[calc(100%+0.75rem)] text-sm shadow-[var(--shadow-sm)]"
        >
          Cari makna “{frasa.pilihan.kata}”
        </button>
      )}

      {entriPanel && (
        <PanelMakna
          entry={entriPanel}
          onClose={() => setPanelId(null)}
          onCorrect={(fix) => update((current) => correctMeaning(current, entriPanel.id, fix))}
          onUncorrect={() => update((current) => clearCorrection(current, entriPanel.id))}
        />
      )}

      <p className="text-faint text-xs leading-relaxed">
        <a href={buku.sumber} target="_blank" rel="noreferrer" className="underline">Standard Ebooks</a>
        {' · '}domain publik{' · '}posisi bacamu tersimpan otomatis di HP ini
      </p>
    </main>
  );
}
