// =====================================================
//  kurikulum.js — layar khusus admin (TU):
//  akun, mapel & pengampu, pantauan
// =====================================================

function wajibKurikulum() {
  if (!sayaKurikulum()) throw new DataHilang();
}

// =====================================================
//  AKUN: setujui / tolak / atur peran
// =====================================================
function layarAkun() {
  wajibKurikulum();
  judul.textContent = "Akun";
  jejak.textContent = "Siapa saja yang boleh memakai aplikasi";

  const semua = [...toko.pengguna].sort((a, b) => (a.nama || "").localeCompare(b.nama || "", "id"));
  const menunggu = semua.filter(p => p.peran === "menunggu").sort((a, b) => (b.dibuat || 0) - (a.dibuat || 0));
  const aktif = semua.filter(p => PERAN_AKTIF.includes(p.peran));
  const lain = semua.filter(p => p.peran === "ditolak" || p.peran === "nonaktif");

  const mapelOrang = (uid) => toko.mapel.filter(m => (m.pengampu || []).includes(uid)).map(namaMapel);

  let h = `<h2 class="subjudul">Menunggu persetujuan <small>${menunggu.length} akun</small></h2>`;
  if (menunggu.length === 0) {
    h += `<p class="info">Nggak ada yang menunggu. Akun baru muncul di sini setelah ustadz/ustadzah masuk pakai akun Google-nya.</p>`;
  } else {
    h += `<p class="info">Pastikan nama dan emailnya memang ustadz/ustadzah atau staf TU di lembaga ini. Santri atau orang luar jangan disetujui. Akun yang disetujui jadi ustadz/ustadzah dulu; kalau dia staf TU, perannya bisa diganti jadi admin di daftar akun aktif.</p>`;
    for (const p of menunggu) {
      h += `
        <article class="kartu-akun menunggu">
          <div class="kartu-akun-isi">
            <strong>${aman(p.nama)}</strong>
            <span>${aman(p.email)}</span>
            <small>Daftar ${aman(waktuRapi(p.dibuat))}</small>
          </div>
          <div class="baris-tombol">
            <button class="tombol-utama" data-setujui="${p.id}">Setujui</button>
            <button class="tombol-teks merah" data-tolak="${p.id}">Tolak</button>
          </div>
        </article>`;
    }
  }

  h += `<h2 class="subjudul">Akun aktif <small>${aktif.length} akun</small></h2><div class="daftar-akun">`;
  for (const p of aktif) {
    const diriSendiri = p.id === uidSaya();
    const ampu = mapelOrang(p.id);
    h += `
      <article class="kartu-akun">
        <div class="kartu-akun-isi">
          <strong>${aman(p.nama)}${diriSendiri ? " (kamu)" : ""}</strong>
          <span>${aman(p.email)}</span>
          <small>${ampu.length ? "Mengampu " + aman(ampu.join(", ")) : "Belum mengampu mapel"} · Terakhir masuk ${aman(waktuRapi(p.terakhirMasuk))}</small>
        </div>
        ${diriSendiri ? "" : `
        <div class="baris-tombol">
          <label class="pilih-peran">Peran
            <select data-peran="${p.id}">
              <option value="ustadz" ${p.peran === "ustadz" ? "selected" : ""}>Ustadz/ustadzah</option>
              <option value="kurikulum" ${p.peran === "kurikulum" ? "selected" : ""}>Admin (TU)</option>
            </select>
          </label>
          <button class="tombol-teks merah" data-nonaktif="${p.id}">Nonaktifkan</button>
        </div>`}
      </article>`;
  }
  h += `</div>`;

  if (lain.length) {
    h += `<h2 class="subjudul">Ditolak &amp; nonaktif <small>${lain.length} akun</small></h2><div class="daftar-akun">`;
    for (const p of lain) {
      h += `
        <article class="kartu-akun redup">
          <div class="kartu-akun-isi">
            <strong>${aman(p.nama)}</strong>
            <span>${aman(p.email)}</span>
            <small>${p.peran === "ditolak" ? "Ditolak" : "Dinonaktifkan"}</small>
          </div>
          <div class="baris-tombol"><button class="tombol-kedua" data-aktifkan="${p.id}">Aktifkan sebagai ustadz</button></div>
        </article>`;
    }
    h += `</div>`;
  }
  isi.innerHTML = h;

  const ubahPeran = (uid, peran) => {
    const p = toko.pengguna.find(x => x.id === uid);
    if (!p) return;
    const { id, ...data } = p;
    simpanPengguna(uid, { ...data, peran, diubahOleh: uidSaya(), diubah: Date.now() });
    tampilkan(true);
  };
  isi.querySelectorAll("[data-setujui]").forEach(b => b.onclick = () => ubahPeran(b.dataset.setujui, "ustadz"));
  isi.querySelectorAll("[data-aktifkan]").forEach(b => b.onclick = () => ubahPeran(b.dataset.aktifkan, "ustadz"));
  isi.querySelectorAll("[data-tolak]").forEach(b => {
    b.onclick = () => {
      const p = toko.pengguna.find(x => x.id === b.dataset.tolak);
      if (confirm(`Tolak ${p.nama} (${p.email})? Akun ini nggak bisa membuka isi aplikasi.`)) ubahPeran(p.id, "ditolak");
    };
  });
  isi.querySelectorAll("[data-nonaktif]").forEach(b => {
    b.onclick = () => {
      const p = toko.pengguna.find(x => x.id === b.dataset.nonaktif);
      if (confirm(`Nonaktifkan ${p.nama}? Modul dan soalnya tetap tersimpan, cuma dia nggak bisa masuk sampai diaktifkan lagi.`)) ubahPeran(p.id, "nonaktif");
    };
  });
  isi.querySelectorAll("[data-peran]").forEach(sel => {
    sel.onchange = () => {
      const p = toko.pengguna.find(x => x.id === sel.dataset.peran);
      const ke = sel.value === "kurikulum" ? "admin (TU)" : "ustadz/ustadzah";
      const ket = sel.value === "kurikulum" ? "\n\nAdmin bisa menyetujui akun, mengatur mapel, daftar santri, bobot nilai, dan rapor." : "";
      if (!confirm(`Jadikan ${p.nama} sebagai ${ke}?${ket}`)) { sel.value = p.peran; return; }
      ubahPeran(p.id, sel.value);
    };
  });
}

