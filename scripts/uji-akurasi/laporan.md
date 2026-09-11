# Laporan Uji Akurasi Lema

Dijalankan 2026-09-11 lewat `/api/lookup` yang sama dengan produksi (prompt, rantai model, validasi), dari server lokal. Kunci jawaban di-commit **sebelum** model dijalankan: commit `8842095`. Laporan ini dibuat otomatis oleh `scripts/uji-akurasi/nilai.mjs`.

## Ringkasan

| Yang diuji | Hasil |
|---|---|
| **Kelompok A** — kata sulit dari buku Inggris asli (Project Gutenberg) | **15 dari 15 benar** (100%) |
| Kelompok B — kata umum yang menjebak, kalimat ditulis sendiri | 15 dari 15 benar (100%) |
| Kelompok C — kalimat yang memang ambigu | 1 dari 1 ditandai ragu dengan jujur |
| **Mode tandai** — kata yang ditemukan dari oval dan garis pensil | **12 dari 12**, dengan 0 kata tambahan yang tidak ditandai |
| Mode tandai — makna yang benar | 12 dari 12 |
| **Keandalan** — permintaan yang terjawab pada percobaan pertama | **14 dari 20** (70%); sisanya terjawab saat diulang |
| Waktu tunggu per halaman yang berhasil | median 28,2 dtk, tercepat 6,6 dtk, terlama 46,4 dtk |

Kriteria PRD bagian 12 nomor 1 (minimal 12 dari 15 kata buku asli benar) **terpenuhi pada uji ini**. Kriteria nomor 2 memakai pengganti, lihat keterbatasan di bawah.

## Keterbatasan yang harus dibaca bersama angkanya

1. **Teks kelompok A sangat terkenal.** Pride and Prejudice dan Sherlock Holmes hampir pasti ada di data latih model, lengkap dengan penjelasan kata kata sulitnya di edisi beranotasi. Buku modern yang kurang terkenal kemungkinan lebih sulit. Angka 100% adalah batas atas, bukan perkiraan untuk semua buku.
2. **Halaman dirender, bukan difoto.** Tidak ada buram, pantulan cahaya, halaman melengkung, bayangan jari, atau huruf kecil. Garis pensilnya juga lebih rapi daripada coretan sungguhan. Foto dari HP akan lebih sulit.
3. **Kelompok B ditulis sendiri** sebagai pengganti kumpulan kata dari Threads, yang tidak tersedia. Penulis kalimatnya juga penulis kuncinya, dan konteksnya cenderung jelas. Dilaporkan terpisah dari kelompok A karena itu.
4. **Satu penilai.** Penilaian dilakukan oleh Claude terhadap kunci yang dikunci lebih dulu. Semua jawaban mentah model ada di tabel di bawah dan di `hasil.json`, supaya bisa diperiksa ulang.
5. **Jumlahnya kecil**: 31 kata dan 5 halaman mode tandai.
6. **Tingkat berpikir model `low`**, sesuai pengaturan produksi.

## Temuan terpenting: keandalan, bukan akurasi

Makna yang dipilih hampir tidak pernah salah. Yang bermasalah adalah **model sedang kelebihan beban**: 6 dari 20 permintaan gagal pada percobaan pertama karena semua model yang sempat dicoba menggantung atau menolak dalam anggaran 50 detik.

| Model | Dicoba | Berhasil | Menggantung (20 dtk) | Menolak (503) |
|---|---|---|---|---|
| gemini-3.6-flash | 26 | 4 | 12 | 10 |
| gemini-3.8-flash | 22 | 3 | 7 | 12 |
| gemini-3.5-flash | 19 | 12 | 5 | 2 |
| gemini-3.1-flash-lite | 1 | 1 | 0 | 0 |

Model yang akhirnya menjawab: gemini-3.8-flash 3×, gemini-3.6-flash 4×, gemini-3.5-flash 12×, gemini-3.1-flash-lite 1×. Percobaan yang berhasil sendiri memakan 6,4 dtk sampai 19,3 dtk; waktu tunggu yang panjang hampir seluruhnya berasal dari menunggu model yang menggantung.

