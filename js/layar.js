// =====================================================
//  layar.js — semua LAYAR dan pindah-pindah layar
// =====================================================

// ====== ELEMEN TETAP DI HALAMAN ======
const isi = document.getElementById("isi");
const judul = document.getElementById("judul");
const jejak = document.getElementById("jejak");
const tombolKembali = document.getElementById("tombolKembali");

// alamat sementara buat nampilin file, dibuang tiap pindah layar
let urlFileAktif = null;

// ====== POSISI & PINDAH LAYAR ======
let posisi = { layar: "kurikulum" };

const daftarLayar = {
  kurikulum: layarKurikulum,
  formKurikulum: formKurikulum,
  promes: layarPromes,
  formPromes: formPromes,
  isiPromes: layarIsiPromes,
  formSalin: formSalin,
  formModul: formModul,
  modul: layarModul,
  formBacaan: formBacaan,
  formSoal: formSoal,
  formSumatif: formSumatif,
  sumatif: layarSumatif,
  pilihSoal: layarPilihSoal,
  cari: layarCari,
  cetak: layarCetak
};

// gambar layar sesuai posisi
// tetapDiTempat = true → jangan scroll ke atas (misal habis geser urutan soal)
function tampilkan(tetapDiTempat = false) {
  if (urlFileAktif) {
    URL.revokeObjectURL(urlFileAktif);
    urlFileAktif = null;
  }

  try {
    daftarLayar[posisi.layar]();
  } catch (err) {
    // jaga-jaga: kalau data yang dibuka ternyata udah kehapus, balik ke awal
    console.error(err);
    posisi = { layar: "kurikulum" };
    layarKurikulum();
  }

  if (!tetapDiTempat) window.scrollTo(0, 0);
}

function pergi(layar, tambahan = {}) {
  posisi = { ...posisi, ...tambahan, layar };
  tampilkan();
}

// tombol ‹ : tiap layar balik ke layar "induk"-nya
function layarInduk() {
  const L = posisi.layar;
  if (L === "formKurikulum") return posisi.kurEditId ? "promes" : "kurikulum";
  if (L === "formPromes") return posisi.proEditId ? "isiPromes" : "promes";
  if (L === "formModul") return posisi.modEditId ? "modul" : "isiPromes";
  if (L === "formSumatif") return posisi.sumEditId ? "sumatif" : "isiPromes";
  if (L === "cetak") return posisi.cetakDari;
  return {
    promes: "kurikulum",
    cari: "kurikulum",
    isiPromes: "promes",
    formSalin: "isiPromes",
    modul: "isiPromes",
    formBacaan: "modul",
    formSoal: "modul",
    sumatif: "isiPromes",
    pilihSoal: "sumatif"
  }[L];
}
tombolKembali.onclick = () => pergi(layarInduk());

// ====== PENCARI DATA ======
function kurAktif() {
  return data.kurikulum.find(k => k.id === posisi.kurId);
}
function proAktif() {
  return kurAktif().promes.find(p => p.id === posisi.proId);
}
function modAktif() {
  return proAktif().modul.find(m => m.id === posisi.modId);
}
function sumAktif() {
  return proAktif().sumatif.find(s => s.id === posisi.sumId);
}

// cari soal pakai id di semua modul semester ini
function cariSoal(id) {
  const p = proAktif();
  for (let i = 0; i < p.modul.length; i++) {
    const m = p.modul[i];
    const s = m.soal.find(s => s.id === id);
    if (s) {
      return {
        soal: s,
        modul: m,
        asal: `Modul ${i + 1}`,
        bacaan: m.bacaan.find(b => b.id === s.bacaanId) || null
      };
    }
  }
  return null; // nggak ketemu (mungkin udah dihapus)
}

// pasang tombol ↑ ↓ buat ngatur urutan isi sebuah daftar
function pasangGeser(daftar) {
  isi.querySelectorAll("[data-naik]").forEach(b => {
    b.onclick = () => { geser(daftar, Number(b.dataset.naik), -1); simpan(); tampilkan(true); };
  });
  isi.querySelectorAll("[data-turun]").forEach(b => {
    b.onclick = () => { geser(daftar, Number(b.dataset.turun), 1); simpan(); tampilkan(true); };
  });
}

// =====================================================
//  KURIKULUM
// =====================================================
function layarKurikulum() {
  judul.textContent = "Bank Soal";
  jejak.textContent = "";
  tombolKembali.hidden = true;

  let html = "";
  if (data.kurikulum.length === 0) {
    html += `<p class="kosong">Belum ada kurikulum. Tambah dulu yuk.</p>`;
  } else {
    html += `
      <form class="cari" id="formCari" role="search">
        <input type="search" name="kata" placeholder="Cari soal di semua kurikulum..." aria-label="Cari soal">
      </form>`;
  }
  for (const k of data.kurikulum) {
    html += `
      <button class="kartu" data-id="${k.id}">
        <strong>${aman(k.mapel)} · ${aman(k.kelas)}</strong>
        <span>${aman(k.nama)} · ${aman(k.jenjang)} · ${k.promes.length} promes</span>
      </button>`;
  }
  html += `<button class="tombol-tambah" id="tambah">+ Tambah Kurikulum</button>`;
  html += `
    <div class="kotak-backup">
      <strong>Pindah data &amp; backup</strong>
      <span>${teksTerakhirBackup()}</span>
      <div class="pilih-jenis">
        <button class="tombol-kecil" id="kirimData">Kirim Data</button>
        <button class="tombol-kecil" id="ambilData">Ambil Data</button>
      </div>
      <input type="file" id="fileData" hidden>
    </div>`;
  isi.innerHTML = html;

  const formCari = document.getElementById("formCari");
  if (formCari) {
    formCari.onsubmit = (e) => {
      e.preventDefault();
      pergi("cari", { kata: formCari.kata.value });
    };
  }

  document.getElementById("tambah").onclick = () => pergi("formKurikulum", { kurEditId: null });
  isi.querySelectorAll(".kartu").forEach(kartu => {
    kartu.onclick = () => pergi("promes", { kurId: kartu.dataset.id });
  });

  const tombolKirim = document.getElementById("kirimData");
  tombolKirim.onclick = async () => {
    tombolKirim.disabled = true;
    tombolKirim.textContent = "Menyiapkan...";
    await eksporData();
    tampilkan(true); // gambar ulang biar tanggal backup ke-update
  };

  const pilihFile = document.getElementById("fileData");
  document.getElementById("ambilData").onclick = () => pilihFile.click();
  pilihFile.onchange = () => {
    if (pilihFile.files[0]) imporData(pilihFile.files[0]);
  };
}

