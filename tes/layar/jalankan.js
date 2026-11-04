// semua tes layar: fitur penting + susur semua layar. Keluar dengan kode 1 kalau ada yang gagal.
const { fitur } = require("./fitur");
const { susur } = require("./susur");
const { hasil } = require("./alat");
(async () => {
  await fitur();
  console.log("\nSusur semua layar (HP & laptop, terang & gelap)");
  const temuan = await susur();
  console.log(temuan.length ? temuan.map(t => "  TEMUAN " + t).join("\n") : "  ok    nggak ada temuan");
  const { lolos, gagal } = hasil();
  console.log(`\n${lolos} lolos, ${gagal + temuan.length} gagal`);
  process.exit(gagal || temuan.length ? 1 : 0);
})();
