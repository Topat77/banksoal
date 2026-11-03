// =====================================================
//  admin.js — menu TU (admin): Mapel, Guru, Siswa
//  Menu TU cuma 5: Beranda · Mapel · Guru · Siswa · Saya.
//  Layar lama (Mapel & pengampu, Bobot, UAS bersama, Pantauan, Rapor, Daftar siswa)
//  tetap ada dan alurnya sama; sekarang dibuka dari dalam tiga layar di bawah.
//  - Mapel: kotak per nama mapel → daftar kelas yang punya mapel itu
//  - Guru:  akun guru · pantau per guru · pantau per mapel
//  - Siswa: Putra (A) / Putri (B) → Paket B / Paket C → kelas → daftar siswa
// =====================================================

// ---- induk layar TU (dipakai tombol ‹ dan penanda menu) ----
const INDUK_TU = {
  mapelNamaTU: "mapelTU", kelolaMapel: "mapelTU", bobot: "mapelTU", daftarUAS: "mapelTU",
  rapor: "kelasSiswa", santri: "kelasSiswa"
};
// layar TU yang punya induk: tombol ‹ ditampilkan (santri dari lembar nilai tetap balik ke nilai)
function indukLayarTU() {
  if (!sayaKurikulum()) return null;
  const L = posisi.layar;
  if (L === "santri" && posisi.dariNilai) return null;
  if (L === "formMapel" && !posisi.dariMapel && posisi.dariMapelTU) return "mapelNamaTU";
  if (L === "mapel" && posisi.namaMapelTU) {
    const mp = cariMapel(posisi.mapelId);
    if (mp && mp.nama === posisi.namaMapelTU) return "mapelNamaTU";
  }
  return INDUK_TU[L] || null;
}
// menu TU yang menyala buat layar sekarang
function kelompokLayarTU() {
  const L = posisi.layar;
  if (L === "beranda" || L === "pilihMapel") return "beranda";
  if (L === "cari") return "cari";
  if (L === "lainnya") return "lainnya";
  if (["akun", "formGuru", "pantauan", "pantauGuru"].includes(L)) return "guru";
  if (["kelasSiswa", "rapor", "raporCetak"].includes(L) || (L === "santri" && !posisi.dariNilai)) return "siswa";
  return "mapelTU";
}

// ---- tab di atas layar Guru: Akun guru · Pantau per guru · Pantau per mapel ----
function htmlSegmenGuru(aktif) {
  const n = jumlahMenunggu();
  const tombol = [["akun", "Akun guru", n ? `<small>${n} menunggu</small>` : ""], ["pantauGuru", "Pantau per guru", ""], ["pantauan", "Pantau per mapel", ""]];
  return `<div class="pilih-kelompok segmen-tu" role="group" aria-label="Bagian halaman Guru">${tombol.map(([ke, teks, tambah]) =>
    `<button class="${ke === aktif ? "aktif" : ""}" data-segmen="${ke}" aria-pressed="${ke === aktif}">${teks}${tambah ? " " + tambah : ""}</button>`).join("")}</div>`;
}
function pasangSegmenGuru() {
  isi.querySelectorAll("[data-segmen]").forEach(b => b.onclick = () => pergi(b.dataset.segmen));
}

// =====================================================
//  MAPEL (TU): kotak per nama mapel
// =====================================================
// ringkasan satu kelompok mapel (semua kelas dengan nama mapel yang sama) di semester sekarang
function ringkasMapelTU(daftar, sem) {
  const guru = new Set(daftar.flatMap(m => m.pengampu || []));
  const siap = daftar.filter(m => isiMapelSiap(m.id));
  const adaModul = siap.filter(m => modulMapel(m.id).some(x => samaSemester(x, sem))).length;
  return { kelas: daftar.length, guru: guru.size, adaModul, siap: siap.length, tanpaGuru: daftar.filter(m => !(m.pengampu || []).length).length };
}

