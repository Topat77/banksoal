// =====================================================
//  kurikulum.js — layar khusus admin (TU):
//  akun, mapel & pengampu, pantauan
// =====================================================

function wajibKurikulum() {
  if (!sayaKurikulum()) throw new DataHilang();
}

// =====================================================
//  AKUN: setujui / tolak / atur peran
// =====================================================
function layarAkun() {
  wajibKurikulum();
  judul.textContent = "Guru";
  jejak.textContent = "Akun guru & staf TU yang boleh memakai aplikasi";

  const semua = [...toko.pengguna].sort((a, b) => (a.nama || "").localeCompare(b.nama || "", "id"));
  const menunggu = semua.filter(p => p.peran === "menunggu").sort((a, b) => (b.dibuat || 0) - (a.dibuat || 0));
  const aktif = semua.filter(p => PERAN_AKTIF.includes(p.peran));
  const lain = semua.filter(p => p.peran === "ditolak" || p.peran === "nonaktif");

  const mapelOrang = (uid) => toko.mapel.filter(m => (m.pengampu || []).includes(uid)).map(namaMapel);


  const pilihSapaan = (p) => `
          <label class="pilih-peran">Sapaan
            <select data-sapaan="${p.id}">
              <option value="" ${!sapaanPengguna(p) ? "selected" : ""}>Belum diatur</option>
              <option value="ustadz" ${sapaanPengguna(p) === "ustadz" ? "selected" : ""}>Ustadz</option>
              <option value="ustadzah" ${sapaanPengguna(p) === "ustadzah" ? "selected" : ""}>Ustadzah</option>
            </select>
          </label>`;
  let h = `<h2 class="subjudul">Menunggu persetujuan <small>${menunggu.length} akun</small></h2>`;
  if (menunggu.length === 0) {
    h += `<p class="info">Nggak ada yang menunggu. Akun baru muncul di sini setelah ustadz/ustadzah masuk pakai akun Google-nya.</p>`;
  } else {
    h += `<p class="info">Pastikan nama dan emailnya memang ustadz/ustadzah atau staf TU di lembaga ini. Siswa atau orang luar jangan disetujui. Akun yang disetujui jadi ustadz/ustadzah dulu; kalau dia staf TU, perannya bisa diganti jadi admin di daftar akun aktif.</p>`;
    for (const p of menunggu) {
      h += `
        <article class="kartu-akun menunggu">
          <div class="kartu-akun-isi">
            <strong>${aman(p.nama)}</strong>
            <span>${aman(p.email)}</span>
            <small>Daftar ${aman(waktuRapi(p.dibuat))}</small>
          </div>
          <div class="baris-tombol">
            ${pilihSapaan(p)}
            <button class="tombol-utama" data-setujui="${p.id}">Setujui</button>
            <button class="tombol-teks merah" data-tolak="${p.id}">Tolak</button>
          </div>
        </article>`;
    }
  }

  // ---- daftar guru aktif: tabel (di HP jadi kartu) ----
  h += `<h2 class="subjudul">Daftar guru <small>${aktif.length} akun aktif</small></h2>
    <input type="search" class="cari-guru" id="cariGuru" placeholder="Cari nama, NIP, atau mapel" aria-label="Cari guru">
    <div class="wadah-tabel-guru"><table class="tabel-guru">
      <thead><tr><th>No</th><th>Nama guru</th><th>NIP</th><th>Mapel yang diampu</th><th>Status</th><th><span class="sr">Aksi</span></th></tr></thead>
      <tbody>${aktif.map((p, i) => {
        const ampu = mapelOrang(p.id);
        const sap = sapaanPengguna(p);
        const cari = [p.nama, p.email, p.nip, ...ampu].join(" ").toLowerCase();
        return `<tr data-cari="${aman(cari)}">
          <td class="kol-no">${i + 1}</td>
          <td class="kol-nama"><span class="nama-guru"><b>${aman(p.nama)}${p.id === uidSaya() ? " (kamu)" : ""}</b><small>${sap ? SAPAAN[sap] + " · " : ""}${aman(p.email)}</small></span></td>
          <td class="kol-nip">${aman(p.nip || "")}</td>
          <td class="kol-mapel"><span class="mapel-guru">${ampu.length ? aman(ampu.join(", ")) : "Belum mengampu mapel"}</span></td>
          <td class="kol-status"><span class="tanda-status ${p.peran === "kurikulum" ? "admin" : ""}">${p.peran === "kurikulum" ? "Admin TU" : "Aktif"}</span></td>
          <td class="kol-aksi"><button class="tombol-kecil" data-ubah-guru="${p.id}">Ubah</button></td>
        </tr>`;
      }).join("")}</tbody>
    </table></div>
    <p class="info" id="cariGuruKosong" hidden>Nggak ada guru yang cocok.</p>`;

  if (lain.length) {
    h += `<h2 class="subjudul">Ditolak &amp; nonaktif <small>${lain.length} akun</small></h2><div class="daftar-akun">`;
    for (const p of lain) {
      h += `
        <article class="kartu-akun redup">
          <div class="kartu-akun-isi">
            <strong>${aman(p.nama)}</strong>
            <span>${aman(p.email)}</span>
            <small>${p.peran === "ditolak" ? "Ditolak" : "Dinonaktifkan"}</small>
          </div>
          <div class="baris-tombol"><button class="tombol-kedua" data-aktifkan="${p.id}">Aktifkan sebagai ustadz</button></div>
        </article>`;
    }
    h += `</div>`;
  }
  isi.innerHTML = h;

  const cari = document.getElementById("cariGuru");
  cari.oninput = () => {
    const kata = cari.value.trim().toLowerCase();
    let ada = 0;
    isi.querySelectorAll(".tabel-guru tbody tr").forEach(tr => {
      const cocok = !kata || tr.dataset.cari.includes(kata);
      tr.hidden = !cocok;
      if (cocok) ada++;
    });
    document.getElementById("cariGuruKosong").hidden = ada > 0;
  };
  isi.querySelectorAll("[data-ubah-guru]").forEach(b => b.onclick = () => pergi("formGuru", { guruId: b.dataset.ubahGuru }));

  const ubahPeran = (uid, peran) => {
    const p = toko.pengguna.find(x => x.id === uid);
    if (!p) return;
    const { id, ...data } = p;
    simpanPengguna(uid, { ...data, peran, diubahOleh: uidSaya(), diubah: Date.now() });
    tampilkan(true);
  };
  isi.querySelectorAll("[data-setujui]").forEach(b => b.onclick = () => ubahPeran(b.dataset.setujui, "ustadz"));
  isi.querySelectorAll("[data-sapaan]").forEach(sel => {
    sel.onchange = () => {
      const p = toko.pengguna.find(x => x.id === sel.dataset.sapaan);
      if (!p) return;
      const kelasA = toko.mapel.filter(m => kelasPutra(m.kelas) && (m.pengampu || []).includes(p.id));
      if (sel.value === "ustadzah" && kelasA.length &&
          !confirm(`Peringatan: ${p.nama} masih tercatat ngajar di kelas putra (${kelasA.map(namaMapel).join(", ")}).\n\nUstadzah nggak boleh ngajar siswa putra. Tetap simpan sebagai ustadzah? Jangan lupa ganti pengampu mapel tersebut.`)) {
        sel.value = sapaanPengguna(p) || "";
        return;
      }
      const { id, ...data } = p;
      simpanPengguna(p.id, { ...data, sapaan: sel.value || null });
    };
  });
  isi.querySelectorAll("[data-aktifkan]").forEach(b => b.onclick = () => ubahPeran(b.dataset.aktifkan, "ustadz"));
  isi.querySelectorAll("[data-tolak]").forEach(b => {
    b.onclick = () => {
      const p = toko.pengguna.find(x => x.id === b.dataset.tolak);
      if (confirm(`Tolak ${p.nama} (${p.email})? Akun ini nggak bisa membuka isi aplikasi.`)) ubahPeran(p.id, "ditolak");
    };
  });
  isi.querySelectorAll("[data-nonaktif]").forEach(b => {
    b.onclick = () => {
      const p = toko.pengguna.find(x => x.id === b.dataset.nonaktif);
      if (confirm(`Nonaktifkan ${p.nama}? Modul dan soalnya tetap tersimpan, cuma dia nggak bisa masuk sampai diaktifkan lagi.`)) ubahPeran(p.id, "nonaktif");
    };
  });
  isi.querySelectorAll("[data-peran]").forEach(sel => {
    sel.onchange = () => {
      const p = toko.pengguna.find(x => x.id === sel.dataset.peran);
      const ke = sel.value === "kurikulum" ? "admin (TU)" : "ustadz/ustadzah";
      const ket = sel.value === "kurikulum" ? "\n\nAdmin bisa menyetujui akun, mengatur mapel, daftar siswa, bobot nilai, dan rapor." : "";
      if (!confirm(`Jadikan ${p.nama} sebagai ${ke}?${ket}`)) { sel.value = p.peran; return; }
      ubahPeran(p.id, sel.value);
    };
  });
}

