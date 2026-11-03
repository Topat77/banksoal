// =====================================================
//  nilai.js — daftar santri, lembar nilai per mapel, hitung nilai akhir
//
//  Satu lembar nilai = satu mapel, satu semester.
//  Isinya kolom-kolom nilai (Tugas 1, UH 1, UH 2, UTS, UAS, ...),
//  dan kehadiran tiap santri (hadir/sakit/izin). Yang ngisi: pengampu mapelnya.
//  Bobot tiap kelompok diatur admin, satu set per jenjang & jenis mapel
//  (Paket B umum, Paket B diniah, Paket C umum, Paket C diniah),
//  disimpan di pengaturan/bobot: { "Paket B": { umum, diniah }, ... }.
//  Nilai akhir = gabungan rata-rata tiap kelompok sesuai bobotnya.
// =====================================================

const KELOMPOK_NILAI = [
  { k: "tugas", nama: "Tugas", label: "Tugas" },
  { k: "uh", nama: "Ulangan harian", label: "UH" },
  { k: "uts", nama: "UTS", label: "UTS" },
  { k: "uas", nama: "UAS", label: "UAS" },
  { k: "keaktifan", nama: "Keaktifan", label: "Keaktifan" },
  { k: "kehadiran", nama: "Kehadiran", label: "Kehadiran" }
];

// bobot bawaan, dipakai selama admin belum ngatur sendiri
const BOBOT_BAWAAN = {
  umum:   { tugas: 20, uh: 30, uts: 20, uas: 30, keaktifan: 0, kehadiran: 0 },
  diniah: { tugas: 15, uh: 25, uts: 20, uas: 25, keaktifan: 5, kehadiran: 10 }
};

function jenisMapel(m) { return m && m.jenis === "diniah" ? "diniah" : "umum"; }

// bobot yang berlaku buat satu jenjang & jenis mapel.
// Data lama (satu set per jenis, belum dipisah jenjang) tetap dipakai sampai admin nyimpan bobot baru.
function bobotUntuk(jenjang, jenis) {
  const semua = toko.bobot || {};
  const atur = (semua[jenjang] || {})[jenis] || semua[jenis];
  const dasar = BOBOT_BAWAAN[jenis] || BOBOT_BAWAAN.umum;
  const hasil = {};
  for (const g of KELOMPOK_NILAI) hasil[g.k] = atur && atur[g.k] !== undefined ? Number(atur[g.k]) || 0 : dasar[g.k];
  return hasil;
}
function ringkasBobot(bobot) {
  return KELOMPOK_NILAI.filter(g => bobot[g.k] > 0).map(g => `${g.label} ${bobot[g.k]}%`).join(" · ");
}
function namaJenis(j) { return j === "diniah" ? "Diniah" : "Umum"; }

// daftar mapel dikelompokkan per jenis: diniah dulu (fiqih, aqidah, nahwu, ...), lalu umum.
// Tiap mapel tetap sendiri-sendiri; di dalam kelompok urut nama mapel, lalu kelas.
const URUT_JENIS = ["diniah", "umum"];
function urutMapelJenis(a, b) {
  return (URUT_JENIS.indexOf(jenisMapel(a)) - URUT_JENIS.indexOf(jenisMapel(b))) ||
    a.nama.localeCompare(b.nama, "id") || bandingKelas(a, b);
}
function kelompokJenis(daftar) {
  return URUT_JENIS
    .map(jenis => ({ jenis, mapel: daftar.filter(m => jenisMapel(m) === jenis).sort(urutMapelJenis) }))
    .filter(k => k.mapel.length);
}
// tebakan jenis dari nama mapel, buat form tambah mapel
const POLA_DINIAH = /fiq[ih]|fikih|aqidah|akidah|akhlak|nahw|nahu|sh?or[ao]f|sharaf|tajwid|tafsir|hadi[ts]|tahfi[dz]|qur.?an|bahasa arab|tarikh|sirah|mahfu[dz]?at|imla|khat|fara.?idh?|ushul|balaghah|mantiq|tauhid|tasawuf|muthala/i;
function tebakJenis(nama) {
  return POLA_DINIAH.test(nama || "") ? "diniah" : "umum";
}

function angkaRapi(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return "-";
  return Number(n).toLocaleString("id-ID", { maximumFractionDigits: 1 });
}
function rataRata(daftar) {
  const ada = daftar.filter(x => typeof x === "number" && !Number.isNaN(x));
  return ada.length ? ada.reduce((a, b) => a + b, 0) / ada.length : null;
}

function lembarBaru(mapel, sem) {
  const bobot = bobotUntuk(mapel.jenjang, jenisMapel(mapel));
  // id kolom bawaan sengaja tetap (bukan acak): kalau dua HP bikin lembar yang sama pas offline,
  // kolomnya digabung jadi satu, nggak dobel
  const kolom = [
    { id: "k-tugas-1", kelompok: "tugas", label: "Tugas 1" },
    { id: "k-uh-1", kelompok: "uh", label: "UH 1" },
    { id: "k-uts", kelompok: "uts", label: "UTS" },
    { id: "k-uas", kelompok: "uas", label: "UAS" }
  ];
  if (bobot.keaktifan > 0) kolom.push({ id: "k-keaktifan", kelompok: "keaktifan", label: "Keaktifan" });
  return {
    id: idLembarNilai(sem), semester: sem.semester, tahun: sem.tahun,
    kolom, nilai: {}, hadir: {}
  };
}

