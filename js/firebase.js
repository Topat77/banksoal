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
      const { initializeAppCheck, ReCaptchaV3Provider } = await import(`${SDK}/firebase-app-check.js`);
      initializeAppCheck(app, { provider: new ReCaptchaV3Provider(setelanAI.appCheckKey), isTokenAutoRefreshEnabled: true });
    } catch (err) {
      console.warn("App Check gagal dipasang:", err);
    }
  }

  // AI baru dimuat waktu pertama kali dipakai, biar buka aplikasi tetap cepat
  let modelAI = null;
  async function ambilModelAI() {
    if (modelAI) return modelAI;
    const { getAI, getGenerativeModel, GoogleAIBackend } = await import(`${SDK}/firebase-ai.js`);
    const ai = getAI(app, { backend: new GoogleAIBackend() });
    modelAI = getGenerativeModel(ai, {
      model: setelanAI.model || "gemini-3.8-flash",
      generationConfig: { responseMimeType: "application/json", temperature: 0.7 }
    });
    return modelAI;
  }
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
    async tanyaAI({ perintah, pdf }) {
      const model = await ambilModelAI();
      const bagian = [{ text: perintah }];
      if (pdf) bagian.push({ inlineData: { mimeType: pdf.mime, data: pdf.data } });
      const hasil = await model.generateContent(bagian);
      return hasil.response.text();
    }
  };
}