// =====================================================
//  UBAH DATA GURU: nama, NIP, sapaan, peran, nonaktifkan
// =====================================================
function formGuru() {
  wajibKurikulum();
  const p = butuh(toko.pengguna.find(x => x.id === posisi.guruId && PERAN_AKTIF.includes(x.peran)));
  const diriSendiri = p.id === uidSaya();
  const ampu = toko.mapel.filter(m => (m.pengampu || []).includes(p.id));
  judul.textContent = "Ubah data guru";
  jejak.textContent = p.email || "";
  tombolKembali.hidden = false;

  isi.innerHTML = `
    <form id="form">
      <label>Nama yang tampil <input name="nama" value="${aman(p.nama || "")}" required></label>
      <label>NIP <input name="nip" value="${aman(p.nip || "")}" inputmode="numeric" placeholder="Boleh dikosongkan" maxlength="30" autocomplete="off"></label>
      <div class="dua-kolom">
        <label>Sapaan
          <select name="sapaan">
            <option value="" ${!sapaanPengguna(p) ? "selected" : ""}>Belum diatur</option>
            <option value="ustadz" ${sapaanPengguna(p) === "ustadz" ? "selected" : ""}>Ustadz</option>
            <option value="ustadzah" ${sapaanPengguna(p) === "ustadzah" ? "selected" : ""}>Ustadzah</option>
          </select>
        </label>
        <label>Peran
          <select name="peran" ${diriSendiri ? "disabled" : ""}>
            <option value="ustadz" ${p.peran === "ustadz" ? "selected" : ""}>Guru (ustadz/ustadzah)</option>
            <option value="kurikulum" ${p.peran === "kurikulum" ? "selected" : ""}>Admin (TU)</option>
          </select>
        </label>
      </div>
      ${diriSendiri ? `<p class="info">Peran akunmu sendiri nggak bisa diganti dari sini.</p>` : ""}
      <p class="info">Mengampu: ${ampu.length ? aman(ampu.map(namaMapel).join(", ")) : "belum ada mapel"}. Atur di halaman Mapel &amp; pengampu.</p>
      <button type="submit" class="tombol-utama">Simpan</button>
      ${diriSendiri ? "" : `<button type="button" class="tombol-hapus" id="nonaktif">Nonaktifkan akun ini</button>`}
    </form>`;

  const form = document.getElementById("form");
  form.onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(form);
    const nama = f.get("nama").trim();
    const nip = f.get("nip").trim().replace(/\s+/g, " ");
    const sapaan = f.get("sapaan") || null;
    const peran = diriSendiri ? p.peran : f.get("peran");
    if (!nama) return;
    if (nip && !/^[0-9 ]+$/.test(nip)) return alert("NIP cuma boleh berisi angka (dan spasi).");
    const kembar = nip && toko.pengguna.find(x => x.id !== p.id && (x.nip || "").replace(/\s/g, "") === nip.replace(/\s/g, ""));
    if (kembar && !confirm(`NIP ini sudah dipakai ${kembar.nama}. Tetap simpan?`)) return;
    const kelasA = ampu.filter(m => kelasPutra(m.kelas));
    if (sapaan === "ustadzah" && kelasA.length &&
        !confirm(`Peringatan: ${nama} masih tercatat ngajar di kelas putra (${kelasA.map(namaMapel).join(", ")}).\n\nUstadzah nggak boleh ngajar siswa putra. Tetap simpan sebagai ustadzah? Jangan lupa ganti pengampu mapel tersebut.`)) return;
    if (peran !== p.peran && !confirm(`Jadikan ${nama} sebagai ${peran === "kurikulum" ? "admin (TU)" : "guru"}?${peran === "kurikulum" ? "\n\nAdmin bisa menyetujui akun, mengatur mapel, daftar siswa, bobot nilai, dan rapor." : ""}`)) return;
    const terbaru = toko.pengguna.find(x => x.id === p.id) || p;
    const { id, ...data } = terbaru;
    simpanPengguna(p.id, { ...data, nama, nip, sapaan, peran, diubahOleh: uidSaya(), diubah: Date.now() });
    pergi("akun");
  };
  const nonaktif = document.getElementById("nonaktif");
  if (nonaktif) nonaktif.onclick = () => {
    if (!confirm(`Nonaktifkan ${p.nama}? Modul dan soalnya tetap tersimpan, cuma dia nggak bisa masuk sampai diaktifkan lagi.`)) return;
    const { id, ...data } = p;
    simpanPengguna(p.id, { ...data, peran: "nonaktif", diubahOleh: uidSaya(), diubah: Date.now() });
    pergi("akun");
  };
}

