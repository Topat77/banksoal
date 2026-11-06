// =====================================================
//  layar.js — router: posisi, pindah layar (pergi/tampilkan), tombol ‹ & back HP,
//  dan pencari data layar (mapelAktif, semAktif, ...).
//  Layar status, menu samping & bawah ada di tampilan.js.
//  Isi tiap layar ada di file masing-masing (beranda.js, mapel.js, saya.js, cari.js, ...).
//
//  Alur ustadz:  Beranda → Mapel (pilih semester, tab Modul/Sumatif)
//                  → Modul (pertemuan + target capaian + soal formatif)
//                  → Sumatif (susun ujian dari soal modul) → Cetak
//  Alur admin (TU): Beranda → Pantauan / Akun / Mapel & pengampu / Santri / Bobot / Rapor
// =====================================================

// ====== ELEMEN TETAP DI HALAMAN ======
const isi = document.getElementById("isi");
const judul = document.getElementById("judul");
const jejak = document.getElementById("jejak");
const tombolKembali = document.getElementById("tombolKembali");
const samping = document.getElementById("samping");
const navBawah = document.getElementById("navBawah");
const tandaHeader = document.getElementById("tandaHeader");

// ====== POSISI & PINDAH LAYAR ======
let posisi = { layar: "beranda" };
let statusTergambar = null;

// nama layar → nama fungsinya (dicari pas dipakai, karena fungsinya ada di beberapa file)
const daftarLayar = {
  beranda: "layarBeranda",
  mapel: "layarMapel",
  formSemester: "formSemester",
  formModul: "formModul",
  modul: "layarModul",
  formBacaan: "formBacaan",
  formSoal: "formSoal",
  formSumatif: "formSumatif",
  sumatif: "layarSumatif",
  pilihSoal: "layarPilihSoal",
  formSoalUjian: "formSoalUjian",
  formSalin: "formSalin",
  cetak: "layarCetak",
  cari: "layarCari",
  lainnya: "layarLainnya",
  akun: "layarAkun",
  formMapel: "formMapel",
  santri: "layarSantri",
  nilai: "layarNilai",
  rapor: "layarRapor",
  raporCetak: "layarRaporCetak",
  bobot: "layarBobot",
  aiSoal: "layarAISoal",
  daftarUAS: "layarDaftarUAS",
  formGuru: "formGuru",
  aiGenerator: "layarAIGenerator",
  modulLama: "layarModulLama",
  mapelGuru: "layarMapelGuru",
  siswaGuru: "layarSiswaGuru",
  mapelTU: "layarMapelTU",
  mapelNamaTU: "layarMapelNamaTU",
  pantauGuru: "layarPantauGuru",
  kelasSiswa: "layarKelasSiswa",
  panduan: "layarPanduan"
};

// layar yang nggak boleh digambar ulang sendiri waktu data berubah
// (lagi ngetik / milih sesuatu, nanti isiannya hilang)
const LAYAR_DIAM = ["formSemester", "formModul", "formBacaan", "formSoal", "formSumatif",
                    "pilihSoal", "cetak", "cari", "lainnya", "modulLama", "formMapel", "formGuru", "aiGenerator", "formSoalUjian", "formSalin", "nilai", "santri", "bobot", "aiSoal"];

// layar yang lagi nampilin kerangka "memuat" (datanya belum kebaca): tetap digambar ulang
// waktu data datang, walau layarnya ada di LAYAR_DIAM (belum ada isian yang bisa hilang)
let layarMenunggu = false;
function tampilMemuat(teksJudul) {
  judul.textContent = teksJudul || "Memuat...";
  isi.innerHTML = htmlKerangka();
  layarMenunggu = true;
}

// ---- isian form yang belum disimpan ----
// Form yang diketik lalu ditinggal lewat tombol ‹, menu, atau back HP: tanya dulu.
// Pindah layar dari kode (misal habis Simpan) nggak ditanya.
const LAYAR_FORM = ["formSemester", "formModul", "formBacaan", "formSoal", "formSumatif", "formSoalUjian",
                    "formSalin", "formMapel", "formGuru", "bobot"];
let formKotor = false;
let layarTerakhir = null;
function tandaiKotor() { if (LAYAR_FORM.includes(posisi.layar)) formKotor = true; }
isi.addEventListener("input", tandaiKotor);
isi.addEventListener("change", tandaiKotor);
async function bolehTinggalkan() {
  if (!formKotor) return true;
  const ok = await tanyaYakin("Isian di layar ini belum disimpan. Tinggalkan dan buang isiannya?",
    { bahaya: true, ya: "Buang isian", tidak: "Lanjut mengisi" });
  if (ok) formKotor = false;
  return ok;
}
// tutup tab / muat ulang: browser yang nanya
window.addEventListener("beforeunload", (e) => {
  if (formKotor) { e.preventDefault(); e.returnValue = ""; }
});

