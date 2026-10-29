# Bank Soal — PKBM Imam Syafi'i

Aplikasi bank soal, modul ajar, ujian, nilai & rapor buat ustadz/ustadzah dan TU.
Vanilla JS + Firebase (Auth, Firestore, AI Logic/Gemini), di-host di GitHub Pages, bisa dipasang sebagai PWA dan jalan offline.

## Aturan kerja (WAJIB)
- **Tanya dulu sebelum ngubah apa pun.** Jelasin dulu rencananya, tunggu disetujui, baru ngedit file.
- **Kerja lewat branch + PR.** Bikin branch baru dari `main` (nama kebab-case bahasa Indonesia, misal `perbaikan-hp`), commit di situ, push branch-nya, lalu buka PR.
- **Jangan pernah push langsung ke `main`**, dan jangan merge PR sendiri.
- Pesan commit & teks di aplikasi pakai bahasa Indonesia santai, kayak yang udah ada.

## Struktur
Gak ada build step / npm. Semua file JS dimuat pakai `<script>` biasa dengan urutan tetap di `index.html`; fungsinya global.

| File | Isi |
|---|---|
| `js/konfig.js` | config Firebase, `adminAwal`, model AI (utama + cadangan), key App Check |
| `js/mulai.js` | cek semua file JS ada, pilih backend (Firebase kalau `apiKey` diisi, kalau nggak mode coba), daftar service worker |
| `js/firebase.js` | backend online (ES module, SDK dari gstatic). Bentuknya sama persis dengan `js/coba.js` |
| `js/coba.js` | backend mode coba: data contoh di perangkat, bisa ganti-ganti akun |
| `js/aturan.js` | salinan `firestore.rules` versi JS, dipakai mode coba |
| `js/toko.js` | state global `toko`, login, peran, langganan data realtime, fungsi simpan |
| `js/layar.js` | router (`posisi`, `pergi()`, `tampilkan()`, `daftarLayar`), layar status, menu samping & bawah |
| `js/mapel.js`, `saya.js`, `cari.js` | halaman satu mapel + pilih semester, layar Saya, cari soal |
| `js/menupilih.js` | tampilan menu pilihan pengganti `<select>` bawaan (otomatis buat semua select di layar) |
| `js/beranda.js`, `modul.js`, `sumatif.js`, `uas.js`, `ai.js`, `cetak.js`, `docx.js`, `kop.js`, `kurikulum.js`, `nilai.js`, `rapor.js` | layar-layar fitur |
| `js/cadangan.js` | unduh cadangan data (.json) + pengingatnya |
| `js/alat.js`, `js/dialog.js` | alat bantu (`aman`, `klik`, `rapikanSoal`, ...) & dialog pengganti `confirm/alert/prompt` |
| `sw.js` | service worker: file aplikasi ambil dari internet dulu, SDK Firebase & font pakai simpanan |
| `firestore.rules` | aturan akses database |
| `tes/` | tes Node, nggak dimuat aplikasi |

Peran akun:
- `kurikulum`: admin/TU
- `ustadz`: guru
- `menunggu`: akun baru, belum disetujui
- `ditolak`: ditolak admin, nggak bisa buka isi aplikasi
- `nonaktif`: dinonaktifkan admin, datanya tetap ada tapi nggak bisa masuk sampai diaktifkan lagi

Firestore: `pengguna`, `pengaturan`, `kelas`, `santri`, `mapel/{id}/{modul,nilai,sumatif}`, `grup/{id}/{uas,usulan}`.

