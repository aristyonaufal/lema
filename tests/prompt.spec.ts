import { test, expect } from '@playwright/test';
import {
  MARKED_SYSTEM_PROMPT,
  SYSTEM_PROMPT,
  TEXT_SYSTEM_PROMPT,
  textUserPrompt,
} from '../lib/prompt';

// Prompt mode foto dipecah menjadi potongan bersama supaya mode teks bisa
// memakai aturan makna yang sama. Pemecahan itu tidak boleh menggeser satu
// karakter pun dari prompt yang sudah teruji lewat uji akurasi 11 September.
//
// Panjangnya dikunci di sini. Kalau isinya memang sengaja diubah, angkanya
// diperbarui bersama uji akurasi yang baru, bukan diperbarui diam diam.

test('prompt mode ketik tidak bergeser', () => {
  expect(SYSTEM_PROMPT).toHaveLength(2778);
  expect(SYSTEM_PROMPT).toContain('satu foto halaman buku');
  expect(SYSTEM_PROMPT).toContain('SELALU isi page_excerpt');
});

test('prompt mode tandai tidak bergeser', () => {
  expect(MARKED_SYSTEM_PROMPT).toHaveLength(4348);
  expect(MARKED_SYSTEM_PROMPT).toContain('oval mendatar bergaris MAGENTA');
});

test('ketiga mode memakai aturan bahasa dan aturan kejujuran yang sama', () => {
  const bahasa = 'Jangan pakai istilah linguistik seperti polisemi, homonim, atau nomina.';
  const jujur = 'Jangan pernah berpura pura yakin.';
  for (const prompt of [SYSTEM_PROMPT, MARKED_SYSTEM_PROMPT, TEXT_SYSTEM_PROMPT]) {
    expect(prompt).toContain(bahasa);
    expect(prompt).toContain(jujur);
  }
});

test('mode teks tidak membawa aturan yang cuma berlaku untuk foto', () => {
  // page_excerpt dipakai memeriksa apakah fotonya sampai dengan baik, dan
  // seluruh blok "kalau katanya tidak ada di halaman" tidak mungkin terjadi
  // ketika katanya diambil dari teks yang dikirim pembaca.
  expect(TEXT_SYSTEM_PROMPT).not.toContain('SELALU isi page_excerpt dengan 10 sampai 15 kata');
  expect(TEXT_SYSTEM_PROMPT).not.toContain('TIDAK ada di halaman itu');
  // Kata "foto" tetap muncul sekali, dan itu memang disengaja: modelnya
  // diberi tahu terang terangan bahwa kali ini tidak ada gambar sama sekali.
  expect(TEXT_SYSTEM_PROMPT).toContain('Tidak ada foto');

  expect(TEXT_SYSTEM_PROMPT).toContain('found SELALU true');
  expect(TEXT_SYSTEM_PROMPT).toContain('results berisi TEPAT SATU entri');
});

test('permintaan mode teks memuat kata dan paragrafnya', () => {
  const prompt = textUserPrompt('want', 'They suffered for want of bread that winter.');
  expect(prompt).toContain('want');
  expect(prompt).toContain('They suffered for want of bread that winter.');
  expect(prompt).toContain('Balas hanya JSON sesuai skema.');
});
