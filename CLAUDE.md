# Bank Soal — PKBM Imam Syafi'i

Aplikasi bank soal, modul ajar, ujian, nilai & rapor buat ustadz/ustadzah dan TU.
Vanilla JS + Firebase (Auth, Firestore, AI Logic/Gemini), di-host di GitHub Pages, bisa dipasang sebagai PWA dan jalan offline.

## Aturan kerja (WAJIB)
- **Tanya dulu sebelum ngubah apa pun.** Jelasin dulu rencananya, tunggu disetujui, baru ngedit file.
- **Kerja lewat branch + PR.** Bikin branch baru dari `main` (nama kebab-case bahasa Indonesia, misal `perbaikan-hp`), commit di situ, push branch-nya, lalu buka PR.
- **Jangan pernah push langsung ke `main`**, dan jangan merge PR sendiri.
- **Teks di aplikasi pakai bahasa Indonesia formal**: "Anda", "tidak", "sudah", "hanya", "agar", "jika", "membuat", "tekan". Kalimat pendek & langsung ke tindakan. Pesan commit & komentar kode boleh santai.

## Struktur
Gak ada build step / npm. Semua file JS dimuat pakai `<script>` biasa dengan urutan tetap di `index.html`; fungsinya global.

| File | Isi |
|---|---|
| `js/konfig.js` | config Firebase, `adminAwalHash`, model AI (utama + cadangan), key App Check |
| `js/mulai.js` | cek semua file JS ada, pilih backend (Firebase kalau `apiKey` diisi, kalau nggak mode coba), daftar service worker |
| `js/firebase.js` | backend online (ES module, SDK dari gstatic). Bentuknya sama persis dengan `js/coba.js` |
| `js/coba.js`, `js/datacoba.js` | backend mode coba (data di perangkat, bisa ganti-ganti akun); data contoh & AI bohongannya di `datacoba.js` |
| `js/aturan.js` | salinan `firestore.rules` versi JS, dipakai mode coba |
| `js/toko.js` | state global `toko`, login, peran, fungsi baca (`modulMapel`, `lembarNilai`, `santriKelas`, `waliKelas`, ...) |
| `js/langganan.js` | langganan data realtime ke `toko` (`pasangData`, `semesterDimuat`, `pastikanSemester()`, `hentikanData`). TU: isi mapel baru dimuat waktu dibuka (`mintaIsiMapel()` / `mintaIsiSemua()`, dipanggil `mintaIsiLayarTU()` di `layar.js`) |
| `js/simpan.js` | semua fungsi tulis ke database: `simpanModul()`, `simpanSantri()`, `simpanNilaiSebagian()`, `hapus…()`, dll. |
| `js/layar.js` | router (`posisi`, `pergi()`, `tampilkan()`, `daftarLayar`), tombol ‹ & back HP, pencari data layar (`mapelAktif`, `semAktif`, ...) |
| `js/tampilan.js` | potongan HTML umum (`logo`, `IKON`, `htmlBaris`, kerangka memuat), layar status (masuk, menunggu), tanda header, menu samping & bawah |
| `js/mapel.js`, `saya.js`, `cari.js` | halaman satu mapel + pilih semester, layar Saya, cari soal |
| `js/menupilih.js` | tampilan menu pilihan pengganti `<select>` bawaan (otomatis buat semua select di layar) |
| `js/modul.js`, `formmodul.js`, `modullama.js` | layar modul (+ `modulTerbaru()` sebelum nyimpan); form modul, teks bacaan & soal formatif; "Pakai modul lama" & salin ke semester lain |
| `js/ai.js`, `layarai.js` | AI: bahan, susun perintah, baca jawaban, jatah & pesan galat; layar "Buat soal dengan AI" + AI Generator |
| `js/beranda.js`, `sumatif.js`, `uas.js`, `cetak.js`, `docx.js`, `kop.js`, `kurikulum.js`, `nilai.js`, `rapor.js` | layar-layar fitur |
| `js/santri.js`, `js/keputusan.js`, `js/bobot.js` | Daftar siswa per kelas + siswa keluar (`htmlKartuKeluar`); panel keputusan naik kelas di bawahnya (`keputusan.js`); layar bobot nilai. Hitung nilai (`KELOMPOK_NILAI`, `bobotUntuk`, `hitungNilai`) tetap di `nilai.js` |
| `js/naikkelas.js` | riwayat kelas santri (`riwayatKelas`, `kelasSantriDi(s, tahun, semester)`), pindah kelas di tengah tahun (`pindahKelas`, `pindahkanKelas()`; semester sebelum pindah tetap kelas lama), naik lintas jenjang (I'dad → kelas 10 Paket C, kelas 9 "lulus, lanjut" → kelas 10; kelas tujuannya dipilih per siswa), status lulus/pindah, keputusan naik kelas per santri (`ubahKeputusan()`; panelnya di Daftar siswa, khusus TU, diisi setelah rapat pleno; tombol "Naik kelas" di kartu kelas menu Siswa; `js/keputusan.js`) |
| `js/admin.js` | menu TU (Beranda · Mapel · Guru · Siswa · Saya): kotak per nama mapel (`layarMapelTU`) → kelas-kelasnya + pantauan per guru (`layarMapelNamaTU`), pantau per guru (`layarPantauGuru`), kelas & siswa Putra (A) / Putri (B) (`layarKelasSiswa`), dan Arsip siswa keluar (lulus / pindah sekolah, TU bisa hapus permanen kapan aja). Bobot, UAS, ubah mapel, Daftar siswa & Rapor (satu kelas) dibuka dari dalamnya; tombol ‹ ikut `INDUK_TU` |
| `js/menuguru.js` | menu guru (Beranda · Mapel · Siswa · Saya): kotak mapel yang diampu + tombol AI & Cari (`layarMapelGuru`), kelas yang diajar + tombol isi nilai (`layarSiswaGuru`). `indukLayarMenu()` / `kelompokLayar()` milih menu TU atau guru |
| `js/panduan.js` | panduan pengguna: sambutan 3 langkah di atas Beranda (beda guru/TU, sekali per akun per perangkat, `banksoal-sambutan-<uid>` di localStorage), layar Panduan dari menu Saya (`layarPanduan`), petunjuk di layar AI (`htmlPetunjukAI`). Nama tombol di teksnya harus sama dengan tombol di aplikasi |
| `js/cadangan.js` | unduh cadangan data (.json) + pengingatnya |
| `js/alat.js`, `js/dialog.js` | alat bantu umum (`aman`, `klik`, `bandingNama`, `adaAbsen` / `nomorAbsen`, semester, tema, simpan lokal, ...) & dialog pengganti `confirm/alert/prompt` |
| `js/datasoal.js` | bentuk data: `rapikanSoal`, `amankanDok`, `ukuranDok`, `pasangDiJalur`, `tambahKeDaftar` / `buangDariDaftar` |
| `js/soal.js` | kartu & isian soal (`kartuSoal`, `htmlIsianSoal`, ...), dipakai modul, sumatif, UAS, AI |
| `js/grup.js` | grup mapel (`idGrup`, `mapelSegrup`, `sinkronGrup`, ...); datanya tetap di `toko` |
| `sw.js` | service worker: file aplikasi ambil dari internet dulu, SDK Firebase & font pakai simpanan |
| `css/` | gaya, dipecah 4 file yang dimuat berurutan di `index.html`: `dasar` → `komponen` → `halaman` → `menu` (yang belakang boleh nimpa yang depan, jadi urutannya jangan diubah) |
| `firestore.rules` | aturan akses database |
| `android/` | resep APK (PWABuilder / TWA, package `io.github.topat77.banksoal`): cara bikin ulang & pengaturannya di `android/README.md`. APK cuma bungkus situs, jadi perubahan kode nggak perlu APK baru. **Kunci APK (keystore + password) jangan pernah masuk repo** |
| `tes/` | tes Node, nggak dimuat aplikasi |

Peran akun:
- `kurikulum`: admin/TU
- `ustadz`: guru
- `menunggu`: akun baru, belum disetujui
- `ditolak`: ditolak admin, nggak bisa buka isi aplikasi
- `nonaktif`: dinonaktifkan admin, datanya tetap ada tapi nggak bisa masuk sampai diaktifkan lagi

Firestore: `pengguna`, `pengaturan`, `kelas`, `santri`, `mapel/{id}/{modul,nilai,sumatif}`, `grup/{id}/{uas,usulan}`.

- **Jenjang:** Paket B (7–9) → **I'dad** (`JENJANG_IDAD`, `grup.js`; kelas "I'dad A1", siswa baru dari luar, 1 tahun) → Paket C (10–12). Putra/putri dari huruf rombel (`hurufRombel()`: A putra, B putri).

## Yang gampang kelupaan
- **Nambah file JS baru:** daftarin di `index.html` (urutannya penting), di `fileKurang()` (`js/mulai.js`), dan di `INTI` (`sw.js`). File CSS baru: `index.html` + `INTI`.
- **Ukuran file:** usahain tiap file di bawah 500 baris. Kalau lewat, pecah per bagian (file barunya ditaruh tepat setelah file asalnya di `index.html`).
- **Tiap ada file aplikasi yang berubah** (HTML, CSS, JS, ikon, manifest): naikin `VERSI` di `sw.js` (misal `banksoal-v14` → `banksoal-v15`) biar HP yang udah pasang ikut update.
- **Ngubah `firestore.rules`:** `js/aturan.js` juga harus diubah dengan logika yang sama persis, biar mode coba tetap sama kayak versi online. Push ke GitHub **nggak** memperbarui rules di server. Rules-nya harus di-**Publish manual** di Firebase Console → Firestore → Rules. Ingetin user soal ini di deskripsi PR.
- **Backend:** kalau nambah fungsi di `firebase.js`, tambahin juga yang setara di `coba.js`.
- **Layar baru:** daftarin di `daftarLayar` (`js/layar.js`); kalau isinya form, masukin juga ke `LAYAR_DIAM`.
- **Soal baru / diedit / disalin:** lewatin `rapikanSoal()` (`js/datasoal.js`) sebelum disimpan. Rules nggak bisa ngecek isi tiap soal di dalam daftar, jadi bentuknya dijaga di situ.
- **Data modul / ujian dari database:** lewatin `amankanDok()` (`js/datasoal.js`) sebelum dipakai layar. Item rusak di daftar (null, angka) bisa aja ada, dan rules nggak bisa nolak.
- **Simpan modul / ujian / UAS / usulan:** `simpanModul()` dkk. ngembaliin `null` kalau dokumennya kegedean (`ukuranDok()`, Firestore maks. 1 MiB). Kalau habis nyimpan langsung pindah layar, cek dulu hasilnya biar isian guru nggak hilang.
- **Lembar nilai (izin):** guru pengampu ngisi angka. Admin cuma lihat, nyiapin lembar KOSONG (`siapkanLembarNilai()`, rules `lembarKosong()`), dan hapus lembar kapan aja. Lembar nilai nggak ikut dipulihkan dari cadangan. Kolom UTS/UAS/Keaktifan cuma sekali (`KELOMPOK_SEKALI`), Tugas & UH boleh berkali-kali. Rapor: Tugas, UH, UTS, UAS, Keaktifan, Kehadiran, Nilai akhir.
- **Lembar nilai:** simpan pakai `simpanNilaiSebagian()` (cuma sel yang berubah), jangan kirim lembar utuh, biar isian dari perangkat lain nggak ketimpa. Nambah/buang item daftar pakai `tambahKeDaftar()` / `buangDariDaftar()` (jadi `arrayUnion` / `arrayRemove`).
- **Semester yang dimuat:** modul, sumatif, UAS & usulan cuma ada di `toko` buat semester di `semesterDimuat` (`langganan.js`). Layar yang nampilin semester lain wajib manggil `pastikanSemester(sem)` (`tampilkan()` udah otomatis buat `semAktif()` & semester UAS), dan nunggu `isiMapelSiap()` / `isiGrupSiap()` sebelum nyimpulin "belum ada". Butuh data lengkap semua semester (kayak cadangan)? Pakai `ambilKoleksi()` (ambil sekali dari server), bukan langganan.
- **Kop cetak:** lembar soal (formatif, sumatif, UAS) pakai `KOP_ASESMEN` (`js/kop.js`, dari file `KOP_ASESMEN_*.docx` sekolah), kertas F4, footer + nomor halaman. Judulnya dari `judulAsesmen()` (`js/cetak.js`): formatif / lingkup materi / tengah semester / akhir semester (UAS). Rapor tetap pakai `KOP_RESMI`.
- **Kemudahan guru:** beranda guru punya kartu "Hari ini" (`tugasHariIni()`) & progres per mapel (`progresMapel()` di `js/beranda.js`, juga dipakai tombol "Ingatkan via WA" di `layarMapelNamaTU`). Lembar nilai bisa diisi "Satu kolom" (bawaan di HP) atau "Tabel lengkap". Ukuran tulisan Normal/Besar di layar Saya (`data-huruf` di `<html>`). "Pakai modul lama" (`layarModulLama`) nyari modul sendiri di kelas ini semester lain + kelas lain.
- **Cadangan dikunci kata sandi** pakai Web Crypto (`crypto.subtle`), yang cuma ada di alamat aman (https / localhost). Dibuka dari `http://` biasa (misal IP laptop di jaringan lokal) → cadangan nggak bisa dibuat/dibuka (`bisaKunciCadangan()`). Tes layar juga jalan di `https://app.test` karena ini.
- **CSP** ada di `<meta>` `index.html`. Pakai layanan / domain baru → tambahin di situ. Script tema inline di `<head>` diizinkan lewat hash: kalau isinya diubah, hash di CSP juga harus diganti.

## Nyoba di lokal
Buka pakai Live Server (localhost). App Check di localhost pakai debug token yang muncul di Console, lalu didaftarin di Firebase Console → App Check.
Kalau `apiKey` di `konfig.js` dikosongin, aplikasi jalan di mode coba tanpa Firebase.
Auto-refresh Live Server **nggak jalan**, karena script yang disisipin Live Server keblokir CSP. Aplikasinya tetap jalan normal, cuma habis nyimpan file harus refresh manual (Ctrl+R). Pesan "Refused to execute inline script" dari Live Server di Console boleh diabaikan.

## Keamanan
- **Admin awal:** `konfig.js` (`adminAwalHash`) & `firestore.rules` (`hashAdminAwal()`) cuma nyimpen SHA-256 email-nya, huruf kecil semua. Bikin hash: `node -e "console.log(require('crypto').createHash('sha256').update('email@gmail.com').digest('hex'))"`.
- **Nama pembuat:** `namaPemilik` / `namaPengubah` wajib sama dengan `nama` di profil (rules `namaAsli()`). Simpan pakai `namaSaya()`.
- **Keluar** ngehapus cache offline Firestore di perangkat (kecuali masih ada perubahan yang belum terkirim).
- **Aplikasi nolak jalan di dalam iframe** situs lain (`dalamBingkaiLain()` di `mulai.js`).
- **Pengaturan console** (bukan kode, dicek sesekali):
  - App Check → **Enforce** buat Cloud Firestore & Firebase AI Logic.
  - Google Cloud Console → APIs & Services → Credentials → API key browser → **Website restrictions**: `https://topat77.github.io/*`, `http://localhost:5500/*`, `http://127.0.0.1:5500/*`.
  - Authentication → Settings → **Authorized domains**: cuma `topat77.github.io`, `localhost`, `banksoal-pkbm.firebaseapp.com`.
- **Project tetap paket gratis (Spark). Jangan pasang billing / naik Blaze** tanpa keputusan pemilik: di Blaze, Gemini (AI) dan layanan lain bisa jadi berbayar, dan Google nggak punya batas biaya otomatis.
  Akibatnya: fitur AI cuma dijaga App Check (belum ngecek login). Di paket gratis, risiko terburuknya jatah AI harian habis (fitur AI mati sampai reset), bukan tagihan.
  Kode backend AI (Cloud Function yang ngecek login & jatah per akun) pernah dibikin lalu dibatalin karena butuh Blaze; masih ada di riwayat git (commit `53ba6db`) kalau suatu saat dibutuhin.

## Tes
**Tiap pull request ke `main`, ketiga tes di bawah jalan otomatis di GitHub Actions** (`.github/workflows/tes.yml`: Tes cepat, Tes rules, Tes layar; hasilnya ✅/❌ di PR, screenshot diunggah kalau tes layar gagal). Nambah tes baru cukup ditaruh di file tesnya, workflow nggak perlu diubah.
Folder `tes/` nggak dimuat aplikasi, jadi nggak perlu didaftarin di `index.html`/`sw.js`. Tiap ngubah rules / `aturan.js`, jalanin dua-duanya dan tambahin kasusnya.
- `node tes/aturan.tes.js`: cepat, tanpa pasang apa-apa. Ngetes `js/aturan.js` (salinan rules), alat bantu data, render soal rusak, baca jawaban AI, hitung nilai, paket acak cetak, batas ukuran dokumen, dan daftar file JS & CSS (`index.html` / `fileKurang()` / `INTI`) + hash CSP yang harus tetap sinkron. Isinya dipecah di `tes/aturan/*.js` (urut nama file, digabung jadi satu skrip waktu jalan; alat bantu & data contoh di `01-dasar.js`).
- `cd tes/layar && npm install && npx playwright install chromium && npm run tes`: ngetes aplikasinya di browser beneran (mode coba). Isinya `fitur.js` (menu TU/guru, putra/putri, naik kelas, arsip, hemat kuota TU, WA, cadangan otomatis, nilai satu kolom, jatah AI, XSS) + `susur.js` (buka semua layar di HP & laptop, terang & gelap: error, teks `undefined`, halaman melebar). `node susur.js --foto` nyimpen screenshot di `tes/layar/hasil/`. Nambah layar baru → tambahin di daftar `LAYAR` (`susur.js`).
- `cd tes/rules && npm install && npm run tes`: ngetes **`firestore.rules` yang asli** di Firebase Emulator. Butuh Java 21 (`winget install EclipseAdoptium.Temurin.21.JDK`) dan `npm i -g firebase-tools`. Project-nya `demo-banksoal`, jadi nggak perlu login dan nggak nyentuh data beneran. Kalau `java` belum kebaca, buka terminal baru (atau set `JAVA_HOME`).

## Kuota Firestore (paket gratis: 50.000 baca / hari)
Tiap buka aplikasi (atau balik setelah >30 menit nggak aktif), semua langganan dibaca ulang. 1 dokumen = 1 baca; query kosong tetap 1 baca. Kira-kira per buka:
- **Guru:** 3 (profil + pengaturan) + `mapel` yang diampu & satu grupnya + `grup` & `kelas` yang dia ikuti (bukan semua, lihat `pasangMapelGuru()` di `langganan.js`) + siswa di kelasnya + tiap mapel yang diampu (lembar nilai + modul & sumatif miliknya + yang dibagikan) + tiap mapel tetangga (modul & sumatif dibagikan) + UAS & usulan grupnya.
  Contoh 60 mapel, 10 grup, 12 kelas, guru ngampu 2 mapel, ±5 modul per mapel → **±150–200 baca**. 100 guru × 3 kali buka sehari ≈ **45.000–60.000**, udah di batas.
- **TU:** 4 (profil + pengaturan lembaga, bobot, wali kelas) + semua mapel, grup, kelas, **semua siswa**, **semua akun** + UAS & usulan semua grup. Isi mapel (nilai, modul, sumatif) **baru dimuat waktu mapelnya dibuka**; Pantau guru, Rapor, Cari & tombol "Perbarui" di beranda muat semuanya. Beranda TU pakai ringkasan terakhir yang disimpan di perangkat (`ringkasanTU()`). Contoh 300 siswa, 60 mapel → **±400–500 baca** per buka (dulu ±1.500).
- **Cadangan otomatis:** tiap TU buka aplikasi di laptop dan cadangan terakhir udah ≥7 hari, file cadangan langsung diunduh (`cadanganOtomatis()`, `cadangan.js`; ±semua dokumen dibaca sekali, seminggu sekali). Di HP cuma muncul tombol.
- Modul, sumatif, UAS & usulan cuma dimuat buat **semester yang dibuka** (awalnya semester sekarang, lihat `semesterDimuat` / `pastikanSemester()` di `langganan.js`), jadi nggak naik tiap tahun. Lembar nilai tetap dimuat semua semester (kecil, dipakai daftar semester & rapor). Cadangan & pulihkan ambil semuanya sekali dari server (`isiLengkap()` di `cadangan.js`).

Cek di Firebase Console → Firestore → **Usage** (grafik Reads per hari). Kalau mendekati 50.000: (1) ~~filter modul/sumatif per semester~~ (udah), (2) ~~guru nggak usah langganan semua `mapel`~~ (udah), (3) ~~isi mapel buat TU dimuat waktu dibuka aja~~ (udah). Kalau kuota habis, aplikasi berhenti sinkron sampai reset (jam 00.00 waktu Pasifik ≈ 14.00/15.00 WIB).
