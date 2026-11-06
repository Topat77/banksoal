// =====================================================
grup("Daftar file JS & CSP tetap sinkron");
{
  const crypto = require("crypto");
  const html = fs.readFileSync(path.join(akar, "index.html"), "utf8");
  const diHtml = [...html.matchAll(/<script src="(js\/[^"]+)"><\/script>/g)].map(m => m[1]);
  const mulai = baca("js/mulai.js");
  const cekMulai = [...ambilFungsi(mulai, "fileKurang").matchAll(/"(js\/[^"]+)": (.+?),?$/gm)].map(m => [m[1], m[2]]);
  const sw = baca("sw.js");
  const inti = JSON.parse(sw.match(/const INTI = (\[[\s\S]*?\]);/)[1].replace(/'/g, '"'));
  const diFolder = fs.readdirSync(path.join(akar, "js")).filter(f => f.endsWith(".js")).map(f => "js/" + f);

  harap("fileKurang() ngecek file yang sama, urutan sama, dengan index.html", cekMulai.map(x => x[0]).join(), diHtml.join());
  harap("mulai.js dimuat sebagai module di index.html", /<script type="module" src="js\/mulai.js"><\/script>/.test(html), true);
  harap("semua file di js/ masuk INTI sw.js", diFolder.filter(f => !inti.includes(f)).join() || "lengkap", "lengkap");
  harap("INTI nggak nyebut file js yang udah nggak ada", inti.filter(f => f.startsWith("js/") && !diFolder.includes(f)).join() || "aman", "aman");
  harap("semua file js (selain firebase & mulai) dimuat di index.html",
    diFolder.filter(f => !diHtml.includes(f) && f !== "js/firebase.js" && f !== "js/mulai.js").join() || "lengkap", "lengkap");
  // tiap cek di fileKurang harus nunjuk nama yang beneran didefinisiin di file itu
  const salahCek = cekMulai.filter(([f, cek]) => {
    const src = baca(f);
    return [...cek.matchAll(/typeof (\w+)/g)].some(m => !new RegExp(`^((async )?function ${m[1]}\\(|const ${m[1]} =)`, "m").test(src));
  }).map(x => x[0]);
  harap("nama yang dicek fileKurang() ada di file-nya", salahCek.join() || "cocok", "cocok");

  // sisa bentrok merge (<<<<<<<, =======, >>>>>>>, atau nama branch nyasar sendirian di satu baris)
  // tetap kebaca sebagai kode yang sah, tapi bikin layar error waktu dibuka
  const diCss = fs.readdirSync(path.join(akar, "css")).filter(f => f.endsWith(".css")).map(f => "css/" + f);
  const cssDiHtml = [...html.matchAll(/<link rel="stylesheet" href="(css\/[^"]+)">/g)].map(m => m[1]);
  harap("semua file css dimuat di index.html", diCss.filter(f => !cssDiHtml.includes(f)).join() || "lengkap", "lengkap");
  harap("semua file css masuk INTI sw.js", diCss.filter(f => !inti.includes(f)).join() || "lengkap", "lengkap");
  harap("INTI nggak nyebut file css yang udah nggak ada", inti.filter(f => f.endsWith(".css") && !diCss.includes(f)).join() || "aman", "aman");

  const sisaMerge = diFolder.concat(diCss, ["sw.js", "index.html", "firestore.rules"]).flatMap(f =>
    baca(f).split(/\r?\n/).map((l, i) => /^(<<<<<<<|=======|>>>>>>>)|^\s*(main|[a-z]+(-[a-z0-9]+)+)\s*$/.test(l) ? `${f}:${i + 1}` : null).filter(Boolean));
  harap("nggak ada sisa bentrok merge di file aplikasi", sisaMerge.join() || "bersih", "bersih");

  const skripInline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  const hashCsp = [...html.matchAll(/'sha256-([^']+)'/g)].map(m => m[1]);
  const hashSkrip = skripInline.map(s => crypto.createHash("sha256").update(s, "utf8").digest("base64"));
  boleh("tiap script inline punya hash di CSP (kalau isinya diubah, hash-nya ikut diganti)", skripInline.length > 0 && hashSkrip.every(h => hashCsp.includes(h)));
}

// =====================================================
grup("Jatah AI: jam reset (00.00 waktu Pasifik) dalam WIB");
{
  const c = vm.createContext({ Intl, Date });
  vm.runInContext([ambilFungsi(aiJs, "resetJatahAI"), ambilFungsi(aiJs, "teksResetAI"), ambilFungsi(aiJs, "jenisJatahAI"),
    "this.ekspor3 = { teksResetAI, jenisJatahAI };"].join("\n"), c);
  const { teksResetAI, jenisJatahAI } = c.ekspor3;
  harap("November (PST), pagi WIB: hari ini 15.00", teksResetAI(new Date("2026-11-04T03:00:00Z")), "hari ini pukul 15.00 WIB");
  harap("November, sore WIB setelah reset: besok 15.00", teksResetAI(new Date("2026-11-04T09:00:00Z")), "besok pukul 15.00 WIB");
  harap("Juli (PDT): 14.00", teksResetAI(new Date("2026-07-04T09:00:00Z")), "besok pukul 14.00 WIB");
  harap("galat per hari kebaca harian", jenisJatahAI("429 Quota exceeded for metric: generate_content_free_tier_requests, limit: GenerateRequestsPerDayPerProjectPerModel"), "hari");
  harap("galat per menit kebaca per menit", jenisJatahAI("429 Quota exceeded ... GenerateRequestsPerMinutePerProjectPerModel"), "menit");
  harap("429 tanpa keterangan: nggak ditebak", jenisJatahAI("[429] RESOURCE_EXHAUSTED"), "");
}

Promise.all(tunggu).then(() => {
  console.log(`\n${lolos} lolos, ${gagal} gagal`);
  process.exit(gagal ? 1 : 0);
});
// tes async yang nyangkut (promise nggak pernah selesai) jangan sampai lolos diam-diam
process.on("beforeExit", () => {
  console.log(`\nGAGAL ada tes async yang nggak selesai (terakhir di bagian "${bagian}")\n${lolos} lolos, ${gagal + 1} gagal`);
  process.exit(1);
});
