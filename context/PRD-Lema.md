# PRD Lema v1.1

Dokumen ini menggambarkan Lema **seperti yang benar benar dibangun dan hidup** di `lema-lemon.vercel.app`, bukan rancangan awalnya. Versi pertama dokumen ini (v1, 7 September 2026) adalah spesifikasi build tiga hari; selama pengerjaan, sebagian keputusannya diubah setelah aplikasinya dicoba. Apa yang berubah dan alasannya dicatat di bagian 17.

Status: v1 hidup di produksi. Fitur terakhir naik 11 September 2026.
Batas kirim portfolio: 12 September 2026
Versi rancangan awal: riwayat git, misalnya `git show v1-sebelum-tandai-foto:context/PRD-Lema.md`

---

## 1. Ringkasan

Lema membantu orang Indonesia yang belajar bahasa Inggris lewat **buku kertas** memahami kata yang maknanya bergantung pada konteks, tanpa harus mengetik. Pembaca memotret halaman yang sedang dibaca, lalu menandai kata yang membuatnya berhenti: mengetuknya langsung di foto, atau cukup menggaris bawahinya dengan pensil di buku sebelum difoto. Lema menentukan makna yang dipakai **di halaman itu**, menunjukkan petunjuk di kalimat yang menentukannya, menyimpannya ke koleksi per buku, lalu menguji ingatan pembaca lewat review berjarak dan kuis yang pengecohnya adalah makna lain dari kata yang sama.

Kalimat pembeda: **kamus memberimu semua arti; Lema memberimu arti yang dipakai di halamanmu, lalu memastikan kamu tidak perlu mencarinya dua kali.**

---

## 2. Masalah

### Lapis pertama, yang dirasakan pengguna

Berhenti itu mahal. Satu pencarian bukan cuma 40 detik, tapi juga fokus yang pecah. Dan sering kali setelah 40 detik itu pembacanya tetap tidak yakin, karena kamus dan penerjemah memberi makna yang lepas dari konteks. Bayar mahal, dapatnya "mungkin". Setelah itu terjadi enam kali dalam satu jam, bukunya ditutup.

### Lapis kedua, yang tidak disadari pengguna

Tidak ada yang menumpuk. Kata yang dicari hari ini hilang begitu saja, dan tiga bab kemudian dicari lagi. Selesai satu buku, 200 kata dicari dan mungkin 15 yang menempel.

### Lapis ketiga, yang ditemukan selama pengerjaan

Mengetik itu sendiri mahal. Pembaca sedang melihat katanya di kertas, lalu harus mengetiknya ulang huruf demi huruf, dan salah eja berujung pada jawaban "kata tidak ketemu di halaman". Padahal foto yang dikirim sudah memuat kata itu. Lapis ini tidak ada di rancangan awal; ditemukan saat aplikasinya dicoba di HP.

### Hierarki

Lapis pertama yang membuat orang membuka aplikasi. Lapis kedua yang membuat aplikasi ini pantas ada. Lapis ketiga yang menentukan apakah orang mau membukanya lagi besok. Kalau harus memilih satu untuk dikorbankan, korbankan kecepatan, jangan korbankan penyimpanan.

---

## 3. Pengguna sasaran

**Utama.** Mahasiswa atau pekerja muda Indonesia, umur 18 sampai 27, level Inggris menengah. Sudah bisa baca tapi pelan. Membaca buku fisik atau PDF karena pilihan sendiri, bukan tugas. Motivasi tinggi di awal, angka berhenti juga tinggi.

**Bukan sasaran v1.** Pemula total yang belum bisa baca kalimat sederhana, penerjemah profesional, dan pelajar yang butuh persiapan tes terstruktur.

---

## 4. Kenapa bukan yang sudah ada

