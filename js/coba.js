// =====================================================
//  coba.js — MODE COBA
//
//  Dipakai kalau Firebase belum diisi di konfig.js.
//  Semua data disimpan di perangkat ini aja, dan bisa gonta-ganti
//  akun contoh (ustadz / admin / akun baru) buat dicoba atau demo.
//  Cara kerjanya dibikin semirip mungkin sama versi online,
//  termasuk aturan siapa boleh baca/tulis apa (lihat aturan.js).
// =====================================================

const KUNCI_COBA = "banksoal-coba-data-v4";   // v4: guru punya NIP
const KUNCI_COBA_AKUN = "banksoal-coba-akun";

const AKUN_CONTOH = [
  { uid: "u-aminah",  nama: "Ustadzah Aminah",  email: "aminah@contoh.id",  ket: "Ustadzah, B. Indonesia 7B1 (putri), koordinator UAS B. Indonesia kelas 7" },
  { uid: "u-hasan",   nama: "Ustadz Hasan",     email: "hasan@contoh.id",   ket: "Ustadz, ngajar di 7A1 & 8A1 (putra)" },
  { uid: "u-yusuf",   nama: "Ustadz Yusuf",     email: "yusuf@contoh.id",   ket: "Ustadz, B. Indonesia 7A2 (satu grup dengan 7A1 & 7B1)" },
  { uid: "u-kur",     nama: "Admin TU",         email: "kurikulum@contoh.id", ket: "Admin (TU): guru, mapel, siswa, bobot, rapor" },
  { uid: "u-baru",    nama: "Ustadz Fadil",     email: "fadil@contoh.id",   ket: "Akun baru, belum disetujui" }
];

