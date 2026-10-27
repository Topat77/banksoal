// =====================================================
//  uas.js — UAS bersama satu grup mapel
//
//  Grup = mapel yang sama di jenjang & tingkat yang sama,
//  misal Bahasa Indonesia 7A1, 7A2, 7B1, 7B2 (Paket B).
//  Semua kelas di grup pakai UAS yang sama, biar soalnya terstandar.
//
//  Alurnya:
//    admin (TU) nunjuk koordinator tiap grup
//    → koordinator nyusun UAS dari bank soal bersama (status "draf")
//    → guru lain di grup boleh mengusulkan soal; koordinator nerima / nolak
//    → koordinator ngajuin ke TU ("diajukan")
//    → TU periksa, lalu kunci ("dikunci") dan cetak.
//  Susunan soalnya pakai layar sumatif biasa (sumatif.js) dengan posisi.uasGrup.
// =====================================================

function bukaUAS(gid, sem, idMapel) {
  pergi("sumatif", { uasGrup: gid, uasSem: kunciSemester(sem), mapelId: idMapel, sumId: null, usul: false });
}

// guru di grup boleh mengusulkan soal selama UAS belum dikunci
function bisaUsulUAS(u) {
  const g = dataGrup(posisi.uasGrup);
  return !!g && (g.pengampu || []).includes(uidSaya()) && u.status !== "dikunci";
}

function namaKoordinator(gid) {
  const uid = koordinatorGrup(gid);
  if (!uid) return "";
  const m = mapelGrup(gid).find(x => (x.namaPengampu || {})[uid]);
  return namaPengguna(uid) || (m ? m.namaPengampu[uid] : "");
}

function tandaStatusUAS(u) {
  if (!u) return `<span class="tanda tanda-tutup">Belum disusun</span>`;
  const st = STATUS_UAS[u.status] || STATUS_UAS.draf;
  return `<span class="tanda tanda-uas-${aman(u.status)}">${st.nama}</span>`;
}

// ---- kartu di tab Sumatif halaman mapel ----
function htmlKartuUAS(mp, sem) {
  const gid = idGrup(mp);
  const g = dataGrup(gid);
  const u = uasGrup(gid, sem);
  const koor = koordinatorGrup(gid);
  const saya = sayaKoordinator(gid);
  const kelas = mapelGrup(gid).map(x => x.kelas).join(", ");
  const usulan = usulanGrup(gid, sem);

  let h = `<section class="kartu-uas">
    <div class="kartu-uas-atas">
      <h2>UAS bersama <small>${aman(namaGrup(mp))}</small></h2>
      ${tandaStatusUAS(u)}
    </div>
    <p class="info">Satu UAS untuk semua kelas: ${aman(kelas)}. Koordinator: <b>${aman(namaKoordinator(gid) || "belum ditunjuk TU")}</b>${saya ? " (kamu)" : ""}.</p>`;
  if (u) {
    h += `<p class="info">${(u.butir || []).length} soal${usulan.length ? ` · ${usulan.length} usulan soal menunggu` : ""}</p>`;
    h += `<div class="baris-tombol"><button class="tombol-kedua" id="bukaUAS">Buka UAS</button></div>`;
  } else if (saya) {
    h += `<div class="baris-tombol"><button class="tombol-utama" id="mulaiUAS">Mulai susun UAS ${aman(namaSemester(sem))}</button></div>`;
  } else if (!g || !koor) {
    h += `<p class="info">TU belum menunjuk koordinator untuk grup ini.</p>`;
  } else {
    h += `<p class="info">Belum disusun koordinator. Nanti kamu bisa mengusulkan soal di sini.</p>`;
  }
  return h + `</section>`;
}

function pasangKartuUAS(mp, sem) {
  const gid = idGrup(mp);
  const buka = document.getElementById("bukaUAS");
  if (buka) buka.onclick = () => bukaUAS(gid, sem, mp.id);
  const mulai = document.getElementById("mulaiUAS");
  if (mulai) mulai.onclick = () => {
    simpanUAS(gid, {
      id: idLembarNilai(sem), semester: sem.semester, tahun: sem.tahun,
      nama: "Sumatif Akhir Semester", pelaksanaan: "", status: "draf", butir: []
    });
    bukaUAS(gid, sem, mp.id);
  };
}