// nilai satu santri di satu lembar (mapel: buat nentuin bobot sesuai jenisnya)
function hitungNilai(lembar, idSantri, mapel) {
  const hasil = { per: {}, harian: null, akhir: null, hadir: null };
  if (!lembar) return hasil;
  const isi = (lembar.nilai || {})[idSantri] || {};
  for (const g of KELOMPOK_NILAI) {
    if (g.k === "kehadiran") continue;
    hasil.per[g.k] = rataRata((lembar.kolom || []).filter(k => k.kelompok === g.k).map(k => isi[k.id]));
  }
  hasil.harian = rataRata((lembar.kolom || []).filter(k => k.kelompok === "tugas" || k.kelompok === "uh").map(k => isi[k.id]));
  const h = (lembar.hadir || {})[idSantri];
  if (h) {
    // isinya dari database bisa string/HTML (rules cuma ngecek bentuk petanya), jadi dipaksa jadi angka >= 0
    const angkaHadir = (x) => Math.max(0, Math.round(Number(x) || 0));
    hasil.hadir = { hadir: angkaHadir(h.hadir), sakit: angkaHadir(h.sakit), izin: angkaHadir(h.izin) };
    const total = hasil.hadir.hadir + hasil.hadir.sakit + hasil.hadir.izin;
    hasil.per.kehadiran = total > 0 ? hasil.hadir.hadir / total * 100 : null;
  } else {
    hasil.per.kehadiran = null;
  }
  // kelompok yang belum ada nilainya nggak ikut dihitung (bobotnya dibagi ke yang ada)
  const daftarBobot = bobotUntuk(mapel.jenjang, jenisMapel(mapel));
  let jumlah = 0, bobot = 0;
  for (const g of KELOMPOK_NILAI) {
    const b = Number(daftarBobot[g.k]) || 0;
    const v = hasil.per[g.k];
    if (b > 0 && v !== null) { jumlah += b * v; bobot += b; }
  }
  hasil.akhir = bobot > 0 ? jumlah / bobot : null;
  return hasil;
}

