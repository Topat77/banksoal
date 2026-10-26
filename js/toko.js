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
  isi: {},            // id mapel → { modulSaya, modulBagi, modulSemua, sumatif, sumatifBagi, nilai, siap, tetangga }
  grup: [],           // grup mapel (mapel + jenjang + tingkat): pengampu semua kelasnya & koordinator UAS
  grupSiap: false,
  uas: {},            // id grup → [UAS bersama per semester]
  usulan: {},         // id grup → [usulan soal UAS dari pengampu]
  santri: [],         // santri (admin: semua; ustadz: cuma kelas yang dia ajar)
  kelas: [],          // daftar pengampu tiap kelas (buat aturan siapa boleh lihat santri)
  kelasSiap: false,
  pengguna: []        // semua akun (cuma buat admin)
};

let langgananProfil = null;
let langgananData = [];
let langgananMapel = {};      // id mapel → { tanda, henti: [fungsi berhenti] }
let langgananGrup = {};       // id grup → { tanda, henti: [fungsi berhenti] }
let langgananSantri = {};     // id kelas → fungsi berhenti (khusus ustadz)
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
    toko.mapelSiap = true;
    aturLanggananMapel();
    aturLanggananGrup();
    aturLanggananSantri();
    sinkronGrup();
    berubah();
  }, laporGagal("mapel")));

  langgananData.push(b.pantauKoleksi("grup", [], daftar => {
    toko.grup = daftar;
    toko.grupSiap = true;
    aturLanggananMapel();
    aturLanggananGrup();
    sinkronGrup();
    berubah();
  }, laporGagal("grup")));

  langgananData.push(b.pantauKoleksi("kelas", [], daftar => {
    toko.kelas = daftar;
    toko.kelasSiap = true;
    aturLanggananSantri();
    sinkronGrup();
    berubah();
  }, (err) => {
    // aturan database versi lama belum kenal "kelas": aplikasi jalan kayak dulu
    // (ustadz baca santri lewat cara lama) sampai aturan baru dipasang
    laporGagal("kelas")(err);
    toko.kelasGagal = true;
    toko.kelasSiap = true;
    aturLanggananSantri();
    sinkronGrup();
    berubah();
  }));

  // santri: admin lihat semua; ustadz cuma kelas yang dia ajar (lihat aturLanggananSantri)
  if (peran === "kurikulum") {
    langgananData.push(b.pantauKoleksi("santri", [], daftar => {
      toko.santri = daftar.sort((a, c) => (a.nama || "").localeCompare(c.nama || "", "id"));
      sinkronGrup();
      berubah();
    }, laporGagal("santri")));
  }

  if (peran === "kurikulum") {
    langgananData.push(b.pantauKoleksi("pengguna", [], daftar => {
      toko.pengguna = daftar;
      berubah();
    }, laporGagal("pengguna")));
  }
}

// tiap mapel yang kelihatan dipantau isinya (modul & sumatif).
// Mapel "tetangga" (kelas lain di grup yang sama, yang nggak diampu) cuma dipantau
// modul & sumatif yang dibagikan.
function aturLanggananMapel() {
  const perlu = new Map();
  for (const m of mapelTerlihat()) perlu.set(m.id, "ampu");
  for (const m of mapelTetangga()) {
    // aturan database baru ngizinin kalau grupnya udah mencatat akun ini sebagai pengampu
    const g = dataGrup(idGrup(m));
    const terdaftar = !!g && (g.pengampu || []).includes(uidSaya()) && m.grup === idGrup(m);
    if (terdaftar) perlu.set(m.id, "tetangga");
  }
  for (const id of Object.keys(langgananMapel)) {
    if (perlu.get(id) !== langgananMapel[id].tanda) {
      langgananMapel[id].henti.forEach(berhenti => berhenti());
      delete langgananMapel[id];
      delete toko.isi[id];
    }
  }
  for (const [id, tanda] of perlu) {
    if (langgananMapel[id]) continue;
    toko.isi[id] = { modulSaya: [], modulBagi: [], modulSemua: null, sumatif: [], sumatifBagi: [], nilai: [], siap: false, tetangga: tanda === "tetangga" };
    langgananMapel[id] = { tanda, henti: tanda === "tetangga" ? pantauIsiTetangga(id) : pantauIsiMapel(id) };
  }
}

