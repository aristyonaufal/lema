# Peta Pengerjaan Lema

Apa yang sudah ditulis, apa yang lagi dikerjakan, dan alat apa saja yang dipakai. Halaman ini diperbarui tiap ada kemajuan, jadi kamu gak perlu nebak posisi kita di mana.

> **Posisi sekarang (9 September 2026):** Lanjutan 1–3 selesai, Lanjutan 4 selesai, dan sebagian besar Lanjutan 7 selesai. Aplikasi sudah hidup di `lema-lemon.vercel.app` dan terbukti bisa memanggil model. Pada 9 September alurnya berubah atas permintaan pengguna: makna sekarang **langsung dibuka** saat tombol utama ditekan, dan mode tunda turun menjadi pilihan kedua. Rutenya ikut berubah, `/` menjadi beranda berisi ringkasan progres dan `/baca` menjadi layar foto. Tampilan dibuat responsif: bilah bawah di HP, sidebar kiri dan isi dua kolom mulai lebar laptop. Build, lint, dan 42/42 pengujian browser lulus.  
> **Perhatian:** perilaku bawaan itu berbeda dari prinsip nomor 1 dan bagian 7 pada PRD. PRD belum diselaraskan; keputusannya ada pada pengguna.  
> Revisi lanjutan pada 9 September setelah uji pertama di HP: tombol ganti buku diperbesar, frasa multi kata disebut terang terangan beserta batas panjangnya, koleksi kata jadi daftar ringkas yang baru terbuka saat diketuk, rak buku muncul di sidebar dan menyaring koleksi per buku, serta mode latihan yang tidak menunggu jatuh tempo dan tidak menggeser jadwal. Build, lint, dan 47/47 pengujian lulus.  
> **10 September, hidup di produksi sejak 11 September (commit `6dac711`):** kata bisa ditandai tanpa mengetik, lewat ketukan di foto atau coretan pensil di buku yang dicari sendiri oleh model. Alur ketik lama tetap ada sebagai mode kedua. Titik pulih: tag `v1-sebelum-tandai-foto`; langkah kembali ada di [Cara Kembali ke Versi Lama](cara_kembali_ke_versi_lama.md). 52/52 pengujian lulus, dan satu uji dengan model sungguhan menemukan kedua kata yang ditandai dengan benar.  
> Waktu tunggu model turun dari 58,8 ke 28,8 detik lewat batas waktu per percobaan dan tingkat berpikir `low`; 20 detik di antaranya menunggu model utama yang sedang penuh, jadi mengganti `GEMINI_MODEL` ke `gemini-3.6-flash` diperkirakan membawanya ke sekitar 9 detik.  
> Yang masih terbuka: uji mode tandai dengan buku sungguhan di HP, pilihan model utama, slogan belum dipilih, uji Safari iPhone, uji akurasi model dengan tingkat berpikir `low`, serta Lanjutan 6 dan sisa Lanjutan 5.  
> Urutan dan kriteria selesai: [Rencana Lanjutan](rencana_lanjutan.md). Riwayat perubahan dan serah terima: [Catatan Pengerjaan](catatan_pengerjaan.md).

Tahap 0–6 di bawah adalah catatan pengerjaan awal. Label selesai pada tahap fondasi mencatat implementasi awal, bukan bukti seluruh persyaratan PRD sudah terpenuhi atau diuji. Untuk pekerjaan berikutnya, ikuti rencana lanjutan di atas.

---

## Bagian 01 — Alat dan Bahasa yang Dipakai

Semuanya gratis, dan semuanya sudah terpasang di laptopmu kecuali yang ditandai belum.

### TypeScript
**Kategori:** Bahasa pemrograman

JavaScript yang dikasih pengecekan tipe. Jadi kalau saya salah nulis nama variabel atau salah bentuk data, ketahuan sebelum dijalankan, bukan pas dipakai pengguna.

### React 19
**Kategori:** Pustaka antarmuka

Yang bikin tampilan bisa berubah sendiri waktu datanya berubah. Tiap layar di Lema itu satu komponen React.

### Next.js 16
**Kategori:** Kerangka kerja

Pembungkus React yang ngurus alamat halaman dan sekaligus punya sisi server. Sisi server ini penting, karena di situ API key disimpan supaya gak bisa dicuri dari browser.

### Tailwind CSS 4
**Kategori:** Penata tampilan

Cara menulis gaya visual langsung di dalam kode tampilan, tanpa file CSS terpisah untuk tiap komponen.

