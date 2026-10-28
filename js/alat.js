// =====================================================
//  alat.js — alat bantu kecil yang dipakai di mana-mana
// =====================================================

const HURUF = ["A", "B", "C", "D", "E"];

// bikin kode unik buat tiap item
let hitungId = 0;
function buatId() {
  hitungId++;
  return Date.now().toString(36) + hitungId.toString(36) + Math.random().toString(36).slice(2, 7);
}

// biar teks ketikan aman dimasukin ke HTML (misal soal "x < 5")
function aman(teks) {
  return String(teks ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// arah tulisan: "rtl" kalau huruf pertamanya huruf Arab, selain itu "ltr"
const HURUF_ARAB = /[֐-ࣿיִ-﷿ﹰ-﻿]/;
function arah(teks) {
  const pertama = (teks || "").match(/[A-Za-zÀ-ɏ֐-ࣿיִ-﷿ﹰ-﻿]/);
  return pertama && HURUF_ARAB.test(pertama[0]) ? "rtl" : "ltr";
}

// potong teks panjang jadi pendek, buat judul/pratinjau
function potong(teks, maks = 60) {
  teks = (teks || "").replace(/\s+/g, " ").trim();
  return teks.length > maks ? teks.slice(0, maks) + "…" : teks;
}

// salinan dalam (biar ngedit salinan nggak ikut ngubah aslinya)
function salin(x) {
  return x === undefined ? undefined : JSON.parse(JSON.stringify(x));
}

// pasang aksi klik ke tombol, kalau tombolnya memang ada di layar
// (banyak tombol cuma muncul buat peran / keadaan tertentu)
function klik(id, f) {
  const el = document.getElementById(id);
  if (el) el.onclick = f;
}

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
  if ((s.teks || "").length > BATAS_SOAL.teks) return `Pertanyaannya kepanjangan (maks. ${BATAS_SOAL.teks} huruf).`;
  if ((s.pilihan || []).some(x => (x || "").length > BATAS_SOAL.pilihan)) return `Ada pilihan jawaban yang kepanjangan (maks. ${BATAS_SOAL.pilihan} huruf).`;
  if ((s.pedoman || "").length > BATAS_SOAL.pedoman) return `Pedoman jawabannya kepanjangan (maks. ${BATAS_SOAL.pedoman} huruf).`;
  return "";
}

// ====== SEMESTER ======
// Juli–Desember = semester Ganjil tahun ini/tahun depan, Januari–Juni = Genap
function semesterSekarang() {
  const t = new Date();
  const y = t.getFullYear();
  return t.getMonth() >= 6
    ? { semester: "Ganjil", tahun: `${y}/${y + 1}` }
    : { semester: "Genap", tahun: `${y - 1}/${y}` };
}
function kunciSemester(x) {           // "2026/2027|Ganjil"
  return `${x.tahun}|${x.semester}`;
}
function dariKunciSemester(kunci) {
  const [tahun, semester] = (kunci || "").split("|");
  return { tahun, semester };
}
function namaSemester(x) {
  return `${x.semester} ${x.tahun}`;
}
// urutan: paling baru dulu (2027/2028 Ganjil, 2026/2027 Genap, 2026/2027 Ganjil, ...)
function bandingSemester(a, b) {
  if (a.tahun !== b.tahun) return a.tahun < b.tahun ? 1 : -1;
  if (a.semester === b.semester) return 0;
  return a.semester === "Genap" ? -1 : 1;
}

// ====== WAKTU ======
function waktuRapi(ms) {
  if (!ms) return "-";
  const beda = Date.now() - ms;
  const menit = Math.floor(beda / 60000);
  if (menit < 1) return "baru saja";
  if (menit < 60) return `${menit} menit lalu`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  const hari = Math.floor(jam / 24);
  if (hari < 7) return `${hari} hari lalu`;
  return new Date(ms).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

// ====== LINK FILE MODUL ======
// ubah link Drive/Docs jadi link pratinjau yang bisa ditempel di halaman
function linkPratinjau(link) {
  if (!link) return null;
  let cocok = link.match(/drive\.google\.com\/file\/d\/([\w-]+)/)
           || link.match(/drive\.google\.com\/open\?id=([\w-]+)/);
  if (cocok) return `https://drive.google.com/file/d/${cocok[1]}/preview`;
  cocok = link.match(/docs\.google\.com\/(document|presentation|spreadsheets)\/d\/([\w-]+)/);
  if (cocok) return `https://docs.google.com/${cocok[1]}/d/${cocok[2]}/preview`;
  return null;
}
function linkAman(link) {
  return /^https?:\/\//i.test(link || "");
}

// ====== CATATAN KECIL DI PERANGKAT INI ======
// (bukan data soal: cuma kebiasaan perangkat, misal "terakhir dibuka")
function bacaLokal(kunci, cadangan) {
  try {
    const v = JSON.parse(localStorage.getItem(kunci));
    return v ?? cadangan;
  } catch {
    return cadangan;
  }
}
function tulisLokal(kunci, nilai) {
  try { localStorage.setItem(kunci, JSON.stringify(nilai)); } catch { /* nggak apa-apa */ }
}

// kasih file: di HP lewat menu Bagikan, di laptop di-download
async function berikanFile(berkas) {
  const diHP = matchMedia("(pointer: coarse)").matches;
  if (diHP && navigator.canShare && navigator.canShare({ files: [berkas] })) {
    try {
      await navigator.share({ files: [berkas], title: berkas.name });
      return true;
    } catch (err) {
      if (err.name === "AbortError") return false;
    }
  }
  const url = URL.createObjectURL(berkas);
  const a = document.createElement("a");
  a.href = url;
  a.download = berkas.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

// ====== PASANG DI HP ======
// Chrome/Android ngasih "ajakan pasang"; disimpan biar bisa dipanggil dari tombol
let ajakanPasang = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  ajakanPasang = e;
});
window.addEventListener("appinstalled", () => { ajakanPasang = null; });
function sudahTerpasang() {
  return matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
}
function diIPhone() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

// ====== MODE TERANG / GELAP ======
// pilihan: "terang", "gelap", atau "" (ikut pengaturan HP)
const KUNCI_TEMA = "banksoal-tema";
const IKON_BULAN = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>`;
const IKON_MATAHARI = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`;
const mediaGelap = matchMedia("(prefers-color-scheme: dark)");

function pilihanTema() {
  try { return localStorage.getItem(KUNCI_TEMA) || ""; } catch { return ""; }
}
function temaSekarang() {
  const p = pilihanTema();
  return p || (mediaGelap.matches ? "gelap" : "terang");
}
function pasangTema(pilihan) {
  try {
    if (pilihan) localStorage.setItem(KUNCI_TEMA, pilihan);
    else localStorage.removeItem(KUNCI_TEMA);
  } catch { /* nggak apa-apa */ }
  if (pilihan) document.documentElement.dataset.tema = pilihan;
  else delete document.documentElement.dataset.tema;
  segarkanTandaTema();
}
function segarkanTandaTema() {
  const gelap = temaSekarang() === "gelap";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = gelap ? "#050C0E" : "#EDF5F1";
  document.querySelectorAll(".tombol-tema").forEach(b => {
    b.innerHTML = gelap ? IKON_MATAHARI : IKON_BULAN;
    b.setAttribute("aria-label", gelap ? "Ganti ke mode terang" : "Ganti ke mode gelap");
    b.title = gelap ? "Mode terang" : "Mode gelap";
  });
}
function tukarTema() {
  pasangTema(temaSekarang() === "gelap" ? "terang" : "gelap");
  // halaman "Saya" punya pilihan tema: gambar ulang biar pilihannya ikut
  if (typeof posisi !== "undefined" && posisi.layar === "lainnya" && typeof tampilkan === "function") tampilkan(true);
}
mediaGelap.addEventListener("change", segarkanTandaTema);
document.addEventListener("click", (e) => {
  if (e.target.closest(".tombol-tema")) tukarTema();
});