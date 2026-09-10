'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MARKER_COLOR, shrink, type Marker } from '@/lib/image';
import { useDb } from '@/lib/useDb';
import BookSpine from '@/components/BookSpine';
import BookPicker from '@/components/BookPicker';
import { StatusChip, SectionHeader, type EntryTone } from '@/components/ui';
import { byBook, type Entry } from '@/lib/store';

const MAX_WORDS = 5;
// Panjang wajar untuk satu kata atau frasa. Di atas ini yang diketik hampir
// pasti kalimat, dan kalimat bukan sesuatu yang bisa dijawab oleh prompt ini.
const MAX_LEN = 60;

// Dua cara menandai kata. "mark" tidak butuh mengetik: pembaca mengetuk kata
// di foto, atau cukup menggaris bawahi dengan pensil di bukunya. "type" adalah
// alur lama, dan sengaja dipertahankan utuh sebagai jalan cadangan ketika
// fotonya buram atau tandanya tidak terbaca.
//
// Kalau mode tandai ternyata tidak cukup andal, cukup ganti nilai bawaan ini
// menjadi 'type'. Seluruh alur lama tetap ada dan tetap teruji.
type Mode = 'mark' | 'type';
const DEFAULT_MODE: Mode = 'mark';
const MODE_KEY = 'lema.mode';

function readStoredMode(): Mode {
  if (typeof window === 'undefined') return DEFAULT_MODE;
  try {
    const stored = window.localStorage.getItem(MODE_KEY);
    return stored === 'mark' || stored === 'type' ? stored : DEFAULT_MODE;
  } catch {
    return DEFAULT_MODE;
  }
}