// =====================================================
//  MAPEL & PENGAMPU
// =====================================================
const KELAS_SD  = ["Kelas 1", "Kelas 2", "Kelas 3", "Kelas 4", "Kelas 5", "Kelas 6"];
const KELAS_SMP = ["Kelas 7", "Kelas 8", "Kelas 9"];
const KELAS_SMA = ["Kelas 10", "Kelas 11", "Kelas 12"];
const KELAS_PER_JENJANG = {
  "Paket A": KELAS_SD, "Paket B": KELAS_SMP, "Paket C": KELAS_SMA,
  "SD": KELAS_SD, "SMP": KELAS_SMP, "SMA": KELAS_SMA
};

function layarKelolaMapel() {
  wajibKurikulum();
  judul.textContent = "Mapel & pengampu";
  jejak.textContent = toko.lembaga.nama || KONFIG.namaLembaga || "";

  let h = `<p class="info">Mapel dibuat di sini, lalu tentukan ustadz/ustadzah pengampunya. Satu mapel boleh diampu lebih dari satu orang.</p>`;
  if (toko.mapel.length === 0) {
    h += `<p class="kosong">Belum ada mapel.</p>`;
  } else {
    h += `<div class="daftar">`;
    for (const m of toko.mapel) {
      const nama = (m.pengampu || []).map(u => namaPengguna(u) || (m.namaPengampu || {})[u]).filter(Boolean);
      h += htmlBaris({
        attr: `data-mapel="${m.id}"`,
        judulBaris: aman(m.nama),
        sub: `${aman(m.kelas)}, ${aman(m.jenjang)} · ${namaJenis(jenisMapel(m))} · ${nama.length ? aman(nama.join(", ")) : "<em>belum ada pengampu</em>"}`,
        tanda: nama.length ? "" : "Belum ada pengampu",
        tandaJenis: "tanda-tutup"
      });
    }
    h += `</div>`;
  }
  h += `<button class="tombol-utama" id="tambah">+ Tambah mapel</button>`;
  isi.innerHTML = h;

  document.getElementById("tambah").onclick = () => pergi("formMapel", { mapelEditId: null, dariMapel: false });
  isi.querySelectorAll(".baris[data-mapel]").forEach(b => {
    b.onclick = () => pergi("formMapel", { mapelEditId: b.dataset.mapel, dariMapel: false });
  });
}

