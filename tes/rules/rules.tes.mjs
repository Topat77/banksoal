// =====================================================
//  tes/rules/rules.tes.mjs — ngetes firestore.rules YANG ASLI di Firebase Emulator
//
//  Sekali aja:  cd tes/rules && npm install
//  Jalanin:     cd tes/rules && npm run tes
//  Butuh Java 21 & firebase-tools (npm i -g firebase-tools). Project "demo-..." jadi
//  nggak perlu login Firebase dan nggak nyentuh data beneran.
//
//  Folder ini NGGAK dimuat aplikasi. Kalau firestore.rules diubah, jalanin tes ini,
//  terus tetap Publish manual di Firebase Console (push ke GitHub nggak ngubah rules server).
// =====================================================
import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, deleteDoc, arrayUnion, arrayRemove, deleteField, collection, query, where, getDocs } from "firebase/firestore";

// Email admin awal yang asli sengaja nggak ditulis di repo: firestore.rules cuma nyimpen hash-nya.
// Buat tes, hash di rules diganti sementara dengan hash email contoh ini.
const ADMIN_AWAL = "admin@contoh.id";
const hashTes = createHash("sha256").update(ADMIN_AWAL).digest("hex");
const teksRules = readFileSync(new URL("../../firestore.rules", import.meta.url), "utf8");
const POLA_HASH = /(function hashAdminAwal\(\) \{\s*return )\[[^\]]*\]/;
if (!POLA_HASH.test(teksRules)) throw new Error("hashAdminAwal() di firestore.rules nggak ketemu");
const rulesTes = teksRules.replace(POLA_HASH, `$1['${hashTes}']`);
let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-banksoal",
    firestore: { rules: rulesTes, host: "127.0.0.1", port: 8080 }
  });
});
after(async () => { await env.cleanup(); });

// ---------- data contoh ----------
const sem = { semester: "Ganjil", tahun: "2026/2027", dibuat: 1, diubah: 1 };
const soalPG = { id: "s1", jenis: "PG", teks: "Soal?", pilihan: ["a", "b", "", "", ""], kunci: 0, pertemuanId: null, bacaanId: null };
const modul = (o = {}) => ({ ...sem, judul: "Modul", pemilik: "hasan", namaPemilik: "Ustadz Hasan", dibagikan: true, pertemuan: [], bacaan: [], soal: [soalPG], ...o });
const sumatif = (o = {}) => ({ ...sem, nama: "PTS", pelaksanaan: "", pemilik: "hasan", namaPemilik: "Ustadz Hasan", dibagikan: false, butir: [], ...o });
const usulan = (o = {}) => ({ semester: "Ganjil", tahun: "2026/2027", dibuat: 1, modulId: "m1", soalId: "s1", salinan: { soal: soalPG }, catatan: "", pemilik: "aminah", namaPemilik: "Ustadzah Aminah", ...o });
const lembar = (o = {}) => ({ semester: "Ganjil", tahun: "2026/2027", kolom: [{ id: "k1", kelompok: "uh", label: "UH 1" }], nilai: { s1: { k1: 80 } }, hadir: {}, ...o });
const banyak = (n, x) => Array.from({ length: n }, () => x);

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (c) => {
    const db = c.firestore();
    const isi = {
      "pengguna/tu": { nama: "Admin TU", email: ADMIN_AWAL, peran: "kurikulum" },
      "pengguna/hasan": { nama: "Ustadz Hasan", email: "hasan@x", peran: "ustadz", nip: "123", terakhirMasuk: 1, kolomLama: "x" },
      "pengguna/aminah": { nama: "Ustadzah Aminah", email: "aminah@x", peran: "ustadz" },
      "pengguna/yusuf": { nama: "Ustadz Yusuf", email: "yusuf@x", peran: "ustadz" },
      "pengguna/baru": { nama: "Akun Baru", email: "baru@x", peran: "menunggu" },
      "mapel/bi7a": { pengampu: ["hasan"], grup: "g-bi7" },
      "mapel/bi7b": { pengampu: ["aminah"], grup: "g-bi7" },
      "mapel/fik7": { pengampu: ["yusuf"], grup: "g-fik7" },
      "mapel/tupeng": { pengampu: ["hasan", "tu"], grup: "g-bi7" },
      "grup/g-bi7": { pengampu: ["hasan", "aminah"], koordinator: "hasan" },
      "grup/g-fik7": { pengampu: ["yusuf"], koordinator: "yusuf" },
      "kelas/k7a": { pengampu: ["hasan"] },
      "santri/sa1": { nama: "Siswa", kelasId: "k7a" },
      "mapel/bi7a/modul/m1": modul(),
      "mapel/bi7a/modul/rahasia": modul({ dibagikan: false }),
      "mapel/bi7a/sumatif/s1": sumatif({ dibagikan: true }),
      "mapel/bi7a/nilai/l1": lembar(),
      "grup/g-bi7/uas/u1": { ...sem, nama: "UAS", status: "draf", butir: [], diubahOleh: "hasan" }
    };
    for (const [jalur, data] of Object.entries(isi)) await setDoc(doc(db, jalur), data);
  });
});