// ---- bagian alur di layar UAS: tombol, keterangan, dan usulan soal (di bawah daftar soal) ----
function htmlTombolUAS(u, jumlah) {
  const gid = posisi.uasGrup;
  const g = dataGrup(gid);
  const saya = sayaKoordinator(gid);
  const kur = sayaKurikulum();
  const anggota = !!g && (g.pengampu || []).includes(uidSaya());
  let h = "";

  if (saya && u.status === "draf") h += `<button class="tombol-utama" id="ajukanUAS" ${jumlah ? "" : "disabled"}>Ajukan ke TU</button>`;
  if (saya && u.status === "diajukan") h += `<button class="tombol-kedua" id="tarikUAS">Tarik kembali untuk diubah</button>`;
  if (kur && u.status !== "dikunci") h += `<button class="tombol-utama" id="kunciUAS" ${jumlah ? "" : "disabled"}>Kunci UAS</button>`;
  if (kur && u.status === "diajukan") h += `<button class="tombol-kedua" id="kembalikanUAS">Kembalikan ke koordinator</button>`;
  if (kur && u.status === "dikunci") h += `<button class="tombol-kedua" id="bukaKunciUAS">Buka kunci</button>`;
  if (anggota && !saya && u.status !== "dikunci") {
    h += `<button class="tombol-kedua" id="usulkan">Usulkan soal dari modul</button>
      <button class="tombol-kedua tombol-ai" id="usulAI">${IKON_AI}<span>Usulkan soal pakai AI</span></button>`;
  }
  return h;
}

function htmlKetUAS(u) {
  const saya = sayaKoordinator(posisi.uasGrup);
  const kur = sayaKurikulum();
  let h = "";
  if (saya && u.status === "diajukan") h += `<p class="info">Sudah diajukan. Selama menunggu TU, soalnya nggak bisa diubah. Tarik kembali kalau masih ada yang mau diganti.</p>`;
  if (!saya && !kur && u.status !== "dikunci") h += `<p class="info">Yang menyusun UAS ini koordinator. Kamu bisa mengusulkan soal dari modulmu atau modul yang dibagikan.</p>`;
  if (!kur) h += `<p class="info">Cetak soal UAS dilakukan TU setelah UAS dikunci.</p>`;
  return h;
}

function htmlUsulanUAS(u) {
  const gid = posisi.uasGrup;
  const saya = sayaKoordinator(gid);
  const kur = sayaKurikulum();
  const usulan = usulanGrup(gid, u);
  let h = "";
  // usulan: koordinator & TU lihat semua, guru lain lihat punyanya sendiri
  const tampil = saya || kur ? usulan : usulan.filter(milikSaya);
  if (tampil.length) {
    h += `<h2 class="subjudul">${saya || kur ? "Usulan soal dari guru" : "Usulan kamu"} <small>${tampil.length} soal</small></h2>`;
    if (saya && u.status === "draf") h += `<p class="info">Terima buat memasukkan soal ke UAS, atau tolak.</p>`;
    tampil.forEach((x, i) => {
      if (!x.salinan || !x.salinan.soal) return;
      h += kartuSoal(x.salinan.soal, {
        nomor: i + 1, mode: "lihat", bacaan: x.salinan.bacaan,
        asal: `Usulan ${aman(x.namaPemilik || "")}${x.salinan.judulModul ? ` · <span dir="auto">${aman(potong(x.salinan.judulModul, 28))}</span>` : ""}`
      });
      const bisaPutus = saya && u.status === "draf";
      const bisaTarik = milikSaya(x) && u.status !== "dikunci";
      if (bisaPutus || bisaTarik) {
        h += `<div class="baris-tombol aksi-usulan">
          ${bisaPutus ? `<button class="tombol-kecil" data-terima="${aman(x.id)}">Terima</button>
          <button class="tombol-kecil" data-tolak="${aman(x.id)}">Tolak</button>` : ""}
          ${bisaTarik && !bisaPutus ? `<button class="tombol-kecil" data-tolak="${aman(x.id)}">Tarik usulan</button>` : ""}
        </div>`;
      }
    });
  }
  return h;
}