### Node.js 24
**Kategori:** Mesin penjalan

Yang bikin JavaScript bisa jalan di luar browser. Ini yang menjalankan server saat kamu ketik:

```bash
npm run dev
```

### npm
**Kategori:** Manajer paket

Pengunduh dan pengatur pustaka pihak ketiga. Isi folder `node_modules` itu hasil kerjanya.

### Gemini API
**Kategori:** Model bahasa

Yang membaca foto halaman dan menentukan makna kata. Dipanggil lewat HTTP biasa, tanpa pustaka tambahan, supaya gak ada ketergantungan versi yang gampang usang.

### VS Code
**Kategori:** Editor

Tempat kamu buka dan baca kodenya.

### Git
**Kategori:** Pencatat versi

Sudah diinisialisasi otomatis waktu scaffold. Belum dipakai serius, baru kepakai nanti pas deploy.

### Vercel
**Kategori:** Tempat hosting  
**Status:** Belum dipakai

Tujuan akhir supaya aplikasinya punya alamat publik dan bisa dites pakai kamera iPhone.

---

## Bagian 02 — Tahapan Pengerjaan

Urutannya sengaja begini: bagian yang paling berisiko dikerjakan paling awal. Kalau penentu makna gagal, seluruh tampilan jadi sia-sia, jadi itu yang dibereskan duluan.

### ✅ Tahap 0. Persiapan Alat
**Status:** Selesai

- Node.js 24 LTS dan Git terpasang di Windows.
- Project Next.js dibuat lewat `create-next-app`.
- API key Gemini diambil dan dipasang di `.env.local`.
- Ketemu masalah PowerShell nolak menjalankan `npm`, dipecahkan dengan pindah ke Command Prompt.

### ✅ Tahap 1. Fondasi Data
**Status:** Selesai

Menetapkan bentuk data sebelum menulis fitur, supaya semua bagian sepakat soal bentuk yang sama.

- Menulis kode untuk bentuk data hasil penentuan makna.
- Menulis kode untuk instruksi ke model dan skema JSON yang wajib dipatuhi.

### ✅ Tahap 2. Penentu Makna
**Status:** Selesai

Bagian paling berisiko, jadi dikerjakan lebih dulu dan diuji tanpa tampilan sama sekali.

- Menulis kode untuk endpoint yang menerima foto dan daftar kata, lalu memanggil model.
- Menulis kode untuk pengecil foto di browser, dari 3 sampai 5 MB jadi di bawah 500 KB.
- Menulis kode untuk halaman uji yang cuma menampilkan JSON mentah.
- Menulis kode untuk pembanding beberapa model dengan foto yang sama.
- Menulis kode untuk batas pemakaian per hari, supaya tagihan API gak jebol.
- Menulis kode untuk rantai model cadangan, setelah model utama sempat kena `503` karena penuh.

### ✅ Tahap 3. Penyimpanan Lokal
**Status:** Selesai

Tanpa akun dan tanpa basis data server. Semua tersimpan di browser pengguna.

- Menulis kode untuk penyimpanan buku dan kata di browser.
- Menulis kode untuk tangga jadwal review 1, 3, 7, dan 21 hari.
- Menulis kode untuk jembatan antara React dan penyimpanan itu.

### ✅ Tahap 4. Layar Aslinya
**Status:** Selesai

Empat layar yang membentuk lingkaran utuh: foto, tandai, lihat makna, review.

- Menulis kode untuk layar kamera dan penandaan kata, termasuk mode tunda supaya bacaanmu gak dipotong.
- Menulis kode untuk kartu peta makna, lengkap dengan penyorotan kata pemicu.
- Menulis kode untuk layar koleksi kata per buku.
- Menulis kode untuk layar review dengan kalimat baru, bukan kalimat dari bukunya.
- Menulis kode untuk warna dan tema terang gelap.
- Menulis kode untuk keadaan kata tidak ketemu, plus penampil potongan teks yang terbaca dari foto.

### 🟡 Tahap 5. Uji Akurasi
**Status:** Sekarang

Ini giliranmu, bukan giliran saya. Tanpa angka dari sini, gak ada yang bisa ditulis di portfolio.

- Uji dengan 15 kata sulit dari buku asli, catat yang benar dan yang salah.
- Uji kata umum yang ambigu, lihat apakah penanda ragu menyala dengan tepat.
- Uji lingkaran penuh, termasuk review dan bertahannya data setelah refresh.
- Kumpulkan 40 kata dari Threads sebagai bahan uji tambahan.

