// =====================================================
//  coba.js — MODE COBA
//
//  Dipakai kalau Firebase belum diisi di konfig.js.
//  Semua data disimpan di perangkat ini aja, dan bisa gonta-ganti
//  akun contoh (ustadz / admin / akun baru) buat dicoba atau demo.
//  Cara kerjanya dibikin semirip mungkin sama versi online,
//  termasuk aturan siapa boleh baca/tulis apa (lihat aturan.js).
//  Data contohnya & AI bohongan ada di datacoba.js.
// =====================================================

const KUNCI_COBA = "banksoal-coba-data-v4";   // v4: guru punya NIP
const KUNCI_COBA_AKUN = "banksoal-coba-akun";

const AKUN_CONTOH = [
  { uid: "u-aminah",  nama: "Ustadzah Aminah",  email: "aminah@contoh.id", emailTerverifikasi: true, ket: "Ustadzah, B. Indonesia 7B1 (putri), koordinator UAS B. Indonesia kelas 7" },
  { uid: "u-hasan",   nama: "Ustadz Hasan",     email: "hasan@contoh.id", emailTerverifikasi: true, ket: "Ustadz, mengajar di 7A1 & 8A1 (putra)" },
  { uid: "u-yusuf",   nama: "Ustadz Yusuf",     email: "yusuf@contoh.id", emailTerverifikasi: true, ket: "Ustadz, B. Indonesia 7A2 (satu grup dengan 7A1 & 7B1)" },
  { uid: "u-kur",     nama: "Admin TU",         email: "kurikulum@contoh.id", emailTerverifikasi: true, ket: "Admin (TU): guru, mapel, siswa, bobot, rapor" },
  { uid: "u-baru",    nama: "Ustadz Fadil",     email: "fadil@contoh.id", emailTerverifikasi: true, ket: "Akun baru, belum disetujui" }
];

