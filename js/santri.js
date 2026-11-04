// =====================================================
//  santri.js — daftar siswa per kelas (TU ngetik, guru lihat), siswa keluar (lulus /
//  pindah sekolah), dan panel keputusan naik kelas (khusus TU, setelah rapat pleno).
//  Riwayat & aturan naik/pindah kelasnya ada di naikkelas.js.
// =====================================================

function daftarKelas() {
  const peta = new Map();
  const tambah = (j, k) => { if (j && k) peta.set(`${j}|${k}`, { jenjang: j, kelas: k }); };
  for (const m of toko.mapel) tambah(m.jenjang, m.kelas);
  for (const s of toko.santri) if (s.aktif !== false) tambah(s.jenjang, s.kelas);
  return [...peta.values()].sort(bandingKelas);
}
// urut jenjang, lalu kelas: 7A1, 7A2, 7B1, 7B2, 8A1, ...
function bandingKelas(a, b) {
  const urut = Object.keys(KELAS_PER_JENJANG);
  return (urut.indexOf(a.jenjang) - urut.indexOf(b.jenjang)) ||
    a.kelas.localeCompare(b.kelas, "id", { numeric: true, sensitivity: "base" });
}
// kelas yang boleh dibuka di daftar santri: admin semua, ustadz kelas yang dia ajar
function kelasBolehDilihat() {
  if (sayaKurikulum()) return daftarKelas();
  const ajar = kelasDiajar();
  return daftarKelas().filter(x => ajar.has(`${x.jenjang}|${x.kelas}`));
}

// No. Absen buat tampilan (kalau belum diisi, pakai urutan)
function noAbsen(santri, urutan) {
  return santri.absen !== undefined && santri.absen !== null && santri.absen !== "" ? santri.absen : urutan;
}

