// =====================================================
//  modul.js — layar satu modul ajar: info, alur & modul terkait,
//             teks bacaan, pertemuan & soal formatif.
//  Form modul / teks bacaan / soal ada di formmodul.js,
//  pakai modul lama & salin modul di modullama.js.
// =====================================================

// ---- hubungan antar modul (diisi guru di form modul) ----
//  lanjutanDari: id modul sebelumnya (modul ini lanjutan dari modul itu)
//  terkait     : [id modul lain yang berhubungan]
// Pilihannya modul yang kelihatan di grup mapel ini (punya sendiri + yang dibagikan).
function labelModul(m, idMapel) {
  const asal = mapelAsal(m.id);
  const kelas = asal && asal.id !== idMapel ? ` (${asal.kelas})` : "";
  return `${m.judul}${kelas}`;
}
function bukaModulLain(idMapel, idModul) {
  const asal = mapelAsal(idModul);
  const keAsal = asal && asal.id !== idMapel && sayaPengampu(asal);
  pergi("modul", { modId: idModul, ...(keAsal ? { mapelId: asal.id } : {}) });
}
// alur: modul-modul sebelumnya (ditelusuri lewat lanjutanDari) → modul ini → modul lanjutannya
function alurModul(m, semua) {
  const peta = new Map(semua.map(x => [x.id, x]));
  const sebelum = [];
  let x = m;
  while (x.lanjutanDari && peta.has(x.lanjutanDari) && x.lanjutanDari !== m.id && sebelum.length < 6 && !sebelum.includes(peta.get(x.lanjutanDari))) {
    x = peta.get(x.lanjutanDari);
    sebelum.unshift(x);
  }
  const sesudah = semua.filter(y => y.lanjutanDari === m.id && y.id !== m.id);
  return { sebelum, sesudah };
}

// pertemuan yang dipakai soal (null kalau soalnya nggak ditandai / pertemuannya udah dihapus)
function pertemuanSoal(m, s) {
  return (m.pertemuan || []).find(p => p.id === s.pertemuanId) || null;
}

// versi terbaru modul sebelum disimpan. Udah dihapus (dari perangkat lain)? kasih tau, balik ke daftar modul.
function modulTerbaru(idMapel, idModul) {
  const m = modulMapel(idMapel).find(x => x.id === idModul);
  if (m) return m;
  kabar("Modul ini sudah dihapus (mungkin dari perangkat lain).");
  pergi("mapel", { tab: "modul" });
  return null;
}

