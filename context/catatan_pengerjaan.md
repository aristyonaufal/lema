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

## 9 September 2026 — Claude: alur langsung, beranda baru, dan tampilan responsif

**Permintaan pengguna:** tiga hal sekaligus. Pertama, makna ditampilkan langsung saat tombol simpan ditekan, sementara review tetap seperti semula. Kedua, tampilan dibuat responsif, karena versi yang ada terasa seperti aplikasi HP yang dipaksa dibuka di laptop. Ketiga, belum ada dashboard utama, sehingga aplikasinya tampil terlalu sederhana.

**Status sesi:** selesai. Build produksi, pemeriksaan tipe, lint tanpa error, dan 42/42 pengujian browser lulus, seluruhnya dijalankan di Windows.

### Keputusan pengguna pada sesi ini

Tiga pertanyaan diajukan sebelum menulis kode, karena jawabannya mengubah bentuk pekerjaan:

1. **Mode tunda dipertahankan sebagai pilihan kedua.** Tombol utama menjadi "Simpan & lihat makna", tombol "Simpan, lanjut baca" turun menjadi tombol sekunder. Pengguna memilih ini di atas pilihan menghapus mode tunda sepenuhnya.
2. **Beranda menjadi dashboard, layar foto pindah ke `/baca`.**
3. **Sidebar kiri di laptop**, isi dua kolom. Bilah bawah dipertahankan di HP.

### Penyimpangan dari PRD yang perlu dicatat

Prinsip nomor 1 pada PRD berbunyi "baca dulu, jawab belakangan", dan bagian 7 menyebut aplikasi memproses di latar **tanpa menampilkan jawaban**. Setelah perubahan ini, perilaku bawaannya kebalikan dari itu. Mode tunda masih ada dan masih diuji, tetapi bukan lagi jalur utama. PRD sengaja tidak ikut diubah pada sesi ini; keputusan menyelaraskannya ada pada pengguna, dan sebaiknya diputuskan sebelum portfolio dikirim supaya dokumen dan aplikasi tidak bercerita berbeda.

Catatan teknis yang menyertai: makna tidak pernah benar benar instan, karena modelnya butuh beberapa detik membaca foto. Yang "langsung" adalah perpindahan layarnya. Peta makna terbuka seketika dengan keadaan sedang diproses, lalu terisi sendiri.

### Perubahan perilaku

- **Rute baru.** `/` menjadi beranda, `/baca` menjadi layar foto. Pengguna yang belum punya buku tetap langsung bertemu pertanyaan judul buku, sekarang di beranda.
- **Beranda.** Empat angka ringkasan (kata terkumpul, siap dibaca, jatuh tempo, lolos review), tombol besar menuju layar foto, pintasan review saat ada yang jatuh tempo, keterangan kata yang sedang diproses atau gagal, rak buku dengan persen kemajuan, dan daftar kata terbaru.
- **Kemajuan buku diukur dari kata yang pernah lolos review**, bukan dari kata yang maknanya sudah ada. Punya arti belum berarti hafal.
- **Navigasi punya empat tujuan** dan berubah bentuk: bilah bawah di HP, sidebar kiri mulai lebar 1024 piksel. Sidebar membawa nama aplikasi dan buku yang sedang dibaca.
- **Wadah halaman tumbuh bertahap**, 32rem di HP, 44rem mulai 640 piksel, 64rem mulai 1024 piksel. Sebelumnya tiap layar mengunci dirinya di 28rem atau 42rem, dan itu penyebab utama tampilan terasa seperti aplikasi HP yang dilebarkan.
- **Layar foto jadi dua kolom di laptop:** foto di kiri, penandaan kata dan aksi di kanan. Panel aksi berhenti melayang begitu tidak lagi menempel di tepi bawah.
- **Koleksi jadi dua kolom di laptop.** Kolom kanan berisi ringkasan angka dan pintasan loncat ke buku; sengaja tidak mengulang isi kolom kiri.
- **Tautan "Kembali" pada koleksi diganti "Lanjut baca"** dan mengarah ke `/baca`. Dengan navigasi empat tujuan, label "Kembali" tidak lagi punya arti yang jelas.

### Fondasi data yang ikut ditambahkan

`Entry` mendapat `passedReview?: boolean`, dan `grade()` hanya pernah mengubahnya dari false ke true. Menjawab "lupa" menurunkan jadwal ke anak tangga pertama tetapi tidak menghapus riwayat bahwa kata itu pernah lolos. Ini butir Lanjutan 4 yang sebelumnya belum dikerjakan, dan dikerjakan sekarang karena tanpa itu dashboard tidak punya angka kemajuan yang jujur; satu satunya alternatif adalah memakai penanda "sudah tahu" yang diisi manual oleh pengguna.

Kompatibilitas data lama: entri tanpa penanda ini dihitung belum pernah lolos. Riwayat itu memang tidak pernah disimpan, jadi tidak ditebak dari tanggal atau dari `stage`.

### File yang diubah

- `app/page.tsx`: ditulis ulang menjadi beranda.
- `app/baca/page.tsx` (baru): layar foto, dipindah dari `app/page.tsx`, ditambah tombol utama baru dan tata letak dua kolom.
- `components/BookPicker.tsx` (baru): pemilih buku dipisah dari layar foto, karena sekarang dipakai juga oleh beranda.
- `components/Nav.tsx` (baru, menggantikan `TabBar.tsx`): satu elemen `nav` yang berubah bentuk, bukan dua yang saling disembunyikan.
- `components/Shell.tsx` (baru): memutuskan kapan navigasi muncul, lalu menyediakan penahan tinggi di HP atau jarak kiri di laptop.
- `app/layout.tsx`: memakai `Shell`.
- `app/globals.css`: kelas `.page` dan `.page-narrow`, plus `--tab-h` yang dinolkan mulai lebar laptop.
- `app/kata/page.tsx`, `app/review/page.tsx`, `components/SenseMap.tsx`: wadah baru, dua kolom, dan tautan yang mengikuti rute baru.
- `lib/store.ts`: `passedReview`, `BookSummary.passed`, dan `stats()` sebagai satu satunya sumber angka beranda.
- `tests/dashboard.spec.ts` (baru): lima pengujian.
- `tests/storage.spec.ts`, `tests/books.spec.ts`: menyesuaikan rute dan nama tombol.

