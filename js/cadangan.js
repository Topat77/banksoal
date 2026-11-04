// =====================================================
//  cadangan.js — CADANGAN DATA: semua isi aplikasi jadi satu file .json
//  Pengganti backup otomatis Firebase (yang cuma ada di paket berbayar).
//  Admin bisa baca semuanya, jadi file ini lengkap: akun, mapel, modul,
//  soal, ujian sumatif, lembar nilai, santri, dan pengaturan.
// =====================================================
// paket gratis nggak punya backup otomatis, jadi TU diingetin tiap 2 minggu
const BATAS_HARI_CADANGAN = 30;   // cadangan otomatis tiap bulan (lihat cadanganOtomatis)

// ====== CADANGAN OTOMATIS TIAP BULAN ======
// Paket gratis nggak punya server yang jalan sendiri, jadi cadangannya dibikin waktu TU buka aplikasi:
// kalau cadangan terakhir (dari perangkat TU mana pun) udah 30 hari lebih, file .json langsung diunduh.
// Di HP file cuma bisa disimpan setelah tombol dipencet, jadi di HP cukup muncul pemberitahuan.
let cadanganOtomatisDicoba = false;
function bisaUnduhOtomatis() {
  return !matchMedia("(pointer: coarse)").matches;
}
function perluCadangan() {
  const hari = hariSejakCadangan();
  const adaIsi = toko.mapel.length > 0 || toko.santri.length > 0;
  return adaIsi && (hari === null || hari >= BATAS_HARI_CADANGAN);
}
function cadanganOtomatis() {
  if (cadanganOtomatisDicoba || !sayaKurikulum() || !isiCadanganSiap() || !perluCadangan() || !bisaUnduhOtomatis()) return;
  if (!navigator.onLine && toko.backend.mode !== "coba") return;
  cadanganOtomatisDicoba = true;   // sekali per buka aplikasi, biar kalau gagal nggak ngulang terus
  unduhCadangan(null, null, { otomatis: true }).then(jadi => {
    if (jadi) kabar("Cadangan bulanan sudah diunduh otomatis ke folder Download. Simpan file-nya di Google Drive atau flashdisk.");
  });
}

// isi mapel diambil langsung dari server (isiLengkap), jadi cukup daftar mapel, grup & santri yang udah kebaca
function isiCadanganSiap() {
  return dataDasarSiap();
}

function hariSejakCadangan() {
  const t = toko.lembaga.cadanganTerakhir;
  return t ? Math.floor((Date.now() - t) / 86400000) : null;
}

// Aplikasi cuma mantau modul / sumatif / UAS / usulan semester yang dibuka (hemat kuota),
// jadi buat cadangan & pulihkan, isi SEMUA semester diambil sekali langsung dari server.
// (Satu kali ambil = baca semua dokumen itu sekali; cuma waktu unduh / pulihkan.)
async function isiLengkap() {
  const ambil = (jalur) => toko.backend.ambilKoleksi(jalur, []);
  const hasil = { mapel: {}, grup: {} };
  await Promise.all([
    ...toko.mapel.map(async m => {
      const [modul, sumatif, nilai] = await Promise.all([ambil(`mapel/${m.id}/modul`), ambil(`mapel/${m.id}/sumatif`), ambil(`mapel/${m.id}/nilai`)]);
      hasil.mapel[m.id] = { modul: urutIsi(modul), sumatif: urutIsi(sumatif), nilai };
    }),
    ...toko.grup.map(async g => {
      const [uas, usulan] = await Promise.all([ambil(`grup/${g.id}/uas`), ambil(`grup/${g.id}/usulan`)]);
      hasil.grup[g.id] = { uas: uas.map(amankanDok), usulan: urutIsi(usulan) };
    })
  ]);
  return hasil;
}

