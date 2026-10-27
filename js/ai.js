// =====================================================
//  ai.js — bikin DRAFT soal pakai AI (Gemini, lewat Firebase AI Logic)
//
//  Alurnya:
//    bahan dari modul (a. judul & target capaian, b. ringkasan materi,
//    c. file PDF modul)  →  perintah ke AI  →  jawaban JSON
//    →  draft soal yang bisa diedit guru  →  disimpan ke modul / ujian
//    (atau, buat guru di grup yang bukan koordinator: dikirim sebagai usulan soal UAS bersama).
//
//  Yang dikirim ke AI cuma isi modul. Data santri NGGAK PERNAH dikirim.
//  Soal hasil AI bentuknya sama persis kayak soal yang diketik manual,
//  jadi setelah disimpan, sisa aplikasi nggak perlu tahu asalnya dari AI.
//
//  Cara manggil AI-nya ada di backend (firebase.js / coba.js),
//  lewat satu fungsi: backend.tanyaAI({ perintah, pdf, bahan }).
// =====================================================

const AI_MAKS_PDF_MB = 15;
const AI_MAKS_PG = 30;
const AI_MAKS_ESAI = 10;
const TINGKAT_AI = { campur: "Campur", mudah: "Mudah", sedang: "Sedang", sulit: "Sulit (HOTS)" };
const BAHASA_AI = { ikut: "Ikut bahasa materi", indonesia: "Bahasa Indonesia", arab: "Bahasa Arab" };

// draft disimpan di memori biar nggak hilang waktu pindah layar sebentar
let drafAI = null;

function kunciDrafAI() {
  return `${posisi.aiUntuk}:${posisi.mapelId}:${posisi.aiUntuk === "sumatif" ? (posisi.uasGrup ? `uas-${posisi.uasGrup}-${posisi.uasSem}${posisi.usul ? "-usul" : ""}` : posisi.sumId) : posisi.modId}`;
}

// ---------- kumpulin bahan dari modul ----------
function bahanAI(mp) {
  if (posisi.aiUntuk === "sumatif") {
    const sum = sumAktif();
    // guru di grup (bukan koordinator) boleh bikin soal UAS pakai AI, hasilnya jadi usulan
    const usul = modeUAS() && !!posisi.usul && !sayaKoordinator(posisi.uasGrup);
    if (usul ? !bisaUsulUAS(sum) : !bolehUbahUjian(mp.id, sum)) throw new DataHilang();
    const modul = modulGrup(mp.id).filter(m => samaSemester(m, sum));
    return {
      untuk: "sumatif", usul, mapel: mp, sum, sem: sum,
      pilihan: modul.map(m => ({ id: m.id, label: m.judul, sub: `${(m.pertemuan || []).length} pertemuan`, modul: m })),
      bacaan: []
    };
  }
  const m = modAktif();
  if (!bisaDiubahDi(mp.id, m, modulMapel(mp.id))) throw new DataHilang();
  return {
    untuk: "modul", mapel: mp, modul: m, sem: m,
    pilihan: (m.pertemuan || []).map((p, i) => ({ id: p.id, label: `Pertemuan ${i + 1}`, sub: p.target || "Target belum diisi", pertemuan: p, nomor: i + 1 })),
    bacaan: m.bacaan || []
  };
}

function drafBaru(bahan) {
  return {
    kunci: kunciDrafAI(),
    pilih: bahan.pilihan.map(x => x.id).filter(id => !posisi.aiPertemuan || id === posisi.aiPertemuan),
    ringkasan: "",
    pdf: null,           // { nama, mime, data (base64), ukuran }
    pakaiBacaan: bahan.bacaan.length > 0,
    jumlahPG: 5, jumlahEsai: 2,
    tingkat: "campur",
    bahasa: jenisMapel(bahan.mapel) === "diniah" ? "ikut" : "indonesia",
    catatan: "",
    soal: []             // draft: { id, pakai, jenis, teks, pilihan[5], kunci, pedoman, pertemuanId, bacaanId }
  };
}

