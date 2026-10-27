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

// paragraf Arab di lembar cetak: rata kanan, arah kanan-ke-kiri.
// Ditulis lengkap (dir + style) karena Word nggak ngerti dir="auto".
function atributArah(teks) {
  return arah(teks) === "rtl" ? ` dir="rtl" lang="ar" style="text-align:right"` : "";
}
function spanArah(teks) {
  return arah(teks) === "rtl"
    ? `<span dir="rtl" lang="ar">${aman(teks)}</span>`
    : aman(teks);
}

// pilihan kosong dilewati, jadi hurufnya diurutkan ulang A, B, C, ...
function daftarPilihan(s) {
  return s.pilihan.filter(t => t);
}
function hurufKunci(s) {
  const sebelum = s.pilihan.slice(0, s.kunci).filter(t => t).length;
  return HURUF[sebelum];
}

// pakai kop resmi (kop.js) kalau ada, kecuali dimatikan di konfig.js
function pakaiKopResmi() {
  return typeof KOP_RESMI !== "undefined" && KONFIG.kopResmi !== false;
}

function htmlKopResmi() {
  return `
    <table class="kop-resmi" width="100%"><tr>
      <td class="kop-logo" width="80"><img src="data:image/jpeg;base64,${KOP_RESMI.logo}" alt="Logo" width="76" height="75"></td>
      <td class="kop-tulisan">${KOP_RESMI.baris.map(b => `<p class="kop-${b.gaya}">${aman(b.teks)}</p>`).join("")}</td>
    </tr></table>`;
}

