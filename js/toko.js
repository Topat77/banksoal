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

// ====== PANTAU DATA ======
// daftar mapel yang kelihatan di perangkat ini udah lengkap
function mapelMasuk(daftar) {
  toko.mapel = daftar.sort((a, c) => (a.nama + a.kelas).localeCompare(c.nama + c.kelas, "id"));
  toko.mapelSiap = true;
  aturLanggananMapel();
  aturLanggananGrup();
  aturLanggananSantri();
  sinkronGrup();
  berubah();
}

// ustadz: mapel yang diampu, lalu (dari grupnya) mapel kelas lain di grup yang sama.
// Firestore "in" maks. 30 nilai, jadi grupnya dipotong per 30.
let mapelAmpu = null;            // null = belum kebaca
let mapelSegrupGuru = {};        // potongan ke-i → daftar mapel (null = belum kebaca)
let langgananSegrup = [];
let grupSegrupTerpasang = null;
let generasiSegrup = 0;          // naik tiap langganan segrup diganti: kabar dari langganan lama diabaikan
function pasangMapelGuru() {
  langgananData.push(toko.backend.pantauKoleksi("mapel", [["pengampu", "array-contains", uidSaya()]], daftar => {
    mapelAmpu = daftar;
    aturLanggananSegrup();
    gabungMapelGuru();
  }, laporGagal("mapel")));
}
function aturLanggananSegrup() {
  const gids = [...new Set(mapelAmpu.map(m => m.grup || idGrup(m)))].sort();
  const kunci = gids.join("|");
  if (kunci === grupSegrupTerpasang) return;
  grupSegrupTerpasang = kunci;
  langgananSegrup.forEach(berhenti => berhenti());
  langgananSegrup = [];
  mapelSegrupGuru = {};
  const gen = ++generasiSegrup;
  for (let i = 0; i < gids.length; i += 30) {
    mapelSegrupGuru[i] = null;
    langgananSegrup.push(toko.backend.pantauKoleksi("mapel", [["grup", "in", gids.slice(i, i + 30)]], daftar => {
      if (gen !== generasiSegrup) return;
      mapelSegrupGuru[i] = daftar;
      gabungMapelGuru();
    }, laporGagal("mapel segrup")));
  }
}
function gabungMapelGuru() {
  if (!mapelAmpu || Object.values(mapelSegrupGuru).some(x => x === null)) return;   // tunggu lengkap
  const peta = new Map();
  for (const m of Object.values(mapelSegrupGuru).flat()) peta.set(m.id, m);
  for (const m of mapelAmpu) peta.set(m.id, m);   // yang diampu paling baru
  mapelMasuk([...peta.values()]);
}