// =====================================================
//  MAPEL & PENGAMPU
// =====================================================
const KELAS_SD  = ["Kelas 1", "Kelas 2", "Kelas 3", "Kelas 4", "Kelas 5", "Kelas 6"];
const KELAS_SMP = ["Kelas 7", "Kelas 8", "Kelas 9"];
const KELAS_SMA = ["Kelas 10", "Kelas 11", "Kelas 12"];
const KELAS_PER_JENJANG = {
  "Paket A": KELAS_SD, "Paket B": KELAS_SMP, "Paket C": KELAS_SMA,
  "SD": KELAS_SD, "SMP": KELAS_SMP, "SMA": KELAS_SMA
};
// jenjang yang ada di PKBM Imam Syafi'i
const JENJANG_PKBM = ["Paket B", "Paket C"];

// rombel A = putra, B = putri (misal 7A2 putra, 7B2 putri).
// Ustadz boleh ngajar kelas putri, tapi ustadzah nggak boleh ngajar kelas putra.
function kelasPutra(kelas) {
  return /^\s*\d+\s*A/i.test(kelas || "");
}
// pengampu yang nggak sesuai aturan di satu mapel: ustadzah di kelas putra
function pengampuTakSesuai(mp) {
  if (!kelasPutra(mp.kelas)) return [];
  return (mp.pengampu || []).filter(uid => sapaanPengguna(toko.pengguna.find(p => p.id === uid)) === "ustadzah");
}
function namaPengampuMapel(mp, uid) {
  return namaPengguna(uid) || (mp.namaPengampu || {})[uid] || "";
}

