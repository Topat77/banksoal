// =====================================================
//  mulai.js — pilih backend, lalu jalankan aplikasi
//  Firebase kalau konfig.js sudah diisi, kalau belum: mode coba.
// =====================================================

// cek dulu semua file js ada (kalau ada yang ketinggalan, kasih tau, jangan diam "Memuat...")
function fileKurang() {
  const cek = {
    "js/konfig.js": typeof KONFIG !== "undefined",
    "js/alat.js": typeof aman === "function",
    "js/aturan.js": typeof buatAturan === "function",
    "js/coba.js": typeof buatBackendCoba === "function",
    "js/toko.js": typeof mulaiAplikasi === "function",
    "js/layar.js": typeof tampilkan === "function",
    "js/modul.js": typeof layarModul === "function",
    "js/sumatif.js": typeof layarSumatif === "function",
    "js/uas.js": typeof layarDaftarUAS === "function",
    "js/ai.js": typeof layarAISoal === "function",
    "js/kop.js": typeof KOP_RESMI !== "undefined",
    "js/docx.js": typeof buatDocx === "function",
    "js/cetak.js": typeof layarCetak === "function",
    "js/kurikulum.js": typeof layarAkun === "function",
    "js/nilai.js": typeof layarNilai === "function",
    "js/rapor.js": typeof layarRapor === "function"
  };
  return Object.keys(cek).filter(k => !cek[k]);
}

async function jalankan() {
  const kurang = fileKurang();
  if (kurang.length) {
    document.getElementById("isi").innerHTML =
      `<div class="kosong"><b>Ada file yang belum ada atau rusak:</b><br>${kurang.join("<br>")}<br><br>Taruh file-nya di folder yang benar, lalu muat ulang halaman.</div>`;
    return;
  }
  if (!KONFIG.firebase || !KONFIG.firebase.apiKey) {
    mulaiAplikasi(buatBackendCoba());
    return;
  }
  try {
    const { buatBackendFirebase } = await import("./firebase.js");
    mulaiAplikasi(await buatBackendFirebase(KONFIG));
  } catch (err) {
    console.error(err);
    toko.status = "gagal";
    toko.pesanGagal = navigator.onLine
      ? "Aplikasi gagal tersambung ke server. Coba muat ulang halaman ini."
      : "Nggak ada sinyal, dan aplikasi belum pernah dibuka di perangkat ini. Sambungkan internet dulu sekali, setelah itu bisa dipakai tanpa sinyal.";
    tampilkan();
  }
}

jalankan();

// pasang "pelayan" penyimpan file, biar aplikasinya kebuka tanpa sinyal
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("sw.js").catch(err => console.warn("Gagal memasang mode offline:", err));
}