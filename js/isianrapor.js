// =====================================================
//  isianrapor.js — isian rapor dari wali kelas (format resmi PKBM)
//
//  Capaian kompetensi per mapel, ketidakhadiran, ekstrakurikuler & catatan wali kelas.
//  Koleksi `rapor`, satu dokumen per siswa per semester (jenis "santri") + satu dokumen
//  capaian bersama satu kelas (jenis "kelas"). Capaian di dokumen siswa (kalau diisi) menimpa
//  capaian kelas.
//  Yang boleh ngisi: wali kelas (kelas/{id}.wali, dicatat dari perangkat TU lewat sinkronGrup)
//  dan TU. Datanya nggak dilanggan; diambil sekali waktu layarnya / rapornya dibuka (hemat kuota).
// =====================================================

const BATAS_EKSKUL = 10;

function kunciIsian(kelasId, sem) {
  return `${kelasId}|${kunciSemester(sem)}`;
}
function jalurIsian(kelasId, sem, santriId) {
  const awal = `${kunciTahunWali(sem.tahun)}_${sem.semester}`;
  return santriId ? `rapor/${awal}_${santriId}` : `rapor/${awal}_kelas-${kelasId}`;
}

// ---- ambil data (sekali, disimpan di toko.isianRapor) ----
// TU cuma butuh dokumen rapor (siswa & mapel udah ada di toko). Wali kelas yang bukan TU
// belum tentu punya siswa / mapel kelas itu di toko, jadi ikut diambil.
function muatIsianRapor(kelas, sem, ulang = false) {
  toko.isianRapor = toko.isianRapor || {};
  const kelasId = idKelas(kelas.jenjang, kelas.kelas);
  const k = kunciIsian(kelasId, sem);
  if (toko.isianRapor[k] && !ulang) return toko.isianRapor[k];
  const w = toko.isianRapor[k] = { siap: false, gagal: false, dok: [], santri: null, mapel: null };
  const b = toko.backend;
  const tugas = [b.ambilKoleksi("rapor", [["kelasId", "==", kelasId], ["tahun", "==", sem.tahun], ["semester", "==", sem.semester]])];
  if (!sayaKurikulum()) {
    tugas.push(b.ambilKoleksi("santri", [["kelasId", "==", kelasId]]));
    tugas.push(b.ambilKoleksi("mapel", [["jenjang", "==", kelas.jenjang], ["kelas", "==", kelas.kelas]]));
  }
  Promise.all(tugas).then(([dok, santri, mapel]) => {
    w.dok = (dok || []).filter(adalahObjek);
    if (santri) w.santri = santri.filter(s => s.aktif !== false).sort((a, c) => (nomorAbsen(a) - nomorAbsen(c)) || bandingNama(a, c));
    if (mapel) w.mapel = mapel;
    w.siap = true;
    berubah();
  }).catch(err => {
    console.warn("Gagal memuat isian rapor:", err && (err.code || err.message));
    w.gagal = true;
    w.siap = true;
    berubah();
  });
  return w;
}
function dataIsian(kelasId, sem) {
  const w = toko.isianRapor && toko.isianRapor[kunciIsian(kelasId, sem)];
  return w && w.siap ? w : null;
}
function dokIsian(w, santriId) {
  if (!w) return null;
  return w.dok.find(d => santriId ? d.jenis === "santri" && d.santriId === santriId : d.jenis === "kelas") || null;
}

// dipakai lembar rapor (raporresmi.js). null = belum dimuat / belum ada isian.
function isianRapor(santri, sem) {
  const k = kelasSantriDi(santri, sem.tahun, sem.semester);
  const w = dataIsian(idKelas(k.jenjang, k.kelas), sem);
  if (!w) return null;
  const dk = dokIsian(w, null);
  const ds = dokIsian(w, santri.id);
  if (!dk && !ds) return null;
  const capaian = { ...(dk && adalahObjek(dk.capaian) ? dk.capaian : {}) };
  if (ds && adalahObjek(ds.capaian)) for (const [id, t] of Object.entries(ds.capaian)) if (jadiTeks(t).trim()) capaian[id] = t;
  return { capaian, ...(ds ? { sakit: ds.sakit, izin: ds.izin, alpa: ds.alpa, ekskul: ds.ekskul, catatan: ds.catatan } : {}) };
}

