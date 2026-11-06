// =====================================================
//  panduan.js — panduan pengguna
//  - Sambutan: kartu 3 langkah di atas Beranda, muncul sekali per akun per perangkat
//    (disimpan di localStorage, nggak ditulis ke database). Beda buat guru & TU.
//    Sambutan TU udah gantiin panel "Mulai dari sini" yang dulu ada di beranda TU.
//  - Layar Panduan (dibuka dari menu Saya): cara pakai per topik, bisa nampilin sambutan lagi.
//  - Petunjuk singkat di layar Buat soal dengan AI (htmlPetunjukAI, dipanggil ai.js).
//  Teksnya statis (nggak ada data pengguna), jadi <b> boleh langsung ditulis.
// =====================================================

const LANGKAH_SAMBUTAN = {
  guru: [
    { ikon: "mapel", judul: "Lihat mapel Anda",
      teks: "Mapel yang Anda ajar ada di menu <b>Mapel</b>. Tekan salah satu untuk membukanya." },
    { ikon: "modul", judul: "Buat modul ajar",
      teks: "Di halaman mapel, tekan <b>+ Tambah modul ajar</b>. Isi judul dan target pertemuan, lalu tekan <b>Simpan</b>. Soal ditambah di halaman modul lewat <b>+ Tambah soal</b>." },
    { ikon: "nilai", judul: "Isi nilai",
      teks: "Buka menu <b>Siswa</b>, lalu tekan <b>Isi nilai</b>. Ketik nilainya, lalu tekan Enter untuk pindah ke siswa berikutnya. Nilai tersimpan sendiri." }
  ],
  tu: [
    { ikon: "akun", judul: "Setujui akun guru",
      teks: "Minta ustadz dan ustadzah masuk menggunakan akun Google masing-masing. Lalu buka menu <b>Guru</b> dan tekan <b>Setujui</b>." },
    { ikon: "mapel", judul: "Tambah mapel dan pengampunya",
      teks: "Buka menu <b>Mapel</b>, lalu tekan <b>+ Tambah mapel</b>. Isi nama dan kelasnya, centang guru pengampunya, lalu tekan <b>Simpan</b>." },
    { ikon: "santri", judul: "Isi daftar siswa",
      teks: "Buka menu <b>Siswa</b>. Di kartu kelas, tekan <b>Ubah daftar siswa</b>. Paling cepat: salin dari Excel, lalu tempel di tabel." }
  ]
};

// status "sudah lihat" per akun per perangkat
function kunciSambutan() { return `banksoal-sambutan-${uidSaya()}`; }
function perluSambutan() { return !bacaLokal(kunciSambutan(), false); }
let langkahSambutan = 0;

function htmlSambutan() {
  if (!perluSambutan()) return "";
  const daftar = LANGKAH_SAMBUTAN[sayaKurikulum() ? "tu" : "guru"];
  const i = Math.min(langkahSambutan, daftar.length - 1);
  const l = daftar[i];
  const akhir = i === daftar.length - 1;
  return `
    <section class="panduan sambutan" id="sambutan" aria-labelledby="judulSambutan">
      <div class="sambutan-kepala">
        ${ikonKotak(l.ikon, "hijau")}
        <span class="info">Panduan singkat · ${i + 1} dari ${daftar.length}</span>
      </div>
      <h2 id="judulSambutan" tabindex="-1">${l.judul}</h2>
      <p>${l.teks}</p>
      <div class="sambutan-bawah">
        <span class="titik-langkah" aria-hidden="true">${daftar.map((_, j) => `<span class="${j === i ? "aktif" : ""}"></span>`).join("")}</span>
        <span class="spasi"></span>
        ${akhir ? "" : `<button type="button" class="tombol-teks" id="lewatiSambutan">Lewati</button>`}
        <button type="button" class="tombol-utama" id="lanjutSambutan">${akhir ? "Mulai" : "Lanjut"}</button>
      </div>
    </section>`;
}

