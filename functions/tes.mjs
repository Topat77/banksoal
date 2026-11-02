// =====================================================
//  functions/tes.mjs — ngetes aturan perantara AI (inti.js) tanpa deploy
//  Jalanin: cd functions && npm install && npm run tes
//  Firebase & Gemini diganti tiruan, jadi nggak butuh internet / kunci apa pun.
// =====================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { buatPenangan, BATAS, tanggalWIB } from "./inti.js";

const ASAL = "https://topat77.github.io";

function siapkan(o = {}) {
  const panggilan = [];
  const pemakaian = {};
  const peran = { hasan: "ustadz", tu: "kurikulum", baru: "menunggu", mati: "nonaktif", tolak: "ditolak" };
  const tangani = buatPenangan({
    asalBoleh: [ASAL],
    modelBoleh: ["utama", "cadangan"],
    cekAppCheck: async (t) => { if (t !== "appcheck-sah") throw new Error("App Check palsu"); },
    cekLogin: async (t) => { if (!t.startsWith("token-")) throw new Error("token palsu"); return t.slice(6); },
    ambilPeran: async (uid) => peran[uid] ?? null,
    catatPemakaian: async (uid, batas) => {
      if ((pemakaian[uid] || 0) >= batas) return false;
      pemakaian[uid] = (pemakaian[uid] || 0) + 1;
      return true;
    },
    panggilGemini: async (x) => {
      panggilan.push(x);
      if (o.galatGemini) throw Object.assign(new Error(o.galatGemini.pesan), { status: o.galatGemini.status });
      return '{"soal":[]}';
    }
  });
  return { tangani, panggilan, pemakaian };
}

const minta = (o = {}) => ({
  method: "POST",
  headers: { origin: ASAL, authorization: "Bearer token-hasan", "x-firebase-appcheck": "appcheck-sah", ...(o.headers || {}) },
  body: { perintah: "Buat 2 soal", model: "utama", ...(o.body || {}) },
  ...(o.method ? { method: o.method } : {})
});

test("permintaan sah: Gemini dipanggil, teksnya dikirim balik", async () => {
  const { tangani, panggilan } = siapkan();
  const h = await tangani(minta());
  assert.equal(h.status, 200);
  assert.equal(h.isi.teks, '{"soal":[]}');
  assert.equal(h.header["Access-Control-Allow-Origin"], ASAL);
  assert.deepEqual(panggilan[0], { model: "utama", perintah: "Buat 2 soal", pdf: null, thinking: null });
});

test("CORS: preflight dijawab, situs lain ditolak", async () => {
  const { tangani } = siapkan();
  assert.equal((await tangani(minta({ method: "OPTIONS" }))).status, 204);
  const lain = await tangani(minta({ headers: { origin: "https://situs-jahat.com" } }));
  assert.equal(lain.status, 403);
  assert.equal(lain.header["Access-Control-Allow-Origin"], undefined);
  assert.equal((await tangani(minta({ method: "GET" }))).status, 405);
});

test("tanpa App Check / App Check palsu ditolak", async () => {
  const { tangani, panggilan } = siapkan();
  assert.equal((await tangani(minta({ headers: { "x-firebase-appcheck": "" } }))).status, 401);
  assert.equal((await tangani(minta({ headers: { "x-firebase-appcheck": "palsu" } }))).status, 401);
  assert.equal(panggilan.length, 0);
});

test("belum login / token palsu ditolak", async () => {
  const { tangani, panggilan } = siapkan();
  assert.equal((await tangani(minta({ headers: { authorization: "" } }))).status, 401);
  assert.equal((await tangani(minta({ headers: { authorization: "Bearer palsu" } }))).status, 401);
  assert.equal(panggilan.length, 0);
});

test("akun menunggu / ditolak / nonaktif / nggak ada profil ditolak; guru & TU boleh", async () => {
  const { tangani, panggilan } = siapkan();
  for (const uid of ["baru", "tolak", "mati", "orangluar"]) {
    assert.equal((await tangani(minta({ headers: { authorization: `Bearer token-${uid}` } }))).status, 403, uid);
  }
  assert.equal(panggilan.length, 0);
  assert.equal((await tangani(minta({ headers: { authorization: "Bearer token-tu" } }))).status, 200);
});

test("isian aneh ditolak sebelum manggil Gemini", async () => {
  const { tangani, panggilan } = siapkan();
  const status = async (body) => (await tangani(minta({ body }))).status;
  assert.equal(await status({ perintah: "" }), 400);
  assert.equal(await status({ perintah: "x".repeat(BATAS.perintahHuruf + 1) }), 400);
  assert.equal(await status({ perintah: 5 }), 400);
  assert.equal(await status({ model: "model-mahal-lain" }), 400);
  assert.equal(await status({ thinking: "HIGH" }), 400);
  assert.equal(await status({ pdf: { mime: "text/html", data: "QUJD" } }), 400);
  assert.equal(await status({ pdf: { mime: "application/pdf", data: "bukan base64!" } }), 400);
  assert.equal(await status({ pdf: { mime: "application/pdf", data: "A".repeat(Math.ceil(BATAS.pdfByte * 4 / 3) + 8) } }), 413);
  assert.equal(panggilan.length, 0);
});

test("PDF sampai 15 MB & thinking LOW diteruskan ke Gemini", async () => {
  const { tangani, panggilan } = siapkan();
  const data = "A".repeat(Math.floor(BATAS.pdfByte * 4 / 3));
  const h = await tangani(minta({ body: { pdf: { mime: "application/pdf", data }, thinking: "LOW" } }));
  assert.equal(h.status, 200);
  assert.equal(panggilan[0].pdf.data.length, data.length);
  assert.equal(panggilan[0].thinking, "LOW");
});

test("jatah harian: lewat batas ditolak 429, akun lain nggak kena", async () => {
  const { tangani, pemakaian } = siapkan();
  pemakaian.hasan = BATAS.perHari - 1;
  assert.equal((await tangani(minta())).status, 200);
  const h = await tangani(minta());
  assert.equal(h.status, 429);
  assert.match(h.isi.galat, /^\[429\] /);
  assert.equal((await tangani(minta({ headers: { authorization: "Bearer token-tu" } }))).status, 200);
});

test("galat Gemini diteruskan dengan kodenya (biar aplikasi bisa pindah ke model cadangan)", async () => {
  for (const [status, pesan] of [[404, "models/x is not found"], [429, "quota"], [503, "overloaded"], [400, "thinking not supported"]]) {
    const { tangani } = siapkan({ galatGemini: { status, pesan } });
    const h = await tangani(minta());
    assert.equal(h.status, status);
    assert.equal(h.isi.galat, `[${status}] ${pesan}`);
  }
  const { tangani } = siapkan({ galatGemini: { pesan: "putus" } });
  assert.equal((await tangani(minta())).status, 500);
});

test("tanggal jatah harian pakai WIB", () => {
  assert.equal(tanggalWIB(new Date("2026-11-01T17:30:00Z")), "2026-11-02");   // 00.30 WIB
  assert.equal(tanggalWIB(new Date("2026-11-01T16:30:00Z")), "2026-11-01");   // 23.30 WIB
});
