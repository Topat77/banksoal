// =====================================================
//  functions/index.js — backend Bank Soal (Cloud Functions for Firebase)
//
//  tanyaAI: perantara ke Gemini. Sebelum manggil AI dicek dulu:
//    App Check (beneran dari aplikasi) → login → akun aktif (guru / TU) → jatah harian.
//  Kunci Gemini disimpan di Secret Manager (GEMINI_API_KEY), nggak pernah sampai ke HP.
//
//  Deploy & pengaturan: lihat bagian "Backend" di CLAUDE.md.
//  Dipakai aplikasi kalau ai.server di js/konfig.js diisi alamat fungsi ini.
// =====================================================
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret, defineString } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getAppCheck } from "firebase-admin/app-check";
import { getFirestore } from "firebase-admin/firestore";
import { GoogleGenAI } from "@google/genai";
import { buatPenangan, tanggalWIB } from "./inti.js";

initializeApp();
const db = getFirestore();

const KUNCI_GEMINI = defineSecret("GEMINI_API_KEY");
// sama dengan ai.model & ai.modelCadangan di js/konfig.js (dipisah koma)
const MODEL_AI = defineString("MODEL_AI", { default: "gemini-3.8-flash,gemini-3.5-flash-lite" });
// situs yang boleh manggil (dipisah koma)
const ASAL_BOLEH = defineString("ASAL_BOLEH", {
  default: "https://topat77.github.io,http://localhost:5500,http://127.0.0.1:5500"
});

let gemini = null;
const daftar = (teks) => teks.split(",").map(x => x.trim()).filter(Boolean);

const tangani = buatPenangan({
  get asalBoleh() { return daftar(ASAL_BOLEH.value()); },
  get modelBoleh() { return daftar(MODEL_AI.value()); },

  cekAppCheck: (token) => getAppCheck().verifyToken(token),
  cekLogin: async (idToken) => (await getAuth().verifyIdToken(idToken)).uid,
  ambilPeran: async (uid) => {
    const snap = await db.doc(`pengguna/${uid}`).get();
    return snap.exists ? snap.get("peran") : null;
  },

  // batasAI/{uid}: { tanggal, jumlah }. Koleksi ini nggak bisa dibaca/ditulis aplikasi
  // (nggak ada aturannya di firestore.rules = ditolak), cuma lewat backend ini.
  catatPemakaian: (uid, batas) => db.runTransaction(async (t) => {
    const ref = db.doc(`batasAI/${uid}`);
    const snap = await t.get(ref);
    const hariIni = tanggalWIB();
    const jumlah = snap.exists && snap.get("tanggal") === hariIni ? snap.get("jumlah") || 0 : 0;
    if (jumlah >= batas) return false;
    t.set(ref, { tanggal: hariIni, jumlah: jumlah + 1 });
    return true;
  }),

  panggilGemini: async ({ model, perintah, pdf, thinking }) => {
    if (!gemini) gemini = new GoogleGenAI({ apiKey: KUNCI_GEMINI.value() });
    const parts = [{ text: perintah }];
    if (pdf) parts.push({ inlineData: { mimeType: pdf.mime, data: pdf.data } });
    const hasil = await gemini.models.generateContent({
      model,
      contents: [{ role: "user", parts }],
      config: {
        responseMimeType: "application/json",
        temperature: 0.7,
        ...(thinking ? { thinkingConfig: { thinkingLevel: thinking } } : {}),
        httpOptions: { timeout: 55000 }
      }
    });
    return hasil.text;
  }
});

export const tanyaAI = onRequest({
  region: "asia-southeast2",      // Jakarta
  secrets: [KUNCI_GEMINI],
  timeoutSeconds: 90,
  memory: "512MiB",
  maxInstances: 3,                // biar biaya nggak bisa meledak walau diserang
  concurrency: 20,
  invoker: "public"               // dibuka umum, tapi tiap permintaan dicek di atas
}, async (req, res) => {
  try {
    const h = await tangani({ method: req.method, headers: req.headers, body: req.body });
    res.set(h.header);
    if (h.isi === null) res.status(h.status).end();
    else res.status(h.status).json(h.isi);
  } catch (err) {
    console.error("tanyaAI gagal:", err && err.message);   // isi perintah sengaja nggak dicatat
    res.status(500).json({ galat: "[500] Backend AI bermasalah" });
  }
});