// daftar kelas untuk tiap jenjang
const KELAS_PER_JENJANG = {
  SD:  ["Kelas 1", "Kelas 2", "Kelas 3", "Kelas 4", "Kelas 5", "Kelas 6"],
  SMP: ["Kelas 7", "Kelas 8", "Kelas 9"],
  SMA: ["Kelas 10", "Kelas 11", "Kelas 12"]
};

function formKurikulum() {
  const lama = data.kurikulum.find(k => k.id === posisi.kurEditId);
  const k = lama || { nama: "Kurikulum Merdeka", jenjang: "SMP", mapel: "", kelas: "" };

  judul.textContent = lama ? "Edit Kurikulum" : "Tambah Kurikulum";
  jejak.textContent = "";
  tombolKembali.hidden = false;

  const opsiJenjang = ["SD", "SMP", "SMA"]
    .map(j => `<option ${k.jenjang === j ? "selected" : ""}>${j}</option>`)
    .join("");

  isi.innerHTML = `
    <form id="form">
      <label>Nama kurikulum <input name="nama" value="${aman(k.nama)}" required></label>
      <label>Jenjang <select name="jenjang">${opsiJenjang}</select></label>
      <label>Mata pelajaran <input name="mapel" value="${aman(k.mapel)}" placeholder="Bahasa Indonesia" required></label>
      <label>Kelas <select name="kelas" required></select></label>
      <button type="submit" class="tombol-tambah">Simpan</button>
      ${lama ? `<button type="button" class="tombol-hapus" id="hapus">Hapus kurikulum ini</button>` : ""}
    </form>`;

  // isi pilihan kelas sesuai jenjang yang dipilih
  const pilihJenjang = document.querySelector('[name="jenjang"]');
  const pilihKelas = document.querySelector('[name="kelas"]');

  function aturKelas() {
    const kelasSekarang = pilihKelas.value || k.kelas;
    const daftar = KELAS_PER_JENJANG[pilihJenjang.value] || [];
    let html = daftar
      .map(kelas => `<option>${kelas}</option>`)
      .join("");
    // data lama yang kelasnya diketik bebas tetap bisa dipilih
    if (kelasSekarang && !daftar.includes(kelasSekarang)) {
      html += `<option value="${aman(kelasSekarang)}">${aman(kelasSekarang)}</option>`;
    }
    pilihKelas.innerHTML = html;
    if (kelasSekarang) pilihKelas.value = kelasSekarang;
    if (!pilihKelas.value) pilihKelas.selectedIndex = 0;
  }
  pilihJenjang.onchange = () => {
    pilihKelas.value = ""; // ganti jenjang → mulai dari kelas pertama jenjang itu
    k.kelas = "";
    aturKelas();
  };
  aturKelas();

  document.getElementById("form").onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const isian = {
      nama: f.get("nama"),
      jenjang: f.get("jenjang"),
      mapel: f.get("mapel"),
      kelas: f.get("kelas")
    };
    if (lama) {
      Object.assign(lama, isian);
      simpan();
      pergi("promes");
    } else {
      data.kurikulum.push({ id: buatId(), ...isian, promes: [] });
      simpan();
      pergi("kurikulum");
    }
  };

  if (lama) {
    document.getElementById("hapus").onclick = async () => {
      const modul = lama.promes.flatMap(p => p.modul);
      const jumlahSoal = modul.reduce((n, m) => n + m.soal.length, 0);
      const yakin = confirm(
        `Hapus kurikulum ${lama.mapel} ${lama.kelas}?\n\n` +
        `Semua promes, ${modul.length} modul, dan ${jumlahSoal} soal di dalamnya ikut terhapus dan TIDAK bisa dikembalikan.`
      );
      if (!yakin) return;
      await hapusFileModul(modul);
      data.kurikulum = data.kurikulum.filter(x => x.id !== lama.id);
      simpan();
      pergi("kurikulum");
    };
  }
}

// =====================================================
//  PROMES
// =====================================================
function layarPromes() {
  const k = kurAktif();
  judul.textContent = `${k.mapel} · ${k.kelas}`;
  jejak.textContent = `${k.nama} · ${k.jenjang}`;
  tombolKembali.hidden = false;

  let html = `
    <div class="baris-aksi">
      <button class="tombol-kecil" id="editKur">Edit kurikulum</button>
    </div>`;
  if (k.promes.length === 0) {
    html += `<p class="kosong">Belum ada promes.</p>`;
  }
  for (const p of k.promes) {
    html += `
      <button class="kartu" data-id="${p.id}">
        <strong>Semester ${aman(p.semester)}</strong>
        <span>${aman(p.tahun)} · ${p.modul.length} modul · ${p.sumatif.length} sumatif</span>
      </button>`;
  }
  html += `<button class="tombol-tambah" id="tambah">+ Tambah Promes</button>`;
  isi.innerHTML = html;

  document.getElementById("editKur").onclick = () => pergi("formKurikulum", { kurEditId: k.id });
  document.getElementById("tambah").onclick = () => pergi("formPromes", { proEditId: null });
  isi.querySelectorAll(".kartu").forEach(kartu => {
    kartu.onclick = () => pergi("isiPromes", { proId: kartu.dataset.id, tab: "modul" });
  });
}

