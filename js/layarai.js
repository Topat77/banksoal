// =====================================================
//  layarai.js — layar "Buat soal dengan AI" (bahan, draft, simpan)
//               dan pintu depannya, AI Generator.
//  Susun perintah, baca jawaban & jatah AI ada di ai.js.
// =====================================================

// =====================================================
//  LAYAR: BUAT SOAL PAKAI AI
// =====================================================
function layarAISoal() {
  const mp = mapelAktif();
  const bahan = bahanAI(mp);
  if (!drafAI || drafAI.kunci !== kunciDrafAI()) drafAI = drafBaru(bahan);
  const d = drafAI;
  const coba = toko.backend.mode === "coba";
  const keModul = bahan.untuk === "modul";

  judul.textContent = keModul ? "Buat soal dengan AI" : bahan.usul ? "Usulkan soal UAS menggunakan AI" : "Buat soal ujian dengan AI";
  jejak.textContent = keModul ? `${bahan.modul.judul}` : `${bahan.sum.nama} · ${namaMapel(mp)}`;
  tombolKembali.hidden = false;

  const htmlPilihan = bahan.pilihan.length ? bahan.pilihan.map(x => `
      <label class="centang">
        <input type="checkbox" name="pilihBahan" value="${aman(x.id)}" ${d.pilih.includes(x.id) ? "checked" : ""}>
        <span dir="auto">${aman(x.label)} <small dir="auto">${aman(potong(x.sub, 90))}</small></span>
      </label>`).join("")
    : `<p class="info">${keModul ? "Modul ini belum punya pertemuan. Isi target capaiannya dulu, atau gunakan ringkasan materi / PDF." : "Belum ada modul di semester ini. Gunakan ringkasan materi / PDF saja."}</p>`;

  isi.innerHTML = `
    <div class="layar-ai">
      ${jatahAIHabis() ? `<p class="pemberitahuan-kecil">Jatah AI gratis hari ini sudah habis. AI bisa dipakai lagi ${aman(teksResetAI())}.</p>` : ""}
      ${htmlPetunjukAI(keModul ? "modul" : bahan.usul ? "usul" : "ujian")}
      ${coba ? `<p class="pemberitahuan-kecil">Mode coba: soal yang keluar di sini <b>contoh tiruan</b>, bukan buatan AI sungguhan. AI aslinya jalan setelah Firebase disambungkan.</p>` : ""}
      <section class="bagian">
        <h2>Bahan untuk AI</h2>
        <fieldset>
          <legend>a. ${keModul ? "Judul &amp; target capaian" : "Modul yang diujikan"}</legend>
          <div class="kolom daftar-centang">${htmlPilihan}</div>
          ${keModul && bahan.bacaan.length ? `
          <label class="centang">
            <input type="checkbox" id="pakaiBacaan" ${d.pakaiBacaan ? "checked" : ""}>
            <span>Boleh membuat soal dari teks bacaan modul <small>${bahan.bacaan.length} teks</small></span>
          </label>` : ""}
        </fieldset>
        <label for="ringkasanAI">b. Ringkasan materi (opsional)</label>
        <textarea id="ringkasanAI" rows="4" dir="auto" placeholder="Tempel atau ketik ringkasan materinya di sini. Makin jelas, makin bagus soalnya.">${aman(d.ringkasan)}</textarea>
        <div class="isian-pdf">
          <span class="label-isian">c. File PDF modul (opsional)</span>
          <button type="button" class="tombol-kedua pilih-file" id="pilihPdfAI">Pilih file PDF</button>
          <input type="file" id="pdfAI" accept="application/pdf" hidden>
          <span class="info" id="namaPdf">${d.pdf ? `${aman(d.pdf.nama)} <button class="tombol-teks merah" id="lepasPdf" type="button">Lepas</button>` : `Maks. ${AI_MAKS_PDF_MB} MB. Link Google Drive tidak bisa dibaca AI, jadi unduh dulu PDF-nya lalu pilih di sini.`}</span>
        </div>
        ${!d.pdf && keModul && modulDriveAI(bahan, d).length ? `<p class="pemberitahuan-kecil" id="ingatDrive">${PESAN_DRIVE_AI}</p>` : ""}
      </section>

      <section class="bagian">
        <h2>Soal yang ingin dibuat</h2>
        <div class="dua-kolom">
          <label>Pilihan ganda <input type="number" id="jumlahPG" min="0" max="${AI_MAKS_PG}" value="${d.jumlahPG}" inputmode="numeric"></label>
          <label>Esai <input type="number" id="jumlahEsai" min="0" max="${AI_MAKS_ESAI}" value="${d.jumlahEsai}" inputmode="numeric"></label>
          <label>Tingkat kesulitan <select id="tingkatAI">${Object.entries(TINGKAT_AI).map(([k, v]) => `<option value="${k}" ${d.tingkat === k ? "selected" : ""}>${v}</option>`).join("")}</select></label>
          <label>Bahasa soal <select id="bahasaAI">${Object.entries(BAHASA_AI).map(([k, v]) => `<option value="${k}" ${d.bahasa === k ? "selected" : ""}>${v}</option>`).join("")}</select></label>
        </div>
        <label>Permintaan tambahan (opsional) <input id="catatanAI" value="${aman(d.catatan)}" placeholder="Misalnya: menggunakan contoh kegiatan di pondok"></label>
        <div class="baris-tombol">
          <button class="tombol-utama tombol-ai" id="buatAI">${IKON_AI}<span>${d.soal.length ? "Buat lagi (ditambah ke draft)" : "Buat draft soal"}</span></button>
          <span class="info" id="statusAI" role="status" aria-live="polite"></span>
        </div>
        <p class="info kecil">Yang dikirim ke AI hanya isi modul di atas. Data siswa dan nilai tidak pernah dikirim. Hasil AI bisa salah, jadi periksa dulu tiap soal dan kuncinya sebelum disimpan.</p>
      </section>

      <div id="wadahDraf"></div>
    </div>`;

  // ---------- isian bahan ----------
  isi.querySelectorAll('[name="pilihBahan"]').forEach(c => c.onchange = () => {
    d.pilih = [...isi.querySelectorAll('[name="pilihBahan"]:checked')].map(x => x.value);
  });
  const pb = document.getElementById("pakaiBacaan");
  if (pb) pb.onchange = () => { d.pakaiBacaan = pb.checked; };
  document.getElementById("ringkasanAI").oninput = (e) => { d.ringkasan = e.target.value; };
  document.getElementById("catatanAI").oninput = (e) => { d.catatan = e.target.value; };
  document.getElementById("tingkatAI").onchange = (e) => { d.tingkat = e.target.value; };
  document.getElementById("bahasaAI").onchange = (e) => { d.bahasa = e.target.value; };
  const angka = (id, maks, kunci) => {
    const el = document.getElementById(id);
    el.oninput = () => { d[kunci] = Math.max(0, Math.min(maks, Math.round(Number(el.value) || 0))); };
  };
  angka("jumlahPG", AI_MAKS_PG, "jumlahPG");
  angka("jumlahEsai", AI_MAKS_ESAI, "jumlahEsai");

  const status = document.getElementById("statusAI");
  const pasangLepasPdf = () => {
    klik("lepasPdf", () => { d.pdf = null; tampilkan(true); });
  };
  pasangLepasPdf();
  // tombol biasa (bisa difokus keyboard) yang ngebuka pemilih file
  document.getElementById("pilihPdfAI").onclick = () => document.getElementById("pdfAI").click();
  document.getElementById("pdfAI").onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.type && f.type !== "application/pdf") { status.textContent = "Filenya harus PDF."; return; }
    if (f.size > AI_MAKS_PDF_MB * 1024 * 1024) { status.textContent = `File-nya ${(f.size / 1048576).toFixed(1)} MB, terlalu besar. Maksimal ${AI_MAKS_PDF_MB} MB.`; return; }
    status.textContent = "Membaca file...";
    try {
      d.pdf = { nama: f.name, mime: "application/pdf", ukuran: f.size, data: await bacaFileBase64(f) };
      status.textContent = "";
      document.getElementById("namaPdf").innerHTML = `${aman(f.name)} <button class="tombol-teks merah" id="lepasPdf" type="button">Lepas</button>`;
      const ingatDrive = document.getElementById("ingatDrive");
      if (ingatDrive) ingatDrive.hidden = true;
      pasangLepasPdf();
    } catch {
      status.textContent = "File-nya gagal dibaca. Coba pilih ulang.";
    }
  };

  // ---------- minta ke AI ----------
  const tombol = document.getElementById("buatAI");
  tombol.onclick = async () => {
    if (d.jumlahPG + d.jumlahEsai === 0) { status.textContent = "Isi jumlah soalnya dulu."; return; }
    const adaBahan = d.pilih.length || d.ringkasan.trim() || d.pdf || (keModul && d.pakaiBacaan && bahan.bacaan.length);
    if (!adaBahan) { status.textContent = "Pilih minimal satu bahan: target capaian, ringkasan materi, atau file PDF."; return; }
    if (!navigator.onLine && !coba) { status.textContent = pesanGagalAI(new Error("network")); return; }
    if (!toko.backend.tanyaAI) { status.textContent = "Fitur AI belum tersedia di versi ini."; return; }

    // bahan tipis / file cuma di Drive: AI gampang ngarang, jadi diingetin dulu
    if (!d.pdf) {
      const ingat = [];
      if (panjangBahanAI(bahan, d) < AI_BAHAN_TIPIS) ingat.push("Bahannya masih sedikit. Jika bahannya tipis, AI mudah mengarang fakta, dalil, atau contoh yang tidak ada di materi. Agar lebih akurat, tempel ringkasan materi atau pilih file PDF modulnya.");
      if (modulDriveAI(bahan, d).length) ingat.push(PESAN_DRIVE_AI);
      if (ingat.length && !(await tanyaYakin(`${ingat.join("\n\n")}\n\nTetap membuat soal sekarang?`, { ya: "Tetap membuat" }))) return;
    }

    tombol.disabled = true;
    // detik berjalan, biar kelihatan prosesnya masih jalan (bukan macet)
    const mulai = Date.now();
    let keterangan = "AI sedang menyusun soal...";
    const tulisStatus = () => { status.textContent = `${keterangan} ${Math.round((Date.now() - mulai) / 1000)} detik`; };
    tulisStatus();
    const jam = setInterval(tulisStatus, 1000);
    try {
      const jawaban = await toko.backend.tanyaAI({
        perintah: susunPerintahAI(bahan, d),
        pdf: d.pdf ? { mime: d.pdf.mime, data: d.pdf.data } : null,
        bahan: {
          untuk: bahan.untuk, mapel: bahan.mapel.nama,
          pertemuan: bahan.pilihan.filter(x => d.pilih.includes(x.id)).map(x => ({ nomor: x.nomor, judul: x.label, target: keModul ? x.pertemuan.target : (x.modul.pertemuan || []).map(p => p.target).filter(Boolean).join("; ") })),
          ringkasan: d.ringkasan, jumlahPG: d.jumlahPG, jumlahEsai: d.jumlahEsai, bacaan: keModul && d.pakaiBacaan ? bahan.bacaan.length : 0
        }
      }, (teks) => { keterangan = teks; tulisStatus(); });
      clearInterval(jam);
      if (drafAI !== d || posisi.layar !== "aiSoal") return;   // udah pindah layar
      const baru = bacaJawabanAI(jawaban, bahan);
      d.soal.push(...baru);
      const ragu = baru.filter(x => x.ragu).length;
      const diminta = d.jumlahPG + d.jumlahEsai;
      status.textContent = `${baru.length} soal baru masuk draft.${baru.length < diminta ? ` (Diminta ${diminta}; AI membuat lebih sedikit karena bahannya terbatas.)` : ""}${ragu ? ` ${ragu} soal kuncinya belum jelas, mohon diperiksa.` : ""}`;
      tombol.querySelector("span").textContent = "Buat lagi (ditambah ke draft)";
      gambarDraf();
      document.getElementById("wadahDraf").scrollIntoView({ block: "start", behavior: "smooth" });
    } catch (err) {
      console.warn("AI gagal:", err);
      clearInterval(jam);
      status.textContent = pesanGagalAILengkap(err);
    } finally {
      clearInterval(jam);
      tombol.disabled = false;
    }
  };

  // ---------- draft ----------
  function gambarDraf() {
    const wadah = document.getElementById("wadahDraf");
    if (!wadah) return;
    if (d.soal.length === 0) { wadah.innerHTML = ""; return; }
    const opsiPertemuan = (s) => bahan.pilihan.map(x =>
      `<option value="${aman(x.id)}" ${s.pertemuanId === x.id ? "selected" : ""}>${aman(x.label)}</option>`).join("") +
      `<option value="" ${!s.pertemuanId ? "selected" : ""}>Belum ditentukan</option>`;
    const htmlSoal = (s, i) => `
      <article class="soal draf-ai ${s.pakai ? "" : "dibuang"}" data-draf="${aman(s.id)}">
        <div class="soal-atas">
          <label class="pakai-draf"><input type="checkbox" data-pakai ${s.pakai ? "checked" : ""}> <span>Pakai</span></label>
          <span class="nomor">${i + 1}.</span>
          <span class="jenis">${s.jenis === "PG" ? "Pilihan ganda" : "Esai"}</span>
          ${s.bacaanId ? `<span class="label-bacaan">Teks: ${aman(potong((bahan.bacaan.find(b => b.id === s.bacaanId) || {}).judul || "bacaan", 24))}</span>` : ""}
          ${s.ragu ? `<span class="tanda-ragu">Periksa kuncinya</span>` : ""}
          <span class="spasi"></span>
          <button class="tombol-teks merah" data-buang>Buang</button>
        </div>
        ${keModul && bahan.pilihan.length ? `<label class="isian-kecil">Untuk <select data-f="pertemuanId" aria-label="Untuk pertemuan">${opsiPertemuan(s)}</select></label>` : ""}
        <textarea data-f="teks" rows="3" class="teks-serif" dir="auto" aria-label="Pertanyaan soal ${i + 1}">${aman(s.teks)}</textarea>
        ${s.jenis === "PG" ? `<div class="kolom">${HURUF.map((h, j) => `
          <div class="opsi">
            <input type="radio" name="kunci-${aman(s.id)}" value="${j}" id="k-${aman(s.id)}-${j}" ${s.kunci === j ? "checked" : ""}>
            <label for="k-${aman(s.id)}-${j}" class="huruf" title="Jadikan kunci jawaban">${h}</label>
            <input data-pilihan="${j}" value="${aman(s.pilihan[j] || "")}" dir="auto" placeholder="Jawaban ${h}${j >= 4 ? " (opsional)" : ""}" aria-label="Soal ${i + 1} jawaban ${h}">
          </div>`).join("")}</div>`
        : `<label class="isian-kecil">Pedoman jawaban <textarea data-f="pedoman" rows="3" dir="auto">${aman(s.pedoman)}</textarea></label>`}
        <p class="pesan-draf" role="alert"></p>
      </article>`;

    const dipakai = d.soal.filter(s => s.pakai).length;
    wadah.innerHTML = `
      <h2 class="subjudul">Draft soal <small id="hitungDraf">${d.soal.length} soal · ${dipakai} dipakai</small></h2>
      <p class="info">Periksa tiap soal. Bisa langsung diedit di sini, kunci jawaban ditandai huruf yang dilingkari merah. Hilangkan centang "Pakai" atau tekan Buang untuk soal yang tidak cocok.</p>
      <div class="kolom">${d.soal.map(htmlSoal).join("")}</div>
      <div class="baris-tombol bawah-draf">
        <button class="tombol-utama" id="simpanDraf">${labelSimpanAI(bahan, dipakai)}</button>
        <button class="tombol-teks merah" id="kosongkanDraf">Kosongkan draft</button>
      </div>`;

    const segarkanHitung = () => {
      const n = d.soal.filter(s => s.pakai).length;
      document.getElementById("hitungDraf").textContent = `${d.soal.length} soal · ${n} dipakai`;
      document.getElementById("simpanDraf").textContent = labelSimpanAI(bahan, n);
    };

    wadah.querySelectorAll("[data-draf]").forEach(el => {
      const s = d.soal.find(x => x.id === el.dataset.draf);
      el.querySelector("[data-pakai]").onchange = (e) => { s.pakai = e.target.checked; el.classList.toggle("dibuang", !s.pakai); segarkanHitung(); };
      el.querySelector("[data-buang]").onclick = () => { d.soal = d.soal.filter(x => x !== s); gambarDraf(); };
      el.querySelectorAll("[data-f]").forEach(inp => inp.oninput = inp.onchange = () => { s[inp.dataset.f] = inp.value || (inp.dataset.f === "pertemuanId" ? null : ""); });
      el.querySelectorAll("[data-pilihan]").forEach(inp => inp.oninput = () => { s.pilihan[Number(inp.dataset.pilihan)] = inp.value; });
      el.querySelectorAll(`[name="kunci-${CSS.escape(s.id)}"]`).forEach(r => r.onchange = () => { s.kunci = Number(r.value); s.ragu = false; const t = el.querySelector(".tanda-ragu"); if (t) t.remove(); });
    });

    document.getElementById("kosongkanDraf").onclick = async () => {
      if (!(await tanyaYakin(`Buang semua ${d.soal.length} soal di draft?`, { bahaya: true, ya: "Buang semua" }))) return;
      d.soal = [];
      gambarDraf();
      tombol.querySelector("span").textContent = "Buat draft soal";
    };
    document.getElementById("simpanDraf").onclick = () => simpanDrafAI(bahan, d, wadah, gambarDraf);
  }
  gambarDraf();
  // dari tombol "Buatkan soal" di modul: langsung jalan (sekali aja, dan cuma kalau draft masih kosong)
  if (posisi.aiLangsung) {
    posisi.aiLangsung = false;
    if (d.soal.length === 0) setTimeout(() => {
      if (!tombol.isConnected || tombol.disabled) return;
      tombol.scrollIntoView({ block: "center" });
      tombol.click();
    }, 0);
  }
}

