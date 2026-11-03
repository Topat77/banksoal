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
  ambilFungsi(baca("js/toko.js"), "simpanNilaiSebagian"),
  baca("js/aturan.js"),
  "this.ekspor = { buatAturan, pasangDiJalur, rapikanSoal, galatPanjangSoal, salin, tambahKeDaftar, buangDariDaftar, samaIsi, ukuranDok, BATAS_DOK, amankanDok, kartuSoal, rencanaPulihkan, simpanNilaiSebagian };"
].join("\n"), ctx);
const { buatAturan, pasangDiJalur, rapikanSoal, galatPanjangSoal, salin, tambahKeDaftar, buangDariDaftar,
  ukuranDok, BATAS_DOK, amankanDok, kartuSoal, rencanaPulihkan, simpanNilaiSebagian } = ctx.ekspor;

// fungsi dari layar lain yang logikanya murni (global yang dibutuhin dipalsuin lewat ctx)
const aiJs = baca("js/ai.js"), nilaiJs = baca("js/nilai.js"), cetakJs = baca("js/cetak.js"), tokoJs = baca("js/toko.js");
vm.runInContext([
  "let hitungId = 0;", ambilFungsi(alat, "buatId"),
  ambilFungsi(aiJs, "bacaJawabanAI"),
  ...["KELOMPOK_NILAI", "BOBOT_BAWAAN"].map(n => ambilKonstanta(nilaiJs, n)),
  ...["jenisMapel", "bobotUntuk", "rataRata", "hitungNilai"].map(n => ambilFungsi(nilaiJs, n)),
  ...["angkaAcak", "kocok", "kelompokkan", "acakPilihanSoal", "acakItems", "siapkanLembar"].map(n => ambilFungsi(cetakJs, n)),
  ambilKonstanta(tokoJs, "sudahDiingatkanUkuran"), ...["tanpaId", "muatDiDok"].map(n => ambilFungsi(tokoJs, n)),
  "this.ekspor2 = { bacaJawabanAI, hitungNilai, angkaAcak, kocok, siapkanLembar, muatDiDok };"
].join("\n"), ctx);
const { bacaJawabanAI, hitungNilai, angkaAcak, kocok, siapkanLembar, muatDiDok } = ctx.ekspor2;

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
tolak("profil: sapaan dari tanpa jadi \"\" ditolak", bolehTulis("pengguna/hasan", db["pengguna/hasan"], { ...db["pengguna/hasan"], sapaan: "" }, akun.hasan));
boleh("profil: sapaan dari tanpa jadi null (sama-sama kosong) boleh", bolehTulis("pengguna/hasan", db["pengguna/hasan"], { ...db["pengguna/hasan"], sapaan: null }, akun.hasan));
tolak("profil: sapaan dari \"\" jadi tanpa ditolak", bolehTulis("pengguna/hasan", { ...db["pengguna/hasan"], sapaan: "" }, { ...db["pengguna/hasan"] }, akun.hasan));

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
  tolak("TU nggak boleh hapus lembar selama mapelnya masih ada", bolehTulis("mapel/bi7a/nilai/l1", lama, null, akun.tu));
  boleh("TU boleh bersihin lembar kalau mapelnya sudah dihapus", bolehTulis("mapel/sudahhapus/nilai/l1", lama, null, akun.tu));
  tolak("ustadz nggak boleh bersihin lembar mapel yang sudah dihapus", bolehTulis("mapel/sudahhapus/nilai/l1", lama, null, akun.hasan));
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
tolak("TU nggak bisa bikin lembar nilai", bolehTulis("mapel/bi7a/nilai/l9", null, lembar(), akun.tu));
tolak("TU ngubah lembar nilai", bolehTulis("mapel/bi7a/nilai/l9", lembar(), lembar({ nilai: { s1: { k1: 1 } } }), akun.tu));
tolak("admin yang ada di pengampu tetap nggak boleh bikin lembar nilai", bolehTulis("mapel/tupeng/nilai/l9", null, lembar(), akun.tu));
tolak("admin yang ada di pengampu tetap nggak boleh ngubah lembar nilai", bolehTulis("mapel/tupeng/nilai/l9", lembar(), lembar({ nilai: { s1: { k1: 1 } } }), akun.tu));
boleh("guru pengampu lain di mapel yang sama tetap boleh isi nilai", bolehTulis("mapel/tupeng/nilai/l9", lembar(), lembar({ nilai: { s1: { k1: 1 } } }), akun.hasan));
tolak("TU nggak bisa jadiin dirinya pengampu mapel", bolehTulis("mapel/bi7a", db["mapel/bi7a"], { ...db["mapel/bi7a"], pengampu: ["hasan", "tu"] }, akun.tu));
boleh("TU boleh ganti pengampu mapel ke guru", bolehTulis("mapel/bi7a", db["mapel/bi7a"], { ...db["mapel/bi7a"], pengampu: ["hasan", "aminah"] }, akun.tu));
tolak("semester selain Ganjil/Genap ditolak", bolehTulis("mapel/bi7a/nilai/l1", null, lembar({ semester: "</style>" }), akun.hasan));
tolak("tahun bukan format 2026/2027 ditolak", bolehTulis("mapel/bi7a/nilai/l1", null, lembar({ tahun: "2026" }), akun.hasan));
boleh("semester Genap 2026/2027 lolos", bolehTulis("mapel/bi7a/nilai/l1", null, lembar({ semester: "Genap" }), akun.hasan));
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
  harap("lembar nilai nggak ikut dipulihkan (rules: TU nggak boleh bikin lembar nilai)", "nilai" in r, false);
  harap("daftar nilai nggak nyasar ke dokumen mapel", "nilai" in r.mapel[0][1], false);
  harap("UAS & usulan: yang hilang aja", jalur("uas") + "|" + jalur("usulan"), "grup/g-bi7/uas/uas2|grup/g-bi7/usulan/us1");
  harap("id nggak ikut ditulis ke isi dokumen", "id" in r.modul[0][1], false);
  // aplikasi cuma mantau semester yang dibuka: pulihkan dibandingin sama isi LENGKAP dari server
  const lengkap = { mapel: { bi7a: { modul: [{ id: "m1" }, { id: "m2" }], sumatif: [{ id: "s1" }] } }, grup: { "g-bi7": { uas: [{ id: "uas1" }, { id: "uas2" }], usulan: [] } } };
  const r2 = rencanaPulihkan({ versiCadangan: 3, mapel: [{ id: "bi7a", modul: [{ id: "m1" }, { id: "m2" }], sumatif: [{ id: "s1" }] }],
    grup: [{ id: "g-bi7", uas: [{ id: "uas2" }], usulan: [{ id: "us1" }] }] }, lengkap);
  harap("pakai isi lengkap: modul semester lain yang masih ada nggak dianggap hilang", r2.modul.length + r2.sumatif.length, 0);
  harap("pakai isi lengkap: UAS yang masih ada dilewati, usulan yang hilang dipulihkan", r2.uas.length + "|" + r2.usulan.map(x => x[0]).join(), "0|grup/g-bi7/usulan/us1");
  // wali kelas: dipulihkan kalau di database kosong, dilewati kalau udah ada
  const waliCadangan = { tahun: { "2026-2027": { "paket-b-7a1": { uid: "hasan", nama: "Ustadz Hasan" } } } };
  harap("wali kelas kosong → dipulihkan", rencanaPulihkan({ versiCadangan: 3, wali: waliCadangan }).pengaturan.map(x => x[0]).join(), "pengaturan/wali");
  tokoTes.wali = { tahun: { "2026-2027": {} } };
  harap("wali kelas udah ada → nggak ditimpa", rencanaPulihkan({ versiCadangan: 3, wali: waliCadangan }).pengaturan.length, 0);
  harap("wali kelas rusak di file cadangan → dilewati", rencanaPulihkan({ versiCadangan: 3, wali: "x" }).pengaturan.length, 0);
}

