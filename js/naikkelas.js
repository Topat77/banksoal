// =====================================================
//  naikkelas.js — riwayat kelas santri & naik kelas serentak (khusus admin/TU)
//
//  Tiap santri nyimpen riwayatKelas: [{ tahun, jenjang, kelas, absen, hasil }]
//  hasil: "naik" | "tinggal" | "lulus" | "pindah". Ditulis waktu naik kelas (atau
//  waktu ditandai pindah), SEBELUM kelas sekarang diganti. Jadi rapor tahun lalu tetap
//  bisa nyari kelas santri di tahun itu, walau dia udah naik / lulus / pindah.
//
//  Santri lulus / pindah: status "lulus" / "pindah", aktif:false, kelasId dicopot
//  (biar nggak ikut dibaca guru kelas mana pun). Datanya tetap ada, rapornya tetap bisa dibuka.
// =====================================================

const TINGKAT_AKHIR = { "Paket B": 9, "Paket C": 12 };
const HASIL_NAIK = { naik: "Naik kelas", tinggal: "Tinggal kelas", lulus: "Lulus", pindah: "Pindah sekolah" };

function tingkatAkhir(jenjang, kelas) {
  const t = Number(tingkatKelas(kelas));
  return TINGKAT_AKHIR[jenjang] !== undefined && t === TINGKAT_AKHIR[jenjang];
}
// 7A1 → 8A1 (angka depannya ditambah satu). Kalau nggak ada angkanya, kelasnya tetap.
function tebakKelasTujuan(kelas) {
  const k = String(kelas || "").trim();
  return /^\d+/.test(k) ? k.replace(/^\d+/, n => String(Number(n) + 1)) : k;
}
function tahunBerikut(tahun) {        // "2025/2026" → "2026/2027"
  const m = String(tahun || "").match(/^(\d{4})\/(\d{4})$/);
  return m ? `${Number(m[1]) + 1}/${Number(m[2]) + 1}` : "";
}
function tahunSebelum(tahun) {
  const m = String(tahun || "").match(/^(\d{4})\/(\d{4})$/);
  return m ? `${Number(m[1]) - 1}/${Number(m[2]) - 1}` : "";
}

function riwayatSantri(s) {
  return Array.isArray(s && s.riwayatKelas) ? s.riwayatKelas.filter(r => r && typeof r === "object" && typeof r.tahun === "string") : [];
}
function riwayatTahun(s, tahun) {
  return riwayatSantri(s).find(r => r.tahun === tahun) || null;
}
function santriKeluar(s) {
  return s.status === "lulus" || s.status === "pindah";
}
// kelas santri di satu tahun ajaran: dari riwayat kalau ada, kalau nggak ya kelas sekarang
function kelasSantriDi(s, tahun) {
  const r = riwayatTahun(s, tahun);
  return r && typeof r.jenjang === "string" && typeof r.kelas === "string"
    ? { jenjang: r.jenjang, kelas: r.kelas, absen: r.absen }
    : { jenjang: s.jenjang, kelas: s.kelas, absen: s.absen };
}
// santri yang ada di satu kelas pada tahun itu (yang udah lulus / pindah ikut, asal tercatat di tahun itu)
function santriKelasDi(jenjang, kelas, tahun) {
  const nomor = (x) => x.absen === undefined || x.absen === null || x.absen === "" ? Infinity : Number(x.absen);
  return toko.santri
    .filter(s => s.aktif !== false || riwayatTahun(s, tahun))
    .map(s => ({ s, k: kelasSantriDi(s, tahun) }))
    .filter(x => x.k.jenjang === jenjang && x.k.kelas === kelas)
    .sort((a, c) => (nomor(a.k) - nomor(c.k)) || (a.s.nama || "").localeCompare(c.s.nama || "", "id"))
    .map(x => x.s);
}
// kelas yang punya santri di tahun itu (buat pilihan kelas di rapor)
function kelasDiTahun(tahun) {
  const peta = new Map();
  for (const s of toko.santri) {
    const r = riwayatTahun(s, tahun);
    if (r && r.jenjang && r.kelas) peta.set(`${r.jenjang}|${r.kelas}`, { jenjang: r.jenjang, kelas: r.kelas });
  }
  return [...peta.values()];
}