function layarMapelTU() {
  wajibKurikulum();
  judul.textContent = "Mapel";
  if (!dataDasarSiap()) return tampilMemuat("Mapel");
  const jenjang = jenjangAktif();
  const sem = semesterSekarang();
  jejak.textContent = `${jenjang} · ${namaSemester(sem)}`;
  const mapelJenjang = toko.mapel.filter(m => m.jenjang === jenjang);
  const nUAS = jumlahUASDiajukan();

  let h = htmlTabJenjang() + `
    <div class="aksi-tu">
      <button class="tombol-kedua" data-ke-tu="bobot">${ikonMenu("bobot")}Bobot nilai</button>
      <button class="tombol-kedua" data-ke-tu="daftarUAS">${ikonMenu("uas")}UAS bersama${nUAS ? ` <span class="lencana">${nUAS}<span class="sr"> diajukan</span></span>` : ""}</button>
      <button class="tombol-kedua" data-ke-tu="kelolaMapel">${ikonMenu("mapel")}Daftar lengkap</button>
    </div>`;

  if (mapelJenjang.length === 0) {
    h += `<p class="kosong">Belum ada mapel ${aman(jenjang)}.</p>`;
  }
  for (const k of kelompokJenis(mapelJenjang)) {
    // satu kotak = satu nama mapel (misal "Fiqih" di 7A1, 7B1, 8A1)
    const perNama = new Map();
    for (const m of k.mapel) {
      if (!perNama.has(m.nama)) perNama.set(m.nama, []);
      perNama.get(m.nama).push(m);
    }
    h += `<h2 class="subjudul">Mapel ${namaJenis(k.jenis).toLowerCase()} <small>${perNama.size} mapel</small></h2><div class="ubin-mapel-daftar">`;
    for (const [nama, daftar] of [...perNama.entries()].sort((a, b) => a[0].localeCompare(b[0], "id"))) {
      const r = ringkasMapelTU(daftar, sem);
      const perhatian = r.tanpaGuru ? `${r.tanpaGuru} kelas belum ada guru` : (r.siap === r.kelas && r.adaModul < r.kelas ? `${r.kelas - r.adaModul} kelas belum ada modul` : "");
      h += `
        <button class="ubin-mapel" data-nama-mapel="${aman(nama)}">
          <strong dir="auto">${aman(nama)}</strong>
          <small>${r.kelas} kelas · ${r.guru} guru</small>
          ${perhatian ? `<span class="tanda tanda-ragu">${aman(perhatian)}</span>` : ""}
        </button>`;
    }
    h += `</div>`;
  }
  h += `<button class="tombol-utama" id="tambahMapel">+ Tambah mapel ${aman(jenjang)}</button>`;
  isi.innerHTML = h;

  pasangTabJenjang("mapelTU");
  isi.querySelectorAll("[data-ke-tu]").forEach(b => b.onclick = () => pergi(b.dataset.keTu, { dariMapel: false, dariMapelTU: false }));
  isi.querySelectorAll("[data-nama-mapel]").forEach(b => b.onclick = () => pergi("mapelNamaTU", { namaMapelTU: b.dataset.namaMapel }));
  document.getElementById("tambahMapel").onclick = () => pergi("formMapel", { mapelEditId: null, dariMapel: false, dariMapelTU: false });
}

