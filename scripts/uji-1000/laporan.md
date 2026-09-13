# Laporan Uji 1.000 Kata Lema

Dijalankan 2026-09-13T20:24 sampai 2026-09-13T20:40 (UTC) lewat `/api/lookup` yang sama dengan produksi, dari server lokal, dalam mode tandai. Kasus, kunci, dan aturan di-commit sebelum model dijalankan: commit `8b0e549`. Laporan ini dibuat otomatis oleh `scripts/uji-1000/nilai.py`.

## Ringkasan

## Kesimpulan singkat

Dari 1.000 kata yang ditandai di 200 halaman fiksi berlabel manusia, Lema menemukan 938 kata dan memberi makna yang tepat untuk pembaca pada 94.5% di antaranya (78.7% dengan penilaian paling ketat). Pada kata jebakan, yang arti pertama kamusnya salah, Lema tetap tepat untuk pembaca pada sebagian besar kasus, sementara arti pertama kamus salah semua. Pada kata umum, Lema sedikit di bawah kamus. Masalah terbesar yang ditemukan bukan akurasi, melainkan kuota API: tiga model utama menolak sejak permintaan ke-7, sehingga hampir semua jawaban datang dari model cadangan terkecil.

| Yang diukur | Hasil |
|---|---|
| Halaman terjawab pada percobaan pertama | 189/200 = 94.5% (95% CI 90.4–96.9%) |
| Halaman terjawab dalam tiga percobaan | 200/200 = 100.0% (95% CI 98.1–100.0%) |
| Kata yang ditandai dan ditemukan | 938/1000 = 93.8% (95% CI 92.1–95.1%) (tepat 822, sebagai frasa 116) |
| Kata yang ditandai tetapi terlewat | 62 (ditambah 0 kata di halaman yang gagal dijawab) |
| Entri tambahan yang tidak ditandai | 51 |
| **Makna tepat untuk pembaca** (benar + benar-ragu + dekat) | **886/938 = 94.5% (95% CI 92.8–95.7%)** |
| Makna benar, penilaian ketat | 738/938 = 78.7% (95% CI 75.9–81.2%) |
| Median waktu tunggu per halaman yang berhasil | 10.0 dtk |

## Makna, per kelompok

| Kelompok | Kata dinilai | Tepat untuk pembaca | Benar (ketat) |
|---|---|---|---|
| Semua | 938 | 886/938 = 94.5% (95% CI 92.8–95.7%) | 738/938 = 78.7% (95% CI 75.9–81.2%) |
| Jebakan: arti pertama kamus salah | 468 | 431/468 = 92.1% (95% CI 89.3–94.2%) | 318/468 = 67.9% (95% CI 63.6–72.0%) |
| Umum: arti pertama kamus benar | 470 | 455/470 = 96.8% (95% CI 94.8–98.1%) | 420/470 = 89.4% (95% CI 86.2–91.8%) |
| Tanda oval | 451 | 420/451 = 93.1% (95% CI 90.4–95.1%) | 346/451 = 76.7% (95% CI 72.6–80.4%) |
| Tanda pensil | 487 | 466/487 = 95.7% (95% CI 93.5–97.2%) | 392/487 = 80.5% (95% CI 76.7–83.8%) |
| Halaman bersih | 470 | 440/470 = 93.6% (95% CI 91.0–95.5%) | 370/470 = 78.7% (95% CI 74.8–82.2%) |
| Halaman foto | 468 | 446/468 = 95.3% (95% CI 93.0–96.9%) | 368/468 = 78.6% (95% CI 74.7–82.1%) |

Pembanding: arti pertama kamus benar 0 dari 500 kata jebakan dan 500 dari 500 kata umum, menurut cara kasus dipilih.

## Sebaran nilai makna

| Nilai | Jumlah |
|---|---|
| benar | 738 |
| benar-ragu | 0 |
| dekat | 148 |
| salah | 52 |

## Deteksi, per kondisi

| Kondisi | Ditemukan | Terlewat | Tambahan |
|---|---|---|---|
| oval, bersih | 224/250 = 89.6% (95% CI 85.2–92.8%) | 26 | 26 |
| oval, foto | 227/250 = 90.8% (95% CI 86.6–93.8%) | 23 | 22 |
| pensil, bersih | 246/250 = 98.4% (95% CI 96.0–99.4%) | 4 | 2 |
| pensil, foto | 241/250 = 96.4% (95% CI 93.3–98.1%) | 9 | 1 |