### Keputusan teknis dan jebakan yang ditemukan

- **Satu elemen nav, bukan dua.** Menyembunyikan salah satu dengan CSS tetap meninggalkan keduanya di DOM: dua landmark bagi pembaca layar, dan dua tautan bernama sama yang membuat pengujian ambigu.
- **Baris grid ikut meregang.** Pada layar foto, grid dengan `flex-1` membuat barisnya memanjang mengisi sisa tinggi layar, dan di lebar tablet muncul lubang kosong sekitar 150 piksel antara catatan privasi dan bagian penandaan kata. Ditutup dengan `content-start`. Ini tidak terlihat di HP maupun laptop, hanya di lebar antara keduanya.
- **Entri berstatus "diproses" yang tersimpan selalu dipulihkan menjadi galat** saat aplikasi dimuat, karena fotonya tidak ikut disimpan. Pengujian beranda yang pertama ditulis mengabaikan hal ini dan menuntut penghitung "sedang diproses" yang tidak akan pernah muncul. Pengujiannya yang diperbaiki, bukan aplikasinya.
- **Judul buku aktif kini muncul dua kali di layar foto** pada lebar laptop: sekali sebagai judul halaman, sekali di kaki sidebar. Ini membuat satu pengujian lama gagal karena pencarian teks polos menemukan dua elemen. Pengujiannya diarahkan ke judul halaman. Pengulangannya sendiri dibiarkan, karena sidebar memang bertugas menunjukkan konteks dari layar mana pun, dan pengulangan itu hanya terjadi di satu rute.
- Kartu makna tidak disusun dua kolom. Setelah sidebar dan kolom kanan mengambil bagiannya, satu kartu tinggal sekitar 350 piksel, dan itu terlalu sempit untuk kalimat asal beserta sorotannya.

### Verifikasi

- `npx tsc --noEmit`: lulus.
- `npm run build`: lulus, delapan rute termasuk `/baca` yang baru.
- `npm run lint`: **0 error**, dua peringatan `<img>` lama yang sudah ada sebelum sesi ini.
- `PLAYWRIGHT_TEST_PRODUCTION=1 npx playwright test`: **42/42 lulus, Chromium, 26,8 detik**. Terdiri dari 37 pengujian sebelumnya ditambah lima pengujian beranda dan alur baru.
- Pemeriksaan visual pada tiga lebar (390, 820, 1440 piksel), tema terang dan gelap, untuk beranda, layar foto, koleksi, review, dan layar pertama pengguna baru. Empat masalah ditemukan dan diperbaiki dari pemeriksaan ini: lubang kosong di lebar tablet, panel aksi yang masih berbingkai padahal sudah tidak melayang, kartu review yang terpisah jauh dari tombolnya di laptop, dan pemilih buku yang menempel ke atas layar sehingga menyisakan bidang kosong yang sangat lebar.

### Masalah yang masih terbuka

- **Belum diuji di Safari iPhone.** Semua pemeriksaan visual memakai Chromium yang meniru ukuran layar, bukan perangkat sungguhan. Sidebar tidak muncul di HP, jadi yang perlu diperiksa di sana tetap bilah bawah dan `env(safe-area-inset-bottom)`.
- **Belum diuji di alamat produksi.** Perubahan ini belum di-deploy dan belum di-commit.
- PRD bagian 5 dan 7 sekarang berbeda dari perilaku aplikasi. Lihat catatan penyimpangan di atas.
- Sisa Lanjutan 5 dan 6 tidak dikerjakan. Review masih harus dibuka sendiri oleh pengguna, belum ditawarkan otomatis saat aplikasi dibuka.
- Uji akurasi model masih belum dilakukan sama sekali.

### Pekerjaan berikutnya

Tidak berubah dari sesi sebelumnya, dan urutannya justru makin mendesak: uji satu lingkaran penuh di Safari iPhone pada alamat produksi, lalu uji akurasi dengan buku asli.

## 9 September 2026 — Claude: enam revisi setelah uji pertama di HP

**Permintaan pengguna:** commit `9838b3d` didorong dan Vercel mendeploy dalam 20 detik, lalu pengguna mencoba versi online dan mengirim enam kekurangan. Nomor 6, yaitu slogan, baru sampai tahap usulan dan belum dipilih.

**Status sesi:** selesai untuk nomor 1 sampai 5. Build produksi, pemeriksaan tipe, lint tanpa error, dan 47/47 pengujian browser lulus, seluruhnya dijalankan di Windows.

### Keputusan pengguna pada sesi ini

1. **Nomor 2, teks panjang: cukup frasa.** Frasa multi kata sebenarnya sudah didukung sejak awal, baik oleh kotak isian maupun oleh prompt (aturan 10 dan `is_phrase`). Yang tidak ada cuma keterangan bahwa itu boleh. Mode kalimat utuh ditolak karena butuh prompt kedua dan bentuk hasil kedua, terlalu besar untuk tiga hari sebelum submit.
2. **Nomor 5, review di luar jadwal: mode latihan, bukan kuis.** PRD bagian 6 menaruh kuis pilihan ganda di daftar yang sengaja dikeluarkan dari v1, dan bagian 14 menyebut scope melebar ke kuis sebagai risiko tinggi. Keputusan itu disampaikan sebelum pengguna memilih.

### Perubahan perilaku

