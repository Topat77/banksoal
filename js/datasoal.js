// =====================================================
//  datasoal.js — BENTUK DATA: simpan sebagian, ukuran dokumen,
//  data dari database yang diamankan, dan bentuk soal yang sah
// =====================================================

// isinya sama persis? (urutan kolom objek nggak ngaruh, kayak Firestore)
function samaIsi(a, b) {
  if (a === b) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object" || Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every(k => samaIsi(a[k], b[k]));
}

// penanda buat simpan sebagian (ubahSebagian): tambah / buang item di daftar tanpa ngirim
// daftar utuh, jadi yang ditambah dari dua perangkat barengan sama-sama kesimpan.
// Item yang isinya sama persis nggak dobel (kayak arrayUnion / arrayRemove di Firestore).
const tambahKeDaftar = (...isi) => ({ _daftar: "tambah", isi });
const buangDariDaftar = (...isi) => ({ _daftar: "buang", isi });

// ubah satu nilai di dalam objek bertingkat, misal jalur ["nilai", idSantri, idKolom].
// nilai undefined = dihapus; nilai tambahKeDaftar(..) / buangDariDaftar(..) = ubah isi daftar
function pasangDiJalur(obj, jalur, nilai) {
  let o = obj;
  for (const k of jalur.slice(0, -1)) {
    if (!o[k] || typeof o[k] !== "object" || Array.isArray(o[k])) o[k] = {};
    o = o[k];
  }
  const akhir = jalur[jalur.length - 1];
  if (nilai === undefined) delete o[akhir];
  else if (nilai && nilai._daftar) {
    const daftar = Array.isArray(o[akhir]) ? o[akhir] : [];
    o[akhir] = nilai._daftar === "tambah"
      ? [...daftar, ...nilai.isi.filter((x, i) => !daftar.some(y => samaIsi(x, y)) && nilai.isi.findIndex(y => samaIsi(x, y)) === i).map(salin)]
      : daftar.filter(y => !nilai.isi.some(x => samaIsi(x, y)));
  }
  else o[akhir] = salin(nilai);
}

// perkiraan ukuran dokumen di Firestore (byte), cara ngitungnya sama kayak Firestore:
// teks = byte UTF-8 + 1, angka 8, ya/tidak & kosong 1, nama kolom ikut dihitung,
// + 32 byte per dokumen + nama jalurnya (dikira-kira 200). Satu dokumen maksimal 1 MiB.
const BATAS_DOK = { peringatan: 750 * 1024, maks: 900 * 1024 };
function ukuranNilai(x) {
  if (x === null || x === undefined || typeof x === "boolean") return 1;
  if (typeof x === "string") return new TextEncoder().encode(x).length + 1;
  if (typeof x === "number") return 8;
  if (Array.isArray(x)) return x.reduce((n, y) => n + ukuranNilai(y), 0);
  return Object.entries(x).reduce((n, [k, v]) => n + ukuranNilai(k) + ukuranNilai(v), 0);
}
function ukuranDok(isi) {
  return ukuranNilai(isi) + 32 + 200;
}

// ====== DATA DARI DATABASE ======
// Rules nggak bisa ngecek isi tiap item di dalam daftar, jadi modul / ujian bisa aja berisi
// item rusak (null, angka, teks) dari akun lain atau versi lama. Sebelum dipakai layar,
// bentuknya diamankan: item yang bukan objek dibuang, teks dipastikan teks.
// Kolom lain dibiarkan apa adanya (nggak ada data yang dibuang selain item rusak).
const adalahObjek = (x) => !!x && typeof x === "object" && !Array.isArray(x);
const jadiTeks = (x) => typeof x === "string" ? x : typeof x === "number" ? String(x) : "";
const daftarObjek = (x) => Array.isArray(x) ? x.filter(adalahObjek) : [];

