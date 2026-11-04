// =====================================================
//  bobot.js — layar bobot nilai (khusus admin), satu set per jenjang & jenis mapel.
//  Konstanta & hitungannya (KELOMPOK_NILAI, bobotUntuk, hitungNilai) ada di nilai.js.
// =====================================================
const JENIS_MAPEL = ["umum", "diniah"];

function layarBobot() {
  wajibKurikulum();
  judul.textContent = "Bobot nilai";
  jejak.textContent = "Berlaku untuk semua mapel sesuai jenjang & jenisnya";

  const jenjang = JENJANG_PKBM;
  const isian = {};
  for (const j of jenjang) {
    isian[j] = {};
    for (const t of JENIS_MAPEL) isian[j][t] = bobotUntuk(j, t);
  }
  const jumlahMapel = (j, t) => toko.mapel.filter(m => m.jenjang === j && jenisMapel(m) === t).length;
  const kunci = (j, t) => `${j}|${t}`;

  let h = `<p class="info">Nilai akhir tiap mapel = gabungan rata-rata tiap kelompok sesuai bobot di bawah. Kelompok yang bobotnya 0% nggak dihitung. Kehadiran dihitung otomatis dari hadir ÷ (hadir + sakit + izin) × 100. Ustadz/ustadzah cuma bisa melihat bobot ini.</p>`;
  for (const j of jenjang) {
    h += `<h2 class="subjudul">${aman(j)}</h2><div class="grid-bobot">`;
    for (const t of JENIS_MAPEL) {
      h += `
        <section class="bagian kartu-bobot" data-jenis="${aman(kunci(j, t))}">
          <h2>Mapel ${namaJenis(t).toLowerCase()} <small>${jumlahMapel(j, t)} mapel</small></h2>
          <div class="isian-bobot">
            ${KELOMPOK_NILAI.map(g => `<label>${g.nama}<span class="kotak-persen"><input type="number" inputmode="numeric" min="0" max="100" data-jenjang="${aman(j)}" data-jenis="${t}" data-bobot="${g.k}" value="${isian[j][t][g.k]}"><span>%</span></span></label>`).join("")}
          </div>
          <p class="total-bobot" data-total="${aman(kunci(j, t))}"></p>
        </section>`;
    }
    h += `</div>`;
  }
  h += `
    <div class="baris-tombol">
      <button class="tombol-utama" id="simpanBobot">Simpan bobot</button>
      <button class="tombol-teks" id="bawaanBobot">Pakai bobot bawaan</button>
      <span class="tersimpan" id="pesanSimpanBobot" role="status"></span>
    </div>
    <p class="info">Kalau bobot diubah di tengah semester, nilai akhir semua siswa langsung dihitung ulang. Nilai yang sudah diisi ustadz nggak berubah.</p>`;
  isi.innerHTML = h;

  const pesan = document.getElementById("pesanSimpanBobot");
  const tulisTotal = () => {
    let semuaPas = true;
    for (const j of jenjang) for (const t of JENIS_MAPEL) {
      const total = KELOMPOK_NILAI.reduce((a, g) => a + (Number(isian[j][t][g.k]) || 0), 0);
      const el = isi.querySelector(`[data-total="${CSS.escape(kunci(j, t))}"]`);
      el.textContent = `Total ${total}%${total === 100 ? "" : " · sebaiknya pas 100%"}`;
      el.classList.toggle("salah", total !== 100);
      if (total !== 100) semuaPas = false;
    }
    return semuaPas;
  };
  tulisTotal();

  isi.querySelectorAll("input[data-bobot]").forEach(inp => {
    inp.oninput = () => {
      isian[inp.dataset.jenjang][inp.dataset.jenis][inp.dataset.bobot] = Math.max(0, Math.min(100, Math.round(Number(inp.value) || 0)));
      pesan.textContent = "";
      tulisTotal();
    };
  });
  document.getElementById("simpanBobot").onclick = async () => {
    if (!tulisTotal() && !(await tanyaYakin("Total bobot belum pas 100%. Tetap simpan?\n\n(Nilai akhir tetap dihitung adil: dibagi total bobot yang ada.)", { ya: "Tetap simpan" }))) return;
    const data = { diubah: Date.now(), diubahOleh: uidSaya() };
    for (const j of jenjang) data[j] = { umum: { ...isian[j].umum }, diniah: { ...isian[j].diniah } };
    simpanBobot(data);
    formKotor = false;   // udah disimpan, tetap di layar ini
    pesan.textContent = "Tersimpan";
  };
  document.getElementById("bawaanBobot").onclick = () => {
    for (const j of jenjang) for (const t of JENIS_MAPEL) {
      Object.assign(isian[j][t], BOBOT_BAWAAN[t]);
      for (const g of KELOMPOK_NILAI) isi.querySelector(`input[data-jenjang="${CSS.escape(j)}"][data-jenis="${t}"][data-bobot="${g.k}"]`).value = isian[j][t][g.k];
    }
    pesan.textContent = "Belum disimpan";
    tulisTotal();
  };
}