// santri baru setelah naik kelas / tinggal / lulus / pindah di akhir `tahun`.
// Kalau riwayat tahun itu udah ada, nggak diubah (proses diulang = aman, nggak dobel).
// sudah diproses di tahun itu ATAU tahun sesudahnya (biar nutup tahun lama belakangan nggak bikin naik dua kali)
function sudahDiproses(s, tahun) {
  return riwayatSantri(s).some(r => r.tahun >= tahun);
}
function terapkanNaikKelas(s, tahun, hasil, kelasTujuan) {
  if (sudahDiproses(s, tahun) || !HASIL_NAIK[hasil]) return null;
  const baru = salin(s);
  baru.riwayatKelas = [...riwayatSantri(s), { tahun, jenjang: s.jenjang, kelas: s.kelas, absen: s.absen ?? "", hasil }];
  if (hasil === "naik") {
    const k = String(kelasTujuan || "").trim();
    if (!k) return null;
    baru.kelas = k;
  } else if (hasil === "lulus" || hasil === "pindah") {
    baru.status = hasil;
    baru.aktif = false;
    baru.keluar = { tahun, tanggal: Date.now() };
  }
  return baru;
}
// tandai pindah sekolah di tengah tahun (dari daftar siswa). Kalau riwayat tahun ini udah
// tercatat (naik kelasnya udah diproses), cukup statusnya yang diubah.
function keluarkanSantri(s, tahun, hasil) {
  const baru = terapkanNaikKelas(s, tahun, hasil);
  if (baru) return baru;
  return { ...salin(s), status: hasil, aktif: false, keluar: { tahun, tanggal: Date.now() } };
}
// batalin lulus / pindah: riwayat tahun keluarnya dibuang, santri aktif lagi di kelas terakhirnya
function aktifkanLagiSantri(s) {
  const baru = salin(s);
  const tahun = s.keluar && s.keluar.tahun;
  baru.riwayatKelas = riwayatSantri(s).filter(r => !(r.tahun === tahun && (r.hasil === "lulus" || r.hasil === "pindah")));
  delete baru.status;
  delete baru.keluar;
  baru.aktif = true;
  return baru;
}

// rencana awal naik kelas: santri aktif yang belum punya riwayat tahun itu, dikelompokkan per kelas
function rencanaNaikKelas(daftarSantri, tahun) {
  const peta = new Map();
  for (const s of daftarSantri) {
    if (s.aktif === false || sudahDiproses(s, tahun)) continue;
    const kunci = `${s.jenjang}|${s.kelas}`;
    if (!peta.has(kunci)) {
      const akhir = tingkatAkhir(s.jenjang, s.kelas);
      peta.set(kunci, { jenjang: s.jenjang, kelas: s.kelas, akhir, tujuan: akhir ? "" : tebakKelasTujuan(s.kelas), santri: [] });
    }
    peta.get(kunci).santri.push({ s, hasil: peta.get(kunci).akhir ? "lulus" : "naik" });
  }
  const nomor = (x) => x.absen === undefined || x.absen === null || x.absen === "" ? Infinity : Number(x.absen);
  for (const g of peta.values()) g.santri.sort((a, c) => (nomor(a.s) - nomor(c.s)) || (a.s.nama || "").localeCompare(c.s.nama || "", "id"));
  return [...peta.values()].sort(bandingKelas);
}

