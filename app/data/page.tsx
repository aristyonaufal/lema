'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useDb } from '@/lib/useDb';
import { countWords, fileName, merge, parseBackup, toCsv, toJson, type MergeReport } from '@/lib/transfer';
import type { Db } from '@/lib/store';
import {
  babTersimpan, dukungLuring, hapusBuku, lepasSw, luringDimatikan, nyalakanSw, pemakaian, ukuranTerbaca,
} from '@/lib/offline';
import { muatKatalog, type KatalogBuku } from '@/lib/pustaka';

// Cadangan koleksi.
//
// Halaman ini ada karena satu konsekuensi dari pilihan "tanpa akun": koleksi
// hanya hidup di satu browser. Membersihkan data situs, berganti HP, atau
// membuka Lema dari peramban lain sama saja dengan kehilangan semuanya. Selama
// belum ada sinkronisasi, berkas adalah jalan keluarnya, dan jalan itu harus
// bisa ditemukan sebelum kehilangan terjadi, bukan sesudahnya.

function download(text: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

type Staged = { db: Db; exportedAt: number | null; name: string };

const tanggal = (at: number) =>
  new Date(at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

export default function Data() {
  const { db, update, ready } = useDb();
  const fileInput = useRef<HTMLInputElement>(null);
  const [staged, setStaged] = useState<Staged | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<(MergeReport & { mode: 'gabung' | 'ganti' }) | null>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [unduhan, setUnduhan] = useState<Map<string, number>>(new Map());
  const [katalog, setKatalog] = useState<KatalogBuku[]>([]);
  const [byte, setByte] = useState<number | null>(null);
  const [lepasSiap, setLepasSiap] = useState(false);
  // Dibaca sekali saat state dibuat, pola yang sama dengan ukuran huruf di
  // pembaca dan pilihan cara menandai di layar Baca.
  const [mati, setMati] = useState(luringDimatikan);
  const bisaLuring = dukungLuring();

  const segarkanLuring = () => {
    void babTersimpan().then(setUnduhan);
    void pemakaian().then(setByte);
  };

  useEffect(() => {
    void babTersimpan().then(setUnduhan);
    void pemakaian().then(setByte);
    void muatKatalog().then((k) => setKatalog(k.buku)).catch(() => {});
  }, []);

  async function hapusSemuaUnduhan() {
    for (const slug of unduhan.keys()) await hapusBuku(slug).catch(() => {});
    segarkanLuring();
  }

  const words = countWords(db);
  const corrected = db.entries.filter((e) => e.correction).length;

  async function pickFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Input dikosongkan supaya memilih berkas yang sama dua kali tetap memicu
    // perubahan. Tanpa ini, percobaan kedua setelah galat tidak terjadi apa apa.
    event.target.value = '';
    if (!file) return;
    setError(null);
    setReport(null);
    setStaged(null);
    setConfirmReplace(false);

    const parsed = parseBackup(await file.text());
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setStaged({ db: parsed.db, exportedAt: parsed.exportedAt, name: file.name });
  }

  function apply(mode: 'gabung' | 'ganti') {
    if (!staged) return;
    if (mode === 'ganti') {
      const dropped = db.entries.length;
      if (!update(() => staged.db)) {
        setError('Koleksi baru belum tersimpan di browser. Penyimpanan mungkin penuh. Coba lagi.');
        return;
      }
      setReport({
        mode,
        db: staged.db,
        addedBooks: staged.db.books.length,
        addedEntries: staged.db.entries.length,
        duplicates: dropped,
        orphans: 0,
      });
    } else {
      const merged = merge(db, staged.db);
      if (!update(() => merged.db)) {
        setError('Hasil gabungan belum tersimpan di browser. Penyimpanan mungkin penuh. Coba lagi.');
        return;
      }
      setReport({ ...merged, mode });
    }
    setStaged(null);
    setConfirmReplace(false);
  }

  if (!ready) {
    return (
      <main className="page page-narrow flex-1 pt-8">
        <div className="shimmer h-9 w-52 rounded-lg" />
        <div className="shimmer mt-6 h-40 w-full rounded-[1.25rem]" />
      </main>
    );
  }

  return (
    <main className="page page-narrow flex flex-1 flex-col gap-6 pt-6">
      <header className="flex flex-col gap-2">
        <p className="eyebrow">Koleksimu</p>
        <h1 className="font-display text-[2rem] leading-tight tracking-tight sm:text-[2.25rem]">
          Cadangan koleksi
        </h1>
        <p className="text-muted text-sm leading-relaxed">
          Lema nyimpen koleksimu di browser ini aja, tanpa akun dan tanpa server. Enaknya, nggak ada
          yang perlu didaftarin. Risikonya, koleksimu ikut hilang kalau kamu bersihin data browser
          atau ganti HP. Simpan berkas cadangan sekarang, biar aman.
        </p>
      </header>

      <section aria-label="Isi koleksi" className="card grid grid-cols-3 gap-2 p-4">
        {[
          ['Buku', db.books.length],
          ['Kata', words],
          ['Kamu betulkan', corrected],
        ].map(([label, value]) => (
          <div key={label as string} className="flex flex-col gap-1">
            <span className="font-display text-[1.6rem] leading-none tabular-nums">{value}</span>
            <span className="text-muted text-xs">{label}</span>
          </div>
        ))}
      </section>

      <section aria-label="Simpan cadangan" className="card flex flex-col gap-3.5 p-5">
        <div>
          <h2 className="text-lg font-semibold">Simpan ke berkas</h2>
          <p className="text-muted mt-1 text-sm leading-relaxed">
            Satu berkas berisi semua buku, kata, makna, jadwal review, dan koreksimu. Simpan di
            Google Drive atau kirim ke dirimu sendiri, lalu impor lagi kapan pun dibutuhkan.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => download(toJson(db), fileName(), 'application/json')}
            disabled={db.books.length === 0}
            className="btn btn-primary"
          >
            Simpan cadangan
          </button>
          <button
            onClick={() => download(toCsv(db), fileName(Date.now(), 'csv'), 'text/csv;charset=utf-8')}
            disabled={words === 0}
            className="btn btn-ghost"
          >
            Ekspor buat Anki (.csv)
          </button>
        </div>
        <p className="text-faint text-xs leading-relaxed">
          Berkas cadangan buat balik ke Lema. Berkas CSV buat dibuka di spreadsheet atau dimasukin ke
          aplikasi kartu hafalan seperti Anki dan Quizlet.
        </p>
      </section>

      <section aria-label="Pulihkan dari berkas" className="card flex flex-col gap-3.5 p-5">
        <div>
          <h2 className="text-lg font-semibold">Pulihkan dari berkas</h2>
          <p className="text-muted mt-1 text-sm leading-relaxed">
            Pilih berkas cadangan yang pernah kamu simpan. Lema bakal nunjukin isinya dulu sebelum
            ada yang berubah.
          </p>
        </div>

        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          onChange={pickFile}
          aria-label="Pilih berkas cadangan"
          className="sr-only"
        />
        <button onClick={() => fileInput.current?.click()} className="btn btn-ghost w-fit">
          Pilih berkas cadangan
        </button>

        {error && (
          <p role="alert" className="border-danger/40 bg-danger-soft/50 text-danger rounded-xl border p-3 text-sm leading-relaxed">
            {error}
          </p>
        )}

        {staged && (
          <div className="border-accent/40 bg-accent-soft/40 flex flex-col gap-3 rounded-xl border p-3.5">
            <div>
              <p className="text-sm font-medium">{staged.name}</p>
              <p className="text-muted mt-1 text-sm leading-relaxed">
                Berisi {staged.db.books.length} buku dan {staged.db.entries.length} kata
                {staged.exportedAt ? `, disimpan ${tanggal(staged.exportedAt)}` : ''}.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => apply('gabung')} className="btn btn-primary text-sm">
                Gabung ke koleksi
              </button>
              {/* Mengganti berarti membuang koleksi yang sekarang. Konfirmasinya
                  dua langkah dan tombolnya baru menyebut angkanya di langkah
                  kedua, supaya tidak ada yang terhapus karena salah ketuk. */}
              {db.entries.length > 0 && (
                confirmReplace ? (
                  <button onClick={() => apply('ganti')} className="btn btn-ghost border-danger/50 text-danger text-sm">
                    Ya, buang {db.entries.length} kata yang sekarang
                  </button>
                ) : (
                  <button onClick={() => setConfirmReplace(true)} className="btn btn-quiet text-sm">
                    Ganti semua
                  </button>
                )
              )}
              <button
                onClick={() => { setStaged(null); setConfirmReplace(false); }}
                className="btn btn-quiet text-sm"
              >
                Batal
              </button>
            </div>
            <p className="text-muted text-xs leading-relaxed">
              <strong className="font-semibold">Gabung</strong> nambahin yang belum ada dan nggak
              nimpa kemajuan review di HP ini. Buku berjudul sama nyatu, nggak jadi dua rak.
              <strong className="font-semibold"> Ganti semua</strong> ngebuang koleksi yang sekarang.
            </p>
          </div>
        )}

        {report && (
          <div role="status" className="border-line bg-sunken flex flex-col gap-2 rounded-xl border p-3.5 text-sm leading-relaxed">
            <p className="font-medium">
              {report.mode === 'ganti'
                ? `Koleksi diganti: ${report.addedBooks} buku, ${report.addedEntries} kata.`
                : `Selesai digabung: ${report.addedEntries} kata baru masuk.`}
            </p>
            <ul className="text-muted flex flex-col gap-1 text-sm">
              {report.mode === 'gabung' && report.addedBooks > 0 && <li>{report.addedBooks} buku baru ditambahkan.</li>}
              {report.mode === 'gabung' && report.duplicates > 0 && (
                <li>{report.duplicates} kata dilewati karena sudah ada di koleksi ini.</li>
              )}
              {report.orphans > 0 && (
                <li>{report.orphans} kata nggak ikut karena bukunya nggak ada di berkas.</li>
              )}
            </ul>
            <Link href="/kata" className="text-accent w-fit font-medium">
              Lihat koleksi
            </Link>
          </div>
        )}
      </section>

      {bisaLuring && (
        <section aria-label="Penyimpanan luring" className="card flex flex-col gap-3.5 p-5">
          <div>
            <h2 className="text-lg font-semibold">Buku yang diunduh</h2>
            <p className="text-muted mt-1 text-sm leading-relaxed">
              Buku dari pustaka yang sudah kamu unduh bisa dibaca tanpa koneksi. Unduhnya dari
              halaman Pustaka, per buku.
            </p>
          </div>

          {unduhan.size === 0 ? (
            <p className="text-muted text-sm">Belum ada buku yang diunduh.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {[...unduhan.entries()].map(([slug, bab]) => {
                const buku = katalog.find((b) => b.slug === slug);
                return (
                  <li key={slug} className="flex items-baseline justify-between gap-3">
                    <span lang="en" className="min-w-0 flex-1 truncate">{buku?.judul ?? slug}</span>
                    <span className="text-muted shrink-0 text-xs tabular-nums">
                      {bab} dari {buku?.bab ?? bab} bab
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          {byte !== null && (
            <p className="text-faint text-xs">
              Seluruh data Lema di peramban ini sekitar {ukuranTerbaca(byte)}.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {unduhan.size > 0 && (
              <button onClick={hapusSemuaUnduhan} className="btn btn-quiet text-sm">
                Hapus semua unduhan
              </button>
            )}
          </div>

          {/* Pagar terakhir. Service worker adalah satu satunya bagian Lema
              yang bisa menyajikan versi lama kalau ada yang salah, dan pengguna
              tidak boleh dipaksa membuka alat pengembang untuk membuangnya. */}
          <div className="border-line flex flex-col gap-2 border-t pt-3.5">
            <p className="text-muted text-xs leading-relaxed">
              {mati
                ? 'Mode luring lagi mati. Buku nggak bisa diunduh, dan Lema selalu ngambil versi terbaru dari server.'
                : 'Kalau Lema terasa menampilkan versi lama dan nggak mau berubah walau sudah dimuat ulang, matikan mode luring. Koleksi katamu nggak ikut terhapus, dan pilihan ini diingat.'}
            </p>
            {mati ? (
              <button
                onClick={() => { setMati(false); void nyalakanSw(); }}
                className="btn btn-ghost w-fit text-sm"
              >
                Nyalakan lagi mode luring
              </button>
            ) : lepasSiap ? (
              <button
                onClick={() => { setMati(true); void lepasSw(); }}
                className="btn btn-ghost border-danger/50 text-danger w-fit text-sm"
              >
                Ya, matikan dan muat ulang
              </button>
            ) : (
              <button onClick={() => setLepasSiap(true)} className="btn btn-quiet w-fit text-sm">
                Matikan mode luring
              </button>
            )}
          </div>
        </section>
      )}

      <p className="text-faint text-xs leading-relaxed">
        Berkas cadangan nggak pernah dikirim ke mana mana. Semua pemrosesannya terjadi di HP atau
        laptopmu sendiri.
      </p>
    </main>
  );
}
