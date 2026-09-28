'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useDb } from '@/lib/useDb';
import BookSpine, { spineColor } from '@/components/BookSpine';
import BookPicker from '@/components/BookPicker';
import { StatusChip, SectionHeader, type EntryTone } from '@/components/ui';
import {
  bacaanFor, bacaanTerakhir, booksByRecent, bookSummary, practicePool, stats, type Entry,
} from '@/lib/store';
import { kemajuanBab } from '@/lib/pustaka';
import { useKatalog } from '@/lib/useKatalog';

// Beranda. Sebelumnya alamat ini langsung berupa layar foto, sehingga seluruh
// aplikasi hanya terlihat sebagai satu kotak unggah dan tidak ada tempat yang
// menunjukkan hasil belajar. Sekarang alamat ini menjadi ringkasan: berapa kata
// terkumpul, mana yang jatuh tempo, buku apa saja, dan apa yang terakhir dicari.
// Layar fotonya pindah ke /baca dan tetap menjadi aksi paling menonjol di sini.

function toneOf(entry: Entry): EntryTone {
  if (entry.status === 'pending') return 'pending';
  if (entry.status === 'error') return 'error';
  return entry.known ? 'known' : 'done';
}

// Satu angka besar dengan keterangannya. Angka yang bernilai nol tetap
// ditampilkan supaya letak tiap kartu tidak berpindah pindah saat koleksi tumbuh.
function Stat({ value, label, hint, tone }: {
  value: number;
  label: string;
  hint?: string;
  tone?: 'accent' | 'warn';
}) {
  const color = tone === 'accent' ? 'text-accent' : tone === 'warn' ? 'text-warn' : '';
  return (
    <div className="card flex flex-col gap-1 p-4">
      <p className={`font-display text-[2rem] leading-none tabular-nums ${color}`}>{value}</p>
      <p className="text-sm font-medium">{label}</p>
      {hint && <p className="text-faint text-xs leading-relaxed">{hint}</p>}
    </div>
  );
}

