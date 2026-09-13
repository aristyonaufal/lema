"""Penilaian uji 1.000 kata Lema, sesuai aturan.json yang di-commit sebelum model dijalankan.

    python scripts/uji-1000/nilai.py siapkan   # deteksi otomatis + berkas untuk penilai makna
    python scripts/uji-1000/nilai.py rekap     # gabungkan penilaian makna, tulis laporan.md

Deteksi (kata yang ditandai ditemukan atau tidak) dinilai otomatis di sini.
Makna dinilai oleh Claude per kata terhadap label WordNet dari anotator
manusia; berkas penilaian/batch_XX.json berisi apa yang dilihat penilai, dan
penilaian/nilai_XX.json berisi keputusannya.
"""
import json
import math
import random
import re
import statistics
import sys
from collections import Counter
from pathlib import Path

HERE = Path(__file__).parent
KASUS = json.loads((HERE / "kasus.json").read_text(encoding="utf-8"))
HASIL = json.loads((HERE / "hasil.json").read_text(encoding="utf-8"))
DIR = HERE / "penilaian"
BATCH = 100


def norm(s):
    return re.sub(r"[^a-z' ]", "", s.lower()).strip()


def detect(page, results):
    """Pasangkan kata yang ditandai dengan entri hasil. Setiap entri dipakai sekali."""
    used, rows = set(), []
    for i, t in enumerate(page["sasaran"]):
        kata, lemma = norm(t["kata"]), norm(t["lemma"])
        match, how = None, "terlewat"
        for j, r in enumerate(results):
            if j in used:
                continue
            w, l = norm(r.get("word", "")), norm(r.get("lemma", ""))
            if w == kata or l == lemma or w == lemma:
                match, how = j, "tepat"
                break
        if match is None:
            for j, r in enumerate(results):
                if j in used:
                    continue
                if kata in norm(r.get("word", "")).split() or lemma in norm(r.get("lemma", "")).split():
                    match, how = j, "tepat-frasa"
                    break
        if match is not None:
            used.add(match)
        rows.append((i, t, how, results[match] if match is not None else None))
    extra = [r for j, r in enumerate(results) if j not in used]
    return rows, extra


def wilson(k, n, z=1.96):
    if n == 0:
        return (0.0, 0.0)
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return (max(0.0, c - h), min(1.0, c + h))


def pct(k, n):
    lo, hi = wilson(k, n)
    return f"{k}/{n} = {100 * k / n:.1f}% (95% CI {100 * lo:.1f}–{100 * hi:.1f}%)" if n else "0/0"


def items():
    """Semua kata yang ditandai, dengan status deteksi dan jawaban Lema."""
    out = []
    for page in KASUS["halaman"]:
        h = HASIL["halaman"].get(page["id"])
        if not h or not h["ok"]:
            for i, t in enumerate(page["sasaran"]):
                out.append({"id": f"{page['id']}-{i + 1}", "page": page, "t": t, "status": "gagal", "r": None})
            continue
        rows, extra = detect(page, h["hasil"])
        for i, t, how, r in rows:
            out.append({"id": f"{page['id']}-{i + 1}", "page": page, "t": t, "status": how, "r": r})
        for r in extra:
            out.append({"id": f"{page['id']}-x", "page": page, "t": None, "status": "tambahan", "r": r})
    return out


def siapkan():
    DIR.mkdir(exist_ok=True)
    judged = []
    for it in items():
        if it["status"] not in ("tepat", "tepat-frasa"):
            continue
        t, r = it["t"], it["r"]
        judged.append({
            "id": it["id"],
            "kalimat": t["kalimat"],
            "kata_ditandai": t["kata"],
            "kunci": {"no": t["kunci"]["no"], "definisi": t["kunci"]["definisi"], "contoh": t["kunci"]["contoh"]},
            "makna_lain": [{"no": s["no"], "definisi": s["definisi"]} for s in t["makna_lain"]],
            "jawaban_lema": {
                "word": r.get("word"), "ambiguous": r.get("ambiguous"),
                "kandidat": [{"meaning_en": c.get("meaning_en"), "meaning_id": c.get("meaning_id"),
                              "confidence": c.get("confidence"), "trigger": c.get("trigger")} for c in r.get("candidates", [])],
            },
        })
    for n in range(0, len(judged), BATCH):
        (DIR / f"batch_{n // BATCH + 1:02d}.json").write_text(json.dumps(judged[n:n + BATCH], ensure_ascii=False, indent=1), encoding="utf-8")
    c = Counter(it["status"] for it in items())
    print(json.dumps({"dinilai_makna": len(judged), "batch": math.ceil(len(judged) / BATCH), **c}, ensure_ascii=False))