| Alat | Yang dia lakukan | Batasnya |
|---|---|---|
| Google Translate | Makna kamus, cepat, gratis | Lepas konteks, sering salah pilih makna, tidak menyimpan apa apa |
| ChatGPT atau Claude | Penjelasan kontekstual yang bagus | Butuh prompt tiap kali, dan chat adalah aliran yang tidak pernah dibuka lagi. Tidak ada yang menagih balik |
| Readlang, LingQ | Klik kata di teks digital, penjelasan sadar konteks, spaced repetition | Wajib teks digital. Pembaca buku kertas tidak punya jalan |
| Kindle Vocabulary Builder | Tap kata sambil baca, tersimpan otomatis, jadi flashcard | Hanya di dalam ekosistem Kindle, dan reviewnya memakai kalimat asli yang sama |

Klaim Lema tetap satu, dan jangan diperlebar: **buku kertas, dan bahasa Indonesia sebagai bahasa penjelas.** Menandai kata dengan pensil lalu memotretnya belakangan memperkuat klaim itu, karena tidak ada alat di atas yang bisa membaca coretan di buku.

---

## 5. Prinsip produk

Enam aturan ini yang dipakai untuk menyelesaikan perdebatan desain. Prinsip 1 diubah dari rancangan awal, prinsip 5 dan 6 ditambahkan selama pengerjaan.

1. **Pembaca yang memilih kapan jawabannya muncul.** Tombol utama membuka makna saat itu juga, karena di uji pertama pembaca justru ingin langsung paham. Jalan tunda tetap ada dan tetap setara: "Simpan, lanjut baca", atau menggaris bawahi dengan pensil dan memotretnya di akhir bab. *Rancangan awal berbunyi "baca dulu, jawab belakangan", dengan jawaban ditunda sebagai bawaan.*
2. **Ajari cara menebak, bukan cuma kasih jawaban.** Setiap jawaban wajib menunjukkan kata pemicu di kalimat yang menentukan makna itu. Kuis melanjutkan prinsip ini: pengecohnya makna lain dari kata yang sama, jadi yang dilatih adalah memilih makna sesuai konteks.
3. **Ragu itu ditampilkan, bukan disembunyikan.** Percaya diri palsu adalah penyebab kebingungan yang mau dihilangkan. Kalau model tidak yakin, dua kandidat ditampilkan sejajar. Kata yang ditandai ragu tidak dijadikan soal kuis, karena memang tidak punya satu jawaban benar.
4. **Nol setup.** Tidak ada akun, tidak ada onboarding, tidak ada pemilihan level. Satu pertanyaan saja di awal: judul buku yang sedang dibaca.
5. **Jangan suruh pembaca mengetik kata yang sedang dilihatnya.** Foto sudah memuat katanya. Mengetik tetap tersedia sebagai jalan cadangan, bukan jalan utama.
6. **Klaim "sudah ingat" harus dibuktikan.** Tombol yang menaikkan jadwal review atau mengeluarkan kata dari review harus lolos kuis dulu. Jadwal berjarak hanya jujur kalau dasarnya jawaban yang diuji, bukan tombol yang ditekan.

---

## 6. Lingkup v1

### Masuk, dan sudah hidup

- Foto halaman dari kamera atau galeri, dikecilkan di browser sebelum dikirim
- **Tandai tanpa mengetik**: ketuk kata di foto (oval bernomor, paling banyak lima), atau garis bawahi pakai pensil di buku dan biarkan Lema mencari coretannya
- Ketik kata atau frasa sebagai jalan cadangan, paling banyak lima per halaman, frasa utuh seperti "in the long run" diperlakukan sebagai satu tandaan
- Makna langsung dibuka sebagai bawaan, jalan tunda tetap ada
- Peta makna: kalimat asal dengan kata ditebalkan, kata pemicu, alasan, makna lain, catatan hati hati, angka keyakinan, dan dua kandidat sejajar saat ragu
- Beranda berisi ringkasan progres, rak buku, dan kata terbaru
- Koleksi kata per buku sebagai daftar ringkas yang dibuka satu per satu
- Review berjarak dengan kalimat baru buatan model, tangga 1, 3, 7, 21 hari
- **Kuis** dengan dua fungsi: gerbang sebelum klaim "sudah ingat", dan tab sendiri dari semua buku
- Mode latihan kapan saja, tanpa menggeser jadwal
- Tampilan responsif: bilah bawah di HP, sidebar kiri di laptop

### Keluar, dan jangan diributkan lagi

