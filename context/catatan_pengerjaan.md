# Catatan Pengerjaan Lema

Catatan bersama untuk serah terima pekerjaan antara Claude, Codex, dan pengguna.
Tambahkan entri pada setiap pekerjaan; jangan menghapus riwayat keputusan dan hasil uji sebelumnya.
Jangan mencantumkan API key, isi `.env.local`, atau data rahasia dalam catatan.

## 7 September 2026 — Codex: memahami proyek dan menyusun rencana lanjutan

**Permintaan pengguna:** Codex mengambil alih sementara dan meninggalkan catatan agar Claude dapat melanjutkan. Pengguna meminta pekerjaan dibagi beberapa tahap; sesi ini khusus menyusun rencana.

### Konteks yang dibaca

- `context/PRD-Lema.md`, `context/peta_pengerjaan_lema.md`, `AGENTS.md`, dan `CLAUDE.md`.
- Kode pengambilan foto/penandaan, penyimpanan lokal, koleksi, review, peta makna, endpoint lookup/model, prompt, tipe data, dan pengecil foto.
- Audit dilakukan dengan membaca kode. Aplikasi, pengujian, dan layanan model tidak dijalankan.

### Keputusan pengguna

- Kamera langsung aktif sengaja belum ditambahkan pada tahap awal. Ini penundaan yang disengaja, bukan tugas implementasi sekarang.
- Prioritas: perbaiki proses setelah "simpan, lanjut baca", tambahkan "buka sekarang", kemudian detail peta makna.
- Kekurangan lainnya dikerjakan bertahap. Jangan menyelesaikan seluruh fitur dalam satu prompt.
- Setiap pekerjaan perlu penjelasan sederhana, daftar perubahan, hasil verifikasi, dan langkah berikutnya untuk serah terima.

### Temuan yang menjadi dasar rencana

- Fitur inti tersedia di kode: menandai sampai lima kata, lookup gambar, makna kontekstual/dua kandidat, koleksi lokal per buku, jadwal review, serta tombol sudah tahu.
- `useDb` memiliki state terpisah per layar. Penyimpanan hasil lookup bergantung pada callback pembaruan state layar asal. Pindah halaman ketika request belum selesai berisiko membuat hasil tidak tersimpan/terlihat. Ini temuan dari kode, belum direproduksi melalui pengujian.
- "Buka sekarang" belum ada. Review jatuh tempo baru berupa tautan manual.
- Peta makna belum menebalkan kata target pada kalimat asal dan baru menyorot pemicu kandidat pertama.
- "Ganti" buku membuka form buku baru; belum ada pilihan melanjutkan buku lama.
- Progres koleksi menghitung hasil lookup siap, belum riwayat lolos review pertama.
- Batas harian memakai penghitung permintaan dalam memori proses, meskipun pesan menyebut kata.
- Validasi JSON belum menyeluruh. Pemasangan hasil memakai urutan sebagai cadangan sehingga hasil sebagian perlu ditangani lebih aman.
- Kontrak aktual memakai `candidates[]`, `found`, dan `page_excerpt`; PRD awal memakai `applied_sense`/`alternative_sense`.
- Rantai model cadangan sudah ada; ketepatan/ketersediaan model tidak diverifikasi pada audit ini.
- Pemberitahuan privasi foto belum terlihat. Tidak ditemukan pencatatan metrik kunjungan kembali hari kedua pada kode yang diperiksa.
- Bukti akurasi, kamera Safari iPhone, waktu proses, dan kesiapan rilis belum diverifikasi oleh Codex.

### Perubahan sesi ini

- Membuat `context/rencana_lanjutan.md`: delapan tahap, dependensi, ruang lingkup, serta bukti selesai masing-masing.
- Membuat `context/catatan_pengerjaan.md`: catatan keputusan, temuan audit, dan serah terima ini.
- Memperbarui pengantar status `context/peta_pengerjaan_lema.md` untuk membedakan fondasi yang sudah dibangun dari kekurangan yang masih terbuka, serta menautkan dua dokumen baru.
- Tidak mengubah kode aplikasi, konfigurasi, dependensi, atau PRD produk.

### Verifikasi dan batasnya

- Memeriksa isi dokumen dan kesesuaian tautan lokal yang ditambahkan.
- Tidak menjalankan build, lint, tes, browser, atau panggilan API; perubahan hanya dokumentasi.
- Working tree sudah berisi perubahan dari pekerjaan sebelumnya saat Codex mulai memeriksa. Perubahan tersebut tidak boleh dianggap sebagai hasil implementasi Codex atau dibersihkan tanpa alasan.

### Langkah berikutnya

Implementasikan **Lanjutan 1: penyimpanan dan proses saat berpindah halaman**. Mulai dengan membaca panduan Next.js lokal yang relevan, lalu perbaiki fondasi penyimpanan dan verifikasi dengan respons model tiruan yang diperlambat. Laporkan hasil tahap ini sebelum melanjutkan ke tombol "buka sekarang".

## 7 September 2026 — Codex: Lanjutan 1, penyimpanan saat berpindah halaman

**Permintaan pengguna:** kerjakan langkah pertama saja. Kamera, "buka sekarang", dan detail peta makna belum menjadi implementasi sesi ini.

**Status sesi:** selesai. Build produksi, pemeriksaan tipe, dan 11 pengujian browser lulus; lint tanpa error.

### Perubahan perilaku

- Semua layar memakai satu pengelola koleksi dalam root layout. Hasil lookup memperbarui data bersama dan localStorage meskipun layar pengambilan foto sudah ditinggalkan.
- Pembaruan selalu dihitung dari data terbaru, sehingga beberapa permintaan yang selesai dengan urutan berbeda tidak menimpa koleksi, status sudah tahu, atau hasil review.
- Antrean harus berhasil disimpan sebelum foto dikirim. Jika penyimpanan gagal, foto dan kata tetap di layar, dan tidak ada permintaan model yang dimulai.
- Jika hasil model sudah diterima tetapi gagal disimpan, hasil tetap terlihat dalam memori dengan peringatan. Tombol "Coba simpan lagi" menyimpan hasil yang sama tanpa mengirim foto lagi.
- Setelah aplikasi dimuat ulang, entri pending lama berubah menjadi error yang bisa ditindaklanjuti lewat "Pilih ulang foto". Foto tidak disimpan untuk melanjutkan proses otomatis.
- Permintaan yang macet dibatasi 75 detik di browser, sedikit lebih panjang dari batas 60 detik endpoint yang sudah ada.
- Respons sebagian dicocokkan dengan kata setelah trim dan normalisasi kapitalisasi, tanpa cadangan posisi daftar. Kata yang tidak mendapat hasil menjadi error yang jelas.
- Kata yang berbeda hanya kapitalisasi tidak dikirim dua kali. Pengejaan pertama dipertahankan.
- Koleksi yang gagal dibaca tidak diam-diam diganti koleksi kosong atau ditimpa; tersedia "Coba baca lagi".