- **Nomor 1, ganti buku.** Buku aktif di layar foto sekarang dibungkus kartu, dan tombolnya jadi tombol sungguhan berlabel "Ganti buku" dengan ikon tukar, bukan lagi pil kecil bertuliskan "Ganti" di pojok kanan.
- **Nomor 2, frasa.** Placeholder, label bagian, dan keterangannya diubah supaya frasa disebut terang terangan, lengkap dengan contoh. Ditambah batas 60 karakter: di atas itu tombol Tambah mati dan muncul penjelasan bahwa Lema memetakan makna kata atau frasa, belum bisa menjelaskan kalimat utuh. Lebih baik ditolak dengan alasan daripada dijawab asal oleh prompt yang tidak dirancang untuk itu.
- **Nomor 3, koleksi ringkas.** Kata yang maknanya sudah ada kini tampil sebagai baris berisi kata dan arti singkatnya. Kartu makna penuh baru digambar setelah barisnya diketuk, jadi tidak ada lagi halaman sepanjang beberapa layar hanya untuk melihat daftar. Kata yang masih diproses atau gagal tidak dilipat, karena sudah pendek dan justru perlu segera dibaca. Baris juga membawa penanda "Ragu" untuk hasil ambigu dan "Tidak ketemu di halaman" bila modelnya tidak menemukan katanya.
- **Nomor 4, rak buku di sidebar.** Kaki sidebar berubah dari sekadar menampilkan buku yang sedang dibaca menjadi daftar buku yang bisa diketuk. Satu ketukan membuka `/kata?buku=<id>`, yaitu koleksi buku itu saja. Halaman koleksi ikut mengerti parameter itu: judulnya jadi judul buku, penyaring dan ringkasannya ikut mengecil ke lingkup buku tersebut. Kartu buku di beranda juga diarahkan ke sana, karena di HP tidak ada sidebar dan itulah satu satunya jalan.
- **Nomor 5, mode latihan.** `/review?latihan=1` mengambil kata mana pun yang sudah punya makna, tanpa menunggu jatuh tempo, dan bisa dipersempit ke satu buku lewat `&buku=<id>`. Sesi latihan **tidak menulis apa pun**: jadwal tangga 1/3/7/21 hari tidak bergeser dan `passedReview` tidak ikut menyala. Alasannya lurus: kalau latihan ikut menggeser jadwal, angka progres berubah jadi ukuran seberapa sering seseorang menekan tombol, bukan seberapa lama dia masih ingat. Jalan masuknya ada di beranda, di kolom kanan koleksi, dan di layar review saat belum ada yang jatuh tempo.

### File yang diubah

- `app/baca/page.tsx`: kartu buku aktif, tombol "Ganti buku", istilah frasa, batas 60 karakter.
- `app/kata/page.tsx`: komponen `WordRow` yang bisa dibuka, penyaringan `?buku=`, ringkasan yang ikut lingkup buku, tombol latihan.
- `components/Nav.tsx`: rak buku di kaki sidebar, dan `aria-label` pada daftar tab.
- `app/review/page.tsx`: dua mode dalam satu layar, dibungkus `Suspense` karena sekarang membaca parameter alamat.
- `app/page.tsx`: kartu buku menuju koleksi per buku, plus jalan masuk latihan.
- `lib/store.ts`: `practicePool`.
- `tests/koleksi.spec.ts` (baru): lima pengujian untuk daftar ringkas, rak buku sidebar, mode latihan, frasa, dan penolakan kalimat.
- `tests/storage.spec.ts`, `tests/books.spec.ts`, `tests/dashboard.spec.ts`: menyesuaikan placeholder, nama tombol, dan kenyataan bahwa kartu makna tidak lagi terbuka sejak awal.

### Jebakan yang ditemukan

- **Nama tautan rak buku bertabrakan dengan tab navigasi.** Versi pertama memberi `aria-label` "Koleksi kata dari Sapiens", sementara tab koleksi bernama "Koleksi kata, N sedang diproses". Sebelas pengujian gagal sekaligus karena pencarian `/^Koleksi kata/` menemukan dua tautan. Diganti menjadi "Kata dari buku Sapiens". Ini kasus kedua dalam proyek ini di mana nama yang mirip menyulitkan pembaca layar sekaligus pengujian, jadi patut dijadikan kebiasaan memeriksa nama baru terhadap nama yang sudah ada.
- **Melipat kartu mengubah banyak kontrak pengujian sekaligus.** Pengujian lama memakai `article` sebagai penanda satu kata, padahal `article` sekarang cuma ada ketika barisnya dibuka. Ditambahkan pembantu `row()` dan `openWord()`; sebagian pemeriksaan justru jadi lebih tepat, misalnya status "sudah tahu" kini diperiksa pada barisnya, bukan pada kalimat di dalam kartunya.

### Verifikasi

- `npx tsc --noEmit`: lulus.
- `npm run build`: lulus.
- `npm run lint`: **0 error**, dua peringatan `<img>` lama.
- `PLAYWRIGHT_TEST_PRODUCTION=1 npx playwright test`: **47/47 lulus, Chromium**. Terdiri dari 42 pengujian sebelumnya ditambah lima pengujian revisi ini.
- Pemeriksaan visual pada lebar 390 dan 1440 piksel, tema terang dan gelap, untuk beranda, layar foto, koleksi penuh, koleksi dengan satu baris terbuka, koleksi per buku, dan mode latihan. Dua pengulangan ditemukan dan diperbaiki: judul buku muncul dua kali saat koleksi disaring per buku, dan kartu buku di beranda yang sebelumnya menuju koleksi seluruh buku.

### Masalah yang masih terbuka

- **Slogan belum dipilih.** Enam usulan bahasa Inggris sudah diberikan; rekomendasi saya "Never look it up twice." Sampai dipilih, sidebar masih memakai "Baca terus, maknanya nyusul."
- **Kuis interaktif ditunda**, bukan dibatalkan. Kalau nanti dikerjakan, PRD bagian 6 perlu ikut direvisi.
- Perubahan sesi ini belum di-commit dan belum di-deploy.
- Belum diuji ulang di Safari iPhone. Perubahan terbesar sesi ini justru di layar sempit, yaitu daftar koleksi yang dilipat.
- PRD bagian 5 dan 7 masih berbeda dari perilaku aplikasi.
- Uji akurasi model masih belum dilakukan sama sekali. Ini tetap penghalang portfolio yang paling besar.

### Pekerjaan berikutnya

Deploy revisi ini, uji ulang sebentar di HP, lalu **uji akurasi**. Sisa waktu sebelum 12 September paling baik dipakai untuk mengumpulkan angka, bukan menambah fitur.