function pantauIsiMapel(id) {
  const b = toko.backend;
  const uid = uidSaya();
  const wadah = () => toko.isi[id];
  const jalur = `mapel/${id}`;
  const urut = (d) => d.sort((a, c) => (a.dibuat || 0) - (c.dibuat || 0));
  let jumlahSiap = 0;
  const perluSiap = sayaKurikulum() ? 3 : 5;
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
    b.pantauKoleksi(`${jalur}/sumatif`, [["pemilik", "==", uid]], sekali(d => { if (wadah()) { wadah().sumatif = urut(d); berubah(); } }), laporGagal("sumatif")),
    b.pantauKoleksi(`${jalur}/sumatif`, [["dibagikan", "==", true]], sekali(d => { if (wadah()) { wadah().sumatifBagi = urut(d).filter(s => s.pemilik !== uid); berubah(); } }), laporGagal("sumatif dibagikan"))
  ];
}

// kelas lain di grup yang sama: cuma yang dibagikan
function pantauIsiTetangga(id) {
  const b = toko.backend;
  const wadah = () => toko.isi[id];
  const jalur = `mapel/${id}`;
  const urut = (d) => d.sort((a, c) => (a.dibuat || 0) - (c.dibuat || 0));
  let jumlahSiap = 0;
  const sekali = (f) => { let sudah = false; return (...x) => { f(...x); if (!sudah) { sudah = true; if (++jumlahSiap >= 2 && wadah()) wadah().siap = true; } }; };
  return [
    b.pantauKoleksi(`${jalur}/modul`, [["dibagikan", "==", true]], sekali(d => { if (wadah()) { wadah().modulBagi = urut(d); berubah(); } }), laporGagal("modul kelas lain")),
    b.pantauKoleksi(`${jalur}/sumatif`, [["dibagikan", "==", true]], sekali(d => { if (wadah()) { wadah().sumatifBagi = urut(d); berubah(); } }), laporGagal("sumatif kelas lain"))
  ];
}

// santri buat ustadz: satu langganan per kelas yang dia ajar.
// Aturan database cuma ngizinin kalau kelas itu udah mencatat akun ini sebagai pengampu.
const santriPerKelas = {};
function aturLanggananSantri() {
  if (sayaKurikulum()) return;
  if (toko.kelasGagal) {
    if (!langgananSantri._semua) {
      langgananSantri._semua = toko.backend.pantauKoleksi("santri", [], daftar => {
        santriPerKelas._semua = daftar;
        gabungSantri();
      }, laporGagal("santri"));
    }
    return;
  }
  const perlu = new Set();
  for (const m of mapelDiampu()) {
    const k = dataKelas(idKelas(m.jenjang, m.kelas));
    if (k && (k.pengampu || []).includes(uidSaya())) perlu.add(k.id);
  }
  let ganti = false;
  for (const id of Object.keys(langgananSantri)) {
    if (!perlu.has(id)) { langgananSantri[id](); delete langgananSantri[id]; delete santriPerKelas[id]; ganti = true; }
  }
  for (const id of perlu) {
    if (langgananSantri[id]) continue;
    langgananSantri[id] = toko.backend.pantauKoleksi("santri", [["kelasId", "==", id]], daftar => {
      santriPerKelas[id] = daftar;
      gabungSantri();
    }, laporGagal("santri"));
  }
  if (ganti) gabungSantri();
}
function gabungSantri() {
  toko.santri = Object.values(santriPerKelas).flat().sort((a, c) => (a.nama || "").localeCompare(c.nama || "", "id"));
  berubah();
}