### File yang diubah

- `lib/client-db.ts` (baru): snapshot koleksi bersama, langganan pembaruan layar, penyimpanan sinkron, pemulihan awal, dan penyimpanan ulang saat gagal.
- `lib/lookup-client.ts` (baru): antrean tersimpan sebelum pengiriman, proses async yang tidak bergantung pada state halaman, pencocokan hasil, dan timeout.
- `components/DbProvider.tsx` (baru): pengelola data untuk seluruh root layout dan pemberitahuan kegagalan penyimpanan.
- `lib/useDb.ts`: membaca sumber data bersama menggunakan `useSyncExternalStore`, serta menyediakan fungsi `lookup` dan pembaruan data.
- `lib/store.ts`: kegagalan baca/tulis diteruskan agar UI bisa menanganinya; menambahkan pemulihan entri pending yang terputus. Key `lema.v1`, bentuk koleksi normal, dan jadwal review tetap dipakai.
- `app/layout.tsx`: memasang provider di sekitar halaman. Layout tetap menjadi Server Component.
- `app/page.tsx`: memakai koordinator lookup, mempertahankan isian jika antrean gagal disimpan, mencegah pengiriman berulang, dan membersihkan URL pratinjau/timer tampilan.
- `app/kata/page.tsx` dan `app/review/page.tsx`: menghitung pembaruan dari koleksi terbaru; review tidak maju jika penyimpanan jawabannya gagal.
- `components/SenseMap.tsx`: menambahkan jalan memilih ulang foto pada kartu error. Link memilih buku asal sebelum kembali ke pengiriman; tidak mengubah detail peta makna tahap berikutnya.
- `tests/storage.spec.ts` dan `playwright.config.ts` (baru): pengujian browser terisolasi dengan respons lookup tiruan dan foto PNG buatan.
- `package.json`/`package-lock.json`: menambah `@playwright/test` sebagai dependensi pengembangan dan perintah `test:e2e`; tidak ada dependensi runtime baru.
- `.gitignore`: mengabaikan `test-results` dan `playwright-report`.
- Tiga dokumen context: memperbarui status tahap dan mencatat serah terima.

### Keputusan teknis dan rujukan

- Provider dibuat satu kali per root layout; tidak memakai singleton data pengguna pada server. Snapshot awal tidak membaca browser, sehingga aman untuk render server/hydration.
- `update` menerima fungsi perubahan, mengembalikan boolean keberhasilan, dan tidak menyimpan melalui callback `setState` halaman.
- Penyelesaian jaringan memakai data terbaru. Bila gagal menulis hasil, simpan hasil di memori dengan peringatan, bukan mengulang panggilan model.
- Membaca panduan Next.js lokal tentang layout, Server/Client Components, navigasi, dan Playwright. Menggunakan dokumentasi React resmi melalui Context7 untuk `useSyncExternalStore`.
- Pemeriksaan tambahan menemukan ketidakkonsistenan deduplikasi kapitalisasi; sudah diselaraskan antara UI, antrean, dan pencocokan hasil.

### Verifikasi

