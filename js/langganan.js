// =====================================================
//  langganan.js — langganan data realtime ke `toko` (toko.js)
//
//  Hemat kuota baca: guru cuma mantau yang terkait dirinya, isi mapel buat TU
//  dimuat waktu dibuka, dan modul/sumatif/UAS/usulan cuma semester yang dibuka
//  (semesterDimuat). Lihat bagian "Kuota Firestore" di CLAUDE.md.
// =====================================================

let langgananData = [];
let langgananMapel = {};      // id mapel → { tanda, henti: [fungsi berhenti] }
let langgananGrup = {};       // id grup → { tanda, henti: [fungsi berhenti] }
let langgananSantri = {};     // id kelas → fungsi berhenti (khusus ustadz)
let peranTerpasang = null;    // peran waktu langganan data dipasang

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
      toko.santri = daftar.sort(bandingNama);
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
  toko.santri = Object.values(santriPerKelas).flat().sort(bandingNama);
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
