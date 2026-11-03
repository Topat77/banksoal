// =====================================================
//  menuguru.js — menu guru (ustadz/ustadzah): Beranda · Mapel · Siswa · Saya
//  - Mapel: kotak per mapel yang diampu → halaman mapel (modul, soal, sumatif).
//           AI Generator & Cari soal dibuka dari sini.
//  - Siswa: kelas yang diajar (daftar siswa & wali kelas, cuma lihat) + tombol isi nilai.
//  Isi layar lama (mapel, modul, nilai, ...) dan alurnya nggak berubah.
// =====================================================

// tombol ‹ menu guru (dipakai layarInduk & tampilkan lewat indukLayarMenu)
function indukLayarGuru() {
  const L = posisi.layar;
  if (L === "mapel" || L === "aiGenerator" || L === "cari") return "mapelGuru";
  if (L === "nilai" && posisi.dariSiswaGuru) return "siswaGuru";
  return null;
}
// menu guru yang menyala buat layar sekarang
function kelompokLayarGuru() {
  const L = posisi.layar;
  if (L === "beranda" || L === "pilihMapel") return "beranda";
  if (L === "lainnya") return "lainnya";
  if (L === "siswaGuru" || L === "nilai" || L === "santri") return "siswa";
  return "mapelGuru";
}
// induk layar sesuai peran (TU: admin.js, guru: di atas)
function indukLayarMenu() {
  return sayaKurikulum() ? indukLayarTU() : indukLayarGuru();
}

// ---- MAPEL (guru): kotak per mapel yang diampu ----
function layarMapelGuru() {
  judul.textContent = "Mapel";
  const sem = semesterSekarang();
  jejak.textContent = namaSemester(sem);
  if (!dataDasarSiap()) return tampilMemuat("Mapel");
  const diampu = mapelDiampu();

  let h = `
    <div class="aksi-tu">
      <button class="tombol-kedua" id="keAI">${ikonMenu("ai")}Buat soal pakai AI</button>
      <button class="tombol-kedua" id="keCari">${ikonMenu("cari")}Cari soal</button>
    </div>`;
  if (!diampu.length) {
    h += `<p class="kosong">Kamu belum ditugaskan ke mapel mana pun. Minta admin (TU) menambahkan kamu sebagai pengampu.</p>`;
  }
  for (const k of kelompokJenis(diampu)) {
    h += `<h2 class="subjudul">Mapel ${namaJenis(k.jenis).toLowerCase()} <small>${k.mapel.length} mapel</small></h2><div class="ubin-mapel-daftar">`;
    for (const mp of [...k.mapel].sort(bandingKelas)) {
      const siap = isiMapelSiap(mp.id);
      const modul = siap ? modulMapel(mp.id).filter(x => milikSaya(x) && samaSemester(x, sem)) : [];
      const soal = modul.reduce((x, m) => x + jumlahSoal(m), 0);
      h += `
        <button class="ubin-mapel" data-mapel-guru="${aman(mp.id)}">
          <strong dir="auto">${aman(mp.nama)}</strong>
          <small>${aman(mp.kelas)} · ${aman(mp.jenjang)}</small>
          <small>${siap ? `${modul.length} modul · ${soal} soal` : "Memuat..."}</small>
          ${siap && !modul.length ? `<span class="tanda tanda-ragu">Belum ada modul</span>` : ""}
        </button>`;
    }
    h += `</div>`;
  }
  isi.innerHTML = h;

  klik("keAI", () => pergi("aiGenerator"));
  klik("keCari", () => pergi("cari", { kata: "" }));
  isi.querySelectorAll("[data-mapel-guru]").forEach(b => b.onclick = () =>
    pergi("mapel", { mapelId: b.dataset.mapelGuru, tab: "modul", semester: null }));
}

// ---- SISWA (guru): kelas yang diajar ----
function layarSiswaGuru() {
  judul.textContent = "Siswa";
  const tahun = semesterSekarang().tahun;
  jejak.textContent = `Tahun ajaran ${tahun}`;
  if (!dataDasarSiap()) return tampilMemuat("Siswa");
  const diampu = mapelDiampu();
  const kelas = daftarKelas().filter(k => kelasDiajar().has(`${k.jenjang}|${k.kelas}`));

  let h = `<p class="info">Kelas yang kamu ajar. Pilih mapel untuk mengisi nilai.</p>`;
  if (!kelas.length) h += `<p class="kosong">Kamu belum mengajar di kelas mana pun.</p>`;
  for (const kl of kelas) {
    const kunci = `${kl.jenjang}|${kl.kelas}`;
    const siswa = santriKelas(kl.jenjang, kl.kelas);
    const wali = waliKelas(tahun, idKelas(kl.jenjang, kl.kelas));
    const mapel = diampu.filter(m => m.jenjang === kl.jenjang && m.kelas === kl.kelas).sort(urutMapelJenis);
    h += `
      <section class="panel kelas-guru">
        <div class="panel-kepala"><h2>Kelas ${aman(kl.kelas)} <small>${aman(kl.jenjang)}</small></h2><span class="info">${siswa.length} siswa</span></div>
        <p class="info">Wali kelas: ${wali ? aman(wali.nama) : "belum dipilih"}</p>
        <div class="baris-tombol">${mapel.map(m =>
          `<button class="tombol-utama" data-isi-nilai="${aman(m.id)}">Isi nilai ${aman(m.nama)}</button>`).join("")}</div>
        <details class="kartu-kelas" data-kartu-kelas="${aman(kunci)}" ${posisi.kelasTerbuka === kunci ? "open" : ""}>
          <summary><span><strong>Daftar siswa</strong><small>${siswa.length} siswa</small></span></summary>
          <div class="isi-kartu-kelas">
            ${siswa.length ? `<ol class="daftar-siswa-kelas">${siswa.map((s, i) => `<li><span class="nomor-santri">${aman(noAbsen(s, i + 1))}</span><span dir="auto">${aman(s.nama)}</span>${s.nis ? `<small>${aman(s.nis)}</small>` : ""}</li>`).join("")}</ol>`
              : `<p class="info">Daftar siswa kelas ini belum diisi admin (TU).</p>`}
          </div>
        </details>
      </section>`;
  }
  isi.innerHTML = h;

  isi.querySelectorAll("[data-kartu-kelas]").forEach(d => d.addEventListener("toggle", () => {
    if (d.open) posisi.kelasTerbuka = d.dataset.kartuKelas;
    else if (posisi.kelasTerbuka === d.dataset.kartuKelas) posisi.kelasTerbuka = null;
  }));
  isi.querySelectorAll("[data-isi-nilai]").forEach(b => b.onclick = () =>
    pergi("nilai", { mapelId: b.dataset.isiNilai, semester: null, dariSiswaGuru: true }));
}