function buatBackendCoba() {
  let db = bacaLokal(KUNCI_COBA, null);
  if (!db || typeof db !== "object") {
    db = dataAwalCoba();
    tulisLokal(KUNCI_COBA, db);
  }

  let auth = null;
  const akunTersimpan = bacaLokal(KUNCI_COBA_AKUN, null);
  if (akunTersimpan) auth = AKUN_CONTOH.find(a => a.uid === akunTersimpan) || null;

  const aturan = buatAturan(jalur => db[jalur] || null, (email) => email === "kurikulum@contoh.id");
  const pendengarAuth = [];
  let pendengar = [];

  function galat(kode) {
    const e = new Error(kode === "permission-denied" ? "Missing or insufficient permissions." : kode);
    e.code = kode;
    return e;
  }

  function simpanDb() { tulisLokal(KUNCI_COBA, db); }

  function cocok(d, syarat) {
    return syarat.every(([kolom, op, nilai]) => {
      if (op === "==") return d[kolom] === nilai;
      if (op === "array-contains") return Array.isArray(d[kolom]) && d[kolom].includes(nilai);
      if (op === "in") return Array.isArray(nilai) && nilai.includes(d[kolom]);
      throw new Error("operator belum didukung: " + op);
    });
  }

  function isiKoleksi(jalur) {
    const awalan = jalur + "/";
    const ke = jalur.split("/").length + 1;
    return Object.keys(db)
      .filter(k => k.startsWith(awalan) && k.split("/").length === ke)
      .map(k => ({ id: k.split("/").pop(), ...salin(db[k]) }));
  }

  // hitung ulang satu pendengar & panggil callback-nya
  function kabari(p) {
    if (p.mati) return;
    if (p.jenis === "dok") {
      const d = db[p.jalur];
      if (d && !aturan.bolehBaca(p.jalur, d, auth)) return p.gagal(galat("permission-denied"));
      // dokumen yang belum ada: Firestore juga ngecek aturan; kita anggap boleh kalau pemiliknya sendiri
      if (!d && !aturan.bolehBaca(p.jalur, {}, auth) && !p.jalur.startsWith("pengguna/")) return p.gagal(galat("permission-denied"));
      p.cb(d ? { id: p.jalur.split("/").pop(), ...salin(d) } : null, { dariCache: false });
    } else {
      const semua = isiKoleksi(p.jalur).filter(d => cocok(d, p.syarat));
      // aturan bukan saringan: kalau ada SATU yang nggak boleh dibaca, seluruh permintaan ditolak
      const terlarang = semua.some(d => !aturan.bolehBaca(`${p.jalur}/${d.id}`, d, auth));
      // hasil kosong: Firestore tetap ngecek aturan pakai syarat query (misal kelasId == ...)
      const contoh = { pemilik: auth && auth.uid, dibagikan: true, ...Object.fromEntries(p.syarat.filter(([, op]) => op === "==").map(([k, , v]) => [k, v])) };
      if (terlarang || (semua.length === 0 && !aturan.bolehBaca(`${p.jalur}/_`, contoh, auth))) {
        return p.gagal(galat("permission-denied"));
      }
      p.cb(semua, { dariCache: false });
    }
  }

  function kabariSemua() {
    for (const p of pendengar) queueMicrotask(() => kabari(p));
  }

  function pasang(p) {
    p.gagal = p.gagal || (err => console.warn("[coba]", p.jalur, err.code));
    pendengar.push(p);
    queueMicrotask(() => kabari(p));
    return () => {
      p.mati = true;
      pendengar = pendengar.filter(x => x !== p);
    };
  }

  return {
    mode: "coba",
    akunContoh: AKUN_CONTOH,

    pantauAuth(cb) {
      pendengarAuth.push(cb);
      queueMicrotask(() => cb(auth ? { uid: auth.uid, nama: auth.nama, email: auth.email, foto: "" } : null));
    },
    async masuk(uid) {
      const a = AKUN_CONTOH.find(x => x.uid === uid);
      if (!a) throw new Error("Akun contoh tidak ada");
      auth = a;
      tulisLokal(KUNCI_COBA_AKUN, a.uid);
      for (const cb of pendengarAuth) cb({ uid: a.uid, nama: a.nama, email: a.email, foto: "" });
    },
    async keluar() {
      auth = null;
      tulisLokal(KUNCI_COBA_AKUN, null);
      for (const p of pendengar) p.mati = true;
      pendengar = [];
      for (const cb of pendengarAuth) cb(null);
    },

    pantauDok(jalur, cb, gagal) {
      return pasang({ jenis: "dok", jalur, cb, gagal });
    },
    pantauKoleksi(jalur, syarat, cb, gagal) {
      return pasang({ jenis: "koleksi", jalur, syarat: syarat || [], cb, gagal });
    },
    // ambil sekali (nggak dipantau), sama kayak getDocsFromServer
    ambilKoleksi(jalur, syarat) {
      return new Promise((jadi, gagal) => kabari({ jenis: "koleksi", jalur, syarat: syarat || [], cb: jadi, gagal }));
    },

    async tulis(jalur, isiBaru) {
      const lama = db[jalur] || null;
      const baru = salin(isiBaru);
      // ditolak: kabari ulang semua pendengar, biar perubahan yang telanjur tampil dibatalin
      if (!aturan.bolehTulis(jalur, lama, baru, auth)) { kabariSemua(); throw galat("permission-denied"); }
      db[jalur] = baru;
      simpanDb();
      kabariSemua();
    },
    // sama kayak versi online: tulis cuma kalau dokumennya belum ada
    async buatKalauBelumAda(jalur, isiBaru) {
      if (db[jalur]) return false;
      const baru = salin(isiBaru);
      if (!aturan.bolehTulis(jalur, null, baru, auth)) throw galat("permission-denied");
      db[jalur] = baru;
      simpanDb();
      kabariSemua();
      return true;
    },
    // sama kayak versi online: cuma kolom yang disebut yang diubah
    async ubahSebagian(jalur, perubahan) {
      const lama = db[jalur] || null;
      const baru = salin(lama || {});
      for (const [kunci, nilai] of perubahan) pasangDiJalur(baru, kunci, nilai);
      if (!aturan.bolehTulis(jalur, lama, baru, auth)) { kabariSemua(); throw galat("permission-denied"); }
      db[jalur] = baru;
      simpanDb();
      kabariSemua();
    },
    async hapus(jalur) {
      const lama = db[jalur] || null;
      if (!lama) return;
      if (!aturan.bolehTulis(jalur, lama, null, auth)) { kabariSemua(); throw galat("permission-denied"); }
      delete db[jalur];
      simpanDb();
      kabariSemua();
    },

    // AI bohongan: bikin soal contoh dari bahan, biar alurnya bisa dicoba tanpa Firebase.
    // Bentuk jawabannya sama kayak AI beneran (teks JSON).
    async tanyaAI({ bahan }) {
      if (!auth) throw galat("unauthenticated");
      await new Promise(r => setTimeout(r, 900));
      return JSON.stringify(soalContohAI(bahan));
    },

    // khusus mode coba: balikin data contoh seperti semula
    reset() {
      db = dataAwalCoba();
      simpanDb();
      kabariSemua();
    }
  };
}