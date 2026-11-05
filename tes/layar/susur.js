// susur semua layar (HP & laptop, terang & gelap): error, teks "undefined/NaN/[object Object]",
// halaman melebar, elemen keluar layar, isi kosong, atau layar yang dialihkan.
// Jalanin: node susur.js   (tambah --foto buat nyimpen screenshot di folder hasil/)
const fs = require("fs");
const path = require("path");
const { buka, masuk } = require("./alat");
const FOTO = process.argv.includes("--foto");
const LAYAR = {
  'u-kur': [
    ['beranda'], ['akun'], ['formGuru', { guruId: 'u-hasan' }], 
    ['formMapel', { mapelEditId: 'bindo7', dariMapel: false, dariMapelTU: true, namaMapelTU: 'Bahasa Indonesia' }], ['formMapel', { mapelEditId: null, dariMapel: false }],
    ['santri', { dariNilai: false }], ['rapor'], ['raporCetak', { kelasRapor: 'Paket B|7A1', raporSantri: null }], ['bobot'], ['daftarUAS'], ['mapelTU'], ['mapelNamaTU', { namaMapelTU: 'Bahasa Indonesia' }], ['pantauGuru'], ['kelasSiswa', { bagianSiswa: 'putra' }], ['kelasSiswa', { bagianSiswa: 'putri' }], ['kelasSiswa', { bagianSiswa: 'arsip' }],
    ['mapel', { mapelId: 'bindo7', tab: 'modul' }], ['mapel', { mapelId: 'bindo7', tab: 'sumatif' }], ['mapel', { mapelId: 'bindo7', tab: 'nilai' }],
    ['nilai', { mapelId: 'bindo7', dariNilai: true }], ['lainnya'], ['panduan'], ['cari'],
  ],
  'u-hasan': [['beranda'], ['mapelGuru'], ['siswaGuru'], ['nilai', { mapelId: 'bindo7', dariSiswaGuru: true }], ['lainnya'], ['panduan'], ['nilai', { mapelId: 'bindo7' }], ['mapel', { mapelId: 'bindo7', tab: 'modul' }]],
  'u-yusuf': [['beranda'], ['mapelGuru'], ['siswaGuru'], ['mapel', { mapelId: 'bindo7a2', tab: 'modul' }]],
  'u-aminah': [
    ['beranda'], ['aiGenerator'], ['cari'], ['lainnya'],
    ['mapel', { mapelId: 'bindo7b', tab: 'modul' }], ['mapel', { mapelId: 'bindo7b', tab: 'sumatif' }], ['mapel', { mapelId: 'bindo7b', tab: 'nilai' }],
    ['modul', { mapelId: 'bindo7b', modId: 'mod-deskripsi' }], ['formModul', { mapelId: 'bindo7b', modEditId: 'mod-deskripsi' }],
    ['formModul', { mapelId: 'bindo7b', modEditId: null }], ['formSemester', { mapelId: 'bindo7b' }],
    ['formBacaan', { mapelId: 'bindo7b', modId: 'mod-deskripsi', bacaanEditId: null }],
    ['formSoal', { mapelId: 'bindo7b', modId: 'mod-deskripsi', soalEditId: 's-1' }], ['formSoal', { mapelId: 'bindo7b', modId: 'mod-deskripsi', soalEditId: null }],
    ['sumatif', { mapelId: 'bindo7b', sumId: 'sum-sts', uasGrup: null }], ['formSumatif', { mapelId: 'bindo7b', sumEditId: 'sum-sts', uasGrup: null }],
    ['pilihSoal', { mapelId: 'bindo7b', sumId: 'sum-sts', uasGrup: null }], ['formSoalUjian', { mapelId: 'bindo7b', sumId: 'sum-sts', soalUjianId: null, uasGrup: null }],
    ['formSalin', { mapelId: 'bindo7b', salinDari: 'modul', modId: 'mod-deskripsi' }],
    ['cetak', { mapelId: 'bindo7b', cetakDari: 'modul', modId: 'mod-deskripsi' }], ['cetak', { mapelId: 'bindo7b', cetakDari: 'sumatif', sumId: 'sum-sts', uasGrup: null }],
    ['aiSoal', { mapelId: 'bindo7b', aiUntuk: 'modul', modId: 'mod-deskripsi', aiPertemuan: null }],
    ['aiSoal', { mapelId: 'bindo7b', aiUntuk: 'sumatif', sumId: 'sum-sts', uasGrup: null, usul: false }],
    ['modulLama', { mapelId: 'bindo7b' }], ['nilai', { mapelId: 'bindo7b' }], ['santri', { mapelId: 'bindo7b', dariNilai: true }],
  ],
};

