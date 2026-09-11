# Cara Kembali ke Versi Sebelum "Tandai di Foto"

Dibuat 10 September 2026, bersamaan dengan fitur tandai kata tanpa mengetik. Dokumen ini menjawab satu pertanyaan: kalau fitur itu ternyata tidak jalan, bagaimana balik ke versi yang terakhir terbukti baik.

## Titik pulih yang sudah disiapkan

| Nama | Isinya |
|---|---|
| Tag `v1-sebelum-tandai-foto` | Commit `0c33808`. Versi yang sudah lulus 47/47 pengujian dan hidup di produksi sebelum fitur ini dibuat. |
| Cabang `main` | Selama cabang fitur belum digabung, `main` tetap persis di titik itu. |
| Cabang `fitur/tandai-di-foto` | Seluruh pekerjaan fitur baru. Tidak menyentuh `main` dan tidak menyentuh produksi. |

Data koleksi pengguna aman di semua jalan di bawah. Kata yang dibuat lewat mode tandai hanya membawa dua kolom tambahan, `batch` dan `marked`, dan versi lama mengabaikan kolom yang tidak dikenalnya.

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

**Permanen, lewat git.** Batalkan commit penggabungannya dengan `git revert`, lalu dorong. Vercel mendeploy ulang secara otomatis. Cara ini tidak menghapus riwayat apa pun, jadi fiturnya bisa dikembalikan lagi kapan saja.

```bash
git log --oneline -5          # cari commit penggabungan cabang fitur
git revert -m 1 <id-commit>   # membuat commit baru yang membatalkannya
git push origin main
```

**Hanya ingin melihat versi lama di laptop**, tanpa mengubah apa pun:

```bash
git switch --detach v1-sebelum-tandai-foto
npm run dev
git switch main               # kembali lagi
```

## Yang sebaiknya tidak dipakai

`git reset --hard` lalu `git push --force` ke `main` juga bisa mengembalikan kode, tetapi menghapus riwayat di GitHub dan tidak bisa dibatalkan dengan mudah. Tiga jalan di atas sudah cukup untuk semua keadaan.