Akun dan login, sinkron antar perangkat, audio dan pelafalan, mode sosial atau papan peringkat, penjelasan kalimat utuh, dukungan bahasa selain Inggris ke Indonesia, aplikasi native iOS.

### Yang pindah dari "keluar" ke "masuk", dan kenapa

- **Kuis pilihan ganda.** Rancangan awal mengeluarkannya karena takut lingkup melebar. Masuk kembali setelah jelas bentuknya bisa melayani prinsip 2: pengecoh diambil dari makna lain kata yang sama, tanpa panggilan model tambahan, jadi yang dilatih tetap pemilihan makna sesuai konteks, bukan hafalan arti.
- **Menandai langsung di atas gambar.** Rancangan awal mengeluarkannya karena membayangkan pengenalan teks dengan kotak koordinat per kata. Yang dibangun tidak memakai itu sama sekali: aplikasi menggambar oval magenta di titik yang diketuk, dan model yang membaca kata di dalam oval.

---

## 7. Alur utama

1. Pengguna membuka Lema dan melihat beranda: berapa kata terkumpul, berapa yang jatuh tempo, buku apa saja.
2. Tab Baca, lalu foto halaman buku. Kalau sudah menggaris bawahi dengan pensil, langsung simpan.
3. Kalau belum, ketuk kata yang bikin berhenti di foto. Muncul oval bernomor.
4. "Simpan & lihat makna" membuka peta makna seketika; maknanya terisi begitu model selesai membaca halaman. "Simpan, lanjut baca" menyimpan tanpa membuka apa pun.
5. Kata tersimpan di koleksi buku itu.
6. Saat kata jatuh tempo, review menampilkan kalimat baru. Pengguna memilih lupa atau ingat; ingat harus dibuktikan lewat kuis.
7. Kapan saja, tab Kuis menguji kata dari semua buku tanpa menggeser jadwal.

Jumlah ketukan dari membuka aplikasi sampai makna tersimpan, dengan coretan pensil: tab Baca, bidang foto, pilihan kamera di iOS, jepret, pakai foto, simpan. **Enam ketukan, tanpa mengetik.** Target rancangan awal empat ketukan belum tercapai; dua langkah pertama bisa hilang dengan aplikasi yang dipasang di layar HP dan kamera yang terbuka langsung (bagian 15).

---

## 8. Spesifikasi layar

Navigasi utama punya lima tujuan: Beranda, Baca, Kata, Review, Kuis. Di HP berupa bilah tetap di tepi bawah dengan penghitung kata yang diproses dan yang jatuh tempo; mulai lebar 1.024 piksel berupa sidebar kiri yang juga memuat rak buku. Navigasi disembunyikan sampai pengguna punya buku pertama.

### 8.1 Beranda (`/`)

Pengguna baru langsung ditanya judul buku. Sesudahnya: empat angka ringkasan (kata terkumpul, siap dibaca, jatuh tempo, lolos review), tombol besar ke layar foto, pintasan review saat ada yang jatuh tempo, pintasan latihan, keterangan kata yang sedang diproses atau gagal, rak buku dengan persen kemajuan, dan kata terbaru. Kemajuan buku diukur dari kata yang pernah lolos review, bukan dari kata yang maknanya sudah ada.

### 8.2 Baca (`/baca`)

Kartu buku yang sedang dibaca dengan tombol "Ganti buku". Bidang foto, keterangan privasi, lalu pilihan cara menandai: **Tandai di foto** (bawaan) atau **Ketik kata**. Pilihan terakhir diingat di browser.

- Tandai di foto: foto tampil utuh dan bisa diketuk. Setiap ketukan menaruh oval magenta bernomor, lebar 10% dan tinggi 4,4% lebar foto, ukuran yang sama persis dengan yang digambar ke foto sebelum dikirim. Ketuk ovalnya lagi untuk menghapus. Tanpa satu ketukan pun, layar menjelaskan bahwa Lema akan mencari coretan pensil atau stabilo.
- Ketik kata: kata atau frasa, paling banyak lima, masing masing paling panjang 60 karakter. Teks sepanjang kalimat ditolak dengan penjelasan, karena prompt dirancang untuk memilih makna, bukan menjelaskan kalimat.
- Tombol utama "Simpan & lihat makna", tombol kedua "Simpan, lanjut baca".