// akun yang login (email_verified ikut dikirim kayak token Google)
const sebagai = (uid, email, verified = true) => env.authenticatedContext(uid, { email, email_verified: verified }).firestore();
const anonim = () => env.unauthenticatedContext().firestore();
const tu = () => sebagai("tu", ADMIN_AWAL);
const hasan = () => sebagai("hasan", "hasan@x");
const aminah = () => sebagai("aminah", "aminah@x");
const yusuf = () => sebagai("yusuf", "yusuf@x");
const baca = (db, j) => getDoc(doc(db, j));
const tulis = (db, j, d, o) => setDoc(doc(db, j), d, o);
const hapus = (db, j) => deleteDoc(doc(db, j));

// =====================================================
test("akses anonim: nggak bisa baca / tulis apa pun", async () => {
  for (const j of ["pengguna/hasan", "pengaturan/lembaga", "mapel/bi7a", "mapel/bi7a/modul/m1", "mapel/bi7a/nilai/l1", "santri/sa1", "kelas/k7a", "grup/g-bi7", "grup/g-bi7/uas/u1"]) {
    await assertFails(baca(anonim(), j));
  }
  await assertFails(tulis(anonim(), "mapel/bi7a/modul/m2", modul()));
  await assertFails(tulis(anonim(), "pengguna/x", { nama: "X", email: "x@x", peran: "menunggu" }));
  await assertFails(hapus(anonim(), "mapel/bi7a/modul/m1"));
});

test("akun menunggu persetujuan: belum bisa baca isi", async () => {
  const db = sebagai("baru", "baru@x");
  await assertFails(baca(db, "mapel/bi7a"));
  await assertFails(baca(db, "mapel/bi7a/modul/m1"));
  await assertSucceeds(baca(db, "pengguna/baru"));
});

test("guru di luar grup (Yusuf): nggak bisa lihat / ngubah punya grup lain", async () => {
  await assertFails(baca(yusuf(), "mapel/bi7a/modul/m1"));
  await assertFails(baca(yusuf(), "mapel/bi7a/sumatif/s1"));
  await assertFails(tulis(yusuf(), "mapel/bi7a/modul/m2", modul({ pemilik: "yusuf" })));
  await assertFails(tulis(yusuf(), "mapel/bi7a/modul/m1", modul({ judul: "x" })));
  await assertFails(hapus(yusuf(), "mapel/bi7a/modul/m1"));
  await assertFails(baca(yusuf(), "mapel/bi7a/nilai/l1"));
  await assertFails(tulis(yusuf(), "mapel/bi7a/nilai/l1", { nilai: { s1: { k1: 1 } } }, { merge: true }));
  await assertFails(baca(yusuf(), "grup/g-bi7/uas/u1"));
  await assertFails(tulis(yusuf(), "grup/g-bi7/usulan/x", usulan({ pemilik: "yusuf" })));
  await assertFails(baca(yusuf(), "santri/sa1"));
});