// data hilang (misal dihapus dari perangkat lain) → dilempar biar balik ke layar aman
class DataHilang extends Error {}
function butuh(x) {
  if (!x) throw new DataHilang();
  return x;
}

// TU: isi mapel yang dibutuhin layar ini dimuat dulu (lihat mintaIsiMapel di langganan.js)
const LAYAR_ISI_SEMUA_TU = new Set(["pantauGuru", "cari", "rapor", "raporCetak"]);
function mintaIsiLayarTU() {
  if (LAYAR_ISI_SEMUA_TU.has(posisi.layar)) return mintaIsiSemua();
  const ids = [];
  const mp = posisi.mapelId && cariMapel(posisi.mapelId);
  if (mp) ids.push(mp.id, ...mapelSegrup(mp).map(x => x.id));   // modul kelas lain di grup ikut kelihatan
  const edit = posisi.layar === "formMapel" && posisi.mapelEditId && cariMapel(posisi.mapelEditId);
  if (edit) ids.push(edit.id);
  if (posisi.uasGrup) ids.push(...mapelGrup(posisi.uasGrup).map(x => x.id));
  if (posisi.layar === "mapelNamaTU") ids.push(...toko.mapel.filter(m => m.jenjang === jenjangAktif() && m.nama === posisi.namaMapelTU).map(m => m.id));
  mintaIsiMapel(ids);
}

function tampilkan(tetapDiTempat = false) {
  statusTergambar = toko.status;
  document.body.dataset.status = toko.status;
  tombolKembali.hidden = true;
  jejak.textContent = "";
  layarMenunggu = false;
  // pindah ke layar lain: isian layar sebelumnya udah ditinggal (atau udah disimpan)
  if (posisi.layar !== layarTerakhir || toko.status !== "aktif") formKotor = false;
  layarTerakhir = posisi.layar;

  if (toko.status !== "aktif") {
    samping.innerHTML = "";
    navBawah.innerHTML = "";
    gambarStatus();
    gambarTanda();
    document.title = KONFIG.namaAplikasi;
    window.scrollTo(0, 0);
    aturRiwayat();
    return;
  }

  // semester yang lagi dibuka (dan semester UAS-nya) ikut dimuat kalau belum
  pastikanSemester(semAktif());
  if (posisi.uasGrup && posisi.uasSem) pastikanSemester(dariKunciSemester(posisi.uasSem));
  if (sayaKurikulum()) { mintaIsiLayarTU(); cadanganOtomatis(); }

  try {
    window[daftarLayar[posisi.layar] || "layarBeranda"]();
  } catch (err) {
    if (err instanceof DataHilang && posisi.mapelId && mapelBisaDibuka(posisi.mapelId) && !isiMapelSiap(posisi.mapelId)) {
      // isi mapel belum kelar dimuat (atau semesternya baru mulai dimuat)
      tampilMemuat();
    } else {
      if (!(err instanceof DataHilang)) console.error(err);
      // balik ke halaman mapel kalau masih bisa, kalau nggak ke beranda
      const keMapel = posisi.mapelId && mapelBisaDibuka(posisi.mapelId) && posisi.layar !== "mapel";
      posisi = keMapel ? { ...posisi, layar: "mapel" } : { layar: "beranda" };
      try {
        window[daftarLayar[posisi.layar]]();
      } catch (err2) {
        if (!(err2 instanceof DataHilang)) console.error(err2);
        posisi = { layar: "beranda" };
        layarBeranda();
      }
    }
  }

  // layar TU yang dibuka dari dalam menu Mapel / Siswa: tombol ‹ balik ke induknya (admin.js)
  if (indukLayarMenu()) tombolKembali.hidden = false;

  gambarSamping();
  gambarNavBawah();
  gambarTanda();
  segarkanTandaTema();
  // menu yang lagi dibuka ditandai buat pembaca layar
  document.querySelectorAll(".menu-item").forEach(b => {
    if (b.classList.contains("aktif")) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });

  // judul tab ikut layar yang dibuka
  const teksJudul = judul.textContent.trim();
  document.title = teksJudul && teksJudul !== KONFIG.namaAplikasi ? `${teksJudul} · ${KONFIG.namaAplikasi}` : KONFIG.namaAplikasi;
  judul.title = judul.textContent;
  jejak.title = jejak.textContent;
  judul.dir = "auto";
  isi.querySelectorAll('textarea, input:not([type]), input[type="search"], input[type="text"]').forEach(el => el.dir = "auto");

  if (!tetapDiTempat) window.scrollTo(0, 0);
  aturRiwayat();
}