// tombol sambutan: Lanjut cuma ganti kartunya (beranda nggak digambar ulang, posisi gulir tetap)
function pasangSambutan() {
  const kartu = document.getElementById("sambutan");
  if (!kartu) return;
  const selesai = () => {
    tulisLokal(kunciSambutan(), true);
    langkahSambutan = 0;
    kartu.remove();
  };
  klik("lewatiSambutan", selesai);
  klik("lanjutSambutan", () => {
    const n = LANGKAH_SAMBUTAN[sayaKurikulum() ? "tu" : "guru"].length;
    if (langkahSambutan >= n - 1) return selesai();
    langkahSambutan++;
    kartu.outerHTML = htmlSambutan();
    pasangSambutan();
    const j = document.getElementById("judulSambutan");
    if (j) j.focus();
  });
}

// =====================================================
//  LAYAR PANDUAN (dari menu Saya)
// =====================================================
const TOPIK_PANDUAN = {
  guru: [
    { judul: "Membuat modul ajar", langkah: [
      "Buka menu <b>Mapel</b>, lalu tekan mapel Anda.",
      "Tekan <b>+ Tambah modul ajar</b>.",
      "Isi judul dan target tiap pertemuan, lalu tekan <b>Simpan</b>.",
      "Modul semester lalu bisa dipakai lagi lewat <b>Pakai modul lama</b>."
    ] },
    { judul: "Menambah soal", langkah: [
      "Buka modulnya dari halaman mapel.",
      "Tekan <b>+ Tambah soal</b> di pertemuan yang diinginkan.",
      "Tulis soal dan jawabannya. Untuk pilihan ganda, tandai kunci jawabannya.",
      "Tekan <b>Simpan soal</b>."
    ] },
    { judul: "Membuat soal dengan AI", langkah: [
      "Di halaman modul, tekan <b>Buatkan soal</b>. Bisa juga dari menu <b>Mapel</b> lewat <b>Buat soal dengan AI</b>.",
      "Centang bahan yang dipakai, lalu isi jumlah soalnya.",
      "Tekan <b>Buat draft soal</b> dan tunggu sebentar.",
      "Periksa tiap soal dan kuncinya. Hasil AI bisa salah.",
      "Tekan tombol simpan di bawah draft agar soalnya masuk ke modul."
    ] },
    { judul: "Mencetak soal", langkah: [
      "Buka modulnya, lalu tekan <b>Cetak semua soal formatif</b> atau <b>Cetak soal pertemuan ini</b>.",
      "Untuk ujian, buka tab <b>Sumatif</b>, pilih ujiannya, lalu tekan <b>Cetak soal</b>.",
      "Tekan <b>Cetak / PDF</b> untuk mencetak langsung, atau <b>Unduh Word</b> jika ingin mengubahnya dulu."
    ] },
    { judul: "Membuat ujian sumatif", langkah: [
      "Di halaman mapel, buka tab <b>Sumatif</b>.",
      "Tekan <b>+ Buat ujian sumatif</b>, isi namanya, lalu tekan <b>Lanjut pilih soal</b>.",
      "Pilih soal dari modul Anda, atau tekan <b>+ Soal khusus ujian</b>."
    ] },
    { judul: "Mengisi nilai", langkah: [
      "Buka menu <b>Siswa</b>, lalu tekan <b>Isi nilai</b>. Bisa juga dari tab <b>Nilai</b> di halaman mapel.",
      "Tambah kolom yang dibutuhkan, misalnya <b>+ Tugas</b> atau <b>+ UH</b>.",
      "Pilih <b>Satu kolom</b> agar lebih mudah di HP, atau <b>Tabel lengkap</b> untuk melihat semua kolom.",
      "Ketik nilai 0–100, lalu tekan Enter untuk pindah ke siswa berikutnya. Nilai tersimpan sendiri."
    ] },
    { judul: "Memakai tanpa sinyal", langkah: [
      "Aplikasi tetap bisa dibuka tanpa sinyal setelah pernah dibuka sekali.",
      "Perubahan disimpan di perangkat dan dikirim sendiri saat ada sinyal lagi.",
      "Membuat soal dengan AI tetap butuh internet."
    ] }
  ],
  tu: [
    { judul: "Menyetujui akun guru", langkah: [
      "Minta guru masuk menggunakan akun Google masing-masing.",
      "Buka menu <b>Guru</b>. Akun baru ada di bagian <b>Menunggu persetujuan</b>.",
      "Tekan <b>Setujui</b>. Guru langsung bisa memakai aplikasi."
    ] },
    { judul: "Menambah mapel dan pengampu", langkah: [
      "Buka menu <b>Mapel</b>, lalu tekan <b>+ Tambah mapel</b>.",
      "Isi nama mapel dan kelasnya.",
      "Centang guru pengampunya, lalu tekan <b>Simpan</b>."
    ] },
    { judul: "Mengisi daftar siswa", langkah: [
      "Buka menu <b>Siswa</b>, lalu pilih <b>Putra (A)</b> atau <b>Putri (B)</b>.",
      "Di kartu kelas, tekan <b>Ubah daftar siswa</b>.",
      "Isi no. absen, NIS, dan nama. Paling cepat: salin dari Excel, lalu tempel di tabel."
    ] },
    { judul: "Memantau guru", langkah: [
      "Buka menu <b>Guru</b>, lalu tekan <b>Pantau guru</b>.",
      "Lihat modul, soal, dan nilai yang sudah diisi tiap guru.",
      "Bisa juga dari menu <b>Mapel</b>: tekan nama mapelnya untuk melihat tiap kelas."
    ] },
    { judul: "Mencetak rapor", langkah: [
      "Buka menu <b>Siswa</b>. Di kartu kelas, tekan <b>Rapor</b>.",
      "Pilih siswanya, lalu tekan <b>Cetak / PDF</b>. Bisa juga <b>Cetak semua rapor kelas ini</b>."
    ] },
    { judul: "Menyimpan cadangan data", langkah: [
      "Buka menu <b>Saya</b>, lalu tekan <b>Unduh cadangan (.json)</b>.",
      "Simpan filenya di tempat yang aman, misalnya Google Drive.",
      "Lakukan seminggu sekali. Beranda akan mengingatkan Anda."
    ] }
  ]
};