test("guru satu grup (Aminah): lihat yang dibagikan aja", async () => {
  await assertSucceeds(baca(aminah(), "mapel/bi7a/modul/m1"));
  await assertFails(baca(aminah(), "mapel/bi7a/modul/rahasia"));
  await assertFails(tulis(aminah(), "mapel/bi7a/modul/m1", modul({ judul: "x" })));
  await assertFails(baca(aminah(), "mapel/bi7a/nilai/l1"));
  await assertSucceeds(tulis(aminah(), "grup/g-bi7/usulan/x", usulan()));
});

test("pemilik soal (Hasan): bikin, ubah, hapus punya sendiri", async () => {
  await assertSucceeds(tulis(hasan(), "mapel/bi7a/modul/m2", modul()));
  await assertSucceeds(tulis(hasan(), "mapel/bi7a/modul/m1", modul({ soal: [{ ...soalPG, teks: "Baru?" }] })));
  await assertSucceeds(baca(hasan(), "mapel/bi7a/modul/rahasia"));
  await assertFails(tulis(hasan(), "mapel/bi7a/modul/m1", modul({ pemilik: "aminah" })));
  await assertFails(tulis(hasan(), "mapel/bi7a/modul/m3", modul({ pemilik: "aminah" })));
  await assertSucceeds(hapus(hasan(), "mapel/bi7a/modul/m1"));
  await assertFails(tulis(tu(), "mapel/bi7a/modul/rahasia", modul({ judul: "x" })));
  await assertSucceeds(hapus(tu(), "mapel/bi7a/modul/rahasia"));
});

test("data yang melanggar batas ditolak", async () => {
  await assertFails(tulis(hasan(), "mapel/bi7a/modul/m2", modul({ admin: true })));
  await assertFails(tulis(hasan(), "mapel/bi7a/modul/m2", modul({ judul: "x".repeat(201) })));
  await assertFails(tulis(hasan(), "mapel/bi7a/modul/m2", modul({ catatan: "x".repeat(5001) })));
  await assertFails(tulis(hasan(), "mapel/bi7a/modul/m2", modul({ soal: banyak(501, soalPG) })));
  await assertSucceeds(tulis(hasan(), "mapel/bi7a/modul/m2", modul({ soal: banyak(500, soalPG) })));
  await assertFails(tulis(hasan(), "mapel/bi7a/modul/m2", modul({ soal: "x" })));
  await assertFails(tulis(hasan(), "mapel/bi7a/modul/m1", modul({ semester: "Genap" })));
  await assertFails(tulis(hasan(), "mapel/bi7a/modul/m2", modul({ dibagikan: "ya" })));
  await assertFails(tulis(hasan(), "mapel/bi7a/sumatif/s2", sumatif({ butir: banyak(201, {}) })));
  await assertFails(tulis(aminah(), "grup/g-bi7/usulan/x", usulan({ catatan: "x".repeat(2001) })));
  await assertFails(tulis(hasan(), "mapel/bi7a/nilai/l2", lembar({ kolom: banyak(61, {}) })));
});

test("batasan yang memang belum bisa dicek rules: isi tiap soal", async () => {
  // Rules nggak punya perulangan, jadi item rusak di dalam daftar soal lolos.
  // Makanya aplikasi ngamanin datanya waktu dibaca (amankanDok) & ngerapikan waktu nyimpen (rapikanSoal).
  await assertSucceeds(tulis(hasan(), "mapel/bi7a/modul/m2", modul({ soal: [null, "teks", 5] })));
});

test("dokumen di atas 1 MiB ditolak Firestore (makanya aplikasi ngecek ukuranDok dulu)", async () => {
  // yang nolak Firestore-nya sendiri (INVALID_ARGUMENT), bukan rules
  await assert.rejects(tulis(hasan(), "mapel/bi7a/modul/m2", modul({ soal: banyak(250, { ...soalPG, teks: "x".repeat(5000) }) })), /maximum entity size/);
});