## 10 September 2026 — Claude: tandai kata tanpa mengetik

**Permintaan pengguna:** setelah sesi curah gagasan tentang keribetan saat membaca, pengguna meminta gabungan dua gagasan: menandai kata langsung di foto, dan membiarkan Lema menemukan sendiri coretan pensil di buku. Lapis pertama, yaitu aplikasi yang bisa dipasang di layar HP dan kamera langsung, sengaja dilewati. Pengguna juga meminta kode sebelum perubahan disiapkan sebagai jalan kembali kalau fiturnya tidak jalan.

**Status sesi:** selesai di cabang `fitur/tandai-di-foto`, **belum digabung ke `main` dan belum di-deploy**. Build produksi, pemeriksaan tipe, lint tanpa error, dan 52/52 pengujian browser lulus. Satu panggilan ke model sungguhan dilakukan untuk membuktikan prompt barunya.

### Jaring pengaman yang dipasang lebih dulu

1. Tag `v1-sebelum-tandai-foto` pada commit `0c33808`, versi yang sedang hidup di produksi.
2. Seluruh pekerjaan di cabang terpisah. `main` dan produksi tidak tersentuh.
3. Alur ketik lama dipertahankan utuh sebagai mode kedua, dan cara bawaannya diatur oleh satu konstanta `DEFAULT_MODE`.

Langkah kembali untuk setiap keadaan ditulis di `cara_kembali_ke_versi_lama.md`.

### Perubahan perilaku

- **Layar foto punya dua cara menandai:** "Tandai di foto" sebagai bawaan, dan "Ketik kata" yang merupakan alur lama tanpa perubahan. Pilihan terakhir diingat di browser.
- **Ketuk kata di foto.** Setiap ketukan menaruh oval magenta bernomor, paling banyak lima. Ketuk ovalnya lagi untuk menghapus, dan nomornya dirapatkan ulang. Oval itu digambar ke foto sebelum dikirim, jadi model membaca penanda yang sama persis dengan yang dilihat pengguna.
- **Tanpa ketukan, Lema mencari coretan pensil.** Kalau fotonya dikirim tanpa satu pun oval, model diminta mencari garis bawah, lingkaran, atau stabilo yang dibuat pembaca sendiri. Keterangan ini tertulis di layar sebelum pengguna menekan simpan.
- **Satu penampung, lalu diganti.** Karena kata sebenarnya baru diketahui setelah model menjawab, yang disimpan seketika adalah satu entri penampung bertuliskan "Kata yang kamu tandai". Begitu jawabannya tiba, penampung itu diganti kata kata temuan di tempat yang sama. Kalau tidak ada yang ditemukan, penampungnya berubah menjadi galat yang menjelaskan dan menawarkan pilih ulang foto.
- **Peta makna tetap terbuka saat hasil tiba.** Alamat `/kata?entry=<id penampung>` ikut mengenali kata kata hasil satu foto lewat kolom `batch`, jadi pengguna yang menunggu tidak disambut "kata tidak ada di koleksi" persis ketika hasilnya datang.

### Keputusan teknis

- **Prompt dipecah menjadi bagian bersama**, lalu disusun ulang. `SYSTEM_PROMPT` untuk mode ketik dibuktikan identik sampai karakter terakhir dengan versi di titik pulih (2.778 karakter, dibandingkan langsung), begitu juga `userPrompt` dan skema balasannya. Perilaku mode ketik yang sudah teruji tidak ikut bergeser.
- **Oval mendatar, bukan lingkaran.** Versi pertama memakai lingkaran. Pemeriksaan foto yang benar benar dikirim ke model menunjukkan lingkaran selebar satu kata memotong dua baris sekaligus, dan di foto buku sungguhan jarak barisnya jauh lebih rapat. Oval 10% × 4,4% lebar foto duduk di satu baris.
- **Ukuran penanda di layar dan di foto memakai rumus yang sama**, yaitu persen lebar foto, tanpa mengukur apa pun lewat JavaScript. Pembungkus foto mengikuti ukuran gambar persis, karena dengan `object-contain` titik ketukan tidak lagi sama dengan titik di foto.
- **Warna magenta** dipilih karena hampir tidak pernah muncul di halaman buku. Konstanta warnanya ditaruh di `lib/image.ts`, bukan di `lib/prompt.ts`, supaya layar foto tidak ikut menarik teks prompt ke bundle browser.
- **Jatah pemakaian mode tandai dipesan penuh lima kata**, lalu sisanya dikembalikan setelah jawaban tiba. Foto tanpa tanda tetap dihitung satu kata, karena model sudah dipanggil untuk membacanya; tanpa itu foto kosong bisa dikirim berulang tanpa batas. Akibat sampingannya: pengguna yang sisa jatahnya kurang dari lima ditolak di mode tandai walaupun sebenarnya cuma menandai satu kata.
- **Daftar kosong dari model di mode tandai adalah jawaban sah**, bukan kegagalan. Kalau diperlakukan sebagai gagal, endpoint akan mencoba empat model cadangan berturut turut hanya untuk mendapat jawaban "tidak ada tanda" yang sama.

### Uji dengan model sungguhan

Satu panggilan lewat server produksi lokal, memakai foto halaman tiruan dengan dua oval (di "made" dan "curiosity") dan satu garis pensil tiruan:

| Tanda | Yang ditemukan model | Catatan |
|---|---|---|
| Oval 1 di "made" | **"made out"**, frasa, yakin 98% | Benar, dan lebih baik dari yang diminta: model mengenali frasanya walau yang ada di dalam oval cuma "made". Maknanya tepat. |
| Oval 2 di "curiosity" | **"curiosity"**, yakin 98% | Benar. |
| Garis pensil tiruan | **"Still"**, yakin 95% | Garisnya ternyata lebih banyak berada di bawah "Still," daripada di bawah "heather", jadi pilihan model justru bacaan yang lebih masuk akal. Yang meleset penempatan garis ujinya. |

Jatah terpakai tercatat 3 dari 60, sesuai aturan pesan lima lalu kembalikan dua.

