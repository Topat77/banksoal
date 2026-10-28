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

// konstanta, misal "const jadiTeks = (x) => ...;" (boleh beberapa baris, sampai ";" di akhir baris)
const ambilKonstanta = (src, nama) => src.match(new RegExp(`^const ${nama} = [\\s\\S]*?;$`, "m"))[0];

const alat = baca("js/alat.js");
const modulJs = baca("js/modul.js");
const cadanganJs = baca("js/cadangan.js");
const ctx = { TextEncoder, console };
vm.createContext(ctx);
vm.runInContext([
  'const HURUF = ["A", "B", "C", "D", "E"];',
  ...["BATAS_SOAL", "BATAS_DOK", "tambahKeDaftar", "buangDariDaftar", "adalahObjek", "jadiTeks", "daftarObjek", "HURUF_ARAB"].map(n => ambilKonstanta(alat, n)),
  ...["salin", "samaIsi", "pasangDiJalur", "rapikanSoal", "galatPanjangSoal", "ukuranNilai", "ukuranDok",
      "amankanSoal", "amankanSalinan", "amankanDok", "aman", "arah", "potong"].map(n => ambilFungsi(alat, n)),
  ambilFungsi(modulJs, "kartuSoal"),
  ambilKonstanta(cadanganJs, "JENIS_PULIHKAN"), ambilFungsi(cadanganJs, "rencanaPulihkan"),
  baca("js/aturan.js"),
  "this.ekspor = { buatAturan, pasangDiJalur, rapikanSoal, galatPanjangSoal, salin, tambahKeDaftar, buangDariDaftar, samaIsi, ukuranDok, BATAS_DOK, amankanDok, kartuSoal, rencanaPulihkan };"
].join("\n"), ctx);
const { buatAturan, pasangDiJalur, rapikanSoal, galatPanjangSoal, salin, tambahKeDaftar, buangDariDaftar,
  ukuranDok, BATAS_DOK, amankanDok, kartuSoal, rencanaPulihkan } = ctx.ekspor;

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

// =====================================================
grup("Admin awal wajib email terverifikasi (sama kayak firestore.rules)");
{
  const profilAdmin = { nama: "Admin", email: "tu@x", foto: "", peran: "kurikulum", dibuat: 1, terakhirMasuk: 1 };
  boleh("daftar biasa tanpa sapaan & NIP", bolehTulis("pengguna/x", null, { ...profilAdmin, email: "x@x", peran: "menunggu" }, { uid: "x", email: "x@x" }));
  tolak("daftar dengan sapaan ditolak", bolehTulis("pengguna/x", null, { ...profilAdmin, email: "x@x", peran: "menunggu", sapaan: "ustadz" }, { uid: "x", email: "x@x" }));
  tolak("daftar dengan NIP ditolak", bolehTulis("pengguna/x", null, { ...profilAdmin, email: "x@x", peran: "menunggu", nip: "123" }, { uid: "x", email: "x@x" }));
  boleh("email terverifikasi → jadi admin", bolehTulis("pengguna/tu2", null, profilAdmin, { uid: "tu2", email: "tu@x", emailTerverifikasi: true }));
  tolak("email belum terverifikasi → ditolak", bolehTulis("pengguna/tu2", null, profilAdmin, { uid: "tu2", email: "tu@x", emailTerverifikasi: false }));
  tolak("email lain nggak bisa jadi admin", bolehTulis("pengguna/x", null, { ...profilAdmin, email: "x@x" }, { uid: "x", email: "x@x", emailTerverifikasi: true }));
}

