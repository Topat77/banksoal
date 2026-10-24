// =====================================================
//  toko.js — "gudang" data di memori + login + simpan
//
//  Data diambil dari backend (Firebase, atau mode coba) dan terus
//  dipantau: kalau ustadz lain ngubah sesuatu, di sini ikut berubah.
//  Layar cukup baca dari `toko`, dan nulis lewat fungsi simpan… di bawah.
// =====================================================

const toko = {
  backend: null,
  status: "memuat",   // memuat | keluar | menunggu | aktif | gagal
  pesanGagal: "",
  auth: null,         // akun Google yang lagi masuk: { uid, nama, email, foto }
  saya: null,         // profil di database: { nama, email, peran, ... }
  lembaga: {},        // { nama, waktu }
  bobot: {},          // bobot nilai per jenis mapel: { umum: {...}, diniah: {...} } (diatur admin)
  mapel: [],          // semua mapel
  isi: {},            // id mapel → { modulSaya, modulBagi, modulSemua, sumatif, nilai, siap }
  santri: [],         // semua santri (buat lembar nilai & rapor)
  pengguna: []        // semua akun (cuma buat admin)
};

let langgananProfil = null;
let langgananData = [];
let langgananMapel = {};      // id mapel → [fungsi berhenti]
let peranTerpasang = null;    // peran waktu langganan data dipasang
let sudahCatatMasuk = false;

// peran "kurikulum" = admin (dipegang TU): akun, mapel, santri, bobot, pantauan, rapor
const PERAN_AKTIF = ["ustadz", "kurikulum"];

function uidSaya() { return toko.auth ? toko.auth.uid : null; }
function sayaKurikulum() { return !!toko.saya && toko.saya.peran === "kurikulum"; }
function namaPeran(peran) {
  return { kurikulum: "Admin (TU)", ustadz: "Ustadz/ustadzah" }[peran] || peran;
}

// ====== MULAI ======
function mulaiAplikasi(backend) {
  toko.backend = backend;
  backend.pantauAuth(akunBerubah);
}

function akunBerubah(akun) {
  hentikanSemua();
  toko.auth = akun;
  toko.saya = null;
  sudahCatatMasuk = false;

  if (!akun) {
    toko.status = "keluar";
    berubah(true);
    return;
  }
  toko.status = "memuat";
  berubah(true);

  langgananProfil = toko.backend.pantauDok(`pengguna/${akun.uid}`, (d, meta) => {
    if (!d) {
      // dari cache doang belum tentu beneran nggak ada; tunggu jawaban server
      if (meta && meta.dariCache) return;
      buatProfil(akun);
      return;
    }
    toko.saya = d;
    catatMasuk(d);
    aturStatus();
  }, (err) => {
    toko.status = "gagal";
    toko.pesanGagal = "Gagal membaca akun: " + (err.message || err);
    berubah(true);
  });
}

// akun yang baru pertama kali masuk: daftar dengan status "menunggu"
function buatProfil(akun) {
  const adminAwal = (KONFIG.adminAwal || []).map(e => e.toLowerCase()).includes((akun.email || "").toLowerCase());
  toko.backend.tulis(`pengguna/${akun.uid}`, {
    nama: akun.nama || akun.email,
    email: akun.email,
    foto: akun.foto || "",
    peran: adminAwal ? "kurikulum" : "menunggu",
    dibuat: Date.now(),
    terakhirMasuk: Date.now()
  }).catch(err => {
    toko.status = "gagal";
    toko.pesanGagal = "Gagal mendaftarkan akun: " + (err.message || err);
    berubah(true);
  });
}

// catat kapan terakhir masuk (sekali tiap buka aplikasi), biar kurikulum bisa ngecek
function catatMasuk(d) {
  if (sudahCatatMasuk) return;
  sudahCatatMasuk = true;
  const { id, ...isi } = d;
  toko.backend.tulis(`pengguna/${toko.auth.uid}`, { ...isi, terakhirMasuk: Date.now() }).catch(() => {});
}

