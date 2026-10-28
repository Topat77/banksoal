// =====================================================
//  menupilih.js — MENU PILIHAN
//  Daftar menu-pilih bawaan browser (<select>) polos dan beda-beda tiap HP.
//  Tiap <select> di layar dikasih tampilan menu-pilih sendiri. Select aslinya tetap ada
//  dan tetap yang nyimpen nilainya, jadi form & onchange di layar lain nggak perlu diubah.
//  Keterangan kecil di bawah pilihan: <option data-ket="...">.
// =====================================================
const IKON_PANAH_PILIHAN = `<svg class="menu-pilih-panah" aria-hidden="true" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>`;
const IKON_CENTANG_PILIHAN = `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg>`;
let pilihanTerbuka = null;

function tutupPilihan() {
  if (pilihanTerbuka) pilihanTerbuka();
}

function percantikPilihan(sel) {
  if (sel.dataset.cantik) return;
  sel.dataset.cantik = "1";
  const wadah = document.createElement("span");
  wadah.className = "menu-pilih";
  sel.parentNode.insertBefore(wadah, sel);
  wadah.appendChild(sel);
  sel.classList.add("menu-pilih-asli");
  sel.tabIndex = -1;
  sel.setAttribute("aria-hidden", "true");

  const label = sel.closest("label");
  const namaLabel = sel.getAttribute("aria-label") ||
    (label ? [...label.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join(" ").trim() : "");
  const tombol = document.createElement("button");
  tombol.type = "button";
  tombol.className = "menu-pilih-tombol";
  tombol.setAttribute("aria-haspopup", "listbox");
  tombol.setAttribute("aria-expanded", "false");
  const daftar = document.createElement("span");
  daftar.className = "menu-pilih-daftar";
  daftar.setAttribute("role", "listbox");
  if (namaLabel) daftar.setAttribute("aria-label", namaLabel);
  daftar.hidden = true;
  wadah.append(tombol, daftar);

  const isiTombol = () => {
    const o = sel.options[sel.selectedIndex];
    tombol.innerHTML = `<span class="menu-pilih-teks" dir="auto">${aman(o ? o.text : "")}</span>${IKON_PANAH_PILIHAN}`;
    if (namaLabel) tombol.setAttribute("aria-label", `${namaLabel}: ${o ? o.text : ""}`);
    tombol.disabled = sel.disabled;
  };
  function tutup(fokus) {
    daftar.hidden = true;
    tombol.setAttribute("aria-expanded", "false");
    if (pilihanTerbuka === tutup) pilihanTerbuka = null;
    if (fokus === true) tombol.focus();
  }
  function buka() {
    tutupPilihan();
    daftar.innerHTML = [...sel.options].map((o, i) => `
      <button type="button" role="option" class="menu-pilih-opsi" data-i="${i}" aria-selected="${i === sel.selectedIndex}" ${o.disabled ? "disabled" : ""}>
        <span class="menu-pilih-centang">${i === sel.selectedIndex ? IKON_CENTANG_PILIHAN : ""}</span>
        <span class="menu-pilih-isi"><span dir="auto">${aman(o.text)}</span>${o.dataset.ket ? `<small>${aman(o.dataset.ket)}</small>` : ""}</span>
      </button>`).join("");
    daftar.hidden = false;
    tombol.setAttribute("aria-expanded", "true");
    // kalau ruang di bawah sempit, daftarnya dibuka ke atas
    const r = tombol.getBoundingClientRect();
    const bawah = window.innerHeight - r.bottom;
    wadah.classList.toggle("ke-atas", bawah < Math.min(daftar.scrollHeight + 12, 320) && r.top > bawah);
    pilihanTerbuka = tutup;
    const aktif = daftar.querySelector('[aria-selected="true"]:not([disabled])') || daftar.querySelector("button:not([disabled])");
    if (aktif) aktif.focus();
  }

  tombol.onclick = () => daftar.hidden ? buka() : tutup();
  tombol.onkeydown = (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); buka(); }
  };
  daftar.onclick = (e) => {
    const b = e.target.closest("[data-i]");
    if (!b || b.disabled) return;
    const i = Number(b.dataset.i);
    tutup(true);
    if (i !== sel.selectedIndex) {
      sel.selectedIndex = i;
      isiTombol();
      sel.dispatchEvent(new Event("change", { bubbles: true }));
    }
  };
  daftar.onkeydown = (e) => {
    const opsi = [...daftar.querySelectorAll("button:not([disabled])")];
    const i = opsi.indexOf(document.activeElement);
    if (e.key === "ArrowDown") { e.preventDefault(); (opsi[i + 1] || opsi[0]).focus(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); (opsi[i - 1] || opsi[opsi.length - 1]).focus(); }
    else if (e.key === "Home") { e.preventDefault(); opsi[0].focus(); }
    else if (e.key === "End") { e.preventDefault(); opsi[opsi.length - 1].focus(); }
    else if (e.key === "Escape") { e.preventDefault(); tutup(true); }
    else if (e.key === "Tab") tutup();
  };
  // layar kadang ngembaliin nilai select (misal konfirmasi dibatalin): tampilannya ikut
  sel.addEventListener("change", isiTombol);
  isiTombol();
}

document.addEventListener("click", (e) => {
  if (pilihanTerbuka && !e.target.closest(".menu-pilih")) tutupPilihan();
});
// tiap kali isi layar digambar ulang, select yang baru langsung dipercantik
new MutationObserver(() => {
  isi.querySelectorAll("select:not([data-cantik])").forEach(percantikPilihan);
}).observe(isi, { childList: true, subtree: true });
