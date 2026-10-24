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