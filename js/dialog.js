// =====================================================
//  dialog.js — kotak konfirmasi & pesan bergaya aplikasi
//
//  Pengganti confirm(), alert(), dan prompt() bawaan browser.
//  Dialog bawaan selalu nampilin nama situs ("topat77.github.io menyatakan")
//  dan gayanya nggak bisa diubah, jadi di APK kerasa kayak website.
//
//    if (!(await tanyaYakin("Hapus modul ini?", { bahaya: true, ya: "Hapus" }))) return;
//    kabar("Modul berhasil disalin.");
//    const nama = await minta("Nama kolom", "UH 1");   // null kalau dibatalkan
// =====================================================

let antreanDialog = Promise.resolve();

// buka satu dialog; dialog berikutnya nunggu yang ini ditutup
function bukaDialog(o) {
  const jalan = antreanDialog.then(() => new Promise(selesai => tampilDialog(o, selesai)));
  antreanDialog = jalan.catch(() => {});
  return jalan;
}

function tampilDialog(o, selesai) {
  const asal = document.activeElement;
  const latar = document.createElement("div");
  latar.className = "dialog-latar";

  const kotak = document.createElement("div");
  kotak.className = "dialog";
  kotak.setAttribute("role", "alertdialog");
  kotak.setAttribute("aria-modal", "true");
  const idPesan = "dialogPesan" + Date.now().toString(36);
  kotak.setAttribute("aria-describedby", idPesan);

  const pesan = document.createElement("p");
  pesan.className = "dialog-pesan";
  pesan.id = idPesan;
  pesan.textContent = String(o.pesan ?? "");
  pesan.dir = "auto";
  kotak.appendChild(pesan);

  let isian = null;
  if (o.jenis === "minta") {
    isian = document.createElement("input");
    isian.className = "dialog-isian";
    isian.value = o.nilaiAwal || "";
    isian.setAttribute("aria-label", String(o.pesan ?? ""));
    isian.autocomplete = "off";
    kotak.appendChild(isian);
  }

  const tombol = document.createElement("div");
  tombol.className = "dialog-tombol";
  let tidak = null;
  if (o.jenis !== "kabar") {
    tidak = document.createElement("button");
    tidak.type = "button";
    tidak.className = "tombol-kedua";
    tidak.dataset.dialog = "tidak";
    tidak.textContent = o.tidak || "Batal";
    tombol.appendChild(tidak);
  }
  const ya = document.createElement("button");
  ya.type = "button";
  ya.className = o.bahaya ? "tombol-bahaya" : "tombol-utama";
  ya.dataset.dialog = "ya";
  ya.textContent = o.ya || "Oke";
  tombol.appendChild(ya);
  kotak.appendChild(tombol);

  latar.appendChild(kotak);
  document.body.appendChild(latar);
  document.body.classList.add("ada-dialog");

  function tutup(hasil) {
    document.removeEventListener("keydown", tombolKeyboard, true);
    latar.remove();
    if (!document.querySelector(".dialog-latar")) document.body.classList.remove("ada-dialog");
    if (asal && typeof asal.focus === "function" && document.contains(asal)) asal.focus();
    selesai(hasil);
  }
  const jawabYa = () => tutup(o.jenis === "minta" ? isian.value : o.jenis === "kabar" ? undefined : true);
  const jawabTidak = () => tutup(o.jenis === "minta" ? null : o.jenis === "kabar" ? undefined : false);

  function tombolKeyboard(e) {
    if (e.key === "Escape") { e.preventDefault(); jawabTidak(); }
    else if (e.key === "Enter" && (document.activeElement === isian || !kotak.contains(document.activeElement) || document.activeElement === ya)) {
      e.preventDefault(); jawabYa();
    } else if (e.key === "Tab") {
      // fokus nggak boleh keluar dari kotak dialog
      const bisa = [isian, tidak, ya].filter(Boolean);
      const i = bisa.indexOf(document.activeElement);
      e.preventDefault();
      bisa[(i + (e.shiftKey ? bisa.length - 1 : 1)) % bisa.length].focus();
    }
  }
  document.addEventListener("keydown", tombolKeyboard, true);
  ya.onclick = jawabYa;
  if (tidak) tidak.onclick = jawabTidak;
  latar.onclick = (e) => { if (e.target === latar) jawabTidak(); };

  (isian || ya).focus();
  if (isian) isian.select();
}

function tanyaYakin(pesan, o = {}) {
  return bukaDialog({ jenis: "tanya", pesan, ya: o.ya, tidak: o.tidak, bahaya: !!o.bahaya });
}
function kabar(pesan) {
  return bukaDialog({ jenis: "kabar", pesan, ya: "Oke" });
}
function minta(pesan, nilaiAwal = "", o = {}) {
  return bukaDialog({ jenis: "minta", pesan, nilaiAwal, ya: o.ya, tidak: o.tidak, bahaya: !!o.bahaya });
}