// ====== LAYAR NAIK KELAS (admin) ======
function layarNaikKelas() {
  wajibKurikulum();
  tombolKembali.hidden = false;
  if (!dataDasarSiap()) return tampilMemuat("Naik kelas");
  const sekarang = semesterSekarang();
  // Ganjil = tahun ajaran baru udah mulai, jadi yang ditutup biasanya tahun sebelumnya
  const bawaan = sekarang.semester === "Ganjil" ? tahunSebelum(sekarang.tahun) : sekarang.tahun;
  const pilihanTahun = [tahunSebelum(sekarang.tahun), sekarang.tahun];
  const tahun = pilihanTahun.includes(posisi.tahunNaik) ? posisi.tahunNaik : bawaan;
  posisi.tahunNaik = tahun;

  judul.textContent = "Naik kelas";
  jejak.textContent = `${tahun} → ${tahunBerikut(tahun)}`;
  const rencana = rencanaNaikKelas(toko.santri, tahun);
  const sudah = toko.santri.filter(s => s.aktif !== false && sudahDiproses(s, tahun)).length;

  let h = `<p class="info">Semua siswa diproses sekaligus. Riwayat kelas tahun ${aman(tahun)} dicatat dulu, baru kelasnya diganti, jadi rapor tahun ini tetap bisa dibuka. Kelas tingkat akhir (Paket B kelas 9, Paket C kelas 12) otomatis lulus.</p>
    <div class="pilih-semester" role="group" aria-label="Tahun ajaran yang ditutup">
      ${pilihanTahun.map(t => `<button class="chip ${t === tahun ? "aktif" : ""}" data-tahun="${aman(t)}" aria-pressed="${t === tahun}">Tutup ${aman(t)}</button>`).join("")}
    </div>`;
  if (sudah) h += `<p class="info">${sudah} siswa sudah diproses untuk tahun ${aman(tahun)}, nggak diproses lagi.</p>`;
  if (rencana.length === 0) {
    isi.innerHTML = h + `<p class="kosong">Nggak ada siswa aktif yang belum diproses untuk tahun ${aman(tahun)}.</p>`;
    return pasangTahunNaik();
  }

  rencana.forEach((g, i) => {
    h += `<section class="kartu-pantau" data-grup="${i}">
      <div class="kartu-pantau-judul"><span><strong>${aman(g.kelas)} · ${aman(g.jenjang)}</strong><small>${g.santri.length} siswa</small></span></div>
      <div class="naik-isi">
        ${g.akhir ? `<p class="info">Kelas tingkat akhir: bawaannya lulus.</p>`
          : `<label>Naik ke kelas <input data-tujuan="${i}" value="${aman(g.tujuan)}" maxlength="20" autocomplete="off"></label>`}
        <div class="wadah-tabel-santri"><table class="tabel-santri lihat">
          <thead><tr><th class="kol-absen">No.</th><th>Nama siswa</th><th>Hasil</th></tr></thead>
          <tbody>${g.santri.map((x, j) => `<tr><td class="tengah">${aman(noAbsen(x.s, j + 1))}</td><td>${aman(x.s.nama)}</td>
            <td><select data-hasil="${aman(x.s.id)}" aria-label="Hasil ${aman(x.s.nama)}">
              ${Object.entries(HASIL_NAIK).map(([k, t]) => `<option value="${k}" ${k === x.hasil ? "selected" : ""}>${t}</option>`).join("")}
            </select></td></tr>`).join("")}</tbody>
        </table></div>
      </div>
    </section>`;
  });
  h += `<div class="baris-tombol"><button class="tombol-utama" id="prosesNaik">Proses naik kelas</button></div>
    <p class="info" id="pesanNaik" role="status"></p>`;
  isi.innerHTML = h;
  pasangTahunNaik();

  klik("prosesNaik", async () => {
    const pesan = document.getElementById("pesanNaik");
    const hitung = { naik: 0, tinggal: 0, lulus: 0, pindah: 0 };
    const kerja = [];
    for (const [i, g] of rencana.entries()) {
      const isian = isi.querySelector(`[data-tujuan="${i}"]`);
      const tujuan = isian ? isian.value.trim().replace(/\s+/g, " ") : "";
      for (const x of g.santri) {
        const pilih = isi.querySelector(`[data-hasil="${CSS.escape(x.s.id)}"]`);
        const hasil = pilih ? pilih.value : x.hasil;
        if (hasil === "naik" && !tujuan) {
          pesan.textContent = `Kelas tujuan ${g.kelas} ${g.jenjang} belum diisi.`;
          if (isian) isian.focus();
          return;
        }
        hitung[hasil]++;
        kerja.push({ s: x.s, hasil, tujuan });
      }
    }
    const ringkas = Object.entries(hitung).filter(([, n]) => n).map(([k, n]) => `${HASIL_NAIK[k]}: ${n}`).join("\n");
    if (!(await tanyaYakin(`Proses naik kelas ${tahun} → ${tahunBerikut(tahun)}?\n\n${ringkas}`, { ya: "Proses" }))) return;
    let jadi = 0;
    for (const k of kerja) {
      // data bisa berubah selama dialog kebuka (HP lain): pakai versi terbaru
      const terbaru = toko.santri.find(s => s.id === k.s.id);
      if (!terbaru || terbaru.aktif === false) continue;
      const baru = terapkanNaikKelas(terbaru, tahun, k.hasil, k.tujuan);
      if (baru) { simpanSantri(baru); jadi++; }
    }
    await kabar(`${jadi} siswa diproses. Kalau sinyal sempat putus, buka lagi halaman ini: siswa yang belum tersimpan bisa diproses ulang tanpa dobel.`);
    pergi("santri", { dariNilai: false, kelasSantri: null });
  });
}
function pasangTahunNaik() {
  isi.querySelectorAll("[data-tahun]").forEach(b => b.onclick = () => pergi("naikKelas", { tahunNaik: b.dataset.tahun }));
}