// =====================================================
grup("Pulihkan cadangan: TU cuma boleh BIKIN, nggak boleh ngubah");
boleh("TU bikin modul atas nama Hasan", bolehTulis("mapel/bi7a/modul/m9", null, modul(), akun.tu));
tolak("TU ubah modul Hasan yang udah ada", bolehTulis("mapel/bi7a/modul/m9", modul(), modul({ judul: "x" }), akun.tu));
tolak("TU bikin modul yang ngelanggar batas", bolehTulis("mapel/bi7a/modul/m9", null, modul({ soal: banyak(501, soalPG) }), akun.tu));
boleh("TU bikin sumatif atas nama Hasan", bolehTulis("mapel/bi7a/sumatif/s9", null, sumatif(), akun.tu));
boleh("TU bikin lembar nilai yang hilang", bolehTulis("mapel/bi7a/nilai/l9", null, lembar(), akun.tu));
tolak("TU ngubah lembar nilai", bolehTulis("mapel/bi7a/nilai/l9", lembar(), lembar({ nilai: { s1: { k1: 1 } } }), akun.tu));
boleh("TU bikin usulan atas nama Aminah", bolehTulis("grup/g-bi7/usulan/u9", null, usulan(), akun.tu));
tolak("guru tetap nggak bisa bikin modul atas nama orang lain", bolehTulis("mapel/bi7a/modul/m9", null, modul({ pemilik: "aminah" }), akun.aminah));
tolak("guru luar grup tetap nggak bisa bikin usulan", bolehTulis("grup/g-bi7/usulan/u9", null, usulan({ pemilik: "yusuf" }), akun.yusuf));

grup("Pulihkan cadangan: yang dipulihkan cuma yang hilang");
{
  const tokoTes = {
    lembaga: { nama: "PKBM" }, bobot: {},
    santri: [{ id: "sa1" }], mapel: [{ id: "bi7a" }], grup: [{ id: "g-bi7" }],
    isi: { bi7a: { modulSemua: [{ id: "m1" }], sumatif: [], nilai: [{ id: "l1" }] } },
    uas: { "g-bi7": [{ id: "uas1" }] }, usulan: { "g-bi7": [] }
  };
  Object.assign(ctx, {
    toko: tokoTes, tanpaId: ({ id, ...x }) => x,
    modulMapel: (id) => tokoTes.isi[id].modulSemua, sumatifMapel: (id) => tokoTes.isi[id].sumatif
  });
  const r = rencanaPulihkan({
    versiCadangan: 3, lembaga: { nama: "lama" }, bobot: { umum: {} },
    santri: [{ id: "sa1", nama: "Ada" }, { id: "sa2", nama: "Hilang" }, { id: "../pengguna/x", nama: "Jahil" }, null],
    mapel: [
      { id: "bi7a", nama: "BI", modul: [{ id: "m1" }, { id: "m2", judul: "Hilang" }], sumatif: [{ id: "s1" }], nilai: [{ id: "l1" }] },
      { id: "fik7", nama: "Fikih", modul: [{ id: "f1" }], sumatif: [], nilai: [{ id: "l1" }] }
    ],
    grup: [{ id: "g-bi7", uas: [{ id: "uas1" }, { id: "uas2" }], usulan: [{ id: "us1" }] }]
  });
  const jalur = (k) => r[k].map(x => x[0]).join(",");
  harap("lembaga masih ada → nggak dipulihkan, bobot kosong → dipulihkan", jalur("pengaturan"), "pengaturan/bobot");
  harap("siswa: cuma yang hilang, id aneh / item rusak dibuang", jalur("santri"), "santri/sa2");
  harap("mapel yang hilang ikut balik (tanpa daftar modul di dalamnya)", JSON.stringify(r.mapel), JSON.stringify([["mapel/fik7", { nama: "Fikih" }]]));
  harap("modul: yang hilang aja", jalur("modul"), "mapel/bi7a/modul/m2,mapel/fik7/modul/f1");
  harap("sumatif hilang", jalur("sumatif"), "mapel/bi7a/sumatif/s1");
  harap("nilai: yang hilang aja (punya mapel yang hilang ikut)", jalur("nilai"), "mapel/fik7/nilai/l1");
  harap("UAS & usulan: yang hilang aja", jalur("uas") + "|" + jalur("usulan"), "grup/g-bi7/uas/uas2|grup/g-bi7/usulan/us1");
  harap("id nggak ikut ditulis ke isi dokumen", "id" in r.modul[0][1], false);
}

