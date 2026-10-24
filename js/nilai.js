// =====================================================
//  nilai.js — daftar santri, lembar nilai per mapel, hitung nilai akhir
//
//  Satu lembar nilai = satu mapel, satu semester.
//  Isinya kolom-kolom nilai (Tugas 1, UH 1, UH 2, UTS, UAS, ...),
//  dan kehadiran tiap santri (hadir/sakit/izin). Yang ngisi: pengampu mapelnya.
//  Bobot tiap kelompok diatur admin, satu set per jenis mapel
//  (umum & diniah), disimpan di pengaturan/bobot.
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

// bobot yang berlaku buat satu jenis mapel
function bobotJenis(jenis) {
  const atur = (toko.bobot || {})[jenis];
  const dasar = BOBOT_BAWAAN[jenis] || BOBOT_BAWAAN.umum;
  const hasil = {};
  for (const g of KELOMPOK_NILAI) hasil[g.k] = atur && atur[g.k] !== undefined ? Number(atur[g.k]) || 0 : dasar[g.k];
  return hasil;
}
function ringkasBobot(bobot) {
  return KELOMPOK_NILAI.filter(g => bobot[g.k] > 0).map(g => `${g.label} ${bobot[g.k]}%`).join(" · ");
}
function namaJenis(j) { return j === "diniah" ? "Diniah" : "Umum"; }

function angkaRapi(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return "-";
  return Number(n).toLocaleString("id-ID", { maximumFractionDigits: 1 });
}
function rataRata(daftar) {
  const ada = daftar.filter(x => typeof x === "number" && !Number.isNaN(x));
  return ada.length ? ada.reduce((a, b) => a + b, 0) / ada.length : null;
}