### 8.3 Peta makna

Layar paling penting, dan yang jadi tangkapan layar utama di portfolio. Urutan dari atas:

- Kata, bentuk dasarnya, dan penanda frasa
- Kalimat asal dari halaman, kata yang ditanyakan ditebalkan dan kata pemicu disorot
- Makna yang terpakai dalam Bahasa Indonesia, besar, dengan angka keyakinan
- Kata pemicu dan satu kalimat alasan
- Catatan hati hati kalau kata ini lebih sering dipakai dengan makna lain
- Makna lain kata tersebut, lebih kecil dan redup
- Kalau model ragu: dua kandidat sejajar, masing masing dengan pemicu, alasan, dan keyakinannya sendiri
- Kalau kata tidak ditemukan di halaman: dikatakan terang terangan, disertai potongan teks yang terbaca dari foto
- Tombol "Aku udah tahu kata ini", dijaga kuis

### 8.4 Koleksi (`/kata`)

Daftar ringkas per buku: satu baris berisi kata dan arti singkatnya, dengan penanda "Ragu", "Tidak ketemu di halaman", atau "Sudah tahu". Kartu makna penuh baru digambar setelah barisnya diketuk. Penyaring: semua, siap dibaca, diproses, gagal, sudah tahu. `?buku=<id>` menyaring ke satu buku, dibuka dari rak buku di beranda atau sidebar. `?entry=<id>` membuka kata tertentu dalam keadaan terbuka, termasuk semua kata hasil satu foto mode tandai.

### 8.5 Review (`/review`)

Muncul sebagai pintasan saat ada kata jatuh tempo. Kalimat baru buatan model ditampilkan dengan kata sasaran ditebalkan, maknanya belum terlihat. Tiga pilihan:

- **Lupa**: makna dan kalimat asal dari buku langsung dibuka, jadwal kembali ke anak tangga pertama.
- **Inget**: kuis dulu. Benar berarti naik satu anak tangga dan tercatat pernah lolos review; salah dihitung lupa.
- **Udah hafal, stop tanya**: kuis dulu. Benar berarti kata dikeluarkan dari review; salah dihitung lupa.

Tangga tetap 1, 3, 7, 21 hari. Riwayat "pernah lolos review" hanya pernah berubah dari tidak ke ya, jadi jawaban lupa di kemudian hari tidak menghapusnya.

`?latihan=1` (dan opsional `&buku=<id>`) membuka mode latihan: kata mana pun yang sudah punya makna, tanpa menunggu jatuh tempo, dan tanpa menulis jadwal maupun riwayat.

### 8.6 Kuis (`/kuis`)

Satu sesi paling banyak sepuluh soal dari semua buku dan semua jadwal, termasuk kata yang sudah ditandai tahu. Soal berupa kalimat baru dengan empat pilihan makna; pengecoh diambil lebih dulu dari makna lain kata yang sama, sisanya dari arti kata lain di koleksi. Setelah menjawab: jawaban benar hijau, pilihan salah merah, lalu makna dalam bahasa Inggris dan kalimat asal dari buku. Akhir sesi menampilkan skor dan kata yang terlewat, masing masing bertaut ke kartunya. Tab ini tidak mengubah jadwal.

---

## 9. Kontrak data

### 9.1 Permintaan ke `POST /api/lookup`

Multipart form. Dua bentuk:

- Mode ketik: `image` (JPEG), `words` (JSON array, 1 sampai 5 kata atau frasa)
- Mode tandai: `image` (JPEG, sudah digambari oval kalau ada), `mode=marked`, `markers` (jumlah oval, 0 sampai 5; 0 berarti cari coretan pensil saja)

Balasan berhasil: `{ ok: true, model, fellBack, results, used, limit, ms }`. Balasan gagal: `{ ok: false, error, status }` dengan pesan yang bisa dibaca pengguna.

### 9.2 Satu hasil makna

