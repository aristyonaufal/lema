// Pembaca ZIP secukupnya, untuk membuka berkas EPUB.
//
// EPUB adalah arsip ZIP biasa. Node belum punya pembaca ZIP bawaan, tetapi sejak
// lama sudah punya DecompressionStream, dan 'deflate-raw' persis yang dipakai
// ZIP di dalamnya. Jadi tidak perlu menambah dependensi ke proyek hanya untuk
// skrip yang dijalankan sekali saat menyiapkan buku.
//
// Yang dibaca cuma yang dibutuhkan: direktori pusat untuk daftar isi, lalu satu
// entri saat diminta. Zip64, enkripsi, dan arsip terpecah tidak didukung, dan
// tidak perlu didukung, karena EPUB dari Standard Ebooks tidak memakainya.

const EOCD = 0x06054b50;   // akhir direktori pusat
const CENTRAL = 0x02014b50; // satu entri di direktori pusat
const LOCAL = 0x04034b50;   // kepala lokal, tepat sebelum datanya

async function inflateRaw(data) {
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return Buffer.from(await new Response(stream).arrayBuffer());
}

// Direktori pusat ada di ekor berkas, dan panjangnya tidak diketahui sebelum
// tandanya ditemukan, jadi dicari dari belakang. Komentar arsip paling panjang
// 65.535 byte, jadi sejauh itu saja yang perlu ditengok.
function findEocd(buf) {
  const start = Math.max(0, buf.length - 65_557);
  for (let i = buf.length - 22; i >= start; i -= 1) {
    if (buf.readUInt32LE(i) === EOCD) return i;
  }
  throw new Error('Bukan berkas ZIP: tanda akhir direktori tidak ditemukan.');
}

/**
 * Membuka arsip dan mengembalikan daftar isinya beserta pembaca per entri.
 * @param {Buffer} buf isi berkas EPUB
 */
export function openZip(buf) {
  const eocd = findEocd(buf);
  const count = buf.readUInt16LE(eocd + 10);
  let at = buf.readUInt32LE(eocd + 16);

  /** @type {Map<string, { method: number; packed: number; size: number; offset: number }>} */
  const entries = new Map();

  for (let i = 0; i < count; i += 1) {
    if (buf.readUInt32LE(at) !== CENTRAL) {
      throw new Error(`Direktori pusat rusak pada entri ${i}.`);
    }
    const method = buf.readUInt16LE(at + 10);
    // Dua ukuran, dan keduanya mudah tertukar: yang di +20 ukuran setelah
    // dipadatkan, yang di +24 ukuran aslinya.
    const packed = buf.readUInt32LE(at + 20);
    const size = buf.readUInt32LE(at + 24);
    const nameLen = buf.readUInt16LE(at + 28);
    const extraLen = buf.readUInt16LE(at + 30);
    const commentLen = buf.readUInt16LE(at + 32);
    const offset = buf.readUInt32LE(at + 42);
    const name = buf.subarray(at + 46, at + 46 + nameLen).toString('utf8');
    entries.set(name, { method, packed, size, offset });
    at += 46 + nameLen + extraLen + commentLen;
  }

  async function read(name) {
    const entry = entries.get(name);
    if (!entry) throw new Error(`Entri tidak ada di dalam EPUB: ${name}`);
    const head = entry.offset;
    if (buf.readUInt32LE(head) !== LOCAL) {
      throw new Error(`Kepala lokal rusak untuk ${name}.`);
    }
    // Panjang nama dan extra dibaca dari kepala lokal, bukan dari direktori
    // pusat. Keduanya boleh berbeda, dan memakai angka yang salah menggeser
    // awal data beberapa byte tanpa galat yang jelas.
    const nameLen = buf.readUInt16LE(head + 26);
    const extraLen = buf.readUInt16LE(head + 28);
    const start = head + 30 + nameLen + extraLen;

    if (entry.method === 0) return buf.subarray(start, start + entry.size);
    if (entry.method === 8) {
      // Dipotong tepat sepanjang data yang dipadatkan. DecompressionStream di
      // Node melempar ERR_TRAILING_JUNK_AFTER_STREAM_END kalau diberi satu byte
      // saja melebihi akhir aliran, jadi sisa berkas tidak boleh ikut terkirim.
      const out = await inflateRaw(buf.subarray(start, start + entry.packed));
      if (out.length !== entry.size) {
        throw new Error(`Ukuran ${name} setelah dibuka ${out.length}, seharusnya ${entry.size}.`);
      }
      return out;
    }
    throw new Error(`Cara pemadatan ${entry.method} tidak didukung (${name}).`);
  }

  return { names: [...entries.keys()], has: (name) => entries.has(name), read };
}