function formPromes() {
  const k = kurAktif();
  const lama = k.promes.find(p => p.id === posisi.proEditId);
  const p = lama || { semester: "Ganjil", tahun: "" };

  judul.textContent = lama ? "Edit Promes" : "Tambah Promes";
  jejak.textContent = `${k.mapel} · ${k.kelas}`;
  tombolKembali.hidden = false;

  const opsiSemester = ["Ganjil", "Genap"]
    .map(s => `<option ${p.semester === s ? "selected" : ""}>${s}</option>`)
    .join("");

  isi.innerHTML = `
    <form id="form">
      <label>Semester <select name="semester">${opsiSemester}</select></label>
      <label>Tahun ajaran <input name="tahun" value="${aman(p.tahun)}" placeholder="2026/2027" required></label>
      <button type="submit" class="tombol-tambah">Simpan</button>
      ${lama ? `<button type="button" class="tombol-hapus" id="hapus">Hapus promes ini</button>` : ""}
    </form>`;

  document.getElementById("form").onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const isian = { semester: f.get("semester"), tahun: f.get("tahun") };
    if (lama) {
      Object.assign(lama, isian);
      simpan();
      pergi("isiPromes");
    } else {
      k.promes.push({ id: buatId(), ...isian, modul: [], sumatif: [] });
      simpan();
      pergi("promes");
    }
  };

  if (lama) {
    document.getElementById("hapus").onclick = async () => {
      const jumlahSoal = lama.modul.reduce((n, m) => n + m.soal.length, 0);
      const yakin = confirm(
        `Hapus promes Semester ${lama.semester} ${lama.tahun}?\n\n` +
        `${lama.modul.length} modul, ${jumlahSoal} soal, dan ${lama.sumatif.length} sumatif ikut terhapus dan TIDAK bisa dikembalikan.`
      );
      if (!yakin) return;
      await hapusFileModul(lama.modul);
      k.promes = k.promes.filter(x => x.id !== lama.id);
      simpan();
      pergi("promes");
    };
  }
}

// ====== ISI PROMES (TAB MODUL / SUMATIF) ======
function layarIsiPromes() {
  const k = kurAktif();
  const p = proAktif();
  const tab = posisi.tab || "modul";
  judul.textContent = `Semester ${p.semester} ${p.tahun}`;
  jejak.textContent = `${k.mapel} · ${k.kelas}`;
  tombolKembali.hidden = false;

  let html = `
    <div class="baris-aksi">
      <button class="tombol-kecil" id="editPro">Edit promes</button>
      <button class="tombol-kecil" id="salinPro">Salin ke tahun ajaran baru</button>
    </div>
    <div class="tab">
      <button data-tab="modul" class="${tab === "modul" ? "aktif" : ""}">Modul Ajar</button>
      <button data-tab="sumatif" class="${tab === "sumatif" ? "aktif" : ""}">Sumatif</button>
    </div>`;

  if (tab === "modul") {
    if (p.modul.length === 0) html += `<p class="kosong">Belum ada modul ajar.</p>`;
    p.modul.forEach((m, i) => {
      html += `
        <button class="kartu" data-id="${m.id}">
          <small class="label">Modul ${i + 1}</small>
          <strong>${aman(m.judul)}</strong>
          <span>${aman(m.minggu || "Minggu belum diisi")} · ${m.soal.length} soal formatif</span>
        </button>`;
    });
    html += `<button class="tombol-tambah" id="tambah">+ Tambah Modul Ajar</button>`;
  } else {
    html += `<p class="info">Soal sumatif disusun dari soal-soal di semua modul semester ini.</p>`;
    if (p.sumatif.length === 0) html += `<p class="kosong">Belum ada soal sumatif.</p>`;
    for (const s of p.sumatif) {
      html += `
        <button class="kartu kartu-sumatif" data-id="${s.id}">
          <strong>${aman(s.nama)}</strong>
          <span>${aman(s.pelaksanaan || "Pelaksanaan belum diisi")} · ${s.soalId.length} soal</span>
        </button>`;
    }
    html += `<button class="tombol-tambah tombol-sumatif" id="tambah">+ Buat Soal Sumatif</button>`;
  }
  isi.innerHTML = html;

  document.getElementById("editPro").onclick = () => pergi("formPromes", { proEditId: p.id });
  document.getElementById("salinPro").onclick = () => pergi("formSalin");
  isi.querySelectorAll(".tab button").forEach(b => {
    b.onclick = () => pergi("isiPromes", { tab: b.dataset.tab });
  });
  document.getElementById("tambah").onclick = () => {
    if (tab === "modul") pergi("formModul", { modEditId: null });
    else pergi("formSumatif", { sumEditId: null });
  };
  isi.querySelectorAll(".kartu").forEach(kartu => {
    if (tab === "modul") kartu.onclick = () => pergi("modul", { modId: kartu.dataset.id });
    else kartu.onclick = () => pergi("sumatif", { sumId: kartu.dataset.id });
  });
}

// ====== SALIN PROMES KE TAHUN AJARAN BARU ======
function formSalin() {
  const k = kurAktif();
  const p = proAktif();
  judul.textContent = "Salin Promes";
  jejak.textContent = `Semester ${p.semester} ${p.tahun}`;
  tombolKembali.hidden = false;

  // tebak tahun berikutnya: 2026/2027 → 2027/2028
  const cocok = (p.tahun || "").match(/(\d{4})\D+(\d{4})/);
  const tahunBerikut = cocok ? `${Number(cocok[1]) + 1}/${Number(cocok[2]) + 1}` : "";
  const jumlahSoal = p.modul.reduce((n, m) => n + m.soal.length, 0);

  const opsiSemester = ["Ganjil", "Genap"]
    .map(s => `<option ${p.semester === s ? "selected" : ""}>${s}</option>`)
    .join("");

  isi.innerHTML = `
    <p class="info">Semua ${p.modul.length} modul, teks bacaan, dan ${jumlahSoal} soal bakal disalin ke promes baru. Yang lama tetap aman, jadi soal tahun lalu bisa dipakai ulang lalu diedit.</p>
    <form id="form">
      <label>Semester <select name="semester">${opsiSemester}</select></label>
      <label>Tahun ajaran baru <input name="tahun" value="${aman(tahunBerikut)}" placeholder="2027/2028" required></label>
      <label class="centang"><input type="checkbox" name="sumatif" checked> Ikut salin ${p.sumatif.length} soal sumatif</label>
      <button type="submit" class="tombol-tambah" id="tombolSalin">Salin sekarang</button>
    </form>`;

  document.getElementById("form").onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const tombol = document.getElementById("tombolSalin");
    tombol.disabled = true;
    tombol.textContent = "Menyalin...";
    try {
      const baru = await salinPromes(p, f.get("semester"), f.get("tahun"), f.get("sumatif") === "on");
      k.promes.push(baru);
      simpan();
      pergi("isiPromes", { proId: baru.id, tab: "modul" });
    } catch (err) {
      alert("Gagal menyalin.\n\n" + err);
      tombol.disabled = false;
      tombol.textContent = "Salin sekarang";
    }
  };
}