// ---------- susun perintah ke AI ----------
function susunPerintahAI(bahan, d) {
  const mp = bahan.mapel;
  const baris = [];
  baris.push(`Kamu membantu ustadz/ustadzah di ${toko.lembaga.nama || KONFIG.namaLembaga || "sebuah PKBM pondok pesantren"} menyusun soal ${bahan.untuk === "sumatif" ? "ujian sumatif" : "formatif (latihan per pertemuan)"}.`);
  baris.push(`Mapel: ${mp.nama} (${namaJenis(jenisMapel(mp)).toLowerCase()}), kelas ${mp.kelas}, ${mp.jenjang}.`);
  baris.push("", "BAHAN:");

  if (bahan.untuk === "modul") {
    const m = bahan.modul;
    baris.push(`Judul modul: ${m.judul}`);
    if (m.catatan) baris.push(`Tujuan pembelajaran: ${m.catatan}`);
    for (const x of bahan.pilihan.filter(x => d.pilih.includes(x.id))) {
      baris.push(`Pertemuan ${x.nomor}: ${x.pertemuan.target || "(target belum diisi)"}`);
    }
    if (d.pakaiBacaan && bahan.bacaan.length) {
      baris.push("", "Teks bacaan (boleh dipakai sebagai dasar soal):");
      bahan.bacaan.forEach((b, i) => baris.push(`[Teks ${i + 1}]${b.judul ? " " + b.judul : ""}\n${b.teks}`));
    }
  } else {
    for (const x of bahan.pilihan.filter(x => d.pilih.includes(x.id))) {
      const m = x.modul;
      baris.push(`Modul "${m.judul}"${m.catatan ? ` (tujuan: ${m.catatan})` : ""}:`);
      (m.pertemuan || []).forEach((p, i) => { if (p.target) baris.push(`  - Pertemuan ${i + 1}: ${p.target}`); });
    }
  }
  if (d.ringkasan.trim()) baris.push("", `Ringkasan materi dari guru:\n${d.ringkasan.trim()}`);
  if (d.pdf) baris.push("", `File PDF modul terlampir (${d.pdf.nama}). Pakai isinya sebagai bahan utama.`);

  baris.push("", "TUGAS:");
  baris.push(`Buat tepat ${d.jumlahPG} soal pilihan ganda dan ${d.jumlahEsai} soal esai.`);
  baris.push("Aturan:");
  baris.push("- Semua soal harus sesuai bahan di atas. Jangan keluar dari materi.");
  baris.push("- Pilihan ganda: 4 pilihan jawaban, tepat satu yang benar, pengecohnya masuk akal, posisi jawaban benar diacak.");
  baris.push("- Jangan tulis huruf (A., B., ...) di depan pilihan jawaban.");
  baris.push("- Esai: sertakan pedoman jawaban berupa poin-poin yang diharapkan.");
  baris.push({
    campur: "- Tingkat kesulitan: campur (mudah, sedang, dan beberapa soal berpikir tingkat tinggi).",
    mudah: "- Tingkat kesulitan: mudah (mengingat dan memahami).",
    sedang: "- Tingkat kesulitan: sedang (memahami dan menerapkan).",
    sulit: "- Tingkat kesulitan: sulit (menganalisis, mengevaluasi, HOTS)."
  }[d.tingkat]);
  baris.push({
    ikut: "- Bahasa soal mengikuti bahasa materinya (kalau materinya berbahasa Arab, tulis soal dalam bahasa Arab).",
    indonesia: "- Tulis soal dalam bahasa Indonesia yang baku dan mudah dipahami.",
    arab: "- Tulis soal dan pilihan jawaban dalam bahasa Arab (boleh berharakat)."
  }[d.bahasa]);
  baris.push("- Bahasa sopan dan contoh yang cocok untuk lingkungan pondok pesantren.");
  if (bahan.untuk === "modul") {
    baris.push(`- Isi "pertemuan" dengan nomor pertemuan yang paling cocok${d.pilih.length ? ` (pilih dari: ${bahan.pilihan.filter(x => d.pilih.includes(x.id)).map(x => x.nomor).join(", ")})` : ""}, atau null.`);
    if (d.pakaiBacaan && bahan.bacaan.length) baris.push(`- Kalau soal mengacu ke teks bacaan, isi "bacaan" dengan nomor teksnya. Kalau nggak, null.`);
  }
  if (d.catatan.trim()) baris.push(`- Permintaan tambahan guru: ${d.catatan.trim()}`);

  baris.push("", "Jawab HANYA dengan JSON, tanpa penjelasan lain, bentuknya:");
  baris.push(`{"soal":[{"jenis":"PG","teks":"...","pilihan":["...","...","...","..."],"kunci":0${bahan.untuk === "modul" ? ',"pertemuan":1,"bacaan":null' : ""}},{"jenis":"Esai","teks":"...","pedoman":"..."${bahan.untuk === "modul" ? ',"pertemuan":1' : ""}}]}`);
  baris.push(`"kunci" = urutan jawaban benar, mulai dari 0.`);
  return baris.join("\n");
}

