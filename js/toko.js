// =====================================================
//  toko.js — "gudang" data di memori + login + peran + fungsi baca data
//
//  Data diambil dari backend (Firebase, atau mode coba) dan terus
//  dipantau (langganan.js): kalau ustadz lain ngubah sesuatu, di sini ikut berubah.
//  Layar cukup baca dari `toko`, dan nulis lewat fungsi simpan… di simpan.js.
// =====================================================

const toko = {
  backend: null,
  status: "memuat",   // memuat | keluar | menunggu | aktif | gagal
  pesanGagal: "",
  auth: null,         // akun Google yang lagi masuk: { uid, nama, email, foto }
  saya: null,         // profil di database: { nama, email, peran, ... }
  lembaga: {},        // { nama, waktu }
  bobot: {},          // bobot nilai per jenis mapel: { umum: {...}, diniah: {...} } (diatur admin)
  wali: {},           // wali kelas per tahun (cuma admin): { tahun: { "2026-2027": { idKelas: { uid, nama, nip } } } }
  mapel: [],          // semua mapel
  mapelSiap: false,
  isi: {},            // id mapel → { modulSaya, modulBagi, modulSemua, sumatif, sumatifBagi, nilai, siap, tetangga }
  grup: [],           // grup mapel (mapel + jenjang + tingkat): pengampu semua kelasnya & koordinator UAS
  grupSiap: false,
  uas: {},            // id grup → [UAS bersama per semester]
  usulan: {},         // id grup → [usulan soal UAS dari pengampu]
  santri: [],         // santri (admin: semua; ustadz: cuma kelas yang dia ajar)
  santriSiap: false,
  kelas: [],          // daftar pengampu tiap kelas (buat aturan siapa boleh lihat santri)
  kelasSiap: false,
  kelasGagal: false,  // aturan database lama belum kenal "kelas"
  pengguna: [],       // semua akun (cuma buat admin)
  penggunaSiap: false,
  gagalMuat: []       // nama data yang gagal dipantau (kuota habis, izin, ...): ditampilkan di header
};

// data dasar (mapel, grup, kelas, siswa, dan akun buat admin) udah kebaca semua.
// Belum siap ≠ kosong: layar nampilin kerangka "memuat", bukan "belum ada ...".
function dataDasarSiap() {
  return toko.mapelSiap && toko.grupSiap && toko.kelasSiap && toko.santriSiap &&
    (!sayaKurikulum() || toko.penggunaSiap);
}

let langgananProfil = null;
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
async function buatProfil(akun) {
  const adminAwal = (KONFIG.adminAwalHash || []).includes(await hashEmail(akun.email).catch(() => ""));
  toko.backend.tulis(`pengguna/${akun.uid}`, {
    nama: (akun.nama || akun.email || "").slice(0, 100),
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

// ganti akun / keluar: profil & semua data berhenti dipantau (hentikanData di langganan.js)
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
// UAS & usulan grup sudah selesai dimuat dari database (belum = daftar masih kosong sementara)
function isiGrupSiap(idGrup) {
  const l = langgananGrup[idGrup];
  return !!l && [...semesterDimuat.keys()].every(k => l.isi[k] && l.isi[k].uas !== null && l.isi[k].usulan !== null);
}
function samaSemester(x, sem) {
  return x.semester === sem.semester && x.tahun === sem.tahun;
}
function milikSaya(x) {
  return !!x && x.pemilik === uidSaya();
}

// ====== BACA: WALI KELAS, NAMA, SANTRI & LEMBAR NILAI ======
// (fungsi simpan… ada di simpan.js)

// ====== WALI KELAS (per tahun ajaran) ======
// disimpan di pengaturan/wali: { tahun: { "2026-2027": { idKelas: { uid, nama, nip } } } }.
// Nama & NIP disalin waktu dipilih, biar rapor lama tetap bener walau akunnya berubah / dihapus.
const kunciTahunWali = (tahun) => String(tahun || "").replace("/", "-");
function waliKelas(tahun, idKelasNya) {
  const t = toko.wali && adalahObjek(toko.wali.tahun) ? toko.wali.tahun[kunciTahunWali(tahun)] : null;
  const w = adalahObjek(t) ? t[idKelasNya] : null;
  return adalahObjek(w) && typeof w.uid === "string" && typeof w.nama === "string" ? w : null;
}

function namaSaya() {
  return (toko.saya && toko.saya.nama) || (toko.auth && toko.auth.nama) || "";
}

// ustadz (laki-laki) atau ustadzah (perempuan). Diatur admin di halaman Guru
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
  return toko.santri
    .filter(x => x.jenjang === jenjang && x.kelas === kelas && x.aktif !== false)
    .sort((a, c) => (nomorAbsen(a) - nomorAbsen(c)) || bandingNama(a, c));
}