function pasangAlurUAS(mp, u) {
  const gid = posisi.uasGrup;
  const klik = (id, f) => { const el = document.getElementById(id); if (el) el.onclick = f; };
  // dipakai setelah dialog konfirmasi: ambil versi UAS terbaru, siapa tau berubah selama dialog kebuka
  const ganti = (perubahan) => {
    const t = (toko.uas[gid] || []).find(x => x.id === u.id) || u;
    simpanUAS(gid, { ...t, ...perubahan });
    tampilkan(true);
  };

  klik("ajukanUAS", async () => {
    if (!(await tanyaYakin(`Ajukan ${u.nama} ke TU?\n\nSetelah diajukan, soalnya nggak bisa diubah sampai kamu tarik kembali atau TU mengembalikannya.`, { ya: "Ajukan" }))) return;
    ganti({ status: "diajukan", diajukan: Date.now() });
  });
  klik("tarikUAS", () => ganti({ status: "draf" }));
  klik("kembalikanUAS", () => ganti({ status: "draf" }));
  klik("kunciUAS", async () => {
    if (!(await tanyaYakin(`Kunci ${u.nama}?\n\nSoalnya jadi final untuk semua kelas di grup ini dan nggak bisa diubah koordinator lagi.`, { ya: "Kunci UAS" }))) return;
    ganti({ status: "dikunci", dikunci: Date.now(), dikunciOleh: uidSaya(), namaPengunci: namaSaya() });
  });
  klik("bukaKunciUAS", async () => {
    if (!(await tanyaYakin("Buka kunci? UAS kembali jadi draf dan bisa diubah koordinator lagi.", { ya: "Buka kunci" }))) return;
    ganti({ status: "draf" });
  });
  klik("usulkan", () => pergi("pilihSoal", { usul: true }));
  klik("usulAI", () => pergi("aiSoal", { aiUntuk: "sumatif", usul: true }));

  isi.querySelectorAll("[data-terima]").forEach(b => {
    b.onclick = () => {
      const x = (toko.usulan[gid] || []).find(y => y.id === b.dataset.terima);
      if (!x) return;
      const butir = [...(u.butir || [])];
      if (!butir.some(y => kunciButir(y) === kunciButir(x))) {
        butir.push({ modulId: x.modulId, soalId: x.soalId, salinan: salin(x.salinan) });
      }
      simpanUAS(gid, { ...u, butir });
      hapusUsulan(gid, x.id);
      tampilkan(true);
    };
  });
  isi.querySelectorAll("[data-tolak]").forEach(b => {
    b.onclick = async () => {
      const x = (toko.usulan[gid] || []).find(y => y.id === b.dataset.tolak);
      if (!x) return;
      if (!(await tanyaYakin(milikSaya(x) ? "Tarik usulan soal ini?" : `Tolak usulan dari ${x.namaPemilik || "guru ini"}?`, { bahaya: true, ya: milikSaya(x) ? "Tarik" : "Tolak" }))) return;
      hapusUsulan(gid, x.id);
      tampilkan(true);
    };
  });
}

