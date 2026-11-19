// =====================================================
//  raporresmi.js — rapor format resmi PKBM (tahun pelajaran 2025/2026, tanpa P5)
//
//  Paket B & Paket C (contoh rapor dari sekolah). I'dad masih pakai rapor lama (rapor.js)
//  sampai formatnya dikirim sekolah. Isinya:
//  - identitas: nama sekolah, alamat, nama, NIS / NISN, kelas romawi, fase, semester, tahun
//  - nilai akhir (dibulatkan) + capaian kompetensi, dikelompokkan:
//    Umum · Pilihan (Paket C) · Kokurikuler (pemberdayaan & keterampilan) · Muatan lokal.
//    Mapel diniah (MSU/MSW) nggak ikut.
//  - ekstrakurikuler (minimal 2 baris), ketidakhadiran
//  - Ganjil: catatan wali kelas di samping ketidakhadiran + kotak tanggapan orang tua
//    Genap: keputusan naik kelas / lulus di samping ketidakhadiran + catatan wali kelas
//  - tanda tangan satu baris: orang tua · kepala sekolah · wali kelas + kaki halaman
//  Capaian, ketidakhadiran, ekstrakurikuler & catatan diisi wali kelas (isianRapor(), isianrapor.js).
// =====================================================

// jenjang yang udah pakai format resmi
function raporResmi(jenjang) {
  return jenjang === "Paket B" || jenjang === "Paket C";
}

// ====== KELOMPOK MAPEL DI RAPOR ======
// field mapel.rapor: "umum" | "pilihan" (Paket C) | "kokurikuler" | "mulok" | "tidak" (nggak masuk rapor PKBM)
const KELOMPOK_RAPOR = [
  { k: "umum", judul: "Kelompok Mata Pelajaran Umum", label: "Mata pelajaran umum" },
  { k: "pilihan", judul: "Kelompok Mata Pelajaran Pilihan", label: "Mata pelajaran pilihan (Paket C)" },
  { k: "kokurikuler", judul: "Kokurikuler Muatan Pemberdayaan dan Keterampilan", label: "Kokurikuler (pemberdayaan & keterampilan)" },
  { k: "mulok", judul: "Muatan Lokal", label: "Muatan lokal" },
  { k: "tidak", judul: "", label: "Tidak masuk rapor PKBM (misal mapel diniah MSU/MSW)" }
];
// kalau belum diatur: diniah nggak masuk rapor PKBM, pemberdayaan/keterampilan jadi kokurikuler,
// Paket C: mapel peminatan (Biologi, Ekonomi, Bahasa Arab, ...) jadi pilihan; Paket B: Bahasa Arab jadi muatan lokal
const MAPEL_PILIHAN = /biologi|fisika|kimia|ekonomi|sosiologi|geografi|antropologi|informatika|bahasa\s*arab|lanjut/i;
function tebakKelompokRapor(nama, jenis, jenjang) {
  if (jenis === "diniah") return "tidak";
  if (/pemberdayaan|ke?trampilan|keterampilan/i.test(nama || "")) return "kokurikuler";
  if (/muatan\s*lokal|mulok/i.test(nama || "")) return "mulok";
  if (jenjang === "Paket C" && MAPEL_PILIHAN.test(nama || "")) return "pilihan";
  if (jenjang === "Paket B" && /bahasa\s*arab/i.test(nama || "")) return "mulok";   // Bahasa Arab Paket B: muatan lokal
  return "umum";
}
function kelompokRapor(m) {
  const k = KELOMPOK_RAPOR.some(x => x.k === m.rapor) ? m.rapor : tebakKelompokRapor(m.nama, jenisMapel(m), m.jenjang);
  return k === "pilihan" && m.jenjang !== "Paket C" ? "umum" : k;   // kelompok pilihan cuma ada di Paket C
}

