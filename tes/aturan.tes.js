// =====================================================
//  tes/aturan.tes.js — ngetes aturan akses (js/aturan.js) & alat bantu data
//
//  Jalanin:  node tes/aturan.tes.js
//
//  File ini NGGAK dimuat aplikasi (nggak perlu didaftarin di index.html / sw.js).
//  js/aturan.js itu salinan firestore.rules, jadi yang dites di sini logikanya.
//  firestore.rules-nya sendiri tetap harus di-Publish manual di Firebase Console.
// =====================================================
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

const alat = baca("js/alat.js");
const ctx = {};
vm.createContext(ctx);
vm.runInContext([
  'const HURUF = ["A", "B", "C", "D", "E"];',
  alat.match(/const BATAS_SOAL = .*;/)[0],
  ambilFungsi(alat, "salin"), ambilFungsi(alat, "pasangDiJalur"),
  ambilFungsi(alat, "rapikanSoal"), ambilFungsi(alat, "galatPanjangSoal"),
  baca("js/aturan.js"),
  "this.ekspor = { buatAturan, pasangDiJalur, rapikanSoal, galatPanjangSoal, salin };"
].join("\n"), ctx);
const { buatAturan, pasangDiJalur, rapikanSoal, galatPanjangSoal, salin } = ctx.ekspor;

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
  "grup/g-bi7":  { pengampu: ["hasan", "aminah"], koordinator: "hasan" },
  "grup/g-fik7": { pengampu: ["yusuf"], koordinator: "yusuf" },
  "kelas/k7a": { pengampu: ["hasan"] }
};
const { bolehBaca, bolehTulis } = buatAturan(j => db[j], ["tu@x"]);
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

// =====================================================
grup("Akses anonim (belum login)");
for (const j of ["pengguna/hasan", "pengaturan/lembaga", "mapel/bi7a", "mapel/bi7a/modul/m1", "mapel/bi7a/nilai/l1", "santri/x", "kelas/k7a", "grup/g-bi7", "grup/g-bi7/uas/u1"]) {
  tolak(`baca ${j}`, bolehBaca(j, modul(), null));
}
tolak("tulis modul", bolehTulis("mapel/bi7a/modul/m1", null, modul(), null));
tolak("tulis nilai", bolehTulis("mapel/bi7a/nilai/l1", null, lembar(), null));
tolak("bikin profil", bolehTulis("pengguna/x", null, { nama: "X", email: "x@x", peran: "menunggu" }, null));
tolak("hapus modul", bolehTulis("mapel/bi7a/modul/m1", modul(), null, null));

grup("Akun menunggu persetujuan");
tolak("baca mapel", bolehBaca("mapel/bi7a", {}, akun.baru));
tolak("baca modul dibagikan", bolehBaca("mapel/bi7a/modul/m1", modul(), akun.baru));

// =====================================================
grup("Guru di luar grup (Yusuf, Fikih)");
tolak("baca modul B. Indonesia yang dibagikan", bolehBaca("mapel/bi7a/modul/m1", modul(), akun.yusuf));
tolak("baca sumatif B. Indonesia yang dibagikan", bolehBaca("mapel/bi7a/sumatif/s1", sumatif({ dibagikan: true }), akun.yusuf));
tolak("bikin modul di mapel yang nggak diampu", bolehTulis("mapel/bi7a/modul/m2", null, modul({ pemilik: "yusuf" }), akun.yusuf));
tolak("ubah modul milik Hasan", bolehTulis("mapel/bi7a/modul/m1", modul(), modul({ judul: "x" }), akun.yusuf));
tolak("ubah modul Hasan sambil ngaku pemilik", bolehTulis("mapel/bi7a/modul/m1", modul(), modul({ pemilik: "yusuf" }), akun.yusuf));
tolak("hapus modul milik Hasan", bolehTulis("mapel/bi7a/modul/m1", modul(), null, akun.yusuf));
tolak("baca nilai B. Indonesia", bolehBaca("mapel/bi7a/nilai/l1", lembar(), akun.yusuf));
tolak("isi nilai B. Indonesia", bolehTulis("mapel/bi7a/nilai/l1", lembar(), lembar({ nilai: { s1: { k1: 10 } } }), akun.yusuf));
tolak("baca UAS grup B. Indonesia", bolehBaca("grup/g-bi7/uas/u1", { status: "draf" }, akun.yusuf));
tolak("kirim usulan ke grup B. Indonesia", bolehTulis("grup/g-bi7/usulan/x", null, usulan({ pemilik: "yusuf" }), akun.yusuf));
tolak("bikin UAS grup B. Indonesia", bolehTulis("grup/g-bi7/uas/u1", null, { ...sem, status: "draf", butir: [], diubahOleh: "yusuf" }, akun.yusuf));
tolak("baca santri kelas lain", bolehBaca("santri/x", { kelasId: "k7a" }, akun.yusuf));

