// tes/aturan/01-dasar.js — alat bantu tes, fungsi aplikasi yang dimuat, data contoh, penguji kecil.
// Dijalanin lewat tes/aturan.tes.js (semua bagian di folder ini digabung jadi satu skrip).
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const akar = path.join(__dirname, "..");
const baca = (f) => fs.readFileSync(path.join(akar, f), "utf8").replace(/\r\n/g, "\n");

// ambil satu fungsi dari file (alat.js butuh browser, jadi nggak bisa dimuat utuh)
function ambilFungsi(src, nama) {
  const awal = src.indexOf(`function ${nama}(`);
  if (awal < 0) throw new Error(`fungsi ${nama} nggak ketemu`);
  let i = src.indexOf("{", awal), tingkat = 0;
  for (; i < src.length; i++) {
    if (src[i] === "{") tingkat++;
    else if (src[i] === "}" && --tingkat === 0) break;
  }
  return src.slice(awal, i + 1);
}

// konstanta, misal "const jadiTeks = (x) => ...;" (boleh beberapa baris, sampai ";" di akhir baris)
const ambilKonstanta = (src, nama) => src.match(new RegExp(`^const ${nama} = [\\s\\S]*?;$`, "m"))[0];

// alat bantu umum (alat.js) + alat bantu bentuk data (datasoal.js)
const alat = baca("js/alat.js") + "\n" + baca("js/datasoal.js");
const soalJs = baca("js/soal.js");
const cadanganJs = baca("js/cadangan.js");
const ctx = { TextEncoder, console };
vm.createContext(ctx);
vm.runInContext([
  'const HURUF = ["A", "B", "C", "D", "E"];',
  ...["BATAS_SOAL", "BATAS_DOK", "tambahKeDaftar", "buangDariDaftar", "adalahObjek", "jadiTeks", "daftarObjek", "HURUF_ARAB"].map(n => ambilKonstanta(alat, n)),
  ...["salin", "samaIsi", "pasangDiJalur", "rapikanSoal", "galatPanjangSoal", "ukuranNilai", "ukuranDok",
      "amankanSoal", "amankanSalinan", "amankanDok", "aman", "arah", "potong"].map(n => ambilFungsi(alat, n)),
  ambilFungsi(soalJs, "kartuSoal"),
  ambilKonstanta(cadanganJs, "JENIS_PULIHKAN"), ambilFungsi(cadanganJs, "rencanaPulihkan"),
  ambilFungsi(baca("js/simpan.js"), "simpanNilaiSebagian"),
  baca("js/aturan.js"),
  "this.ekspor = { buatAturan, pasangDiJalur, rapikanSoal, galatPanjangSoal, salin, tambahKeDaftar, buangDariDaftar, samaIsi, ukuranDok, BATAS_DOK, amankanDok, kartuSoal, rencanaPulihkan, simpanNilaiSebagian };"
].join("\n"), ctx);
const { buatAturan, pasangDiJalur, rapikanSoal, galatPanjangSoal, salin, tambahKeDaftar, buangDariDaftar,
  ukuranDok, BATAS_DOK, amankanDok, kartuSoal, rencanaPulihkan, simpanNilaiSebagian } = ctx.ekspor;

// fungsi dari layar lain yang logikanya murni (global yang dibutuhin dipalsuin lewat ctx)
const aiJs = baca("js/ai.js"), nilaiJs = baca("js/nilai.js"), santriJs = baca("js/santri.js"), cetakJs = baca("js/cetak.js"), tokoJs = baca("js/toko.js"), simpanJs = baca("js/simpan.js");
vm.runInContext([
  "let hitungId = 0;", ambilFungsi(alat, "buatId"),
  ambilFungsi(aiJs, "bacaJawabanAI"),
  ...["KELOMPOK_NILAI", "BOBOT_BAWAAN"].map(n => ambilKonstanta(nilaiJs, n)),
  ...["jenisMapel", "bobotUntuk", "rataRata", "nilaiSah", "hitungNilai"].map(n => ambilFungsi(nilaiJs, n)),
  ...["angkaAcak", "kocok", "kelompokkan", "acakPilihanSoal", "acakItems", "siapkanLembar"].map(n => ambilFungsi(cetakJs, n)),
  ambilKonstanta(simpanJs, "sudahDiingatkanUkuran"), ...["tanpaId", "muatDiDok"].map(n => ambilFungsi(simpanJs, n)),
  "this.ekspor2 = { bacaJawabanAI, hitungNilai, nilaiSah, angkaAcak, kocok, siapkanLembar, muatDiDok };"
].join("\n"), ctx);
const { bacaJawabanAI, hitungNilai, nilaiSah, angkaAcak, kocok, siapkanLembar, muatDiDok } = ctx.ekspor2;