function aturStatus() {
  const peran = toko.saya.peran;
  const statusLama = toko.status;
  let peranGanti = false;
  if (PERAN_AKTIF.includes(peran)) {
    if (peranTerpasang !== peran) {
      peranGanti = peranTerpasang !== null;
      hentikanData();
      pasangData(peran);
    }
    toko.status = "aktif";
  } else {
    hentikanData();
    toko.status = "menunggu";
  }
  // gambar ulang penuh cuma kalau status/peran berubah (misal baru disetujui);
  // ganti nama / catat waktu masuk cukup segarkan biasa
  berubah(statusLama !== toko.status || peranGanti || toko.status === "menunggu");
}

// ====== PANTAU DATA ======
function pasangData(peran) {
  peranTerpasang = peran;
  const b = toko.backend;
  langgananData.push(b.pantauDok("pengaturan/lembaga", d => {
    toko.lembaga = d || {};
    berubah();
  }, laporGagal("pengaturan")));

  langgananData.push(b.pantauDok("pengaturan/bobot", d => {
    toko.bobot = d || {};
    berubah();
  }, laporGagal("bobot")));

  langgananData.push(b.pantauKoleksi("mapel", [], daftar => {
    toko.mapel = daftar.sort((a, c) => (a.nama + a.kelas).localeCompare(c.nama + c.kelas, "id"));
    aturLanggananMapel();
    berubah();
  }, laporGagal("mapel")));

  langgananData.push(b.pantauKoleksi("santri", [], daftar => {
    toko.santri = daftar.sort((a, c) => (a.nama || "").localeCompare(c.nama || "", "id"));
    berubah();
  }, laporGagal("santri")));

  if (peran === "kurikulum") {
    langgananData.push(b.pantauKoleksi("pengguna", [], daftar => {
      toko.pengguna = daftar;
      berubah();
    }, laporGagal("pengguna")));
  }
}

// tiap mapel yang kelihatan dipantau isinya (modul & sumatif)
function aturLanggananMapel() {
  const perlu = new Set(mapelTerlihat().map(m => m.id));
  for (const id of Object.keys(langgananMapel)) {
    if (!perlu.has(id)) {
      langgananMapel[id].forEach(berhenti => berhenti());
      delete langgananMapel[id];
      delete toko.isi[id];
    }
  }
  for (const id of perlu) {
    if (langgananMapel[id]) continue;
    toko.isi[id] = { modulSaya: [], modulBagi: [], modulSemua: null, sumatif: [], nilai: [], siap: false };
    langgananMapel[id] = pantauIsiMapel(id);
  }
}

function pantauIsiMapel(id) {
  const b = toko.backend;
  const uid = uidSaya();
  const wadah = () => toko.isi[id];
  const jalur = `mapel/${id}`;
  const urut = (d) => d.sort((a, c) => (a.dibuat || 0) - (c.dibuat || 0));
  let jumlahSiap = 0;
  const perluSiap = sayaKurikulum() ? 3 : 4;
  const tandaiSiap = () => { if (++jumlahSiap >= perluSiap && wadah()) wadah().siap = true; };
  const sekali = (f) => { let sudah = false; return (...x) => { f(...x); if (!sudah) { sudah = true; tandaiSiap(); } }; };

  // lembar nilai: dibaca pengampu & kurikulum (lihat aturan)
  const nilai = b.pantauKoleksi(`${jalur}/nilai`, [], sekali(d => { if (wadah()) { wadah().nilai = d; berubah(); } }), laporGagal("nilai"));

  if (sayaKurikulum()) {
    return [nilai,
      b.pantauKoleksi(`${jalur}/modul`, [], sekali(d => { if (wadah()) { wadah().modulSemua = urut(d); berubah(); } }), laporGagal("modul")),
      b.pantauKoleksi(`${jalur}/sumatif`, [], sekali(d => { if (wadah()) { wadah().sumatif = urut(d); berubah(); } }), laporGagal("sumatif"))
    ];
  }
  return [nilai,
    b.pantauKoleksi(`${jalur}/modul`, [["pemilik", "==", uid]], sekali(d => { if (wadah()) { wadah().modulSaya = urut(d); berubah(); } }), laporGagal("modul saya")),
    b.pantauKoleksi(`${jalur}/modul`, [["dibagikan", "==", true]], sekali(d => { if (wadah()) { wadah().modulBagi = urut(d); berubah(); } }), laporGagal("modul dibagikan")),
    b.pantauKoleksi(`${jalur}/sumatif`, [["pemilik", "==", uid]], sekali(d => { if (wadah()) { wadah().sumatif = urut(d); berubah(); } }), laporGagal("sumatif"))
  ];
}