// =====================================================
//  MODUL
// =====================================================
function formModul() {
  const p = proAktif();
  const lama = p.modul.find(m => m.id === posisi.modEditId); // undefined kalau modul baru
  const m = lama || { judul: "", minggu: "", link: "", catatan: "" };
  const sumber = m.namaFile ? "file" : "link";

  judul.textContent = lama ? "Edit Modul Ajar" : "Tambah Modul Ajar";
  jejak.textContent = `Semester ${p.semester} ${p.tahun}`;
  tombolKembali.hidden = false;

  isi.innerHTML = `
    <form id="form">
      <label>Judul modul <input name="judul" value="${aman(m.judul)}" placeholder="Teks Eksposisi" required></label>
      <label>Minggu ke- <input name="minggu" value="${aman(m.minggu || "")}" placeholder="Minggu 1–4"></label>

      <div>
        <p class="label-form">File modul (opsional)</p>
        <div class="pilih-jenis">
          <label class="radio"><input type="radio" name="sumber" value="link" ${sumber === "link" ? "checked" : ""}> Pakai link</label>
          <label class="radio"><input type="radio" name="sumber" value="file" ${sumber === "file" ? "checked" : ""}> Upload file</label>
        </div>
      </div>

      <label id="bagianLink">Link Google Drive / Docs
        <input name="link" type="url" value="${aman(m.link || "")}" placeholder="https://drive.google.com/...">
      </label>

      <div id="bagianFile" class="kolom">
        ${m.namaFile ? `<p class="info">File sekarang: <b>${aman(m.namaFile)}</b> (${ukuranRapi(m.ukuranFile)}). Pilih file baru kalau mau ganti.</p>` : ""}
        <label>Pilih file (PDF paling enak, bisa langsung dilihat)
          <input name="file" type="file" accept=".pdf,.doc,.docx,.ppt,.pptx">
        </label>
      </div>

      <label>Catatan (opsional) <textarea name="catatan" rows="3" placeholder="Tujuan pembelajaran, dll">${aman(m.catatan || "")}</textarea></label>
      <button type="submit" class="tombol-tambah">Simpan</button>
      ${lama ? `<button type="button" class="tombol-hapus" id="hapus">Hapus modul ini</button>` : ""}
    </form>`;

  const form = document.getElementById("form");

  function aturSumber() {
    const pakaiFile = form.sumber.value === "file";
    document.getElementById("bagianLink").hidden = pakaiFile;
    document.getElementById("bagianFile").hidden = !pakaiFile;
  }
  form.querySelectorAll('[name="sumber"]').forEach(r => r.onchange = aturSumber);
  aturSumber();

  form.onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(form);
    const pakaiFile = f.get("sumber") === "file";
    const fileBaru = f.get("file");
    const adaFileBaru = fileBaru && fileBaru.size > 0;

    if (pakaiFile && !adaFileBaru && !m.namaFile) {
      return alert("Pilih file modulnya dulu ya.");
    }
    if (adaFileBaru && fileBaru.size > 20 * 1024 * 1024) {
      return alert("File-nya kegedean (maks 20 MB). Mending upload ke Drive terus pakai link.");
    }

    const id = lama ? lama.id : buatId();
    const isian = {
      judul: f.get("judul"),
      minggu: f.get("minggu"),
      catatan: f.get("catatan")
    };

    try {
      if (pakaiFile) {
        isian.link = "";
        if (adaFileBaru) {
          await simpanFile(id, fileBaru);
          isian.namaFile = fileBaru.name;
          isian.ukuranFile = fileBaru.size;
          isian.jenisFile = fileBaru.type;
        }
      } else {
        isian.link = f.get("link").trim();
        if (m.namaFile) {
          await hapusFile(id);
          isian.namaFile = isian.ukuranFile = isian.jenisFile = null;
        }
      }
    } catch (err) {
      return alert("Gagal nyimpen file. Mungkin penyimpanan browser penuh.\n\n" + err);
    }

    if (lama) {
      Object.assign(lama, isian); // soal & bacaan tetap aman
      simpan();
      pergi("modul");
    } else {
      p.modul.push({ id, ...isian, soal: [], bacaan: [] });
      simpan();
      pergi("isiPromes", { tab: "modul" });
    }
  };

  if (lama) {
    document.getElementById("hapus").onclick = async () => {
      const yakin = confirm(
        `Hapus modul "${lama.judul}"?\n\n` +
        `${lama.soal.length} soal dan ${lama.bacaan.length} teks bacaan ikut terhapus, ` +
        `dan soal-soalnya juga keluar dari semua sumatif. TIDAK bisa dikembalikan.`
      );
      if (!yakin) return;
      const idSoal = new Set(lama.soal.map(s => s.id));
      for (const sum of p.sumatif) sum.soalId = sum.soalId.filter(id => !idSoal.has(id));
      await hapusFileModul([lama]);
      p.modul = p.modul.filter(x => x.id !== lama.id);
      simpan();
      pergi("isiPromes", { tab: "modul" });
    };
  }
}