function lembarBaru(mapel, sem) {
  const bobot = bobotJenis(jenisMapel(mapel));
  const kolom = [
    { id: buatId(), kelompok: "tugas", label: "Tugas 1" },
    { id: buatId(), kelompok: "uh", label: "UH 1" },
    { id: buatId(), kelompok: "uts", label: "UTS" },
    { id: buatId(), kelompok: "uas", label: "UAS" }
  ];
  if (bobot.keaktifan > 0) kolom.push({ id: buatId(), kelompok: "keaktifan", label: "Keaktifan" });
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
    hasil.hadir = { hadir: h.hadir || 0, sakit: h.sakit || 0, izin: h.izin || 0 };
    const total = hasil.hadir.hadir + hasil.hadir.sakit + hasil.hadir.izin;
    hasil.per.kehadiran = total > 0 ? hasil.hadir.hadir / total * 100 : null;
  } else {
    hasil.per.kehadiran = null;
  }
  // kelompok yang belum ada nilainya nggak ikut dihitung (bobotnya dibagi ke yang ada)
  const daftarBobot = bobotJenis(jenisMapel(mapel));
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
  for (const s of toko.santri) tambah(s.jenjang, s.kelas);
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

  judul.textContent = "Daftar santri";
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
      : `<p class="kosong">Kamu belum mengajar di kelas mana pun, jadi belum ada daftar santri yang bisa dilihat.</p>`;
    isi.innerHTML = h;
    if (boleh) pasangTabJenjang("santri", { kelasSantri: null });
    return;
  }

  const daftar = santriKelas(jenjang, kelas);

  // ---------- ustadz: cuma lihat ----------
  if (!boleh) {
    h += `
      <h2 class="subjudul">Santri ${aman(kelas)} ${aman(jenjang)} <small>${daftar.length} santri</small></h2>
      <p class="info">Daftar santri diisi admin (TU). Kalau ada nama atau NIS yang salah, kabari admin ya.</p>`;
    if (daftar.length === 0) {
      h += `<p class="kosong">Daftar santri kelas ini belum diisi admin (TU).</p>`;
    } else {
      h += `<div class="wadah-tabel-santri"><table class="tabel-santri lihat">
          <thead><tr><th class="kol-absen">No. Absen</th><th class="kol-nis">NIS</th><th>Nama santri</th></tr></thead>
          <tbody id="badanSantri">${daftar.map(x => `<tr data-id="${x.id}"><td class="tengah">${aman(x.absen ?? "")}</td><td>${aman(x.nis || "")}</td><td>${aman(x.nama)}</td></tr>`).join("")}</tbody>
        </table></div>`;
    }
    isi.innerHTML = h;
    isi.querySelectorAll("[data-kelas]").forEach(b => b.onclick = () => pergi("santri", { kelasSantri: b.dataset.kelas }));
    return;
  }

  // ---------- admin: tabel bisa diketik ----------
  const pasangTab = () => pasangTabJenjang("santri", { kelasSantri: null });
  const barisKosong = 3;
  const tombolHapus = (x) => `<button class="tombol-hapus-kecil" data-hapus-santri="${x.id}" aria-label="Hapus ${aman(x.nama)}" title="Hapus santri">×</button>`;
  const htmlBarisSantri = (x) => `
    <tr data-id="${x ? x.id : ""}">
      <td><input data-f="absen" type="number" inputmode="numeric" min="1" step="1" value="${x && x.absen !== undefined && x.absen !== null ? aman(x.absen) : ""}" aria-label="No. absen"></td>
      <td><input data-f="nis" inputmode="numeric" value="${x ? aman(x.nis || "") : ""}" aria-label="NIS"></td>
      <td><input data-f="nama" value="${x ? aman(x.nama) : ""}" aria-label="Nama santri" placeholder="${x ? "" : "Nama santri baru"}"></td>
      <td class="kol-aksi">${x ? tombolHapus(x) : ""}</td>
    </tr>`;

  h += `
    <h2 class="subjudul">Santri ${aman(kelas)} ${aman(jenjang)} <small id="jumlahSantri">${daftar.length} santri</small></h2>
    <p class="info">Ketik langsung di tabel, tersimpan otomatis. Bisa juga salin 3 kolom dari Excel (No. Absen, NIS, Nama) lalu tempel di kotak pertama.</p>
    <div class="wadah-tabel-santri">
      <table class="tabel-santri">
        <thead><tr><th class="kol-absen">No. Absen</th><th class="kol-nis">NIS</th><th>Nama santri</th><th class="kol-aksi"></th></tr></thead>
        <tbody id="badanSantri">${daftar.map(htmlBarisSantri).join("")}${htmlBarisSantri(null).repeat(barisKosong)}</tbody>
      </table>
    </div>
    <div class="baris-tombol">
      <button class="tombol-kedua" id="tambahBaris">+ Tambah 5 baris</button>
      <span class="info" id="pesanSantri" role="status"></span>
    </div>`;
  isi.innerHTML = h;
  pasangTab();

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
      i.title = dobel ? "No. absen ini dipakai lebih dari satu santri" : "";
    });
    document.getElementById("jumlahSantri").textContent = `${badan.querySelectorAll("tr[data-id]:not([data-id=''])").length} santri`;
  }

  function pastikanBarisKosong() {
    const kosong = [...badan.querySelectorAll("tr")].filter(tr => !tr.dataset.id && !ambil(tr).nama).length;
    for (let i = kosong; i < 2; i++) badan.insertAdjacentHTML("beforeend", htmlBarisSantri(null));
    pasangBaris();
  }

  // simpan satu baris (baris baru dibikin begitu namanya diisi)
  function simpanBaris(tr) {
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
      if (kembar && !confirm(`${v.nama} sudah ada di kelas ini. Tetap tambahkan sebagai santri lain?`)) return;
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
        if (f) tr.querySelector(`[data-f="${f}"]`).value = isiSel.trim();
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
          const berikut = tr.nextElementSibling && tr.nextElementSibling.querySelector(`[data-f="${inp.dataset.f}"]`);
          if (berikut) berikut.focus();
        };
      });
    });
  }
  pasangBaris();
  cekAbsen();

  badan.onclick = (e) => {
    const b = e.target.closest("[data-hapus-santri]");
    if (!b) return;
    const x = toko.santri.find(y => y.id === b.dataset.hapusSantri);
    if (!x || !confirm(`Hapus ${x.nama} dari daftar santri?\n\nNilai yang sudah diisi untuk santri ini ikut nggak kepakai lagi.`)) return;
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

function kirimNilaiTertunda() {
  if (!tundaNilai) return;
  clearTimeout(tundaNilai.waktu);
  const t = tundaNilai;
  tundaNilai = null;
  simpanLembarNilai(t.idMapel, t.lembar);
}

function layarNilai() {
  const mp = mapelAktif();
  const bisaIsi = sayaPengampu(mp);          // yang ngisi nilai cuma pengampunya
  if (!bisaIsi && !sayaKurikulum()) throw new DataHilang();
  const jenis = jenisMapel(mp);
  const bobot = bobotJenis(jenis);
  const sem = semAktif();
  posisi.semester = kunciSemester(sem);

  judul.textContent = `Nilai ${mp.nama}`;
  jejak.textContent = `${mp.kelas}, ${mp.jenjang} · ${namaSemester(sem)} · ${namaJenis(jenisMapel(mp))}`;
  tombolKembali.hidden = false;

  const santri = santriKelas(mp.jenjang, mp.kelas);
  const tersimpan = lembarNilai(mp.id, sem);
  const lembar = salin(tersimpan) || lembarBaru(mp, sem);
  lembar.nilai = lembar.nilai || {}; lembar.hadir = lembar.hadir || {};
  delete lembar.bobot;   // dulu bobot disimpan per lembar; sekarang ikut pengaturan admin
  lembarAktif = lembar;

  let h = "";
  if (santri.length === 0) {
    h += sayaKurikulum()
      ? `<p class="kosong">Belum ada santri di ${aman(mp.kelas)} ${aman(mp.jenjang)}. Tambahkan daftar santrinya dulu.</p>
         <button class="tombol-utama" id="keSantri">Isi daftar santri</button>`
      : `<p class="kosong">Daftar santri ${aman(mp.kelas)} ${aman(mp.jenjang)} belum diisi. Minta admin (TU) mengisinya dulu, nanti nama santrinya otomatis muncul di sini.</p>`;
    isi.innerHTML = h;
    const ks = document.getElementById("keSantri");
    if (ks) ks.onclick = () => pergi("santri", { kelasSantri: `${mp.jenjang}|${mp.kelas}`, dariNilai: true });
    return;
  }

  // ---- bobot (cuma ditampilkan; diatur admin) ----
  h += `
    <div class="kotak-bobot">
      <div><b>Bobot mapel ${namaJenis(jenis).toLowerCase()}</b><span>${aman(ringkasBobot(bobot)) || "Belum diatur"}</span></div>
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
        <th class="kol-nama">Santri</th>
        ${kolom.map(k => `<th class="kol-${k.kelompok}">${bisaIsi ? `<button class="judul-kolom" data-kolom="${k.id}" title="Ketuk untuk ganti nama / hapus">${aman(k.label)}</button>` : `<span class="judul-kolom">${aman(k.label)}</span>`}</th>`).join("")}
        <th class="kol-hadir">Hadir</th><th class="kol-hadir">Sakit</th><th class="kol-hadir">Izin</th>
        <th class="kol-akhir">Akhir</th>
      </tr></thead><tbody>`;
  santri.forEach((s, i) => {
    const n = lembar.nilai[s.id] || {};
    const hd = lembar.hadir[s.id] || {};
    const hasil = hitungNilai(lembar, s.id, mp);
    const kunciIsi = bisaIsi ? "" : " readonly tabindex=\"-1\"";
    h += `<tr data-santri="${s.id}">
      <th class="kol-nama" scope="row"><span class="nomor-santri">${aman(noAbsen(s, i + 1))}</span>${aman(s.nama)}</th>
      ${kolom.map(k => `<td><input type="number" inputmode="decimal" min="0" max="100" step="any" aria-label="${aman(k.label)} ${aman(s.nama)}" data-nilai="${k.id}" value="${n[k.id] ?? ""}"${kunciIsi}></td>`).join("")}
      ${["hadir", "sakit", "izin"].map(x => `<td><input type="number" inputmode="numeric" min="0" step="1" aria-label="${x} ${aman(s.nama)}" data-hadir="${x}" value="${hd[x] ?? ""}"${kunciIsi}></td>`).join("")}
      <td class="kol-akhir" data-akhir>${angkaRapi(hasil.akhir)}</td>
    </tr>`;
  });
  h += `</tbody></table></div>
    <p class="info">${bisaIsi ? "Ketik nilai 0–100. Tersimpan otomatis. Kolom kosong nggak ikut dihitung. Kehadiran dihitung otomatis: hadir ÷ (hadir + sakit + izin) × 100." : ""}${tersimpan && tersimpan.namaPengubah ? ` Terakhir diubah oleh ${aman(tersimpan.namaPengubah)}.` : ""}</p>
    <div class="aksi-teks"><button class="tombol-teks" id="keSantri">${sayaKurikulum() ? "Ubah" : "Lihat"} daftar santri ${aman(mp.kelas)}</button></div>`;
  isi.innerHTML = h;
  document.getElementById("keSantri").onclick = () => pergi("santri", { kelasSantri: `${mp.jenjang}|${mp.kelas}`, dariNilai: true });
  const kb = document.getElementById("keBobot");
  if (kb) kb.onclick = () => pergi("bobot");
  if (!bisaIsi) return;

  // ---- perilaku ----
  const status = document.getElementById("statusSimpan");
  const simpanNanti = () => {
    if (tundaNilai) clearTimeout(tundaNilai.waktu);
    tundaNilai = { idMapel: mp.id, lembar, waktu: setTimeout(kirimNilaiTertunda, 700) };
    status.textContent = "Menyimpan...";
    setTimeout(() => { if (!tundaNilai && status.isConnected) status.textContent = "Tersimpan"; }, 800);
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
      if (salah) return;
      if (inp.dataset.nilai) {
        lembar.nilai[sid] = lembar.nilai[sid] || {};
        if (kosong) delete lembar.nilai[sid][inp.dataset.nilai];
        else lembar.nilai[sid][inp.dataset.nilai] = v;
      } else {
        lembar.hadir[sid] = lembar.hadir[sid] || {};
        if (kosong) delete lembar.hadir[sid][inp.dataset.hadir];
        else lembar.hadir[sid][inp.dataset.hadir] = Math.round(v);
      }
      segarkanAkhir(tr);
      simpanNanti();
    };
    // Enter = pindah ke santri berikutnya di kolom yang sama (kayak Excel)
    inp.onkeydown = (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      const tr = inp.closest("tr").nextElementSibling;
      const sel = inp.dataset.nilai ? `[data-nilai="${inp.dataset.nilai}"]` : `[data-hadir="${inp.dataset.hadir}"]`;
      const berikut = tr && tr.querySelector(sel);
      if (berikut) berikut.focus();
    };
  });

  isi.querySelectorAll("[data-tambah-kolom]").forEach(b => {
    b.onclick = () => {
      const g = KELOMPOK_NILAI.find(x => x.k === b.dataset.tambahKolom);
      const ada = lembar.kolom.filter(k => k.kelompok === g.k).length;
      const tunggal = g.k === "uts" || g.k === "uas" || g.k === "keaktifan";
      const label = tunggal && ada === 0 ? g.label : `${g.label} ${ada + 1}`;
      lembar.kolom.push({ id: buatId(), kelompok: g.k, label });
      if (!(Number(bobot[g.k]) > 0) && !confirm(`Bobot ${g.nama} untuk mapel ${namaJenis(jenis).toLowerCase()} sekarang 0%, jadi kolom ini belum ikut dihitung di nilai akhir. Tetap tambah?\n\n(Bobot diatur admin.)`)) {
        lembar.kolom.pop();
        return;
      }
      kirimNilaiTertunda();
      simpanLembarNilai(mp.id, lembar);
      tampilkan(true);
    };
  });

  isi.querySelectorAll("[data-kolom]").forEach(b => {
    b.onclick = () => {
      const k = lembar.kolom.find(x => x.id === b.dataset.kolom);
      const nama = prompt(`Nama kolom (contoh: UH 2, Hafalan juz 30).\nKosongkan lalu OK untuk menghapus kolom ini.`, k.label);
      if (nama === null) return;
      if (!nama.trim()) {
        const terisi = Object.values(lembar.nilai).filter(n => n[k.id] !== undefined).length;
        if (!confirm(`Hapus kolom "${k.label}"?${terisi ? `\n\n${terisi} nilai di kolom ini ikut terhapus.` : ""}`)) return;
        lembar.kolom = lembar.kolom.filter(x => x.id !== k.id);
        for (const n of Object.values(lembar.nilai)) delete n[k.id];
      } else {
        k.label = nama.trim();
      }
      kirimNilaiTertunda();
      simpanLembarNilai(mp.id, lembar);
      tampilkan(true);
    };
  });
}