- `npm run build`: lulus dengan Next.js 16.3.4; kompilasi, pemeriksaan TypeScript, dan prerender halaman berhasil.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false`: lulus.
- `npm run lint`: lulus tanpa error, dengan dua peringatan `<img>` pada pratinjau halaman utama dan lab. Keduanya tetap menggunakan gambar lokal/blob seperti sebelumnya.
- `PLAYWRIGHT_TEST_PRODUCTION=1` + `npm run test:e2e`: **11/11 lulus pada build produksi, Chromium, 9,4 detik**. Cakupan: navigasi lalu refresh; dua batch selesai terbalik sambil mempertahankan perubahan sudah tahu; jaringan gagal; hasil sebagian; refresh saat proses; pembukaan pending lama; gagal menyimpan antrean; simpan ulang hasil tanpa fetch; duplikat kapitalisasi; koleksi tidak terbaca; dan timeout.
- Pada refresh, browser dapat menjalankan catch jaringan sebelum dokumen ditutup, sehingga pesan akhirnya bisa "gagal menghubungi server" atau "proses sebelumnya terputus". Tes menerima keduanya selama status bukan pending dan tersedia jalan memilih ulang foto; pemulihan pending lama diuji terpisah.
- Semua permintaan `/api/lookup` pada tes dicegat dan diberi respons tiruan; tidak menggunakan kuota Gemini atau foto pengguna.
- Browser uji memakai full Chromium dengan `channel: 'chromium'`. Unduhan headless shell terpisah sempat gagal; full Chromium berhasil tersedia.
- Cara menjalankan: pasang browser dengan `npx playwright install chromium --no-shell`, lalu `npm run test:e2e` (server dev uji di 127.0.0.1:3100). Setelah `npm run build`, pada PowerShell jalankan `$env:PLAYWRIGHT_TEST_PRODUCTION = '1'`, lalu `npm.cmd run test:e2e` untuk suite yang sama dengan server produksi. Gunakan terminal baru atau hapus variabel itu untuk kembali ke mode dev.

### Batas dan langkah berikutnya

- Jaminan tahap ini adalah perpindahan halaman dalam satu tab. Sinkronisasi dan konflik beberapa tab belum ditangani.
- Menutup tab/refresh ketika request masih berjalan dapat memutus proses. Saat dibuka lagi, tampilkan error dan minta foto dikirim ulang; jangan mengklaim request selalu berjalan ketika browser sudah ditutup.
- Jika browser menolak penyimpanan hasil, data dalam memori masih membutuhkan tombol simpan ulang sebelum halaman ditutup atau dimuat ulang.
- API/model nyata, Safari iPhone, akurasi makna, dan syarat rilis belum diuji dalam sesi ini.
- Tahap ini sudah selesai. Pekerjaan berikutnya adalah **Lanjutan 2: "buka sekarang"**; belum dikerjakan dalam sesi ini.

## 7 September 2026 — Codex: Lanjutan 2, "buka sekarang"

**Permintaan pengguna:** lanjutkan langkah berikutnya setelah perbaikan penyimpanan, sesuai urutan rencana. Sesi ini hanya mengerjakan Lanjutan 2.

**Status sesi:** selesai. Build produksi dan 16 pengujian browser lulus; lint tanpa error.

### Perubahan perilaku

- Menambahkan tombol sekunder "Buka sekarang" di bawah "Simpan, lanjut baca". Keduanya memakai pengiriman dan pengaman duplikasi yang sama dari Lanjutan 1.
- Tombol baru menyimpan antrean dahulu, lalu membuka kata-kata dari pengiriman itu. Tidak perlu menunggu respons model untuk berpindah layar.
- Halaman utama menampilkan maksimal lima kata terbaru dari buku aktif, beserta status Diproses/Siap dibuka/Gagal diproses dan tautan "Buka sekarang" untuk masing-masing. Makna tidak ditampilkan di layar pengambilan foto.
- Tautan kata terbaru berasal dari koleksi yang tersimpan sehingga tetap tersedia setelah pengguna kembali atau memuat ulang halaman.
- Halaman koleksi dapat menampilkan hanya kata yang dipilih dengan judul "Peta makna", informasi proses yang masih berlangsung, "Lanjut baca", serta "Lihat semua kata".
- Hasil yang sudah siap, masih diproses, atau gagal dibuka dari entri yang sama; membuka atau kembali ke hasil tidak membuat permintaan model atau entri kedua.
- Jika antrean gagal disimpan, "Buka sekarang" tetap berada di layar pengiriman dengan foto dan kata dipertahankan.
- Tautan ke entri yang tidak tersedia menampilkan penjelasan, bukan menampilkan hasil lain seolah-olah itu kata yang diminta.

### File yang diubah

- `app/page.tsx`: menyatukan tindakan simpan melalui `saveWords(openNow)`, navigasi setelah antrean tersimpan, tombol sekunder, serta daftar kata terbaru tanpa arti.
- `app/kata/page.tsx`: membaca parameter `entry`, menyaring berdasarkan ID entri lokal, memberi navigasi kembali/seluruh koleksi, serta menangani hasil belum siap atau ID yang hilang.
- `tests/storage.spec.ts`: menambahkan lima pengujian untuk alur membuka hasil dan mempertahankan sebelas pengujian penyimpanan sebelumnya.
- `context/rencana_lanjutan.md`, `context/peta_pengerjaan_lema.md`, dan catatan ini: status tahap dan serah terima.
- Tidak mengubah kontrak data, penyimpanan, endpoint/prompt model, dependensi, kamera, atau detail kartu peta makna pada sesi ini.

### Keputusan teknis

- URL hasil memakai `/kata?entry=<id>`; satu pengiriman beberapa kata memakai parameter `entry` berulang. Identitas berdasarkan ID, sehingga kata yang sama dari pencarian berbeda tetap terpisah.
- `useRouter` dari `next/navigation` dipakai setelah penyimpanan untuk membuka hasil; tautan yang hanya membuka entri tersimpan memakai `Link`.
- `useSearchParams` berada di dalam `Suspense`, sesuai panduan Next.js lokal, sehingga halaman koleksi tetap bisa diprerender dan build produksi tidak gagal.
- Membaca panduan Next.js lokal tentang `useRouter`, `useSearchParams`, dan `Link`, serta memeriksa dokumentasi resmi melalui Context7.
- URL hanya menunjuk data lokal yang sudah ada. Membuka URL tidak mengambil atau membuat makna baru; entri yang tidak ada di browser itu ditangani secara eksplisit.

### Verifikasi

- `npm run build`: lulus, termasuk pemeriksaan TypeScript dan prerender halaman koleksi.
- `PLAYWRIGHT_TEST_PRODUCTION=1` + `npm run test:e2e`: **16/16 lulus, Chromium, 16,2 detik**.
- Lima skenario baru: buka beberapa kata dengan klik berulang dan riwayat kata yang sama; alur tunda tetap menyembunyikan arti serta tautan hasil siap bertahan setelah refresh; membuka kata yang masih diproses lalu gagal; penyimpanan antrean gagal tidak mengarahkan halaman; dan ID hilang/duplikat tidak membuka hasil lain.
- Permintaan model seluruhnya ditiru melalui intersepsi `/api/lookup`; tidak menggunakan foto pengguna atau kuota Gemini.
- `npm run lint`: lulus tanpa error, dengan dua peringatan `<img>` untuk pratinjau halaman utama dan lab yang sudah ada sebelumnya.

### Langkah berikutnya dan batas

- Berikutnya: **Lanjutan 3, detail peta makna** (kata target ditebalkan, pemicu masing-masing kandidat, dan keterbacaan kartu).
- Makna dari model nyata dan kamera Safari iPhone belum diuji. Batas refresh/penutupan tab dan penyimpanan lokal dari Lanjutan 1 tetap berlaku.

## 7 September 2026 — Codex: menyalakan localhost untuk pengguna

**Permintaan pengguna:** `localhost:3000` tidak bisa diakses.

- Pemeriksaan menemukan tidak ada server yang mendengarkan port 3000 maupun 3100. Server pengujian sebelumnya memang berhenti setelah tes selesai.
- Menyalakan Next.js dev di background tanpa jendela terminal baru, dengan perintah `node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3000` dari folder proyek.
- Server dibiarkan berjalan agar pengguna dapat mencoba aplikasi. Alamat: `http://localhost:3000` atau `http://127.0.0.1:3000`.
- Verifikasi: GET `http://localhost:3000` mengembalikan **HTTP 200** dan judul halaman **Lema**.
- Log server lokal berada di `.next/lema-dev.stdout.log` dan `.next/lema-dev.stderr.log` (diabaikan Git).
- Tidak mengubah kode aplikasi atau tahap fitur. Lanjutan 3 tetap merupakan pekerjaan berikutnya.
- Saat mengerjakan pengujian berikutnya, periksa server dev yang sudah aktif sebelum menyalakan server dev kedua; keduanya memakai direktori `.next/dev` yang sama.

## 7 September 2026 — Codex: Lanjutan 3, detail peta makna

**Permintaan pengguna:** kerjakan langkah berikutnya, yaitu detail peta makna. Sesi ini menyelesaikan Lanjutan 3; buku/progres dan tahap berikutnya dikerjakan pada sesi terpisah.

**Status sesi:** selesai. Build produksi beserta pemeriksaan TypeScript dan seluruh 25 pengujian browser lulus; lint tanpa error. Tampilan HP tema terang/gelap dan desktop telah diperiksa secara visual.

### Perubahan perilaku

- Kata atau frasa yang ditanyakan ditebalkan pada setiap kemunculan dalam kalimat asal. Kapitalisasi dan perbedaan spasi/baris tidak menghalangi pencocokan; tulisan asli tetap dipertahankan.
- Pemicu makna disorot terpisah dari penebalan target. Saat ada dua kandidat, kandidat pertama memakai hijau dan kandidat kedua memakai kuning, dengan nomor yang sama pada legenda dan kartu penjelasannya.
- Kedua kandidat kini memiliki kutipan pemicu lengkap dan alasan masing-masing. Bila kedua pemicu bertumpang tindih, bagian bersama memakai latar hijau dan garis bawah kuning; target di dalamnya tetap tebal.
- Kalimat asal, makna yang berlaku, bentuk dasar, makna lain, dan catatan hati-hati dipisahkan dengan hierarki yang lebih jelas. Tombol sudah tahu tetap berfungsi.
- Dua kandidat disusun vertikal pada layar kecil agar penjelasan mudah dibaca, lalu berdampingan mulai lebar 640 px. Kata panjang dapat membungkus tanpa mendorong halaman ke samping.
- Target atau pemicu yang tidak cocok dengan teks sumber tidak dipaksakan mendapat sorotan. Ada penjelasan saat potongan tidak ditemukan atau pemicu kosong.
- Jika model menyatakan kata tidak ditemukan di halaman, kartu menandai hasil sebagai arti umum dan tidak menampilkan sorotan/alasan seolah-olah menjadi bukti kontekstual.
- Jika hasil ambigu hanya memiliki satu kandidat, ketidakpastian tetap dijelaskan. Hasil tanpa kandidat pertama mendapat tampilan error dengan jalan memilih ulang foto, alih-alih menyebabkan kartu gagal dirender.

