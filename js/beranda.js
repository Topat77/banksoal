// =====================================================
//  beranda.js — beranda bergaya dasbor
//
//  TU   : sambutan, kartu angka (guru, modul, bank soal, siswa),
//         aktivitas terbaru, akses cepat, ringkasan per jenjang
//  Guru : sambutan, kartu angka punya sendiri, tugas koordinator UAS,
//         akses cepat, mapel yang diampu, aktivitas terbaru di grupnya
// =====================================================

// gambar di kartu sambutan: tumpukan buku, laptop, dan tanaman (cuma hiasan)
const ILUSTRASI_SAMBUT = `
<svg class="sambut-gambar" viewBox="0 0 240 150" aria-hidden="true">
  <ellipse cx="120" cy="138" rx="112" ry="9" fill="#CFE6D8"/>
  <rect x="18" y="112" width="92" height="20" rx="4" fill="#1F6B4F"/>
  <rect x="22" y="116" width="84" height="4" rx="2" fill="#F4F1E6"/>
  <rect x="26" y="94" width="80" height="19" rx="4" fill="#E9B949"/>
  <rect x="30" y="98" width="72" height="4" rx="2" fill="#FBF3DA"/>
  <rect x="20" y="76" width="86" height="19" rx="4" fill="#3E7CB1"/>
  <rect x="24" y="80" width="78" height="4" rx="2" fill="#E6EEF7"/>
  <rect x="30" y="60" width="70" height="17" rx="4" fill="#2E8B62"/>
  <rect x="34" y="64" width="62" height="3.5" rx="1.7" fill="#E3F2EA"/>
  <path d="M108 128 L196 128 L204 136 L100 136 Z" fill="#9BA9A3"/>
  <rect x="112" y="60" width="80" height="66" rx="5" fill="#33413B"/>
  <rect x="117" y="65" width="70" height="56" rx="2" fill="#DDF1E6"/>
  <rect x="123" y="72" width="34" height="5" rx="2.5" fill="#12704D"/>
  <rect x="123" y="82" width="56" height="4" rx="2" fill="#9CC4B2"/>
  <rect x="123" y="90" width="48" height="4" rx="2" fill="#9CC4B2"/>
  <rect x="123" y="100" width="22" height="14" rx="3" fill="#FFFFFF"/>
  <rect x="149" y="100" width="22" height="14" rx="3" fill="#FFFFFF"/>
  <path d="M214 136 h-20 l3 -26 h14 z" fill="#C9875A"/>
  <path d="M204 110 C196 92 188 86 182 84 C192 84 202 92 206 106 Z" fill="#2E8B62"/>
  <path d="M206 110 C206 90 212 78 220 72 C218 86 214 98 208 110 Z" fill="#3FA374"/>
  <path d="M208 110 C214 96 224 90 232 90 C226 98 218 106 210 112 Z" fill="#1F6B4F"/>
</svg>`;

// berapa yang dibuat bulan ini (pakai isian "dibuat")
function awalBulanIni() {
  const t = new Date();
  return new Date(t.getFullYear(), t.getMonth(), 1).getTime();
}
function jumlahBulanIni(daftar) {
  const awal = awalBulanIni();
  return daftar.filter(x => (x.dibuat || 0) >= awal).length;
}

// satu kartu angka: { ikon, warna, label, angka, tambah (angka bulan ini, opsional), ke, attr }
function htmlKartuAngka(daftar) {
  return `<section class="kartu-angka" aria-label="Ringkasan">${daftar.map(k => {
    const tren = k.tambah === undefined ? ""
      : k.tambah > 0 ? `<small>+${k.tambah} bulan ini</small>` : `<small class="datar">+0 bulan ini</small>`;
    const isi = `${ikonKotak(k.ikon, k.warna)}<span class="label">${aman(k.label)}</span><b>${k.angka}</b>${tren}`;
    return k.ke ? `<button type="button" data-kartu-ke="${aman(k.ke)}">${isi}</button>` : `<div>${isi}</div>`;
  }).join("")}</section>`;
}