// ringkasan nilai di tab "Nilai" halaman mapel
function htmlTabNilai(mp, sem) {
  const santri = santriKelas(mp.jenjang, mp.kelas);
  const lembar = lembarNilai(mp.id, sem);
  let h = `<p class="info">Mapel ${namaJenis(jenisMapel(mp)).toLowerCase()} · ${santri.length} santri di ${aman(mp.kelas)} ${aman(mp.jenjang)}.</p>`;
  if (!lembar) {
    h += `<p class="kosong">Belum ada nilai di semester ini.</p>`;
  } else {
    const hasil = santri.map(s => ({ s, n: hitungNilai(lembar, s.id, mp) }));
    const terisi = hasil.filter(x => x.n.akhir !== null).length;
    h += `<div class="daftar">`;
    for (const x of hasil) {
      h += `<div class="baris baris-santri"><span class="baris-isi"><strong>${aman(x.s.nama)}</strong>${x.n.hadir ? `<span class="baris-sub">Hadir ${x.n.hadir.hadir} · Sakit ${x.n.hadir.sakit} · Izin ${x.n.hadir.izin}</span>` : ""}</span><span class="nilai-akhir">${angkaRapi(x.n.akhir)}</span></div>`;
    }
    h += `</div><p class="info">${terisi} dari ${santri.length} santri sudah punya nilai akhir. Rata-rata kelas: ${angkaRapi(rataRata(hasil.map(x => x.n.akhir)))}.</p>`;
  }
  if (sayaPengampu(mp)) h += `<button class="tombol-utama" id="isiNilai">${lembar ? "Buka lembar nilai" : "Mulai isi nilai"}</button>`;
  else if (lembar) h += `<button class="tombol-kedua" id="isiNilai">Lihat lembar nilai</button>`;
  return h;
}

