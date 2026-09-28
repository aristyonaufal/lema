# PRD Lema v1.4

Dokumen ini menggambarkan Lema **seperti yang benar benar dibangun dan hidup** di `lema-lemon.vercel.app`, bukan rancangan awalnya. Versi pertama dokumen ini (v1, 7 September 2026) adalah spesifikasi build tiga hari; selama pengerjaan, sebagian keputusannya diubah setelah aplikasinya dicoba. Apa yang berubah dan alasannya dicatat di bagian 17.

Versi 1.4 menambahkan ketuk kata di dalam pustaka (Tahap B). Versi 1.3 menulis ulang bagian 1 sampai 6. Dua sebabnya: pustaka ebook masuk, dan riset pembanding 28 September membatalkan dua klaim yang selama ini dipakai membenarkan Lema. Rinciannya di bagian 4.

Status: v1 hidup di produksi. Fitur terakhir naik 29 September 2026.
Batas kirim portfolio: 12 September 2026
Versi rancangan awal: riwayat git, misalnya `git show v1-sebelum-tandai-foto:context/PRD-Lema.md`

---

## 1. Ringkasan

Lema membantu orang Indonesia yang belajar bahasa Inggris memahami kata yang maknanya bergantung pada konteks, lalu memastikan kata itu tidak perlu dicari untuk kedua kalinya.

Ada dua jalan masuk, dan keduanya tanpa mengetik. **Dari buku kertas:** pembaca memotret halaman, lalu mengetuk kata yang membuatnya berhenti langsung di foto, atau cukup menggaris bawahinya dengan pensil sebelum difoto. **Dari pustaka di dalam Lema:** lima novel Inggris yang hak ciptanya sudah habis, dibaca langsung di aplikasi, dengan posisi baca yang tersimpan sendiri. Kata yang membuat berhenti cukup diketuk di layar, dan frasa cukup disapu.

Apa pun jalan masuknya, yang keluar sama: makna yang dipakai **di tempat itu**, kata pemicu yang menentukannya, alasannya, catatan hati hati, dan makna lain kata tersebut. Semuanya tersimpan ke koleksi per buku, lalu ditagih balik lewat review berjarak dan kuis yang pengecohnya adalah makna lain dari kata yang sama. Kalau modelnya salah pilih, pembaca berhak membetulkannya, dan seluruh koleksi bisa dibawa keluar sebagai satu berkas.

Kalimat pembeda: **Readlang bikin kamu paham kalimat ini. Lema bikin kamu nggak perlu nanya lagi.**

*Kalimat pembeda lama berbunyi "kamus memberimu semua arti; Lema memberimu arti yang dipakai di halamanmu". Kalimat itu dibuang karena tidak lagi membedakan apa pun: Readlang melakukan hal yang sama sejak fitur Explain mereka. Lihat bagian 4.*

---

## 2. Masalah

### Lapis pertama, yang dirasakan pengguna

Berhenti itu mahal. Satu pencarian bukan cuma 40 detik, tapi juga fokus yang pecah. Dan sering kali setelah 40 detik itu pembacanya tetap tidak yakin, karena kamus dan penerjemah memberi makna yang lepas dari konteks. Bayar mahal, dapatnya "mungkin". Setelah itu terjadi enam kali dalam satu jam, bukunya ditutup.

### Lapis kedua, yang tidak disadari pengguna

Tidak ada yang menumpuk. Kata yang dicari hari ini hilang begitu saja, dan tiga bab kemudian dicari lagi. Selesai satu buku, 200 kata dicari dan mungkin 15 yang menempel.

### Lapis ketiga, yang ditemukan selama pengerjaan

Mengetik itu sendiri mahal. Pembaca sedang melihat katanya di kertas, lalu harus mengetiknya ulang huruf demi huruf, dan salah eja berujung pada jawaban "kata tidak ketemu di halaman". Padahal foto yang dikirim sudah memuat kata itu. Lapis ini tidak ada di rancangan awal; ditemukan saat aplikasinya dicoba di HP.

### Lapis keempat, yang ditemukan dari aplikasinya sendiri

Lema tidak bisa dicoba tanpa buku Inggris di tangan. Siapa pun yang membuka tautannya karena penasaran cuma melihat satu layar yang menanyakan judul buku, lalu berhenti di situ. Masalah ini tidak dirasakan pengguna sasaran, karena mereka memang sedang memegang buku; yang merasakannya adalah semua orang lain, dan merekalah calon pengguna yang tidak pernah jadi pengguna. Lapis ini yang dijawab pustaka.

### Hierarki

Lapis pertama yang membuat orang membuka aplikasi. Lapis kedua yang membuat aplikasi ini pantas ada. Lapis ketiga yang menentukan apakah orang mau membukanya lagi besok. Lapis keempat yang menentukan apakah mereka sempat mencobanya sama sekali. Kalau harus memilih satu untuk dikorbankan, korbankan kecepatan, jangan korbankan penyimpanan.

---

## 3. Pengguna sasaran

**Utama.** Mahasiswa atau pekerja muda Indonesia, umur 18 sampai 27, level Inggris menengah. Sudah bisa baca tapi pelan. Membaca karena pilihan sendiri, bukan tugas. Motivasi tinggi di awal, angka berhenti juga tinggi. Hampir semuanya memakai HP: 98,3% akses internet di Indonesia lewat ponsel, dan Lema memang dirancang mobile-first.