// =====================================================
//  DAFTAR SANTRI
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
  jejak.textContent = kelas ? `${kelas}, ${jenjang}` : (boleh ? jenjangAktif() : "");
  tombolKembali.hidden = !posisi.dariNilai;

  let h = (boleh ? htmlTabJenjang() : "") + `<div class="pilih-semester" role="group" aria-label="Kelas">`;
  for (const x of semua) {
    const k = `${x.jenjang}|${x.kelas}`;
    h += `<button class="chip ${k === kunci ? "aktif" : ""}" data-kelas="${aman(k)}" aria-pressed="${k === kunci}">${aman(x.kelas)}${boleh ? "" : ` · ${aman(x.jenjang)}`}</button>`;
  }
  h += `</div>`;

  if (!kelas) {
    h += boleh
      ? `<p class="kosong">Belum ada kelas ${aman(jenjangAktif())}. Kelas muncul otomatis setelah ada mapel (dibuat admin).</p>`
      : `<p class="kosong">Kamu belum mengajar di kelas mana pun, jadi belum ada daftar siswa yang bisa dilihat.</p>`;
    isi.innerHTML = h;
    if (boleh) pasangTabJenjang("santri", { kelasSantri: null });
    return;
  }

  const daftar = santriKelas(jenjang, kelas);

  // ---------- ustadz: cuma lihat ----------
  if (!boleh) {
    h += `
      <h2 class="subjudul">Siswa ${aman(kelas)} ${aman(jenjang)} <small>${daftar.length} siswa</small></h2>
      <p class="info">Daftar siswa diisi admin (TU). Kalau ada nama atau NIS yang salah, kabari admin ya.</p>`;
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
    <h2 class="subjudul">Siswa ${aman(kelas)} ${aman(jenjang)} <small id="jumlahSantri">${daftar.length} siswa</small></h2>
    ${htmlPilihWali(jenjang, kelas, semesterSekarang().tahun)}
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
      <div class="daftar-akun">${keluar.map(s => `
        <div class="kartu-akun redup">
          <div class="kartu-akun-isi">
            <strong>${aman(s.nama)}</strong>
            <span>${HASIL_NAIK[s.status]}${s.keluar && s.keluar.tahun ? ` · ${aman(s.keluar.tahun)}` : ""}</span>
            <small>${riwayatSantri(s).map(r => `${aman(r.kelas)} (${aman(r.tahun)})`).join(" → ") || ""}</small>
          </div>
          <div class="baris-tombol"><button class="tombol-kedua" data-aktifkan="${aman(s.id)}">Aktifkan lagi</button></div>
        </div>`).join("")}</div>`;
  }
  h += `<p class="info">Naik kelas dicatat dari lembar nilai semester Genap (menu mapel → Nilai → Keputusan naik kelas).</p>`;
  isi.innerHTML = h;
  pasangTab();

wali-kelas
  pasangPilihWali();
  klik("keNaikKelas", () => pergi("naikKelas", { tahunNaik: null }));

 main
  isi.querySelectorAll("[data-aktifkan]").forEach(b => b.onclick = async () => {
    const s = toko.santri.find(y => y.id === b.dataset.aktifkan);
    if (!s || !(await tanyaYakin(`Aktifkan lagi ${s.nama} di kelas ${s.kelas}?`, { ya: "Aktifkan" }))) return;
    simpanSantri(aktifkanLagiSantri(s));
    layarSantri();
  });

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
        pesan.textContent = "Nama nggak boleh kosong. Kalau mau menghapus, pakai tombol ×.";
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
    const pilih = await tanyaPilih(`${x.nama} keluar dari kelas ini?\n\nPindah sekolah: datanya tetap disimpan, rapor & nilai lamanya masih bisa dibuka.\n\nHapus: cuma buat salah ketik. Datanya hilang permanen, nilai yang sudah diisi untuk siswa ini nggak kepakai lagi.`,
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
  document.getElementById("tambahBaris").onclick = () => {
    badan.insertAdjacentHTML("beforeend", htmlBarisSantri(null).repeat(5));
    pasangBaris();
  };
}

// =====================================================
//  LEMBAR NILAI SATU MAPEL
// =====================================================
let tundaNilai = null;     // simpan ditunda sebentar biar nggak nulis tiap ketikan
let lembarAktif = null;    // salinan lembar yang lagi diisi

// yang dikirim cuma sel yang berubah, bukan satu lembar utuh
function kirimNilaiTertunda() {
  if (!tundaNilai) return;
  clearTimeout(tundaNilai.waktu);
  const t = tundaNilai;
  tundaNilai = null;
  simpanNilaiSebagian(t.idMapel, t.lembar, [...t.ubah.values()]);
}
// nilai yang belum sempat terkirim, dikirim waktu halaman ditutup
window.addEventListener("pagehide", kirimNilaiTertunda);

// siswa yang ada di kelas mapel ini PADA TAHUN lembar itu (bukan kelas sekarang), jadi lembar tahun lalu
// tetap nampilin siswa kelas itu walau sekarang udah naik kelas. Tahun berjalan tanpa riwayat = sama kayak santriKelas().
function santriLembar(mp, sem) {
  return santriKelasDi(mp.jenjang, mp.kelas, sem.tahun);
}
// jumlah siswa yang punya nilai di lembar tapi nggak kebaca (guru cuma bisa baca siswa kelasnya yang sekarang)
function jumlahNilaiTakTerbaca(lembar, santri) {
  if (!lembar) return 0;
  const ada = new Set(santri.map(s => s.id));
  const id = new Set([...Object.keys(lembar.nilai || {}), ...Object.keys(lembar.hadir || {})]);
  let n = 0;
  for (const i of id) {
    if (ada.has(i)) continue;
    const isiNilai = Object.keys((lembar.nilai || {})[i] || {}).length + Object.keys((lembar.hadir || {})[i] || {}).length;
    if (isiNilai) n++;
  }
  return n;
}
function infoNilaiTakTerbaca(lembar, santri) {
  if (sayaKurikulum() || !jumlahNilaiTakTerbaca(lembar, santri)) return "";
  return `<p class="info">Sebagian siswa tahun ini udah pindah kelas, namanya cuma kelihatan di akun TU.</p>`;
}
function tandaKeluarSantri(s) {
  return santriKeluar(s) ? ` <span class="tanda tanda-tutup">${aman(HASIL_NAIK[s.status])}</span>` : "";
}

// =====================================================
//  KEPUTUSAN NAIK KELAS (panel di bawah lembar nilai, khusus TU, semester Genap)
//  Tiap pencet tombol: dialog konfirmasi, lalu 1 tulis simpanSantri (batal = nggak nulis apa pun).
//  Baris cuma digambar ulang sendiri (isi <li>), lembar nilai & scroll nggak disentuh.
// =====================================================
let panelKeputusan = null;   // { tahun, jenjang, kelas, akhir, status: Map(id -> status), sibuk: Set(id), disentuh }

function panelKeputusanBoleh(sem) {
  return sayaKurikulum() && sem.semester === "Genap" && sem.tahun <= semesterSekarang().tahun;
}
function rapikanTujuan(teks) {
  return String(teks || "").trim().replace(/\s+/g, " ");
}
function labelHasilKeputusan(hasil, akhir, tujuan) {
  if (hasil === "naik") return tujuan ? `Naik ke ${tujuan}` : "Naik kelas";
  if (hasil === "tinggal") return akhir ? "Tidak lulus" : "Tidak naik";
  if (hasil === "lulus") return "Lulus";
  return "Belum diputuskan";
}
const TEKS_STATUS_KEPUTUSAN = {
  menyimpan: "Menyimpan...",
  tersimpan: "Tersimpan",
  menunggu: "Menunggu sinyal (tersimpan di HP, dikirim waktu ada sinyal)",
  gagal: "Gagal menyimpan. Pencet lagi buat mengulang."
};
function htmlIsiBarisKeputusan(s, no, tahun, status) {
  const k = keputusanTahun(s, tahun);
  const a = kelasSantriDi(s, tahun);
  const akhir = tingkatAkhir(a.jenjang, a.kelas);
  const hasil = k.fase === "terkunci" ? k.hasil : k.fase;
  let label, ket = "", tombol = "";
  if (k.fase === "dilewati") {
    label = s.status === "pindah" ? "Pindah sekolah" : s.status === "lulus" ? "Lulus" : "Nonaktif";
    ket = "Nggak diproses dari sini.";
  } else {
    label = labelHasilKeputusan(hasil, akhir, k.fase === "naik" ? k.tujuan : "");
    if (k.fase === "terkunci") ket = `Terkunci: sudah diproses di ${k.sesudah}. Batalin keputusan tahun itu dulu (buka lembar Genap ${k.sesudah}).`;
    const pilihan = akhir ? [["lulus", "Lulus"], ["tinggal", "Tidak lulus"]] : [["naik", "Naik kelas"], ["tinggal", "Tidak naik"]];
    const mati = k.fase === "terkunci" || status === "menyimpan";
    tombol = `<div class="keputusan-tombol">${pilihan.map(([h, t]) =>
      `<button class="tombol-kecil" data-hasil="${h}" aria-pressed="${hasil === h}" aria-label="${aman(t)} ${aman(s.nama)}"${mati ? " disabled" : ""}>${t}</button>`).join("")}${k.fase === "belum" || k.fase === "terkunci" ? "" : `<button class="tombol-kecil keputusan-batal" data-hasil="batal" aria-label="Batalin keputusan ${aman(s.nama)}"${mati ? " disabled" : ""}>Batalin</button>`}</div>`;
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
  const tujuan = tujuanTebakan(toko.santri, mp.jenjang, mp.kelas, sem.tahun);
  return `<section class="panel-keputusan" id="panelKeputusan" aria-labelledby="judulKeputusan">
    <h2 class="subjudul" id="judulKeputusan">Keputusan naik kelas <small>${aman(sem.tahun)} → ${aman(tahunBerikut(sem.tahun))}</small></h2>
    <p class="info">Pencet tombol di tiap siswa, nanti ada konfirmasi dulu. Keputusan bisa diganti selama tahun ajaran berikutnya belum diproses.${akhir ? " Kelas tingkat akhir: pilihannya lulus atau tidak lulus." : " Mengubah kelas tujuan nggak memindahkan siswa yang sudah terlanjur naik; pencet \"Naik kelas\" lagi di siswanya."}</p>
    ${akhir ? "" : `<label class="isian-tujuan">Naik ke kelas <input id="tujuanKelas" value="${aman(tujuan)}" maxlength="20" autocomplete="off"></label>
    <p class="info" id="infoTujuan" role="status"></p>`}
    <ul class="daftar-keputusan">${santri.map((s, i) =>
      `<li class="baris-keputusan" data-keputusan="${aman(s.id)}" data-no="${aman(noAbsen(kelasSantriDi(s, sem.tahun), i + 1))}">${htmlIsiBarisKeputusan(s, noAbsen(kelasSantriDi(s, sem.tahun), i + 1), sem.tahun, null)}</li>`).join("")}</ul>
  </section>`;
}
function gambarInfoTujuan() {
  const p = panelKeputusan, info = document.getElementById("infoTujuan"), isian = document.getElementById("tujuanKelas");
  if (!p || !info || !isian) return;
  const t = rapikanTujuan(isian.value);
  info.textContent = t && mapelKelas(p.jenjang, t).length === 0
    ? `Kelas ${t} ${p.jenjang} belum punya mapel. Guru belum bisa lihat siswa kelas itu sampai TU bikin mapel di kelas itu (menu Kurikulum).`
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
  const tujuan = isian ? rapikanTujuan(isian.value) : "";
  if (hasil === "naik" && !tujuan) {
    await kabar("Isi dulu kelas tujuannya (kotak \"Naik ke kelas\" di atas daftar).");
    if (isian) isian.focus();
    return;
  }
  const k = keputusanTahun(s, p.tahun);
  const cek = ubahKeputusan(s, p.tahun, hasil, tujuan);
  if (cek === s || (!cek && hasil === "batal" && k.fase === "belum")) return;   // udah begitu, nggak ada yang perlu ditulis
  if (!cek) {
    await kabar(k.fase === "terkunci"
      ? `Sudah diproses di ${k.sesudah}. Batalin keputusan tahun itu dulu (buka lembar Genap ${k.sesudah}).`
      : "Keputusan ini nggak bisa dipakai buat siswa ini.");
    gambarBarisKeputusanId(p, id);
    return;
  }
  const a = kelasSantriDi(s, p.tahun);
  let pesan, ya;
  if (hasil === "batal") { pesan = `Batalin keputusan ${s.nama} (${labelHasilKeputusan(k.fase, p.akhir, k.tujuan)})? Kelasnya dikembalikan ke ${a.kelas}.`; ya = "Batalin"; }
  else if (hasil === "naik") { pesan = `Naikin ${s.nama} ke ${tujuan}?`; ya = "Naik kelas"; }
  else if (hasil === "lulus") { pesan = `${s.nama} lulus dari ${a.kelas}?`; ya = "Lulus"; }
  else if (p.akhir) { pesan = `${s.nama} tidak lulus (tetap di ${a.kelas})?`; ya = "Tidak lulus"; }
  else { pesan = `${s.nama} tidak naik kelas (tetap ${a.kelas})?`; ya = "Tidak naik"; }
  if (k.fase !== "belum" && hasil !== "batal") pesan += `\n\nKeputusan sebelumnya (${labelHasilKeputusan(k.fase, p.akhir, k.tujuan)}) diganti.`;
  if (hasil === "naik" && mapelKelas(a.jenjang, tujuan).length === 0) pesan += `\n\nKelas ${tujuan} ${a.jenjang} belum punya mapel. Guru belum bisa lihat siswa kelas itu sampai TU bikin mapel di kelas itu (menu Kurikulum).`;

  p.sibuk.add(id);
  const lanjut = await tanyaYakin(pesan, { ya, bahaya: hasil === "batal" });
  if (!lanjut) { p.sibuk.delete(id); return; }
  // data bisa berubah selama dialog kebuka (HP lain): pakai versi terbaru
  const sebelum = toko.santri.find(x => x.id === id);
  const baru = sebelum && ubahKeputusan(sebelum, p.tahun, hasil, tujuan);
  if (!baru || baru === sebelum) {
    p.sibuk.delete(id);
    if (!baru) await kabar("Data siswa ini baru berubah (mungkin dari perangkat lain), jadi keputusannya nggak disimpan. Cek lagi lalu pencet ulang.");
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

function layarNilai() {
  const mp = mapelAktif();
  const bisaIsi = sayaPengampu(mp);          // yang ngisi nilai cuma pengampunya
  if (!bisaIsi && !sayaKurikulum()) throw new DataHilang();
  // nilai & daftar siswa belum kebaca: jangan nampilin lembar kosong / "siswa belum diisi"
  if (!isiMapelSiap(mp.id) || !toko.santriSiap) {
    tombolKembali.hidden = false;
    return tampilMemuat(`Nilai ${mp.nama}`);
  }
  const jenis = jenisMapel(mp);
  const bobot = bobotUntuk(mp.jenjang, jenis);
  const sem = semAktif();
  posisi.semester = kunciSemester(sem);

  judul.textContent = `Nilai ${mp.nama}`;
  jejak.textContent = `${mp.kelas}, ${mp.jenjang} · ${namaSemester(sem)} · ${namaJenis(jenisMapel(mp))}`;
  tombolKembali.hidden = false;

  const santri = santriLembar(mp, sem);
  const tersimpan = lembarNilai(mp.id, sem);
  const lembar = salin(tersimpan) || lembarBaru(mp, sem);
  lembar.nilai = lembar.nilai || {}; lembar.hadir = lembar.hadir || {};
  delete lembar.bobot;   // dulu bobot disimpan per lembar; sekarang ikut pengaturan admin
  lembarAktif = lembar;

  let h = "";
  if (santri.length === 0) {
    h += infoNilaiTakTerbaca(tersimpan, santri);
    h += sayaKurikulum()
      ? `<p class="kosong">Belum ada siswa di ${aman(mp.kelas)} ${aman(mp.jenjang)}. Tambahkan daftar siswanya dulu.</p>
         <button class="tombol-utama" id="keSantri">Isi daftar siswa</button>`
      : `<p class="kosong">Daftar siswa ${aman(mp.kelas)} ${aman(mp.jenjang)} belum diisi. Minta admin (TU) mengisinya dulu, nanti nama siswanya otomatis muncul di sini.</p>`;
    isi.innerHTML = h;
    klik("keSantri", () => pergi("santri", { kelasSantri: `${mp.jenjang}|${mp.kelas}`, dariNilai: true }));
    return;
  }

  // ---- bobot (cuma ditampilkan; diatur admin) ----
  h += infoNilaiTakTerbaca(tersimpan, santri) + `
    <div class="kotak-bobot">
      <div><b>Bobot mapel ${namaJenis(jenis).toLowerCase()} ${aman(mp.jenjang)}</b><span>${aman(ringkasBobot(bobot)) || "Belum diatur"}</span></div>
      ${sayaKurikulum() ? `<button class="tombol-teks" id="keBobot">Ubah bobot</button>` : `<small>Diatur admin (TU)</small>`}
    </div>
    ${bisaIsi ? "" : `<p class="pemberitahuan-kecil">Kamu cuma bisa melihat. Nilai diisi oleh pengampu mapel ini.</p>`}`;

  // ---- tabel ----
  const kolom = [...lembar.kolom].sort((a, b) =>
    KELOMPOK_NILAI.findIndex(g => g.k === a.kelompok) - KELOMPOK_NILAI.findIndex(g => g.k === b.kelompok));
  h += `
    <div class="aksi-nilai">
      ${bisaIsi ? `<span class="info">Tambah kolom:</span>
      ${KELOMPOK_NILAI.filter(g => g.k !== "kehadiran").map(g => `<button class="tombol-kecil" data-tambah-kolom="${g.k}">+ ${g.label}</button>`).join("")}` : ""}
      <span class="spasi"></span>
      <span class="status-simpan" id="statusSimpan" role="status">${tersimpan ? `${bisaIsi ? "Tersimpan · diubah" : "Terakhir diubah"} ${aman(waktuRapi(tersimpan.diubah))}` : "Belum ada nilai"}</span>
    </div>
    <div class="wadah-lembar-nilai">
    <table class="lembar-nilai">
      <thead><tr>
        <th class="kol-nama">Siswa</th>
        ${kolom.map(k => `<th class="kol-${aman(k.kelompok)}">${bisaIsi ? `<button class="judul-kolom" data-kolom="${aman(k.id)}" title="Ketuk untuk ganti nama / hapus">${aman(k.label)}</button>` : `<span class="judul-kolom">${aman(k.label)}</span>`}</th>`).join("")}
        <th class="kol-hadir">Hadir</th><th class="kol-hadir">Sakit</th><th class="kol-hadir">Izin</th>
        <th class="kol-akhir">Akhir</th>
      </tr></thead><tbody>`;
  santri.forEach((s, i) => {
    const n = lembar.nilai[s.id] || {};
    const hd = lembar.hadir[s.id] || {};
    const hasil = hitungNilai(lembar, s.id, mp);
    const kunciIsi = bisaIsi ? "" : " readonly tabindex=\"-1\"";
    h += `<tr data-santri="${aman(s.id)}">
      <th class="kol-nama" scope="row"><span class="nomor-santri">${aman(noAbsen(kelasSantriDi(s, sem.tahun), i + 1))}</span>${aman(s.nama)}${tandaKeluarSantri(s)}</th>
      ${kolom.map(k => `<td><input type="number" inputmode="decimal" min="0" max="100" step="any" aria-label="${aman(k.label)} ${aman(s.nama)}" data-nilai="${aman(k.id)}" value="${aman(n[k.id] ?? "")}"${kunciIsi}></td>`).join("")}
      ${["hadir", "sakit", "izin"].map(x => `<td><input type="number" inputmode="numeric" min="0" step="1" aria-label="${x} ${aman(s.nama)}" data-hadir="${x}" value="${aman(hd[x] ?? "")}"${kunciIsi}></td>`).join("")}
      <td class="kol-akhir" data-akhir>${angkaRapi(hasil.akhir)}</td>
    </tr>`;
  });
  h += `</tbody></table></div>
    <p class="info">${bisaIsi ? "Ketik nilai 0–100. Tersimpan otomatis. Kolom kosong nggak ikut dihitung. Kehadiran dihitung otomatis: hadir ÷ (hadir + sakit + izin) × 100." : ""}${tersimpan && tersimpan.namaPengubah ? ` Terakhir diubah oleh ${aman(tersimpan.namaPengubah)}.` : ""}</p>
    <div class="aksi-teks"><button class="tombol-teks" id="keSantri">${sayaKurikulum() ? "Ubah" : "Lihat"} daftar siswa ${aman(mp.kelas)}</button></div>
    ${htmlPanelKeputusan(mp, sem, santri)}`;
  isi.innerHTML = h;
  document.getElementById("keSantri").onclick = () => pergi("santri", { kelasSantri: `${mp.jenjang}|${mp.kelas}`, dariNilai: true });
  klik("keBobot", () => pergi("bobot"));
  pasangKeputusan(mp, sem, santri);       // sebelum return di bawah: TU biasanya bukan pengampu
  if (!bisaIsi) return;

  // ---- perilaku ----
  const status = document.getElementById("statusSimpan");
  const simpanNanti = (jalur, nilai) => {
    if (tundaNilai && tundaNilai.lembar !== lembar) kirimNilaiTertunda();
    if (tundaNilai) clearTimeout(tundaNilai.waktu);
    else tundaNilai = { idMapel: mp.id, lembar, ubah: new Map() };
    tundaNilai.ubah.set(jalur.join("/"), [jalur, nilai]);
    tundaNilai.waktu = setTimeout(kirimNilaiTertunda, 700);
    status.textContent = "Menyimpan...";
    setTimeout(() => {
      if (!tundaNilai && status.isConnected) status.textContent = navigator.onLine ? "Tersimpan" : "Tersimpan di HP, dikirim waktu ada sinyal";
    }, 800);
  };
  const segarkanAkhir = (tr) => {
    tr.querySelector("[data-akhir]").textContent = angkaRapi(hitungNilai(lembar, tr.dataset.santri, mp).akhir);
  };

  isi.querySelectorAll("input[data-nilai], input[data-hadir]").forEach(inp => {
    inp.oninput = () => {
      const tr = inp.closest("tr");
      const sid = tr.dataset.santri;
      const kosong = inp.value.trim() === "";
      let v = Number(inp.value);
      const salah = !kosong && (Number.isNaN(v) || v < 0 || (inp.dataset.nilai && v > 100));
      inp.classList.toggle("salah", salah);
      if (salah) inp.setAttribute("aria-invalid", "true");
      else inp.removeAttribute("aria-invalid");
      if (salah) {
        status.textContent = inp.dataset.nilai ? "Nilai harus 0–100, yang merah belum disimpan" : "Isi angka 0 atau lebih, yang merah belum disimpan";
        return;
      }
      const jalur = inp.dataset.nilai ? ["nilai", sid, inp.dataset.nilai] : ["hadir", sid, inp.dataset.hadir];
      const isian = kosong ? undefined : (inp.dataset.nilai ? v : Math.round(v));
      pasangDiJalur(lembar, jalur, isian);
      segarkanAkhir(tr);
      simpanNanti(jalur, isian);
    };
    // Enter = pindah ke santri berikutnya di kolom yang sama (kayak Excel)
    inp.onkeydown = (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      const tr = inp.closest("tr").nextElementSibling;
      const sel = inp.dataset.nilai ? `[data-nilai="${CSS.escape(inp.dataset.nilai)}"]` : `[data-hadir="${CSS.escape(inp.dataset.hadir)}"]`;
      const berikut = tr && tr.querySelector(sel);
      if (berikut) berikut.focus();
    };
  });

  isi.querySelectorAll("[data-tambah-kolom]").forEach(b => {
    b.onclick = async () => {
      const g = KELOMPOK_NILAI.find(x => x.k === b.dataset.tambahKolom);
      if (!(Number(bobot[g.k]) > 0) && !(await tanyaYakin(`Bobot ${g.nama} untuk mapel ${namaJenis(jenis).toLowerCase()} ${mp.jenjang} sekarang 0%, jadi kolom ini belum ikut dihitung di nilai akhir. Tetap tambah?\n\n(Bobot diatur admin.)`, { ya: "Tetap tambah" }))) return;
      const ada = lembar.kolom.filter(k => k.kelompok === g.k).length;
      const tunggal = g.k === "uts" || g.k === "uas" || g.k === "keaktifan";
      const label = tunggal && ada === 0 ? g.label : `${g.label} ${ada + 1}`;
      const kolomBaru = { id: buatId(), kelompok: g.k, label };
      lembar.kolom.push(kolomBaru);
      kirimNilaiTertunda();
      // ditambahkan, bukan ngirim daftar utuh: kolom yang ditambah dari perangkat lain nggak hilang
      simpanNilaiSebagian(mp.id, lembar, [[["kolom"], tambahKeDaftar(kolomBaru)]]);
      tampilkan(true);
    };
  });

  isi.querySelectorAll("[data-kolom]").forEach(b => {
    b.onclick = async () => {
      const k = lembar.kolom.find(x => x.id === b.dataset.kolom);
      const nama = await minta(`Nama kolom (contoh: UH 2, Hafalan juz 30).\nKosongkan lalu Simpan untuk menghapus kolom ini.`, k.label, { ya: "Simpan" });
      if (nama === null) return;
      const perubahan = [];
      if (!nama.trim()) {
        const terisi = Object.values(lembar.nilai).filter(n => n[k.id] !== undefined).length;
        if (!(await tanyaYakin(`Hapus kolom "${k.label}"?${terisi ? `\n\n${terisi} nilai di kolom ini ikut terhapus.` : ""}`, { bahaya: true, ya: "Hapus kolom" }))) return;
        // dibuang dari daftar (bukan ngirim daftar utuh), biar kolom baru dari perangkat lain nggak ikut hilang
        perubahan.push([["kolom"], buangDariDaftar(salin(k))]);
        lembar.kolom = lembar.kolom.filter(x => x.id !== k.id);
        for (const [sid, n] of Object.entries(lembar.nilai)) {
          if (n[k.id] !== undefined) perubahan.push([["nilai", sid, k.id], undefined]);
          delete n[k.id];
        }
      } else {
        // ganti nama masih ngirim daftar utuh (jarang, dan urutan kolom harus tetap)
        k.label = nama.trim();
        perubahan.push([["kolom"], lembar.kolom]);
      }
      kirimNilaiTertunda();
      simpanNilaiSebagian(mp.id, lembar, perubahan);
      tampilkan(true);
    };
  });
}

// ringkasan nilai di tab "Nilai" halaman mapel
function htmlTabNilai(mp, sem) {
  const santri = santriLembar(mp, sem);
  const lembar = lembarNilai(mp.id, sem);
  let h = `<p class="info">Mapel ${namaJenis(jenisMapel(mp)).toLowerCase()} · ${santri.length} siswa di ${aman(mp.kelas)} ${aman(mp.jenjang)}.</p>`;
  if (!lembar) {
    h += `<p class="kosong">Belum ada nilai di semester ini.</p>`;
  } else {
    h += infoNilaiTakTerbaca(lembar, santri);
    const hasil = santri.map(s => ({ s, n: hitungNilai(lembar, s.id, mp) }));
    const terisi = hasil.filter(x => x.n.akhir !== null).length;
    h += `<div class="daftar">`;
    for (const x of hasil) {
      h += `<div class="baris baris-santri"><span class="baris-isi"><strong>${aman(x.s.nama)}</strong>${tandaKeluarSantri(x.s)}${x.n.hadir ? `<span class="baris-sub">Hadir ${x.n.hadir.hadir} · Sakit ${x.n.hadir.sakit} · Izin ${x.n.hadir.izin}</span>` : ""}</span><span class="nilai-akhir">${angkaRapi(x.n.akhir)}</span></div>`;
    }
    h += `</div><p class="info">${terisi} dari ${santri.length} siswa sudah punya nilai akhir. Rata-rata kelas: ${angkaRapi(rataRata(hasil.map(x => x.n.akhir)))}.</p>`;
  }
  if (sayaPengampu(mp)) h += `<button class="tombol-utama" id="isiNilai">${lembar ? "Buka lembar nilai" : "Mulai isi nilai"}</button>`;
  else if (lembar) h += `<button class="tombol-kedua" id="isiNilai">Lihat lembar nilai</button>`;
  return h;
}

// =====================================================
//  BOBOT NILAI (khusus admin) — satu set per jenjang & jenis mapel
// =====================================================
const JENIS_MAPEL = ["umum", "diniah"];

function layarBobot() {
  wajibKurikulum();
  judul.textContent = "Bobot nilai";
  jejak.textContent = "Berlaku untuk semua mapel sesuai jenjang & jenisnya";

  const jenjang = JENJANG_PKBM;
  const isian = {};
  for (const j of jenjang) {
    isian[j] = {};
    for (const t of JENIS_MAPEL) isian[j][t] = bobotUntuk(j, t);
  }
  const jumlahMapel = (j, t) => toko.mapel.filter(m => m.jenjang === j && jenisMapel(m) === t).length;
  const kunci = (j, t) => `${j}|${t}`;

  let h = `<p class="info">Nilai akhir tiap mapel = gabungan rata-rata tiap kelompok sesuai bobot di bawah. Kelompok yang bobotnya 0% nggak dihitung. Kehadiran dihitung otomatis dari hadir ÷ (hadir + sakit + izin) × 100. Ustadz/ustadzah cuma bisa melihat bobot ini.</p>`;
  for (const j of jenjang) {
    h += `<h2 class="subjudul">${aman(j)}</h2><div class="grid-bobot">`;
    for (const t of JENIS_MAPEL) {
      h += `
        <section class="bagian kartu-bobot" data-jenis="${aman(kunci(j, t))}">
          <h2>Mapel ${namaJenis(t).toLowerCase()} <small>${jumlahMapel(j, t)} mapel</small></h2>
          <div class="isian-bobot">
            ${KELOMPOK_NILAI.map(g => `<label>${g.nama}<span class="kotak-persen"><input type="number" inputmode="numeric" min="0" max="100" data-jenjang="${aman(j)}" data-jenis="${t}" data-bobot="${g.k}" value="${isian[j][t][g.k]}"><span>%</span></span></label>`).join("")}
          </div>
          <p class="total-bobot" data-total="${aman(kunci(j, t))}"></p>
        </section>`;
    }
    h += `</div>`;
  }
  h += `
    <div class="baris-tombol">
      <button class="tombol-utama" id="simpanBobot">Simpan bobot</button>
      <button class="tombol-teks" id="bawaanBobot">Pakai bobot bawaan</button>
      <span class="tersimpan" id="pesanSimpanBobot" role="status"></span>
    </div>
    <p class="info">Kalau bobot diubah di tengah semester, nilai akhir semua siswa langsung dihitung ulang. Nilai yang sudah diisi ustadz nggak berubah.</p>`;
  isi.innerHTML = h;

  const pesan = document.getElementById("pesanSimpanBobot");
  const tulisTotal = () => {
    let semuaPas = true;
    for (const j of jenjang) for (const t of JENIS_MAPEL) {
      const total = KELOMPOK_NILAI.reduce((a, g) => a + (Number(isian[j][t][g.k]) || 0), 0);
      const el = isi.querySelector(`[data-total="${CSS.escape(kunci(j, t))}"]`);
      el.textContent = `Total ${total}%${total === 100 ? "" : " · sebaiknya pas 100%"}`;
      el.classList.toggle("salah", total !== 100);
      if (total !== 100) semuaPas = false;
    }
    return semuaPas;
  };
  tulisTotal();

  isi.querySelectorAll("input[data-bobot]").forEach(inp => {
    inp.oninput = () => {
      isian[inp.dataset.jenjang][inp.dataset.jenis][inp.dataset.bobot] = Math.max(0, Math.min(100, Math.round(Number(inp.value) || 0)));
      pesan.textContent = "";
      tulisTotal();
    };
  });
  document.getElementById("simpanBobot").onclick = async () => {
    if (!tulisTotal() && !(await tanyaYakin("Total bobot belum pas 100%. Tetap simpan?\n\n(Nilai akhir tetap dihitung adil: dibagi total bobot yang ada.)", { ya: "Tetap simpan" }))) return;
    const data = { diubah: Date.now(), diubahOleh: uidSaya() };
    for (const j of jenjang) data[j] = { umum: { ...isian[j].umum }, diniah: { ...isian[j].diniah } };
    simpanBobot(data);
    formKotor = false;   // udah disimpan, tetap di layar ini
    pesan.textContent = "Tersimpan";
  };
  document.getElementById("bawaanBobot").onclick = () => {
    for (const j of jenjang) for (const t of JENIS_MAPEL) {
      Object.assign(isian[j][t], BOBOT_BAWAAN[t]);
      for (const g of KELOMPOK_NILAI) isi.querySelector(`input[data-jenjang="${CSS.escape(j)}"][data-jenis="${t}"][data-bobot="${g.k}"]`).value = isian[j][t][g.k];
    }
    pesan.textContent = "Belum disimpan";
    tulisTotal();
  };
}
