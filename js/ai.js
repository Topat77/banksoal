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
//  File ini: bahan, susun perintah, baca jawaban, jatah & pesan galat AI.
//  Layarnya (layarAISoal, layarAIGenerator) ada di layarai.js.
// =====================================================

const AI_MAKS_PDF_MB = 15;
const AI_MAKS_PG = 30;
const AI_MAKS_ESAI = 10;
// bahan (tanpa PDF) di bawah segini huruf dianggap tipis: AI gampang ngarang, jadi guru diingetin dulu
const AI_BAHAN_TIPIS = 300;
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

// ---------- cek bahan sebelum dikirim ----------
// modul yang jadi bahan (modul ini, atau modul-modul yang dicentang buat ujian)
function modulBahanAI(bahan, d) {
  if (bahan.untuk === "modul") return [bahan.modul];
  return bahan.pilihan.filter(x => d.pilih.includes(x.id)).map(x => x.modul);
}
// banyaknya huruf bahan yang beneran dikirim (tanpa PDF)
function panjangBahanAI(bahan, d) {
  let teks = d.ringkasan.trim();
  if (bahan.untuk === "modul") {
    teks += bahan.modul.catatan || "";
    for (const x of bahan.pilihan.filter(x => d.pilih.includes(x.id))) teks += x.pertemuan.target || "";
    if (d.pakaiBacaan) for (const b of bahan.bacaan) teks += b.teks || "";
  } else {
    for (const m of modulBahanAI(bahan, d)) teks += (m.catatan || "") + (m.pertemuan || []).map(p => p.target || "").join("");
  }
  return teks.replace(/\s+/g, " ").length;
}
// modul yang file-nya di Google Drive/Docs (AI nggak bisa buka link-nya)
function modulDriveAI(bahan, d) {
  return modulBahanAI(bahan, d).filter(m => m && linkPratinjau(m.link));
}
const PESAN_DRIVE_AI = "File modul di Google Drive tidak dibaca AI. Agar soalnya sesuai isi file itu, unduh PDF-nya lalu pilih di bagian c.";