function layarModul() {
  const p = proAktif();
  const m = modAktif();
  const nomorModul = p.modul.indexOf(m) + 1;
  judul.textContent = m.judul;
  jejak.textContent = `Semester ${p.semester} ${p.tahun} › Modul ${nomorModul}`;
  tombolKembali.hidden = false;

  // --- info modul ---
  let html = `<div class="kotak-info">
    <span>${aman(m.minggu || "Minggu belum diisi")}</span>`;
  if (m.link && /^https?:\/\//.test(m.link)) {
    html += `<a href="${aman(m.link)}" target="_blank" rel="noopener">Buka di tab baru ↗</a>`;
  }
  if (m.namaFile) {
    html += `<span>File: <b>${aman(m.namaFile)}</b> (${ukuranRapi(m.ukuranFile)})</span>
             <button class="tombol-kecil" id="bukaFile">Buka file</button>`;
  }
  if (m.catatan) html += `<p>${aman(m.catatan)}</p>`;
  html += `<button class="tombol-kecil" id="editModul">Edit info modul</button>
    </div>`;

  // --- pratinjau file modul ---
  const pratinjau = linkPratinjau(m.link);
  if (pratinjau) {
    html += `<iframe class="pratinjau" src="${aman(pratinjau)}" title="File modul" loading="lazy"></iframe>`;
  } else if (m.namaFile) {
    html += `<div id="tempatFile"></div>`;
  } else if (!m.link) {
    html += `<p class="info">Tambahin link Drive atau upload PDF di "Edit info modul" biar isi modulnya tampil di sini.</p>`;
  }

  // --- teks bacaan ---
  html += `<h2 class="subjudul">Teks Bacaan <small>${m.bacaan.length} teks</small></h2>`;
  if (m.bacaan.length === 0) {
    html += `<p class="info">Pakai teks bacaan kalau beberapa soal ngacu ke satu teks yang sama (cerpen, paragraf, berita, dll). Teksnya cukup diketik sekali.</p>`;
  }
  for (const b of m.bacaan) {
    const dipakai = m.soal.filter(s => s.bacaanId === b.id).length;
    html += `
      <div class="bacaan">
        <strong>${aman(b.judul || "Tanpa judul")}</strong>
        <p class="bacaan-pratinjau">${aman(b.teks)}</p>
        <span class="info">Dipakai ${dipakai} soal</span>
        <div class="soal-aksi">
          <button data-edit-bacaan="${b.id}">Edit</button>
          <button data-soal-bacaan="${b.id}">+ Soal untuk teks ini</button>
        </div>
      </div>`;
  }
  html += `<button class="tombol-garis tombol-garis-utama" id="tambahBacaan">+ Tambah Teks Bacaan</button>`;

  // --- soal formatif ---
  html += `<h2 class="subjudul">Soal Formatif <small>${m.soal.length} soal</small></h2>`;
  if (m.soal.length === 0) html += `<p class="kosong">Belum ada soal.</p>`;
  m.soal.forEach((s, i) => {
    html += kartuSoal(s, {
      nomor: i + 1,
      indeks: i,
      jumlah: m.soal.length,
      mode: "modul",
      bacaan: m.bacaan.find(b => b.id === s.bacaanId)
    });
  });
  if (m.soal.length > 0) {
    html += `<button class="tombol-garis tombol-garis-utama" id="cetakFormatif">Cetak soal formatif</button>`;
  }
  html += `<button class="tombol-tambah" id="tambah">+ Tambah Soal Formatif</button>`;
  isi.innerHTML = html;

  // --- tombol-tombol ---
  document.getElementById("editModul").onclick = () => pergi("formModul", { modEditId: m.id });
  if (m.namaFile) tampilkanFileModul(m);

  document.getElementById("tambahBacaan").onclick = () => pergi("formBacaan", { bacaanId: null });
  isi.querySelectorAll("[data-edit-bacaan]").forEach(b => {
    b.onclick = () => pergi("formBacaan", { bacaanId: b.dataset.editBacaan });
  });
  isi.querySelectorAll("[data-soal-bacaan]").forEach(b => {
    b.onclick = () => pergi("formSoal", { soalId: null, bacaanPilih: b.dataset.soalBacaan });
  });

  const tombolCetak = document.getElementById("cetakFormatif");
  if (tombolCetak) tombolCetak.onclick = () => pergi("cetak", { cetakDari: "modul" });

  document.getElementById("tambah").onclick = () => pergi("formSoal", { soalId: null, bacaanPilih: null });
  isi.querySelectorAll("[data-edit]").forEach(b => {
    b.onclick = () => pergi("formSoal", { soalId: b.dataset.edit, bacaanPilih: null });
  });
  isi.querySelectorAll("[data-hapus]").forEach(b => {
    b.onclick = () => hapusSoal(b.dataset.hapus);
  });
  pasangGeser(m.soal);
}

// ambil file modul dari IndexedDB, terus tampilkan / siapkan tombol buka
async function tampilkanFileModul(m) {
  const file = await ambilFile(m.id);
  const tempat = document.getElementById("tempatFile");
  const tombolBuka = document.getElementById("bukaFile");
  if (!tempat || posisi.modId !== m.id) return; // keburu pindah layar

  if (!file) {
    tempat.innerHTML = `<p class="kosong">File-nya nggak ketemu di perangkat ini. Mungkin di-upload dari perangkat lain.</p>`;
    tombolBuka.hidden = true;
    return;
  }

  urlFileAktif = URL.createObjectURL(file);
  const pdf = file.type === "application/pdf" || /\.pdf$/i.test(m.namaFile);

  if (pdf) {
    tempat.innerHTML = `<iframe class="pratinjau" src="${urlFileAktif}" title="File modul"></iframe>`;
    tombolBuka.onclick = () => window.open(urlFileAktif, "_blank");
  } else {
    tempat.innerHTML = `<p class="info">File Word/PowerPoint nggak bisa ditampilin langsung di browser. Klik "Buka file" buat download.</p>`;
    tombolBuka.onclick = () => {
      const a = document.createElement("a");
      a.href = urlFileAktif;
      a.download = m.namaFile;
      a.click();
    };
  }
}

// ubah link Drive/Docs jadi link pratinjau yang bisa ditempel di halaman
function linkPratinjau(link) {
  if (!link) return null;
  let cocok = link.match(/drive\.google\.com\/file\/d\/([\w-]+)/)
           || link.match(/drive\.google\.com\/open\?id=([\w-]+)/);
  if (cocok) return `https://drive.google.com/file/d/${cocok[1]}/preview`;
  cocok = link.match(/docs\.google\.com\/(document|presentation|spreadsheets)\/d\/([\w-]+)/);
  if (cocok) return `https://docs.google.com/${cocok[1]}/d/${cocok[2]}/preview`;
  return null;
}

