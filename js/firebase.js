// =====================================================
//  firebase.js — backend ONLINE (Firebase)
//
//  Login: akun Google (Firebase Authentication)
//  AI   : Gemini lewat Firebase AI Logic (buat draft soal)
//  Data : Cloud Firestore, dengan cache di perangkat
//         → tetap bisa dibuka & diisi tanpa sinyal,
//           perubahan dikirim otomatis waktu online lagi.
//
//  Bentuknya sama persis dengan backend mode coba (coba.js),
//  jadi layar-layar nggak perlu tahu lagi pakai yang mana.
// =====================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect,
  getRedirectResult, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache,
  doc, collection, query, where, onSnapshot, setDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const SDK = "https://www.gstatic.com/firebasejs/12.19.0";

export async function buatBackendFirebase(konfig) {
  const app = initializeApp(konfig.firebase);
  const setelanAI = konfig.ai || {};

  // App Check: pengaman biar layanan Firebase (terutama AI) cuma bisa dipakai dari aplikasi ini.
  // Dipasang kalau site key reCAPTCHA-nya sudah diisi di konfig.js.
  if (setelanAI.appCheckKey) {
    try {
      // di laptop (Live Server) pakai "debug token": kodenya muncul di Console browser,
      // lalu didaftarin sekali di Firebase → App Check → Apps → Manage debug tokens
      if (["localhost", "127.0.0.1"].includes(location.hostname)) self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      // pakai Fraud Defense (dulu namanya reCAPTCHA Enterprise); reCAPTCHA v3 lama udah nggak diterima
      const { initializeAppCheck, ReCaptchaEnterpriseProvider } = await import(`${SDK}/firebase-app-check.js`);
      initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(setelanAI.appCheckKey), isTokenAutoRefreshEnabled: true });
    } catch (err) {
      console.warn("App Check gagal dipasang:", err);
    }
  }

  // AI baru dimuat waktu pertama kali dipakai, biar buka aplikasi tetap cepat
  const modelAI = {};
  let layananAI = null;
  // "thinking" dikecilin: nyusun soal dari modul nggak perlu mikir panjang, jadi jauh lebih cepat.
  // Kalau modelnya nolak setelan ini, sisa sesi pakai setelan bawaan model.
  let pakaiThinkingRendah = true;
  async function ambilModelAI(nama) {
    const kunci = `${nama}|${pakaiThinkingRendah}`;
    if (modelAI[kunci]) return modelAI[kunci];
    if (!layananAI) {
      const sdk = await import(`${SDK}/firebase-ai.js`);
      layananAI = { sdk, ai: sdk.getAI(app, { backend: new sdk.GoogleAIBackend() }) };
    }
    const generationConfig = { responseMimeType: "application/json", temperature: 0.7 };
    if (pakaiThinkingRendah) generationConfig.thinkingConfig = { thinkingLevel: "LOW" };
    modelAI[kunci] = layananAI.sdk.getGenerativeModel(layananAI.ai, { model: nama, generationConfig }, { timeout: BATAS_TUNGGU_AI });
    return modelAI[kunci];
  }
  const kodeHTTP = (err) => {
    const s = err && err.customErrorData && err.customErrorData.status;
    if (s) return s;
    const m = /\[(\d{3})\b/.exec(String(err && err.message));
    return m ? Number(m[1]) : 0;
  };
  const tunggu = (ms) => new Promise(r => setTimeout(r, ms));
  // server yang diam aja (nggak jawab) dianggap lambat setelah 45 detik, lalu pindah ke model cadangan
  const BATAS_TUNGGU_AI = 45000;
  const kelamaan = (err) => /timeout has expired|timed? ?out|deadline/i.test(String(err && err.message));
  // kalau model utama barusan lambat/penuh, 30 menit ke depan langsung pakai model cadangan
  const LAMA_PAKAI_CADANGAN = 30 * 60 * 1000;
  let utamaBermasalahSampai = 0;
  const auth = getAuth(app);
  auth.languageCode = "id";

  // simpan salinan data di perangkat (IndexedDB) biar bisa offline.
  // Kalau browsernya nggak bisa (misal mode penyamaran), pakai memori aja.
  let db;
  try {
    db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
  } catch (err) {
    console.warn("Cache offline nggak tersedia:", err);
    db = initializeFirestore(app, { localCache: memoryLocalCache() });
  }

  // kalau tadi masuk lewat pindah halaman (redirect), selesaikan di sini
  getRedirectResult(auth).catch(err => console.warn("Masuk lewat redirect gagal:", err));

  const keAkun = (u) => u ? { uid: u.uid, nama: u.displayName || u.email, email: u.email, foto: u.photoURL || "" } : null;
  const dariDok = (snap) => ({ id: snap.id, ...snap.data() });
  // Firestore nolak nilai `undefined`, jadi dibersihin dulu
  const bersih = (x) => JSON.parse(JSON.stringify(x));

  return {
    mode: "firebase",

    pantauAuth(cb) {
      onAuthStateChanged(auth, (u) => cb(keAkun(u)));
    },

    async masuk() {
      const penyedia = new GoogleAuthProvider();
      penyedia.setCustomParameters({ prompt: "select_account" });
      try {
        await signInWithPopup(auth, penyedia);
      } catch (err) {
        // jendela kecil diblokir browser → pindah halaman aja
        if (err.code === "auth/popup-blocked" || err.code === "auth/operation-not-supported-in-this-environment") {
          await signInWithRedirect(auth, penyedia);
          return;
        }
        throw err;
      }
    },

    keluar() {
      return signOut(auth);
    },

    pantauDok(jalur, cb, gagal) {
      return onSnapshot(doc(db, jalur),
        (snap) => cb(snap.exists() ? dariDok(snap) : null, { dariCache: snap.metadata.fromCache }),
        gagal);
    },

    pantauKoleksi(jalur, syarat, cb, gagal) {
      const q = query(collection(db, jalur), ...(syarat || []).map(([kolom, op, nilai]) => where(kolom, op, nilai)));
      return onSnapshot(q,
        (snap) => cb(snap.docs.map(dariDok), { dariCache: snap.metadata.fromCache }),
        gagal);
    },

    // catatan: tanpa sinyal, janji (promise) ini baru selesai waktu online lagi,
    // tapi datanya langsung tampil di perangkat ini.
    tulis(jalur, isi) {
      return setDoc(doc(db, jalur), bersih(isi));
    },

    hapus(jalur) {
      return deleteDoc(doc(db, jalur));
    },

    // kirim perintah (+ PDF kalau ada) ke Gemini lewat Firebase AI Logic.
    // Kunci API-nya disimpan di server Firebase, nggak ada di kode ini.
    // Server AI kadang penuh (503) atau diam aja (lambat). Model utama dicoba ulang 2x kalau penuh;
    // kalau lambat, kuota habis, atau tetap penuh, pindah ke model cadangan.
    // kabarProses(teks) dipanggil tiap kali mau nyoba ulang / pindah model, buat ditampilin ke guru.
    async tanyaAI({ perintah, pdf }, kabarProses = () => {}) {
      const bagian = [{ text: perintah }];
      if (pdf) bagian.push({ inlineData: { mimeType: pdf.mime, data: pdf.data } });
      const utama = setelanAI.model || "gemini-3.8-flash";
      const cadangan = setelanAI.modelCadangan || null;
      const langsungCadangan = cadangan && Date.now() < utamaBermasalahSampai;
      const giliran = langsungCadangan ? [cadangan, utama] : [utama, utama, utama, cadangan].filter(Boolean);
      const lompatKeModelLain = (i) => {
        const j = giliran.findIndex((nama, k) => k > i && nama !== giliran[i]);
        return j < 0 ? giliran.length : j;
      };
      let galatUtama = null, galatLain = null, alasan = "";
      for (let i = 0; i < giliran.length; i++) {
        const nama = giliran[i];
        if (i > 0) {
          const ulang = nama === giliran[i - 1];
          kabarProses(ulang ? `Server AI lagi penuh, nyoba lagi (${i + 1}/3)...`
            : `${alasan || "Server AI bermasalah"}, pindah ke model ${nama === cadangan ? "cadangan" : "utama"}...`);
          await tunggu(ulang ? 3000 * i : 1000);
        }
        try {
          const hasil = await (await ambilModelAI(nama)).generateContent(bagian);
          if (nama === utama) utamaBermasalahSampai = 0;
          return hasil.response.text();
        } catch (err) {
          const kode = kodeHTTP(err);
          if (kode === 400 && pakaiThinkingRendah && /thinking/i.test(String(err && err.message))) {
            pakaiThinkingRendah = false;   // model ini nggak kenal setelan thinking: ulangi tanpa itu
            i--;
            continue;
          }
          if (nama === utama) galatUtama = galatUtama || err;
          else galatLain = galatLain || err;
          const lambat = kelamaan(err);
          const penuh = [500, 503, 504].includes(kode);
          if (nama === utama && (lambat || penuh || kode === 429)) utamaBermasalahSampai = Date.now() + LAMA_PAKAI_CADANGAN;
          if (lambat) { alasan = "Server AI lambat"; i = lompatKeModelLain(i) - 1; continue; }
          // kuota satu model habis (429): langsung coba model lain (jatahnya terpisah)
          if (kode === 429) { alasan = "Jatah AI model ini habis"; i = lompatKeModelLain(i) - 1; continue; }
          if (penuh) { alasan = "Server AI masih penuh"; continue; }
          // galat lain (misal model cadangan nggak ada): coba model berikutnya kalau ada
          alasan = "Model AI bermasalah";
          if (nama !== utama) continue;
          throw err;
        }
      }
      throw galatUtama || galatLain;
    }
  };
}