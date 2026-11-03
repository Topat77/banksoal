// =====================================================
//  rapor.js — rapor santri per semester (khusus admin)
//
//  Nilai diambil dari lembar nilai tiap mapel di kelas santri itu.
//  Bentuk rapor masih SEMENTARA (format resmi dari pondok menyusul).
// =====================================================

function mapelKelas(jenjang, kelas) {
  return toko.mapel.filter(m => m.jenjang === jenjang && m.kelas === kelas);
}

// semua nilai satu santri di satu semester
// kelasnya kelas santri DI TAHUN rapor itu (dari riwayatKelas), bukan kelas sekarang
function nilaiRapor(santri, sem) {
  const k = kelasSantriDi(santri, sem.tahun, sem.semester);
  const baris = mapelKelas(k.jenjang, k.kelas).map(m => {
    const n = hitungNilai(lembarNilai(m.id, sem), santri.id, m);
    return {
      mapel: m, jenis: jenisMapel(m),
      tugas: n.per.tugas, uh: n.per.uh, uts: n.per.uts, uas: n.per.uas,
      keaktifan: n.per.keaktifan, kehadiran: n.per.kehadiran,
      akhir: n.akhir, hadir: n.hadir
    };
  });
  const umum = baris.filter(b => b.jenis === "umum");
  const diniah = baris.filter(b => b.jenis === "diniah");
  return {
    umum, diniah,
    rataUmum: rataRata(umum.map(b => b.akhir)),
    rataDiniah: rataRata(diniah.map(b => b.akhir)),
    rataSemua: rataRata(baris.map(b => b.akhir)),
    kosong: baris.filter(b => b.akhir === null).length
  };
}

function semesterRapor() {
  const peta = new Map();
  peta.set(kunciSemester(semesterSekarang()), semesterSekarang());
  for (const m of toko.mapel) for (const l of (toko.isi[m.id] ? toko.isi[m.id].nilai : [])) peta.set(kunciSemester(l), { semester: l.semester, tahun: l.tahun });
  return [...peta.values()].sort(bandingSemester);
}

// ====== DAFTAR RAPOR SATU KELAS ======
// rapor butuh siswa & nilai SEMUA mapel; selama belum kebaca, rapornya bakal berisi "-" (dan
// pilihan semester bisa ketuker), jadi tunggu dulu
function raporSiap() {
  return dataDasarSiap() && toko.mapel.every(m => isiMapelSiap(m.id));
}