function layarPanduan() {
  judul.textContent = "Panduan";
  tombolKembali.hidden = false;
  const topik = TOPIK_PANDUAN[sayaKurikulum() ? "tu" : "guru"];
  isi.innerHTML = `
    <div class="layar-panduan">
      <p class="info">Tekan salah satu topik untuk melihat langkahnya.</p>
      ${topik.map(t => `
        <details class="kartu-kelas topik-panduan">
          <summary><span><strong>${t.judul}</strong></span></summary>
          <ol class="langkah-panduan">${t.langkah.map(x => `<li>${x}</li>`).join("")}</ol>
        </details>`).join("")}
      <section class="bagian">
        <h2>Sambutan awal</h2>
        <p class="info">Tampilkan lagi 3 langkah awal di Beranda.</p>
        <div class="baris-tombol"><button class="tombol-kedua" id="ulangSambutan">Tampilkan sambutan</button></div>
      </section>
    </div>`;
  klik("ulangSambutan", () => {
    tulisLokal(kunciSambutan(), false);
    langkahSambutan = 0;
    pergi("beranda");
  });
}

// petunjuk singkat di atas layar Buat soal dengan AI (untuk: "modul" | "ujian" | "usul")
function htmlPetunjukAI(untuk) {
  const akhir = untuk === "usul" ? "agar soalnya diusulkan ke koordinator UAS"
    : `agar soalnya masuk ke ${untuk === "modul" ? "modul" : "ujian"}`;
  return `<details class="petunjuk-ai">
    <summary><b>Cara memakai AI</b></summary>
    <ol class="langkah-panduan">
      <li>Centang bahan di bagian <b>Bahan untuk AI</b>. Ringkasan materi dan PDF boleh dikosongkan.</li>
      <li>Isi jumlah soal, lalu tekan <b>Buat draft soal</b>.</li>
      <li>Periksa tiap soal dan kuncinya. Hasil AI bisa salah.</li>
      <li>Tekan tombol di bawah draft ${akhir}.</li>
    </ol>
  </details>`;
}
