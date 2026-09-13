"""Menyusun kasus uji 1.000 kata Lema dari SemCor.

SemCor adalah bagian korpus Brown yang setiap kata isinya sudah diberi label
makna WordNet oleh anotator manusia. Yang dipakai hanya berkas fiksi (kategori
Brown K, L, M, N, P, R), supaya halamannya dekat dengan buku yang dibaca
pengguna Lema. Kunci jawaban (makna WordNet yang benar) diambil langsung dari
label manusia itu, tidak ditulis ulang dan tidak dibuat oleh model.

Berkas ini dan kasus.json yang dihasilkannya di-commit SEBELUM model
dijalankan. Stempel waktu git menjadi bukti bahwa kasus dan kunci tidak
disesuaikan setelah hasilnya terlihat.

Pemakaian:
    python scripts/uji-1000/susun_kasus.py
Butuh: pip install nltk, lalu nltk.download('semcor') dan nltk.download('wordnet').
"""
import json
import random
import re
from datetime import datetime, timezone
from pathlib import Path

from nltk.corpus import semcor
from nltk.corpus import wordnet as wn
from nltk.corpus.reader.wordnet import Lemma
from nltk.tree import Tree

SEED = 20260914
PAGES = 200
PER_PAGE = 5
FICTION = "klmnpr"                     # kategori Brown untuk fiksi
WORDS_MIN, WORDS_MAX = 120, 190        # panjang halaman, dalam kata
MIN_GAP = 6                            # jarak minimal antar kata sasaran, dalam token
SENSES_MIN, SENSES_MAX = 2, 30         # kata harus bermakna ganda, tapi tidak serba halus
# Kata kerja ringan: maknanya di WordNet sangat banyak dan halus, dan bukan kata
# yang biasanya membuat pembaca berhenti.
LIGHT = {"be", "have", "do", "say", "get", "go", "make", "take", "give", "come", "not"}
WNPOS = {"n": "n", "v": "v", "a": "a", "s": "a", "r": "r"}

rng = random.Random(SEED)
OUT = Path(__file__).with_name("kasus.json")


def leaves(chunk):
    return chunk.leaves() if isinstance(chunk, Tree) else [str(chunk)]


def detok(tokens):
    """Menyusun token menjadi teks cetak biasa, sambil mencatat letak tiap token."""
    text, spans = "", []
    open_quote = True
    for tok in tokens:
        t = tok
        if t in ("``", "''", '"'):
            t = "“" if (t == "``" or (t == '"' and open_quote)) else "”"
            if t == "“":
                open_quote = False
            else:
                open_quote = True
        attach_left = t in {".", ",", ";", ":", "?", "!", ")", "”", "'s", "n't", "'re", "'ll", "'ve", "'d", "'m", "%"} or t.startswith("'") and len(t) > 1
        if not text or attach_left or text.endswith("“") or text.endswith("("):
            start = len(text)
        else:
            text += " "
            start = len(text)
        text += t
        spans.append((start, len(text)))
    return text, spans


def sentences(fileid):
    """Kalimat sebagai daftar token, dengan info makna untuk token yang memenuhi syarat."""
    for sent in semcor.tagged_sents(fileids=fileid, tag="both"):
        tokens, info = [], []
        for chunk in sent:
            words = leaves(chunk)
            label = chunk.label() if isinstance(chunk, Tree) else None
            meta = None
            if isinstance(label, Lemma) and len(words) == 1:
                word = words[0]
                syn = label.synset()
                name = label.name()
                pos = WNPOS.get(syn.pos())
                if (pos and "_" not in name and name.lower() not in LIGHT and word.isalpha()
                        and len(word) >= 3 and word[0].islower()):
                    senses = wn.synsets(name, pos=pos)
                    if SENSES_MIN <= len(senses) <= SENSES_MAX and syn in senses:
                        meta = {"lemma": name, "pos": pos, "synset": syn, "senses": senses,
                                "rank": senses.index(syn) + 1}
            for w in words:
                tokens.append(w)
                info.append(meta if len(words) == 1 else None)
        yield tokens, info


def sense_entry(rank, syn):
    return {"no": rank, "synset": syn.name(), "definisi": syn.definition(),
            "contoh": (syn.examples() or [""])[0], "sinonim": [l.name().replace("_", " ") for l in syn.lemmas()[:4]]}


def passages(fileid):
    sents = list(sentences(fileid))
    i = 0
    while i < len(sents):
        toks, info, n = [], [], 0
        j = i
        while j < len(sents) and n < WORDS_MIN:
            toks += sents[j][0]
            info += sents[j][1]
            n += sum(1 for t in sents[j][0] if t[0].isalnum())
            j += 1
        if WORDS_MIN <= n <= WORDS_MAX:
            yield toks, info, (i, j)
        i = j


