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
- **Lembar nilai:** simpan pakai `simpanNilaiSebagian()` (cuma sel yang berubah), jangan kirim lembar utuh, biar isian dari perangkat lain nggak ketimpa.
- **CSP** ada di `<meta>` `index.html`. Pakai layanan / domain baru → tambahin di situ. Script tema inline di `<head>` diizinkan lewat hash: kalau isinya diubah, hash di CSP juga harus diganti.

## Nyoba di lokal
Buka pakai Live Server (localhost). App Check di localhost pakai debug token yang muncul di Console, lalu didaftarin di Firebase Console → App Check.
Kalau `apiKey` di `konfig.js` dikosongin, aplikasi jalan di mode coba tanpa Firebase.
Auto-refresh Live Server **nggak jalan**, karena script yang disisipin Live Server keblokir CSP. Aplikasinya tetap jalan normal, cuma habis nyimpan file harus refresh manual (Ctrl+R). Pesan "Refused to execute inline script" dari Live Server di Console boleh diabaikan.

## Tes
`node tes/aturan.tes.js`: ngetes `js/aturan.js` (salinan rules) dan alat bantu data. Jalanin tiap ngubah rules/aturan.js, dan tambahin kasusnya. Folder `tes/` nggak dimuat aplikasi, jadi nggak perlu didaftarin di `index.html`/`sw.js`.
