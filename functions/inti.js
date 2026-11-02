// =====================================================
//  functions/inti.js — perantara AI: aturan-aturannya
//
//  Dipisah dari index.js (yang nyambung ke Firebase & Gemini beneran), biar
//  bisa dites tanpa deploy: semua yang nyentuh luar dikasih lewat `alat`.
//
//  Satu permintaan = satu kali panggil satu model Gemini. Logika coba ulang &
//  pindah ke model cadangan tetap di aplikasi (js/firebase.js), jadi pesan
//  "Server AI lagi penuh, nyoba lagi..." di layar tetap sama kayak dulu.
// =====================================================

export const BATAS = {
  perintahHuruf: 60000,              // perintah dari aplikasi biasanya < 20.000 huruf
  pdfByte: 15 * 1024 * 1024,         // sama dengan AI_MAKS_PDF_MB di js/ai.js
  perHari: 60                        // panggilan per orang per hari (coba ulang ikut dihitung)
};
const PERAN_AKTIF = ["ustadz", "kurikulum"];

// alat: {
//   asalBoleh: [origin],            situs yang boleh manggil (CORS)
//   modelBoleh: [nama model],
//   cekAppCheck(token) → Promise,   gagal = lempar
//   cekLogin(idToken) → Promise<uid>, gagal = lempar
//   ambilPeran(uid) → Promise<peran | null>
//   catatPemakaian(uid, batas) → Promise<boolean>  false = jatah hari ini habis
//   panggilGemini({ model, perintah, pdf, thinking }) → Promise<teks>; galat punya .status
// }
// hasilnya fungsi: ({ method, headers, body }) → { status, header, isi }
export function buatPenangan(alat) {
  return async function tangani(req) {
    const asal = req.headers.origin || "";
    const header = {};
    if (alat.asalBoleh.includes(asal)) {
      header["Access-Control-Allow-Origin"] = asal;
      header["Vary"] = "Origin";
      header["Access-Control-Allow-Headers"] = "Authorization, Content-Type, X-Firebase-AppCheck";
      header["Access-Control-Allow-Methods"] = "POST, OPTIONS";
      header["Access-Control-Max-Age"] = "3600";
    }
    const jawab = (status, isi) => ({ status, header, isi });
    const galat = (status, pesan) => jawab(status, { galat: `[${status}] ${pesan}` });

    if (req.method === "OPTIONS") return jawab(204, null);
    if (req.method !== "POST") return galat(405, "Cuma boleh POST.");
    if (!alat.asalBoleh.includes(asal)) return galat(403, "Situs ini nggak boleh manggil AI Bank Soal.");

    // 1. beneran dari aplikasi Bank Soal (App Check)
    try {
      await alat.cekAppCheck(String(req.headers["x-firebase-appcheck"] || ""));
    } catch {
      return galat(401, "App Check gagal. Muat ulang aplikasinya, lalu coba lagi.");
    }
    // 2. udah login
    const token = /^Bearer (.+)$/.exec(String(req.headers.authorization || ""));
    let uid;
    try {
      if (!token) throw new Error("nggak ada token");
      uid = await alat.cekLogin(token[1]);
    } catch {
      return galat(401, "Sesi login habis. Keluar lalu masuk lagi.");
    }
    // 3. akunnya aktif (guru / TU), bukan menunggu / ditolak / nonaktif
    if (!PERAN_AKTIF.includes(await alat.ambilPeran(uid))) {
      return galat(403, "Akun ini belum disetujui atau sudah nonaktif.");
    }

    // 4. isian masuk akal
    const b = req.body && typeof req.body === "object" ? req.body : {};
    if (typeof b.perintah !== "string" || !b.perintah.trim() || b.perintah.length > BATAS.perintahHuruf) {
      return galat(400, "Perintah ke AI kosong atau kepanjangan.");
    }
    if (!alat.modelBoleh.includes(b.model)) return galat(400, "Model AI nggak dikenal.");
    if (b.thinking !== undefined && b.thinking !== null && b.thinking !== "LOW") return galat(400, "Setelan thinking nggak dikenal.");
    let pdf = null;
    if (b.pdf !== undefined && b.pdf !== null) {
      const ok = b.pdf && b.pdf.mime === "application/pdf" && typeof b.pdf.data === "string" &&
        /^[A-Za-z0-9+/]*={0,2}$/.test(b.pdf.data);
      if (!ok) return galat(400, "File PDF-nya rusak.");
      if (Math.floor(b.pdf.data.length * 3 / 4) > BATAS.pdfByte) return galat(413, "File PDF-nya kegedean.");
      pdf = { mime: "application/pdf", data: b.pdf.data };
    }

    // 5. jatah harian per orang (biar satu akun nggak ngabisin jatah AI sekolah)
    if (!(await alat.catatPemakaian(uid, BATAS.perHari))) {
      return galat(429, "Jatah AI harian akun ini udah habis. Coba lagi besok.");
    }

    // 6. panggil Gemini
    try {
      const teks = await alat.panggilGemini({ model: b.model, perintah: b.perintah, pdf, thinking: b.thinking || null });
      return jawab(200, { teks: String(teks ?? "") });
    } catch (err) {
      const status = Number(err && err.status) || 500;
      const pesan = String((err && err.message) || "Server AI bermasalah").slice(0, 300);
      return galat(status >= 400 && status < 600 ? status : 500, pesan);
    }
  };
}

// tanggal hari ini di WIB (jatah harian ganti tiap tengah malam WIB)
export function tanggalWIB(waktu = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(waktu);   // 2026-11-02
}