// ---------- data contoh ----------
const db = {
  "pengguna/tu":    { nama: "Admin TU", email: "tu@x", peran: "kurikulum" },
  "pengguna/hasan": { nama: "Ustadz Hasan", email: "hasan@x", peran: "ustadz", nip: "123" },
  "pengguna/aminah": { nama: "Ustadzah Aminah", email: "aminah@x", peran: "ustadz" },
  "pengguna/yusuf": { nama: "Ustadz Yusuf", email: "yusuf@x", peran: "ustadz" },
  "pengguna/baru":  { nama: "Akun Baru", email: "baru@x", peran: "menunggu" },
  // B. Indonesia 7A (hasan) & 7B (aminah) satu grup; Fikih (yusuf) grup lain
  "mapel/bi7a": { pengampu: ["hasan"], grup: "g-bi7" },
  "mapel/bi7b": { pengampu: ["aminah"], grup: "g-bi7" },
  "mapel/fik7": { pengampu: ["yusuf"], grup: "g-fik7" },
  "mapel/tupeng": { pengampu: ["hasan", "tu"], grup: "g-bi7" }, // admin kebetulan ikut di daftar pengampu
  "grup/g-bi7":  { pengampu: ["hasan", "aminah"], koordinator: "hasan" },
  "grup/g-fik7": { pengampu: ["yusuf"], koordinator: "yusuf" },
  "kelas/k7a": { pengampu: ["hasan"] }
};
const { bolehBaca, bolehTulis } = buatAturan(j => db[j], (email) => email === "tu@x");
const akun = {
  tu: { uid: "tu", email: "tu@x" }, hasan: { uid: "hasan", email: "hasan@x" },
  aminah: { uid: "aminah", email: "aminah@x" }, yusuf: { uid: "yusuf", email: "yusuf@x" },
  baru: { uid: "baru", email: "baru@x" }
};

const sem = { semester: "Ganjil", tahun: "2026/2027", dibuat: 1, diubah: 1 };
const soalPG = { id: "s1", jenis: "PG", teks: "Soal?", pilihan: ["a", "b", "", "", ""], kunci: 0, pertemuanId: null, bacaanId: null };
const modul = (o = {}) => ({ ...sem, judul: "Modul", pemilik: "hasan", namaPemilik: "Ustadz Hasan", dibagikan: true, pertemuan: [], bacaan: [], soal: [soalPG], ...o });
const sumatif = (o = {}) => ({ ...sem, nama: "PTS", pelaksanaan: "", pemilik: "hasan", namaPemilik: "Ustadz Hasan", dibagikan: false, butir: [], ...o });
const usulan = (o = {}) => ({ semester: sem.semester, tahun: sem.tahun, dibuat: 1, modulId: "m1", soalId: "s1", salinan: { soal: soalPG }, catatan: "", pemilik: "aminah", namaPemilik: "Ustadzah Aminah", ...o });
const lembar = (o = {}) => ({ semester: "Ganjil", tahun: "2026/2027", kolom: [{ id: "k1", kelompok: "uh", label: "UH 1" }], nilai: { s1: { k1: 80 } }, hadir: {}, ...o });
const banyak = (n, x) => Array.from({ length: n }, () => x);

// ---------- penguji kecil ----------
let lolos = 0, gagal = 0, bagian = "";
function grup(nama) { bagian = nama; console.log(`\n${nama}`); }
function harap(nama, hasil, seharusnya) {
  if (hasil === seharusnya) { lolos++; console.log(`  ok    ${nama}`); }
  else { gagal++; console.log(`  GAGAL ${nama} (dapat ${hasil}, harusnya ${seharusnya})`); }
}
const boleh = (nama, x) => harap(nama, x, true);
const tolak = (nama, x) => harap(nama, x, false);
const tunggu = [];   // tes async, ditunggu sebelum rekap (06-sinkron.js)