// layar-layar yang bisa dipakai buat UAS bersama (selain itu, mode UAS dilepas)
const LAYAR_UAS = ["sumatif", "pilihSoal", "formSoalUjian", "formSumatif", "aiSoal", "cetak"];
// layar yang tetap dihitung bagian tab AI kalau dibuka dari AI Generator (posisi.dariAI)
const LAYAR_ALUR_AI = ["aiGenerator", "aiSoal", "formModul", "formSumatif"];

function pergi(layar, tambahan = {}) {
  // nilai yang baru diketik langsung disimpan sebelum pindah layar
  if (typeof kirimNilaiTertunda === "function") kirimNilaiTertunda();
  posisi = { ...posisi, ...tambahan, layar };
  // "isi nilai dari menu Siswa" cuma berlaku selama masih di lembar nilai (tombol ‹ balik ke Siswa)
  if (layar !== "nilai" && layar !== "santri") posisi.dariSiswaGuru = false;
  if (!LAYAR_UAS.includes(layar)) posisi.uasGrup = null;
  if (!LAYAR_ALUR_AI.includes(layar)) posisi.dariAI = false;
  tampilkan();
}

// data berubah (dari perangkat ini atau perangkat lain)
let tandaLayarModul = null;
function segarkanLayar(penuh) {
  if (penuh || statusTergambar !== toko.status) {
    if (statusTergambar !== toko.status && toko.status === "aktif") posisi = { layar: "beranda" };
    return tampilkan(statusTergambar === toko.status);
  }
  if (toko.status !== "aktif") return;

  if (LAYAR_DIAM.includes(posisi.layar) && !layarMenunggu) {
    if (!samping.contains(document.activeElement)) gambarSamping();
    gambarNavBawah();
    // cari: hasilnya dihitung ulang (kotak ketiknya nggak diganggu), biar mapel yang baru kebaca ikut
    if (posisi.layar === "cari" && typeof cariUlang === "function") cariUlang();
    // daftar siswa: cuma panel keputusan naik kelas yang disegarkan (data santri bisa berubah dari HP lain)
    if (posisi.layar === "santri" && typeof segarkanKeputusan === "function") segarkanKeputusan();
    return;
  }
  if (posisi.layar === "modul") {
    // layar modul ada pratinjau PDF: jangan digambar ulang kalau modulnya nggak berubah
    const m = modulMapel(posisi.mapelId).find(x => x.id === posisi.modId);
    const tanda = JSON.stringify([m, toko.lembaga]);
    if (tanda === tandaLayarModul) {
      if (!samping.contains(document.activeElement)) gambarSamping();
      return;
    }
  }
  tampilkan(true);
}

// tombol ‹ : tiap layar balik ke layar "induk"-nya
function layarInduk() {
  const L = posisi.layar;
  const indukMenu = indukLayarMenu();
  if (indukMenu) return indukMenu;
  if (posisi.dariAI && LAYAR_ALUR_AI.includes(L) && L !== "aiGenerator") return "aiGenerator";
  if (L === "formModul") return posisi.modEditId ? "modul" : "mapel";
  if (L === "formSumatif") return posisi.sumEditId ? "sumatif" : "mapel";
  if (L === "cetak") return posisi.cetakDari;
  if (L === "formMapel") return posisi.dariMapel ? "mapel" : "mapelTU";
  if (L === "formSalin") return posisi.salinDari === "modul" ? "modul" : "mapel";
  if (L === "santri") return posisi.dariNilai ? "nilai" : "beranda";
  if (L === "aiSoal") return posisi.aiUntuk === "sumatif" ? "sumatif" : "modul";
  if (L === "pilihSoal") return "sumatif";
  if (L === "formGuru") return "akun";
  if (L === "sumatif" && posisi.uasGrup && sayaKurikulum() && !sayaPengampu(cariMapel(posisi.mapelId))) return "daftarUAS";
  return {
    mapel: "beranda",
    formSemester: "mapel",
    modulLama: "mapel",
    modul: "mapel",
    formBacaan: "modul",
    formSoal: "modul",
    sumatif: "mapel",
    pilihSoal: "sumatif",
    formSoalUjian: "sumatif",
    nilai: "mapel",
    raporCetak: "rapor"
  }[L] || "beranda";
}
function kembali() {
  const ke = layarInduk();
  if (ke === "mapel" && posisi.layar === "modul") return pergi(ke, { tab: "modul" });
  if (ke === "mapel" && posisi.layar === "sumatif") return pergi(ke, { tab: "sumatif" });
  if (ke === "mapel" && posisi.layar === "nilai") return pergi(ke, { tab: "nilai" });
  pergi(ke);
}
tombolKembali.onclick = async () => { if (await bolehTinggalkan()) kembali(); };