`gemini-3.1-flash-lite` hanya sempat dicoba 1 kali, karena dua model pertama sering menghabiskan 20 + 20 detik dan anggaran habis sebelum gilirannya. Sebagian kegagalan di atas disebabkan oleh susunan rantai itu, bukan hanya oleh kelebihan beban.

Sebaran waktu dari 20 halaman yang berhasil: 2 selesai dalam 10 detik, 8 dalam 20 detik, 10 dalam 30 detik, 10 lebih dari 30 detik.

## Hasil per kata, mode ketik

| Klp | Kata | Makna yang benar | Jebakan | Jawaban model | Nilai | Catatan |
|---|---|---|---|---|---|---|
| A | **want** | kekurangan / membutuhkan | ingin, mau | kebutuhan atau kekurangan akan sesuatu | benar | kekurangan / kebutuhan, bukan ingin |
| A | **tolerable** | lumayan, biasa saja | dapat ditoleransi atau ditahan | lumayan / biasa saja | benar | lumayan / biasa saja |
| A | **humour** | suasana hati | humor, lelucon | suasana hati / mood | benar | suasana hati, bukan humor |
| A | **consequence** | arti penting, gengsi | akibat | perhatian / kedudukan penting | benar | PERBATASAN: bahasa Indonesianya 'perhatian / kedudukan penting'; 'perhatian' agak melenceng, tetapi 'kedudukan penting' dan penjelasan Inggrisnya ('importance, distinction, or social standing') tepat |
| A | **sensible** | menyadari, menghargai | masuk akal, bijaksana | sadar atau menyadari sepenuhnya | benar | menyadari, bukan masuk akal |
| A | **condescension** | kemurahan hati orang berkedudukan tinggi | sikap merendahkan orang lain | keramahan dari orang yang kedudukannya lebih tinggi kepada bawahannya tanpa merasa gengsi | benar | keramahan orang berkedudukan tinggi kepada bawahannya; penjelasan Inggrisnya menyebut bahwa di masa itu sifat ini dipandang positif |
| A | **engaged** | berjanji, menyanggupi | bertunangan, sibuk | berjanji atau menyanggupi | benar | berjanji, bukan bertunangan |
| A | **fancy** | kira, rasa | suka, mewah | dikira, diperkirakan, atau menurut dugaan saya | benar | mengira, bukan suka |
| A | **practice** | praktik dokter | latihan | praktik kerja profesional (khususnya dokter atau pengacara) | benar | praktik profesional dokter |
| A | **harness** | kembali bekerja rutin | tali kekang kuda | kembali bekerja rutin atau bertugas lagi | benar | dikenali sebagai ungkapan 'go into harness': kembali bekerja rutin |
| A | **singular** | aneh, luar biasa | tunggal | Sangat aneh, tidak biasa, atau luar biasa | benar | aneh, luar biasa, bukan tunggal |
| A | **presently** | sebentar lagi | sekarang, saat ini | sebentar lagi | benar | sebentar lagi, bukan sekarang |
| A | **countenance** | raut wajah | dukungan, restu | ekspresi wajah atau rupa muka seseorang | benar | raut wajah, bukan dukungan |
| A | **curious** | aneh | ingin tahu | aneh atau tidak biasa | benar | aneh, bukan ingin tahu |
| A | **hands** | awak kapal | tangan | awak/anggota kru kapal | benar | awak kapal, bukan tangan |
| B | **still** | tenang, tidak bergerak | masih | tenang atau tidak bergerak | benar | tenang, bukan masih |
| B | **spare** | luang | cadangan | luang atau sisa waktu | benar | luang |
| B | **make out** | melihat samar samar | berciuman | melihat atau mengenali sesuatu dengan samar | benar | melihat samar samar |
| B | **bank** | tepi danau | bank, lembaga keuangan | tepi sungai atau tepi danau | benar | tepi danau |
| B | **runs** | mengelola | berlari | mengelola atau menjalankan bisnis | benar | mengelola |
| B | **figured** | mengira | menggambar, tokoh | menduga atau mengira | benar | mengira |
| B | **mean** | rata rata | jahat, berarti | rata-rata | benar | rata rata |
| B | **sound** | masuk akal, kuat | suara | logis, benar, atau masuk akal | benar | masuk akal |
| B | **put up with** | menahan, menoleransi | memasang | bertahan menghadapi atau menoleransi | benar | menoleransi |
| B | **bear** | tahan | beruang | menahan atau menanggung beban atau penderitaan | benar | menanggung, menahan |
| B | **fine** | denda | baik, bagus | denda | benar | denda |
| B | **fair** | pasar malam, pameran | adil | pekan raya / pasar malam | benar | pekan raya / pasar malam |
| B | **close call** | nyaris celaka | panggilan dekat | nyaris celaka / hampir terlambat | benar | nyaris celaka; tambahan 'hampir terlambat' sesuai konteks kereta |
| B | **picked up** | mempelajari tanpa sengaja | mengambil, menjemput | belajar secara tidak sengaja / otodidak | benar | belajar tanpa sengaja |
| B | **rather** | lebih suka | agak | lebih memilih / lebih suka | benar | lebih suka |
| C | **duck** | ambigu: bebek, atau menunduk | memilih satu makna dengan yakin | merunduk atau menghindar dengan cepat ‖ bebek (hewan) *(ragu)* | ragu-tepat | ditandai ragu, dua kandidat masing masing 0,5: merunduk dan bebek |