**Temuan yang perlu diperhatikan: waktunya 58,8 detik.** Model utama `gemini-3.8-flash` gagal dan permintaan pindah ke `gemini-3.6-flash`. Batas waktu endpoint 60 detik, jadi satu permintaan seperti ini di Vercel nyaris terputus. Masalah ini milik rantai cadangan, bukan milik mode tandai, dan berlaku juga untuk mode ketik. Satu sampel belum cukup untuk tahu apakah ini gangguan sesaat di model utama atau pola yang menetap. Usulan perbaikannya: batas waktu per percobaan di dalam rantai cadangan, supaya model yang menggantung tidak menghabiskan seluruh jatah 60 detik. Belum dikerjakan.

Batas uji ini: satu foto tiruan dengan huruf besar dan cahaya sempurna. Belum ada uji dengan foto buku sungguhan, coretan pensil sungguhan, cahaya redup, atau halaman miring.

### File yang diubah

- `lib/prompt.ts`: dipecah menjadi bagian bersama; `MARKED_SYSTEM_PROMPT` dan `markedUserPrompt` baru.
- `app/api/lookup/route.ts`: kolom `mode` dan `markers`, pemesanan dan pengembalian jatah, daftar kosong yang sah, batas lima dan penghapusan kata ganda.
- `lib/image.ts`: `drawMarkers`, `MARKER_COLOR`, dan ukuran oval.
- `lib/store.ts`: kolom `batch` dan `marked`, `addMarkedPending`, `resolveMarked`.
- `lib/lookup-client.ts`: `startMarkedLookup`; pengiriman dan batas waktunya dipindah ke `send()` yang dipakai kedua mode.
- `lib/useDb.ts`: `lookupMarked`.
- `app/baca/page.tsx`: pilihan mode, foto yang bisa diketuk, satu masukan berkas untuk seluruh layar.
- `app/kata/page.tsx`: tampilan terfokus mengenali `batch`.
- `components/SenseMap.tsx`: pesan khusus untuk penampung yang sedang diproses.
- `tests/tandai.spec.ts` (baru): lima pengujian.
- `tests/storage.spec.ts`, `tests/koleksi.spec.ts`, `tests/dashboard.spec.ts`: memilih "Ketik kata" dulu, karena mode tandai sekarang bawaan.
- `context/cara_kembali_ke_versi_lama.md` (baru).

### Verifikasi

- `npx tsc --noEmit`: lulus.
- `npm run build`: lulus.
- `npm run lint`: **0 error**, tiga peringatan `<img>`.
- `PLAYWRIGHT_TEST_PRODUCTION=1 npx playwright test`: **52/52 lulus**, terdiri dari 47 pengujian sebelumnya ditambah lima pengujian mode tandai. Tidak satu pun pengujian lama dilemahkan; yang berubah hanya langkah memilih mode ketik.
- Pemeriksaan visual pada lebar 390 dan 1440 piksel, termasuk membuka foto yang benar benar dikirim ke model. Dua masalah ditemukan dan diperbaiki dari situ: lingkaran yang memotong dua baris, dan nomor penanda di layar yang menutupi kata sesudahnya.

### Masalah yang masih terbuka

- **Mengetuk kata di foto satu halaman penuh sulit di HP.** Pada lebar 390 piksel, huruf di foto satu halaman tinggal sekitar 5 sampai 10 piksel. Petunjuk di layar menyarankan memotret dari dekat. Kalau di HP ternyata tetap sulit, langkah berikutnya adalah perbesaran di atas foto. Jalur coretan pensil tidak punya masalah ini.
- Waktu tunggu 58,8 detik pada satu sampel. Lihat bagian uji dengan model sungguhan.
- Belum diuji dengan foto buku sungguhan dan belum diuji di Safari iPhone.
- Cabang belum didorong. Vercel akan membuat alamat pratinjau begitu cabangnya didorong; `GEMINI_API_KEY` harus aktif untuk lingkungan Preview di Vercel, dan pratinjau di paket Hobby biasanya meminta masuk ke akun Vercel dulu.
- PRD bagian 6 mengeluarkan "tap langsung di atas gambar memakai bounding box OCR". Cara di sini berbeda karena tidak memakai OCR maupun bounding box, tetapi pengalaman penggunanya mirip. Keputusan menyelaraskan PRD ada pada pengguna.

### Pekerjaan berikutnya

Dorong cabang untuk mendapat alamat pratinjau, uji di HP dengan buku sungguhan: satu halaman bercoret pensil, satu halaman yang ditandai lewat ketukan. Kalau hasilnya baik, gabungkan ke `main`. Kalau tidak, ikuti `cara_kembali_ke_versi_lama.md`.

## 10 September 2026 — Claude: waktu tunggu model, dari 58,8 detik ke 28,8 detik

**Permintaan pengguna:** "lakukan semuanya", yaitu mengerjakan batas waktu per percobaan di rantai model cadangan, lalu mendorong cabang `fitur/tandai-di-foto` untuk alamat pratinjau.

**Status sesi:** selesai. 58/58 pengujian lulus. Diukur dengan model sungguhan sebelum dan sesudah perbaikan.

### Perbaikan pertama yang ternyata salah

Batas 25 detik per percobaan dipasang lebih dulu, lalu diukur. Hasilnya **gagal total pada detik ke-50**: model utama dan model cadangan sama sama menyentuh batas 25 detik. Padahal tanpa batas itu, model cadangan tadi berhasil pada detik ke-58,8. Artinya perbaikan pertama membuat kasus ini lebih buruk. Kesimpulannya: setiap panggilan memang lambat, bukan hanya satu model yang menggantung, dan angka batas waktu tidak boleh ditebak.

### Penyebab yang ditemukan

Satu panggilan langsung ke `gemini-3.6-flash` dengan pengaturan bawaan: 21,2 detik, **3.234 token berpikir untuk 677 token jawaban**. Sekitar 83% keluarannya habis untuk berpikir sebelum menjawab. Dokumentasi Gemini menyebut tingkat berpikir bawaan model Flash generasi ini adalah `medium`.

Lalu keempat model di rantai dicoba dengan `thinkingConfig.thinkingLevel = "low"`, satu per satu:

