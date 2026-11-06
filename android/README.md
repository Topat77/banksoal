# APK Android Bank Soal

APK Bank Soal **bukan aplikasi Android native**. Dia cuma "bungkus" (TWA, *Trusted Web Activity*) yang membuka situs
`https://topat77.github.io/banksoal/` di mesin Chrome, tanpa kolom alamat. Isinya tetap situs yang sama, jadi:

- **Perbaikan kode aplikasi (JS, CSS, HTML) langsung kepakai di APK.** Nggak perlu bikin APK baru.
- **APK baru cuma perlu kalau** ganti ikon, nama aplikasi, warna, atau layar pembuka.

| | |
|---|---|
| Dibuat pakai | [PWABuilder](https://www.pwabuilder.com) → Android |
| Package ID | `io.github.topat77.banksoal` |
| File pengenal (Digital Asset Links) | repo [`Topat77/topat77.github.io`](https://github.com/Topat77/topat77.github.io), file `.well-known/assetlinks.json` |
| Pengaturan PWABuilder | `twa-manifest.json` di folder ini (**belum ada**, lihat bagian bawah) |

## ⚠️ Kunci APK (wajib dijaga)

Dari PWABuilder ada dua file: **`signing.keystore`** dan **`signing-key-info.txt`** (alias + password).

- **Jangan pernah dimasukin ke repo ini.** Repo ini publik.
- Simpan di dua tempat aman, misalnya Google Drive pribadi dan flashdisk.
- Kalau kuncinya hilang:
  - APK baru **nggak bisa menimpa** APK lama, jadi semua pengguna harus hapus aplikasi dulu.
  - Kode kunci di `assetlinks.json` harus diganti. Kalau nggak, kolom alamat Chrome muncul terus.

## Cara bikin ulang APK

1. Buka **pwabuilder.com**, masukkan `https://topat77.github.io/banksoal/`, tekan **Start**.
2. **Package For Stores** → **Android** → **Generate Package** → **All Settings**.
3. Isi pengaturannya:

   | Pengaturan | Isi |
   |---|---|
   | Package ID | `io.github.topat77.banksoal` (harus sama persis) |
   | App version | naik dari versi sebelumnya (misal `1.0.1` → `1.0.2`) |
   | App version code | naik **1** dari sebelumnya |
   | Background color | `#EDF5F1` |
   | Theme / status bar color | `#087A58` |
   | Splash screen fade out duration | `1500` (nutupin kolom alamat waktu Chrome masih ngecek file pengenal) |
   | Fallback behavior | **Custom Tabs** (jangan WebView: login Google diblokir di WebView) |
   | Display mode | **Standalone** |
   | Signing key | **Use mine** → upload `signing.keystore`, isi alias & password dari `signing-key-info.txt` |

4. **Download Package**. Ambil file `.apk` dari zip-nya. File `.aab` dipakai kalau masuk Play Store.
5. Pasang di HP tanpa menghapus aplikasi lama (cukup ditimpa).
   Kalau HP menolak, berarti kuncinya beda: **berhenti**, jangan dibagikan.
6. **Kalau kuncinya sama, `assetlinks.json` nggak perlu diubah.**
7. Simpan `twa-manifest.json` dari zip ke folder ini lewat branch + PR, biar pengaturannya tercatat.
   Cek dulu isinya nggak ada password.

## Cara ngetes APK baru

- Buka aplikasinya: harus langsung tampil tanpa kolom alamat.
- Tutup, biarin beberapa jam, lalu buka lagi. Harus tetap tanpa kolom alamat. Kalau sesekali muncul sebentar,
  naikkan **Splash screen fade out duration** (misal `2500`) di APK berikutnya.
- Coba login Google, buka modul, dan buat soal dengan AI.

## Belum ada di folder ini

- **`twa-manifest.json`**: ada di dalam zip PWABuilder. Masukkan ke sini waktu bikin APK berikutnya (langkah 7).