grup("Guru satu grup (Aminah, B. Indonesia 7B)");
boleh("baca modul 7A yang dibagikan", bolehBaca("mapel/bi7a/modul/m1", modul(), akun.aminah));
tolak("baca modul 7A yang nggak dibagikan", bolehBaca("mapel/bi7a/modul/m1", modul({ dibagikan: false }), akun.aminah));
tolak("ubah modul 7A milik Hasan", bolehTulis("mapel/bi7a/modul/m1", modul(), modul({ judul: "x" }), akun.aminah));
tolak("baca nilai 7A", bolehBaca("mapel/bi7a/nilai/l1", lembar(), akun.aminah));
boleh("kirim usulan ke grupnya", bolehTulis("grup/g-bi7/usulan/x", null, usulan(), akun.aminah));

// =====================================================
grup("Pemilik soal (Hasan)");
boleh("bikin modul", bolehTulis("mapel/bi7a/modul/m1", null, modul(), akun.hasan));
boleh("ubah soal di modulnya", bolehTulis("mapel/bi7a/modul/m1", modul(), modul({ soal: [{ ...soalPG, teks: "Baru?" }] }), akun.hasan));
boleh("baca modul sendiri yang nggak dibagikan", bolehBaca("mapel/bi7a/modul/m1", modul({ dibagikan: false }), akun.hasan));
boleh("hapus modul sendiri", bolehTulis("mapel/bi7a/modul/m1", modul(), null, akun.hasan));
tolak("serahin modul ke orang lain", bolehTulis("mapel/bi7a/modul/m1", modul(), modul({ pemilik: "aminah" }), akun.hasan));
tolak("bikin modul atas nama orang lain", bolehTulis("mapel/bi7a/modul/m1", null, modul({ pemilik: "aminah" }), akun.hasan));
boleh("TU hapus modul Hasan", bolehTulis("mapel/bi7a/modul/m1", modul(), null, akun.tu));
tolak("TU ubah isi modul Hasan", bolehTulis("mapel/bi7a/modul/m1", modul(), modul({ judul: "x" }), akun.tu));
boleh("modul lama dengan kolom versi dulu tetap bisa diedit", bolehTulis("mapel/bi7a/modul/m1", modul({ kolomLama: 1 }), modul({ kolomLama: 1, judul: "Baru" }), akun.hasan));

// =====================================================
grup("Data yang melanggar batas");
tolak("modul: kolom asing", bolehTulis("mapel/bi7a/modul/m1", null, modul({ admin: true }), akun.hasan));
tolak("modul: judul 201 huruf", bolehTulis("mapel/bi7a/modul/m1", null, modul({ judul: "x".repeat(201) }), akun.hasan));
tolak("modul: catatan 5001 huruf", bolehTulis("mapel/bi7a/modul/m1", null, modul({ catatan: "x".repeat(5001) }), akun.hasan));
tolak("modul: 501 soal", bolehTulis("mapel/bi7a/modul/m1", null, modul({ soal: banyak(501, soalPG) }), akun.hasan));
boleh("modul: 500 soal", bolehTulis("mapel/bi7a/modul/m1", null, modul({ soal: banyak(500, soalPG) }), akun.hasan));
tolak("modul: soal bukan daftar", bolehTulis("mapel/bi7a/modul/m1", null, modul({ soal: "x" }), akun.hasan));
tolak("modul: ganti semester", bolehTulis("mapel/bi7a/modul/m1", modul(), modul({ semester: "Genap" }), akun.hasan));
tolak("modul: dibagikan bukan ya/tidak", bolehTulis("mapel/bi7a/modul/m1", null, modul({ dibagikan: "ya" }), akun.hasan));
tolak("sumatif: 201 butir", bolehTulis("mapel/bi7a/sumatif/s1", null, sumatif({ butir: banyak(201, {}) }), akun.hasan));
tolak("sumatif: kolom asing", bolehTulis("mapel/bi7a/sumatif/s1", null, sumatif({ x: 1 }), akun.hasan));
tolak("usulan: catatan 2001 huruf", bolehTulis("grup/g-bi7/usulan/x", null, usulan({ catatan: "x".repeat(2001) }), akun.aminah));
tolak("nilai: 61 kolom", bolehTulis("mapel/bi7a/nilai/l1", null, lembar({ kolom: banyak(61, {}) }), akun.hasan));
tolak("profil: nama 101 huruf", bolehTulis("pengguna/hasan", db["pengguna/hasan"], { ...db["pengguna/hasan"], nama: "x".repeat(101) }, akun.hasan));
tolak("profil: ubah NIP sendiri", bolehTulis("pengguna/hasan", db["pengguna/hasan"], { ...db["pengguna/hasan"], nip: "999" }, akun.hasan));