// ---- tombol back HP / browser ----
// Selama bukan di beranda, ada satu langkah riwayat "cadangan". Back HP makan langkah itu,
// lalu aplikasinya balik ke layar induk (sama kayak tombol ‹). Di beranda nggak ada
// cadangan, jadi back keluar dari aplikasi seperti aplikasi Android biasa.
let adaCadangan = !!(history.state && history.state.banksoal);
let lewatiPop = false;
function aturRiwayat() {
  const diAkar = (toko.status !== "aktif" || posisi.layar === "beranda") && !document.body.classList.contains("ada-dialog");
  if (!diAkar && !adaCadangan) {
    history.pushState({ banksoal: 1 }, "");
    adaCadangan = true;
  } else if (diAkar && adaCadangan) {
    adaCadangan = false;
    lewatiPop = true;
    history.back();
  }
}
window.addEventListener("popstate", () => {
  adaCadangan = false;
  // ini back buatan aturRiwayat sendiri: cukup pastiin cadangannya sesuai layar sekarang
  if (lewatiPop) { lewatiPop = false; return aturRiwayat(); }
  // ada kotak dialog: back = Batal (atau Oke kalau cuma pesan)
  const dialog = [...document.querySelectorAll(".dialog-latar")].pop();
  if (dialog) {
    (dialog.querySelector('[data-dialog="tidak"]') || dialog.querySelector('[data-dialog="ya"]')).click();
    return aturRiwayat();
  }
  if (toko.status === "aktif" && posisi.layar !== "beranda") {
    if (!formKotor) return kembali();
    // isian belum disimpan: tetap di sini dulu, tanya (back lagi di dialog = Lanjut ngisi)
    aturRiwayat();
    bolehTinggalkan().then(ok => { if (ok) kembali(); });
    return;
  }
  aturRiwayat();
});

// ====== PENCARI DATA LAYAR ======
// mapel yang boleh dibuka: yang diampu (atau semua, buat kurikulum)
function mapelBisaDibuka(id) { return mapelTerlihat().find(m => m.id === id) || null; }
function mapelAktif() { return butuh(mapelBisaDibuka(posisi.mapelId)); }
function semAktif() { return posisi.semester ? dariKunciSemester(posisi.semester) : semesterSekarang(); }
// modul bisa dari mapel ini, atau dari kelas lain di grupnya (yang dibagikan)
function modAktif() { return butuh(modulGrup(posisi.mapelId).find(m => m.id === posisi.modId)); }
// ujian yang lagi dibuka: UAS bersama grup (posisi.uasGrup), atau sumatif biasa
function sumAktif() {
  if (posisi.uasGrup) return butuh(uasGrup(posisi.uasGrup, dariKunciSemester(posisi.uasSem)));
  return butuh(sumatifMapel(posisi.mapelId).find(s => s.id === posisi.sumId) ||
               sumatifGrup(posisi.mapelId).find(s => s.id === posisi.sumId));
}

function jumlahSoal(m) { return (m.soal || []).length; }
function namaMapel(m) { return `${m.nama} ${m.kelas}`; }

// semua semester yang ada isinya di satu mapel + semester sekarang
function daftarSemesterMapel(idMapel) {
  const peta = new Map();
  const tambah = (x) => peta.set(kunciSemester(x), { semester: x.semester, tahun: x.tahun });
  tambah(semesterSekarang());
  // modul & sumatif cuma kebaca buat semester yang udah dimuat; semester lama diketahui dari lembar nilai
  // (dimuat semua semester) dan dari semester yang pernah dibuka. Sisanya lewat "+ Semester lain".
  ((toko.isi[idMapel] || {}).nilai || []).forEach(tambah);
  semesterDimuat.forEach(tambah);
  modulMapel(idMapel).forEach(tambah);
  sumatifMapel(idMapel).forEach(tambah);
  if (posisi.semester && posisi.mapelId === idMapel) tambah(dariKunciSemester(posisi.semester));
  return [...peta.values()].sort(bandingSemester);
}