// =====================================================
//  TEKS BACAAN
// =====================================================
function formBacaan() {
  const m = modAktif();
  const lama = m.bacaan.find(b => b.id === posisi.bacaanId);
  const b = lama || { judul: "", teks: "" };

  judul.textContent = lama ? "Edit Teks Bacaan" : "Tambah Teks Bacaan";
  jejak.textContent = m.judul;
  tombolKembali.hidden = false;

  isi.innerHTML = `
    <form id="form">
      <label>Judul (opsional) <input name="judul" value="${aman(b.judul)}" placeholder="Si Kancil dan Buaya"></label>
      <label>Isi teks
        <textarea name="teks" rows="12" required placeholder="Tempel atau ketik teks bacaannya di sini...">${aman(b.teks)}</textarea>
      </label>
      <button type="submit" class="tombol-tambah">Simpan</button>
      ${lama ? `<button type="button" class="tombol-hapus" id="hapus">Hapus teks bacaan ini</button>` : ""}
    </form>`;

  document.getElementById("form").onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const isian = { judul: f.get("judul").trim(), teks: f.get("teks").trim() };
    if (lama) Object.assign(lama, isian);
    else m.bacaan.push({ id: buatId(), ...isian });
    simpan();
    pergi("modul");
  };

  if (lama) {
    document.getElementById("hapus").onclick = () => {
      const dipakai = m.soal.filter(s => s.bacaanId === lama.id);
      const pesan = dipakai.length
        ? `Hapus teks ini? ${dipakai.length} soal yang memakainya tetap ada, cuma nggak punya teks bacaan lagi.`
        : "Hapus teks bacaan ini?";
      if (!confirm(pesan)) return;
      for (const s of dipakai) s.bacaanId = null;
      m.bacaan = m.bacaan.filter(x => x.id !== lama.id);
      simpan();
      pergi("modul");
    };
  }
}

// =====================================================
//  SOAL
// =====================================================

// HTML satu kartu soal
// o.mode "modul"   → tombol Edit & Hapus
// o.mode "sumatif" → tombol Keluarkan + label asal modul
function kartuSoal(s, o) {
  const pg = s.jenis === "PG";
  let html = `
    <div class="soal">
      <div class="soal-atas">
        <span class="nomor">${o.nomor}</span>
        <span class="jenis ${pg ? "jenis-pg" : "jenis-esai"}">${pg ? "Pilihan Ganda" : "Esai"}</span>
        ${o.bacaan ? `<span class="label-bacaan">Teks: ${aman(potong(o.bacaan.judul || o.bacaan.teks, 28))}</span>` : ""}
        ${o.asal ? `<span class="asal">${aman(o.asal)}</span>` : ""}
      </div>
      <p class="soal-teks">${aman(s.teks)}</p>`;

  if (pg) {
    html += `<ol class="pilihan">`;
    s.pilihan.forEach((teks, i) => {
      if (!teks) return;
      html += `<li class="${i === s.kunci ? "benar" : ""}"><b>${HURUF[i]}.</b> ${aman(teks)}</li>`;
    });
    html += `</ol>`;
  } else {
    html += `<p class="pedoman"><b>Pedoman:</b> ${aman(s.pedoman || "-")}</p>`;
  }

  html += `
      <div class="soal-aksi">
        <button class="panah" data-naik="${o.indeks}" aria-label="Naikkan soal" ${o.indeks === 0 ? "disabled" : ""}>↑</button>
        <button class="panah" data-turun="${o.indeks}" aria-label="Turunkan soal" ${o.indeks === o.jumlah - 1 ? "disabled" : ""}>↓</button>
        <span class="spasi"></span>`;
  if (o.mode === "modul") {
    html += `
        <button data-edit="${s.id}">Edit</button>
        <button data-hapus="${s.id}" class="hapus">Hapus</button>`;
  } else {
    html += `<button data-lepas="${s.id}">Keluarkan</button>`;
  }
  html += `</div></div>`;
  return html;
}

function hapusSoal(id) {
  if (!confirm("Yakin hapus soal ini? Soal ini juga bakal hilang dari soal sumatif.")) return;
  const m = modAktif();
  m.soal = m.soal.filter(s => s.id !== id);
  for (const sum of proAktif().sumatif) {
    sum.soalId = sum.soalId.filter(x => x !== id);
  }
  simpan();
  tampilkan(true);
}