function formMapel() {
  wajibKurikulum();
  const lama = posisi.mapelEditId ? butuh(cariMapel(posisi.mapelEditId)) : null;
  const terakhir = toko.mapel[toko.mapel.length - 1];
  const m = lama ? salin(lama) : { nama: "", jenjang: terakhir ? terakhir.jenjang : "Paket B", kelas: "", jenis: "umum", pengampu: [] };

  judul.textContent = lama ? "Ubah mapel" : "Tambah mapel";
  jejak.textContent = lama ? namaMapel(lama) : "";
  tombolKembali.hidden = false;

  const opsiJenjang = Object.keys(KELAS_PER_JENJANG)
    .map(j => `<option ${m.jenjang === j ? "selected" : ""}>${j}</option>`).join("");

  const calon = toko.pengguna.filter(p => PERAN_AKTIF.includes(p.peran))
    .sort((a, b) => (a.nama || "").localeCompare(b.nama || "", "id"));
  const pilihPengampu = calon.length ? calon.map(p => `
      <label class="centang">
        <input type="checkbox" name="pengampu" value="${p.id}" ${(m.pengampu || []).includes(p.id) ? "checked" : ""}>
        <span>${aman(p.nama)} <small>${aman(p.email)}</small></span>
      </label>`).join("") : `<p class="info">Belum ada akun aktif. Setujui akun ustadz dulu di halaman Akun.</p>`;

  isi.innerHTML = `
    <form id="form">
      <label>Mata pelajaran <input name="nama" value="${aman(m.nama)}" placeholder="Bahasa Indonesia" required></label>
      <div class="dua-kolom">
        <label>Jenjang <select name="jenjang">${opsiJenjang}</select></label>
        <label>Kelas / rombel <input name="kelas" list="saranKelas" value="${aman(m.kelas)}" placeholder="7A1" required autocomplete="off"><datalist id="saranKelas"></datalist></label>
      </div>
      <p class="info">Tulis kelas dan rombelnya, misal 7A1 (A putra, B putri). Daftar santri, lembar nilai, dan rapor dikelompokkan per kelas ini.</p>
      <fieldset>
        <legend>Jenis pelajaran</legend>
        <div class="pilih-jenis">
          <label class="radio"><input type="radio" name="jenis" value="umum" ${jenisMapel(m) === "umum" ? "checked" : ""}> Umum</label>
          <label class="radio"><input type="radio" name="jenis" value="diniah" ${jenisMapel(m) === "diniah" ? "checked" : ""}> Diniah</label>
        </div>
        <p class="info">Ngaruh ke bobot penilaian (diatur di halaman Bobot nilai) dan bagian di rapor.</p>
      </fieldset>
      <fieldset>
        <legend>Pengampu</legend>
        <div class="kolom daftar-centang">${pilihPengampu}</div>
      </fieldset>
      <button type="submit" class="tombol-utama">Simpan</button>
      ${lama ? `<button type="button" class="tombol-hapus" id="hapus">Hapus mapel ini</button>` : ""}
    </form>`;

  const form = document.getElementById("form");
  const pilihJenjang = form.jenjang;
  const pilihKelas = form.kelas;
  // saran kelas: yang sudah dipakai di jenjang ini, lalu pola rombel (A = putra, B = putri)
  function aturSaranKelas() {
    const j = pilihJenjang.value;
    const dipakai = daftarKelas().filter(x => x.jenjang === j).map(x => x.kelas);
    const pola = (KELAS_PER_JENJANG[j] || []).flatMap(k => {
      const n = k.replace(/\D/g, "");
      return [`${n}A1`, `${n}A2`, `${n}B1`, `${n}B2`];
    });
    const saran = [...new Set([...dipakai, ...pola])];
    document.getElementById("saranKelas").innerHTML = saran.map(k => `<option value="${aman(k)}">`).join("");
  }
  pilihJenjang.onchange = aturSaranKelas;
  aturSaranKelas();
  pilihKelas.onchange = () => { pilihKelas.value = pilihKelas.value.trim().replace(/\s+/g, " "); };

  form.onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(form);
    const pengampu = f.getAll("pengampu");
    const namaPengampu = {};
    for (const u of pengampu) namaPengampu[u] = namaPengguna(u);
    const nama = f.get("nama").trim();
    const kelas = f.get("kelas").trim().replace(/\s+/g, " ");
    const kembar = toko.mapel.find(x => x.id !== (lama && lama.id) &&
      x.nama.toLowerCase() === nama.toLowerCase() && x.jenjang === f.get("jenjang") && x.kelas === kelas);
    if (kembar && !confirm(`Mapel ${nama} ${kelas} (${f.get("jenjang")}) sudah ada. Tetap bikin satu lagi?`)) return;

    const baru = simpanMapelData({
      ...(lama || {}),
      id: lama ? lama.id : buatId(),
      nama, jenjang: f.get("jenjang"), kelas, jenis: f.get("jenis") || "umum",
      pengampu, namaPengampu
    });
    if (posisi.dariMapel) pergi("mapel", { mapelId: baru.id });
    else pergi("kelolaMapel");
  };

  if (lama) {
    document.getElementById("hapus").onclick = () => {
      const modul = modulMapel(lama.id);
      const nSoal = modul.reduce((x, y) => x + jumlahSoal(y), 0);
      const yakin = confirm(
        `Hapus mapel ${namaMapel(lama)}?\n\n` +
        `${modul.length} modul, ${nSoal} soal, dan ${sumatifMapel(lama.id).length} ujian sumatif dari SEMUA pengampu ikut terhapus dan TIDAK bisa dikembalikan.`
      );
      if (!yakin) return;
      if (modul.length && prompt(`Ketik HAPUS untuk memastikan.`) !== "HAPUS") return;
      hapusMapelData(lama.id);
      pergi("kelolaMapel", { mapelId: null });
    };
  }
}