// UAS bersama & usulan soalnya: per grup yang diampu (admin: semua grup)
function aturLanggananGrup() {
  const perlu = new Set();
  if (sayaKurikulum()) toko.grup.forEach(g => perlu.add(g.id));
  else {
    for (const m of mapelDiampu()) {
      const g = dataGrup(idGrup(m));
      if (g && (g.pengampu || []).includes(uidSaya())) perlu.add(g.id);
    }
  }
  for (const id of Object.keys(langgananGrup)) {
    if (!perlu.has(id)) {
      langgananGrup[id].henti.forEach(berhenti => berhenti());
      delete langgananGrup[id];
      delete toko.uas[id];
      delete toko.usulan[id];
    }
  }
  const b = toko.backend;
  for (const id of perlu) {
    if (langgananGrup[id]) continue;
    toko.uas[id] = [];
    toko.usulan[id] = [];
    langgananGrup[id] = { henti: [
      b.pantauKoleksi(`grup/${id}/uas`, [], d => { if (toko.uas[id]) { toko.uas[id] = d; berubah(); } }, laporGagal("UAS")),
      b.pantauKoleksi(`grup/${id}/usulan`, [], d => {
        if (toko.usulan[id]) { toko.usulan[id] = d.sort((a, c) => (a.dibuat || 0) - (c.dibuat || 0)); berubah(); }
      }, laporGagal("usulan UAS"))
    ] };
  }
}

function laporGagal(apa) {
  return (err) => console.warn(`Gagal memantau ${apa}:`, err && (err.code || err.message));
}

function hentikanData() {
  langgananData.forEach(berhenti => berhenti());
  langgananData = [];
  for (const id of Object.keys(langgananMapel)) langgananMapel[id].henti.forEach(berhenti => berhenti());
  langgananMapel = {};
  for (const id of Object.keys(langgananGrup)) langgananGrup[id].henti.forEach(berhenti => berhenti());
  langgananGrup = {};
  for (const id of Object.keys(langgananSantri)) langgananSantri[id]();
  langgananSantri = {};
  for (const id of Object.keys(santriPerKelas)) delete santriPerKelas[id];
  toko.kelas = [];
  toko.kelasSiap = false;
  toko.kelasGagal = false;
  toko.isi = {};
  toko.mapel = [];
  toko.mapelSiap = false;
  toko.grup = [];
  toko.grupSiap = false;
  toko.uas = {};
  toko.usulan = {};
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

// ====== GRUP MAPEL ======
// Mapel yang sama di jenjang & tingkat yang sama satu grup, misal
// Bahasa Indonesia 7A1, 7A2, 7B1, 7B2 (Paket B). Modul, soal, dan sumatif yang
// dibagikan bisa dipakai semua pengampu di grupnya, biar soalnya terstandar.
// Daftar pengampu tiap grup disimpan di grup/{id} (diperbarui otomatis dari
// perangkat admin), karena aturan database butuh daftar itu buat ngasih izin.
function tingkatKelas(kelas) {
  const cocok = String(kelas || "").match(/^\s*(\d+)/);
  return cocok ? cocok[1] : String(kelas || "").trim();
}
function idGrup(mp) {
  const teks = `${mp.jenjang || ""}-${tingkatKelas(mp.kelas)}-${mp.nama || ""}`
    .toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "");
  return teks || "tanpa-nama";
}
// kelas = jenjang + rombel, misal "paket-b-7a1". Dokumen kelas/{id} nyatet pengampu
// semua mapel di kelas itu; aturan database pakai daftar ini buat nentuin
// ustadz mana yang boleh lihat santri kelas tersebut.
function idKelas(jenjang, kelas) {
  const teks = `${jenjang || ""}-${kelas || ""}`.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "");
  return teks || "tanpa-kelas";
}
function dataKelas(id) {
  return toko.kelas.find(k => k.id === id) || null;
}
function namaGrup(mp) {
  return `${mp.nama} kelas ${tingkatKelas(mp.kelas)}`;
}
function dataGrup(gid) {
  return toko.grup.find(g => g.id === gid) || null;
}
// kelas lain yang satu grup dengan mapel ini
function mapelSegrup(mp) {
  const g = idGrup(mp);
  return toko.mapel.filter(x => x.id !== mp.id && idGrup(x) === g);
}
function mapelGrup(gid) {
  return toko.mapel.filter(x => idGrup(x) === gid).sort(bandingKelasMapel);
}
function bandingKelasMapel(a, b) {
  return String(a.kelas).localeCompare(String(b.kelas), "id", { numeric: true });
}
// kelas lain di grup yang mapelnya nggak diampu akun ini (cuma buat ustadz)
function mapelTetangga() {
  if (sayaKurikulum()) return [];
  const saya = mapelDiampu();
  const idSaya = new Set(saya.map(m => m.id));
  const grupSaya = new Set(saya.map(idGrup));
  return toko.mapel.filter(m => !idSaya.has(m.id) && grupSaya.has(idGrup(m)));
}
function koordinatorGrup(gid) {
  const g = dataGrup(gid);
  return g && g.koordinator ? g.koordinator : null;
}
function sayaKoordinator(gid) {
  return !!uidSaya() && koordinatorGrup(gid) === uidSaya();
}