## Hasil mode tandai

| Halaman | Yang ditandai | Yang ditemukan | Tepat | Tambahan | Makna benar | Tidak ditandai, tidak diambil |
|---|---|---|---|---|---|---|
| M-darcy-oval | tolerable (oval), humour (oval), consequence (oval) | tolerable, humour, consequence | 3/3 | 0 | 3/3 | - |
| M-holmes-oval | fancy (oval), practice (oval), harness (oval) | fancy, practice, go into harness | 3/3 | 0 | 3/3 | - |
| M-lake-pensil | still (pensil), make out (pensil), bank (pensil) | still, make out, bank | 3/3 | 0 | 3/3 | spare, runs |
| M-want-pensil | want (pensil) | want | 1/1 | 0 | 1/1 | - |
| M-trip-campur | fine (pensil), rather (oval) | fine, rather | 2/2 | 0 | 2/2 | fair, close call, picked up |

Yang paling penting dari tabel ini adalah kolom terakhir. Di halaman danau, "spare" dan "runs" ada di halaman yang sama dengan kata yang digaris bawahi, dan model tidak mengambilnya. Aturan "jangan menambahkan kata yang tidak ditandai" dipatuhi di kelima halaman.

## Sumber teks

- Pride and Prejudice, Jane Austen, Project Gutenberg #1342
- The Adventures of Sherlock Holmes, Arthur Conan Doyle, Project Gutenberg #1661
- Frankenstein, Mary Shelley, Project Gutenberg #84
- Alice's Adventures in Wonderland, Lewis Carroll, Project Gutenberg #11
- Moby Dick, Herman Melville, Project Gutenberg #2701

## Mengulang uji ini

```bash
# 1. Unduh teks Gutenberg ke satu folder: pride.txt (1342), holmes.txt (1661),
#    frankenstein.txt (84), alice.txt (11), mobydick.txt (2701)
node scripts/uji-akurasi/susun-kasus.mjs <folder teks>
# 2. Jalankan server produksi lokal dengan batas harian dilonggarkan
npm run build
DAILY_LOOKUP_LIMIT=1000 npx next start --port 3300
# 3. Jalankan uji, ulangi yang gagal, lalu hitung
node scripts/uji-akurasi/jalankan.mjs http://127.0.0.1:3300
ULANG=<id yang gagal, dipisah koma> node scripts/uji-akurasi/jalankan.mjs http://127.0.0.1:3300
node scripts/uji-akurasi/nilai.mjs
```