// ---------- baca jawaban AI → draft soal yang rapi ----------
function bacaJawabanAI(teks, bahan) {
  let isiJson = String(teks || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  const a = isiJson.indexOf("{"), b = isiJson.lastIndexOf("}");
  const a2 = isiJson.indexOf("[");
  let data;
  try {
    if (a2 >= 0 && (a < 0 || a2 < a)) data = { soal: JSON.parse(isiJson.slice(a2, isiJson.lastIndexOf("]") + 1)) };
    else data = JSON.parse(isiJson.slice(a, b + 1));
  } catch {
    throw new Error("JAWABAN_RUSAK");
  }
  const daftar = Array.isArray(data) ? data : (data.soal || data.questions || []);
  const pertemuanKe = (n) => {
    const x = bahan.pilihan.find(p => p.nomor === Number(n));
    return x ? x.id : null;
  };
  const hasil = [];
  for (const s of daftar) {
    if (!s || typeof s !== "object") continue;
    const teksSoal = String(s.teks || s.soal || s.pertanyaan || "").trim();
    if (!teksSoal) continue;
    let pilihan = Array.isArray(s.pilihan || s.opsi) ? (s.pilihan || s.opsi).map(x => String(x ?? "").trim().replace(/^[A-Ea-e][.)]\s+/, "")) : [];
    const pg = pilihan.filter(Boolean).length >= 2 && !/esai|essay|uraian/i.test(s.jenis || "");
    const d = {
      id: buatId(), pakai: true,
      jenis: pg ? "PG" : "Esai",
      teks: teksSoal,
      pilihan: ["", "", "", "", ""], kunci: 0, pedoman: "",
      pertemuanId: bahan.untuk === "modul" ? pertemuanKe(s.pertemuan) : null,
      bacaanId: null
    };
    if (pg) {
      pilihan = pilihan.filter(Boolean).slice(0, 5);
      pilihan.forEach((x, i) => d.pilihan[i] = x);
      let k = s.kunci;
      if (typeof k === "string") k = /^[A-Ea-e]$/.test(k.trim()) ? "ABCDE".indexOf(k.trim().toUpperCase()) : (pilihan.indexOf(k.trim()) >= 0 ? pilihan.indexOf(k.trim()) : Number(k));
      d.kunci = Number.isInteger(k) && k >= 0 && k < pilihan.length ? k : 0;
      d.ragu = !(Number.isInteger(k) && k >= 0 && k < pilihan.length);   // kunci nggak jelas → tandai
    } else {
      d.pedoman = String(s.pedoman || s.kunci || s.jawaban || "").trim();
    }
    if (bahan.untuk === "modul" && s.bacaan) {
      const bc = bahan.bacaan[Number(s.bacaan) - 1];
      if (bc) d.bacaanId = bc.id;
    }
    hasil.push(d);
  }
  if (hasil.length === 0) throw new Error("JAWABAN_KOSONG");
  return hasil;
}