## Makna, per model yang menjawab

| Model | Kata dinilai | Tepat untuk pembaca | Benar (ketat) |
|---|---|---|---|
| gemini-3.1-flash-lite | 743 | 701/743 = 94.3% (95% CI 92.4–95.8%) | 584/743 = 78.6% (95% CI 75.5–81.4%) |
| gemini-3.6-flash | 94 | 89/94 = 94.7% (95% CI 88.1–97.7%) | 78/94 = 83.0% (95% CI 74.1–89.2%) |
| gemini-3.5-flash | 71 | 67/71 = 94.4% (95% CI 86.4–97.8%) | 55/71 = 77.5% (95% CI 66.5–85.6%) |
| gemini-3.8-flash | 30 | 29/30 = 96.7% (95% CI 83.3–99.4%) | 21/30 = 70.0% (95% CI 52.1–83.3%) |

## Keandalan

Setiap percobaan di rantai model, dari log server (`rantai_model.json`):

| Model (urutan rantai) | Dicoba | Berhasil | 429 kuota/batas laju | 503 penuh | Menggantung | Jaringan |
|---|---|---|---|---|---|---|
| gemini-3.5-flash | 211 | 15 | 187 | 0 | 6 | 3 |
| gemini-3.8-flash | 196 | 6 | 172 | 15 | 0 | 3 |
| gemini-3.6-flash | 190 | 20 | 169 | 1 | 0 | 0 |
| gemini-3.1-flash-lite | 170 | 159 | 9 | 0 | 2 | 0 |

| Model yang akhirnya menjawab | Halaman |
|---|---|
| gemini-3.1-flash-lite | 159 |
| gemini-3.6-flash | 20 |
| gemini-3.5-flash | 15 |
| gemini-3.8-flash | 6 |

| Kegagalan percobaan (HTTP, pesan) | Jumlah |
|---|---|
| 502 Kuota harian API kamu habis. Coba lagi besok. | 9 |
| 502 Model terlalu lama menjawab. Coba lagi sebentar lagi. | 2 |

## Keterbatasan yang harus dibaca bersama angkanya

1. **Penilai makna adalah Claude**, bukan manusia, walaupun kuncinya label manusia. Makna WordNet sering sangat halus; nilai 'dekat' adalah penilaian. Semua keputusan dan alasannya ada di `penilaian/nilai_XX.json`.
2. **Halaman dirender, bukan difoto.** Efek foto (miring, perspektif, buram, bayangan, noise) hanya tiruan. Tanda oval dan pensil tidak ikut buram.
3. **Teks SemCor berasal dari fiksi Amerika tahun 1960an** (korpus Brown), dan tanda kutipnya disusun ulang dari token, jadi letak koma di sekitar tanda kutip kadang tidak lazim.
4. **Kata sasaran dipilih oleh program**, bukan kata yang benar benar membuat pembaca Indonesia berhenti. Kata jebakan mendekati kasus itu, tetapi tidak sama.
5. **Konfigurasi model mengikuti .env.local** di server lokal saat uji, yang bisa berbeda dari produksi.
6. **Penilai berbeda kelonggaran.** Porsi nilai 'dekat' per batch berkisar 11% sampai 24%. Karena itu angka sebenarnya sebaiknya dibaca di antara metrik ketat dan metrik pembaca, bukan satu angka saja.
7. **Glos yang menyebut dua makna sekaligus** ('A atau B') setidaknya pada 5 kata dinilai benar atau dekat karena salah satunya cocok. Aturan tidak mengatur kasus ini secara eksplisit; pengaruhnya di bawah 1 poin persentase.
8. **80% jawaban datang dari model cadangan terkecil** (gemini-3.1-flash-lite), karena API gratis mengembalikan 429 untuk tiga model utama sejak permintaan ke-7. Hasil ini terutama menggambarkan model itu.
9. **Lema tidak pernah menandai ragu** (ambiguous) di 938 jawaban, jadi fitur dua makna tidak teruji di sini.