// ====== KELENGKAPAN PERANGKAT (buat TU) ======
// Per guru yang mengampu mapel, di semester ini: udah bikin modul? udah ada soal? nilai udah diisi?
function hitungKelengkapan(sem) {
  const adaNilai = (lembar) => !!lembar && Object.values(lembar.nilai || {})
    .some(per => Object.values(per || {}).some(v => v !== null && v !== "" && v !== undefined));
  const guru = toko.pengguna.filter(p => PERAN_AKTIF.includes(p.peran))
    .map(p => ({ p, mapel: toko.mapel.filter(m => (m.pengampu || []).includes(p.id)) }))
    .filter(x => x.mapel.length);
  const hasil = { total: guru.length, modul: 0, soal: 0, nilai: 0, lengkap: 0 };
  for (const { p, mapel } of guru) {
    const modul = mapel.flatMap(m => modulMapel(m.id)).filter(x => x.pemilik === p.id && samaSemester(x, sem));
    const okModul = modul.length > 0;
    const okSoal = modul.some(m => jumlahSoal(m) > 0);
    const okNilai = mapel.every(m => adaNilai(lembarNilai(m.id, sem)));
    if (okModul) hasil.modul++;
    if (okSoal) hasil.soal++;
    if (okNilai) hasil.nilai++;
    if (okModul && okSoal && okNilai) hasil.lengkap++;
  }
  return hasil;
}

function htmlKelengkapan(sem) {
  const k = hitungKelengkapan(sem);
  const persen = k.total ? Math.round(k.lengkap / k.total * 100) : 0;
  const keliling = 2 * Math.PI * 42;
  const bar = (label, n) => `
    <div class="bar-lengkap">
      <span class="bar-label">${label}</span><span class="bar-angka">${n}/${k.total}</span>
      <span class="bar-jalur" aria-hidden="true"><span style="width:${k.total ? Math.round(n / k.total * 100) : 0}%"></span></span>
    </div>`;
  return `<section class="panel">
    <div class="panel-kepala"><h2>Kelengkapan perangkat pembelajaran</h2><button class="tombol-teks" id="kePantauan2">Lihat detail</button></div>
    ${k.total ? `<div class="kelengkapan">
      <div class="donat" role="img" aria-label="${persen}% guru sudah lengkap">
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="42" class="donat-jalur"/>
          <circle cx="50" cy="50" r="42" class="donat-isi" stroke-dasharray="${(keliling * persen / 100).toFixed(1)} ${keliling.toFixed(1)}"/>
        </svg>
        <span><b>${persen}%</b><small>lengkap</small></span>
      </div>
      <div class="bar-bar">
        ${bar("Sudah bikin modul ajar", k.modul)}
        ${bar("Sudah ada soal", k.soal)}
        ${bar("Nilai sudah diisi", k.nilai)}
        <p class="info kecil">Dari ${k.total} guru yang mengampu mapel, ${aman(namaSemester(sem))}.</p>
      </div>
    </div>` : `<p class="info">Belum ada guru yang mengampu mapel. Atur dulu di Mapel &amp; pengampu.</p>`}
  </section>`;
}

