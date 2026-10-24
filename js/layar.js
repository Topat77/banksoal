// =====================================================
//  layar.js — kerangka layar, menu, beranda, mapel, lainnya, cari
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
  kelolaMapel: "layarKelolaMapel",
  formMapel: "formMapel",
  pantauan: "layarPantauan",
  santri: "layarSantri",
  nilai: "layarNilai",
  rapor: "layarRapor",
  raporCetak: "layarRaporCetak",
  bobot: "layarBobot",
  aiSoal: "layarAISoal"
};

// layar yang nggak boleh digambar ulang sendiri waktu data berubah
// (lagi ngetik / milih sesuatu, nanti isiannya hilang)
const LAYAR_DIAM = ["formSemester", "formModul", "formBacaan", "formSoal", "formSumatif",
                    "pilihSoal", "cetak", "cari", "lainnya", "formMapel", "formSoalUjian", "formSalin", "nilai", "santri", "bobot", "aiSoal"];

// data hilang (misal dihapus dari perangkat lain) → dilempar biar balik ke layar aman
class DataHilang extends Error {}
function butuh(x) {
  if (!x) throw new DataHilang();
  return x;
}

function tampilkan(tetapDiTempat = false) {
  statusTergambar = toko.status;
  document.body.dataset.status = toko.status;
  tombolKembali.hidden = true;
  jejak.textContent = "";

  if (toko.status !== "aktif") {
    samping.innerHTML = "";
    navBawah.innerHTML = "";
    gambarStatus();
    gambarTanda();
    window.scrollTo(0, 0);
    return;
  }

  try {
    window[daftarLayar[posisi.layar] || "layarBeranda"]();
  } catch (err) {
    if (err instanceof DataHilang && posisi.mapelId && mapelBisaDibuka(posisi.mapelId) && !isiMapelSiap(posisi.mapelId)) {
      // isi mapel belum kelar dimuat
      judul.textContent = "Memuat...";
      isi.innerHTML = `<p class="kosong">Memuat data...</p>`;
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

  gambarSamping();
  gambarNavBawah();
  gambarTanda();
  segarkanTandaTema();

  judul.title = judul.textContent;
  jejak.title = jejak.textContent;
  judul.dir = "auto";
  isi.querySelectorAll('textarea, input:not([type]), input[type="search"], input[type="text"]').forEach(el => el.dir = "auto");

  if (!tetapDiTempat) window.scrollTo(0, 0);
}

function pergi(layar, tambahan = {}) {
  // nilai yang baru diketik langsung disimpan sebelum pindah layar
  if (typeof kirimNilaiTertunda === "function") kirimNilaiTertunda();
  posisi = { ...posisi, ...tambahan, layar };
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

  if (LAYAR_DIAM.includes(posisi.layar)) {
    if (!samping.contains(document.activeElement)) gambarSamping();
    gambarNavBawah();
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
  if (L === "formModul") return posisi.modEditId ? "modul" : "mapel";
  if (L === "formSumatif") return posisi.sumEditId ? "sumatif" : "mapel";
  if (L === "cetak") return posisi.cetakDari;
  if (L === "formMapel") return posisi.dariMapel ? "mapel" : "kelolaMapel";
  if (L === "formSalin") return posisi.salinDari === "modul" ? "modul" : "mapel";
  if (L === "santri") return posisi.dariNilai ? "nilai" : "beranda";
  if (L === "aiSoal") return posisi.aiUntuk === "sumatif" ? "sumatif" : "modul";
  return {
    mapel: "beranda",
    formSemester: "mapel",
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
tombolKembali.onclick = () => {
  const ke = layarInduk();
  if (ke === "mapel" && posisi.layar === "modul") return pergi(ke, { tab: "modul" });
  if (ke === "mapel" && posisi.layar === "sumatif") return pergi(ke, { tab: "sumatif" });
  if (ke === "mapel" && posisi.layar === "nilai") return pergi(ke, { tab: "nilai" });
  pergi(ke);
};

// ====== PENCARI DATA LAYAR ======
// mapel yang boleh dibuka: yang diampu (atau semua, buat kurikulum)
function mapelBisaDibuka(id) { return mapelTerlihat().find(m => m.id === id) || null; }
function mapelAktif() { return butuh(mapelBisaDibuka(posisi.mapelId)); }
function semAktif() { return posisi.semester ? dariKunciSemester(posisi.semester) : semesterSekarang(); }
function modAktif() { return butuh(modulMapel(posisi.mapelId).find(m => m.id === posisi.modId)); }
function sumAktif() { return butuh(sumatifMapel(posisi.mapelId).find(s => s.id === posisi.sumId)); }

function jumlahSoal(m) { return (m.soal || []).length; }
function namaMapel(m) { return `${m.nama} ${m.kelas}`; }

// semua semester yang ada isinya di satu mapel + semester sekarang
function daftarSemesterMapel(idMapel) {
  const peta = new Map();
  const tambah = (x) => peta.set(kunciSemester(x), { semester: x.semester, tahun: x.tahun });
  tambah(semesterSekarang());
  modulMapel(idMapel).forEach(tambah);
  sumatifMapel(idMapel).forEach(tambah);
  if (posisi.semester && posisi.mapelId === idMapel) tambah(dariKunciSemester(posisi.semester));
  return [...peta.values()].sort(bandingSemester);
}

// ====== POTONGAN HTML YANG SERING DIPAKAI ======
const LOGO = `<svg class="logo" viewBox="0 0 32 32" aria-hidden="true">
  <rect class="logo-kertas" x="6" y="3" width="20" height="26" rx="3" stroke-width="2"/>
  <path class="logo-garis" d="M11 10h10M11 15h10M17 22h4" fill="none" stroke-width="2" stroke-linecap="round"/>
  <ellipse class="logo-lingkar" cx="12.5" cy="22" rx="3.3" ry="2.7" transform="rotate(-14 12.5 22)" fill="none" stroke-width="2"/>
</svg>`;

const IKON = {
  beranda: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z"/></svg>`,
  cari: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>`,
  lainnya: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c1-3.5 3.8-5 7-5s6 1.5 7 5"/></svg>`,
  pantauan: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>`,
  akun: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.2"/><path d="M3 19c.8-3 3-4.5 6-4.5s5.2 1.5 6 4.5M16 6.5a3 3 0 0 1 0 5.5M18 14.8c1.6.6 2.6 2 3 4.2"/></svg>`,
  mapel: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/></svg>`,
  rapor: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h8l4 4v14H7z"/><path d="M15 3v4h4M10 12h6M10 16h6"/></svg>`,
  santri: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>`
};

// satu baris di daftar
function htmlBaris({ attr, nomor, judulBaris, sub, kanan, tanda, tandaJenis, arahJudul }) {
  return `
    <button class="baris" ${attr}>
      ${nomor !== undefined ? `<span class="baris-nomor">${nomor}</span>` : ""}
      <span class="baris-isi">
        <strong${arahJudul ? ` dir="auto"` : ""}>${judulBaris}</strong>
        ${sub ? `<span class="baris-sub">${sub}</span>` : ""}
        ${tanda ? `<span class="tanda ${tandaJenis || ""}">${tanda}</span>` : ""}
      </span>
      ${kanan ? `<span class="baris-kanan">${kanan}</span>` : ""}
      <span class="baris-panah" aria-hidden="true">›</span>
    </button>`;
}

// =====================================================
//  LAYAR STATUS: memuat, masuk, menunggu persetujuan
// =====================================================
function gambarStatus() {
  const lembaga = KONFIG.namaLembaga || "";
  judul.innerHTML = `<span class="judul-logo">${LOGO}${aman(KONFIG.namaAplikasi)}</span>`;
  const coba = toko.backend && toko.backend.mode === "coba";

  if (toko.status === "memuat") {
    isi.innerHTML = `<div class="layar-status"><p class="kosong">Memuat...</p></div>`;
    return;
  }

  if (toko.status === "gagal") {
    isi.innerHTML = `
      <div class="layar-status kartu-status">
        <h2>Ada masalah</h2>
        <p>${aman(toko.pesanGagal)}</p>
        <div class="baris-tombol">
          <button class="tombol-utama" id="muatUlang">Coba lagi</button>
          <button class="tombol-kedua" id="keluar">Keluar</button>
        </div>
      </div>`;
    document.getElementById("muatUlang").onclick = () => location.reload();
    document.getElementById("keluar").onclick = () => toko.backend.keluar();
    return;
  }

  if (toko.status === "keluar") {
    let h = `
      <div class="layar-masuk">
        <div class="masuk-atas"><button class="tombol-tema" aria-label="Ganti mode terang/gelap"></button></div>
        <div class="masuk-isi">
          <div class="logo-masuk">${LOGO}</div>
          <p class="sambut">AHLAN WA SAHLAN</p>
          <h2 class="judul-masuk">Bank <span class="gradasi">Soal</span></h2>
          <p class="info">${aman(lembaga)} · khusus ustadz &amp; ustadzah</p>
          <ul class="fitur-masuk">
            <li><span class="fi"><svg viewBox="0 0 24 24"><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/></svg></span>Modul ajar &amp; target tiap pertemuan</li>
            <li><span class="fi"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M9 12l2 2 4-4"/></svg></span>Soal lengkap dengan kunci jawaban</li>
            <li><span class="fi"><svg viewBox="0 0 24 24"><path d="M6 9V3h12v6M6 18H4v-6h16v6h-2M6 14h12v7H6z"/></svg></span>Cetak ujian sekali klik</li>
          </ul>
        </div>
        <div class="masuk-bawah">`;
    if (coba) {
      h += `
          <p class="pemberitahuan coba">Mode coba: data contoh, tersimpan di perangkat ini saja. Pilih akun contoh untuk mencoba.</p>
          <div class="daftar">`;
      for (const a of toko.backend.akunContoh) {
        h += htmlBaris({ attr: `data-akun="${a.uid}"`, judulBaris: aman(a.nama), sub: aman(a.ket) });
      }
      h += `</div>`;
    } else {
      h += `
          <button class="tombol-utama tombol-google" id="masukGoogle">
            <span class="g-bulat"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.3-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z"/><path fill="#FBBC05" d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2z"/><path fill="#EA4335" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.4 10c.8-2.4 3-4.1 5.6-4.1z"/></svg></span>
            Masuk dengan Google
          </button>
          <p class="info tengah" id="pesanMasuk" role="status"></p>
          <p class="info tengah">Dibuka dari WhatsApp dan tombolnya nggak jalan? Ketuk titik tiga di pojok kanan atas, lalu pilih <b>Buka di Chrome</b>.</p>`;
    }
    h += `</div>`;
    h += `</div>`;
    isi.innerHTML = h;
    segarkanTandaTema();

    if (coba) {
      isi.querySelectorAll("[data-akun]").forEach(b => b.onclick = () => toko.backend.masuk(b.dataset.akun));
    } else {
      const tombol = document.getElementById("masukGoogle");
      tombol.onclick = async () => {
        tombol.disabled = true;
        const pesan = document.getElementById("pesanMasuk");
        pesan.textContent = "Membuka jendela Google...";
        try {
          await toko.backend.masuk();
        } catch (err) {
          pesan.textContent = pesanGagalMasuk(err);
          tombol.disabled = false;
        }
      };
    }
    return;
  }

  // status "menunggu": sudah daftar, belum disetujui / ditolak / dinonaktifkan
  const peran = toko.saya ? toko.saya.peran : "menunggu";
  const teks = {
    menunggu: ["Tinggal menunggu persetujuan", "Akunmu sudah terdaftar. Admin (TU) perlu menyetujuinya dulu. Setelah disetujui, halaman ini otomatis berubah, nggak perlu dibuka ulang."],
    ditolak: ["Akun belum bisa dipakai", "Permintaan akunmu ditolak oleh admin (TU). Kalau ini keliru, hubungi admin (TU)."],
    nonaktif: ["Akun dinonaktifkan", "Akunmu sedang dinonaktifkan oleh admin (TU). Hubungi admin (TU) kalau perlu diaktifkan lagi."]
  }[peran] || ["Akun belum bisa dipakai", "Hubungi admin (TU)."];

  isi.innerHTML = `
    <div class="layar-status kartu-status">
      <div class="masuk-atas"><button class="tombol-tema" aria-label="Ganti mode terang/gelap"></button></div>
      <div class="masuk-merek">${LOGO}<div><h2>${aman(teks[0])}</h2><p>${aman(lembaga)}</p></div></div>
      <p>${aman(teks[1])}</p>
      <p class="info">Masuk sebagai <b>${aman(toko.auth ? toko.auth.email : "")}</b></p>
      <button class="tombol-kedua" id="keluar">${coba ? "Ganti akun contoh" : "Keluar"}</button>
    </div>`;
  document.getElementById("keluar").onclick = () => toko.backend.keluar();
  segarkanTandaTema();
}

function pesanGagalMasuk(err) {
  const kode = (err && err.code) || "";
  if (kode.includes("popup-closed") || kode.includes("cancelled-popup")) return "Jendela Google ditutup sebelum selesai. Coba lagi.";
  if (kode.includes("network")) return "Nggak ada sinyal. Masuk pertama kali butuh internet.";
  if (kode.includes("unauthorized-domain")) return "Alamat web ini belum didaftarkan di Firebase (Authorized domains).";
  return "Gagal masuk. " + (err && err.message ? err.message : "");
}

// tanda kecil di header: offline / mode coba
function gambarTanda() {
  const t = [];
  if (!navigator.onLine) t.push(`<span class="tanda-sinyal" title="Perubahan disimpan di perangkat, dikirim otomatis waktu ada sinyal">Offline</span>`);
  if (toko.backend && toko.backend.mode === "coba") t.push(`<span class="tanda-coba">Mode coba</span>`);
  tandaHeader.innerHTML = t.join("");
}
window.addEventListener("online", gambarTanda);
window.addEventListener("offline", gambarTanda);

// =====================================================
//  MENU SAMPING (laptop) & MENU BAWAH (HP)
// =====================================================
function kelompokLayar() {
  const L = posisi.layar;
  if (["cari"].includes(L)) return "cari";
  if (["lainnya"].includes(L)) return "lainnya";
  if (["pantauan"].includes(L)) return "pantauan";
  if (["akun"].includes(L)) return "akun";
  if (["santri"].includes(L) && !posisi.dariNilai) return "santri";
  if (["rapor", "raporCetak"].includes(L)) return "rapor";
  if (L === "bobot") return "bobot";
  if (["kelolaMapel", "formMapel"].includes(L) && !posisi.dariMapel) return "kelola";
  if (L === "beranda") return "beranda";
  return "mapel";
}

function jumlahMenunggu() {
  return toko.pengguna.filter(p => p.peran === "menunggu").length;
}

function gambarSamping() {
  const grup = kelompokLayar();
  const kur = sayaKurikulum();
  const sem = semAktif();
  let h = `
    <div class="merek">
      ${LOGO}
      <div>
        <strong>${aman(KONFIG.namaAplikasi)}</strong>
        <span>${aman(toko.lembaga.nama || KONFIG.namaLembaga || "")}</span>
      </div>
    </div>
    <form class="cari-samping" id="cariSamping" role="search">
      <input type="search" name="kata" placeholder="Cari soal" aria-label="Cari soal" value="${grup === "cari" ? aman(posisi.kata || "") : ""}">
    </form>
    <nav class="menu-samping">
      <button class="menu-item ${grup === "beranda" ? "aktif" : ""}" data-ke="beranda">Beranda</button>`;

  if (kur) {
    const n = jumlahMenunggu();
    h += `
      <button class="menu-item ${grup === "pantauan" ? "aktif" : ""}" data-ke="pantauan">Pantauan</button>
      <button class="menu-item ${grup === "akun" ? "aktif" : ""}" data-ke="akun"><span>Akun</span>${n ? `<span class="lencana" aria-label="${n} menunggu">${n}</span>` : ""}</button>
      <button class="menu-item ${grup === "kelola" ? "aktif" : ""}" data-ke="kelolaMapel">Mapel &amp; pengampu</button>
      <button class="menu-item ${grup === "bobot" ? "aktif" : ""}" data-ke="bobot">Bobot nilai</button>
      <button class="menu-item ${grup === "rapor" ? "aktif" : ""}" data-ke="rapor">Rapor</button>`;
  }
  h += `<button class="menu-item ${grup === "santri" ? "aktif" : ""}" data-ke="santri">Daftar santri</button>`;

  const urutJ = Object.keys(KELAS_PER_JENJANG);
  const daftar = kur
    ? [...mapelTerlihat()].sort((a, b) => (urutJ.indexOf(a.jenjang) - urutJ.indexOf(b.jenjang)) || bandingKelas(a, b) || a.nama.localeCompare(b.nama, "id"))
    : mapelTerlihat();
  if (!kur) h += `<p class="menu-judul">Mapel kamu</p>`;
  if (daftar.length === 0) h += `<p class="menu-kosong">${kur ? "Belum ada mapel" : "Belum ditugaskan ke mapel"}</p>`;

  let jenjangTadi = null;
  for (const m of daftar) {
    // admin: mapel dikelompokkan per jenjang (Paket B, Paket C)
    if (kur && m.jenjang !== jenjangTadi) {
      jenjangTadi = m.jenjang;
      h += `<p class="menu-judul">${aman(m.jenjang)}</p>`;
    }
    const mapelIni = grup === "mapel" && m.id === posisi.mapelId;
    h += `<button class="menu-item ${mapelIni && posisi.layar === "mapel" ? "aktif" : ""}" data-mapel="${m.id}">
            <span>${aman(m.nama)}</span><small>${aman(m.kelas)}</small>
          </button>`;
    if (!mapelIni) continue;

    // mapel yang lagi dibuka: tampilkan modul & sumatif semester yang dipilih
    const modul = modulMapel(m.id).filter(x => samaSemester(x, sem));
    const sumatif = sumatifMapel(m.id).filter(x => samaSemester(x, sem));
    h += `<div class="menu-anak"><p class="menu-catatan">${aman(namaSemester(sem))}</p>`;
    modul.forEach((x, i) => {
      const ini = x.id === posisi.modId && (["modul", "formSoal", "formBacaan", "formModul"].includes(posisi.layar) || (posisi.layar === "aiSoal" && posisi.aiUntuk === "modul"));
      h += `<button class="menu-item kecil ${ini ? "aktif" : ""}" data-mapel="${m.id}" data-mod="${x.id}">
              <span class="menu-nomor">${i + 1}</span><span dir="auto">${aman(x.judul)}</span>
            </button>`;
    });
    const sumIni = ["sumatif", "pilihSoal", "formSumatif", "formSoalUjian"].includes(posisi.layar) ||
                   (posisi.layar === "aiSoal" && posisi.aiUntuk === "sumatif") ||
                   (posisi.layar === "cetak" && posisi.cetakDari === "sumatif");
    h += `<button class="menu-item kecil ${sumIni ? "aktif" : ""}" data-mapel="${m.id}" data-tab-ke="sumatif">Sumatif (${sumatif.length})</button>`;
    h += `</div>`;
  }

  h += `
    </nav>
    <div class="samping-bawah">
      <button class="menu-item ${grup === "lainnya" ? "aktif" : ""}" data-ke="lainnya">
        <span class="akun-mini"><strong>${aman(namaSaya())}</strong><small>${aman(namaPeran(toko.saya.peran))}</small></span>
      </button>
    </div>`;
  samping.innerHTML = h;

  const fc = samping.querySelector("#cariSamping");
  if (fc) fc.onsubmit = (e) => {
    e.preventDefault();
    pergi("cari", { kata: e.target.kata.value });
  };
  samping.querySelectorAll(".menu-item").forEach(b => {
    b.onclick = () => {
      const d = b.dataset;
      if (d.ke === "kelolaMapel") return pergi("kelolaMapel", { dariMapel: false });
      if (d.ke === "santri") return pergi("santri", { dariNilai: false });
      if (d.ke) return pergi(d.ke);
      if (d.mod) return pergi("modul", { mapelId: d.mapel, modId: d.mod });
      if (d.tabKe) return pergi("mapel", { mapelId: d.mapel, tab: d.tabKe });
      const ganti = d.mapel !== posisi.mapelId;
      pergi("mapel", { mapelId: d.mapel, tab: ganti ? "modul" : (posisi.tab || "modul"), semester: ganti ? null : posisi.semester });
    };
  });
}

function gambarNavBawah() {
  const grup = kelompokLayar();
  const item = sayaKurikulum()
    ? [["beranda", "beranda", "Beranda"], ["pantauan", "pantauan", "Pantauan"], ["rapor", "rapor", "Rapor"], ["akun", "akun", "Akun"], ["lainnya", "lainnya", "Saya"]]
    : [["beranda", "beranda", "Beranda"], ["cari", "cari", "Cari"], ["lainnya", "lainnya", "Saya"]];
  const ikonDari = { beranda: "beranda", pantauan: "pantauan", akun: "akun", kelola: "mapel", lainnya: "lainnya", cari: "cari", rapor: "rapor", santri: "santri" };
  navBawah.style.setProperty("--jumlah", item.length);
  const n = sayaKurikulum() ? jumlahMenunggu() : 0;
  navBawah.innerHTML = item.map(([ke, kunci, teks]) => {
    const aktif = grup === kunci || (kunci === "beranda" && grup === "mapel");
    const lencana = kunci === "akun" && n ? `<span class="lencana" aria-label="${n} menunggu">${n}</span>` : "";
    return `<button data-ke="${ke}" class="${aktif ? "aktif" : ""}" ${aktif ? 'aria-current="page"' : ""}>${IKON[ikonDari[kunci]]}${lencana}<span>${teks}</span></button>`;
  }).join("");
  navBawah.querySelectorAll("button").forEach(b => {
    b.onclick = () => b.dataset.ke === "kelolaMapel" ? pergi("kelolaMapel", { dariMapel: false })
      : b.dataset.ke === "santri" ? pergi("santri", { dariNilai: false }) : pergi(b.dataset.ke);
  });
}

// =====================================================
//  BERANDA
// =====================================================
function sapaan() {
  const nama = namaSaya();
  return `<p class="sapa">Assalamu'alaikum, ${aman(nama)}</p>`;
}

function layarBeranda() {
  judul.innerHTML = `<span class="judul-logo">${LOGO}${aman(KONFIG.namaAplikasi)}</span>`;
  jejak.textContent = toko.lembaga.nama || KONFIG.namaLembaga || "";
  const kur = sayaKurikulum();
  const sem = semesterSekarang();
  const diampu = mapelDiampu();

  let utama = "";

  // ---------- ringkasan buat admin ----------
  if (kur) {
    const n = jumlahMenunggu();
    if (n) {
      utama += `
        <div class="pemberitahuan">
          <p><b>${n} akun</b> menunggu persetujuan.</p>
          <button class="tombol-teks" id="keAkun">Lihat</button>
        </div>`;
    }
    const hariCadangan = hariSejakCadangan();
    const adaIsi = toko.mapel.length > 0 || toko.santri.length > 0;
    if (adaIsi && (hariCadangan === null || hariCadangan >= BATAS_HARI_CADANGAN)) {
      utama += `
        <div class="pemberitahuan">
          <p>${hariCadangan === null ? "<b>Cadangan data belum pernah diunduh.</b>" : `<b>Cadangan data terakhir diunduh ${hariCadangan} hari lalu.</b>`} Unduh sekarang biar data aman kalau ada yang kehapus.</p>
          <button class="tombol-teks" id="cadanganBeranda">Unduh cadangan</button>
        </div>`;
    }
    const kelasKosong = daftarKelas().filter(x => santriKelas(x.jenjang, x.kelas).length === 0);
    if (kelasKosong.length) {
      utama += `
        <div class="pemberitahuan">
          <p><b>${kelasKosong.length} kelas</b> belum ada daftar santrinya: ${kelasKosong.map(x => aman(x.kelas)).join(", ")}.</p>
          <button class="tombol-teks" data-kelas-kosong="${aman(`${kelasKosong[0].jenjang}|${kelasKosong[0].kelas}`)}">Isi sekarang</button>
        </div>`;
    }
    const semuaModul = toko.mapel.flatMap(m => modulMapel(m.id)).filter(x => samaSemester(x, sem));
    const aktif = toko.pengguna.filter(p => PERAN_AKTIF.includes(p.peran)).length;
    utama += `
      <section class="ringkasan">
        <h2 class="subjudul">Semester ini <small>${aman(namaSemester(sem))}</small></h2>
        <div class="angka-angka">
          <div><b class="gradasi">${toko.mapel.length}</b><span>mapel</span></div>
          <div><b class="gradasi">${aktif}</b><span>akun aktif</span></div>
          <div><b class="gradasi">${semuaModul.length}</b><span>modul</span></div>
          <div><b class="gradasi">${semuaModul.reduce((x, m) => x + jumlahSoal(m), 0)}</b><span>soal</span></div>
        </div>
        <div class="baris-tombol">
          <button class="tombol-utama" id="kePantauan">Buka pantauan</button>
          <button class="tombol-kedua" id="keKelola">Mapel &amp; pengampu</button>
          <button class="tombol-kedua" id="keBobot">Bobot nilai</button>
          <button class="tombol-kedua" id="keSantri">Daftar santri</button>
        </div>
      </section>`;

    // panel per jenjang
    utama += `<div class="panel-jenjang">${daftarJenjang().map(j => {
      const mp = toko.mapel.filter(m => m.jenjang === j);
      const kelas = daftarKelas().filter(x => x.jenjang === j);
      const santri = toko.santri.filter(x => x.jenjang === j && x.aktif !== false).length;
      const tanpaAmpu = mp.filter(m => !(m.pengampu || []).length).length;
      return `
        <section class="kartu-jenjang">
          <h2>${aman(j)}</h2>
          <dl>
            <div><dt>Mapel</dt><dd>${mp.length}</dd></div>
            <div><dt>Kelas</dt><dd>${kelas.length}</dd></div>
            <div><dt>Santri</dt><dd>${santri}</dd></div>
          </dl>
          ${tanpaAmpu ? `<p class="info">${tanpaAmpu} mapel belum ada pengampunya.</p>` : ""}
          <div class="baris-tombol">
            <button class="tombol-teks" data-panel-jenjang="${aman(j)}" data-ke="kelolaMapel">Mapel</button>
            <button class="tombol-teks" data-panel-jenjang="${aman(j)}" data-ke="santri">Santri</button>
            <button class="tombol-teks" data-panel-jenjang="${aman(j)}" data-ke="rapor">Rapor</button>
          </div>
        </section>`;
    }).join("")}</div>`;

    if (toko.mapel.length === 0) {
      utama += `
        <section class="panduan">
          <h2>Mulai dari sini</h2>
          <ol>
            <li><strong>Setujui akun ustadz</strong><span>Minta ustadz dan ustadzah masuk pakai akun Google masing-masing, lalu setujui di halaman Akun.</span></li>
            <li><strong>Tambah mapel dan pengampunya</strong><span>Misalnya Bahasa Indonesia Paket B kelas 7A1, diampu Ustadzah Aminah.</span></li>
            <li><strong>Isi daftar santri tiap kelas</strong><span>No. absen, NIS, dan nama. Paling cepat: salin dari Excel lalu tempel di tabel.</span></li>
            <li><strong>Pantau isinya</strong><span>Lihat modul, soal, dan nilai yang sudah diisi tiap ustadz, lalu cetak rapor.</span></li>
          </ol>
        </section>`;
    }
  }

  // ---------- angka singkat punya sendiri (semester ini) ----------
  if (diampu.length) {
    const milikSem = diampu.flatMap(m => modulMapel(m.id)).filter(x => milikSaya(x) && samaSemester(x, sem));
    utama += `
      <section class="ringkasan">
        <h2 class="subjudul">Isianmu semester ini <small>${aman(namaSemester(sem))}</small></h2>
        <div class="angka-angka tiga">
          <div><b class="gradasi">${milikSem.length}</b><span>modul</span></div>
          <div><b class="gradasi">${milikSem.reduce((x, m) => x + (m.pertemuan || []).length, 0)}</b><span>pertemuan</span></div>
          <div><b class="gradasi">${milikSem.reduce((x, m) => x + jumlahSoal(m), 0)}</b><span>soal</span></div>
        </div>
      </section>`;
  }

  // ---------- mapel yang diampu ----------
  if (!kur || diampu.length) {
    utama += `<h2 class="subjudul">Mapel yang kamu ampu <small>${diampu.length} mapel</small></h2>`;
    if (diampu.length === 0) {
      utama += `
        <section class="panduan">
          <h2>Belum ada mapel</h2>
          <p>Kamu belum ditugaskan ke mapel mana pun. Minta admin (TU) menambahkanmu sebagai pengampu. Setelah ditambahkan, mapelnya otomatis muncul di sini.</p>
        </section>`;
    } else {
      utama += `<div class="daftar">`;
      for (const m of diampu) {
        const milik = modulMapel(m.id).filter(x => milikSaya(x) && samaSemester(x, sem));
        utama += htmlBaris({
          attr: `data-mapel="${m.id}"`,
          judulBaris: aman(m.nama),
          sub: `${aman(m.kelas)}, ${aman(m.jenjang)}`,
          kanan: isiMapelSiap(m.id) ? `${milik.length} modul` : ""
        });
      }
      utama += `</div>`;
    }
  }

  // ---------- kolom samping: lanjutkan ----------
  let sisi = "";
  const terakhir = ambilTerakhir().map(t => {
    const m = cariMapel(t.mapelId);
    if (!m) return null;
    const x = t.jenis === "modul"
      ? modulMapel(m.id).find(y => y.id === t.id)
      : sumatifMapel(m.id).find(y => y.id === t.id);
    return x ? { ...t, m, x } : null;
  }).filter(Boolean).slice(0, 5);

  if (terakhir.length) {
    sisi += `<section class="lanjutkan"><h2 class="subjudul">Lanjutkan</h2><div class="daftar">`;
    for (const t of terakhir) {
      sisi += htmlBaris({
        attr: `data-lanjut="${t.jenis}" data-mapel="${t.m.id}" data-isi="${t.x.id}"`,
        judulBaris: aman(t.jenis === "modul" ? t.x.judul : t.x.nama),
        arahJudul: true,
        sub: `${t.jenis === "modul" ? "Modul" : "Ujian sumatif"}, ${aman(namaMapel(t.m))}`
      });
    }
    sisi += `</div></section>`;
  }

  isi.innerHTML = sapaan() + `
    <div class="beranda ${sisi ? "ada-samping" : ""}">
      <div class="beranda-utama">${utama}</div>
      ${sisi ? `<div class="beranda-samping">${sisi}</div>` : ""}
    </div>`;

  const klik = (id, f) => { const el = document.getElementById(id); if (el) el.onclick = f; };
  klik("keAkun", () => pergi("akun"));
  klik("kePantauan", () => pergi("pantauan"));
  klik("keKelola", () => pergi("kelolaMapel", { dariMapel: false }));
  klik("keSantri", () => pergi("santri", { dariNilai: false }));
  klik("keBobot", () => pergi("bobot"));
  isi.querySelectorAll("[data-panel-jenjang]").forEach(b => b.onclick = () => {
    pilihJenjang(b.dataset.panelJenjang);
    pergi(b.dataset.ke, { dariMapel: false, dariNilai: false, kelasSantri: null, kelasRapor: null });
  });
  klik("cadanganBeranda", async () => {
    const b = document.getElementById("cadanganBeranda");
    if (await unduhCadangan(b, null)) tampilkan(true);
  });
  klik("keRapor", () => pergi("rapor"));
  isi.querySelectorAll("[data-kelas-kosong]").forEach(b => b.onclick = () => pergi("santri", { kelasSantri: b.dataset.kelasKosong, dariNilai: false }));

  isi.querySelectorAll(".baris[data-mapel]:not([data-lanjut])").forEach(b => {
    b.onclick = () => pergi("mapel", { mapelId: b.dataset.mapel, semester: null, tab: "modul" });
  });
  isi.querySelectorAll(".baris[data-lanjut]").forEach(b => {
    const d = b.dataset;
    b.onclick = () => {
      const x = d.lanjut === "modul"
        ? modulMapel(d.mapel).find(y => y.id === d.isi)
        : sumatifMapel(d.mapel).find(y => y.id === d.isi);
      const semester = x ? kunciSemester(x) : null;
      if (d.lanjut === "modul") pergi("modul", { mapelId: d.mapel, modId: d.isi, semester });
      else pergi("sumatif", { mapelId: d.mapel, sumId: d.isi, semester });
    };
  });
}

// =====================================================
//  HALAMAN SATU MAPEL: pilih semester, tab Modul / Sumatif
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

  const barisModul = (m, nomor, dariOrangLain) => htmlBaris({
    attr: `data-mod="${m.id}"`,
    nomor,
    judulBaris: aman(m.judul),
    arahJudul: true,
    sub: `${(m.pertemuan || []).length} pertemuan, ${jumlahSoal(m)} soal${dariOrangLain ? ` · ${aman(m.namaPemilik)}` : ""}`,
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
      if (lain.length === 0) html += `<p class="info">${kur ? "Belum ada modul dari pengampu lain." : "Belum ada modul yang dibagikan pengampu lain di mapel ini."}</p>`;
      else html += `<div class="daftar">${lain.map(m => barisModul(m, undefined, true)).join("")}</div>`;
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
    html += `<p class="info">Ujian sumatif disusun dari soal-soal modul semester ini: modul kamu sendiri dan modul yang dibagikan pengampu lain.</p>`;
    const milik = semuaSum.filter(milikSaya);
    const lain = semuaSum.filter(s => !milikSaya(s));
    const barisSum = (s, denganNama) => htmlBaris({
      attr: `data-sum="${s.id}"`,
      judulBaris: aman(s.nama),
      sub: `${aman(s.pelaksanaan || "Pelaksanaan belum diisi")}, ${(s.butir || []).length} soal${denganNama ? ` · ${aman(s.namaPemilik)}` : ""}`
    });
    if (ampu) {
      if (milik.length === 0) html += `<p class="kosong">Belum ada ujian sumatif.</p>`;
      else html += `<div class="daftar">${milik.map(s => barisSum(s, false)).join("")}</div>`;
      html += `<button class="tombol-utama" id="tambah">+ Buat ujian sumatif</button>`;
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
    b.onclick = () => pergi("modul", { modId: b.dataset.mod });
  });
  isi.querySelectorAll(".baris[data-sum]").forEach(b => {
    b.onclick = () => pergi("sumatif", { sumId: b.dataset.sum });
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

// =====================================================
//  SAYA (profil, lembaga, keluar)
// =====================================================
function layarLainnya() {
  judul.textContent = "Saya";
  const kur = sayaKurikulum();
  const coba = toko.backend.mode === "coba";
  const s = toko.saya || {};

  let h = `
    <section class="bagian">
      <h2>Profil</h2>
      <form id="formProfil">
        <label>Nama yang tampil <input name="nama" value="${aman(s.nama || "")}" required placeholder="Ustadzah Aminah"></label>
        <p class="info">Muncul di modul dan ujian yang kamu buat, dan di daftar pengampu.</p>
        <p class="label-sapaan">Saya seorang</p>
        <div class="pilih-jenis" role="radiogroup" aria-label="Ustadz atau ustadzah">
          <label class="radio"><input type="radio" name="sapaan" value="ustadz" ${sapaanPengguna(s) === "ustadz" ? "checked" : ""}> Ustadz</label>
          <label class="radio"><input type="radio" name="sapaan" value="ustadzah" ${sapaanPengguna(s) === "ustadzah" ? "checked" : ""}> Ustadzah</label>
        </div>
        <div class="baris-tombol">
          <button type="submit" class="tombol-utama">Simpan</button>
          <span class="tersimpan" id="tersimpanProfil" role="status"></span>
        </div>
      </form>
      <p class="info">Akun Google: <b>${aman(s.email || "")}</b> · ${aman(namaPeran(s.peran))}</p>
    </section>`;

  if (kur) {
    h += `
      <section class="bagian">
        <h2>Lembaga</h2>
        <form id="formLembaga">
          <label>Nama lembaga <input name="nama" value="${aman(toko.lembaga.nama || KONFIG.namaLembaga || "")}" placeholder="PKBM ..."></label>
          <label>Lama ujian bawaan <input name="waktu" value="${aman(toko.lembaga.waktu || "")}" placeholder="60 menit"></label>
          <p class="info">Dipakai di kop lembar soal semua ustadz. Masih bisa diganti tiap mau nyetak.</p>
          <div class="baris-tombol">
            <button type="submit" class="tombol-utama">Simpan</button>
            <span class="tersimpan" id="tersimpanLembaga" role="status"></span>
          </div>
        </form>
      </section>` + htmlBagianCadangan();
  }

  const pilih = pilihanTema();
  h += `
    <section class="bagian">
      <h2>Tampilan</h2>
      <div class="pilih-jenis tiga" role="radiogroup" aria-label="Mode tampilan">
        <label class="radio"><input type="radio" name="tema" value="" ${pilih === "" ? "checked" : ""}> Ikut HP</label>
        <label class="radio"><input type="radio" name="tema" value="terang" ${pilih === "terang" ? "checked" : ""}> Terang</label>
        <label class="radio"><input type="radio" name="tema" value="gelap" ${pilih === "gelap" ? "checked" : ""}> Gelap</label>
      </div>
      <p class="info">Bisa juga lewat tombol bulan/matahari di pojok kanan atas.</p>
    </section>`;

  let teksPasang;
  if (sudahTerpasang()) teksPasang = `<p class="info">Aplikasi sudah terpasang di perangkat ini.</p>`;
  else if (diIPhone()) teksPasang = `<p class="info">Di iPhone: buka lewat Safari, ketuk tombol <b>Bagikan</b> (kotak dengan panah ke atas), lalu pilih <b>Tambahkan ke Layar Utama</b>.</p>`;
  else teksPasang = `<p class="info">Pasang biar Bank Soal muncul di layar HP kayak aplikasi biasa, dan tetap bisa dibuka tanpa sinyal.</p>
      <div class="baris-tombol"><button class="tombol-kedua" id="pasang">Pasang di perangkat ini</button></div>
      <p class="info" id="pesanPasang" role="status"></p>`;
  h += `
    <section class="bagian">
      <h2>Pasang aplikasi</h2>
      ${teksPasang}
    </section>`;

  h += `
    <section class="bagian">
      <h2>Data</h2>
      <p class="info">${coba
        ? "Mode coba: semua data contoh tersimpan di perangkat ini saja dan nggak dikirim ke mana-mana."
        : "Soal tersimpan online, jadi bisa dibuka dari HP atau laptop mana pun pakai akun Google yang sama. Tanpa sinyal pun tetap bisa dipakai; perubahan dikirim otomatis waktu ada sinyal lagi."}</p>
      <div class="baris-tombol">
        <button class="tombol-kedua" id="keluar">${coba ? "Ganti akun contoh" : "Keluar"}</button>
        ${coba ? `<button class="tombol-teks merah" id="resetCoba">Kembalikan data contoh</button>` : ""}
      </div>
    </section>`;
  isi.innerHTML = h;

  document.getElementById("formProfil").onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const nama = f.get("nama").trim();
    if (!nama) return;
    const { id, ...lama } = toko.saya;
    simpanPengguna(uidSaya(), { ...lama, nama, sapaan: f.get("sapaan") || lama.sapaan || null });
    document.getElementById("tersimpanProfil").textContent = "Tersimpan";
  };
  const uc = document.getElementById("unduhCadangan");
  if (uc) uc.onclick = () => unduhCadangan(uc, document.getElementById("pesanCadangan"));
  const fl = document.getElementById("formLembaga");
  if (fl) {
    fl.onsubmit = (e) => {
      e.preventDefault();
      const f = new FormData(fl);
      simpanLembaga({ ...toko.lembaga, nama: f.get("nama").trim(), waktu: f.get("waktu").trim() });
      document.getElementById("tersimpanLembaga").textContent = "Tersimpan";
    };
  }
  document.getElementById("keluar").onclick = () => {
    if (!coba && !confirm("Keluar dari akun ini?")) return;
    toko.backend.keluar();
  };
  isi.querySelectorAll('[name="tema"]').forEach(r => r.onchange = () => pasangTema(r.value));
  const pasang = document.getElementById("pasang");
  if (pasang) {
    pasang.onclick = async () => {
      if (!ajakanPasang) {
        document.getElementById("pesanPasang").innerHTML = `Buka menu browser (titik tiga di pojok kanan atas), lalu pilih <b>Tambahkan ke layar utama</b> atau <b>Instal aplikasi</b>.`;
        return;
      }
      ajakanPasang.prompt();
      const hasil = await ajakanPasang.userChoice;
      ajakanPasang = null;
      if (hasil.outcome === "accepted") tampilkan(true);
    };
  }
  const reset = document.getElementById("resetCoba");
  if (reset) {
    reset.onclick = () => {
      if (!confirm("Semua perubahan di mode coba dihapus dan data contoh dikembalikan seperti semula. Lanjut?")) return;
      toko.backend.reset();
      pergi("beranda");
    };
  }
}

// =====================================================
//  CARI SOAL
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
        <button class="baris hasil" data-mapel="${x.mp.id}" data-mod="${x.m.id}">
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

// nilai yang belum sempat terkirim, dikirim waktu halaman ditutup
window.addEventListener("pagehide", () => { if (typeof kirimNilaiTertunda === "function") kirimNilaiTertunda(); });