// cek & rapikan draft yang dicentang, lalu simpan
function simpanDrafAI(bahan, d, wadah, gambarUlang) {
  const dipakai = d.soal.filter(s => s.pakai);
  if (dipakai.length === 0) { kabar("Belum ada soal yang dicentang \"Pakai\"."); return; }

  let salah = 0;
  const siap = [];
  for (const s of dipakai) {
    const el = wadah.querySelector(`[data-draf="${CSS.escape(s.id)}"]`);
    const pesan = el && el.querySelector(".pesan-draf");
    let galat = "";
    const teks = s.teks.trim();
    const pilihan = s.pilihan.map(x => (x || "").trim());
    if (!teks) galat = "Pertanyaannya masih kosong.";
    else if (s.jenis === "PG" && pilihan.filter(Boolean).length < 2) galat = "Isi minimal 2 pilihan jawaban.";
    else if (s.jenis === "PG" && !pilihan[s.kunci]) galat = "Kunci jawaban yang dipilih masih kosong.";
    else galat = galatPanjangSoal({ teks, pilihan: s.jenis === "PG" ? pilihan : [], pedoman: s.jenis === "PG" ? "" : s.pedoman });
    if (pesan) pesan.textContent = galat;
    if (el) el.classList.toggle("ada-salah", !!galat);
    if (galat) { salah++; continue; }
    siap.push(rapikanSoal(s.jenis === "PG"
      ? { id: buatId(), jenis: "PG", teks, pilihan, kunci: s.kunci, pertemuanId: s.pertemuanId || null, bacaanId: s.bacaanId || null, dibuat: Date.now() }
      : { id: buatId(), jenis: "Esai", teks, pedoman: (s.pedoman || "").trim(), pertemuanId: s.pertemuanId || null, bacaanId: s.bacaanId || null, dibuat: Date.now() }));
  }
  if (salah) {
    const pertama = wadah.querySelector(".ada-salah");
    if (pertama) pertama.scrollIntoView({ block: "center" });
    kabar(`${salah} soal masih ada yang kurang. Lihat tulisan merah di soalnya.`);
    return;
  }

  const mp = bahan.mapel;
  if (bahan.untuk === "modul") {
    const t = modulTerbaru(mp.id, bahan.modul.id);
    if (!t) return;
    if (!simpanModul(mp.id, { ...t, soal: [...(t.soal || []), ...siap] })) return;   // kegedean: draft tetap ada
    drafAI = null;
    pergi("modul", { aiPertemuan: null });
  } else {
    const t = ujianTerbaru(mp.id, bahan.sum.id);
    if (!t) { kabar("Ujian ini sudah dihapus (mungkin dari perangkat lain)."); return kembaliKeDaftar(); }
    if (bahan.usul) {
      if (t.status === "dikunci") { kabar("UAS ini sudah dikunci TU, jadi tidak bisa diusulkan soal lagi."); return pergi("sumatif", { usul: false }); }
      // siap[i] = dipakai[i] (kalau ada yang salah, udah balik di atas)
      const terkirim = new Set();
      siap.forEach((s, i) => {
        const jadi = simpanUsulan(posisi.uasGrup, {
          id: buatId(), semester: t.semester, tahun: t.tahun,
          modulId: MODUL_UJIAN, soalId: s.id,
          salinan: { soal: { ...s, pertemuanId: null, bacaanId: null }, bacaan: null, judulModul: "Soal buatan AI", namaPemilik: namaSaya() },
          catatan: ""
        });
        if (jadi) terkirim.add(dipakai[i]);
      });
      if (terkirim.size < siap.length) {
        // yang kegedean tetap di draft (yang udah terkirim dibuang, biar nggak dobel kalau dikirim ulang)
        d.soal = d.soal.filter(s => !terkirim.has(s));
        return gambarUlang();
      }
      drafAI = null;
      kabar(`${siap.length} soal sudah dikirim sebagai usulan. Koordinator yang memutuskan dipakai atau tidak.`);
      return pergi("sumatif", { usul: false });
    }
    const butir = [...(t.butir || []), ...siap.map(s => ({
      modulId: MODUL_UJIAN, soalId: s.id,
      salinan: { soal: { ...s, pertemuanId: null, bacaanId: null }, bacaan: null }
    }))];
    if (!simpanUjian(mp.id, { ...t, butir })) return;   // kegedean: draft tetap ada
    drafAI = null;
    pergi("sumatif");
  }
}