function layarSantri() {
  const boleh = sayaKurikulum();    // admin: isi, ubah, hapus. Ustadz: lihat aja
  if (!dataDasarSiap()) {
    tombolKembali.hidden = !posisi.dariNilai;
    return tampilMemuat("Daftar siswa");
  }
  // admin: kalau dibuka ke kelas tertentu (dari lembar nilai / beranda), ikut pindah jenjangnya
  if (boleh && posisi.kelasSantri) {
    const j = posisi.kelasSantri.split("|")[0];
    if (daftarJenjang().includes(j) && j !== jenjangAktif()) pilihJenjang(j);
  }
  const semua = boleh ? kelasBolehDilihat().filter(x => x.jenjang === jenjangAktif()) : kelasBolehDilihat();
  const adaTerpilih = posisi.kelasSantri && semua.some(x => `${x.jenjang}|${x.kelas}` === posisi.kelasSantri);
  const kunci = adaTerpilih ? posisi.kelasSantri : (semua[0] ? `${semua[0].jenjang}|${semua[0].kelas}` : "");
  const [jenjang, kelas] = kunci.split("|");
  posisi.kelasSantri = kunci;

  judul.textContent = "Daftar siswa";
  jejak.textContent = kelas ? labelKelas(jenjang, kelas) : (boleh ? jenjangAktif() : "");
  tombolKembali.hidden = !posisi.dariNilai;

  // admin: kelasnya sudah dipilih di menu Siswa (kartu kelas), jadi tanpa pilihan paket & kelas lagi
  let h = "";
  if (!boleh) {
    h += `<div class="pilih-semester" role="group" aria-label="Kelas">`;
    for (const x of semua) {
      const k = `${x.jenjang}|${x.kelas}`;
      h += `<button class="chip ${k === kunci ? "aktif" : ""}" data-kelas="${aman(k)}" aria-pressed="${k === kunci}">${aman(x.kelas)} · ${aman(x.jenjang)}</button>`;
    }
    h += `</div>`;
  }

  if (!kelas) {
    h += boleh
      ? `<p class="kosong">Belum ada kelas ${aman(jenjangAktif())}. Kelas muncul otomatis setelah ada mapel (dibuat admin).</p>`
      : `<p class="kosong">Anda belum mengajar di kelas mana pun, jadi belum ada daftar siswa yang bisa dilihat.</p>`;
    isi.innerHTML = h;
    if (boleh) pasangTabJenjang("santri", { kelasSantri: null });
    return;
  }

  const daftar = santriKelas(jenjang, kelas);

  // ---------- ustadz: cuma lihat ----------
  if (!boleh) {
    h += `
      <h2 class="subjudul">Siswa ${aman(labelKelas(jenjang, kelas))} <small>${daftar.length} siswa</small></h2>
      <p class="info">Daftar siswa diisi admin (TU). Jika ada nama atau NIS yang salah, mohon kabari admin.</p>`;
    if (daftar.length === 0) {
      h += `<p class="kosong">Daftar siswa kelas ini belum diisi admin (TU).</p>`;
    } else {
      h += `<div class="wadah-tabel-santri"><table class="tabel-santri lihat">
          <thead><tr><th class="kol-absen">No. Absen</th><th class="kol-nis">NIS</th><th>Nama siswa</th></tr></thead>
          <tbody id="badanSantri">${daftar.map(x => `<tr data-id="${aman(x.id)}"><td class="tengah">${aman(x.absen ?? "")}</td><td>${aman(x.nis || "")}</td><td>${aman(x.nama)}</td></tr>`).join("")}</tbody>
        </table></div>`;
    }
    isi.innerHTML = h;
    isi.querySelectorAll("[data-kelas]").forEach(b => b.onclick = () => pergi("santri", { kelasSantri: b.dataset.kelas }));
    return;
  }

  // ---------- admin: tabel bisa diketik ----------
  const pasangTab = () => pasangTabJenjang("santri", { kelasSantri: null });
  const barisKosong = 3;
  const tombolHapus = (x) => `<button class="tombol-hapus-kecil" data-hapus-santri="${aman(x.id)}" aria-label="Hapus ${aman(x.nama)}" title="Hapus siswa">×</button>`;
  const htmlBarisSantri = (x) => `
    <tr data-id="${x ? aman(x.id) : ""}">
      <td><input data-f="absen" type="number" inputmode="numeric" min="1" step="1" value="${x && x.absen !== undefined && x.absen !== null ? aman(x.absen) : ""}" aria-label="No. absen"></td>
      <td><input data-f="nis" inputmode="numeric" value="${x ? aman(x.nis || "") : ""}" aria-label="NIS"></td>
      <td><input data-f="nama" value="${x ? aman(x.nama) : ""}" aria-label="Nama siswa" placeholder="${x ? "" : "Nama siswa baru"}"></td>
      <td class="kol-aksi">${x ? tombolHapus(x) : ""}</td>
    </tr>`;

  h += `
    <h2 class="subjudul">Siswa ${aman(labelKelas(jenjang, kelas))} <small id="jumlahSantri">${daftar.length} siswa</small></h2>
    ${htmlNamaWali(jenjang, kelas, semesterSekarang().tahun)}
    <p class="info">Ketik langsung di tabel, tersimpan otomatis. Bisa juga salin 3 kolom dari Excel (No. Absen, NIS, Nama) lalu tempel di kotak pertama.</p>
    <div class="wadah-tabel-santri">
      <table class="tabel-santri">
        <thead><tr><th class="kol-absen">No. Absen</th><th class="kol-nis">NIS</th><th>Nama siswa</th><th class="kol-aksi"></th></tr></thead>
        <tbody id="badanSantri">${daftar.map(htmlBarisSantri).join("")}${htmlBarisSantri(null).repeat(barisKosong)}</tbody>
      </table>
    </div>
    <div class="baris-tombol">
      <button class="tombol-kedua" id="tambahBaris">+ Tambah 5 baris</button>
      <span class="info" id="pesanSantri" role="status"></span>
    </div>`;

  // siswa yang udah lulus / pindah dari kelas ini (datanya tetap ada)
  const keluar = toko.santri.filter(s => santriKeluar(s) && s.jenjang === jenjang && s.kelas === kelas)
    .sort((a, c) => (a.nama || "").localeCompare(c.nama || "", "id"));
  if (keluar.length) {
    h += `<h2 class="subjudul">Sudah keluar <small>${keluar.length} siswa</small></h2>
      <p class="info">Rapor & nilai lamanya tetap bisa dibuka di halaman Rapor (pilih tahun ajarannya).</p>
      <div class="daftar-akun">${keluar.map(htmlKartuKeluar).join("")}</div>`;
  }
  // keputusan naik kelas (khusus TU, diisi setelah rapat pleno): tahun ajaran yang sedang / baru selesai
  const semNaik = semesterNaikKelas();
  const santriNaik = santriKelasDi(jenjang, kelas, semNaik.tahun);
  const panelNaik = santriNaik.length ? htmlPanelKeputusan({ jenjang, kelas }, semNaik, santriNaik) : "";
  // semester Ganjil: panel tahun lalu ditutup dulu (cuma buat kalau rapat plenonya molor / keputusannya belum diisi)
  h += semNaik.tahun === semesterSekarang().tahun ? panelNaik : panelNaik && `
    <details class="naik-tahun-lalu" ${posisi.keNaikKelas ? "open" : ""}>
      <summary>Keputusan naik kelas ${aman(semNaik.tahun)} (tahun lalu)</summary>
      <p class="pemberitahuan-kecil">Dipakai jika keputusan tahun lalu belum diisi. Hati-hati: siswa baru tahun ini yang belum punya riwayat ikut tampil di daftar ini.</p>
      ${panelNaik}
    </details>`;
  isi.innerHTML = h;
  pasangTab();
  pasangKeputusan({ jenjang, kelas }, semNaik, santriNaik);
  if (posisi.keNaikKelas) {
    posisi.keNaikKelas = false;
    const panel = document.getElementById("panelKeputusan");
    if (panel) panel.scrollIntoView({ block: "start" });
  }

  pasangAksiKeluar(layarSantri);

  isi.querySelectorAll("[data-kelas]").forEach(b => b.onclick = () => pergi("santri", { kelasSantri: b.dataset.kelas }));
  const badan = document.getElementById("badanSantri");
  const pesan = document.getElementById("pesanSantri");

  const ambil = (tr) => ({
    absen: tr.querySelector('[data-f="absen"]').value.trim(),
    nis: tr.querySelector('[data-f="nis"]').value.trim(),
    nama: tr.querySelector('[data-f="nama"]').value.trim().replace(/\s+/g, " ")
  });

  // tandai No. Absen yang dobel
  function cekAbsen() {
    const hitung = {};
    badan.querySelectorAll('[data-f="absen"]').forEach(i => { if (i.value) hitung[i.value] = (hitung[i.value] || 0) + 1; });
    badan.querySelectorAll('[data-f="absen"]').forEach(i => {
      const dobel = i.value && hitung[i.value] > 1;
      i.classList.toggle("salah", !!dobel);
      i.title = dobel ? "No. absen ini dipakai lebih dari satu siswa" : "";
    });
    document.getElementById("jumlahSantri").textContent = `${badan.querySelectorAll("tr[data-id]:not([data-id=''])").length} siswa`;
  }

  function pastikanBarisKosong() {
    const kosong = [...badan.querySelectorAll("tr")].filter(tr => !tr.dataset.id && !ambil(tr).nama).length;
    for (let i = kosong; i < 2; i++) badan.insertAdjacentHTML("beforeend", htmlBarisSantri(null));
    pasangBaris();
  }

  // simpan satu baris (baris baru dibikin begitu namanya diisi)
  async function simpanBaris(tr) {
    if (tr.dataset.menunggu) return;   // dialog "nama kembar" masih kebuka buat baris ini
    const v = ambil(tr);
    const absen = v.absen === "" ? "" : Math.round(Number(v.absen));
    if (tr.dataset.id) {
      const lama = toko.santri.find(x => x.id === tr.dataset.id);
      if (!lama) return;
      if (!v.nama) {
        tr.querySelector('[data-f="nama"]').value = lama.nama;
        pesan.textContent = "Nama tidak boleh kosong. Jika ingin menghapus, gunakan tombol ×.";
        return;
      }
      if (lama.nama === v.nama && (lama.nis || "") === v.nis && String(lama.absen ?? "") === String(absen)) return;
      simpanSantri({ ...lama, nama: v.nama, nis: v.nis, absen });
      pesan.textContent = "Tersimpan";
    } else if (v.nama) {
      const kembar = toko.santri.find(x => x.jenjang === jenjang && x.kelas === kelas && x.aktif !== false && x.nama.toLowerCase() === v.nama.toLowerCase());
      if (kembar) {
        tr.dataset.menunggu = "1";
        const lanjut = await tanyaYakin(`${v.nama} sudah ada di kelas ini. Tetap tambahkan sebagai siswa lain?`, { ya: "Tetap tambahkan" });
        delete tr.dataset.menunggu;
        if (!lanjut || tr.dataset.id) return;
      }
      const baru = simpanSantri({ id: buatId(), nama: v.nama, nis: v.nis, absen, jenjang, kelas, aktif: true });
      tr.dataset.id = baru.id;
      tr.querySelector('[data-f="nama"]').placeholder = "";
      tr.querySelector(".kol-aksi").innerHTML = tombolHapus(baru);
      pesan.textContent = "Tersimpan";
      pastikanBarisKosong();
    }
    cekAbsen();
  }

  // tempel dari Excel: tiap baris = satu santri, kolom dipisah Tab
  function tempel(e, input) {
    const teks = (e.clipboardData || window.clipboardData).getData("text");
    if (!/[\t\n]/.test(teks.trim())) return;   // cuma satu nilai: biarin tempel biasa
    e.preventDefault();
    const urutanKolom = ["absen", "nis", "nama"];
    const mulaiKolom = urutanKolom.indexOf(input.dataset.f);
    let tr = input.closest("tr");
    const barisTeks = teks.replace(/\r/g, "").split("\n").filter(b => b.trim() !== "");
    let jumlah = 0;
    for (const b of barisTeks) {
      if (!tr) { badan.insertAdjacentHTML("beforeend", htmlBarisSantri(null)); tr = badan.lastElementChild; pasangBaris(); }
      const sel = b.split("\t");
      sel.forEach((isiSel, j) => {
        const f = urutanKolom[mulaiKolom + j];
        if (f) tr.querySelector(`[data-f="${CSS.escape(f)}"]`).value = isiSel.trim();
      });
      simpanBaris(tr);
      jumlah++;
      tr = tr.nextElementSibling;
    }
    pastikanBarisKosong();
    pesan.textContent = `${jumlah} baris ditempel dan disimpan.`;
  }

  function pasangBaris() {
    badan.querySelectorAll("tr").forEach(tr => {
      if (tr.dataset.terpasang) return;
      tr.dataset.terpasang = "1";
      tr.querySelectorAll("input").forEach(inp => {
        inp.onchange = () => simpanBaris(tr);
        inp.onpaste = (e) => tempel(e, inp);
        inp.oninput = () => { if (inp.dataset.f === "absen") cekAbsen(); };
        // Enter = turun ke baris berikutnya di kolom yang sama
        inp.onkeydown = (e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          simpanBaris(tr);
          const berikut = tr.nextElementSibling && tr.nextElementSibling.querySelector(`[data-f="${CSS.escape(inp.dataset.f)}"]`);
          if (berikut) berikut.focus();
        };
      });
    });
  }
  pasangBaris();
  cekAbsen();

  badan.onclick = async (e) => {
    const b = e.target.closest("[data-hapus-santri]");
    if (!b) return;
    const x = toko.santri.find(y => y.id === b.dataset.hapusSantri);
    if (!x) return;
    // pindah kelas (tingkat sama, putra/putri sama) atau keluar dari PKBM
    const mau = await tanyaPilih(`${x.nama} ingin diapakan?\n\nPindah kelas: pindah ke kelas lain di tingkat yang sama (misal ${kelas} ke kelas paralelnya). Nilai yang sudah diisi tetap tersimpan di kelas ini.`,
      { ya: "Pindah kelas", lain: "Keluar / hapus" });
    if (mau === true) return tampilPilihPindah(x);
    if (mau !== "lain") return;
    const pilih = await tanyaPilih(`${x.nama} keluar dari kelas ini?\n\nPindah sekolah: datanya tetap disimpan, rapor & nilai lamanya masih bisa dibuka.\n\nHapus: hanya untuk salah ketik. Datanya hilang permanen, nilai yang sudah diisi untuk siswa ini tidak terpakai lagi.`,
      { ya: "Tandai pindah", lain: "Hapus", lainBahaya: true });
    if (pilih === true) {
      simpanSantri(keluarkanSantri(x, semesterSekarang().tahun, "pindah"));
      kabar(`${x.nama} ditandai pindah sekolah. Bisa diaktifkan lagi dari bagian "Sudah keluar" di bawah.`);
      return layarSantri();
    }
    if (pilih !== "lain" || !(await tanyaYakin(`Hapus ${x.nama} permanen?`, { bahaya: true, ya: "Hapus" }))) return;
    hapusSantri(x.id);
    b.closest("tr").remove();
    cekAbsen();
    pastikanBarisKosong();
  };
  // pilihan kelas tujuan pindah kelas, muncul di atas tabel
  function tampilPilihPindah(x) {
    const pilihan = pilihanPindahKelas(x);
    const lama = document.getElementById("panelPindah");
    if (lama) lama.remove();
    if (!pilihan.length) return kabar(`Belum ada kelas lain di tingkat yang sama untuk ${x.nama} (${hurufRombel(x.kelas) === "A" ? "putra" : hurufRombel(x.kelas) === "B" ? "putri" : "rombel sama"}). Kelas muncul setelah mapelnya dibuat di menu Mapel.`);
    const panel = document.createElement("div");
    panel.id = "panelPindah";
    panel.className = "pemberitahuan panel-pindah";
    panel.innerHTML = `<p><b>Pindahkan ${aman(x.nama)}</b> dari ${aman(x.kelas)} ke:</p>
      <div class="baris-tombol">${pilihan.map(k => `<button class="tombol-kedua" data-pindah-ke="${aman(k)}">${aman(k)}</button>`).join("")}
        <button class="tombol-teks" data-pindah-batal>Batal</button></div>`;
    document.querySelector(".wadah-tabel-santri").before(panel);
    panel.scrollIntoView({ block: "center" });
    panel.onclick = async (e) => {
      if (e.target.closest("[data-pindah-batal]")) return panel.remove();
      const t = e.target.closest("[data-pindah-ke]");
      if (!t) return;
      const sem = semesterSekarang();
      if (!(await tanyaYakin(`Pindahkan ${x.nama} ke ${t.dataset.pindahKe}?\n\nMulai ${namaSemester(sem)} ${x.nama} ikut kelas ${t.dataset.pindahKe}. Nilai yang sudah diisi di ${x.kelas} tetap tersimpan di sana.${sem.semester === "Genap" ? ` Lembar nilai & rapor Ganjil tetap menggunakan ${x.kelas}.` : ""}`, { ya: "Pindahkan" }))) return;
      const kini = toko.santri.find(y => y.id === x.id) || x;
      simpanSantri(pindahkanKelas(kini, t.dataset.pindahKe, sem));
      kabar(`${x.nama} sudah dipindah ke ${t.dataset.pindahKe}. Isi nomor absennya di daftar siswa ${t.dataset.pindahKe}.`);
      layarSantri();
    };
  }
  document.getElementById("tambahBaris").onclick = () => {
    badan.insertAdjacentHTML("beforeend", htmlBarisSantri(null).repeat(5));
    pasangBaris();
  };
}