// ---- kelas yang diwalikan akun ini (guru) ----
function kelasWaliSaya() {
  if (sayaKurikulum()) return [];
  if (toko.kelasWali) return toko.kelasWali.siap ? toko.kelasWali.daftar : null;
  const w = toko.kelasWali = { siap: false, daftar: [] };
  toko.backend.ambilKoleksi("kelas", [["wali", "==", uidSaya()]])
    .then(d => { w.daftar = d.filter(k => raporResmi(k.jenjang)).sort(bandingKelas); })
    .catch(err => console.warn("Gagal memuat kelas wali:", err && (err.code || err.message)))
    .finally(() => { w.siap = true; berubah(); });
  return null;
}

// kelas, semester, siswa & mapel layar isian. null = masih dimuat.
function konteksIsian() {
  const [jenjang, kelas] = String(posisi.isianKelas || "").split("|");
  if (!jenjang || !kelas || !raporResmi(jenjang)) throw new DataHilang();
  const tu = sayaKurikulum();
  if (!tu) {
    const kw = kelasWaliSaya();
    if (!kw) return null;
    if (!kw.some(k => k.jenjang === jenjang && k.kelas === kelas)) throw new DataHilang();
  }
  if (!dataDasarSiap()) return null;
  const sem = tu && posisi.isianSem ? dariKunciSemester(posisi.isianSem) : semesterSekarang();
  const w = muatIsianRapor({ jenjang, kelas }, sem);
  if (!w.siap) return null;
  const santri = tu ? santriKelasDi(jenjang, kelas, sem.tahun, sem.semester) : (w.santri || []);
  const mapel = (tu ? mapelKelas(jenjang, kelas) : (w.mapel || []))
    .filter(m => kelompokRapor(m) !== "tidak").sort(urutMapelRapor);
  return { jenjang, kelas, kelasId: idKelas(jenjang, kelas), sem, w, santri, mapel };
}

function namaMapelRapor(m) {
  return kelompokRapor(m) === "mulok" && !/muatan\s*lokal/i.test(m.nama) ? `Muatan Lokal (${m.nama})` : m.nama;
}

// ---- simpan (dokumen utuh; yang nulis cuma wali kelas & TU) ----
function simpanIsian(c, santriId, isiBaru) {
  const jalur = jalurIsian(c.kelasId, c.sem, santriId);
  const lama = dokIsian(c.w, santriId);
  const dok = {
    jenis: santriId ? "santri" : "kelas", kelasId: c.kelasId, santriId: santriId || "",
    tahun: c.sem.tahun, semester: c.sem.semester, ...isiBaru,
    namaPengubah: namaSaya(), diubahOleh: uidSaya(),
    dibuat: (lama && lama.dibuat) || Date.now(), diubah: Date.now()
  };
  // langsung tampil di perangkat ini (rapor & daftar siswa), walau sinyal lagi putus
  c.w.dok = c.w.dok.filter(d => d !== lama).concat([{ id: jalur.split("/").pop(), ...dok }]);
  toko.backend.tulis(jalur, dok).catch(err => {
    gagalSimpan(err);
    muatIsianRapor(c, c.sem, true);   // ambil ulang yang ada di server
  });
  formKotor = false;
}

function htmlGagalIsian(c) {
  return c.w.gagal ? `<p class="pemberitahuan-kecil">Isian rapor yang sudah ada tidak dapat dimuat. Periksa sambungan internet, lalu buka layar ini lagi. Jangan mengisi ulang sebelum isian lama tampil.</p>` : "";
}

