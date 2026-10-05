// =====================================================
//  data.js — semua urusan DATA
//  (nyimpen, ngambil, file modul, backup, salin promes)
// =====================================================

// ====== DATA UTAMA ======
const KUNCI = "banksoal-data";

let data = {
  kurikulum: []
};

// bikin kode unik buat tiap item
// (ada penghitung biar aman walau dibikin banyak sekaligus dalam 1 milidetik)
let hitungId = 0;
function buatId() {
  hitungId++;
  return Date.now().toString(36) + hitungId.toString(36) + Math.random().toString(36).slice(2, 6);
}

// simpan ke browser
function simpan() {
  localStorage.setItem(KUNCI, JSON.stringify(data));
}

// ambil dari browser pas aplikasi dibuka
function muat() {
  const teks = localStorage.getItem(KUNCI);
  if (teks) data = JSON.parse(teks);
  lengkapiData();
}

// data versi lama belum punya isian baru (misal "bacaan"),
// jadi dilengkapi biar nggak error
function lengkapiData() {
  data.kurikulum = data.kurikulum || [];
  for (const k of data.kurikulum) {
    k.promes = k.promes || [];
    for (const p of k.promes) {
      p.modul = p.modul || [];
      p.sumatif = p.sumatif || [];
      for (const m of p.modul) {
        m.soal = m.soal || [];
        m.bacaan = m.bacaan || [];
      }
    }
  }
}

muat();

// ====== ALAT BANTU KECIL ======
const HURUF = ["A", "B", "C", "D", "E"];

