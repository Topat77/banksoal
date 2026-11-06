// =====================================================
//  nilai.js — lembar nilai per mapel & hitung nilai akhir
//
//  Satu lembar nilai = satu mapel, satu semester.
//  Isinya kolom-kolom nilai (Tugas 1, UH 1, UH 2, UTS, UAS, ...),
//  dan kehadiran tiap santri (hadir/sakit/izin). Yang ngisi: pengampu mapelnya.
//  Bobot tiap kelompok diatur admin (layarnya di bobot.js), satu set per jenjang & jenis mapel
//  (Paket B umum, Paket B diniah, Paket C umum, Paket C diniah),
//  disimpan di pengaturan/bobot: { "Paket B": { umum, diniah }, ... }.
//  Nilai akhir = gabungan rata-rata tiap kelompok sesuai bobotnya.
//  Daftar siswa ada di santri.js, panel naik kelas di keputusan.js.
// =====================================================

const KELOMPOK_NILAI = [
  { k: "tugas", nama: "Tugas", label: "Tugas" },
  { k: "uh", nama: "Ulangan harian", label: "UH" },
  { k: "uts", nama: "UTS", label: "UTS" },
  { k: "uas", nama: "UAS", label: "UAS" },
  { k: "keaktifan", nama: "Keaktifan", label: "Keaktifan" },
  { k: "kehadiran", nama: "Kehadiran", label: "Kehadiran" }
];

// kelompok yang kolomnya cuma boleh satu (Tugas & UH boleh berkali-kali)
const KELOMPOK_SEKALI = ["uts", "uas", "keaktifan"];

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

// batas 0–100 cuma dicek di kotak isian (rules nggak ngecek angkanya), jadi angka di luar itu
// dari database (misal ditulis langsung) dianggap kosong. Dipakai juga pantauan TU & progres
// beranda, biar yang kelihatan "terisi" sama dengan yang ikut dihitung di rapor.
function nilaiSah(v) { return typeof v === "number" && v >= 0 && v <= 100; }

// nilai satu santri di satu lembar (mapel: buat nentuin bobot sesuai jenisnya)
function hitungNilai(lembar, idSantri, mapel) {
  const hasil = { per: {}, harian: null, akhir: null, hadir: null };
  if (!lembar) return hasil;
  const isi = (lembar.nilai || {})[idSantri] || {};
  const angkaNilai = (k) => nilaiSah(isi[k.id]) ? isi[k.id] : null;
  for (const g of KELOMPOK_NILAI) {
    if (g.k === "kehadiran") continue;
    hasil.per[g.k] = rataRata((lembar.kolom || []).filter(k => k.kelompok === g.k).map(angkaNilai));
  }
  hasil.harian = rataRata((lembar.kolom || []).filter(k => k.kelompok === "tugas" || k.kelompok === "uh").map(angkaNilai));
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
  return santriKelasDi(mp.jenjang, mp.kelas, sem.tahun, sem.semester);   // pindah kelas waktu Genap: Ganjil tetap di kelas lama
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
  return `<p class="info">Ada siswa yang sudah pindah ke kelas lain. Nilainya di kelas ini tetap tersimpan dan ikut di rapornya, hanya namanya tidak ditampilkan lagi di sini.</p>`;
}
// khusus admin: tombol "Siapkan lembar nilai kosong" & "Hapus lembar nilai" di layar nilai
function pasangAksiAdminNilai(mp, sem, santri, tersimpan) {
  if (!sayaKurikulum()) return;
  klik("siapkanLembar", async () => {
    if (!navigator.onLine && toko.backend.mode !== "coba") return kabar("Menyiapkan lembar nilai butuh internet. Sambungkan dulu, lalu coba lagi.");
    const tombol = document.getElementById("siapkanLembar");
    tombol.disabled = true;
    try {
      const jadi = await siapkanLembarNilai(mp.id, lembarBaru(mp, sem));
      if (!jadi) kabar("Lembar nilai semester ini ternyata sudah dibuat guru, jadi tidak perlu disiapkan lagi.");
    } catch (err) {
      gagalSimpan(err);
    }
    tampilkan(true);
  });
  klik("hapusLembar", async () => {
    const terisi = santri.filter(s => hitungNilai(tersimpan, s.id, mp).akhir !== null).length;
    if (!(await tanyaYakin(`Hapus lembar nilai ${mp.nama} ${mp.kelas}, ${namaSemester(sem)}?\n\nSemua nilai & kehadiran semester ini ikut terhapus${terisi ? ` (${terisi} siswa sudah punya nilai)` : ""} dan TIDAK bisa dikembalikan dari aplikasi.`, { bahaya: true, ya: "Hapus lembar" }))) return;
    if ((await minta("Ketik HAPUS untuk memastikan.", "", { bahaya: true, ya: "Hapus" })) !== "HAPUS") return;
    hapusLembarNilai(mp.id, tersimpan.id);
    tampilkan(true);
  });
}