// ====== AKTIVITAS TERBARU ======
let aktivitasTampil = [];   // yang lagi tampil di beranda (buat tombolnya)
// dikumpulkan dari data yang udah ada: modul, ujian, lembar nilai, UAS bersama, usulan, akun baru
function kumpulAktivitas() {
  const kur = sayaKurikulum();
  const hasil = [];
  const siapa = (uid, nama) => uid && uid === uidSaya() ? "Kamu" : (nama || "Seseorang");
  // mapel yang kelihatan: admin semua; ustadz yang diampu + kelas lain di grupnya
  const mapel = kur ? toko.mapel : [...mapelDiampu(), ...mapelTetangga()];
  // buat ustadz: modul kelas lain dibuka lewat mapel sendiri yang satu grup
  const konteks = (m) => kur || sayaPengampu(m) ? m : (mapelDiampu().find(x => idGrup(x) === idGrup(m)) || m);

  for (const m of mapel) {
    for (const x of modulMapel(m.id)) {
      const baru = !x.diubah || (x.diubah - (x.dibuat || 0)) < 60000;
      hasil.push({
        waktu: x.diubah || x.dibuat || 0, orang: siapa(x.pemilik, x.namaPemilik),
        teks: `${baru ? "menambahkan" : "memperbarui"} modul “${x.judul}”`, sub: namaMapel(m),
        ke: { layar: "modul", mapelId: konteks(m).id, modId: x.id, semester: kunciSemester(x) }
      });
    }
    for (const x of [...sumatifMapel(m.id), ...sumatifBagiMapel(m.id)]) {
      hasil.push({
        waktu: x.diubah || x.dibuat || 0, orang: siapa(x.pemilik, x.namaPemilik),
        teks: `menyusun ujian “${x.nama}”`, sub: namaMapel(m),
        ke: { layar: "sumatif", mapelId: konteks(m).id, sumId: x.id, semester: kunciSemester(x), uasGrup: null }
      });
    }
    if (kur || sayaPengampu(m)) {
      for (const l of (toko.isi[m.id] ? toko.isi[m.id].nilai : [])) {
        if (!l.diubah) continue;
        hasil.push({
          waktu: l.diubah, orang: siapa(l.diubahOleh, l.namaPengubah),
          teks: "mengisi nilai", sub: `${namaMapel(m)} · ${namaSemester(l)}`,
          ke: { layar: "nilai", mapelId: m.id, semester: kunciSemester(l) }
        });
      }
    }
  }
  for (const [gid, daftar] of Object.entries(toko.uas)) {
    const mp = mapelGrup(gid)[0];
    if (!mp) continue;
    const buka = kur || sayaPengampu(mp) ? mp : (mapelDiampu().find(x => idGrup(x) === gid) || mp);
    for (const u of daftar) {
      const kata = u.status === "dikunci" ? "mengunci" : u.status === "diajukan" ? "mengajukan" : "menyusun";
      const kapan = u.status === "dikunci" ? u.dikunci : u.status === "diajukan" ? (u.diajukan || u.diubah) : u.diubah;
      hasil.push({
        waktu: kapan || 0, orang: siapa(u.status === "dikunci" ? u.dikunciOleh : u.diubahOleh, u.status === "dikunci" ? u.namaPengunci : u.namaPengubah),
        teks: `${kata} UAS bersama`, sub: `${namaGrup(mp)} · ${namaSemester(u)}`,
        ke: { uas: gid, sem: u, mapelId: buka.id }
      });
    }
    for (const x of (toko.usulan[gid] || [])) {
      hasil.push({
        waktu: x.dibuat || 0, orang: siapa(x.pemilik, x.namaPemilik),
        teks: "mengusulkan soal UAS", sub: namaGrup(mp),
        ke: { uas: gid, sem: x, mapelId: buka.id }
      });
    }
  }
  if (kur) {
    for (const p of toko.pengguna.filter(p => p.peran === "menunggu")) {
      hasil.push({ waktu: p.dibuat || 0, orang: p.nama || p.email, teks: "mendaftar, menunggu persetujuan", sub: p.email || "", ke: { layar: "akun" } });
    }
  }
  return hasil.filter(x => x.waktu).sort((a, b) => b.waktu - a.waktu);
}

function htmlAktivitas(maks = 6) {
  const daftar = kumpulAktivitas().slice(0, maks);
  aktivitasTampil = daftar;
  const inisial = (n) => (n || "?").replace(/^(ustadzah?|ust\.?)\s+/i, "").trim().charAt(0).toUpperCase() || "?";
  return `<section class="panel">
      <div class="panel-kepala"><h2>Aktivitas terbaru</h2></div>
      ${daftar.length ? `<ul class="aktivitas">${daftar.map((a, i) => `
        <li><button type="button" data-aktivitas="${i}">
          <span class="inisial" aria-hidden="true">${aman(inisial(a.orang))}</span>
          <span class="aktivitas-teks"><span><b>${aman(a.orang)}</b> <span dir="auto">${aman(a.teks)}</span></span>
            <small>${aman(a.sub)} · ${aman(waktuRapi(a.waktu))}</small></span>
        </button></li>`).join("")}</ul>`
        : `<p class="aktivitas-kosong">Belum ada aktivitas. Nanti di sini muncul modul, soal, nilai, dan UAS yang baru diisi.</p>`}
    </section>`;
}