def choose_targets(toks, info, want_trap, want_common):
    text, spans = detok(toks)
    lower = text.lower()
    cands = []
    for k, meta in enumerate(info):
        if not meta:
            continue
        word = toks[k]
        # Hanya kata yang muncul sekali di halaman, supaya tidak ada keraguan
        # kemunculan mana yang ditandai.
        if len(re.findall(rf"\b{re.escape(word.lower())}\b", lower)) != 1:
            continue
        cands.append(k)
    rng.shuffle(cands)
    chosen, lemmas = [], set()
    need = {"jebakan": want_trap, "umum": want_common}
    for k in cands:
        meta = info[k]
        kind = "jebakan" if meta["rank"] >= 2 else "umum"
        if need[kind] == 0 or meta["lemma"] in lemmas:
            continue
        if any(abs(k - c) < MIN_GAP for c in chosen):
            continue
        chosen.append(k)
        lemmas.add(meta["lemma"])
        need[kind] -= 1
        if not any(need.values()):
            break
    if any(need.values()):
        return None
    targets = []
    for k in sorted(chosen):
        meta = info[k]
        start, end = spans[k]
        sent_start = max(text.rfind(". ", 0, start), text.rfind("? ", 0, start), text.rfind("! ", 0, start))
        sent_end = min([p for p in (text.find(". ", end), text.find("? ", end), text.find("! ", end)) if p >= 0] or [len(text)])
        targets.append({
            "kata": toks[k], "offset": start, "lemma": meta["lemma"], "pos": meta["pos"],
            "jenis": "jebakan" if meta["rank"] >= 2 else "umum",
            "kalimat": text[sent_start + 2 if sent_start >= 0 else 0: sent_end + 1].strip(),
            "kunci": sense_entry(meta["rank"], meta["synset"]),
            "makna_lain": [sense_entry(r + 1, s) for r, s in enumerate(meta["senses"]) if s != meta["synset"]],
        })
    return text, targets


files = [f for f in semcor.fileids() if f.split("br-")[1][0] in FICTION]
rng.shuffle(files)
pages, per_file = [], {}
plan = [(3, 2) if i % 2 == 0 else (2, 3) for i in range(PAGES)]   # 500 jebakan + 500 umum
for rnd in range(6):                  # beberapa putaran supaya halaman tersebar ke banyak berkas
    for f in files:
        if len(pages) >= PAGES:
            break
        if per_file.get(f, 0) > rnd:
            continue
        options = list(passages(f))
        rng.shuffle(options)
        for toks, info, (s0, s1) in options:
            if any(p["sumber"]["berkas"] == f and p["sumber"]["kalimat"][0] < s1 and s0 < p["sumber"]["kalimat"][1] for p in pages):
                continue
            want_trap, want_common = plan[len(pages)]
            picked = choose_targets(toks, info, want_trap, want_common)
            if picked:
                text, targets = picked
                pages.append({
                    "id": f"S{len(pages) + 1:03d}",
                    "sumber": {"korpus": "SemCor 3.0 (NLTK), fiksi Brown", "berkas": f,
                               "kategori": f.split("br-")[1][0].upper(), "kalimat": [s0, s1]},
                    "teks": text, "sasaran": targets,
                })
                per_file[f] = per_file.get(f, 0) + 1
                break
    if len(pages) >= PAGES:
        break

if len(pages) < PAGES:
    raise SystemExit(f"Hanya {len(pages)} halaman yang memenuhi syarat.")

# Penugasan kondisi, juga dengan seed yang sama: 100 oval, 100 pensil; separuh
# dari masing masing dibuat seperti foto HP.
order = list(range(PAGES))
rng.shuffle(order)
for n, idx in enumerate(order):
    page = pages[idx]
    page["tanda"] = "oval" if n < PAGES // 2 else "pensil"
    page["kondisi"] = "foto" if n % 2 else "bersih"
    if page["kondisi"] == "foto":
        page["foto"] = {"rotasi": round(rng.choice([-1, 1]) * rng.uniform(1.5, 3.5), 2),
                        "miring_x": round(rng.uniform(2, 5), 2), "buram": round(rng.uniform(0.5, 0.9), 2),
                        "bayangan": rng.choice(["kiri", "kanan"]), "noise": round(rng.uniform(0.06, 0.1), 3),
                        "jpeg": 62}

for page in pages:
    for t in page["sasaran"]:
        assert page["teks"][t["offset"]: t["offset"] + len(t["kata"])] == t["kata"], (page["id"], t["kata"])

counts = {k: sum(t["jenis"] == k for p in pages for t in p["sasaran"]) for k in ("jebakan", "umum")}
out = {
    "dibuat": datetime.now(timezone.utc).isoformat(),
    "seed": SEED,
    "catatan": ("Kunci jawaban adalah label makna WordNet dari anotator manusia di SemCor, ditetapkan dan di-commit "
                "sebelum model dijalankan. 'jebakan' berarti makna yang benar bukan makna pertama WordNet untuk kata itu, "
                "jadi arti pertama di kamus akan salah."),
    "ringkasan": {"halaman": len(pages), "kata": sum(len(p["sasaran"]) for p in pages), **counts,
                  "oval": sum(p["tanda"] == "oval" for p in pages), "pensil": sum(p["tanda"] == "pensil" for p in pages),
                  "foto": sum(p["kondisi"] == "foto" for p in pages), "berkas": len(per_file)},
    "halaman": pages,
}
OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
print(json.dumps(out["ringkasan"], ensure_ascii=False))
for p in pages[:3]:
    print(p["id"], p["tanda"], p["kondisi"], "|", ", ".join(f"{t['kata']}({t['jenis'][0]}{t['kunci']['no']})" for t in p["sasaran"]))
    print("   ", p["teks"][:160], "…")
