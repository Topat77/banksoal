// =====================================================
//  naikkelas.js — riwayat kelas santri & keputusan naik kelas per santri (khusus admin/TU)
//
//  Tiap santri nyimpen riwayatKelas: [{ tahun, jenjang, kelas, absen, hasil }]
//  hasil: "naik" | "tinggal" | "lulus" | "pindah". Ditulis waktu naik kelas (atau
//  waktu ditandai pindah), SEBELUM kelas sekarang diganti. Jadi rapor tahun lalu tetap
//  bisa nyari kelas santri di tahun itu, walau dia udah naik / lulus / pindah.
//
//  Santri lulus / pindah: status "lulus" / "pindah", aktif:false, kelasId dicopot
//  (biar nggak ikut dibaca guru kelas mana pun). Datanya tetap ada, rapornya tetap bisa dibuka.
// =====================================================

const TINGKAT_AKHIR = { "Paket B": 9, "Paket C": 12 };
const HASIL_NAIK = { naik: "Naik kelas", tinggal: "Tinggal kelas", lulus: "Lulus", pindah: "Pindah sekolah" };

function tingkatAkhir(jenjang, kelas) {
  const t = Number(tingkatKelas(kelas));
  return TINGKAT_AKHIR[jenjang] !== undefined && t === TINGKAT_AKHIR[jenjang];
}
// 7A1 → 8A1 (angka depannya ditambah satu). Kalau nggak ada angkanya, kelasnya tetap.
function tebakKelasTujuan(kelas) {
  const k = String(kelas || "").trim();
  return /^\d+/.test(k) ? k.replace(/^\d+/, n => String(Number(n) + 1)) : k;
}
function tahunBerikut(tahun) {        // "2025/2026" → "2026/2027"
  const m = String(tahun || "").match(/^(\d{4})\/(\d{4})$/);
  return m ? `${Number(m[1]) + 1}/${Number(m[2]) + 1}` : "";
}

function riwayatSantri(s) {
  return Array.isArray(s && s.riwayatKelas) ? s.riwayatKelas.filter(r => r && typeof r === "object" && typeof r.tahun === "string") : [];
}
function riwayatTahun(s, tahun) {
  return riwayatSantri(s).find(r => r.tahun === tahun) || null;
}
function santriKeluar(s) {
  return s.status === "lulus" || s.status === "pindah";
}
// kelas santri di satu tahun ajaran: dari riwayat kalau ada, kalau nggak ya kelas sekarang
function kelasSantriDi(s, tahun) {
  const r = riwayatTahun(s, tahun);
  return r && typeof r.jenjang === "string" && typeof r.kelas === "string"
    ? { jenjang: r.jenjang, kelas: r.kelas, absen: r.absen }
    : { jenjang: s.jenjang, kelas: s.kelas, absen: s.absen };
}
// santri yang ada di satu kelas pada tahun itu (yang udah lulus / pindah ikut, asal tercatat di tahun itu)
function santriKelasDi(jenjang, kelas, tahun) {
  const nomor = (x) => x.absen === undefined || x.absen === null || x.absen === "" ? Infinity : Number(x.absen);
  return toko.santri
    .filter(s => s.aktif !== false || riwayatTahun(s, tahun))
    .map(s => ({ s, k: kelasSantriDi(s, tahun) }))
    .filter(x => x.k.jenjang === jenjang && x.k.kelas === kelas)
    .sort((a, c) => (nomor(a.k) - nomor(c.k)) || (a.s.nama || "").localeCompare(c.s.nama || "", "id"))
    .map(x => x.s);
}
// kelas yang punya santri di tahun itu (buat pilihan kelas di rapor)
function kelasDiTahun(tahun) {
  const peta = new Map();
  for (const s of toko.santri) {
    const r = riwayatTahun(s, tahun);
    if (r && r.jenjang && r.kelas) peta.set(`${r.jenjang}|${r.kelas}`, { jenjang: r.jenjang, kelas: r.kelas });
  }
  return [...peta.values()];
}