function toneOf(entry: Entry): EntryTone {
  if (entry.status === 'pending') return 'pending';
  if (entry.status === 'error') return 'error';
  return entry.known ? 'known' : 'done';
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

// Foto yang bisa diketuk untuk menaruh penanda.
//
// Pembungkusnya mengikuti ukuran gambar persis, tanpa sisa bidang di kiri kanan
// atau atas bawah. Kalau gambarnya dilebarkan dengan object-contain, titik yang
// diketuk tidak lagi sama dengan titik di foto, dan penanda akan jatuh di kata
// yang salah.
//
// Lebar lingkaran ditulis sebagai persen lebar foto, sama dengan rumus di
// drawMarkers. Yang terlihat di layar harus persis yang nanti dilihat model.
function MarkablePhoto({ src, markers, onAdd, onRemove }: {
  src: string;
  markers: Marker[];
  onAdd: (marker: Marker) => void;
  onRemove: (index: number) => void;
}) {
  const full = markers.length >= MAX_WORDS;
  return (
    <div className="relative mx-auto w-fit max-w-full touch-manipulation select-none">
      <img
        src={src}
        alt="halaman"
        aria-describedby="petunjuk-tandai"
        draggable={false}
        onClick={(event) => {
          if (full) return;
          const rect = event.currentTarget.getBoundingClientRect();
          onAdd({
            x: clamp01((event.clientX - rect.left) / rect.width),
            y: clamp01((event.clientY - rect.top) / rect.height),
          });
        }}
        className={`bg-sunken block h-auto max-h-[62vh] w-auto max-w-full rounded-xl lg:max-h-[34rem] ${full ? 'cursor-not-allowed' : 'cursor-crosshair'}`}
      />
      {markers.map((marker, index) => {
        const at = { left: `${marker.x * 100}%`, top: `${marker.y * 100}%` };
        return (
          <span key={`${marker.x}-${marker.y}`}>
            {/* Oval ditaruh langsung di pembungkus foto, jadi lebar 10% di sini
                berarti 10% lebar foto yang tergambar, dan rasio 50:22 membuat
                tingginya 4,4% lebar foto. Keduanya sama dengan drawMarkers,
                tanpa perlu mengukur apa pun lewat JavaScript. Nomornya duduk
                tepat di sudut kanan atas kotak oval, juga sama. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute aspect-[50/22] w-[10%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-[2.5px]"
              style={{ ...at, borderColor: MARKER_COLOR }}
            >
              <span
                className="absolute top-0 right-0 flex h-4 min-w-4 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full px-0.5 text-[0.625rem] leading-none font-bold text-white shadow-[var(--shadow-sm)]"
                style={{ background: MARKER_COLOR }}
              >
                {index + 1}
              </span>
            </span>
            {/* Sasaran hapus dibuat 44 piksel walau ovalnya bisa lebih kecil,
                supaya bisa diketuk jempol tanpa menaruh penanda baru di sebelahnya. */}
            <button
              type="button"
              onClick={() => onRemove(index)}
              aria-label={`Hapus penanda ${index + 1}`}
              className="absolute h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={at}
            />
          </span>
        );
      })}
    </div>
  );
}

export default function Capture() {
  const router = useRouter();
  const { db, ready, lookup, lookupMarked } = useDb();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [draft, setDraft] = useState('');
  const [words, setWords] = useState<string[]>([]);
  const [markers, setMarkers] = useState<Marker[]>([]);
  // Dibaca sekali saat komponen dibuat. Selama koleksi belum siap, layar ini
  // cuma menampilkan rangka, jadi nilai dari browser tidak pernah bertabrakan
  // dengan hasil render server.
  const [mode, setModeState] = useState<Mode>(readStoredMode);
  const [flash, setFlash] = useState('');
  const [choosing, setChoosing] = useState(false);
  const submitted = useRef(false);

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  useEffect(() => {
    if (!flash) return;
    const timeout = setTimeout(() => setFlash(''), 4000);
    return () => clearTimeout(timeout);
  }, [flash]);

  const book = db.books.find((b) => b.id === db.activeBookId) ?? null;
  const recent = book ? byBook(db, book.id).slice(0, 4) : [];

  function setMode(next: Mode) {
    setModeState(next);
    // Pilihan terakhir diingat. Pembaca yang lebih suka mengetik tidak perlu
    // memindahkannya setiap kali membuka layar ini.
    try {
      window.localStorage.setItem(MODE_KEY, next);
    } catch {
      // Penyimpanan diblokir; pilihannya cukup berlaku selama layar ini terbuka.
    }
  }

  async function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const small = await shrink(f);
    submitted.current = false;
    setFile(small);
    setMarkers([]);
    setPreview(URL.createObjectURL(small));
  }

  function addWord() {
    const w = draft.trim();
    if (!w || w.length > MAX_LEN) return;
    if (words.length >= MAX_WORDS || words.some((word) => word.toLowerCase() === w.toLowerCase())) return;
    setWords([...words, w]);
    setDraft('');
  }

  // Dua jalan keluar dari layar ini, dan keduanya menyimpan hal yang persis sama.
  // Bedanya hanya ke mana pengguna dibawa setelah kata masuk antrean.
  function saveWords(openNow: boolean) {
    if (!file || !book || submitted.current) return;
    if (mode === 'type' && words.length === 0) return;
    const ids = mode === 'mark'
      ? lookupMarked(file, book.id, markers)
      : lookup(file, book.id, words);
    // Jika antrean gagal disimpan, pertahankan foto dan kata untuk dicoba lagi.
    if (!ids) return;
    submitted.current = true;
    setFlash(mode === 'mark'
      ? 'Foto terkirim. Lema lagi cari kata yang kamu tandai.'
      : `${ids.length} kata masuk antrean. Lanjut baca aja.`);
    setWords([]);
    setMarkers([]);
    setDraft('');
    setFile(null);
    setPreview('');
    if (openNow) {
      // Membuka entri yang sudah tersimpan tidak mengulang lookup. Pada mode
      // tandai, id ini milik entri penampung; halaman koleksi juga mengenali
      // kata kata hasilnya lewat penanda batch yang sama.
      const params = new URLSearchParams(ids.map((id) => ['entry', id]));
      router.push(`/kata?${params.toString()}`);
    }
  }

  if (!ready) {
    return (
      <main className="page flex-1 pt-10">
        <div className="shimmer h-4 w-24 rounded-full" />
        <div className="shimmer mt-3 h-9 w-52 rounded-lg" />
        <div className="shimmer mt-6 h-48 w-full rounded-[1.25rem]" />
      </main>
    );
  }

  if (!book || choosing) {
    return (
      <main className="page flex flex-1 flex-col pt-10 pb-10">
        <BookPicker onPicked={() => setChoosing(false)} onCancel={() => setChoosing(false)} />
      </main>
    );
  }

  const canSubmit = Boolean(file) && (mode === 'mark' || words.length > 0);
  const tooLong = draft.trim().length > MAX_LEN;

  return (
    <main className="page flex flex-1 flex-col gap-6 pt-6">
      {/* Buku aktif dibungkus kartu supaya terbaca sebagai satu bidang kendali,
          dan tombol gantinya berukuran tombol sungguhan. Versi sebelumnya cuma
          pil kecil bertuliskan "Ganti" di pojok, dan tidak ada yang menduga itu
          jalan menuju rak buku. */}
      <header className="card flex items-center gap-3 p-3">
        <BookSpine title={book.title} />
        <div className="min-w-0 flex-1">
          <p className="eyebrow">Lagi baca</p>
          <h1 className="font-display truncate text-[1.5rem] leading-tight tracking-tight sm:text-[1.75rem]">
            {book.title}
          </h1>
        </div>
        <button onClick={() => setChoosing(true)} className="btn btn-ghost shrink-0 gap-2 px-3.5">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
            <path d="M4 8h13l-3-3M20 16H7l3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Ganti buku
        </button>
      </header>

      {/* Satu masukan berkas untuk seluruh layar. Bidang kosong dan tombol
          "Ganti foto" sama sama menunjuk ke sini lewat htmlFor, jadi setelah
          foto ada, mengetuk fotonya menaruh penanda, bukan membuka kamera lagi. */}
      <input id="foto-halaman" type="file" accept="image/*" onChange={pickPhoto} className="sr-only" />

      {/* Dua kolom mulai lebar laptop: fotonya tetap terlihat sementara kata
          ditandai di kanan, jadi tidak perlu menggulung bolak balik. */}
      {/* content-start penting: tanpa itu barisnya ikut meregang mengisi sisa
          tinggi layar, dan di lebar tablet muncul lubang kosong antara catatan
          privasi dan bagian penandaan kata. */}
      <div className="grid flex-1 grid-cols-1 content-start items-start gap-6 lg:grid-cols-2 lg:gap-8">
        <div className="flex flex-col gap-4">
          {preview ? (
            <div className="card flex flex-col gap-3 p-3">
              {mode === 'mark' ? (
                <MarkablePhoto
                  src={preview}
                  markers={markers}
                  onAdd={(marker) => setMarkers((current) => [...current, marker].slice(0, MAX_WORDS))}
                  onRemove={(index) => setMarkers((current) => current.filter((_, i) => i !== index))}
                />
              ) : (
                <img src={preview} alt="halaman" className="bg-sunken max-h-64 w-full rounded-xl object-contain lg:max-h-[26rem]" />
              )}
              {mode === 'mark' && (
                <p className="text-foreground text-center text-sm font-medium">
                  {markers.length === 0
                    ? 'Ketuk kata yang bikin kamu berhenti'
                    : `${markers.length} kata ditandai. Ketuk ovalnya kalau salah taruh.`}
                </p>
              )}
              <label
                htmlFor="foto-halaman"
                className="text-muted hover:text-foreground flex cursor-pointer items-center justify-center gap-2 py-1 text-sm"
              >
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
                  <path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.7M20 12a8 8 0 0 1-13.7 5.6L4 15.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Ganti foto
              </label>
            </div>
          ) : (
            <label
              htmlFor="foto-halaman"
              className="border-line hover:border-accent bg-surface flex cursor-pointer flex-col items-center gap-2 rounded-[1.25rem] border border-dashed px-6 py-12 text-center shadow-[var(--shadow-sm)] transition-colors lg:py-20"
            >
              <span className="bg-accent-soft text-accent mb-1 flex h-14 w-14 items-center justify-center rounded-full">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-7 w-7">
                  <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.2a1 1 0 0 0 .84-.46l.72-1.1A1 1 0 0 1 10.1 4h3.8a1 1 0 0 1 .84.44l.72 1.1a1 1 0 0 0 .84.46h1.2A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-8Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  <circle cx="12" cy="12.5" r="3.2" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </span>
              <span className="font-medium">Foto halaman yang lagi kamu baca</span>
              <span className="text-muted text-sm">Ambil dari kamera atau pilih file</span>
            </label>
          )}

          {/* Keterangan ditulis sebatas yang benar benar bisa dijamin. Perlakuan data
              di sisi penyedia model bukan sesuatu yang aplikasi ini kendalikan, jadi
              tidak diklaim di sini. */}
          <p className="text-muted flex gap-2 text-xs leading-relaxed">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="mt-px h-4 w-4 shrink-0">
              <rect x="5" y="10.5" width="14" height="9.5" rx="2.4" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8.5 10.5V8a3.5 3.5 0 1 1 7 0v2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span>
              Fotonya dikirim ke Google supaya modelnya bisa baca halamannya. Lema sendiri
              gak nyimpen foto itu, dan kata yang kamu kumpulin cuma ada di browser ini.
            </span>
          </p>
        </div>

        <div className="flex flex-col gap-6">
          <div role="radiogroup" aria-label="Cara menandai kata" className="bg-sunken grid grid-cols-2 gap-1 rounded-full p-1">
            {([
              ['mark', 'Tandai di foto'],
              ['type', 'Ketik kata'],
            ] as const).map(([value, label]) => {
              const on = mode === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setMode(value)}
                  className={`min-h-10 rounded-full px-3 text-sm font-medium transition-colors ${
                    on ? 'bg-surface text-foreground shadow-[var(--shadow-sm)]' : 'text-muted hover:text-foreground'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {mode === 'mark' ? (
            <section aria-label="Kata yang ditandai" className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between gap-3">
                <p className="eyebrow">Tandai tanpa mengetik</p>
                <p className="text-faint text-xs tabular-nums">{markers.length} dari {MAX_WORDS} penanda</p>
              </div>

              <ol id="petunjuk-tandai" className="text-muted flex flex-col gap-2 text-sm leading-relaxed">
                <li className="flex gap-2.5">
                  <span aria-hidden="true" className="bg-accent-soft text-accent flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[0.6875rem] font-semibold">1</span>
                  <span>
                    <strong className="text-foreground font-medium">Ketuk katanya di foto.</strong> Muncul
                    oval bernomor; ketuk lagi kalau salah taruh. Paling pas kalau fotonya dari
                    dekat, cukup paragraf yang ada katanya, supaya hurufnya cukup besar buat diketuk.
                  </span>
                </li>
                <li className="flex gap-2.5">
                  <span aria-hidden="true" className="bg-accent-soft text-accent flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[0.6875rem] font-semibold">2</span>
                  <span>
                    <strong className="text-foreground font-medium">Atau garis bawahi pakai pensil</strong> di
                    bukumu sebelum difoto. Gak perlu ketuk apa apa, Lema cari sendiri coretannya.
                  </span>
                </li>
              </ol>

              {file && markers.length === 0 && (
                <p role="status" className="border-line bg-surface text-muted rounded-xl border p-3 text-xs leading-relaxed">
                  Belum ada yang diketuk. Kalau kamu simpan sekarang, Lema bakal mencari coretan
                  pensil atau stabilo di halaman ini.
                </p>
              )}
              {markers.length >= MAX_WORDS && (
                <p role="status" className="text-warn text-xs leading-relaxed">
                  Sudah {MAX_WORDS} penanda, batas satu foto. Hapus salah satu kalau mau ganti.
                </p>
              )}
            </section>
          ) : (
            <section aria-label="Kata yang ditandai" className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between gap-3">
                <p className="eyebrow">Tandai kata atau frasa</p>
                <p className="text-faint text-xs tabular-nums">{words.length} dari {MAX_WORDS}</p>
              </div>

              <div className="flex gap-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addWord()}
                  placeholder="Kata atau frasa yang bikin berhenti"
                  aria-label="Kata atau frasa yang bikin berhenti"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  disabled={words.length >= MAX_WORDS}
                  className="border-line bg-surface focus:border-accent min-h-12 flex-1 rounded-xl border px-3.5 text-base outline-none disabled:opacity-50"
                />
                <button
                  onClick={addWord}
                  disabled={!draft.trim() || tooLong || words.length >= MAX_WORDS}
                  className="btn btn-ghost px-4"
                >
                  Tambah
                </button>
              </div>

              {/* Batas panjang bukan soal teknis. Prompt-nya dibangun untuk memilih
                  makna satu kata atau frasa dari beberapa kemungkinan, jadi kalimat
                  penuh akan menghasilkan kartu makna yang isinya tidak masuk akal.
                  Lebih baik dikatakan sekarang daripada dijawab asal. */}
              {tooLong && (
                <p role="status" className="text-warn text-xs leading-relaxed">
                  Kepanjangan buat satu tandaan. Lema memetakan makna kata atau frasa,
                  belum bisa menjelaskan kalimat utuh. Tandai bagian yang bikin kamu
                  berhenti aja.
                </p>
              )}

              {words.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {words.map((w) => (
                    <li key={w}>
                      <button
                        onClick={() => setWords(words.filter((x) => x !== w))}
                        aria-label={`${w}, hapus dari daftar`}
                        className="chip hover:border-danger hover:text-danger gap-1.5"
                      >
                        {w}
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-3.5 w-3.5">
                          <path d="m7 7 10 10M17 7 7 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <p className="text-muted text-xs leading-relaxed">
                Boleh satu kata, boleh frasa utuh seperti <span lang="en">in the long run</span>.
                Maksimal {MAX_WORDS} tandaan per halaman, dan modelnya butuh beberapa detik buat
                baca halamannya.
              </p>
            </section>
          )}

          {/* Aksi utama menempel di dekat jempol di HP. Mulai lebar laptop dia
              berhenti menempel, karena kolomnya sudah pendek dan tidak digulung. */}
          <div
            className="sticky z-30 -mx-1 lg:static lg:mx-0"
            style={{ bottom: 'calc(var(--tab-h) + env(safe-area-inset-bottom, 0px) + 0.5rem)' }}
          >
            {/* Panel ini melayang di atas isi halaman hanya selama dia menempel.
                Begitu jadi bagian biasa dari kolom, seluruh hiasannya dilepas:
                kotak berbingkai di tengah kolom cuma jadi bingkai tanpa tugas. */}
            <div className="border-line bg-surface/90 flex flex-col gap-2 rounded-[1.25rem] border p-2.5 shadow-[var(--shadow-md)] backdrop-blur-xl lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none">
              {flash && (
                <p aria-live="polite" className="text-accent flex items-center justify-center gap-1.5 pt-1 text-center text-sm">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4 shrink-0">
                    <path d="m5 12.5 4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {flash}
                </p>
              )}
              <button onClick={() => saveWords(true)} disabled={!canSubmit} className="btn btn-primary w-full">
                Simpan &amp; lihat makna
              </button>
              <button onClick={() => saveWords(false)} disabled={!canSubmit} className="btn btn-quiet w-full text-sm">
                Simpan, lanjut baca
              </button>
              {!canSubmit && !flash && (
                <p className="text-faint pb-1 text-center text-xs">
                  {mode === 'mark' || (!file && words.length === 0)
                    ? 'Ambil fotonya dulu, terus tandai katanya.'
                    : !file
                      ? 'Tinggal fotonya nih.'
                      : 'Tinggal tandai minimal satu kata.'}
                </p>
              )}
            </div>
          </div>

          {recent.length > 0 && (
            <section aria-label="Kata terbaru" className="flex flex-col gap-3 pb-2">
              <SectionHeader
                title="Kata terbaru"
                hint="di buku ini"
                action={<Link href="/kata" className="text-accent shrink-0 text-sm font-medium">Lihat semua</Link>}
              />
              <ul className="flex flex-col gap-2">
                {recent.map((entry) => (
                  <li key={entry.id}>
                    <Link
                      href={{ pathname: '/kata', query: { entry: entry.id } }}
                      aria-label={`Buka sekarang: ${entry.word}`}
                      className="card hover:border-muted flex items-center gap-3 px-3.5 py-3 transition-colors"
                    >
                      <span className="min-w-0 flex-1 truncate font-medium">{entry.word}</span>
                      <StatusChip tone={toneOf(entry)} />
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-faint h-4 w-4 shrink-0">
                        <path d="m9.5 6 6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