// =====================================================
//  PANEL JENJANG (khusus admin): Paket B dan Paket C dipisah
//  Pilihan jenjang diingat, jadi pindah ke layar lain tetap di jenjang yang sama.
// =====================================================
const KUNCI_JENJANG = "banksoal-jenjang-admin";
function daftarJenjang() {
  const ada = new Set([...toko.mapel.map(m => m.jenjang), ...toko.santri.map(x => x.jenjang)].filter(Boolean));
  const urut = Object.keys(KELAS_PER_JENJANG);
  return [...new Set([...JENJANG_PKBM, ...ada])].sort((a, b) => urut.indexOf(a) - urut.indexOf(b));
}
function jenjangAktif() {
  const semua = daftarJenjang();
  const pilih = posisi.jenjangAdmin || bacaLokal(KUNCI_JENJANG, "");
  return semua.includes(pilih) ? pilih : semua[0];
}
function pilihJenjang(j) {
  posisi.jenjangAdmin = j;
  tulisLokal(KUNCI_JENJANG, j);
}
// tab Paket B | Paket C; ke = nama layar yang digambar ulang
function htmlTabJenjang() {
  const aktif = jenjangAktif();
  return `<div class="tab-jenjang" role="tablist" aria-label="Jenjang">${daftarJenjang().map(j => {
    const n = toko.mapel.filter(m => m.jenjang === j).length;
    return `<button role="tab" data-jenjang="${aman(j)}" class="${j === aktif ? "aktif" : ""}" aria-selected="${j === aktif}">${aman(j)}<small>${n} mapel</small></button>`;
  }).join("")}</div>`;
}
function pasangTabJenjang(ke, tambahan = {}) {
  isi.querySelectorAll(".tab-jenjang [data-jenjang]").forEach(b => {
    b.onclick = () => { pilihJenjang(b.dataset.jenjang); pergi(ke, tambahan); };
  });
}

function layarKelolaMapel() {
  wajibKurikulum();
  judul.textContent = "Mapel & pengampu";
  jejak.textContent = toko.lembaga.nama || KONFIG.namaLembaga || "";

  const jenjang = jenjangAktif();
  const daftar = toko.mapel.filter(m => m.jenjang === jenjang)
    .sort((a, b) => bandingKelas(a, b) || a.nama.localeCompare(b.nama, "id"));
  jejak.textContent = jenjang;
  let h = htmlTabJenjang() + `<p class="info">Mapel dibuat di sini, lalu tentukan ustadz/ustadzah pengampunya. Satu mapel boleh diampu lebih dari satu orang.</p>`;
  const salah = daftar.filter(m => pengampuTakSesuai(m).length);
  if (salah.length) {
    h += `<div class="pemberitahuan-kecil"><b>Perlu dicek:</b> ada ustadzah yang tercatat ngajar di kelas putra (${aman(salah.map(namaMapel).join(", "))}). Ustadzah nggak boleh ngajar siswa putra.</div>`;
  }
  if (daftar.length === 0) {
    h += `<p class="kosong">Belum ada mapel ${aman(jenjang)}.</p>`;
  }
  for (const k of kelompokJenis(daftar)) {
    h += `<h2 class="subjudul">Mapel ${namaJenis(k.jenis).toLowerCase()} <small>${k.mapel.length} mapel</small></h2><div class="daftar">`;
    for (const m of k.mapel) {
      const nama = (m.pengampu || []).map(u => namaPengguna(u) || (m.namaPengampu || {})[u]).filter(Boolean);
      const takSesuai = pengampuTakSesuai(m);
      h += htmlBaris({
        attr: `data-mapel="${m.id}"`,
        judulBaris: aman(m.nama),
        sub: `${aman(m.kelas)} · ${nama.length ? aman(nama.join(", ")) : "<em>belum ada pengampu</em>"}`,
        tanda: takSesuai.length ? "Ustadzah di kelas putra" : nama.length ? "" : "Belum ada pengampu",
        tandaJenis: takSesuai.length ? "tanda-ragu" : "tanda-tutup"
      });
    }
    h += `</div>`;
  }
  h += `<button class="tombol-utama" id="tambah">+ Tambah mapel ${aman(jenjang)}</button>`;
  isi.innerHTML = h;
  pasangTabJenjang("kelolaMapel", { dariMapel: false });

  document.getElementById("tambah").onclick = () => pergi("formMapel", { mapelEditId: null, dariMapel: false });
  isi.querySelectorAll(".baris[data-mapel]").forEach(b => {
    b.onclick = () => pergi("formMapel", { mapelEditId: b.dataset.mapel, dariMapel: false });
  });
}