// =====================================================
//  LAYAR MODUL
// =====================================================
function layarModul() {
  const mp = mapelAktif();
  const m = modAktif();
  // yang bisa ngubah cuma pemiliknya, dari mapel tempat modul ini disimpan
  const boleh = bisaDiubahDi(mp.id, m, modulMapel(mp.id));
  const asal = mapelAsal(m.id);
  const dariKelasLain = asal && asal.id !== mp.id;
  posisi.semester = kunciSemester(m);
  tandaLayarModul = JSON.stringify([m, toko.lembaga]);

  judul.textContent = m.judul;
  jejak.textContent = `${dariKelasLain ? `${namaMapel(asal)} (kelas lain di grup)` : namaMapel(mp)}, ${namaSemester(m)}`;
  tombolKembali.hidden = false;

  const pertemuan = m.pertemuan || [];
  const soal = m.soal || [];
  const bacaan = m.bacaan || [];
  const pratinjau = linkPratinjau(m.link);

  // --- info modul ---
  let kiri = `
    <div class="lembar-info">
      <p class="info-utama">${aman(m.namaPemilik || "")} · ${pertemuan.length} pertemuan · ${soal.length} soal</p>
      ${m.catatan ? `<p class="catatan" dir="auto">${aman(m.catatan)}</p>` : ""}`;
  if (boleh) {
    kiri += `
      <label class="saklar">
        <input type="checkbox" id="bagikan" ${m.dibagikan ? "checked" : ""}>
        <span class="saklar-isi"><b>Bagikan ke guru lain di ${aman(namaGrup(mp))}</b><small>${m.dibagikan
          ? `Pengampu ${aman(mp.nama)} di semua kelas ${aman(tingkatKelas(mp.kelas))} (${aman([mp, ...mapelSegrup(mp)].map(x => x.kelas).join(", "))}) bisa melihat dan memakai soalnya untuk sumatif & UAS.`
          : "Tertutup: hanya Anda dan admin (TU) yang bisa melihat."}</small></span>
      </label>`;
  } else {
    kiri += `<p class="info">${m.dibagikan ? "Dibagikan" : "Tertutup"}${dariKelasLain ? ` · dari ${aman(asal.kelas)}` : ""} · hanya bisa dilihat, yang bisa mengubah hanya ${aman(m.namaPemilik || "pemiliknya")}.</p>`;
  }
  // alur & modul terkait
  const semuaGrup = modulGrup(mp.id);
  const { sebelum, sesudah } = alurModul(m, semuaGrup);
  const terkait = [...new Set([...(m.terkait || []), ...semuaGrup.filter(x => (x.terkait || []).includes(m.id)).map(x => x.id)])]
    .map(id => semuaGrup.find(x => x.id === id)).filter(x => x && x.id !== m.id);
  if (sebelum.length || sesudah.length) {
    kiri += `<p class="label-kelompok">Alur modul</p><ol class="alur-modul">
      ${sebelum.map(x => `<li><button data-ke-modul="${aman(x.id)}" dir="auto">${aman(labelModul(x, mp.id))}</button></li>`).join("")}
      <li><span class="ini" dir="auto">${aman(m.judul)}</span></li>
      ${sesudah.length ? `<li>${sesudah.map(x => `<button data-ke-modul="${aman(x.id)}" dir="auto">${aman(labelModul(x, mp.id))}</button>`).join(" ")}</li>` : ""}
    </ol>`;
  }
  if (terkait.length) {
    kiri += `<p class="label-kelompok">Modul terkait</p><div class="alur-modul terkait-modul">
      ${terkait.map(x => `<button data-ke-modul="${aman(x.id)}" dir="auto">${aman(labelModul(x, mp.id))}</button>`).join("")}
    </div>`;
  }
  if (m.lanjutanDari && !sebelum.length) {
    kiri += `<p class="info">Lanjutan dari modul yang sudah tidak tersedia (dihapus atau tidak dibagikan lagi).</p>`;
  }
  kiri += `<div class="aksi-teks">`;
  if (linkAman(m.link)) kiri += `<a class="tombol-teks" href="${aman(m.link)}" target="_blank" rel="noopener">Buka file di tab baru</a>`;
  if (boleh) kiri += `<button class="tombol-teks" id="editModul">Ubah modul &amp; pertemuan</button>
    <button class="tombol-teks" id="salinModul">Salin ke semester lain</button>`;
  kiri += `</div></div>`;

  if (pratinjau) {
    kiri += `<iframe class="pratinjau" src="${aman(pratinjau)}" title="File modul" loading="lazy"></iframe>`;
  } else if (m.link && linkAman(m.link)) {
    kiri += `<p class="info">Link ini bukan link Google Drive, jadi isinya tidak bisa ditampilkan di sini. Pakai "Buka file di tab baru".</p>`;
  } else if (boleh) {
    kiri += `<p class="info">Tempel link Google Drive file modulnya lewat "Ubah modul &amp; pertemuan", agar isinya tampil di sini.</p>`;
  }

  // --- teks bacaan ---
  let kanan = `<h2 class="subjudul">Teks bacaan <small>${bacaan.length} teks</small></h2>`;
  if (bacaan.length === 0 && boleh) {
    kanan += `<p class="info">Pakai teks bacaan jika beberapa soal mengacu ke satu teks yang sama, misalnya cerita, paragraf, atau hadits. Teksnya cukup diketik sekali.</p>`;
  } else if (bacaan.length === 0) {
    kanan += `<p class="info">Tidak ada teks bacaan.</p>`;
  }
  for (const b of bacaan) {
    const dipakai = soal.filter(s => s.bacaanId === b.id).length;
    kanan += `
      <article class="bacaan">
        ${b.judul ? `<h3 dir="auto">${aman(b.judul)}</h3>` : ""}
        <p class="bacaan-pratinjau" dir="auto">${aman(b.teks)}</p>
        <div class="bacaan-bawah">
          <span class="info">Dipakai ${dipakai} soal</span>
          <span class="spasi"></span>
          ${boleh ? `<button class="tombol-kecil" data-edit-bacaan="${aman(b.id)}">Ubah</button>
          <button class="tombol-kecil" data-soal-bacaan="${aman(b.id)}">+ Soal untuk teks ini</button>` : ""}
        </div>
      </article>`;
  }
  if (boleh) kanan += `<button class="tombol-kedua" id="tambahBacaan">+ Tambah teks bacaan</button>`;

  // --- pertemuan & soal formatif ---
  kanan += `<h2 class="subjudul">Pertemuan &amp; soal formatif <small>${soal.length} soal</small></h2>`;
  if (boleh) {
    kanan += `<div class="ajakan-ai">
        <div><b>Buat soal sekali tekan</b><span>AI langsung membuatkan draft soal dari isi modul ini. Anda cukup memeriksa, lalu menyimpan.</span></div>
        <button class="tombol-utama tombol-ai" id="keAIOtomatis">${IKON_AI}<span>Buatkan soal</span></button>
        <button class="tombol-teks" id="keAI">Atur sendiri</button>
      </div>`;
  }
  if (pertemuan.length === 0) {
    kanan += `<p class="info">Belum ada pertemuan.${boleh ? ` Tambahkan lewat "Ubah modul &amp; pertemuan".` : ""}</p>`;
  }

  const kelompok = pertemuan.map((p, i) => ({ p, nomor: i + 1, soal: soal.filter(s => s.pertemuanId === p.id) }));
  const lainnya = soal.filter(s => !pertemuanSoal(m, s));
  let nomorSoal = 0;

  for (const k of kelompok) {
    kanan += `
      <section class="pertemuan" id="pertemuan-${aman(k.p.id)}">
        <div class="pertemuan-kepala">
          <h3>Pertemuan ${k.nomor}</h3>
          <span class="info">${k.soal.length} soal</span>
        </div>
        <p class="target" dir="auto"><span>Target capaian</span>${k.p.target ? aman(k.p.target) : `<i>Belum diisi</i>`}</p>`;
    k.soal.forEach((s, i) => {
      kanan += kartuSoal(s, { nomor: ++nomorSoal, pertama: i === 0, terakhir: i === k.soal.length - 1, mode: boleh ? "modul" : "lihat", bacaan: bacaan.find(b => b.id === s.bacaanId) });
    });
    kanan += `<div class="baris-tombol">
        ${boleh ? `<button class="tombol-kedua" data-soal-pertemuan="${aman(k.p.id)}">+ Soal pertemuan ${k.nomor}</button>` : ""}
        ${k.soal.length ? `<button class="tombol-teks" data-cetak-pertemuan="${aman(k.p.id)}">Cetak soal pertemuan ini</button>` : ""}
      </div>
      </section>`;
  }

  if (lainnya.length || (pertemuan.length === 0 && boleh)) {
    kanan += `
      <section class="pertemuan">
        <div class="pertemuan-kepala"><h3>Soal lainnya</h3><span class="info">${lainnya.length} soal</span></div>
        ${pertemuan.length ? `<p class="info">Soal yang belum ditandai untuk pertemuan tertentu.</p>` : ""}`;
    lainnya.forEach((s, i) => {
      kanan += kartuSoal(s, { nomor: ++nomorSoal, pertama: i === 0, terakhir: i === lainnya.length - 1, mode: boleh ? "modul" : "lihat", bacaan: bacaan.find(b => b.id === s.bacaanId) });
    });
    if (boleh && pertemuan.length === 0) kanan += `<div class="baris-tombol"><button class="tombol-kedua" data-soal-pertemuan="">+ Tambah soal</button></div>`;
    kanan += `</section>`;
  }

  if (soal.length) {
    kanan += `<div class="baris-tombol"><button class="tombol-utama" id="cetakFormatif">Cetak semua soal formatif</button></div>`;
  }

  const adaPratinjau = !!pratinjau;
  isi.innerHTML = `
    <div class="layar-modul${adaPratinjau ? " ada-pratinjau" : ""}">
      <div class="modul-file">${kiri}</div>
      <div class="modul-isi">${kanan}</div>
    </div>`;

  // --- tombol-tombol ---
  klik("editModul", () => pergi("formModul", { modEditId: m.id }));
  klik("salinModul", () => pergi("formSalin", { salinDari: "modul", salinModul: m.id }));
  klik("tambahBacaan", () => pergi("formBacaan", { bacaanId: null }));
  klik("cetakFormatif", () => pergi("cetak", { cetakDari: "modul", cetakPertemuan: null }));
  klik("keAI", () => pergi("aiSoal", { aiUntuk: "modul", aiPertemuan: null, aiLangsung: false }));
  klik("keAIOtomatis", () => pergi("aiSoal", { aiUntuk: "modul", aiPertemuan: null, aiLangsung: true }));
  isi.querySelectorAll("[data-ke-modul]").forEach(b => { b.onclick = () => bukaModulLain(mp.id, b.dataset.keModul); });

  const saklar = document.getElementById("bagikan");
  if (saklar) {
    saklar.onchange = () => {
      simpanModul(mp.id, { ...m, dibagikan: saklar.checked });
      tampilkan(true);
    };
  }

  isi.querySelectorAll("[data-edit-bacaan]").forEach(b => {
    b.onclick = () => pergi("formBacaan", { bacaanId: b.dataset.editBacaan });
  });
  isi.querySelectorAll("[data-soal-bacaan]").forEach(b => {
    b.onclick = () => pergi("formSoal", { soalId: null, bacaanPilih: b.dataset.soalBacaan, pertemuanPilih: null });
  });
  isi.querySelectorAll("[data-soal-pertemuan]").forEach(b => {
    b.onclick = () => pergi("formSoal", { soalId: null, bacaanPilih: null, pertemuanPilih: b.dataset.soalPertemuan || null });
  });
  isi.querySelectorAll("[data-cetak-pertemuan]").forEach(b => {
    b.onclick = () => pergi("cetak", { cetakDari: "modul", cetakPertemuan: b.dataset.cetakPertemuan });
  });
  isi.querySelectorAll("[data-edit]").forEach(b => {
    b.onclick = () => pergi("formSoal", { soalId: b.dataset.edit, bacaanPilih: null, pertemuanPilih: null });
  });
  isi.querySelectorAll("[data-hapus]").forEach(b => {
    b.onclick = async () => {
      if (!(await tanyaYakin("Hapus soal ini?\n\nKalau soal ini sudah dipakai di ujian sumatif, di sana tetap tercetak dari salinan terakhir.", { bahaya: true, ya: "Hapus soal" }))) return;
      const t = modulMapel(mp.id).find(y => y.id === m.id) || m;
      simpanModul(mp.id, { ...t, soal: (t.soal || []).filter(s => s.id !== b.dataset.hapus) });
      tampilkan(true);
    };
  });

  // ↑ ↓ : tukar dengan soal sebelum/sesudahnya di kelompok (pertemuan) yang sama
  const geserSoal = (id, arahGeser) => {
    const s = soal.find(x => x.id === id);
    const sekelompok = soal.filter(x => (pertemuanSoal(m, x) || {}).id === (pertemuanSoal(m, s) || {}).id);
    const j = sekelompok.indexOf(s) + arahGeser;
    if (j < 0 || j >= sekelompok.length) return;
    const baru = [...soal];
    const a = baru.indexOf(s), c = baru.indexOf(sekelompok[j]);
    [baru[a], baru[c]] = [baru[c], baru[a]];
    simpanModul(mp.id, { ...m, soal: baru });
    tampilkan(true);
  };
  isi.querySelectorAll("[data-naik]").forEach(b => b.onclick = () => geserSoal(b.dataset.naik, -1));
  isi.querySelectorAll("[data-turun]").forEach(b => b.onclick = () => geserSoal(b.dataset.turun, 1));
}
