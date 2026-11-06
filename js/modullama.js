// =====================================================
//  modullama.js — pakai lagi modul lama: "Pakai modul lama" (layarModulLama)
//                 dan "Salin ke semester lain" (formSalin)
// =====================================================

// =====================================================
//  SALIN MODUL KE SEMESTER / TAHUN AJARAN LAIN
//  Semua pertemuan, teks bacaan, dan soal ikut disalin dengan id baru,
//  jadi salinannya bisa diubah tanpa ngerusak yang lama.
// =====================================================
function salinModulBaru(m, tujuan) {
  const petaPertemuan = {}, petaBacaan = {};
  const pertemuan = (m.pertemuan || []).map(p => { const id = buatId(); petaPertemuan[p.id] = id; return { ...p, id }; });
  const bacaan = (m.bacaan || []).map(b => { const id = buatId(); petaBacaan[b.id] = id; return { ...b, id }; });
  const soal = (m.soal || []).map(s => ({
    ...salin(s),
    id: buatId(),
    pertemuanId: s.pertemuanId ? (petaPertemuan[s.pertemuanId] || null) : null,
    bacaanId: s.bacaanId ? (petaBacaan[s.bacaanId] || null) : null
  }));
  return {
    id: buatId(),
    semester: tujuan.semester, tahun: tujuan.tahun,
    judul: m.judul, catatan: m.catatan || "", link: m.link || "",
    dibagikan: false,
    pertemuan, bacaan, soal
  };
}

// =====================================================
//  MODUL LAMA DARI KELAS LAIN (guru pindah kelas di tahun ajaran baru)
//  Diambil sekali dari server waktu layarnya dibuka: modul milik saya di mapel bernama sama
//  di kelas lain (semester mana pun). Rules udah ngizinin baca modul milik sendiri.
// =====================================================
let modulLamaHasil = null;   // { idMapel, nama, daftar: [{ mp, modul: [...] }] } atau { gagal: true }

async function muatModulLama(mp) {
  const uid = uidSaya();
  try {
    // kelas ini (semester lain) + mapel yang sama di kelas lain
    const sejenis = (await toko.backend.ambilKoleksi("mapel", [["nama", "==", mp.nama]])).filter(x => x.id !== mp.id);
    const sem = semAktif();
    const daftar = [];
    for (const m of [mp, ...sejenis]) {
      const modul = (await toko.backend.ambilKoleksi(`mapel/${m.id}/modul`, [["pemilik", "==", uid]])).map(amankanDok).filter(Boolean)
        .filter(x => m.id !== mp.id || !samaSemester(x, sem));
      if (modul.length) daftar.push({ mp: m, modul: modul.sort((a, b) => bandingSemester(b, a) || (a.dibuat || 0) - (b.dibuat || 0)) });
    }
    // kelas ini dulu, baru kelas lain
    return { idMapel: mp.id, daftar: daftar.sort((a, b) => (b.mp.id === mp.id) - (a.mp.id === mp.id) || bandingKelas(a.mp, b.mp)) };
  } catch (err) {
    console.error(err);
    return { idMapel: mp.id, gagal: true };
  }
}

function layarModulLama() {
  const mp = mapelAktif();
  if (!sayaPengampu(mp)) throw new DataHilang();
  const sem = semAktif();
  judul.textContent = "Modul lama saya";
  jejak.textContent = `Disalin ke ${namaMapel(mp)}, ${namaSemester(sem)}`;
  tombolKembali.hidden = false;

  if (!modulLamaHasil || modulLamaHasil.idMapel !== mp.id) {
    isi.innerHTML = `<p class="info">Mencari modul lama Anda di ${aman(mp.nama)}...</p>`;
    muatModulLama(mp).then(hasil => {
      modulLamaHasil = hasil;
      if (posisi.layar === "modulLama" && posisi.mapelId === mp.id) layarModulLama();
    });
    return;
  }
  const hasil = modulLamaHasil;
  if (hasil.gagal) {
    isi.innerHTML = `<p class="kosong">Gagal mengambil modul dari server. Pastikan ada sinyal, lalu coba lagi.</p>
      <button class="tombol-kedua" id="cobaLagi">Coba lagi</button>`;
    klik("cobaLagi", () => { modulLamaHasil = null; layarModulLama(); });
    return;
  }
  if (!hasil.daftar.length) {
    isi.innerHTML = `<p class="kosong">Belum ada modul lama Anda di ${aman(mp.nama)}, baik di kelas ini (semester lain) maupun kelas lain.</p>`;
    return;
  }
  isi.innerHTML = `
    <p class="info">Modul yang Anda buat dulu di ${aman(mp.nama)}: kelas ini di semester lain, dan kelas lain. Centang yang ingin dipakai lagi, nanti disalin lengkap (pertemuan, target capaian, teks bacaan, soal) ke <b>${aman(namaMapel(mp))}, ${aman(namaSemester(sem))}</b>. Modul aslinya tetap aman. Salinannya tertutup dulu.</p>
    <form id="form">
      ${hasil.daftar.map(({ mp: asal, modul }) => `
        <fieldset>
          <legend>${aman(namaMapel(asal))} <small>${asal.id === mp.id ? "kelas ini, semester lain" : aman(asal.jenjang)}</small></legend>
          <div class="kolom daftar-centang">
            ${modul.map(m => `
              <label class="centang">
                <input type="checkbox" name="modul" value="${aman(asal.id)}|${aman(m.id)}">
                <span dir="auto">${aman(m.judul)} <small>${aman(namaSemester(m))} · ${(m.pertemuan || []).length} pertemuan, ${jumlahSoal(m)} soal</small></span>
              </label>`).join("")}
          </div>
        </fieldset>`).join("")}
      <button type="submit" class="tombol-utama">Salin ke ${aman(namaMapel(mp))}</button>
    </form>`;

  document.getElementById("form").onsubmit = async (e) => {
    e.preventDefault();
    const dipilih = new FormData(e.target).getAll("modul");
    if (!dipilih.length) return kabar("Centang minimal satu modul.");
    const semua = hasil.daftar.flatMap(x => x.modul.map(m => [`${x.mp.id}|${m.id}`, m]));
    const sumber = semua.filter(([k]) => dipilih.includes(k)).map(([, m]) => m);
    const sudahAda = modulMapel(mp.id).filter(m => milikSaya(m) && samaSemester(m, sem)).map(m => m.judul.toLowerCase());
    const kembar = sumber.filter(m => sudahAda.includes(m.judul.toLowerCase()));
    if (kembar.length && !(await tanyaYakin(`Di ${namaSemester(sem)} sudah ada modul dengan judul sama:\n\n${kembar.map(m => "• " + m.judul).join("\n")}\n\nTetap salin?`, { ya: "Tetap salin" }))) return;
    const jam = Date.now();
    const disalin = sumber.filter((m, i) => {
      const baru = salinModulBaru(m, sem);
      baru.soal = baru.soal.map(rapikanSoal).filter(Boolean);
      return simpanModul(mp.id, { ...baru, dibuat: jam + i });
    });
    if (!disalin.length) return;
    kabar(`${disalin.length} modul berhasil disalin ke ${namaMapel(mp)}, ${namaSemester(sem)}.`);
    modulLamaHasil = null;
    pergi("mapel", { tab: "modul" });
  };
}