function dataAwalCoba() {
  const t = semesterSekarang();
  const jam = Date.now();
  const hari = 86400000;
  const db = {};

  db["pengguna/u-aminah"] = { nama: "Ustadzah Aminah", email: "aminah@contoh.id", nip: "198702142010012003", foto: "", sapaan: "ustadzah", peran: "ustadz", dibuat: jam - 30 * hari, terakhirMasuk: jam - 2 * hari };
  db["pengguna/u-hasan"]  = { nama: "Ustadz Hasan", email: "hasan@contoh.id", nip: "198905232015031001", foto: "", sapaan: "ustadz", peran: "ustadz", dibuat: jam - 29 * hari, terakhirMasuk: jam - 5 * hari };
  db["pengguna/u-yusuf"]  = { nama: "Ustadz Yusuf", email: "yusuf@contoh.id", foto: "", sapaan: "ustadz", peran: "ustadz", dibuat: jam - 29 * hari, terakhirMasuk: jam - 3 * hari };
  db["pengguna/u-kur"]    = { nama: "Admin TU", email: "kurikulum@contoh.id", foto: "", peran: "kurikulum", dibuat: jam - 31 * hari, terakhirMasuk: jam - hari };

  db["pengaturan/lembaga"] = { nama: "PKBM Imam Syafi'i", waktu: "60 menit" };
  db["pengaturan/bobot"] = {
    "Paket B": {
      umum:   { tugas: 20, uh: 30, uts: 20, uas: 30, keaktifan: 0, kehadiran: 0 },
      diniah: { tugas: 15, uh: 25, uts: 20, uas: 25, keaktifan: 5, kehadiran: 10 }
    },
    "Paket C": {
      umum:   { tugas: 15, uh: 30, uts: 25, uas: 30, keaktifan: 0, kehadiran: 0 },
      diniah: { tugas: 15, uh: 25, uts: 20, uas: 30, keaktifan: 5, kehadiran: 5 }
    },
    diubah: jam - 30 * hari, diubahOleh: "u-kur"
  };

  db["mapel/bindo7"] = {
    nama: "Bahasa Indonesia", jenjang: "Paket B", kelas: "7A1", jenis: "umum",
    pengampu: ["u-hasan"],
    namaPengampu: { "u-hasan": "Ustadz Hasan" },
    dibuat: jam - 28 * hari
  };
  db["mapel/barab7"] = {
    nama: "Bahasa Arab", jenjang: "Paket B", kelas: "7A1", jenis: "diniah",
    pengampu: ["u-hasan"],
    namaPengampu: { "u-hasan": "Ustadz Hasan" },
    dibuat: jam - 28 * hari
  };

  db["mapel/aqidah7"] = {
    nama: "Aqidah Akhlak", jenjang: "Paket B", kelas: "7A1", jenis: "diniah",
    pengampu: ["u-hasan"],
    namaPengampu: { "u-hasan": "Ustadz Hasan" },
    dibuat: jam - 27 * hari
  };
  // kelas putri: diampu Ustadzah Aminah aja
  db["mapel/bindo7b"] = {
    nama: "Bahasa Indonesia", jenjang: "Paket B", kelas: "7B1", jenis: "umum",
    pengampu: ["u-aminah"],
    namaPengampu: { "u-aminah": "Ustadzah Aminah" },
    dibuat: jam - 28 * hari
  };
  // satu grup dengan 7A1 & 7B1 (B. Indonesia kelas 7), tapi pengampunya beda
  db["mapel/bindo7a2"] = {
    nama: "Bahasa Indonesia", jenjang: "Paket B", kelas: "7A2", jenis: "umum",
    pengampu: ["u-yusuf"],
    namaPengampu: { "u-yusuf": "Ustadz Yusuf" },
    dibuat: jam - 28 * hari
  };
  // kelas yang santrinya belum diisi TU
  db["mapel/fiqih8"] = {
    nama: "Fiqih", jenjang: "Paket B", kelas: "8A1", jenis: "diniah",
    pengampu: ["u-hasan"],
    namaPengampu: { "u-hasan": "Ustadz Hasan" },
    dibuat: jam - 26 * hari
  };

  // ---- grup mapel (dihitung dari mapel di atas) ----
  const pengampuGrup = {};
  for (const [jalur, m] of Object.entries(db)) {
    if (!jalur.startsWith("mapel/") || jalur.split("/").length !== 2) continue;
    m.grup = idGrup(m);
    pengampuGrup[m.grup] = pengampuGrup[m.grup] || { nama: m.nama, jenjang: m.jenjang, tingkat: tingkatKelas(m.kelas), pengampu: new Set() };
    m.pengampu.forEach(u => pengampuGrup[m.grup].pengampu.add(u));
  }
  for (const [gid, g] of Object.entries(pengampuGrup)) {
    db[`grup/${gid}`] = { nama: g.nama, jenjang: g.jenjang, tingkat: g.tingkat, pengampu: [...g.pengampu].sort(), koordinator: null };
  }
  // ---- kelas: pengampu semua mapel di tiap kelas ----
  const pengampuKelas = {};
  for (const [jalur, m] of Object.entries(db)) {
    if (!jalur.startsWith("mapel/") || jalur.split("/").length !== 2) continue;
    const id = idKelas(m.jenjang, m.kelas);
    pengampuKelas[id] = pengampuKelas[id] || { jenjang: m.jenjang, kelas: m.kelas, pengampu: new Set() };
    m.pengampu.forEach(u => pengampuKelas[id].pengampu.add(u));
  }
  for (const [id, k] of Object.entries(pengampuKelas)) {
    db[`kelas/${id}`] = { jenjang: k.jenjang, kelas: k.kelas, pengampu: [...k.pengampu].sort() };
  }
  const grupBindo = idGrup(db["mapel/bindo7"]);
  db[`grup/${grupBindo}`].koordinator = "u-aminah";

  // ---- santri: 7A1 putra, 7B1 putri ----
  const putra = ["Ahmad Fauzi", "Bilal Ramadhan", "Hanif Maulana", "Muhammad Rizki", "Rafi Ananda", "Abdullah Hakim"];
  const putri = ["Aisyah Putri", "Fatimah Azzahra", "Khadijah Nur", "Zainab Salsabila", "Nadia Rahma", "Salma Aulia"];
  const santriA = [], santriB = [];
  putra.forEach((nama, i) => {
    const id = `san-${i + 1}`;
    santriA.push(id);
    db[`santri/${id}`] = { absen: i + 1, nama, nis: `2526${String(i + 1).padStart(3, "0")}`, jenjang: "Paket B", kelas: "7A1", kelasId: idKelas("Paket B", "7A1"), aktif: true, dibuat: jam - 25 * hari };
  });
  putri.forEach((nama, i) => {
    const id = `san-${i + 7}`;
    santriB.push(id);
    db[`santri/${id}`] = { absen: i + 1, nama, nis: `2526${String(i + 7).padStart(3, "0")}`, jenjang: "Paket B", kelas: "7B1", kelasId: idKelas("Paket B", "7B1"), aktif: true, dibuat: jam - 25 * hari };
  });

  // ---- lembar nilai contoh (semester ini) ----
  const idLembar = `${t.tahun.replace("/", "-")}_${t.semester}`;
  const acak = (a, b, i, j) => a + ((i * 7 + j * 13) % (b - a + 1));   // angka "acak" yang selalu sama
  const isiNilai = (kolom, daftar, tanpaUas) => {
    const nilai = {}, hadir = {};
    daftar.forEach((id, i) => {
      nilai[id] = {};
      kolom.forEach((k, j) => { if (!(id === tanpaUas && k.kelompok === "uas")) nilai[id][k.id] = acak(68, 97, i, j); });
      hadir[id] = { hadir: 14 - (i % 3), sakit: i % 2, izin: i % 3 === 2 ? 1 : 0 };
    });
    return { nilai, hadir };
  };
  const kolomUmum = [
    { id: "k-t1", kelompok: "tugas", label: "Tugas 1" }, { id: "k-t2", kelompok: "tugas", label: "Tugas 2" },
    { id: "k-u1", kelompok: "uh", label: "UH 1" }, { id: "k-u2", kelompok: "uh", label: "UH 2" },
    { id: "k-uts", kelompok: "uts", label: "UTS" }, { id: "k-uas", kelompok: "uas", label: "UAS" }
  ];
  db[`mapel/bindo7/nilai/${idLembar}`] = {
    semester: t.semester, tahun: t.tahun,
    kolom: kolomUmum, ...isiNilai(kolomUmum, santriA, "san-6"),
    diubah: jam - hari, diubahOleh: "u-hasan", namaPengubah: "Ustadz Hasan"
  };
  db[`mapel/bindo7b/nilai/${idLembar}`] = {
    semester: t.semester, tahun: t.tahun,
    kolom: kolomUmum, ...isiNilai(kolomUmum, santriB, null),
    diubah: jam - hari, diubahOleh: "u-aminah", namaPengubah: "Ustadzah Aminah"
  };
  const kolomDiniah = [
    { id: "k-t1", kelompok: "tugas", label: "Hafalan 1" }, { id: "k-u1", kelompok: "uh", label: "UH 1" },
    { id: "k-u2", kelompok: "uh", label: "UH 2" }, { id: "k-u3", kelompok: "uh", label: "UH 3" },
    { id: "k-uts", kelompok: "uts", label: "UTS" }, { id: "k-uas", kelompok: "uas", label: "UAS" },
    { id: "k-akt", kelompok: "keaktifan", label: "Keaktifan" }
  ];
  db[`mapel/aqidah7/nilai/${idLembar}`] = {
    semester: t.semester, tahun: t.tahun,
    kolom: kolomDiniah, ...isiNilai(kolomDiniah, santriA, null),
    diubah: jam - 2 * hari, diubahOleh: "u-hasan", namaPengubah: "Ustadz Hasan"
  };

  const p1 = "per-1", p2 = "per-2", p3 = "per-3", bac = "bac-pasar";
  db["mapel/bindo7b/modul/mod-deskripsi"] = {
    semester: t.semester, tahun: t.tahun,
    judul: "Teks Deskripsi",
    pemilik: "u-aminah", namaPemilik: "Ustadzah Aminah",
    dibagikan: true,
    link: "",
    catatan: "Peserta didik mampu menentukan gagasan utama dan ciri teks deskripsi.",
    pertemuan: [
      { id: p1, target: "Menjelaskan pengertian dan tujuan teks deskripsi." },
      { id: p2, target: "Menentukan gagasan utama teks deskripsi." },
      { id: p3, target: "Menulis teks deskripsi sederhana tentang lingkungan pondok." }
    ],
    bacaan: [{
      id: bac,
      judul: "Pasar Pagi di Kampung Kami",
      teks: "Setiap Minggu pagi, lapangan di ujung kampung berubah menjadi pasar. " +
            "Penjual sayur menata kangkung dan bayam yang masih basah oleh embun. " +
            "Di sudut lain, aroma gorengan hangat bercampur dengan suara tawar-menawar para pembeli. " +
            "Anak-anak berlarian di antara lapak sambil menenteng jajanan. " +
            "Menjelang pukul sembilan, satu per satu penjual merapikan dagangan, dan lapangan kembali sepi seperti biasa."
    }],
    soal: [
      { id: "s-1", jenis: "PG", pertemuanId: p1, bacaanId: null,
        teks: "Teks deskripsi bertujuan untuk ...",
        pilihan: ["menggambarkan objek sehingga pembaca seolah melihatnya sendiri", "meyakinkan pembaca agar setuju dengan pendapat penulis",
                  "menceritakan pengalaman lucu penulis", "memberi petunjuk cara membuat sesuatu", ""],
        kunci: 0 },
      { id: "s-2", jenis: "PG", pertemuanId: p2, bacaanId: bac,
        teks: "Gagasan utama teks tersebut adalah ...",
        pilihan: ["Anak-anak suka jajan di pasar", "Suasana pasar pagi di lapangan kampung setiap Minggu",
                  "Penjual sayur selalu datang paling awal", "Lapangan kampung selalu sepi", ""],
        kunci: 1 },
      { id: "s-3", jenis: "PG", pertemuanId: p2, bacaanId: bac,
        teks: "Kalimat yang menggambarkan suasana lewat indra penciuman adalah ...",
        pilihan: ["Penjual sayur menata kangkung dan bayam.", "Anak-anak berlarian di antara lapak.",
                  "Aroma gorengan hangat bercampur dengan suara tawar-menawar.", "Lapangan kembali sepi seperti biasa.", ""],
        kunci: 2 },
      { id: "s-4", jenis: "Esai", pertemuanId: p3, bacaanId: null,
        teks: "Tuliskan tiga ciri teks deskripsi!",
        pedoman: "1. Menggambarkan objek secara rinci\n2. Melibatkan pancaindra\n3. Banyak memakai kata sifat dan kata yang konkret" }
    ],
    dibuat: jam - 20 * hari, diubah: jam - 2 * hari
  };

  const q1 = "per-n1";
  db["mapel/bindo7/modul/mod-narasi"] = {
    semester: t.semester, tahun: t.tahun,
    judul: "Teks Narasi",
    pemilik: "u-hasan", namaPemilik: "Ustadz Hasan",
    dibagikan: false,
    terkait: ["mod-deskripsi"],
    link: "", catatan: "",
    pertemuan: [{ id: q1, target: "Menyebutkan struktur teks narasi (orientasi, komplikasi, resolusi)." }],
    bacaan: [],
    soal: [
      { id: "s-n1", jenis: "PG", pertemuanId: q1, bacaanId: null,
        teks: "Bagian awal teks narasi yang memperkenalkan tokoh dan latar disebut ...",
        pilihan: ["orientasi", "komplikasi", "resolusi", "koda", ""], kunci: 0 }
    ],
    dibuat: jam - 15 * hari, diubah: jam - 5 * hari
  };

  const r1 = "per-a1";
  db["mapel/barab7/modul/mod-madrasah"] = {
    semester: t.semester, tahun: t.tahun,
    judul: "المفردات: في المدرسة",
    pemilik: "u-hasan", namaPemilik: "Ustadz Hasan",
    dibagikan: false,
    link: "", catatan: "",
    pertemuan: [{ id: r1, target: "Santri hafal 10 mufradat tentang benda di sekolah." }],
    bacaan: [],
    soal: [
      { id: "s-a1", jenis: "PG", pertemuanId: r1, bacaanId: null,
        teks: "ما معنى كلمة «قَلَمٌ»؟",
        pilihan: ["Pena", "Buku", "Meja", "Papan tulis", ""], kunci: 0 },
      { id: "s-a2", jenis: "PG", pertemuanId: r1, bacaanId: null,
        teks: "Bahasa Arab dari \"buku\" adalah ...",
        pilihan: ["كِتَابٌ", "قَلَمٌ", "مَكْتَبٌ", "سَبُّوْرَةٌ", ""], kunci: 0 }
    ],
    dibuat: jam - 10 * hari, diubah: jam - 6 * hari
  };

  db["mapel/bindo7b/sumatif/sum-sts"] = {
    semester: t.semester, tahun: t.tahun,
    nama: "Sumatif Tengah Semester",
    pelaksanaan: "Minggu ke-9",
    pemilik: "u-aminah", namaPemilik: "Ustadzah Aminah",
    butir: ["s-1", "s-2", "s-3", "s-4"].map(id => ({ modulId: "mod-deskripsi", soalId: id, salinan: null })),
    dibuat: jam - 3 * hari, diubah: jam - 3 * hari
  };

  // ---- kelas lain di grup yang sama (7A2): modul & sumatif yang dibagikan ----
  const y1 = "per-y1", y2 = "per-y2";
  db["mapel/bindo7a2/modul/mod-prosedur"] = {
    semester: t.semester, tahun: t.tahun,
    judul: "Teks Prosedur",
    pemilik: "u-yusuf", namaPemilik: "Ustadz Yusuf",
    dibagikan: true,
    lanjutanDari: "mod-deskripsi",
    link: "", catatan: "Peserta didik mampu menyusun langkah-langkah teks prosedur.",
    pertemuan: [
      { id: y1, target: "Menyebutkan struktur teks prosedur (tujuan, bahan, langkah)." },
      { id: y2, target: "Menulis teks prosedur sederhana, misalnya cara berwudhu." }
    ],
    bacaan: [],
    soal: [
      { id: "s-y1", jenis: "PG", pertemuanId: y1, bacaanId: null,
        teks: "Bagian teks prosedur yang berisi urutan kegiatan disebut ...",
        pilihan: ["langkah-langkah", "tujuan", "bahan dan alat", "penutup", ""], kunci: 0 },
      { id: "s-y2", jenis: "PG", pertemuanId: y1, bacaanId: null,
        teks: "Kata yang sering dipakai di teks prosedur adalah ...",
        pilihan: ["kemudian, setelah itu, lalu", "namun, tetapi, walaupun", "karena, sebab, akibatnya", "seperti, bagaikan, laksana", ""], kunci: 0 },
      { id: "s-y3", jenis: "Esai", pertemuanId: y2, bacaanId: null,
        teks: "Tuliskan langkah-langkah berwudhu secara urut!",
        pedoman: "Urutan benar: niat, membasuh telapak tangan, berkumur, ... sampai membasuh kaki (skor penuh kalau urut & lengkap)." }
    ],
    dibuat: jam - 12 * hari, diubah: jam - 4 * hari
  };
  db["mapel/bindo7a2/sumatif/sum-y-latihan"] = {
    semester: t.semester, tahun: t.tahun,
    nama: "Latihan Sumatif Teks Prosedur",
    pelaksanaan: "Minggu ke-6",
    pemilik: "u-yusuf", namaPemilik: "Ustadz Yusuf",
    dibagikan: true,
    butir: ["s-y1", "s-y2", "s-y3"].map(id => ({ modulId: "mod-prosedur", soalId: id, salinan: null })),
    dibuat: jam - 6 * hari, diubah: jam - 6 * hari
  };

  // ---- UAS bersama B. Indonesia kelas 7: draf dari koordinator + satu usulan ----
  const modDes = db["mapel/bindo7b/modul/mod-deskripsi"];
  const salinanDari = (m, idSoal) => {
    const soal = m.soal.find(x => x.id === idSoal);
    return { soal, bacaan: (m.bacaan || []).find(b => b.id === soal.bacaanId) || null, judulModul: m.judul, namaPemilik: m.namaPemilik };
  };
  db[`grup/${grupBindo}/uas/${idLembar}`] = {
    semester: t.semester, tahun: t.tahun,
    nama: "Sumatif Akhir Semester",
    pelaksanaan: "",
    status: "draf",
    butir: ["s-1", "s-2", "s-4"].map(id => ({ modulId: "mod-deskripsi", soalId: id, salinan: salinanDari(modDes, id) })),
    dibuat: jam - 2 * hari, diubah: jam - 2 * hari, diubahOleh: "u-aminah", namaPengubah: "Ustadzah Aminah"
  };
  db[`grup/${grupBindo}/usulan/usul-1`] = {
    semester: t.semester, tahun: t.tahun,
    modulId: "mod-prosedur", soalId: "s-y2",
    salinan: salinanDari(db["mapel/bindo7a2/modul/mod-prosedur"], "s-y2"),
    catatan: "Soal ini sering keluar di ujian kesetaraan.",
    pemilik: "u-yusuf", namaPemilik: "Ustadz Yusuf",
    dibuat: jam - hari
  };
  return db;
}