// urutan mapel umum seperti di rapor resmi; yang nggak dikenal di belakang, urut nama
const URUT_MAPEL_RAPOR = [/agama|pai\b/i, /pancasila|pkn/i, /indonesia/i, /matematika/i, /pengetahuan alam|\bipa\b/i,
  /pengetahuan sosial|\bips\b/i, /inggris/i, /sejarah/i, /jasmani|olahraga|pjok/i, /seni|prakarya/i, /informatika/i,
  /biologi/i, /fisika/i, /kimia/i, /arab/i, /sosiologi/i, /ekonomi/i, /geografi/i, /pemberdayaan/i, /ke?trampilan/i];
function urutMapelRapor(a, b) {
  const i = (m) => { const n = URUT_MAPEL_RAPOR.findIndex(re => re.test(m.nama || "")); return n < 0 ? 99 : n; };
  return i(a) - i(b) || (a.nama || "").localeCompare(b.nama || "", "id");
}

// ====== ANGKA ROMAWI, FASE, SEMESTER ======
const ROMAWI = { 7: "VII", 8: "VIII", 9: "IX", 10: "X", 11: "XI", 12: "XII" };
const ANGKA_KATA = { 7: "Tujuh", 8: "Delapan", 9: "Sembilan", 10: "Sepuluh", 11: "Sebelas", 12: "Dua Belas" };
// "8A1" → "VIII A1"
function kelasRomawi(kelas) {
  const m = String(kelas || "").trim().match(/^(\d+)\s*(.*)$/);
  if (!m || !ROMAWI[m[1]]) return String(kelas || "");
  return `${ROMAWI[m[1]]}${m[2] ? " " + m[2] : ""}`;
}
// "kelas IX (Sembilan)"
function namaTingkat(t) {
  return ROMAWI[t] ? `kelas ${ROMAWI[t]} (${ANGKA_KATA[t]})` : `kelas ${t}`;
}
function faseKelas(jenjang, kelas) {
  const t = Number(tingkatKelas(kelas));
  if (jenjang === "Paket B" && t >= 7 && t <= 9) return "D";
  if (jenjang === "Paket C" && t === 10) return "E";
  if (jenjang === "Paket C" && (t === 11 || t === 12)) return "F";
  return "-";
}
function semesterAngka(sem) {
  return sem.semester === "Genap" ? "2 (Genap)" : "1 (Ganjil)";
}