function pasangAktivitas() {
  isi.querySelectorAll("[data-aktivitas]").forEach(b => {
    b.onclick = () => {
      const a = aktivitasTampil[Number(b.dataset.aktivitas)];
      if (!a) return;
      if (a.ke.uas) return bukaUAS(a.ke.uas, a.ke.sem, a.ke.mapelId);
      const { layar, ...x } = a.ke;
      pergi(layar, x);
    };
  });
}

// ====== AKSES CEPAT ======
function htmlAksesCepat(daftar, kotak) {
  return `<div class="akses-cepat ${kotak ? "kotak" : ""}">${daftar.map(a => `
    <button type="button" data-akses="${aman(a.id)}">
      ${ikonKotak(a.ikon, a.warna)}
      <span class="teks">${aman(a.judul)}${a.ket ? `<small>${aman(a.ket)}</small>` : ""}</span>
      ${IKON.panah.replace("<svg ", '<svg class="panah-kanan" ')}
    </button>`).join("")}</div>`;
}

// ====== PILIH MAPEL (dari akses cepat guru) ======
// posisi.tujuan: "modul" | "nilai"
function layarPilihMapel() {
  const tujuan = posisi.tujuan === "nilai" ? "nilai" : "modul";
  judul.textContent = tujuan === "nilai" ? "Input nilai" : "Modul ajar";
  jejak.textContent = "Pilih mapel & kelas";
  tombolKembali.hidden = false;
  const diampu = mapelDiampu();
  let h = `<p class="info">${tujuan === "nilai" ? "Lembar nilai mapel mana yang mau diisi?" : "Modul ajar mapel mana yang mau dibuka?"}</p>`;
  if (!diampu.length) h += `<p class="kosong">Kamu belum ditugaskan ke mapel mana pun.</p>`;
  for (const k of kelompokJenis(diampu)) {
    h += `<p class="label-kelompok">Mapel ${namaJenis(k.jenis).toLowerCase()}</p><div class="daftar">${k.mapel.map(m => htmlBaris({
      attr: `data-mapel="${m.id}"`, judulBaris: aman(m.nama), sub: `${aman(m.kelas)}, ${aman(m.jenjang)}`
    })).join("")}</div>`;
  }
  isi.innerHTML = h;
  isi.querySelectorAll(".baris[data-mapel]").forEach(b => {
    b.onclick = () => tujuan === "nilai"
      ? pergi("nilai", { mapelId: b.dataset.mapel, semester: null })
      : pergi("mapel", { mapelId: b.dataset.mapel, tab: "modul", semester: null });
  });
}

function bukaPilihMapel(tujuan) {
  const diampu = mapelDiampu();
  if (diampu.length === 1) {
    return tujuan === "nilai"
      ? pergi("nilai", { mapelId: diampu[0].id, semester: null })
      : pergi("mapel", { mapelId: diampu[0].id, tab: "modul", semester: null });
  }
  pergi("pilihMapel", { tujuan });
}