// ---- soal contoh buat AI bohongan ----
function soalContohAI(bahan) {
  const sumber = (bahan.pertemuan || []).filter(p => p.target);
  const topik = (i) => {
    if (sumber.length) return sumber[i % sumber.length];
    const r = (bahan.ringkasan || "").split(/[.\n]/).map(x => x.trim()).filter(x => x.length > 10);
    return { nomor: null, target: r.length ? r[i % r.length] : `materi ${bahan.mapel}` };
  };
  const pendek = (t) => t.replace(/^(santri|peserta didik)\s+(mampu|dapat|bisa)\s+/i, "").replace(/[.]$/, "");
  const soal = [];
  for (let i = 0; i < bahan.jumlahPG; i++) {
    const t = topik(i);
    const benar = (i * 3 + 1) % 4;
    const pilihan = ["Jawaban yang kurang tepat", "Jawaban yang tidak sesuai materi", "Jawaban yang hanya sebagian benar", "Jawaban yang keliru"];
    pilihan[benar] = `Jawaban yang benar tentang ${potong(pendek(t.target), 40)}`;
    soal.push({
      jenis: "PG",
      teks: `[Contoh] Soal pilihan ganda ${i + 1} untuk: ${pendek(t.target)}. Manakah pernyataan yang paling tepat?`,
      pilihan, kunci: benar, pertemuan: t.nomor, bacaan: bahan.bacaan && i === 0 ? 1 : null
    });
  }
  for (let i = 0; i < bahan.jumlahEsai; i++) {
    const t = topik(i + bahan.jumlahPG);
    soal.push({
      jenis: "Esai",
      teks: `[Contoh] Jelaskan dengan bahasamu sendiri: ${pendek(t.target)}!`,
      pedoman: "1. Menyebutkan pengertian dengan benar\n2. Memberi contoh yang sesuai\n3. Bahasa runtut dan jelas",
      pertemuan: t.nomor
    });
  }
  return { soal };
}

