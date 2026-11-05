// tes fitur penting di browser (mode coba). Cek yang dipakai: data di `toko` & elemen layar,
// bukan kalimatnya, biar nggak gampang rusak kalau teksnya diganti.
const { buka, masuk, ke, harap, boleh, tolak } = require("./alat");
const galatBersih = (g) => g.filter(x => !x.includes("[coba]") && !/favicon|net::/.test(x));

async function fitur() {
  // ---------- menu TU & guru ----------
  {
    console.log("\nMenu bawah TU & guru (HP)");
    const { browser, page, galat } = await buka({ hp: true });
    await masuk(page, "u-kur");
    harap("menu TU", await page.$$eval(".nav-bawah button", x => x.map(e => e.textContent.trim())), ["Beranda", "Mapel", "Guru", "Siswa", "Saya"]);
    await masuk(page, "u-hasan");
    harap("menu guru", await page.$$eval(".nav-bawah button", x => x.map(e => e.textContent.trim())), ["Beranda", "Mapel", "Siswa", "Saya"]);
    tolak("beranda guru tanpa panel akses cepat", await page.$(".akses-cepat"));
    harap("nggak ada error", galatBersih(galat), []);
    await browser.close();
  }

  // ---------- sambutan pertama masuk & layar Panduan ----------
  {
    console.log("\nSambutan pertama masuk (sekali per akun per perangkat) & Panduan");
    const { browser, page, galat } = await buka({ hp: true });
    await masuk(page, "u-hasan");
    boleh("guru: sambutan muncul", await page.$("#sambutan"));
    for (let i = 0; i < 3; i++) { await page.click("#lanjutSambutan"); await page.waitForTimeout(100); }
    tolak("habis Mulai: sambutan hilang", await page.$("#sambutan"));
    await ke(page, "beranda");
    tolak("nggak muncul lagi buat akun ini", await page.$("#sambutan"));
    await masuk(page, "u-kur");
    boleh("akun lain (TU): sambutan tetap muncul", await page.$("#sambutan"));
    tolak("TU: panel Mulai dari sini lama udah nggak ada", await page.$(".panduan:not(.sambutan)"));
    await page.click("#lewatiSambutan"); await page.waitForTimeout(100);
    tolak("Lewati: sambutan hilang", await page.$("#sambutan"));
    await ke(page, "panduan");
    boleh("Panduan TU ada topiknya", (await page.$$(".topik-panduan")).length > 0);
    harap("tombol ‹ Panduan balik ke Saya", await page.evaluate(() => layarInduk()), "lainnya");
    await page.click("#ulangSambutan"); await page.waitForTimeout(300);
    boleh("sambutan bisa ditampilkan lagi", await page.$("#sambutan"));
    harap("nggak ada error", galatBersih(galat), []);
    await browser.close();
  }

  // ---------- putra / putri: ustadzah nggak boleh di kelas A ----------
  {
    console.log("\nUstadzah nggak bisa ngajar / jadi wali kelas putra (A)");
    const { browser, page } = await buka({ hp: true });
    await masuk(page, "u-kur");
    await ke(page, "kelasSiswa", { bagianSiswa: "putra" });
    const wali7A1 = await page.$$eval('[data-kartu-kelas="Paket B|7A1"] select[data-wali] option', x => x.map(o => o.value));
    tolak("pilihan wali 7A1 tanpa ustadzah", wali7A1.includes("u-aminah"));
    await page.evaluate(() => { const s = document.querySelector('[data-kartu-kelas="Paket B|7A2"] select[data-wali]'); s.value = "u-yusuf"; s.dispatchEvent(new Event("change")); });
    await page.waitForTimeout(500);
    harap("wali 7A2 tersimpan", await page.evaluate(() => (waliKelas(semesterSekarang().tahun, idKelas("Paket B", "7A2")) || {}).uid), "u-yusuf");
    await ke(page, "formMapel", { mapelEditId: "bindo7", dariMapel: false, dariMapelTU: true, namaMapelTU: "Bahasa Indonesia" });
    await page.evaluate(() => { const c = document.querySelector('[name="pengampu"][value="u-aminah"]'); c.checked = true; c.dispatchEvent(new Event("change")); document.getElementById("form").requestSubmit(); });
    await page.waitForTimeout(500);
    tolak("ustadzah nggak tersimpan jadi pengampu 7A1", await page.evaluate(() => cariMapel("bindo7").pengampu.includes("u-aminah")));
    await browser.close();
  }

  // ---------- naik kelas khusus TU, arsip siswa keluar ----------
  {
    console.log("\nNaik kelas (khusus TU) & arsip siswa keluar");
    const { browser, page, galat } = await buka({ hp: true });
    await page.clock.setFixedTime(new Date("2027-05-20T09:00:00"));   // semester Genap
    await masuk(page, "u-kur");
    await ke(page, "kelasSiswa", { bagianSiswa: "putra" });
    await page.click('[data-naik-kelas="Paket B|7A1"]'); await page.waitForTimeout(500);
    boleh("TU: panel keputusan muncul", await page.$("#panelKeputusan"));
    await page.click("[data-keputusan] [data-hasil=naik]"); await page.waitForTimeout(600);
    harap("keputusan naik tersimpan", await page.$eval("[data-keputusan] [data-hasil=naik]", e => e.getAttribute("aria-pressed")), "true");
    await ke(page, "kelasSiswa", { bagianSiswa: "arsip" });
    const keluar = await page.evaluate(() => toko.santri.filter(santriKeluar).length);
    harap("arsip nampilin semua siswa keluar", await page.$$eval("[data-hapus-keluar]", x => x.length), keluar);
    await page.click("[data-hapus-keluar]"); await page.waitForTimeout(500);
    harap("hapus permanen dari arsip", await page.evaluate(() => toko.santri.filter(santriKeluar).length), keluar - 1);
    harap("halaman nggak melebar", await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await masuk(page, "u-hasan");
    await ke(page, "santri", { kelasSantri: "Paket B|7A1", dariNilai: true });
    tolak("guru: panel keputusan nggak ada", await page.$("#panelKeputusan"));
    harap("nggak ada error", galatBersih(galat), []);
    await browser.close();
  }

  // ---------- TU hemat kuota: isi mapel dimuat waktu dibuka ----------
  {
    console.log("\nTU: isi mapel baru dimuat waktu dibuka");
    const { browser, page } = await buka({ hp: false });
    await masuk(page, "u-kur");
    const n = () => page.evaluate(() => Object.keys(langgananMapel).length);
    harap("buka beranda: belum ada isi mapel yang dimuat", await n(), 0);
    await ke(page, "mapel", { mapelId: "bindo7", tab: "modul", semester: null }, 700);
    const satu = await n();
    boleh("buka satu mapel: mapel itu (+ satu grupnya) aja", satu > 0 && satu < (await page.evaluate(() => toko.mapel.length)));
    await ke(page, "pantauGuru", {}, 700);
    harap("Pantau guru: semua dimuat", await n(), await page.evaluate(() => toko.mapel.length));
    await ke(page, "beranda", {}, 500);
    boleh("beranda: angka modul keisi", await page.$$eval(".kartu-angka b", x => x[1].textContent !== "–"));
    await browser.close();
  }

  // ---------- pengingat WA nggak nagih siswa yang udah keluar ----------
  {
    console.log("\nPengingat WA");
    const { browser, page } = await buka({ hp: false });
    await masuk(page, "u-kur");
    await ke(page, "mapelNamaTU", { namaMapelTU: "Aqidah Akhlak" }, 800);
    const pesan = await page.$$eval(".tombol-wa", x => x.map(e => decodeURIComponent(e.href.split("text=")[1] || "")).join("\n"));
    const siswa = await page.evaluate(() => { const mp = toko.mapel.find(m => m.nama === "Aqidah Akhlak" && m.kelas === "7A1"); return santriLembar(mp, semesterSekarang()).filter(s => !santriKeluar(s)).length; });
    tolak("jumlah siswa di pesan = siswa aktif (nggak ngitung yang pindah)", new RegExp(`dari ${siswa + 1} siswa`).test(pesan));
    await browser.close();
  }

  // ---------- cadangan otomatis bulanan ----------
  {
    console.log("\nCadangan otomatis");
    for (const [nama, opsi, harus] of [["laptop: langsung keunduh", { hp: false }, 1], ["HP: nunggu tombol dipencet", { hp: true, sentuh: true }, 0]]) {
      const { browser, page } = await buka(opsi);
      let unduh = 0; page.on("download", () => unduh++);
      await masuk(page, "u-kur"); await page.waitForTimeout(1500);
      harap(nama, unduh, harus);
      if (!harus) boleh("HP: tombol unduh cadangan muncul di beranda", await page.$("#cadanganBeranda"));
      await browser.close();
    }
  }

  // ---------- lembar nilai satu kolom ----------
  {
    console.log("\nIsi nilai: satu kolom (HP)");
    const { browser, page } = await buka({ hp: true });
    await masuk(page, "u-hasan");
    await ke(page, "nilai", { mapelId: "bindo7", semester: null, kolomNilai: null }, 600);
    boleh("bawaan di HP: satu kolom", await page.$('[data-mode-nilai="kolom"].aktif'));
    boleh("petunjuk satu kolom muncul pertama kali", await page.$(".petunjuk-kolom"));
    const kolom = await page.$$eval(".lembar-nilai thead th", x => x.length);
    harap("tabel cuma Siswa + 1 kolom + Akhir", kolom, 3);
    const inp = await page.$$(".lembar-nilai input[data-nilai]");
    await inp[0].fill("77"); await inp[0].press("Enter");
    boleh("Enter pindah ke siswa berikutnya", await page.evaluate(() => document.activeElement === document.querySelectorAll(".lembar-nilai input[data-nilai]")[1]));
    await page.waitForTimeout(1000);
    const id = await page.$eval(".lembar-nilai input[data-nilai]", e => [e.closest("tr").dataset.santri, e.dataset.nilai]);
    harap("nilai tersimpan", await page.evaluate(([s, k]) => lembarNilai("bindo7", semAktif()).nilai[s][k], id), 77);
    await page.click("#tutupPetunjukKolom"); await page.reload(); await page.waitForTimeout(500);
    await ke(page, "nilai", { mapelId: "bindo7", semester: null }, 500);
    tolak("petunjuk nggak muncul lagi setelah ditutup", await page.$(".petunjuk-kolom"));
    await browser.close();
  }

  // ---------- jatah AI habis ----------
  {
    console.log("\nJatah AI habis");
    const { browser, page } = await buka({ hp: true });
    await masuk(page, "u-hasan");
    const pesan = await page.evaluate(() => pesanGagalAI(new Error("[429] Quota exceeded ... GenerateRequestsPerDayPerProjectPerModel")));
    boleh("pesan harian nyebut jam WIB", /pukul \d\d\.\d\d WIB/.test(pesan));
    boleh("diingat di perangkat (layar AI kasih tahu sebelum nyoba)", await page.evaluate(() => jatahAIHabis()));
    await browser.close();
  }

  // ---------- teks ketikan nggak jalan sebagai kode ----------
  {
    console.log("\nAman dari kode yang diketik (XSS)");
    const { browser, page } = await buka({ hp: true });
    await masuk(page, "u-kur");
    await page.evaluate(() => { const s = toko.santri.find(x => x.kelas === "7A1" && x.aktif !== false); simpanSantri({ ...s, nama: '<img src=x onerror="window.__xss=1">' }); });
    // CSP udah ngeblok onerror="...", jadi yang dicek: namanya tampil sebagai teks, nggak jadi elemen <img>
    for (const [l, t] of [["kelasSiswa", { bagianSiswa: "putra" }], ["santri", { kelasSantri: "Paket B|7A1", dariNilai: false }], ["nilai", { mapelId: "bindo7" }], ["rapor", { kelasRapor: "Paket B|7A1" }]]) {
      await ke(page, l, t, 500);
      if (l === "kelasSiswa") await page.evaluate(() => { const d = document.querySelector('[data-kartu-kelas="Paket B|7A1"]'); if (d) d.open = true; });
      const r = await page.evaluate(() => ({ elemen: !!document.querySelector("#isi img[onerror]"), teks: document.getElementById("isi").innerText.includes("<img") || [...document.querySelectorAll("#isi input")].some(i => i.value.includes("<img")) }));
      harap(`${l}: nama siswa tampil sebagai teks, bukan HTML`, r, { elemen: false, teks: true });
    }
    await browser.close();
  }
}
module.exports = { fitur };
if (require.main === module) fitur().then(() => {
  const { lolos, gagal } = require("./alat").hasil();
  console.log(`\n${lolos} lolos, ${gagal} gagal`);
  process.exit(gagal ? 1 : 0);
});