// kartu siswa yang udah keluar (lulus / pindah sekolah): dipakai di Daftar siswa & Arsip (menu Siswa)
function htmlKartuKeluar(s) {
  return `
    <div class="kartu-akun redup">
      <div class="kartu-akun-isi">
        <strong>${aman(s.nama)}</strong>
        <span>${HASIL_NAIK[s.status]}${s.keluar && s.keluar.tahun ? ` · ${aman(s.keluar.tahun)}` : ""}${s.nis ? ` · NIS ${aman(s.nis)}` : ""}</span>
        <small>${riwayatSantri(s).map(r => `${aman(r.kelas)} (${aman(r.tahun)})`).join(" → ") || aman(s.kelas || "")}</small>
      </div>
      <div class="baris-tombol">
        <button class="tombol-kedua" data-aktifkan="${aman(s.id)}">Aktifkan lagi</button>
        <button class="tombol-teks merah" data-hapus-keluar="${aman(s.id)}">Hapus permanen</button>
      </div>
    </div>`;
}
// tombol di kartu siswa keluar; gambarUlang = layar yang digambar lagi sesudahnya
function pasangAksiKeluar(gambarUlang) {
  isi.querySelectorAll("[data-aktifkan]").forEach(b => b.onclick = async () => {
    const s = toko.santri.find(y => y.id === b.dataset.aktifkan);
    if (!s || !(await tanyaYakin(`Aktifkan lagi ${s.nama} di kelas ${s.kelas}?`, { ya: "Aktifkan" }))) return;
    simpanSantri(aktifkanLagiSantri(s));
    gambarUlang();
  });
  isi.querySelectorAll("[data-hapus-keluar]").forEach(b => b.onclick = async () => {
    const s = toko.santri.find(y => y.id === b.dataset.hapusKeluar);
    if (!s || !(await tanyaYakin(`Hapus data ${s.nama} permanen?\n\nRapor lamanya tidak bisa dicetak lagi. Jika masih perlu, unduh cadangan atau cetak rapornya dulu.`, { bahaya: true, ya: "Hapus permanen" }))) return;
    hapusSantri(s.id);
    gambarUlang();
  });
}
function tandaKeluarSantri(s) {
  return santriKeluar(s) ? ` <span class="tanda tanda-tutup">${aman(HASIL_NAIK[s.status])}</span>` : "";
}