function layarRapor() {
  wajibKurikulum();
  if (!raporSiap()) return tampilMemuat("Rapor");
  if (posisi.kelasRapor) {
    const j = posisi.kelasRapor.split("|")[0];
    if (daftarJenjang().includes(j) && j !== jenjangAktif()) pilihJenjang(j);
  }
  const semAda = semesterRapor();
  const kunciSem = posisi.semRapor && semAda.some(x => kunciSemester(x) === posisi.semRapor) ? posisi.semRapor : kunciSemester(semAda[0]);
  posisi.semRapor = kunciSem;
  const sem = dariKunciSemester(kunciSem);
  // kelas sekarang + kelas yang tercatat di riwayat tahun itu (misal kelas 9 yang siswanya udah lulus)
  const petaKelas = new Map();
  for (const x of [...daftarKelas(), ...kelasDiTahun(sem.tahun)]) petaKelas.set(`${x.jenjang}|${x.kelas}`, x);
  const kelasAda = [...petaKelas.values()].filter(x => x.jenjang === jenjangAktif()).sort(bandingKelas);
  const kunciKelas = posisi.kelasRapor && kelasAda.some(x => `${x.jenjang}|${x.kelas}` === posisi.kelasRapor)
    ? posisi.kelasRapor : (kelasAda[0] ? `${kelasAda[0].jenjang}|${kelasAda[0].kelas}` : "");
  posisi.kelasRapor = kunciKelas;
  const [jenjang, kelas] = kunciKelas.split("|");

  judul.textContent = "Rapor";
  jejak.textContent = kelas ? `${kelas}, ${jenjang} · ${namaSemester(sem)}` : jenjangAktif();

  // kelasnya dipilih di menu Siswa (kartu kelas). Pilihan kelas cuma muncul kalau di tahun itu
  // ada kelas yang sekarang sudah tidak ada (misal kelas 9 yang siswanya sudah lulus).
  const sekarang = new Set(daftarKelas().map(x => `${x.jenjang}|${x.kelas}`));
  const kelasLama = kelasAda.filter(x => !sekarang.has(`${x.jenjang}|${x.kelas}`));
  let h = "";
  if (kelasLama.length) {
    h += `<p class="info">Kelas tahun ${aman(sem.tahun)} yang sekarang sudah tidak ada:</p><div class="pilih-semester" role="group" aria-label="Kelas">`;
    for (const x of kelasAda.filter(x => kelasLama.includes(x) || `${x.jenjang}|${x.kelas}` === kunciKelas)) {
      const k = `${x.jenjang}|${x.kelas}`;
      h += `<button class="chip ${k === kunciKelas ? "aktif" : ""}" data-kelas="${aman(k)}" aria-pressed="${k === kunciKelas}">${aman(x.kelas)}</button>`;
    }
    h += `</div>`;
  }
  h += `<div class="pilih-semester" role="group" aria-label="Semester">`;
  for (const x of semAda) {
    const k = kunciSemester(x);
    h += `<button class="chip ${k === kunciSem ? "aktif" : ""}" data-sem="${aman(k)}" aria-pressed="${k === kunciSem}">${aman(namaSemester(x))}</button>`;
  }
  h += `</div>`;

  if (!kelas) {
    isi.innerHTML = h + `<p class="kosong">Belum ada kelas ${aman(jenjangAktif())}.</p>`;
    return pasangPilihRapor();
  }
  const santri = santriKelasDi(jenjang, kelas, sem.tahun, sem.semester);
  const mapel = mapelKelas(jenjang, kelas);
  // wali tahun ajaran sekarang dipilih di menu Siswa; tahun lama dipilih di sini (buat rapor lama)
  h += sem.tahun === semesterSekarang().tahun ? htmlNamaWali(jenjang, kelas, sem.tahun) : htmlPilihWali(jenjang, kelas, sem.tahun);
  h += `<p class="info">${mapel.length} mapel di kelas ini: ${mapel.map(m => `${aman(m.nama)} (${namaJenis(jenisMapel(m))})`).join(", ") || "belum ada"}. Bentuk rapor masih sementara, nanti disesuaikan dengan format resmi pondok.</p>`;

  if (santri.length === 0) {
    h += `<p class="kosong">Belum ada siswa di kelas ini.</p><button class="tombol-kedua" id="keSantri">Isi daftar siswa</button>`;
  } else {
    h += `<div class="daftar">`;
    santri.forEach((s, i) => {
      const r = nilaiRapor(s, sem);
      h += htmlBaris({
        attr: `data-santri="${aman(s.id)}"`,
        nomor: aman(noAbsen(kelasSantriDi(s, sem.tahun, sem.semester), i + 1)),
        judulBaris: aman(s.nama),
        sub: r.kosong ? `${r.kosong} mapel belum ada nilai` : "Semua mapel sudah dinilai",
        kanan: `Rata-rata ${angkaRapi(r.rataSemua)}`,
        tanda: santriKeluar(s) ? HASIL_NAIK[s.status] : r.kosong ? "Belum lengkap" : "",
        tandaJenis: "tanda-tutup"
      });
    });
    h += `</div><button class="tombol-utama" id="cetakKelas">Cetak semua rapor kelas ini</button>`;
  }
  isi.innerHTML = h;
  pasangPilihRapor();
  pasangPilihWali();
  isi.querySelectorAll(".baris[data-santri]").forEach(b => b.onclick = () => pergi("raporCetak", { raporSantri: b.dataset.santri }));
  klik("cetakKelas", () => pergi("raporCetak", { raporSantri: null }));
  klik("keSantri", () => pergi("santri", { kelasSantri: kunciKelas, dariNilai: false }));
}

function pasangPilihRapor() {
  pasangTabJenjang("rapor", { kelasRapor: null });
  isi.querySelectorAll("[data-kelas]").forEach(b => b.onclick = () => pergi("rapor", { kelasRapor: b.dataset.kelas }));
  isi.querySelectorAll("[data-sem]").forEach(b => b.onclick = () => pergi("rapor", { semRapor: b.dataset.sem }));
}