| Model | Hasil |
|---|---|
| `gemini-3.8-flash` | HTTP 503 setelah **57,8 detik**, "high demand" |
| `gemini-3.6-flash` | 10,0 detik, 1.183 token berpikir, kata yang ditemukan tetap benar |
| `gemini-3.5-flash` | HTTP 503 dalam 1,7 detik |
| `gemini-3.1-flash-lite` | 12,3 detik, 134 token berpikir, kata yang ditemukan tetap benar |

Jadi ada dua penyebab. Model utama sedang kelebihan beban dan **menggantung hampir semenit sebelum menolak**, dan itulah asal 58,8 detik pertama. Selain itu tingkat berpikir bawaan membuat setiap jawaban sehat pun lambat.

### Perubahan

- **`lib/model-chain.ts` (baru).** Logika rantai cadangan dipisah dari route supaya bisa diuji tanpa jaringan. Setiap model paling lama 20 detik, seluruh rantai paling lama 50 detik, dan model yang sisa waktunya kurang dari 6 detik tidak dimulai sama sekali. Batas waktu dibedakan dari jaringan putus, dan 400/403 tetap menghentikan rantai.
- **Tingkat berpikir `low`** dikirim ke semua model, bisa diatur lewat `GEMINI_THINKING_LEVEL` (`low`, `medium`, `high`; nilai lain kembali ke `low`). Berlaku untuk mode ketik juga, karena penyebab lambatnya sama.
- **400 yang menyebut pengaturan berpikir tidak menghentikan rantai.** `gemini-3.8-flash` dan `gemini-3.5-flash` belum terbukti menerima parameter itu secara langsung karena keduanya sedang membalas 503; dokumentasi menyebut keduanya mendukung. Kalau ternyata salah satunya menolak, model itu dilewati dan rantai jalan terus.
- **Satu baris log per permintaan** di server: model yang dicoba, lamanya, dan hasilnya. Tanpa foto, kata, atau kunci. Dari baris inilah penyebab di atas bisa dilihat.
- `.env.example` menjelaskan `GEMINI_THINKING_LEVEL`.

### Hasil setelah perbaikan

Satu panggilan lewat rantai lengkap dengan foto yang sama: **berhasil dalam 28,8 detik** (sebelumnya 58,8 detik, nyaris terputus). `gemini-3.8-flash` ditinggal pada detik ke-20, `gemini-3.6-flash` menjawab dalam 8,8 detik. Kata yang ditemukan tetap "made out" sebagai frasa dan "curiosity". Jatah tercatat 3 dari 60.

**20 dari 28,8 detik itu murni menunggu model utama yang sedang penuh.** Model cadangannya sendiri sudah di bawah target PRD 10 detik.

### Keputusan yang diserahkan ke pengguna

- **Model utama.** Mengganti `GEMINI_MODEL` menjadi `gemini-3.6-flash` di Environment Variables Vercel, untuk Production dan Preview, diperkirakan menurunkan waktu tunggu ke sekitar 9 detik. `gemini-3.8-flash` tetap ada di rantai sebagai cadangan. Pada 10 September model itu gagal di setiap pengukuran; Google menyebut lonjakan seperti ini biasanya sementara. Belum diubah, karena itu konfigurasi milik pengguna.
- **Tingkat berpikir vs ketepatan.** `low` belum pernah diuji terhadap ketepatan makna. Pada foto uji, kata yang ditemukan dan makna utamanya sama dengan `medium`, tetapi satu foto bukan uji akurasi. Uji akurasi berikutnya sebaiknya dijalankan dengan pengaturan ini, dan dinaikkan ke `medium` bila hasilnya turun.

### Temuan sampingan

Garis pensil tiruan di foto uji dibaca "Still" pada dua panggilan dan "heather" pada satu panggilan. Garisnya memang ambigu, membentang dari ujung "heather." sampai habis "Still,". Ini tanda bahwa coretan yang menyentuh dua kata tidak akan dibaca konsisten, dan patut diperhatikan saat menguji dengan coretan sungguhan.

### Verifikasi

- `npx tsc --noEmit`: lulus. `npm run lint`: 0 error. `npm run build`: lulus.
- `PLAYWRIGHT_TEST_PRODUCTION=1 npx playwright test`: **58/58 lulus**, termasuk enam pengujian baru di `tests/model-chain.spec.ts`: model yang menggantung ditinggal lalu cadangan menjawab, rantai berhenti sebelum melewati anggaran walau enam model menggantung, percobaan terakhir dipotong ke sisa anggaran, 403 tidak dicoba ke model lain, 503 dan jaringan putus sama sama pindah, dan jawaban yang tepat waktu tidak ikut terpotong.
- Enam panggilan model sungguhan dipakai untuk pengukuran di sesi ini, semuanya dengan foto halaman tiruan tanpa data pribadi.

## 11 September 2026 — Claude: mode tandai dan perbaikan waktu tunggu naik ke produksi

**Permintaan pengguna:** "masukkan semua fitur langsung ke https://lema-lemon.vercel.app/". Pengguna memilih menggabungkan tanpa lebih dulu mencoba alamat pratinjau dengan buku sungguhan. Risiko itu disampaikan satu kali, lalu keputusannya diikuti.

**Status sesi:** selesai dan **terverifikasi di produksi**.

### Yang dilakukan

- Cabang `fitur/tandai-di-foto` digabung ke `main` sebagai commit penggabungan tersendiri, `6dac711`, bukan maju lurus. Bentuk ini sengaja dipilih supaya kedua fitur bisa dibatalkan sekaligus dengan `git revert -m 1 6dac711`, sesuai `cara_kembali_ke_versi_lama.md`.
- Sebelum didorong, `main` hasil gabungan diverifikasi ulang: pemeriksaan tipe lulus, lint 0 error, build lulus, **58/58 pengujian lulus**.
- Didorong ke `origin/main` (`0c33808..6dac711`). Vercel melaporkan deployment produksi berhasil sekitar 45 detik kemudian, dipantau lewat catatan deployment di GitHub, bukan dengan memanggil server Vercel berulang kali.

