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
function nilaiRapor(santri, sem) {
  const baris = mapelKelas(santri.jenjang, santri.kelas).map(m => {
    const n = hitungNilai(lembarNilai(m.id, sem), santri.id, m);
    return { mapel: m, jenis: jenisMapel(m), harian: n.harian, uts: n.per.uts, uas: n.per.uas, akhir: n.akhir, hadir: n.hadir };
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
function layarRapor() {
  wajibKurikulum();
  if (posisi.kelasRapor) {
    const j = posisi.kelasRapor.split("|")[0];
    if (daftarJenjang().includes(j) && j !== jenjangAktif()) pilihJenjang(j);
  }
  const kelasAda = daftarKelas().filter(x => x.jenjang === jenjangAktif());
  const kunciKelas = posisi.kelasRapor && kelasAda.some(x => `${x.jenjang}|${x.kelas}` === posisi.kelasRapor)
    ? posisi.kelasRapor : (kelasAda[0] ? `${kelasAda[0].jenjang}|${kelasAda[0].kelas}` : "");
  posisi.kelasRapor = kunciKelas;
  const [jenjang, kelas] = kunciKelas.split("|");
  const semAda = semesterRapor();
  const kunciSem = posisi.semRapor && semAda.some(x => kunciSemester(x) === posisi.semRapor) ? posisi.semRapor : kunciSemester(semAda[0]);
  posisi.semRapor = kunciSem;
  const sem = dariKunciSemester(kunciSem);

  judul.textContent = "Rapor";
  jejak.textContent = kelas ? `${kelas}, ${jenjang} · ${namaSemester(sem)}` : jenjangAktif();

  let h = htmlTabJenjang() + `<div class="pilih-semester" role="group" aria-label="Kelas">`;
  for (const x of kelasAda) {
    const k = `${x.jenjang}|${x.kelas}`;
    h += `<button class="chip ${k === kunciKelas ? "aktif" : ""}" data-kelas="${aman(k)}" aria-pressed="${k === kunciKelas}">${aman(x.kelas)}</button>`;
  }
  h += `</div><div class="pilih-semester" role="group" aria-label="Semester">`;
  for (const x of semAda) {
    const k = kunciSemester(x);
    h += `<button class="chip ${k === kunciSem ? "aktif" : ""}" data-sem="${aman(k)}" aria-pressed="${k === kunciSem}">${aman(namaSemester(x))}</button>`;
  }
  h += `</div>`;

  if (!kelas) {
    isi.innerHTML = h + `<p class="kosong">Belum ada kelas ${aman(jenjangAktif())}.</p>`;
    return pasangPilihRapor();
  }
  const santri = santriKelas(jenjang, kelas);
  const mapel = mapelKelas(jenjang, kelas);
  h += `<p class="info">${mapel.length} mapel di kelas ini: ${mapel.map(m => `${aman(m.nama)} (${namaJenis(jenisMapel(m))})`).join(", ") || "belum ada"}. Bentuk rapor masih sementara, nanti disesuaikan dengan format resmi pondok.</p>`;

  if (santri.length === 0) {
    h += `<p class="kosong">Belum ada siswa di kelas ini.</p><button class="tombol-kedua" id="keSantri">Isi daftar siswa</button>`;
  } else {
    h += `<div class="daftar">`;
    santri.forEach((s, i) => {
      const r = nilaiRapor(s, sem);
      h += htmlBaris({
        attr: `data-santri="${aman(s.id)}"`,
        nomor: aman(noAbsen(s, i + 1)),
        judulBaris: aman(s.nama),
        sub: r.kosong ? `${r.kosong} mapel belum ada nilai` : "Semua mapel sudah dinilai",
        kanan: `Rata-rata ${angkaRapi(r.rataSemua)}`,
        tanda: r.kosong ? "Belum lengkap" : "",
        tandaJenis: "tanda-tutup"
      });
    });
    h += `</div><button class="tombol-utama" id="cetakKelas">Cetak semua rapor kelas ini</button>`;
  }
  isi.innerHTML = h;
  pasangPilihRapor();
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
function htmlTabelRapor(judulBagian, baris, mulai) {
  if (baris.length === 0) return "";
  let h = `<p class="judul-bagian">${judulBagian}</p>
    <table class="tabel-rapor" width="100%">
      <thead><tr><th width="28">No</th><th>Mata pelajaran</th><th width="52">Harian</th><th width="46">UTS</th><th width="46">UAS</th><th width="58">Nilai akhir</th><th width="38">H</th><th width="38">S</th><th width="38">I</th></tr></thead><tbody>`;
  baris.forEach((b, i) => {
    h += `<tr><td class="tengah">${mulai + i}</td><td>${spanArah(b.mapel.nama)}</td>
      <td class="tengah">${angkaRapi(b.harian)}</td><td class="tengah">${angkaRapi(b.uts)}</td><td class="tengah">${angkaRapi(b.uas)}</td>
      <td class="tengah"><b>${angkaRapi(b.akhir)}</b></td>
      <td class="tengah">${b.hadir ? b.hadir.hadir : "-"}</td><td class="tengah">${b.hadir ? b.hadir.sakit : "-"}</td><td class="tengah">${b.hadir ? b.hadir.izin : "-"}</td></tr>`;
  });
  return h + `</tbody></table>`;
}

function htmlLembarRapor(santri, sem) {
  const r = nilaiRapor(santri, sem);
  const tanggal = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  let h = `<div class="kop${pakaiKopResmi() ? " ada-resmi" : ""}">
      ${pakaiKopResmi() ? htmlKopResmi() : `<p class="kop-sekolah">${aman(toko.lembaga.nama || KONFIG.namaLembaga || "")}</p>`}
      <p class="kop-ujian">LAPORAN HASIL BELAJAR SANTRI</p>
    </div>
    <table class="identitas-rapor">
      <tr><td>Nama santri</td><td>: <b>${aman(santri.nama)}</b></td><td>Kelas</td><td>: ${aman(santri.kelas.replace(/^Kelas\s*/i, ""))} (${aman(santri.jenjang)})</td></tr>
      <tr><td>NIS</td><td>: ${aman(santri.nis || "-")}</td><td>Semester</td><td>: ${aman(sem.semester)} ${aman(sem.tahun)}</td></tr>
      <tr><td>No. Absen</td><td>: ${aman(santri.absen ?? "-")}</td><td></td><td></td></tr>
    </table>`;
  h += htmlTabelRapor("A. Mata Pelajaran Umum", r.umum, 1);
  h += htmlTabelRapor(`${r.umum.length ? "B" : "A"}. Mata Pelajaran Diniah`, r.diniah, 1);
  h += `<table class="tabel-rapor ringkas-rapor">
      ${r.umum.length ? `<tr><td>Rata-rata mapel umum</td><td class="tengah">${angkaRapi(r.rataUmum)}</td></tr>` : ""}
      ${r.diniah.length ? `<tr><td>Rata-rata mapel diniah</td><td class="tengah">${angkaRapi(r.rataDiniah)}</td></tr>` : ""}
      <tr><td><b>Rata-rata seluruh mapel</b></td><td class="tengah"><b>${angkaRapi(r.rataSemua)}</b></td></tr>
    </table>
    <p class="petunjuk kecil">H = hadir, S = sakit, I = izin (jumlah pertemuan di tiap mapel).</p>
    <table class="ttd-rapor" width="100%"><tr>
      <td>Mengetahui,<br>Kepala PKBM<br><br><br><br>(..............................)</td>
      <td>Tulungagung, ${aman(tanggal)}<br>Wali Kelas<br><br><br><br>(..............................)</td>
    </tr></table>`;
  return h;
}

function layarRaporCetak() {
  wajibKurikulum();
  const [jenjang, kelas] = (posisi.kelasRapor || "").split("|");
  const sem = dariKunciSemester(posisi.semRapor || kunciSemester(semesterSekarang()));
  const semua = santriKelas(jenjang, kelas);
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