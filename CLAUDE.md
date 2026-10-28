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
| `js/layar.js` | router (`posisi`, `pergi()`, `tampilkan()`, `daftarLayar`), menu samping & bawah |
| `js/beranda.js`, `modul.js`, `sumatif.js`, `uas.js`, `ai.js`, `cetak.js`, `docx.js`, `kop.js`, `kurikulum.js`, `nilai.js`, `rapor.js` | layar-layar fitur |
| `js/alat.js`, `js/dialog.js` | alat bantu & dialog pengganti `confirm/alert/prompt` |
| `sw.js` | service worker: file aplikasi ambil dari internet dulu, SDK Firebase & font pakai simpanan |
| `firestore.rules` | aturan akses database |

`js/data.js` sepertinya sisa versi lama (localStorage) dan **nggak dimuat** di mana pun. **Jangan dihapus tanpa tanya dulu.**

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

## Nyoba di lokal
Buka pakai Live Server (localhost). App Check di localhost pakai debug token yang muncul di Console, lalu didaftarin di Firebase Console → App Check.
Kalau `apiKey` di `konfig.js` dikosongin, aplikasi jalan di mode coba tanpa Firebase.