test("profil: kolom dikenal, nama ≤ 100, NIP cuma TU", async () => {
  const p = { nama: "Ustadz Hasan", email: "hasan@x", peran: "ustadz", nip: "123", terakhirMasuk: 1, kolomLama: "x" };
  await assertSucceeds(tulis(hasan(), "pengguna/hasan", { ...p, terakhirMasuk: 2 }));   // profil lama (ada kolomLama) tetap bisa
  await assertFails(tulis(hasan(), "pengguna/hasan", { ...p, nama: "x".repeat(101) }));
  await assertFails(tulis(hasan(), "pengguna/hasan", { ...p, admin: true }));
  await assertFails(tulis(hasan(), "pengguna/hasan", { ...p, nip: "999" }));
  await assertFails(tulis(hasan(), "pengguna/hasan", { ...p, peran: "kurikulum" }));
  await assertSucceeds(tulis(tu(), "pengguna/hasan", { ...p, nip: "999", diubahOleh: "tu", diubah: 2 }));
});

test("akun ditolak / nonaktif cuma bisa nyatat terakhirMasuk", async () => {
  const p = { nama: "Akun Nonaktif", email: "mati@x", peran: "nonaktif", terakhirMasuk: 1 };
  await env.withSecurityRulesDisabled(async (c) => { await setDoc(doc(c.firestore(), "pengguna/mati"), p); });
  const db = sebagai("mati", "mati@x");
  await assertSucceeds(tulis(db, "pengguna/mati", { ...p, terakhirMasuk: 2 }));
  await assertFails(tulis(db, "pengguna/mati", { ...p, nama: "Ganti Nama" }));
  await assertSucceeds(tulis(sebagai("baru", "baru@x"), "pengguna/baru", { nama: "Nama Baru", email: "baru@x", peran: "menunggu" }));
});

test("nama pembuat nggak bisa dipalsukan", async () => {
  await assertFails(tulis(hasan(), "mapel/bi7a/modul/m2", modul({ namaPemilik: "Ustadzah Aminah" })));
  await assertSucceeds(tulis(hasan(), "mapel/bi7a/modul/m2", modul()));
  await assertFails(tulis(hasan(), "mapel/bi7a/modul/m1", modul({ namaPemilik: "Ustadzah Aminah" })));
  await assertSucceeds(tulis(hasan(), "mapel/bi7a/modul/m1", modul({ judul: "Baru" })));   // nama nggak berubah: tetap boleh
  await assertFails(tulis(hasan(), "mapel/bi7a/sumatif/s2", sumatif({ namaPemilik: "Admin TU" })));
  await assertFails(tulis(aminah(), "grup/g-bi7/usulan/x", usulan({ namaPemilik: "Ustadz Hasan" })));
  await assertFails(tulis(hasan(), "mapel/bi7a/nilai/l1", { namaPengubah: "Ustadzah Aminah" }, { merge: true }));
  await assertSucceeds(tulis(hasan(), "mapel/bi7a/nilai/l1", { namaPengubah: "Ustadz Hasan", nilai: { s1: { k1: 90 } } }, { merge: true }));
  await assertFails(tulis(hasan(), "grup/g-bi7/uas/u1", { ...sem, nama: "UAS", status: "draf", butir: [], diubahOleh: "hasan", namaPengubah: "Admin TU" }));
  await assertSucceeds(tulis(tu(), "mapel/bi7a/modul/m9", modul()));   // pulihkan cadangan oleh TU: nama asli pemiliknya
});

test("admin awal wajib email terverifikasi", async () => {
  const profil = { nama: "Admin", email: ADMIN_AWAL, foto: "", peran: "kurikulum", dibuat: 1, terakhirMasuk: 1 };
  await assertSucceeds(tulis(sebagai("tu2", ADMIN_AWAL, true), "pengguna/tu2", profil));
  await assertFails(tulis(sebagai("tu3", ADMIN_AWAL, false), "pengguna/tu3", profil));
  await assertFails(tulis(sebagai("x", "x@x"), "pengguna/x", { ...profil, email: "x@x" }));
  await assertSucceeds(tulis(sebagai("x", "x@x"), "pengguna/x", { ...profil, email: "x@x", peran: "menunggu" }));
  await assertFails(tulis(sebagai("x", "x@x"), "pengguna/x", { ...profil, email: "x@x", peran: "menunggu", sapaan: "ustadz" }));
  await assertFails(tulis(sebagai("x", "x@x"), "pengguna/x", { ...profil, email: "x@x", peran: "menunggu", nip: "123" }));
});