```json
{
  "word": "made out",
  "lemma": "make out",
  "is_phrase": true,
  "found": true,
  "page_excerpt": "She made out the shape of a house in the fog.",
  "sentence": "She made out the shape of a house in the fog.",
  "ambiguous": false,
  "candidates": [
    {
      "meaning_id": "berhasil melihat atau mengenali sesuatu yang samar",
      "meaning_en": "to manage to see something with difficulty",
      "confidence": 0.86,
      "trigger": "in the fog",
      "why_id": "Frasa 'in the fog' menandakan penglihatan yang terhalang, jadi maknanya soal berusaha melihat."
    }
  ],
  "other_senses": [
    { "meaning_id": "berciuman", "meaning_en": "to kiss passionately" },
    { "meaning_id": "menulis atau mengisi dokumen", "meaning_en": "to write out a document" }
  ],
  "caution_id": "Di percakapan sehari hari, 'make out' jauh lebih sering berarti berciuman.",
  "new_sentence": "Through the heavy rain, he could barely make out the road ahead."
}
```

Aturan: `ambiguous: true` berarti `candidates` berisi dua entri. `found: false` berarti kata tidak ada di halaman; maknanya kamus umum dengan keyakinan paling tinggi 0,3, dan `page_excerpt` menunjukkan apa yang terbaca dari foto. *Rancangan awal memakai `applied_sense` dan `alternative_sense`; bentuk `candidates[]` dipakai sejak implementasi pertama.*

### 9.3 Penyimpanan lokal

Satu kunci `lema.v1` di `localStorage`. Tidak ada basis data server dan tidak ada akun; koleksi hanya ada di browser itu.

```json
{
  "books": [{ "id": "b1", "title": "Sapiens", "createdAt": 0 }],
  "activeBookId": "b1",
  "entries": [
    {
      "id": "e1",
      "bookId": "b1",
      "word": "made out",
      "status": "done",
      "result": {},
      "known": false,
      "stage": 0,
      "dueAt": 0,
      "createdAt": 0,
      "passedReview": true,
      "batch": "e0",
      "marked": true
    }
  ]
}
```

`status` bernilai `pending`, `done`, atau `error`. `stage` adalah indeks tangga review. `passedReview` dicatat sejak 9 September; entri lama tanpa kolom ini dihitung belum pernah lolos, bukan ditebak. `batch` dan `marked` hanya ada pada kata dari mode tandai: semua kata dari satu foto berbagi `batch`. Entri yang masih `pending` saat aplikasi dimuat ulang diubah menjadi `error` yang bisa dikirim ulang, karena fotonya tidak ikut disimpan.

---

## 10. Spesifikasi prompt

Satu panggilan ke model yang bisa membaca gambar per foto, tanpa pengenalan teks terpisah. Dua mode memakai aturan makna yang sama persis; yang berbeda hanya cara kata dipilih.

Aturan bersama:

- Baca halaman sebagai konteks utuh, bukan hanya kalimat tempat katanya muncul
- Tentukan makna yang benar benar dipakai di halaman ini, dan sebutkan kata pemicunya
- Kalau dua makna sama masuk akalnya, set `ambiguous` dan isi keduanya. Jangan memaksakan satu jawaban
- Semua penjelasan dalam Bahasa Indonesia sederhana, tanpa istilah linguistik
- Buat satu kalimat contoh baru dengan makna yang sama dan topik berbeda, di panggilan yang sama
- Kalau kata tidak ada di halaman, katakan; jangan berpura pura
- Balas hanya JSON sesuai skema

Mode tandai menambahkan: temukan kata yang ditandai pembaca, baik coretan tangan (garis bawah, lingkaran, stabilo) maupun oval magenta bernomor dari aplikasi; jangan menambahkan kata yang tidak ditandai; urutkan sesuai urutan baca, paling banyak lima; daftar kosong adalah jawaban sah kalau tidak ada tanda.

Tingkat berpikir model diatur `low`. Pada pengukuran 10 September, tingkat bawaan membuat 83% keluaran habis untuk berpikir: 3.234 token berpikir untuk 677 token jawaban, 21 detik. Bisa dinaikkan lewat `GEMINI_THINKING_LEVEL` tanpa mengubah kode.