// =====================================================
//  DAFTAR UAS BERSAMA (khusus admin): koordinator & status tiap grup
// =====================================================
function layarDaftarUAS() {
  wajibKurikulum();
  const jenjang = jenjangAktif();
  const semAda = semesterRapor();
  const kunciSem = posisi.semUAS && semAda.some(x => kunciSemester(x) === posisi.semUAS) ? posisi.semUAS : kunciSemester(semAda[0]);
  posisi.semUAS = kunciSem;
  const sem = dariKunciSemester(kunciSem);

  judul.textContent = "UAS bersama";
  jejak.textContent = `${jenjang} · ${namaSemester(sem)}`;

  // grup di jenjang ini: per jenis (diniah, umum), lalu urut nama mapel & tingkat
  const grup = [...new Set(toko.mapel.filter(m => m.jenjang === jenjang).map(idGrup))]
    .map(gid => ({ gid, mapel: mapelGrup(gid) }))
    .sort((a, b) => (URUT_JENIS.indexOf(jenisMapel(a.mapel[0])) - URUT_JENIS.indexOf(jenisMapel(b.mapel[0]))) ||
      a.mapel[0].nama.localeCompare(b.mapel[0].nama, "id") ||
      (Number(tingkatKelas(a.mapel[0].kelas)) - Number(tingkatKelas(b.mapel[0].kelas))));

  let h = htmlTabJenjang() + `<div class="pilih-semester" role="group" aria-label="Semester">`;
  for (const x of semAda) {
    const k = kunciSemester(x);
    h += `<button class="chip ${k === kunciSem ? "aktif" : ""}" data-sem="${aman(k)}" aria-pressed="${k === kunciSem}">${aman(namaSemester(x))}</button>`;
  }
  h += `</div>
    <p class="info">Mapel yang sama di tingkat yang sama otomatis jadi satu grup dan memakai satu UAS. Tunjuk satu koordinator tiap grup: dia yang menyusun UAS-nya, guru lain bisa mengusulkan soal. Setelah diajukan, periksa lalu kunci dan cetak.</p>`;

  const menunggu = grup.filter(x => (uasGrup(x.gid, sem) || {}).status === "diajukan").length;
  if (menunggu) h += `<div class="pemberitahuan"><p><b>${menunggu} UAS</b> sudah diajukan koordinator dan menunggu diperiksa.</p></div>`;

  if (grup.length === 0) {
    h += `<p class="kosong">Belum ada mapel ${aman(jenjang)}.</p>`;
  } else {
    let jenisTadi = null;
    for (const { gid, mapel } of grup) {
      if (jenisMapel(mapel[0]) !== jenisTadi) {
        if (jenisTadi) h += `</div>`;
        jenisTadi = jenisMapel(mapel[0]);
        h += `<h2 class="subjudul">Mapel ${namaJenis(jenisTadi).toLowerCase()} <small>${grup.filter(x => jenisMapel(x.mapel[0]) === jenisTadi).length} grup</small></h2><div class="daftar-uas">`;
      }
      const u = uasGrup(gid, sem);
      const g = dataGrup(gid);
      const pengampu = g ? (g.pengampu || []) : [];
      const nama = (uid) => namaPengguna(uid) || (mapel.find(m => (m.namaPengampu || {})[uid]) || { namaPengampu: {} }).namaPengampu[uid] || "Tanpa nama";
      const usulan = usulanGrup(gid, sem).length;
      h += `
        <section class="kartu-uas">
          <div class="kartu-uas-atas">
            <h2>${aman(mapel[0].nama)} <small>kelas ${aman(tingkatKelas(mapel[0].kelas))} · ${aman(mapel.map(m => m.kelas).join(", "))}</small></h2>
            ${tandaStatusUAS(u)}
          </div>
          <label class="pilih-koordinator">Koordinator
            <select data-koordinator="${aman(gid)}" ${g ? "" : "disabled"}>
              <option value="" data-ket="Belum ada yang menyusun UAS grup ini">Belum ditunjuk</option>
              ${pengampu.map(uid => `<option value="${aman(uid)}" data-ket="Ngajar ${aman(mapel.filter(m => (m.pengampu || []).includes(uid)).map(m => m.kelas).join(", "))}" ${g && g.koordinator === uid ? "selected" : ""}>${aman(nama(uid))}</option>`).join("")}
            </select>
          </label>
          ${!g ? `<p class="info">Grup ini baru dibuat, tunggu sebentar…</p>` : pengampu.length === 0 ? `<p class="info">Belum ada pengampu di grup ini.</p>` : ""}
          <p class="info">${u ? `${(u.butir || []).length} soal${usulan ? ` · ${usulan} usulan menunggu` : ""}${u.status === "dikunci" && u.namaPengunci ? ` · dikunci ${aman(u.namaPengunci)}` : ""}` : "UAS semester ini belum disusun."}</p>
          ${u ? `<div class="baris-tombol"><button class="tombol-kedua" data-buka-uas="${aman(gid)}">${u.status === "dikunci" ? "Buka &amp; cetak" : "Periksa"}</button></div>` : ""}
        </section>`;
    }
    h += `</div>`;
  }
  isi.innerHTML = h;
  pasangTabJenjang("daftarUAS");

  isi.querySelectorAll(".chip[data-sem]").forEach(b => { b.onclick = () => pergi("daftarUAS", { semUAS: b.dataset.sem }); });
  isi.querySelectorAll("[data-koordinator]").forEach(sel => {
    sel.onchange = () => simpanKoordinator(sel.dataset.koordinator, sel.value || null);
  });
  isi.querySelectorAll("[data-buka-uas]").forEach(b => {
    b.onclick = () => bukaUAS(b.dataset.bukaUas, sem, mapelGrup(b.dataset.bukaUas)[0].id);
  });
}