function pasangData(peran) {
  peranTerpasang = peran;
  const sekarang = semesterSekarang();
  semesterDimuat.set(kunciSemester(sekarang), sekarang);
  const b = toko.backend;
  langgananData.push(b.pantauDok("pengaturan/lembaga", d => {
    toko.lembaga = d || {};
    berubah();
  }, laporGagal("pengaturan")));

  langgananData.push(b.pantauDok("pengaturan/bobot", d => {
    toko.bobot = d || {};
    berubah();
  }, laporGagal("bobot")));

  // Hemat kuota baca: admin butuh SEMUA mapel, grup, kelas. Ustadz cuma yang terkait dirinya:
  // mapel yang dia ampu + mapel lain satu grupnya, grup yang dia ikuti, kelas yang dia ajar.
  const guru = peran !== "kurikulum";
  const saringSaya = guru ? [["pengampu", "array-contains", uidSaya()]] : [];

  if (guru) pasangMapelGuru();
  else langgananData.push(b.pantauKoleksi("mapel", [], mapelMasuk, laporGagal("mapel")));

  langgananData.push(b.pantauKoleksi("grup", saringSaya, daftar => {
    toko.grup = daftar;
    toko.grupSiap = true;
    aturLanggananMapel();
    aturLanggananGrup();
    sinkronGrup();
    berubah();
  }, laporGagal("grup")));

  langgananData.push(b.pantauKoleksi("kelas", saringSaya, daftar => {
    toko.kelas = daftar;
    toko.kelasSiap = true;
    aturLanggananSantri();
    sinkronGrup();
    berubah();
  }, (err) => {
    // aturan database versi lama belum kenal "kelas": aplikasi jalan kayak dulu
    // (ustadz baca santri lewat cara lama) sampai aturan baru dipasang
    // (sengaja nggak lewat laporGagal: ini bukan gangguan, nggak perlu tanda merah di header)
    console.warn("Gagal memantau kelas:", err && (err.code || err.message));
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
      toko.santriSiap = true;
      sinkronGrup();
      berubah();
    }, laporGagal("santri")));
  }

  if (peran === "kurikulum") {
    langgananData.push(b.pantauKoleksi("pengguna", [], daftar => {
      toko.pengguna = daftar;
      toko.penggunaSiap = true;
      berubah();
      // hash email dihitung dulu, biar tombol hapus akun admin awal bisa disembunyiin (akunBisaDihapus)
      const belum = daftar.filter(p => emailAdminAwal(p.email) === null);
      if (belum.length) Promise.all(belum.map(p => hashEmail(p.email))).then(() => berubah()).catch(() => {});
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
      hentiLangganan(langgananMapel[id]);
      delete langgananMapel[id];
      delete toko.isi[id];
    }
  }
  for (const [id, tanda] of perlu) {
    if (langgananMapel[id]) continue;
    const tetangga = tanda === "tetangga";
    toko.isi[id] = { modulSaya: [], modulBagi: [], modulSemua: null, sumatif: [], sumatifBagi: [], nilai: [],
      siap: false, nilaiSiap: tetangga, tetangga, per: {} };
    langgananMapel[id] = { tanda, henti: tetangga ? [] : [pantauNilai(id)], per: {} };
    for (const k of semesterDimuat.keys()) pasangSemesterMapel(id, k);
  }
}
// langganan satu mapel / grup: yang umum (henti) + yang per semester (per)
function hentiLangganan(L) {
  L.henti.forEach(berhenti => berhenti());
  Object.values(L.per).flat().forEach(berhenti => berhenti());
}

// ====== SEMESTER YANG DIMUAT ======
// Hemat kuota baca: modul, sumatif, UAS & usulan cuma dimuat buat semester yang dipakai
// (awalnya semester sekarang). Semester lain dimuat waktu dibuka (pastikanSemester, dipanggil
// tampilkan() & layar yang milih semester), lalu tetap dipantau sampai keluar.
// Lembar nilai tetap dimuat semua semester: kecil, dan dipakai daftar semester & rapor.
const semesterDimuat = new Map();   // kunciSemester → { semester, tahun }
function saringSemester(sem) {
  return [["semester", "==", sem.semester], ["tahun", "==", sem.tahun]];
}
function pastikanSemester(sem) {
  if (!sem || !sem.semester || !sem.tahun) return;
  const k = kunciSemester(sem);
  if (semesterDimuat.has(k)) return;
  semesterDimuat.set(k, { semester: sem.semester, tahun: sem.tahun });
  for (const id of Object.keys(langgananMapel)) pasangSemesterMapel(id, k);
  for (const id of Object.keys(langgananGrup)) pasangSemesterGrup(id, k);
  for (const id of Object.keys(toko.isi)) gabungIsi(id);
  berubah();
}
// isi satu semester di satu mapel udah kebaca
function isiSemesterSiap(idMapel, sem) {
  const w = toko.isi[idMapel];
  const p = w && w.per[kunciSemester(sem)];
  return !!p && p.siap;
}
// tunggu satu semester kebaca (misal buat ngecek modul kembar sebelum nyalin). Offline / lama: lanjut aja.
function tungguSemester(idMapel, sem, batas = 10000) {
  pastikanSemester(sem);
  const mulai = Date.now();
  return new Promise(selesai => {
    const cek = () => (isiSemesterSiap(idMapel, sem) || Date.now() - mulai > batas) ? selesai() : setTimeout(cek, 150);
    cek();
  });
}

// modul / ujian dari database: item rusak diamankan dulu (amankanDok di datasoal.js),
// lalu diurut dari yang paling lama dibuat
function urutIsi(d) {
  return d.map(amankanDok).sort((a, c) => (a.dibuat || 0) - (c.dibuat || 0));
}
// lembar nilai: dibaca pengampu & kurikulum (lihat aturan). Semua semester.
function pantauNilai(id) {
  return toko.backend.pantauKoleksi(`mapel/${id}/nilai`, [], d => {
    const w = toko.isi[id];
    if (!w) return;
    w.nilai = d;
    w.nilaiSiap = true;
    gabungIsi(id);
    berubah();
  }, laporGagal("nilai"));
}

// modul & sumatif satu semester di satu mapel.
//   admin   : semua modul & sumatif
//   ustadz  : punya sendiri + yang dibagikan
//   tetangga: (kelas lain di grup yang sama, nggak diampu) cuma yang dibagikan
function pasangSemesterMapel(id, k) {
  const L = langgananMapel[id], w = toko.isi[id];
  if (!L || !w || L.per[k]) return;
  const uid = uidSaya();
  const saring = saringSemester(semesterDimuat.get(k));
  const pemilik = [["pemilik", "==", uid]], dibagikan = [["dibagikan", "==", true]];
  // [koleksi, syarat, kolom di wadah, nama buat pesan gagal]
  const jenis = L.tanda === "tetangga"
    ? [["modul", dibagikan, "modulBagi", "modul kelas lain"], ["sumatif", dibagikan, "sumatifBagi", "sumatif kelas lain"]]
    : sayaKurikulum()
      ? [["modul", [], "modulSemua", "modul"], ["sumatif", [], "sumatif", "sumatif"]]
      : [["modul", pemilik, "modulSaya", "modul saya"], ["modul", dibagikan, "modulBagi", "modul dibagikan"],
         ["sumatif", pemilik, "sumatif", "sumatif"], ["sumatif", dibagikan, "sumatifBagi", "sumatif dibagikan"]];
  const p = w.per[k] = { modulSaya: [], modulBagi: [], modulSemua: [], sumatif: [], sumatifBagi: [], siap: false };
  let sisa = jenis.length;
  L.per[k] = jenis.map(([koleksi, syarat, kolom, nama]) => {
    let pertama = true;
    return toko.backend.pantauKoleksi(`mapel/${id}/${koleksi}`, [...syarat, ...saring], d => {
      if (toko.isi[id] !== w) return;   // langganan lama
      let isi = urutIsi(d);
      // sumatif dibagikan punya sendiri udah ada di "sumatif"
      if (kolom === "sumatifBagi" && L.tanda !== "tetangga") isi = isi.filter(s => s.pemilik !== uid);
      p[kolom] = isi;
      if (pertama) { pertama = false; if (--sisa === 0) p.siap = true; }
      gabungIsi(id);
      berubah();
    }, laporGagal(nama));
  });
}

// daftar di wadah = gabungan semua semester yang dimuat. Siap kalau nilai & tiap semester udah kebaca.
function gabungIsi(id) {
  const w = toko.isi[id];
  if (!w) return;
  const per = [...semesterDimuat.keys()].map(k => w.per[k]).filter(Boolean);
  const satukan = (kolom) => per.flatMap(p => p[kolom]).sort((a, c) => (a.dibuat || 0) - (c.dibuat || 0));
  w.modulSaya = satukan("modulSaya");
  w.modulBagi = satukan("modulBagi");
  w.sumatif = satukan("sumatif");
  w.sumatifBagi = satukan("sumatifBagi");
  if (sayaKurikulum() && !w.tetangga) w.modulSemua = satukan("modulSemua");
  w.siap = w.nilaiSiap && per.length === semesterDimuat.size && per.every(p => p.siap);
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
  cekSantriSiap();
}
function gabungSantri() {
  toko.santri = Object.values(santriPerKelas).flat().sort((a, c) => (a.nama || "").localeCompare(c.nama || "", "id"));
  cekSantriSiap();
  berubah();
}
// ustadz: siswa siap kalau mapel & kelas udah kebaca dan tiap kelas yang dipantau udah ngirim daftarnya
function cekSantriSiap() {
  const siap = toko.mapelSiap && toko.kelasSiap && Object.keys(langgananSantri).every(id => id in santriPerKelas);
  if (siap && !toko.santriSiap) { toko.santriSiap = true; berubah(); }
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
      hentiLangganan(langgananGrup[id]);
      delete langgananGrup[id];
      delete toko.uas[id];
      delete toko.usulan[id];
    }
  }
  for (const id of perlu) {
    if (langgananGrup[id]) continue;
    toko.uas[id] = [];
    toko.usulan[id] = [];
    langgananGrup[id] = { henti: [], per: {}, isi: {} };
    for (const k of semesterDimuat.keys()) pasangSemesterGrup(id, k);
  }
}
// UAS & usulan satu semester di satu grup
function pasangSemesterGrup(id, k) {
  const L = langgananGrup[id];
  if (!L || L.per[k]) return;
  const saring = saringSemester(semesterDimuat.get(k));
  const p = L.isi[k] = { uas: null, usulan: null };   // null = belum kebaca
  const gabung = () => {
    if (langgananGrup[id] !== L) return;   // langganan lama
    const per = [...semesterDimuat.keys()].map(x => L.isi[x]).filter(Boolean);
    toko.uas[id] = per.flatMap(x => x.uas || []);
    toko.usulan[id] = per.flatMap(x => x.usulan || []).sort((a, c) => (a.dibuat || 0) - (c.dibuat || 0));
    berubah();
  };
  L.per[k] = [
    toko.backend.pantauKoleksi(`grup/${id}/uas`, saring, d => { p.uas = d.map(amankanDok); gabung(); }, laporGagal("UAS")),
    toko.backend.pantauKoleksi(`grup/${id}/usulan`, saring, d => { p.usulan = urutIsi(d); gabung(); }, laporGagal("usulan UAS"))
  ];
}