function pesanGagalAI(err) {
  const t = `${(err && err.code) || ""} ${(err && err.message) || err || ""}`;
  if (!navigator.onLine) return "Sinyal putus. Bikin soal pakai AI butuh internet, coba lagi pas ada sinyal.";
  if (/JAWABAN_RUSAK/.test(t)) return "Jawaban AI-nya nggak kebaca. Coba tekan Buat draft soal sekali lagi.";
  if (/JAWABAN_KOSONG/.test(t)) return "AI nggak ngasih soal apa pun. Coba tambahin bahannya (target capaian, ringkasan, atau PDF), lalu coba lagi.";
  if (/\b429\b|quota|RESOURCE_EXHAUSTED|rate.?limit|too many requests/i.test(t)) return "Jatah AI gratis lagi habis atau kebanyakan permintaan. Tunggu sebentar (atau besok), atau kurangi jumlah soal.";
  if (/\[50[034]\b|unavailable|overloaded/i.test(t)) return "Server AI Google lagi penuh. Tunggu beberapa menit, lalu coba lagi (jumlah soalnya dikurangi juga boleh).";
  if (/app.?check/i.test(t)) return "AI ditolak karena pengaman App Check. Admin perlu ngecek pengaturan App Check di Firebase (lihat tutorial).";
  if (/network-request-failed|Failed to fetch|NetworkError/i.test(t)) return "Gagal nyambung ke server AI. Cek sinyal, lalu coba lagi.";
  if (/not.*enabled|has not been used|PERMISSION_DENIED|403|api-not-enabled|genai config not found|config-not-found/i.test(t)) return "Fitur AI belum diaktifkan di Firebase. Admin perlu nyalain Firebase AI Logic dulu (lihat tutorial).";
  if (/SAFETY|blocked/i.test(t)) return "AI menolak bahan ini. Coba ubah ringkasan atau catatan tambahannya.";
  if (/too large|payload|size/i.test(t)) return `File PDF-nya kegedean. Maksimal ${AI_MAKS_PDF_MB} MB.`;
  return "Gagal bikin soal pakai AI. " + ((err && err.message) || "");
}
// pesan + kode aslinya (buat dilaporin kalau ada masalah)
function pesanGagalAILengkap(err) {
  const kode = (err && (err.code || err.name)) || "";
  // alamat server panjang dibuang: nggak berguna buat guru, dan bikin layar melebar
  const asli = String((err && err.message) || err || "").replace(/Error fetching from \S+:?\s*/g, "").replace(/https?:\/\/\S+/g, "").trim().slice(0, 120);
  return `${pesanGagalAI(err)}${kode || asli ? ` (detail: ${[kode, asli].filter(Boolean).join(" · ")})` : ""}`;
}

function bacaFileBase64(file) {
  return new Promise((berhasil, gagal) => {
    const r = new FileReader();
    r.onload = () => berhasil(String(r.result).split(",")[1] || "");
    r.onerror = () => gagal(r.error);
    r.readAsDataURL(file);
  });
}

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

  judul.textContent = keModul ? "Buat soal pakai AI" : bahan.usul ? "Usulkan soal UAS pakai AI" : "Buat soal ujian pakai AI";
  jejak.textContent = keModul ? `${bahan.modul.judul}` : `${bahan.sum.nama} · ${namaMapel(mp)}`;
  tombolKembali.hidden = false;

  const htmlPilihan = bahan.pilihan.length ? bahan.pilihan.map(x => `
      <label class="centang">
        <input type="checkbox" name="pilihBahan" value="${x.id}" ${d.pilih.includes(x.id) ? "checked" : ""}>
        <span dir="auto">${aman(x.label)} <small dir="auto">${aman(potong(x.sub, 90))}</small></span>
      </label>`).join("")
    : `<p class="info">${keModul ? "Modul ini belum punya pertemuan. Isi target capaiannya dulu, atau pakai ringkasan materi / PDF." : "Belum ada modul di semester ini. Pakai ringkasan materi / PDF aja."}</p>`;

  isi.innerHTML = `
    <div class="layar-ai">
      ${coba ? `<p class="pemberitahuan-kecil">Mode coba: soal yang keluar di sini <b>contoh bohongan</b>, bukan buatan AI beneran. AI aslinya jalan setelah Firebase disambungkan.</p>` : ""}
      <section class="bagian">
        <h2>Bahan untuk AI</h2>
        <fieldset>
          <legend>a. ${keModul ? "Judul &amp; target capaian" : "Modul yang diujikan"}</legend>
          <div class="kolom daftar-centang">${htmlPilihan}</div>
          ${keModul && bahan.bacaan.length ? `
          <label class="centang">
            <input type="checkbox" id="pakaiBacaan" ${d.pakaiBacaan ? "checked" : ""}>
            <span>Boleh bikin soal dari teks bacaan modul <small>${bahan.bacaan.length} teks</small></span>
          </label>` : ""}
        </fieldset>
        <label for="ringkasanAI">b. Ringkasan materi (opsional)</label>
        <textarea id="ringkasanAI" rows="4" dir="auto" placeholder="Tempel atau ketik ringkasan materinya di sini. Makin jelas, makin bagus soalnya.">${aman(d.ringkasan)}</textarea>
        <div class="isian-pdf">
          <span class="label-isian">c. File PDF modul (opsional)</span>
          <label class="tombol-kedua pilih-file" for="pdfAI">Pilih file PDF</label>
          <input type="file" id="pdfAI" accept="application/pdf" hidden>
          <span class="info" id="namaPdf">${d.pdf ? `${aman(d.pdf.nama)} <button class="tombol-teks merah" id="lepasPdf" type="button">Lepas</button>` : `Maks. ${AI_MAKS_PDF_MB} MB. Link Google Drive nggak bisa dibaca AI, jadi download dulu PDF-nya lalu pilih di sini.`}</span>
        </div>
      </section>

      <section class="bagian">
        <h2>Soal yang mau dibuat</h2>
        <div class="dua-kolom">
          <label>Pilihan ganda <input type="number" id="jumlahPG" min="0" max="${AI_MAKS_PG}" value="${d.jumlahPG}" inputmode="numeric"></label>
          <label>Esai <input type="number" id="jumlahEsai" min="0" max="${AI_MAKS_ESAI}" value="${d.jumlahEsai}" inputmode="numeric"></label>
          <label>Tingkat kesulitan <select id="tingkatAI">${Object.entries(TINGKAT_AI).map(([k, v]) => `<option value="${k}" ${d.tingkat === k ? "selected" : ""}>${v}</option>`).join("")}</select></label>
          <label>Bahasa soal <select id="bahasaAI">${Object.entries(BAHASA_AI).map(([k, v]) => `<option value="${k}" ${d.bahasa === k ? "selected" : ""}>${v}</option>`).join("")}</select></label>
        </div>
        <label>Permintaan tambahan (opsional) <input id="catatanAI" value="${aman(d.catatan)}" placeholder="Misalnya: pakai contoh kegiatan di pondok"></label>
        <div class="baris-tombol">
          <button class="tombol-utama tombol-ai" id="buatAI">${IKON_AI}<span>${d.soal.length ? "Buat lagi (ditambah ke draft)" : "Buat draft soal"}</span></button>
          <span class="info" id="statusAI" role="status" aria-live="polite"></span>
        </div>
        <p class="info kecil">Yang dikirim ke AI cuma isi modul di atas. Data siswa dan nilai nggak pernah dikirim. Hasil AI bisa salah, jadi cek dulu tiap soal dan kuncinya sebelum disimpan.</p>
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
    const l = document.getElementById("lepasPdf");
    if (l) l.onclick = () => { d.pdf = null; tampilkan(true); };
  };
  pasangLepasPdf();
  document.getElementById("pdfAI").onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.type && f.type !== "application/pdf") { status.textContent = "Filenya harus PDF."; return; }
    if (f.size > AI_MAKS_PDF_MB * 1024 * 1024) { status.textContent = `File-nya ${(f.size / 1048576).toFixed(1)} MB, kegedean. Maksimal ${AI_MAKS_PDF_MB} MB.`; return; }
    status.textContent = "Membaca file...";
    try {
      d.pdf = { nama: f.name, mime: "application/pdf", ukuran: f.size, data: await bacaFileBase64(f) };
      status.textContent = "";
      document.getElementById("namaPdf").innerHTML = `${aman(f.name)} <button class="tombol-teks merah" id="lepasPdf" type="button">Lepas</button>`;
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

    tombol.disabled = true;
    // detik berjalan, biar kelihatan prosesnya masih jalan (bukan macet)
    const mulai = Date.now();
    let keterangan = "AI lagi nyusun soal...";
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
      status.textContent = `${baru.length} soal baru masuk draft.${ragu ? ` ${ragu} soal kuncinya belum jelas, cek ya.` : ""}`;
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
      `<option value="${x.id}" ${s.pertemuanId === x.id ? "selected" : ""}>${aman(x.label)}</option>`).join("") +
      `<option value="" ${!s.pertemuanId ? "selected" : ""}>Belum ditentukan</option>`;
    const htmlSoal = (s, i) => `
      <article class="soal draf-ai ${s.pakai ? "" : "dibuang"}" data-draf="${s.id}">
        <div class="soal-atas">
          <label class="pakai-draf"><input type="checkbox" data-pakai ${s.pakai ? "checked" : ""}> <span>Pakai</span></label>
          <span class="nomor">${i + 1}.</span>
          <span class="jenis">${s.jenis === "PG" ? "Pilihan ganda" : "Esai"}</span>
          ${s.bacaanId ? `<span class="label-bacaan">Teks: ${aman(potong((bahan.bacaan.find(b => b.id === s.bacaanId) || {}).judul || "bacaan", 24))}</span>` : ""}
          ${s.ragu ? `<span class="tanda-ragu">Cek kuncinya</span>` : ""}
          <span class="spasi"></span>
          <button class="tombol-teks merah" data-buang>Buang</button>
        </div>
        ${keModul && bahan.pilihan.length ? `<label class="isian-kecil">Untuk <select data-f="pertemuanId" aria-label="Untuk pertemuan">${opsiPertemuan(s)}</select></label>` : ""}
        <textarea data-f="teks" rows="3" class="teks-serif" dir="auto" aria-label="Pertanyaan soal ${i + 1}">${aman(s.teks)}</textarea>
        ${s.jenis === "PG" ? `<div class="kolom">${HURUF.map((h, j) => `
          <div class="opsi">
            <input type="radio" name="kunci-${s.id}" value="${j}" id="k-${s.id}-${j}" ${s.kunci === j ? "checked" : ""}>
            <label for="k-${s.id}-${j}" class="huruf" title="Jadikan kunci jawaban">${h}</label>
            <input data-pilihan="${j}" value="${aman(s.pilihan[j] || "")}" dir="auto" placeholder="Jawaban ${h}${j >= 4 ? " (opsional)" : ""}" aria-label="Soal ${i + 1} jawaban ${h}">
          </div>`).join("")}</div>`
        : `<label class="isian-kecil">Pedoman jawaban <textarea data-f="pedoman" rows="3" dir="auto">${aman(s.pedoman)}</textarea></label>`}
        <p class="pesan-draf" role="alert"></p>
      </article>`;

    const dipakai = d.soal.filter(s => s.pakai).length;
    wadah.innerHTML = `
      <h2 class="subjudul">Draft soal <small id="hitungDraf">${d.soal.length} soal · ${dipakai} dipakai</small></h2>
      <p class="info">Cek tiap soal. Bisa langsung diedit di sini, kunci jawaban ditandai huruf yang hijau. Hilangkan centang "Pakai" atau tekan Buang buat soal yang nggak cocok.</p>
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
      el.querySelectorAll(`[name="kunci-${s.id}"]`).forEach(r => r.onchange = () => { s.kunci = Number(r.value); s.ragu = false; const t = el.querySelector(".tanda-ragu"); if (t) t.remove(); });
    });

    document.getElementById("kosongkanDraf").onclick = async () => {
      if (!(await tanyaYakin(`Buang semua ${d.soal.length} soal di draft?`, { bahaya: true, ya: "Buang semua" }))) return;
      d.soal = [];
      gambarDraf();
      tombol.querySelector("span").textContent = "Buat draft soal";
    };
    document.getElementById("simpanDraf").onclick = () => simpanDrafAI(bahan, d, wadah);
  }
  gambarDraf();
}