// ====== LAYAR: CAPAIAN KELAS + DAFTAR SISWA ======
function layarIsianRapor() {
  judul.textContent = "Isian rapor";
  tombolKembali.hidden = false;
  const c = konteksIsian();
  if (!c) return tampilMemuat("Isian rapor");
  jejak.textContent = `${c.kelas}, ${c.jenjang} · ${namaSemester(c.sem)}`;
  const dk = dokIsian(c.w, null);
  const capaian = dk && adalahObjek(dk.capaian) ? dk.capaian : {};

  let h = htmlGagalIsian(c) + `
    <p class="info">Isian ini muncul di rapor format PKBM. Nilai akhir diambil otomatis dari lembar nilai tiap mapel.</p>
    <section class="panel">
      <div class="panel-kepala"><h2>Capaian kompetensi</h2></div>
      <p class="info">Tulis capaian untuk semua siswa kelas ini. Capaian khusus satu siswa dapat diisi di halaman siswa tersebut.</p>
      ${c.mapel.length ? `<form id="formCapaian">
        ${c.mapel.map(m => `<label>${spanArah(namaMapelRapor(m))}
          <textarea name="c_${aman(m.id)}" rows="3" maxlength="1000" placeholder="Contoh: Ananda sudah mampu ...">${aman(jadiTeks(capaian[m.id]))}</textarea></label>`).join("")}
        <div class="baris-tombol">
          <button type="submit" class="tombol-utama">Simpan capaian</button>
          <span class="tersimpan" id="tersimpanCapaian" role="status"></span>
        </div>
      </form>` : `<p class="kosong">Belum ada mapel yang masuk rapor di kelas ini.</p>`}
    </section>
    <section class="panel">
      <div class="panel-kepala"><h2>Per siswa</h2><span class="info">${c.santri.length} siswa</span></div>
      <p class="info">Ketidakhadiran, ekstrakurikuler, dan catatan wali kelas. Pilih nama siswa.</p>`;
  if (!c.santri.length) h += `<p class="kosong">Belum ada siswa di kelas ini.</p>`;
  else {
    h += `<div class="daftar">`;
    c.santri.forEach((s, i) => {
      const d = dokIsian(c.w, s.id);
      h += htmlBaris({
        attr: `data-isian-santri="${aman(s.id)}"`,
        nomor: aman(noAbsen(sayaKurikulum() ? kelasSantriDi(s, c.sem.tahun, c.sem.semester) : s, i + 1)),
        judulBaris: aman(s.nama), arahJudul: true,
        sub: d ? `Diisi ${aman(d.namaPengubah || "")}` : "",
        tanda: d ? "" : "Belum diisi", tandaJenis: "tanda-tutup"
      });
    });
    h += `</div>`;
  }
  h += `</section>`;
  isi.innerHTML = h;

  const form = document.getElementById("formCapaian");
  if (form) form.onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(form);
    const baru = {};
    for (const m of c.mapel) {
      const t = String(f.get(`c_${m.id}`) || "").trim();
      if (t) baru[m.id] = t;
    }
    simpanIsian(c, null, { capaian: baru });
    document.getElementById("tersimpanCapaian").textContent = "Tersimpan";
  };
  isi.querySelectorAll("[data-isian-santri]").forEach(b => b.onclick = () => pergi("isianSiswa", { isianSantri: b.dataset.isianSantri }));
}

// ====== LAYAR: ISIAN SATU SISWA ======
function htmlBarisEkskul(e = {}) {
  return `<div class="baris-ekskul">
    <label>Kegiatan <input name="e_kegiatan" maxlength="100" value="${aman(jadiTeks(e.kegiatan))}" placeholder="Contoh: Pramuka"></label>
    <label>Predikat <input name="e_predikat" maxlength="30" value="${aman(jadiTeks(e.predikat))}" placeholder="Contoh: Baik"></label>
    <label>Keterangan <input name="e_keterangan" maxlength="200" value="${aman(jadiTeks(e.keterangan))}"></label>
  </div>`;
}

