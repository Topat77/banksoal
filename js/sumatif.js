// =====================================================
//  sumatif.js — ujian sumatif: disusun dari soal modul
//
//  Tiap butir ujian nyimpen (modulId, soalId) + SALINAN soalnya.
//  Selama modul asalnya masih ada, yang dipakai versi terbaru dari modul.
//  Kalau modulnya dihapus / nggak dibagikan lagi, salinannya yang dipakai,
//  jadi ujian yang sudah disusun nggak tiba-tiba bolong.
//
//  Soal khusus ujian (yang nggak ada di modul mana pun) disimpan
//  sebagai butir dengan modulId "ujian", isinya cuma di salinan.
// =====================================================

const MODUL_UJIAN = "ujian";

const kunciButir = (b) => `${b.modulId}:${b.soalId}`;

function butirSumatif(idMapel, sum) {
  const modul = modulMapel(idMapel);
  return (sum.butir || []).map(b => {
    if (b.modulId === MODUL_UJIAN) {
      return b.salinan && b.salinan.soal ? { ...b, soal: b.salinan.soal, bacaan: null, modul: null, hidup: false, ujian: true } : null;
    }
    const m = modul.find(x => x.id === b.modulId);
    const s = m && (m.soal || []).find(x => x.id === b.soalId);
    if (s) {
      return { ...b, soal: s, bacaan: (m.bacaan || []).find(x => x.id === s.bacaanId) || null, modul: m, hidup: true };
    }
    if (b.salinan && b.salinan.soal) {
      return { ...b, soal: b.salinan.soal, bacaan: b.salinan.bacaan || null, modul: null, hidup: false };
    }
    return null;
  }).filter(Boolean);
}

// butir siap simpan: salinannya diperbarui dari modul kalau masih ada
function butirUntukDisimpan(idMapel, daftarKunci, sumLama) {
  const lama = new Map(((sumLama && sumLama.butir) || []).map(b => [kunciButir(b), b]));
  const modul = modulMapel(idMapel);
  return daftarKunci.map(k => {
    const [modulId, soalId] = k.split(":");
    const m = modul.find(x => x.id === modulId);
    const s = m && (m.soal || []).find(x => x.id === soalId);
    if (s) {
      const bacaan = (m.bacaan || []).find(x => x.id === s.bacaanId) || null;
      return { modulId, soalId, salinan: salin({ soal: s, bacaan, judulModul: m.judul, namaPemilik: m.namaPemilik || "" }) };
    }
    const b = lama.get(k);
    return b ? salin(b) : null;
  }).filter(Boolean);
}

function formSumatif() {
  const mp = mapelAktif();
  const sem = semAktif();
  const lama = posisi.sumEditId ? butuh(sumatifMapel(mp.id).find(s => s.id === posisi.sumEditId)) : null;
  if (lama && !milikSaya(lama)) throw new DataHilang();
  if (!lama && !sayaPengampu(mp)) throw new DataHilang();
  const s = lama || { nama: "", pelaksanaan: "" };

  judul.textContent = lama ? "Ubah ujian sumatif" : "Buat ujian sumatif";
  jejak.textContent = `${namaMapel(mp)}, ${namaSemester(lama || sem)}`;
  tombolKembali.hidden = false;

  isi.innerHTML = `
    <form id="form">
      <label>Nama ujian <input name="nama" value="${aman(s.nama)}" placeholder="Sumatif Tengah Semester" required></label>
      <label>Pelaksanaan <input name="pelaksanaan" value="${aman(s.pelaksanaan || "")}" placeholder="Minggu ke-9"></label>
      <button type="submit" class="tombol-utama">${lama ? "Simpan" : "Lanjut pilih soal"}</button>
      ${lama ? `<button type="button" class="tombol-hapus" id="hapus">Hapus ujian ini</button>` : ""}
    </form>`;

  document.getElementById("form").onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const isian = { nama: f.get("nama").trim(), pelaksanaan: f.get("pelaksanaan").trim() };
    if (lama) {
      const t = sumatifMapel(mp.id).find(x => x.id === lama.id);
      if (!t) { alert("Ujian ini sudah dihapus (mungkin dari perangkat lain)."); return pergi("mapel", { tab: "sumatif" }); }
      simpanSumatif(mp.id, { ...t, ...isian });
      pergi("sumatif");
    } else {
      const baru = simpanSumatif(mp.id, { id: buatId(), semester: sem.semester, tahun: sem.tahun, ...isian, butir: [] });
      pergi("pilihSoal", { sumId: baru.id });
    }
  };

  if (lama) {
    document.getElementById("hapus").onclick = () => {
      if (!confirm(`Hapus "${lama.nama}"? Soal-soalnya tetap aman di modul masing-masing.`)) return;
      hapusSumatif(mp.id, lama.id);
      pergi("mapel", { tab: "sumatif" });
    };
  }
}