### Jebakan kecil

Perintah penggabungan pertama gagal dengan "could not read file '-'": `git merge -F -` tidak membaca pesan dari masukan langsung, berbeda dengan `git commit -F -`. Yang sempat jalan hanya perpindahan ke `main`, sehingga berkas di laptop sementara kembali ke versi `main`. Tidak ada yang hilang; kedua commit fitur tetap aman di cabangnya. Pesan penggabungan kemudian ditulis ke berkas dan penggabungan kedua berjalan bersih.

### Verifikasi di produksi

Dibuka dengan browser sungguhan di `lema-lemon.vercel.app`, memakai profil browser terpisah dengan satu buku uji:

- Layar foto menampilkan tombol "Ganti buku", pilihan "Tandai di foto" yang tercentang sebagai bawaan beserta "Ketik kata", petunjuk oval dan coretan pensil, serta rak buku di sidebar.
- Satu foto halaman tiruan dengan dua oval magenta dikirim ke `/api/lookup` produksi dari dalam browser itu. Hasilnya **HTTP 200**, ditemukan tepat **"made out"** sebagai frasa dan **"curiosity"**, maknanya benar, dalam **29,9 detik**. Model utama masih ditinggal pada batas 20 detik lalu `gemini-3.6-flash` menjawab, sama dengan pengukuran lokal. Jatah tercatat 2 dari 60.
- Foto itu sengaja tanpa garis pensil, dan model tidak mengarang kata ketiga. Aturan "jangan menambahkan kata yang tidak ditandai" berlaku di produksi.

### Yang masih terbuka

- **Belum diuji dengan buku sungguhan dan belum di Safari iPhone.** Semua bukti sejauh ini memakai foto halaman tiruan berhuruf besar dengan cahaya sempurna.
- **Model utama.** Pada semua pengukuran 10 dan 11 September, `gemini-3.8-flash` gagal atau menggantung. Mengganti `GEMINI_MODEL` menjadi `gemini-3.6-flash` di Vercel diperkirakan menurunkan waktu tunggu dari sekitar 29 detik ke sekitar 9 detik. Belum diubah karena itu konfigurasi milik pengguna.
- **Tingkat berpikir `low` belum diuji terhadap ketepatan makna.** Uji akurasi berikutnya sebaiknya memakai pengaturan ini.
- Uji akurasi 15 kata buku asli dan 15 kata Threads masih nol. Batas kirim portfolio 12 September.
- PRD bagian 5, 6, dan 7 berbeda dari perilaku aplikasi sekarang. Keputusan menyelaraskannya ada pada pengguna.
- Slogan di sidebar masih "Baca terus, maknanya nyusul."; usulan penggantinya belum dipilih.

## 11 September 2026 — Claude: kuis sebagai gerbang dan sebagai tab sendiri

**Permintaan pengguna:** kuis dengan dua fungsi. Pertama, sebelum pengguna menekan tombol yang menyatakan sudah ingat, dia harus mengerjakan kuis dulu, dan baru benar benar tercatat kalau lolos. Kedua, tab baru di navigasi untuk kuis sendiri, dengan soal dari semua buku dan semua jadwal.

**Status sesi:** selesai dan **hidup di produksi** sejak 11 September lewat commit penggabungan `944b2fd`, atas permintaan pengguna tanpa lewat pratinjau. Pemeriksaan tipe, lint tanpa error, build, dan 71/71 pengujian lulus, diulang di `main` hasil gabungan sebelum didorong. Titik pulih: tag `v2-sebelum-kuis` pada `75827b8`.

**Terverifikasi di produksi** dengan browser sungguhan dan satu kata uji di profil browser terpisah. Tab Kuis tampil di navigasi dan menampilkan "1 soal dari 1 kata"; soalnya "Apa arti bank di kalimat ini?" dengan keempat pilihan berupa makna kata "bank" sendiri; jawaban benar menghasilkan "Benar!" dan jadwal kata tidak berubah. Di review, makna tidak terlihat sebelum memilih; "Inget" membuka kuis berlabel "Buktikan dulu kalau kamu inget"; jawaban benar menghasilkan "Tercatat inget. Diulang lagi 7 hari lagi." dengan tahap naik ke 2 dan `passedReview` tercatat. Satu kali halaman sempat tampak pindah sendiri dari `/kuis` ke `/baca` selama pengujian; kode tidak punya perpindahan otomatis ke sana, dan pengamatan ulang selama empat detik tanpa sentuhan menunjukkan alamatnya tetap. Penyebabnya klik alat uji yang memakai rujukan elemen basi, bukan aplikasinya.

### Penafsiran yang dinyatakan ke pengguna

Aplikasi punya dua jenis tombol "sudah ingat": **Inget** di review, yang menaikkan jadwal, serta **Aku udah tahu kata ini** di koleksi dan **Udah hafal, stop tanya** di review, yang mengeluarkan kata dari review selamanya. Gerbang kuis dipasang di ketiganya, supaya tidak ada klaim "aku tahu" yang lolos tanpa bukti. Kalau pengguna hanya bermaksud salah satunya, gerbang di tempat lain tinggal dilepas.

Keputusan desain yang juga disampaikan sebelum menulis kode: **tab kuis tidak mengubah jadwal.** Kata yang dijawab benar tiga kali dalam sepuluh menit belum tentu diingat minggu depan, dan jadwal berjarak justru bergantung pada jeda itu. Kuis yang menentukan jadwal adalah gerbang di review.

### Bentuk soal

Kalimat baru dari kata itu, kata yang ditanyakan ditebalkan, lalu empat pilihan makna. **Pengecoh diambil lebih dulu dari makna lain kata yang sama**, yaitu daftar "Makna lain" yang sudah dibuat model saat kata pertama kali dicari. Jadi yang diuji bukan "kata ini artinya apa" tetapi "di kalimat ini, makna yang mana", kemampuan inti yang diajarkan Lema. Kalau makna lainnya kurang dari tiga, sisanya diisi arti kata lain dari koleksi. Tidak ada panggilan model tambahan: semua bahannya sudah tersimpan.

