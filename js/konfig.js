// =====================================================
//  konfig.js — PENGATURAN YANG DIISI SENDIRI
//
//  1. firebase: salin dari Firebase Console
//     (Project settings → General → Your apps → Web app → firebaseConfig)
//     Selama apiKey masih kosong, aplikasi jalan di MODE COBA:
//     data contoh, tersimpan di perangkat ini aja.
//
//  2. adminAwal: email Google admin (TU) yang pertama.
//     Akun ini langsung jadi admin pas pertama masuk.
//     Email yang sama juga harus ditulis di firestore.rules.
//
//  3. ai: pengaturan buat fitur "Buat soal pakai AI".
//     model      : nama model Gemini. Kalau nanti diganti Google,
//                  cukup ubah di sini (lihat daftar model di dokumentasi
//                  Firebase AI Logic).
//     modelCadangan: model yang lebih ringan, dipakai otomatis kalau
//                  server model utama lagi penuh (error 503). Boleh kosong.
//     appCheckKey: "site key" reCAPTCHA v3 buat App Check (pengaman
//                  biar kuota AI nggak dipakai orang lain). Boleh kosong
//                  waktu nyoba, tapi sebaiknya diisi sebelum dipakai rame-rame.
// =====================================================

const KONFIG = {
  namaAplikasi: "Bank Soal",
  namaLembaga: "PKBM Imam Syafi'i",

  firebase: {
    apiKey: "AIzaSyBgw48X7LE7TqHLaBdY3UF-BCGHCspRYrI",
    authDomain: "banksoal-pkbm.firebaseapp.com",
    projectId: "banksoal-pkbm",
    storageBucket: "banksoal-pkbm.firebasestorage.app",
    messagingSenderId: "519937223717",
    appId: "1:519937223717:web:52650988d9fa21242ae3cc"
  },

  adminAwal: [
    "topatvanjava@gmail.com"
  ],

  ai: {
    model: "gemini-3.8-flash",
    modelCadangan: "gemini-3.5-flash-lite",
    appCheckKey: "6LfLRP4tAAAAAE-ZJ7xPTPcemz4mGBiACH3QVNMw"
  }
};