// =====================================================
//  cari.js — CARI SOAL
// =====================================================
function sorot(teks, kata) {
  const kecil = teks.toLowerCase();
  const k = kata.toLowerCase();
  let hasil = "";
  let dari = 0;
  let pos;
  while ((pos = kecil.indexOf(k, dari)) !== -1) {
    hasil += aman(teks.slice(dari, pos)) + `<mark>${aman(teks.slice(pos, pos + k.length))}</mark>`;
    dari = pos + k.length;
  }
  return hasil + aman(teks.slice(dari));
}

function layarCari() {
  judul.textContent = "Cari soal";
  jejak.textContent = sayaKurikulum() ? "Di semua mapel" : "Di mapel yang kamu ampu";

  isi.innerHTML = `
    <input type="search" id="kataCari" value="${aman(posisi.kata || "")}" placeholder="Ketik kata yang ada di soal" aria-label="Kata yang dicari">
    <div id="hasilCari" class="kolom"></div>`;

  const input = document.getElementById("kataCari");
  const tempat = document.getElementById("hasilCari");

  function cari() {
    const kata = input.value.trim();
    posisi.kata = kata;
    if (kata.length < 2) {
      tempat.innerHTML = `<p class="info">Ketik minimal 2 huruf.</p>`;
      return;
    }
    const kecil = kata.toLowerCase();
    const hasil = [];
    for (const mp of mapelTerlihat()) {
      for (const m of modulMapel(mp.id)) {
        for (const s of m.soal || []) {
          const semuaTeks = [s.teks, ...(s.pilihan || []), s.pedoman || ""].join(" ").toLowerCase();
          if (!semuaTeks.includes(kecil)) continue;
          // kata yang dicari ada di jawaban / pedoman (bukan di pertanyaannya): tunjukkan juga
          let lain = null;
          if (!s.teks.toLowerCase().includes(kecil)) {
            const i = (s.pilihan || []).findIndex(x => (x || "").toLowerCase().includes(kecil));
            lain = i >= 0 ? { label: `Jawaban ${HURUF[i]}`, teks: s.pilihan[i] } : { label: "Pedoman", teks: s.pedoman || "" };
          }
          hasil.push({ mp, m, s, lain });
        }
      }
    }
    if (hasil.length === 0) {
      tempat.innerHTML = `<p class="kosong">Nggak ada soal yang mengandung "${aman(kata)}".</p>`;
      return;
    }
    let h = `<p class="info">${hasil.length} soal ketemu${hasil.length > 100 ? ", ditampilkan 100 pertama" : ""}</p><div class="daftar">`;
    for (const x of hasil.slice(0, 100)) {
      h += `
        <button class="baris hasil" data-mapel="${aman(x.mp.id)}" data-mod="${aman(x.m.id)}">
          <span class="baris-isi">
            <span class="teks-hasil" dir="auto">${x.lain ? aman(potong(x.s.teks, 120)) : sorot(x.s.teks, kata)}</span>
            ${x.lain ? `<span class="baris-sub">${x.lain.label}: <span dir="auto">${sorot(potong(x.lain.teks, 120), kata)}</span></span>` : ""}
            <span class="baris-sub">${aman(namaMapel(x.mp))}, ${aman(namaSemester(x.m))}, <span dir="auto">${aman(x.m.judul)}</span>${milikSaya(x.m) ? "" : ` · ${aman(x.m.namaPemilik)}`}</span>
          </span>
          <span class="baris-panah" aria-hidden="true">›</span>
        </button>`;
    }
    tempat.innerHTML = h + `</div>`;
    tempat.querySelectorAll(".baris").forEach(b => {
      b.onclick = () => {
        const m = modulMapel(b.dataset.mapel).find(y => y.id === b.dataset.mod);
        pergi("modul", { mapelId: b.dataset.mapel, modId: b.dataset.mod, semester: m ? kunciSemester(m) : null, tab: "modul" });
      };
    });
  }
  input.oninput = cari;
  cari();
  input.focus();
}
