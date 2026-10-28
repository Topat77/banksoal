// =====================================================
//  aturan.js — siapa boleh baca/tulis apa
//
//  Ini SALINAN dari firestore.rules dalam bentuk JavaScript.
//  Dipakai mode coba, biar aplikasinya berperilaku persis kayak
//  versi online. Kalau ngubah aturan, ubah DUA-DUANYA.
// =====================================================

function buatAturan(ambilDok, adminAwal) {
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
    tetap(lama, b, "dibuat") && angka(b, "dibuat") && angka(b, "diubah");
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
  // profil akun: ukuran cuma dicek kalau kolomnya berubah, biar profil lama tetap bisa di-update
  const berubahKolom = (lama, b, k) => !lama || ada(lama, k) !== ada(b, k) || !sama(lama[k], b[k]);
  const profilValid = (lama, b) =>
    kolomDikenal(lama, b, ["nama", "email", "foto", "peran", "sapaan", "nip",
      "dibuat", "terakhirMasuk", "diubah", "diubahOleh"]) &&
    (!berubahKolom(lama, b, "nama") || (typeof b.nama === "string" && b.nama.length <= 100)) &&
    (!berubahKolom(lama, b, "nip") || teksAtauKosong(b, "nip", 30)) &&
    (!berubahKolom(lama, b, "foto") || teks(b, "foto", 2000));
  const nilaiKolom = (d, k) => ada(d, k) ? d[k] : null;

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
      const k = d.kelasId ? ambilDok(`kelas/${d.kelasId}`) : null;
      return !!k && Array.isArray(k.pengampu) && k.pengampu.includes(auth.uid);
    }
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
          (baru.peran === "menunggu" || (baru.peran === "kurikulum" && adminAwal.includes(auth.email)));
      }
      if (lama && baru) {
        return profilValid(lama, baru) && (
          (auth.uid === b[1] && baru.peran === lama.peran && baru.email === lama.email &&
           (baru.sapaan || null) === (lama.sapaan || null) &&
           sama(nilaiKolom(baru, "nip"), nilaiKolom(lama, "nip"))) || kurikulum(auth));
      }
      return kurikulum(auth);
    }
    if (b[0] === "pengaturan" && b.length === 2) return kurikulum(auth);
    if (b[0] === "mapel" && b.length === 2) return kurikulum(auth);

    // lembar nilai: cuma pengampu mapelnya yang boleh ngisi (admin cuma lihat).
    // Yang boleh menghapus cuma admin, buat ngebersihin waktu mapelnya dihapus.
    if (b[0] === "mapel" && b[2] === "nilai" && b.length === 4) {
      if (!aktif(auth)) return false;
      if (baru === null) return kurikulum(auth);
      return pengampu(auth, b[1]) && nilaiValid(lama, baru);
    }
    // santri & kelas: diisi, diubah, dihapus admin; ustadz cuma lihat
    if (b[0] === "santri" && b.length === 2) return kurikulum(auth);
    if (b[0] === "kelas" && b.length === 2) return kurikulum(auth);

    if (b[0] === "mapel" && (b[2] === "modul" || b[2] === "sumatif") && b.length === 4) {
      if (!aktif(auth)) return false;
      const valid = b[2] === "modul" ? modulValid : sumatifValid;
      if (!lama && baru) return baru.pemilik === auth.uid && pengampu(auth, b[1]) && valid(lama, baru);
      if (lama && baru) return lama.pemilik === auth.uid && baru.pemilik === auth.uid && valid(lama, baru);
      return lama.pemilik === auth.uid || kurikulum(auth);
    }

    // grup mapel: cuma admin
    if (b[0] === "grup" && b.length === 2) return kurikulum(auth);
    // UAS bersama: koordinator selama draf / diajukan, admin kapan saja
    if (b[0] === "grup" && b[2] === "uas" && b.length === 4) {
      if (!aktif(auth)) return false;
      if (kurikulum(auth)) return true;
      if (!koordinatorGrup(auth, b[1])) return false;
      const bisa = ["draf", "diajukan"];
      if (!lama && baru) return baru.status === "draf" && uasValid(lama, baru, auth);
      if (lama && baru) return bisa.includes(lama.status) && bisa.includes(baru.status) && uasValid(lama, baru, auth);
      return lama.status === "draf";
    }
    // usulan soal UAS: dibuat pengampu grup, dihapus pemiliknya / koordinator / admin
    if (b[0] === "grup" && b[2] === "usulan" && b.length === 4) {
      if (!aktif(auth)) return false;
      if (!lama && baru) return anggotaGrup(auth, b[1]) && baru.pemilik === auth.uid && usulanValid(lama, baru);
      if (lama && baru) return lama.pemilik === auth.uid && baru.pemilik === auth.uid && usulanValid(lama, baru);
      return lama.pemilik === auth.uid || koordinatorGrup(auth, b[1]) || kurikulum(auth);
    }
    return false;
  }

  return { bolehBaca, bolehTulis };
}