---

## 11. Non-fungsional

- **Kunci API hanya di server.** Semua panggilan lewat satu route handler. Diperiksa pada bundle produksi: nol kemunculan kunci maupun alamat API di berkas yang dikirim ke browser. Alat internal `/lab` dan `/api/models` membalas 404 di produksi.
- **Batas pemakaian.** Dihitung per kata, bukan per permintaan: 60 kata per alamat per hari. Mode tandai memesan lima lalu mengembalikan sisanya; foto tanpa tanda tetap dihitung satu. Kegagalan total mengembalikan jatah. Penghitung bersama lewat Upstash tersedia tetapi belum diuji terhadap layanan sungguhan; tanpa itu, hitungannya per proses server.
- **Waktu tanggap.** Model utama dan tiga model cadangan dicoba berurutan. Setiap model paling lama 20 detik, seluruh rantai paling lama 50 detik, di bawah batas fungsi 60 detik. Hasil pengukuran ada di bagian 13. Pindah layar tidak menunggu model: peta makna terbuka seketika dan terisi sendiri.
- **Ukuran foto.** Dikecilkan di browser, sisi terpanjang paling besar 1.600 piksel.
- **Privasi.** Layar foto menyatakan bahwa foto dikirim ke Google agar model bisa membaca halaman, bahwa Lema tidak menyimpan foto itu, dan bahwa koleksi hanya ada di browser. Perlakuan data di sisi penyedia model sengaja tidak diklaim.
- **Safari iOS.** Wajib, dan **belum diuji di perangkat sungguhan**. Seluruh pemeriksaan tampilan memakai Chromium yang meniru lebar HP.

---

## 12. Kriteria selesai

| # | Kriteria | Status per 11 September |
|---|---|---|
| 1 | 15 kata sulit dari buku Inggris asli, minimal 12 benar | **Terpenuhi pada uji otomatis: 15 dari 15.** Teks dari lima buku bebas hak cipta, kunci jawaban dikunci sebelum model dijalankan. Batasnya: teks sangat terkenal, dan halaman dirender, bukan difoto (bagian 13) |
| 2 | Minimal 15 kata dari Threads, dicatat apa adanya | **Pengganti: 15 dari 15** pada 15 kata umum yang menjebak dalam kalimat yang ditulis sendiri. Kumpulan kata dari Threads belum ada |
| 3 | Dari buka aplikasi sampai kembali membaca, maksimal empat ketukan | Belum. Enam ketukan tanpa mengetik (bagian 7) |
| 4 | Review memunculkan kalimat yang berbeda dari kalimat asal | Terpenuhi. `new_sentence` dibuat di panggilan yang sama, diuji otomatis |
| 5 | Tidak ada kunci API di bundle browser | Terpenuhi. Diperiksa pada bundle produksi 8 September |
| 6 | Berjalan di Safari iOS dengan kamera sungguhan | **Belum diuji** |
| 7 | Batas pemakaian aktif dan sudah diuji | Terpenuhi untuk hitungan per proses. Penghitung bersama belum diuji ke layanan sungguhan |

Di luar tabel: 71 pengujian browser otomatis lulus pada build produksi, mencakup alur penyimpanan, peta makna, mode tandai, kuis, dan batas waktu rantai model.

---

## 13. Metrik

### Yang sudah diukur

Uji akurasi otomatis 11 September, lewat `/api/lookup` yang sama dengan produksi. Rincian, keterbatasan, dan semua jawaban mentah model ada di `scripts/uji-akurasi/laporan.md`; uji ini bisa diulang dengan satu perintah.

| Metrik | Hasil |
|---|---|
| Ketepatan makna, kata sulit dari buku asli | **15 dari 15** (Pride and Prejudice, Sherlock Holmes, Frankenstein, Alice, Moby Dick) |
| Ketepatan makna, kata umum yang menjebak | 15 dari 15 |
| Model mengaku ragu pada kalimat yang memang ambigu | 1 dari 1 |
| Mode tandai: kata yang ditemukan dari oval dan garis pensil | **12 dari 12**, tanpa satu pun kata tambahan yang tidak ditandai |
| Mode tandai: makna yang benar | 12 dari 12 |
| Permintaan yang terjawab pada percobaan pertama | **14 dari 20 (70%)**; enam sisanya terjawab saat diulang |
| Waktu tunggu per halaman | median **28,2 detik**; hanya 2 dari 20 selesai dalam 10 detik |