// =====================================================
grup("Nilai disimpan sebagian (cuma sel yang berubah)");
{
  const lama = lembar({ nilai: { s1: { k1: 80 }, s2: { k1: 70 } } });
  const sebagian = (perubahan) => { const b = salin(lama); for (const [j, v] of perubahan) pasangDiJalur(b, j, v); return b; };
  const b1 = sebagian([[["nilai", "s2", "k1"], 95], [["diubah"], 2]]);
  harap("sel lain nggak ikut berubah", JSON.stringify(b1.nilai), JSON.stringify({ s1: { k1: 80 }, s2: { k1: 95 } }));
  boleh("pengampu boleh simpan sebagian", bolehTulis("mapel/bi7a/nilai/l1", lama, b1, akun.hasan));
  const b2 = sebagian([[["nilai", "s1", "k1"], undefined]]);
  harap("sel dikosongkan = dihapus", JSON.stringify(b2.nilai.s1), "{}");
  const b3 = sebagian([[["hadir", "s9", "sakit"], 2]]);
  harap("santri baru dibuatkan tempat", JSON.stringify(b3.hadir), JSON.stringify({ s9: { sakit: 2 } }));
  tolak("bukan pengampu nggak boleh", bolehTulis("mapel/bi7a/nilai/l1", lama, b1, akun.aminah));
  tolak("TU nggak ngisi nilai", bolehTulis("mapel/bi7a/nilai/l1", lama, b1, akun.tu));
  tolak("ustadz nggak boleh hapus lembar", bolehTulis("mapel/bi7a/nilai/l1", lama, null, akun.hasan));
  boleh("TU boleh hapus lembar", bolehTulis("mapel/bi7a/nilai/l1", lama, null, akun.tu));
}

// =====================================================
grup("Bentuk soal (rapikanSoal)");
harap("PG: kolom asing dibuang, pilihan jadi 5, kunci ngaco jadi 0",
  JSON.stringify(rapikanSoal({ id: "a", jenis: "PG", teks: "t", pilihan: ["x", "y"], kunci: 9, pakai: true, ragu: true })),
  JSON.stringify({ id: "a", jenis: "PG", teks: "t", pilihan: ["x", "y", "", "", ""], kunci: 0, pertemuanId: null, bacaanId: null }));
harap("Esai: pilihan & kunci dibuang, dibuat dipertahankan",
  JSON.stringify(rapikanSoal({ id: "b", jenis: "Esai", teks: "t", pedoman: "p", pilihan: ["x"], kunci: 1, dibuat: 5 })),
  JSON.stringify({ id: "b", jenis: "Esai", teks: "t", pedoman: "p", pertemuanId: null, bacaanId: null, dibuat: 5 }));
harap("jenis kosong dianggap esai (sama kayak tampilan)", rapikanSoal({ id: "c", teks: "t" }).jenis, "Esai");
harap("soal yang udah rapi nggak berubah", JSON.stringify(rapikanSoal(soalPG)), JSON.stringify(soalPG));
harap("teks 5000 huruf masih boleh", galatPanjangSoal({ teks: "x".repeat(5000) }), "");
harap("teks 5001 huruf ditolak", !!galatPanjangSoal({ teks: "x".repeat(5001) }), true);
harap("pilihan 1001 huruf ditolak", !!galatPanjangSoal({ teks: "t", pilihan: ["x".repeat(1001)] }), true);

console.log(`\n${lolos} lolos, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