// =====================================================
//  BOBOT NILAI (khusus admin) — satu set per jenis mapel
// =====================================================
function layarBobot() {
  wajibKurikulum();
  judul.textContent = "Bobot nilai";
  jejak.textContent = "Berlaku untuk semua mapel sesuai jenisnya";

  const isian = { umum: bobotJenis("umum"), diniah: bobotJenis("diniah") };
  const jumlahMapel = (j) => toko.mapel.filter(m => jenisMapel(m) === j).length;

  let h = `<p class="info">Nilai akhir tiap mapel = gabungan rata-rata tiap kelompok sesuai bobot di bawah. Kelompok yang bobotnya 0% nggak dihitung. Kehadiran dihitung otomatis dari hadir ÷ (hadir + sakit + izin) × 100. Ustadz/ustadzah cuma bisa melihat bobot ini.</p>
    <div class="grid-bobot">`;
  for (const j of ["umum", "diniah"]) {
    h += `
      <section class="bagian kartu-bobot" data-jenis="${j}">
        <h2>Mapel ${namaJenis(j).toLowerCase()} <small>${jumlahMapel(j)} mapel</small></h2>
        <div class="isian-bobot">
          ${KELOMPOK_NILAI.map(g => `<label>${g.nama}<span class="kotak-persen"><input type="number" inputmode="numeric" min="0" max="100" data-jenis="${j}" data-bobot="${g.k}" value="${isian[j][g.k]}"><span>%</span></span></label>`).join("")}
        </div>
        <p class="total-bobot" data-total="${j}"></p>
      </section>`;
  }
  h += `</div>
    <div class="baris-tombol">
      <button class="tombol-utama" id="simpanBobot">Simpan bobot</button>
      <button class="tombol-teks" id="bawaanBobot">Pakai bobot bawaan</button>
      <span class="tersimpan" id="pesanSimpanBobot" role="status"></span>
    </div>
    <p class="info">Kalau bobot diubah di tengah semester, nilai akhir semua santri langsung dihitung ulang. Nilai yang sudah diisi ustadz nggak berubah.</p>`;
  isi.innerHTML = h;

  const pesan = document.getElementById("pesanSimpanBobot");
  const tulisTotal = () => {
    let semuaPas = true;
    for (const j of ["umum", "diniah"]) {
      const t = KELOMPOK_NILAI.reduce((a, g) => a + (Number(isian[j][g.k]) || 0), 0);
      const el = isi.querySelector(`[data-total="${j}"]`);
      el.textContent = `Total ${t}%${t === 100 ? "" : " · sebaiknya pas 100%"}`;
      el.classList.toggle("salah", t !== 100);
      if (t !== 100) semuaPas = false;
    }
    return semuaPas;
  };
  tulisTotal();

  isi.querySelectorAll("input[data-bobot]").forEach(inp => {
    inp.oninput = () => {
      isian[inp.dataset.jenis][inp.dataset.bobot] = Math.max(0, Math.min(100, Math.round(Number(inp.value) || 0)));
      pesan.textContent = "";
      tulisTotal();
    };
  });
  document.getElementById("simpanBobot").onclick = () => {
    if (!tulisTotal() && !confirm("Total bobot belum pas 100%. Tetap simpan?\n\n(Nilai akhir tetap dihitung adil: dibagi total bobot yang ada.)")) return;
    simpanBobot({ umum: { ...isian.umum }, diniah: { ...isian.diniah }, diubah: Date.now(), diubahOleh: uidSaya() });
    pesan.textContent = "Tersimpan";
  };
  document.getElementById("bawaanBobot").onclick = () => {
    for (const j of ["umum", "diniah"]) {
      Object.assign(isian[j], BOBOT_BAWAAN[j]);
      for (const g of KELOMPOK_NILAI) isi.querySelector(`input[data-jenis="${j}"][data-bobot="${g.k}"]`).value = isian[j][g.k];
    }
    pesan.textContent = "Belum disimpan";
    tulisTotal();
  };
}