// semua modul yang bisa dipakai di satu mapel: modul mapel ini
// + modul kelas lain di grupnya (punya sendiri, atau yang dibagikan)
function modulGrup(idMapel) {
  const mp = cariMapel(idMapel);
  if (!mp) return modulMapel(idMapel);
  const hasil = new Map();
  for (const x of [mp, ...mapelSegrup(mp)]) {
    for (const m of modulMapel(x.id)) if (!hasil.has(m.id)) hasil.set(m.id, m);
  }
  return [...hasil.values()];
}
// mapel tempat modul / sumatif ini disimpan
function mapelAsal(idIsi) {
  for (const [idMapel, w] of Object.entries(toko.isi)) {
    const semua = [...(w.modulSemua || []), ...w.modulSaya, ...w.modulBagi, ...w.sumatif, ...(w.sumatifBagi || [])];
    if (semua.some(x => x.id === idIsi)) return cariMapel(idMapel);
  }
  return null;
}
function sumatifBagiMapel(idMapel) {
  const w = toko.isi[idMapel];
  return w ? (w.sumatifBagi || []) : [];
}
// sumatif orang lain (atau milik sendiri di kelas lain) yang bisa dilihat & disalin dari mapel ini
function sumatifGrup(idMapel) {
  const mp = cariMapel(idMapel);
  if (!mp) return [];
  const sendiri = new Set(sumatifMapel(idMapel).map(s => s.id));
  const hasil = new Map();
  for (const x of [mp, ...mapelSegrup(mp)]) {
    for (const s of [...sumatifMapel(x.id), ...sumatifBagiMapel(x.id)]) {
      if (!sendiri.has(s.id) && !hasil.has(s.id)) hasil.set(s.id, s);
    }
  }
  return [...hasil.values()].sort((a, c) => (a.dibuat || 0) - (c.dibuat || 0));
}
// modul / sumatif yang boleh diubah dari mapel ini: punya sendiri DAN disimpan di mapel ini
function bisaDiubahDi(idMapel, x, daftar) {
  return milikSaya(x) && daftar.some(y => y.id === x.id);
}

// UAS bersama satu grup di satu semester (id dokumennya sama kayak lembar nilai: "2026-2027_Ganjil")
function uasGrup(gid, sem) {
  return (toko.uas[gid] || []).find(u => u.id === idLembarNilai(sem)) || null;
}
function usulanGrup(gid, sem) {
  return (toko.usulan[gid] || []).filter(u => samaSemester(u, sem));
}