// langganan yang gagal nggak nyoba lagi sendiri, jadi dicatat & ditampilkan di header (ada tombol muat ulang)
function laporGagal(apa) {
  return (err) => {
    console.warn(`Gagal memantau ${apa}:`, err && (err.code || err.message));
    if (!toko.gagalMuat.includes(apa)) toko.gagalMuat.push(apa);
    if (typeof gambarTanda === "function") gambarTanda();
    berubah();
  };
}

function hentikanData() {
  langgananData.forEach(berhenti => berhenti());
  langgananData = [];
  langgananSegrup.forEach(berhenti => berhenti());
  langgananSegrup = [];
  mapelSegrupGuru = {};
  mapelAmpu = null;
  grupSegrupTerpasang = null;
  generasiSegrup++;
  for (const id of Object.keys(langgananMapel)) hentiLangganan(langgananMapel[id]);
  langgananMapel = {};
  for (const id of Object.keys(langgananGrup)) hentiLangganan(langgananGrup[id]);
  langgananGrup = {};
  semesterDimuat.clear();
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
  toko.santriSiap = false;
  toko.pengguna = [];
  toko.penggunaSiap = false;
  toko.gagalMuat = [];
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

// ====== TULIS DATA ======
// Perubahan langsung dipasang di memori (biar layar cepat),
// terus dikirim ke backend. Kalau backend nolak, dikasih tau.
function gagalSimpan(err) {
  console.error(err);
  const kode = err && err.code;
  if (kode === "permission-denied") {
    kabar("Gagal menyimpan: perubahan ini ditolak.\n\nMungkin kamu sudah bukan pengampu mapel ini, atau isinya melebihi batas (misalnya judul terlalu panjang atau soalnya lebih dari 500). Kalau masih bingung, hubungi admin (TU).");
  } else {
    kabar("Gagal menyimpan.\n\n" + (err && err.message ? err.message : err));
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

// Firestore nolak dokumen di atas 1 MiB, jadi yang kegedean ditolak di sini, sebelum dikirim.
// Yang nggak nambah gede (misal hapus soal) tetap boleh, biar modul kegedean masih bisa dikecilin.
// hasilnya false kalau nggak boleh disimpan
const sudahDiingatkanUkuran = new Set();
function muatDiDok(baru, lama, jenis) {
  const ukuran = ukuranDok(tanpaId(baru));
  const kb = (n) => Math.round(n / 1024);
  if (ukuran > BATAS_DOK.maks && (!lama || ukuran > ukuranDok(tanpaId(lama)))) {
    kabar(`${jenis} ini kegedean (±${kb(ukuran)} KB, batasnya ±${kb(BATAS_DOK.maks)} KB), jadi perubahan ini NGGAK disimpan.\n\nPecah jadi dua ${jenis.toLowerCase()}, atau pendekin teks bacaan / soal yang panjang.`);
    return false;
  }
  if (ukuran > BATAS_DOK.peringatan && !sudahDiingatkanUkuran.has(baru.id)) {
    sudahDiingatkanUkuran.add(baru.id);
    kabar(`${jenis} ini udah ±${kb(ukuran)} KB, mendekati batas ±${kb(BATAS_DOK.maks)} KB. Soal berikutnya sebaiknya ditaruh di ${jenis.toLowerCase()} baru.`);
  }
  return true;
}

// hasilnya null kalau nggak disimpan (kegedean)
function simpanModul(idMapel, modul) {
  const baru = { ...salin(modul), pemilik: uidSaya(), namaPemilik: namaSaya(), diubah: Date.now() };
  if (!baru.dibuat) baru.dibuat = Date.now();
  if (!muatDiDok(baru, modulMapel(idMapel).find(m => m.id === baru.id), "Modul")) return null;
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
  if (!muatDiDok(baru, sumatifMapel(idMapel).find(s => s.id === baru.id), "Ujian")) return null;
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
  if (!muatDiDok(baru, (toko.uas[gid] || []).find(u => u.id === baru.id), "UAS")) return null;
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
  if (!muatDiDok(baru, (toko.usulan[gid] || []).find(u => u.id === baru.id), "Usulan")) return null;
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

// ambil isi LENGKAP satu mapel (semua semester) dari server; null kalau gagal (offline / jatah habis).
// Modul & sumatif cuma dimuat buat semester yang dibuka, jadi buat hapus mapel harus ambil ini dulu.
async function ambilIsiMapel(idMapel) {
  try {
    const [modul, sumatif] = await Promise.all([
      toko.backend.ambilKoleksi(`mapel/${idMapel}/modul`, []),
      toko.backend.ambilKoleksi(`mapel/${idMapel}/sumatif`, [])
    ]);
    return { modul: modul.map(amankanDok), sumatif: sumatif.map(amankanDok) };
  } catch (err) {
    console.warn("Gagal ambil isi mapel:", err);
    return null;
  }
}

// isi: hasil ambilIsiMapel() (semua semester), biar modul & sumatif semester lain nggak jadi yatim
function hapusMapelData(idMapel, isi) {
  // isi mapel belum selesai dimuat: daftar nilai masih kosong sementara, jadi yang ada di database bakal ketinggalan
  if (!isi || !isiMapelSiap(idMapel)) return false;
  // dokumen mapel dihapus dulu, baru isinya satu-satu (database nggak ngehapus isi otomatis;
  // aturan baru boleh ngehapus lembar nilai kalau mapelnya sudah nggak ada).
  // Nggak ditunggu: tanpa sinyal, penghapusan antre dan dikirim nanti.
  toko.backend.hapus(`mapel/${idMapel}`).catch(gagalSimpan);
  for (const m of isi.modul) toko.backend.hapus(`mapel/${idMapel}/modul/${m.id}`).catch(gagalSimpan);
  for (const s of isi.sumatif) toko.backend.hapus(`mapel/${idMapel}/sumatif/${s.id}`).catch(gagalSimpan);
  for (const n of (toko.isi[idMapel] ? toko.isi[idMapel].nilai : [])) toko.backend.hapus(`mapel/${idMapel}/nilai/${n.id}`).catch(gagalSimpan);
  toko.mapel = toko.mapel.filter(m => m.id !== idMapel);
  aturLanggananMapel();
  berubah();
  return true;
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

// pantau (opsional): fungsi yang nerima promise hasil tulis ke server, buat yang mau ngitung berhasil / gagal
// (status "menyimpan / tersimpan / gagal" di panel keputusan naik kelas). Tanpa pantau, galatnya langsung ditampilin lewat gagalSimpan.
function simpanSantri(santri, pantau) {
  const baru = salin(santri);
  // lulus / pindah: kelasId dicopot, biar nggak ikut dibaca guru kelas mana pun
  if (baru.aktif === false && (baru.status === "lulus" || baru.status === "pindah")) delete baru.kelasId;
  else baru.kelasId = idKelas(baru.jenjang, baru.kelas);
  if (!baru.dibuat) baru.dibuat = Date.now();
  baru.diubah = Date.now();
  pasangDiDaftar(toko.santri, baru);
  toko.santri.sort((a, c) => (a.nama || "").localeCompare(c.nama || "", "id"));
  const janji = Promise.resolve(toko.backend.tulis(`santri/${baru.id}`, tanpaId(baru)));
  if (typeof pantau === "function") pantau(janji);
  else janji.catch(gagalSimpan);
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

// khusus admin, dipanggil setelah mapel dihapus: grup mapel yang udah nggak punya mapel
// (beserta UAS & usulannya) dan kelas yang udah nggak punya mapel maupun siswa ikut dihapus.
// Sengaja nggak lewat sinkron otomatis, biar ganti nama mapel nggak ngehapus riwayat UAS.
async function hapusSisaKosong() {
  const b = toko.backend;
  const grupAda = new Set(toko.mapel.map(idGrup));
  // grup yang dilewati (gagal diambil, atau ada UAS yang sudah dikunci di semester mana pun) dibiarkan utuh
  const dilewati = new Set();
  for (const g of toko.grup.filter(g => !grupAda.has(g.id))) {
    let uas, usulan;
    try {
      [uas, usulan] = await Promise.all([b.ambilKoleksi(`grup/${g.id}/uas`, []), b.ambilKoleksi(`grup/${g.id}/usulan`, [])]);
    } catch (err) {
      console.warn("Gagal ambil UAS grup, dilewati:", err);
      dilewati.add(g.id); continue;
    }
    if (uas.map(amankanDok).some(u => u.status === "dikunci")) { dilewati.add(g.id); continue; }
    for (const u of uas) b.hapus(`grup/${g.id}/uas/${u.id}`).catch(gagalSimpan);
    for (const u of usulan) b.hapus(`grup/${g.id}/usulan/${u.id}`).catch(gagalSimpan);
    b.hapus(`grup/${g.id}`).catch(gagalSimpan);
  }
  toko.grup = toko.grup.filter(g => grupAda.has(g.id) || dilewati.has(g.id));
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
// simpan sebagian lembar nilai: cuma sel yang berubah yang dikirim, biar isian dari HP lain
// (atau pengampu lain) nggak ketimpa. perubahan: [[jalur], nilai], nilai undefined = dihapus.
// Lembar yang belum pernah tersimpan juga dikirim sebagian: semester & tahun diisi, kolomnya
// DITAMBAHKAN (bukan ditimpa), jadi dua HP yang bikin lembar yang sama pas offline digabung.
function simpanNilaiSebagian(idMapel, lembar, perubahan) {
  const w = toko.isi[idMapel];
  const lama = w ? (w.nilai || []).find(x => x.id === lembar.id) : null;
  const tanda = { diubah: Date.now(), diubahOleh: uidSaya(), namaPengubah: namaSaya() };
  // Lembar baru: lembar.kolom udah berisi hasil akhirnya (kolom yang ditambah / dibuang ikut),
  // jadi perubahan ke "kolom" dibuang. Kalau ikut dikirim, Firebase cuma make yang terakhir
  // (satu kolom dokumen = satu nilai), dan kolom bawaannya hilang.
  const kolomLembar = ([jalur]) => jalur.length === 1 && jalur[0] === "kolom";
  const semua = [
    ...(lama ? [] : [[["semester"], lembar.semester], [["tahun"], lembar.tahun], [["kolom"], tambahKeDaftar(...lembar.kolom)]]),
    ...(lama ? perubahan : perubahan.filter(p => !kolomLembar(p))),
    ...Object.entries(tanda).map(([k, v]) => [[k], v])
  ];
  const baru = lama ? salin(lama) : { id: lembar.id };
  for (const [jalur, nilai] of semua) pasangDiJalur(baru, jalur, nilai);
  if (w) pasangDiDaftar(w.nilai, baru);
  toko.backend.ubahSebagian(`mapel/${idMapel}/nilai/${lembar.id}`, semua).catch(gagalSimpan);
  berubah();
  return baru;
}