function amankanSoal(s) {
  const h = { ...s, id: jadiTeks(s.id), teks: jadiTeks(s.teks) };
  if ("pilihan" in s) h.pilihan = Array.isArray(s.pilihan) ? s.pilihan.map(jadiTeks) : [];
  if ("pedoman" in s) h.pedoman = jadiTeks(s.pedoman);
  return h;
}
function amankanSalinan(x) {
  if (!adalahObjek(x)) return null;
  return {
    ...x,
    soal: adalahObjek(x.soal) ? amankanSoal(x.soal) : null,
    bacaan: adalahObjek(x.bacaan) ? { ...x.bacaan, judul: jadiTeks(x.bacaan.judul), teks: jadiTeks(x.bacaan.teks) } : null
  };
}
// modul / sumatif / UAS / usulan
function amankanDok(d) {
  const h = { ...d };
  for (const k of ["judul", "catatan", "link", "nama", "pelaksanaan", "namaPemilik", "namaPengubah", "status"]) {
    if (k in d) h[k] = jadiTeks(d[k]);
  }
  if ("soal" in d) h.soal = daftarObjek(d.soal).map(amankanSoal);
  if ("bacaan" in d) h.bacaan = daftarObjek(d.bacaan).map(b => ({ ...b, id: jadiTeks(b.id), judul: jadiTeks(b.judul), teks: jadiTeks(b.teks) }));
  if ("pertemuan" in d) h.pertemuan = daftarObjek(d.pertemuan).map(p => ({ ...p, id: jadiTeks(p.id), target: jadiTeks(p.target) }));
  if ("terkait" in d) h.terkait = Array.isArray(d.terkait) ? d.terkait.filter(x => typeof x === "string") : [];
  if ("butir" in d) h.butir = daftarObjek(d.butir).map(b => ({ ...b, modulId: jadiTeks(b.modulId), soalId: jadiTeks(b.soalId), salinan: amankanSalinan(b.salinan) }));
  if ("salinan" in d) h.salinan = amankanSalinan(d.salinan);
  return h;
}

// ====== BENTUK SOAL ======
// Firestore Rules nggak bisa ngecek isi tiap soal di dalam daftar (nggak ada perulangan),
// jadi soal dirapikan di sini sebelum disimpan. Yang dirapikan cuma soal yang lagi
// dibuat / diedit / disalin; soal lain di modul yang sama dibiarkan apa adanya.
//   PG  : { id, jenis: "PG",   teks, pilihan: [5 teks], kunci: 0-4, pertemuanId, bacaanId, dibuat }
//   Esai: { id, jenis: "Esai", teks, pedoman,                       pertemuanId, bacaanId, dibuat }
const BATAS_SOAL = { teks: 5000, pilihan: 1000, pedoman: 5000 };

function rapikanSoal(s) {
  const teks = (x) => typeof x === "string" ? x : "";
  const idAtauNull = (x) => typeof x === "string" && x ? x : null;
  // sama kayak kartuSoal: yang bukan "PG" dianggap esai
  const hasil = { id: String(s.id), jenis: s.jenis === "PG" ? "PG" : "Esai", teks: teks(s.teks) };
  if (hasil.jenis === "PG") {
    hasil.pilihan = HURUF.map((_, i) => teks((s.pilihan || [])[i]));
    hasil.kunci = Number.isInteger(s.kunci) && s.kunci >= 0 && s.kunci < HURUF.length ? s.kunci : 0;
  } else {
    hasil.pedoman = teks(s.pedoman);
  }
  hasil.pertemuanId = idAtauNull(s.pertemuanId);
  hasil.bacaanId = idAtauNull(s.bacaanId);
  if (typeof s.dibuat === "number") hasil.dibuat = s.dibuat;
  return hasil;
}

// pesan galat kalau ada teks soal yang kepanjangan, atau "" kalau aman
function galatPanjangSoal(s) {
  if ((s.teks || "").length > BATAS_SOAL.teks) return `Pertanyaannya terlalu panjang (maks. ${BATAS_SOAL.teks} huruf).`;
  if ((s.pilihan || []).some(x => (x || "").length > BATAS_SOAL.pilihan)) return `Ada pilihan jawaban yang terlalu panjang (maks. ${BATAS_SOAL.pilihan} huruf).`;
  if ((s.pedoman || "").length > BATAS_SOAL.pedoman) return `Pedoman jawabannya terlalu panjang (maks. ${BATAS_SOAL.pedoman} huruf).`;
  return "";
}