def rekap():
    verdicts = {}
    for f in sorted(DIR.glob("nilai_*.json")):
        for v in json.loads(f.read_text(encoding="utf-8")):
            verdicts[v["id"]] = v
    all_items = items()
    words = [it for it in all_items if it["t"] is not None]
    extra = [it for it in all_items if it["status"] == "tambahan"]
    detected = [it for it in words if it["status"] in ("tepat", "tepat-frasa")]
    missing = [it for it in detected if it["id"] not in verdicts]
    if missing:
        raise SystemExit(f"{len(missing)} kata belum dinilai, misalnya {missing[0]['id']}")
    for it in detected:
        it["nilai"] = verdicts[it["id"]]["nilai"]
    ok_labels = {"benar", "benar-ragu", "dekat"}

    def block(sel, title):
        n = len(sel)
        good = sum(it["nilai"] in ok_labels for it in sel)
        strict = sum(it["nilai"] == "benar" for it in sel)
        return f"| {title} | {n} | {pct(good, n)} | {pct(strict, n)} |"

    pages = KASUS["halaman"]
    hp = [HASIL["halaman"][p["id"]] for p in pages if p["id"] in HASIL["halaman"]]
    first_ok = sum(1 for h in hp if h["percobaan"] and h["percobaan"][0]["ok"])
    ok3 = sum(1 for h in hp if h["ok"])
    ms = [a["ms"] for h in hp for a in h["percobaan"] if a["ok"]]
    models = Counter(h["model"] for h in hp if h["ok"])
    errors = Counter((a["http"], (a["error"] or "")[:60]) for h in hp for a in h["percobaan"] if not a["ok"])
    labels = Counter(it["nilai"] for it in detected)
    status = Counter(it["status"] for it in words)

    L = []
    L.append("# Laporan Uji 1.000 Kata Lema\n")
    L.append(f"Dijalankan {HASIL.get('dimulai', '?')[:16]} sampai {HASIL.get('selesai', '?')[:16]} (UTC) lewat `/api/lookup` yang sama dengan produksi, "
             "dari server lokal, dalam mode tandai. Kasus, kunci, dan aturan di-commit sebelum model dijalankan: commit `8b0e549`. "
             "Laporan ini dibuat otomatis oleh `scripts/uji-1000/nilai.py`.\n")
    L.append("## Ringkasan\n")
    L.append("| Yang diukur | Hasil |\n|---|---|")
    L.append(f"| Halaman terjawab pada percobaan pertama | {pct(first_ok, len(pages))} |")
    L.append(f"| Halaman terjawab dalam tiga percobaan | {pct(ok3, len(pages))} |")
    L.append(f"| Kata yang ditandai dan ditemukan | {pct(len(detected), len(words))} (tepat {status['tepat']}, sebagai frasa {status['tepat-frasa']}) |")
    L.append(f"| Kata yang ditandai tetapi terlewat | {status['terlewat']} (ditambah {status['gagal']} kata di halaman yang gagal dijawab) |")
    L.append(f"| Entri tambahan yang tidak ditandai | {len(extra)} |")
    good = sum(labels[k] for k in ok_labels)
    L.append(f"| **Makna tepat untuk pembaca** (benar + benar-ragu + dekat) | **{pct(good, len(detected))}** |")
    L.append(f"| Makna benar, penilaian ketat | {pct(labels['benar'], len(detected))} |")
    L.append(f"| Median waktu tunggu per halaman yang berhasil | {statistics.median(ms) / 1000:.1f} dtk |" if ms else "| Waktu tunggu | - |")
    L.append("")
    L.append("## Makna, per kelompok\n")
    L.append("| Kelompok | Kata dinilai | Tepat untuk pembaca | Benar (ketat) |\n|---|---|---|---|")
    L.append(block(detected, "Semua"))
    for key, title in (("jebakan", "Jebakan: arti pertama kamus salah"), ("umum", "Umum: arti pertama kamus benar")):
        L.append(block([it for it in detected if it["t"]["jenis"] == key], title))
    for key in ("oval", "pensil"):
        L.append(block([it for it in detected if it["page"]["tanda"] == key], f"Tanda {key}"))
    for key in ("bersih", "foto"):
        L.append(block([it for it in detected if it["page"]["kondisi"] == key], f"Halaman {key}"))
    L.append("")
    L.append(f"Pembanding: arti pertama kamus benar 0 dari 500 kata jebakan dan 500 dari 500 kata umum, menurut cara kasus dipilih.\n")
    L.append("## Sebaran nilai makna\n")
    L.append("| Nilai | Jumlah |\n|---|---|")
    for k in ("benar", "benar-ragu", "dekat", "salah"):
        L.append(f"| {k} | {labels[k]} |")
    L.append("")
    L.append("## Deteksi, per kondisi\n")
    L.append("| Kondisi | Ditemukan | Terlewat | Tambahan |\n|---|---|---|---|")
    for tanda in ("oval", "pensil"):
        for kondisi in ("bersih", "foto"):
            sel = [it for it in words if it["page"]["tanda"] == tanda and it["page"]["kondisi"] == kondisi and it["status"] != "gagal"]
            ex = [it for it in extra if it["page"]["tanda"] == tanda and it["page"]["kondisi"] == kondisi]
            found = sum(it["status"] in ("tepat", "tepat-frasa") for it in sel)
            L.append(f"| {tanda}, {kondisi} | {pct(found, len(sel))} | {sum(it['status'] == 'terlewat' for it in sel)} | {len(ex)} |")
    L.append("")
    L.append("## Makna, per model yang menjawab\n")
    L.append("| Model | Kata dinilai | Tepat untuk pembaca | Benar (ketat) |\n|---|---|---|---|")
    for m, _ in models.most_common():
        L.append(block([it for it in detected if HASIL["halaman"][it["page"]["id"]]["model"] == m], m))
    L.append("")
    L.append("## Keandalan\n")
    chain = HERE / "rantai_model.json"
    if chain.exists():
        per = {}
        for req in json.loads(chain.read_text(encoding="utf-8"))["permintaan"]:
            for a in req["attempts"]:
                c = per.setdefault(a["model"], Counter())
                c["dicoba"] += 1
                c[a["outcome"] + (f" {a['status']}" if a.get("status") else "")] += 1
        L.append("Setiap percobaan di rantai model, dari log server (`rantai_model.json`):\n")
        L.append("| Model (urutan rantai) | Dicoba | Berhasil | 429 kuota/batas laju | 503 penuh | Menggantung | Jaringan |\n|---|---|---|---|---|---|---|")
        for m, c in per.items():
            L.append(f"| {m} | {c['dicoba']} | {c['ok']} | {c['next 429']} | {c['next 503']} | {c['timeout']} | {c['network']} |")
        L.append("")
    L.append("| Model yang akhirnya menjawab | Halaman |\n|---|---|")
    for m, n in models.most_common():
        L.append(f"| {m} | {n} |")
    L.append("")
    if errors:
        L.append("| Kegagalan percobaan (HTTP, pesan) | Jumlah |\n|---|---|")
        for (code, msg), n in errors.most_common(8):
            L.append(f"| {code} {msg} | {n} |")
        L.append("")
    L.append("## Keterbatasan yang harus dibaca bersama angkanya\n")
    L.append("1. **Penilai makna adalah Claude**, bukan manusia, walaupun kuncinya label manusia. Makna WordNet sering sangat halus; nilai 'dekat' adalah penilaian. Semua keputusan dan alasannya ada di `penilaian/nilai_XX.json`.")
    L.append("2. **Halaman dirender, bukan difoto.** Efek foto (miring, perspektif, buram, bayangan, noise) hanya tiruan. Tanda oval dan pensil tidak ikut buram.")
    L.append("3. **Teks SemCor berasal dari fiksi Amerika tahun 1960an** (korpus Brown), dan tanda kutipnya disusun ulang dari token, jadi letak koma di sekitar tanda kutip kadang tidak lazim.")
    L.append("4. **Kata sasaran dipilih oleh program**, bukan kata yang benar benar membuat pembaca Indonesia berhenti. Kata jebakan mendekati kasus itu, tetapi tidak sama.")
    L.append("5. **Konfigurasi model mengikuti .env.local** di server lokal saat uji, yang bisa berbeda dari produksi.")
    L.append("6. **Penilai berbeda kelonggaran.** Porsi nilai 'dekat' per batch berkisar 11% sampai 24%. Karena itu angka sebenarnya sebaiknya dibaca di antara metrik ketat dan metrik pembaca, bukan satu angka saja.")
    L.append("7. **Glos yang menyebut dua makna sekaligus** ('A atau B') setidaknya pada 5 kata dinilai benar atau dekat karena salah satunya cocok. Aturan tidak mengatur kasus ini secara eksplisit; pengaruhnya di bawah 1 poin persentase.")
    L.append("8. **80% jawaban datang dari model cadangan terkecil** (gemini-3.1-flash-lite), karena API gratis mengembalikan 429 untuk tiga model utama sejak permintaan ke-7. Hasil ini terutama menggambarkan model itu.")
    L.append("9. **Lema tidak pernah menandai ragu** (ambiguous) di 938 jawaban, jadi fitur dua makna tidak teruji di sini.")
    L.insert(2, "## Kesimpulan singkat\n")
    L.insert(3, (f"Dari 1.000 kata yang ditandai di 200 halaman fiksi berlabel manusia, Lema menemukan {len(detected)} kata dan memberi makna yang tepat "
                 f"untuk pembaca pada {100 * good / len(detected):.1f}% di antaranya ({100 * labels['benar'] / len(detected):.1f}% dengan penilaian paling ketat). "
                 "Pada kata jebakan, yang arti pertama kamusnya salah, Lema tetap tepat untuk pembaca pada sebagian besar kasus, sementara arti pertama kamus salah semua. "
                 "Pada kata umum, Lema sedikit di bawah kamus. Masalah terbesar yang ditemukan bukan akurasi, melainkan kuota API: tiga model utama menolak sejak "
                 "permintaan ke-7, sehingga hampir semua jawaban datang dari model cadangan terkecil.\n"))
    (HERE / "laporan.md").write_text("\n".join(L) + "\n", encoding="utf-8")

    # Sampel acak untuk dicek manusia
    rng = random.Random(20260914)
    sample = rng.sample(detected, min(50, len(detected)))
    S = ["# Cek manusia: 50 kata acak\n", "Isi kolom 'Setuju?' dengan ya / tidak. Tidak mengubah nilai penilai; dilaporkan terpisah.\n",
         "| # | Kalimat | Kata | Makna kunci (WordNet) | Jawaban Lema | Nilai penilai | Setuju? |", "|---|---|---|---|---|---|---|"]
    for n, it in enumerate(sample, 1):
        r = it["r"]
        ans = "; ".join(c.get("meaning_en", "") for c in r.get("candidates", []))
        S.append(f"| {n} | {it['t']['kalimat'][:160]} | {it['t']['kata']} | {it['t']['kunci']['definisi']} | {ans[:160]} | {it['nilai']} | |")
    (HERE / "cek_manusia.md").write_text("\n".join(S) + "\n", encoding="utf-8")
    print((HERE / "laporan.md").read_text(encoding="utf-8"))


if __name__ == "__main__":
    {"siapkan": siapkan, "rekap": rekap}[sys.argv[1]]()
