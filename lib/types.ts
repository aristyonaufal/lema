// Kontrak data Lema. Lihat PRD bagian 9.

export type Candidate = {
  meaning_id: string;   // makna dalam Bahasa Indonesia
  meaning_en: string;   // makna dalam Bahasa Inggris
  confidence: number;   // 0 sampai 1
  trigger: string;      // potongan teks di halaman yang menentukan makna ini
  why_id: string;       // satu kalimat alasan, Bahasa Indonesia
};

export type OtherSense = {
  meaning_id: string;
  meaning_en: string;
};

export type LookupResult = {
  word: string;
  lemma: string;
  is_phrase: boolean;
  found: boolean;          // apakah katanya benar benar ada di halaman
  page_excerpt: string;    // 10 sampai 15 kata pertama yang terbaca dari halaman
  sentence: string;        // kalimat asal dari halaman
  ambiguous: boolean;      // true kalau dua makna sama masuk akalnya
  candidates: Candidate[]; // 1 entri kalau jelas, 2 entri kalau ambigu
  other_senses: OtherSense[];
  caution_id: string;      // peringatan makna lain, "" kalau tidak ada
  new_sentence: string;    // kalimat baru untuk review, topik berbeda
};

export type LookupResponse =
  | { ok: true; results: LookupResult[]; ms: number }
  | { ok: false; error: string };