// =====================================================
//  BERANDA
// =====================================================
function layarBeranda() {
  judul.innerHTML = `<span class="judul-logo">${logo()}${aman(KONFIG.namaAplikasi)}</span>`;
  jejak.textContent = toko.lembaga.nama || KONFIG.namaLembaga || "";
  const kur = sayaKurikulum();
  const sem = semesterSekarang();
  const diampu = mapelDiampu();
  const lembaga = toko.lembaga.nama || KONFIG.namaLembaga || "";
  const hariIni = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  let h = `
    <section class="kartu-sambut">
      <div class="sambut-teks">
        <h2>${kur ? `Selamat datang, ${aman(namaSaya())}!` : `Halo, ${aman(namaSaya())}!`}</h2>
        <p>${kur ? `Kelola perangkat pembelajaran dan pantau kegiatan guru di ${aman(lembaga)}.` : "Semangat mengajar, semoga hari ini penuh berkah."}</p>
        <span class="tanggal">${aman(hariIni)} · ${aman(namaSemester(sem))}</span>
        ${kur ? `<div class="baris-tombol"><button class="tombol-utama" id="kePantauan">Buka pantauan</button></div>` : ""}
      </div>
      ${ILUSTRASI_SAMBUT}
    </section>`;

  if (kur) h += htmlBerandaTU(sem);
  else h += htmlBerandaGuru(sem, diampu);

  isi.innerHTML = `<div class="beranda">${h}</div>`;

  const klik = (id, f) => { const el = document.getElementById(id); if (el) el.onclick = f; };
  klik("keAkun", () => pergi("akun"));
  klik("kePantauan", () => pergi("pantauan"));
  klik("kePantauan2", () => pergi("pantauan"));
  klik("keUASDiajukan", () => pergi("daftarUAS"));
  klik("cadanganBeranda", async () => {
    const b = document.getElementById("cadanganBeranda");
    if (await unduhCadangan(b, null)) tampilkan(true);
  });
  isi.querySelectorAll("[data-kelas-kosong]").forEach(b => b.onclick = () => pergi("santri", { kelasSantri: b.dataset.kelasKosong, dariNilai: false }));
  isi.querySelectorAll("[data-panel-jenjang]").forEach(b => b.onclick = () => {
    pilihJenjang(b.dataset.panelJenjang);
    pergi(b.dataset.ke, { dariMapel: false, dariNilai: false, kelasSantri: null, kelasRapor: null });
  });
  isi.querySelectorAll("[data-kartu-ke]").forEach(b => {
    b.onclick = () => {
      const ke = b.dataset.kartuKe;
      if (ke === "pilihModul") return bukaPilihMapel("modul");
      if (ke === "pilihNilai") return bukaPilihMapel("nilai");
      pergi(ke, { dariMapel: false, dariNilai: false });
    };
  });
  isi.querySelectorAll("[data-akses]").forEach(b => {
    b.onclick = () => {
      const a = b.dataset.akses;
      if (a === "modul") return bukaPilihMapel("modul");
      if (a === "nilai") return bukaPilihMapel("nilai");
      if (a === "cari") return pergi("cari", { kata: "" });
      pergi(a, { dariMapel: false, dariNilai: false });
    };
  });
  isi.querySelectorAll("[data-koor-mapel]").forEach(b => {
    b.onclick = () => pergi("mapel", { mapelId: b.dataset.koorMapel, tab: "sumatif", semester: kunciSemester(sem) });
  });
  isi.querySelectorAll(".baris[data-mapel]").forEach(b => {
    b.onclick = () => pergi("mapel", { mapelId: b.dataset.mapel, semester: null, tab: "modul" });
  });
  pasangAktivitas();
}