test("nilai: disimpan sebagian dari dua perangkat, cuma pengampu", async () => {
  const j = "mapel/bi7a/nilai/l2";
  const kolomBawaan = [{ id: "k-tugas-1", kelompok: "tugas", label: "Tugas 1" }, { id: "k-uh-1", kelompok: "uh", label: "UH 1" }];
  const lembarBaru = (sid, n) => ({ semester: "Ganjil", tahun: "2026/2027", kolom: arrayUnion(...kolomBawaan), nilai: { [sid]: { "k-uh-1": n } } });
  await assertSucceeds(tulis(hasan(), j, lembarBaru("s1", 80), { merge: true }));
  await assertSucceeds(tulis(hasan(), j, lembarBaru("s2", 90), { merge: true }));
  await assertSucceeds(tulis(hasan(), j, { kolom: arrayUnion({ id: "a", kelompok: "uh", label: "UH 2" }) }, { merge: true }));
  await assertSucceeds(tulis(hasan(), j, { kolom: arrayRemove({ id: "a", kelompok: "uh", label: "UH 2" }), nilai: { s1: { "k-uh-1": deleteField() } } }, { merge: true }));
  let isi;
  await env.withSecurityRulesDisabled(async (c) => { isi = (await baca(c.firestore(), j)).data(); });
  assert.deepEqual(isi.kolom.map(k => k.id), ["k-tugas-1", "k-uh-1"], "kolom bawaan nggak dobel, kolom yang dihapus hilang");
  assert.deepEqual(isi.nilai, { s1: {}, s2: { "k-uh-1": 90 } }, "nilai dari dua perangkat digabung");
  await assertFails(tulis(aminah(), j, { nilai: { s1: { k1: 1 } } }, { merge: true }));
  await assertFails(tulis(tu(), j, { nilai: { s1: { k1: 1 } } }, { merge: true }));
  await assertFails(hapus(hasan(), j));
  // admin boleh hapus lembar kapan aja (mapelnya masih ada)
  await assertSucceeds(hapus(tu(), j));
});

test("admin: nyiapin lembar nilai KOSONG boleh, ngisi angka nggak", async () => {
  await assertSucceeds(tulis(tu(), "mapel/bi7a/nilai/kosong", lembar({ nilai: {}, hadir: {} })));
  await assertFails(tulis(tu(), "mapel/bi7a/nilai/kosong", lembar({ nilai: { s1: { k1: 1 } }, hadir: {} })));
  await assertFails(tulis(tu(), "mapel/bi7a/nilai/isi", lembar()));
  await assertFails(tulis(tu(), "mapel/bi7a/nilai/hadir", lembar({ nilai: {}, hadir: { s1: { hadir: 2 } } })));
  // admin yang kebetulan ada di daftar pengampu tetap nggak bisa ngisi angka
  await assertSucceeds(tulis(tu(), "mapel/tupeng/nilai/kosong", lembar({ nilai: {}, hadir: {} })));
  await assertFails(tulis(tu(), "mapel/tupeng/nilai/kosong", { nilai: { s1: { k1: 1 } } }, { merge: true }));
  // guru tetap bisa ngisi lembar yang disiapin admin
  await assertSucceeds(tulis(hasan(), "mapel/bi7a/nilai/kosong", { nilai: { s1: { k1: 90 } } }, { merge: true }));
});