### File yang diubah

- `components/SenseMap.tsx`: detail kartu, penjelasan per kandidat, legenda, sorotan bertumpang tindih, kondisi hasil tidak lengkap, serta tata letak responsif.
- `lib/text-matches.ts` (baru): pencocokan kata/frasa utuh dan pemecahan kalimat berdasarkan batas sorotan, tanpa mengubah teks sumber.
- `tests/sense-map.spec.ts` (baru): sembilan pengujian browser untuk pemformatan teks, kedua kandidat, kondisi tanpa kecocokan, dan tampilan layar sempit.
- `.gitignore`: mengabaikan `/.local/`, lokasi baru log server development agar tidak mengganggu build.
- `context/rencana_lanjutan.md`, `context/peta_pengerjaan_lema.md`, dan catatan ini: status tahap dan serah terima.
- Tidak ada perubahan endpoint/prompt model, kontrak `LookupResult`, struktur penyimpanan `lema.v1`, atau dependensi pada tahap ini. Koleksi yang sudah tersimpan memakai tampilan baru saat dibuka.

### Keputusan teknis dan rujukan

- Pencocokan literal mengabaikan kapitalisasi dan menyetarakan rangkaian whitespace hanya untuk mencari rentang; render tetap mengambil potongan dari kalimat asli. Batas kata mencegah contoh `he` tersorot di dalam `the`.
- Cari `word` dahulu, lalu `lemma` hanya jika bentuk kata yang diminta tidak ditemukan. Tidak menebak perubahan bentuk kata atau sinonim. Validasi dan peningkatan review memiliki tahap sendiri.
- Pemicu dipakai utuh, menggantikan pembatasan 40 karakter sebelumnya; awalan yang kebetulan sama tidak menjadi bukti kecocokan seluruh kutipan.
- Pemformatan memakai potongan teks JSX dan `Fragment` dengan key; tidak memakai `innerHTML`. Tanda baca khusus regex di-escape, dan teks mirip HTML tetap tampil sebagai teks.
- Membaca panduan Next.js lokal tentang Server/Client Components dan CSS sebelum menulis kode. Memeriksa dokumentasi React resmi melalui Context7 untuk pemetaan JSX dan keyed Fragment.

### Verifikasi

- `npm run build`: lulus pada Next.js 16.3.4, termasuk TypeScript dan prerender.
- `npm run lint`: **0 error**, dengan dua peringatan `<img>` yang sudah ada pada `app/page.tsx` dan `app/lab/page.tsx`.
- `PLAYWRIGHT_TEST_PRODUCTION=1` + `npm run test:e2e`: **25/25 lulus, Chromium, 15,9 detik**. Mencakup sembilan tes peta makna baru dan seluruh 16 tes penyimpanan/"buka sekarang" sebelumnya.
- Cakupan baru: frasa berulang dengan kapitalisasi/spasi/baris berbeda; target dan dua pemicu bertumpang tindih; target/pemicu tidak cocok termasuk kutipan panjang; tanda baca regex dan teks mirip HTML; fallback bentuk dasar dan pemicu kosong; arti umum saat kata tidak ditemukan; tema terang/gelap serta perbandingan HP/desktop; kata sangat panjang; dan hasil ambigu tanpa kandidat kedua.
- Tes menggunakan koleksi contoh terisolasi serta intersepsi endpoint, tanpa foto pengguna atau kuota Gemini. Tes ini memeriksa perilaku antarmuka, bukan akurasi makna model nyata.
- Memeriksa langsung screenshot HP lebar 375 px pada tema terang dan gelap serta desktop 1000 px. Kedua kandidat terbaca jelas; tidak ada teks terpotong atau luapan horizontal. Pemeriksaan otomatis juga memastikan tidak ada scroll horizontal pada lebar 320 px.
- Screenshot tersimpan di subfolder hasil tes responsif pada `test-results/`: `sense-map-mobile-light.png`, `sense-map-mobile-dark.png`, dan `sense-map-desktop.png`. Folder ini diabaikan Git dan hasilnya dapat dibuat ulang dengan suite tes.
- `git diff --check`: lulus.

### Perbaikan server lokal saat verifikasi

- Build awal gagal dengan `EBUSY` karena log server development pada sesi sebelumnya berada langsung di `.next/` dan masih dibuka proses Windows ketika build mencoba membersihkan folder itu.
- Menghentikan server proyek yang terkait, memindahkan lokasi output log ke `.local/lema-dev.stdout.log` dan `.local/lema-dev.stderr.log`, lalu menyalakan kembali server di background tanpa jendela baru. Build berhasil setelah perubahan lokasi log.
- Server development kembali berjalan pada `http://localhost:3000`; GET berhasil dengan HTTP 200. Server dibiarkan aktif untuk pengguna. PID proses induk saat dinyalakan ulang adalah 16068; periksa proses/port lagi sebelum menghentikannya karena PID dapat berubah.
- Untuk sesi berikutnya, gunakan `.local/` sebagai lokasi log. Jangan menaruh log proses aktif langsung di `.next/` dan jangan menjalankan dua server dev yang memakai `.next/dev` bersamaan.

### Batas dan langkah berikutnya

- Pengujian model nyata, akurasi kutipan/pemicu, dan Safari iPhone belum dilakukan. Validasi menyeluruh terhadap bentuk respons model tetap masuk Lanjutan 6; pengaman tampilan di tahap ini tidak menggantikannya.
- Batas penyimpanan satu tab dan pemulihan setelah refresh/penutupan tab dari Lanjutan 1 tetap berlaku. Kamera langsung aktif masih sengaja ditunda.
- Berikutnya adalah **Lanjutan 4: buku dan progres belajar**, termasuk memilih buku lama dan mencatat riwayat lolos review pertama. Belum diimplementasikan pada sesi ini.

## 8 September 2026 — Claude: Lanjutan 4 bagian pertama, pemilih buku