function formSoal() {
  const m = modAktif();
  const lama = m.soal.find(s => s.id === posisi.soalId);
  const s = lama || {
    teks: "", jenis: "PG", pilihan: ["", "", "", "", ""], kunci: 0, pedoman: "",
    bacaanId: posisi.bacaanPilih || null
  };

  judul.textContent = lama ? "Edit Soal" : "Tambah Soal Formatif";
  jejak.textContent = m.judul;
  tombolKembali.hidden = false;

  let opsiHtml = "";
  HURUF.forEach((h, i) => {
    const isian = (s.pilihan && s.pilihan[i]) || "";
    opsiHtml += `
      <div class="opsi">
        <input type="radio" name="kunci" value="${i}" id="kunci${i}" ${i === s.kunci ? "checked" : ""}>
        <label for="kunci${i}" class="huruf" title="Jadikan kunci">${h}</label>
        <input name="pilihan${i}" value="${aman(isian)}" placeholder="Jawaban ${h}${i === 4 ? " (opsional)" : ""}" aria-label="Jawaban ${h}">
      </div>`;
  });

  const opsiBacaan = m.bacaan
    .map(b => `<option value="${b.id}" ${s.bacaanId === b.id ? "selected" : ""}>${aman(b.judul || potong(b.teks, 40))}</option>`)
    .join("");

  isi.innerHTML = `
    <form id="form">
      ${m.bacaan.length ? `
        <label>Teks bacaan (opsional)
          <select name="bacaanId">
            <option value="">Tanpa teks bacaan</option>
            ${opsiBacaan}
          </select>
        </label>
        <p class="bacaan-pratinjau" id="pratinjauBacaan"></p>` : ""}

      <label>Pertanyaan
        <textarea name="teks" rows="4" required placeholder="Ketik soalnya di sini...">${aman(s.teks)}</textarea>
      </label>

      <div class="pilih-jenis">
        <label class="radio"><input type="radio" name="jenis" value="PG" ${s.jenis === "PG" ? "checked" : ""}> Pilihan Ganda</label>
        <label class="radio"><input type="radio" name="jenis" value="Esai" ${s.jenis === "Esai" ? "checked" : ""}> Esai</label>
      </div>

      <div id="bagianPG">
        <p class="info">Klik huruf untuk menandai kunci jawaban.</p>
        ${opsiHtml}
      </div>

      <label id="bagianEsai">Pedoman jawaban
        <textarea name="pedoman" rows="3" placeholder="Poin-poin jawaban yang diharapkan">${aman(s.pedoman || "")}</textarea>
      </label>

      <button type="submit" class="tombol-tambah">Simpan</button>
    </form>`;

  const form = document.getElementById("form");

  function aturJenis() {
    const pg = form.jenis.value === "PG";
    document.getElementById("bagianPG").hidden = !pg;
    document.getElementById("bagianEsai").hidden = pg;
  }
  form.querySelectorAll('[name="jenis"]').forEach(r => r.onchange = aturJenis);
  aturJenis();

  // tampilkan cuplikan teks bacaan yang dipilih
  const pilihBacaan = form.bacaanId;
  function aturBacaan() {
    const tempat = document.getElementById("pratinjauBacaan");
    const b = m.bacaan.find(x => x.id === pilihBacaan.value);
    tempat.hidden = !b;
    tempat.textContent = b ? b.teks : "";
  }
  if (pilihBacaan) {
    pilihBacaan.onchange = aturBacaan;
    aturBacaan();
  }

  form.onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(form);
    const baru = {
      id: lama ? lama.id : buatId(),
      teks: f.get("teks").trim(),
      jenis: f.get("jenis"),
      bacaanId: f.get("bacaanId") || null
    };

    if (baru.jenis === "PG") {
      baru.pilihan = HURUF.map((h, i) => f.get("pilihan" + i).trim());
      baru.kunci = Number(f.get("kunci"));
      if (baru.pilihan.filter(x => x).length < 2) return alert("Isi minimal 2 pilihan jawaban.");
      if (!baru.pilihan[baru.kunci]) return alert("Kunci jawaban yang dipilih masih kosong.");
    } else {
      baru.pedoman = f.get("pedoman").trim();
    }

    if (lama) {
      m.soal[m.soal.indexOf(lama)] = baru;
    } else if (baru.bacaanId) {
      // soal baru dengan teks bacaan: taruh tepat setelah soal lain yang pakai teks sama
      let posTerakhir = -1;
      m.soal.forEach((x, i) => { if (x.bacaanId === baru.bacaanId) posTerakhir = i; });
      if (posTerakhir >= 0) m.soal.splice(posTerakhir + 1, 0, baru);
      else m.soal.push(baru);
    } else {
      m.soal.push(baru);
    }
    simpan();
    pergi("modul");
  };
}

// =====================================================
//  SUMATIF
// =====================================================
function formSumatif() {
  const p = proAktif();
  const lama = p.sumatif.find(s => s.id === posisi.sumEditId);
  const s = lama || { nama: "", pelaksanaan: "" };

  judul.textContent = lama ? "Edit Soal Sumatif" : "Buat Soal Sumatif";
  jejak.textContent = `Semester ${p.semester} ${p.tahun}`;
  tombolKembali.hidden = false;

  isi.innerHTML = `
    <form id="form">
      <label>Nama ujian <input name="nama" value="${aman(s.nama)}" placeholder="Sumatif Tengah Semester" required></label>
      <label>Pelaksanaan <input name="pelaksanaan" value="${aman(s.pelaksanaan || "")}" placeholder="Minggu 9"></label>
      <button type="submit" class="tombol-tambah tombol-sumatif">${lama ? "Simpan" : "Lanjut pilih soal"}</button>
      ${lama ? `<button type="button" class="tombol-hapus" id="hapus">Hapus sumatif ini</button>` : ""}
    </form>`;

  document.getElementById("form").onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const isian = { nama: f.get("nama"), pelaksanaan: f.get("pelaksanaan") };
    if (lama) {
      Object.assign(lama, isian);
      simpan();
      pergi("sumatif");
    } else {
      const baru = { id: buatId(), ...isian, soalId: [] };
      p.sumatif.push(baru);
      simpan();
      pergi("pilihSoal", { sumId: baru.id });
    }
  };

  if (lama) {
    document.getElementById("hapus").onclick = () => {
      if (!confirm(`Hapus "${lama.nama}"? Soal-soalnya tetap aman di modul masing-masing.`)) return;
      p.sumatif = p.sumatif.filter(x => x.id !== lama.id);
      simpan();
      pergi("isiPromes", { tab: "sumatif" });
    };
  }
}

function layarSumatif() {
  const p = proAktif();
  const sum = sumAktif();
  judul.textContent = sum.nama;
  jejak.textContent = `Semester ${p.semester} ${p.tahun} › Sumatif`;
  tombolKembali.hidden = false;

  // bersihin id soal yang udah nggak ada, biar nomor urut & tombol geser pas
  const bersih = sum.soalId.filter(id => cariSoal(id));
  if (bersih.length !== sum.soalId.length) {
    sum.soalId = bersih;
    simpan();
  }

  const daftar = sum.soalId.map(cariSoal);
  const jumlahPG = daftar.filter(x => x.soal.jenis === "PG").length;

  let html = `
    <div class="kotak-info kotak-sumatif">
      <span>${aman(sum.pelaksanaan || "Pelaksanaan belum diisi")}</span>
      <strong>${daftar.length} soal · ${jumlahPG} PG · ${daftar.length - jumlahPG} esai</strong>
      <button class="tombol-kecil" id="editSum">Edit nama ujian</button>
    </div>
    <button class="tombol-garis" id="pilih">Pilih / ubah soal</button>`;

  if (daftar.length === 0) {
    html += `<p class="kosong">Belum ada soal. Klik "Pilih / ubah soal" buat nyentang soal dari modul.</p>`;
  } else {
    html += `<p class="info">Atur urutan pakai tombol ↑ ↓. Di lembar cetak, soal PG dikumpulin di bagian A dan esai di bagian B.</p>`;
  }
  daftar.forEach((x, i) => {
    html += kartuSoal(x.soal, {
      nomor: i + 1,
      indeks: i,
      jumlah: daftar.length,
      mode: "sumatif",
      asal: x.asal,
      bacaan: x.bacaan
    });
  });
  if (daftar.length > 0) {
    html += `<button class="tombol-tambah tombol-sumatif" id="cetak">Cetak soal</button>`;
  }
  isi.innerHTML = html;

  document.getElementById("editSum").onclick = () => pergi("formSumatif", { sumEditId: sum.id });
  document.getElementById("pilih").onclick = () => pergi("pilihSoal");
  const tombolCetak = document.getElementById("cetak");
  if (tombolCetak) tombolCetak.onclick = () => pergi("cetak", { cetakDari: "sumatif" });

  isi.querySelectorAll("[data-lepas]").forEach(b => {
    b.onclick = () => {
      sum.soalId = sum.soalId.filter(id => id !== b.dataset.lepas);
      simpan();
      tampilkan(true);
    };
  });
  pasangGeser(sum.soalId);
}