function dataCadangan(lengkap) {
  const dariMapel = (id) => lengkap.mapel[id] || { modul: [], sumatif: [], nilai: [] };
  const dariGrup = (id) => lengkap.grup[id] || { uas: [], usulan: [] };
  return {
    aplikasi: KONFIG.namaAplikasi,
    versiCadangan: 3,   // 3: pengguna ikut NIP & sapaan
    dibuat: new Date().toISOString(),
    oleh: (toko.saya && toko.saya.email) || "",
    lembaga: salin(toko.lembaga),
    bobot: salin(toko.bobot),
    wali: salin(toko.wali || {}),
    pengguna: toko.pengguna.map(p => ({ id: p.id, nama: p.nama, email: p.email, peran: p.peran, nip: p.nip || "", sapaan: p.sapaan || null, dibuat: p.dibuat || null })),
    santri: salin(toko.santri),
    mapel: toko.mapel.map(m => ({
      ...salin(m),
      modul: salin(dariMapel(m.id).modul),
      sumatif: salin(dariMapel(m.id).sumatif),
      nilai: salin(dariMapel(m.id).nilai || [])
    })),
    // grup mapel + UAS bersama & usulan soalnya
    grup: toko.grup.map(g => ({ ...salin(g), uas: salin(dariGrup(g.id).uas), usulan: salin(dariGrup(g.id).usulan) }))
  };
}

async function unduhCadangan(tombol, pesan, { otomatis = false } = {}) {
  wajibKurikulum();
  // otomatis: gagal diam aja (dicoba lagi waktu buka berikutnya), pemberitahuan di beranda tetap muncul
  const lapor = (teks) => { if (otomatis) console.warn("Cadangan otomatis:", teks); else if (pesan) pesan.textContent = teks; else kabar(teks); };
  if (!isiCadanganSiap()) {
    lapor("Data masih dimuat, tunggu sebentar lalu coba lagi.");
    return false;
  }
  if (!navigator.onLine && toko.backend.mode !== "coba") {
    lapor("Unduh cadangan butuh internet: isi semua semester diambil langsung dari server.");
    return false;
  }
  if (tombol) tombol.disabled = true;
  try {
    if (pesan) pesan.textContent = "Mengambil semua data dari server...";
    let lengkap;
    try { lengkap = await isiLengkap(); } catch (err) {
      console.warn("Gagal ambil data cadangan:", err);
      lapor("Gagal ngambil data dari server (sinyal putus atau jatah harian habis). Coba lagi nanti.");
      return false;
    }
    if (pesan) pesan.textContent = "";
    const data = dataCadangan(lengkap);
    const tanggal = new Date().toLocaleDateString("sv-SE");   // 2026-10-24
    const berkas = new File([JSON.stringify(data, null, 1)], `cadangan-banksoal-${tanggal}.json`, { type: "application/json" });
    const jadi = await berikanFile(berkas);
    if (!jadi) return false;
    simpanLembaga({ ...toko.lembaga, cadanganTerakhir: Date.now(), cadanganOleh: namaSaya() });
    const totalSoal = data.mapel.reduce((a, m) => a + m.modul.reduce((x, y) => x + jumlahSoal(y), 0), 0);
    if (pesan) pesan.textContent = `Tersimpan: ${data.mapel.length} mapel, ${totalSoal} soal, ${data.santri.length} siswa. Simpan file-nya di Google Drive atau flashdisk.`;
    return true;
  } finally {
    if (tombol) tombol.disabled = false;
  }
}

function htmlBagianCadangan() {
  const hari = hariSejakCadangan();
  const terakhir = toko.lembaga.cadanganTerakhir
    ? `Terakhir diunduh ${aman(waktuRapi(toko.lembaga.cadanganTerakhir))}${toko.lembaga.cadanganOleh ? ` oleh ${aman(toko.lembaga.cadanganOleh)}` : ""}.`
    : "Belum pernah diunduh.";
  return `
    <section class="bagian">
      <h2>Cadangan data</h2>
      <p class="info">Unduh semua isi aplikasi (akun, mapel, modul, soal, ujian, nilai, dan siswa) jadi satu file. Simpan di Google Drive atau flashdisk, biar kalau ada yang kehapus nggak sengaja, datanya masih ada. Firebase versi gratis nggak nyimpen cadangan otomatis, jadi ini satu-satunya cadangan. Di laptop, cadangan diunduh otomatis tiap bulan waktu TU buka aplikasi; di HP muncul pengingat. Tetap disarankan unduh sendiri sebelum ujian.</p>
      <p class="info"><b>${terakhir}</b>${hari !== null && hari >= BATAS_HARI_CADANGAN ? ` Sudah ${hari} hari, sebaiknya unduh lagi.` : ""}</p>
      <div class="baris-tombol">
        <button class="tombol-kedua" id="unduhCadangan">Unduh cadangan (.json)</button>
        <button type="button" class="tombol-teks pilih-file" id="pilihCadangan">Pulihkan dari cadangan…</button>
        <input type="file" id="fileCadangan" accept="application/json,.json" hidden>
        <span class="info" id="pesanCadangan" role="status"></span>
      </div>
      <p class="info kecil"><b>Pulihkan</b> cuma ngembaliin data yang <b>hilang</b> (kehapus). Data yang masih ada nggak ditimpa, jadi aman. Akun guru dan <b>lembar nilai</b> nggak ikut dipulihkan: akun tinggal disetujui lagi kalau gurunya login, nilainya masih ada di file cadangan (buka file .json-nya buat nyalin ulang).</p>
    </section>`;
}

