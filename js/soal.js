// =====================================================
//  soal.js — KARTU & ISIAN SOAL
//  Dipakai modul, ujian sumatif, UAS, dan AI: kartuSoal() buat nampilin satu soal,
//  htmlIsianSoal() / pasangIsianSoal() / bacaIsianSoal() buat form isian soal.
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