function laporGagal(apa) {
  return (err) => console.warn(`Gagal memantau ${apa}:`, err && (err.code || err.message));
}

function hentikanData() {
  langgananData.forEach(berhenti => berhenti());
  langgananData = [];
  for (const id of Object.keys(langgananMapel)) langgananMapel[id].forEach(berhenti => berhenti());
  langgananMapel = {};
  toko.isi = {};
  toko.mapel = [];
  toko.santri = [];
  toko.pengguna = [];
  toko.lembaga = {};
  toko.bobot = {};
  peranTerpasang = null;
}

function hentikanSemua() {
  if (langgananProfil) langgananProfil();
  langgananProfil = null;
  hentikanData();
}

// ====== KABARI LAYAR ======
// banyak perubahan berdekatan digabung jadi satu kali gambar ulang
let jadwalGambar = null;
let perluGambarPenuh = false;
function berubah(penuh = false) {
  if (penuh) perluGambarPenuh = true;
  if (jadwalGambar) return;
  jadwalGambar = setTimeout(() => {
    jadwalGambar = null;
    const p = perluGambarPenuh;
    perluGambarPenuh = false;
    if (typeof segarkanLayar === "function") segarkanLayar(p);
  }, 0);
}

// ====== BACA DATA ======
function mapelDiampu() {
  const uid = uidSaya();
  return toko.mapel.filter(m => (m.pengampu || []).includes(uid));
}
function mapelTerlihat() {
  return sayaKurikulum() ? toko.mapel : mapelDiampu();
}
// kelas yang diajar akun ini: "Paket B|7A1"
function kelasDiajar() {
  return new Set(mapelDiampu().map(m => `${m.jenjang}|${m.kelas}`));
}
function cariMapel(id) {
  return toko.mapel.find(m => m.id === id) || null;
}
function sayaPengampu(mapel) {
  return !!mapel && (mapel.pengampu || []).includes(uidSaya());
}

// semua modul yang boleh dilihat di satu mapel (punya sendiri + dibagikan, atau semua buat kurikulum)
function modulMapel(idMapel) {
  const w = toko.isi[idMapel];
  if (!w) return [];
  if (w.modulSemua) return w.modulSemua;
  const peta = new Map();
  for (const m of w.modulBagi) peta.set(m.id, m);
  for (const m of w.modulSaya) peta.set(m.id, m);   // punya sendiri yang paling baru
  return [...peta.values()].sort((a, c) => (a.dibuat || 0) - (c.dibuat || 0));
}
function sumatifMapel(idMapel) {
  const w = toko.isi[idMapel];
  return w ? w.sumatif : [];
}
function isiMapelSiap(idMapel) {
  const w = toko.isi[idMapel];
  return !!w && w.siap;
}
function samaSemester(x, sem) {
  return x.semester === sem.semester && x.tahun === sem.tahun;
}
function milikSaya(x) {
  return !!x && x.pemilik === uidSaya();
}

// ====== TULIS DATA ======
// Perubahan langsung dipasang di memori (biar layar cepat),
// terus dikirim ke backend. Kalau backend nolak, dikasih tau.
function gagalSimpan(err) {
  console.error(err);
  const kode = err && err.code;
  if (kode === "permission-denied") {
    alert("Gagal menyimpan: kamu nggak punya izin untuk perubahan ini.\n\nMungkin kamu sudah bukan pengampu mapel ini. Hubungi admin (TU).");
  } else {
    alert("Gagal menyimpan.\n\n" + (err && err.message ? err.message : err));
  }
  berubah(true);
}

