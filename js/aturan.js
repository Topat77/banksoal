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
    if (b[0] === "santri" && b.length === 2) return aktif(auth);
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
        return auth.uid === b[1] && baru.email === auth.email &&
          (baru.peran === "menunggu" || (baru.peran === "kurikulum" && adminAwal.includes(auth.email)));
      }
      if (lama && baru) {
        return (auth.uid === b[1] && baru.peran === lama.peran && baru.email === lama.email &&
                (baru.sapaan || null) === (lama.sapaan || null)) || kurikulum(auth);
      }
      return kurikulum(auth);
    }
    if (b[0] === "pengaturan" && b.length === 2) return kurikulum(auth);
    if (b[0] === "mapel" && b.length === 2) return kurikulum(auth);

    // lembar nilai: cuma pengampu mapelnya yang boleh ngisi (admin cuma lihat).
    // Admin boleh menghapus, buat ngebersihin waktu mapelnya dihapus.
    if (b[0] === "mapel" && b[2] === "nilai" && b.length === 4) {
      if (!aktif(auth)) return false;
      return pengampu(auth, b[1]) || (baru === null && kurikulum(auth));
    }
    // santri: diisi, diubah, dihapus admin; ustadz cuma lihat
    if (b[0] === "santri" && b.length === 2) return kurikulum(auth);

    if (b[0] === "mapel" && (b[2] === "modul" || b[2] === "sumatif") && b.length === 4) {
      if (!aktif(auth)) return false;
      if (!lama && baru) return baru.pemilik === auth.uid && pengampu(auth, b[1]);
      if (lama && baru) return lama.pemilik === auth.uid && baru.pemilik === auth.uid;
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
      if (!lama && baru) return baru.status === "draf";
      if (lama && baru) return bisa.includes(lama.status) && bisa.includes(baru.status);
      return lama.status === "draf";
    }
    // usulan soal UAS: dibuat pengampu grup, dihapus pemiliknya / koordinator / admin
    if (b[0] === "grup" && b[2] === "usulan" && b.length === 4) {
      if (!aktif(auth)) return false;
      if (!lama && baru) return anggotaGrup(auth, b[1]) && baru.pemilik === auth.uid;
      if (lama && baru) return lama.pemilik === auth.uid && baru.pemilik === auth.uid;
      return lama.pemilik === auth.uid || koordinatorGrup(auth, b[1]) || kurikulum(auth);
    }
    return false;
  }

  return { bolehBaca, bolehTulis };
}