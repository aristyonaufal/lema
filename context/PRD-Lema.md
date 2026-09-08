# PRD Lema v1

Dokumen ini adalah spesifikasi build untuk 3 hari. Ditulis supaya bisa langsung diserahkan ke coding agent atau dikerjakan sendiri tanpa nanya balik.

Status: siap dibangun
Target rilis: 9 September 2026
Batas submit portfolio: 12 September 2026

---

## 1. Ringkasan

Lema membantu orang Indonesia yang lagi belajar Inggris lewat buku supaya gak berhenti baca setiap ketemu kata yang maknanya ambigu. Penggunanya memotret halaman yang lagi dibaca, menandai kata yang bikin mandek, lalu lanjut baca. Lema menentukan makna kata itu berdasarkan konteks halaman tersebut, menyimpannya ke koleksi buku yang bersangkutan, dan memunculkannya lagi beberapa hari kemudian di dalam kalimat yang belum pernah dilihat penggunanya.

Kalimat pembeda: alat lain memotong bacaanmu untuk memberi jawaban. Lema menunda jawabannya supaya bacaanmu tidak terpotong.

---

## 2. Masalah

### Lapis pertama, yang dirasakan pengguna

Berhenti itu mahal. Satu lookup bukan cuma 40 detik, tapi juga fokus yang pecah. Dan sering kali setelah 40 detik itu penggunanya pulang tetap tidak yakin, karena kamus dan translator memberi makna yang lepas dari konteks. Bayar mahal, dapatnya "mungkin". Setelah itu terjadi enam kali dalam satu jam, bukunya ditutup.

### Lapis kedua, yang tidak disadari pengguna

Tidak ada yang menumpuk. Kata yang dicari hari ini hilang begitu saja, dan tiga bab kemudian dicari lagi. Selesai satu buku, 200 kata dicari dan mungkin 15 yang menempel.

### Hierarki

Lapis pertama yang membuat orang membuka aplikasi. Lapis kedua yang membuat aplikasi ini pantas ada. Kalau harus memilih satu untuk dikorbankan di v1, korbankan kecepatan, jangan korbankan penyimpanan.

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

Klaim Lema hanya satu, dan jangan diperlebar: **buku kertas, dan bahasa Indonesia sebagai bahasa penjelas.**

---

## 5. Prinsip produk

Empat aturan ini yang dipakai untuk menyelesaikan perdebatan desain nanti.

1. **Baca dulu, jawab belakangan.** Default-nya jawaban ditunda. Membaca tidak boleh diinterupsi oleh aplikasi ini.
2. **Ajari cara menebak, bukan cuma kasih jawaban.** Setiap jawaban wajib menunjukkan kata pemicu di kalimat yang menentukan makna itu.
3. **Ragu itu ditampilkan, bukan disembunyikan.** Percaya diri palsu adalah penyebab kebingungan yang mau kita hilangkan. Kalau model tidak yakin, katakan.
4. **Nol setup.** Tidak ada akun, tidak ada onboarding, tidak ada pemilihan level. Buka, foto, jalan.

---

## 6. Lingkup v1

### Masuk

- Foto halaman lewat kamera HP
- Tandai satu sampai lima kata per halaman dengan mengetik katanya
- Mode tunda sebagai default, dengan tombol "buka sekarang" sebagai jalan keluar
- Layar peta makna: semua makna umum, tandai yang terpakai, kata pemicu, catatan makna lain
- Penanda ragu ketika model tidak yakin
- Koleksi kata dikelompokkan per buku
- Review harian memakai kalimat baru yang dibuat model
- Tombol "aku udah tahu kata ini"
- Progres per buku

### Keluar, dan jangan diributkan lagi

Akun dan login, sinkron antar perangkat, audio dan pelafalan, kuis pilihan ganda, mode sosial atau papan peringkat, tap langsung di atas gambar memakai bounding box OCR, dukungan bahasa selain Inggris ke Indonesia, aplikasi native iOS.

---

## 7. Alur utama

1. Pengguna buka Lema. Layar pertama adalah kamera, bukan menu.
2. Foto halaman buku.
3. Ketik kata yang bikin mandek. Boleh tambah sampai lima kata dari halaman yang sama.
4. Tekan "simpan, lanjut baca". Aplikasi memproses di latar dan tidak menampilkan jawaban.
5. Pengguna terus membaca. Bisa foto halaman berikutnya kapan saja.
6. Kalau tidak tahan, ada tombol "buka sekarang" di setiap kata.
7. Selesai membaca, buka tab Kata. Semua jawaban sudah siap.
8. Besoknya, saat aplikasi dibuka, muncul review kata kemarin dalam kalimat baru.

Jumlah ketukan dari buka aplikasi sampai kembali membaca: maksimal empat.

---

## 8. Spesifikasi layar

### 8.1 Kamera

Layar pembuka. Kamera langsung aktif. Satu tombol jepret. Di bawahnya, nama buku yang aktif dengan opsi ganti. Kalau belum ada buku, minta nama buku sekali saja lewat satu isian teks.