**Permintaan pengguna:** melanjutkan sesuai penilaian pelaksana. Keputusan yang diambil: memecah Lanjutan 4 dan mengerjakan bagian pemilih buku lebih dulu, lalu mendahulukan deployment dan uji akurasi karena batas pendaftaran Apple Developer Academy 14 September dan target submit portfolio 12 September. Bagian milestone progres dan riwayat lolos review pertama sengaja ditunda ke sesi lain.

**Status sesi:** selesai. Build produksi dan seluruh 30 pengujian browser lulus, dijalankan pada salinan terpisah di lingkungan Linux; lihat bagian verifikasi untuk dua perbedaan lingkungan dan batasnya.

### Masalah yang diperbaiki

Menekan "Ganti" mengosongkan buku aktif dan hanya menampilkan satu isian judul. Tidak ada daftar buku lama, sehingga kembali ke buku yang sama membuat buku kedua dengan koleksi terpisah. Ini merusak demo dan memecah koleksi pengguna.

### Perubahan perilaku

- "Ganti" kini membuka layar pemilih tanpa mengosongkan buku aktif. Ada tombol batal yang kembali ke buku semula.
- Layar pemilih menampilkan daftar buku, terbaru di atas, beserta jumlah kata, jumlah yang masih diproses, dan jumlah yang gagal. Buku yang sedang dibaca ditandai.
- Judul yang hanya berbeda huruf besar kecil atau jumlah spasi dianggap buku yang sama. Mengetik judul yang sudah ada akan melanjutkan buku itu, dan tombolnya berubah menjadi "Lanjutkan buku ini" dengan penjelasan singkat.
- Judul kosong tetap menjadi "Tanpa judul", dan kini tidak lagi menghasilkan banyak buku "Tanpa judul".
- Judul buku pada layar pengambilan foto menjadi `h1`. Sebelumnya layar itu tidak punya heading utama.

### File yang diubah

- `lib/store.ts`: `normalizeTitle`, `cleanTitle`, `findBookByTitle`, `selectBook`, `bookSummary`, `booksByRecent`, serta `addBook` yang kini melanjutkan buku lama alih-alih menduplikasi. Bentuk data `lema.v1` tidak berubah, jadi koleksi lama tetap terbaca tanpa migrasi.
- `app/page.tsx`: layar pemilih buku, state `choosing`, ringkasan per buku, dan heading utama.
- `tests/books.spec.ts` (baru): lima pengujian browser untuk pemilihan buku lama, judul duplikat dengan beda kapitalisasi dan spasi, pembuatan buku baru, tombol batal, serta ringkasan jumlah kata.

### Keputusan teknis

- Buku aktif tidak dikosongkan saat memilih. Mengosongkan lebih dulu membuat pengguna kehilangan konteks bila membatalkan.
- Pencocokan judul memakai perbandingan sederhana tanpa huruf besar kecil dan tanpa spasi ganda. Tidak ada pencocokan mirip atau koreksi ejaan, supaya dua buku yang memang berbeda tidak digabung diam diam.
- `selectBook` mengabaikan id yang tidak dikenal, agar data lama tidak mengosongkan buku aktif.
- Foto dan kata yang sedang disiapkan sengaja tidak dihapus saat berganti buku. Kata belum terkirim, dan buku baru menentukan tujuan saat penyimpanan.
- Membaca `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md` sesuai `AGENTS.md`. Perubahan ini seluruhnya di dalam Client Component yang sudah ada, tanpa API Next.js baru.

### Verifikasi

- `npx tsc --noEmit` pada proyek asli: lulus.
- `npx eslint app/page.tsx lib/store.ts tests/books.spec.ts` pada proyek asli: **0 error**, satu peringatan `no-img-element` lama pada `app/page.tsx`.
- `node_modules` proyek hanya memuat binding `@next/swc-win32-x64-msvc`, sehingga build tidak dapat dijalankan langsung dari lingkungan Linux sesi ini tanpa merusak pemasangan Windows. Solusinya: menyalin berkas sumber ke salinan terpisah di luar folder proyek, lalu `npm ci` memakai `package-lock.json` yang sama.
- `npm run build` pada salinan: **lulus**. Kompilasi, pemeriksaan TypeScript, dan pembuatan delapan halaman statis berhasil pada Next.js 16.3.4.
- `PLAYWRIGHT_TEST_PRODUCTION=1 playwright test` pada salinan: **30/30 lulus, Chromium, 21,9 detik**. Mencakup lima pengujian buku baru dan seluruh 25 pengujian sebelumnya, jadi tidak ada regresi pada penyimpanan maupun peta makna.

**Dua perbedaan lingkungan pada salinan verifikasi, keduanya tidak menyentuh kode yang diubah:**

- `app/layout.tsx` pada salinan memakai variabel font kosong menggantikan `next/font/google`, karena kebijakan jaringan container memblokir `fonts.googleapis.com`. Pemuatan font karenanya **belum terverifikasi**; berkas asli tidak diubah dan bagian ini tidak disentuh pada tahap ini.
- Konfigurasi Playwright terpisah dipakai pada salinan untuk menunjuk Chromium yang tersedia lewat `executablePath`, karena versi build yang diminta `channel: 'chromium'` tidak ada di container. `playwright.config.ts` asli tidak diubah.

Karena dua hal itu, menjalankan `npm run build` dan `npm run test:e2e` di Windows tetap berguna sebagai pemeriksaan akhir, terutama untuk jalur font. Namun perilaku fitur pada tahap ini sudah terbukti lulus.

### Masalah yang masih terbuka

- Bagian Lanjutan 4 yang belum dikerjakan: penanda riwayat lolos review pertama yang tidak hilang saat menjawab "lupa", pembedaan kata terkumpul dan kata yang pernah direview, serta aturan kompatibilitas untuk data lama tanpa riwayat.
- Batas pemakaian pada `app/api/lookup/route.ts` masih disimpan di memori proses dan tidak akan berlaku di hosting tanpa server. Ini bagian Lanjutan 7 dan menjadi syarat sebelum aplikasi dibuka untuk umum.
- Uji akurasi model dengan buku asli, Safari iPhone, kamera langsung, dan deployment tetap belum dikerjakan.

### Pekerjaan berikutnya

Sesuai urutan yang disepakati pada sesi ini: jalankan build dan e2e untuk menutup tahap ini, lalu deployment ke Vercel beserta batas pemakaian yang berlaku di hosting, kemudian uji akurasi dengan buku asli dan pengumpulan kata dari Threads. Sisa Lanjutan 4, 5, dan 6 dikerjakan setelah portfolio dikirim.

## 8 September 2026 — Claude: Lanjutan 7 sebagian, batas pemakaian dan info privasi

**Permintaan pengguna:** lanjutkan. Dikerjakan bagian Lanjutan 7 yang menjadi syarat sebelum aplikasi dibuka untuk umum. Sisa Lanjutan 7 yang belum: pengujian penghitung bersama terhadap layanan sungguhan.