// ====== LEMBAR RAPOR ======
// kolom nilai di rapor: rata-rata tiap kelompok (Tugas & UH boleh lebih dari satu kolom di lembar nilai)
const KOLOM_RAPOR = [
  { k: "tugas", judul: "Tugas" }, { k: "uh", judul: "UH" }, { k: "uts", judul: "UTS" }, { k: "uas", judul: "UAS" },
  { k: "keaktifan", judul: "Keak&shy;tifan", lebar: true }, { k: "kehadiran", judul: "Keha&shy;diran", lebar: true }
];
function htmlTabelRapor(judulBagian, baris, mulai) {
  if (baris.length === 0) return "";
  let h = `<p class="judul-bagian">${judulBagian}</p>
    <table class="tabel-rapor" width="100%">
      <colgroup><col class="kol-no"><col>${KOLOM_RAPOR.map(x => `<col class="kol-angka${x.lebar ? " lebar" : ""}">`).join("")}<col class="kol-akhir-rapor"></colgroup>
      <thead><tr><th>No</th><th>Mata pelajaran</th>${KOLOM_RAPOR.map(x => `<th>${x.judul}</th>`).join("")}<th>Nilai akhir</th></tr></thead><tbody>`;
  baris.forEach((b, i) => {
    h += `<tr><td class="tengah">${mulai + i}</td><td>${spanArah(b.mapel.nama)}</td>
      ${KOLOM_RAPOR.map(x => `<td class="tengah">${angkaRapi(b[x.k])}</td>`).join("")}
      <td class="tengah"><b>${angkaRapi(b.akhir)}</b></td></tr>`;
  });
  return h + `</tbody></table>`;
}

function htmlLembarRapor(santri, sem) {
  const r = nilaiRapor(santri, sem);
  const k = kelasSantriDi(santri, sem.tahun, sem.semester);
  const wali = waliKelas(sem.tahun, idKelas(k.jenjang, k.kelas));
  const tanggal = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  let h = `<div class="kop${pakaiKopResmi() ? " ada-resmi" : ""}">
      ${pakaiKopResmi() ? htmlKopResmi() : `<p class="kop-sekolah">${aman(toko.lembaga.nama || KONFIG.namaLembaga || "")}</p>`}
      <p class="kop-ujian">LAPORAN HASIL BELAJAR SANTRI</p>
    </div>
    <table class="identitas-rapor">
      <tr><td>Nama santri</td><td>: <b>${aman(santri.nama)}</b></td><td>Kelas</td><td>: ${aman(String(k.kelas || "").replace(/^Kelas\s*/i, ""))} (${aman(k.jenjang)})</td></tr>
      <tr><td>NIS</td><td>: ${aman(santri.nis || "-")}</td><td>Semester</td><td>: ${aman(sem.semester)} ${aman(sem.tahun)}</td></tr>
      <tr><td>No. Absen</td><td>: ${aman(k.absen ?? "-")}</td><td></td><td></td></tr>
    </table>`;
  h += htmlTabelRapor("A. Mata Pelajaran Umum", r.umum, 1);
  h += htmlTabelRapor(`${r.umum.length ? "B" : "A"}. Mata Pelajaran Diniah`, r.diniah, 1);
  h += `<table class="tabel-rapor ringkas-rapor">
      ${r.umum.length ? `<tr><td>Rata-rata mapel umum</td><td class="tengah">${angkaRapi(r.rataUmum)}</td></tr>` : ""}
      ${r.diniah.length ? `<tr><td>Rata-rata mapel diniah</td><td class="tengah">${angkaRapi(r.rataDiniah)}</td></tr>` : ""}
      <tr><td><b>Rata-rata seluruh mapel</b></td><td class="tengah"><b>${angkaRapi(r.rataSemua)}</b></td></tr>
    </table>
    <p class="petunjuk kecil">Tugas & UH = rata-rata semua tugas / ulangan harian. Kehadiran = hadir ÷ (hadir + sakit + izin) × 100. Nilai akhir dihitung pakai bobot penilaian dari TU; "-" = belum ada nilainya.</p>
    <table class="ttd-rapor" width="100%"><tr>
      <td>Mengetahui,<br>Kepala PKBM<br><br><br><br>(..............................)</td>
      <td>Tulungagung, ${aman(tanggal)}<br>Wali Kelas<br><br><br><br>${wali
        ? `<b><u>${aman(wali.nama)}</u></b>${wali.nip ? `<br>NIP. ${aman(wali.nip)}` : ""}`
        : "(..............................)"}</td>
    </tr></table>`;
  return h;
}

