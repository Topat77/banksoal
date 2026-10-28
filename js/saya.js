// =====================================================
//  saya.js — SAYA (profil, lembaga, keluar)
// =====================================================
function layarLainnya() {
  judul.textContent = "Saya";
  const kur = sayaKurikulum();
  const coba = toko.backend.mode === "coba";
  const s = toko.saya || {};

  let h = `
    <section class="bagian">
      <h2>Profil</h2>
      <form id="formProfil">
        <label>Nama yang tampil <input name="nama" value="${aman(s.nama || "")}" required maxlength="100" placeholder="Ustadzah Aminah"></label>
        <p class="info">Muncul di modul dan ujian yang kamu buat, dan di daftar pengampu.</p>
        <p class="info"><b>Sapaan:</b> ${sapaanPengguna(s) ? SAPAAN[sapaanPengguna(s)] : "belum diatur"} · diatur TU di halaman Akun, karena ngaruh ke kelas putra/putri yang boleh diajar.</p>
        <div class="baris-tombol">
          <button type="submit" class="tombol-utama">Simpan</button>
          <span class="tersimpan" id="tersimpanProfil" role="status"></span>
        </div>
      </form>
      <p class="info">Akun Google: <b>${aman(s.email || "")}</b> · ${aman(namaPeran(s.peran))}</p>
    </section>`;

  if (kur) {
    h += `
      <section class="bagian">
        <h2>Lembaga</h2>
        <form id="formLembaga">
          <label>Nama lembaga <input name="nama" value="${aman(toko.lembaga.nama || KONFIG.namaLembaga || "")}" placeholder="PKBM ..."></label>
          <label>Lama ujian bawaan <input name="waktu" value="${aman(toko.lembaga.waktu || "")}" placeholder="60 menit"></label>
          <p class="info">Dipakai di kop lembar soal semua ustadz. Masih bisa diganti tiap mau nyetak.</p>
          <div class="baris-tombol">
            <button type="submit" class="tombol-utama">Simpan</button>
            <span class="tersimpan" id="tersimpanLembaga" role="status"></span>
          </div>
        </form>
      </section>` + htmlBagianCadangan();
  }

  const pilih = pilihanTema();
  h += `
    <section class="bagian">
      <h2>Tampilan</h2>
      <div class="pilih-jenis tiga" role="radiogroup" aria-label="Mode tampilan">
        <label class="radio"><input type="radio" name="tema" value="" ${pilih === "" ? "checked" : ""}> Ikut HP</label>
        <label class="radio"><input type="radio" name="tema" value="terang" ${pilih === "terang" ? "checked" : ""}> Terang</label>
        <label class="radio"><input type="radio" name="tema" value="gelap" ${pilih === "gelap" ? "checked" : ""}> Gelap</label>
      </div>
      <p class="info">Bisa juga lewat tombol bulan/matahari di pojok kanan atas.</p>
    </section>`;

  let teksPasang;
  if (sudahTerpasang()) teksPasang = `<p class="info">Aplikasi sudah terpasang di perangkat ini.</p>`;
  else if (diIPhone()) teksPasang = `<p class="info">Di iPhone: buka lewat Safari, ketuk tombol <b>Bagikan</b> (kotak dengan panah ke atas), lalu pilih <b>Tambahkan ke Layar Utama</b>.</p>`;
  else teksPasang = `<p class="info">Pasang biar Bank Soal muncul di layar HP kayak aplikasi biasa, dan tetap bisa dibuka tanpa sinyal.</p>
      <div class="baris-tombol"><button class="tombol-kedua" id="pasang">Pasang di perangkat ini</button></div>
      <p class="info" id="pesanPasang" role="status"></p>`;
  h += `
    <section class="bagian">
      <h2>Pasang aplikasi</h2>
      ${teksPasang}
    </section>`;

  h += `
    <section class="bagian">
      <h2>Data</h2>
      <p class="info">${coba
        ? "Mode coba: semua data contoh tersimpan di perangkat ini saja dan nggak dikirim ke mana-mana."
        : "Soal tersimpan online, jadi bisa dibuka dari HP atau laptop mana pun pakai akun Google yang sama. Tanpa sinyal pun tetap bisa dipakai; perubahan dikirim otomatis waktu ada sinyal lagi."}</p>
      <div class="baris-tombol">
        <button class="tombol-kedua" id="keluar">${coba ? "Ganti akun contoh" : "Keluar"}</button>
        ${coba ? `<button class="tombol-teks merah" id="resetCoba">Kembalikan data contoh</button>` : ""}
      </div>
    </section>`;
  isi.innerHTML = h;

  document.getElementById("formProfil").onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const nama = f.get("nama").trim();
    if (!nama) return;
    const { id, ...lama } = toko.saya;
    simpanPengguna(uidSaya(), { ...lama, nama });
    document.getElementById("tersimpanProfil").textContent = "Tersimpan";
  };
  const uc = document.getElementById("unduhCadangan");
  if (uc) uc.onclick = () => unduhCadangan(uc, document.getElementById("pesanCadangan"));
  const fl = document.getElementById("formLembaga");
  if (fl) {
    fl.onsubmit = (e) => {
      e.preventDefault();
      const f = new FormData(fl);
      simpanLembaga({ ...toko.lembaga, nama: f.get("nama").trim(), waktu: f.get("waktu").trim() });
      document.getElementById("tersimpanLembaga").textContent = "Tersimpan";
    };
  }
  document.getElementById("keluar").onclick = async () => {
    if (!coba && !(await tanyaYakin("Keluar dari akun ini?", { ya: "Keluar" }))) return;
    toko.backend.keluar();
  };
  isi.querySelectorAll('[name="tema"]').forEach(r => r.onchange = () => pasangTema(r.value));
  const pasang = document.getElementById("pasang");
  if (pasang) {
    pasang.onclick = async () => {
      if (!ajakanPasang) {
        document.getElementById("pesanPasang").innerHTML = `Buka menu browser (titik tiga di pojok kanan atas), lalu pilih <b>Tambahkan ke layar utama</b> atau <b>Instal aplikasi</b>.`;
        return;
      }
      ajakanPasang.prompt();
      const hasil = await ajakanPasang.userChoice;
      ajakanPasang = null;
      if (hasil.outcome === "accepted") tampilkan(true);
    };
  }
  const reset = document.getElementById("resetCoba");
  if (reset) {
    reset.onclick = async () => {
      if (!(await tanyaYakin("Semua perubahan di mode coba dihapus dan data contoh dikembalikan seperti semula. Lanjut?", { bahaya: true, ya: "Reset" }))) return;
      toko.backend.reset();
      pergi("beranda");
    };
  }
}
