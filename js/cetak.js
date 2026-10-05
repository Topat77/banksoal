// =====================================================
//  cetak.js — semua urusan CETAK
//  (lembar soal, lembar kunci, paket acak, export Word)
// =====================================================

// ====== ACAK UNTUK PAKET SOAL ======
// Angka acak "berbenih": benih yang sama SELALU ngasih urutan acak yang sama.
// Jadi Paket B hari ini = Paket B besok, dan lembar soal cocok sama lembar kuncinya.
function angkaAcak(benihTeks) {
  let h = 1779033703 ^ benihTeks.length;
  for (let i = 0; i < benihTeks.length; i++) {
    h = Math.imul(h ^ benihTeks.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// kocok isi daftar (cara Fisher-Yates)
function kocok(daftar, acak) {
  const hasil = [...daftar];
  for (let i = hasil.length - 1; i > 0; i--) {
    const j = Math.floor(acak() * (i + 1));
    [hasil[i], hasil[j]] = [hasil[j], hasil[i]];
  }
  return hasil;
}

// soal berurutan yang pakai teks bacaan sama dijadiin satu kelompok,
// biar pas diacak nggak kepisah dari teksnya
function kelompokkan(items) {
  const grup = [];
  for (const it of items) {
    const akhir = grup[grup.length - 1];
    const sama = akhir && it.bacaan && akhir[0].bacaan && akhir[0].bacaan.id === it.bacaan.id;
    if (sama) akhir.push(it);
    else grup.push([it]);
  }
  return grup;
}

function acakPilihanSoal(s, acak) {
  if (s.jenis !== "PG") return s;
  const terisi = s.pilihan.map((teks, i) => ({ teks, i })).filter(x => x.teks);
  const urut = kocok(terisi, acak);
  return {
    ...s,
    pilihan: urut.map(x => x.teks),
    kunci: urut.findIndex(x => x.i === s.kunci)
  };
}

function acakItems(items, acak, acakPilihan) {
  let hasil = kocok(kelompokkan(items), acak).flat();
  if (acakPilihan) hasil = hasil.map(it => ({ ...it, soal: acakPilihanSoal(it.soal, acak) }));
  return hasil;
}

// pisahin PG & esai, terus acak kalau perlu
function siapkanLembar(items, paket, acakPilihan, benih) {
  let pg = items.filter(x => x.soal.jenis === "PG");
  let esai = items.filter(x => x.soal.jenis !== "PG");
  if (paket && paket !== "A") {
    const acak = angkaAcak(benih + "-" + paket);
    pg = acakItems(pg, acak, acakPilihan);
    esai = acakItems(esai, acak, false);
  }
  return { pg, esai };
}

// ====== BAHAN-BAHAN HTML LEMBAR ======
// Lembar sengaja disusun pakai <table>, karena Word paling nurut sama tabel.

// teks dengan baris baru → <br> (Word nggak ngerti white-space: pre-wrap)
function baris(teks) {
  return aman(teks).replace(/\n/g, "<br>");
}

// pilihan kosong dilewati, jadi hurufnya diurutkan ulang A, B, C, ...
function daftarPilihan(s) {
  return s.pilihan.filter(t => t);
}
function hurufKunci(s) {
  const sebelum = s.pilihan.slice(0, s.kunci).filter(t => t).length;
  return HURUF[sebelum];
}

function htmlKop(info, tambahan) {
  return `
    <div class="kop">
      <p class="kop-sekolah">${aman(info.sekolah || "NAMA SEKOLAH")}</p>
      <p class="kop-ujian">${aman(info.namaUjian.toUpperCase())}${info.paket ? ` (PAKET ${info.paket})` : ""}${tambahan}</p>
      <table class="kop-info" align="center">
        <tr><td>Mata pelajaran</td><td>: ${aman(info.mapel)}</td><td>Kelas</td><td>: ${aman(info.kelas)}</td></tr>
        <tr><td>Semester</td><td>: ${aman(info.semester)}</td><td>Waktu</td><td>: ${aman(info.waktu || "-")}</td></tr>
      </table>
    </div>`;
}

// daftar soal bernomor, plus teks bacaan di depan kelompoknya
function htmlTabelSoal(items, denganKunci) {
  let h = `<table class="tabel-soal" width="100%">`;

  items.forEach((it, i) => {
    const b = it.bacaan;
    const awalBacaan = b && (i === 0 || !items[i - 1].bacaan || items[i - 1].bacaan.id !== b.id);

    if (awalBacaan && !denganKunci) {
      let akhir = i;
      while (akhir + 1 < items.length && items[akhir + 1].bacaan && items[akhir + 1].bacaan.id === b.id) akhir++;
      const rentang = akhir > i ? `nomor ${i + 1}–${akhir + 1}` : `nomor ${i + 1}`;
      h += `
        <tr><td colspan="2" class="sel-bacaan">
          <p class="petunjuk">Bacalah teks berikut untuk menjawab soal ${rentang}!</p>
          ${b.judul ? `<p class="bacaan-judul">${aman(b.judul)}</p>` : ""}
          <p class="bacaan-teks">${baris(b.teks)}</p>
        </td></tr>`;
    }

    let sel = `<p class="teks-soal">${baris(it.soal.teks)}</p>`;
    if (it.soal.jenis === "PG" && !denganKunci) {
      sel += daftarPilihan(it.soal)
        .map((t, j) => `<p class="opsi-cetak">${HURUF[j]}. ${aman(t)}</p>`)
        .join("");
    }
    if (it.soal.jenis !== "PG" && denganKunci) {
      sel += `<p class="pedoman-cetak">${baris(it.soal.pedoman || "-")}</p>`;
    }
    h += `<tr><td class="no" width="28">${i + 1}.</td><td>${sel}</td></tr>`;
  });

  return h + `</table>`;
}

function htmlLembarSoal(info, pg, esai) {
  let h = htmlKop(info, "") + `
    <table class="identitas" width="100%">
      <tr><td>Nama:</td><td>Kelas:</td><td>No. Absen:</td></tr>
    </table>`;

  if (pg.length) {
    h += `<p class="judul-bagian">A. Pilihan Ganda</p>
          <p class="petunjuk">Pilihlah jawaban yang paling tepat!</p>
          ${htmlTabelSoal(pg, false)}`;
  }
  if (esai.length) {
    h += `<p class="judul-bagian">${pg.length ? "B" : "A"}. Esai</p>
          <p class="petunjuk">Jawablah pertanyaan berikut dengan jelas!</p>
          ${htmlTabelSoal(esai, false)}`;
  }
  return h;
}

function htmlLembarKunci(info, pg, esai, halamanBaru) {
  let h = "";
  if (halamanBaru) {
    // div → buat browser, br → buat Word
    h += `<div class="halaman-baru"></div><br clear="all" class="putus-word" style="page-break-before:always">`;
  }
  h += htmlKop(info, " — KUNCI JAWABAN");

  if (pg.length) {
    h += `<p class="judul-bagian">A. Pilihan Ganda</p><table class="tabel-kunci">`;
    for (let i = 0; i < pg.length; i += 5) {
      h += `<tr>`;
      for (let j = i; j < i + 5; j++) {
        h += j < pg.length ? `<td>${j + 1}. <b>${hurufKunci(pg[j].soal)}</b></td>` : `<td></td>`;
      }
      h += `</tr>`;
    }
    h += `</table>`;
  }
  if (esai.length) {
    h += `<p class="judul-bagian">${pg.length ? "B" : "A"}. Esai</p>${htmlTabelSoal(esai, true)}`;
  }
  return h;
}

// ====== EXPORT KE WORD ======
// Trik lama tapi ampuh: Word bisa buka file HTML yang dinamai .doc
const GAYA_WORD = `
  @page Section1 { size: 21cm 29.7cm; margin: 2cm; }
  div.Section1 { page: Section1; }
  body { font-family: "Times New Roman", serif; font-size: 12pt; }
  p { margin: 0 0 4pt; }
  .kop { text-align: center; border-bottom: 3px double #000; padding-bottom: 6pt; margin-bottom: 10pt; }
  .kop-sekolah { font-size: 14pt; font-weight: bold; text-transform: uppercase; }
  .kop-ujian { font-weight: bold; }
  .kop-info td { padding: 0 6pt; text-align: left; }
  .identitas td { border-bottom: 1px dotted #000; padding-top: 8pt; }
  .judul-bagian { font-weight: bold; margin-top: 10pt; }
  .petunjuk { font-style: italic; }
  .tabel-soal td { vertical-align: top; padding-bottom: 8pt; }
  .bacaan-judul { font-weight: bold; text-align: center; }
  .opsi-cetak { margin-left: 6pt; }
  .pedoman-cetak { border-left: 2pt solid #000; padding-left: 6pt; }
  .tabel-kunci td { padding: 2pt 18pt 2pt 0; }
`;

function namaFileAman(teks) {
  return teks.replace(/[\\/:*?"<>|]/g, "-").trim();
}

async function unduhWord(namaFile, isiHtml) {
  const dok = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8"><title>${aman(namaFile)}</title><style>${GAYA_WORD}</style></head>
    <body><div class="Section1">${isiHtml}</div></body>
    </html>`;
  // "﻿" = penanda UTF-8, biar huruf seperti "–" nggak jadi aneh di Word
  const berkas = new File(["﻿", dok], namaFileAman(namaFile) + ".doc", { type: "application/msword" });
  await berikanFile(berkas);
}

// ====== LAYAR: CETAK SOAL ======
function layarCetak() {
  const k = kurAktif();
  const p = proAktif();

  // ambil soal + teks bacaannya: dari modul (formatif) atau dari sumatif
  let namaUjian, items, benih;
  if (posisi.cetakDari === "modul") {
    const m = modAktif();
    namaUjian = `Soal Formatif: ${m.judul}`;
    benih = m.id;
    items = m.soal.map(s => ({ soal: s, bacaan: m.bacaan.find(b => b.id === s.bacaanId) || null }));
  } else {
    const sum = sumAktif();
    namaUjian = sum.nama;
    benih = sum.id;
    items = sum.soalId.map(cariSoal).filter(Boolean).map(x => ({ soal: x.soal, bacaan: x.bacaan }));
  }

  judul.textContent = "Cetak Soal";
  jejak.textContent = namaUjian;
  tombolKembali.hidden = false;

  isi.innerHTML = `
    <div class="panel-cetak jangan-cetak">
      <label>Nama sekolah <input id="sekolah" value="${aman(data.sekolah || "")}" placeholder="SMP Negeri 1 ..."></label>
      <label>Waktu pengerjaan <input id="waktu" value="${aman(data.waktu || "")}" placeholder="90 menit"></label>
      <label>Paket soal
        <select id="paket">
          <option value="">Tanpa paket (urutan asli)</option>
          <option value="A">Paket A (urutan asli)</option>
          <option value="B">Paket B (diacak)</option>
          <option value="C">Paket C (diacak)</option>
          <option value="D">Paket D (diacak)</option>
        </select>
      </label>
      <label class="centang" id="bagianAcakPilihan">
        <input type="checkbox" id="acakPilihan" checked>
        Acak juga urutan pilihan jawaban
      </label>
      <div class="pilih-jenis tiga">
        <label class="radio"><input type="radio" name="mode" value="soal" checked> Soal</label>
        <label class="radio"><input type="radio" name="mode" value="kunci"> Kunci</label>
        <label class="radio"><input type="radio" name="mode" value="dua"> Dua-duanya</label>
      </div>
      <div class="pilih-jenis">
        <button class="tombol-tambah tombol-sumatif" id="print">Cetak / PDF</button>
        <button class="tombol-garis" id="word">Download Word</button>
      </div>
      <p class="info">Mau jadi PDF? Di jendela cetak, pilih tujuan "Simpan sebagai PDF". File Word bisa diedit lagi, misal buat ganti kop sekolah.</p>
    </div>
    <div id="lembar"></div>`;

  const lembar = document.getElementById("lembar");
  const inputSekolah = document.getElementById("sekolah");
  const inputWaktu = document.getElementById("waktu");
  const pilihPaket = document.getElementById("paket");
  const centangAcak = document.getElementById("acakPilihan");

  function pengaturan() {
    return {
      paket: pilihPaket.value,
      mode: document.querySelector('[name="mode"]:checked').value
    };
  }

  // bikin HTML lembar sesuai pilihan sekarang
  function htmlSekarang() {
    const { paket, mode } = pengaturan();
    const info = {
      sekolah: inputSekolah.value,
      waktu: inputWaktu.value,
      namaUjian,
      paket,
      mapel: k.mapel,
      kelas: k.kelas,
      semester: `${p.semester} ${p.tahun}`
    };
    const { pg, esai } = siapkanLembar(items, paket, centangAcak.checked, benih);

    if (mode === "soal") return htmlLembarSoal(info, pg, esai);
    if (mode === "kunci") return htmlLembarKunci(info, pg, esai, false);
    return htmlLembarSoal(info, pg, esai) + htmlLembarKunci(info, pg, esai, true);
  }

  function gambar() {
    // pilihan "acak jawaban" cuma muncul buat paket yang diacak
    document.getElementById("bagianAcakPilihan").hidden = !["B", "C", "D"].includes(pilihPaket.value);

    if (items.length === 0) {
      lembar.innerHTML = `<p class="kosong">Belum ada soal yang bisa dicetak.</p>`;
      return;
    }
    lembar.innerHTML = htmlSekarang();
  }

  // nama sekolah & waktu diingat buat cetakan berikutnya
  inputSekolah.oninput = inputWaktu.oninput = () => {
    data.sekolah = inputSekolah.value;
    data.waktu = inputWaktu.value;
    simpan();
    gambar();
  };
  pilihPaket.onchange = centangAcak.onchange = gambar;
  document.querySelectorAll('[name="mode"]').forEach(r => r.onchange = gambar);

  document.getElementById("print").onclick = () => window.print();
  document.getElementById("word").onclick = () => {
    if (items.length === 0) return alert("Belum ada soal yang bisa didownload.");
    const { paket, mode } = pengaturan();
    const bagian = { soal: "Soal", kunci: "Kunci", dua: "Soal dan Kunci" }[mode];
    unduhWord(`${namaUjian}${paket ? " Paket " + paket : ""} - ${bagian}`, htmlSekarang());
  };

  gambar();
}