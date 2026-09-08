import { test, expect } from '@playwright/test';
import { consume, refund, dailyLimit, sharedCounterConfigured } from '../lib/rate-limit';

// Pengujian ini berjalan di sisi Node, tanpa browser dan tanpa memanggil model.
// Tanpa UPSTASH_REDIS_REST_URL, pembatas jatuh ke hitungan per proses, dan itu
// yang diuji di sini. Setiap kasus memakai alamat berbeda supaya tidak saling
// mempengaruhi lewat penghitung yang sama.

test.beforeEach(() => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
});

test('batas harian terbaca dari env dan punya nilai bawaan yang masuk akal', () => {
  delete process.env.DAILY_LOOKUP_LIMIT;
  expect(dailyLimit()).toBe(60);

  process.env.DAILY_LOOKUP_LIMIT = '25';
  expect(dailyLimit()).toBe(25);

  // Nilai tidak masuk akal tidak boleh mematikan batas.
  process.env.DAILY_LOOKUP_LIMIT = 'nol';
  expect(dailyLimit()).toBe(60);
  process.env.DAILY_LOOKUP_LIMIT = '-5';
  expect(dailyLimit()).toBe(60);
});

test('yang dihitung adalah jumlah kata, bukan jumlah permintaan', async () => {
  process.env.DAILY_LOOKUP_LIMIT = '10';

  // Dua permintaan berisi lima kata sudah menghabiskan batas sepuluh kata.
  // Pada versi lama yang menghitung permintaan, ini baru terpakai dua dari sepuluh.
  expect(await consume('uji-kata-1', 5)).toMatchObject({ allowed: true, used: 5, limit: 10 });
  expect(await consume('uji-kata-1', 5)).toMatchObject({ allowed: true, used: 10 });

  const ditolak = await consume('uji-kata-1', 1);
  expect(ditolak.allowed).toBe(false);
  expect(ditolak.used).toBe(11);
  expect(ditolak.reason).toContain('10 kata per hari');
});

test('alamat berbeda punya jatah sendiri sendiri', async () => {
  process.env.DAILY_LOOKUP_LIMIT = '5';
  expect(await consume('uji-pisah-a', 5)).toMatchObject({ allowed: true });
  expect(await consume('uji-pisah-a', 1)).toMatchObject({ allowed: false });
  expect(await consume('uji-pisah-b', 5)).toMatchObject({ allowed: true, used: 5 });
});

test('kegagalan total mengembalikan jatah, jadi pengguna tidak dihukum', async () => {
  process.env.DAILY_LOOKUP_LIMIT = '10';
  await consume('uji-refund', 4);
  await refund('uji-refund', 4);
  expect(await consume('uji-refund', 10)).toMatchObject({ allowed: true, used: 10 });
});

test('pengembalian tidak pernah membuat pemakaian jadi minus', async () => {
  process.env.DAILY_LOOKUP_LIMIT = '10';
  await consume('uji-minus', 2);
  await refund('uji-minus', 50);
  expect(await consume('uji-minus', 1)).toMatchObject({ used: 1 });
});

test('penghitung bersama dianggap belum dikonfigurasi tanpa dua variabel env', () => {
  expect(sharedCounterConfigured()).toBe(false);
  process.env.UPSTASH_REDIS_REST_URL = 'https://contoh.upstash.io';
  expect(sharedCounterConfigured()).toBe(false);
  process.env.UPSTASH_REDIS_REST_TOKEN = 'token-contoh';
  expect(sharedCounterConfigured()).toBe(true);
});
