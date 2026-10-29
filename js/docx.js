// =====================================================
//  docx.js — bikin file Word ASLI (.docx) langsung di browser
//
//  Isinya: kop resmi (kop.js) + identitas ujian + soal / kunci.
//  File .docx itu sebenarnya file ZIP berisi beberapa file XML,
//  jadi di sini ada pembuat ZIP kecil sendiri (tanpa internet).
// =====================================================

// ====== PEMBUAT ZIP (tanpa kompresi, cukup buat Word) ======
const TABEL_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(data) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) c = TABEL_CRC[(c ^ data[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function buatZip(daftar) {
  const enc = new TextEncoder();
  const bagian = [];
  const pusat = [];
  let posisiFile = 0;
  for (const f of daftar) {
    const nama = enc.encode(f.nama);
    const data = typeof f.isi === "string" ? enc.encode(f.isi) : f.isi;
    const crc = crc32(data);
    const lokal = new DataView(new ArrayBuffer(30));
    lokal.setUint32(0, 0x04034b50, true);
    lokal.setUint16(4, 20, true);       // versi
    lokal.setUint16(6, 0x0800, true);   // nama file UTF-8
    lokal.setUint16(8, 0, true);        // tanpa kompresi
    lokal.setUint16(10, 0, true); lokal.setUint16(12, 0x21, true); // jam & tanggal (1 Jan 1980)
    lokal.setUint32(14, crc, true);
    lokal.setUint32(18, data.length, true);
    lokal.setUint32(22, data.length, true);
    lokal.setUint16(26, nama.length, true);
    lokal.setUint16(28, 0, true);
    bagian.push(new Uint8Array(lokal.buffer), nama, data);

    const p = new DataView(new ArrayBuffer(46));
    p.setUint32(0, 0x02014b50, true);
    p.setUint16(4, 20, true); p.setUint16(6, 20, true);
    p.setUint16(8, 0x0800, true); p.setUint16(10, 0, true);
    p.setUint16(12, 0, true); p.setUint16(14, 0x21, true);
    p.setUint32(16, crc, true);
    p.setUint32(20, data.length, true);
    p.setUint32(24, data.length, true);
    p.setUint16(28, nama.length, true);
    p.setUint32(42, posisiFile, true);
    pusat.push(new Uint8Array(p.buffer), nama);
    posisiFile += 30 + nama.length + data.length;
  }
  const ukuranPusat = pusat.reduce((n, b) => n + b.length, 0);
  const akhir = new DataView(new ArrayBuffer(22));
  akhir.setUint32(0, 0x06054b50, true);
  akhir.setUint16(8, daftar.length, true);
  akhir.setUint16(10, daftar.length, true);
  akhir.setUint32(12, ukuranPusat, true);
  akhir.setUint32(16, posisiFile, true);
  return new Blob([...bagian, ...pusat, new Uint8Array(akhir.buffer)],
    { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}

// ====== POTONGAN XML WORD ======
function xmlAman(t) {
  return String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
    // karakter kontrol bikin Word nolak file-nya
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}

// satu potong tulisan. o: { b, i, sz (setengah poin), arab, font, warna }
function wRun(teks, o = {}) {
  let rPr = "";
  if (o.font) rPr += `<w:rFonts w:ascii="${o.font}" w:hAnsi="${o.font}"/>`;
  if (o.b) rPr += "<w:b/><w:bCs/>";
  if (o.i) rPr += "<w:i/><w:iCs/>";
  if (o.warna) rPr += `<w:color w:val="${o.warna}"/>`;
  if (o.sz) rPr += `<w:sz w:val="${o.sz}"/><w:szCs w:val="${o.szCs || o.sz}"/>`;
  if (o.arab) rPr += "<w:rtl/>";
  const isi = String(teks ?? "").split("\n").map(t => `<w:t xml:space="preserve">${xmlAman(t)}</w:t>`).join("<w:br/>");
  return `<w:r>${rPr ? `<w:rPr>${rPr}</w:rPr>` : ""}${isi}</w:r>`;
}
const wTab = `<w:r><w:tab/></w:r>`;

// tulisan campur: potongan Arab ditandai rtl biar urutannya bener
function wTeks(teks, o = {}) {
  const potongan = String(teks ?? "").split(/([֐-ࣿיִ-﷿ﹰ-﻿][֐-ࣿיִ-﷿ﹰ-﻿\sً-ٟ«»؟،.,:!?()0-9]*)/);
  return potongan.filter(x => x !== "").map(x => wRun(x, { ...o, arab: HURUF_ARAB.test(x) })).join("");
}

// satu paragraf. o: { rtl, jc, kiri, gantung, sebelum, setelah, garisKiri, keepNext, halamanBaru }
function wPara(isi, o = {}) {
  let pPr = "";
  if (o.keepNext) pPr += "<w:keepNext/>";
  if (o.halamanBaru) pPr += "<w:pageBreakBefore/>";
  if (o.garisKiri) pPr += `<w:pBdr><w:left w:val="single" w:sz="12" w:space="6" w:color="000000"/></w:pBdr>`;
  if (o.rtl) pPr += "<w:bidi/>";
  pPr += `<w:spacing w:before="${o.sebelum || 0}" w:after="${o.setelah ?? 60}"/>`;
  if (o.kiri || o.gantung) pPr += `<w:ind w:left="${o.kiri || 0}" w:hanging="${o.gantung || 0}"/>`;
  else pPr += `<w:ind w:left="0" w:hanging="0"/>`;
  // paragraf Arab: rata ikut arah bawaannya (kanan), jadi nggak dikasih jc
  if (o.jc && !o.rtl) pPr += `<w:jc w:val="${o.jc}"/>`;
  return `<w:p><w:pPr>${pPr}</w:pPr>${isi}</w:p>`;
}

// tabel tanpa garis. kolom: lebar tiap kolom (twip); baris: array of array isi-sel (XML paragraf)
function wTabel(kolom, baris, o = {}) {
  const tanpaGaris = ["top", "left", "bottom", "right", "insideH", "insideV"].map(s => `<w:${s} w:val="nil"/>`).join("");
  let h = `<w:tbl><w:tblPr><w:tblW w:w="${kolom.reduce((a, b) => a + b, 0)}" w:type="dxa"/>${o.tengah ? `<w:jc w:val="center"/>` : ""}<w:tblBorders>${tanpaGaris}</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="60" w:type="dxa"/><w:right w:w="60" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>`;
  h += kolom.map(w => `<w:gridCol w:w="${w}"/>`).join("") + `</w:tblGrid>`;
  for (const b of baris) {
    h += `<w:tr>`;
    b.forEach((sel, i) => {
      const garis = o.garisBawah ? `<w:tcBorders><w:bottom w:val="dotted" w:sz="6" w:space="0" w:color="000000"/></w:tcBorders>` : "";
      h += `<w:tc><w:tcPr><w:tcW w:w="${kolom[i]}" w:type="dxa"/>${garis}</w:tcPr>${sel || wPara("", { setelah: 0 })}</w:tc>`;
    });
    h += `</w:tr>`;
  }
  return h + `</w:tbl>`;
}

// ====== ISI LEMBAR ======
const TWIP_NOMOR = 400;   // lebar kolom nomor soal
const TWIP_HURUF = 400;   // lebar huruf pilihan

function wKopSederhana(info) {
  return wPara(wRun((info.sekolah || "NAMA LEMBAGA").toUpperCase(), { b: true, sz: 28 }), { jc: "center", setelah: 0 }) +
    `<w:p><w:pPr><w:pBdr><w:bottom w:val="thickThinSmallGap" w:sz="24" w:space="1" w:color="auto"/></w:pBdr><w:spacing w:after="120"/></w:pPr></w:p>`;
}

function wJudulUjian(info, tambahan) {
  const judul = info.namaUjian.toUpperCase() + (info.paket ? ` (TIPE ${info.paket})` : "") + tambahan;
  return wPara(wTeks(judul, { b: true, sz: 24 }), { jc: "center", sebelum: 160, setelah: 120, rtl: arah(info.namaUjian) === "rtl" });
}

function wInfoUjian(info) {
  const p = (t) => wPara(wTeks(t, { sz: 22 }), { setelah: 0 });
  return wTabel([1700, 3200, 1000, 2700], [
    [p("Mata pelajaran"), p(": " + info.mapel), p("Kelas"), p(`: ${info.kelas.replace(/^Kelas\s*/i, "")} (${info.jenjang})`)],
    [p("Semester"), p(": " + info.semester), p("Waktu"), p(": " + (info.waktu || "-"))]
  ], { tengah: true });
}

function wIdentitas() {
  const p = (t) => wPara(wRun(t, { sz: 22 }), { sebelum: 160, setelah: 0 });
  return wPara("", { setelah: 0 }) + wTabel([3600, 3000, 3000], [[p("Nama:"), p("Kelas:"), p("No. Absen:")]], { garisBawah: true }) + wPara("", { setelah: 60 });
}

function wDaftarSoal(items, denganKunci, mulai = 1) {
  let h = "";
  items.forEach((it, i) => {
    const s = it.soal, b = it.bacaan;
    const awalBacaan = b && (i === 0 || !items[i - 1].bacaan || items[i - 1].bacaan.id !== b.id);
    if (awalBacaan && !denganKunci) {
      let akhir = i;
      while (akhir + 1 < items.length && items[akhir + 1].bacaan && items[akhir + 1].bacaan.id === b.id) akhir++;
      const rentang = akhir > i ? `nomor ${i + mulai}–${akhir + mulai}` : `nomor ${i + mulai}`;
      h += wPara(wRun(`Bacalah teks berikut untuk menjawab soal ${rentang}!`, { i: true }), { sebelum: 120, keepNext: true });
      if (b.judul) h += wPara(wTeks(b.judul, { b: true }), { jc: "center", keepNext: true, rtl: arah(b.judul) === "rtl" });
      h += wPara(wTeks(b.teks), { jc: "both", setelah: 120, rtl: arah(b.teks) === "rtl" });
    }

    const rtl = arah(s.teks) === "rtl";
    const adaLanjutan = (s.jenis === "PG" && !denganKunci) || (s.jenis !== "PG" && denganKunci);
    // \u200E (tanda kiri-ke-kanan) biar di paragraf Arab tulisannya tetap "1." bukan ".1"
    const lrm = (rtl) => rtl ? "\u200E" : "";
    h += wPara(wRun(`${i + mulai}.${lrm(rtl)}`) + wTab + wTeks(s.teks), { kiri: TWIP_NOMOR, gantung: TWIP_NOMOR, rtl, keepNext: adaLanjutan, setelah: adaLanjutan ? 40 : 160 });

    if (s.jenis === "PG" && !denganKunci) {
      const pilihan = daftarPilihan(s);
      pilihan.forEach((t, j) => {
        const terakhir = j === pilihan.length - 1;
        h += wPara(wRun(`${HURUF[j]}.${lrm(arah(t) === "rtl")}`) + wTab + wTeks(t), {
          kiri: TWIP_NOMOR + TWIP_HURUF, gantung: TWIP_HURUF, rtl: arah(t) === "rtl",
          keepNext: !terakhir, setelah: terakhir ? 160 : 20
        });
      });
    }
    if (s.jenis !== "PG" && denganKunci) {
      h += wPara(wTeks(s.pedoman || "-"), { kiri: TWIP_NOMOR + 120, garisKiri: true, setelah: 160, rtl: arah(s.pedoman) === "rtl" });
    }
  });
  return h;
}

// ====== KOP LEMBAR ASESMEN (sama kayak file KOP_ASESMEN_*.docx sekolah) ======
// logo melayang di kiri (rIdKopAsesmen), 4 baris di tengah, lalu kotak identitas bergaris ganda
function wKopAsesmen(info, tambahan, nomorGambar) {
  const cx = 694966, cy = 685800;   // ukuran logo di file aslinya (EMU)
  const logo = `<w:r><w:rPr><w:noProof/></w:rPr><w:drawing><wp:anchor distT="0" distB="0" distL="114300" distR="114300" simplePos="0" relativeHeight="${251659264 + nomorGambar}" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="column"><wp:posOffset>202607</wp:posOffset></wp:positionH><wp:positionV relativeFrom="paragraph"><wp:posOffset>66676</wp:posOffset></wp:positionV><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="${nomorGambar}" name="Logo PKBM ${nomorGambar}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="logo-pkbm.png"/><pic:cNvPicPr><a:picLocks noChangeAspect="1"/></pic:cNvPicPr></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdKopAsesmen"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
  const baris = (isi, o) => wPara(isi, { jc: "center", setelah: 0, ...o });
  const judul = info.judulKop.toUpperCase();
  let h = baris(logo + wRun(KOP_ASESMEN.lembaga, { font: "Abadi", sz: 32 }));
  h += baris(wRun(judul, { font: "Abadi", b: true, sz: 32 }));
  h += baris(wRun(kejarAsesmen(info.jenjang).kejar, { font: "Arial", sz: 28 }));
  h += baris(wRun(`Tahun Pelajaran ${info.tahun || "......./........"}`, { font: "Arial", sz: 28 }));
  h += `<w:p><w:pPr><w:spacing w:before="0" w:after="0"/><w:rPr><w:sz w:val="2"/></w:rPr></w:pPr></w:p>`;

  // kotak identitas: garis ganda atas & bawah, garis tunggal kiri & kanan (persis file aslinya)
  const sel = (t, lebar) => `<w:tc><w:tcPr><w:tcW w:w="${lebar}" w:type="dxa"/></w:tcPr>${wPara(wTeks(t, { sz: 24 }), { setelah: 0 })}</w:tc>`;
  const isi = (t) => t ? `: ${t}` : ":";
  const kolom = [2253, 3079, 2024, 3118];
  const data = [
    ["Mata Pelajaran", isi(info.mapel), "Nama Peserta", ":"],
    ["Hari/Tanggal", ":", "No. Ujian", ":"],
    ["Waktu", isi(info.waktu), "Nilai", ":"],
    ["Kelas", isi(info.kelas.replace(/^Kelas\s*/i, "")), "Pengajar", isi(info.pengajar)]
  ];
  h += `<w:tbl><w:tblPr><w:tblW w:w="10474" w:type="dxa"/><w:jc w:val="center"/><w:tblBorders><w:top w:val="thinThickMediumGap" w:sz="24" w:space="0" w:color="auto"/><w:left w:val="single" w:sz="12" w:space="0" w:color="auto"/><w:bottom w:val="thickThinMediumGap" w:sz="24" w:space="0" w:color="auto"/><w:right w:val="single" w:sz="12" w:space="0" w:color="auto"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>${kolom.map(w => `<w:gridCol w:w="${w}"/>`).join("")}</w:tblGrid>`;
  for (const b of data) h += `<w:tr><w:trPr><w:jc w:val="center"/></w:trPr>${b.map((t, i) => sel(t, kolom[i])).join("")}</w:tr>`;
  h += `</w:tbl>`;
  const ket = keteranganAsesmen(info, tambahan);
  if (ket) h += wPara(wTeks(ket, { b: true }), { jc: "center", sebelum: 120, setelah: 0, rtl: arah(ket) === "rtl" });
  return h;
}

// footer: tulisan miring abu-abu + nomor halaman di kotak hitam (kayak file aslinya)
function wFooterAsesmen(info) {
  const nomor = (isi) => `<w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/><w:sz w:val="24"/><w:shd w:val="clear" w:color="auto" w:fill="000000"/></w:rPr>${isi}</w:r>`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr ${NS_W}><w:p><w:pPr><w:pBdr><w:top w:val="single" w:sz="8" w:space="4" w:color="000000"/></w:pBdr><w:tabs><w:tab w:val="right" w:pos="10489"/></w:tabs><w:spacing w:before="0" w:after="0"/></w:pPr>${wRun(footerAsesmen(info), { i: true, sz: 18, warna: "595959" })}${wTab}${nomor(`<w:t xml:space="preserve">  </w:t>`)}${nomor(`<w:fldChar w:fldCharType="begin"/>`)}${nomor(`<w:instrText xml:space="preserve"> PAGE </w:instrText>`)}${nomor(`<w:fldChar w:fldCharType="separate"/>`)}${nomor(`<w:t>1</w:t>`)}${nomor(`<w:fldChar w:fldCharType="end"/>`)}${nomor(`<w:t xml:space="preserve">  </w:t>`)}</w:p></w:ftr>`;
}

function wLembarSoal(info, pg, esai, kopAsesmen) {
  let h = kopAsesmen ? wPara("", { setelah: 60 }) : wJudulUjian(info, "") + wInfoUjian(info) + wIdentitas();
  if (pg.length) {
    h += wPara(wRun("A. Pilihan Ganda", { b: true }), { sebelum: 120, keepNext: true });
    h += wPara(wRun("Pilihlah jawaban yang paling tepat!", { i: true }), { setelah: 120, keepNext: true });
    h += wDaftarSoal(pg, false);
  }
  if (esai.length) {
    h += wPara(wRun(`${pg.length ? "B" : "A"}. Esai`, { b: true }), { sebelum: 120, keepNext: true });
    h += wPara(wRun("Jawablah pertanyaan berikut dengan jelas!", { i: true }), { setelah: 120, keepNext: true });
    h += wDaftarSoal(esai, false);
  }
  return h;
}

function wLembarKunci(info, pg, esai, kopAsesmen) {
  let h = (kopAsesmen ? "" : wJudulUjian(info, " — KUNCI JAWABAN") + wInfoUjian(info)) + wPara("", { setelah: 120 });
  if (pg.length) {
    h += wPara(wRun("A. Pilihan Ganda", { b: true }), { sebelum: 120, setelah: 120, keepNext: true });
    const baris = [];
    for (let i = 0; i < pg.length; i += 5) {
      const b = [];
      for (let j = i; j < i + 5; j++) {
        b.push(j < pg.length ? wPara(wRun(`${j + 1}. `) + wRun(hurufKunci(pg[j].soal), { b: true }), { setelah: 40 }) : "");
      }
      baris.push(b);
    }
    h += wTabel([1900, 1900, 1900, 1900, 1900], baris);
  }
  if (esai.length) {
    h += wPara(wRun(`${pg.length ? "B" : "A"}. Esai`, { b: true }), { sebelum: 200, setelah: 120, keepNext: true });
    h += wDaftarSoal(esai, true);
  }
  return h;
}

// ====== RAKIT FILE .docx ======
function base64keByte(b64) {
  const s = atob(b64);
  const a = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i);
  return a;
}

const NS_W = `xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"`;
const NS_GAMBAR = `xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"`;

// mode: "soal" | "kunci" | "dua"
// kopResmi: true = kop lembar asesmen (KOP_ASESMEN), false = kop sederhana (nama lembaga aja)
function buatDocx(info, pg, esai, mode, kopResmi) {
  const asesmen = kopResmi && typeof KOP_ASESMEN !== "undefined";
  // kop bisa muncul 2x (soal + kunci): nomor gambarnya harus beda
  let nomorKop = 0;
  const kop = (tambahan) => asesmen ? wKopAsesmen(info, tambahan, ++nomorKop) : wKopSederhana(info);
  let badan = "";
  if (mode === "soal" || mode === "dua") badan += kop("") + wLembarSoal(info, pg, esai, asesmen);
  if (mode === "kunci" || mode === "dua") {
    const kunci = kop(" — KUNCI JAWABAN") + wLembarKunci(info, pg, esai, asesmen);
    // halaman baru sebelum lembar kunci
    badan += mode === "dua" ? `<w:p><w:r><w:br w:type="page"/></w:r></w:p>` + kunci : kunci;
  }
  // kop asesmen: kertas F4 + footer (margin sama kayak file aslinya); kop sederhana: A4
  const sect = asesmen
    ? `<w:sectPr><w:footerReference w:type="default" r:id="rIdFooter"/><w:pgSz w:w="12242" w:h="18711" w:code="9"/><w:pgMar w:top="709" w:right="851" w:bottom="1134" w:left="851" w:header="709" w:footer="425" w:gutter="0"/><w:cols w:space="720"/></w:sectPr>`
    : `<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="851" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/><w:cols w:space="720"/></w:sectPr>`;
  const dokumen = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:document ${NS_W} ${NS_GAMBAR}><w:body>${badan}${sect}</w:body></w:document>`;
  const gaya = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles ${NS_W}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman" w:cs="Traditional Arabic"/><w:sz w:val="24"/><w:szCs w:val="32"/><w:lang w:val="id-ID" w:bidi="ar-SA"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="60" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style><w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style></w:styles>`;

  const relasi = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${asesmen ? `<Relationship Id="rIdKopAsesmen" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/logo-pkbm.png"/><Relationship Id="rIdFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>` : ""}</Relationships>`;

  const jenis = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>${asesmen ? `<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>` : ""}</Types>`;

  const akarRelasi = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;

  const daftar = [
    { nama: "[Content_Types].xml", isi: jenis },
    { nama: "_rels/.rels", isi: akarRelasi },
    { nama: "word/document.xml", isi: dokumen },
    { nama: "word/styles.xml", isi: gaya },
    { nama: "word/_rels/document.xml.rels", isi: relasi }
  ];
  if (asesmen) {
    daftar.push({ nama: "word/media/logo-pkbm.png", isi: base64keByte(KOP_ASESMEN.logo) });
    daftar.push({ nama: "word/footer1.xml", isi: wFooterAsesmen(info) });
  }
  return buatZip(daftar);
}