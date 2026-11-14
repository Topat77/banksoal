// =====================================================
//  aturan.js — siapa boleh baca/tulis apa
//
//  Ini SALINAN dari firestore.rules dalam bentuk JavaScript.
//  Dipakai mode coba, biar aplikasinya berperilaku persis kayak
//  versi online. Kalau ngubah aturan, ubah DUA-DUANYA.
// =====================================================

// cekAdminAwal(email) → true kalau email ini admin awal (versi online: dicocokin lewat hash SHA-256)
function buatAturan(ambilDok, cekAdminAwal) {
  const profil = (auth) => auth ? ambilDok(`pengguna/${auth.uid}`) : null;
  const aktif = (auth) => {
    const p = profil(auth);
    return !!p && (p.peran === "ustadz" || p.peran === "kurikulum");
  };
  const kurikulum = (auth) => aktif(auth) && profil(auth).peran === "kurikulum";
  const pengampu = (auth, idMapel) => {
    const m = ambilDok(`mapel/${idMapel}`);
    return !!m && Array.isArray(m.pengampu) && m.pengampu.includes(auth.uid);
  };
  const anggotaGrup = (auth, idGrup) => {
    const g = idGrup ? ambilDok(`grup/${idGrup}`) : null;
    return !!g && Array.isArray(g.pengampu) && g.pengampu.includes(auth.uid);
  };
  const koordinatorGrup = (auth, idGrup) => {
    const g = idGrup ? ambilDok(`grup/${idGrup}`) : null;
    return !!g && (g.koordinator || null) === auth.uid;
  };
  const segrup = (auth, idMapel) => {
    const m = ambilDok(`mapel/${idMapel}`);
    return !!m && anggotaGrup(auth, m.grup);
  };

  // ---- validasi isi dokumen (sama dengan fungsi-fungsi "Valid" di firestore.rules) ----
  const sama = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const ada = (d, k) => Object.prototype.hasOwnProperty.call(d, k);
  const jenisPeta = (x) => !!x && typeof x === "object" && !Array.isArray(x);
  function kolomDikenal(lama, baru, daftar) {
    if (!lama) return Object.keys(baru).every(k => daftar.includes(k));
    const berubah = new Set([...Object.keys(baru), ...Object.keys(lama)]);
    return [...berubah].filter(k => !sama(lama[k], baru[k])).every(k => daftar.includes(k));
  }
  const tetap = (lama, baru, k) => !lama || !ada(lama, k) || (ada(baru, k) && sama(baru[k], lama[k]));
  const teks = (d, k, maks) => !ada(d, k) || (typeof d[k] === "string" && d[k].length <= maks);
  const teksAtauKosong = (d, k, maks) => !ada(d, k) || d[k] === null || teks(d, k, maks);
  const daftar = (d, k, maks) => !ada(d, k) || (Array.isArray(d[k]) && d[k].length <= maks);
  const peta = (d, k, maks) => !ada(d, k) || d[k] === null || (jenisPeta(d[k]) && Object.keys(d[k]).length <= maks);
  const angka = (d, k) => !ada(d, k) || typeof d[k] === "number";
  const yaTidak = (d, k) => !ada(d, k) || typeof d[k] === "boolean";
  const semesterTetap = (lama, b) =>
    teks(b, "semester", 20) && teks(b, "tahun", 20) && tetap(lama, b, "semester") && tetap(lama, b, "tahun") &&
    tetap(lama, b, "dibuat") && angka(b, "dibuat") && angka(b, "diubah") &&
    (!ada(b, "semester") || ["Ganjil", "Genap"].includes(b.semester)) &&
    (!ada(b, "tahun") || (typeof b.tahun === "string" && /^[0-9]{4}\/[0-9]{4}$/.test(b.tahun)));
  const modulValid = (lama, b) =>
    kolomDikenal(lama, b, ["semester", "tahun", "judul", "catatan", "link", "pemilik", "namaPemilik",
      "dibagikan", "pertemuan", "bacaan", "soal", "terkait", "lanjutanDari", "dibuat", "diubah"]) &&
    semesterTetap(lama, b) &&
    teks(b, "judul", 200) && teks(b, "catatan", 5000) && teks(b, "link", 500) && teks(b, "namaPemilik", 100) &&
    yaTidak(b, "dibagikan") && teksAtauKosong(b, "lanjutanDari", 100) &&
    daftar(b, "pertemuan", 100) && daftar(b, "bacaan", 50) && daftar(b, "soal", 500) && daftar(b, "terkait", 50);
  const sumatifValid = (lama, b) =>
    kolomDikenal(lama, b, ["semester", "tahun", "nama", "pelaksanaan", "pemilik", "namaPemilik",
      "dibagikan", "butir", "disalinDari", "dibuat", "diubah"]) &&
    semesterTetap(lama, b) &&
    teks(b, "nama", 200) && teks(b, "pelaksanaan", 200) && teks(b, "namaPemilik", 100) &&
    yaTidak(b, "dibagikan") && daftar(b, "butir", 200) && peta(b, "disalinDari", 5);
  const uasValid = (lama, b, auth) =>
    kolomDikenal(lama, b, ["semester", "tahun", "nama", "pelaksanaan", "status", "butir",
      "dibuat", "diubah", "diubahOleh", "namaPengubah", "diajukan"]) &&
    semesterTetap(lama, b) &&
    teks(b, "nama", 200) && teks(b, "pelaksanaan", 200) && teks(b, "namaPengubah", 100) &&
    b.diubahOleh === auth.uid && daftar(b, "butir", 200) && angka(b, "diajukan");
  const usulanValid = (lama, b) =>
    kolomDikenal(lama, b, ["semester", "tahun", "modulId", "soalId", "salinan", "catatan",
      "pemilik", "namaPemilik", "dibuat"]) &&
    semesterTetap(lama, b) &&
    teks(b, "modulId", 100) && teks(b, "soalId", 100) && teks(b, "catatan", 2000) && teks(b, "namaPemilik", 100) &&
    peta(b, "salinan", 10);
  const nilaiValid = (lama, b) =>
    semesterTetap(lama, b) && daftar(b, "kolom", 60) && peta(b, "nilai", 300) && peta(b, "hadir", 300) &&
    teks(b, "namaPengubah", 100);
  // lembar nilai kosong (belum ada angka & kehadiran): yang boleh disiapin admin
  const kosongPeta = (d, k) => !ada(d, k) || d[k] === null || (jenisPeta(d[k]) && Object.keys(d[k]).length === 0);
  const lembarKosong = (b) => kosongPeta(b, "nilai") && kosongPeta(b, "hadir");
  // profil akun: ukuran cuma dicek kalau kolomnya berubah, biar profil lama tetap bisa di-update
  const nilaiKolom = (d, k) => ada(d, k) ? d[k] : null;
  const PERAN_SAH = ["menunggu", "ustadz", "kurikulum", "ditolak", "nonaktif"];
  const berubahKolom = (lama, b, k) => !lama || ada(lama, k) !== ada(b, k) || !sama(lama[k], b[k]);
  const profilValid = (lama, b) =>
    kolomDikenal(lama, b, ["nama", "email", "foto", "peran", "sapaan", "nip",
      "dibuat", "terakhirMasuk", "diubah", "diubahOleh"]) &&
    (!berubahKolom(lama, b, "nama") || (typeof b.nama === "string" && b.nama.length <= 100)) &&
    (!berubahKolom(lama, b, "nip") || teksAtauKosong(b, "nip", 30)) &&
    (!berubahKolom(lama, b, "foto") || teks(b, "foto", 2000)) &&
    (!berubahKolom(lama, b, "peran") || PERAN_SAH.includes(nilaiKolom(b, "peran")));
  const pengaturanValid = (id, b) => ["lembaga", "bobot", "wali"].includes(id) && Object.keys(b).length <= 60;
  const kelasValid = (lama, b) =>
    kolomDikenal(lama, b, ["jenjang", "kelas", "pengampu", "wali"]) &&
    teks(b, "jenjang", 50) && teks(b, "kelas", 50) && daftar(b, "pengampu", 300) &&
    teksAtauKosong(b, "wali", 128);
  // guru di kelas ini: pengampu salah satu mapelnya, atau wali kelasnya
  const guruKelas = (auth, idKelas) => {
    const k = idKelas ? ambilDok(`kelas/${idKelas}`) : null;
    return !!k && ((Array.isArray(k.pengampu) && k.pengampu.includes(auth.uid)) || (k.wali || null) === auth.uid);
  };
  const waliKelasDari = (auth, idKelas) => {
    const k = typeof idKelas === "string" ? ambilDok(`kelas/${idKelas}`) : null;
    return !!k && (k.wali || null) === auth.uid;
  };
  // isian rapor dari wali kelas: per siswa (jenis "santri") atau capaian bersama satu kelas (jenis "kelas")
  const raporValid = (lama, b, auth) =>
    kolomDikenal(lama, b, ["jenis", "kelasId", "santriId", "tahun", "semester", "capaian", "sakit", "izin", "alpa",
      "ekskul", "catatan", "namaPengubah", "dibuat", "diubah", "diubahOleh"]) &&
    semesterTetap(lama, b) && tetap(lama, b, "jenis") && tetap(lama, b, "kelasId") && tetap(lama, b, "santriId") &&
    ["santri", "kelas"].includes(nilaiKolom(b, "jenis")) &&
    teks(b, "kelasId", 100) && teksAtauKosong(b, "santriId", 100) &&
    peta(b, "capaian", 40) && daftar(b, "ekskul", 10) && teksAtauKosong(b, "catatan", 1000) &&
    angka(b, "sakit") && angka(b, "izin") && angka(b, "alpa") &&
    teks(b, "namaPengubah", 100) && nilaiKolom(b, "diubahOleh") === auth.uid;
  const grupValid = (lama, b) =>
    kolomDikenal(lama, b, ["nama", "jenjang", "tingkat", "pengampu", "koordinator"]) &&
    teks(b, "nama", 200) && teks(b, "jenjang", 50) && daftar(b, "pengampu", 300) &&
    teksAtauKosong(b, "koordinator", 128);
  // nama pembuat / pengubah wajib sama dengan nama di profil sendiri (dicek cuma kalau berubah)
  const namaAsli = (auth, lama, b, k) =>
    !ada(b, k) || !berubahKolom(lama, b, k) || b[k] === nilaiKolom(profil(auth) || {}, "nama");

  function bolehBaca(jalur, d, auth) {
    if (!auth) return false;
    const b = jalur.split("/");
    if (b[0] === "pengguna" && b.length === 2) return auth.uid === b[1] || kurikulum(auth);
    if (b[0] === "pengaturan" && b.length === 2) return aktif(auth);
    if (b[0] === "mapel" && b.length === 2) return aktif(auth);
    if (b[0] === "mapel" && b[2] === "modul" && b.length === 4) {
      return aktif(auth) && (kurikulum(auth) || d.pemilik === auth.uid ||
        (d.dibagikan === true && (pengampu(auth, b[1]) || segrup(auth, b[1]))));
    }
    if (b[0] === "mapel" && b[2] === "sumatif" && b.length === 4) {
      return aktif(auth) && (kurikulum(auth) || d.pemilik === auth.uid ||
        (d.dibagikan === true && (pengampu(auth, b[1]) || segrup(auth, b[1]))));
    }
    if (b[0] === "mapel" && b[2] === "nilai" && b.length === 4) {
      return aktif(auth) && (kurikulum(auth) || pengampu(auth, b[1]));
    }
    if (b[0] === "kelas" && b.length === 2) return aktif(auth);
    if (b[0] === "santri" && b.length === 2) {
      if (!aktif(auth)) return false;
      if (kurikulum(auth)) return true;
      return guruKelas(auth, d.kelasId);
    }
    if (b[0] === "rapor" && b.length === 2) return aktif(auth) && (kurikulum(auth) || waliKelasDari(auth, d.kelasId));
    if (b[0] === "grup" && b.length === 2) return aktif(auth);
    if (b[0] === "grup" && (b[2] === "uas" || b[2] === "usulan") && b.length === 4) {
      return aktif(auth) && (kurikulum(auth) || anggotaGrup(auth, b[1]));
    }
    return false;
  }

  // baru = null artinya dihapus
  function bolehTulis(jalur, lama, baru, auth) {
    if (!auth) return false;
    const b = jalur.split("/");

    if (b[0] === "pengguna" && b.length === 2) {
      if (!lama && baru) {
        return auth.uid === b[1] && profilValid(lama, baru) && baru.email === auth.email &&
          nilaiKolom(baru, "sapaan") === null && nilaiKolom(baru, "nip") === null &&
          (baru.peran === "menunggu" ||
           (baru.peran === "kurikulum" && auth.emailTerverifikasi === true && cekAdminAwal(auth.email)));
      }
      if (lama && baru) {
        return profilValid(lama, baru) && (
          // akun ditolak / nonaktif cuma boleh nyatat terakhirMasuk
          (auth.uid === b[1] &&
           (["menunggu", "ustadz", "kurikulum"].includes(lama.peran) || kolomDikenal(lama, baru, ["terakhirMasuk"])) &&
           baru.peran === lama.peran && baru.email === lama.email &&
           sama(nilaiKolom(baru, "sapaan"), nilaiKolom(lama, "sapaan")) &&
           sama(nilaiKolom(baru, "nip"), nilaiKolom(lama, "nip"))) ||
          // TU nggak boleh ngubah peran akunnya sendiri
          (kurikulum(auth) && (auth.uid !== b[1] || sama(nilaiKolom(baru, "peran"), nilaiKolom(lama, "peran")))));
      }
      // TU nggak boleh hapus akunnya sendiri
      return kurikulum(auth) && auth.uid !== b[1];
    }
    if (b[0] === "pengaturan" && b.length === 2) return kurikulum(auth) && (baru === null || pengaturanValid(b[1], baru));
    // admin nggak boleh jadi pengampu (admin bukan guru)
    if (b[0] === "mapel" && b.length === 2) {
      if (!kurikulum(auth)) return false;
      return baru === null || (daftar(baru, "pengampu", 20) &&
        !(Array.isArray(baru.pengampu) && baru.pengampu.includes(auth.uid)));
    }

    // lembar nilai: cuma pengampu mapelnya yang boleh ngisi angka. Admin: lihat,
    // nyiapin lembar KOSONG, dan menghapus lembar.
    if (b[0] === "mapel" && b[2] === "nilai" && b.length === 4) {
      if (!aktif(auth)) return false;
      if (baru === null) return kurikulum(auth);
      if (!lama) return namaAsli(auth, lama, baru, "namaPengubah") && nilaiValid(lama, baru)
        && ((pengampu(auth, b[1]) && !kurikulum(auth)) || (kurikulum(auth) && lembarKosong(baru)));
      return pengampu(auth, b[1]) && !kurikulum(auth) && namaAsli(auth, lama, baru, "namaPengubah") && nilaiValid(lama, baru);
    }
    // santri & kelas: diisi, diubah, dihapus admin; ustadz cuma lihat
    if (b[0] === "santri" && b.length === 2) return kurikulum(auth);
    if (b[0] === "kelas" && b.length === 2) return kurikulum(auth) && (baru === null || kelasValid(lama, baru));
    // isian rapor: wali kelasnya atau admin; yang ngehapus cuma admin
    if (b[0] === "rapor" && b.length === 2) {
      if (!aktif(auth)) return false;
      if (baru === null) return kurikulum(auth);
      const kelasnya = lama ? lama.kelasId : nilaiKolom(baru, "kelasId");
      return (kurikulum(auth) || waliKelasDari(auth, kelasnya)) && raporValid(lama, baru, auth) &&
        namaAsli(auth, lama, baru, "namaPengubah");
    }

    if (b[0] === "mapel" && (b[2] === "modul" || b[2] === "sumatif") && b.length === 4) {
      if (!aktif(auth)) return false;
      const valid = b[2] === "modul" ? modulValid : sumatifValid;
      // admin boleh BIKIN atas nama guru (mulihin dari cadangan); ngubah tetap cuma pemiliknya
      if (!lama && baru) return ((baru.pemilik === auth.uid && pengampu(auth, b[1]) && namaAsli(auth, lama, baru, "namaPemilik")) ||
        kurikulum(auth)) && valid(lama, baru);
      if (lama && baru) return lama.pemilik === auth.uid && baru.pemilik === auth.uid &&
        namaAsli(auth, lama, baru, "namaPemilik") && valid(lama, baru);
      return lama.pemilik === auth.uid || kurikulum(auth);
    }

    // grup mapel: cuma admin
    if (b[0] === "grup" && b.length === 2) return kurikulum(auth) && (baru === null || grupValid(lama, baru));
    // UAS bersama: koordinator selama draf / diajukan, admin kapan saja
    if (b[0] === "grup" && b[2] === "uas" && b.length === 4) {
      if (!aktif(auth)) return false;
      if (kurikulum(auth)) return true;
      if (!koordinatorGrup(auth, b[1])) return false;
      const bisa = ["draf", "diajukan"];
      if (!lama && baru) return baru.status === "draf" && namaAsli(auth, lama, baru, "namaPengubah") && uasValid(lama, baru, auth);
      if (lama && baru) return bisa.includes(lama.status) && bisa.includes(baru.status) &&
        namaAsli(auth, lama, baru, "namaPengubah") && uasValid(lama, baru, auth);
      return lama.status === "draf";
    }
    // usulan soal UAS: dibuat pengampu grup, dihapus pemiliknya / koordinator / admin
    if (b[0] === "grup" && b[2] === "usulan" && b.length === 4) {
      if (!aktif(auth)) return false;
      if (!lama && baru) return ((anggotaGrup(auth, b[1]) && baru.pemilik === auth.uid && namaAsli(auth, lama, baru, "namaPemilik")) ||
        kurikulum(auth)) && usulanValid(lama, baru);
      if (lama && baru) return lama.pemilik === auth.uid && baru.pemilik === auth.uid &&
        namaAsli(auth, lama, baru, "namaPemilik") && usulanValid(lama, baru);
      return lama.pemilik === auth.uid || koordinatorGrup(auth, b[1]) || kurikulum(auth);
    }
    return false;
  }

  return { bolehBaca, bolehTulis };
}