function tanpaId(x) {
  const { id, ...isi } = x;
  return isi;
}

function pasangDiDaftar(daftar, x) {
  const i = daftar.findIndex(y => y.id === x.id);
  if (i >= 0) daftar[i] = x;
  else daftar.push(x);
}

function simpanModul(idMapel, modul) {
  const baru = { ...salin(modul), pemilik: uidSaya(), namaPemilik: namaSaya(), diubah: Date.now() };
  if (!baru.dibuat) baru.dibuat = Date.now();
  const w = toko.isi[idMapel];
  if (w) {
    if (w.modulSemua) pasangDiDaftar(w.modulSemua, baru);
    else {
      pasangDiDaftar(w.modulSaya, baru);
      w.modulBagi = w.modulBagi.filter(m => m.id !== baru.id);
      if (baru.dibagikan) w.modulBagi.push(baru);
    }
  }
  toko.backend.tulis(`mapel/${idMapel}/modul/${baru.id}`, tanpaId(baru)).catch(gagalSimpan);
  berubah();
  return baru;
}

function hapusModul(idMapel, idModul) {
  const w = toko.isi[idMapel];
  if (w) {
    for (const k of ["modulSaya", "modulBagi"]) w[k] = w[k].filter(m => m.id !== idModul);
    if (w.modulSemua) w.modulSemua = w.modulSemua.filter(m => m.id !== idModul);
  }
  toko.backend.hapus(`mapel/${idMapel}/modul/${idModul}`).catch(gagalSimpan);
  berubah();
}

function simpanSumatif(idMapel, sum) {
  const baru = { ...salin(sum), pemilik: uidSaya(), namaPemilik: namaSaya(), diubah: Date.now() };
  if (!baru.dibuat) baru.dibuat = Date.now();
  const w = toko.isi[idMapel];
  if (w) pasangDiDaftar(w.sumatif, baru);
  toko.backend.tulis(`mapel/${idMapel}/sumatif/${baru.id}`, tanpaId(baru)).catch(gagalSimpan);
  berubah();
  return baru;
}

function hapusSumatif(idMapel, idSum) {
  const w = toko.isi[idMapel];
  if (w) w.sumatif = w.sumatif.filter(s => s.id !== idSum);
  toko.backend.hapus(`mapel/${idMapel}/sumatif/${idSum}`).catch(gagalSimpan);
  berubah();
}

// ---- khusus kurikulum ----
function simpanMapelData(mapel) {
  const baru = salin(mapel);
  if (!baru.dibuat) baru.dibuat = Date.now();
  pasangDiDaftar(toko.mapel, baru);
  aturLanggananMapel();
  toko.backend.tulis(`mapel/${baru.id}`, tanpaId(baru)).catch(gagalSimpan);
  berubah();
  return baru;
}

function hapusMapelData(idMapel) {
  // isi mapel dihapus dulu satu-satu (database nggak ngehapus isi otomatis).
  // Nggak ditunggu: tanpa sinyal, penghapusan antre dan dikirim nanti.
  for (const m of modulMapel(idMapel)) toko.backend.hapus(`mapel/${idMapel}/modul/${m.id}`).catch(gagalSimpan);
  for (const s of sumatifMapel(idMapel)) toko.backend.hapus(`mapel/${idMapel}/sumatif/${s.id}`).catch(gagalSimpan);
  for (const n of (toko.isi[idMapel] ? toko.isi[idMapel].nilai : [])) toko.backend.hapus(`mapel/${idMapel}/nilai/${n.id}`).catch(gagalSimpan);
  toko.mapel = toko.mapel.filter(m => m.id !== idMapel);
  aturLanggananMapel();
  toko.backend.hapus(`mapel/${idMapel}`).catch(gagalSimpan);
  berubah();
}

function simpanPengguna(uid, data) {
  const baru = salin(data);
  pasangDiDaftar(toko.pengguna, { id: uid, ...baru });
  if (uid === uidSaya()) toko.saya = { id: uid, ...baru };
  toko.backend.tulis(`pengguna/${uid}`, tanpaId(baru)).catch(gagalSimpan);
  berubah();
}