function formMapel() {
  wajibKurikulum();
  const lama = posisi.mapelEditId ? butuh(cariMapel(posisi.mapelEditId)) : null;
  const terakhir = toko.mapel[toko.mapel.length - 1];
  const m = lama ? salin(lama) : { nama: "", jenjang: jenjangAktif() || (terakhir ? terakhir.jenjang : "Paket B"), kelas: "", jenis: "umum", pengampu: [] };

  judul.textContent = lama ? "Ubah mapel" : "Tambah mapel";
  jejak.textContent = lama ? namaMapel(lama) : "";
  tombolKembali.hidden = false;

  // cuma jenjang PKBM (plus jenjang lama mapel ini kalau beda)
  const opsiJenjang = [...new Set([...JENJANG_PKBM, m.jenjang].filter(Boolean))]
    .map(j => `<label class="radio"><input type="radio" name="jenjang" value="${aman(j)}" ${m.jenjang === j ? "checked" : ""} required> ${aman(j)}</label>`).join("");

  const calon = toko.pengguna.filter(p => PERAN_AKTIF.includes(p.peran))
    .sort((a, b) => (a.nama || "").localeCompare(b.nama || "", "id"));
  const pilihPengampu = calon.length ? calon.map(p => `
      <label class="centang">
        <input type="checkbox" name="pengampu" value="${p.id}" data-sapaan-pengampu="${aman(sapaanPengguna(p) || "")}" ${(m.pengampu || []).includes(p.id) ? "checked" : ""}>
        <span class="isi-centang"><b>${aman(p.nama)}</b><small>${sapaanPengguna(p) ? `${SAPAAN[sapaanPengguna(p)]} · ` : ""}${aman(p.email)}</small></span>
      </label>`).join("") : `<p class="info">Belum ada akun aktif. Setujui akun ustadz dulu di halaman Akun.</p>`;

  isi.innerHTML = `
    <form id="form">
      <label>Mata pelajaran <input name="nama" value="${aman(m.nama)}" placeholder="Bahasa Indonesia" required></label>
      <fieldset>
        <legend>Jenjang</legend>
        <div class="pilih-jenis">${opsiJenjang}</div>
      </fieldset>
      <div>
        <label>Kelas / rombel <input name="kelas" list="saranKelas" value="${aman(m.kelas)}" placeholder="7A1" required autocomplete="off"><datalist id="saranKelas"></datalist></label>
      </div>
      <p class="info">Tulis kelas dan rombelnya, misal 7A1 (A putra, B putri). Daftar siswa, lembar nilai, dan rapor dikelompokkan per kelas ini.</p>
      <fieldset>
        <legend>Jenis pelajaran</legend>
        <div class="pilih-jenis">
          <label class="radio"><input type="radio" name="jenis" value="umum" ${jenisMapel(m) === "umum" ? "checked" : ""}> Umum</label>
          <label class="radio"><input type="radio" name="jenis" value="diniah" ${jenisMapel(m) === "diniah" ? "checked" : ""}> Diniah</label>
        </div>
        <p class="info">Ngaruh ke bobot penilaian (diatur di halaman Bobot nilai) dan bagian di rapor.</p>
      </fieldset>
      <fieldset>
        <legend>Pengampu</legend>
        <div class="pemberitahuan-kecil" id="peringatanPengampu" hidden></div>
        <div class="kolom daftar-centang">${pilihPengampu}</div>
      </fieldset>
      <button type="submit" class="tombol-utama">Simpan</button>
      ${lama ? `<button type="button" class="tombol-hapus" id="hapus">Hapus mapel ini</button>` : ""}
    </form>`;

  const form = document.getElementById("form");
  const isianJenjang = form.jenjang;
  const pilihKelas = form.kelas;
  // saran kelas: yang sudah dipakai di jenjang ini, lalu pola rombel (A = putra, B = putri)
  function aturSaranKelas(gantiJenjang) {
    const j = isianJenjang.value;
    const dipakai = daftarKelas().filter(x => x.jenjang === j).map(x => x.kelas);
    const pola = (KELAS_PER_JENJANG[j] || []).flatMap(k => {
      const n = k.replace(/\D/g, "");
      return [`${n}A1`, `${n}A2`, `${n}B1`, `${n}B2`];
    });
    const saran = [...new Set([...dipakai, ...pola])].sort((a, b) => a.localeCompare(b, "id", { numeric: true }));
    document.getElementById("saranKelas").innerHTML = saran.map(k => `<option value="${aman(k)}">`).join("");
    pilihKelas.placeholder = pola[0] || "Nama kelas";
    // kelas yang udah diketik tapi nggak cocok sama jenjang (misal 7A1 di Paket C) → dikosongin
    const angka = parseInt(pilihKelas.value, 10);
    const rentang = (KELAS_PER_JENJANG[j] || []).map(k => parseInt(k.replace(/\D/g, ""), 10));
    if (gantiJenjang === true && pilihKelas.value && rentang.length && !Number.isNaN(angka) && !rentang.includes(angka)) pilihKelas.value = "";
  }
  form.querySelectorAll("[name=jenjang]").forEach(r => r.onchange = () => aturSaranKelas(true));
  aturSaranKelas();

  // mapel baru: jenis (diniah / umum) ditebak dari namanya, selama belum dipilih sendiri
  let jenisDipilih = !!lama;
  form.querySelectorAll("[name=jenis]").forEach(r => r.addEventListener("change", () => { jenisDipilih = true; }));
  form.nama.addEventListener("input", () => {
    if (jenisDipilih) return;
    const j = tebakJenis(form.nama.value);
    form.querySelector(`[name=jenis][value="${j}"]`).checked = true;
  });

  // ustadzah yang dicentang di kelas putra (rombel A) → peringatan
  const peringatan = document.getElementById("peringatanPengampu");
  function ustadzahDiKelasPutra() {
    if (!kelasPutra(pilihKelas.value)) return [];
    return [...form.querySelectorAll('[name="pengampu"]:checked')]
      .filter(c => c.dataset.sapaanPengampu === "ustadzah")
      .map(c => namaPengguna(c.value));
  }
  function cekPengampu() {
    const salah = ustadzahDiKelasPutra();
    peringatan.hidden = !salah.length;
    peringatan.innerHTML = salah.length ? `<b>Peringatan:</b> ${aman(pilihKelas.value)} kelas putra (rombel A), sedangkan ${aman(salah.join(", "))} ustadzah. Ustadzah nggak boleh ngajar siswa putra.` : "";
  }
  form.querySelectorAll('[name="pengampu"]').forEach(c => c.onchange = cekPengampu);
  pilihKelas.oninput = cekPengampu;
  cekPengampu();
  pilihKelas.onchange = () => { pilihKelas.value = pilihKelas.value.trim().replace(/\s+/g, " "); cekPengampu(); };

  form.onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(form);
    const pengampu = f.getAll("pengampu");
    const namaPengampu = {};
    for (const u of pengampu) namaPengampu[u] = namaPengguna(u);
    const nama = f.get("nama").trim();
    const kelas = f.get("kelas").trim().replace(/\s+/g, " ");
    const kembar = toko.mapel.find(x => x.id !== (lama && lama.id) &&
      x.nama.toLowerCase() === nama.toLowerCase() && x.jenjang === f.get("jenjang") && x.kelas === kelas);
    if (kembar && !confirm(`Mapel ${nama} ${kelas} (${f.get("jenjang")}) sudah ada. Tetap bikin satu lagi?`)) return;
    const salah = ustadzahDiKelasPutra();
    if (salah.length && !confirm(`Peringatan: ${kelas} kelas putra, tapi ${salah.join(", ")} ustadzah.\n\nUstadzah nggak boleh ngajar siswa putra. Tetap simpan?`)) return;

    const baru = simpanMapelData({
      ...(lama || {}),
      id: lama ? lama.id : buatId(),
      nama, jenjang: f.get("jenjang"), kelas, jenis: f.get("jenis") || "umum",
      pengampu, namaPengampu
    });
    pilihJenjang(baru.jenjang);   // daftar mapel langsung nunjukin jenjang mapel yang barusan disimpan
    if (posisi.dariMapel) pergi("mapel", { mapelId: baru.id });
    else pergi("kelolaMapel");
  };

  if (lama) {
    document.getElementById("hapus").onclick = () => {
      const modul = modulMapel(lama.id);
      const nSoal = modul.reduce((x, y) => x + jumlahSoal(y), 0);
      const yakin = confirm(
        `Hapus mapel ${namaMapel(lama)}?\n\n` +
        `${modul.length} modul, ${nSoal} soal, dan ${sumatifMapel(lama.id).length} ujian sumatif dari SEMUA pengampu ikut terhapus dan TIDAK bisa dikembalikan.`
      );
      if (!yakin) return;
      if (modul.length && prompt(`Ketik HAPUS untuk memastikan.`) !== "HAPUS") return;
      hapusMapelData(lama.id);
      pergi("kelolaMapel", { mapelId: null });
    };
  }
}

