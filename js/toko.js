// =====================================================
//  toko.js — "gudang" data di memori + login + langganan data
//
//  Data diambil dari backend (Firebase, atau mode coba) dan terus
//  dipantau: kalau ustadz lain ngubah sesuatu, di sini ikut berubah.
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

  // wali kelas cuma dipakai rapor (admin), jadi guru nggak ikut baca
  if (!guru) langgananData.push(b.pantauDok("pengaturan/wali", d => {
    toko.wali = d || {};
    berubah();
  }, laporGagal("wali kelas")));

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
// TU (hemat kuota): isi mapel (modul, sumatif, nilai) baru dimuat waktu mapelnya dibuka
// (mintaIsiMapel), atau semuanya sekalian lewat mintaIsiSemua (Pantau guru, Rapor, Cari, Perbarui ringkasan).
// Yang udah dimuat tetap dipantau sampai keluar.
const isiDimintaTU = new Set();
let isiSemuaTU = false;
function mintaIsiMapel(ids) {
  if (!sayaKurikulum()) return;
  let baru = false;
  for (const id of ids) if (id && !isiDimintaTU.has(id)) { isiDimintaTU.add(id); baru = true; }
  if (baru && !isiSemuaTU) setTimeout(aturLanggananMapel, 0);   // jangan langganan di tengah nggambar layar
}
function mintaIsiSemua() {
  if (!sayaKurikulum() || isiSemuaTU) return;
  isiSemuaTU = true;
  setTimeout(aturLanggananMapel, 0);
}
// semua isi mapel udah dimuat (buat TU: udah diminta semua & udah kebaca)
function isiSemuaSiap() {
  return (!sayaKurikulum() || isiSemuaTU) && toko.mapel.every(m => isiMapelSiap(m.id));
}

function aturLanggananMapel() {
  const perlu = new Map();
  const kur = sayaKurikulum();
  for (const m of mapelTerlihat()) if (!kur || isiSemuaTU || isiDimintaTU.has(m.id)) perlu.set(m.id, "ampu");
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
  isiDimintaTU.clear();
  isiSemuaTU = false;
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
  toko.wali = {};
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

// ====== BACA: WALI KELAS, NAMA, TERAKHIR DIBUKA, SANTRI & LEMBAR NILAI ======
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