// =====================================================
grup("Wali kelas per tahun ajaran");
{
  // aturan: pengaturan/wali kayak pengaturan lain (semua akun aktif baca, cuma admin nulis)
  const wali = { tahun: { "2026-2027": { "paket-b-7a1": { uid: "hasan", nama: "Ustadz Hasan", nip: "123" } } } };
  boleh("ustadz boleh baca wali kelas", bolehBaca("pengaturan/wali", wali, akun.hasan));
  tolak("akun belum disetujui nggak boleh baca", bolehBaca("pengaturan/wali", wali, akun.baru));
  boleh("admin boleh ngatur wali kelas", bolehTulis("pengaturan/wali", null, wali, akun.tu));
  tolak("ustadz nggak boleh ngatur wali kelas (walau dirinya sendiri)", bolehTulis("pengaturan/wali", null, wali, akun.hasan));

  const wk = { console };
  vm.createContext(wk);
  vm.runInContext([
    ...["adalahObjek", "salin", "pasangDiJalur", "samaIsi"].map(n => alat.includes(`function ${n}(`) ? ambilFungsi(alat, n) : ambilKonstanta(alat, n)),
    ambilKonstanta(tokoJs, "kunciTahunWali"), ambilFungsi(tokoJs, "waliKelas"), ambilFungsi(tokoJs, "simpanWali"),
    "const toko = { wali: {}, backend: { ubahSebagian: (j, p) => { kiriman.push([j, p]); return Promise.resolve(); } } }; const kiriman = [];",
    "function berubah() {} function gagalSimpan() {} function uidSaya() { return 'tu'; }",
    "this.ekspor = { toko, kiriman, waliKelas, simpanWali };"
  ].join("\n"), wk);
  const W = wk.ekspor;
  harap("belum diatur → null", W.waliKelas("2026/2027", "paket-b-7a1"), null);
  W.simpanWali("2026/2027", "paket-b-7a1", { id: "hasan", nama: "Ustadz Hasan", nip: "123", email: "rahasia@x" });
  harap("tersimpan per tahun & kelas (nama + NIP disalin, email nggak)", JSON.stringify(W.waliKelas("2026/2027", "paket-b-7a1")), '{"uid":"hasan","nama":"Ustadz Hasan","nip":"123"}');
  harap("tahun lain nggak ikut", W.waliKelas("2025/2026", "paket-b-7a1"), null);
  harap("yang dikirim cuma kelas itu (isian TU di HP lain nggak ketimpa)", JSON.stringify(W.kiriman[0][1][0][0]), '["tahun","2026-2027","paket-b-7a1"]');
  W.simpanWali("2026/2027", "paket-b-7b1", { id: "aminah", nama: "Ustadzah Aminah" });
  harap("kelas lain di tahun sama tetap ada", W.waliKelas("2026/2027", "paket-b-7a1").uid, "hasan");
  W.simpanWali("2026/2027", "paket-b-7a1", null);
  harap("dikosongin → null", W.waliKelas("2026/2027", "paket-b-7a1"), null);
  harap("ngosongin = kolomnya dihapus di database", W.kiriman[2][1][0][1], undefined);
  W.toko.wali = { tahun: { "2026-2027": { "paket-b-7a1": { uid: 5, nama: null }, "paket-b-7b1": "rusak" } } };
  harap("data rusak dari database → dianggap belum diatur", [W.waliKelas("2026/2027", "paket-b-7a1"), W.waliKelas("2026/2027", "paket-b-7b1")].join(), ",");
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

// =====================================================
grup("Lembar nilai baru: tambah / hapus kolom sebelum ngisi nilai");
{
  // kayak ubahSebagian di firebase.js: semua perubahan jadi SATU objek, jalur yang sama = yang terakhir menang
  const kirimKayakFirebase = (dok, perubahan) => {
    const peta = new Map(perubahan.map(([j, v]) => [JSON.stringify(j), [j, v]]));
    for (const [j, v] of peta.values()) pasangDiJalur(dok, j, v);
    return dok;
  };
  let terkirim = null;
  Object.assign(ctx, {
    toko: { isi: { bi7a: { nilai: [] } }, backend: { ubahSebagian: (jalur, p) => { terkirim = p; return Promise.resolve(); } } },
    uidSaya: () => "hasan", namaSaya: () => "Ustadz Hasan", pasangDiDaftar: () => {}, berubah: () => {}, gagalSimpan: () => {}
  });
  const bawaan = [{ id: "k1", kelompok: "tugas", label: "Tugas 1" }, { id: "k2", kelompok: "uh", label: "UH 1" }];
  const coba = (kolomAkhir, perubahan) => {
    ctx.toko.isi.bi7a.nilai = [];
    simpanNilaiSebagian("bi7a", { id: "l1", semester: "Ganjil", tahun: "2026/2027", kolom: kolomAkhir, nilai: {} }, perubahan);
    const jalurKolom = terkirim.filter(([j]) => j.join("/") === "kolom").length;
    return { jalurKolom, dok: kirimKayakFirebase({}, terkirim) };
  };
  const baru = { id: "k3", kelompok: "uh", label: "UH 2" };
  const t = coba([...bawaan, baru], [[["kolom"], tambahKeDaftar(baru)]]);
  harap("tambah kolom: jalur kolom cuma dikirim sekali", t.jalurKolom, 1);
  harap("tambah kolom: kolom bawaan nggak hilang", t.dok.kolom.map(k => k.id).join(","), "k1,k2,k3");
  const h = coba([bawaan[1]], [[["kolom"], buangDariDaftar(bawaan[0])]]);
  harap("hapus kolom: yang tersisa tetap kesimpan (bukan daftar kosong)", h.dok.kolom.map(k => k.id).join(","), "k2");
  boleh("lembar baru hasil tambah kolom lolos aturan", bolehTulis("mapel/bi7a/nilai/l1", null, t.dok, akun.hasan));
}

// =====================================================
grup("Nama pembuat nggak bisa dipalsukan (sama kayak firestore.rules)");
tolak("modul baru atas nama guru lain", bolehTulis("mapel/bi7a/modul/m2", null, modul({ namaPemilik: "Ustadzah Aminah" }), akun.hasan));
boleh("modul baru pakai nama sendiri", bolehTulis("mapel/bi7a/modul/m2", null, modul(), akun.hasan));
tolak("ganti nama pembuat modul jadi orang lain", bolehTulis("mapel/bi7a/modul/m1", modul(), modul({ namaPemilik: "Ustadzah Aminah" }), akun.hasan));
boleh("modul lama dengan nama lama tetap bisa diedit", bolehTulis("mapel/bi7a/modul/m1", modul({ namaPemilik: "Nama Lama" }), modul({ namaPemilik: "Nama Lama", judul: "x" }), akun.hasan));
tolak("sumatif atas nama orang lain", bolehTulis("mapel/bi7a/sumatif/s2", null, sumatif({ namaPemilik: "Admin TU" }), akun.hasan));
tolak("usulan atas nama orang lain", bolehTulis("grup/g-bi7/usulan/x", null, usulan({ namaPemilik: "Ustadz Hasan" }), akun.aminah));
tolak("nilai dengan namaPengubah orang lain", bolehTulis("mapel/bi7a/nilai/l1", lembar(), lembar({ namaPengubah: "Ustadzah Aminah" }), akun.hasan));
boleh("nilai dengan nama sendiri", bolehTulis("mapel/bi7a/nilai/l1", lembar(), lembar({ namaPengubah: "Ustadz Hasan" }), akun.hasan));
boleh("TU pulihkan modul atas nama pemilik aslinya", bolehTulis("mapel/bi7a/modul/m9", null, modul(), akun.tu));

grup("Akun ditolak / nonaktif cuma bisa nyatat terakhirMasuk");
{
  db["pengguna/mati"] = { nama: "Akun Mati", email: "mati@x", peran: "nonaktif", terakhirMasuk: 1 };
  const p = db["pengguna/mati"], mati = { uid: "mati", email: "mati@x" };
  boleh("catat terakhirMasuk", bolehTulis("pengguna/mati", p, { ...p, terakhirMasuk: 2 }, mati));
  tolak("ganti nama sendiri", bolehTulis("pengguna/mati", p, { ...p, nama: "Ganti" }, mati));
  delete db["pengguna/mati"];
}

// =====================================================
grup("Data admin (pengaturan, kelas, siswa, grup, mapel): cuma TU yang boleh nulis");
{
  // Hasan sengaja dipilih: pengampu bi7a & kelas k7a, koordinator g-bi7. Tetap nggak boleh.
  const data = {
    "pengaturan/lembaga": { nama: "PKBM" }, "pengaturan/bobot": { umum: { tugas: 100 } },
    "kelas/k7a": { pengampu: ["hasan"], nama: "7A" }, "santri/sa1": { nama: "Siswa", kelasId: "k7a" },
    "grup/g-bi7": { pengampu: ["hasan", "aminah"], koordinator: "aminah" },
    "mapel/bi7a": { pengampu: ["hasan", "yusuf"], grup: "g-bi7" }
  };
  for (const [j, isi] of Object.entries(data)) {
    for (const [nama, a] of [["ustadz", akun.hasan], ["akun menunggu", akun.baru]]) {
      tolak(`${nama} ngubah ${j}`, bolehTulis(j, db[j] || { lama: true }, isi, a));
      tolak(`${nama} hapus ${j}`, bolehTulis(j, db[j] || { lama: true }, null, a));
    }
    boleh(`TU ngubah ${j}`, bolehTulis(j, db[j] || { lama: true }, isi, akun.tu));
  }
  tolak("ustadz bikin kelas baru", bolehTulis("kelas/k9", null, { pengampu: ["hasan"] }, akun.hasan));
  tolak("ustadz bikin siswa baru di kelasnya", bolehTulis("santri/sa9", null, { nama: "X", kelasId: "k7a" }, akun.hasan));
  tolak("ustadz bikin grup baru", bolehTulis("grup/g9", null, { pengampu: ["hasan"], koordinator: "hasan" }, akun.hasan));
  tolak("ustadz bikin mapel baru", bolehTulis("mapel/x9", null, { pengampu: ["hasan"], grup: "g9" }, akun.hasan));
  tolak("TU nggak boleh masukin dirinya jadi pengampu", bolehTulis("mapel/x9", null, { pengampu: ["tu"], grup: "g9" }, akun.tu));
  boleh("TU bikin mapel buat guru", bolehTulis("mapel/x9", null, { pengampu: ["hasan"], grup: "g9" }, akun.tu));
}

// =====================================================
grup("Baca jawaban AI");
{
  const bahan = { untuk: "modul", pilihan: [{ nomor: 1, id: "p1" }, { nomor: 2, id: "p2" }], bacaan: [{ id: "b1" }] };
  const satu = (s, b = bahan) => bacaJawabanAI(JSON.stringify({ soal: [s] }), b)[0];
  const kunciTeks = (d) => d.pilihan[d.kunci];
  const pg = (o) => ({ jenis: "PG", teks: "Ibu kota?", pilihan: ["Bandung", "Jakarta", "Surabaya", "Medan"], ...o });
  const gagalnya = (teks) => { try { bacaJawabanAI(teks, bahan); return "nggak gagal"; } catch (e) { return e.message; } };

  harap("kunci angka", kunciTeks(satu(pg({ kunci: 1 }))), "Jakarta");
  harap("kunci huruf", kunciTeks(satu(pg({ kunci: "B" }))), "Jakarta");
  harap("kunci huruf kecil + spasi", kunciTeks(satu(pg({ kunci: " b " }))), "Jakarta");
  harap("kunci berupa teks jawabannya", kunciTeks(satu(pg({ kunci: "Surabaya" }))), "Surabaya");
  harap("kunci jelas → nggak ditandai ragu", satu(pg({ kunci: 1 })).ragu, false);
  const ngawur = satu(pg({ kunci: 9 }));
  harap("kunci di luar pilihan → ditandai ragu", ngawur.ragu, true);
  harap("kunci di luar pilihan → jadi A dulu", ngawur.kunci, 0);
  harap("kunci teks yang nggak ada di pilihan → ragu", satu(pg({ kunci: "Bogor" })).ragu, true);
  // B1: pilihan kosong di depan dibuang, kuncinya harus ikut geser
  const kosongDepan = satu(pg({ pilihan: ["", "Benar", "Salah", "Ragu"], kunci: 1 }));
  harap("pilihan kosong di depan: kunci angka tetap nunjuk jawaban yang sama", kunciTeks(kosongDepan), "Benar");
  harap("pilihan kosong di depan: nggak ditandai ragu", kosongDepan.ragu, false);
  harap("pilihan kosong di depan: kunci huruf tetap nunjuk jawaban yang sama", kunciTeks(satu(pg({ pilihan: ["", "Benar", "Salah"], kunci: "B" }))), "Benar");
  harap("pilihan kosong di tengah: kunci sesudahnya ikut geser", kunciTeks(satu(pg({ pilihan: ["a", "", "b", "c"], kunci: 3 }))), "c");
  harap("kunci nunjuk pilihan yang kosong → ragu", satu(pg({ pilihan: ["a", "", "b"], kunci: 1 })).ragu, true);
  harap("awalan \"A. \" di pilihan dibuang", satu(pg({ pilihan: ["A. Bandung", "B) Jakarta"] })).pilihan.slice(0, 2).join("|"), "Bandung|Jakarta");
  harap("lebih dari 5 pilihan dipotong jadi 5", satu(pg({ pilihan: ["1", "2", "3", "4", "5", "6"] })).pilihan.length, 5);
  harap("pilihan selalu 5 kotak", satu(pg({ pilihan: ["a", "b"] })).pilihan.length, 5);
  harap("cuma 1 pilihan terisi → jadi esai", satu(pg({ pilihan: ["a", ""] })).jenis, "Esai");
  const esai = satu({ jenis: "Esai", teks: "Jelaskan!", pilihan: ["a", "b"], kunci: "Jawabannya x" });
  harap("jenis esai tetap esai walau ada pilihan", esai.jenis, "Esai");
  harap("pedoman esai boleh dari kolom kunci", esai.pedoman, "Jawabannya x");
  harap("pertemuan ke-2 → id pertemuannya", satu(pg({ pertemuan: 2 })).pertemuanId, "p2");
  harap("pertemuan yang nggak ada → kosong", satu(pg({ pertemuan: 7 })).pertemuanId, null);
  harap("bacaan ke-1 → id bacaannya", satu(pg({ bacaan: 1 })).bacaanId, "b1");
  harap("buat ujian: pertemuan nggak dipakai", satu(pg({ pertemuan: 1 }), { ...bahan, untuk: "ujian" }).pertemuanId, null);
  harap("dibungkus ```json dan ada kalimat pembuka", bacaJawabanAI("Ini soalnya:\n```json\n" + JSON.stringify({ soal: [pg({ kunci: 0 })] }) + "\n```", bahan).length, 1);
  harap("langsung daftar [...] tanpa {soal}", bacaJawabanAI(JSON.stringify([pg(), pg()]), bahan).length, 2);
  harap("pakai nama kolom lain (questions / pertanyaan / opsi)", bacaJawabanAI(JSON.stringify({ questions: [{ pertanyaan: "P?", opsi: ["x", "y"], kunci: 1 }] }), bahan)[0].pilihan[1], "y");
  harap("item rusak / tanpa teks dilewati", bacaJawabanAI(JSON.stringify({ soal: [null, 5, { teks: "" }, pg()] }), bahan).length, 1);
  harap("JSON rusak → JAWABAN_RUSAK", gagalnya('{"soal": [ {"teks": "a"'), "JAWABAN_RUSAK");
  harap("bukan JSON sama sekali → JAWABAN_RUSAK", gagalnya("Maaf, saya tidak bisa."), "JAWABAN_RUSAK");
  harap("nggak ada soal → JAWABAN_KOSONG", gagalnya('{"soal": []}'), "JAWABAN_KOSONG");
  harap("hasilnya lolos rapikanSoal tanpa berubah kunci", rapikanSoal({ ...kosongDepan, id: "x" }).kunci, kosongDepan.kunci);
}

// =====================================================
grup("Hitung nilai akhir");
{
  const dekat = (a, b) => a !== null && Math.abs(a - b) < 1e-9;
  ctx.toko = { bobot: {} };   // bobot belum diatur admin → bawaan
  const kolom = [["k1", "tugas"], ["k2", "uh"], ["k3", "uh"], ["k4", "uts"], ["k5", "uas"], ["k6", "keaktifan"]]
    .map(([id, kelompok]) => ({ id, kelompok, label: id }));
  const lembarN = (nilai, hadir = {}) => ({ kolom, nilai: { s1: nilai }, hadir: { s1: hadir.s1 } });
  const lengkap = { k1: 80, k2: 70, k3: 90, k4: 75, k5: 70 };
  const umum = { jenjang: "Paket B", jenis: "umum" }, diniah = { jenjang: "Paket B", jenis: "diniah" };

  const h = hitungNilai(lembarN(lengkap), "s1", umum);
  harap("rata-rata per kelompok (UH 70 & 90 → 80)", h.per.uh, 80);
  harap("nilai harian = rata-rata tugas + UH", h.harian, 80);
  boleh("umum bawaan: 20·80 + 30·80 + 20·75 + 30·70 = 76", dekat(h.akhir, 76));
  const tanpaUAS = hitungNilai(lembarN({ ...lengkap, k5: undefined }), "s1", umum).akhir;
  boleh("UAS belum ada: bobotnya dibagi ke yang ada (5500/70)", dekat(tanpaUAS, 5500 / 70));
  const d = hitungNilai({ ...lembarN({ ...lengkap, k6: 100 }), hadir: { s1: { hadir: 18, sakit: 1, izin: 1 } } }, "s1", diniah);
  harap("kehadiran 18 dari 20 = 90", d.per.kehadiran, 90);
  boleh("diniah bawaan (pakai keaktifan & kehadiran) = 78,5", dekat(d.akhir, 78.5));
  const rusak = hitungNilai({ ...lembarN(lengkap), hadir: { s1: { hadir: "<b>", sakit: "2", izin: -3 } } }, "s1", diniah);
  harap("isian kehadiran rusak jadi angka >= 0", JSON.stringify(rusak.hadir), JSON.stringify({ hadir: 0, sakit: 2, izin: 0 }));
  harap("nilai berupa teks nggak ikut dihitung", hitungNilai(lembarN({ k1: "80", k2: 60 }), "s1", umum).per.tugas, null);
  harap("belum ada nilai sama sekali → akhir kosong", hitungNilai(lembarN({}), "s1", umum).akhir, null);
  harap("lembar belum ada → akhir kosong", hitungNilai(null, "s1", umum).akhir, null);
  ctx.toko = { bobot: { "Paket B": { umum: { tugas: 50, uh: 50, uts: 0, uas: 0, keaktifan: 0, kehadiran: 0 } } } };
  boleh("bobot atur admin per jenjang dipakai (tugas 50, UH 50 → 80)", dekat(hitungNilai(lembarN(lengkap), "s1", umum).akhir, 80));
  boleh("jenjang lain tetap pakai bobot bawaan", dekat(hitungNilai(lembarN(lengkap), "s1", { ...umum, jenjang: "Paket C" }).akhir, 76));
  ctx.toko = { bobot: { umum: { tugas: 100, uh: 0, uts: 0, uas: 0 } } };
  boleh("bobot data lama (belum per jenjang) tetap kebaca", dekat(hitungNilai(lembarN(lengkap), "s1", umum).akhir, 80));
}

// =====================================================
grup("Cetak: paket acak & kunci jawaban");
{
  const deret = (benih) => { const a = angkaAcak(benih); return [a(), a(), a()].join(","); };
  harap("benih sama → angka acak sama", deret("x-B"), deret("x-B"));
  boleh("benih beda → angka acak beda", deret("x-B") !== deret("x-C"));
  const asal = [1, 2, 3, 4, 5, 6, 7, 8];
  const hasilKocok = kocok(asal, angkaAcak("k"));
  harap("kocok: isinya tetap sama", [...hasilKocok].sort().join(), asal.join());
  harap("kocok: daftar aslinya nggak diubah", asal.join(), "1,2,3,4,5,6,7,8");

  const pilihanAsli = ["Merah", "Kuning", "Hijau", "Biru", ""];
  const items = Array.from({ length: 10 }, (_, i) => ({
    soal: { id: "s" + i, jenis: "PG", teks: "Soal " + i, pilihan: [...pilihanAsli], kunci: i % 4 },
    bacaan: i === 3 || i === 4 || i === 5 ? { id: "bc" } : null
  })).concat([{ soal: { id: "e1", jenis: "Esai", teks: "Esai", pedoman: "" }, bacaan: null }]);
  const id = (l) => l.pg.map(x => x.soal.id).join(",");
  const A = siapkanLembar(items, "A", true, "ujian1");
  harap("paket A: urutan asli", id(A), items.slice(0, 10).map(x => x.soal.id).join(","));
  harap("paket A: pilihan nggak diacak", A.pg[0].soal.pilihan.join("|"), pilihanAsli.join("|"));
  const B = siapkanLembar(items, "B", true, "ujian1");
  harap("paket B dicetak ulang → urutan sama persis", id(siapkanLembar(items, "B", true, "ujian1")), id(B));
  boleh("paket B beda urutan dari paket C", id(B) !== id(siapkanLembar(items, "C", true, "ujian1")));
  harap("paket B: semua soal tetap ada", B.pg.map(x => x.soal.id).sort().join(), items.slice(0, 10).map(x => x.soal.id).sort().join());
  const posBacaan = B.pg.map((x, i) => x.bacaan ? i : -1).filter(i => i >= 0);
  boleh("soal satu teks bacaan tetap berurutan", posBacaan[2] - posBacaan[0] === 2);
  boleh("kunci tetap nunjuk jawaban yang benar setelah pilihan diacak",
    B.pg.every(x => x.soal.pilihan[x.soal.kunci] === pilihanAsli[Number(x.soal.id.slice(1)) % 4]));
  boleh("pilihan kosong nggak ikut dicetak", B.pg.every(x => x.soal.pilihan.length === 4));
  harap("esai dipisah dari PG", B.esai.map(x => x.soal.id).join(), "e1");
  harap("tanpa acak pilihan: pilihan tetap urut", siapkanLembar(items, "B", false, "ujian1").pg[0].soal.pilihan.join("|"), pilihanAsli.join("|"));
}

// =====================================================
grup("Batas ukuran dokumen sebelum disimpan");
{
  const pesan = [];
  ctx.kabar = (t) => pesan.push(t);
  const dok = (id, kb) => ({ id, isi: "x".repeat(kb * 1024) });
  boleh("dokumen kecil boleh", muatDiDok(dok("a", 10), null, "Modul"));
  harap("dokumen kecil: nggak ada pesan", pesan.length, 0);
  tolak("dokumen baru di atas batas ditolak", muatDiDok(dok("b", 950), null, "Modul"));
  boleh("ditolak → guru dikasih tau", /NGGAK disimpan/.test(pesan.pop()));
  tolak("dokumen yang makin gede di atas batas ditolak", muatDiDok(dok("c", 950), dok("c", 920), "Modul"));
  pesan.length = 0;
  boleh("dokumen kegedean yang dikecilin tetap boleh disimpan", muatDiDok(dok("d", 950), dok("d", 990), "Modul"));
  pesan.length = 0;
  boleh("mendekati batas: boleh, tapi diingetin", muatDiDok(dok("e", 800), null, "Ujian") && /mendekati batas/.test(pesan.pop() || ""));
  muatDiDok(dok("e", 810), null, "Ujian");
  harap("pengingat mendekati batas cuma sekali per dokumen", pesan.length, 0);
}

// =====================================================
grup("Naik kelas & riwayat kelas santri");
{
  const nk = { console };
  vm.createContext(nk);
  vm.runInContext([
    ambilFungsi(alat, "salin"), ambilFungsi(baca("js/grup.js"), "tingkatKelas"),
    ambilFungsi(baca("js/grup.js"), "idKelas"),
    "const KELAS_SD = [], KELAS_SMP = [], KELAS_SMA = [];", ambilKonstanta(baca("js/kurikulum.js"), "KELAS_PER_JENJANG"),
    ambilFungsi(nilaiJs, "bandingKelas"), ambilFungsi(tokoJs, "simpanSantri"),
    "const toko = { santri: [], backend: { tulis: () => Promise.resolve() } }; function berubah() {} function gagalSimpan() {} function pasangDiDaftar(d, x) { const i = d.findIndex(y => y.id === x.id); if (i >= 0) d[i] = x; else d.push(x); }",
    ambilFungsi(tokoJs, "tanpaId"),
    baca("js/naikkelas.js"),
    "this.ekspor = { toko, tingkatAkhir, tebakKelasTujuan, tahunBerikut, tahunSebelum, kelasSantriDi, santriKelasDi, kelasDiTahun, terapkanNaikKelas, keluarkanSantri, aktifkanLagiSantri, rencanaNaikKelas, simpanSantri };"
  ].join("\n"), nk);
  const N = nk.ekspor;
  const s7 = { id: "a", nama: "Ahmad", jenjang: "Paket B", kelas: "7A1", absen: 3, aktif: true };
  const s9 = { id: "b", nama: "Bilal", jenjang: "Paket B", kelas: "9A1", absen: 1, aktif: true };
  const s12 = { id: "c", nama: "Citra", jenjang: "Paket C", kelas: "12 IPA", absen: 2, aktif: true };

  harap("tebak kelas tujuan 7A1 → 8A1", N.tebakKelasTujuan("7A1"), "8A1");
  harap("tebak kelas tujuan 11 IPS → 12 IPS", N.tebakKelasTujuan("11 IPS"), "12 IPS");
  boleh("Paket B kelas 9 = tingkat akhir", N.tingkatAkhir("Paket B", "9A1"));
  boleh("Paket C kelas 12 = tingkat akhir", N.tingkatAkhir("Paket C", "12 IPA"));
  tolak("Paket B kelas 8 bukan tingkat akhir", N.tingkatAkhir("Paket B", "8A1"));
  tolak("Paket C kelas 9 bukan tingkat akhir", N.tingkatAkhir("Paket C", "9"));
  harap("tahun berikut", N.tahunBerikut("2025/2026"), "2026/2027");
  harap("tahun sebelum", N.tahunSebelum("2025/2026"), "2024/2025");

  const rencana = N.rencanaNaikKelas([s7, s9, s12, { ...s7, id: "x", aktif: false }], "2025/2026");
  harap("rencana: santri nonaktif nggak ikut", rencana.reduce((n, g) => n + g.santri.length, 0), 3);
  harap("rencana: kelas 7A1 bawaannya naik ke 8A1", JSON.stringify([rencana.find(g => g.kelas === "7A1").tujuan, rencana.find(g => g.kelas === "7A1").santri[0].hasil]), '["8A1","naik"]');
  harap("rencana: kelas 9 bawaannya lulus", rencana.find(g => g.kelas === "9A1").santri[0].hasil, "lulus");
  harap("rencana: kelas 12 bawaannya lulus", rencana.find(g => g.kelas === "12 IPA").santri[0].hasil, "lulus");

  const naik = N.terapkanNaikKelas(s7, "2025/2026", "naik", "8A1");
  harap("naik: kelas sekarang 8A1", naik.kelas, "8A1");
  harap("naik: riwayat 2025/2026 nyimpen kelas lama", JSON.stringify(naik.riwayatKelas), '[{"tahun":"2025/2026","jenjang":"Paket B","kelas":"7A1","absen":3,"hasil":"naik"}]');
  harap("naik: data asli nggak diubah", s7.kelas, "7A1");
  harap("diproses ulang tahun yang sama = nggak berubah (nggak dobel)", N.terapkanNaikKelas(naik, "2025/2026", "naik", "9A1"), null);
  harap("udah diproses tahun sesudahnya: nutup tahun lama nggak bikin naik dua kali", N.terapkanNaikKelas(naik, "2024/2025", "naik", "8A1"), null);
  harap("rencana tahun lama nggak ngikutin santri yang udah diproses tahun sesudahnya", N.rencanaNaikKelas([naik], "2024/2025").length, 0);
  harap("rencana: santri urut No. Absen", N.rencanaNaikKelas([{ ...s7, id: "p", absen: 5 }, { ...s7, id: "q", absen: 2 }], "2025/2026")[0].santri.map(x => x.s.id).join(), "q,p");
  harap("naik tanpa kelas tujuan ditolak", N.terapkanNaikKelas(s7, "2025/2026", "naik", "  "), null);
  const tinggal = N.terapkanNaikKelas(s7, "2025/2026", "tinggal");
  harap("tinggal kelas: kelasnya tetap, riwayat tercatat", `${tinggal.kelas}|${tinggal.riwayatKelas[0].hasil}`, "7A1|tinggal");

  const lulus = N.terapkanNaikKelas(s9, "2025/2026", "lulus");
  harap("lulus: status, aktif:false, tahun keluar", `${lulus.status}|${lulus.aktif}|${lulus.keluar.tahun}`, "lulus|false|2025/2026");
  N.toko.santri = [];
  const tersimpan = N.simpanSantri({ ...lulus, kelasId: "paket-b-9a1" });
  harap("lulus: kelasId dicopot waktu disimpan (guru kelas mana pun nggak baca lagi)", tersimpan.kelasId, undefined);
  harap("santri aktif tetap dapat kelasId", N.simpanSantri(naik).kelasId, "paket-b-8a1");
  tolak("lulus: guru kelasnya nggak bisa baca lagi (aturan)", bolehBaca("santri/b", tanpaKelas(tersimpan), akun.hasan));

  N.toko.santri = [naik, tersimpan, { ...s7, id: "d", nama: "Dani", kelas: "8A1", absen: 1 }];
  harap("kelas di tahun lalu dari riwayat", N.kelasSantriDi(naik, "2025/2026").kelas, "7A1");
  harap("kelas di tahun ini = kelas sekarang", N.kelasSantriDi(naik, "2026/2027").kelas, "8A1");
  harap("rapor 7A1 tahun lalu: Ahmad masih ada", N.santriKelasDi("Paket B", "7A1", "2025/2026").map(s => s.id).join(), "a");
  harap("rapor 8A1 tahun ini: Ahmad & Dani, urut absen", N.santriKelasDi("Paket B", "8A1", "2026/2027").map(s => s.id).join(), "d,a");
  harap("rapor 9A1 tahun lalu: yang lulus tetap muncul", N.santriKelasDi("Paket B", "9A1", "2025/2026").map(s => s.id).join(), "b");
  harap("rapor 9A1 tahun ini: yang lulus nggak muncul", N.santriKelasDi("Paket B", "9A1", "2026/2027").length, 0);
  boleh("kelas 9A1 tetap ada di pilihan rapor tahun lalu", N.kelasDiTahun("2025/2026").some(k => k.kelas === "9A1"));

  const pindah = N.keluarkanSantri(naik, "2026/2027", "pindah");
  harap("pindah tengah tahun: riwayat tahun ini ikut dicatat", `${pindah.status}|${pindah.riwayatKelas.map(r => r.tahun + ":" + r.kelas).join()}`, "pindah|2025/2026:7A1,2026/2027:8A1");
  const pindahLagi = N.keluarkanSantri(naik, "2025/2026", "pindah");
  harap("pindah sesudah naik kelas diproses: status aja, riwayat naik tetap", `${pindahLagi.status}|${pindahLagi.riwayatKelas.map(r => r.hasil).join()}`, "pindah|naik");
  const balik = N.aktifkanLagiSantri(pindah);
  harap("aktifkan lagi: riwayat pindah dibuang, riwayat naik tetap", `${balik.aktif}|${balik.status}|${balik.riwayatKelas.map(r => r.hasil).join()}`, "true|undefined|naik");
  harap("aktifkan lagi sesudah 'pindah status aja': riwayat naik nggak ikut kebuang", N.aktifkanLagiSantri(pindahLagi).riwayatKelas.length, 1);
}
function tanpaKelas(s) { const { id, ...isi } = s; return isi; }

// =====================================================
grup("Daftar file JS & CSP tetap sinkron");
{
  const crypto = require("crypto");
  const html = fs.readFileSync(path.join(akar, "index.html"), "utf8");
  const diHtml = [...html.matchAll(/<script src="(js\/[^"]+)"><\/script>/g)].map(m => m[1]);
  const mulai = baca("js/mulai.js");
  const cekMulai = [...ambilFungsi(mulai, "fileKurang").matchAll(/"(js\/[^"]+)": (.+?),?$/gm)].map(m => [m[1], m[2]]);
  const sw = baca("sw.js");
  const inti = JSON.parse(sw.match(/const INTI = (\[[\s\S]*?\]);/)[1].replace(/'/g, '"'));
  const diFolder = fs.readdirSync(path.join(akar, "js")).filter(f => f.endsWith(".js")).map(f => "js/" + f);

  harap("fileKurang() ngecek file yang sama, urutan sama, dengan index.html", cekMulai.map(x => x[0]).join(), diHtml.join());
  harap("mulai.js dimuat sebagai module di index.html", /<script type="module" src="js\/mulai.js"><\/script>/.test(html), true);
  harap("semua file di js/ masuk INTI sw.js", diFolder.filter(f => !inti.includes(f)).join() || "lengkap", "lengkap");
  harap("INTI nggak nyebut file js yang udah nggak ada", inti.filter(f => f.startsWith("js/") && !diFolder.includes(f)).join() || "aman", "aman");
  harap("semua file js (selain firebase & mulai) dimuat di index.html",
    diFolder.filter(f => !diHtml.includes(f) && f !== "js/firebase.js" && f !== "js/mulai.js").join() || "lengkap", "lengkap");
  // tiap cek di fileKurang harus nunjuk nama yang beneran didefinisiin di file itu
  const salahCek = cekMulai.filter(([f, cek]) => {
    const src = baca(f);
    return [...cek.matchAll(/typeof (\w+)/g)].some(m => !new RegExp(`^((async )?function ${m[1]}\\(|const ${m[1]} =)`, "m").test(src));
  }).map(x => x[0]);
  harap("nama yang dicek fileKurang() ada di file-nya", salahCek.join() || "cocok", "cocok");

  const skripInline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  const hashCsp = [...html.matchAll(/'sha256-([^']+)'/g)].map(m => m[1]);
  const hashSkrip = skripInline.map(s => crypto.createHash("sha256").update(s, "utf8").digest("base64"));
  boleh("tiap script inline punya hash di CSP (kalau isinya diubah, hash-nya ikut diganti)", skripInline.length > 0 && hashSkrip.every(h => hashCsp.includes(h)));
}

console.log(`\n${lolos} lolos, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