// cek & rapikan draft yang dicentang, lalu simpan
function simpanDrafAI(bahan, d, wadah) {
  const dipakai = d.soal.filter(s => s.pakai);
  if (dipakai.length === 0) { kabar("Belum ada soal yang dicentang \"Pakai\"."); return; }

  let salah = 0;
  const siap = [];
  for (const s of dipakai) {
    const el = wadah.querySelector(`[data-draf="${s.id}"]`);
    const pesan = el && el.querySelector(".pesan-draf");
    let galat = "";
    const teks = s.teks.trim();
    const pilihan = s.pilihan.map(x => (x || "").trim());
    if (!teks) galat = "Pertanyaannya masih kosong.";
    else if (s.jenis === "PG" && pilihan.filter(Boolean).length < 2) galat = "Isi minimal 2 pilihan jawaban.";
    else if (s.jenis === "PG" && !pilihan[s.kunci]) galat = "Kunci jawaban yang dipilih masih kosong.";
    if (pesan) pesan.textContent = galat;
    if (el) el.classList.toggle("ada-salah", !!galat);
    if (galat) { salah++; continue; }
    siap.push(s.jenis === "PG"
      ? { id: buatId(), jenis: "PG", teks, pilihan, kunci: s.kunci, pertemuanId: s.pertemuanId || null, bacaanId: s.bacaanId || null, dibuat: Date.now() }
      : { id: buatId(), jenis: "Esai", teks, pedoman: (s.pedoman || "").trim(), pertemuanId: s.pertemuanId || null, bacaanId: s.bacaanId || null, dibuat: Date.now() });
  }
  if (salah) {
    const pertama = wadah.querySelector(".ada-salah");
    if (pertama) pertama.scrollIntoView({ block: "center" });
    kabar(`${salah} soal masih ada yang kurang. Lihat tulisan merah di soalnya.`);
    return;
  }

  const mp = bahan.mapel;
  if (bahan.untuk === "modul") {
    const t = modulMapel(mp.id).find(x => x.id === bahan.modul.id);
    if (!t) { kabar("Modul ini sudah dihapus (mungkin dari perangkat lain)."); return pergi("mapel", { tab: "modul" }); }
    simpanModul(mp.id, { ...t, soal: [...(t.soal || []), ...siap] });
    drafAI = null;
    pergi("modul", { aiPertemuan: null });
  } else {
    const t = ujianTerbaru(mp.id, bahan.sum.id);
    if (!t) { kabar("Ujian ini sudah dihapus (mungkin dari perangkat lain)."); return kembaliKeDaftar(); }
    if (bahan.usul) {
      if (t.status === "dikunci") { kabar("UAS ini sudah dikunci TU, jadi nggak bisa diusulkan soal lagi."); return pergi("sumatif", { usul: false }); }
      for (const s of siap) {
        simpanUsulan(posisi.uasGrup, {
          id: buatId(), semester: t.semester, tahun: t.tahun,
          modulId: MODUL_UJIAN, soalId: s.id,
          salinan: { soal: { ...s, pertemuanId: null, bacaanId: null }, bacaan: null, judulModul: "Soal buatan AI", namaPemilik: namaSaya() },
          catatan: ""
        });
      }
      drafAI = null;
      kabar(`${siap.length} soal sudah dikirim sebagai usulan. Koordinator yang memutuskan dipakai atau nggak.`);
      return pergi("sumatif", { usul: false });
    }
    const butir = [...(t.butir || []), ...siap.map(s => ({
      modulId: MODUL_UJIAN, soalId: s.id,
      salinan: { soal: { ...s, pertemuanId: null, bacaanId: null }, bacaan: null }
    }))];
    simpanUjian(mp.id, { ...t, butir });
    drafAI = null;
    pergi("sumatif");
  }
}

