// =====================================================
//  cadangan.js — CADANGAN DATA: semua isi aplikasi jadi satu file .json
//  Pengganti backup otomatis Firebase (yang cuma ada di paket berbayar).
//  Admin bisa baca semuanya, jadi file ini lengkap: akun, mapel, modul,
//  soal, ujian sumatif, lembar nilai, santri, dan pengaturan.
// =====================================================
// paket gratis nggak punya backup otomatis, jadi TU diingetin tiap 2 minggu
const BATAS_HARI_CADANGAN = 14;

function isiCadanganSiap() {
  return toko.mapel.every(m => isiMapelSiap(m.id));
}

function hariSejakCadangan() {
  const t = toko.lembaga.cadanganTerakhir;
  return t ? Math.floor((Date.now() - t) / 86400000) : null;
}

function dataCadangan() {
  const isi = (id) => toko.isi[id] || {};
  return {
    aplikasi: KONFIG.namaAplikasi,
    versiCadangan: 3,   // 3: pengguna ikut NIP & sapaan
    dibuat: new Date().toISOString(),
    oleh: (toko.saya && toko.saya.email) || "",
    lembaga: salin(toko.lembaga),
    bobot: salin(toko.bobot),
    pengguna: toko.pengguna.map(p => ({ id: p.id, nama: p.nama, email: p.email, peran: p.peran, nip: p.nip || "", sapaan: p.sapaan || null, dibuat: p.dibuat || null })),
    santri: salin(toko.santri),
    mapel: toko.mapel.map(m => ({
      ...salin(m),
      modul: salin(modulMapel(m.id)),
      sumatif: salin(sumatifMapel(m.id)),
      nilai: salin(isi(m.id).nilai || [])
    })),
    // grup mapel + UAS bersama & usulan soalnya
    grup: toko.grup.map(g => ({ ...salin(g), uas: salin(toko.uas[g.id] || []), usulan: salin(toko.usulan[g.id] || []) }))
  };
}

async function unduhCadangan(tombol, pesan) {
  wajibKurikulum();
  if (!isiCadanganSiap()) {
    const teks = "Data masih dimuat, tunggu sebentar lalu coba lagi.";
    if (pesan) pesan.textContent = teks; else kabar(teks);
    return false;
  }
  const data = dataCadangan();
  const tanggal = new Date().toLocaleDateString("sv-SE");   // 2026-10-24
  const berkas = new File([JSON.stringify(data, null, 1)], `cadangan-banksoal-${tanggal}.json`, { type: "application/json" });
  if (tombol) tombol.disabled = true;
  try {
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
      <p class="info">Unduh semua isi aplikasi (akun, mapel, modul, soal, ujian, nilai, dan siswa) jadi satu file. Simpan di Google Drive atau flashdisk, biar kalau ada yang kehapus nggak sengaja, datanya masih ada. Firebase versi gratis nggak nyimpen cadangan otomatis, jadi ini satu-satunya cadangan. Saran: unduh tiap 2 minggu dan sebelum ujian.</p>
      <p class="info"><b>${terakhir}</b>${hari !== null && hari >= BATAS_HARI_CADANGAN ? ` Sudah ${hari} hari, sebaiknya unduh lagi.` : ""}</p>
      <div class="baris-tombol">
        <button class="tombol-kedua" id="unduhCadangan">Unduh cadangan (.json)</button>
        <span class="info" id="pesanCadangan" role="status"></span>
      </div>
    </section>`;
}