function labelSimpanAI(bahan, n) {
  if (bahan.untuk === "modul") return `Simpan ${n} soal ke modul`;
  return bahan.usul ? `Usulkan ${n} soal ke koordinator` : `Masukkan ${n} soal ke ujian`;
}

// =====================================================
//  AI GENERATOR — pintu depan buat bikin soal pakai AI
//  Guru pilih mapel & kelas, lalu soalnya mau masuk ke mana
//  (soal formatif di modul, atau ujian sumatif), terus lanjut
//  ke layar AI yang sama (layarAISoal) dengan bahan dari modul.
// =====================================================
function layarAIGenerator() {
  if (sayaKurikulum() && !mapelDiampu().length) throw new DataHilang();
  judul.textContent = "AI Generator soal";
  jejak.textContent = "Buat draft soal dari modul, cukup periksa & ubah";
  const diampu = [...mapelDiampu()].sort(urutMapelJenis);
  const sem = semesterSekarang();
  const pilihMapel = posisi.aiMapel && diampu.some(m => m.id === posisi.aiMapel) ? posisi.aiMapel : (diampu[0] && diampu[0].id);
  const mp = cariMapel(pilihMapel);
  const ke = posisi.aiKe === "sumatif" ? "sumatif" : "modul";

  let h = `<section class="kartu-sambut kecil"><div class="sambut-teks">
      <h2>Buat soal dengan AI</h2>
      <p>AI menyusun draft soal pilihan ganda & esai dari target capaian, ringkasan, atau PDF modul Anda. Anda tetap yang memeriksa dan menyimpan.</p>
    </div></section>`;
  if (!diampu.length) {
    isi.innerHTML = h + `<p class="kosong">Anda belum ditugaskan ke mapel mana pun. Minta admin (TU) menambahkan Anda sebagai pengampu.</p>`;
    return;
  }
  const modulSaya = modulMapel(mp.id).filter(m => bisaDiubahDi(mp.id, m, modulMapel(mp.id)) && samaSemester(m, sem));
  const ujianSaya = sumatifMapel(mp.id).filter(s => bisaDiubahDi(mp.id, s, sumatifMapel(mp.id)) && samaSemester(s, sem));
  const pilihan = ke === "modul" ? modulSaya : ujianSaya;

  h += `<form id="formAIGen" class="panel">
      <label>1. Mapel &amp; kelas
        <select id="aiMapel">${diampu.map(m => `<option value="${aman(m.id)}" data-ket="${aman(namaJenis(jenisMapel(m)))} · ${aman(m.jenjang)}" ${m.id === mp.id ? "selected" : ""}>${aman(namaMapel(m))}</option>`).join("")}</select>
      </label>
      <fieldset>
        <legend>2. Soalnya ingin dimasukkan ke mana?</legend>
        <div class="pilih-jenis">
          <label class="radio"><input type="radio" name="aiKe" value="modul" ${ke === "modul" ? "checked" : ""}> Soal formatif di modul</label>
          <label class="radio"><input type="radio" name="aiKe" value="sumatif" ${ke === "sumatif" ? "checked" : ""}> Ujian sumatif</label>
        </div>
      </fieldset>
      <label>3. ${ke === "modul" ? "Modul" : "Ujian"} (${aman(namaSemester(sem))})
        <select id="aiTujuan" ${pilihan.length ? "" : "disabled"}>${pilihan.length
          ? pilihan.map(x => `<option value="${aman(x.id)}" data-ket="${ke === "modul" ? `${(x.pertemuan || []).length} pertemuan, ${jumlahSoal(x)} soal` : `${(x.butir || []).length} soal`}">${aman(ke === "modul" ? x.judul : x.nama)}</option>`).join("")
          : `<option value="">${ke === "modul" ? "Belum ada modul" : "Belum ada ujian"}</option>`}</select>
      </label>
      ${pilihan.length ? "" : `<p class="info">${ke === "modul"
        ? "Buat modul dulu, isi target capaian tiap pertemuan. AI menggunakan isi modul itu sebagai bahan."
        : "Buat ujian sumatif dulu di tab Sumatif mapel ini, atau pilih “Soal formatif di modul”."}</p>`}
      <div class="baris-tombol">
        ${pilihan.length
          ? `<button type="submit" class="tombol-utama tombol-ai">${IKON_AI}<span>Lanjut membuat soal</span></button>`
          : `<button type="button" class="tombol-utama" id="aiBuatDulu">${ke === "modul" ? "+ Tambah modul ajar" : "+ Buat ujian sumatif"}</button>`}
      </div>
      <p class="info kecil">Yang dikirim ke AI hanya isi modul. Data siswa dan nilai tidak pernah dikirim. Soal UAS bersama dibuat dari halaman UAS-nya.</p>
    </form>`;
  isi.innerHTML = h;

  document.getElementById("aiMapel").onchange = (e) => pergi("aiGenerator", { aiMapel: e.target.value });
  isi.querySelectorAll('[name="aiKe"]').forEach(r => r.onchange = () => pergi("aiGenerator", { aiMapel: mp.id, aiKe: r.value }));
  // dariAI: tombol ‹ di layar berikutnya balik ke sini (lihat LAYAR_ALUR_AI di layar.js)
  const dariSini = { mapelId: mp.id, semester: kunciSemester(sem), dariAI: true };
  klik("aiBuatDulu", () => ke === "modul"
    ? pergi("formModul", { ...dariSini, modEditId: null })
    : pergi("formSumatif", { ...dariSini, sumEditId: null, uasGrup: null }));
  document.getElementById("formAIGen").onsubmit = (e) => {
    e.preventDefault();
    const id = document.getElementById("aiTujuan").value;
    if (!id) return;
    if (ke === "modul") pergi("aiSoal", { ...dariSini, aiUntuk: "modul", modId: id, aiPertemuan: null });
    else pergi("aiSoal", { ...dariSini, aiUntuk: "sumatif", sumId: id, uasGrup: null, usul: false });
  };
}