## Yang gampang kelupaan
- **Nambah file JS baru:** daftarin di `index.html` (urutannya penting), di `fileKurang()` (`js/mulai.js`), dan di `INTI` (`sw.js`).
- **Tiap ada file aplikasi yang berubah** (HTML, CSS, JS, ikon, manifest): naikin `VERSI` di `sw.js` (misal `banksoal-v14` → `banksoal-v15`) biar HP yang udah pasang ikut update.
- **Ngubah `firestore.rules`:** `js/aturan.js` juga harus diubah dengan logika yang sama persis, biar mode coba tetap sama kayak versi online. Push ke GitHub **nggak** memperbarui rules di server. Rules-nya harus di-**Publish manual** di Firebase Console → Firestore → Rules. Ingetin user soal ini di deskripsi PR.
- **Backend:** kalau nambah fungsi di `firebase.js`, tambahin juga yang setara di `coba.js`.
- **Layar baru:** daftarin di `daftarLayar` (`js/layar.js`); kalau isinya form, masukin juga ke `LAYAR_DIAM`.
- **Soal baru / diedit / disalin:** lewatin `rapikanSoal()` (`js/alat.js`) sebelum disimpan. Rules nggak bisa ngecek isi tiap soal di dalam daftar, jadi bentuknya dijaga di situ.
- **Data modul / ujian dari database:** lewatin `amankanDok()` (`js/alat.js`) sebelum dipakai layar. Item rusak di daftar (null, angka) bisa aja ada, dan rules nggak bisa nolak.
- **Simpan modul / ujian / UAS / usulan:** `simpanModul()` dkk. ngembaliin `null` kalau dokumennya kegedean (`ukuranDok()`, Firestore maks. 1 MiB). Kalau habis nyimpan langsung pindah layar, cek dulu hasilnya biar isian guru nggak hilang.
- **Lembar nilai:** simpan pakai `simpanNilaiSebagian()` (cuma sel yang berubah), jangan kirim lembar utuh, biar isian dari perangkat lain nggak ketimpa. Nambah/buang item daftar pakai `tambahKeDaftar()` / `buangDariDaftar()` (jadi `arrayUnion` / `arrayRemove`).
- **Kop cetak:** lembar soal (formatif, sumatif, UAS) pakai `KOP_ASESMEN` (`js/kop.js`, dari file `KOP_ASESMEN_*.docx` sekolah), kertas F4, footer + nomor halaman. Judulnya dari `judulAsesmen()` (`js/cetak.js`): formatif / lingkup materi / tengah semester / akhir semester (UAS). Rapor tetap pakai `KOP_RESMI`.
- **CSP** ada di `<meta>` `index.html`. Pakai layanan / domain baru → tambahin di situ. Script tema inline di `<head>` diizinkan lewat hash: kalau isinya diubah, hash di CSP juga harus diganti.

## Nyoba di lokal
Buka pakai Live Server (localhost). App Check di localhost pakai debug token yang muncul di Console, lalu didaftarin di Firebase Console → App Check.
Kalau `apiKey` di `konfig.js` dikosongin, aplikasi jalan di mode coba tanpa Firebase.
Auto-refresh Live Server **nggak jalan**, karena script yang disisipin Live Server keblokir CSP. Aplikasinya tetap jalan normal, cuma habis nyimpan file harus refresh manual (Ctrl+R). Pesan "Refused to execute inline script" dari Live Server di Console boleh diabaikan.

## Tes
Folder `tes/` nggak dimuat aplikasi, jadi nggak perlu didaftarin di `index.html`/`sw.js`. Tiap ngubah rules / `aturan.js`, jalanin dua-duanya dan tambahin kasusnya.
- `node tes/aturan.tes.js`: cepat, tanpa pasang apa-apa. Ngetes `js/aturan.js` (salinan rules), alat bantu data, dan render soal rusak.
- `cd tes/rules && npm install && npm run tes`: ngetes **`firestore.rules` yang asli** di Firebase Emulator. Butuh Java 21 (`winget install EclipseAdoptium.Temurin.21.JDK`) dan `npm i -g firebase-tools`. Project-nya `demo-banksoal`, jadi nggak perlu login dan nggak nyentuh data beneran. Kalau `java` belum kebaca, buka terminal baru (atau set `JAVA_HOME`).

## Kuota Firestore (paket gratis: 50.000 baca / hari)
Tiap buka aplikasi (atau balik setelah >30 menit nggak aktif), semua langganan dibaca ulang. 1 dokumen = 1 baca; query kosong tetap 1 baca. Kira-kira per buka:
- **Guru:** 3 (profil + pengaturan) + semua `mapel` + semua `grup` + semua `kelas` + siswa di kelasnya + tiap mapel yang diampu (lembar nilai + modul & sumatif miliknya + yang dibagikan) + tiap mapel tetangga (modul & sumatif dibagikan) + UAS & usulan grupnya.
  Contoh 60 mapel, 10 grup, 12 kelas, guru ngampu 2 mapel, ±5 modul per mapel → **±150–200 baca**. 100 guru × 3 kali buka sehari ≈ **45.000–60.000**, udah di batas.
- **TU:** 3 + semua mapel, grup, kelas, **semua siswa**, **semua akun** + isi **semua** mapel (nilai, modul, sumatif) + UAS & usulan semua grup. Contoh 300 siswa, 60 mapel → **±1.500 baca** per buka.
- Modul, sumatif, dan nilai diambil **semua semester**, jadi angkanya naik terus tiap tahun.

Cek di Firebase Console → Firestore → **Usage** (grafik Reads per hari). Kalau mendekati 50.000: (1) filter modul/sumatif/nilai per semester aktif, (2) guru nggak usah langganan semua `mapel`, (3) isi mapel buat TU dimuat waktu dibuka aja. Kalau kuota habis, aplikasi berhenti sinkron sampai reset (jam 00.00 waktu Pasifik ≈ 14.00/15.00 WIB).