**Status sesi:** selesai. Build produksi dan 37/37 pengujian lulus pada salinan Linux.

### Masalah yang diperbaiki

- Penghitung batas menghitung **permintaan**, bukan kata, padahal pesannya menyebut "kata". Satu foto boleh memuat lima kata, jadi batas 60 sebenarnya melewatkan sekitar 300 kata.
- Pemeriksaan batas dijalankan sebelum daftar kata diketahui, sehingga tidak mungkin menghitung per kata.
- Penghitung hanya ada di memori proses. Di hosting tanpa server, tiap permintaan bisa mendarat di proses berbeda, sehingga batasnya nyaris tidak berlaku.
- Kegagalan model tetap memotong jatah harian pengguna meskipun tidak ada satu pun hasil yang sampai.
- Tidak ada keterangan ke mana foto dikirim.

### Perubahan perilaku

- Batas dihitung per kata. Pemeriksaan dipindah ke setelah daftar kata divalidasi, jadi permintaan yang ditolak lebih awal tidak memakan jatah siapa pun.
- Tersedia penghitung bersama lewat Upstash Redis REST bila `UPSTASH_REDIS_REST_URL` dan `UPSTASH_REDIS_REST_TOKEN` diisi. Tanpa keduanya, pembatas turun ke hitungan per proses dan hasil pemeriksaan menandai `shared: false`.
- Bila layanan pembatas mati atau melewati batas waktu 2,5 detik, pengguna tidak ditolak. Sistem turun ke hitungan per proses, bukan menutup layanan.
- Penambahan memakai INCRBY dan diputuskan setelah nilai baru diketahui, sehingga dua permintaan bersamaan tidak bisa sama sama lolos tepat di ambang batas.
- Kegagalan total mengembalikan jatah. Hasil yang berhasil, termasuk kata yang dilaporkan tidak ditemukan di halaman, tetap memakai jatah karena tetap memakai kuota model.
- Balasan berhasil dan balasan penolakan kini menyertakan `used` dan `limit`.
- Layar pengambilan foto memuat keterangan bahwa foto dikirim ke Google agar modelnya bisa membaca halaman, bahwa Lema tidak menyimpan foto itu, dan bahwa koleksi kata hanya ada di browser. Perlakuan data di sisi penyedia model sengaja tidak diklaim, karena bukan sesuatu yang aplikasi ini kendalikan.

### File yang diubah

- `lib/rate-limit.ts` (baru): `consume`, `refund`, `dailyLimit`, `sharedCounterConfigured`, `clientIp`. Penghitung bersama opsional tanpa dependensi npm baru, memakai REST Upstash lewat `fetch`.
- `app/api/lookup/route.ts`: memakai pembatas baru, pemeriksaan dipindah setelah kata divalidasi, pengembalian jatah saat gagal total, penghitung lama dihapus.
- `app/page.tsx`: keterangan privasi foto.
- `tests/rate-limit.spec.ts` (baru): enam pengujian sisi Node untuk pembacaan env, hitung per kata, pemisahan antar alamat, pengembalian jatah, batas bawah nol, dan syarat konfigurasi penghitung bersama.
- `tests/books.spec.ts`: satu pengujian untuk keterangan privasi.
- `.env.example` (baru) dan `.gitignore`: contoh konfigurasi untuk pengisian Environment Variables di hosting, dikecualikan dari aturan `.env*`.
- `.env.local`: dua variabel opsional ditambahkan sebagai komentar. Baris kunci tidak disentuh dan isinya tidak pernah dibaca.

### Keputusan teknis

- Tidak menambah dependensi npm. Upstash dipanggil lewat REST biasa, jadi tanpa layanan itu pun kode tetap jalan dan tidak ada paket yang menganggur.
- Memilih tidak menolak pengguna ketika layanan pembatas gagal. Batas ini melindungi kuota, bukan pengaman keamanan, jadi menutup layanan karena pembatasnya mati lebih merugikan.
- Kata yang gagal dibaca model tetap dihitung, karena kuota penyedia sudah terpakai. Hanya kegagalan total yang dikembalikan.
- Pertahanan terakhir terhadap tagihan bukan kode ini, melainkan kuota gratis di penyedia model. Selama penagihan tidak diaktifkan pada kunci itu, batas penyedia yang menjadi pagar sesungguhnya.

### Verifikasi

- `npx tsc --noEmit` pada proyek asli: lulus.
- `npm run build` pada salinan Linux: lulus, delapan halaman statis.
- `PLAYWRIGHT_TEST_PRODUCTION=1 playwright test` pada salinan: **37/37 lulus, 29,3 detik**. Terdiri dari 30 pengujian sebelumnya ditambah enam pengujian pembatas dan satu pengujian keterangan privasi. Tidak ada regresi.
- Pemeriksaan bundle browser `.next/static`: **nol** kemunculan `GEMINI_API_KEY`, `UPSTASH_REDIS_REST_TOKEN`, `AIza`, dan `generativelanguage`. Sebagai pembanding, `.next/server` memuat istilah itu pada empat berkas, jadi pencariannya memang bekerja dan hasil nol bukan negatif palsu.
- `git status` memastikan `.env.example` terlihat git sedangkan `.env.local` tetap diabaikan.

### Batas pengujian

- Jalur Upstash **belum diuji terhadap layanan sungguhan**. Yang teruji baru jalur cadangan per proses dan syarat konfigurasinya. Perilaku saat layanan lambat atau menolak perlu diperiksa setelah kredensialnya ada.
- Pemuatan font tetap belum terverifikasi pada salinan, sama seperti sesi sebelumnya.
- Perilaku di lingkungan hosting sungguhan belum diuji karena belum ada deployment.

### Pekerjaan berikutnya

Deployment ke Vercel, lalu uji akurasi dengan buku asli dan pengumpulan kata dari Threads. Sisa Lanjutan 4, 5, dan 6 dikerjakan setelah portfolio dikirim.

## 8 September 2026 — Claude: pesan kunci API dan penutupan alat internal di versi online

**Permintaan pengguna:** deployment gagal membaca kunci API, lalu minta pengecekan situs live. Dikerjakan dua hal kecil yang menjadi syarat sebelum tautan disebarkan.

**Status sesi:** selesai. Build produksi dan 37/37 pengujian lulus pada salinan Linux, ditambah pemeriksaan kode status langsung terhadap server produksi.

### Perubahan perilaku