function htmlKop(info, tambahan) {
  const resmi = pakaiKopResmi();
  return `
    <div class="kop${resmi ? " ada-resmi" : ""}">
      ${resmi ? htmlKopResmi() : `<p class="kop-sekolah">${aman(info.sekolah || "NAMA LEMBAGA")}</p>`}
      <p class="kop-ujian">${spanArah(info.namaUjian.toUpperCase())}${info.paket ? ` (PAKET ${info.paket})` : ""}${tambahan}</p>
      <table class="kop-info" align="center">
        <tr><td>Mata pelajaran</td><td>: ${aman(info.mapel)}</td><td>Kelas</td><td>: ${aman(info.kelas.replace(/^Kelas\s*/i, ""))} (${aman(info.jenjang)})</td></tr>
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
          ${b.judul ? `<p class="bacaan-judul">${spanArah(b.judul)}</p>` : ""}
          <p class="bacaan-teks"${atributArah(b.teks)}>${baris(b.teks)}</p>
        </td></tr>`;
    }

    let sel = `<p class="teks-soal"${atributArah(it.soal.teks)}>${baris(it.soal.teks)}</p>`;
    if (it.soal.jenis === "PG" && !denganKunci) {
      // arah tiap pilihan ikut isinya sendiri: jawaban Arab rata kanan,
      // jawaban Indonesia rata kiri (walau soalnya pakai huruf Arab)
      sel += daftarPilihan(it.soal)
        .map((t, j) => `<p class="opsi-cetak"${atributArah(t)}><span dir="ltr">${HURUF[j]}.</span> ${spanArah(t)}</p>`)
        .join("");
    }
    if (it.soal.jenis !== "PG" && denganKunci) {
      sel += `<p class="pedoman-cetak"${atributArah(it.soal.pedoman)}>${baris(it.soal.pedoman || "-")}</p>`;
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

// ====== EXPORT KE WORD (.docx asli, lihat docx.js) ======
function namaFileAman(teks) {
  return teks.replace(/[\\/:*?"<>|]/g, "-").trim();
}

// ====== LAYAR: CETAK SOAL ======
const KUNCI_CETAK = "banksoal-cetak";

function layarCetak() {
  const mp = mapelAktif();

  // ambil soal + teks bacaannya: dari modul (formatif) atau dari sumatif
  let namaUjian, items, benih, sem;
  let kelasCetak = mp.kelas;
  if (posisi.cetakDari === "modul") {
    const m = modAktif();
    sem = m;
    const bacaan = m.bacaan || [];
    let soal = m.soal || [];
    benih = m.id;
    namaUjian = `Soal Formatif: ${m.judul}`;
    if (posisi.cetakPertemuan) {
      const i = (m.pertemuan || []).findIndex(p => p.id === posisi.cetakPertemuan);
      if (i >= 0) {
        soal = soal.filter(s => s.pertemuanId === posisi.cetakPertemuan);
        namaUjian += ` (Pertemuan ${i + 1})`;
        benih += "-" + posisi.cetakPertemuan;
      }
    }
    items = soal.map(s => ({ soal: s, bacaan: bacaan.find(b => b.id === s.bacaanId) || null }));
  } else {
    const sum = sumAktif();
    // UAS bersama cuma dicetak TU
    if (posisi.uasGrup && !sayaKurikulum()) throw new DataHilang();
    sem = sum;
    namaUjian = sum.nama;
    // UAS bersama: berlaku untuk semua kelas di grupnya
    if (posisi.uasGrup) kelasCetak = `${tingkatKelas(mp.kelas)} (${mapelGrup(posisi.uasGrup).map(x => x.kelas).join(", ")})`;
    benih = sum.id;
    items = butirSumatif(mp.id, sum).map(x => ({ soal: x.soal, bacaan: x.bacaan }));
  }

  judul.textContent = "Cetak soal";
  jejak.textContent = namaUjian;
  tombolKembali.hidden = false;

  // nama lembaga & lama ujian: terakhir dipakai di perangkat ini, atau bawaan dari kurikulum
  const kunciIngat = `${KUNCI_CETAK}-${uidSaya()}`;
  const ingat = bacaLokal(kunciIngat, {});
  const lembagaAwal = ingat.sekolah || toko.lembaga.nama || KONFIG.namaLembaga || "";
  const waktuAwal = ingat.waktu || toko.lembaga.waktu || "";

  // di laptop: pengaturan di kiri, lembar soal di kanan
  isi.innerHTML = `
    <div class="layar-cetak">
    <div class="panel-cetak jangan-cetak">
      ${pakaiKopResmi()
        ? `<p class="info">Pakai kop resmi PKBM Imam Syafi'i.</p><input id="sekolah" type="hidden" value="${aman(lembagaAwal)}">`
        : `<label>Nama lembaga di kop <input id="sekolah" value="${aman(lembagaAwal)}" placeholder="PKBM ..."></label>`}
      <label>Lama ujian <input id="waktu" value="${aman(waktuAwal)}" placeholder="60 menit"></label>
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
      <fieldset>
        <legend>Yang dicetak</legend>
        <div class="pilih-jenis tiga">
          <label class="radio"><input type="radio" name="mode" value="soal" checked> Soal</label>
          <label class="radio"><input type="radio" name="mode" value="kunci"> Kunci</label>
          <label class="radio"><input type="radio" name="mode" value="dua"> Keduanya</label>
        </div>
      </fieldset>
      <div class="baris-tombol">
        <button class="tombol-utama" id="print">Cetak / PDF</button>
        <button class="tombol-kedua" id="word">Download Word</button>
      </div>
      <p class="info">Mau jadi PDF? Di jendela cetak, pilih tujuan "Simpan sebagai PDF". File Word bisa diedit lagi, misalnya buat ganti kop.</p>
    </div>
    <div id="lembar"></div>
    </div>`;

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

  function infoSekarang() {
    const { paket } = pengaturan();
    return {
      sekolah: inputSekolah.value,
      waktu: inputWaktu.value,
      namaUjian,
      paket,
      mapel: mp.nama,
      kelas: kelasCetak,
      jenjang: mp.jenjang,
      semester: namaSemester(sem)
    };
  }

  function htmlSekarang() {
    const { paket, mode } = pengaturan();
    const info = infoSekarang();
    const { pg, esai } = siapkanLembar(items, paket, centangAcak.checked, benih);
    if (mode === "soal") return htmlLembarSoal(info, pg, esai);
    if (mode === "kunci") return htmlLembarKunci(info, pg, esai, false);
    return htmlLembarSoal(info, pg, esai) + htmlLembarKunci(info, pg, esai, true);
  }

  function gambar() {
    document.getElementById("bagianAcakPilihan").hidden = !["B", "C", "D"].includes(pilihPaket.value);
    if (items.length === 0) {
      lembar.innerHTML = `<p class="kosong">Belum ada soal yang bisa dicetak.</p>`;
      return;
    }
    lembar.innerHTML = htmlSekarang();
  }

  inputSekolah.oninput = inputWaktu.oninput = () => {
    tulisLokal(kunciIngat, { sekolah: inputSekolah.value, waktu: inputWaktu.value });
    gambar();
  };
  pilihPaket.onchange = centangAcak.onchange = gambar;
  document.querySelectorAll('[name="mode"]').forEach(r => r.onchange = gambar);

  document.getElementById("print").onclick = () => {
    if (items.length === 0) return kabar("Belum ada soal yang bisa dicetak.");
    window.print();
  };
  document.getElementById("word").onclick = () => {
    if (items.length === 0) return kabar("Belum ada soal yang bisa didownload.");
    const { paket, mode } = pengaturan();
    const bagian = { soal: "Soal", kunci: "Kunci", dua: "Soal dan Kunci" }[mode];
    const { pg, esai } = siapkanLembar(items, paket, centangAcak.checked, benih);
    const nama = namaFileAman(`${namaUjian}${paket ? " Paket " + paket : ""} - ${bagian}`);
    const blob = buatDocx(infoSekarang(), pg, esai, mode, pakaiKopResmi());
    berikanFile(new File([blob], nama + ".docx", { type: blob.type }));
  };

  gambar();
}