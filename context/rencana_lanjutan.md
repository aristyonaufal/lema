# Rencana Lanjutan Lema

Disusun: 7 September 2026. Pelaksana sementara: Codex, melanjutkan pekerjaan Claude.
Status per 9 September 2026: Lanjutan 1–4 selesai, Lanjutan 5 sebagian (mode latihan sudah ada, review otomatis saat aplikasi dibuka belum), Lanjutan 7 sebagian besar selesai, bagian pemolesan tampilan pada Lanjutan 8 selesai. Lanjutan 6 belum dimulai.

## Keputusan pengguna dan cara kerja

- **9 September 2026, perubahan alur.** Makna sekarang langsung dibuka ketika tombol utama ditekan. Mode tunda tidak dihapus, tetapi turun menjadi tombol sekunder. Ini membalik prinsip nomor 1 pada PRD, dan PRD belum diselaraskan; keputusan itu ada pada pengguna.
- **10 September 2026, tandai tanpa mengetik.** Pengguna meminta gabungan menandai kata di foto dan coretan pensil yang dicari otomatis, dan meminta jalan kembali disiapkan. Dikerjakan di cabang `fitur/tandai-di-foto` dengan titik pulih `v1-sebelum-tandai-foto`; lihat `cara_kembali_ke_versi_lama.md`. Aplikasi yang bisa dipasang di layar HP dan kamera langsung sengaja dilewati atas pilihan pengguna.
- **9 September 2026, rute dan tampilan.** `/` menjadi beranda berisi ringkasan progres, layar foto pindah ke `/baca`. Tampilan dibuat responsif dengan sidebar kiri dan isi dua kolom mulai lebar laptop, sementara HP tetap memakai bilah bawah.

- Kamera langsung aktif sengaja ditunda pada tahap awal. Pemilih foto yang sekarang dipertahankan. Penambahan kamera dijadwalkan kemudian, sesuai arahan pengguna.
- Prioritas pertama: memperbaiki proses "simpan, lanjut baca" ketika berpindah halaman, menambahkan "buka sekarang", kemudian melengkapi detail peta makna.
- Kerjakan bertahap. Jangan menuntaskan seluruh daftar dalam satu prompt. Setiap tahap harus menghasilkan perubahan yang bisa diperiksa dan diuji sebelum beralih ke tahap berikutnya.
- Permintaan saat dokumen ini dibuat adalah menyusun rencana; belum ada implementasi pada sesi ini.
- Sebelum menulis kode, jelaskan bagian yang dikerjakan dengan bahasa sederhana dan baca panduan Next.js yang relevan di `node_modules/next/dist/docs/`, sesuai `AGENTS.md`.
- Akhiri setiap pekerjaan dengan memperbarui `catatan_pengerjaan.md`; perbarui status dalam dokumen ini dan `peta_pengerjaan_lema.md` jika ada kemajuan.
- Pertahankan data buku dan kata yang sudah tersimpan. Perubahan struktur data harus bisa membaca data lama.
- Fitur setelah v1 dalam PRD tetap menjadi rencana masa depan. Akun, sinkronisasi, audio, kuis pilihan ganda, dan aplikasi native tidak masuk pekerjaan lanjutan ini.

Nomor lanjutan di bawah berdiri sendiri dari tahap 0–6 pada peta pengerjaan awal.

## Lanjutan 1 — Penyimpanan dan proses saat berpindah halaman

Status: selesai. Sebelas pengujian browser pada build produksi lulus; build dan pemeriksaan tipe lulus, lint tanpa error. Lihat rincian dan batas pengujian dalam `catatan_pengerjaan.md`.

**Hasil yang dituju:** setelah menekan "simpan, lanjut baca", pengguna boleh membuka koleksi atau halaman lain dalam aplikasi tanpa kehilangan hasil pencarian.

- Pisahkan penyelesaian permintaan dan penyimpanan hasil dari umur layar pengambilan foto.
- Pastikan semua layar membaca perubahan dari sumber data yang sama, tanpa harus refresh.
- Gabungkan hasil dengan data terbaru agar beberapa halaman buku yang diproses bersamaan tidak menimpa kata atau perubahan lain.
- Tangani jaringan gagal dan penyimpanan gagal dengan status yang jelas.
- Jika refresh atau tab ditutup memutus proses, jangan membiarkan kata berstatus "diproses" selamanya. Beri penjelasan dan jalan untuk mengirim ulang foto; foto tidak dipersistenkan untuk pemulihan otomatis.
- Cegah hasil untuk kata lain dipasangkan hanya berdasarkan posisi dalam daftar ketika model mengembalikan hasil tidak lengkap.

**Bagian yang diperkirakan terlibat:** `lib/store.ts`, `lib/useDb.ts`, `app/page.tsx`, dan penghubung state/proses bersama bila diperlukan.