test("pulihkan cadangan: TU boleh BIKIN modul/sumatif/usulan atas nama guru (nilai nggak), nggak boleh ngubah", async () => {
  await assertSucceeds(tulis(tu(), "mapel/bi7a/modul/m9", modul()));
  await assertFails(tulis(tu(), "mapel/bi7a/modul/m1", modul({ judul: "x" })));
  await assertFails(tulis(tu(), "mapel/bi7a/modul/m9b", modul({ soal: banyak(501, soalPG) })));
  await assertSucceeds(tulis(tu(), "mapel/bi7a/sumatif/s9", sumatif()));
  // lembar nilai yang ada angkanya nggak bisa dibikin admin (nggak ikut dipulihkan)
  await assertFails(tulis(tu(), "mapel/bi7a/nilai/l9", lembar()));
  await assertFails(tulis(tu(), "mapel/tupeng/nilai/l9", lembar()));
  await assertFails(tulis(tu(), "mapel/bi7a/nilai/l1", lembar({ nilai: { s1: { k1: 1 } } })));
  await assertSucceeds(tulis(tu(), "grup/g-bi7/usulan/u9", usulan()));
  await assertFails(tulis(aminah(), "mapel/bi7b/modul/m9", modul({ pemilik: "hasan" })));
  await assertFails(tulis(yusuf(), "grup/g-bi7/usulan/u9", usulan({ pemilik: "yusuf" })));
});

test("data admin (pengaturan, kelas, siswa, grup, mapel): ustadz nggak bisa nulis, walau pengampu / koordinator", async () => {
  const db = hasan();   // pengampu bi7a & kelas k7a, koordinator g-bi7
  await assertFails(tulis(db, "pengaturan/lembaga", { nama: "PKBM" }));
  await assertFails(tulis(db, "pengaturan/bobot", { umum: { tugas: 100 } }));
  await assertFails(tulis(db, "kelas/k7a", { pengampu: ["hasan"], kelas: "7A1" }));
  await assertFails(tulis(db, "kelas/k9", { pengampu: ["hasan"] }));
  await assertFails(hapus(db, "kelas/k7a"));
  await assertFails(tulis(db, "santri/sa1", { nama: "Ganti", kelasId: "k7a" }));
  await assertFails(tulis(db, "santri/sa9", { nama: "Baru", kelasId: "k7a" }));
  await assertFails(hapus(db, "santri/sa1"));
  await assertFails(tulis(db, "grup/g-bi7", { pengampu: ["hasan", "aminah"], koordinator: "aminah" }));
  await assertFails(hapus(db, "grup/g-bi7"));
  await assertFails(tulis(db, "mapel/bi7a", { pengampu: ["hasan", "yusuf"], grup: "g-bi7" }));
  await assertFails(tulis(db, "mapel/x9", { pengampu: ["hasan"], grup: "g9" }));
  await assertFails(hapus(db, "mapel/bi7a"));
});

test("data admin: akun menunggu juga nggak bisa nulis", async () => {
  const db = sebagai("baru", "baru@x");
  await assertFails(tulis(db, "pengaturan/lembaga", { nama: "PKBM" }));
  await assertFails(tulis(db, "kelas/k9", { pengampu: ["baru"] }));
  await assertFails(tulis(db, "santri/sa9", { nama: "Baru", kelasId: "k7a" }));
  await assertFails(tulis(db, "grup/g9", { pengampu: ["baru"], koordinator: "baru" }));
  await assertFails(tulis(db, "mapel/x9", { pengampu: ["baru"], grup: "g9" }));
});

test("data admin: TU boleh nulis, tapi nggak boleh jadi pengampu", async () => {
  const db = tu();
  await assertSucceeds(tulis(db, "pengaturan/lembaga", { nama: "PKBM" }));
  await assertSucceeds(tulis(db, "kelas/k7a", { pengampu: ["hasan"], kelas: "7A1" }));
  await assertSucceeds(tulis(db, "santri/sa9", { nama: "Baru", kelasId: "k7a" }));
  await assertSucceeds(tulis(db, "grup/g-bi7", { pengampu: ["hasan", "aminah"], koordinator: "aminah" }));
  await assertSucceeds(tulis(db, "mapel/x9", { pengampu: ["hasan"], grup: "g-bi7" }));
  await assertFails(tulis(db, "mapel/x8", { pengampu: ["tu"], grup: "g-bi7" }));
  await assertSucceeds(hapus(db, "santri/sa1"));
});