// sudah diproses di tahun itu ATAU tahun sesudahnya (biar nutup tahun lama belakangan nggak bikin naik dua kali)
function sudahDiproses(s, tahun) {
  return riwayatSantri(s).some(r => r.tahun >= tahun);
}
// santri baru setelah naik kelas / tinggal / lulus / pindah di akhir `tahun`.
// Kalau riwayat tahun itu udah ada, nggak diubah (proses diulang = aman, nggak dobel).
function terapkanNaikKelas(s, tahun, hasil, kelasTujuan) {
  if (sudahDiproses(s, tahun) || !HASIL_NAIK[hasil]) return null;
  const baru = salin(s);
  baru.riwayatKelas = [...riwayatSantri(s), { tahun, jenjang: s.jenjang, kelas: s.kelas, absen: s.absen ?? "", hasil }];
  if (hasil === "naik") {
    const k = String(kelasTujuan || "").trim();
    if (!k) return null;
    baru.kelas = k;
  } else if (hasil === "lulus" || hasil === "pindah") {
    baru.status = hasil;
    baru.aktif = false;
    baru.keluar = { tahun, tanggal: Date.now() };
  }
  return baru;
}
// tandai pindah sekolah di tengah tahun (dari daftar siswa). Kalau riwayat tahun ini udah
// tercatat (naik kelasnya udah diproses), cukup statusnya yang diubah.
function keluarkanSantri(s, tahun, hasil) {
  const baru = terapkanNaikKelas(s, tahun, hasil);
  if (baru) return baru;
  return { ...salin(s), status: hasil, aktif: false, keluar: { tahun, tanggal: Date.now() } };
}
// batalin lulus / pindah: riwayat tahun keluarnya dibuang, santri aktif lagi di kelas terakhirnya
function aktifkanLagiSantri(s) {
  const baru = salin(s);
  const tahun = s.keluar && s.keluar.tahun;
  baru.riwayatKelas = riwayatSantri(s).filter(r => !(r.tahun === tahun && (r.hasil === "lulus" || r.hasil === "pindah")));
  delete baru.status;
  delete baru.keluar;
  baru.aktif = true;
  return baru;
}