function layarRaporCetak() {
  wajibKurikulum();
  if (!raporSiap()) {
    tombolKembali.hidden = false;
    return tampilMemuat("Rapor");
  }
  const [jenjang, kelas] = (posisi.kelasRapor || "").split("|");
  const sem = dariKunciSemester(posisi.semRapor || kunciSemester(semesterSekarang()));
  const semua = santriKelasDi(jenjang, kelas, sem.tahun, sem.semester);
  const daftar = posisi.raporSantri ? semua.filter(s => s.id === posisi.raporSantri) : semua;
  if (daftar.length === 0) throw new DataHilang();

  judul.textContent = posisi.raporSantri ? `Rapor ${daftar[0].nama}` : `Rapor ${kelas}`;
  jejak.textContent = `${kelas}, ${jenjang} · ${namaSemester(sem)}`;
  tombolKembali.hidden = false;

  isi.innerHTML = `
    <div class="layar-cetak">
      <div class="panel-cetak jangan-cetak">
        <p class="info">${daftar.length} rapor${daftar.length > 1 ? ", tiap siswa satu halaman" : ""}.</p>
        <div class="baris-tombol"><button class="tombol-utama" id="print">Cetak / PDF</button></div>
        <p class="info">Mau jadi PDF? Di jendela cetak, pilih tujuan "Simpan sebagai PDF".</p>
      </div>
      <div id="lembar">${daftar.map((s, i) => (i ? `<div class="halaman-baru"></div>` : "") + htmlLembarRapor(s, sem)).join("")}</div>
    </div>`;
  document.getElementById("print").onclick = () => window.print();
}
// ====== PILIH WALI KELAS (admin) ======
// dipakai di layar Rapor (tahun rapor yang dipilih) & Daftar siswa (tahun ajaran sekarang)
function htmlPilihWali(jenjang, kelas, tahun) {
  const id = idKelas(jenjang, kelas);
  const w = waliKelas(tahun, id);
  // kelas putra (rombel A): ustadzah tidak boleh jadi wali kelas
  const putra = kelasPutra(kelas);
  const guru = toko.pengguna.filter(p => p.peran === "ustadz" && !(putra && sapaanPengguna(p) === "ustadzah"))
    .sort((a, c) => (a.nama || "").localeCompare(c.nama || "", "id"));
  const akunLama = w && toko.pengguna.find(p => p.id === w.uid);
  const salah = w && putra && akunLama && sapaanPengguna(akunLama) === "ustadzah";
  // wali lama yang akunnya udah nonaktif / dihapus / ustadzah di kelas putra tetap kelihatan
  const lama = w && !guru.some(p => p.id === w.uid)
    ? `<option value="${aman(w.uid)}" selected>${aman(w.nama)} (${salah ? "ustadzah, harus diganti" : "akun nggak aktif"})</option>` : "";
  return `${salah ? `<p class="pemberitahuan-kecil">Wali kelas ${aman(kelas)} tercatat ustadzah. Kelas putra harus diwalikan ustadz, silakan ganti.</p>` : ""}
    <label class="pilih-wali">Wali kelas ${aman(kelas)} · ${aman(tahun)}${putra ? ` <small>(kelas putra: hanya ustadz)</small>` : ""}
      <select data-wali="${aman(id)}" data-wali-tahun="${aman(tahun)}">
        <option value="">Belum dipilih</option>${lama}
        ${guru.map(p => `<option value="${aman(p.id)}" ${w && w.uid === p.id ? "selected" : ""}>${aman(p.nama || p.email || "")}</option>`).join("")}
      </select>
    </label>`;
}
// cuma nampilin nama wali (pilihannya ada di kartu kelas, menu Siswa)
function htmlNamaWali(jenjang, kelas, tahun) {
  const w = waliKelas(tahun, idKelas(jenjang, kelas));
  return `<p class="info">Wali kelas ${aman(kelas)} · ${aman(tahun)}: <b>${w ? aman(w.nama) : "belum dipilih"}</b>. Diatur di menu Siswa.</p>`;
}
function pasangPilihWali() {
  isi.querySelectorAll("[data-wali]").forEach(sel => sel.onchange = () => {
    const akun = toko.pengguna.find(p => p.id === sel.value && p.peran === "ustadz");
    if (sel.value && !akun) return;   // wali lama yang nggak aktif dipilih lagi: biarin
    const id = sel.dataset.wali;
    const kelas = daftarKelas().find(k => idKelas(k.jenjang, k.kelas) === id);
    if (akun && kelas && kelasPutra(kelas.kelas) && sapaanPengguna(akun) === "ustadzah") {
      kabar("Ustadzah tidak boleh menjadi wali kelas putra.");
      return tampilkan(true);
    }
    simpanWali(sel.dataset.waliTahun, sel.dataset.wali, akun || null);
  });
}