test("data admin: isi pengaturan, kelas, grup, mapel dicek bentuknya", async () => {
  const db = tu();
  await assertFails(tulis(db, "pengaturan/lain", { nama: "x" }));
  await assertFails(tulis(db, "pengaturan/lembaga", Object.fromEntries(banyak(61, 0).map((_, i) => [`k${i}`, i]))));
  await assertSucceeds(tulis(db, "pengaturan/wali", { tahun: {} }));
  await assertFails(tulis(db, "kelas/k9", { jenjang: "Paket B", kelas: "7A1", pengampu: [], admin: true }));
  await assertFails(tulis(db, "kelas/k9", { jenjang: "Paket B", kelas: "7A1", pengampu: "hasan" }));
  await assertSucceeds(tulis(db, "kelas/k9", { jenjang: "Paket B", kelas: "7A1", pengampu: ["hasan"] }));
  await assertFails(tulis(db, "grup/g9", { nama: "B. Indonesia", pengampu: [], koordinator: null, x: 1 }));
  await assertFails(tulis(db, "grup/g9", { nama: "B. Indonesia", pengampu: [], koordinator: 5 }));
  await assertSucceeds(tulis(db, "grup/g9", { nama: "B. Indonesia", jenjang: "Paket B", tingkat: 7, pengampu: ["hasan"], koordinator: null }));
  await assertFails(tulis(db, "mapel/x9", { pengampu: banyak(21, "hasan"), grup: "g-bi7" }));
  await assertFails(tulis(db, "mapel/x9", { pengampu: "hasan", grup: "g-bi7" }));
});

test("peran akun: cuma nilai yang dikenal, TU nggak bisa ngubah / hapus akunnya sendiri", async () => {
  const p = { nama: "Ustadz Hasan", email: "hasan@x", peran: "ustadz", nip: "123", terakhirMasuk: 1, kolomLama: "x" };
  await assertFails(tulis(tu(), "pengguna/hasan", { ...p, peran: "superadmin" }));
  await assertSucceeds(tulis(tu(), "pengguna/hasan", { ...p, peran: "nonaktif" }));
  await assertSucceeds(tulis(tu(), "pengguna/hasan", { ...p, peran: "kurikulum" }));
  const saya = { nama: "Admin TU", email: ADMIN_AWAL, peran: "kurikulum" };
  await assertFails(tulis(tu(), "pengguna/tu", { ...saya, peran: "ustadz" }));
  await assertSucceeds(tulis(tu(), "pengguna/tu", { ...saya, terakhirMasuk: 5 }));
  await assertFails(hapus(tu(), "pengguna/tu"));
  await assertSucceeds(hapus(tu(), "pengguna/baru"));
});

// ustadz cuma langganan yang terkait dirinya (hemat kuota baca): query ini harus diterima rules
const daftar = (db, jalur, ...syarat) => getDocs(query(collection(db, jalur), ...syarat.map(([k, op, v]) => where(k, op, v))));

test("hemat kuota: ustadz bisa query mapel / grup / kelas miliknya, akun menunggu nggak", async () => {
  const db = hasan();
  const ampu = await assertSucceeds(daftar(db, "mapel", ["pengampu", "array-contains", "hasan"]));
  assert.deepEqual(ampu.docs.map(d => d.id).sort(), ["bi7a", "tupeng"]);
  const segrup = await assertSucceeds(daftar(db, "mapel", ["grup", "in", ["g-bi7"]]));
  assert.deepEqual(segrup.docs.map(d => d.id).sort(), ["bi7a", "bi7b", "tupeng"]);
  const grup = await assertSucceeds(daftar(db, "grup", ["pengampu", "array-contains", "hasan"]));
  assert.deepEqual(grup.docs.map(d => d.id), ["g-bi7"]);
  const kelas = await assertSucceeds(daftar(db, "kelas", ["pengampu", "array-contains", "hasan"]));
  assert.deepEqual(kelas.docs.map(d => d.id), ["k7a"]);
  const baru = sebagai("baru", "baru@x");
  await assertFails(daftar(baru, "mapel", ["pengampu", "array-contains", "baru"]));
  await assertFails(daftar(baru, "grup", ["pengampu", "array-contains", "baru"]));
  await assertFails(daftar(baru, "kelas", ["pengampu", "array-contains", "baru"]));
});

