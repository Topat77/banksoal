// =====================================================
//  modul.js — modul ajar, pertemuan & target capaian,
//             teks bacaan, dan soal formatif
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

// =====================================================
//  FORM MODUL (judul, file, tujuan, daftar pertemuan)
// =====================================================
function formModul() {
  const mp = mapelAktif();
  const sem = semAktif();
  const lama = posisi.modEditId ? butuh(modulMapel(mp.id).find(m => m.id === posisi.modEditId)) : null;
  if (lama && !milikSaya(lama)) throw new DataHilang();
  if (!lama && !sayaPengampu(mp)) throw new DataHilang();
  const m = lama ? salin(lama) : {
    judul: "", link: "", catatan: "",
    pertemuan: [{ id: buatId(), target: "" }]
  };

  // modul lain di grup ini, semester yang sama (modul ini sendiri nggak ikut)
  const pilihanRelasi = modulGrup(mp.id).filter(x => x.id !== (lama && lama.id) && samaSemester(x, lama || sem));

  judul.textContent = lama ? "Ubah modul ajar" : "Tambah modul ajar";
  jejak.textContent = `${namaMapel(mp)}, ${namaSemester(lama || sem)}`;
  tombolKembali.hidden = false;

  isi.innerHTML = `
    <form id="form">
      <label>Judul modul <input name="judul" maxlength="200" value="${aman(m.judul)}" placeholder="Teks Deskripsi" required></label>
      <label>Tujuan pembelajaran (opsional)
        <textarea name="catatan" rows="2" maxlength="5000" placeholder="Tujuan umum modul ini">${aman(m.catatan || "")}</textarea>
      </label>

      <fieldset>
        <legend>Pertemuan &amp; target capaian</legend>
        <p class="info">Tulis apa yang harus dicapai siswa di tiap pertemuan. Soal formatif nanti ditandai untuk pertemuan yang mana.</p>
        <div id="daftarPertemuan" class="kolom"></div>
        <button type="button" class="tombol-kedua" id="tambahPertemuan">+ Tambah pertemuan</button>
      </fieldset>

      <fieldset>
        <legend>Hubungan dengan modul lain (opsional)</legend>
        <p class="info">Biar kelihatan urutan materinya. Pilihannya modul kamu dan modul yang dibagikan di ${aman(namaGrup(mp))}.</p>
        <label>Lanjutan dari modul
          <select name="lanjutanDari">
            <option value="">Bukan lanjutan modul lain</option>
            ${pilihanRelasi.map(x => `<option value="${aman(x.id)}" ${m.lanjutanDari === x.id ? "selected" : ""}>${aman(labelModul(x, mp.id))}</option>`).join("")}
          </select>
        </label>
        ${pilihanRelasi.length ? `<p class="label-kelompok">Modul terkait</p>
        <div class="kolom daftar-centang">${pilihanRelasi.map(x => `
          <label class="centang">
            <input type="checkbox" name="terkait" value="${aman(x.id)}" ${(m.terkait || []).includes(x.id) ? "checked" : ""}>
            <span class="isi-centang"><b dir="auto">${aman(labelModul(x, mp.id))}</b><small>${aman(x.namaPemilik || "")}</small></span>
          </label>`).join("")}</div>` : ""}
      </fieldset>

      <label>Link file modul (opsional)
        <input name="link" type="url" maxlength="500" value="${aman(m.link || "")}" placeholder="https://drive.google.com/...">
      </label>
      <p class="info">Upload file modulnya ke Google Drive, atur aksesnya jadi "Siapa saja yang memiliki link", lalu tempel link-nya di sini. Isinya nanti tampil langsung di halaman modul.</p>

      <button type="submit" class="tombol-utama">Simpan</button>
      ${lama ? `<button type="button" class="tombol-hapus" id="hapus">Hapus modul ini</button>` : ""}
    </form>`;

  const form = document.getElementById("form");
  const wadah = document.getElementById("daftarPertemuan");
  let daftar = m.pertemuan.map(p => ({ ...p }));

  // isian yang lagi diketik diambil dulu sebelum digambar ulang
  function ambilKetikan() {
    wadah.querySelectorAll("textarea[data-id]").forEach(t => {
      const p = daftar.find(x => x.id === t.dataset.id);
      if (p) p.target = t.value;
    });
  }

  function gambarPertemuan() {
    wadah.innerHTML = daftar.length ? daftar.map((p, i) => `
      <div class="isian-pertemuan">
        <div class="isian-pertemuan-atas">
          <label for="target-${aman(p.id)}">Pertemuan ${i + 1}</label>
          <button type="button" class="tombol-teks merah" data-hapus-pertemuan="${aman(p.id)}" aria-label="Hapus pertemuan ${i + 1}">Hapus</button>
        </div>
        <textarea id="target-${aman(p.id)}" data-id="${aman(p.id)}" rows="2" dir="auto" placeholder="Target capaian pertemuan ${i + 1}">${aman(p.target)}</textarea>
      </div>`).join("") : `<p class="info">Belum ada pertemuan.</p>`;

    wadah.querySelectorAll("[data-hapus-pertemuan]").forEach(b => {
      b.onclick = async () => {
        ambilKetikan();
        const id = b.dataset.hapusPertemuan;
        const dipakai = lama ? (lama.soal || []).filter(s => s.pertemuanId === id).length : 0;
        if (dipakai && !(await tanyaYakin(`${dipakai} soal ditandai untuk pertemuan ini. Soalnya tetap ada, cuma pindah ke "Soal lainnya". Hapus pertemuan ini?`, { bahaya: true, ya: "Hapus pertemuan" }))) return;
        ambilKetikan();
        daftar = daftar.filter(x => x.id !== id);
        gambarPertemuan();
      };
    });
  }
  gambarPertemuan();

  document.getElementById("tambahPertemuan").onclick = () => {
    ambilKetikan();
    const baru = { id: buatId(), target: "" };
    daftar.push(baru);
    gambarPertemuan();
    document.getElementById(`target-${baru.id}`).focus();
  };

  form.onsubmit = (e) => {
    e.preventDefault();
    ambilKetikan();
    const f = new FormData(form);
    const link = (f.get("link") || "").trim();
    const pertemuan = daftar.map(p => ({ id: p.id, target: p.target.trim() }));
    const relasi = { lanjutanDari: f.get("lanjutanDari") || null, terkait: f.getAll("terkait") };

    if (lama) {
      const terbaru = modulMapel(mp.id).find(x => x.id === lama.id);
      if (!terbaru) {
        kabar("Modul ini sudah dihapus (mungkin dari perangkat lain).");
        return pergi("mapel", { tab: "modul" });
      }
      const ada = new Set(pertemuan.map(p => p.id));
      const soal = (terbaru.soal || []).map(s => ada.has(s.pertemuanId) ? s : { ...s, pertemuanId: null });
      if (!simpanModul(mp.id, { ...terbaru, judul: f.get("judul").trim(), catatan: f.get("catatan").trim(), link, pertemuan, soal, ...relasi })) return;
      pergi("modul");
    } else {
      const baru = simpanModul(mp.id, {
        id: buatId(),
        semester: sem.semester, tahun: sem.tahun,
        judul: f.get("judul").trim(),
        catatan: f.get("catatan").trim(),
        link,
        dibagikan: false,
        ...relasi,
        pertemuan, bacaan: [], soal: []
      });
      if (!baru) return;
      pergi("modul", { modId: baru.id });
    }
  };

  if (lama) {
    document.getElementById("hapus").onclick = async () => {
      const yakin = await tanyaYakin(
        `Hapus modul "${lama.judul}"?\n\n` +
        `${(lama.pertemuan || []).length} pertemuan, ${jumlahSoal(lama)} soal, dan ${(lama.bacaan || []).length} teks bacaan ikut terhapus. ` +
        `Di ujian sumatif yang sudah memakai soalnya, soal tetap tercetak dari salinan terakhir. TIDAK bisa dikembalikan.`,
        { bahaya: true, ya: "Hapus modul" }
      );
      if (!yakin) return;
      hapusModul(mp.id, lama.id);
      pergi("mapel", { tab: "modul" });
    };
  }
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
  catatTerakhir("modul", mp.id, m.id);

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
          : "Tertutup: cuma kamu dan admin (TU) yang bisa melihat."}</small></span>
      </label>`;
  } else {
    kiri += `<p class="info">${m.dibagikan ? "Dibagikan" : "Tertutup"}${dariKelasLain ? ` · dari ${aman(asal.kelas)}` : ""} · cuma bisa dilihat, yang bisa mengubah hanya ${aman(m.namaPemilik || "pemiliknya")}.</p>`;
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
    kiri += `<p class="info">Lanjutan dari modul yang sudah nggak tersedia (dihapus atau nggak dibagikan lagi).</p>`;
  }
  kiri += `<div class="aksi-teks">`;
  if (linkAman(m.link)) kiri += `<a class="tombol-teks" href="${aman(m.link)}" target="_blank" rel="noopener">Buka file di tab baru</a>`;
  if (boleh) kiri += `<button class="tombol-teks" id="editModul">Ubah modul &amp; pertemuan</button>
    <button class="tombol-teks" id="salinModul">Salin ke semester lain</button>`;
  kiri += `</div></div>`;

  if (pratinjau) {
    kiri += `<iframe class="pratinjau" src="${aman(pratinjau)}" title="File modul" loading="lazy"></iframe>`;
  } else if (m.link && linkAman(m.link)) {
    kiri += `<p class="info">Link ini bukan link Google Drive, jadi isinya nggak bisa ditampilkan di sini. Pakai "Buka file di tab baru".</p>`;
  } else if (boleh) {
    kiri += `<p class="info">Tempel link Google Drive file modulnya lewat "Ubah modul &amp; pertemuan", biar isinya tampil di sini.</p>`;
  }

  // --- teks bacaan ---
  let kanan = `<h2 class="subjudul">Teks bacaan <small>${bacaan.length} teks</small></h2>`;
  if (bacaan.length === 0 && boleh) {
    kanan += `<p class="info">Pakai teks bacaan kalau beberapa soal mengacu ke satu teks yang sama, misalnya cerita, paragraf, atau hadits. Teksnya cukup diketik sekali.</p>`;
  } else if (bacaan.length === 0) {
    kanan += `<p class="info">Nggak ada teks bacaan.</p>`;
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
        <div><b>Bikin soal lebih cepat</b><span>AI nyusun draft soal dari target capaian, ringkasan, atau PDF modul. Kamu tinggal cek &amp; edit.</span></div>
        <button class="tombol-kedua tombol-ai" id="keAI">${IKON_AI}<span>Buat soal pakai AI</span></button>
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
  klik("keAI", () => pergi("aiSoal", { aiUntuk: "modul", aiPertemuan: null }));
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

// =====================================================
//  TEKS BACAAN
// =====================================================
function formBacaan() {
  const mp = mapelAktif();
  const m = modAktif();
  if (!bisaDiubahDi(mp.id, m, modulMapel(mp.id))) throw new DataHilang();
  const lama = posisi.bacaanId ? butuh((m.bacaan || []).find(b => b.id === posisi.bacaanId)) : null;
  const b = lama || { judul: "", teks: "" };

  judul.textContent = lama ? "Ubah teks bacaan" : "Tambah teks bacaan";
  jejak.textContent = m.judul;
  tombolKembali.hidden = false;

  isi.innerHTML = `
    <form id="form">
      <label>Judul (opsional) <input name="judul" value="${aman(b.judul)}" placeholder="Pasar Pagi di Kampung Kami"></label>
      <label>Isi teks
        <textarea name="teks" rows="12" class="teks-serif" required placeholder="Tempel atau ketik teks bacaannya di sini...">${aman(b.teks)}</textarea>
      </label>
      <button type="submit" class="tombol-utama">Simpan</button>
      ${lama ? `<button type="button" class="tombol-hapus" id="hapus">Hapus teks bacaan ini</button>` : ""}
    </form>`;

  const ambilModulTerbaru = () => {
    const x = modulMapel(mp.id).find(y => y.id === m.id);
    if (!x) { kabar("Modul ini sudah dihapus (mungkin dari perangkat lain)."); pergi("mapel", { tab: "modul" }); }
    return x;
  };

  document.getElementById("form").onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const isian = { judul: f.get("judul").trim(), teks: f.get("teks").trim() };
    const t = ambilModulTerbaru();
    if (!t) return;
    const daftar = [...(t.bacaan || [])];
    const i = lama ? daftar.findIndex(x => x.id === lama.id) : -1;
    if (i >= 0) daftar[i] = { ...daftar[i], ...isian };
    else daftar.push({ id: buatId(), ...isian });
    if (!simpanModul(mp.id, { ...t, bacaan: daftar })) return;
    pergi("modul");
  };

  if (lama) {
    document.getElementById("hapus").onclick = async () => {
      let t = ambilModulTerbaru();
      if (!t) return;
      const dipakai = (t.soal || []).filter(s => s.bacaanId === lama.id);
      const pesan = dipakai.length
        ? `Hapus teks ini? ${dipakai.length} soal yang memakainya tetap ada, cuma nggak punya teks bacaan lagi.`
        : "Hapus teks bacaan ini?";
      if (!(await tanyaYakin(pesan, { bahaya: true, ya: "Hapus teks" }))) return;
      t = ambilModulTerbaru();
      if (!t) return;
      simpanModul(mp.id, {
        ...t,
        bacaan: (t.bacaan || []).filter(x => x.id !== lama.id),
        soal: (t.soal || []).map(s => s.bacaanId === lama.id ? { ...s, bacaanId: null } : s)
      });
      pergi("modul");
    };
  }
}

// =====================================================
//  SOAL
// =====================================================

// HTML satu kartu soal
// o.mode "modul"   → tombol ↑ ↓ Ubah Hapus
// o.mode "sumatif" → tombol ↑ ↓ Keluarkan (+ keterangan asal)
// o.mode "lihat"   → tanpa tombol
function kartuSoal(s, o) {
  const pg = s.jenis === "PG";
  let html = `
    <article class="soal">
      <div class="soal-atas">
        <span class="nomor">${o.nomor}.</span>
        <span class="jenis">${pg ? "Pilihan ganda" : "Esai"}</span>
        ${o.bacaan ? `<span class="label-bacaan">Teks: ${aman(potong(o.bacaan.judul || o.bacaan.teks, 28))}</span>` : ""}
        ${o.asal ? `<span class="asal">${o.asal}</span>` : ""}
      </div>
      <p class="soal-teks" dir="auto">${aman(s.teks)}</p>`;

  if (pg) {
    // arah tiap pilihan ikut isinya sendiri (jawaban Arab rata kanan, jawaban Indonesia rata kiri)
    html += `<ol class="pilihan">`;
    (s.pilihan || []).forEach((teks, i) => {
      if (!teks) return;
      const kunci = i === s.kunci;
      html += `<li class="${kunci ? "benar" : ""}" dir="${arah(teks)}"><b dir="ltr">${HURUF[i]}</b> <span dir="auto">${aman(teks)}</span>${kunci ? `<span class="sr">(kunci jawaban)</span>` : ""}</li>`;
    });
    html += `</ol>`;
  } else {
    html += `<div class="pedoman"><span>Pedoman jawaban</span><p dir="auto">${aman(s.pedoman || "-")}</p></div>`;
  }

  if (o.mode !== "lihat") {
    const id = o.kunciGeser || s.id;
    html += `
      <div class="soal-aksi">
        <button class="panah" data-naik="${aman(id)}" aria-label="Naikkan soal" ${o.pertama ? "disabled" : ""}>↑</button>
        <button class="panah" data-turun="${aman(id)}" aria-label="Turunkan soal" ${o.terakhir ? "disabled" : ""}>↓</button>
        <span class="spasi"></span>`;
    if (o.mode === "modul") {
      html += `<button data-edit="${aman(s.id)}">Ubah</button><button data-hapus="${aman(s.id)}" class="hapus">Hapus</button>`;
    } else if (o.ubahUjian) {
      html += `<button data-ubah-ujian="${aman(s.id)}">Ubah</button><button data-lepas="${aman(id)}" class="hapus">Hapus</button>`;
    } else {
      html += `<button data-lepas="${aman(id)}">Keluarkan</button>`;
    }
    html += `</div>`;
  }
  return html + `</article>`;
}

// ---- isian soal (dipakai form soal modul & form soal khusus ujian) ----
function htmlIsianSoal(s) {
  let opsiHtml = "";
  HURUF.forEach((h, i) => {
    const isian = (s.pilihan && s.pilihan[i]) || "";
    opsiHtml += `
      <div class="opsi">
        <input type="radio" name="kunci" value="${i}" id="kunci${i}" ${i === (s.kunci || 0) ? "checked" : ""}>
        <label for="kunci${i}" class="huruf" title="Jadikan kunci jawaban">${h}</label>
        <input name="pilihan${i}" value="${aman(isian)}" maxlength="${BATAS_SOAL.pilihan}" placeholder="Jawaban ${h}${i === 4 ? " (opsional)" : ""}" aria-label="Jawaban ${h}">
      </div>`;
  });
  return `
      <label>Pertanyaan
        <textarea name="teks" rows="4" class="teks-serif" required maxlength="${BATAS_SOAL.teks}" placeholder="Ketik soalnya di sini...">${aman(s.teks || "")}</textarea>
      </label>

      <fieldset>
        <legend>Jenis soal</legend>
        <div class="pilih-jenis">
          <label class="radio"><input type="radio" name="jenis" value="PG" ${s.jenis !== "Esai" ? "checked" : ""}> Pilihan ganda</label>
          <label class="radio"><input type="radio" name="jenis" value="Esai" ${s.jenis === "Esai" ? "checked" : ""}> Esai</label>
        </div>
      </fieldset>

      <fieldset id="bagianPG">
        <legend>Pilihan jawaban</legend>
        <p class="info">Klik huruf jawaban yang benar untuk menandainya sebagai kunci.</p>
        ${opsiHtml}
      </fieldset>

      <label id="bagianEsai">Pedoman jawaban
        <textarea name="pedoman" rows="3" maxlength="${BATAS_SOAL.pedoman}" placeholder="Poin-poin jawaban yang diharapkan">${aman(s.pedoman || "")}</textarea>
      </label>`;
}

function pasangIsianSoal(form) {
  function aturJenis() {
    const pg = form.jenis.value === "PG";
    document.getElementById("bagianPG").hidden = !pg;
    document.getElementById("bagianEsai").hidden = pg;
  }
  form.querySelectorAll('[name="jenis"]').forEach(r => r.onchange = aturJenis);
  aturJenis();
}

// hasilnya { soal } atau { galat: "pesan" }
function bacaIsianSoal(form, id) {
  const f = new FormData(form);
  const soal = { id, teks: f.get("teks").trim(), jenis: f.get("jenis") };
  if (soal.jenis === "PG") {
    soal.pilihan = HURUF.map((h, i) => f.get("pilihan" + i).trim());
    soal.kunci = Number(f.get("kunci"));
    if (soal.pilihan.filter(x => x).length < 2) return { galat: "Isi minimal 2 pilihan jawaban." };
    if (!soal.pilihan[soal.kunci]) return { galat: "Kunci jawaban yang dipilih masih kosong. Isi jawabannya atau pilih huruf lain." };
  } else {
    soal.pedoman = f.get("pedoman").trim();
  }
  const galat = galatPanjangSoal(soal);
  if (galat) return { galat };
  return { soal: rapikanSoal(soal) };
}

function formSoal() {
  const mp = mapelAktif();
  const m = modAktif();
  if (!bisaDiubahDi(mp.id, m, modulMapel(mp.id))) throw new DataHilang();
  const lama = posisi.soalId ? butuh((m.soal || []).find(s => s.id === posisi.soalId)) : null;
  const bacaan = m.bacaan || [];
  const pertemuan = m.pertemuan || [];
  const s = lama || {
    teks: "", jenis: "PG", pilihan: ["", "", "", "", ""], kunci: 0, pedoman: "",
    bacaanId: posisi.bacaanPilih || null,
    pertemuanId: posisi.pertemuanPilih || (posisi.bacaanPilih
      ? ((m.soal || []).find(x => x.bacaanId === posisi.bacaanPilih) || {}).pertemuanId || null
      : null)
  };

  judul.textContent = lama ? "Ubah soal" : "Tambah soal";
  jejak.textContent = m.judul;
  tombolKembali.hidden = false;

  const opsiPertemuan = pertemuan.map((p, i) =>
    `<option value="${aman(p.id)}" ${s.pertemuanId === p.id ? "selected" : ""}>Pertemuan ${i + 1}${p.target ? ": " + aman(potong(p.target, 50)) : ""}</option>`).join("");
  const opsiBacaan = bacaan.map(b =>
    `<option value="${aman(b.id)}" ${s.bacaanId === b.id ? "selected" : ""}>${aman(b.judul || potong(b.teks, 40))}</option>`).join("");

  isi.innerHTML = `
    <form id="form">
      ${pertemuan.length ? `
        <label>Untuk pertemuan
          <select name="pertemuanId">
            ${opsiPertemuan}
            <option value="" ${!pertemuanSoal(m, s) ? "selected" : ""}>Belum ditentukan</option>
          </select>
        </label>` : ""}

      ${bacaan.length ? `
        <label>Teks bacaan (opsional)
          <select name="bacaanId">
            <option value="">Tanpa teks bacaan</option>
            ${opsiBacaan}
          </select>
        </label>
        <p class="bacaan-pratinjau kutipan" id="pratinjauBacaan"></p>` : ""}

      ${htmlIsianSoal(s)}

      <button type="submit" class="tombol-utama">Simpan soal</button>
    </form>`;

  const form = document.getElementById("form");
  pasangIsianSoal(form);

  const pilihBacaan = form.bacaanId;
  function aturBacaan() {
    const tempat = document.getElementById("pratinjauBacaan");
    const b = bacaan.find(x => x.id === pilihBacaan.value);
    tempat.hidden = !b;
    tempat.textContent = b ? b.teks : "";
    tempat.dir = "auto";
  }
  if (pilihBacaan) {
    pilihBacaan.onchange = aturBacaan;
    aturBacaan();
  }

  form.onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(form);
    const hasil = bacaIsianSoal(form, lama ? lama.id : buatId());
    if (hasil.galat) return kabar(hasil.galat);
    // "dibuat" dipakai beranda buat ngitung soal baru bulan ini
    const baru = rapikanSoal({ ...hasil.soal, bacaanId: f.get("bacaanId") || null, pertemuanId: f.get("pertemuanId") || null, dibuat: (lama && lama.dibuat) || Date.now() });

    const t = modulMapel(mp.id).find(y => y.id === m.id);
    if (!t) {
      kabar("Modul ini sudah dihapus (mungkin dari perangkat lain).");
      return pergi("mapel", { tab: "modul" });
    }
    const daftar = [...(t.soal || [])];
    const i = lama ? daftar.findIndex(x => x.id === lama.id) : -1;
    if (i >= 0) {
      daftar[i] = baru;
    } else {
      // soal baru ditaruh setelah soal terakhir yang teks bacaannya sama,
      // atau setelah soal terakhir di pertemuan yang sama
      let pos = -1;
      if (baru.bacaanId) daftar.forEach((x, j) => { if (x.bacaanId === baru.bacaanId) pos = j; });
      if (pos < 0) daftar.forEach((x, j) => { if ((x.pertemuanId || null) === baru.pertemuanId) pos = j; });
      if (pos >= 0) daftar.splice(pos + 1, 0, baru);
      else daftar.push(baru);
    }
    if (!simpanModul(mp.id, { ...t, soal: daftar })) return;   // kegedean: isian soal tetap di form
    pergi("modul");
    // langsung lompat ke pertemuan soal tadi
    const tujuan = baru.pertemuanId && document.getElementById(`pertemuan-${baru.pertemuanId}`);
    if (tujuan) tujuan.scrollIntoView({ block: "start" });
  };
}

// =====================================================
//  SALIN MODUL KE SEMESTER / TAHUN AJARAN LAIN
//  Semua pertemuan, teks bacaan, dan soal ikut disalin dengan id baru,
//  jadi salinannya bisa diubah tanpa ngerusak yang lama.
// =====================================================
function salinModulBaru(m, tujuan) {
  const petaPertemuan = {}, petaBacaan = {};
  const pertemuan = (m.pertemuan || []).map(p => { const id = buatId(); petaPertemuan[p.id] = id; return { ...p, id }; });
  const bacaan = (m.bacaan || []).map(b => { const id = buatId(); petaBacaan[b.id] = id; return { ...b, id }; });
  const soal = (m.soal || []).map(s => ({
    ...salin(s),
    id: buatId(),
    pertemuanId: s.pertemuanId ? (petaPertemuan[s.pertemuanId] || null) : null,
    bacaanId: s.bacaanId ? (petaBacaan[s.bacaanId] || null) : null
  }));
  return {
    id: buatId(),
    semester: tujuan.semester, tahun: tujuan.tahun,
    judul: m.judul, catatan: m.catatan || "", link: m.link || "",
    dibagikan: false,
    pertemuan, bacaan, soal
  };
}

function formSalin() {
  const mp = mapelAktif();
  if (!sayaPengampu(mp)) throw new DataHilang();
  const sem = semAktif();
  const milik = modulMapel(mp.id).filter(m => milikSaya(m) && samaSemester(m, sem));
  if (milik.length === 0) throw new DataHilang();

  // tebakan tujuan: semester yang sama, tahun ajaran berikutnya
  const cocok = (sem.tahun || "").match(/(\d{4})\D+(\d{4})/);
  const tahunBerikut = cocok ? `${Number(cocok[1]) + 1}/${Number(cocok[2]) + 1}` : "";
  const opsiSemester = ["Ganjil", "Genap"].map(x => `<option ${sem.semester === x ? "selected" : ""}>${x}</option>`).join("");

  judul.textContent = "Salin modul";
  jejak.textContent = `${namaMapel(mp)}, dari ${namaSemester(sem)}`;
  tombolKembali.hidden = false;

  isi.innerHTML = `
    <p class="info">Modul yang dipilih disalin lengkap dengan pertemuan, target capaian, teks bacaan, dan soalnya. Yang lama tetap aman, jadi modul tahun lalu bisa dipakai ulang lalu diubah. Salinannya tertutup dulu.</p>
    <form id="form">
      <fieldset>
        <legend>Modul yang disalin</legend>
        <div class="kolom daftar-centang">
          ${milik.map(m => `
            <label class="centang">
              <input type="checkbox" name="modul" value="${aman(m.id)}" ${!posisi.salinModul || posisi.salinModul === m.id ? "checked" : ""}>
              <span dir="auto">${aman(m.judul)} <small>${(m.pertemuan || []).length} pertemuan, ${jumlahSoal(m)} soal</small></span>
            </label>`).join("")}
        </div>
      </fieldset>
      <div class="dua-kolom">
        <label>Ke semester <select name="semester">${opsiSemester}</select></label>
        <label>Tahun ajaran <input name="tahun" value="${aman(tahunBerikut)}" placeholder="2027/2028" required pattern="\\d{4}/\\d{4}" title="Contoh: 2027/2028"></label>
      </div>
      <button type="submit" class="tombol-utama">Salin sekarang</button>
    </form>`;

  document.getElementById("form").onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const dipilih = f.getAll("modul");
    if (dipilih.length === 0) return kabar("Centang minimal satu modul.");
    const tujuan = { semester: f.get("semester"), tahun: f.get("tahun").trim() };
    if (kunciSemester(tujuan) === kunciSemester(sem) &&
        !(await tanyaYakin("Tujuannya sama dengan semester asal, jadi bakal ada modul kembar di semester ini. Lanjut?", { ya: "Lanjut" }))) return;

    const sudahAda = modulMapel(mp.id).filter(m => milikSaya(m) && samaSemester(m, tujuan)).map(m => m.judul.toLowerCase());
    const kembar = milik.filter(m => dipilih.includes(m.id) && sudahAda.includes(m.judul.toLowerCase()));
    if (kembar.length && kunciSemester(tujuan) !== kunciSemester(sem) &&
        !(await tanyaYakin(`Di ${namaSemester(tujuan)} sudah ada modul dengan judul sama:\n\n${kembar.map(m => "• " + m.judul).join("\n")}\n\nTetap salin?`, { ya: "Tetap salin" }))) return;

    const jam = Date.now();
    milik.filter(m => dipilih.includes(m.id)).forEach((m, i) => {
      simpanModul(mp.id, { ...salinModulBaru(m, tujuan), dibuat: jam + i });
    });
    kabar(`${dipilih.length} modul berhasil disalin ke ${namaSemester(tujuan)}.`);
    pergi("mapel", { semester: kunciSemester(tujuan), tab: "modul" });
  };
}