// cara ngisi nilai: "kolom" (satu kolom, kotak gede; bawaan di HP) atau "tabel" (semua kolom)
const KUNCI_MODE_NILAI = "banksoal-mode-nilai";
const KUNCI_PETUNJUK_KOLOM = "banksoal-petunjuk-kolom";   // penjelasan mode satu kolom udah ditutup
function modeIsiNilai() {
  const ingat = bacaLokal(KUNCI_MODE_NILAI, null);
  if (ingat === "kolom" || ingat === "tabel") return ingat;
  return matchMedia("(max-width: 700px)").matches ? "kolom" : "tabel";
}
// kolom yang lagi diisi di mode satu kolom: yang dipilih, atau kolom pertama yang belum lengkap
function kolomNilaiDipilih(kolom, lembar, santri) {
  if (posisi.kolomNilai === "hadir" || kolom.some(k => k.id === posisi.kolomNilai)) return posisi.kolomNilai;
  const belum = kolom.find(k => santri.some(s => typeof ((lembar.nilai || {})[s.id] || {})[k.id] !== "number"));
  posisi.kolomNilai = (belum || kolom[0] || { id: "hadir" }).id;
  return posisi.kolomNilai;
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

  // khusus admin, waktu lembar semester ini belum ada: tombol nyiapin lembar kosong
  const htmlSiapkan = sayaKurikulum() && !tersimpan ? `
    <div class="pemberitahuan">
      <p><b>Lembar nilai ${aman(namaSemester(sem))} belum dibuat.</b> Biasanya otomatis dibuat waktu guru mulai mengisi nilai. Anda bisa menyiapkan lembar kosong lebih dulu (kolom Tugas 1, UH 1, UTS, UAS); angkanya tetap diisi guru.</p>
      <button class="tombol-kedua" id="siapkanLembar">Siapkan lembar nilai kosong</button>
    </div>` : "";

  let h = "";
  if (santri.length === 0) {
    h += infoNilaiTakTerbaca(tersimpan, santri);
    h += sayaKurikulum()
      ? `<p class="kosong">Belum ada siswa di ${aman(mp.kelas)} ${aman(mp.jenjang)}. Tambahkan daftar siswanya dulu.</p>
         <button class="tombol-utama" id="keSantri">Isi daftar siswa</button>${htmlSiapkan}`
      : `<p class="kosong">Daftar siswa ${aman(mp.kelas)} ${aman(mp.jenjang)} belum diisi. Minta admin (TU) mengisinya dulu, nanti nama siswanya otomatis muncul di sini.</p>`;
    isi.innerHTML = h;
    klik("keSantri", () => pergi("santri", { kelasSantri: `${mp.jenjang}|${mp.kelas}`, dariNilai: true }));
    pasangAksiAdminNilai(mp, sem, santri, tersimpan);
    return;
  }

  // ---- bobot (cuma ditampilkan; diatur admin) ----
  h += infoNilaiTakTerbaca(tersimpan, santri) + `
    <div class="kotak-bobot">
      <div><b>Bobot mapel ${namaJenis(jenis).toLowerCase()} ${aman(mp.jenjang)}</b><span>${aman(ringkasBobot(bobot)) || "Belum diatur"}</span></div>
      ${sayaKurikulum() ? `<button class="tombol-teks" id="keBobot">Ubah bobot</button>` : `<small>Diatur admin (TU)</small>`}
    </div>
    ${bisaIsi ? "" : `<p class="pemberitahuan-kecil">Anda hanya bisa melihat. Nilai diisi oleh pengampu mapel ini.</p>`}
    ${htmlSiapkan}`;

  // ---- tabel ----
  const semuaKolom = [...lembar.kolom].sort((a, b) =>
    KELOMPOK_NILAI.findIndex(g => g.k === a.kelompok) - KELOMPOK_NILAI.findIndex(g => g.k === b.kelompok));
  const modeKolom = modeIsiNilai() === "kolom";
  const pilihan = modeKolom ? kolomNilaiDipilih(semuaKolom, lembar, santri) : null;
  const kolom = modeKolom ? semuaKolom.filter(k => k.id === pilihan) : semuaKolom;
  const tampilHadir = !modeKolom || pilihan === "hadir";
  h += `
    <div class="pilih-kelompok pilih-mode-nilai" role="group" aria-label="Cara mengisi">
      <button data-mode-nilai="kolom" class="${modeKolom ? "aktif" : ""}" aria-pressed="${modeKolom}">Satu kolom</button>
      <button data-mode-nilai="tabel" class="${modeKolom ? "" : "aktif"}" aria-pressed="${!modeKolom}">Tabel lengkap</button>
    </div>
    ${modeKolom && bisaIsi && !bacaLokal(KUNCI_PETUNJUK_KOLOM, false) ? `<div class="pemberitahuan petunjuk-kolom"><p><b>Isi satu kolom dulu.</b> Pilih kolomnya di bawah, ketik nilai, lalu tekan Enter untuk pindah ke siswa berikutnya. Ingin lihat semua kolom sekaligus? Pilih <b>Tabel lengkap</b>.</p><button class="tombol-teks" id="tutupPetunjukKolom">Mengerti</button></div>` : ""}
    ${modeKolom ? `<div class="pilih-semester pilih-kolom-nilai" role="group" aria-label="Kolom yang diisi">
      ${semuaKolom.map(k => `<button class="chip ${k.id === pilihan ? "aktif" : ""}" data-pilih-kolom="${aman(k.id)}" aria-pressed="${k.id === pilihan}">${aman(k.label)}</button>`).join("")}
      <button class="chip ${pilihan === "hadir" ? "aktif" : ""}" data-pilih-kolom="hadir" aria-pressed="${pilihan === "hadir"}">Kehadiran</button>
    </div>` : ""}
    <div class="aksi-nilai">
      ${bisaIsi ? `<span class="info">Tambah kolom:</span>
      ${KELOMPOK_NILAI.filter(g => g.k !== "kehadiran" && !(KELOMPOK_SEKALI.includes(g.k) && lembar.kolom.some(k => k.kelompok === g.k)))
        .map(g => `<button class="tombol-kecil" data-tambah-kolom="${g.k}">+ ${g.label}</button>`).join("")}` : ""}
      <span class="spasi"></span>
      <span class="status-simpan" id="statusSimpan" role="status">${tersimpan ? `${bisaIsi ? "Tersimpan · diubah" : "Terakhir diubah"} ${aman(waktuRapi(tersimpan.diubah))}` : "Belum ada nilai"}</span>
    </div>
    <div class="wadah-lembar-nilai${modeKolom ? " mode-kolom" : ""}">
    <table class="lembar-nilai">
      <thead><tr>
        <th class="kol-nama">Siswa</th>
        ${kolom.map(k => `<th class="kol-${aman(k.kelompok)}">${bisaIsi ? `<button class="judul-kolom" data-kolom="${aman(k.id)}" title="Ketuk untuk ganti nama / hapus">${aman(k.label)}</button>` : `<span class="judul-kolom">${aman(k.label)}</span>`}</th>`).join("")}
        ${tampilHadir ? `<th class="kol-hadir">Hadir</th><th class="kol-hadir">Sakit</th><th class="kol-hadir">Izin</th>` : ""}
        <th class="kol-akhir">Akhir</th>
      </tr></thead><tbody>`;
  santri.forEach((s, i) => {
    const n = lembar.nilai[s.id] || {};
    const hd = lembar.hadir[s.id] || {};
    const hasil = hitungNilai(lembar, s.id, mp);
    const kunciIsi = bisaIsi ? "" : " readonly tabindex=\"-1\"";
    h += `<tr data-santri="${aman(s.id)}">
      <th class="kol-nama" scope="row"><span class="nomor-santri">${aman(noAbsen(kelasSantriDi(s, sem.tahun, sem.semester), i + 1))}</span>${aman(s.nama)}${tandaKeluarSantri(s)}</th>
      ${kolom.map(k => `<td><input type="number" inputmode="decimal" min="0" max="100" step="any" aria-label="${aman(k.label)} ${aman(s.nama)}" data-nilai="${aman(k.id)}" value="${aman(n[k.id] ?? "")}"${kunciIsi}></td>`).join("")}
      ${(tampilHadir ? ["hadir", "sakit", "izin"] : []).map(x => `<td><input type="number" inputmode="numeric" min="0" step="1" aria-label="${x} ${aman(s.nama)}" data-hadir="${x}" value="${aman(hd[x] ?? "")}"${kunciIsi}></td>`).join("")}
      <td class="kol-akhir" data-akhir>${angkaRapi(hasil.akhir)}</td>
    </tr>`;
  });
  h += `</tbody></table></div>
    <p class="info">${bisaIsi ? "Ketik nilai 0–100. Tersimpan otomatis. Kolom kosong tidak ikut dihitung. Kehadiran dihitung otomatis: hadir ÷ (hadir + sakit + izin) × 100." : ""}${tersimpan && tersimpan.namaPengubah ? ` Terakhir diubah oleh ${aman(tersimpan.namaPengubah)}.` : ""}</p>
    <div class="aksi-teks"><button class="tombol-teks" id="keSantri">${sayaKurikulum() ? "Ubah" : "Lihat"} daftar siswa ${aman(mp.kelas)}</button>
      ${sayaKurikulum() && tersimpan ? `<button class="tombol-teks merah" id="hapusLembar">Hapus lembar nilai ${aman(namaSemester(sem))}</button>` : ""}</div>`;
  isi.innerHTML = h;
  document.getElementById("keSantri").onclick = () => pergi("santri", { kelasSantri: `${mp.jenjang}|${mp.kelas}`, dariNilai: true });
  klik("keBobot", () => pergi("bobot"));

  pasangAksiAdminNilai(mp, sem, santri, tersimpan);
  klik("tutupPetunjukKolom", () => {
    tulisLokal(KUNCI_PETUNJUK_KOLOM, true);
    const p = isi.querySelector(".petunjuk-kolom");
    if (p) p.remove();
  });
  isi.querySelectorAll("[data-mode-nilai]").forEach(b => b.onclick = () => {
    tulisLokal(KUNCI_PETUNJUK_KOLOM, true);   // udah tahu ada dua cara
    kirimNilaiTertunda();
    tulisLokal(KUNCI_MODE_NILAI, b.dataset.modeNilai);
    tampilkan(true);
  });
  isi.querySelectorAll("[data-pilih-kolom]").forEach(b => b.onclick = () => {
    kirimNilaiTertunda();
    posisi.kolomNilai = b.dataset.pilihKolom;
    tampilkan(true);
    // langsung siap ngetik di siswa pertama
    const pertama = isi.querySelector(".lembar-nilai input:not([readonly])");
    if (pertama) pertama.focus();
  });
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
      // !! biar hasilnya selalu true/false: toggle(..., undefined) malah bolak-balik
      const salah = !kosong && (Number.isNaN(v) || v < 0 || (!!inp.dataset.nilai && v > 100));
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
      // UTS, UAS, Keaktifan cuma sekali (tombolnya juga udah disembunyiin kalau kolomnya ada)
      if (KELOMPOK_SEKALI.includes(g.k) && ada > 0) return tampilkan(true);
      const label = KELOMPOK_SEKALI.includes(g.k) ? g.label : `${g.label} ${ada + 1}`;
      const kolomBaru = { id: buatId(), kelompok: g.k, label };
      lembar.kolom.push(kolomBaru);
      posisi.kolomNilai = kolomBaru.id;   // mode satu kolom: langsung buka kolom barunya
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
        // n bisa null kalau datanya rusak (rules cuma ngecek bentuk petanya)
        const terisi = Object.values(lembar.nilai || {}).filter(n => n && n[k.id] !== undefined).length;
        if (!(await tanyaYakin(`Hapus kolom "${k.label}"?${terisi ? `\n\n${terisi} nilai di kolom ini ikut terhapus.` : ""}`, { bahaya: true, ya: "Hapus kolom" }))) return;
        // dibuang dari daftar (bukan ngirim daftar utuh), biar kolom baru dari perangkat lain nggak ikut hilang
        perubahan.push([["kolom"], buangDariDaftar(salin(k))]);
        lembar.kolom = lembar.kolom.filter(x => x.id !== k.id);
        for (const [sid, n] of Object.entries(lembar.nilai || {})) {
          if (!n || typeof n !== "object") continue;
          if (n[k.id] !== undefined) perubahan.push([["nilai", sid, k.id], undefined]);
          delete n[k.id];
        }
      } else {
        // ganti nama: kolom lama dibuang lalu yang baru ditambah, bukan ngirim daftar utuh,
        // biar kolom yang baru ditambah dari HP lain nggak ketimpa. Dua kali kirim karena satu kolom
        // dokumen cuma bisa satu arrayRemove/arrayUnion per tulis. Akibatnya kolom yang diganti
        // namanya pindah ke paling belakang di kelompoknya.
        // Yang baru DITAMBAH DULU, baru yang lama dibuang: kalau kiriman kedua gagal, kolomnya
        // cuma dobel (angkanya tetap kelihatan), bukan hilang dari tabel.
        const lamaK = salin(k);
        if (nama.trim() === k.label) return;
        k.label = nama.trim();
        lembar.kolom = [...lembar.kolom.filter(x => x !== k), k];
        kirimNilaiTertunda();
        simpanNilaiSebagian(mp.id, lembar, [[["kolom"], tambahKeDaftar(salin(k))]]);
        simpanNilaiSebagian(mp.id, lembar, [[["kolom"], buangDariDaftar(lamaK)]]);
        return tampilkan(true);
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
  else if (sayaKurikulum()) h += `<button class="tombol-kedua" id="isiNilai">${lembar ? "Lihat lembar nilai" : "Siapkan lembar nilai"}</button>`;
  else if (lembar) h += `<button class="tombol-kedua" id="isiNilai">Lihat lembar nilai</button>`;
  return h;
}