// satu nama mapel: daftar kelasnya, pengampu, dan isi semester sekarang
function layarMapelNamaTU() {
  wajibKurikulum();
  const nama = posisi.namaMapelTU || "";
  const jenjang = jenjangAktif();
  const sem = semesterSekarang();
  judul.textContent = nama || "Mapel";
  jejak.textContent = `${jenjang} · ${namaSemester(sem)}`;
  if (!dataDasarSiap()) return tampilMemuat(nama);
  const daftar = toko.mapel.filter(m => m.jenjang === jenjang && m.nama === nama).sort(bandingKelas);
  if (daftar.length === 0) throw new DataHilang();

  let h = `<div class="daftar-kelas-mapel">`;
  for (const mp of daftar) {
    const siap = isiMapelSiap(mp.id);
    const modul = siap ? modulMapel(mp.id).filter(x => samaSemester(x, sem)) : [];
    const sumatif = siap ? sumatifMapel(mp.id).filter(x => samaSemester(x, sem)) : [];
    const soal = modul.reduce((x, m) => x + jumlahSoal(m), 0);
    const guru = (mp.pengampu || []).map(u => namaPengguna(u) || (mp.namaPengampu || {})[u]).filter(Boolean);
    const takSesuai = pengampuTakSesuai(mp).length;
    h += `
      <section class="kartu-pantau">
        <button class="kartu-pantau-judul" data-buka-mapel="${aman(mp.id)}">
          <span><strong>${aman(mp.kelas)}</strong><small>${guru.length ? aman(guru.join(", ")) : "Belum ada guru"}</small></span>
          <span class="baris-panah" aria-hidden="true">›</span>
        </button>
        <div class="isi-kelas-mapel">
          ${siap ? `<p class="angka-kecil"><span><b>${modul.length}</b> modul</span><span><b>${soal}</b> soal</span><span><b>${sumatif.length}</b> sumatif</span></p>` : `<p class="info">Memuat...</p>`}
          ${takSesuai ? `<p class="pemberitahuan-kecil">Ada ustadzah yang tercatat mengajar di kelas putra ini.</p>` : ""}
          <button class="tombol-teks" data-ubah-mapel="${aman(mp.id)}">Ubah mapel &amp; guru</button>
        </div>
      </section>`;
  }
  h += `</div>`;
  isi.innerHTML = h;
  tombolKembali.hidden = false;

  isi.querySelectorAll("[data-buka-mapel]").forEach(b => b.onclick = () =>
    pergi("mapel", { mapelId: b.dataset.bukaMapel, semester: null, tab: "modul" }));
  isi.querySelectorAll("[data-ubah-mapel]").forEach(b => b.onclick = () =>
    pergi("formMapel", { mapelEditId: b.dataset.ubahMapel, dariMapel: false, dariMapelTU: true }));
}

// =====================================================
//  GURU (TU): pantau per guru
// =====================================================
// persen sel nilai yang sudah terisi di lembar nilai satu mapel (null kalau belum ada siswa)
function persenNilaiTerisi(mp, sem) {
  const santri = santriKelas(mp.jenjang, mp.kelas);
  if (!santri.length) return null;
  const lembar = lembarNilai(mp.id, sem);
  const kolom = lembar ? (lembar.kolom || []) : [];
  if (!kolom.length) return 0;
  let isiSel = 0;
  for (const s of santri) for (const k of kolom) {
    const v = ((lembar.nilai || {})[s.id] || {})[k.id];
    if (typeof v === "number" && !Number.isNaN(v)) isiSel++;
  }
  return isiSel / (santri.length * kolom.length);
}