### 8.2 Tandai kata

Menampilkan foto halaman di atas, isian teks di bawah. Tiap kata yang diketik jadi chip yang bisa dihapus. Tombol utama "simpan, lanjut baca". Tombol sekunder "buka sekarang".

### 8.3 Peta makna

Layar paling penting. Ini yang jadi tangkapan layar utama di portfolio, jadi kerjakan paling rapi.

Urutan dari atas:

- Kata dan bentuk dasarnya
- Kalimat asal dari halaman, dengan kata target ditebalkan
- Makna yang terpakai, ditulis besar, dalam Bahasa Indonesia
- Baris "kenapa": kata pemicu di kalimat itu, ditandai warna, plus satu kalimat alasan
- Daftar makna lain kata tersebut, ditulis lebih kecil dan redup, supaya pengguna melihat peta lengkapnya
- Catatan makna lain kalau ada, misalnya "di percakapan sehari hari kata ini lebih sering berarti X"
- Kalau model ragu: dua kandidat makna ditampilkan sejajar dengan alasan masing masing, plus label jujur "dua duanya masuk akal di sini"
- Tombol "aku udah tahu kata ini"

### 8.4 Review

Muncul otomatis saat aplikasi dibuka kalau ada kata yang jatuh tempo. Menampilkan kalimat baru yang dibuat model, dengan kata target dikosongkan atau ditebalkan. Pengguna menekan "inget" atau "lupa". Kalau lupa, makna yang benar ditampilkan lagi beserta kalimat asal dari bukunya.

Jadwal ulang v1 memakai tangga tetap: 1 hari, 3 hari, 7 hari, 21 hari. Jawaban "lupa" mengembalikan kata ke anak tangga pertama. Jangan pakai SM-2 atau FSRS di v1, tangga tetap sudah cukup dan bisa diganti belakangan.

### 8.5 Koleksi buku

Daftar buku. Tiap buku menampilkan jumlah kata terkumpul dan jumlah kata yang sudah lewat review pertama. Ketuk untuk melihat daftar katanya.

---

## 9. Kontrak data

### 9.1 Balikan dari endpoint lookup

Model wajib mengembalikan JSON persis dengan bentuk ini. Kalau tidak valid, ulangi sekali, lalu tampilkan pesan gagal yang jujur.

```json
{
  "word": "made out",
  "lemma": "make out",
  "is_phrase": true,
  "sentence": "She made out the shape of a house in the fog.",
  "ambiguous": false,
  "applied_sense": {
    "meaning_id": "berhasil melihat atau mengenali sesuatu yang samar",
    "meaning_en": "to manage to see something with difficulty",
    "confidence": 0.86,
    "trigger": "in the fog",
    "why_id": "Frasa 'in the fog' menandakan penglihatan yang terhalang, jadi maknanya soal berusaha melihat."
  },
  "alternative_sense": null,
  "other_senses": [
    { "meaning_id": "berciuman", "meaning_en": "to kiss passionately" },
    { "meaning_id": "menulis atau mengisi dokumen", "meaning_en": "to write out a document" }
  ],
  "caution_id": "Di percakapan sehari hari, 'make out' jauh lebih sering berarti berciuman. Hati hati saat menemuinya di konteks lain.",
  "new_sentence": "Through the heavy rain, he could barely make out the road ahead."
}
```

Aturan: kalau `ambiguous` bernilai true, `alternative_sense` wajib terisi dengan bentuk yang sama seperti `applied_sense`, dan layar peta makna menampilkan dua duanya sejajar.

### 9.2 Penyimpanan lokal

v1 memakai localStorage atau IndexedDB. Tidak ada basis data server.

```json
{
  "books": [
    { "id": "b1", "title": "Sapiens", "created_at": 0 }
  ],
  "entries": [
    {
      "id": "e1",
      "book_id": "b1",
      "word": "made out",
      "payload": { },
      "known": false,
      "stage": 0,
      "due_at": 0,
      "created_at": 0
    }
  ]
}
```

`stage` adalah indeks tangga review. `due_at` adalah timestamp jatuh tempo berikutnya.

---

## 10. Spesifikasi prompt

Satu panggilan ke model yang bisa membaca gambar. Kirim foto halaman plus daftar kata. Jangan pakai OCR terpisah, model yang membaca gambarnya langsung.

Isi instruksi yang wajib ada:

- Kamu menerima foto satu halaman buku berbahasa Inggris dan daftar kata yang membuat pembaca berhenti
- Baca halaman itu sebagai konteks utuh, bukan hanya kalimat tempat katanya muncul
- Untuk tiap kata, tentukan makna yang benar-benar dipakai di halaman ini
- Sebutkan kata atau frasa di teks yang menjadi pemicu penentuan makna tersebut
- Kalau dua makna sama masuk akalnya, set `ambiguous` menjadi true dan isi keduanya. Jangan memaksakan satu jawaban
- Semua penjelasan ditulis dalam Bahasa Indonesia yang sederhana, tanpa istilah linguistik
- Buat satu kalimat contoh baru dalam bahasa Inggris memakai makna yang sama, dengan topik yang berbeda dari buku ini
- Balas hanya JSON sesuai skema, tanpa teks lain