function layarSumatif() {
  const mp = mapelAktif();
  const sum = sumAktif();
  const boleh = milikSaya(sum);
  posisi.semester = kunciSemester(sum);

  judul.textContent = sum.nama;
  jejak.textContent = `${namaMapel(mp)}, ${namaSemester(sum)}`;
  tombolKembali.hidden = false;
  catatTerakhir("sumatif", mp.id, sum.id);

  const daftar = butirSumatif(mp.id, sum);
  const jumlahPG = daftar.filter(x => x.soal.jenis === "PG").length;

  let html = `
    <div class="lembar-info">
      <p class="info-utama">${daftar.length} soal: ${jumlahPG} pilihan ganda, ${daftar.length - jumlahPG} esai</p>
      <p class="info">${aman(sum.pelaksanaan || "Pelaksanaan belum diisi")}${boleh ? "" : ` · disusun ${aman(sum.namaPemilik || "")}`}</p>
      ${boleh ? `<div class="aksi-teks"><button class="tombol-teks" id="editSum">Ubah nama ujian</button></div>` : ""}
    </div>
    <div class="baris-tombol">
      ${boleh ? `<button class="tombol-kedua" id="pilih">Pilih soal dari modul</button>
      <button class="tombol-kedua" id="soalUjian">+ Soal khusus ujian</button>
      <button class="tombol-kedua tombol-ai" id="keAI">${IKON_AI}<span>Buat soal ujian pakai AI</span></button>` : ""}
      ${daftar.length > 0 ? `<button class="tombol-utama" id="cetak">Cetak soal</button>` : ""}
    </div>`;

  if (daftar.length === 0) {
    html += `<p class="kosong">Belum ada soal.${boleh ? " Pilih soal dari modul-modul semester ini, atau tulis soal khusus ujian." : ""}</p>`;
  } else if (boleh) {
    html += `<p class="info">Atur urutan pakai tombol ↑ ↓. Di lembar cetak, pilihan ganda dikumpulkan di bagian A dan esai di bagian B.</p>`;
  }
  daftar.forEach((x, i) => {
    const asal = x.ujian ? `Soal khusus ujian`
      : x.hidup
        ? `<span dir="auto">${aman(potong(x.modul.judul, 30))}</span>${milikSaya(x.modul) ? "" : ` · ${aman(x.modul.namaPemilik || "")}`}`
        : `Salinan (modul asal sudah nggak tersedia)`;
    html += kartuSoal(x.soal, {
      nomor: i + 1,
      pertama: i === 0,
      terakhir: i === daftar.length - 1,
      mode: boleh ? "sumatif" : "lihat",
      kunciGeser: kunciButir(x),
      ubahUjian: !!x.ujian,
      asal,
      bacaan: x.bacaan
    });
  });
  isi.innerHTML = html;

  const klik = (id, f) => { const el = document.getElementById(id); if (el) el.onclick = f; };
  klik("editSum", () => pergi("formSumatif", { sumEditId: sum.id }));
  klik("pilih", () => pergi("pilihSoal"));
  klik("soalUjian", () => pergi("formSoalUjian", { soalUjianId: null }));
  klik("keAI", () => pergi("aiSoal", { aiUntuk: "sumatif" }));
  isi.querySelectorAll("[data-ubah-ujian]").forEach(b => {
    b.onclick = () => pergi("formSoalUjian", { soalUjianId: b.dataset.ubahUjian });
  });
  klik("cetak", () => pergi("cetak", { cetakDari: "sumatif" }));

  const urutan = daftar.map(kunciButir);
  const simpanUrutan = (baru) => {
    simpanSumatif(mp.id, { ...sum, butir: butirUntukDisimpan(mp.id, baru, sum) });
    tampilkan(true);
  };
  isi.querySelectorAll("[data-lepas]").forEach(b => {
    b.onclick = () => {
      const k = b.dataset.lepas;
      if (k.startsWith(MODUL_UJIAN + ":") && !confirm("Hapus soal khusus ujian ini? Soal ini nggak ada di modul mana pun, jadi bakal hilang.")) return;
      simpanUrutan(urutan.filter(x => x !== k));
    };
  });
  const geserButir = (k, arahGeser) => {
    const i = urutan.indexOf(k), j = i + arahGeser;
    if (i < 0 || j < 0 || j >= urutan.length) return;
    const baru = [...urutan];
    [baru[i], baru[j]] = [baru[j], baru[i]];
    simpanUrutan(baru);
  };
  isi.querySelectorAll("[data-naik]").forEach(b => b.onclick = () => geserButir(b.dataset.naik, -1));
  isi.querySelectorAll("[data-turun]").forEach(b => b.onclick = () => geserButir(b.dataset.turun, 1));
}