function buatBackendCoba() {
  let db = bacaLokal(KUNCI_COBA, null);
  if (!db || typeof db !== "object") {
    db = dataAwalCoba();
    tulisLokal(KUNCI_COBA, db);
  }

  let auth = null;
  const akunTersimpan = bacaLokal(KUNCI_COBA_AKUN, null);
  if (akunTersimpan) auth = AKUN_CONTOH.find(a => a.uid === akunTersimpan) || null;

  const aturan = buatAturan(jalur => db[jalur] || null, ["kurikulum@contoh.id"]);
  const pendengarAuth = [];
  let pendengar = [];

  function galat(kode) {
    const e = new Error(kode === "permission-denied" ? "Missing or insufficient permissions." : kode);
    e.code = kode;
    return e;
  }

  function simpanDb() { tulisLokal(KUNCI_COBA, db); }

  function cocok(d, syarat) {
    return syarat.every(([kolom, op, nilai]) => {
      if (op === "==") return d[kolom] === nilai;
      if (op === "array-contains") return Array.isArray(d[kolom]) && d[kolom].includes(nilai);
      throw new Error("operator belum didukung: " + op);
    });
  }

  function isiKoleksi(jalur) {
    const awalan = jalur + "/";
    const ke = jalur.split("/").length + 1;
    return Object.keys(db)
      .filter(k => k.startsWith(awalan) && k.split("/").length === ke)
      .map(k => ({ id: k.split("/").pop(), ...salin(db[k]) }));
  }

  // hitung ulang satu pendengar & panggil callback-nya
  function kabari(p) {
    if (p.mati) return;
    if (p.jenis === "dok") {
      const d = db[p.jalur];
      if (d && !aturan.bolehBaca(p.jalur, d, auth)) return p.gagal(galat("permission-denied"));
      // dokumen yang belum ada: Firestore juga ngecek aturan; kita anggap boleh kalau pemiliknya sendiri
      if (!d && !aturan.bolehBaca(p.jalur, {}, auth) && !p.jalur.startsWith("pengguna/")) return p.gagal(galat("permission-denied"));
      p.cb(d ? { id: p.jalur.split("/").pop(), ...salin(d) } : null, { dariCache: false });
    } else {
      const semua = isiKoleksi(p.jalur).filter(d => cocok(d, p.syarat));
      // aturan bukan saringan: kalau ada SATU yang nggak boleh dibaca, seluruh permintaan ditolak
      const terlarang = semua.some(d => !aturan.bolehBaca(`${p.jalur}/${d.id}`, d, auth));
      // hasil kosong: Firestore tetap ngecek aturan pakai syarat query (misal kelasId == ...)
      const contoh = { pemilik: auth && auth.uid, dibagikan: true, ...Object.fromEntries(p.syarat.filter(([, op]) => op === "==").map(([k, , v]) => [k, v])) };
      if (terlarang || (semua.length === 0 && !aturan.bolehBaca(`${p.jalur}/_`, contoh, auth))) {
        return p.gagal(galat("permission-denied"));
      }
      p.cb(semua, { dariCache: false });
    }
  }

  function kabariSemua() {
    for (const p of pendengar) queueMicrotask(() => kabari(p));
  }

  function pasang(p) {
    p.gagal = p.gagal || (err => console.warn("[coba]", p.jalur, err.code));
    pendengar.push(p);
    queueMicrotask(() => kabari(p));
    return () => {
      p.mati = true;
      pendengar = pendengar.filter(x => x !== p);
    };
  }

  return {
    mode: "coba",
    akunContoh: AKUN_CONTOH,

    pantauAuth(cb) {
      pendengarAuth.push(cb);
      queueMicrotask(() => cb(auth ? { uid: auth.uid, nama: auth.nama, email: auth.email, foto: "" } : null));
    },
    async masuk(uid) {
      const a = AKUN_CONTOH.find(x => x.uid === uid);
      if (!a) throw new Error("Akun contoh nggak ada");
      auth = a;
      tulisLokal(KUNCI_COBA_AKUN, a.uid);
      for (const cb of pendengarAuth) cb({ uid: a.uid, nama: a.nama, email: a.email, foto: "" });
    },
    async keluar() {
      auth = null;
      tulisLokal(KUNCI_COBA_AKUN, null);
      for (const p of pendengar) p.mati = true;
      pendengar = [];
      for (const cb of pendengarAuth) cb(null);
    },

    pantauDok(jalur, cb, gagal) {
      return pasang({ jenis: "dok", jalur, cb, gagal });
    },
    pantauKoleksi(jalur, syarat, cb, gagal) {
      return pasang({ jenis: "koleksi", jalur, syarat: syarat || [], cb, gagal });
    },

    async tulis(jalur, isiBaru) {
      const lama = db[jalur] || null;
      const baru = salin(isiBaru);
      // ditolak: kabari ulang semua pendengar, biar perubahan yang telanjur tampil dibatalin
      if (!aturan.bolehTulis(jalur, lama, baru, auth)) { kabariSemua(); throw galat("permission-denied"); }
      db[jalur] = baru;
      simpanDb();
      kabariSemua();
    },
    // sama kayak versi online: cuma kolom yang disebut yang diubah
    async ubahSebagian(jalur, perubahan) {
      const lama = db[jalur] || null;
      const baru = salin(lama || {});
      for (const [kunci, nilai] of perubahan) pasangDiJalur(baru, kunci, nilai);
      if (!aturan.bolehTulis(jalur, lama, baru, auth)) { kabariSemua(); throw galat("permission-denied"); }
      db[jalur] = baru;
      simpanDb();
      kabariSemua();
    },
    async hapus(jalur) {
      const lama = db[jalur] || null;
      if (!lama) return;
      if (!aturan.bolehTulis(jalur, lama, null, auth)) { kabariSemua(); throw galat("permission-denied"); }
      delete db[jalur];
      simpanDb();
      kabariSemua();
    },

    // AI bohongan: bikin soal contoh dari bahan, biar alurnya bisa dicoba tanpa Firebase.
    // Bentuk jawabannya sama kayak AI beneran (teks JSON).
    async tanyaAI({ bahan }) {
      if (!auth) throw galat("unauthenticated");
      await new Promise(r => setTimeout(r, 900));
      return JSON.stringify(soalContohAI(bahan));
    },

    // khusus mode coba: balikin data contoh seperti semula
    reset() {
      db = dataAwalCoba();
      simpanDb();
      kabariSemua();
    }
  };
}