function layarPantauGuru() {
  wajibKurikulum();
  judul.textContent = "Guru";
  const sem = semesterSekarang();
  jejak.textContent = `Pantau per guru · ${namaSemester(sem)}`;
  if (!dataDasarSiap() || !toko.penggunaSiap) return tampilMemuat("Guru");

  const guru = toko.pengguna.filter(p => p.peran === "ustadz")
    .sort((a, b) => (a.nama || "").localeCompare(b.nama || "", "id"));
  const belumSiap = toko.mapel.some(m => !isiMapelSiap(m.id));

  let h = htmlSegmenGuru("pantauGuru");
  if (guru.length === 0) h += `<p class="kosong">Belum ada akun guru yang aktif.</p>`;
  h += `<div class="daftar-guru-pantau">`;
  for (const p of guru) {
    const ajar = toko.mapel.filter(m => (m.pengampu || []).includes(p.id)).sort(bandingKelas);
    const kelas = new Map();
    for (const mp of ajar) {
      const kunci = `${mp.jenjang}|${mp.kelas}`;
      if (!kelas.has(kunci)) kelas.set(kunci, []);
      kelas.get(kunci).push(mp);
    }
    // angka per mapel: cuma modul & sumatif milik guru ini
    const baris = ajar.map(mp => {
      const siap = isiMapelSiap(mp.id);
      const modul = siap ? modulMapel(mp.id).filter(x => x.pemilik === p.id && samaSemester(x, sem)) : [];
      const sumatif = siap ? sumatifMapel(mp.id).filter(x => x.pemilik === p.id && samaSemester(x, sem)) : [];
      return { mp, siap, modul: modul.length, soal: modul.reduce((x, m) => x + jumlahSoal(m), 0), sumatif: sumatif.length,
        nilai: persenNilaiTerisi(mp, sem), terakhir: Math.max(0, ...modul.map(m => m.diubah || 0), ...sumatif.map(s => s.diubah || 0)) };
    });
    const total = (k) => baris.reduce((x, b) => x + b[k], 0);
    const adaNilai = baris.filter(b => b.nilai !== null);
    const rataNilai = adaNilai.length ? Math.round(adaNilai.reduce((x, b) => x + b.nilai, 0) / adaNilai.length * 100) : null;
    const terakhir = Math.max(0, ...baris.map(b => b.terakhir));
    const belumModul = baris.filter(b => b.siap && b.modul === 0).length;

    h += `
      <details class="kartu-guru">
        <summary>
          <span class="kartu-guru-nama"><strong>${aman(p.nama || "Tanpa nama")}</strong>
            <small>${aman(SAPAAN[sapaanPengguna(p)] || "Sapaan belum diatur")}${p.nip ? ` · NIP ${aman(p.nip)}` : ""}${terakhir ? ` · terakhir mengisi ${aman(waktuRapi(terakhir))}` : ""}</small></span>
          <span class="angka-kecil">
            <span><b>${kelas.size}</b> kelas</span><span><b>${ajar.length}</b> mapel</span>
            <span><b>${total("modul")}</b> modul</span><span><b>${total("soal")}</b> soal</span>
            <span><b>${total("sumatif")}</b> sumatif</span><span><b>${rataNilai === null ? "-" : rataNilai + "%"}</b> nilai</span>
          </span>
          ${belumModul ? `<span class="tanda tanda-ragu">${belumModul} mapel belum ada modul</span>` : ""}
        </summary>`;
    if (!ajar.length) {
      h += `<p class="info">Belum mengampu mapel. Atur di Mapel → pilih mapel → Ubah mapel &amp; guru.</p>`;
    } else {
      h += `<table class="tabel-pantau">
        <thead><tr><th>Kelas &amp; mapel</th><th>Modul</th><th>Soal</th><th>Sumatif</th><th>Nilai terisi</th></tr></thead><tbody>`;
      for (const b of baris) {
        h += `
          <tr>
            <td data-label="Kelas &amp; mapel"><button class="tombol-teks" data-buka-mapel="${aman(b.mp.id)}">${aman(b.mp.kelas)} · ${aman(b.mp.nama)}</button> <small>${aman(b.mp.jenjang)}</small></td>
            <td data-label="Modul">${!b.siap ? "…" : b.modul || `<span class="merah">Belum ada</span>`}</td>
            <td data-label="Soal">${b.siap ? b.soal : "…"}</td>
            <td data-label="Sumatif">${b.siap ? b.sumatif : "…"}</td>
            <td data-label="Nilai terisi">${b.nilai === null ? "-" : Math.round(b.nilai * 100) + "%"}</td>
          </tr>`;
      }
      h += `</tbody></table>`;
    }
    h += `</details>`;
  }
  h += `</div>`;
  if (belumSiap) h += `<p class="info">Sebagian data masih dimuat...</p>`;
  isi.innerHTML = h;

  pasangSegmenGuru();
  isi.querySelectorAll("[data-buka-mapel]").forEach(b => b.onclick = () =>
    pergi("mapel", { mapelId: b.dataset.bukaMapel, semester: null, tab: "modul", namaMapelTU: null }));
}