- Pesan kesalahan kunci API tidak lagi menyebut `.env.local` saat aplikasi berjalan di hosting. Sekarang membedakan tiga keadaan: variabel tidak tersedia, masih berisi teks contoh, dan mengandung spasi tepi. Pesan untuk keadaan pertama menyebut bahwa variabel baru tidak berlaku pada deploy yang sudah jadi sehingga perlu deploy ulang.
- `/lab` dan `/api/models` menjadi 404 di versi online, tetap hidup saat `npm run dev`. Alasannya tombol pembanding model memanggil model tiga kali sekali klik, dan endpoint daftar model membeberkan model yang tersedia bagi akun pemilik aplikasi. Sengaja dijaga, bukan dihapus, karena keduanya masih dipakai untuk uji akurasi.

### File yang diubah

- `app/api/lookup/route.ts` dan `app/api/models/route.ts`: fungsi `keyProblem` yang memeriksa tiga keadaan kunci.
- `app/api/models/route.ts`: penjagaan 404 pada versi online.
- `app/lab/page.tsx`: menjadi Server Component yang memanggil `notFound()` saat produksi.
- `app/lab/lab-client.tsx` (baru): komponen klien lab dipindah apa adanya, tanpa perubahan isi.

### Keputusan teknis dan rujukan

- Membaca `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/not-found.md` sesuai `AGENTS.md`. `notFound()` sah dipanggil pada Server Component dan Route Handler, dan harus berada di jalur render.
- Pemeriksaan dilakukan di sisi server, bukan di komponen klien, supaya halaman lab tidak ikut terkirim ke browser pengunjung versi online.
- Route handler daftar model membalas 404 biasa, bukan `notFound()`, karena halaman not-found tidak cocok sebagai balasan endpoint.

### Verifikasi

- `npm run build` pada salinan: lulus.
- `PLAYWRIGHT_TEST_PRODUCTION=1 playwright test`: **37/37 lulus, 26,8 detik**. Tidak ada regresi.
- Pemeriksaan kode status pada build produksi yang dijalankan: `/lab` **404**, `/api/models` **404**, sedangkan `/` **200**, `/kata` **200**, `/review` **200**.

### Temuan tentang deployment

- Situs live `lema-lemon.vercel.app` merespons dan metadata halaman benar, tetapi `/api/models` membalas 500 pada saat pemeriksaan. Kode 500 hanya dipakai untuk masalah kunci API.
- Project Vercel berada di akun yang berbeda dari project pengguna sebelumnya, sehingga Environment Variables tidak terbawa. Pengisian `GEMINI_API_KEY` beserta deploy ulang masih menjadi pekerjaan pengguna dan **belum terverifikasi**.
- Bentuk kunci pada `.env.local` diperiksa tanpa membaca isinya: panjang 53, tanpa spasi tepi, tanpa tanda kutip, bukan teks contoh, berawalan `AQ.` yaitu format kunci Google yang lebih baru. Kode tidak memeriksa awalan kunci.

### Pekerjaan berikutnya

Setelah versi online benar benar bisa memanggil model: uji kamera di Safari iPhone, uji akurasi dengan buku asli, dan pengumpulan kata dari Threads.

## 8 September 2026 — Claude: versi online berhasil memanggil model

**Status:** terverifikasi.

- Alamat produksi: `lema-lemon.vercel.app`, project Vercel `lema` pada akun terpisah milik pengguna, tersambung ke repo `aristyonaufal/lema` cabang `main`.
- `GET /api/models` pada alamat produksi membalas `{"ok":true,"count":40}`. Ini membuktikan `GEMINI_API_KEY` terbaca oleh fungsi di server produksi, bukan hanya di localhost.
- Penyebab kegagalan sebelumnya: Environment Variables belum terpasang pada project ini, dan setelah dipasang tetap perlu deploy ulang karena variabel baru tidak berlaku pada deploy yang sudah jadi. Pesan kesalahan yang dibedakan tiga keadaan membantu memastikan bahwa masalahnya ketiadaan variabel, bukan salah isi.

### Yang masih terbuka

- Kode penutupan `/lab` dan `/api/models` **belum didorong** ke repo, jadi kedua alat internal itu masih terbuka untuk umum di versi online.
- Alur lengkap foto ke makna **belum diuji pada alamat produksi**. Yang teruji baru endpoint daftar model.
- Kamera Safari iPhone belum diuji.
- Uji akurasi dengan buku asli belum dilakukan.
- Kunci API yang sekarang aktif pernah terkirim di luar penyimpanan rahasia dan sebaiknya dicabut lalu dibuat ulang sebelum tautan disebarkan. Pencabutan menuntut pengisian ulang Environment Variable dan satu deploy lagi.

## 8 September 2026 — Claude: perombakan tampilan seluruh layar

**Permintaan pengguna:** perbaiki desain mengikuti dua gambar rujukan aplikasi buku, dan terapkan aturan UI/UX yang baik pada tiap halaman dan alur.

**Status sesi:** selesai. Build produksi, pemeriksaan tipe, lint tanpa error, dan 37/37 pengujian browser lulus, seluruhnya dijalankan di Windows.

### Arah desain

Dari rujukan diambil empat hal: judul serif berkontras tinggi seperti sampul buku, kartu putih di atas kertas hangat, pil hitam sebagai aksi utama, dan sampul berwarna sebagai penanda buku. Lema tidak punya gambar sampul dan tidak mengambilnya dari layanan lain, jadi warna punggung buku diturunkan dari judulnya sendiri; judul yang sama selalu mendapat warna yang sama.

### Perubahan perilaku

- **Navigasi bawah yang menetap.** Sebelumnya tiga tujuan aplikasi hanya berupa tautan teks di tengah halaman, jadi pengguna harus menggulung untuk berpindah dan tidak pernah tahu ada berapa kata yang menunggu. Sekarang ada tiga tab dalam jangkauan jempol, menandai halaman aktif, dan membawa penghitung kata yang sedang diproses serta kata yang jatuh tempo. Bilah ini disembunyikan sebelum ada buku, karena pengguna baru tidak punya isi di dua tab lainnya.
- **Penyaring koleksi.** Halaman kata punya baris pil: semua, siap dibaca, diproses, gagal, sudah tahu, lengkap dengan jumlahnya. Penyaring yang tidak punya isi tidak ditampilkan.
- **Pintasan review.** Ketika ada kata jatuh tempo, halaman koleksi menampilkan satu bidang hijau menuju review. Ini belum menggantikan Lanjutan 5, yang meminta review ditawarkan otomatis saat aplikasi dibuka.
- **Aksi utama di dekat jempol.** Tombol simpan dan buka sekarang berada dalam panel yang menempel di bawah layar pengambilan foto, dan tetap terlihat saat halaman digulung. Saat tombol belum bisa ditekan, ada keterangan apa yang masih kurang, bukan sekadar tombol redup.
- **Keadaan kosong dan keadaan memuat** punya tampilan sendiri di tiap layar: rangka berkedip saat koleksi dibaca, ajakan yang jelas saat koleksi kosong, dan pada layar review disebutkan tanggal kata berikutnya jatuh tempo.
- **Keyakinan model ditampilkan sebagai angka** pada kartu makna. Saat model ragu, angka itu hanya muncul pada masing-masing kandidat, tidak di kepala kartu, supaya tidak terbaca sebagai keyakinan keseluruhan.
- **Kartu gagal diturunkan bobotnya.** Pil hitam disediakan untuk aksi utama satu halaman; sepuluh kata gagal tidak boleh berarti sepuluh pil hitam.
- **Bahasa halaman diubah dari `en` menjadi `id`.** Isi antarmuka memang Bahasa Indonesia, dan potongan bahasa Inggris di dalamnya sudah menandai dirinya sendiri dengan `lang="en"`.