Setelah menjawab, jawaban benar ditandai hijau, pilihan salah merah, lalu ditampilkan makna dalam bahasa Inggris dan kalimat asal dari buku, sesuai PRD bagian 8.4.

Aturan pengecualian:
- Kata yang ditandai **ragu** tidak dijadikan soal, karena model sendiri menyatakan tidak ada satu jawaban benar.
- Kata **tanpa satu pun pengecoh** tidak bisa diuji, jadi klaimnya diterima apa adanya. Kasus ini butuh kata tanpa makna lain di koleksi yang hanya berisi kata itu, jadi jarang.

### Perubahan perilaku

- **Alur review dibalik.** Sebelumnya makna dibuka dulu, baru pengguna memilih Inget atau Lupa. Kuis setelah makna terlihat tidak menguji apa-apa, jadi sekarang pengguna memilih lebih dulu. **Lupa** langsung membuka makna dan kalimat asal tanpa kuis. **Inget** membuka kuis dengan makna disembunyikan; benar berarti jadwal naik dan tercatat lolos review, salah berarti dihitung lupa. Urutan ini justru lebih dekat ke PRD bagian 8.4, yang tidak pernah punya langkah "buka artinya".
- **Udah hafal, stop tanya** hanya menandai kata sudah tahu kalau kuisnya benar. Kalau salah, pada review biasa dihitung lupa.
- **Mode latihan** memakai gerbang yang sama tetapi tetap tidak menulis jadwal. Satu pengecualian yang disengaja: "Udah hafal" yang lolos kuis tetap menandai kata sudah tahu, karena itu pernyataan pengguna yang sudah dibuktikan, bukan efek samping jadwal.
- **Aku udah tahu kata ini** di koleksi membuka kuis di tempat kartu itu. Selama kuis berjalan, makna, pemicu, dan catatan hati hati disembunyikan, karena semuanya adalah jawabannya.
- **Tab Kuis** menjadi tujuan kelima di navigasi. Satu sesi paling banyak sepuluh soal, dari semua buku dan semua jadwal, termasuk kata yang sudah ditandai tahu. Soal diacak saat tombol "Mulai kuis" ditekan, bukan saat layar digambar. Di akhir sesi ada skor dan daftar kata yang salah dijawab, masing masing bertaut ke kartunya.

### Jebakan yang ditemukan

- **Kata yang sedang direview harus dipegang di tahap kuis.** Begitu jawaban dinilai, kata itu keluar dari antrean jatuh tempo. Kalau kata yang ditampilkan diambil ulang dari antrean, hasil kuis kata pertama akan tertempel di kata berikutnya. Kata yang sedang dikerjakan kini disimpan di dalam tahapnya sendiri.
- **Kata yang bentuknya berubah tidak ditebalkan di kalimat soal.** Pemeriksaan visual menunjukkan "made out" di buku dan "make out" di kalimat soal; komponen kuis hanya mencari bentuk di buku. Sekarang bentuk dasarnya dicari juga, sama seperti layar review.
- Satu pengujian yang pertama ditulis salah berharap: `grade()` menulis `passedReview: false` secara eksplisit saat kata dijawab lupa, bukan membiarkan kolomnya kosong. Artinya sama, jadi pengujiannya yang diluruskan.

### File yang diubah

- `lib/quiz.ts` (baru): `quizzable`, `buildQuestion`, `buildDeck`, `quizCount`. Pengacaknya bisa diganti supaya pengujian bisa diulang persis.
- `components/QuizCard.tsx` (baru): satu soal, dipakai di ketiga tempat.
- `app/kuis/page.tsx` (baru): tab kuis.
- `app/review/page.tsx`: alur review dengan tahap tanya, kuis, dan buka makna.
- `components/SenseMap.tsx`, `app/kata/page.tsx`: gerbang untuk "Aku udah tahu kata ini".
- `components/Nav.tsx`: tab Kuis dan ikonnya. Namanya dijaga tidak diawali "Koleksi kata" dan tidak memuat "foto" atau "ulang", pelajaran dari tabrakan nama sebelumnya.
- `tests/quiz.spec.ts` (baru): enam pengujian pembuat soal di sisi Node.
- `tests/kuis.spec.ts` (baru): tujuh pengujian alur, termasuk jawaban salah di setiap gerbang.
- `tests/dashboard.spec.ts`, `tests/koleksi.spec.ts`, `tests/sense-map.spec.ts`: menyesuaikan alur review yang dibalik, gerbang di kartu makna, dan tab kelima.

### Verifikasi

- `npx tsc --noEmit`: lulus. `npm run lint`: 0 error. `npm run build`: lulus, rute `/kuis` baru.
- `PLAYWRIGHT_TEST_PRODUCTION=1 npx playwright test`: **71/71 lulus**, terdiri dari 58 pengujian sebelumnya ditambah 6 pengujian pembuat soal dan 7 pengujian alur kuis.
- Pemeriksaan visual pada lebar 390 dan 1440 piksel, tema terang dan gelap: layar awal kuis, soal yang dijawab salah, layar tanya di review, kuis gerbang di review, dan gerbang di kartu makna. Satu cacat ditemukan dan diperbaiki dari situ, yaitu frasa yang tidak ditebalkan.

### Yang masih terbuka

- **PRD bagian 6 masih menyebut kuis pilihan ganda sebagai hal yang dikeluarkan dari v1.** Dengan fitur ini, dokumen dan produk makin bercerita berbeda.
- Belum diuji dengan data dari model sungguhan. Mutu pengecoh bergantung pada daftar "Makna lain" yang dibuat model; kalau salah satu makna lain itu terlalu mirip dengan makna yang benar, soalnya jadi ambigu.
- Uji akurasi 15 kata buku asli dan 15 kata Threads masih nol, dengan batas kirim portfolio 12 September.

## Format catatan berikutnya

Gunakan tanggal dan nama pelaksana, lalu jelaskan: permintaan/tujuan, keputusan, file yang diubah beserta alasannya, verifikasi dan hasilnya, masalah yang masih terbuka, serta pekerjaan berikutnya. Tulis "belum diuji" untuk hal yang belum benar-benar diperiksa.