Sejak pustaka masuk, syarat "sedang memegang buku kertas" tidak lagi berlaku di awal. Buku kertas tetap jalan masuk yang membedakan Lema, tetapi bukan lagi satu satunya pintu.

**Bukan sasaran v1.** Pemula total yang belum bisa baca kalimat sederhana, penerjemah profesional, dan pelajar yang butuh persiapan tes terstruktur.

---

## 4. Kenapa bukan yang sudah ada

Bagian ini ditulis ulang 28 September setelah riset pembanding. **Dua klaim yang sebelumnya dipakai membenarkan Lema ternyata salah**, dan lebih baik dicatat di sini daripada dibantah orang lain di forum.

### Yang gugur

| Klaim lama | Kenyataannya |
|---|---|
| "Readlang tidak menjelaskan secara kontekstual" | Readlang punya fitur Explain berbasis AI yang sadar konteks, tersedia untuk seluruh bahasanya sejak Juni 2024 |
| "Bahasa Indonesia sebagai bahasa penjelas belum digarap" | Readlang mendukung 119 bahasa, termasuk Bahasa Indonesia |

Satu klaim lain, yang datang dari ulasan pihak ketiga, juga keliru: beberapa situs menulis Readlang tidak punya aplikasi HP. Halaman fitur resminya menyebut aplikasi iOS dan Android. Jangan dipakai.

### Peta pembanding

| Alat | Yang dia lakukan | Batasnya |
|---|---|---|
| Google Translate | Makna kamus, cepat, gratis | Lepas konteks, sering salah pilih makna, tidak menyimpan apa apa |
| ChatGPT atau Claude | Penjelasan kontekstual yang bagus | Butuh prompt tiap kali, dan chat adalah aliran yang tidak pernah dibuka lagi. Tidak ada yang menagih balik |
| Readlang | 119 bahasa, Explain sadar konteks, impor EPUB, aplikasi iOS dan Android, spaced repetition | $5 per bulan; pengguna gratis dibatasi 10 terjemahan frasa dan Explain per hari. Wajib teks digital |
| LingQ | Status kata berwarna, sinkron, pustaka besar, definisi bisa disunting | Berbayar, wajib teks digital |
| Migaku | Skor keterpahaman konten sebelum dibaca | Wajib teks digital, berorientasi Anki |
| Kindle Vocabulary Builder | Tap kata sambil baca, tersimpan otomatis | Terkunci ekosistem Kindle, **tanpa ekspor sama sekali**, mentok di ratusan kata |

Sumber tentang Kindle saling bertentangan soal apakah fitur itu masih hidup. Jangan mengklaim Kindle sudah kehilangan fiturnya tanpa membuktikannya di perangkat sungguhan.

### Yang benar benar tersisa sebagai pembeda

Diurutkan dari yang paling sulit ditiru.

1. **Struktur, bukan prosa.** Explain milik Readlang mengembalikan paragraf penjelasan. Lema mengembalikan objek: makna terpakai, kata pemicu, alasan, keyakinan, catatan hati hati, daftar makna lain, penanda ragu. Perbedaan ini terdengar teknis, padahal inilah akarnya. **Prosa tidak bisa dijadikan soal; struktur bisa.** Kuis, review, koreksi, dan semua turunannya berdiri di atas bentuk data itu tanpa panggilan model tambahan. Menirunya berarti mengubah bentuk data dan memigrasikan seluruh riwayat pengguna.
2. **Kuis dengan pengecoh dari kata yang sama.** Kartu hafalan pembanding berbentuk kata ke terjemahan, dan itu menguji ingatan. Kuis Lema menguji pemilihan makna sesuai konteks. Bentuk ini tidak ditemukan di satu pun pembanding.
3. **Buku kertas lewat foto dan coretan pensil.** Satu satunya pembeda yang bersifat struktural: tidak ada pembanding yang bisa membaca halaman kertas, apalagi coretan di dalamnya. *Catatan jujur: kalau pustaka berhasil dan menjadi jalur utama, pembeda ini menjadi tidak relevan bagi mayoritas pengguna.*
4. **Gratis, tanpa akun.** Readlang mengunci kemampuan intinya di balik langganan. Ini keunggulan, bukan benteng: gratis karena belum ada yang membayar biaya API.

**Klaim Lema yang boleh dipakai:** pembacanya diajari cara menebak, bukan cuma diberi jawaban, lalu ditagih balik sampai katanya menempel. Jangan lagi mengklaim penjelasan kontekstual atau bahasa Indonesia sebagai pembeda.

---

## 5. Prinsip produk

Tujuh aturan ini yang dipakai untuk menyelesaikan perdebatan desain. Prinsip 1 diubah dari rancangan awal; prinsip 5 dan 6 ditambahkan selama pengerjaan; prinsip 7 ditambahkan bersama pustaka.

