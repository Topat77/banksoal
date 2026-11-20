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
    const wali7A1 = await page.$$eval('[data-kelas-tu="Paket B|7A1"] select[data-wali] option', x => x.map(o => o.value));
    tolak("pilihan wali 7A1 tanpa ustadzah", wali7A1.includes("u-aminah"));
    await page.evaluate(() => { const s = document.querySelector('[data-kelas-tu="Paket B|7A2"] select[data-wali]'); s.value = "u-yusuf"; s.dispatchEvent(new Event("change")); });
    await page.waitForTimeout(500);
    harap("wali 7A2 tersimpan", await page.evaluate(() => (waliKelas(semesterSekarang().tahun, idKelas("Paket B", "7A2")) || {}).uid), "u-yusuf");
    // menu Mapel TU: dikelompokkan per tingkat kelas, satu kotak = satu mapel di tingkat itu
    await ke(page, "mapelTU", {}, 600);
    boleh("menu Mapel: ada kelompok Kelas 7", await page.$$eval("h2.subjudul", h => h.some(x => /^Kelas 7\b/.test(x.textContent.trim()))));
    const kotakBI7 = await page.$('[data-nama-mapel="Bahasa Indonesia"][data-tingkat="7"]');
    boleh("kotak Bahasa Indonesia kelas 7 ada", kotakBI7);
    if (kotakBI7) {
      await kotakBI7.click(); await page.waitForTimeout(600);
      const kelasDiHalaman = await page.$$eval(".kartu-pantau-judul strong", x => x.map(e => e.textContent.trim()));
      boleh("isi kotak cuma kelas 7", kelasDiHalaman.length > 0 && kelasDiHalaman.every(k => /^Kelas 7/.test(k)));
    }
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

  // ---------- rapor format resmi Paket B ----------
  {
    console.log("\nRapor format resmi Paket B");
    const { browser, page, galat } = await buka({ hp: false });
    await page.clock.setFixedTime(new Date("2027-05-20T09:00:00"));   // semester Genap, keputusan naik kelas dicetak
    await masuk(page, "u-kur");
    // NISN diketik di Daftar siswa (kolom paling kanan)
    await ke(page, "santri", { kelasSantri: "Paket B|7A1", dariNilai: false }, 600);
    const sid = await page.$eval("#badanSantri tr[data-id]:not([data-id=''])", tr => tr.dataset.id);
    await page.fill(`#badanSantri tr[data-id="${sid}"] [data-f="nisn"]`, "0111835670");
    await page.press(`#badanSantri tr[data-id="${sid}"] [data-f="nisn"]`, "Tab"); await page.waitForTimeout(300);
    harap("NISN tersimpan", await page.evaluate(id => toko.santri.find(s => s.id === id).nisn, sid), "0111835670");
    // keputusan naik kelas siswa itu
    await page.click("[data-keputusan] [data-hasil=naik]"); await page.waitForTimeout(600);
    // satu mapel diniah dijadikan muatan lokal lewat form mapel
    const arab = await page.evaluate(() => (toko.mapel.find(m => m.kelas === "7A1" && /arab/i.test(m.nama)) || {}).id);
    if (arab) {
      await ke(page, "formMapel", { mapelEditId: arab, dariMapel: false, dariMapelTU: false }, 500);
      await page.check('[name="rapor"][value="mulok"]');
      await page.evaluate(() => document.getElementById("form").requestSubmit()); await page.waitForTimeout(500);
      harap("kelompok rapor tersimpan di mapel", await page.evaluate(id => cariMapel(id).rapor, arab), "mulok");
    }
    await ke(page, "rapor", { kelasRapor: "Paket B|7A1" }, 900);
    boleh("ada pengaturan rapor (kepala sekolah, tanggal)", await page.$("#formAturRapor"));
    await page.fill('#formAturRapor [name="kepala"]', "Kepala Contoh, S.Pd.I.");
    await page.evaluate(() => document.getElementById("formAturRapor").requestSubmit()); await page.waitForTimeout(300);
    await ke(page, "raporCetak", { kelasRapor: "Paket B|7A1", raporSantri: sid }, 900);
    const r = await page.evaluate(() => {
      const L = document.querySelector(".rapor-resmi");
      return {
        ada: !!L,
        identitas: L.querySelector(".identitas-resmi").innerText.replace(/\s+/g, " "),
        mapel: [...L.querySelectorAll(".tabel-rapor-resmi tbody tr:not(.kelompok) td:nth-child(2)")].map(t => t.textContent.trim()).filter(Boolean),
        keputusan: (L.querySelector(".kotak-keputusan td") || {}).textContent || "",
        kepala: L.querySelector(".ttd-kepala").textContent,
        kaki: L.querySelector(".kaki-rapor").textContent
      };
    });
    boleh("Paket B pakai rapor format resmi", r.ada);
    boleh("identitas: kelas romawi VII A1, fase D, semester 2 (Genap), NISN", /VII A1/.test(r.identitas) && /Fase : D/.test(r.identitas) && /2 \(Genap\)/.test(r.identitas) && /0111835670/.test(r.identitas));
    tolak("mapel diniah (MSU/MSW) nggak tercetak", r.mapel.some(n => /aqidah|fiqih/i.test(n)));
    if (arab) boleh("muatan lokal tercetak \"Muatan Lokal (Bahasa Arab)\"", r.mapel.some(n => /^Muatan Lokal \(Bahasa Arab\)$/.test(n)));
    boleh("keputusan: Naik ke kelas VIII (Delapan)", /Naik ke kelas VIII \(Delapan\)/.test(r.keputusan));
    boleh("nama kepala sekolah dari pengaturan rapor", /Kepala Contoh/.test(r.kepala));
    boleh("kaki halaman: nama | NISN … Paket B", /0111835670/.test(r.kaki) && /Paket B/.test(r.kaki));
    harap("nggak ada error", galatBersih(galat), []);
    await browser.close();
  }

  // ---------- rapor Paket C (Genap, kelas akhir) + Ganjil ----------
  {
    console.log("\nRapor format resmi Paket C & semester Ganjil");
    const { browser, page, galat } = await buka({ hp: false });
    await page.clock.setFixedTime(new Date("2027-05-20T09:00:00"));   // Genap 2026/2027
    await masuk(page, "u-kur");
    await page.evaluate(() => {
      simpanMapelData({ id: "bio12", nama: "Biologi", jenjang: "Paket C", kelas: "12B1", jenis: "umum", pengampu: [] });
      simpanMapelData({ id: "sej12", nama: "Sejarah", jenjang: "Paket C", kelas: "12B1", jenis: "umum", pengampu: [] });
      simpanSantri({ id: "sc1", absen: 1, nama: "Siswi Contoh", nis: "3.11.00.001", nisn: "0000000001", jenjang: "Paket C", kelas: "12B1", aktif: true });
    });
    await page.waitForTimeout(500);
    await ke(page, "santri", { kelasSantri: "Paket C|12B1", dariNilai: false }, 700);
    await page.click("[data-keputusan] [data-hasil=lulus]"); await page.waitForTimeout(600);
    await ke(page, "rapor", { kelasRapor: "Paket C|12B1", semRapor: null }, 900);
    await page.fill('#formAturRapor [name="tanggal"]', "2027-06-26");
    await page.fill('#formAturRapor [name="tanggalAkhir"]', "2027-05-29");
    await page.evaluate(() => document.getElementById("formAturRapor").requestSubmit()); await page.waitForTimeout(300);
    await ke(page, "raporCetak", { kelasRapor: "Paket C|12B1", raporSantri: "sc1" }, 900);
    const r = await page.evaluate(() => {
      const L = document.querySelector(".rapor-resmi");
      return {
        teks: L ? L.innerText.replace(/\s+/g, " ") : "",
        ttd: L ? [...L.querySelectorAll(".ttd-resmi tr")].map(tr => tr.cells.length) : [],
        ekskul: L ? L.querySelectorAll(".tabel-rapor-resmi")[L.querySelectorAll(".tabel-rapor-resmi").length - 4].querySelectorAll("tbody tr").length : 0
      };
    });
    boleh("Paket C pakai rapor format resmi, \"Nama Murid\"", /Nama Murid/.test(r.teks));
    boleh("kelompok mata pelajaran pilihan berisi Biologi", /Kelompok Mata Pelajaran Pilihan \d+ Biologi/.test(r.teks));
    boleh("Sejarah tetap di kelompok umum", /Umum .*Sejarah.*Kelompok Mata Pelajaran Pilihan/.test(r.teks));
    boleh("keputusan: murid dinyatakan LULUS Program Paket C (setara SMA)", /murid dinyatakan: LULUS Program Paket C \(setara SMA\)/.test(r.teks));
    boleh("kelas 12 pakai tanggal kelas akhir (29 Mei 2027)", /29 Mei 2027/.test(r.teks) && !/26 Juni 2027/.test(r.teks));
    harap("tanda tangan 3 kolom sejajar (jabatan, nama, NIP)", r.ttd.join(), "3,3,3");
    harap("ekstrakurikuler kosong tetap 2 baris", r.ekskul, 2);
    harap("nggak ada error", galatBersih(galat), []);
    await browser.close();

    // semester Ganjil (Paket B): catatan di samping ketidakhadiran + kotak tanggapan orang tua, tanpa keputusan
    const b = await buka({ hp: false });
    await b.page.clock.setFixedTime(new Date("2026-10-10T09:00:00"));
    await masuk(b.page, "u-kur");
    await ke(b.page, "raporCetak", { kelasRapor: "Paket B|7A1", semRapor: null, raporSantri: null }, 1200);
    const g = await b.page.evaluate(() => ({
      catatanSamping: !!document.querySelector(".rapor-resmi .dua-kotak-rapor .kotak-catatan"),
      tanggapan: !!document.querySelector(".rapor-resmi .kotak-tanggapan"),
      keputusan: !!document.querySelector(".rapor-resmi .kotak-keputusan")
    }));
    boleh("Ganjil: catatan wali kelas di samping ketidakhadiran", g.catatanSamping);
    boleh("Ganjil: ada kotak Tanggapan Orang Tua / Wali Murid", g.tanggapan);
    tolak("Ganjil: tanpa kotak keputusan", g.keputusan);
    harap("nggak ada error (Ganjil)", galatBersih(b.galat), []);
    await b.browser.close();
  }

  // ---------- modul di semester lain tetap kelihatan di perangkat lain ----------
  {
    console.log("\nModul semester lain tetap muncul (perangkat lain)");
    const { browser, page, galat } = await buka({ hp: false });
    await masuk(page, "u-aminah");
    // "HP": modul dibuat di semester lain (Genap tahun lalu)
    const semLain = await page.evaluate(async () => {
      const t = semesterSekarang().tahun.split("/").map(Number);
      const sem = { semester: "Genap", tahun: `${t[0] - 1}/${t[1] - 1}` };
      await toko.backend.tulis("mapel/bindo7b/modul/mod-semlain", {
        semester: sem.semester, tahun: sem.tahun, judul: "Modul Semester Lalu", catatan: "", link: "",
        pemilik: uidSaya(), namaPemilik: namaSaya(), dibagikan: false, pertemuan: [], bacaan: [], soal: [],
        dibuat: Date.now(), diubah: Date.now()
      });
      return `${sem.semester} ${sem.tahun}`;
    });
    // "laptop": aplikasi dibuka ulang (semester itu belum pernah dibuka di sini)
    await masuk(page, "u-aminah");
    await ke(page, "mapel", { mapelId: "bindo7b", tab: "modul", semester: null }, 1200);
    const chip = await page.$$eval(".pilih-semester .chip", x => x.map(e => e.textContent.trim()));
    boleh(`pilihan semester ${semLain} muncul sendiri`, chip.includes(semLain));
    const tombol = await page.$(`.pilih-semester .chip[data-sem*="Genap"]`);
    if (tombol) { await tombol.click(); await page.waitForTimeout(900); }
    boleh("modulnya kelihatan di semester itu", /Modul Semester Lalu/.test(await page.textContent("#isi")));
    await masuk(page, "u-kur");   // TU juga bisa nemu
    await ke(page, "mapel", { mapelId: "bindo7b", tab: "modul", semester: null }, 1200);
    boleh("TU: pilihan semester itu juga muncul", (await page.$$eval(".pilih-semester .chip", x => x.map(e => e.textContent.trim()))).includes(semLain));
    harap("nggak ada error", galatBersih(galat), []);
    await browser.close();
  }

  // ---------- isian rapor dari wali kelas ----------
  {
    console.log("\nIsian rapor wali kelas (Paket B)");
    const { browser, page, galat } = await buka({ hp: true });
    await masuk(page, "u-yusuf");
    await ke(page, "siswaGuru", {}, 700);
    tolak("bukan wali kelas: nggak ada tombol isi rapor", await page.$("[data-isian-kelas]"));
    await masuk(page, "u-hasan");   // wali 7A1
    await ke(page, "siswaGuru", {}, 700);
    boleh("wali kelas: ada tombol Isi rapor kelas 7A1", await page.$('[data-isian-kelas="Paket B|7A1"]'));
    tolak("mapel yang tidak masuk rapor (Aqidah Akhlak) nggak punya tombol isi nilai", await page.$$eval("[data-isi-nilai]", b => b.some(x => /Aqidah/.test(x.textContent))));
    boleh("mapel yang masuk rapor tetap ada tombol isi nilai", await page.$$eval("[data-isi-nilai]", b => b.some(x => /Bahasa Indonesia/.test(x.textContent))));
    await page.click('[data-isian-kelas="Paket B|7A1"]'); await page.waitForTimeout(700);
    const kolom = await page.$eval('#formCapaian textarea', t => t.name);
    await page.fill(`#formCapaian [name="${kolom}"]`, "Ananda sudah mampu memahami teks deskripsi.");
    await page.click('#formCapaian [type=submit]'); await page.waitForTimeout(400);
    const sid = await page.$eval("[data-isian-santri]", b => b.dataset.isianSantri);
    await page.click(`[data-isian-santri="${sid}"]`); await page.waitForTimeout(500);
    await page.fill('[name="sakit"]', "2");
    await page.fill('[name="e_kegiatan"]', "Pramuka");
    await page.fill('[name="e_predikat"]', "Baik");
    await page.click("#tambahEkskul");
    harap("tambah kegiatan: jadi 2 baris", await page.$$eval(".baris-ekskul", x => x.length), 2);
    await page.fill('[name="catatan"]', "Pertahankan semangat belajarmu.");
    await page.fill('[name="kn_0"]', "90");   // nilai kokurikuler Pemberdayaan
    await page.click('#formIsianSiswa [type=submit]'); await page.waitForTimeout(400);
    harap("tersimpan di database (capaian kelas + 1 siswa)", await page.evaluate(() =>
      toko.backend.ambilKoleksi("rapor", [["kelasId", "==", idKelas("Paket B", "7A1")]]).then(d => d.length)), 2);
    await ke(page, "isianRapor", {}, 500);
    tolak("siswa itu nggak lagi \"Belum diisi\"", /Belum diisi/.test(await page.$eval(`[data-isian-santri="${sid}"]`, b => b.textContent)));

    await masuk(page, "u-kur");
    await ke(page, "rapor", { kelasRapor: "Paket B|7A1", semRapor: null }, 900);
    boleh("TU: ada tombol isian wali kelas", await page.$("#keIsianRapor"));
    await page.click(`.baris[data-santri="${sid}"]`); await page.waitForTimeout(900);
    const r = await page.evaluate(() => document.querySelector(".rapor-resmi").innerText.replace(/\s+/g, " "));
    boleh("rapor: capaian dari wali kelas", /memahami teks deskripsi/.test(r));
    boleh("rapor: sakit 2 hari", /Sakit : 2 hari/.test(r));
    boleh("rapor: ekskul Pramuka (Baik)", /Pramuka Baik/.test(r));
    boleh("rapor: catatan wali kelas", /Pertahankan semangat/.test(r));
    boleh("rapor: nilai kokurikuler dari wali kelas (Pemberdayaan 90)", /Kokurikuler Muatan Pemberdayaan dan Keterampilan \d+ Pemberdayaan 90/.test(r));
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

  // ---------- cadangan otomatis mingguan ----------
  {
    console.log("\nCadangan otomatis");
    for (const [nama, opsi, harus] of [["laptop: langsung keunduh", { hp: false }, 1], ["HP: nunggu tombol dipencet", { hp: true, sentuh: true }, 0]]) {
      const { browser, page } = await buka({ ...opsi, sandiManual: true });
      let unduh = 0; page.on("download", () => unduh++);
      await masuk(page, "u-kur"); await page.waitForTimeout(1500);
      // laptop: muncul kotak kata sandi dulu (file cadangan dikunci), baru keunduh
      const kotakSandi = await page.$(".dialog-sandi input");
      harap(`${nama}: kotak kata sandi muncul`, !!kotakSandi, !!harus);
      if (kotakSandi) {
        boleh("kata sandi tersembunyi", await kotakSandi.evaluate(e => e.type === "password"));
        await page.click(".dialog-sandi .tombol-teks");
        boleh("tombol Lihat nampilin kata sandi", await kotakSandi.evaluate(e => e.type === "text"));
        await kotakSandi.fill("rahasia-tes");
        const tungguUnduh = page.waitForEvent("download");
        await page.click('.dialog [data-dialog="ya"]');
        const berkas = await tungguUnduh;
        const isi = JSON.parse(require("fs").readFileSync(await berkas.path(), "utf8"));
        boleh("file cadangan terkunci (data siswa nggak kebaca)", isi.terkunci === 1 && !("santri" in isi));
        const buka = await page.evaluate(async (c) => {
          const salah = await bukaCadangan(c, "salah");
          const benar = JSON.parse(await bukaCadangan(c, "rahasia-tes"));
          return { salah, siswa: Array.isArray(benar.santri) && benar.santri.length > 0 };
        }, isi);
        harap("kata sandi salah → nggak kebuka", buka.salah, null);
        boleh("kata sandi benar → isinya utuh", buka.siswa);
      }
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
