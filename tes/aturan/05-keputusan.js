// =====================================================
grup("Panel keputusan naik kelas (lembar nilai Genap)");
{
  const pk = { console: { log: console.log, error() {} } };
  vm.createContext(pk);
  const grupJs = baca("js/grup.js"), keputusanJs = baca("js/keputusan.js");
  vm.runInContext([
    ...["salin", "aman", "bandingNama", "adaAbsen", "nomorAbsen"].map(n => ambilFungsi(alat, n)), ambilFungsi(grupJs, "tingkatKelas"), ambilFungsi(grupJs, "idKelas"),
    ambilFungsi(grupJs, "hurufRombel"), ambilKonstanta(grupJs, "JENJANG_IDAD"),
    "const KELAS_SD = [], KELAS_SMP = [], KELAS_SMA = [], KELAS_IDAD = [];", ambilKonstanta(baca("js/kurikulum.js"), "KELAS_PER_JENJANG"),
    // kelas yang ada (buat pilihan kelas tujuan per siswa) & hitungan keputusan (pengingat urutan, admin.js)
    "function daftarKelas() { return [...F.adaMapel].map(x => { const [jenjang, kelas] = x.split('|'); return { jenjang, kelas }; }); }",
    "function hitungKeputusanKelas() { return { total: 0, sudah: 0 }; }",
    ambilFungsi(santriJs, "bandingKelas"), ambilFungsi(simpanJs, "simpanSantri"), ambilFungsi(simpanJs, "tanpaId"),
    // tiruan browser & layar lain: dialog, backend, DOM, timer
    "const F = { peran: 'kurikulum', sekarang: { semester: 'Ganjil', tahun: '2026/2027' }, adaMapel: new Set(['Paket B|8A1']), dialog: [], jawab: () => Promise.resolve(true), tulis: () => Promise.resolve(), tulisan: [], timer: [], digambar: [], elemen: {}, fokus: false };",
    "const toko = { santri: [], backend: { tulis: (j, d) => { F.tulisan.push([j, d]); return F.tulis(j, d); } } };",
    "const navigator = { onLine: true };",
    "const document = { getElementById: id => F.elemen[id] || null, querySelector: () => null, activeElement: null };",
    "const CSS = { escape: x => String(x) };",
    "function setTimeout(f) { F.timer.push(f); }",
    "function sayaKurikulum() { return F.peran === 'kurikulum'; } function semesterSekarang() { return F.sekarang; }",
    "function mapelKelas(j, k) { return F.adaMapel.has(j + '|' + k) ? [{}] : []; }",
    "function berubah() {} function gagalSimpan() {} function pasangDiDaftar(d, x) { const i = d.findIndex(y => y.id === x.id); if (i >= 0) d[i] = x; else d.push(x); }",
    "function kabar(t) { F.dialog.push({ jenis: 'kabar', teks: t }); return Promise.resolve(); }",
    "function tanyaYakin(t, o) { F.dialog.push({ jenis: 'yakin', teks: t, ...o }); return F.jawab(t, o); }",
    "function gambarBarisKeputusanId(p, id) { F.digambar.push(id); }",
    baca("js/naikkelas.js"),
    "let panelKeputusan = null;",
    ambilKonstanta(keputusanJs, "TEKS_STATUS_KEPUTUSAN"), ambilFungsi(santriJs, "noAbsen"),
    ...["panelKeputusanBoleh", "rapikanTujuan", "labelHasilKeputusan", "htmlIsiBarisKeputusan", "pengingatUrutanNaik", "htmlPanelKeputusan"].map(n => ambilFungsi(keputusanJs, n)),
    "async " + ambilFungsi(keputusanJs, "putuskanSantri"),   // ambilFungsi nggak bawa kata async
    "this.ekspor = { F, toko, navigator, pasangPanel: p => { panelKeputusan = p; }, ubahKeputusan, keluarkanSantri, panelKeputusanBoleh, rapikanTujuan, labelHasilKeputusan, htmlIsiBarisKeputusan, htmlPanelKeputusan, putuskanSantri };"
  ].join("\n"), pk);
  const P = pk.ekspor, F = P.F;
  const TH = "2025/2026";
  const s7 = { id: "a", nama: "Ahmad", jenjang: "Paket B", kelas: "7A1", absen: 3, aktif: true };
  const s9 = { id: "b", nama: "Bilal", jenjang: "Paket B", kelas: "9A1", absen: 1, aktif: true };
  const mp7 = { jenjang: "Paket B", kelas: "7A1" }, mp9 = { jenjang: "Paket B", kelas: "9A1" };
  const genap = (tahun = TH) => ({ semester: "Genap", tahun });

  // ---- kapan panel muncul ----
  boleh("TU, Genap tahun lalu: panel muncul", P.panelKeputusanBoleh(genap()));
  boleh("TU, Genap tahun ini (udah jalan): panel muncul", P.panelKeputusanBoleh(genap("2026/2027")));
  tolak("TU, Ganjil: nggak muncul", P.panelKeputusanBoleh({ semester: "Ganjil", tahun: TH }));
  tolak("TU, Genap tahun depan: nggak muncul", P.panelKeputusanBoleh(genap("2027/2028")));
  F.peran = "ustadz";
  tolak("guru: nggak muncul", P.panelKeputusanBoleh(genap()));
  harap("guru: html panel kosong", P.htmlPanelKeputusan(mp7, genap(), [s7]), "");
  F.peran = "kurikulum";

  // ---- label & rapikan ----
  harap("label naik dengan tujuan", P.labelHasilKeputusan("naik", false, "8A1"), "Naik ke 8A1");
  harap("label naik tanpa tujuan", P.labelHasilKeputusan("naik", false, ""), "Naik kelas");
  harap("label tinggal kelas biasa", P.labelHasilKeputusan("tinggal", false), "Tidak naik");
  harap("label tinggal tingkat akhir", P.labelHasilKeputusan("tinggal", true), "Tidak lulus");
  harap("label lulus", P.labelHasilKeputusan("lulus", true), "Lulus");
  harap("label belum", P.labelHasilKeputusan("belum", false), "Belum diputuskan");
  harap("rapikan tujuan: spasi depan/belakang & dobel", P.rapikanTujuan("  8   A1 "), "8 A1");
  harap("rapikan tujuan: null jadi kosong", P.rapikanTujuan(null), "");

  // ---- isi satu baris ----
  // daftar tombol: "naik" biasa, "naik!" mati, "naik*" lagi ditekan (aria-pressed)
  const tombol = (h) => [...h.matchAll(/<button[^>]*data-hasil="(\w+)"[^>]*>/g)].map(m => m[1] + (/ disabled/.test(m[0]) ? "!" : "") + (/aria-pressed="true"/.test(m[0]) ? "*" : ""));
  const bBelum = P.htmlIsiBarisKeputusan(s7, 3, TH, null);
  harap("belum: tombol Naik & Tidak naik, belum ada yang ditekan, nggak ada Batalin", tombol(bBelum).join(), "naik,tinggal");
  boleh("belum: label 'Belum diputuskan'", bBelum.includes("Belum diputuskan"));
  const kNaik = P.ubahKeputusan(s7, TH, "naik", "8A1");
  const bNaik = P.htmlIsiBarisKeputusan(kNaik, 3, TH, null);
  harap("udah naik: Naik ditekan + ada Batalin", tombol(bNaik).join(), "naik*,tinggal,batal");
  boleh("udah naik: label 'Naik ke 8A1'", bNaik.includes("Naik ke 8A1"));
  harap("tingkat akhir kelas 9: tombol Lulus, Lulus lanjut ke kelas 10, Tidak lulus", tombol(P.htmlIsiBarisKeputusan(s9, 1, TH, null)).join(), "lulus,lanjut,tinggal");
  const lulus9 = P.ubahKeputusan(s9, TH, "lulus");
  harap("udah lulus lewat tombol: Lulus ditekan + Batalin", tombol(P.htmlIsiBarisKeputusan(lulus9, 1, TH, null)).join(), "lulus*,lanjut,tinggal,batal");
  const kunci = P.ubahKeputusan(kNaik, "2026/2027", "naik", "9A1");
  const bKunci = P.htmlIsiBarisKeputusan(kunci, 3, TH, null);
  harap("terkunci: semua tombol mati, nggak ada Batalin, hasil lama tetap ditandai", tombol(bKunci).join(), "naik!*,tinggal!");
  boleh("terkunci: ada keterangan tahun yang ngunci", bKunci.includes("Terkunci: sudah diproses di 2026/2027"));
  const bSimpan = P.htmlIsiBarisKeputusan(kNaik, 3, TH, "menyimpan");
  harap("lagi menyimpan: semua tombol mati", tombol(bSimpan).join(), "naik!*,tinggal!,batal!");
  boleh("lagi menyimpan: status sebaris sama label", bSimpan.includes('Naik ke 8A1<span class="keputusan-sebaris" role="status"> · Menyimpan...'));
  const bGagal = P.htmlIsiBarisKeputusan(s7, 3, TH, "gagal");
  boleh("gagal: pesan gagal + kelas css 'gagal', tombol tetap bisa dipencet", bGagal.includes('class="keputusan-ket gagal"') && bGagal.includes("Gagal menyimpan") && tombol(bGagal).join() === "naik,tinggal");
  boleh("menunggu sinyal: pesannya muncul", P.htmlIsiBarisKeputusan(kNaik, 3, TH, "menunggu").includes("Menunggu sinyal"));
  const bPindah = P.htmlIsiBarisKeputusan(P.keluarkanSantri(s7, TH, "pindah"), 3, TH, null);
  boleh("pindah: nggak ada tombol, label 'Pindah sekolah'", !bPindah.includes("<button") && bPindah.includes("Pindah sekolah"));
  const bNonaktif = P.htmlIsiBarisKeputusan({ ...s7, aktif: false }, 3, TH, null);
  boleh("nonaktif manual: nggak ada tombol, label 'Nonaktif'", !bNonaktif.includes("<button") && bNonaktif.includes("Nonaktif"));
  const jahat = { ...s7, nama: '<img src=x onerror="alert(1)">' };
  const bJahat = P.htmlIsiBarisKeputusan(jahat, '"><b>', TH, null);
  boleh("nama/nomor santri berisi HTML di-escape (nggak bisa nyisipin tag)", !bJahat.includes("<img") && !bJahat.includes("<b>") && bJahat.includes("&lt;img"));
  boleh("tanda kutip di nama nggak bisa keluar dari aria-label", !bJahat.includes('onerror="alert'));

  // ---- panel utuh ----
  P.toko.santri = [s7];
  const panel7 = P.htmlPanelKeputusan(mp7, genap(), [s7, { ...s7, id: "e", nama: "Eko", absen: undefined }]);
  boleh("panel kelas biasa: ada isian kelas tujuan, isinya tebakan 8A1", panel7.includes('id="tujuanKelas" value="8A1"'));
  harap("panel: satu baris per santri", (panel7.match(/<li class="baris-keputusan"/g) || []).length, 2);
  boleh("panel: nomor pakai absen, yang absennya kosong pakai urutan", panel7.includes('data-keputusan="a" data-no="3"') && panel7.includes('data-keputusan="e" data-no="2"'));
  boleh("panel: judul tahun → tahun berikut", panel7.includes("2025/2026 → 2026/2027"));
  const panel9 = P.htmlPanelKeputusan(mp9, genap(), [s9]);
  boleh("panel tingkat akhir: nggak ada isian kelas tujuan", !panel9.includes("tujuanKelas") && panel9.includes("tingkat akhir"));
  harap("santri kosong: panel nggak dibikin", P.htmlPanelKeputusan(mp7, genap(), []), "");
  harap("Ganjil: panel nggak dibikin", P.htmlPanelKeputusan(mp7, { semester: "Ganjil", tahun: TH }, [s7]), "");
  const tujuanJahat = { ...s7, id: "j", riwayatKelas: [{ tahun: TH, jenjang: "Paket B", kelas: "7A1", hasil: "naik" }], kelas: '"><img src=x>' };
  P.toko.santri = [tujuanJahat];
  boleh("kelas tujuan (tebakan dari data santri) di-escape di value isian", !P.htmlPanelKeputusan(mp7, genap(), [tujuanJahat]).includes("<img"));

  // ---- alur tombol (async: jalan sesudah semua tes sinkron) ----
  const jeda = () => new Promise(r => setImmediate(r));
  const siapkan = (daftar, { tujuan = "8A1", akhir = false, kelas = "7A1" } = {}) => {
    P.toko.santri = daftar.map(s => ({ ...s }));
    Object.assign(F, { dialog: [], tulisan: [], timer: [], digambar: [], fokus: false, jawab: () => Promise.resolve(true), tulis: () => Promise.resolve() });
    F.elemen = tujuan === null ? {} : { tujuanKelas: { value: tujuan, focus() { F.fokus = true; } } };
    P.navigator.onLine = true;
    const p = { tahun: TH, jenjang: "Paket B", kelas, akhir, status: new Map(), sibuk: new Set(), disentuh: false };
    P.pasangPanel(p);
    return p;
  };
  const santri = (id) => P.toko.santri.find(x => x.id === id);
  const yakin = () => F.dialog.filter(d => d.jenis === "yakin");
  const kabarTeks = () => F.dialog.filter(d => d.jenis === "kabar").map(d => d.teks).join(" | ");

  tunggu.push(Promise.resolve().then(async () => {
    grup("Panel keputusan naik kelas: alur tombol");
    let p;

    p = siapkan([s7]);
    F.jawab = () => Promise.resolve(false);
    await P.putuskanSantri(p, "a", "naik"); await jeda();
    harap("konfirmasi naik: teksnya", yakin()[0] && yakin()[0].teks, "Naikin Ahmad ke 8A1?");
    harap("dibatalin di dialog: nggak nulis, kelas tetap, nggak sibuk", `${F.tulisan.length}|${santri("a").kelas}|${p.sibuk.size}`, "0|7A1|0");

    p = siapkan([s7]);
    await P.putuskanSantri(p, "a", "naik"); await jeda();
    harap("naik disetujui: nulis sekali ke santri/a, kelas 8A1", `${F.tulisan.length}|${F.tulisan[0] && F.tulisan[0][0]}|${santri("a").kelas}`, "1|santri/a|8A1");
    harap("yang ditulis nggak bawa id, riwayat 1 entri", `${"id" in F.tulisan[0][1]}|${F.tulisan[0][1].riwayatKelas.length}`, "false|1");
    harap("habis kesimpan: status 'tersimpan', nggak sibuk", `${p.status.get("a")}|${p.sibuk.size}`, "tersimpan|0");
    F.timer.forEach(f => f());
    harap("4 detik kemudian status 'tersimpan' hilang", p.status.has("a"), false);

    p = siapkan([s7], { tujuan: "  " });
    await P.putuskanSantri(p, "a", "naik"); await jeda();
    boleh("kelas tujuan kosong: diingetin, isian difokusin, nggak ada konfirmasi", kabarTeks().includes("Isi dulu kelas tujuannya") && F.fokus && yakin().length === 0);
    harap("kelas tujuan kosong: nggak nulis", F.tulisan.length, 0);

    p = siapkan([s7], { tujuan: " 8Z " });
    await P.putuskanSantri(p, "a", "naik"); await jeda();
    boleh("kelas tujuan belum punya mapel: ada peringatan di konfirmasi", yakin()[0].teks.includes("Kelas 8Z Paket B belum punya mapel"));
    harap("kelas tujuan dirapiin sebelum disimpan", santri("a").kelas, "8Z");
    p = siapkan([s7]);
    await P.putuskanSantri(p, "a", "naik"); await jeda();
    boleh("kelas tujuan udah punya mapel: nggak ada peringatan", !yakin()[0].teks.includes("belum punya mapel"));

    p = siapkan([s7]);
    await P.putuskanSantri(p, "a", "tinggal"); await jeda();
    harap("tidak naik: teks & tombol konfirmasi", `${yakin()[0].teks}|${yakin()[0].ya}`, "Ahmad tidak naik kelas (tetap 7A1)?|Tidak naik");

    p = siapkan([s9], { tujuan: null, akhir: true, kelas: "9A1" });
    await P.putuskanSantri(p, "b", "lulus"); await jeda();
    harap("tingkat akhir (tanpa isian tujuan) lulus: teks konfirmasi, status lulus", `${yakin()[0].teks}|${yakin()[0].ya}|${santri("b").status}`, "Bilal lulus dari 9A1?|Lulus|lulus");
    p = siapkan([s9], { tujuan: null, akhir: true, kelas: "9A1" });
    await P.putuskanSantri(p, "b", "tinggal"); await jeda();
    harap("tingkat akhir tidak lulus: teks konfirmasi", yakin()[0].teks, "Bilal tidak lulus (tetap di 9A1)?");

    p = siapkan([kNaik]);
    await P.putuskanSantri(p, "a", "tinggal"); await jeda();
    boleh("ganti keputusan: konfirmasi nyebut keputusan sebelumnya", yakin()[0].teks.includes("Keputusan sebelumnya (Naik ke 8A1) diganti."));
    harap("ganti keputusan: kelas balik, riwayat tetap 1 entri", `${santri("a").kelas}|${santri("a").riwayatKelas.length}`, "7A1|1");

    p = siapkan([kNaik]);
    await P.putuskanSantri(p, "a", "batal"); await jeda();
    harap("batalin: konfirmasi merah + teks", `${yakin()[0].bahaya}|${yakin()[0].teks}`, "true|Batalkan keputusan Ahmad (Naik ke 8A1)? Kelasnya dikembalikan ke 7A1.");
    harap("batalin: kelas balik, riwayat kosong", `${santri("a").kelas}|${santri("a").riwayatKelas.length}`, "7A1|0");

    p = siapkan([kNaik]);
    await P.putuskanSantri(p, "a", "naik"); await jeda();
    harap("pencet keputusan yang sama: nggak ada dialog, nggak nulis", `${F.dialog.length}|${F.tulisan.length}`, "0|0");
    p = siapkan([s7]);
    await P.putuskanSantri(p, "a", "batal"); await jeda();
    harap("batalin yang belum diputuskan: diam aja", `${F.dialog.length}|${F.tulisan.length}`, "0|0");

    p = siapkan([kunci]);
    await P.putuskanSantri(p, "a", "tinggal"); await jeda();
    boleh("terkunci: dikasih tau tahun yang ngunci, nggak nulis", kabarTeks().includes("Sudah diproses di 2026/2027") && F.tulisan.length === 0 && yakin().length === 0);

    p = siapkan([s7]);
    const setuju = [];
    F.jawab = () => new Promise(r => setuju.push(r));
    const pertama = P.putuskanSantri(p, "a", "naik");
    await jeda();
    const kedua = P.putuskanSantri(p, "a", "tinggal");
    await jeda();
    harap("pencet lagi waktu dialog masih kebuka: diabaikan", yakin().length, 1);
    setuju.forEach(r => r(true)); await Promise.all([pertama, kedua]); await jeda();
    harap("... tetap nulis sekali aja", `${F.tulisan.length}|${santri("a").kelas}`, "1|8A1");

    p = siapkan([s7]);
    F.jawab = () => { P.toko.santri = [P.keluarkanSantri(s7, TH, "pindah")]; return Promise.resolve(true); };
    await P.putuskanSantri(p, "a", "naik"); await jeda();
    boleh("santri ditandai pindah dari HP lain waktu dialog kebuka: ditolak + dikasih tau", kabarTeks().includes("baru berubah") && F.tulisan.length === 0);
    harap("... status pindah nggak ketimpa, nggak sibuk", `${santri("a").status}|${p.sibuk.size}`, "pindah|0");
    p = siapkan([s7]);
    F.jawab = () => { P.toko.santri = [{ ...kNaik }]; return Promise.resolve(true); };
    await P.putuskanSantri(p, "a", "naik"); await jeda();
    harap("HP lain udah mutusin hal yang sama: nggak nulis lagi, nggak ada pesan", `${F.tulisan.length}|${kabarTeks()}`, "0|");

    p = siapkan([s7]);
    P.navigator.onLine = false;
    F.tulis = () => new Promise(() => {});
    await P.putuskanSantri(p, "a", "naik"); await jeda();
    harap("offline: status 'menunggu sinyal', nggak sibuk, kelas udah 8A1 di HP", `${p.status.get("a")}|${p.sibuk.size}|${santri("a").kelas}`, "menunggu|0|8A1");

    p = siapkan([s7]);
    F.tulis = () => Promise.reject(new Error("permission-denied"));
    await P.putuskanSantri(p, "a", "naik"); await jeda();
    harap("gagal nyimpan: status 'gagal', nggak sibuk", `${p.status.get("a")}|${p.sibuk.size}`, "gagal|0");
    harap("gagal nyimpan: data balik ke sebelum pencet", `${santri("a").kelas}|${(santri("a").riwayatKelas || []).length}`, "7A1|0");

    p = siapkan([s7]);
    let tolakTulis;
    F.tulis = () => new Promise((_, r) => { tolakTulis = r; });
    await P.putuskanSantri(p, "a", "naik"); await jeda();
    P.toko.santri = [{ ...santri("a"), kelas: "8B", diubah: -1 }];   // versi lebih baru dari HP lain
    tolakTulis(new Error("x")); await jeda();
    harap("gagal tapi datanya udah diganti HP lain: versi baru nggak ditimpa", `${p.status.get("a")}|${santri("a").kelas}`, "gagal|8B");

    p = siapkan([s7]);
    P.pasangPanel({ ...p });
    await P.putuskanSantri(p, "a", "naik"); await jeda();
    harap("panel lama (udah pindah layar): diam aja", `${F.dialog.length}|${F.tulisan.length}`, "0|0");
    P.pasangPanel(null);
  }).catch(e => { gagal++; console.log(`  GAGAL alur tombol error: ${e && e.stack}`); }));
}

function tanpaKelas(s) { const { id, ...isi } = s; return isi; }