function simpanBobot(data) {
  toko.bobot = salin(data);
  toko.backend.tulis("pengaturan/bobot", salin(data)).catch(gagalSimpan);
  berubah();
}

function simpanLembaga(data) {
  toko.lembaga = salin(data);
  toko.backend.tulis("pengaturan/lembaga", salin(data)).catch(gagalSimpan);
  berubah();
}

function namaSaya() {
  return (toko.saya && toko.saya.nama) || (toko.auth && toko.auth.nama) || "";
}

// ustadz (laki-laki) atau ustadzah (perempuan). Diatur admin di halaman Akun
// atau sendiri di halaman Saya; kalau belum diatur, ditebak dari nama.
const SAPAAN = { ustadz: "Ustadz", ustadzah: "Ustadzah" };
function sapaanPengguna(p) {
  if (!p) return null;
  if (p.sapaan === "ustadz" || p.sapaan === "ustadzah") return p.sapaan;
  const n = (p.nama || "").trim().toLowerCase();
  if (/^(ustadzah|ustazah|ustdzh|ustzh|ustz|bu|ibu|umi|ummi)\b/.test(n)) return "ustadzah";
  if (/^(ustadz|ustaz|ustd|ust|pak|bapak|abi)\b/.test(n)) return "ustadz";
  return null;
}

function namaPengguna(uid) {
  const p = toko.pengguna.find(x => x.id === uid);
  return p ? p.nama : "";
}

// ====== TERAKHIR DIBUKA (per perangkat & per akun) ======
function kunciTerakhir() { return `banksoal-terakhir-${uidSaya()}`; }
function ambilTerakhir() { return bacaLokal(kunciTerakhir(), []); }
function catatTerakhir(jenis, mapelId, id) {
  const daftar = ambilTerakhir().filter(x => !(x.jenis === jenis && x.id === id));
  daftar.unshift({ jenis, mapelId, id, waktu: Date.now() });
  tulisLokal(kunciTerakhir(), daftar.slice(0, 8));
}

// ====== SANTRI & NILAI ======
// id lembar nilai satu semester: "2026-2027_Ganjil"
function idLembarNilai(sem) {
  return `${String(sem.tahun).replace(/\//g, "-")}_${sem.semester}`;
}
function lembarNilai(idMapel, sem) {
  const w = toko.isi[idMapel];
  return w ? (w.nilai || []).find(x => x.id === idLembarNilai(sem)) || null : null;
}
// urut No. Absen (yang belum punya nomor di belakang), lalu nama
function santriKelas(jenjang, kelas) {
  const nomor = (x) => x.absen === undefined || x.absen === null || x.absen === "" ? Infinity : Number(x.absen);
  return toko.santri
    .filter(x => x.jenjang === jenjang && x.kelas === kelas && x.aktif !== false)
    .sort((a, c) => (nomor(a) - nomor(c)) || (a.nama || "").localeCompare(c.nama || "", "id"));
}

function simpanSantri(santri) {
  const baru = salin(santri);
  if (!baru.dibuat) baru.dibuat = Date.now();
  baru.diubah = Date.now();
  pasangDiDaftar(toko.santri, baru);
  toko.santri.sort((a, c) => (a.nama || "").localeCompare(c.nama || "", "id"));
  toko.backend.tulis(`santri/${baru.id}`, tanpaId(baru)).catch(gagalSimpan);
  berubah();
  return baru;
}
function hapusSantri(id) {
  toko.santri = toko.santri.filter(x => x.id !== id);
  toko.backend.hapus(`santri/${id}`).catch(gagalSimpan);
  berubah();
}
function simpanLembarNilai(idMapel, lembar) {
  const baru = { ...salin(lembar), diubah: Date.now(), diubahOleh: uidSaya(), namaPengubah: namaSaya() };
  const w = toko.isi[idMapel];
  if (w) pasangDiDaftar(w.nilai, baru);
  toko.backend.tulis(`mapel/${idMapel}/nilai/${baru.id}`, tanpaId(baru)).catch(gagalSimpan);
  berubah();
  return baru;
}