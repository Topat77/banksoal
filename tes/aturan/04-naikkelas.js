// =====================================================
grup("Naik kelas & riwayat kelas santri");
{
  const nk = { console, setTimeout, clearTimeout };
  vm.createContext(nk);
  vm.runInContext([
    ...["salin", "bandingNama", "adaAbsen", "nomorAbsen"].map(n => ambilFungsi(alat, n)), ambilFungsi(baca("js/grup.js"), "tingkatKelas"),
    ambilFungsi(baca("js/grup.js"), "idKelas"), ambilFungsi(baca("js/grup.js"), "hurufRombel"),
    ambilKonstanta(baca("js/grup.js"), "JENJANG_IDAD"),
    "const KELAS_SD = [], KELAS_SMP = [], KELAS_SMA = [], KELAS_IDAD = [];", ambilKonstanta(baca("js/kurikulum.js"), "KELAS_PER_JENJANG"),
    ambilFungsi(santriJs, "bandingKelas"), ambilFungsi(simpanJs, "simpanSantri"),
    "const toko = { santri: [], backend: { tulis: () => Promise.resolve() } }; function berubah() {} function gagalSimpan() {} function pasangDiDaftar(d, x) { const i = d.findIndex(y => y.id === x.id); if (i >= 0) d[i] = x; else d.push(x); }",
    ambilFungsi(simpanJs, "tanpaId"),
    ambilFungsi(nilaiJs, "santriLembar"), ambilFungsi(nilaiJs, "jumlahNilaiTakTerbaca"),
    baca("js/naikkelas.js"),
    "this.ekspor = { toko, tingkatAkhir, tebakKelasTujuan, tahunBerikut, kelasSantriDi, santriKelasDi, kelasDiTahun, terapkanNaikKelas, keluarkanSantri, aktifkanLagiSantri, keputusanTahun, bisaDiputuskan, ubahKeputusan, tujuanTebakan, simpanSantri, santriLembar, jumlahNilaiTakTerbaca, batalkanNaikKelas, hurufRombel, tingkatKelas, jenjangTujuan, tujuanDipilihPerSiswa, pindahkanKelas };"
  ].join("\n"), nk);
  const N = nk.ekspor;
  const s7 = { id: "a", nama: "Ahmad", jenjang: "Paket B", kelas: "7A1", absen: 3, aktif: true };
  const s9 = { id: "b", nama: "Bilal", jenjang: "Paket B", kelas: "9A1", absen: 1, aktif: true };
  const s12 = { id: "c", nama: "Citra", jenjang: "Paket C", kelas: "12 IPA", absen: 2, aktif: true };

  harap("tebak kelas tujuan 7A1 → 8A1", N.tebakKelasTujuan("7A1"), "8A1");
  harap("tebak kelas tujuan 11 IPS → 12 IPS", N.tebakKelasTujuan("11 IPS"), "12 IPS");
  boleh("Paket B kelas 9 = tingkat akhir", N.tingkatAkhir("Paket B", "9A1"));
  boleh("Paket C kelas 12 = tingkat akhir", N.tingkatAkhir("Paket C", "12 IPA"));
  tolak("Paket B kelas 8 bukan tingkat akhir", N.tingkatAkhir("Paket B", "8A1"));
  tolak("Paket C kelas 9 bukan tingkat akhir", N.tingkatAkhir("Paket C", "9"));
  harap("tahun berikut", N.tahunBerikut("2025/2026"), "2026/2027");


  const naik = N.terapkanNaikKelas(s7, "2025/2026", "naik", "8A1");
  harap("naik: kelas sekarang 8A1", naik.kelas, "8A1");
  harap("naik: riwayat 2025/2026 nyimpen kelas lama", JSON.stringify(naik.riwayatKelas), '[{"tahun":"2025/2026","jenjang":"Paket B","kelas":"7A1","absen":3,"hasil":"naik"}]');
  harap("naik: data asli nggak diubah", s7.kelas, "7A1");
  harap("diproses ulang tahun yang sama = nggak berubah (nggak dobel)", N.terapkanNaikKelas(naik, "2025/2026", "naik", "9A1"), null);
  harap("udah diproses tahun sesudahnya: nutup tahun lama nggak bikin naik dua kali", N.terapkanNaikKelas(naik, "2024/2025", "naik", "8A1"), null);
  harap("naik tanpa kelas tujuan ditolak", N.terapkanNaikKelas(s7, "2025/2026", "naik", "  "), null);
  const tinggal = N.terapkanNaikKelas(s7, "2025/2026", "tinggal");
  harap("tinggal kelas: kelasnya tetap, riwayat tercatat", `${tinggal.kelas}|${tinggal.riwayatKelas[0].hasil}`, "7A1|tinggal");

  const lulus = N.terapkanNaikKelas(s9, "2025/2026", "lulus");
  harap("lulus: status, aktif:false, tahun keluar", `${lulus.status}|${lulus.aktif}|${lulus.keluar.tahun}`, "lulus|false|2025/2026");
  N.toko.santri = [];
  const tersimpan = N.simpanSantri({ ...lulus, kelasId: "paket-b-9a1" });
  harap("lulus: kelasId dicopot waktu disimpan (guru kelas mana pun nggak baca lagi)", tersimpan.kelasId, undefined);
  harap("santri aktif tetap dapat kelasId", N.simpanSantri(naik).kelasId, "paket-b-8a1");
  tolak("lulus: guru kelasnya nggak bisa baca lagi (aturan)", bolehBaca("santri/b", tanpaKelas(tersimpan), akun.hasan));

  N.toko.santri = [naik, tersimpan, { ...s7, id: "d", nama: "Dani", kelas: "8A1", absen: 1 }];
  harap("kelas di tahun lalu dari riwayat", N.kelasSantriDi(naik, "2025/2026").kelas, "7A1");
  harap("kelas di tahun ini = kelas sekarang", N.kelasSantriDi(naik, "2026/2027").kelas, "8A1");
  harap("rapor 7A1 tahun lalu: Ahmad masih ada", N.santriKelasDi("Paket B", "7A1", "2025/2026").map(s => s.id).join(), "a");
  harap("rapor 8A1 tahun ini: Ahmad & Dani, urut absen", N.santriKelasDi("Paket B", "8A1", "2026/2027").map(s => s.id).join(), "d,a");
  harap("rapor 9A1 tahun lalu: yang lulus tetap muncul", N.santriKelasDi("Paket B", "9A1", "2025/2026").map(s => s.id).join(), "b");
  harap("rapor 9A1 tahun ini: yang lulus nggak muncul", N.santriKelasDi("Paket B", "9A1", "2026/2027").length, 0);
  boleh("kelas 9A1 tetap ada di pilihan rapor tahun lalu", N.kelasDiTahun("2025/2026").some(k => k.kelas === "9A1"));

  const pindah = N.keluarkanSantri(naik, "2026/2027", "pindah");
  harap("pindah tengah tahun: riwayat tahun ini ikut dicatat", `${pindah.status}|${pindah.riwayatKelas.map(r => r.tahun + ":" + r.kelas).join()}`, "pindah|2025/2026:7A1,2026/2027:8A1");
  const pindahLagi = N.keluarkanSantri(naik, "2025/2026", "pindah");
  harap("pindah sesudah naik kelas diproses: status aja, riwayat naik tetap", `${pindahLagi.status}|${pindahLagi.riwayatKelas.map(r => r.hasil).join()}`, "pindah|naik");
  const balik = N.aktifkanLagiSantri(pindah);
  harap("aktifkan lagi: riwayat pindah dibuang, riwayat naik tetap", `${balik.aktif}|${balik.status}|${balik.riwayatKelas.map(r => r.hasil).join()}`, "true|undefined|naik");
  harap("aktifkan lagi sesudah 'pindah status aja': riwayat naik nggak ikut kebuang", N.aktifkanLagiSantri(pindahLagi).riwayatKelas.length, 1);

  // ---- lembar nilai tahun lalu: siswa kelas itu PADA tahun lembar, bukan kelas sekarang ----
  const mp7 = { jenjang: "Paket B", kelas: "7A1" }, mp8 = { jenjang: "Paket B", kelas: "8A1" }, mp9 = { jenjang: "Paket B", kelas: "9A1" };
  N.toko.santri = [naik, tersimpan, { ...s7, id: "d", nama: "Dani", kelas: "8A1", absen: 1 }];
  harap("lembar 2025/2026 mapel 7A1: Ahmad (udah naik) tetap tampil", N.santriLembar(mp7, { tahun: "2025/2026" }).map(s => s.id).join(), "a");
  harap("lembar 2026/2027 mapel 7A1: kosong (semua udah naik)", N.santriLembar(mp7, { tahun: "2026/2027" }).length, 0);
  harap("lembar 2026/2027 mapel 8A1: Dani & Ahmad urut absen", N.santriLembar(mp8, { tahun: "2026/2027" }).map(s => s.id).join(), "d,a");
  harap("lembar 2025/2026 mapel 9A1: yang lulus tetap tampil", N.santriLembar(mp9, { tahun: "2025/2026" }).map(s => s.id).join(), "b");
  harap("lembar 2026/2027 mapel 9A1: yang lulus nggak tampil", N.santriLembar(mp9, { tahun: "2026/2027" }).length, 0);
  N.toko.santri = [{ ...s7, id: "p", absen: 5 }, { ...s7, id: "q", absen: 2 }, { ...s7, id: "t", aktif: false }];
  harap("semester berjalan tanpa riwayat: sama persis kayak roster lama (aktif, urut absen)", N.santriLembar(mp7, { tahun: "2026/2027" }).map(s => s.id).join(), "q,p");
  const lembarNilai = { nilai: { a: { k1: 80 }, hilang: { k1: 70 }, kosong: {} }, hadir: { hilang2: { hadir: 3 } } };
  harap("nilai siswa yang nggak kebaca dihitung (kosong nggak dihitung)", N.jumlahNilaiTakTerbaca(lembarNilai, [{ id: "a" }]), 2);
  harap("lembar belum ada = 0", N.jumlahNilaiTakTerbaca(null, []), 0);

  // ---- batalin naik kelas ----
  const bNaik = N.batalkanNaikKelas(naik, "2025/2026");
  harap("batalin naik: kelas, jenjang & absen balik", `${bNaik.jenjang}|${bNaik.kelas}|${bNaik.absen}`, "Paket B|7A1|3");
  harap("batalin naik: riwayat tahun itu dibuang", bNaik.riwayatKelas.length, 0);
  harap("batalin naik: data asli nggak diubah", naik.kelas, "8A1");
  const bLulus = N.batalkanNaikKelas(lulus, "2025/2026");
  harap("batalin lulus: aktif lagi, status & keluar dicopot, kelas balik", `${bLulus.aktif}|${bLulus.status}|${bLulus.keluar}|${bLulus.kelas}|${bLulus.riwayatKelas.length}`, "true|undefined|undefined|9A1|0");
  harap("batalin lulus lalu disimpan: kelasId terisi lagi", N.simpanSantri(bLulus).kelasId, "paket-b-9a1");
  const bTinggal = N.batalkanNaikKelas(tinggal, "2025/2026");
  harap("batalin tinggal kelas: kelas tetap, riwayat dibuang", `${bTinggal.kelas}|${bTinggal.riwayatKelas.length}`, "7A1|0");
  const naikLagi = N.terapkanNaikKelas(naik, "2026/2027", "naik", "9A1");
  harap("udah diproses tahun berikutnya: nggak dibatalin", N.batalkanNaikKelas(naikLagi, "2025/2026"), null);
  harap("tahun berikutnya dibatalin dulu, baru tahun itu boleh", N.batalkanNaikKelas(N.batalkanNaikKelas(naikLagi, "2026/2027"), "2025/2026").kelas, "7A1");
  harap("nggak punya riwayat tahun itu: null", N.batalkanNaikKelas(s7, "2025/2026"), null);
  const absenKosong = N.terapkanNaikKelas({ ...s7, absen: undefined }, "2025/2026", "naik", "8A1");
  harap("absen yang dulu kosong tetap kosong", "absen" in N.batalkanNaikKelas(absenKosong, "2025/2026"), false);
  const rusak = { ...naik, riwayatKelas: [null, 5, { tahun: 2025 }, { tahun: "2025/2026", jenjang: 7, kelas: null, hasil: "naik" }, "x"] };
  harap("riwayat rusak: nggak crash, nggak dibatalin", N.batalkanNaikKelas(rusak, "2025/2026"), null);
  harap("riwayat bukan array: nggak crash", N.batalkanNaikKelas({ ...naik, riwayatKelas: "x" }, "2025/2026"), null);

  // ---- keputusan naik kelas per santri (tombol di lembar nilai Genap) ----
  const TH = "2025/2026", TH2 = "2026/2027";
  const fase = (s, t = TH) => N.keputusanTahun(s, t).fase;
  harap("belum diputuskan = fase belum", fase(s7), "belum");
  const kNaik = N.ubahKeputusan(s7, TH, "naik", "8A1");
  harap("belum → naik: kelas 8A1, riwayat 1 entri, fase naik + tujuan", `${kNaik.kelas}|${kNaik.riwayatKelas.length}|${fase(kNaik)}|${N.keputusanTahun(kNaik, TH).tujuan}`, "8A1|1|naik|8A1");
  harap("naik: data asli nggak diubah", s7.kelas, "7A1");
  const kTinggal = N.ubahKeputusan(s7, TH, "tinggal");
  harap("belum → tidak naik: kelas tetap, fase tinggal", `${kTinggal.kelas}|${fase(kTinggal)}`, "7A1|tinggal");
  const nt = N.ubahKeputusan(kNaik, TH, "tinggal");
  harap("naik → tidak naik: kelas & absen balik, riwayat tetap 1 entri tinggal", `${nt.kelas}|${nt.absen}|${nt.riwayatKelas.length}|${nt.riwayatKelas[0].hasil}`, "7A1|3|1|tinggal");
  const tn = N.ubahKeputusan(kTinggal, TH, "naik", "8A1");
  harap("tidak naik → naik: kelas = tujuan, riwayat tetap 1 entri naik", `${tn.kelas}|${tn.riwayatKelas.length}|${tn.riwayatKelas[0].hasil}`, "8A1|1|naik");
  const k8b = N.ubahKeputusan(kNaik, TH, "naik", "8B");
  harap("koreksi tujuan naik 8A1 → 8B: kelas 8B, riwayat tetap 1 entri", `${k8b.kelas}|${k8b.riwayatKelas.length}|${k8b.riwayatKelas[0].kelas}`, "8B|1|7A1");
  boleh("naik → naik tujuan sama = no-op (objek yang sama, nggak nulis)", N.ubahKeputusan(kNaik, TH, "naik", "  8A1 ") === kNaik);
  boleh("tidak naik → tidak naik = no-op", N.ubahKeputusan(kTinggal, TH, "tinggal") === kTinggal);
  let bolakBalik = s7;
  for (const h of ["naik", "tinggal", "naik", "tinggal", "naik", "naik"]) bolakBalik = N.ubahKeputusan(bolakBalik, TH, h, "8A1");
  harap("ganti keputusan berkali-kali: riwayat tahun itu tetap 1 entri", `${bolakBalik.riwayatKelas.length}|${bolakBalik.kelas}`, "1|8A1");
  harap("naik tanpa tujuan ditolak", N.ubahKeputusan(s7, TH, "naik", ""), null);
  harap("naik tujuan cuma spasi ditolak", N.ubahKeputusan(s7, TH, "naik", "   "), null);
  harap("lulus di kelas non-akhir ditolak", N.ubahKeputusan(s7, TH, "lulus"), null);
  harap("naik di kelas tingkat akhir ditolak", N.ubahKeputusan(s9, TH, "naik", "10A"), null);
  harap("hasil ngawur ditolak", N.ubahKeputusan(s7, TH, "pindah"), null);

  // ---- tingkat akhir: lulus <-> tidak lulus ----
  const l9 = N.ubahKeputusan(s9, TH, "lulus");
  harap("lulus: status, aktif:false, tahun keluar, fase lulus", `${l9.status}|${l9.aktif}|${l9.keluar.tahun}|${fase(l9)}`, "lulus|false|2025/2026|lulus");
  boleh("santri yang lulus gara-gara tombol ini masih bisa diputuskan (diganti)", N.bisaDiputuskan(l9, TH));
  harap("lulus lalu disimpan: kelasId dicopot", N.simpanSantri(l9).kelasId, undefined);
  const tl9 = N.ubahKeputusan(l9, TH, "tinggal");
  harap("lulus → tidak lulus: aktif lagi, status & keluar hilang, kelas 9A1, 1 riwayat tinggal", `${tl9.aktif}|${tl9.status}|${tl9.keluar}|${tl9.kelas}|${tl9.riwayatKelas.length}|${tl9.riwayatKelas[0].hasil}`, "true|undefined|undefined|9A1|1|tinggal");
  harap("tidak lulus disimpan: kelasId balik", N.simpanSantri(tl9).kelasId, "paket-b-9a1");
  const lg = N.ubahKeputusan(tl9, TH, "lulus");
  harap("tidak lulus → lulus", `${lg.status}|${lg.aktif}|${lg.riwayatKelas.length}|${lg.riwayatKelas[0].hasil}`, "lulus|false|1|lulus");
  const l12 = N.ubahKeputusan(s12, TH, "lulus");
  harap("Paket C kelas 12 bisa lulus", l12.status, "lulus");
  const l9Tinggal = N.ubahKeputusan(s9, TH, "tinggal");
  harap("tingkat akhir tidak lulus langsung: tetap di 9A1, aktif", `${l9Tinggal.kelas}|${l9Tinggal.aktif}|${fase(l9Tinggal)}`, "9A1|true|tinggal");

  // ---- batalin keputusan ----
  const bt = N.ubahKeputusan(kNaik, TH, "batal");
  harap("batalin keputusan naik: kelas balik, riwayat hilang, fase belum", `${bt.kelas}|${bt.riwayatKelas.length}|${fase(bt)}`, "7A1|0|belum");
  harap("batalin keputusan lulus: aktif lagi", `${N.ubahKeputusan(l9, TH, "batal").aktif}|${fase(N.ubahKeputusan(l9, TH, "batal"))}`, "true|belum");
  harap("batalin yang belum diputuskan ditolak", N.ubahKeputusan(s7, TH, "batal"), null);

  // ---- terkunci kalau tahun berikutnya udah diproses ----
  const naik2 = N.ubahKeputusan(kNaik, TH2, "naik", "9A1");
  harap("tahun berikutnya udah diproses: fase terkunci + tahun yang ngunci", `${fase(naik2)}|${N.keputusanTahun(naik2, TH).sesudah}|${N.keputusanTahun(naik2, TH).hasil}`, "terkunci|2026/2027|naik");
  harap("terkunci: tidak naik ditolak", N.ubahKeputusan(naik2, TH, "tinggal"), null);
  harap("terkunci: ganti tujuan ditolak", N.ubahKeputusan(naik2, TH, "naik", "8B"), null);
  harap("terkunci: batalin ditolak", N.ubahKeputusan(naik2, TH, "batal"), null);
  harap("tahun yang terbaru tetap bisa diganti", fase(naik2, TH2), "naik");
  harap("belum diputuskan tapi tahun berikutnya udah ada = terkunci", fase({ ...s7, riwayatKelas: [{ tahun: TH2, jenjang: "Paket B", kelas: "7A1", hasil: "tinggal" }] }), "terkunci");
  const terbuka = N.ubahKeputusan(naik2, TH2, "batal");
  harap("batalin tahun terbaru dulu → tahun lamanya kebuka lagi", `${fase(terbuka)}|${terbuka.kelas}`, "naik|8A1");
  harap("... lalu tahun lama boleh diganti", N.ubahKeputusan(terbuka, TH, "tinggal").kelas, "7A1");

  // ---- santri yang nggak dapat tombol ----
  const nonaktif = { ...s7, id: "n", aktif: false };
  tolak("nonaktif manual: nggak bisa diputuskan", N.bisaDiputuskan(nonaktif, TH));
  harap("nonaktif manual: fase dilewati, semua keputusan ditolak", `${fase(nonaktif)}|${N.ubahKeputusan(nonaktif, TH, "naik", "8A1")}|${N.ubahKeputusan(nonaktif, TH, "tinggal")}`, "dilewati|null|null");
  const pdh = N.keluarkanSantri(s7, TH, "pindah");
  harap("pindah: dilewati, nggak bisa diputuskan, nggak ke-hidup lagi", `${fase(pdh)}|${N.bisaDiputuskan(pdh, TH)}|${N.ubahKeputusan(pdh, TH, "tinggal")}|${N.ubahKeputusan(pdh, TH, "batal")}`, "dilewati|false|null|null");
  const naikLaluPindah = N.keluarkanSantri(kNaik, TH, "pindah");
  harap("naik lalu ditandai pindah: status pindah, dilewati, nggak bisa 'dihidupkan' lewat tombol", `${naikLaluPindah.status}|${fase(naikLaluPindah)}|${N.ubahKeputusan(naikLaluPindah, TH, "tinggal")}|${N.ubahKeputusan(naikLaluPindah, TH, "batal")}`, "pindah|dilewati|null|null");
  const lulusLain = { ...s9, id: "m", aktif: false, status: "lulus", keluar: { tahun: "2024/2025" }, riwayatKelas: [{ tahun: "2024/2025", jenjang: "Paket B", kelas: "9A1", absen: 1, hasil: "lulus" }] };
  harap("lulus di tahun lain: dilewati di tahun ini", `${fase(lulusLain)}|${N.bisaDiputuskan(lulusLain, TH)}|${N.ubahKeputusan(lulusLain, TH, "tinggal")}`, "dilewati|false|null");
  boleh("tapi di tahun lulusnya sendiri masih bisa diganti", N.bisaDiputuskan(lulusLain, "2024/2025"));
  harap("objek ngawur nggak bikin crash", `${fase(null)}|${N.bisaDiputuskan(undefined, TH)}`, "dilewati|false");

  // ---- riwayat rusak ----
  const rusakKep = { ...s7, riwayatKelas: [null, 5, { tahun: 2025 }, "x"] };
  harap("riwayat berisi sampah: nggak crash, fase belum, bisa naik", `${fase(rusakKep)}|${N.ubahKeputusan(rusakKep, TH, "naik", "8A1").riwayatKelas.length}`, "belum|1");
  harap("riwayat bukan array: fase belum", fase({ ...s7, riwayatKelas: "x" }), "belum");
  const rusakNaik = { ...kNaik, riwayatKelas: [{ tahun: TH, jenjang: 7, kelas: null, hasil: "naik" }] };
  harap("riwayat tahun itu rusak: nggak crash, ganti keputusan ditolak", N.ubahKeputusan(rusakNaik, TH, "tinggal"), null);

  // ---- roster lembar nggak berubah waktu keputusan diganti ----
  N.toko.santri = [kNaik, { ...s7, id: "e", nama: "Eko", absen: 4 }];
  const sebelumRoster = N.santriLembar(mp7, { tahun: TH }).map(s => s.id).join();
  N.toko.santri = [nt, { ...s7, id: "e", nama: "Eko", absen: 4 }];
  harap("lembar 7A1 tahun itu: santri tetap muncul, jumlah & urutan sama setelah naik → tidak naik", N.santriLembar(mp7, { tahun: TH }).map(s => s.id).join(), sebelumRoster);
  harap("... dan tetap 2 baris", sebelumRoster, "a,e");

  // ---- tebakan kelas tujuan ----
  const naikKe = (id, tujuan, kelas = "7A1") => N.ubahKeputusan({ ...s7, id, kelas }, TH, "naik", tujuan);
  harap("belum ada yang naik: tebakan 7A1 → 8A1", N.tujuanTebakan([s7, { ...s7, id: "z" }], "Paket B", "7A1", TH), "8A1");
  harap("ada yang naik: ikut tujuan yang paling sering", N.tujuanTebakan([naikKe("a1", "8B"), naikKe("a2", "8B"), naikKe("a3", "8A1"), s7], "Paket B", "7A1", TH), "8B");
  harap("imbang: urut abjad (deterministik)", N.tujuanTebakan([naikKe("a1", "8B"), naikKe("a2", "8A1")], "Paket B", "7A1", TH), "8A1");
  harap("santri kelas lain nggak dihitung", N.tujuanTebakan([naikKe("a1", "9C", "8A1"), naikKe("a2", "8B")], "Paket B", "7A1", TH), "8B");
  harap("yang terkunci (tahun berikutnya udah diproses) nggak dihitung", N.tujuanTebakan([naik2, naikKe("a2", "8B")], "Paket B", "7A1", TH), "8B");
  harap("yang tidak naik nggak dihitung", N.tujuanTebakan([kTinggal], "Paket B", "7A1", TH), "8A1");
  harap("tingkat akhir: nggak ada tujuan", N.tujuanTebakan([s9], "Paket B", "9A1", TH), "");
  harap("tebakan ngikutin kelas asal di tahun itu, bukan kelas sekarang", N.tujuanTebakan([kNaik], "Paket B", "7A1", TH), "8A1");

  // ---- I'dad, lulus lanjut ke kelas 10, pindah kelas ----
  harap("huruf rombel 7A2 / 10B1 / I'dad A1", [N.hurufRombel("7A2"), N.hurufRombel("10B1"), N.hurufRombel("I'dad A1"), N.hurufRombel("12 IPA")].join(","), "A,B,A,");
  harap("tingkat I'dad A1 & I'dad B2 sama", N.tingkatKelas("I'dad A1") === N.tingkatKelas("I'dad B2"), true);
  tolak("I'dad bukan tingkat akhir", N.tingkatAkhir("I'dad", "I'dad A1"));
  boleh("I'dad: kelas tujuan dipilih per siswa", N.tujuanDipilihPerSiswa("I'dad", "I'dad A1"));
  boleh("kelas 9 Paket B: kelas tujuan lanjut dipilih per siswa", N.tujuanDipilihPerSiswa("Paket B", "9A1"));
  tolak("kelas 7: tetap ditebak otomatis", N.tujuanDipilihPerSiswa("Paket B", "7A1"));
  harap("tebakan kelas tujuan I'dad kosong (wajib pilih)", N.tujuanTebakan([], "I'dad", "I'dad A1", "2026/2027"), "");
  const sI = { id: "i", nama: "Ilham", jenjang: "I'dad", kelas: "I'dad A1", absen: 4, aktif: true };
  const naikI = N.ubahKeputusan(sI, "2026/2027", "naik", "10A2");
  harap("I'dad naik → Paket C kelas yang dipilih", naikI && `${naikI.jenjang} ${naikI.kelas}`, "Paket C 10A2");
  harap("riwayat I'dad tercatat", JSON.stringify(N.kelasSantriDi(naikI, "2026/2027")), JSON.stringify({ jenjang: "I'dad", kelas: "I'dad A1", absen: 4 }));
  const batalI = N.ubahKeputusan(naikI, "2026/2027", "batal");
  harap("batal: balik ke I'dad A1", batalI && `${batalI.jenjang} ${batalI.kelas}`, "I'dad I'dad A1");
  const lanjut = N.ubahKeputusan(s9, "2026/2027", "lanjut", "10A1");
  harap("kelas 9 lulus lanjut → Paket C 10A1, tetap aktif", lanjut && `${lanjut.jenjang} ${lanjut.kelas} ${lanjut.aktif}`, "Paket C 10A1 true");
  harap("keputusan lanjut kebaca", N.keputusanTahun(lanjut, "2026/2027").fase, "lanjut");
  harap("lanjut cuma buat kelas 9 Paket B", N.ubahKeputusan(s7, "2026/2027", "lanjut", "10A1"), null);
  harap("lanjut tanpa kelas tujuan ditolak", N.ubahKeputusan(s9, "2026/2027", "lanjut", ""), null);
  // pindah kelas waktu Genap: Ganjil tetap kelas lama, Genap & akhir tahun kelas baru
  const pindahK = N.pindahkanKelas(s7, "7A2", { tahun: "2026/2027", semester: "Genap" });
  harap("pindah kelas: kelas sekarang 7A2", pindahK.kelas, "7A2");
  harap("pindah waktu Genap: Ganjil tetap 7A1", N.kelasSantriDi(pindahK, "2026/2027", "Ganjil").kelas, "7A1");
  harap("pindah waktu Genap: Genap pakai 7A2", N.kelasSantriDi(pindahK, "2026/2027", "Genap").kelas, "7A2");
  const pindahGanjil = N.pindahkanKelas(s7, "7A2", { tahun: "2026/2027", semester: "Ganjil" });
  harap("pindah waktu Ganjil: Ganjil sudah 7A2", N.kelasSantriDi(pindahGanjil, "2026/2027", "Ganjil").kelas, "7A2");
  const naikSesudahPindah = N.ubahKeputusan(pindahK, "2026/2027", "naik", "8A2");
  harap("naik sesudah pindah: riwayat akhir tahun 7A2, Ganjil tetap 7A1",
    [N.kelasSantriDi(naikSesudahPindah, "2026/2027").kelas, N.kelasSantriDi(naikSesudahPindah, "2026/2027", "Ganjil").kelas, naikSesudahPindah.kelas].join(","), "7A2,7A1,8A2");
}