// =====================================================
grup("Data rusak dari database nggak bikin layar error");
{
  const rusak = modul({ soal: [null, "teks", 5, [1], { id: "s1", jenis: "PG", teks: 12, pilihan: null }, { id: 7, teks: null, pedoman: { x: 1 } }],
    bacaan: [null, { id: "b1", judul: 5 }], pertemuan: ["x", { id: "p1", target: null }], judul: null, terkait: [1, "m2"] });
  let galat = null;
  try { rusak.soal.forEach((s, i) => kartuSoal(s, { nomor: i + 1, mode: "lihat" })); } catch (e) { galat = e; }
  harap("tanpa diamankan, soal null bikin kartuSoal error", galat !== null, true);
  const d = amankanDok(rusak);
  harap("item soal yang bukan objek dibuang", d.soal.length, 2);
  let html = "";
  galat = null;
  try { d.soal.forEach((s, i) => { html += kartuSoal(s, { nomor: i + 1, mode: "modul" }); }); } catch (e) { galat = e; }
  harap("setelah diamankan, semua soal bisa dirender", galat, null);
  harap("teks angka tetap tampil (jadi teks)", html.includes(">12<"), true);
  harap("bacaan & pertemuan rusak dibuang", d.bacaan.length + "/" + d.pertemuan.length, "1/1");
  harap("judul null jadi teks kosong", d.judul, "");
  harap("terkait cuma teks", JSON.stringify(d.terkait), '["m2"]');
  const u = amankanDok({ butir: [null, { modulId: "m", soalId: "s", salinan: { soal: null } }, { salinan: { soal: { teks: 3 } } }, { salinan: "x" }] });
  harap("butir rusak dibuang, salinan rusak jadi null", u.butir.length + "/" + JSON.stringify(u.butir.map(b => b.salinan && b.salinan.soal)), '3/[null,{"teks":"3","id":""},null]');
  harap("kolom lain nggak diubah", amankanDok(modul({ kolomLama: 1 })).kolomLama, 1);
}

// =====================================================
grup("Ukuran dokumen (Firestore maks. 1 MiB)");
{
  const besar = modul({ soal: banyak(500, { ...soalPG, teks: "x".repeat(5000) }) });
  harap("500 soal × 5000 huruf ditolak", ukuranDok(besar) > BATAS_DOK.maks, true);
  harap("modul biasa jauh di bawah batas", ukuranDok(modul({ soal: banyak(50, soalPG) })) < BATAS_DOK.peringatan, true);
  harap("huruf Arab dihitung per byte UTF-8 (2 byte)", ukuranDok({ t: "عربي" }) - ukuranDok({ t: "" }), 8);
  harap("batas maks di bawah 1 MiB", BATAS_DOK.maks < 1024 * 1024, true);
}

// =====================================================
grup("Lembar nilai dari dua perangkat barengan");
{
  const bawaan = [{ id: "k-tugas-1", kelompok: "tugas", label: "Tugas 1" }, { id: "k-uh-1", kelompok: "uh", label: "UH 1" }];
  // kayak Firestore: tiap perangkat ngirim perubahan sendiri-sendiri, digabung di server
  const terapkan = (dok, perubahan) => { for (const [j, v] of perubahan) pasangDiJalur(dok, j, v); return dok; };
  const lembarBaruHP = (sid, nilai) => [[["semester"], "Ganjil"], [["tahun"], "2026/2027"], [["kolom"], tambahKeDaftar(...salin(bawaan))], [["nilai", sid, "k-uh-1"], nilai]];
  const server = terapkan(terapkan({}, lembarBaruHP("s1", 80)), lembarBaruHP("s2", 90));
  harap("dua HP bikin lembar yang sama: kolom bawaan nggak dobel", server.kolom.length, 2);
  harap("dua HP bikin lembar yang sama: nilai dua-duanya ada", JSON.stringify(server.nilai), JSON.stringify({ s1: { "k-uh-1": 80 }, s2: { "k-uh-1": 90 } }));
  boleh("lembar baru lewat simpan sebagian lolos aturan", bolehTulis("mapel/bi7a/nilai/l2", null, server, akun.hasan));
  terapkan(server, [[["kolom"], tambahKeDaftar({ id: "a", kelompok: "uh", label: "UH 2" })]]);
  terapkan(server, [[["kolom"], tambahKeDaftar({ id: "b", kelompok: "tugas", label: "Tugas 2" })]]);
  harap("tambah kolom dari dua perangkat: dua-duanya ada", server.kolom.map(k => k.id).join(","), "k-tugas-1,k-uh-1,a,b");
  terapkan(server, [[["kolom"], buangDariDaftar({ label: "UH 2", kelompok: "uh", id: "a" })]]);
  harap("hapus kolom: cuma kolom itu yang hilang (urutan kolom objek nggak ngaruh)", server.kolom.map(k => k.id).join(","), "k-tugas-1,k-uh-1,b");
}

console.log(`\n${lolos} lolos, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
