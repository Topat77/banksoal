// =====================================================
//  tampilan.js — potongan HTML yang sering dipakai (logo, ikon, baris daftar, kerangka memuat),
//  layar status (memuat, masuk, menunggu persetujuan), tanda di header,
//  menu samping (laptop) & menu bawah (HP). Router & pindah layar ada di layar.js.
// =====================================================

// ====== POTONGAN HTML YANG SERING DIPAKAI ======
// logo: huruf B dilingkari pulpen merah (sama kayak ikon aplikasi)
let nomorLogo = 0;
// tiap logo butuh id gradasi sendiri: kalau satu logo lagi disembunyikan (misal menu samping di HP),
// logo lain yang numpang id-nya ikut nggak kelihatan
const logo = () => { const id = `gLogo${++nomorLogo}`; return `<svg class="logo" aria-hidden="true" viewBox="0 0 512 512"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0B8C63"/><stop offset="1" stop-color="#13719F"/></linearGradient></defs><rect width="512" height="512" rx="115" fill="url(#${id})"/><g transform="translate(256 256) scale(1.0) translate(-256 -256)"><path d="M170 132 H284 C326 132 352 156 352 194 C352 216 341 233 322 242 C347 251 362 273 362 304 C362 346 331 376 286 376 H170 Z M228 180 V230 H276 C292 230 300 221 300 205 C300 189 292 180 276 180 Z M228 274 V328 H281 C299 328 308 318 308 301 C308 284 299 274 281 274 Z" fill="#fff" fill-rule="evenodd" transform="translate(256 258) scale(.84) translate(-266 -254)"/><path d="M372 150 C330 96 186 96 136 170 C86 246 120 398 254 410 C376 420 420 318 398 238" fill="none" stroke="#E0442E" stroke-width="16" stroke-linecap="round"/></g></svg>`; };

// tampilan waktu data masih dimuat: layar pembuka (ikon + nama + garis jalan, sama kayak di
// index.html) dan kerangka kartu abu-abu buat isi satu layar
function htmlPembuka() {
  return `<div class="pembuka" role="status" aria-label="Memuat">
    <img src="ikon-192.png" alt="" width="84" height="84">
    <b>${aman(KONFIG.namaAplikasi)}</b>
    <small>${aman(KONFIG.namaLembaga || "")}</small>
    <span class="pembuka-garis"></span>
  </div>`;
}
function htmlKerangka() {
  return `<div class="kerangka" role="status" aria-label="Memuat data"><span></span><span></span><span></span><span></span></div>`;
}

// ikon kecil di menu samping & kartu
function ikonMenu(k) { return (IKON[k] || "").replace("<svg ", '<svg class="ikon-menu" '); }
function ikonKotak(k, warna) { return `<span class="ikon-kotak ${warna}">${IKON[k] || ""}</span>`; }