1. **Pembaca yang memilih kapan jawabannya muncul.** Tombol utama membuka makna saat itu juga, karena di uji pertama pembaca justru ingin langsung paham. Jalan tunda tetap ada dan tetap setara: "Simpan, lanjut baca", atau menggaris bawahi dengan pensil dan memotretnya di akhir bab. *Rancangan awal berbunyi "baca dulu, jawab belakangan", dengan jawaban ditunda sebagai bawaan.*
2. **Ajari cara menebak, bukan cuma kasih jawaban.** Setiap jawaban wajib menunjukkan kata pemicu di kalimat yang menentukan makna itu. Kuis melanjutkan prinsip ini: pengecohnya makna lain dari kata yang sama, jadi yang dilatih adalah memilih makna sesuai konteks.
3. **Ragu itu ditampilkan, bukan disembunyikan, dan begitu juga keliru.** Percaya diri palsu adalah penyebab kebingungan yang mau dihilangkan. Kalau model tidak yakin, dua kandidat ditampilkan sejajar. Kata yang ditandai ragu tidak dijadikan soal kuis, karena memang tidak punya satu jawaban benar. Prinsip ini berlaku dua arah: ketika pembaca membetulkan makna yang salah, jawaban model tidak dihapus melainkan turun menjadi catatan, dan koreksinya bisa dibatalkan kapan saja. Yang memegang bukunya adalah pembaca, jadi keputusan terakhir memang miliknya.
4. **Nol setup.** Tidak ada akun, tidak ada onboarding, tidak ada pemilihan level. Satu pertanyaan saja di awal: judul buku yang sedang dibaca.
5. **Jangan suruh pembaca mengetik kata yang sedang dilihatnya.** Foto sudah memuat katanya. Mengetik tetap tersedia sebagai jalan cadangan, bukan jalan utama.
6. **Klaim "sudah ingat" harus dibuktikan.** Tombol yang menaikkan jadwal review atau mengeluarkan kata dari review harus lolos kuis dulu. Jadwal berjarak hanya jujur kalau dasarnya jawaban yang diuji, bukan tombol yang ditekan.
7. **Jangan sampai pembaca kehilangan tempatnya.** Berlaku untuk pustaka. Posisi baca disimpan sebagai nomor bab dan nomor paragraf, bukan posisi piksel, supaya selamat dari ganti ukuran huruf, putar layar, dan ganti perangkat. Kendali yang bisa menggeser teks harus bisa dijangkau tanpa meninggalkan tempat baca; itu sebabnya baris kendali di pembaca menempel di atas layar.

---

## 6. Lingkup v1

### Masuk, dan sudah hidup

**Menandai kata dari buku kertas**

- Foto halaman dari kamera atau galeri, dikecilkan di browser sebelum dikirim
- **Tandai tanpa mengetik**: ketuk kata di foto (oval bernomor, paling banyak lima), atau garis bawahi pakai pensil di buku dan biarkan Lema mencari coretannya
- Ketik kata atau frasa sebagai jalan cadangan, paling banyak lima per halaman, frasa utuh seperti "in the long run" diperlakukan sebagai satu tandaan

**Memahami dan menyimpan**

- Makna langsung dibuka sebagai bawaan, jalan tunda tetap ada
- Peta makna: kalimat asal dengan kata ditebalkan, kata pemicu, alasan, makna lain, catatan hati hati, angka keyakinan, dan dua kandidat sejajar saat ragu
- **Koreksi makna**: makna yang salah dipilih model bisa dibetulkan dengan satu ketukan atau ditulis sendiri, tanpa menghapus jawaban model
- Koleksi kata per buku sebagai daftar ringkas yang dibuka satu per satu
- **Cadangan koleksi**: seluruh koleksi keluar sebagai satu berkas dan bisa masuk lagi, plus ekspor CSV untuk Anki atau spreadsheet

**Menagih balik**

- Review berjarak dengan kalimat baru buatan model, tangga 1, 3, 7, 21 hari
- **Kuis** dengan dua fungsi: gerbang sebelum klaim "sudah ingat", dan tab sendiri dari semua buku
- Mode latihan kapan saja, tanpa menggeser jadwal

**Pustaka** *(Tahap A, naik 28 September)*

- Lima novel Inggris domain publik, dibaca langsung di dalam Lema
- Pembaca dengan daftar bab, tiga ukuran huruf, dan batang kemajuan
- Posisi baca tersimpan sendiri dan ikut terbawa berkas cadangan
- Buku pustaka masuk rak buku yang sama dengan buku kertas, hanya beda penanda
- **Ketuk kata, sapu frasa** *(Tahap B, naik 29 September)*: maknanya terbuka di panel yang muncul dari bawah, tanpa meninggalkan halaman yang sedang dibaca, lalu masuk koleksi seperti kata dari foto

**Umum**

- Beranda berisi ringkasan progres, rak buku, dan kata terbaru
- Tampilan responsif: bilah bawah di HP, sidebar kiri di laptop

### Belum masuk, tetapi sudah direncanakan

- Membaca pustaka tanpa koneksi
- Unggah EPUB sendiri

### Keluar, dan jangan diributkan lagi

Akun dan login, sinkron antar perangkat, audio dan pelafalan, mode sosial atau papan peringkat, penjelasan kalimat utuh, dukungan bahasa selain Inggris ke Indonesia, aplikasi native iOS.

Cadangan lewat berkas bukan sinkronisasi, dan sengaja tidak dipasarkan sebagai itu. Yang dijanjikannya cuma satu: koleksi punya jalan keluar, dan pemindahan antar perangkat dilakukan pengguna sendiri.