test("hemat kuota: query per semester diterima rules (modul, sumatif, UAS, usulan)", async () => {
  const sem = [["semester", "==", "Ganjil"], ["tahun", "==", "2026/2027"]];
  // pemilik: punya sendiri; satu grup: yang dibagikan; TU: semuanya
  const milik = await assertSucceeds(daftar(hasan(), "mapel/bi7a/modul", ["pemilik", "==", "hasan"], ...sem));
  assert.deepEqual(milik.docs.map(d => d.id).sort(), ["m1", "rahasia"]);
  await assertSucceeds(daftar(hasan(), "mapel/bi7a/sumatif", ["pemilik", "==", "hasan"], ...sem));
  const bagi = await assertSucceeds(daftar(aminah(), "mapel/bi7a/modul", ["dibagikan", "==", true], ...sem));
  assert.deepEqual(bagi.docs.map(d => d.id), ["m1"]);
  await assertSucceeds(daftar(aminah(), "mapel/bi7a/sumatif", ["dibagikan", "==", true], ...sem));
  const semua = await assertSucceeds(daftar(tu(), "mapel/bi7a/modul", ...sem));
  assert.equal(semua.size, 2);
  // semester lain: kosong, tapi tetap boleh
  const lain = await assertSucceeds(daftar(hasan(), "mapel/bi7a/modul", ["pemilik", "==", "hasan"], ["semester", "==", "Genap"], ["tahun", "==", "2025/2026"]));
  assert.equal(lain.size, 0);
  // tanpa saringan pemilik / dibagikan: ditolak (ada modul tertutup punya orang lain)
  await assertFails(daftar(aminah(), "mapel/bi7a/modul", ...sem));
  // guru di luar grup: ditolak walau minta yang dibagikan
  await assertFails(daftar(yusuf(), "mapel/bi7a/modul", ["dibagikan", "==", true], ...sem));
  // UAS & usulan per semester: anggota grup & TU boleh, bukan anggota nggak
  const uas = await assertSucceeds(daftar(aminah(), "grup/g-bi7/uas", ...sem));
  assert.deepEqual(uas.docs.map(d => d.id), ["u1"]);
  await assertSucceeds(daftar(aminah(), "grup/g-bi7/usulan", ...sem));
  await assertSucceeds(daftar(tu(), "grup/g-bi7/uas", ...sem));
  await assertFails(daftar(yusuf(), "grup/g-bi7/uas", ...sem));
  await assertFails(daftar(yusuf(), "grup/g-bi7/usulan", ...sem));
});

test("modul lama: guru yang udah pindah kelas tetap bisa ngambil modul miliknya di kelas lama", async () => {
  // Hasan udah bukan pengampu bi7a (pindah kelas), modulnya masih atas nama dia
  await env.withSecurityRulesDisabled(async (c) => { await setDoc(doc(c.firestore(), "mapel/bi7a"), { pengampu: ["aminah"], grup: "g-bi7", nama: "Bahasa Indonesia" }); });
  const db = hasan();
  // cari mapel bernama sama (layar "Modul lama saya"), lalu modul miliknya di situ
  await assertSucceeds(daftar(db, "mapel", ["nama", "==", "Bahasa Indonesia"]));
  const milik = await assertSucceeds(daftar(db, "mapel/bi7a/modul", ["pemilik", "==", "hasan"]));
  assert.deepEqual(milik.docs.map(d => d.id).sort(), ["m1", "rahasia"]);
  // modul guru lain yang nggak dibagikan tetap nggak bisa diambil
  await assertFails(daftar(yusuf(), "mapel/bi7a/modul", ["pemilik", "==", "hasan"]));
});