// =====================================================
//  PULIHKAN DARI CADANGAN
//  Yang ditulis cuma dokumen yang belum ada di database (dicek ke server lewat
//  buatKalauBelumAda), jadi data yang masih ada nggak ketimpa dan aman dijalanin
//  berkali-kali. Butuh internet.
//  Lembar nilai NGGAK ikut: rules cuma ngebolehin guru pengampu bikin lembar nilai,
//  sedangkan pulihkan jalan di akun TU. Nilainya tetap ada di file cadangan.
// =====================================================
const JENIS_PULIHKAN = {
  pengaturan: "pengaturan", mapel: "mapel", santri: "siswa", grup: "grup mapel",
  modul: "modul", sumatif: "ujian sumatif", uas: "UAS bersama", usulan: "usulan soal UAS"
};

// isi file cadangan → { jenis: [[jalur, isi dokumen], ...] }, cuma yang sekarang nggak ada.
// lengkap: hasil isiLengkap() (semua semester dari server); tanpa itu dibandingin sama yang dimuat aplikasi.
function rencanaPulihkan(c, lengkap) {
  const modulSekarang = (id) => lengkap ? (lengkap.mapel[id] || {}).modul : modulMapel(id);
  const sumatifSekarang = (id) => lengkap ? (lengkap.mapel[id] || {}).sumatif : sumatifMapel(id);
  const uasSekarang = (id) => lengkap ? (lengkap.grup[id] || {}).uas : toko.uas[id];
  const usulanSekarang = (id) => lengkap ? (lengkap.grup[id] || {}).usulan : toko.usulan[id];
  const r = Object.fromEntries(Object.keys(JENIS_PULIHKAN).map(k => [k, []]));
  // id dipakai jadi jalur dokumen, jadi wajib teks biasa (tanpa "/")
  const sah = (x) => adalahObjek(x) && typeof x.id === "string" && x.id !== "" && !x.id.includes("/");
  const daftar = (x) => (Array.isArray(x) ? x : []).filter(sah);
  const ada = (list, id) => (list || []).some(x => x.id === id);

  if (adalahObjek(c.lembaga) && !Object.keys(toko.lembaga).length) r.pengaturan.push(["pengaturan/lembaga", salin(c.lembaga)]);
  if (adalahObjek(c.bobot) && !Object.keys(toko.bobot).length) r.pengaturan.push(["pengaturan/bobot", salin(c.bobot)]);
  if (adalahObjek(c.wali) && adalahObjek(c.wali.tahun) && !Object.keys(toko.wali || {}).length) r.pengaturan.push(["pengaturan/wali", salin(c.wali)]);
  for (const s of daftar(c.santri)) if (!ada(toko.santri, s.id)) r.santri.push([`santri/${s.id}`, tanpaId(s)]);

  for (const m of daftar(c.mapel)) {
    // nilai ikut dipisah biar nggak masuk ke dokumen mapel (lembar nilai nggak dipulihkan)
    const { modul, sumatif, nilai, ...dok } = m;
    const mapelAda = ada(toko.mapel, m.id);
    if (!mapelAda) r.mapel.push([`mapel/${m.id}`, tanpaId(dok)]);
    for (const x of daftar(modul)) if (!ada(mapelAda && modulSekarang(m.id), x.id)) r.modul.push([`mapel/${m.id}/modul/${x.id}`, tanpaId(x)]);
    for (const x of daftar(sumatif)) if (!ada(mapelAda && sumatifSekarang(m.id), x.id)) r.sumatif.push([`mapel/${m.id}/sumatif/${x.id}`, tanpaId(x)]);
  }
  for (const g of daftar(c.grup)) {
    const { uas, usulan, ...dok } = g;
    const grupAda = ada(toko.grup, g.id);
    if (!grupAda) r.grup.push([`grup/${g.id}`, tanpaId(dok)]);
    for (const x of daftar(uas)) if (!ada(grupAda && uasSekarang(g.id), x.id)) r.uas.push([`grup/${g.id}/uas/${x.id}`, tanpaId(x)]);
    for (const x of daftar(usulan)) if (!ada(grupAda && usulanSekarang(g.id), x.id)) r.usulan.push([`grup/${g.id}/usulan/${x.id}`, tanpaId(x)]);
  }
  return r;
}

