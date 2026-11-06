// =====================================================
//  keputusan.js — KEPUTUSAN NAIK KELAS
//  (panel di bawah Daftar siswa, khusus TU, semester Genap, setelah rapat pleno)
//  Tiap pencet tombol: dialog konfirmasi, lalu 1 tulis simpanSantri (batal = nggak nulis apa pun).
//  Baris cuma digambar ulang sendiri (isi <li>), lembar nilai & scroll nggak disentuh.
// =====================================================
let panelKeputusan = null;   // { tahun, jenjang, kelas, akhir, status: Map(id -> status), sibuk: Set(id), disentuh }

// semester Genap yang keputusannya diisi sekarang: tahun ajaran ini kalau sudah Genap,
// kalau masih Ganjil ya tahun ajaran yang baru selesai (rapat pleno biasanya sesudah tahun berganti)
function semesterNaikKelas() {
  const kini = semesterSekarang();
  if (kini.semester === "Genap") return { tahun: kini.tahun, semester: "Genap" };
  const m = String(kini.tahun).match(/^(\d{4})\/(\d{4})$/);
  return { tahun: m ? `${Number(m[1]) - 1}/${Number(m[2]) - 1}` : kini.tahun, semester: "Genap" };
}
function panelKeputusanBoleh(sem) {
  return sayaKurikulum() && sem.semester === "Genap" && sem.tahun <= semesterSekarang().tahun;
}
function rapikanTujuan(teks) {
  return String(teks || "").trim().replace(/\s+/g, " ");
}
function labelHasilKeputusan(hasil, akhir, tujuan) {
  if (hasil === "naik") return tujuan ? `Naik ke ${tujuan}` : "Naik kelas";
  if (hasil === "lanjut") return tujuan ? `Lulus, lanjut ke ${tujuan}` : "Lulus, lanjut ke kelas 10";
  if (hasil === "tinggal") return akhir ? "Tidak lulus" : "Tidak naik";
  if (hasil === "lulus") return "Lulus";
  return "Belum diputuskan";
}
const TEKS_STATUS_KEPUTUSAN = {
  menyimpan: "Menyimpan...",
  tersimpan: "Tersimpan",
  menunggu: "Menunggu sinyal (tersimpan di HP, dikirim waktu ada sinyal)",
  gagal: "Gagal menyimpan. Tekan lagi untuk mengulang."
};
function htmlIsiBarisKeputusan(s, no, tahun, status) {
  const k = keputusanTahun(s, tahun);
  const a = kelasSantriDi(s, tahun);
  const akhir = tingkatAkhir(a.jenjang, a.kelas);
  const hasil = k.fase === "terkunci" ? k.hasil : k.fase;
  let label, ket = "", tombol = "";
  if (k.fase === "dilewati") {
    label = s.status === "pindah" ? "Pindah sekolah" : s.status === "lulus" ? "Lulus" : "Nonaktif";
    ket = "Tidak diproses dari sini.";
  } else {
    label = labelHasilKeputusan(hasil, akhir, k.fase === "naik" || k.fase === "lanjut" ? k.tujuan : "");
    if (k.fase === "terkunci") ket = `Terkunci: sudah diproses di ${k.sesudah}. Batalkan keputusan tahun ${k.sesudah} dulu.`;
    // kelas 9 Paket B: lulus (keluar), lulus & lanjut ke kelas 10 di sini, atau tidak lulus
    const lanjut = akhir && a.jenjang === "Paket B";
    const pilihan = akhir ? [["lulus", "Lulus, keluar"], ...(lanjut ? [["lanjut", "Lulus, lanjut ke kelas 10"]] : []), ["tinggal", "Tidak lulus"]] : [["naik", "Naik kelas"], ["tinggal", "Tidak naik"]];
    const mati = k.fase === "terkunci" || status === "menyimpan";
    // I'dad & lulusan kelas 9 yang lanjut: kelas tujuan dipilih per siswa (nggak ditebak)
    const pilihKelas = tujuanDipilihPerSiswa(a.jenjang, a.kelas) ? pilihanKelasTujuan(a.jenjang, a.kelas) : null;
    const kini = k.fase === "naik" || k.fase === "lanjut" ? k.tujuan : "";
    const htmlPilih = pilihKelas ? `<label class="isian-tujuan-siswa">${a.jenjang === JENJANG_IDAD ? "Naik" : "Lanjut"} ke kelas
        <select data-tujuan-siswa${mati ? " disabled" : ""}>
          <option value="">Pilih kelas 10…</option>
          ${pilihKelas.map(x => `<option value="${aman(x)}" ${x === kini ? "selected" : ""}>${aman(x)} (Paket C)</option>`).join("")}
        </select></label>${pilihKelas.length ? "" : `<small class="keputusan-ket">Belum ada kelas 10${hurufRombel(a.kelas) ? " " + (hurufRombel(a.kelas) === "A" ? "putra" : "putri") : ""} di Paket C. Buat mapelnya dulu di menu Mapel.</small>`}` : "";
    tombol = htmlPilih + `<div class="keputusan-tombol">${pilihan.map(([h, t]) =>
      `<button class="tombol-kecil" data-hasil="${h}" aria-pressed="${hasil === h}" aria-label="${aman(t)} ${aman(s.nama)}"${mati ? " disabled" : ""}>${t}</button>`).join("")}${k.fase === "belum" || k.fase === "terkunci" ? "" : `<button class="tombol-kecil keputusan-batal" data-hasil="batal" aria-label="Batalkan keputusan ${aman(s.nama)}"${mati ? " disabled" : ""}>Batalin</button>`}</div>`;
  }
  // status pendek (menyimpan / tersimpan) ditaruh sebaris dengan label, biar waktu hilang tombolnya nggak geser
  const sebaris = status === "menyimpan" || status === "tersimpan";
  const st = status && !sebaris ? `<small class="keputusan-ket ${status === "gagal" ? "gagal" : ""}" role="status">${TEKS_STATUS_KEPUTUSAN[status] || ""}</small>` : "";
  return `<div class="keputusan-info">
      <span class="keputusan-nama"><span class="nomor-santri">${aman(no)}</span>${aman(s.nama)}</span>
      <span class="keputusan-label ${hasil ? "ada" : ""}">${aman(label)}<span class="keputusan-sebaris" role="status">${sebaris ? ` · ${TEKS_STATUS_KEPUTUSAN[status]}` : ""}</span></span>
    </div>
    ${ket ? `<small class="keputusan-ket">${aman(ket)}</small>` : ""}${st}${tombol}`;
}
function htmlPanelKeputusan(mp, sem, santri) {
  if (!panelKeputusanBoleh(sem) || !santri.length) return "";
  const akhir = tingkatAkhir(mp.jenjang, mp.kelas);
  const perSiswa = tujuanDipilihPerSiswa(mp.jenjang, mp.kelas);
  const tujuan = tujuanTebakan(toko.santri, mp.jenjang, mp.kelas, sem.tahun);
  const urutan = pengingatUrutanNaik(mp.jenjang, mp.kelas, sem.tahun);
  return `<section class="panel-keputusan" id="panelKeputusan" aria-labelledby="judulKeputusan">
    <h2 class="subjudul" id="judulKeputusan">Keputusan naik kelas <small>${aman(sem.tahun)} → ${aman(tahunBerikut(sem.tahun))}</small></h2>
    <p class="info"><b>Diisi TU setelah rapat pleno.</b> Tekan tombol di tiap siswa, nanti ada konfirmasi dulu. Keputusan bisa diganti selama tahun ajaran berikutnya belum diproses.${akhir ? ` Kelas tingkat akhir: pilihannya lulus${mp.jenjang === "Paket B" ? ", lulus lalu lanjut ke kelas 10 di sini," : ""} atau tidak lulus.` : perSiswa ? "" : " Mengubah kelas tujuan tidak memindahkan siswa yang sudah terlanjur naik; tekan \"Naik kelas\" lagi di siswanya."}</p>
    ${urutan ? `<p class="pemberitahuan-kecil">${urutan}</p>` : ""}
    ${perSiswa ? `<p class="info">Pilih kelas 10 (Paket C) untuk tiap siswa, lalu tekan tombolnya.</p>` : akhir ? "" : `<label class="isian-tujuan">Naik ke kelas <input id="tujuanKelas" value="${aman(tujuan)}" maxlength="20" autocomplete="off"></label>
    <p class="info" id="infoTujuan" role="status"></p>`}
    <ul class="daftar-keputusan">${santri.map((s, i) =>
      `<li class="baris-keputusan" data-keputusan="${aman(s.id)}" data-no="${aman(noAbsen(kelasSantriDi(s, sem.tahun), i + 1))}">${htmlIsiBarisKeputusan(s, noAbsen(kelasSantriDi(s, sem.tahun), i + 1), sem.tahun, null)}</li>`).join("")}</ul>
  </section>`;
}
// kelas tujuan (tingkat di atasnya / kelas 10 buat I'dad & lulusan kelas 9) yang siswanya belum diproses:
// kalau diproses belakangan, daftar siswa kelas tujuan sementara kecampur siswa lama & baru
function pengingatUrutanNaik(jenjang, kelas, tahun) {
  if (tingkatAkhir(jenjang, kelas) && jenjang !== "Paket B") return "";
  const kePaketC = tujuanDipilihPerSiswa(jenjang, kelas);
  const jenjangAtas = kePaketC ? "Paket C" : jenjang;
  const tingkatAtas = kePaketC ? "10" : String(Number(tingkatKelas(kelas)) + 1);
  const belum = daftarKelas().filter(k => k.jenjang === jenjangAtas && tingkatKelas(k.kelas) === tingkatAtas)
    .filter(k => { const n = hitungKeputusanKelas(k.jenjang, k.kelas, tahun); return n.total && n.sudah < n.total; }).map(k => k.kelas);
  return belum.length ? `<b>Proses kelas tertinggi dulu</b> (9 → 8 → 7, I'dad sebelum kelas 10 diisi). Kelas ${aman(belum.join(", "))} ${aman(jenjangAtas)} belum selesai diproses, jadi jika kelas ini dinaikkan sekarang, daftar siswanya sementara tercampur.` : "";
}
function gambarInfoTujuan() {
  const p = panelKeputusan, info = document.getElementById("infoTujuan"), isian = document.getElementById("tujuanKelas");
  if (!p || !info || !isian) return;
  const t = rapikanTujuan(isian.value);
  info.textContent = t && mapelKelas(p.jenjang, t).length === 0
    ? `Kelas ${t} ${p.jenjang} belum punya mapel. Guru belum bisa melihat siswa kelas itu sampai TU membuat mapel di kelas itu (menu Mapel).`
    : "";
}
// gambar ulang isi satu baris (fokus tombol dipertahankan)
function gambarBarisKeputusan(li, s) {
  const p = panelKeputusan;
  if (!p || !li || !s) return;
  const fokus = li.contains(document.activeElement) ? document.activeElement.dataset.hasil : null;
  li.innerHTML = htmlIsiBarisKeputusan(s, li.dataset.no, p.tahun, p.status.get(s.id));
  if (fokus) {
    const b = li.querySelector(`[data-hasil="${fokus}"]`);
    if (b && !b.disabled) b.focus();
  }
}
function gambarBarisKeputusanId(p, id) {
  if (p !== panelKeputusan) return;
  const li = document.querySelector(`#panelKeputusan [data-keputusan="${CSS.escape(id)}"]`);
  gambarBarisKeputusan(li, toko.santri.find(x => x.id === id));
}
// dipanggil layar.js waktu data santri berubah (mis. dari HP lain): cuma panel ini yang dihitung ulang
function segarkanKeputusan() {
  const p = panelKeputusan, panel = document.getElementById("panelKeputusan");
  if (!p || !panel || !isi.contains(panel)) return;
  panel.querySelectorAll("[data-keputusan]").forEach(li => gambarBarisKeputusan(li, toko.santri.find(x => x.id === li.dataset.keputusan)));
  const isian = document.getElementById("tujuanKelas");
  if (isian && !p.disentuh && document.activeElement !== isian) isian.value = tujuanTebakan(toko.santri, p.jenjang, p.kelas, p.tahun);
  gambarInfoTujuan();
}
function pasangKeputusan(mp, sem, santri) {
  const panel = document.getElementById("panelKeputusan");
  if (!panel) { panelKeputusan = null; return; }
  const p = panelKeputusan = {
    tahun: sem.tahun, jenjang: mp.jenjang, kelas: mp.kelas, akhir: tingkatAkhir(mp.jenjang, mp.kelas),
    status: new Map(), sibuk: new Set(), disentuh: false
  };
  const isian = document.getElementById("tujuanKelas");
  if (isian) isian.oninput = () => { p.disentuh = true; gambarInfoTujuan(); };
  gambarInfoTujuan();
  panel.querySelector(".daftar-keputusan").onclick = (e) => {
    const b = e.target.closest("[data-hasil]");
    const li = b && b.closest("[data-keputusan]");
    if (b && li && !b.disabled) putuskanSantri(p, li.dataset.keputusan, b.dataset.hasil);
  };
}
async function putuskanSantri(p, id, hasil) {
  if (p !== panelKeputusan || p.sibuk.has(id)) return;
  const s = toko.santri.find(x => x.id === id);
  if (!s) return;
  const isian = document.getElementById("tujuanKelas");
  const li = document.querySelector(`#panelKeputusan [data-keputusan="${CSS.escape(id)}"]`);
  const pilihSiswa = li && li.querySelector("[data-tujuan-siswa]");
  const tujuan = pilihSiswa ? pilihSiswa.value : isian ? rapikanTujuan(isian.value) : "";
  if ((hasil === "naik" || hasil === "lanjut") && !tujuan) {
    await kabar(pilihSiswa ? `Pilih dulu kelas 10 untuk ${s.nama}.` : "Isi dulu kelas tujuannya (kotak \"Naik ke kelas\" di atas daftar).");
    (pilihSiswa || isian || { focus() {} }).focus();
    return;
  }
  const k = keputusanTahun(s, p.tahun);
  const cek = ubahKeputusan(s, p.tahun, hasil, tujuan);
  if (cek === s || (!cek && hasil === "batal" && k.fase === "belum")) return;   // udah begitu, nggak ada yang perlu ditulis
  if (!cek) {
    await kabar(k.fase === "terkunci"
      ? `Sudah diproses di ${k.sesudah}. Batalkan keputusan tahun ${k.sesudah} dulu.`
      : "Keputusan ini tidak bisa dipakai untuk siswa ini.");
    gambarBarisKeputusanId(p, id);
    return;
  }
  const a = kelasSantriDi(s, p.tahun);
  let pesan, ya;
  if (hasil === "batal") { pesan = `Batalkan keputusan ${s.nama} (${labelHasilKeputusan(k.fase, p.akhir, k.tujuan)})? Kelasnya dikembalikan ke ${a.kelas}.`; ya = "Batalkan"; }
  else if (hasil === "naik") { pesan = `Naikin ${s.nama} ke ${tujuan}${jenjangTujuan(a.jenjang, "naik") !== a.jenjang ? ` (${jenjangTujuan(a.jenjang, "naik")})` : ""}?`; ya = "Naik kelas"; }
  else if (hasil === "lanjut") { pesan = `${s.nama} lulus dari ${a.kelas} dan lanjut ke ${tujuan} (Paket C)?`; ya = "Lulus, lanjut"; }
  else if (hasil === "lulus") { pesan = `${s.nama} lulus dari ${a.kelas}?`; ya = "Lulus"; }
  else if (p.akhir) { pesan = `${s.nama} tidak lulus (tetap di ${a.kelas})?`; ya = "Tidak lulus"; }
  else { pesan = `${s.nama} tidak naik kelas (tetap ${a.kelas})?`; ya = "Tidak naik"; }
  if (k.fase !== "belum" && hasil !== "batal") pesan += `\n\nKeputusan sebelumnya (${labelHasilKeputusan(k.fase, p.akhir, k.tujuan)}) diganti.`;
  if ((hasil === "naik" || hasil === "lanjut") && mapelKelas(jenjangTujuan(a.jenjang, hasil), tujuan).length === 0) pesan += `\n\nKelas ${tujuan} ${jenjangTujuan(a.jenjang, hasil)} belum punya mapel. Guru belum bisa melihat siswa kelas itu sampai TU membuat mapel di kelas itu (menu Mapel).`;

  p.sibuk.add(id);
  const lanjut = await tanyaYakin(pesan, { ya, bahaya: hasil === "batal" });
  if (!lanjut) { p.sibuk.delete(id); return; }
  // data bisa berubah selama dialog kebuka (HP lain): pakai versi terbaru
  const sebelum = toko.santri.find(x => x.id === id);
  const baru = sebelum && ubahKeputusan(sebelum, p.tahun, hasil, tujuan);
  if (!baru || baru === sebelum) {
    p.sibuk.delete(id);
    if (!baru) await kabar("Data siswa ini baru berubah (mungkin dari perangkat lain), jadi keputusannya tidak disimpan. Periksa lagi lalu tekan ulang.");
    gambarBarisKeputusanId(p, id);
    return;
  }
  p.status.set(id, "menyimpan");
  let janji = Promise.resolve();
  const tersimpan = simpanSantri(baru, j => { janji = j; });
  gambarBarisKeputusanId(p, id);
  if (!navigator.onLine) {                      // antrean offline Firestore yang ngirim nanti, jangan ditunggu
    p.status.set(id, "menunggu");
    p.sibuk.delete(id);
    gambarBarisKeputusanId(p, id);
  }
  janji.then(() => {
    p.sibuk.delete(id);
    p.status.set(id, "tersimpan");
    gambarBarisKeputusanId(p, id);
    setTimeout(() => {
      if (p.status.get(id) !== "tersimpan") return;
      p.status.delete(id);
      gambarBarisKeputusanId(p, id);
    }, 4000);
  }, (err) => {
    console.error(err);
    p.sibuk.delete(id);
    p.status.set(id, "gagal");
    const kini = toko.santri.find(x => x.id === id);
    if (kini && kini.diubah === tersimpan.diubah) {   // balikin ke versi sebelum pencet
      pasangDiDaftar(toko.santri, sebelum);
      toko.santri.sort(bandingNama);
      berubah();
    }
    gambarBarisKeputusanId(p, id);
  });
}