const IKON = {
  beranda: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z"/></svg>`,
  cari: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>`,
  lainnya: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c1-3.5 3.8-5 7-5s6 1.5 7 5"/></svg>`,
  pantauan: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>`,
  akun: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.2"/><path d="M3 19c.8-3 3-4.5 6-4.5s5.2 1.5 6 4.5M16 6.5a3 3 0 0 1 0 5.5M18 14.8c1.6.6 2.6 2 3 4.2"/></svg>`,
  mapel: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/></svg>`,
  rapor: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h8l4 4v14H7z"/><path d="M15 3v4h4M10 12h6M10 16h6"/></svg>`,
  santri: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 9.5 12 5l10 4.5-10 4.5z"/><path d="M6 11.3V16c1.7 1.5 3.7 2.2 6 2.2s4.3-.7 6-2.2v-4.7M22 9.5V15"/></svg>`,
  bobot: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>`,
  uas: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 12l2 2 4-4M9 17h6"/></svg>`,
  modul: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5C6.5 4.5 9.5 4.5 12 6c2.5-1.5 5.5-1.5 8-.5V19c-2.5-1-5.5-1-8 .5-2.5-1.5-5.5-1.5-8-.5z"/><path d="M12 6v13.5"/></svg>`,
  soal: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/></svg>`,
  nilai: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h16M7 16V11M12 16V7M17 16v-3"/></svg>`,
  ai: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.8 4.9L19 9.7l-5.2 1.8L12 16.4l-1.8-4.9L5 9.7l5.2-1.8z"/><path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/></svg>`,
  cetak: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 8V3h10v5"/><rect x="3" y="8" width="18" height="9" rx="2"/><path d="M7 14h10v7H7z"/></svg>`,
  panah: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>`
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
  judul.innerHTML = `<span class="judul-logo">${logo()}${aman(KONFIG.namaAplikasi)}</span>`;
  const coba = toko.backend && toko.backend.mode === "coba";

  if (toko.status === "memuat") {
    isi.innerHTML = htmlPembuka();
    // kelamaan (sinyal jelek, server lambat): kasih jalan keluar, jangan muter terus
    setTimeout(() => {
      const p = isi.querySelector(".pembuka");
      if (toko.status !== "memuat" || !p || p.querySelector(".pembuka-lama")) return;
      p.insertAdjacentHTML("beforeend", `<p class="pembuka-lama">Memuat terlalu lama. Periksa sinyal, lalu <button type="button" class="tombol-teks" id="muatUlangPembuka">muat ulang</button>.</p>`);
      document.getElementById("muatUlangPembuka").onclick = () => location.reload();
    }, 15000);
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
          <div class="logo-masuk">${logo()}</div>
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
        h += htmlBaris({ attr: `data-akun="${aman(a.uid)}"`, judulBaris: aman(a.nama), sub: aman(a.ket) });
      }
      h += `</div>`;
    } else {
      h += `
          <button class="tombol-utama tombol-google" id="masukGoogle">
            <span class="g-bulat"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.3-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z"/><path fill="#FBBC05" d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2z"/><path fill="#EA4335" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.4 10c.8-2.4 3-4.1 5.6-4.1z"/></svg></span>
            Masuk dengan Google
          </button>
          <p class="info tengah" id="pesanMasuk" role="status"></p>
          <p class="info tengah">Dibuka dari WhatsApp dan tombolnya tidak jalan? Ketuk titik tiga di pojok kanan atas, lalu pilih <b>Buka di Chrome</b>.</p>`;
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
    menunggu: ["Menunggu persetujuan", "Akun Anda sudah terdaftar. Admin (TU) perlu menyetujuinya dulu. Setelah disetujui, halaman ini otomatis berubah, tidak perlu dibuka ulang."],
    ditolak: ["Akun belum bisa dipakai", "Permintaan akun Anda ditolak oleh admin (TU). Jika ini keliru, hubungi admin (TU)."],
    nonaktif: ["Akun dinonaktifkan", "Akun Anda sedang dinonaktifkan oleh admin (TU). Hubungi admin (TU) jika perlu diaktifkan lagi."]
  }[peran] || ["Akun belum bisa dipakai", "Hubungi admin (TU)."];

  isi.innerHTML = `
    <div class="layar-status kartu-status">
      <div class="masuk-atas"><button class="tombol-tema" aria-label="Ganti mode terang/gelap"></button></div>
      <div class="masuk-merek">${logo()}<div><h2>${aman(teks[0])}</h2><p>${aman(lembaga)}</p></div></div>
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
  if (kode.includes("network")) return "Tidak ada sinyal. Masuk pertama kali butuh internet.";
  if (kode.includes("unauthorized-domain")) return "Alamat web ini belum didaftarkan di Firebase (Authorized domains).";
  return "Gagal masuk. " + (err && err.message ? err.message : "");
}

// tanda kecil di header: offline / mode coba
function gambarTanda() {
  const t = [];
  if (!navigator.onLine) t.push(`<span class="tanda-sinyal" title="Perubahan disimpan di perangkat, dikirim otomatis waktu ada sinyal">Offline</span>`);
  if (toko.backend && toko.backend.mode === "coba") t.push(`<span class="tanda-coba">Mode coba</span>`);
  if (toko.status === "aktif" && toko.gagalMuat.length) {
    t.push(`<button type="button" class="tanda-gagal" id="muatUlangData"
      title="Gagal memuat: ${aman(toko.gagalMuat.join(", "))}. Bisa karena jatah harian database habis atau sinyal putus.">Data gagal dimuat · Muat ulang</button>`);
  }
  tandaHeader.innerHTML = t.join("");
  const ulang = document.getElementById("muatUlangData");
  if (ulang) ulang.onclick = async () => {
    if (!(await tanyaYakin(`Sebagian data gagal dimuat (${toko.gagalMuat.join(", ")}). Bisa karena jatah harian database habis (pulih sekitar jam 14.00–15.00 WIB) atau sinyal putus.\n\nMuat ulang aplikasinya sekarang?`, { ya: "Muat ulang" }))) return;
    if (await bolehTinggalkan()) location.reload();
  };
}
window.addEventListener("online", gambarTanda);
window.addEventListener("offline", gambarTanda);

// =====================================================
//  MENU SAMPING (laptop) & MENU BAWAH (HP)
// =====================================================
function kelompokLayar() {
  return sayaKurikulum() ? kelompokLayarTU() : kelompokLayarGuru();
}