function layarPilihSoal() {
  const mp = mapelAktif();
  const sum = sumAktif();
  if (!milikSaya(sum)) throw new DataHilang();
  judul.textContent = "Pilih soal";
  jejak.textContent = sum.nama;
  tombolKembali.hidden = false;

  const terpilih = new Set((sum.butir || []).map(kunciButir));
  const modul = modulMapel(mp.id).filter(m => samaSemester(m, sum));
  const milik = modul.filter(milikSaya);
  const lain = modul.filter(m => !milikSaya(m));

  let html = `<p class="info">Centang soal yang mau dimasukkan ke ${aman(sum.nama)}. Modul pengampu lain yang muncul di sini cuma yang sudah dibagikan.</p>`;
  if (modul.length === 0) {
    html += `<p class="kosong">Belum ada modul di semester ini. Buat modul dan soal formatif dulu.</p>`;
  }

  const gambarModul = (m, label) => {
    let h = `<h2 class="subjudul"><span dir="auto">${label}</span><small>${jumlahSoal(m)} soal</small></h2>`;
    if (jumlahSoal(m) === 0) return h + `<p class="info">Belum ada soal di modul ini.</p>`;
    const kelompok = [...(m.pertemuan || []).map((p, i) => ({ nama: `Pertemuan ${i + 1}`, soal: m.soal.filter(s => s.pertemuanId === p.id) })),
                      { nama: "Soal lainnya", soal: m.soal.filter(s => !pertemuanSoal(m, s)) }].filter(k => k.soal.length);
    for (const k of kelompok) {
      h += `<p class="label-kelompok">${aman(k.nama)}</p><div class="daftar">`;
      for (const s of k.soal) {
        const b = (m.bacaan || []).find(x => x.id === s.bacaanId);
        const kunci = `${m.id}:${s.id}`;
        h += `
          <label class="pilih-soal">
            <input type="checkbox" value="${aman(kunci)}" ${terpilih.has(kunci) ? "checked" : ""}>
            <span class="baris-isi">
              <span class="pilih-teks" dir="auto">${aman(s.teks)}</span>
              <span class="baris-sub">${s.jenis === "PG" ? "Pilihan ganda" : "Esai"}${b ? `, teks: ${aman(potong(b.judul || b.teks, 28))}` : ""}</span>
            </span>
          </label>`;
      }
      h += `</div>`;
    }
    return h;
  };
  milik.forEach((m, i) => { html += gambarModul(m, `Modul ${i + 1}: ${aman(m.judul)}`); });
  lain.forEach(m => { html += gambarModul(m, `${aman(m.judul)} · ${aman(m.namaPemilik || "")}`); });

  html += `<div class="bawah-lengket"><button class="tombol-utama" id="simpanPilihan"></button></div>`;
  isi.innerHTML = html;

  const tombol = document.getElementById("simpanPilihan");
  const kotak = [...isi.querySelectorAll(".pilih-soal input")];
  function hitung() {
    tombol.textContent = `Simpan ${kotak.filter(k => k.checked).length} soal dari modul`;
  }
  kotak.forEach(k => k.onchange = hitung);
  hitung();

  tombol.onclick = () => {
    const t = sumatifMapel(mp.id).find(x => x.id === sum.id);
    if (!t) { alert("Ujian ini sudah dihapus (mungkin dari perangkat lain)."); return pergi("mapel", { tab: "sumatif" }); }
    const dicentang = kotak.filter(k => k.checked).map(k => k.value);
    const tampil = new Set(kotak.map(k => k.value));
    const sekarang = (t.butir || []).map(kunciButir);
    // yang lama dijaga urutannya; butir yang nggak tampil di sini (misal salinan) tetap dipertahankan
    const tetap = sekarang.filter(k => !tampil.has(k) || dicentang.includes(k));
    const tambahan = dicentang.filter(k => !sekarang.includes(k));
    simpanSumatif(mp.id, { ...t, butir: butirUntukDisimpan(mp.id, [...tetap, ...tambahan], t) });
    pergi("sumatif");
  };
}