// ====== PENGATURAN RAPOR (TU) ======
// disimpan di pengaturan/lembaga.rapor: { kepala, nipKepala, alamat, tempat, tanggal: { "2025/2026|Ganjil": "2025-12-14" },
//   tanggalAkhir: { "2025/2026|Genap": "2026-05-30" } }   ← kelas akhir (9 & 12) di semester Genap, biasanya lebih awal
function aturRapor() {
  const r = toko.lembaga && adalahObjek(toko.lembaga.rapor) ? toko.lembaga.rapor : {};
  return {
    kepala: jadiTeks(r.kepala), nipKepala: jadiTeks(r.nipKepala), alamat: jadiTeks(r.alamat),
    tempat: jadiTeks(r.tempat) || "Tulungagung", tanggal: adalahObjek(r.tanggal) ? r.tanggal : {},
    tanggalAkhir: adalahObjek(r.tanggalAkhir) ? r.tanggalAkhir : {}
  };
}
// kelas: kelas siswa di semester itu. Kelas akhir (9 & 12) Genap pakai tanggalAkhir kalau diisi.
function tanggalRapor(sem, kelas) {
  const a = aturRapor();
  const kunci = kunciSemester(sem);
  const akhir = kelas && sem.semester === "Genap" && tingkatAkhir(kelas.jenjang, kelas.kelas) ? a.tanggalAkhir[kunci] : "";
  const t = akhir || a.tanggal[kunci];
  const d = typeof t === "string" && /^\d{4}-\d{2}-\d{2}$/.test(t) ? new Date(t + "T00:00:00") : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "";
}
function htmlPengaturanRapor(sem) {
  const a = aturRapor();
  const tgl = a.tanggal[kunciSemester(sem)] || "";
  return `<details class="kartu-kelas pengaturan-rapor" ${!a.kepala ? "open" : ""}>
    <summary><span><strong>Pengaturan rapor</strong><small>${a.kepala ? `Kepala sekolah: ${aman(a.kepala)}` : "Nama kepala sekolah belum diisi"}</small></span></summary>
    <form id="formAturRapor" class="isi-kartu-kelas">
      <label>Nama kepala sekolah <input name="kepala" value="${aman(a.kepala)}" maxlength="100" placeholder="Nama lengkap dan gelar"></label>
      <label>NIP kepala sekolah <input name="nipKepala" value="${aman(a.nipKepala)}" maxlength="30" inputmode="numeric" placeholder="Kosongkan jika tidak ada"></label>
      <label>Alamat di rapor <input name="alamat" value="${aman(a.alamat)}" maxlength="120" placeholder="Jln. ..."></label>
      <label>Tempat tanda tangan <input name="tempat" value="${aman(a.tempat)}" maxlength="50"></label>
      <label>Tanggal rapor ${aman(namaSemester(sem))} <input name="tanggal" type="date" value="${aman(tgl)}"></label>
      ${sem.semester === "Genap" ? `<label>Tanggal rapor kelas 9 &amp; 12 (kelas akhir) <input name="tanggalAkhir" type="date" value="${aman(a.tanggalAkhir[kunciSemester(sem)] || "")}">
        <small>Kosongkan jika sama dengan tanggal di atas.</small></label>` : ""}
      <div class="baris-tombol">
        <button type="submit" class="tombol-utama">Simpan</button>
        <span class="tersimpan" id="tersimpanAturRapor" role="status"></span>
      </div>
    </form>
  </details>`;
}
function pasangPengaturanRapor(sem) {
  const form = document.getElementById("formAturRapor");
  if (!form) return;
  form.onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(form);
    const lama = aturRapor();
    const tanggal = { ...lama.tanggal };
    const tgl = String(f.get("tanggal") || "");
    if (tgl) tanggal[kunciSemester(sem)] = tgl; else delete tanggal[kunciSemester(sem)];
    const tanggalAkhir = { ...lama.tanggalAkhir };
    if (f.has("tanggalAkhir")) {
      const tAkhir = String(f.get("tanggalAkhir") || "");
      if (tAkhir) tanggalAkhir[kunciSemester(sem)] = tAkhir; else delete tanggalAkhir[kunciSemester(sem)];
    }
    const rapor = {
      kepala: f.get("kepala").trim(), nipKepala: f.get("nipKepala").trim(),
      alamat: f.get("alamat").trim(), tempat: f.get("tempat").trim() || "Tulungagung", tanggal, tanggalAkhir
    };
    simpanLembaga({ ...toko.lembaga, rapor });
    document.getElementById("tersimpanAturRapor").textContent = "Tersimpan";
  };
}

// ====== KEPUTUSAN (semester Genap) ======
function teksKeputusan(santri, sem) {
  if (sem.semester !== "Genap") return "";
  const k = keputusanTahun(santri, sem.tahun);
  const hasil = k.hasil || (["naik", "lanjut", "tinggal", "lulus"].includes(k.fase) ? k.fase : "");
  const asal = kelasSantriDi(santri, sem.tahun, "Genap");
  const t = Number(tingkatKelas(asal.kelas));
  if (hasil === "naik") return `Naik ke ${namaTingkat(t + 1)}`;
  if (hasil === "tinggal") return tingkatAkhir(asal.jenjang, asal.kelas) ? "Tidak lulus" : `Tidak naik, tetap di ${namaTingkat(t)}`;
  if (hasil === "lulus" || hasil === "lanjut") {
    return asal.jenjang === "Paket B" ? "LULUS Program Paket B (setara SMP)"
      : asal.jenjang === "Paket C" ? "LULUS Program Paket C (setara SMA)" : "Lulus";
  }
  return "";
}

// ====== LEMBAR RAPOR RESMI ======
function htmlBarisNilaiResmi(b, no, isian) {
  const nama = b.kelompok === "mulok" && !/muatan\s*lokal/i.test(b.mapel.nama) ? `Muatan Lokal (${b.mapel.nama})` : b.mapel.nama;
  const capaian = isian && adalahObjek(isian.capaian) ? jadiTeks(isian.capaian[b.mapel.id]) : "";
  return `<tr>
    <td class="tengah">${no}</td>
    <td>${spanArah(nama)}</td>
    <td class="tengah">${b.akhir === null ? "-" : Math.round(b.akhir)}</td>
    <td class="capaian">${aman(capaian)}</td>
  </tr>`;
}

