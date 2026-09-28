# Cara Kembali ke Versi Sebelum "Tandai di Foto"

Dibuat 10 September 2026, bersamaan dengan fitur tandai kata tanpa mengetik. Dokumen ini menjawab satu pertanyaan: kalau fitur itu ternyata tidak jalan, bagaimana balik ke versi yang terakhir terbukti baik.

## Titik pulih yang sudah disiapkan

| Nama | Isinya |
|---|---|
| Tag `v1-sebelum-tandai-foto` | Commit `0c33808`. Versi yang sudah lulus 47/47 pengujian dan hidup di produksi sebelum fitur ini dibuat. |
| Commit `6dac711` | **Penggabungan fitur ke `main` pada 11 September 2026.** Inilah yang dibatalkan kalau mau kembali. |
| Cabang `fitur/tandai-di-foto` | Seluruh pekerjaan fitur baru, dua commit: `1631bae` dan `9e97596`. |
| Tag `v2-sebelum-kuis` | Commit `75827b8`. Mode tandai sudah hidup, kuis belum ada. Dipasang 11 September sebelum fitur kuis dikerjakan di cabang `fitur/kuis`. Kalau hanya kuisnya yang bermasalah, kembali ke sini, bukan ke `v1`. |
| Commit `944b2fd` | **Penggabungan kuis ke `main` pada 11 September 2026.** Membatalkan kuis saja, mode tandai tetap: `git revert -m 1 944b2fd`. |
| Tag `v3-sebelum-cadangan` | Commit `9b017f8`. Mode tandai dan kuis sudah hidup, uji akurasi 1.000 kata sudah selesai, cadangan dan koreksi makna belum ada. Dipasang 27 September sebelum keduanya dikerjakan di cabang `fitur/cadangan-dan-koreksi`. |
| Commit `534d9ea` | **Penggabungan cadangan dan koreksi makna ke `main` pada 27 September 2026.** Membatalkan keduanya saja, sisanya tetap: `git revert -m 1 534d9ea`. |
| Tag `v4-sebelum-pustaka` | Commit `9b017f8`. Cadangan dan koreksi makna sudah hidup, pustaka ebook belum ada. Dipasang 28 September sebelum Tahap A dikerjakan di cabang `fitur/pustaka`. |
| Commit `a9db562` | **Penggabungan pustaka ebook ke `main` pada 28 September 2026.** Membatalkan pustaka saja: `git revert -m 1 a9db562`. |

**Keadaan sekarang: mode tandai, kuis, cadangan koleksi, koreksi makna, dan pustaka ebook semuanya sudah digabung dan hidup di produksi.** Jadi yang berlaku adalah jalan nomor 2 atau 3 di bawah.

Pilih yang dibatalkan sesuai masalahnya, dan batalkan dari yang paling baru ke yang paling lama: `a9db562`, lalu `534d9ea`, lalu `944b2fd`, lalu `6dac711`. Membatalkan dengan urutan terbalik bisa menimbulkan konflik, karena kuis dibangun di atas mode tandai dan koreksi makna menyentuh kuis.

Ketiganya berdiri sendiri, jadi tidak ada keharusan membatalkan semuanya. Kalau yang bermasalah cuma cadangan dan koreksi, `git revert -m 1 534d9ea` sudah cukup.

Data koleksi pengguna aman di semua jalan di bawah, dan ini yang dijaga paling ketat:

- Kata dari mode tandai membawa dua kolom tambahan, `batch` dan `marked`.
- Kata yang maknanya dibetulkan membawa satu kolom tambahan, `correction`.
- Buku yang dibaca dari pustaka membawa kolom `pustaka`, dan posisi bacanya ada di larik `bacaan` di akar penyimpanan.

Versi lama mengabaikan kolom yang tidak dikenalnya, jadi mundur tidak merusak apa pun. Yang terjadi cuma satu: koreksi makna berhenti terlihat dan kartunya kembali menampilkan jawaban model. Koreksinya tidak hilang dan akan muncul lagi kalau fiturnya dinaikkan ulang, karena jawaban model memang sengaja tidak pernah ditimpa.

**Satu catatan khusus untuk pustaka.** Membatalkan `a9db562` juga menghapus berkas di `public/pustaka/`, jadi buku bukunya ikut hilang dari produksi. Buku itu bisa disusun ulang kapan saja dengan `node scripts/pustaka/susun.mjs`, selama skripnya ikut dikembalikan. Koleksi kata pengguna tidak terpengaruh: kolom `pustaka` dan larik `bacaan` cuma diabaikan versi lama, dan akan terbaca lagi kalau fiturnya dinaikkan ulang.

**Satu catatan khusus untuk cadangan.** Berkas cadangan yang sudah diunduh pengguna tetap bisa diimpor setelah pembatalan, kecuali kalau halaman `/data` itu sendiri yang dibuang. Kalau fitur ini dibatalkan sementara, sebaiknya sampaikan lebih dulu ke pengguna yang sudah memakainya, karena satu satunya jalan keluar dari localStorage akan ikut hilang.

## Pilih sesuai keadaannya

### 1. Fiturnya belum digabung ke `main`

Tidak perlu melakukan apa pun. Produksi masih versi lama. Kalau fiturnya tidak jadi dipakai, cabangnya cukup dibiarkan atau dihapus.

### 2. Sudah digabung, tapi mau mengetik jadi cara bawaan lagi

Paling ringan, dan fiturnya tetap ada sebagai pilihan. Di `app/baca/page.tsx`, ubah satu baris:

```ts
const DEFAULT_MODE: Mode = 'mark';
```

menjadi:

```ts
const DEFAULT_MODE: Mode = 'type';
```

Catatan: pengguna yang pernah memilih salah satu mode sudah punya pilihan tersimpan di browsernya (`lema.mode`), dan pilihan itu tetap dihormati. Perubahan ini hanya mengatur apa yang dilihat pengguna yang belum pernah memilih.

### 3. Sudah digabung dan harus benar benar kembali ke versi lama

**Paling cepat, tanpa menyentuh kode.** Buka Vercel, project `lema`, tab Deployments. Cari deployment dengan commit `0c33808`, lalu pilih *Promote to Production* (di beberapa tampilan disebut *Instant Rollback*). Selesai dalam hitungan detik. Kode di GitHub tidak berubah, jadi ini cocok sebagai langkah darurat.

**Permanen, lewat git.** Batalkan commit penggabungannya dengan `git revert`, lalu dorong. Vercel mendeploy ulang secara otomatis. Cara ini tidak menghapus riwayat apa pun, jadi fiturnya bisa dikembalikan lagi kapan saja. Id penggabungannya sudah diketahui:

```bash
git revert -m 1 6dac711       # membatalkan kedua fitur sekaligus lewat commit baru
git push origin main
```

Kalau yang bermasalah cuma perbaikan waktu tunggu dan mode tandai mau dipertahankan, batalkan satu commit itu saja: `git revert 9e97596`.

**Hanya ingin melihat versi lama di laptop**, tanpa mengubah apa pun:

```bash
git switch --detach v1-sebelum-tandai-foto
npm run dev
git switch main               # kembali lagi
```

## Yang sebaiknya tidak dipakai

`git reset --hard` lalu `git push --force` ke `main` juga bisa mengembalikan kode, tetapi menghapus riwayat di GitHub dan tidak bisa dibatalkan dengan mudah. Tiga jalan di atas sudah cukup untuk semua keadaan.