// ====== SOAL KHUSUS UJIAN ======
function formSoalUjian() {
  const mp = mapelAktif();
  const sum = sumAktif();
  if (!milikSaya(sum)) throw new DataHilang();
  const lamaButir = posisi.soalUjianId
    ? butuh((sum.butir || []).find(b => b.modulId === MODUL_UJIAN && b.soalId === posisi.soalUjianId))
    : null;
  const s = lamaButir ? lamaButir.salinan.soal : { teks: "", jenis: "PG", pilihan: ["", "", "", "", ""], kunci: 0, pedoman: "" };

  judul.textContent = lamaButir ? "Ubah soal khusus ujian" : "Soal khusus ujian";
  jejak.textContent = sum.nama;
  tombolKembali.hidden = false;

  isi.innerHTML = `
    <p class="info">Soal ini cuma ada di ujian ${aman(sum.nama)}, nggak masuk ke modul mana pun. Cocok buat soal yang sengaja beda dari latihan harian.</p>
    <form id="form">
      ${htmlIsianSoal(s)}
      <button type="submit" class="tombol-utama">Simpan soal</button>
    </form>`;

  const form = document.getElementById("form");
  pasangIsianSoal(form);

  form.onsubmit = (e) => {
    e.preventDefault();
    const hasil = bacaIsianSoal(form, lamaButir ? lamaButir.soalId : buatId());
    if (hasil.galat) return alert(hasil.galat);
    const t = sumatifMapel(mp.id).find(x => x.id === sum.id);
    if (!t) { alert("Ujian ini sudah dihapus (mungkin dari perangkat lain)."); return pergi("mapel", { tab: "sumatif" }); }
    const butirBaru = { modulId: MODUL_UJIAN, soalId: hasil.soal.id, salinan: { soal: { ...hasil.soal, bacaanId: null }, bacaan: null } };
    const butir = [...(t.butir || [])];
    const i = butir.findIndex(b => b.modulId === MODUL_UJIAN && b.soalId === hasil.soal.id);
    if (i >= 0) butir[i] = butirBaru;
    else butir.push(butirBaru);
    simpanSumatif(mp.id, { ...t, butir });
    pergi("sumatif");
  };
}