// =====================================================
//  formmodul.js — form modul ajar (judul, file, tujuan, pertemuan,
//                 hubungan modul), form teks bacaan, dan form soal formatif.
//  Layar modulnya sendiri ada di modul.js.
// =====================================================

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
        <p class="info">Agar terlihat urutan materinya. Pilihannya modul Anda dan modul yang dibagikan di ${aman(namaGrup(mp))}.</p>
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
      <p class="info">Unggah file modulnya ke Google Drive, atur aksesnya jadi "Siapa saja yang memiliki link", lalu tempel link-nya di sini. Isinya nanti tampil langsung di halaman modul.</p>

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
        if (dipakai && !(await tanyaYakin(`${dipakai} soal ditandai untuk pertemuan ini. Soalnya tetap ada, hanya pindah ke "Soal lainnya". Hapus pertemuan ini?`, { bahaya: true, ya: "Hapus pertemuan" }))) return;
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
      const terbaru = modulTerbaru(mp.id, lama.id);
      if (!terbaru) return;
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

  const ambilModulTerbaru = () => modulTerbaru(mp.id, m.id);

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
        ? `Hapus teks ini? ${dipakai.length} soal yang memakainya tetap ada, hanya tidak punya teks bacaan lagi.`
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

    const t = modulTerbaru(mp.id, m.id);
    if (!t) return;
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
