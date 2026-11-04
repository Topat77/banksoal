// =====================================================
//  simpan.js — semua fungsi tulis ke database (simpan… / hapus…)
//  Perubahan langsung dipasang di `toko` (biar layar cepat), lalu dikirim ke backend.
//  State & langganan datanya ada di toko.js.
// =====================================================

// ====== TULIS DATA ======
// Perubahan langsung dipasang di memori (biar layar cepat),
// terus dikirim ke backend. Kalau backend nolak, dikasih tau.
function gagalSimpan(err) {
  console.error(err);
  const kode = err && err.code;
  if (kode === "permission-denied") {
    kabar("Gagal menyimpan: perubahan ini ditolak.\n\nMungkin Anda sudah bukan pengampu mapel ini, atau isinya melebihi batas (misalnya judul terlalu panjang atau soalnya lebih dari 500). Jika masih bingung, hubungi admin (TU).");
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
    kabar(`${jenis} ini terlalu besar (±${kb(ukuran)} KB, batasnya ±${kb(BATAS_DOK.maks)} KB), jadi perubahan ini TIDAK disimpan.\n\nPecah jadi dua ${jenis.toLowerCase()}, atau pendekkan teks bacaan / soal yang panjang.`);
    return false;
  }
  if (ukuran > BATAS_DOK.peringatan && !sudahDiingatkanUkuran.has(baru.id)) {
    sudahDiingatkanUkuran.add(baru.id);
    kabar(`${jenis} ini sudah ±${kb(ukuran)} KB, mendekati batas ±${kb(BATAS_DOK.maks)} KB. Soal berikutnya sebaiknya diletakkan di ${jenis.toLowerCase()} baru.`);
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
// akun = profil guru dari toko.pengguna, atau null buat ngosongin
function simpanWali(tahun, idKelasNya, akun) {
  const kunci = kunciTahunWali(tahun);
  const isiWali = akun ? { uid: akun.id, nama: String(akun.nama || "").slice(0, 100), nip: String(akun.nip || "").slice(0, 30) } : undefined;
  const baru = salin(toko.wali || {});
  pasangDiJalur(baru, ["tahun", kunci, idKelasNya], isiWali);
  toko.wali = baru;
  toko.backend.ubahSebagian("pengaturan/wali", [
    [["tahun", kunci, idKelasNya], isiWali],
    [["diubah"], Date.now()],
    [["diubahOleh"], uidSaya()]
  ]).catch(gagalSimpan);
  berubah();
}

function simpanLembaga(data) {
  toko.lembaga = salin(data);
  toko.backend.tulis("pengaturan/lembaga", salin(data)).catch(gagalSimpan);
  berubah();
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
// khusus admin: siapin lembar nilai KOSONG (kolom bawaan, tanpa angka) buat satu mapel & semester.
// Ditulis cuma kalau di server belum ada (butuh internet), jadi isian guru nggak ketimpa.
// Hasilnya false kalau ternyata lembarnya udah ada.
async function siapkanLembarNilai(idMapel, lembar) {
  const baru = { ...salin(lembar), nilai: {}, hadir: {}, diubah: Date.now(), diubahOleh: uidSaya(), namaPengubah: namaSaya() };
  const jadi = await toko.backend.buatKalauBelumAda(`mapel/${idMapel}/nilai/${baru.id}`, tanpaId(baru));
  const w = toko.isi[idMapel];
  if (jadi && w) pasangDiDaftar(w.nilai, baru);
  berubah();
  return jadi;
}
// khusus admin: hapus satu lembar nilai (semua nilai & kehadiran semester itu ikut hilang)
function hapusLembarNilai(idMapel, idLembar) {
  const w = toko.isi[idMapel];
  if (w) w.nilai = (w.nilai || []).filter(x => x.id !== idLembar);
  toko.backend.hapus(`mapel/${idMapel}/nilai/${idLembar}`).catch(gagalSimpan);
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