function layarPilihSoal() {
  const p = proAktif();
  const sum = sumAktif();
  judul.textContent = "Pilih Soal";
  jejak.textContent = sum.nama;
  tombolKembali.hidden = false;

  const terpilih = new Set(sum.soalId);
  let html = `<p class="info">Centang soal yang mau dimasukin ke ${aman(sum.nama)}.</p>`;

  if (p.modul.length === 0) {
    html += `<p class="kosong">Belum ada modul. Bikin modul dan soal formatif dulu ya.</p>`;
  }
  p.modul.forEach((m, i) => {
    html += `<h3 class="grup">Modul ${i + 1} · ${aman(m.judul)}</h3>`;
    if (m.soal.length === 0) html += `<p class="info">Belum ada soal di modul ini.</p>`;
    for (const s of m.soal) {
      const b = m.bacaan.find(x => x.id === s.bacaanId);
      html += `
        <label class="pilih-soal">
          <input type="checkbox" value="${s.id}" ${terpilih.has(s.id) ? "checked" : ""}>
          <span>
            <span class="pilih-teks">${aman(s.teks)}</span>
            <small>${s.jenis === "PG" ? "Pilihan Ganda" : "Esai"}${b ? ` · Teks: ${aman(potong(b.judul || b.teks, 28))}` : ""}</small>
          </span>
        </label>`;
    }
  });
  html += `
    <div class="bawah-lengket">
      <button class="tombol-tambah tombol-sumatif" id="simpanPilihan"></button>
    </div>`;
  isi.innerHTML = html;

  const tombol = document.getElementById("simpanPilihan");
  const kotak = [...isi.querySelectorAll(".pilih-soal input")];

  function hitung() {
    const n = kotak.filter(k => k.checked).length;
    tombol.textContent = `Simpan (${n} soal)`;
  }
  kotak.forEach(k => k.onchange = hitung);
  hitung();

  tombol.onclick = () => {
    const dicentang = kotak.filter(k => k.checked).map(k => k.value);
    const tetap = sum.soalId.filter(id => dicentang.includes(id));     // yang lama, urutannya dijaga
    const tambahan = dicentang.filter(id => !sum.soalId.includes(id)); // yang baru, di belakang
    sum.soalId = [...tetap, ...tambahan];
    simpan();
    pergi("sumatif");
  };
}

// =====================================================
//  CARI SOAL
// =====================================================

// tandai kata yang dicari pakai <mark>, tetap aman dari HTML
function sorot(teks, kata) {
  const kecil = teks.toLowerCase();
  const k = kata.toLowerCase();
  let hasil = "";
  let dari = 0;
  let pos;
  while ((pos = kecil.indexOf(k, dari)) !== -1) {
    hasil += aman(teks.slice(dari, pos)) + `<mark>${aman(teks.slice(pos, pos + k.length))}</mark>`;
    dari = pos + k.length;
  }
  return hasil + aman(teks.slice(dari));
}

function layarCari() {
  judul.textContent = "Cari Soal";
  jejak.textContent = "Semua kurikulum";
  tombolKembali.hidden = false;

  isi.innerHTML = `
    <input type="search" id="kataCari" value="${aman(posisi.kata || "")}" placeholder="Ketik kata yang ada di soal..." aria-label="Kata yang dicari">
    <div id="hasilCari" class="kolom"></div>`;

  const input = document.getElementById("kataCari");
  const tempat = document.getElementById("hasilCari");

  function cari() {
    const kata = input.value.trim();
    posisi.kata = kata;
    if (kata.length < 2) {
      tempat.innerHTML = `<p class="info">Ketik minimal 2 huruf.</p>`;
      return;
    }

    const kecil = kata.toLowerCase();
    const hasil = [];
    for (const k of data.kurikulum) {
      for (const p of k.promes) {
        p.modul.forEach((m, i) => {
          for (const s of m.soal) {
            const semuaTeks = [s.teks, ...(s.pilihan || []), s.pedoman || ""].join(" ").toLowerCase();
            if (semuaTeks.includes(kecil)) hasil.push({ k, p, m, i, s });
          }
        });
      }
    }

    if (hasil.length === 0) {
      tempat.innerHTML = `<p class="kosong">Nggak ada soal yang mengandung "${aman(kata)}".</p>`;
      return;
    }

    let h = `<p class="info">${hasil.length} soal ketemu${hasil.length > 100 ? " (ditampilkan 100 pertama)" : ""}</p>`;
    for (const x of hasil.slice(0, 100)) {
      h += `
        <button class="kartu" data-kur="${x.k.id}" data-pro="${x.p.id}" data-mod="${x.m.id}">
          <span>${aman(x.k.mapel)} ${aman(x.k.kelas)} › ${aman(x.p.semester)} ${aman(x.p.tahun)} › Modul ${x.i + 1}</span>
          <span class="teks-hasil">${sorot(x.s.teks, kata)}</span>
        </button>`;
    }
    tempat.innerHTML = h;

    tempat.querySelectorAll(".kartu").forEach(kartu => {
      kartu.onclick = () => pergi("modul", {
        kurId: kartu.dataset.kur,
        proId: kartu.dataset.pro,
        modId: kartu.dataset.mod,
        tab: "modul"
      });
    });
  }

  input.oninput = cari;
  cari();
  input.focus();
}

// ====== MULAI! ======
tampilkan();