### Yang pindah dari "keluar" ke "masuk", dan kenapa

- **Kuis pilihan ganda.** Rancangan awal mengeluarkannya karena takut lingkup melebar. Masuk kembali setelah jelas bentuknya bisa melayani prinsip 2: pengecoh diambil dari makna lain kata yang sama, tanpa panggilan model tambahan.
- **Menandai langsung di atas gambar.** Rancangan awal mengeluarkannya karena membayangkan pengenalan teks dengan kotak koordinat per kata. Yang dibangun tidak memakai itu sama sekali: aplikasi menggambar oval magenta di titik yang diketuk, dan model yang membaca kata di dalam oval.
- **Cadangan lewat berkas.** Rancangan awal menganggap penyimpanan tanpa akun sudah cukup sederhana. Yang terlewat: sederhana bukan berarti aman.
- **Pustaka ebook.** Rancangan awal menegaskan "buku kertas, titik", karena di situlah pembedanya. Yang terlewat: pembeda itu tidak ada gunanya kalau aplikasinya tidak bisa dicoba sama sekali tanpa buku kertas di tangan (lapis keempat di bagian 2). Pustaka menghapus syarat masuk tanpa menghapus pembedanya, karena jalur kertas tetap ada dan tetap satu satunya yang bisa membaca coretan pensil.

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
- Tombol "Bukan ini maknanya", yang membuka pemilih makna pengganti

Pemilih itu menawarkan lebih dulu makna yang sudah ada di kartu, yaitu kandidat lain dan daftar makna lain, karena pada sebagian besar kekeliruan model sebenarnya sudah menyebut makna yang benar dan cuma salah memilih mana yang dipakai di halaman itu. Mengetuk satu baris lebih murah daripada mengetik, sesuai prinsip 5. Kolom teks tetap ada untuk kasus model tidak menyebutnya sama sekali.

Setelah dibetulkan, makna pembaca yang tampil besar di atas, jawaban model turun menjadi satu baris catatan, dan ada tombol "Kembalikan jawaban model". Kartu ragu berhenti menampilkan dua kandidat sejajar begitu pembaca memutuskan, karena keraguannya sudah terjawab oleh orang yang memegang bukunya. Layar review tidak menampilkan tombol koreksi sama sekali: di sana yang sedang diuji adalah ingatan, dan menyunting jawaban di tengah ujian mengaburkan keduanya.

### 8.4 Koleksi (`/kata`)

Daftar ringkas per buku: satu baris berisi kata dan arti singkatnya, dengan penanda "Ragu", "Tidak ketemu di halaman", "Sudah tahu", atau "Kamu betulkan". Arti singkat yang ditampilkan selalu makna yang berlaku, jadi kata yang sudah dibetulkan tidak pernah lagi menunjukkan jawaban lama model di layar mana pun. Kartu makna penuh baru digambar setelah barisnya diketuk. Penyaring: semua, siap dibaca, diproses, gagal, sudah tahu. `?buku=<id>` menyaring ke satu buku, dibuka dari rak buku di beranda atau sidebar. `?entry=<id>` membuka kata tertentu dalam keadaan terbuka, termasuk semua kata hasil satu foto mode tandai.

### 8.5 Review (`/review`)

Muncul sebagai pintasan saat ada kata jatuh tempo. Kalimat baru buatan model ditampilkan dengan kata sasaran ditebalkan, maknanya belum terlihat. Tiga pilihan:

- **Lupa**: makna dan kalimat asal dari buku langsung dibuka, jadwal kembali ke anak tangga pertama.
- **Inget**: kuis dulu. Benar berarti naik satu anak tangga dan tercatat pernah lolos review; salah dihitung lupa.
- **Udah hafal, stop tanya**: kuis dulu. Benar berarti kata dikeluarkan dari review; salah dihitung lupa.

Tangga tetap 1, 3, 7, 21 hari. Riwayat "pernah lolos review" hanya pernah berubah dari tidak ke ya, jadi jawaban lupa di kemudian hari tidak menghapusnya.

`?latihan=1` (dan opsional `&buku=<id>`) membuka mode latihan: kata mana pun yang sudah punya makna, tanpa menunggu jatuh tempo, dan tanpa menulis jadwal maupun riwayat.

### 8.6 Kuis (`/kuis`)

Satu sesi paling banyak sepuluh soal dari semua buku dan semua jadwal, termasuk kata yang sudah ditandai tahu. Soal berupa kalimat baru dengan empat pilihan makna; pengecoh diambil lebih dulu dari makna lain kata yang sama, sisanya dari arti kata lain di koleksi. Setelah menjawab: jawaban benar hijau, pilihan salah merah, lalu makna dalam bahasa Inggris dan kalimat asal dari buku. Akhir sesi menampilkan skor dan kata yang terlewat, masing masing bertaut ke kartunya. Tab ini tidak mengubah jadwal.

### 8.7 Cadangan (`/data`)

Ada karena satu konsekuensi dari pilihan tanpa akun: koleksi hanya hidup di satu browser, dan membersihkan data situs atau berganti HP sama saja dengan kehilangan semuanya.

