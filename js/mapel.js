// =====================================================
//  mapel.js — HALAMAN SATU MAPEL: pilih semester, tab Modul / Sumatif
// =====================================================
function layarMapel() {
  const mp = mapelAktif();
  const kur = sayaKurikulum();
  const ampu = sayaPengampu(mp);
  const sem = semAktif();
  posisi.semester = kunciSemester(sem);
  const tab = posisi.tab || "modul";

  judul.textContent = mp.nama;
  const namaAmpu = (mp.pengampu || []).map(u => (mp.namaPengampu || {})[u]).filter(Boolean);
  jejak.textContent = `${mp.kelas}, ${mp.jenjang}${namaAmpu.length ? " · " + namaAmpu.join(", ") : ""}`;
  tombolKembali.hidden = false;

  if (!isiMapelSiap(mp.id)) {
    isi.innerHTML = `<p class="kosong">Memuat isi mapel...</p>`;
    return;
  }

  const semuaModul = modulMapel(mp.id).filter(x => samaSemester(x, sem));
  const semuaSum = sumatifMapel(mp.id).filter(x => samaSemester(x, sem));

  // --- pilihan semester ---
  let html = `<div class="pilih-semester" role="group" aria-label="Semester">`;
  for (const x of daftarSemesterMapel(mp.id)) {
    const ini = kunciSemester(x) === posisi.semester;
    html += `<button class="chip ${ini ? "aktif" : ""}" data-sem="${aman(kunciSemester(x))}" aria-pressed="${ini}">${aman(namaSemester(x))}</button>`;
  }
  html += `<button class="chip chip-tambah" id="semesterLain">+ Semester lain</button></div>`;

  if (kur && !ampu) {
    html += `<p class="info">Kamu melihat mapel ini sebagai admin: semua modul kelihatan, termasuk yang belum dibagikan, tapi nggak bisa diubah dari sini.</p>`;
  }

  html += `
    <div class="tab" role="tablist">
      <button role="tab" data-tab="modul" class="${tab === "modul" ? "aktif" : ""}" aria-selected="${tab === "modul"}">Modul ajar <span>${semuaModul.length}</span></button>
      <button role="tab" data-tab="sumatif" class="${tab === "sumatif" ? "aktif" : ""}" aria-selected="${tab === "sumatif"}">Sumatif <span>${semuaSum.length}</span></button>
      <button role="tab" data-tab="nilai" class="${tab === "nilai" ? "aktif" : ""}" aria-selected="${tab === "nilai"}">Nilai</button>
    </div>`;

  // modul & sumatif dari kelas lain di grup yang sama (misal 7A2, 7B1 buat 7A1)
  const segrup = mapelSegrup(mp);
  const modulLuar = ampu ? modulGrup(mp.id).filter(x => samaSemester(x, sem) && !semuaModul.some(y => y.id === x.id)) : [];
  const kelasDari = (x) => { const asal = mapelAsal(x.id); return asal ? asal.kelas : ""; };

  const barisModul = (m, nomor, dariOrangLain, denganKelas) => htmlBaris({
    attr: `data-mod="${m.id}"`,
    nomor,
    judulBaris: aman(m.judul),
    arahJudul: true,
    sub: `${denganKelas ? `${aman(kelasDari(m))} · ` : ""}${(m.pertemuan || []).length} pertemuan, ${jumlahSoal(m)} soal${dariOrangLain ? ` · ${aman(m.namaPemilik)}` : ""}`,
    tanda: dariOrangLain ? (m.dibagikan ? "" : "Tertutup") : (m.dibagikan ? "Dibagikan" : "Tertutup"),
    tandaJenis: m.dibagikan ? "tanda-bagi" : "tanda-tutup"
  });

  if (tab === "modul") {
    const milik = semuaModul.filter(milikSaya);
    const lain = semuaModul.filter(m => !milikSaya(m));

    if (ampu) {
      html += `<h2 class="subjudul">Modul kamu <small>${milik.length} modul</small></h2>`;
      if (milik.length === 0) html += `<p class="kosong">Belum ada modul ajar di semester ini.</p>`;
      else html += `<div class="daftar">${milik.map((m, i) => barisModul(m, i + 1, false)).join("")}</div>`;
      html += `<button class="tombol-utama" id="tambah">+ Tambah modul ajar</button>`;
      if (milik.length) html += `<div class="aksi-teks"><button class="tombol-teks" id="salinSemua">Salin modul semester ini ke tahun ajaran lain</button></div>`;
    }

    if (ampu) {
      html += `<h2 class="subjudul">${kur ? "Modul pengampu lain" : "Dibagikan pengampu lain"} <small>${lain.length} modul</small></h2>`;
      if (lain.length === 0) html += `<p class="info">${kur ? "Belum ada modul dari pengampu lain." : `Belum ada modul yang dibagikan pengampu lain di ${aman(mp.kelas)}.`}</p>`;
      else html += `<div class="daftar">${lain.map(m => barisModul(m, undefined, true)).join("")}</div>`;

      if (segrup.length) {
        html += `<h2 class="subjudul">Dari kelas lain · ${aman(namaGrup(mp))} <small>${modulLuar.length} modul</small></h2>`;
        html += `<p class="info">Grup ${aman(namaGrup(mp))}: ${aman(segrup.map(x => x.kelas).join(", "))}. Modul yang dibagikan di kelas-kelas ini bisa kamu lihat, cetak, dan soalnya dipakai buat sumatif.</p>`;
        if (modulLuar.length) html += `<div class="daftar">${modulLuar.map(m => barisModul(m, undefined, !milikSaya(m), true)).join("")}</div>`;
      }
    } else {
      // kurikulum yang bukan pengampu: dikelompokkan per ustadz
      if (semuaModul.length === 0) html += `<p class="kosong">Belum ada modul ajar di semester ini.</p>`;
      const perOrang = new Map();
      for (const m of semuaModul) {
        if (!perOrang.has(m.pemilik)) perOrang.set(m.pemilik, []);
        perOrang.get(m.pemilik).push(m);
      }
      for (const [, daftar] of perOrang) {
        html += `<h2 class="subjudul">${aman(daftar[0].namaPemilik || "Tanpa nama")} <small>${daftar.length} modul</small></h2>`;
        html += `<div class="daftar">${daftar.map((m, i) => barisModul(m, i + 1, false)).join("")}</div>`;
      }
    }
  } else if (tab === "nilai") {
    html += htmlTabNilai(mp, sem);
  } else {
    html += htmlKartuUAS(mp, sem);
    html += `<p class="info">Ujian sumatif disusun dari soal-soal modul semester ini: modul kamu sendiri dan modul yang dibagikan pengampu lain, termasuk dari kelas lain di grupnya.</p>`;
    const milik = semuaSum.filter(milikSaya);
    const lain = semuaSum.filter(s => !milikSaya(s));
    const barisSum = (s, denganNama, denganKelas) => htmlBaris({
      attr: `data-sum="${s.id}"`,
      judulBaris: aman(s.nama),
      sub: `${denganKelas ? `${aman(kelasDari(s))} · ` : ""}${aman(s.pelaksanaan || "Pelaksanaan belum diisi")}, ${(s.butir || []).length} soal${denganNama ? ` · ${aman(s.namaPemilik)}` : ""}`,
      tanda: !denganNama && s.dibagikan ? "Dibagikan" : "",
      tandaJenis: "tanda-bagi"
    });
    if (ampu) {
      if (milik.length === 0) html += `<p class="kosong">Belum ada ujian sumatif.</p>`;
      else html += `<div class="daftar">${milik.map(s => barisSum(s, false)).join("")}</div>`;
      html += `<button class="tombol-utama" id="tambah">+ Buat ujian sumatif</button>`;
      const luar = sumatifGrup(mp.id).filter(x => samaSemester(x, sem));
      html += `<h2 class="subjudul">Dibagikan guru lain <small>${luar.length} ujian</small></h2>`;
      if (luar.length === 0) html += `<p class="info">Belum ada ujian sumatif yang dibagikan di ${aman(namaGrup(mp))}. Ujian yang dibagikan bisa dilihat lalu disalin jadi ujianmu sendiri.</p>`;
      else html += `<div class="daftar">${luar.map(s => barisSum(s, !milikSaya(s), true)).join("")}</div>`;
    }
    if (kur && lain.length) {
      html += `<h2 class="subjudul">Sumatif pengampu lain <small>${lain.length}</small></h2><div class="daftar">${lain.map(s => barisSum(s, true)).join("")}</div>`;
    } else if (!ampu && lain.length === 0) {
      html += `<p class="kosong">Belum ada ujian sumatif.</p>`;
    }
  }

  if (kur) {
    html += `<div class="aksi-teks aksi-bawah"><button class="tombol-teks" id="ubahMapel">Ubah mapel &amp; pengampu</button></div>`;
  }
  isi.innerHTML = html;

  // --- tombol-tombol ---
  isi.querySelectorAll(".chip[data-sem]").forEach(b => {
    b.onclick = () => pergi("mapel", { semester: b.dataset.sem });
  });
  document.getElementById("semesterLain").onclick = () => pergi("formSemester");
  isi.querySelectorAll(".tab button").forEach(b => {
    b.onclick = () => pergi("mapel", { tab: b.dataset.tab });
  });
  const tambah = document.getElementById("tambah");
  if (tambah) {
    tambah.onclick = () => tab === "modul" ? pergi("formModul", { modEditId: null }) : pergi("formSumatif", { sumEditId: null });
  }
  isi.querySelectorAll(".baris[data-mod]").forEach(b => {
    b.onclick = () => {
      // modul sendiri di kelas lain: dibuka di mapel asalnya biar bisa diubah
      const asal = mapelAsal(b.dataset.mod);
      const keAsal = asal && asal.id !== mp.id && sayaPengampu(asal);
      pergi("modul", { modId: b.dataset.mod, ...(keAsal ? { mapelId: asal.id } : {}) });
    };
  });
  pasangKartuUAS(mp, sem);
  isi.querySelectorAll(".baris[data-sum]").forEach(b => {
    b.onclick = () => {
      const asal = mapelAsal(b.dataset.sum);
      const keAsal = asal && asal.id !== posisi.mapelId && sayaPengampu(asal);
      pergi("sumatif", { sumId: b.dataset.sum, uasGrup: null, ...(keAsal ? { mapelId: asal.id } : {}) });
    };
  });
  const salinSemua = document.getElementById("salinSemua");
  if (salinSemua) salinSemua.onclick = () => pergi("formSalin", { salinDari: "mapel", salinModul: null });
  const isiNilai = document.getElementById("isiNilai");
  if (isiNilai) isiNilai.onclick = () => pergi("nilai");
  const ubah = document.getElementById("ubahMapel");
  if (ubah) ubah.onclick = () => pergi("formMapel", { mapelEditId: mp.id, dariMapel: true });
}

// ====== PILIH SEMESTER LAIN ======
function formSemester() {
  const mp = mapelAktif();
  const sem = semAktif();
  judul.textContent = "Pilih semester";
  jejak.textContent = namaMapel(mp);
  tombolKembali.hidden = false;

  const opsiSemester = ["Ganjil", "Genap"]
    .map(s => `<option ${sem.semester === s ? "selected" : ""}>${s}</option>`).join("");

  isi.innerHTML = `
    <form id="form">
      <div class="dua-kolom">
        <label>Semester <select name="semester">${opsiSemester}</select></label>
        <label>Tahun ajaran <input name="tahun" value="${aman(sem.tahun)}" placeholder="2026/2027" required pattern="\\d{4}/\\d{4}" title="Contoh: 2026/2027"></label>
      </div>
      <p class="info">Semester baru otomatis muncul di daftar setelah ada modul atau ujian di dalamnya.</p>
      <button type="submit" class="tombol-utama">Buka semester ini</button>
    </form>`;

  document.getElementById("form").onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    pergi("mapel", { semester: kunciSemester({ semester: f.get("semester"), tahun: f.get("tahun").trim() }) });
  };
}