function layarIsianSiswa() {
  judul.textContent = "Isian rapor siswa";
  tombolKembali.hidden = false;
  const c = konteksIsian();
  if (!c) return tampilMemuat("Isian rapor siswa");
  const urutan = c.santri.findIndex(s => s.id === posisi.isianSantri);
  if (urutan < 0) throw new DataHilang();
  const s = c.santri[urutan];
  const berikut = c.santri[urutan + 1] || null;
  jejak.textContent = `${s.nama} · ${c.kelas} · ${namaSemester(c.sem)}`;
  const d = dokIsian(c.w, s.id) || {};
  const dk = dokIsian(c.w, null);
  const capKelas = dk && adalahObjek(dk.capaian) ? dk.capaian : {};
  const capSiswa = adalahObjek(d.capaian) ? d.capaian : {};
  const ekskul = Array.isArray(d.ekskul) ? d.ekskul.filter(adalahObjek) : [];
  const hari = (x) => Number.isFinite(d[x]) ? d[x] : "";
  const adaCapSiswa = Object.values(capSiswa).some(t => jadiTeks(t).trim());

  isi.innerHTML = htmlGagalIsian(c) + `
    <form id="formIsianSiswa">
      <h2 dir="auto">${aman(s.nama)}</h2>
      <fieldset><legend>Ketidakhadiran (hari)</legend>
        <div class="baris-hadir">
          <label>Sakit <input name="sakit" type="number" min="0" max="200" inputmode="numeric" value="${hari("sakit")}"></label>
          <label>Izin <input name="izin" type="number" min="0" max="200" inputmode="numeric" value="${hari("izin")}"></label>
          <label>Tanpa keterangan <input name="alpa" type="number" min="0" max="200" inputmode="numeric" value="${hari("alpa")}"></label>
        </div>
      </fieldset>
      <fieldset><legend>Ekstrakurikuler</legend>
        <div id="daftarEkskul">${(ekskul.length ? ekskul : [{}]).map(htmlBarisEkskul).join("")}</div>
        <button type="button" class="tombol-kedua" id="tambahEkskul">Tambah kegiatan</button>
      </fieldset>
      <label>Catatan wali kelas
        <textarea name="catatan" rows="3" maxlength="1000">${aman(jadiTeks(d.catatan))}</textarea></label>
      <details ${adaCapSiswa ? "open" : ""}>
        <summary>Capaian khusus siswa ini</summary>
        <p class="info">Kosongkan agar memakai capaian kelas.</p>
        ${c.mapel.map(m => `<label>${spanArah(namaMapelRapor(m))}
          <textarea name="c_${aman(m.id)}" rows="2" maxlength="1000" placeholder="${aman(jadiTeks(capKelas[m.id]) || "Capaian kelas belum diisi")}">${aman(jadiTeks(capSiswa[m.id]))}</textarea></label>`).join("")}
      </details>
      <div class="baris-tombol">
        <button type="submit" class="tombol-utama">Simpan</button>
        ${berikut ? `<button type="button" class="tombol-kedua" id="simpanLanjut">Simpan, lanjut ke ${aman(berikut.nama)}</button>` : ""}
        <span class="tersimpan" id="tersimpanIsian" role="status"></span>
      </div>
    </form>`;

  const form = document.getElementById("formIsianSiswa");
  klik("tambahEkskul", () => {
    const daftar = document.getElementById("daftarEkskul");
    if (daftar.children.length >= BATAS_EKSKUL) return kabar(`Paling banyak ${BATAS_EKSKUL} kegiatan.`);
    daftar.insertAdjacentHTML("beforeend", htmlBarisEkskul());
  });
  const simpan = () => {
    const f = new FormData(form);
    const baru = {};
    for (const x of ["sakit", "izin", "alpa"]) {
      const t = String(f.get(x) || "").trim();
      if (t !== "" && Number.isFinite(Number(t))) baru[x] = Math.min(200, Math.max(0, Math.round(Number(t))));
    }
    const [kg, pr, kt] = ["e_kegiatan", "e_predikat", "e_keterangan"].map(n => f.getAll(n).map(v => String(v).trim()));
    baru.ekskul = kg.map((k, i) => ({ kegiatan: k, predikat: pr[i] || "", keterangan: kt[i] || "" }))
      .filter(e => e.kegiatan || e.predikat || e.keterangan).slice(0, BATAS_EKSKUL);
    baru.catatan = String(f.get("catatan") || "").trim();
    baru.capaian = {};
    for (const m of c.mapel) {
      const t = String(f.get(`c_${m.id}`) || "").trim();
      if (t) baru.capaian[m.id] = t;
    }
    simpanIsian(c, s.id, baru);
  };
  form.onsubmit = (e) => {
    e.preventDefault();
    simpan();
    document.getElementById("tersimpanIsian").textContent = "Tersimpan";
  };
  klik("simpanLanjut", () => {
    if (!form.reportValidity()) return;
    simpan();
    pergi("isianSiswa", { isianSantri: berikut.id });
  });
}