// =====================================================
//  PANTAUAN: siapa sudah ngisi apa
// =====================================================
function layarPantauan() {
  wajibKurikulum();
  judul.textContent = "Pantauan";
  const semuaSem = new Map();
  const tambah = (x) => semuaSem.set(kunciSemester(x), x);
  tambah(semesterSekarang());
  for (const mp of toko.mapel) {
    modulMapel(mp.id).forEach(tambah);
    sumatifMapel(mp.id).forEach(tambah);
  }
  const kunci = posisi.semPantau && semuaSem.has(posisi.semPantau) ? posisi.semPantau : kunciSemester(semesterSekarang());
  const sem = dariKunciSemester(kunci);
  const jenjang = jenjangAktif();
  const mapelJenjang = toko.mapel.filter(m => m.jenjang === jenjang)
    .sort((a, b) => bandingKelas(a, b) || a.nama.localeCompare(b.nama, "id"));
  jejak.textContent = `${jenjang} · ${namaSemester(sem)}`;

  // siapa saja yang muncul di pantauan jenjang ini, dikelompokkan ustadz / ustadzah
  const isiPantau = mapelJenjang.filter(mp => isiMapelSiap(mp.id)).map(mp => {
    const modul = modulMapel(mp.id).filter(x => samaSemester(x, sem));
    const sumatif = sumatifMapel(mp.id).filter(x => samaSemester(x, sem));
    // baris: semua pengampu + siapa pun yang punya modul di mapel ini
    const orang = [...new Set([...(mp.pengampu || []), ...modul.map(m => m.pemilik), ...sumatif.map(s => s.pemilik)])];
    return { mp, modul, sumatif, orang };
  });
  const sapaanUid = (uid, mp, modul) => {
    const p = toko.pengguna.find(x => x.id === uid);
    const nama = (p && p.nama) || (mp.namaPengampu || {})[uid] || ((modul.find(m => m.pemilik === uid) || {}).namaPemilik) || "";
    return sapaanPengguna({ ...(p || {}), nama }) || "belum";
  };
  const hitung = { ustadz: new Set(), ustadzah: new Set(), belum: new Set() };
  for (const x of isiPantau) for (const uid of x.orang) hitung[sapaanUid(uid, x.mp, x.modul)].add(uid);
  const KELOMPOK = [["ustadz", "Ustadz"], ["ustadzah", "Ustadzah"], ["belum", "Belum diatur"]];
  let kelompok = posisi.kelompokPantau || "ustadz";
  if (hitung[kelompok].size === 0) kelompok = KELOMPOK.map(k => k[0]).find(k => hitung[k].size) || "ustadz";

  let h = htmlTabJenjang();
  h += `<div class="pilih-kelompok" role="group" aria-label="Ustadz atau ustadzah">`;
  for (const [k, label] of KELOMPOK) {
    if (k === "belum" && hitung.belum.size === 0) continue;
    h += `<button class="${k === kelompok ? "aktif" : ""}" data-kelompok="${k}" aria-pressed="${k === kelompok}">${label} <small>${hitung[k].size}</small></button>`;
  }
  h += `</div>`;
  if (kelompok === "belum") h += `<p class="info">Atur sapaannya di halaman Akun biar masuk ke kelompok Ustadz atau Ustadzah.</p>`;
  h += `<div class="pilih-semester" role="group" aria-label="Semester">`;
  for (const x of [...semuaSem.values()].sort(bandingSemester)) {
    const k = kunciSemester(x);
    h += `<button class="chip ${k === kunci ? "aktif" : ""}" data-sem="${aman(k)}" aria-pressed="${k === kunci}">${aman(namaSemester(x))}</button>`;
  }
  h += `</div>`;

  if (mapelJenjang.length === 0) {
    h += `<p class="kosong">Belum ada mapel ${aman(jenjang)}. Tambahkan dulu di halaman Mapel &amp; pengampu.</p>`;
  }

  const belumSiap = isiPantau.length < mapelJenjang.length;
  let adaKartu = false;
  for (const { mp, modul, sumatif, orang: semua } of isiPantau) {
    const orang = semua.filter(uid => sapaanUid(uid, mp, modul) === kelompok);
    // mapel tanpa pengampu tetap tampil (biar ketahuan), mapel yang diampu kelompok lain disembunyikan
    if (orang.length === 0 && semua.length > 0) continue;
    adaKartu = true;

    h += `
      <section class="kartu-pantau">
        <button class="kartu-pantau-judul" data-mapel="${mp.id}">
          <span><strong>${aman(mp.nama)}</strong><small>${aman(mp.kelas)}</small></span>
          <span class="baris-panah" aria-hidden="true">›</span>
        </button>`;
    if (orang.length === 0) {
      h += `<p class="info">Belum ada pengampu.</p>`;
    } else {
      h += `<table class="tabel-pantau">
        <thead><tr><th>Pengampu</th><th>Modul</th><th>Pertemuan</th><th>Soal</th><th>Sumatif</th><th>Terakhir diisi</th></tr></thead><tbody>`;
      for (const uid of orang) {
        const mm = modul.filter(m => m.pemilik === uid);
        const ss = sumatif.filter(s => s.pemilik === uid);
        const pertemuan = mm.reduce((x, m) => x + (m.pertemuan || []).length, 0);
        const tanpaTarget = mm.reduce((x, m) => x + (m.pertemuan || []).filter(p => !p.target).length, 0);
        const soal = mm.reduce((x, m) => x + jumlahSoal(m), 0);
        const terakhir = Math.max(0, ...mm.map(m => m.diubah || 0), ...ss.map(s => s.diubah || 0));
        const nama = namaPengguna(uid) || (mp.namaPengampu || {})[uid] || (mm[0] && mm[0].namaPemilik) || "Tanpa nama";
        const bukanPengampu = !(mp.pengampu || []).includes(uid);
        h += `
          <tr class="${mm.length === 0 ? "kurang" : ""}">
            <td data-label="Pengampu"><b>${aman(nama)}</b>${bukanPengampu ? ` <small>(sudah bukan pengampu)</small>` : ""}</td>
            <td data-label="Modul">${mm.length || `<span class="merah">Belum ada</span>`}</td>
            <td data-label="Pertemuan">${pertemuan}${tanpaTarget ? ` <small>(${tanpaTarget} tanpa target)</small>` : ""}</td>
            <td data-label="Soal">${soal}</td>
            <td data-label="Sumatif">${ss.length}</td>
            <td data-label="Terakhir diisi">${terakhir ? aman(waktuRapi(terakhir)) : "-"}</td>
          </tr>`;
      }
      h += `</tbody></table>`;
    }
    h += `</section>`;
  }
  if (!adaKartu && isiPantau.length > 0) {
    h += `<p class="kosong">Belum ada ${kelompok === "ustadzah" ? "ustadzah" : kelompok === "ustadz" ? "ustadz" : "pengampu tanpa sapaan"} yang ngampu mapel ${aman(jenjang)}.</p>`;
  }
  if (belumSiap) h += `<p class="info">Sebagian data masih dimuat...</p>`;
  isi.innerHTML = h;

  pasangTabJenjang("pantauan");
  isi.querySelectorAll("[data-kelompok]").forEach(b => b.onclick = () => pergi("pantauan", { kelompokPantau: b.dataset.kelompok }));
  isi.querySelectorAll(".chip[data-sem]").forEach(b => b.onclick = () => pergi("pantauan", { semPantau: b.dataset.sem }));
  isi.querySelectorAll("[data-mapel]").forEach(b => {
    b.onclick = () => pergi("mapel", { mapelId: b.dataset.mapel, semester: kunci, tab: "modul" });
  });
}