Catatan penting: minta `new_sentence` di panggilan yang sama, jangan di panggilan terpisah. Menghemat biaya dan menjaga makna tetap konsisten.

---

## 11. Non-fungsional

- **Kunci API tidak boleh ada di sisi browser.** Semua panggilan lewat satu serverless function di Vercel. Ini syarat mutlak, bukan saran.
- **Batas pemakaian.** Pasang batas per IP per hari, misalnya 30 kata. Tanpa ini tagihan bisa jebol dalam semalam kalau postingan Threads-mu rame.
- **Waktu tanggap.** Dari tekan simpan sampai kembali ke kamera harus terasa instan, karena prosesnya di latar. Target pemrosesan selesai di bawah 10 detik per halaman.
- **Ukuran foto.** Kecilkan di sisi browser sebelum dikirim, sisi terpanjang maksimal 1600 piksel. Foto mentah dari kamera HP terlalu besar dan bikin lambat serta mahal.
- **Privasi.** Foto tidak disimpan setelah diproses. Katakan ini di antarmuka, karena orang memotret buku pribadinya.
- **Wajib jalan di Safari iOS.** Bukan hanya Chrome laptop. Uji dengan kamera sungguhan, bukan simulator.

---

## 12. Kriteria selesai

Bisa diuji, bukan opini.

1. Diuji dengan 15 kata sulit dari buku Inggris asli, minimal 12 makna yang dipilih benar menurut penilaianmu sendiri
2. Diuji dengan minimal 15 kata hasil kumpulan dari Threads, hasilnya dicatat apa adanya termasuk yang salah
3. Dari buka aplikasi sampai kembali membaca, maksimal empat ketukan
4. Review hari berikutnya memunculkan kalimat yang berbeda dari kalimat asal
5. Tidak ada kunci API di bundle browser, dibuktikan dengan melihat sumber halaman
6. Berjalan di Safari iOS dengan kamera sungguhan
7. Batas pemakaian aktif dan sudah diuji

---

## 13. Metrik

Yang dipantau selama 4 hari sebelum submit, dan yang ditulis di portfolio.

- Jumlah kata yang dicari, total dan per pengguna
- Persentase pengguna yang kembali di hari kedua. Ini metrik paling penting karena menguji lapis masalah kedua
- Persentase kata yang ditandai `ambiguous` oleh model. Angka ini menarik karena berhubungan langsung dengan temuan riset
- Persentase kata yang lolos review pertama

---

## 14. Risiko

| Risiko | Kemungkinan | Penanganan |
|---|---|---|
| Model salah pilih makna pada kata yang jarang | Tinggi, dan ini memang temuan riset | Jangan disembunyikan. Tampilkan sebagai fitur keraguan, dan tulis apa adanya di portfolio |
| Foto halaman buram atau miring | Sedang | Minta ulang foto dengan pesan yang jelas. Jangan coba perbaiki gambarnya di v1 |
| Biaya API melonjak kalau postingan rame | Sedang | Batas per IP per hari, wajib ada sebelum rilis |
| Scope melebar ke kuis dan audio | Tinggi | Daftar "keluar" di bagian 6 adalah kontrak. Kalau tergoda, baca ulang |
| Waktu habis di desain, lingkarannya belum jalan | Tinggi | Hari 1 dan 2 dilarang menyentuh estetika. Poles hanya di hari 3 |

---

## 15. Peta jalan setelah v1

Bagian ini bukan untuk dibangun sekarang. Ini untuk ditulis di portfolio dan dibicarakan di FGD, karena Academy mencari orang yang punya bahan untuk digarap 9 bulan.

- **Tebak dulu.** Sebelum jawaban dibuka, aplikasi bertanya "menurut kamu artinya apa?". Menebak duluan terbukti membuat ingatan lebih menempel daripada langsung membaca jawaban
- **Peringatan halaman sulit.** Sebelum membaca satu bab, tunjukkan kata mana saja yang kemungkinan di atas level pembacanya
- **Kartu kosakata buku.** Saat buku selesai, hasilkan satu kartu berisi semua kata yang terkumpul dari buku itu, dirancang untuk dibagikan
- **Set uji publik.** Kumpulan kata yang membuat pembaca Indonesia mandek, dibuka untuk umum. Ini bisa jadi kontribusi kecil yang nyata ke ruang riset word sense disambiguation
- **Sinkron antar perangkat dan versi iOS native**

---

## 16. Tumpukan teknologi

- Next.js App Router di Vercel, satu route API sebagai perantara model
- Tailwind untuk gaya
- localStorage atau IndexedDB untuk data, tanpa basis data server di v1
- Model yang bisa membaca gambar dan punya kuota gratis. Periksa nama model yang berlaku saat ini sebelum menulis kode, jangan mengandalkan nama model dari ingatan
- Tanpa pustaka OCR terpisah