**Bukti selesai:** dengan respons model tiruan yang sengaja diperlambat, simpan lalu langsung pindah ke koleksi; hasil muncul dan tetap ada setelah refresh. Periksa dua permintaan yang selesai dalam urutan terbalik, kegagalan jaringan, hasil sebagian, dan pemulihan entri yang prosesnya terputus. Jalankan pemeriksaan tipe/lint yang relevan.

## Lanjutan 2 — Tombol "buka sekarang"

Status: selesai. Tombol pada layar penandaan dan tautan per kata terbaru membuka entri yang sama tanpa lookup ulang. Lima pengujian baru ditambahkan; seluruh 16 pengujian browser pada build produksi lulus.

**Hasil yang dituju:** pengguna bisa memilih melihat jawaban segera, sementara "simpan, lanjut baca" tetap menjadi tindakan utama.

- Tambahkan tombol sekunder pada layar penandaan kata.
- Arahkan pengguna ke kata yang baru dikirim, dengan status pemrosesan yang jelas sampai hasil siap.
- Sediakan akses membuka kata yang baru disimpan dari alur tunda, termasuk saat hasil belum selesai.
- Gunakan entri dan permintaan yang sama; membuka hasil tidak memanggil model atau menyimpan kata untuk kedua kalinya.

**Bagian yang diperkirakan terlibat:** `app/page.tsx`, `app/kata/page.tsx`, `components/SenseMap.tsx`.

**Bukti selesai:** alur tunda tetap kembali ke pengambilan foto; alur "buka sekarang" menampilkan kata yang dimaksud; respons lambat/gagal bisa dipahami; penekanan berulang tidak menggandakan permintaan atau entri.

## Lanjutan 3 — Detail peta makna

Status: selesai. Kata/frasa target ditebalkan, pemicu dan alasan kedua kandidat ditampilkan, serta teks sumber tetap utuh saat sorotan bertumpang tindih. Dua kandidat disusun vertikal di HP dan berdampingan mulai lebar 640 px. Sembilan pengujian baru ditambahkan; seluruh 25 pengujian browser pada build produksi lulus. Tampilan HP tema terang/gelap dan desktop telah diperiksa secara visual.

**Hasil yang dituju:** pembaca mudah melihat kata yang ditanyakan, maknanya, dan bukti di kalimat yang mendukung makna tersebut.

- Tebalkan kata/frasa target dalam kalimat asal, sekaligus pertahankan sorotan berbeda untuk kata pemicu.
- Tampilkan pemicu dan alasan untuk masing-masing kandidat ketika model ragu; jangan hanya menyorot kandidat pertama.
- Rapikan hierarki makna utama, bentuk dasar, makna lain, dan catatan hati-hati tanpa perombakan desain besar.
- Tangani frasa, perbedaan kapitalisasi, target/pemicu yang bertumpang tindih, dan teks yang tidak ditemukan tanpa merusak kalimat atau mengarang sorotan.
- Pastikan dua kandidat mudah dibandingkan pada layar HP; keterbacaan menjadi pertimbangan saat memilih susunan kolom.

**Bagian yang diperkirakan terlibat:** `components/SenseMap.tsx` dan bantuan pemformatan teks bila diperlukan.

**Bukti selesai:** periksa tampilan dengan contoh satu makna, dua kandidat, frasa, kata tidak ditemukan, serta kalimat panjang pada layar sempit. Pastikan teks sumber tetap utuh.

## Lanjutan 4 — Buku dan progres belajar

Status: **selesai**. Bagian pemilih buku selesai pada 8 September 2026. Bagian progres belajar selesai pada 9 September 2026 bersama pekerjaan beranda: `Entry` mendapat `passedReview`, `grade()` hanya menaikkannya dari false ke true sehingga jawaban "lupa" tidak menghapus riwayat, `bookSummary` menghitungnya, dan angkanya dipakai beranda serta rak buku. Data lama tanpa penanda itu dihitung belum pernah lolos, karena riwayatnya memang tidak pernah disimpan. Dua pengujian baru menutup kedua arah aturan itu.

Alasan pemecahan: batas pendaftaran Apple Developer Academy 14 September dengan target submit portfolio 12 September. Hanya bagian yang menghalangi demo, yaitu buku duplikat saat menekan "Ganti", yang dikerjakan lebih dulu. Deployment dan uji akurasi didahulukan di atas sisa Lanjutan 4 sampai 7.

Sudah selesai ditulis: daftar buku saat menekan "Ganti", pembuatan buku baru, buku kosong dan jumlah kata per buku, pencegahan judul duplikat, serta tombol batal.

Belum dikerjakan: pembedaan kata terkumpul, masih diproses, dan pernah lolos review pertama; penanda riwayat lolos review yang tidak hilang setelah menjawab "lupa"; serta aturan kompatibilitas untuk data lama yang tidak punya riwayat.