// =====================================================
//  CADANGAN DATA: semua isi aplikasi jadi satu file .json
//  Pengganti backup otomatis Firebase (yang cuma ada di paket berbayar).
//  Admin bisa baca semuanya, jadi file ini lengkap: akun, mapel, modul,
//  soal, ujian sumatif, lembar nilai, santri, dan pengaturan.
// =====================================================
const BATAS_HARI_CADANGAN = 30;

function isiCadanganSiap() {
  return toko.mapel.every(m => isiMapelSiap(m.id));
}

function hariSejakCadangan() {
  const t = toko.lembaga.cadanganTerakhir;
  return t ? Math.floor((Date.now() - t) / 86400000) : null;
}

function dataCadangan() {
  const isi = (id) => toko.isi[id] || {};
  return {
    aplikasi: KONFIG.namaAplikasi,
    versiCadangan: 2,
    dibuat: new Date().toISOString(),
    oleh: (toko.saya && toko.saya.email) || "",
    lembaga: salin(toko.lembaga),
    bobot: salin(toko.bobot),
    pengguna: toko.pengguna.map(p => ({ id: p.id, nama: p.nama, email: p.email, peran: p.peran, dibuat: p.dibuat || null })),
    santri: salin(toko.santri),
    mapel: toko.mapel.map(m => ({
      ...salin(m),
      modul: salin(modulMapel(m.id)),
      sumatif: salin(sumatifMapel(m.id)),
      nilai: salin(isi(m.id).nilai || [])
    })),
    // grup mapel + UAS bersama & usulan soalnya
    grup: toko.grup.map(g => ({ ...salin(g), uas: salin(toko.uas[g.id] || []), usulan: salin(toko.usulan[g.id] || []) }))
  };
}