function formSalin() {
  const mp = mapelAktif();
  if (!sayaPengampu(mp)) throw new DataHilang();
  const sem = semAktif();
  const milik = modulMapel(mp.id).filter(m => milikSaya(m) && samaSemester(m, sem));
  if (milik.length === 0) throw new DataHilang();

  // tebakan tujuan: semester yang sama, tahun ajaran berikutnya
  const cocok = (sem.tahun || "").match(/(\d{4})\D+(\d{4})/);
  const tahunBerikut = cocok ? `${Number(cocok[1]) + 1}/${Number(cocok[2]) + 1}` : "";
  const opsiSemester = ["Ganjil", "Genap"].map(x => `<option ${sem.semester === x ? "selected" : ""}>${x}</option>`).join("");

  judul.textContent = "Salin modul";
  jejak.textContent = `${namaMapel(mp)}, dari ${namaSemester(sem)}`;
  tombolKembali.hidden = false;

  isi.innerHTML = `
    <p class="info">Modul yang dipilih disalin lengkap dengan pertemuan, target capaian, teks bacaan, dan soalnya. Yang lama tetap aman, jadi modul tahun lalu bisa dipakai ulang lalu diubah. Salinannya tertutup dulu.</p>
    <form id="form">
      <fieldset>
        <legend>Modul yang disalin</legend>
        <div class="kolom daftar-centang">
          ${milik.map(m => `
            <label class="centang">
              <input type="checkbox" name="modul" value="${aman(m.id)}" ${!posisi.salinModul || posisi.salinModul === m.id ? "checked" : ""}>
              <span dir="auto">${aman(m.judul)} <small>${(m.pertemuan || []).length} pertemuan, ${jumlahSoal(m)} soal</small></span>
            </label>`).join("")}
        </div>
      </fieldset>
      <div class="dua-kolom">
        <label>Ke semester <select name="semester">${opsiSemester}</select></label>
        <label>Tahun ajaran <input name="tahun" value="${aman(tahunBerikut)}" placeholder="2027/2028" required pattern="\\d{4}/\\d{4}" title="Contoh: 2027/2028"></label>
      </div>
      <button type="submit" class="tombol-utama">Salin sekarang</button>
    </form>`;

  document.getElementById("form").onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const dipilih = f.getAll("modul");
    if (dipilih.length === 0) return kabar("Centang minimal satu modul.");
    const tujuan = { semester: f.get("semester"), tahun: f.get("tahun").trim() };
    if (kunciSemester(tujuan) === kunciSemester(sem) &&
        !(await tanyaYakin("Tujuannya sama dengan semester asal, jadi akan ada modul kembar di semester ini. Lanjut?", { ya: "Lanjut" }))) return;

    // semester tujuan mungkin belum dimuat: tunggu dulu, biar cek judul kembar nggak kelewat
    const tombolSalin = e.target.querySelector('button[type="submit"]');
    tombolSalin.disabled = true;
    await tungguSemester(mp.id, tujuan);
    tombolSalin.disabled = false;
    const sudahAda = modulMapel(mp.id).filter(m => milikSaya(m) && samaSemester(m, tujuan)).map(m => m.judul.toLowerCase());
    const kembar = milik.filter(m => dipilih.includes(m.id) && sudahAda.includes(m.judul.toLowerCase()));
    if (kembar.length && kunciSemester(tujuan) !== kunciSemester(sem) &&
        !(await tanyaYakin(`Di ${namaSemester(tujuan)} sudah ada modul dengan judul sama:\n\n${kembar.map(m => "• " + m.judul).join("\n")}\n\nTetap salin?`, { ya: "Tetap salin" }))) return;

    const jam = Date.now();
    // simpanModul ngasih null (dan ngasih tau sendiri) kalau modulnya kegedean
    const disalin = milik.filter(m => dipilih.includes(m.id))
      .filter((m, i) => simpanModul(mp.id, { ...salinModulBaru(m, tujuan), dibuat: jam + i }));
    if (!disalin.length) return;
    kabar(`${disalin.length} modul berhasil disalin ke ${namaSemester(tujuan)}.`);
    pergi("mapel", { semester: kunciSemester(tujuan), tab: "modul" });
  };
}