function htmlLembarRaporResmi(santri, sem) {
  const k = kelasSantriDi(santri, sem.tahun, sem.semester);
  const wali = waliKelas(sem.tahun, idKelas(k.jenjang, k.kelas));
  const atur = aturRapor();
  const isian = isianRapor(santri, sem) || {};
  const nisn = jadiTeks(santri.nisn);
  const nama = String(santri.nama || "").toUpperCase();
  const sebutan = k.jenjang === "Paket C" ? "murid" : "peserta didik";   // istilah di contoh rapor sekolah
  const baris = mapelKelas(k.jenjang, k.kelas).map(m => {
    const n = hitungNilai(lembarNilai(m.id, sem), santri.id, m);
    return { mapel: m, kelompok: kelompokRapor(m), akhir: n.akhir };
  }).filter(b => b.kelompok !== "tidak").sort((a, b) => urutMapelRapor(a.mapel, b.mapel));

  let h = `<div class="rapor-resmi">
    <table class="identitas-resmi">
      <tr><td>Nama Sekolah</td><td>: ${aman(toko.lembaga.nama || KONFIG.namaLembaga || "")}</td><td>Kelas</td><td>: ${aman(kelasRomawi(k.kelas))}</td></tr>
      <tr><td>Alamat</td><td>: ${aman(atur.alamat || "-")}</td><td>Fase</td><td>: ${aman(faseKelas(k.jenjang, k.kelas))}</td></tr>
      <tr><td>${k.jenjang === "Paket C" ? "Nama Murid" : "Nama Peserta Didik"}</td><td>: ${aman(nama)}</td><td>Semester</td><td>: ${aman(semesterAngka(sem))}</td></tr>
      <tr><td>Nomor Induk/NISN</td><td>: ${aman(santri.nis || "-")} / ${aman(nisn || "-")}</td><td>Tahun Pelajaran</td><td>: ${aman(sem.tahun)}</td></tr>
    </table>`;

  // nilai: Umum, Pilihan (Paket C), Kokurikuler, Muatan lokal (nomornya nyambung)
  let no = 1;
  for (const g of KELOMPOK_RAPOR.filter(x => x.k !== "tidak")) {
    const isi = baris.filter(b => b.kelompok === g.k);
    if (!isi.length && g.k !== "umum") continue;
    h += `<table class="tabel-rapor-resmi">
      <colgroup><col class="kol-no"><col class="kol-mapel"><col class="kol-nilai"><col></colgroup>
      ${g.k === "umum" ? `<thead><tr><th>No</th><th>Mata Pelajaran</th><th>Nilai Akhir</th><th>Capaian Kompetensi</th></tr></thead>` : ""}
      <tbody>${g.k === "mulok" ? "" : `<tr class="kelompok"><td colspan="4">${g.judul}</td></tr>`}
      ${isi.map(b => htmlBarisNilaiResmi(b, no++, isian)).join("") || `<tr><td colspan="4" class="tengah">Belum ada mapel</td></tr>`}
      </tbody></table>`;
  }

  // ekstrakurikuler
  const ekskul = Array.isArray(isian.ekskul) ? isian.ekskul.filter(adalahObjek) : [];
  h += `<table class="tabel-rapor-resmi">
    <colgroup><col class="kol-no"><col class="kol-mapel"><col class="kol-predikat"><col></colgroup>
    <thead><tr><th>No</th><th>Kegiatan Ekstrakurikuler</th><th>Predikat</th><th>Keterangan</th></tr></thead>
    <tbody>${(ekskul.length >= 2 ? ekskul : [...ekskul, {}, {}].slice(0, 2)).map((e, i) => `<tr><td class="tengah">${i + 1}</td>
      <td>${aman(jadiTeks(e.kegiatan))}</td><td class="tengah">${aman(jadiTeks(e.predikat))}</td><td>${aman(jadiTeks(e.keterangan))}</td></tr>`).join("")}</tbody>
  </table>`;

  // ketidakhadiran + (Genap: keputusan | Ganjil: catatan wali kelas)
  const hari = (x) => Number.isFinite(Number(isian[x])) && isian[x] !== "" && isian[x] !== undefined ? `${Math.max(0, Math.round(Number(isian[x])))} hari` : "- hari";
  const genap = sem.semester === "Genap";
  const keputusan = teksKeputusan(santri, sem);
  const catatan = `<table class="tabel-rapor-resmi kotak-catatan">
    <thead><tr><th>Catatan Wali Kelas</th></tr></thead>
    <tbody><tr><td>${aman(jadiTeks(isian.catatan)) || "&nbsp;"}</td></tr></tbody>
  </table>`;
  h += `<div class="dua-kotak-rapor">
    <table class="tabel-rapor-resmi kotak-hadir">
      <colgroup><col class="kol-hadir-nama"><col class="kol-hadir-titik"><col class="kol-hadir-hari"></colgroup>
      <thead><tr><th colspan="3">Ketidakhadiran</th></tr></thead>
      <tbody>
        <tr><td>Sakit</td><td class="tengah">:</td><td class="kanan">${hari("sakit")}</td></tr>
        <tr><td>Izin</td><td class="tengah">:</td><td class="kanan">${hari("izin")}</td></tr>
        <tr><td>Tanpa Keterangan</td><td class="tengah">:</td><td class="kanan">${hari("alpa")}</td></tr>
      </tbody>
    </table>
    ${genap ? `<table class="tabel-rapor-resmi kotak-keputusan">
      <thead><tr><th>Keputusan</th></tr></thead>
      <tbody><tr><td>Berdasarkan seluruh capaian kompetensi pada semester 1 dan 2, maka ${sebutan} dinyatakan:<br><b>${keputusan ? aman(keputusan) : "...................................."}</b></td></tr></tbody>
    </table>` : catatan}
  </div>
  ${genap ? catatan : `<table class="tabel-rapor-resmi kotak-tanggapan">
    <thead><tr><th>Tanggapan Orang Tua / Wali Murid</th></tr></thead>
    <tbody><tr><td>&nbsp;</td></tr></tbody>
  </table>`}`;

  // tanda tangan: satu baris (orang tua · kepala sekolah · wali kelas)
  const tanggal = tanggalRapor(sem, k);
  // titik-titik isian kosong boleh dipecah di HP sempit biar nggak keluar kolom (cetak tetap satu baris)
  // NIP 18 digit tanpa spasi: titik pecah setelah digit ke-8 (format 8-6-1-3), cuma aktif di HP sempit (css/rapor.css)
  const nip = (n) => aman(n).replace(/^(\d{8})(\d{10})$/, `$1<span class="pecah-nip"></span>$2`);
  const TITIK = `<span class="titik-kosong">..............................</span>`;
  // tiga baris tabel (jabatan · nama · NIP) biar nama ketiganya tetap sejajar walau tanggalnya panjang
  h += `<table class="ttd-resmi">
    <tr class="ttd-jabatan">
      <td>Mengetahui<br>Orang Tua Murid,</td>
      <td>Mengetahui<br>Kepala Sekolah,</td>
      <td>${aman(atur.tempat)}, ${tanggal ? aman(tanggal) : TITIK}<br>Wali Kelas,</td>
    </tr>
    <tr class="ttd-nama">
      <td>${TITIK}</td>
      <td class="ttd-kepala">${atur.kepala ? `<b><u>${aman(atur.kepala)}</u></b>` : TITIK}</td>
      <td>${wali ? `<b><u>${aman(wali.nama)}</u></b>` : TITIK}</td>
    </tr>
    <tr class="ttd-nip">
      <td></td>
      <td><span class="nip-resmi">NIP. ${nip(atur.nipKepala || "-")}</span></td>
      <td><span class="nip-resmi">NIP. ${nip((wali && wali.nip) || "-")}</span></td>
    </tr>
  </table>
  <div class="kaki-rapor"><span>${aman(nama)} | ${aman(nisn || santri.nis || "-")}</span><span>${aman(k.jenjang)}</span></div>
  </div>`;
  return h;
}
