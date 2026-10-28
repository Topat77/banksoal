// =====================================================
//  sw.js — "pelayan" yang nyimpen file aplikasi di HP,
//  biar aplikasinya tetap kebuka walau nggak ada sinyal.
//
//  • File aplikasi sendiri: ambil yang terbaru dari internet dulu, selalu
//    dicek ulang ke server (jadi kalau kodenya di-update, langsung kepakai). Kalau sinyal
//    nggak ada / kelamaan, pakai simpanan di HP.
//  • File Firebase & huruf (font) dari Google: pakai simpanan di HP,
//    karena isinya nggak pernah berubah.
//  • Data soal (Firestore) NGGAK lewat sini; itu diurus Firebase sendiri.
//
//  Kalau nambah file baru di aplikasi, tambahkan juga ke daftar INTI.
// =====================================================
const VERSI = "banksoal-v18";
const INTI = [
  "./", "index.html", "style.css", "manifest.webmanifest",
  "ikon-192.png", "ikon-512.png", "ikon-maskable-512.png", "ikon-apple-180.png",
  "js/konfig.js", "js/alat.js", "js/dialog.js", "js/aturan.js", "js/coba.js", "js/toko.js",
  "js/layar.js", "js/mapel.js", "js/saya.js", "js/cari.js", "js/menupilih.js", "js/beranda.js", "js/modul.js", "js/sumatif.js", "js/uas.js", "js/ai.js", "js/kop.js", "js/docx.js", "js/cetak.js", "js/kurikulum.js", "js/cadangan.js", "js/nilai.js", "js/rapor.js",
  "js/firebase.js", "js/mulai.js"
];
const LUAR_TETAP = [/^https:\/\/www\.gstatic\.com\/firebasejs\//, /^https:\/\/fonts\.(googleapis|gstatic)\.com\//];
const BATAS_TUNGGU = 4000; // ms: lebih dari ini, pakai simpanan

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSI).then(c => c.addAll(INTI)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then(semua => Promise.all(semua.filter(k => k !== VERSI).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function denganBatas(janji, ms) {
  return new Promise((berhasil, gagal) => {
    const t = setTimeout(() => gagal(new Error("kelamaan")), ms);
    janji.then(x => { clearTimeout(t); berhasil(x); }, err => { clearTimeout(t); gagal(err); });
  });
}

async function internetDulu(req) {
  const cache = await caches.open(VERSI);
  // "no-cache": selalu tanya server dulu apakah file-nya berubah (cepat, cuma cek),
  // biar update aplikasi langsung kepakai, nggak ketahan simpanan browser 10 menit
  const segar = req.mode === "navigate" ? new Request(req.url, { cache: "no-cache" }) : new Request(req, { cache: "no-cache" });
  const ambil = fetch(segar).then(res => {
    if (res.ok) cache.put(req, res.clone());
    return res;
  });
  try {
    return await denganBatas(ambil, BATAS_TUNGGU);
  } catch {
    const simpanan = await cache.match(req, { ignoreSearch: true })
      || (req.mode === "navigate" ? await cache.match("index.html") : null);
    if (simpanan) return simpanan;
    return ambil; // nggak ada simpanan: tunggu internet aja
  }
}

async function simpananDulu(req) {
  const cache = await caches.open(VERSI);
  const simpanan = await cache.match(req);
  if (simpanan) return simpanan;
  const res = await fetch(req);
  if (res.ok || res.type === "opaque") cache.put(req, res.clone());
  return res;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    e.respondWith(internetDulu(req));
  } else if (LUAR_TETAP.some(p => p.test(req.url))) {
    e.respondWith(simpananDulu(req));
  }
});