### Perbaikan bug yang ikut ditemukan

`app/review/page.tsx` membangun `RegExp` langsung dari lemma tanpa meng-escape tanda baca. Lemma seperti `make (out)` akan melempar galat dan mematikan halaman review. Sekarang halaman itu memakai `findTextRanges` dan `sentenceSegments`, pembantu yang sudah dipakai peta makna, sehingga tanda baca aman dan batas kata terjaga. Ini menutup sebagian butir Lanjutan 5 tentang penandaan kata di kalimat review, bukan keseluruhannya.

### File yang diubah

- `app/globals.css`: token warna, bayangan, lengkung, dan blok pakai ulang (kartu, tombol, pil, rak, rangka memuat, baris geser). Ditulis ulang seluruhnya.
- `app/layout.tsx`: font judul Instrument Serif, `viewport` dengan `viewportFit: cover` supaya `env(safe-area-inset-bottom)` punya nilai di iPhone, pemasangan bilah navigasi, dan `lang="id"`. Geist Mono dilepas karena tidak pernah dipakai.
- `components/TabBar.tsx` (baru): bilah navigasi bawah beserta penghitungnya.
- `components/BookSpine.tsx` (baru): punggung buku berwarna dan inisial judul.
- `components/ui.tsx` (baru): lencana status, judul bagian, batang kemajuan.
- `app/page.tsx`, `app/kata/page.tsx`, `app/review/page.tsx`, `components/SenseMap.tsx`, `components/DbProvider.tsx`: tata letak, hierarki, dan keadaan kosong. Alur, kontrak data, penyimpanan `lema.v1`, endpoint, dan prompt tidak disentuh.
- Tidak ada dependensi npm baru. Ikon digambar sebagai SVG sebaris.

### Keputusan teknis dan jebakan yang ditemukan

- **Kelas komponen wajib berada di dalam `@layer components`.** Versi pertama menaruhnya di luar layer mana pun. Aturan tanpa layer mengalahkan seluruh utility Tailwind, sehingga `border-accent` pada buku aktif dan `text-accent` pada label diam-diam tidak berlaku. Ini terlihat hanya setelah tangkapan layar diperiksa, bukan dari build atau tes.
- **Nama tab tidak boleh memuat kata "foto" atau "ulang".** Nama pertama yang dipakai, "Baca, ambil foto halaman", bertabrakan dengan tautan "Pilih ulang foto" pada kartu gagal: dua tautan dengan nama mirip menyulitkan pembaca layar sekaligus melanggar mode ketat pengujian. Sekarang namanya "Baca, tandai kata baru".
- **Label status pada daftar kata terbaru adalah bagian dari kontrak pengujian.** "Siap dibuka" dan "Gagal diproses" tidak boleh dipendekkan.
- Aturan React 19 melarang memanggil `Date.now()` saat render dan melarang `setState` di dalam efek. Keterangan jatuh tempo berikutnya karena itu membaca tanggal dari data yang tersimpan, bukan dari jam.
- Kartu makna tetap memakai struktur DOM yang sama: satu `article` per hasil, satu `blockquote` per kalimat asal, `mark` dengan atribut `title` untuk pemicu, dan `q` untuk kutipan. Perubahan tampilan sengaja tidak menyentuh sandaran itu.
- Membaca panduan Next.js lokal `01-app/03-api-reference/04-functions/generate-viewport.md` dan `01-app/01-getting-started/13-fonts.md` sesuai `AGENTS.md`.

### Verifikasi

- `npx tsc --noEmit`: lulus.
- `npm run build`: lulus pada Next.js 16.3.4. Pengambilan font Instrument Serif dan Geist berhasil, jadi jalur font yang pada dua sesi sebelumnya belum terverifikasi kini terbukti bekerja di Windows.
- `npm run lint`: **0 error**, dua peringatan `<img>` lama pada `app/page.tsx` dan `app/lab/lab-client.tsx`.
- `PLAYWRIGHT_TEST_PRODUCTION=1 npx playwright test`: **37/37 lulus, Chromium, 28,9 detik**. Tidak ada berkas pengujian yang diubah.
- Pemeriksaan visual pada lebar 390 piksel, tema terang dan gelap, untuk sembilan keadaan: pertama kali pakai, pemilih buku, pengambilan foto, koleksi, peta makna satu makna, peta makna dua kandidat, kata gagal, review, dan review kosong. Tiga masalah ditemukan dan diperbaiki dari pemeriksaan ini: dua batang mendatar bertumpuk pada kepala buku, angka keyakinan yang muncul dua kali pada hasil ambigu, dan kelas komponen yang berada di luar layer.

### Masalah yang masih terbuka

- **Belum diuji di Safari iPhone.** Seluruh pemeriksaan visual memakai Chromium yang meniru lebar telepon. `viewportFit: cover` dan `env(safe-area-inset-bottom)` sudah dipasang untuk bilah navigasi, tetapi hasilnya di perangkat sungguhan belum dilihat.
- Kamera langsung aktif tetap belum ditambahkan, sesuai keputusan pengguna sebelumnya. Pemilih berkas dipertahankan.
- Tampilan ini tidak menyentuh akurasi model. Uji akurasi dengan buku asli dan kata dari Threads masih terbuka.
- Sisa Lanjutan 4, 5, dan 6 tidak dikerjakan pada sesi ini.

### Catatan tentang sesi sebelumnya

Catatan 8 September menyebut penutupan `/lab` dan `/api/models` belum didorong ke repo. Pemeriksaan pada sesi ini menunjukkan commit `5e5d30e` sudah menjadi HEAD dan `main` sejajar dengan `origin/main`, jadi butir itu sudah selesai.

### Pekerjaan berikutnya

Uji tampilan baru di Safari iPhone pada alamat produksi, lalu uji akurasi dengan buku asli. Perubahan sesi ini belum di-commit; keputusan itu ada pada pengguna.

## Format catatan berikutnya

Gunakan tanggal dan nama pelaksana, lalu jelaskan: permintaan/tujuan, keputusan, file yang diubah beserta alasannya, verifikasi dan hasilnya, masalah yang masih terbuka, serta pekerjaan berikutnya. Tulis "belum diuji" untuk hal yang belum benar-benar diperiksa.