function htmlBerandaTU(sem) {
  let h = "";
  // ---- pemberitahuan yang perlu ditindak ----
  const n = jumlahMenunggu();
  if (n) h += `<div class="pemberitahuan"><p><b>${n} akun guru</b> menunggu persetujuan.</p><button class="tombol-teks" id="keAkun">Lihat</button></div>`;
  const uasDiajukan = jumlahUASDiajukan();
  if (uasDiajukan) h += `<div class="pemberitahuan"><p><b>${uasDiajukan} UAS bersama</b> sudah diajukan koordinator dan menunggu diperiksa.</p><button class="tombol-teks" id="keUASDiajukan">Periksa</button></div>`;
  const hariCadangan = hariSejakCadangan();
  const adaIsi = toko.mapel.length > 0 || toko.santri.length > 0;
  if (adaIsi && (hariCadangan === null || hariCadangan >= BATAS_HARI_CADANGAN)) {
    h += `<div class="pemberitahuan"><p>${hariCadangan === null ? "<b>Cadangan data belum pernah diunduh.</b>" : `<b>Cadangan data terakhir diunduh ${hariCadangan} hari lalu.</b>`} Unduh sekarang biar data aman kalau ada yang kehapus.</p><button class="tombol-teks" id="cadanganBeranda">Unduh cadangan</button></div>`;
  }
  const kelasKosong = daftarKelas().filter(x => santriKelas(x.jenjang, x.kelas).length === 0);
  if (kelasKosong.length) {
    h += `<div class="pemberitahuan"><p><b>${kelasKosong.length} kelas</b> belum ada daftar siswanya: ${kelasKosong.map(x => aman(x.kelas)).join(", ")}.</p><button class="tombol-teks" data-kelas-kosong="${aman(`${kelasKosong[0].jenjang}|${kelasKosong[0].kelas}`)}">Isi sekarang</button></div>`;
  }

  // ---- kartu angka ----
  const guru = toko.pengguna.filter(p => PERAN_AKTIF.includes(p.peran));
  const semuaModul = toko.mapel.flatMap(m => modulMapel(m.id));
  const modulSem = semuaModul.filter(x => samaSemester(x, sem));
  const soal = modulSem.flatMap(m => m.soal || []);
  const siswa = toko.santri.filter(x => x.aktif !== false);
  h += htmlKartuAngka([
    { ikon: "akun", warna: "hijau", label: "Guru aktif", angka: guru.length, tambah: jumlahBulanIni(guru), ke: "akun" },
    { ikon: "modul", warna: "biru", label: "Modul ajar", angka: modulSem.length, tambah: jumlahBulanIni(semuaModul), ke: "pantauan" },
    { ikon: "soal", warna: "ungu", label: "Bank soal", angka: soal.length, tambah: jumlahBulanIni(soal), ke: "pantauan" },
    { ikon: "santri", warna: "oranye", label: "Siswa", angka: siswa.length, tambah: jumlahBulanIni(siswa), ke: "santri" }
  ]);

  // ---- kelengkapan, aktivitas, akses cepat ----
  h += htmlKelengkapan(sem);
  h += `<div class="dasbor-dua">
    ${htmlAktivitas()}
    <section class="panel">
      <div class="panel-kepala"><h2>Akses cepat</h2></div>
      ${htmlAksesCepat([
        { id: "daftarUAS", ikon: "cetak", warna: "hijau", judul: "Cetak soal UAS", ket: "Periksa, kunci, lalu cetak" },
        { id: "rapor", ikon: "rapor", warna: "biru", judul: "Cetak rapor siswa", ket: "Per kelas atau per siswa" },
        { id: "akun", ikon: "akun", warna: "ungu", judul: "Kelola guru", ket: "Setujui akun, NIP, sapaan" },
        { id: "kelolaMapel", ikon: "mapel", warna: "oranye", judul: "Mapel & pengampu", ket: "Guru ngajar mapel apa di kelas mana" },
        { id: "bobot", ikon: "bobot", warna: "hijau", judul: "Bobot nilai", ket: "Paket B & C, umum & diniah" }
      ])}
    </section>
  </div>`;

  // ---- ringkasan per jenjang ----
  h += `<div class="panel-jenjang">${daftarJenjang().map(j => {
    const mp = toko.mapel.filter(m => m.jenjang === j);
    const kelas = daftarKelas().filter(x => x.jenjang === j);
    const jml = toko.santri.filter(x => x.jenjang === j && x.aktif !== false).length;
    const tanpaAmpu = mp.filter(m => !(m.pengampu || []).length).length;
    return `
      <section class="kartu-jenjang">
        <h2>${aman(j)}</h2>
        <dl>
          <div><dt>Mapel</dt><dd>${mp.length}</dd></div>
          <div><dt>Kelas</dt><dd>${kelas.length}</dd></div>
          <div><dt>Siswa</dt><dd>${jml}</dd></div>
        </dl>
        ${tanpaAmpu ? `<p class="info">${tanpaAmpu} mapel belum ada pengampunya.</p>` : ""}
        <div class="baris-tombol">
          <button class="tombol-teks" data-panel-jenjang="${aman(j)}" data-ke="kelolaMapel">Mapel</button>
          <button class="tombol-teks" data-panel-jenjang="${aman(j)}" data-ke="santri">Siswa</button>
          <button class="tombol-teks" data-panel-jenjang="${aman(j)}" data-ke="rapor">Rapor</button>
        </div>
      </section>`;
  }).join("")}</div>`;

  if (toko.mapel.length === 0) {
    h += `
      <section class="panduan">
        <h2>Mulai dari sini</h2>
        <ol>
          <li><strong>Setujui akun guru</strong><span>Minta ustadz dan ustadzah masuk pakai akun Google masing-masing, lalu setujui di halaman Guru.</span></li>
          <li><strong>Tambah mapel dan pengampunya</strong><span>Misalnya Bahasa Indonesia Paket B kelas 7A1, diampu Ustadz Hasan.</span></li>
          <li><strong>Isi daftar siswa tiap kelas</strong><span>No. absen, NIS, dan nama. Paling cepat: salin dari Excel lalu tempel di tabel.</span></li>
          <li><strong>Pantau isinya</strong><span>Lihat modul, soal, dan nilai yang sudah diisi tiap guru, lalu cetak rapor.</span></li>
        </ol>
      </section>`;
  }
  return h;
}

