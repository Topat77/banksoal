// alat tes layar: buka aplikasi di mode coba (apiKey dikosongkan lewat route), file diambil langsung dari folder repo
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "../..");
const TIPE = { ".js": "text/javascript", ".css": "text/css", ".html": "text/html", ".png": "image/png", ".json": "application/json", ".svg": "image/svg+xml" };

// opsi: hp (layar 390px), sentuh (HP beneran: pointer coarse), dialog otomatis dijawab "ya"
async function buka(opsi = {}) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: opsi.hp ? { width: 390, height: 844 } : { width: 1280, height: 900 },
    serviceWorkers: "block", acceptDownloads: true,
    ...(opsi.sentuh ? { hasTouch: true, isMobile: true } : {})
  });
  const page = await ctx.newPage();
  const galat = [];
  page.on("pageerror", e => galat.push("PAGEERROR " + e.message));
  page.on("console", m => { if (m.type() === "error") galat.push("console " + m.text()); });
  // kotak dialog aplikasi (js/dialog.js) dijawab otomatis "ya"; pesannya dicatat di window.__dialog
  await page.addInitScript(() => {
    window.__dialog = [];
    new MutationObserver(() => {
      for (const k of document.querySelectorAll(".dialog-latar:not([data-dicatat])")) {
        k.dataset.dicatat = "1";
        window.__dialog.push(k.querySelector(".dialog-pesan").textContent);
        setTimeout(() => {
          const i = k.querySelector(".dialog-isian"); if (i) i.value = "HAPUS";
          k.querySelector('[data-dialog="ya"]').click();
        }, 0);
      }
    }).observe(document, { childList: true, subtree: true });
  });
  await page.route("http://app.test/**", route => {
    let p = new URL(route.request().url()).pathname;
    if (p === "/") p = "/index.html";
    const f = path.join(ROOT, p);
    if (!f.startsWith(ROOT) || !fs.existsSync(f)) return route.fulfill({ status: 404, body: "" });
    let body = fs.readFileSync(f);
    if (p === "/js/konfig.js") body = body.toString().replace(/apiKey: "[^"]*"/, 'apiKey: ""');
    route.fulfill({ status: 200, body, contentType: TIPE[path.extname(p)] || "application/octet-stream" });
  });
  await page.route("https://fonts.googleapis.com/**", r => r.fulfill({ status: 200, body: "", contentType: "text/css" }));
  await page.goto("http://app.test/");
  await page.waitForTimeout(300);
  return { browser, page, galat };
}

// masuk sebagai akun contoh (u-kur = TU, u-hasan / u-yusuf = ustadz, u-aminah = ustadzah)
async function masuk(page, uid) {
  await page.evaluate(() => { localStorage.removeItem("banksoal-coba-akun"); });
  await page.reload(); await page.waitForTimeout(300);
  await page.click(`[data-akun="${uid}"]`);
  await page.waitForTimeout(500);
}
async function ke(page, layar, tambahan = {}, tunggu = 400) {
  await page.evaluate(([l, t]) => pergi(l, t), [layar, tambahan]);
  await page.waitForTimeout(tunggu);
}

// penguji kecil
let lolos = 0, gagal = 0;
function harap(nama, hasil, seharusnya) {
  const sama = JSON.stringify(hasil) === JSON.stringify(seharusnya);
  if (sama) { lolos++; console.log(`  ok    ${nama}`); }
  else { gagal++; console.log(`  GAGAL ${nama} (dapat ${JSON.stringify(hasil)}, harusnya ${JSON.stringify(seharusnya)})`); }
}
const boleh = (nama, x) => harap(nama, !!x, true);
const tolak = (nama, x) => harap(nama, !!x, false);
function hasil() { return { lolos, gagal }; }

module.exports = { buka, masuk, ke, harap, boleh, tolak, hasil };
