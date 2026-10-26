// =====================================================
//  bersihkan.js — BERSIHKAN DATA (khusus admin TU)
//
//  Buat ngehapus data trial atau data yang udah nggak dipakai:
//  centang mapel (beserta modul, soal, ujian, nilainya), kelas siswa,
//  dan akun guru, lalu ketik HAPUS buat konfirmasi.
//  Akun yang lagi login dan akun admin awal nggak bisa dihapus dari sini.
// =====================================================

function isiMapelRingkas(m) {
  const modul = modulMapel(m.id);
  const lembar = toko.isi[m.id] ? toko.isi[m.id].nilai : [];
  return {
    modul: modul.length,
    soal: modul.reduce((n, x) => n + jumlahSoal(x), 0),
    ujian: sumatifMapel(m.id).length,
    nilai: lembar.length
  };
}

function layarBersihkanData() {
  wajibKurikulum();
  judul.textContent = "Bersihkan data";
  jejak.textContent = "Hapus data trial atau yang udah nggak dipakai";
  tombolKembali.hidden = false;

  const NAMA_PERAN = { ustadz: "Guru", kurikulum: "Admin TU", menunggu: "Menunggu persetujuan", ditolak: "Ditolak", nonaktif: "Nonaktif" };
  const kotak = (jenis, id, judulBaris, sub) => `
    <label class="centang">
      <input type="checkbox" data-hapus-jenis="${jenis}" value="${aman(id)}">
      <span class="isi-centang"><b dir="auto">${judulBaris}</b><small>${sub}</small></span>
    </label>`;

  let h = `
    <div class="pemberitahuan-kecil"><b>Hati-hati:</b> data yang dihapus di sini hilang permanen dan nggak bisa dikembalikan. Unduh cadangan dulu biar aman.
      <div class="baris-tombol"><button type="button" class="tombol-kecil" id="cadanganBersihkan">Unduh cadangan dulu</button><span class="info" id="pesanCadanganBersihkan" role="status"></span></div>
    </div>`;

  // ---- mapel ----
  h += `<h2 class="subjudul">Mapel</h2><p class="info">Modul, soal, ujian, dan nilai di mapel itu ikut terhapus.</p>`;
  if (!toko.mapel.length) h += `<p class="info">Belum ada mapel.</p>`;
  for (const j of daftarJenjang()) {
    const mapelJ = toko.mapel.filter(m => m.jenjang === j);
    if (!mapelJ.length) continue;
    for (const k of kelompokJenis(mapelJ)) {
      h += `<p class="label-kelompok">${aman(j)} · ${namaJenis(k.jenis)}</p><div class="kolom daftar-centang">`;
      for (const m of k.mapel) {
        const r = isiMapelRingkas(m);
        h += kotak("mapel", m.id, `${aman(m.nama)} ${aman(m.kelas)}`,
          `${r.modul} modul, ${r.soal} soal, ${r.ujian} ujian, ${r.nilai ? "ada nilai" : "belum ada nilai"}`);
      }
      h += `</div>`;
    }
  }

  // ---- siswa per kelas ----
  const kelas = daftarKelas().filter(x => santriKelas(x.jenjang, x.kelas).length);
  h += `<h2 class="subjudul">Siswa per kelas</h2><p class="info">Semua siswa di kelas yang dicentang ikut terhapus.</p>`;
  if (!kelas.length) h += `<p class="info">Belum ada siswa.</p>`;
  else {
    h += `<div class="kolom daftar-centang">`;
    for (const x of kelas) {
      h += kotak("kelas", `${x.jenjang}|${x.kelas}`, `Kelas ${aman(x.kelas)} ${aman(x.jenjang)}`, `${santriKelas(x.jenjang, x.kelas).length} siswa`);
    }
    h += `</div>`;
  }

  // ---- akun ----
  const akun = toko.pengguna.filter(akunBisaDihapus).sort((a, b) => (a.nama || "").localeCompare(b.nama || "", "id"));
  h += `<h2 class="subjudul">Akun guru</h2><p class="info">Akun yang dihapus dicabut juga dari pengampu mapel.</p>`;
  if (!akun.length) h += `<p class="info">Nggak ada akun lain yang bisa dihapus.</p>`;
  else {
    h += `<div class="kolom daftar-centang">`;
    for (const p of akun) {
      const ampu = toko.mapel.filter(m => (m.pengampu || []).includes(p.id)).map(namaMapel);
      h += kotak("akun", p.id, aman(p.nama || p.email),
        `${aman(p.email || "")} · ${aman(NAMA_PERAN[p.peran] || p.peran)}${ampu.length ? ` · ngajar ${aman(ampu.join(", "))}` : ""}`);
    }
    h += `</div>`;
  }
  h += `<p class="info kecil">Akunmu sendiri dan akun admin utama nggak bisa dihapus dari sini. Akun yang dihapus kalau login lagi statusnya jadi "menunggu persetujuan".</p>`;

  // ---- konfirmasi ----
  h += `
    <section class="panel konfirmasi-hapus">
      <p class="info-utama" id="ringkasHapus">Belum ada yang dicentang.</p>
      <label>Ketik <b>HAPUS</b> untuk memastikan <input id="ketikHapus" autocomplete="off" autocapitalize="characters" placeholder="HAPUS"></label>
      <button type="button" class="tombol-merah" id="hapusPermanen" disabled>Hapus permanen</button>
    </section>`;
  isi.innerHTML = h;

  const ketik = document.getElementById("ketikHapus");
  const tombol = document.getElementById("hapusPermanen");
  const ringkas = document.getElementById("ringkasHapus");

  function pilihan() {
    const ambil = (jenis) => [...isi.querySelectorAll(`[data-hapus-jenis="${jenis}"]:checked`)].map(c => c.value);
    const mapel = ambil("mapel").map(cariMapel).filter(Boolean);
    const kelasDipilih = ambil("kelas");
    const siswa = kelasDipilih.flatMap(k => { const [j, kls] = k.split("|"); return santriKelas(j, kls); });
    const akunDipilih = ambil("akun").map(id => toko.pengguna.find(p => p.id === id)).filter(Boolean);
    return { mapel, kelasDipilih, siswa, akun: akunDipilih };
  }
  function segarkan() {
    const x = pilihan();
    const r = x.mapel.map(isiMapelRingkas).reduce((a, b) => ({ modul: a.modul + b.modul, soal: a.soal + b.soal }), { modul: 0, soal: 0 });
    const bagian = [];
    if (x.mapel.length) bagian.push(`${x.mapel.length} mapel (${r.modul} modul, ${r.soal} soal)`);
    if (x.kelasDipilih.length) bagian.push(`${x.kelasDipilih.length} kelas (${x.siswa.length} siswa)`);
    if (x.akun.length) bagian.push(`${x.akun.length} akun`);
    ringkas.textContent = bagian.length ? `Akan dihapus: ${bagian.join(", ")}.` : "Belum ada yang dicentang.";
    tombol.disabled = !bagian.length || ketik.value.trim().toUpperCase() !== "HAPUS";
  }
  isi.querySelectorAll("[data-hapus-jenis]").forEach(c => c.onchange = segarkan);
  ketik.oninput = segarkan;

  const cad = document.getElementById("cadanganBersihkan");
  cad.onclick = () => unduhCadangan(cad, document.getElementById("pesanCadanganBersihkan"));

  tombol.onclick = () => {
    const x = pilihan();
    if (tombol.disabled) return;
    for (const m of x.mapel) hapusMapelData(m.id);
    for (const s of x.siswa) hapusSantri(s.id);
    for (const p of x.akun) hapusPengguna(p.id);
    hapusSisaKosong();
    alert(`Sudah dihapus: ${ringkas.textContent.replace(/^Akan dihapus: /, "")}`);
    pergi("lainnya");
  };
}