**Hasil yang dituju:** pengguna bisa melanjutkan buku lama dan melihat kemajuan belajar per buku.

- Sediakan pilihan buku yang sudah ada saat menekan "Ganti", serta pilihan membuat buku baru.
- Tampilkan buku kosong dan akses ke kata-kata di masing-masing buku.
- Bedakan jumlah kata terkumpul, hasil yang masih diproses, dan kata yang pernah lolos review pertama.
- Tambahkan penanda riwayat lolos review pertama yang tidak hilang ketika pengguna kemudian menjawab "lupa".
- Untuk data lama, jangan mengarang tanggal atau riwayat review yang memang tidak pernah disimpan; catat aturan kompatibilitasnya.

**Bagian yang diperkirakan terlibat:** `app/page.tsx`, `app/kata/page.tsx`, `lib/store.ts`.

**Bukti selesai:** berpindah antara dua buku tanpa membuat duplikat; koleksi tetap terpisah; progres bertambah setelah review pertama berhasil dan tidak salah turun setelah lupa; data lama tetap bisa dibuka.

## Lanjutan 5 — Alur review harian

Status: **sebagian**. Pada 9 September ditambahkan mode latihan atas permintaan pengguna: `/review?latihan=1`, bisa dipersempit per buku, mengambil kata mana pun tanpa menunggu jatuh tempo dan sengaja tidak menulis apa pun sehingga jadwal tangga 1/3/7/21 hari serta riwayat lolos review tetap utuh. Beranda dan halaman koleksi juga menampilkan pintasan ketika ada kata jatuh tempo.

Butir inti Lanjutan 5 masih belum dikerjakan: review yang ditawarkan **otomatis** saat aplikasi dibuka, beserta pilihan "nanti aja" dan penjagaan agar pengguna tidak terus dialihkan kembali ke review.

**Hasil yang dituju:** kata jatuh tempo ditawarkan otomatis saat aplikasi dibuka, dan pengguna dapat menilai ingatannya sesuai alur PRD.

- Buka atau tampilkan sesi review ketika aplikasi dibuka dan ada kata jatuh tempo, dengan pilihan "nanti aja".
- Jangan terus mengarahkan kembali ke review setelah pengguna menundanya atau ketika pengguna sedang menandai kata.
- Sesuaikan alur "Inget"/"Lupa"; ketika lupa, tampilkan makna dan kalimat asal sebelum melanjutkan.
- Perbaiki penandaan kata dalam kalimat review agar frasa dan perbedaan bentuk kata ditangani dengan jelas.
- Pertahankan tangga 1, 3, 7, 21 hari dan pengecualian untuk kata yang ditandai sudah tahu.
- Tetap gunakan contoh yang dibuat pada lookup awal; tidak menambah panggilan model pada setiap sesi review.

**Bagian yang diperkirakan terlibat:** `app/review/page.tsx`, `app/page.tsx`, `lib/store.ts`, serta penghubung sesi bila diperlukan.

**Bukti selesai:** simulasikan waktu jatuh tempo; periksa ingat, lupa, sudah tahu, tunda, serta pembukaan ulang aplikasi. Pastikan tidak ada putaran pengalihan halaman dan progres tercatat benar.

## Lanjutan 6 — Validasi hasil penentu makna

Status: belum dimulai.

**Hasil yang dituju:** jawaban model yang tidak lengkap atau salah bentuk tidak dianggap sebagai hasil yang sah.

- Validasi bentuk input, tiap kandidat, confidence, jumlah kandidat saat ambigu, serta kecocokan hasil dengan kata yang diminta.
- Tangani JSON salah bentuk, hasil sebagian, kata tidak ditemukan, dan respons model gagal secara konsisten.
- Pastikan contoh review tidak kosong atau sama persis dengan kalimat asal; kualitas dan kesamaan maknanya tetap memerlukan uji akurasi.
- Tetapkan batas percobaan ulang dan hubungan dengan model cadangan; catat jika berbeda dari aturan ulang sekali di PRD.
- Selaraskan dokumentasi kontrak dengan bentuk aktual `candidates[]`, `found`, dan `page_excerpt` tanpa merusak koleksi lama.

**Bagian yang diperkirakan terlibat:** `app/api/lookup/route.ts`, `lib/types.ts`, `lib/prompt.ts`, dan bagian kontrak data pada PRD setelah keputusan implementasi ditetapkan.

**Bukti selesai:** respons tiruan mencakup JSON rusak, kandidat tidak lengkap, ambigu tanpa kandidat kedua, hasil tertukar/kurang, kata tidak ditemukan, serta kegagalan model. Verifikasi nama/ketersediaan model saat pekerjaan membutuhkan perubahan model, bukan berdasarkan ingatan.