// ---- dari perangkat admin: catat grup tiap mapel & daftar pengampu tiap grup ----
let jadwalSinkron = null;
function sinkronGrup() {
  if (!sayaKurikulum() || !toko.mapelSiap || !toko.grupSiap || !toko.kelasSiap) return;
  clearTimeout(jadwalSinkron);
  jadwalSinkron = setTimeout(jalankanSinkronGrup, 300);
}
function jalankanSinkronGrup() {
  if (!sayaKurikulum()) return;
  const b = toko.backend;
  const peta = new Map();
  for (const m of toko.mapel) {
    const gid = idGrup(m);
    if (m.grup !== gid) b.tulis(`mapel/${m.id}`, tanpaId({ ...m, grup: gid })).catch(gagalSimpan);
    if (!peta.has(gid)) peta.set(gid, { nama: m.nama, jenjang: m.jenjang, tingkat: tingkatKelas(m.kelas), pengampu: new Set() });
    (m.pengampu || []).forEach(u => peta.get(gid).pengampu.add(u));
  }
  // kelas: pengampu semua mapel di kelas itu, dan tiap santri dicatat kelasnya
  const petaKelas = new Map();
  const tambahKelas = (jenjang, kelas) => {
    const id = idKelas(jenjang, kelas);
    if (!petaKelas.has(id)) petaKelas.set(id, { jenjang, kelas, pengampu: new Set() });
    return petaKelas.get(id);
  };
  for (const m of toko.mapel) (m.pengampu || []).forEach(u => tambahKelas(m.jenjang, m.kelas).pengampu.add(u));
  for (const s of toko.santri) {
    tambahKelas(s.jenjang, s.kelas);
    const id = idKelas(s.jenjang, s.kelas);
    if (s.kelasId !== id) b.tulis(`santri/${s.id}`, tanpaId({ ...s, kelasId: id })).catch(gagalSimpan);
  }
  for (const id of toko.kelasGagal ? [] : new Set([...petaKelas.keys(), ...toko.kelas.map(k => k.id)])) {
    const lama = dataKelas(id);
    const x = petaKelas.get(id);
    const baru = x ? { jenjang: x.jenjang, kelas: x.kelas, pengampu: [...x.pengampu].sort() } : { ...tanpaId(lama), pengampu: [] };
    if (!lama || JSON.stringify([lama.jenjang, lama.kelas, lama.pengampu]) !== JSON.stringify([baru.jenjang, baru.kelas, baru.pengampu])) {
      b.tulis(`kelas/${id}`, baru).catch(gagalSimpan);
    }
  }

  const semuaId = new Set([...peta.keys(), ...toko.grup.map(g => g.id)]);
  for (const gid of semuaId) {
    const lama = dataGrup(gid);
    const x = peta.get(gid);
    const pengampu = x ? [...x.pengampu].sort() : [];
    // koordinator yang udah nggak ngampu di grup ini dilepas
    const koordinator = lama && lama.koordinator && pengampu.includes(lama.koordinator) ? lama.koordinator : null;
    const baru = {
      ...(lama ? tanpaId(lama) : {}),
      ...(x ? { nama: x.nama, jenjang: x.jenjang, tingkat: x.tingkat } : {}),
      pengampu, koordinator
    };
    if (!lama || JSON.stringify([lama.nama, lama.jenjang, lama.tingkat, lama.pengampu, lama.koordinator || null]) !==
                 JSON.stringify([baru.nama, baru.jenjang, baru.tingkat, baru.pengampu, baru.koordinator])) {
      b.tulis(`grup/${gid}`, baru).catch(gagalSimpan);
    }
  }
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

// ---- UAS bersama ----
function simpanUAS(gid, uas) {
  const baru = { ...salin(uas), diubah: Date.now(), diubahOleh: uidSaya(), namaPengubah: namaSaya() };
  if (!baru.dibuat) baru.dibuat = Date.now();
  if (toko.uas[gid]) pasangDiDaftar(toko.uas[gid], baru);
  toko.backend.tulis(`grup/${gid}/uas/${baru.id}`, tanpaId(baru)).catch(gagalSimpan);
  berubah();
  return baru;
}
function hapusUAS(gid, id) {
  if (toko.uas[gid]) toko.uas[gid] = toko.uas[gid].filter(u => u.id !== id);
  toko.backend.hapus(`grup/${gid}/uas/${id}`).catch(gagalSimpan);
  berubah();
}
function simpanUsulan(gid, usulan) {
  const baru = { ...salin(usulan), pemilik: uidSaya(), namaPemilik: namaSaya() };
  if (!baru.dibuat) baru.dibuat = Date.now();
  if (toko.usulan[gid]) pasangDiDaftar(toko.usulan[gid], baru);
  toko.backend.tulis(`grup/${gid}/usulan/${baru.id}`, tanpaId(baru)).catch(gagalSimpan);
  berubah();
  return baru;
}
function hapusUsulan(gid, id) {
  if (toko.usulan[gid]) toko.usulan[gid] = toko.usulan[gid].filter(u => u.id !== id);
  toko.backend.hapus(`grup/${gid}/usulan/${id}`).catch(gagalSimpan);
  berubah();
}
// khusus admin: atur koordinator UAS grup
function simpanKoordinator(gid, uid) {
  const lama = dataGrup(gid);
  if (!lama) return;
  const baru = { ...lama, koordinator: uid || null };
  pasangDiDaftar(toko.grup, baru);
  toko.backend.tulis(`grup/${gid}`, tanpaId(baru)).catch(gagalSimpan);
  berubah();
}

// ---- khusus kurikulum ----
function simpanMapelData(mapel) {
  const baru = salin(mapel);
  baru.grup = idGrup(baru);
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
  baru.kelasId = idKelas(baru.jenjang, baru.kelas);
  if (!baru.dibuat) baru.dibuat = Date.now();
  baru.diubah = Date.now();
  pasangDiDaftar(toko.santri, baru);
  toko.santri.sort((a, c) => (a.nama || "").localeCompare(c.nama || "", "id"));
  toko.backend.tulis(`santri/${baru.id}`, tanpaId(baru)).catch(gagalSimpan);
  berubah();
  return baru;
}
// khusus admin: hapus akun dari daftar guru, sekalian dicabut dari pengampu semua mapel.
// (Akun Google-nya tetap ada; kalau login lagi, statusnya jadi "menunggu" lagi.)
function hapusPengguna(uid) {
  for (const m of toko.mapel.filter(m => (m.pengampu || []).includes(uid))) {
    const namaPengampu = { ...(m.namaPengampu || {}) };
    delete namaPengampu[uid];
    simpanMapelData({ ...m, pengampu: m.pengampu.filter(u => u !== uid), namaPengampu });
  }
  toko.pengguna = toko.pengguna.filter(p => p.id !== uid);
  toko.backend.hapus(`pengguna/${uid}`).catch(gagalSimpan);
  berubah();
}

// khusus admin, dipanggil setelah bersihkan data: grup mapel yang udah nggak punya mapel
// (beserta UAS & usulannya) dan kelas yang udah nggak punya mapel maupun siswa ikut dihapus.
function hapusSisaKosong() {
  const b = toko.backend;
  const grupAda = new Set(toko.mapel.map(idGrup));
  for (const g of toko.grup.filter(g => !grupAda.has(g.id))) {
    for (const u of (toko.uas[g.id] || [])) b.hapus(`grup/${g.id}/uas/${u.id}`).catch(gagalSimpan);
    for (const u of (toko.usulan[g.id] || [])) b.hapus(`grup/${g.id}/usulan/${u.id}`).catch(gagalSimpan);
    b.hapus(`grup/${g.id}`).catch(gagalSimpan);
  }
  toko.grup = toko.grup.filter(g => grupAda.has(g.id));
  const kelasAda = new Set([...toko.mapel.map(m => idKelas(m.jenjang, m.kelas)), ...toko.santri.map(s => idKelas(s.jenjang, s.kelas))]);
  for (const k of toko.kelas.filter(k => !kelasAda.has(k.id))) b.hapus(`kelas/${k.id}`).catch(gagalSimpan);
  toko.kelas = toko.kelas.filter(k => kelasAda.has(k.id));
  berubah();
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