function jumlahMenunggu() {
  return toko.pengguna.filter(p => p.peran === "menunggu").length;
}
function jumlahUASDiajukan() {
  return Object.values(toko.uas).flat().filter(u => u.status === "diajukan").length;
}

function gambarSamping() {
  const grup = kelompokLayar();
  const kur = sayaKurikulum();
  let h = `
    <div class="merek">
      ${logo()}
      <div>
        <strong>${aman(KONFIG.namaAplikasi)}</strong>
        <span>${aman(toko.lembaga.nama || KONFIG.namaLembaga || "")}</span>
      </div>
    </div>
    <form class="cari-samping" id="cariSamping" role="search">
      <input type="search" name="kata" placeholder="Cari soal" aria-label="Cari soal" value="${grup === "cari" ? aman(posisi.kata || "") : ""}">
    </form>
    <nav class="menu-samping">
      <button class="menu-item ${grup === "beranda" ? "aktif" : ""}" data-ke="beranda">${ikonMenu("beranda")}<span>Beranda</span></button>`;

  if (kur) {
    // TU: Mapel · Guru · Siswa (layar lama dibuka dari dalamnya, lihat admin.js)
    const n = jumlahMenunggu();
    const nUAS = jumlahUASDiajukan();
    h += `
      <button class="menu-item ${grup === "mapelTU" ? "aktif" : ""}" data-ke="mapelTU">${ikonMenu("mapel")}<span>Mapel</span>${nUAS ? `<span class="lencana">${nUAS}<span class="sr"> UAS diajukan</span></span>` : ""}</button>
      <button class="menu-item ${grup === "guru" ? "aktif" : ""}" data-ke="akun">${ikonMenu("akun")}<span>Guru</span>${n ? `<span class="lencana">${n}<span class="sr"> menunggu</span></span>` : ""}</button>
      <button class="menu-item ${grup === "siswa" ? "aktif" : ""}" data-ke="kelasSiswa">${ikonMenu("santri")}<span>Siswa</span></button>`;
  } else {
    // guru: Mapel (modul, soal, AI, cari) · Siswa (kelas yang diajar + isi nilai), lihat menuguru.js
    h += `
      <button class="menu-item ${grup === "mapelGuru" ? "aktif" : ""}" data-ke="mapelGuru">${ikonMenu("mapel")}<span>Mapel</span></button>
      <button class="menu-item ${grup === "siswa" ? "aktif" : ""}" data-ke="siswaGuru">${ikonMenu("santri")}<span>Siswa</span></button>`;
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
  if (fc) fc.onsubmit = async (e) => {
    e.preventDefault();
    const kata = e.target.kata.value;
    if (await bolehTinggalkan()) pergi("cari", { kata });
  };
  pasangTombolMenu(samping.querySelectorAll(".menu-item"));
}

// tombol menu (samping & bawah): pindah ke layar di data-ke, tanya dulu kalau isian form belum disimpan
function pasangTombolMenu(tombol) {
  tombol.forEach(b => {
    b.onclick = async () => {
      if (await bolehTinggalkan()) pergi(b.dataset.ke);
    };
  });
}

function gambarNavBawah() {
  const grup = kelompokLayar();
  const item = sayaKurikulum()
    ? [["beranda", "beranda", "Beranda"], ["mapelTU", "mapelTU", "Mapel"], ["akun", "guru", "Guru"], ["kelasSiswa", "siswa", "Siswa"], ["lainnya", "lainnya", "Saya"]]
    : [["beranda", "beranda", "Beranda"], ["mapelGuru", "mapelGuru", "Mapel"], ["siswaGuru", "siswa", "Siswa"], ["lainnya", "lainnya", "Saya"]];
  const ikonDari = { beranda: "beranda", lainnya: "lainnya", mapelTU: "mapel", mapelGuru: "mapel", guru: "akun", siswa: "santri" };
  navBawah.style.setProperty("--jumlah", item.length);
  const n = sayaKurikulum() ? jumlahMenunggu() : 0;
  navBawah.innerHTML = item.map(([ke, kunci, teks]) => {
    const aktif = grup === kunci || (kunci === "beranda" && grup === "mapel");
    const lencana = kunci === "guru" && n ? `<span class="lencana">${n}<span class="sr"> menunggu</span></span>` : "";
    return `<button data-ke="${ke}" class="${aktif ? "aktif" : ""}" ${aktif ? 'aria-current="page"' : ""}>${IKON[ikonDari[kunci]]}${lencana}<span>${teks}</span></button>`;
  }).join("");
  pasangTombolMenu(navBawah.querySelectorAll("button"));
}