// batalin hasil naik kelas / tinggal / lulus / pindah untuk satu santri di akhir `tahun`:
// kelas, jenjang & absen dikembalikan ke nilai di riwayat, riwayat tahun itu dibuang, dan kalau
// dia lulus / pindah gara-gara proses itu, status + keluar dicopot lalu aktif lagi.
// null = nggak bisa dibatalin: nggak punya riwayat tahun itu, riwayatnya rusak, atau udah diproses lagi
// di tahun sesudahnya (biar nggak ngerusak riwayat yang lebih baru).
function batalkanNaikKelas(s, tahun) {
  const r = riwayatTahun(s, tahun);
  if (!r || typeof r.jenjang !== "string" || typeof r.kelas !== "string" || !r.jenjang || !r.kelas) return null;
  if (riwayatSantri(s).some(x => x.tahun > tahun)) return null;
  const baru = salin(s);
  baru.riwayatKelas = riwayatSantri(s).filter(x => x.tahun !== tahun);
  baru.jenjang = r.jenjang;
  baru.kelas = r.kelas;
  if (r.absen === undefined || r.absen === null || r.absen === "") delete baru.absen;
  else baru.absen = r.absen;
  if (santriKeluar(s) && s.keluar && s.keluar.tahun === tahun) {
    delete baru.status;
    delete baru.keluar;
    baru.aktif = true;
  }
  return baru;
}
// ====== KEPUTUSAN NAIK KELAS PER SANTRI (tombol di lembar nilai semester Genap) ======
// Status satu santri di akhir `tahun`:
//   fase "belum" | "naik" | "tinggal" | "lulus" : keputusan tahun itu (belum ada / naik / tinggal kelas / lulus)
//   fase "terkunci" : tahun sesudahnya udah diproses, jadi keputusan tahun ini nggak boleh diganti
//   fase "dilewati" : nonaktif manual / pindah / lulus lewat jalur lain, nggak dapat tombol
// `tujuan` (fase naik) = kelas sekarang. `hasil` = hasil tercatat di riwayat tahun itu. `sesudah` = tahun yang ngunci.
function keputusanTahun(s, tahun) {
  if (!s || typeof s !== "object") return { fase: "dilewati" };
  const r = riwayatTahun(s, tahun);
  const lebihBaru = riwayatSantri(s).filter(x => x.tahun > tahun).map(x => x.tahun).sort();
  if (lebihBaru.length) return { fase: "terkunci", hasil: r ? r.hasil : undefined, sesudah: lebihBaru[0] };
  if (!bisaDiputuskan(s, tahun)) return { fase: "dilewati" };
  if (r && (r.hasil === "naik" || r.hasil === "tinggal" || r.hasil === "lulus")) {
    return r.hasil === "naik" ? { fase: "naik", hasil: "naik", tujuan: s.kelas } : { fase: r.hasil, hasil: r.hasil };
  }
  return r ? { fase: "dilewati" } : { fase: "belum" };
}
// boleh dapat tombol? Santri aktif (belum / udah naik / tinggal), atau yang lulus gara-gara tombol ini di tahun itu
// (biar bisa diganti jadi tidak lulus). Nonaktif manual & pindah (termasuk yang pindah sesudah naik) nggak boleh,
// kalau nggak batalkanNaikKelas bisa "menghidupkan" santri yang udah pindah.
function bisaDiputuskan(s, tahun) {
  if (!s || typeof s !== "object") return false;
  if (s.aktif !== false && !santriKeluar(s)) return true;
  const r = riwayatTahun(s, tahun);
  return s.status === "lulus" && !!r && r.hasil === "lulus" && !!s.keluar && s.keluar.tahun === tahun;
}
// santri baru sesudah keputusan `hasil` ("naik" | "tinggal" | "lulus", atau "batal" = balik ke belum diputuskan) di akhir `tahun`. null = ditolak.
// Kalau udah ada keputusan tahun itu, diganti (riwayat tetap satu entri). Hasil sama = santri yang sama (nggak perlu nulis).
function ubahKeputusan(s, tahun, hasil, kelasTujuan) {
  if (!["naik", "tinggal", "lulus", "batal"].includes(hasil)) return null;
  const k = keputusanTahun(s, tahun);
  if (k.fase === "terkunci" || k.fase === "dilewati") return null;
  if (hasil === "batal") return k.fase === "belum" ? null : batalkanNaikKelas(s, tahun);   // balik ke belum diputuskan (buat buka kunci tahun sebelumnya)
  const asal = kelasSantriDi(s, tahun);
  const akhir = tingkatAkhir(asal.jenjang, asal.kelas);
  if ((hasil === "lulus" && !akhir) || (hasil === "naik" && akhir)) return null;
  const tujuan = hasil === "naik" ? String(kelasTujuan || "").trim().replace(/\s+/g, " ") : "";
  if (hasil === "naik" && !tujuan) return null;
  if (k.fase === hasil && (hasil !== "naik" || tujuan === s.kelas)) return s;
  const dasar = k.fase === "belum" ? s : batalkanNaikKelas(s, tahun);
  return dasar ? terapkanNaikKelas(dasar, tahun, hasil, tujuan) : null;
}
// isian kelas tujuan buat satu kelas: kelas yang paling banyak dituju santri kelas ini yang udah naik di `tahun`,
// kalau belum ada ya tebakan (7A1 -> 8A1). Tingkat akhir: kosong (nggak ada kelas tujuan).
function tujuanTebakan(daftarSantri, jenjang, kelas, tahun) {
  if (tingkatAkhir(jenjang, kelas)) return "";
  const hitung = new Map();
  for (const s of daftarSantri) {
    const a = kelasSantriDi(s, tahun);
    if (a.jenjang !== jenjang || a.kelas !== kelas) continue;
    const k = keputusanTahun(s, tahun);
    if (k.fase === "naik" && k.tujuan) hitung.set(k.tujuan, (hitung.get(k.tujuan) || 0) + 1);
  }
  const urut = [...hitung.entries()].sort((a, c) => (c[1] - a[1]) || a[0].localeCompare(c[0], "id"));
  return urut.length ? urut[0][0] : tebakKelasTujuan(kelas);
}