// ---------- susun perintah ke AI ----------
function susunPerintahAI(bahan, d) {
  const mp = bahan.mapel;
  const baris = [];
  baris.push(`Anda membantu ustadz/ustadzah di ${toko.lembaga.nama || KONFIG.namaLembaga || "sebuah PKBM pondok pesantren"} menyusun soal ${bahan.untuk === "sumatif" ? "ujian sumatif" : "formatif (latihan per pertemuan)"}.`);
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
  baris.push("- Semua soal, kunci jawaban, dan pedoman HARUS bisa dijawab dari bahan di atas. Jangan keluar dari materi.");
  baris.push("- Jangan menambah fakta, angka, tanggal, nama tokoh, ayat, hadits, atau dalil yang tidak ada di bahan. Jika mengutip ayat atau hadits, tulis persis seperti di bahan.");
  baris.push("- Jika bahannya tidak cukup untuk jumlah soal yang diminta, buat lebih sedikit soal saja. Jangan mengarang supaya jumlahnya pas.");
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
    ikut: "- Bahasa soal mengikuti bahasa materinya (jika materinya berbahasa Arab, tulis soal dalam bahasa Arab).",
    indonesia: "- Tulis soal dalam bahasa Indonesia yang baku dan mudah dipahami.",
    arab: "- Tulis soal dan pilihan jawaban dalam bahasa Arab (boleh berharakat)."
  }[d.bahasa]);
  baris.push("- Bahasa sopan dan contoh yang cocok untuk lingkungan pondok pesantren.");
  if (bahan.untuk === "modul") {
    baris.push(`- Isi "pertemuan" dengan nomor pertemuan yang paling cocok${d.pilih.length ? ` (pilih dari: ${bahan.pilihan.filter(x => d.pilih.includes(x.id)).map(x => x.nomor).join(", ")})` : ""}, atau null.`);
    if (d.pakaiBacaan && bahan.bacaan.length) baris.push(`- Jika soal mengacu ke teks bacaan, isi "bacaan" dengan nomor teksnya. Jika tidak, null.`);
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
      // pilihan kosong dibuang, tapi kunci angka / huruf dari AI masih nunjuk urutan ASLI,
      // jadi dipetakan dulu ke urutan setelah dibuang (nunjuk pilihan kosong = nggak jelas)
      const terisi = pilihan.map((x, i) => ({ x, i })).filter(o => o.x).slice(0, 5);
      pilihan = terisi.map(o => o.x);
      pilihan.forEach((x, i) => d.pilihan[i] = x);
      let k = s.kunci, urutanAsli = true;
      if (typeof k === "string") {
        const t = k.trim();
        if (/^[A-Ea-e]$/.test(t)) k = "ABCDE".indexOf(t.toUpperCase());
        else if (pilihan.includes(t)) { k = pilihan.indexOf(t); urutanAsli = false; }
        else k = Number(t);
      }
      if (urutanAsli && Number.isInteger(k)) k = terisi.findIndex(o => o.i === k);
      const jelas = Number.isInteger(k) && k >= 0 && k < pilihan.length;
      d.kunci = jelas ? k : 0;
      d.ragu = !jelas;   // kunci nggak jelas → tandai
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

// ====== JATAH AI ======
// Jatah gratis Gemini direset tiap 00.00 waktu Pasifik (Los Angeles), ≈ 14.00 / 15.00 WIB.
function resetJatahAI(sekarang = new Date()) {
  const f = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
  const p = Object.fromEntries(f.formatToParts(sekarang).map(x => [x.type, x.value]));
  const lewat = ((Number(p.hour) * 60 + Number(p.minute)) * 60 + Number(p.second)) * 1000;
  return new Date(sekarang.getTime() - lewat + 24 * 3600 * 1000);
}
// "pukul 15.00 WIB" (ditambah "besok" kalau tanggalnya beda)
function teksResetAI(sekarang = new Date()) {
  const r = resetJatahAI(sekarang);
  const tgl = (d) => d.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" });
  const jam = r.toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" });
  return `${tgl(r) === tgl(sekarang) ? "hari ini" : "besok"} pukul ${jam} WIB`;
}
// jatah harian habis: diingat di perangkat ini sampai jam reset, biar guru langsung tahu sebelum nyoba
const KUNCI_AI_HABIS = "banksoal-ai-habis";
function catatJatahAIHabis() { tulisLokal(KUNCI_AI_HABIS, resetJatahAI().getTime()); }
function jatahAIHabis() { return Number(bacaLokal(KUNCI_AI_HABIS, 0)) > Date.now(); }
function jenisJatahAI(t) {
  if (/per.?day|perday|daily|per_day/i.test(t)) return "hari";
  if (/per.?minute|perminute|per_minute|rate.?limit|too many requests/i.test(t)) return "menit";
  return "";
}

function pesanGagalAI(err) {
  const t = `${(err && err.code) || ""} ${(err && err.message) || err || ""}`;
  if (!navigator.onLine) return "Sinyal putus. Buat soal dengan AI butuh internet, coba lagi saat ada sinyal.";
  if (/JAWABAN_RUSAK/.test(t)) return "Jawaban AI-nya tidak terbaca. Coba tekan Buat draft soal sekali lagi.";
  if (/JAWABAN_KOSONG/.test(t)) return "AI tidak memberi soal apa pun. Coba tambahkan bahannya (target capaian, ringkasan, atau PDF), lalu coba lagi.";
  if (/\b429\b|quota|RESOURCE_EXHAUSTED|rate.?limit|too many requests/i.test(t)) {
    const jenis = jenisJatahAI(t);
    if (jenis === "menit") return "Permintaan ke AI sedang terlalu banyak dalam waktu dekat. Tunggu sekitar 1 menit, lalu coba lagi.";
    if (jenis === "hari") { catatJatahAIHabis(); return `Jatah AI gratis hari ini sudah habis. AI bisa dipakai lagi ${teksResetAI()}.`; }
    return `Jatah AI gratis sedang habis atau permintaannya terlalu banyak. Coba lagi 1 menit lagi. Jika masih gagal, berarti jatah hari ini sudah habis dan AI bisa dipakai lagi ${teksResetAI()}.`;
  }
  if (/timeout has expired|timed? ?out|deadline/i.test(t)) return "Server AI Google sedang lambat, jadi tidak ada jawaban. Coba lagi beberapa menit lagi (jumlah soalnya dikurangi juga boleh).";
  if (/\[50[034]\b|unavailable|overloaded/i.test(t)) return "Server AI Google sedang penuh. Tunggu beberapa menit, lalu coba lagi (jumlah soalnya dikurangi juga boleh).";
  if (/app.?check/i.test(t)) return "AI ditolak karena pengaman App Check. Admin perlu memeriksa pengaturan App Check di Firebase (lihat tutorial).";
  if (/network-request-failed|Failed to fetch|NetworkError/i.test(t)) return "Gagal tersambung ke server AI. Periksa sinyal, lalu coba lagi.";
  if (/not.*enabled|has not been used|PERMISSION_DENIED|403|api-not-enabled|genai config not found|config-not-found/i.test(t)) return "Fitur AI belum diaktifkan di Firebase. Admin perlu menyalakan Firebase AI Logic dulu (lihat tutorial).";
  if (/SAFETY|blocked/i.test(t)) return "AI menolak bahan ini. Coba ubah ringkasan atau catatan tambahannya.";
  if (/too large|payload|size/i.test(t)) return `File PDF-nya terlalu besar. Maksimal ${AI_MAKS_PDF_MB} MB.`;
  return "Gagal membuat soal menggunakan AI. " + ((err && err.message) || "");
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

// ikon kecil buat tombol AI (bintang berkilau): gambarnya sama dengan ikon menu AI (IKON di tampilan.js)
const IKON_AI = IKON.ai.replace("<svg ", '<svg class="ikon-ai" ');