function htmlBerandaGuru(sem, diampu) {
  let h = "";
  // ---- kartu angka (punya sendiri) ----
  const semuaMilik = diampu.flatMap(m => modulMapel(m.id)).filter(milikSaya);
  const milikSem = semuaMilik.filter(x => samaSemester(x, sem));
  const soal = milikSem.flatMap(m => m.soal || []);
  h += htmlKartuAngka([
    { ikon: "modul", warna: "hijau", label: "Modul ajar", angka: milikSem.length, tambah: jumlahBulanIni(semuaMilik), ke: "pilihModul" },
    { ikon: "soal", warna: "biru", label: "Soal", angka: soal.length, tambah: jumlahBulanIni(soal), ke: "pilihModul" },
    { ikon: "santri", warna: "oranye", label: "Siswa", angka: toko.santri.filter(x => x.aktif !== false).length, ke: "santri" },
    { ikon: "mapel", warna: "ungu", label: "Mapel diampu", angka: diampu.length }
  ]);

  // ---- tugas koordinator UAS ----
  const grupKoor = [...new Map(diampu.filter(m => sayaKoordinator(idGrup(m))).map(m => [idGrup(m), m])).values()];
  for (const m of grupKoor) {
    const u = uasGrup(idGrup(m), sem);
    const usul = usulanGrup(idGrup(m), sem).length;
    const pesan = !u ? "belum mulai disusun"
      : u.status === "draf" ? `masih draf, ${(u.butir || []).length} soal${usul ? `, ${usul} usulan masuk` : ""}`
      : u.status === "diajukan" ? "sudah diajukan, menunggu TU" : "sudah dikunci TU";
    h += `
      <section class="kartu-tugas">
        <p><b>Tugas kamu:</b> koordinator UAS ${aman(namaGrup(m))}. UAS-nya ${pesan}.</p>
        <button class="tombol-utama" data-koor-mapel="${m.id}">${!u ? "Mulai susun UAS" : "Buka UAS"}</button>
      </section>`;
  }

  // ---- akses cepat ----
  if (diampu.length) {
    h += `<h2 class="subjudul">Akses cepat</h2>` + htmlAksesCepat([
      { id: "aiGenerator", ikon: "ai", warna: "hijau", judul: "Buat soal dengan AI", ket: "Draft soal dari isi modul" },
      { id: "modul", ikon: "modul", warna: "biru", judul: "Modul ajar", ket: "Tambah & kelola modul" },
      { id: "nilai", ikon: "nilai", warna: "ungu", judul: "Input nilai", ket: "Nilai & total kehadiran" },
      { id: "cari", ikon: "cari", warna: "oranye", judul: "Bank soal", ket: "Cari soal di semua modul" }
    ], true);
  }

  // ---- mapel yang diampu + aktivitas ----
  let mapelHtml = `<section class="panel"><div class="panel-kepala"><h2>Mapel yang kamu ampu</h2><span class="info">${diampu.length} mapel</span></div>`;
  if (diampu.length === 0) {
    mapelHtml += `<p class="info">Kamu belum ditugaskan ke mapel mana pun. Minta admin (TU) menambahkanmu sebagai pengampu. Setelah ditambahkan, mapelnya otomatis muncul di sini.</p>`;
  } else {
    for (const k of kelompokJenis(diampu)) {
      mapelHtml += `<p class="label-kelompok">Mapel ${namaJenis(k.jenis).toLowerCase()}</p><div class="daftar">`;
      for (const m of k.mapel) {
        const milik = modulMapel(m.id).filter(x => milikSaya(x) && samaSemester(x, sem));
        mapelHtml += htmlBaris({
          attr: `data-mapel="${m.id}"`,
          judulBaris: aman(m.nama),
          sub: `${aman(m.kelas)}, ${aman(m.jenjang)}`,
          kanan: isiMapelSiap(m.id) ? `${milik.length} modul` : ""
        });
      }
      mapelHtml += `</div>`;
    }
  }
  mapelHtml += `</section>`;
  h += `<div class="dasbor-dua">${mapelHtml}${htmlAktivitas()}</div>`;
  return h;
}