// biar teks dari emak aman dimasukin ke HTML (misal soal "x < 5")
function aman(teks) {
  const div = document.createElement("div");
  div.textContent = teks ?? "";
  return div.innerHTML.replace(/"/g, "&quot;");
}

function ukuranRapi(byte) {
  if (byte < 1024 * 1024) return Math.round(byte / 1024) + " KB";
  return (byte / 1024 / 1024).toFixed(1) + " MB";
}

// potong teks panjang jadi pendek, buat judul/pratinjau
function potong(teks, maks = 60) {
  teks = (teks || "").replace(/\s+/g, " ").trim();
  return teks.length > maks ? teks.slice(0, maks) + "…" : teks;
}

// tukar posisi item ke atas (-1) atau ke bawah (+1)
function geser(daftar, i, arah) {
  const j = i + arah;
  if (j < 0 || j >= daftar.length) return;
  [daftar[i], daftar[j]] = [daftar[j], daftar[i]];
}

// semua modul dari semua kurikulum & promes
function semuaModul() {
  return data.kurikulum.flatMap(k => k.promes.flatMap(p => p.modul));
}

// ====== PENYIMPANAN FILE MODUL (IndexedDB) ======
// localStorage kekecilan buat file, jadi file disimpan di IndexedDB
// kuncinya = id modul
const dbFile = new Promise((berhasil, gagal) => {
  const req = indexedDB.open("banksoal-file", 1);
  req.onupgradeneeded = () => req.result.createObjectStore("file");
  req.onsuccess = () => berhasil(req.result);
  req.onerror = () => gagal(req.error);
});

async function aksesFile(mode, kerjaan) {
  const db = await dbFile;
  return new Promise((berhasil, gagal) => {
    const tx = db.transaction("file", mode);
    const req = kerjaan(tx.objectStore("file"));
    tx.oncomplete = () => berhasil(req.result);
    tx.onerror = () => gagal(tx.error);
  });
}

const simpanFile = (id, file) => aksesFile("readwrite", store => store.put(file, id));
const ambilFile  = (id)       => aksesFile("readonly",  store => store.get(id));
const hapusFile  = (id)       => aksesFile("readwrite", store => store.delete(id));

// buang file dari sekumpulan modul (dipakai pas hapus modul/promes/kurikulum)
async function hapusFileModul(daftarModul) {
  for (const m of daftarModul) {
    if (m.namaFile) await hapusFile(m.id);
  }
}

// minta browser jangan sembarangan hapus data kita
if (navigator.storage && navigator.storage.persist) navigator.storage.persist();

// ====== SALIN PROMES KE TAHUN AJARAN BARU ======
// semua modul, bacaan, dan soal disalin dengan id BARU,
// jadi hasil salinan bisa diedit tanpa ngerusak yang lama
async function salinPromes(p, semesterBaru, tahunBaru, ikutSumatif) {
  const petaSoal = {};   // id soal lama → id soal baru
  const petaBacaan = {}; // id bacaan lama → id bacaan baru

  const baru = {
    id: buatId(),
    semester: semesterBaru,
    tahun: tahunBaru,
    modul: [],
    sumatif: []
  };

  for (const m of p.modul) {
    const mBaru = { ...m, id: buatId(), bacaan: [], soal: [] };

    for (const b of m.bacaan) {
      const id = buatId();
      petaBacaan[b.id] = id;
      mBaru.bacaan.push({ ...b, id });
    }

    for (const s of m.soal) {
      const id = buatId();
      petaSoal[s.id] = id;
      mBaru.soal.push({
        ...s,
        id,
        pilihan: s.pilihan ? [...s.pilihan] : s.pilihan,
        bacaanId: s.bacaanId ? petaBacaan[s.bacaanId] : null
      });
    }

    // file modul ikut disalin
    if (m.namaFile) {
      const f = await ambilFile(m.id);
      if (f) await simpanFile(mBaru.id, f);
      else mBaru.namaFile = mBaru.ukuranFile = mBaru.jenisFile = null;
    }

    baru.modul.push(mBaru);
  }

  if (ikutSumatif) {
    for (const s of p.sumatif) {
      baru.sumatif.push({
        ...s,
        id: buatId(),
        soalId: s.soalId.map(id => petaSoal[id]).filter(Boolean)
      });
    }
  }

  return baru;
}

// ====== KIRIM DATA & AMBIL DATA (BACKUP) ======
const KUNCI_BACKUP = "banksoal-backup-terakhir";

function teksTerakhirBackup() {
  const waktu = localStorage.getItem(KUNCI_BACKUP);
  if (!waktu) return "Belum pernah di-backup. Yuk kirim data biar aman.";
  const hari = Math.floor((Date.now() - Number(waktu)) / 86400000);
  if (hari === 0) return "Terakhir dikirim: hari ini";
  return `Terakhir dikirim: ${hari} hari lalu`;
}

// ubah file jadi teks panjang, biar bisa dimasukin ke file JSON
function keTeks(file) {
  return new Promise((berhasil, gagal) => {
    const baca = new FileReader();
    baca.onload = () => berhasil(baca.result);
    baca.onerror = () => gagal(baca.error);
    baca.readAsDataURL(file);
  });
}

// kasih file ke emak: di HP lewat menu Bagikan, di laptop di-download
async function berikanFile(berkas) {
  const diHP = matchMedia("(pointer: coarse)").matches;
  if (diHP && navigator.canShare && navigator.canShare({ files: [berkas] })) {
    try {
      await navigator.share({ files: [berkas], title: berkas.name });
      return true;
    } catch (err) {
      if (err.name === "AbortError") return false; // batal bagikan
    }
  }
  const url = URL.createObjectURL(berkas);
  const a = document.createElement("a");
  a.href = url;
  a.download = berkas.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

async function eksporData() {
  try {
    // kumpulin semua file modul yang di-upload
    const file = {};
    for (const m of semuaModul()) {
      if (!m.namaFile) continue;
      const f = await ambilFile(m.id);
      if (f) file[m.id] = { nama: m.namaFile, jenis: f.type, isi: await keTeks(f) };
    }

    const paket = {
      aplikasi: "banksoal",
      versi: 2,
      dibuat: new Date().toISOString(),
      data,
      file
    };

    const tanggal = new Date().toISOString().slice(0, 10);
    const berkas = new File([JSON.stringify(paket)], `banksoal-${tanggal}.json`, { type: "application/json" });
    if (await berikanFile(berkas)) localStorage.setItem(KUNCI_BACKUP, Date.now());
  } catch (err) {
    alert("Gagal nyiapin data.\n\n" + err);
  }
}

async function imporData(berkas) {
  let paket;
  try {
    paket = JSON.parse(await berkas.text());
  } catch {
    return alert("File-nya bukan data Bank Soal.");
  }
  if (paket.aplikasi !== "banksoal" || !paket.data) {
    return alert("File-nya bukan data Bank Soal.");
  }

  const tanggal = new Date(paket.dibuat).toLocaleString("id-ID");
  const jumlah = paket.data.kurikulum.length;
  const yakin = confirm(
    `Data di perangkat ini bakal DIGANTI dengan data dari file:\n\n` +
    `• ${jumlah} kurikulum\n• dibuat ${tanggal}\n\nLanjut?`
  );
  if (!yakin) return;

  try {
    // ganti semua file modul
    await aksesFile("readwrite", store => store.clear());
    for (const [id, f] of Object.entries(paket.file || {})) {
      const blob = await (await fetch(f.isi)).blob();
      await simpanFile(id, new File([blob], f.nama, { type: f.jenis }));
    }
    // ganti data soal
    data = paket.data;
    lengkapiData();
    simpan();
    pergi("kurikulum");
    alert("Data berhasil diambil!");
  } catch (err) {
    alert("Gagal ngambil data.\n\n" + err);
  }
}