- Tiga angka isi koleksi: jumlah buku, jumlah kata, jumlah yang pernah dibetulkan
- "Simpan cadangan" mengunduh satu berkas JSON bernama `lema-<tanggal>.json`, berisi semua buku, kata, makna, jadwal review, dan koreksi
- "Ekspor buat Anki (.csv)" mengunduh tabel mendatar untuk aplikasi kartu hafalan atau spreadsheet, diawali BOM supaya Excel membaca UTF-8 dengan benar
- "Pilih berkas cadangan" menampilkan isi berkas lebih dulu, dan belum mengubah apa pun sampai pengguna memilih tindakan

Dua tindakan tersedia setelah berkas dibaca:

- **Gabung** menambahkan yang belum ada. Buku dicocokkan lewat judul yang dinormalkan, aturan yang sama dengan `addBook`, sehingga "Sapiens" dari HP lama menyatu dengan "sapiens" di HP baru dan tidak menjadi dua rak. Kata yang id-nya sudah ada dilewati, dan yang menang adalah yang sudah ada di perangkat ini, jadi kemajuan review yang sudah berjalan tidak tertimpa cadangan yang lebih tua. Mengimpor berkas yang sama dua kali karena itu tidak menggandakan apa pun.
- **Ganti semua** membuang koleksi yang sekarang, dan butuh konfirmasi kedua yang menyebut jumlah kata yang akan dibuang.

Sesudahnya ditampilkan laporan: berapa kata masuk, berapa dilewati karena sudah ada, dan berapa yang tidak punya tempat karena bukunya tidak ikut di berkas. Angka terakhir ditampilkan, bukan disembunyikan.

Jalannya sengaja tidak menjadi tab keenam. Bilah bawah di HP sudah penuh dengan lima tujuan, dan menyimpan berkas bukan pekerjaan harian. Tautannya ada di kaki sidebar pada laptop dan di kaki beranda pada HP. Semua pemrosesan berkas terjadi di perangkat pengguna; tidak ada yang dikirim ke server.

### 8.8 Pustaka (`/pustaka` dan `/pustaka/<slug>`)

Katalog berisi lima novel Inggris domain publik: judul, penulis, tingkat kesulitan, jumlah bab dan kata, perkiraan waktu baca, dan tombol "Mulai baca" atau "Lanjut baca · bab N" kalau bukunya pernah dibuka.

Pembacanya menampilkan teks bersih dengan lebar baca terbatas. Baris kendali di atas berisi jalan balik ke katalog dan tiga ukuran huruf, dan **menempel di atas layar selama menggulir**. Itu bukan hiasan: tanpa menempel, pembaca harus naik ke puncak halaman cuma untuk membesarkan huruf, dan perjalanan naik itu sendiri sudah menghilangkan tempatnya (prinsip 7). Di bawahnya ada judul bab, batang kemajuan, daftar bab yang bisa dilompati, dan tombol bab sebelumnya dan berikutnya.

Tiga hal yang menentukan bentuk layar ini:

- **Posisi baca disimpan sebagai nomor bab dan nomor paragraf**, bukan nomor halaman maupun posisi piksel. Halaman dan piksel bergeser begitu ukuran huruf diubah atau layar diputar; paragraf ke-47 tetap paragraf ke-47. Kindle memakai "location" karena masalah yang sama.
- **Teks buku tidak pernah masuk `localStorage`.** Jatahnya sekitar 5 MB per origin dan dipakai bersama koleksi kata, sedangkan Moby-Dick saja 1,6 MB. Teks diambil per bab sebagai berkas statis saat dibaca, lalu dilepas.
- **Buku pustaka masuk rak buku yang sama** dengan buku kertas begitu benar benar dibuka, dengan penanda `pustaka` berisi slug-nya. Rak yang terpisah akan membuat pengguna bertanya kenapa bukunya tidak ada di salah satunya.

**Ketuk kata, sapu frasa.** Satu ketukan pada sebuah kata langsung membuka maknanya. Menyapu beberapa kata memunculkan tombol "Cari makna" lebih dulu, karena di HP pegangan sapuan masih bisa digeser setelah jari diangkat, dan mencari terlalu dini berarti mencari frasa yang belum selesai dipilih. Sapuan dibatasi enam kata dan tidak boleh melewati batas paragraf; lebih dari itu bukan permintaan makna kata, dan prompt Lema dirancang memilih makna, bukan menjelaskan kalimat.

Gerakan yang jauh lebih dari 10 piksel atau lebih lama dari 600 milidetik bukan ketukan melainkan gulir, dan diabaikan. Kata yang diketuk dicari lewat caret peramban, bukan dengan membungkus tiap kata dalam elemen sendiri: satu bab bisa berisi belasan ribu kata, dan membungkus semuanya berarti belasan ribu elemen yang digambar cuma untuk berjaga jaga.

**Panelnya terbuka seketika, tidak menunggu jawaban.** Pengukuran 29 September memberi median 14 detik untuk mode teks (bagian 13). Menahan panel sampai jawabannya datang berarti pembaca menatap layar diam selama itu, jadi panel muncul segera dengan keadaan sedang diproses, lalu terisi sendiri. Isinya peta makna yang sama persis dengan alur foto, termasuk tombol membetulkan makna. Latar gelapnya sengaja tipis supaya kalimat yang sedang dibaca tetap terlihat di atas panel, karena maknanya cuma masuk akal bersama kalimatnya.

