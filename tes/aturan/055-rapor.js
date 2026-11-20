// =====================================================
grup("Rapor format resmi Paket B & C (raporresmi.js)");
{
  const src = baca("js/raporresmi.js");
  const c = vm.createContext({});
  vm.runInContext([
    "const jenisMapel = (m) => m && m.jenis === 'diniah' ? 'diniah' : 'umum';",
    ambilFungsi(baca("js/grup.js"), "tingkatKelas"),
    ...["KELOMPOK_RAPOR", "PILIHAN_RAPOR_FORM", "MAPEL_PILIHAN", "URUT_MAPEL_RAPOR", "ROMAWI", "ANGKA_KATA"].map(n => ambilKonstanta(src, n)),
    ...["raporResmi", "tebakKelompokRapor", "kelompokRapor", "urutMapelRapor", "kelasRomawi", "namaTingkat", "faseKelas", "semesterAngka"].map(n => ambilFungsi(src, n)),
    "this.r = { raporResmi, tebakKelompokRapor, kelompokRapor, urutMapelRapor, kelasRomawi, namaTingkat, faseKelas, semesterAngka };"
  ].join("\n"), c);
  const R = c.r;
  boleh("Paket B & Paket C pakai format resmi", R.raporResmi("Paket B") && R.raporResmi("Paket C"));
  tolak("I'dad belum (format menyusul)", R.raporResmi("I'dad"));
  harap("Paket C: Biologi, Ekonomi, Sosiologi, Bahasa Arab jadi pilihan", ["Biologi", "Ekonomi", "Sosiologi", "Bahasa Arab"].map(n => R.tebakKelompokRapor(n, "umum", "Paket C")).join(), "pilihan,pilihan,pilihan,pilihan");
  harap("Paket C: Sejarah & Matematika tetap umum", ["Sejarah", "Matematika"].map(n => R.tebakKelompokRapor(n, "umum", "Paket C")).join(), "umum,umum");
  harap("Paket B nggak punya kelompok pilihan", R.tebakKelompokRapor("Biologi", "umum", "Paket B"), "umum");
  harap("Paket B: Bahasa Arab jadi muatan lokal", R.tebakKelompokRapor("Bahasa Arab", "umum", "Paket B"), "mulok");
  harap("Paket B: Bahasa Arab yang belum diatur masuk muatan lokal", R.kelompokRapor({ nama: "Bahasa Arab", jenis: "umum", jenjang: "Paket B" }), "mulok");
  harap("Bahasa Arab diniah tetap nggak masuk rapor PKBM", R.tebakKelompokRapor("Bahasa Arab", "diniah", "Paket B"), "tidak");
  harap("mapel Paket B yang terlanjur 'pilihan' → umum", R.kelompokRapor({ nama: "IPA", jenjang: "Paket B", rapor: "pilihan" }), "umum");
  harap("mapel Paket C 'pilihan' tetap pilihan", R.kelompokRapor({ nama: "Biologi", jenjang: "Paket C", rapor: "pilihan" }), "pilihan");
  harap("kelas romawi 8A1 → VIII A1", R.kelasRomawi("8A1"), "VIII A1");
  harap("kelas romawi 9B2 → IX B2", R.kelasRomawi("9B2"), "IX B2");
  harap("kelas tanpa angka nggak diubah", R.kelasRomawi("I'dad A1"), "I'dad A1");
  harap("naik ke kelas IX (Sembilan)", R.namaTingkat(9), "kelas IX (Sembilan)");
  harap("fase Paket B kelas 7–9 = D", [7, 8, 9].map(t => R.faseKelas("Paket B", `${t}A1`)).join(), "D,D,D");
  harap("fase Paket C: 10 = E, 11 & 12 = F", ["10A1", "11A1", "12B1"].map(k => R.faseKelas("Paket C", k)).join(), "E,F,F");
  harap("I'dad di luar fase", R.faseKelas("I'dad", "I'dad A1"), "-");
  harap("semester ditulis 1 (Ganjil) / 2 (Genap)", [R.semesterAngka({ semester: "Ganjil" }), R.semesterAngka({ semester: "Genap" })].join(), "1 (Ganjil),2 (Genap)");
  harap("mapel diniah (MSU/MSW) nggak masuk rapor PKBM", R.tebakKelompokRapor("Fiqih", "diniah"), "tidak");
  harap("pemberdayaan & keterampilan bukan mapel (diisi wali kelas)", [R.tebakKelompokRapor("Pemberdayaan", "umum"), R.tebakKelompokRapor("Keterampilan Komputer Perkantoran", "umum")].join(), "tidak,tidak");
  harap("mapel lama yang terlanjur 'kokurikuler' → tidak masuk rapor", R.kelompokRapor({ nama: "Pemberdayaan", jenis: "umum", rapor: "kokurikuler" }), "tidak");
  harap("mapel umum biasa", R.tebakKelompokRapor("Matematika", "umum"), "umum");
  harap("pilihan TU (mapel.rapor) menang dari tebakan", R.kelompokRapor({ nama: "Bahasa Arab", jenis: "umum", rapor: "mulok" }), "mulok");
  harap("mapel lama 'diniah' tanpa pilihan → tidak masuk rapor", R.kelompokRapor({ nama: "Fiqih", jenis: "diniah" }), "tidak");
  harap("pilihan di form menang (Bahasa Arab lama diniah tapi dipilih muatan lokal)", R.kelompokRapor({ nama: "Bahasa Arab", jenis: "diniah", rapor: "mulok" }), "mulok");
  harap("pilihan 'tidak masuk rapor' dipakai apa adanya", R.kelompokRapor({ nama: "Matematika", jenis: "umum", rapor: "tidak" }), "tidak");
  harap("isian rapor rusak → pakai tebakan", R.kelompokRapor({ nama: "Matematika", jenis: "umum", rapor: "<b>" }), "umum");
  const urut = ["Seni Budaya", "Matematika", "Pendidikan Agama Islam dan Budi Pekerti", "Bahasa Inggris", "Pendidikan Pancasila", "Bahasa Indonesia"]
    .map(nama => ({ nama })).sort(R.urutMapelRapor).map(m => m.nama.split(" ")[0] + (m.nama.split(" ")[1] ? " " + m.nama.split(" ")[1] : ""));
  const urutC = ["Seni dan Budaya", "Sejarah", "Bahasa Inggris", "Pendidikan Jasmani Olahraga dan Kesehatan", "Matematika"]
    .map(nama => ({ nama })).sort(R.urutMapelRapor).map(m => m.nama.split(" ")[0]);
  harap("Paket C: Sejarah sesudah Bahasa Inggris, sebelum PJOK", urutC.join(), "Matematika,Bahasa,Sejarah,Pendidikan,Seni");
  harap("urutan mapel umum ikut rapor resmi", urut.join(), "Pendidikan Agama,Pendidikan Pancasila,Bahasa Indonesia,Matematika,Bahasa Inggris,Seni Budaya");
}