function labelSimpanAI(bahan, n) {
  if (bahan.untuk === "modul") return `Simpan ${n} soal ke modul`;
  return bahan.usul ? `Usulkan ${n} soal ke koordinator` : `Masukkan ${n} soal ke ujian`;
}

// ikon kecil buat tombol AI (bintang berkilau)
const IKON_AI = `<svg viewBox="0 0 24 24" aria-hidden="true" class="ikon-ai"><path d="M12 3l1.8 4.9L19 9.7l-5.2 1.8L12 16.4l-1.8-4.9L5 9.7l5.2-1.8z"/><path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/></svg>`;

// =====================================================
//  AI GENERATOR — pintu depan buat bikin soal pakai AI
//  Guru pilih mapel & kelas, lalu soalnya mau masuk ke mana
//  (soal formatif di modul, atau ujian sumatif), terus lanjut
//  ke layar AI yang sama (layarAISoal) dengan bahan dari modul.
// =====================================================
function layarAIGenerator() {
  if (sayaKurikulum() && !mapelDiampu().length) throw new DataHilang();
  judul.textContent = "AI Generator soal";
  jejak.textContent = "Bikin draft soal dari modul, tinggal cek & edit";
  const diampu = [...mapelDiampu()].sort(urutMapelJenis);
  const sem = semesterSekarang();
  const pilihMapel = posisi.aiMapel && diampu.some(m => m.id === posisi.aiMapel) ? posisi.aiMapel : (diampu[0] && diampu[0].id);
  const mp = cariMapel(pilihMapel);
  const ke = posisi.aiKe === "sumatif" ? "sumatif" : "modul";

  let h = `<section class="kartu-sambut kecil"><div class="sambut-teks">
      <h2>Buat soal dengan AI</h2>
      <p>AI menyusun draft soal pilihan ganda & esai dari target capaian, ringkasan, atau PDF modulmu. Kamu tetap yang memeriksa dan menyimpan.</p>
    </div></section>`;
  if (!diampu.length) {
    isi.innerHTML = h + `<p class="kosong">Kamu belum ditugaskan ke mapel mana pun. Minta admin (TU) menambahkanmu sebagai pengampu.</p>`;
    return;
  }
  const modulSaya = modulMapel(mp.id).filter(m => bisaDiubahDi(mp.id, m, modulMapel(mp.id)) && samaSemester(m, sem));
  const ujianSaya = sumatifMapel(mp.id).filter(s => bisaDiubahDi(mp.id, s, sumatifMapel(mp.id)) && samaSemester(s, sem));
  const pilihan = ke === "modul" ? modulSaya : ujianSaya;

  h += `<form id="formAIGen" class="panel">
      <label>1. Mapel &amp; kelas
        <select id="aiMapel">${diampu.map(m => `<option value="${m.id}" data-ket="${aman(namaJenis(jenisMapel(m)))} · ${aman(m.jenjang)}" ${m.id === mp.id ? "selected" : ""}>${aman(namaMapel(m))}</option>`).join("")}</select>
      </label>
      <fieldset>
        <legend>2. Soalnya mau dimasukkan ke mana?</legend>
        <div class="pilih-jenis">
          <label class="radio"><input type="radio" name="aiKe" value="modul" ${ke === "modul" ? "checked" : ""}> Soal formatif di modul</label>
          <label class="radio"><input type="radio" name="aiKe" value="sumatif" ${ke === "sumatif" ? "checked" : ""}> Ujian sumatif</label>
        </div>
      </fieldset>
      <label>3. ${ke === "modul" ? "Modul" : "Ujian"} (${aman(namaSemester(sem))})
        <select id="aiTujuan" ${pilihan.length ? "" : "disabled"}>${pilihan.length
          ? pilihan.map(x => `<option value="${x.id}" data-ket="${ke === "modul" ? `${(x.pertemuan || []).length} pertemuan, ${jumlahSoal(x)} soal` : `${(x.butir || []).length} soal`}">${aman(ke === "modul" ? x.judul : x.nama)}</option>`).join("")
          : `<option value="">${ke === "modul" ? "Belum ada modul" : "Belum ada ujian"}</option>`}</select>
      </label>
      ${pilihan.length ? "" : `<p class="info">${ke === "modul"
        ? "Bikin modul dulu, isi target capaian tiap pertemuan. AI pakai isi modul itu sebagai bahan."
        : "Bikin ujian sumatif dulu di tab Sumatif mapel ini, atau pilih “Soal formatif di modul”."}</p>`}
      <div class="baris-tombol">
        ${pilihan.length
          ? `<button type="submit" class="tombol-utama tombol-ai">${IKON_AI}<span>Lanjut buat soal</span></button>`
          : `<button type="button" class="tombol-utama" id="aiBuatDulu">${ke === "modul" ? "+ Tambah modul ajar" : "+ Buat ujian sumatif"}</button>`}
      </div>
      <p class="info kecil">Yang dikirim ke AI cuma isi modul. Data siswa dan nilai nggak pernah dikirim. Soal UAS bersama dibuat dari halaman UAS-nya.</p>
    </form>`;
  isi.innerHTML = h;

  document.getElementById("aiMapel").onchange = (e) => pergi("aiGenerator", { aiMapel: e.target.value });
  isi.querySelectorAll('[name="aiKe"]').forEach(r => r.onchange = () => pergi("aiGenerator", { aiMapel: mp.id, aiKe: r.value }));
  const buat = document.getElementById("aiBuatDulu");
  if (buat) buat.onclick = () => ke === "modul"
    ? pergi("formModul", { mapelId: mp.id, modEditId: null, semester: kunciSemester(sem) , dariAI: true })
    : pergi("formSumatif", { mapelId: mp.id, sumEditId: null, uasGrup: null, semester: kunciSemester(sem) , dariAI: true });
  document.getElementById("formAIGen").onsubmit = (e) => {
    e.preventDefault();
    const id = document.getElementById("aiTujuan").value;
    if (!id) return;
    if (ke === "modul") pergi("aiSoal", { mapelId: mp.id, aiUntuk: "modul", modId: id, aiPertemuan: null, semester: kunciSemester(sem) , dariAI: true });
    else pergi("aiSoal", { mapelId: mp.id, aiUntuk: "sumatif", sumId: id, uasGrup: null, usul: false, semester: kunciSemester(sem) , dariAI: true });
  };
}