Pustaka sengaja tidak menjadi tab keenam. Bilah bawah di HP sudah penuh dengan lima tujuan. Jalannya ada di rak buku pada beranda, di kaki sidebar pada laptop, dan di layar pemilihan buku untuk pengguna yang belum punya buku sama sekali.

---

## 9. Kontrak data

### 9.1 Permintaan ke `POST /api/lookup`

Multipart form. Tiga bentuk:

- Mode ketik: `image` (JPEG), `words` (JSON array, 1 sampai 5 kata atau frasa)
- Mode tandai: `image` (JPEG, sudah digambari oval kalau ada), `mode=marked`, `markers` (jumlah oval, 0 sampai 5; 0 berarti cari coretan pensil saja)
- Mode teks: `mode=text`, `word` (paling panjang 80 karakter), `context` (satu paragraf, paling panjang 8.000 karakter). **Tanpa gambar sama sekali.** Dihitung satu kata terhadap batas harian

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
  "books": [{ "id": "b1", "title": "Sapiens", "createdAt": 0, "pustaka": "alice" }],
  "activeBookId": "b1",
  "bacaan": [{ "slug": "alice", "bab": 12, "paragraf": 47, "at": 0 }],
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
      "marked": true,
      "correction": {
        "meaning_id": "kekurangan atau ketiadaan",
        "meaning_en": "lack or absence",
        "source": "lain",
        "at": 0
      }
    }
  ]
}
```

`status` bernilai `pending`, `done`, atau `error`. `stage` adalah indeks tangga review. `passedReview` dicatat sejak 9 September; entri lama tanpa kolom ini dihitung belum pernah lolos, bukan ditebak. `batch` dan `marked` hanya ada pada kata dari mode tandai: semua kata dari satu foto berbagi `batch`. `correction` hanya ada pada kata yang maknanya dibetulkan pembaca, dan ia berdampingan dengan `result`, tidak menimpanya; `source` bernilai `lain` kalau dipilih dari makna yang sudah disebut model, atau `sendiri` kalau diketik. Satu fungsi, `mainMeaning`, adalah satu satunya pintu yang dipakai semua layar untuk membaca makna yang berlaku, supaya tidak ada tempat yang tertinggal menampilkan makna lama. `pustaka` pada buku berisi slug buku pustaka, dan hanya ada kalau bukunya dibaca di dalam Lema. `bacaan` berisi satu catatan posisi baca per buku pustaka, selalu ditimpa, dan ikut terbawa berkas cadangan; saat digabung, yang menang adalah yang paling baru dibaca, berbeda dengan aturan untuk kata. Entri yang masih `pending` saat aplikasi dimuat ulang diubah menjadi `error` yang bisa dikirim ulang, karena fotonya tidak ikut disimpan.

### 9.4 Berkas pustaka

Disiapkan sekali oleh `scripts/pustaka/susun.mjs` dan di-commit sebagai berkas statis. Aplikasi tidak pernah mengurai EPUB saat berjalan.

```
public/pustaka/index.json          katalog lima buku
public/pustaka/<slug>/buku.json    judul, penulis, sumber, daftar bab
public/pustaka/<slug>/<n>.json     { judul, paragraf: string[] } untuk bab ke-n
```

Bab dipilih secara semantik, bukan lewat daftar nama berkas: Standard Ebooks menandai badan karya dengan `epub:type="bodymatter"` pada `<body>`, sedangkan halaman judul, imprint, colophon, dan uncopyright ditandai frontmatter atau backmatter. Aturan itu ikut benar pada buku yang susunannya tidak biasa. Konsekuensi yang perlu diketahui: Etymology dan Extracts di Moby-Dick ditandai frontmatter oleh sumbernya sendiri, jadi tidak ikut masuk.

Pindah baris di dalam paragraf dipertahankan karena puisi memakainya, dan ditampilkan dengan `white-space: pre-line`.

### 9.5 Berkas cadangan

```json
{ "lema": 1, "exportedAt": 0, "db": { "books": [], "entries": [], "activeBookId": null } }
```

`lema` adalah versi format berkas, bukan versi aplikasi, dan hanya dinaikkan kalau bentuk datanya berubah sampai berkas lama perlu diterjemahkan. Berkas dengan format lebih tinggi daripada yang dikenal aplikasi ditolak dengan pesan yang menyuruh membuka Lema terbaru, bukan dibaca setengah setengah.

Impor juga menerima isi mentah `lema.v1` tanpa amplop. Bentuk itu diterima karena justru itulah yang bisa diselamatkan pengguna dari browser yang sudah bermasalah, dan menolaknya tidak menolong siapa pun. Buku atau kata yang bentuknya rusak dibuang satu per satu, sedangkan yang sehat tetap masuk; isi `result` sengaja tidak diperiksa lapis demi lapis, karena layar sudah menangani hasil tidak lengkap sejak awal.

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

Mode teks memakai aturan makna yang sama persis, dan yang dibuang cuma yang memang tidak berlaku: aturan `page_excerpt` dipakai untuk memeriksa apakah fotonya sampai dengan baik, dan seluruh blok "kalau katanya tidak ada di halaman" mustahil terjadi ketika katanya diambil dari teks yang dikirim pembaca. Sebagai gantinya: `found` selalu true, `page_excerpt` selalu kosong, dan `results` berisi tepat satu entri. Ada pengujian yang mengunci panjang prompt dua mode foto, supaya pemecahan ini tidak menggeser perilaku yang sudah teruji.

Mode tandai menambahkan: temukan kata yang ditandai pembaca, baik coretan tangan (garis bawah, lingkaran, stabilo) maupun oval magenta bernomor dari aplikasi; jangan menambahkan kata yang tidak ditandai; urutkan sesuai urutan baca, paling banyak lima; daftar kosong adalah jawaban sah kalau tidak ada tanda.

Tingkat berpikir model diatur `low`. Pada pengukuran 10 September, tingkat bawaan membuat 83% keluaran habis untuk berpikir: 3.234 token berpikir untuk 677 token jawaban, 21 detik. Bisa dinaikkan lewat `GEMINI_THINKING_LEVEL` tanpa mengubah kode.

---

## 11. Non-fungsional

- **Kunci API hanya di server.** Semua panggilan lewat satu route handler. Diperiksa pada bundle produksi: nol kemunculan kunci maupun alamat API di berkas yang dikirim ke browser. Alat internal `/lab` dan `/api/models` membalas 404 di produksi.
- **Batas pemakaian.** Dihitung per kata, bukan per permintaan: 60 kata per alamat per hari. Mode tandai memesan lima lalu mengembalikan sisanya; foto tanpa tanda tetap dihitung satu. Kegagalan total mengembalikan jatah. Penghitung bersama lewat Upstash tersedia tetapi belum diuji terhadap layanan sungguhan; tanpa itu, hitungannya per proses server.
- **Waktu tanggap.** Model utama dan tiga model cadangan dicoba berurutan. Setiap model paling lama 20 detik untuk mode foto dan **12 detik untuk mode teks**, seluruh rantai paling lama 50 detik, di bawah batas fungsi 60 detik. Jatah mode teks lebih pendek karena tanpa gambar jawaban sehat datang dalam 6 sampai 13 detik; angkanya dari pengukuran 29 September (bagian 13). Hasil pengukuran ada di bagian 13. Pindah layar tidak menunggu model: peta makna terbuka seketika dan terisi sendiri.
- **Ukuran foto.** Dikecilkan di browser, sisi terpanjang paling besar 1.600 piksel.
- **Privasi.** Layar foto menyatakan bahwa foto dikirim ke Google agar model bisa membaca halaman, bahwa Lema tidak menyimpan foto itu, dan bahwa koleksi hanya ada di browser. Perlakuan data di sisi penyedia model sengaja tidak diklaim. Berkas cadangan dibaca dan ditulis sepenuhnya di perangkat pengguna, tanpa melewati server mana pun.
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
| 8 | Koleksi punya jalan keluar dari satu browser | Terpenuhi sejak 27 September. Ekspor JSON dan CSV, impor dengan penggabungan yang tidak menimpa. Ditambahkan setelah kriteria awal disusun, karena tanpa ini penyimpanan yang jadi alasan Lema pantas ada justru yang paling rapuh |

Di luar tabel: **137 pengujian otomatis lulus pada build produksi**, mencakup alur penyimpanan, peta makna, mode tandai, kuis, batas waktu rantai model, aturan penggabungan cadangan, koreksi makna, serta pustaka, pembacanya, dan pencarian makna dari teks.

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

### Mode teks, diukur 29 September

Sepuluh kata yang maknanya bergantung konteks, diambil dari paragraf asli di pustaka, lewat `/api/lookup` yang sama dengan produksi. Bisa diulang dengan `node scripts/uji-teks/ukur.mjs`; jawaban lengkapnya di `scripts/uji-teks/hasil.json`.

| Metrik | Mode foto | Mode teks |
|---|---|---|
| Terjawab pada percobaan pertama | 14 dari 20 (70%) | **10 dari 10** |
| Median waktu tunggu | 28,2 detik | **14,0 detik** |
| Tercepat sampai terlama | — | 6,7 sampai 43,7 detik |

**Perkiraan awal meleset, dan ini dicatat supaya tidak diulang.** Peta jalan Tahap B memperkirakan 3 sampai 6 detik, dengan alasan tanpa gambar berarti tanpa token gambar. Pengukuran pertama memberi median 20,9 detik. Sebabnya ketahuan dari catatan model yang menjawab: **7 dari 10 permintaan jatuh ke model cadangan**, dan masing masing membayar 20 detik penuh lebih dulu. Jadi yang menahan bukan besarnya permintaan, melainkan ketersediaan model utama, persis temuan uji 11 September.

Setelah jatah per model untuk mode teks dipendekkan ke 12 detik, mediannya turun ke 14,0 detik dengan keberhasilan tetap 10 dari 10. Ekornya justru memanjang, dari 32,9 ke 43,7 detik, karena satu permintaan kini bisa melewati tiga model sebelum ada yang menjawab. Pertukaran itu diterima: yang dirasakan pembaca setiap hari adalah mediannya.

Angka keberhasilan 10 dari 10 berasal dari sepuluh permintaan, bukan ratusan, jadi bacalah sebagai tanda bagus, bukan sebagai jaminan.

### Yang belum bisa diukur

Aplikasi tidak mengumpulkan data kunjungan dan tidak punya server basis data, jadi jumlah pengguna, persentase yang kembali di hari kedua, dan persentase kata yang lolos review pertama **tidak bisa dihitung lintas pengguna**. Angka per pengguna tersedia di beranda masing masing (kata terkumpul, lolos review). Menambah pencatatan kunjungan adalah keputusan terpisah yang menyangkut privasi.

---

## 14. Risiko

| Risiko | Kemungkinan | Penanganan |
|---|---|---|
| Model salah pilih makna pada kata yang jarang | Tinggi, dan ini memang temuan riset | Tidak disembunyikan. Keraguan ditampilkan; hasil uji akurasi ditulis apa adanya. Sejak 27 September pembaca bisa membetulkannya sendiri, dan koreksinya tersimpan berdampingan dengan jawaban model, jadi kekeliruan tercatat alih alih terhapus |
| **Koleksi hilang karena hanya ada di satu browser** | **Tinggi selama tidak ada akun.** Membersihkan data situs, berganti HP, atau membuka dari peramban lain sudah cukup | Cadangan berkas di `/data`, dengan jalannya terlihat dari beranda dan sidebar sebelum kehilangan terjadi, bukan sesudahnya. Belum tertangani: pengguna yang tidak pernah menyimpan cadangan. Pengingat otomatis belum ada dan masih di peta jalan |
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
- **Pengingat menyimpan cadangan**, muncul sekali setelah koleksi melewati ambang tertentu. Cadangan yang tidak pernah dibuat tidak menolong siapa pun, dan sekarang pembuatannya sepenuhnya bergantung pada pengguna yang kebetulan menemukan halamannya
- **Audio pelafalan** lewat Web Speech API yang sudah ada di browser, tanpa panggilan API dan tanpa biaya. Dikeluarkan dari lingkup v1 waktu masih diperkirakan mahal; perkiraan itu ternyata salah. Pembaca buku kertas justru yang paling tidak pernah mendengar kata itu diucapkan
- **Tangga review yang belajar dari jawaban.** Tangga 1, 3, 7, 21 memperlakukan kata yang selalu terlupa sama dengan kata yang sekali lihat langsung menempel. FSRS sudah menjadi bawaan Anki dan terbukti butuh 20 sampai 30 persen lebih sedikit review, tetapi memasangnya utuh terlalu berat untuk v1. Langkah kecilnya: kata yang gagal dua kali berturut turut ditahan, bukan dikembalikan ke anak tangga pertama
- **Kata lain di halaman yang mungkin bikin berhenti.** Model sudah membaca seluruh halaman, lalu sembilan puluh persen bacaannya dibuang. Meminta dua sampai tiga kata sulit lain di panggilan yang sama hampir tidak menambah biaya
- **Foto beberapa halaman sekaligus.** Coret pensil sepanjang satu bab, lalu kirim lima halaman dalam sekali jalan. Ini juga satu satunya jalan yang terlihat untuk benar benar memenuhi kriteria 3, karena targetnya tercapai bukan dengan mengurangi ketukan per halaman, melainkan dengan menaikkan jumlah halaman per ketukan
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
- `scripts/pustaka/susun.mjs` mengubah EPUB Standard Ebooks menjadi JSON per bab. Pembaca ZIP-nya ditulis sendiri di `scripts/pustaka/zip.mjs` memakai `DecompressionStream('deflate-raw')` bawaan Node, jadi tidak ada dependensi baru di proyek

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
| 27 September | **Cadangan koleksi** lewat berkas JSON dan ekspor CSV | Perbandingan dengan Readlang, LingQ, Migaku, dan Kindle menunjukkan Lema kena dua batasan sekaligus: tidak sinkron dan tidak bisa diekspor. Kriteria 8 ditambahkan |
| 29 September | **Ketuk kata di pustaka** lewat `mode=text`, tanpa gambar | Tahap B. Jatah per model dipendekkan ke 12 detik setelah pengukuran menunjukkan waktu tunggu didominasi model utama yang menggantung, bukan besarnya permintaan |
| 28 September | **Pustaka ebook**: lima novel domain publik, pembaca dengan posisi baca, rak buku bersama | Lapis masalah keempat: Lema tidak bisa dicoba sama sekali tanpa buku Inggris di tangan. Prinsip 7 ditambahkan, dan bagian 1 sampai 6 ditulis ulang |
| 28 September | **Kalimat pembeda diganti** dan bagian 4 ditulis ulang | Riset pembanding membatalkan dua klaim: Readlang punya penjelasan kontekstual berbasis AI, dan mendukung 119 bahasa termasuk Indonesia |
| 27 September | **Koreksi makna** yang berdampingan dengan jawaban model, bukan menimpanya | Satu satunya tanggapan untuk jawaban keliru sebelumnya adalah menghapus katanya, dan itu ikut membuang kalimat asal dari buku. Prinsip 3 diperluas menjadi dua arah, dan kata ragu yang sudah diputuskan pembaca kini boleh dikuiskan |

Setiap perubahan besar punya titik pulih di git: tag `v1-sebelum-tandai-foto`, `v2-sebelum-kuis`, `v3-sebelum-cadangan`, dan `v4-sebelum-pustaka`, dengan langkah kembali di `context/cara_kembali_ke_versi_lama.md`.