// =====================================================
//  SISWA (TU): Putra (A) / Putri (B) → Paket → kelas → siswa
// =====================================================
function layarKelasSiswa() {
  wajibKurikulum();
  judul.textContent = "Siswa";
  if (!dataDasarSiap()) return tampilMemuat("Siswa");
  const tahun = semesterSekarang().tahun;
  const semua = daftarKelas();
  const BAGIAN = [["putra", "Putra (A)", x => kelasPutra(x.kelas)], ["putri", "Putri (B)", x => /^\s*\d+\s*B/i.test(x.kelas)],
    ["lain", "Lainnya", x => !/^\s*\d+\s*[AB]/i.test(x.kelas)]];
  const ada = BAGIAN.filter(([k, , cocok]) => k !== "lain" || semua.some(cocok));
  const pilih = ada.some(b => b[0] === posisi.bagianSiswa) ? posisi.bagianSiswa : "putra";
  const cocok = ada.find(b => b[0] === pilih)[2];
  jejak.textContent = `Tahun ajaran ${tahun}`;

  let h = `<div class="pilih-kelompok" role="group" aria-label="Putra atau putri">${ada.map(([k, label, f]) => {
    const n = semua.filter(f).reduce((x, kl) => x + santriKelas(kl.jenjang, kl.kelas).length, 0);
    return `<button class="${k === pilih ? "aktif" : ""}" data-bagian="${k}" aria-pressed="${k === pilih}">${label} <small>${n} siswa</small></button>`;
  }).join("")}</div>`;

  let adaKelas = false;
  for (const jenjang of daftarJenjang()) {
    const kelas = semua.filter(x => x.jenjang === jenjang && cocok(x));
    h += `<section class="panel panel-paket"><div class="panel-kepala"><h2>${aman(jenjang)}</h2><span class="info">${kelas.length} kelas</span></div>`;
    if (!kelas.length) {
      h += `<p class="info">Belum ada kelas ${pilih === "putri" ? "putri" : pilih === "putra" ? "putra" : ""} di ${aman(jenjang)}.</p></section>`;
      continue;
    }
    adaKelas = true;
    for (const kl of kelas) {
      const siswa = santriKelas(kl.jenjang, kl.kelas);
      const wali = waliKelas(tahun, idKelas(kl.jenjang, kl.kelas));
      const mapel = toko.mapel.filter(m => m.jenjang === kl.jenjang && m.kelas === kl.kelas).sort(urutMapelJenis);
      const kunci = `${kl.jenjang}|${kl.kelas}`;
      h += `
        <details class="kartu-kelas">
          <summary>
            <span><strong>Kelas ${aman(kl.kelas)}</strong><small>Wali kelas: ${wali ? aman(wali.nama) : "belum dipilih"}</small></span>
            <span class="angka-kecil"><span><b>${siswa.length}</b> siswa</span><span><b>${mapel.length}</b> mapel</span></span>
          </summary>
          <div class="isi-kartu-kelas">
            <h3>Daftar siswa</h3>
            ${siswa.length ? `<ol class="daftar-siswa-kelas">${siswa.map((s, i) => `<li><span class="nomor-santri">${aman(noAbsen(s, i + 1))}</span><span dir="auto">${aman(s.nama)}</span>${s.nis ? `<small>${aman(s.nis)}</small>` : ""}</li>`).join("")}</ol>`
              : `<p class="info">Belum ada siswa.</p>`}
            <h3>Guru per mapel</h3>
            ${mapel.length ? `<ul class="daftar-guru-kelas">${mapel.map(m => {
              const g = (m.pengampu || []).map(u => namaPengguna(u) || (m.namaPengampu || {})[u]).filter(Boolean);
              return `<li><span dir="auto">${aman(m.nama)}</span><small>${g.length ? aman(g.join(", ")) : "belum ada guru"}</small></li>`;
            }).join("")}</ul>` : `<p class="info">Belum ada mapel di kelas ini.</p>`}
            <div class="baris-tombol">
              <button class="tombol-kedua" data-ubah-siswa="${aman(kunci)}">Ubah daftar siswa</button>
              <button class="tombol-kedua" data-rapor="${aman(kunci)}">Rapor</button>
            </div>
          </div>
        </details>`;
    }
    h += `</section>`;
  }
  if (!adaKelas && !semua.length) h += `<p class="kosong">Belum ada kelas. Kelas muncul setelah mapel atau siswanya ditambahkan.</p>`;
  isi.innerHTML = h;

  isi.querySelectorAll("[data-bagian]").forEach(b => b.onclick = () => pergi("kelasSiswa", { bagianSiswa: b.dataset.bagian }));
  isi.querySelectorAll("[data-ubah-siswa]").forEach(b => b.onclick = () => pergi("santri", { kelasSantri: b.dataset.ubahSiswa, dariNilai: false }));
  isi.querySelectorAll("[data-rapor]").forEach(b => b.onclick = () => pergi("rapor", { kelasRapor: b.dataset.rapor }));
}
