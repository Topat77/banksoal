// =====================================================
//  tes/aturan.tes.js — ngetes aturan akses (js/aturan.js) & alat bantu data
//
//  Jalanin:  node tes/aturan.tes.js
//
//  File ini NGGAK dimuat aplikasi (nggak perlu didaftarin di index.html / sw.js).
//  js/aturan.js itu salinan firestore.rules, jadi yang dites di sini logikanya.
//  firestore.rules-nya sendiri tetap harus di-Publish manual di Firebase Console.
//
//  Isi tesnya dipecah di tes/aturan/*.js (urut nama file). Semua bagian digabung jadi
//  satu skrip lalu dijalanin sekali, jadi alat bantu & data contoh di 01-dasar.js
//  kepakai di semua bagian. Nambah bagian baru: bikin file 0x-nama.js di folder itu.
//  Rekap lolos/gagal ada di bagian terakhir.
// =====================================================
const fs = require("fs");
const path = require("path");

const folder = path.join(__dirname, "aturan");
const isi = fs.readdirSync(folder).filter(f => f.endsWith(".js")).sort()
  .map(f => `// ---- ${f} ----\n${fs.readFileSync(path.join(folder, f), "utf8")}`)
  .join("\n");
// __dirname dikirim dari sini (folder tes/), biar jalur file di dalam bagian tetap sama
new Function("require", "__dirname", isi)(require, __dirname);