// induk dulu (mapel, grup, ...), baru isinya (modul, nilai, UAS, ...)
async function pulihkanCadangan(r) {
  const hasil = { ditulis: 0, sudahAda: 0, gagal: [] };
  for (const tahap of [["pengaturan", "mapel", "santri", "grup"], ["modul", "sumatif", "uas", "usulan"]]) {
    const tugas = tahap.flatMap(j => r[j]);
    const jadi = await Promise.allSettled(tugas.map(([jalur, isi]) => toko.backend.buatKalauBelumAda(jalur, isi)));
    jadi.forEach((x, i) => {
      if (x.status === "rejected") { console.warn("Gagal memulihkan", tugas[i][0], x.reason); hasil.gagal.push(tugas[i][0]); }
      else if (x.value) hasil.ditulis++;
      else hasil.sudahAda++;
    });
  }
  return hasil;
}

function pasangPulihkanCadangan() {
  const input = document.getElementById("fileCadangan");
  if (!input) return;
  const pesan = document.getElementById("pesanCadangan");
  const tombolPilih = document.getElementById("pilihCadangan");
  if (tombolPilih) tombolPilih.onclick = () => input.click();
  input.onchange = async () => {
    const f = input.files[0];
    input.value = "";
    if (!f) return;
    let c;
    try { c = JSON.parse(await f.text()); } catch { c = null; }
    if (!adalahObjek(c) || typeof c.versiCadangan !== "number" || !Array.isArray(c.mapel)) {
      return kabar("File ini bukan file cadangan Bank Soal. Pilih file cadangan-banksoal-....json yang dulu diunduh.");
    }
    if (!isiCadanganSiap()) return kabar("Data masih dimuat, tunggu sebentar lalu coba lagi.");
    if (!navigator.onLine && toko.backend.mode !== "coba") return kabar("Pulihkan butuh internet. Sambungkan dulu, lalu coba lagi.");

    let lengkap;
    pesan.textContent = "Mengecek data yang masih ada di server...";
    try { lengkap = await isiLengkap(); } catch (err) {
      console.warn("Gagal ambil data buat pulihkan:", err);
      pesan.textContent = "";
      return kabar("Gagal ngecek data di server (sinyal putus atau jatah harian habis). Coba lagi nanti.");
    }
    pesan.textContent = "";
    const r = rencanaPulihkan(c, lengkap);
    const ringkas = Object.entries(JENIS_PULIHKAN).filter(([k]) => r[k].length).map(([k, nama]) => `• ${r[k].length} ${nama}`);
    const tanggal = c.dibuat ? new Date(c.dibuat).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "tanpa tanggal";
    if (!ringkas.length) return kabar(`Semua isi cadangan ${tanggal} masih ada di aplikasi. Nggak ada yang perlu dipulihkan.`);
    if (!(await tanyaYakin(`Cadangan ${tanggal}.\n\nYang hilang dan bakal dipulihkan:\n${ringkas.join("\n")}\n\nData yang masih ada nggak ditimpa. Lembar nilai nggak ikut dipulihkan. Lanjut?`, { ya: "Pulihkan" }))) return;

    input.disabled = true;
    if (tombolPilih) tombolPilih.disabled = true;
    pesan.textContent = "Memulihkan...";
    try {
      const h = await pulihkanCadangan(r);
      pesan.textContent = `${h.ditulis} data dipulihkan${h.sudahAda ? `, ${h.sudahAda} dilewati karena ternyata masih ada` : ""}.`;
      if (h.gagal.length) {
        kabar(`${h.gagal.length} data gagal dipulihkan (mungkin isinya melebihi batas, atau internet putus):\n${h.gagal.slice(0, 5).join("\n")}${h.gagal.length > 5 ? "\n..." : ""}\n\nYang lain udah dipulihkan. Coba ulangi pulihkan sekali lagi; yang udah balik nggak bakal dobel.`);
      }
    } finally {
      input.disabled = false;
      if (tombolPilih) tombolPilih.disabled = false;
    }
  };
}