Membaca angka ini: **ketepatan makna bukan masalahnya; ketersediaan model yang masalah.** Pada sore yang sama, `gemini-3.6-flash` hanya berhasil 4 dari 26 percobaan dan `gemini-3.8-flash` 3 dari 22, sedangkan `gemini-3.5-flash` berhasil 12 dari 19. Percobaan yang berhasil sendiri memakan 6 sampai 19 detik; sisa waktunya habis menunggu model yang menggantung.

Ketepatan 100% di atas adalah batas atas. Teks buku yang dipakai sangat terkenal dan kemungkinan ada di data latih model, dan halaman dirender tanpa buram, pantulan cahaya, atau lengkungan kertas. Uji dengan foto buku modern dari HP masih diperlukan sebelum angka ini dipakai sebagai klaim umum.

### Yang belum bisa diukur

Aplikasi tidak mengumpulkan data kunjungan dan tidak punya server basis data, jadi jumlah pengguna, persentase yang kembali di hari kedua, dan persentase kata yang lolos review pertama **tidak bisa dihitung lintas pengguna**. Angka per pengguna tersedia di beranda masing masing (kata terkumpul, lolos review). Menambah pencatatan kunjungan adalah keputusan terpisah yang menyangkut privasi.

---

## 14. Risiko

| Risiko | Kemungkinan | Penanganan |
|---|---|---|
| Model salah pilih makna pada kata yang jarang | Tinggi, dan ini memang temuan riset | Tidak disembunyikan. Keraguan ditampilkan; hasil uji akurasi ditulis apa adanya |
| Model kelebihan beban dan menggantung | **Terjadi.** Pada uji 11 September, 6 dari 20 permintaan gagal pada percobaan pertama | Batas waktu per model dan rantai cadangan. Model utama diarahkan ke yang terbukti paling andal lewat `GEMINI_MODEL`. Susunan rantai perlu diperbaiki: model paling ringan sering tidak kebagian giliran sebelum anggaran 50 detik habis (bagian 15) |
| Mengetuk kata di foto satu halaman penuh sulit di HP | Sedang; huruf tinggal 5 sampai 10 piksel di layar 390 piksel | Petunjuk memotret dari dekat. Jalur pensil tidak punya masalah ini. Perbesaran foto ada di peta jalan |
| Coretan yang menyentuh dua kata dibaca tidak konsisten | Sedang; pada uji tiruan satu garis dibaca "Still" dua kali dan "heather" sekali | Dicatat. Petunjuk di layar meminta menggaris bawahi satu kata atau frasa |
| Pengecoh kuis terlalu mirip dengan jawaban benar | Sedang | Bergantung pada daftar "makna lain" dari model. Belum diukur |
| Foto buram atau miring | Sedang | Model diminta mengembalikan potongan teks yang terbaca, dan layar mengatakan terang terangan kalau kata tidak ketemu |
| Biaya API melonjak kalau postingan ramai | Sedang | Batas per kata per hari. Pagar terakhir adalah kuota gratis penyedia, selama penagihan tidak diaktifkan |
| Lingkup melebar | Terjadi | Kuis dan tandai di foto masuk selama pengerjaan (bagian 6 dan 17). Daftar "keluar" yang tersisa tetap kontrak |

---

## 15. Peta jalan setelah v1