export default function Beranda() {
  const { db, ready } = useDb();
  const katalog = useKatalog();
  const [choosing, setChoosing] = useState(false);

  if (!ready) {
    return (
      <main className="page flex-1 pt-10">
        <div className="shimmer h-4 w-24 rounded-full" />
        <div className="shimmer mt-3 h-9 w-52 rounded-lg" />
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="shimmer h-24 rounded-[1.25rem]" />)}
        </div>
      </main>
    );
  }

  // Pengguna baru tidak punya apa apa untuk diringkas, jadi beranda langsung
  // menjadi pertanyaan pertama: bukunya apa.
  if (db.books.length === 0 || choosing) {
    return (
      <main className="page flex flex-1 flex-col pt-10 pb-10">
        <BookPicker onPicked={() => setChoosing(false)} onCancel={() => setChoosing(false)} />
      </main>
    );
  }

  const s = stats(db);
  const active = db.books.find((b) => b.id === db.activeBookId) ?? null;
  const shelf = booksByRecent(db);
  const canPractice = practicePool(db).length > 0;
  const recent = [...db.entries].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);

  return (
    <main className="page flex flex-1 flex-col gap-7 pt-6 pb-4">
      <header className="flex flex-col gap-2">
        <p className="eyebrow">Beranda</p>
        <h1 className="font-display text-[2.125rem] leading-[1.08] tracking-tight sm:text-[2.5rem]">
          Progres bacamu
        </h1>
        <p className="text-muted text-sm leading-relaxed">
          {s.words === 0
            ? 'Belum ada kata sama sekali. Mulai dari foto satu halaman.'
            : `${s.words} kata terkumpul dari ${s.books} buku.`}
        </p>
      </header>

      <section aria-label="Ringkasan" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat value={s.words} label="Kata terkumpul" hint="dari semua bukumu" />
        <Stat value={s.ready} label="Siap dibaca" hint="maknanya sudah ada" tone="accent" />
        <Stat value={s.due} label="Jatuh tempo" hint="waktunya diulang" tone={s.due > 0 ? 'warn' : undefined} />
        {/* Riwayat ini tidak turun lagi ketika kata yang sama nanti terlupa,
            jadi angkanya benar benar mencatat kemajuan, bukan keadaan hari ini. */}
        <Stat value={s.passed} label="Lolos review" hint="pernah diingat sekali" />
      </section>

      <div className="grid grid-cols-1 items-start gap-7 lg:grid-cols-[1fr_19rem] lg:gap-8">
        <div className="flex flex-col gap-7">
          <section aria-label="Aksi cepat" className="flex flex-col gap-3">
            <Link
              href="/baca"
              className="bg-foreground text-background flex items-center gap-4 rounded-[1.25rem] p-4 shadow-[var(--shadow-md)] transition-transform active:scale-[0.99]"
            >
              <span className="bg-background/15 flex h-11 w-11 shrink-0 items-center justify-center rounded-full">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-6 w-6">
                  <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.2a1 1 0 0 0 .84-.46l.72-1.1A1 1 0 0 1 10.1 4h3.8a1 1 0 0 1 .84.44l.72 1.1a1 1 0 0 0 .84.46h1.2A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-8Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  <circle cx="12" cy="12.5" r="3.2" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">Foto halaman baru</span>
                <span className="block text-sm opacity-70">
                  {active ? `Lanjut di ${active.title}` : 'Pilih bukunya dulu'}
                </span>
              </span>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5 shrink-0 opacity-60">
                <path d="m9.5 6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>

            {s.due > 0 && (
              <Link
                href="/review"
                className="bg-accent text-accent-ink flex items-center gap-4 rounded-[1.25rem] p-4 shadow-[var(--shadow-sm)] transition-transform active:scale-[0.99]"
              >
                <span className="bg-accent-ink/15 flex h-11 w-11 shrink-0 items-center justify-center rounded-full">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-6 w-6">
                    <path d="M20 12a8 8 0 1 1-2.4-5.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    <path d="M20 3.6V7.9h-4.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{s.due} kata udah waktunya diulang</span>
                  <span className="block text-sm opacity-80">Pakai kalimat baru, bukan kalimat dari bukumu.</span>
                </span>
                <span aria-hidden="true" className="shrink-0 text-sm font-semibold">Mulai</span>
              </Link>
            )}

            {/* Melanjutkan bacaan, bukan memulai dari rak. Satu ketukan membawa
                pembaca kembali ke paragraf terakhirnya. Yang ditawarkan cuma buku
                yang paling terakhir dibaca; menawarkan semuanya berarti membuat
                daftar kedua yang menyalin rak buku di bawah. */}
            {(() => {
              const lanjut = bacaanTerakhir(db);
              const buku = lanjut ? katalog.get(lanjut.slug) : undefined;
              if (!lanjut) return null;
              return (
                <Link
                  href={`/pustaka/${lanjut.slug}`}
                  className="card hover:border-muted flex flex-col gap-2.5 p-4 transition-colors"
                >
                  <span className="flex items-center gap-3.5">
                    <BookSpine title={buku?.judul ?? lanjut.slug} />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="block font-semibold">Lanjut baca</span>
                      <span lang="en" className="text-muted block truncate text-sm">
                        {buku?.judul ?? lanjut.slug}
                      </span>
                      {/* Ditulis sebagai nomor bab, bukan persen. Kemajuannya
                          dihitung dari jumlah bab, dan menuliskannya sebagai
                          persen akan terdengar lebih teliti daripada yang benar. */}
                      <span className="text-faint block text-xs tabular-nums">
                        {buku ? `Bab ${lanjut.bab} dari ${buku.bab}` : `Bab ${lanjut.bab}`}
                      </span>
                    </span>
                    <span aria-hidden="true" className="text-faint shrink-0">›</span>
                  </span>
                  {buku && (
                    <span aria-hidden="true" className="bg-sunken block h-1.5 w-full overflow-hidden rounded-full">
                      <span
                        className="bg-accent block h-full rounded-full transition-[width] duration-500"
                        style={{ width: `${kemajuanBab(lanjut.bab, buku.bab)}%` }}
                      />
                    </span>
                  )}
                </Link>
              );
            })()}

            {s.pending > 0 && (
              <p role="status" className="border-line bg-surface text-muted flex items-center gap-2 rounded-xl border p-3 text-sm">
                <span aria-hidden="true" className="bg-warn h-2 w-2 shrink-0 animate-pulse rounded-full" />
                {s.pending} kata masih dibaca model. Hasilnya masuk sendiri ke koleksi.
              </p>
            )}
            {s.failed > 0 && (
              <Link href="/kata" className="border-danger/30 bg-danger-soft/40 text-danger flex items-center gap-2 rounded-xl border p-3 text-sm">
                {s.failed} kata gagal diproses. Lihat dan kirim ulang.
              </Link>
            )}

            {/* Latihan tidak menunggu jatuh tempo, jadi tempatnya bukan di kartu
                review yang hijau itu. Dia jalan lain, dan sengaja lebih tenang. */}
            {canPractice && (
              <Link href="/review?latihan=1" className="btn btn-ghost w-full">
                Latihan kata kapan aja
              </Link>
            )}
          </section>

          <section aria-label="Rak buku" className="flex flex-col gap-3">
            <SectionHeader
              title="Rak buku"
              hint={`${s.books} buku`}
              action={
                <button onClick={() => setChoosing(true)} className="text-accent shrink-0 text-sm font-medium">
                  Ganti buku
                </button>
              }
            />
            {/* Pustaka ditaruh di rak buku, bukan jadi tab keenam. Rak adalah
                tempat orang mencari "aku mau baca apa", dan buku pustaka memang
                masuk rak yang sama begitu mulai dibaca. */}
            <Link
              href="/pustaka"
              className="card hover:border-muted flex items-center gap-3 p-3.5 transition-colors"
            >
              <span aria-hidden="true" className="bg-accent-soft text-accent flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                  <path d="M4 5.5h6a2 2 0 0 1 2 2v11a1.6 1.6 0 0 0-1.6-1.6H4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  <path d="M20 5.5h-6a2 2 0 0 0-2 2v11a1.6 1.6 0 0 1 1.6-1.6H20z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">Pustaka</span>
                <span className="text-muted block text-xs leading-relaxed">
                  Lima novel klasik yang bisa dibaca langsung di sini
                </span>
              </span>
              <span aria-hidden="true" className="text-faint shrink-0">›</span>
            </Link>
            <ul className="flex flex-col gap-2.5">
              {shelf.map((b) => {
                const sum = bookSummary(db, b.id);
                const color = spineColor(b.title);
                // Kemajuan diukur dari kata yang pernah lolos review, bukan dari
                // kata yang maknanya sudah ada. Punya arti belum berarti hafal.
                const percent = sum.total > 0 ? Math.round((sum.passed / sum.total) * 100) : 0;
                // Buku pustaka punya kemajuan kedua yang tidak dimiliki buku
                // kertas: sampai bab berapa dibaca. Keduanya berbeda arti, jadi
                // ditampilkan terpisah, bukan digabung jadi satu angka.
                const lanjut = b.pustaka ? bacaanFor(db, b.pustaka) : null;
                const terbit = b.pustaka ? katalog.get(b.pustaka) : undefined;
                return (
                  <li key={b.id} className="flex flex-col">
                    {/* Menuju koleksi buku ini saja. Di HP tidak ada sidebar,
                        jadi kartu inilah satu satunya jalan ke sana. */}
                    <Link
                      href={{ pathname: '/kata', query: { buku: b.id } }}
                      className="card hover:border-muted flex flex-col gap-2.5 p-3.5 transition-colors"
                    >
                      <span className="flex items-center gap-3.5">
                        <BookSpine title={b.title} />
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="truncate font-medium">
                            {b.title}
                            {b.id === db.activeBookId && (
                              <span className="text-accent ml-2 text-xs font-normal">lagi dibaca</span>
                            )}
                          </span>
                          <span className="text-muted text-xs">
                            {sum.total === 0
                              ? 'Belum ada kata'
                              : `${sum.total} kata, ${sum.passed} lolos review`}
                          </span>
                        </span>
                        <span className="text-muted shrink-0 text-sm tabular-nums">{percent}%</span>
                      </span>
                      <span
                        aria-hidden="true"
                        className="shelf block h-2 w-full overflow-hidden"
                        style={{ background: `${color}24`, color }}
                      >
                        <span
                          className="block h-full rounded-lg transition-[width] duration-500"
                          style={{ width: `${percent}%`, background: color }}
                        />
                      </span>
                    </Link>

                    {/* Tautan kedua, bukan tombol di dalam kartu: kartunya
                        sendiri sudah sebuah tautan, dan tautan di dalam tautan
                        bukan HTML yang sah. */}
                    {b.pustaka && (
                      <Link
                        href={`/pustaka/${b.pustaka}`}
                        className="text-accent hover:text-foreground mt-1.5 flex items-center gap-1.5 self-start px-1 text-xs font-medium transition-colors"
                      >
                        {lanjut
                          ? `Lanjut baca · bab ${lanjut.bab}${terbit ? ` dari ${terbit.bab}` : ''}`
                          : 'Mulai baca'}
                        <span aria-hidden="true">›</span>
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <aside aria-label="Kata terbaru" className="flex flex-col gap-3">
          <SectionHeader
            title="Kata terbaru"
            action={<Link href="/kata" className="text-accent shrink-0 text-sm font-medium">Lihat semua</Link>}
          />
          {recent.length === 0 ? (
            <div className="card flex flex-col items-center gap-3 p-6 text-center">
              <p className="text-muted text-sm leading-relaxed">
                Belum ada kata. Foto satu halaman, tandai kata yang bikin kamu berhenti.
              </p>
            </div>
          ) : (
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
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      {/* Jalan ke cadangan dari HP. Sidebar cuma ada mulai lebar laptop,
          sedangkan pengguna Lema justru kebanyakan di HP, dan merekalah yang
          paling mungkin kehilangan koleksi karena berganti perangkat. */}
      <Link
        href="/data"
        className="text-muted hover:text-foreground border-line flex items-center justify-between gap-3 border-t pt-5 text-sm lg:hidden"
      >
        <span>
          Simpan cadangan koleksi
          <span className="text-faint block text-xs">
            Koleksimu cuma ada di browser ini. Satu berkas bikin aman.
          </span>
        </span>
        <span aria-hidden="true" className="text-faint shrink-0">›</span>
      </Link>
    </main>
  );
}