### ⬜ Tahap 6. Poles dan Rilis
**Status:** Belum

- Rapikan desainnya, ini bagianmu.
- Hapus halaman uji dan tombol paksa jatuh tempo.
- Naikkan ke Vercel dan pasang batas pemakaian sungguhan.
- Uji kamera di Safari iPhone, ini wajib karena kamera butuh HTTPS.
- Rekam demo 20 detik dan posting.

---

## Bagian 03 — File yang Sudah Ditulis

Tiga belas file, semuanya di dalam:

```text
C:\Users\naufa\code\lema
```

Satu baris penjelasan per file.

### `lib/` — Logika, Tanpa Tampilan

#### `types.ts`
Bentuk data hasil penentuan makna. Jadi rujukan semua bagian lain.

#### `prompt.ts`
Instruksi lengkap ke model plus skema JSON yang wajib dipatuhi balasannya.

#### `image.ts`
Mengecilkan foto di browser sebelum dikirim, sisi terpanjang jadi 1600 piksel.

#### `store.ts`
Penyimpanan buku dan kata di browser, aturan tangga jadwal review, penanda riwayat kata yang pernah lolos review, dan angka ringkasan untuk beranda.

#### `useDb.ts`
Penghubung supaya layar React bisa membaca dan menulis ke penyimpanan itu.

### `app/api/` — Sisi Server, Tempat API Key Aman

#### `lookup/route.ts`
Endpoint utama. Terima foto dan kata, panggil model, validasi balasan, rantai cadangan, batas pemakaian.

#### `models/route.ts`
Alat bantu untuk melihat model apa saja yang tersedia bagi API key kamu.

### `app/` — Layar yang Dilihat Pengguna

#### `page.tsx`
Beranda. Ringkasan progres, aksi cepat, rak buku, dan kata terbaru. Kalau belum ada buku sama sekali, halaman ini langsung menanyakan judul bukunya.

#### `baca/page.tsx`
Layar foto. Pilih buku, foto halaman, tandai kata, lalu pilih langsung lihat makna atau simpan dan lanjut baca.

#### `kata/page.tsx`
Koleksi kata dikelompokkan per buku.

#### `review/page.tsx`
Review kata dalam kalimat baru, dengan tombol **Inget** dan **Lupa**.

#### `lab/page.tsx`
Halaman uji internal untuk membanding model. Nanti dihapus sebelum rilis.

#### `layout.tsx`
Kerangka umum semua halaman, judul, dan deskripsi.

#### `globals.css`
Warna dasar, dan penyesuaian tema terang serta gelap.

### `components/` — Bagian Tampilan yang Dipakai Berulang

#### `SenseMap.tsx`
Kartu peta makna. Kalimat asal, kata pemicu yang disorot, makna terpakai, angka keyakinan, kotak hati-hati, dan daftar makna lain.

#### `Nav.tsx`
Navigasi utama empat tujuan, lengkap dengan penghitung kata yang diproses dan yang jatuh tempo. Satu elemen yang berubah bentuk: bilah bawah di HP, sidebar kiri di laptop.

#### `Shell.tsx`
Memutuskan kapan navigasi pantas muncul, lalu memberi isi halaman ruang yang sesuai: penahan tinggi di HP, jarak kiri di laptop.

#### `BookPicker.tsx`
Pemilih buku. Dipakai beranda saat pengguna belum punya buku, dan layar foto saat menekan Ganti.

#### `BookSpine.tsx`
Punggung buku berwarna. Warnanya diturunkan dari judul, jadi satu buku selalu punya warna yang sama.

#### `ui.tsx`
Lencana status, judul bagian, dan batang kemajuan yang dipakai lebih dari satu layar.

#### `DbProvider.tsx`
Pengelola koleksi untuk seluruh halaman, sekaligus pemberitahuan saat penyimpanan browser bermasalah.

---

## Bagian 04 — Cara Saya Melapor Mulai Sekarang

Tiap kali saya menulis kode, saya sebut bagiannya dengan kalimat sederhana sebelum mulai, bukan cuma menunjukkan hasilnya.

Contoh:

> Saya menulis kode untuk layar review.

> Saya mengubah kode di bagian penentu makna, supaya berani mengaku waktu katanya tidak ketemu.

Kalau saya lupa dan kamu kehilangan jejak lagi, tegur saja. Kamu yang akan mempertanggungjawabkan kode ini di wawancara nanti, jadi kamu harus tahu isinya.