- **Rantai model berdasarkan data keandalan.** Pada uji 11 September, dua model pertama sering menghabiskan 20 + 20 detik sehingga `gemini-3.1-flash-lite` hanya sempat dicoba sekali, dan saat dicoba ia menjawab dalam 6 detik. Batas per model yang lebih pendek atau urutan yang menaruh model ringan lebih awal kemungkinan menurunkan kegagalan dan waktu tunggu. Perlu diukur dulu, bukan ditebak
- **Aplikasi yang bisa dipasang di layar HP**, terbuka langsung ke layar foto, dengan kamera belakang yang terbuka tanpa menu pilihan. Menghapus dua sampai tiga ketukan dan membawa alur ke target empat ketukan
- **Perbesaran di atas foto** supaya mengetuk kata di foto satu halaman penuh tetap tepat di HP
- **Review yang ditawarkan otomatis** saat aplikasi dibuka, dengan pilihan "nanti aja"
- **Validasi hasil model yang lebih ketat**: isi setiap kandidat, keyakinan, dan dua kandidat saat ragu
- **Peringatan halaman sulit**: sebelum membaca satu bab, tunjukkan kata yang kemungkinan di atas level pembacanya
- **Kartu kosakata buku**: saat buku selesai, satu kartu berisi semua kata dari buku itu, dirancang untuk dibagikan
- **Set uji publik**: kumpulan kata yang membuat pembaca Indonesia berhenti, dibuka untuk umum sebagai kontribusi kecil ke riset pemilihan makna kata
- Sinkron antar perangkat dan versi iOS native

---

## 16. Tumpukan teknologi

- Next.js 16 App Router dan React 19 di Vercel; satu route handler sebagai perantara model
- Tailwind CSS 4
- `localStorage` untuk data, tanpa basis data server
- Gemini API lewat HTTP biasa tanpa pustaka tambahan: model utama diatur `GEMINI_MODEL`, cadangan `gemini-3.8-flash`, `gemini-3.6-flash`, `gemini-3.5-flash`, `gemini-3.1-flash-lite`
- Upstash Redis REST, opsional, untuk penghitung batas pemakaian bersama
- Playwright untuk pengujian browser dan untuk uji akurasi otomatis (`scripts/uji-akurasi/`)
- Tanpa pustaka pengenalan teks terpisah; model yang membaca gambar

---

## 17. Riwayat perubahan dari rancangan awal

| Tanggal | Perubahan | Alasan |
|---|---|---|
| 7 September | Bentuk hasil `candidates[]`, `found`, `page_excerpt` | Satu bentuk untuk satu atau dua kandidat, dan cara jujur mengatakan kata tidak ada di halaman |
| 8 September | Batas pemakaian dihitung per kata, bukan per permintaan | Satu foto boleh memuat lima kata; batas 60 permintaan sebenarnya melewatkan 300 kata |
| 9 September | **Makna langsung dibuka sebagai bawaan**; tunda menjadi tombol kedua | Di uji pertama, pembaca ingin langsung paham. Prinsip 1 diubah |
| 9 September | Beranda, tampilan responsif, rak buku, mode latihan, koleksi ringkas | Uji pertama di HP: aplikasi terasa terlalu sederhana, koleksi terlalu panjang digulung, dan tampilan laptop seperti HP yang dilebarkan |
| 10 September | **Tandai tanpa mengetik**: ketuk di foto dan coretan pensil | Lapis masalah ketiga. Prinsip 5 ditambahkan. Menandai di atas gambar pindah dari "keluar" ke "masuk" tanpa pengenalan teks |
| 10 September | Batas waktu per model dan tingkat berpikir `low` | Satu permintaan memakan 58,8 detik, nyaris terputus batas fungsi 60 detik |
| 11 September | **Kuis** sebagai gerbang dan sebagai tab sendiri; alur review dibalik | Prinsip 6 ditambahkan. Kuis pilihan ganda pindah dari "keluar" ke "masuk" dalam bentuk yang melayani prinsip 2 |
| 11 September | Uji akurasi otomatis dengan teks buku asli: 15 dari 15 kata buku asli, 12 dari 12 kata bertanda ditemukan, 70% permintaan terjawab pada percobaan pertama | Kriteria 1 dan 2 tidak bisa menunggu uji manual sebelum batas kirim. Temuannya menggeser fokus dari ketepatan makna ke keandalan model |

Setiap perubahan besar punya titik pulih di git: tag `v1-sebelum-tandai-foto` dan `v2-sebelum-kuis`, dengan langkah kembali di `context/cara_kembali_ke_versi_lama.md`.