// =====================================================
//  PANTAUAN: siapa sudah ngisi apa
// =====================================================
function layarPantauan() {
  wajibKurikulum();
  judul.textContent = "Pantauan";
  const semuaSem = new Map();
  const tambah = (x) => semuaSem.set(kunciSemester(x), x);
  tambah(semesterSekarang());
  for (const mp of toko.mapel) {
    modulMapel(mp.id).forEach(tambah);
    sumatifMapel(mp.id).forEach(tambah);
  }
  const kunci = posisi.semPantau && semuaSem.has(posisi.semPantau) ? posisi.semPantau : kunciSemester(semesterSekarang());
  const sem = dariKunciSemester(kunci);
  jejak.textContent = `Isi modul & soal, ${namaSemester(sem)}`;

  let h = `<div class="pilih-semester" role="group" aria-label="Semester">`;
  for (const x of [...semuaSem.values()].sort(bandingSemester)) {
    const k = kunciSemester(x);
    h += `<button class="chip ${k === kunci ? "aktif" : ""}" data-sem="${aman(k)}" aria-pressed="${k === kunci}">${aman(namaSemester(x))}</button>`;
  }
  h += `</div>`;

  if (toko.mapel.length === 0) {
    h += `<p class="kosong">Belum ada mapel. Tambahkan dulu di halaman Mapel &amp; pengampu.</p>`;
  }

  let belumSiap = false;
  for (const mp of toko.mapel) {
    if (!isiMapelSiap(mp.id)) { belumSiap = true; continue; }
    const modul = modulMapel(mp.id).filter(x => samaSemester(x, sem));
    const sumatif = sumatifMapel(mp.id).filter(x => samaSemester(x, sem));
    // baris: semua pengampu + siapa pun yang punya modul di mapel ini
    const orang = [...new Set([...(mp.pengampu || []), ...modul.map(m => m.pemilik), ...sumatif.map(s => s.pemilik)])];

    h += `
      <section class="kartu-pantau">
        <button class="kartu-pantau-judul" data-mapel="${mp.id}">
          <span><strong>${aman(mp.nama)}</strong><small>${aman(mp.kelas)}, ${aman(mp.jenjang)}</small></span>
          <span class="baris-panah" aria-hidden="true">›</span>
        </button>`;
    if (orang.length === 0) {
      h += `<p class="info">Belum ada pengampu.</p>`;
    } else {
      h += `<table class="tabel-pantau">
        <thead><tr><th>Pengampu</th><th>Modul</th><th>Pertemuan</th><th>Soal</th><th>Sumatif</th><th>Terakhir diisi</th></tr></thead><tbody>`;
      for (const uid of orang) {
        const mm = modul.filter(m => m.pemilik === uid);
        const ss = sumatif.filter(s => s.pemilik === uid);
        const pertemuan = mm.reduce((x, m) => x + (m.pertemuan || []).length, 0);
        const tanpaTarget = mm.reduce((x, m) => x + (m.pertemuan || []).filter(p => !p.target).length, 0);
        const soal = mm.reduce((x, m) => x + jumlahSoal(m), 0);
        const terakhir = Math.max(0, ...mm.map(m => m.diubah || 0), ...ss.map(s => s.diubah || 0));
        const nama = namaPengguna(uid) || (mp.namaPengampu || {})[uid] || (mm[0] && mm[0].namaPemilik) || "Tanpa nama";
        const bukanPengampu = !(mp.pengampu || []).includes(uid);
        h += `
          <tr class="${mm.length === 0 ? "kurang" : ""}">
            <td data-label="Pengampu"><b>${aman(nama)}</b>${bukanPengampu ? ` <small>(sudah bukan pengampu)</small>` : ""}</td>
            <td data-label="Modul">${mm.length || `<span class="merah">Belum ada</span>`}</td>
            <td data-label="Pertemuan">${pertemuan}${tanpaTarget ? ` <small>(${tanpaTarget} tanpa target)</small>` : ""}</td>
            <td data-label="Soal">${soal}</td>
            <td data-label="Sumatif">${ss.length}</td>
            <td data-label="Terakhir diisi">${terakhir ? aman(waktuRapi(terakhir)) : "-"}</td>
          </tr>`;
      }
      h += `</tbody></table>`;
    }
    h += `</section>`;
  }
  if (belumSiap) h += `<p class="info">Sebagian data masih dimuat...</p>`;
  isi.innerHTML = h;

  isi.querySelectorAll(".chip[data-sem]").forEach(b => b.onclick = () => pergi("pantauan", { semPantau: b.dataset.sem }));
  isi.querySelectorAll("[data-mapel]").forEach(b => {
    b.onclick = () => pergi("mapel", { mapelId: b.dataset.mapel, semester: kunci, tab: "modul" });
  });
}