async function unduhCadangan(tombol, pesan) {
  wajibKurikulum();
  if (!isiCadanganSiap()) {
    const teks = "Data masih dimuat, tunggu sebentar lalu coba lagi.";
    if (pesan) pesan.textContent = teks; else alert(teks);
    return false;
  }
  const data = dataCadangan();
  const tanggal = new Date().toLocaleDateString("sv-SE");   // 2026-10-24
  const berkas = new File([JSON.stringify(data, null, 1)], `cadangan-banksoal-${tanggal}.json`, { type: "application/json" });
  if (tombol) tombol.disabled = true;
  try {
    const jadi = await berikanFile(berkas);
    if (!jadi) return false;
    simpanLembaga({ ...toko.lembaga, cadanganTerakhir: Date.now(), cadanganOleh: namaSaya() });
    const totalSoal = data.mapel.reduce((a, m) => a + m.modul.reduce((x, y) => x + jumlahSoal(y), 0), 0);
    if (pesan) pesan.textContent = `Tersimpan: ${data.mapel.length} mapel, ${totalSoal} soal, ${data.santri.length} siswa. Simpan file-nya di Google Drive atau flashdisk.`;
    return true;
  } finally {
    if (tombol) tombol.disabled = false;
  }
}

function htmlBagianCadangan() {
  const hari = hariSejakCadangan();
  const terakhir = toko.lembaga.cadanganTerakhir
    ? `Terakhir diunduh ${aman(waktuRapi(toko.lembaga.cadanganTerakhir))}${toko.lembaga.cadanganOleh ? ` oleh ${aman(toko.lembaga.cadanganOleh)}` : ""}.`
    : "Belum pernah diunduh.";
  return `
    <section class="bagian">
      <h2>Cadangan data</h2>
      <p class="info">Unduh semua isi aplikasi (akun, mapel, modul, soal, ujian, nilai, dan siswa) jadi satu file. Simpan di Google Drive atau flashdisk, biar kalau ada yang kehapus nggak sengaja, datanya masih ada. Saran: unduh tiap akhir bulan dan sebelum ujian.</p>
      <p class="info"><b>${terakhir}</b>${hari !== null && hari >= BATAS_HARI_CADANGAN ? " Sudah lebih dari sebulan, sebaiknya unduh lagi." : ""}</p>
      <div class="baris-tombol">
        <button class="tombol-kedua" id="unduhCadangan">Unduh cadangan (.json)</button>
        <span class="info" id="pesanCadangan" role="status"></span>
      </div>
    </section>
    <section class="bagian">
      <h2>Bersihkan data</h2>
      <p class="info">Hapus data trial atau yang udah nggak dipakai: mapel beserta isinya, siswa per kelas, dan akun guru. Kamu pilih sendiri yang mau dihapus.</p>
      <div class="baris-tombol"><button class="tombol-kedua" id="keBersihkan">Bersihkan data…</button></div>
    </section>`;
}