// =====================================================
//  KEPUTUSAN NAIK KELAS (panel di bawah Daftar siswa, khusus TU, semester Genap, setelah rapat pleno)
//  Tiap pencet tombol: dialog konfirmasi, lalu 1 tulis simpanSantri (batal = nggak nulis apa pun).
//  Baris cuma digambar ulang sendiri (isi <li>), lembar nilai & scroll nggak disentuh.
// =====================================================
let panelKeputusan = null;   // { tahun, jenjang, kelas, akhir, status: Map(id -> status), sibuk: Set(id), disentuh }

// semester Genap yang keputusannya diisi sekarang: tahun ajaran ini kalau sudah Genap,
// kalau masih Ganjil ya tahun ajaran yang baru selesai (rapat pleno biasanya sesudah tahun berganti)
function semesterNaikKelas() {
  const kini = semesterSekarang();
  if (kini.semester === "Genap") return { tahun: kini.tahun, semester: "Genap" };
  const m = String(kini.tahun).match(/^(\d{4})\/(\d{4})$/);
  return { tahun: m ? `${Number(m[1]) - 1}/${Number(m[2]) - 1}` : kini.tahun, semester: "Genap" };
}
function panelKeputusanBoleh(sem) {
  return sayaKurikulum() && sem.semester === "Genap" && sem.tahun <= semesterSekarang().tahun;
}
function rapikanTujuan(teks) {
  return String(teks || "").trim().replace(/\s+/g, " ");
}
function labelHasilKeputusan(hasil, akhir, tujuan) {
  if (hasil === "naik") return tujuan ? `Naik ke ${tujuan}` : "Naik kelas";
  if (hasil === "lanjut") return tujuan ? `Lulus, lanjut ke ${tujuan}` : "Lulus, lanjut ke kelas 10";
  if (hasil === "tinggal") return akhir ? "Tidak lulus" : "Tidak naik";
  if (hasil === "lulus") return "Lulus";
  return "Belum diputuskan";
}
const TEKS_STATUS_KEPUTUSAN = {
  menyimpan: "Menyimpan...",
  tersimpan: "Tersimpan",
  menunggu: "Menunggu sinyal (tersimpan di HP, dikirim waktu ada sinyal)",
  gagal: "Gagal menyimpan. Tekan lagi untuk mengulang."
};
function htmlIsiBarisKeputusan(s, no, tahun, status) {
  const k = keputusanTahun(s, tahun);
  const a = kelasSantriDi(s, tahun);
  const akhir = tingkatAkhir(a.jenjang, a.kelas);
  const hasil = k.fase === "terkunci" ? k.hasil : k.fase;
  let label, ket = "", tombol = "";
  if (k.fase === "dilewati") {
    label = s.status === "pindah" ? "Pindah sekolah" : s.status === "lulus" ? "Lulus" : "Nonaktif";
    ket = "Tidak diproses dari sini.";
  } else {
    label = labelHasilKeputusan(hasil, akhir, k.fase === "naik" || k.fase === "lanjut" ? k.tujuan : "");
    if (k.fase === "terkunci") ket = `Terkunci: sudah diproses di ${k.sesudah}. Batalkan keputusan tahun ${k.sesudah} dulu.`;
    // kelas 9 Paket B: lulus (keluar), lulus & lanjut ke kelas 10 di sini, atau tidak lulus
    const lanjut = akhir && a.jenjang === "Paket B";
    const pilihan = akhir ? [["lulus", "Lulus, keluar"], ...(lanjut ? [["lanjut", "Lulus, lanjut ke kelas 10"]] : []), ["tinggal", "Tidak lulus"]] : [["naik", "Naik kelas"], ["tinggal", "Tidak naik"]];
    const mati = k.fase === "terkunci" || status === "menyimpan";
    // I'dad & lulusan kelas 9 yang lanjut: kelas tujuan dipilih per siswa (nggak ditebak)
    const pilihKelas = tujuanDipilihPerSiswa(a.jenjang, a.kelas) ? pilihanKelasTujuan(a.jenjang, a.kelas) : null;
    const kini = k.fase === "naik" || k.fase === "lanjut" ? k.tujuan : "";
    const htmlPilih = pilihKelas ? `<label class="isian-tujuan-siswa">${a.jenjang === JENJANG_IDAD ? "Naik" : "Lanjut"} ke kelas
        <select data-tujuan-siswa${mati ? " disabled" : ""}>
          <option value="">Pilih kelas 10…</option>
          ${pilihKelas.map(x => `<option value="${aman(x)}" ${x === kini ? "selected" : ""}>${aman(x)} (Paket C)</option>`).join("")}
        </select></label>${pilihKelas.length ? "" : `<small class="keputusan-ket">Belum ada kelas 10${hurufRombel(a.kelas) ? " " + (hurufRombel(a.kelas) === "A" ? "putra" : "putri") : ""} di Paket C. Buat mapelnya dulu di menu Mapel.</small>`}` : "";
    tombol = htmlPilih + `<div class="keputusan-tombol">${pilihan.map(([h, t]) =>
      `<button class="tombol-kecil" data-hasil="${h}" aria-pressed="${hasil === h}" aria-label="${aman(t)} ${aman(s.nama)}"${mati ? " disabled" : ""}>${t}</button>`).join("")}${k.fase === "belum" || k.fase === "terkunci" ? "" : `<button class="tombol-kecil keputusan-batal" data-hasil="batal" aria-label="Batalkan keputusan ${aman(s.nama)}"${mati ? " disabled" : ""}>Batalin</button>`}</div>`;
  }
  // status pendek (menyimpan / tersimpan) ditaruh sebaris dengan label, biar waktu hilang tombolnya nggak geser
  const sebaris = status === "menyimpan" || status === "tersimpan";
  const st = status && !sebaris ? `<small class="keputusan-ket ${status === "gagal" ? "gagal" : ""}" role="status">${TEKS_STATUS_KEPUTUSAN[status] || ""}</small>` : "";
  return `<div class="keputusan-info">
      <span class="keputusan-nama"><span class="nomor-santri">${aman(no)}</span>${aman(s.nama)}</span>
      <span class="keputusan-label ${hasil ? "ada" : ""}">${aman(label)}<span class="keputusan-sebaris" role="status">${sebaris ? ` · ${TEKS_STATUS_KEPUTUSAN[status]}` : ""}</span></span>
    </div>
    ${ket ? `<small class="keputusan-ket">${aman(ket)}</small>` : ""}${st}${tombol}`;
}
function htmlPanelKeputusan(mp, sem, santri) {
  if (!panelKeputusanBoleh(sem) || !santri.length) return "";
  const akhir = tingkatAkhir(mp.jenjang, mp.kelas);
  const perSiswa = tujuanDipilihPerSiswa(mp.jenjang, mp.kelas);
  const tujuan = tujuanTebakan(toko.santri, mp.jenjang, mp.kelas, sem.tahun);
  const urutan = pengingatUrutanNaik(mp.jenjang, mp.kelas, sem.tahun);
  return `<section class="panel-keputusan" id="panelKeputusan" aria-labelledby="judulKeputusan">
    <h2 class="subjudul" id="judulKeputusan">Keputusan naik kelas <small>${aman(sem.tahun)} → ${aman(tahunBerikut(sem.tahun))}</small></h2>
    <p class="info"><b>Diisi TU setelah rapat pleno.</b> Tekan tombol di tiap siswa, nanti ada konfirmasi dulu. Keputusan bisa diganti selama tahun ajaran berikutnya belum diproses.${akhir ? ` Kelas tingkat akhir: pilihannya lulus${mp.jenjang === "Paket B" ? ", lulus lalu lanjut ke kelas 10 di sini," : ""} atau tidak lulus.` : perSiswa ? "" : " Mengubah kelas tujuan tidak memindahkan siswa yang sudah terlanjur naik; tekan \"Naik kelas\" lagi di siswanya."}</p>
    ${urutan ? `<p class="pemberitahuan-kecil">${urutan}</p>` : ""}
    ${perSiswa ? `<p class="info">Pilih kelas 10 (Paket C) untuk tiap siswa, lalu tekan tombolnya.</p>` : akhir ? "" : `<label class="isian-tujuan">Naik ke kelas <input id="tujuanKelas" value="${aman(tujuan)}" maxlength="20" autocomplete="off"></label>
    <p class="info" id="infoTujuan" role="status"></p>`}
    <ul class="daftar-keputusan">${santri.map((s, i) =>
      `<li class="baris-keputusan" data-keputusan="${aman(s.id)}" data-no="${aman(noAbsen(kelasSantriDi(s, sem.tahun), i + 1))}">${htmlIsiBarisKeputusan(s, noAbsen(kelasSantriDi(s, sem.tahun), i + 1), sem.tahun, null)}</li>`).join("")}</ul>
  </section>`;
}
// kelas tujuan (tingkat di atasnya / kelas 10 buat I'dad & lulusan kelas 9) yang siswanya belum diproses:
// kalau diproses belakangan, daftar siswa kelas tujuan sementara kecampur siswa lama & baru
function pengingatUrutanNaik(jenjang, kelas, tahun) {
  if (tingkatAkhir(jenjang, kelas) && jenjang !== "Paket B") return "";
  const kePaketC = tujuanDipilihPerSiswa(jenjang, kelas);
  const jenjangAtas = kePaketC ? "Paket C" : jenjang;
  const tingkatAtas = kePaketC ? "10" : String(Number(tingkatKelas(kelas)) + 1);
  const belum = daftarKelas().filter(k => k.jenjang === jenjangAtas && tingkatKelas(k.kelas) === tingkatAtas)
    .filter(k => { const n = hitungKeputusanKelas(k.jenjang, k.kelas, tahun); return n.total && n.sudah < n.total; }).map(k => k.kelas);
  return belum.length ? `<b>Proses kelas tertinggi dulu</b> (9 → 8 → 7, I'dad sebelum kelas 10 diisi). Kelas ${aman(belum.join(", "))} ${aman(jenjangAtas)} belum selesai diproses, jadi jika kelas ini dinaikkan sekarang, daftar siswanya sementara tercampur.` : "";
}
function gambarInfoTujuan() {
  const p = panelKeputusan, info = document.getElementById("infoTujuan"), isian = document.getElementById("tujuanKelas");
  if (!p || !info || !isian) return;
  const t = rapikanTujuan(isian.value);
  info.textContent = t && mapelKelas(p.jenjang, t).length === 0
    ? `Kelas ${t} ${p.jenjang} belum punya mapel. Guru belum bisa melihat siswa kelas itu sampai TU membuat mapel di kelas itu (menu Mapel).`
    : "";
}
// gambar ulang isi satu baris (fokus tombol dipertahankan)
function gambarBarisKeputusan(li, s) {
  const p = panelKeputusan;
  if (!p || !li || !s) return;
  const fokus = li.contains(document.activeElement) ? document.activeElement.dataset.hasil : null;
  li.innerHTML = htmlIsiBarisKeputusan(s, li.dataset.no, p.tahun, p.status.get(s.id));
  if (fokus) {
    const b = li.querySelector(`[data-hasil="${fokus}"]`);
    if (b && !b.disabled) b.focus();
  }
}
function gambarBarisKeputusanId(p, id) {
  if (p !== panelKeputusan) return;
  const li = document.querySelector(`#panelKeputusan [data-keputusan="${CSS.escape(id)}"]`);
  gambarBarisKeputusan(li, toko.santri.find(x => x.id === id));
}
// dipanggil layar.js waktu data santri berubah (mis. dari HP lain): cuma panel ini yang dihitung ulang
function segarkanKeputusan() {
  const p = panelKeputusan, panel = document.getElementById("panelKeputusan");
  if (!p || !panel || !isi.contains(panel)) return;
  panel.querySelectorAll("[data-keputusan]").forEach(li => gambarBarisKeputusan(li, toko.santri.find(x => x.id === li.dataset.keputusan)));
  const isian = document.getElementById("tujuanKelas");
  if (isian && !p.disentuh && document.activeElement !== isian) isian.value = tujuanTebakan(toko.santri, p.jenjang, p.kelas, p.tahun);
  gambarInfoTujuan();
}
function pasangKeputusan(mp, sem, santri) {
  const panel = document.getElementById("panelKeputusan");
  if (!panel) { panelKeputusan = null; return; }
  const p = panelKeputusan = {
    tahun: sem.tahun, jenjang: mp.jenjang, kelas: mp.kelas, akhir: tingkatAkhir(mp.jenjang, mp.kelas),
    status: new Map(), sibuk: new Set(), disentuh: false
  };
  const isian = document.getElementById("tujuanKelas");
  if (isian) isian.oninput = () => { p.disentuh = true; gambarInfoTujuan(); };
  gambarInfoTujuan();
  panel.querySelector(".daftar-keputusan").onclick = (e) => {
    const b = e.target.closest("[data-hasil]");
    const li = b && b.closest("[data-keputusan]");
    if (b && li && !b.disabled) putuskanSantri(p, li.dataset.keputusan, b.dataset.hasil);
  };
}
async function putuskanSantri(p, id, hasil) {
  if (p !== panelKeputusan || p.sibuk.has(id)) return;
  const s = toko.santri.find(x => x.id === id);
  if (!s) return;
  const isian = document.getElementById("tujuanKelas");
  const li = document.querySelector(`#panelKeputusan [data-keputusan="${CSS.escape(id)}"]`);
  const pilihSiswa = li && li.querySelector("[data-tujuan-siswa]");
  const tujuan = pilihSiswa ? pilihSiswa.value : isian ? rapikanTujuan(isian.value) : "";
  if ((hasil === "naik" || hasil === "lanjut") && !tujuan) {
    await kabar(pilihSiswa ? `Pilih dulu kelas 10 untuk ${s.nama}.` : "Isi dulu kelas tujuannya (kotak \"Naik ke kelas\" di atas daftar).");
    (pilihSiswa || isian || { focus() {} }).focus();
    return;
  }
  const k = keputusanTahun(s, p.tahun);
  const cek = ubahKeputusan(s, p.tahun, hasil, tujuan);
  if (cek === s || (!cek && hasil === "batal" && k.fase === "belum")) return;   // udah begitu, nggak ada yang perlu ditulis
  if (!cek) {
    await kabar(k.fase === "terkunci"
      ? `Sudah diproses di ${k.sesudah}. Batalkan keputusan tahun ${k.sesudah} dulu.`
      : "Keputusan ini tidak bisa dipakai untuk siswa ini.");
    gambarBarisKeputusanId(p, id);
    return;
  }
  const a = kelasSantriDi(s, p.tahun);
  let pesan, ya;
  if (hasil === "batal") { pesan = `Batalkan keputusan ${s.nama} (${labelHasilKeputusan(k.fase, p.akhir, k.tujuan)})? Kelasnya dikembalikan ke ${a.kelas}.`; ya = "Batalkan"; }
  else if (hasil === "naik") { pesan = `Naikin ${s.nama} ke ${tujuan}${jenjangTujuan(a.jenjang, "naik") !== a.jenjang ? ` (${jenjangTujuan(a.jenjang, "naik")})` : ""}?`; ya = "Naik kelas"; }
  else if (hasil === "lanjut") { pesan = `${s.nama} lulus dari ${a.kelas} dan lanjut ke ${tujuan} (Paket C)?`; ya = "Lulus, lanjut"; }
  else if (hasil === "lulus") { pesan = `${s.nama} lulus dari ${a.kelas}?`; ya = "Lulus"; }
  else if (p.akhir) { pesan = `${s.nama} tidak lulus (tetap di ${a.kelas})?`; ya = "Tidak lulus"; }
  else { pesan = `${s.nama} tidak naik kelas (tetap ${a.kelas})?`; ya = "Tidak naik"; }
  if (k.fase !== "belum" && hasil !== "batal") pesan += `\n\nKeputusan sebelumnya (${labelHasilKeputusan(k.fase, p.akhir, k.tujuan)}) diganti.`;
  if ((hasil === "naik" || hasil === "lanjut") && mapelKelas(jenjangTujuan(a.jenjang, hasil), tujuan).length === 0) pesan += `\n\nKelas ${tujuan} ${jenjangTujuan(a.jenjang, hasil)} belum punya mapel. Guru belum bisa melihat siswa kelas itu sampai TU membuat mapel di kelas itu (menu Mapel).`;

  p.sibuk.add(id);
  const lanjut = await tanyaYakin(pesan, { ya, bahaya: hasil === "batal" });
  if (!lanjut) { p.sibuk.delete(id); return; }
  // data bisa berubah selama dialog kebuka (HP lain): pakai versi terbaru
  const sebelum = toko.santri.find(x => x.id === id);
  const baru = sebelum && ubahKeputusan(sebelum, p.tahun, hasil, tujuan);
  if (!baru || baru === sebelum) {
    p.sibuk.delete(id);
    if (!baru) await kabar("Data siswa ini baru berubah (mungkin dari perangkat lain), jadi keputusannya tidak disimpan. Periksa lagi lalu tekan ulang.");
    gambarBarisKeputusanId(p, id);
    return;
  }
  p.status.set(id, "menyimpan");
  let janji = Promise.resolve();
  const tersimpan = simpanSantri(baru, j => { janji = j; });
  gambarBarisKeputusanId(p, id);
  if (!navigator.onLine) {                      // antrean offline Firestore yang ngirim nanti, jangan ditunggu
    p.status.set(id, "menunggu");
    p.sibuk.delete(id);
    gambarBarisKeputusanId(p, id);
  }
  janji.then(() => {
    p.sibuk.delete(id);
    p.status.set(id, "tersimpan");
    gambarBarisKeputusanId(p, id);
    setTimeout(() => {
      if (p.status.get(id) !== "tersimpan") return;
      p.status.delete(id);
      gambarBarisKeputusanId(p, id);
    }, 4000);
  }, (err) => {
    console.error(err);
    p.sibuk.delete(id);
    p.status.set(id, "gagal");
    const kini = toko.santri.find(x => x.id === id);
    if (kini && kini.diubah === tersimpan.diubah) {   // balikin ke versi sebelum pencet
      pasangDiDaftar(toko.santri, sebelum);
      toko.santri.sort((x, y) => (x.nama || "").localeCompare(y.nama || "", "id"));
      berubah();
    }
    gambarBarisKeputusanId(p, id);
  });
}