## Lanjutan 7 — Batas pemakaian dan informasi privasi

Status: **sebagian besar selesai** pada 8 September 2026 oleh Claude. Hitung per kata, penghitung bersama opsional lewat Upstash REST, penanganan kegagalan pembatas, pengembalian jatah saat gagal total, keterangan privasi foto, dan pemeriksaan bundle browser sudah selesai dan lulus 37/37 pengujian.

Sisa yang belum: menguji jalur Upstash terhadap layanan sungguhan, termasuk saat lambat dan saat menolak. Kredensialnya diisi saat deployment.

**Hasil yang dituju:** batas harian menghitung kata secara benar dan tetap berlaku ketika aplikasi dijalankan di hosting.

- Hitung jumlah kata yang dikirim, bukan hanya jumlah permintaan; samakan pesan dengan satuan dan batas yang berlaku.
- Gunakan penghitung yang dapat dibagikan antar proses/server; penyimpanan ini hanya untuk batas pemakaian, bukan koleksi pengguna.
- Tetapkan perilaku untuk permintaan bersamaan, kegagalan layanan pembatas, dan percobaan ulang internal.
- Tambahkan informasi yang akurat tentang foto: diproses untuk pencarian makna, dikirim ke penyedia model, dan tidak disimpan sebagai koleksi foto oleh aplikasi.
- Periksa kunci API tetap berada di server dan tidak masuk bundle browser.

**Bagian yang diperkirakan terlibat:** `app/api/lookup/route.ts`, antarmuka pengiriman foto, dan konfigurasi deployment yang diperlukan.

**Bukti selesai:** uji satu dan lima kata, batas harian, pergantian hari, permintaan bersamaan, serta penghitung lintas proses. Periksa bundle produksi tanpa mencetak nilai rahasia.

## Lanjutan 8 — Uji kualitas, pemolesan, dan persiapan rilis

Status: **bagian pemolesan tampilan selesai** pada 8 September 2026 oleh Claude. Seluruh layar dirombak mengikuti rujukan desain yang diberikan pengguna: navigasi bawah dengan penghitung, penyaring koleksi, judul serif, punggung buku berwarna, aksi utama dalam jangkauan jempol, serta keadaan kosong dan keadaan memuat. Build, lint tanpa error, dan 37/37 pengujian lulus; rinciannya di `catatan_pengerjaan.md`.

Sisa Lanjutan 8 belum dikerjakan: uji akurasi, pencatatan metrik, pengukuran waktu proses, uji Safari iPhone, dan bahan demo. Pemeriksaan tampilan sejauh ini memakai Chromium yang meniru lebar telepon, bukan perangkat sungguhan.

- Uji minimal 15 kata sulit dari buku asli dengan target minimal 12 benar, serta minimal 15 kata dari Threads sesuai PRD. Rencana pengumpulan 40 kata di peta awal dapat menjadi kumpulan bahan uji tambahan.
- Catat hasil benar/salah dan penilaian ambigu secara jujur; uji tiruan tidak menggantikan uji kualitas model.
- Siapkan pencatatan metrik PRD: jumlah pencarian, kembali hari kedua, persentase ambigu, dan lolos review pertama. Bedakan metrik yang dapat dihitung dari koleksi lokal dengan data kunjungan yang belum dicatat; tentukan cara pengukuran sebelum mengklaim hasil portfolio.
- Ukur waktu proses dan kemudahan alur. Target empat ketukan untuk alur kamera baru dapat dinilai setelah penambahan kamera dijadwalkan pengguna.
- Poles tampilan per layar, rapikan alat internal sebelum rilis, lalu siapkan deployment Vercel. Halaman lab masih ada; tombol paksa jatuh tempo saat ini sudah dibatasi ke mode development.
- Jadwalkan kamera dan uji Safari iPhone bersama pengguna setelah tahap awal ini. Pengujian kamera asli tetap merupakan syarat rilis PRD yang belum selesai.
- Dokumentasikan hasil pengujian, batas yang masih ada, dan bahan demo/portfolio. Tanggal rilis yang tercantum di PRD adalah target awal, bukan bukti kesiapan.

**Bukti selesai:** hasil uji yang bisa ditinjau, catatan metrik dengan sumber jelas, daftar syarat rilis yang benar-benar terpenuhi, dan sisa pekerjaan yang dinyatakan terbuka bila belum diuji.

## Serah terima ke Claude

Baca `catatan_pengerjaan.md` untuk perubahan yang sudah dilakukan, dokumen ini untuk urutan pekerjaan berikutnya, dan `peta_pengerjaan_lema.md` untuk status keseluruhan. Bedakan rencana, temuan dari pembacaan kode, dan hasil yang sudah diuji. Jangan menganggap tahap sudah selesai hanya karena tercantum di sini.