async function susur() {
  const temuan = [];
  if (FOTO) fs.mkdirSync(path.join(__dirname, "hasil"), { recursive: true });
  for (const hp of [true, false]) for (const tema of ["terang", "gelap"]) {
    const { browser, page, galat } = await buka({ hp });
    for (const [uid, daftar] of Object.entries(LAYAR)) {
      await masuk(page, uid);
      await page.evaluate(t => pasangTema(t), tema);
      for (const [i, [layar, tambahan]] of daftar.entries()) {
        galat.length = 0;
        await page.evaluate(([l, t]) => pergi(l, t || {}), [layar, tambahan]);
        await page.waitForTimeout(250);
        const cek = await page.evaluate(() => {
          const teks = document.querySelector("#isi").innerText + " " + document.querySelector("#judul").textContent + " " + document.querySelector("#jejak").textContent;
          const aneh = teks.match(/\bundefined\b|\bNaN\b|\[object Object\]|\bnull\b|Invalid Date/g) || [];
          const lebar = document.documentElement.scrollWidth > innerWidth + 1;
          const keluar = [...document.querySelectorAll("#isi *")].filter(e => { const r = e.getBoundingClientRect(); return r.width && (r.right > innerWidth + 2 || r.left < -2) && getComputedStyle(e).position !== "fixed" && !e.closest(".lembar-nilai, .tabel-geser, [style*=overflow]"); })
            .slice(0, 3).map(e => `${e.tagName.toLowerCase()}.${[...e.classList].join(".")}`);
          return { layar: posisi.layar, terdaftar: !!daftarLayar[posisi.layar], aneh: [...new Set(aneh)], lebar, keluar, kosong: !document.querySelector("#isi").innerText.trim() };
        });
        const masalah = [];
        if (!cek.terdaftar) masalah.push("layar nggak terdaftar di daftarLayar");
        if (cek.layar !== layar) masalah.push(`dialihkan ke ${cek.layar}`);
        if (cek.aneh.length) masalah.push("teks aneh: " + cek.aneh.join(","));
        if (cek.lebar) masalah.push("halaman melebar");
        if (cek.keluar.length) masalah.push("keluar layar: " + cek.keluar.join(" "));
        if (cek.kosong) masalah.push("isi kosong");
        const err = galat.filter(x => !x.includes("[coba]") && !/favicon|net::/.test(x));
        if (err.length) masalah.push("ERROR: " + err.join(" | ").slice(0, 200));
        if (masalah.length) temuan.push(`${hp ? "hp" : "pc"}/${tema} ${uid} ${layar} ${JSON.stringify(tambahan || {})}: ${masalah.join(" ; ")}`);
        if (FOTO && tema === "terang") await page.screenshot({ path: path.join(__dirname, "hasil", `${hp ? "hp" : "pc"}-${uid}-${layar}-${i}.png`), fullPage: true });
      }
    }
    await browser.close();
  }
  return temuan;
}
module.exports = { susur };
if (require.main === module) susur().then(t => {
  console.log(t.length ? t.join("\n") : "Susur semua layar: nggak ada temuan");
  process.exit(t.length ? 1 : 0);
});
