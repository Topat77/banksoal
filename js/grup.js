// =====================================================
//  grup.js — GRUP MAPEL: mapel yang sama di jenjang & tingkat yang sama
//  Datanya tetap di toko (toko.mapel, toko.grup); di sini cara ngitung & nyinkronnya.
// =====================================================

// ====== GRUP MAPEL ======
// Mapel yang sama di jenjang & tingkat yang sama satu grup, misal
// Bahasa Indonesia 7A1, 7A2, 7B1, 7B2 (Paket B). Modul, soal, dan sumatif yang
// dibagikan bisa dipakai semua pengampu di grupnya, biar soalnya terstandar.
// Daftar pengampu tiap grup disimpan di grup/{id} (diperbarui otomatis dari
// perangkat admin), karena aturan database butuh daftar itu buat ngasih izin.
// I'dad: kelas persiapan 1 tahun sebelum Paket C (siswa baru dari luar), naiknya ke kelas 10 Paket C
const JENJANG_IDAD = "I'dad";
// huruf rombel: "A" (putra) / "B" (putri), dari 7A2, 10B1, I'dad A1. Selain itu kosong.
function hurufRombel(kelas) {
  const m = String(kelas || "").match(/^\s*(?:\d+|i['’]?dad)\s*([AB])/i);
  return m ? m[1].toUpperCase() : "";
}
// "7A1 Paket B", tapi "I'dad A1" aja (nama jenjangnya udah ada di nama kelas)
function labelKelas(jenjang, kelas) {
  return jenjang === JENJANG_IDAD && /^\s*i['’]?dad/i.test(kelas || "") ? kelas : `${kelas} ${jenjang}`;
}
function tingkatKelas(kelas) {
  const cocok = String(kelas || "").match(/^\s*(\d+)/);
  if (cocok) return cocok[1];
  if (/^\s*i['’]?dad/i.test(kelas || "")) return "I'dad";   // I'dad A1, I'dad B2 → satu tingkat
  return String(kelas || "").trim();
}
function idGrup(mp) {
  const teks = `${mp.jenjang || ""}-${tingkatKelas(mp.kelas)}-${mp.nama || ""}`
    .toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "");
  return teks || "tanpa-nama";
}
// kelas = jenjang + rombel, misal "paket-b-7a1". Dokumen kelas/{id} nyatet pengampu
// semua mapel di kelas itu; aturan database pakai daftar ini buat nentuin
// ustadz mana yang boleh lihat santri kelas tersebut.
function idKelas(jenjang, kelas) {
  const teks = `${jenjang || ""}-${kelas || ""}`.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "");
  return teks || "tanpa-kelas";
}
function dataKelas(id) {
  return toko.kelas.find(k => k.id === id) || null;
}
function namaGrup(mp) {
  return `${mp.nama} kelas ${tingkatKelas(mp.kelas)}`;
}
function dataGrup(gid) {
  return toko.grup.find(g => g.id === gid) || null;
}
// kelas lain yang satu grup dengan mapel ini
function mapelSegrup(mp) {
  const g = idGrup(mp);
  return toko.mapel.filter(x => x.id !== mp.id && idGrup(x) === g);
}
function mapelGrup(gid) {
  return toko.mapel.filter(x => idGrup(x) === gid).sort(bandingKelasMapel);
}
function bandingKelasMapel(a, b) {
  return String(a.kelas).localeCompare(String(b.kelas), "id", { numeric: true });
}
// kelas lain di grup yang mapelnya nggak diampu akun ini (cuma buat ustadz)
function mapelTetangga() {
  if (sayaKurikulum()) return [];
  const saya = mapelDiampu();
  const idSaya = new Set(saya.map(m => m.id));
  const grupSaya = new Set(saya.map(idGrup));
  return toko.mapel.filter(m => !idSaya.has(m.id) && grupSaya.has(idGrup(m)));
}
function koordinatorGrup(gid) {
  const g = dataGrup(gid);
  return g && g.koordinator ? g.koordinator : null;
}
function sayaKoordinator(gid) {
  return !!uidSaya() && koordinatorGrup(gid) === uidSaya();
}

// semua modul yang bisa dipakai di satu mapel: modul mapel ini
// + modul kelas lain di grupnya (punya sendiri, atau yang dibagikan)
function modulGrup(idMapel) {
  const mp = cariMapel(idMapel);
  if (!mp) return modulMapel(idMapel);
  const hasil = new Map();
  for (const x of [mp, ...mapelSegrup(mp)]) {
    for (const m of modulMapel(x.id)) if (!hasil.has(m.id)) hasil.set(m.id, m);
  }
  return [...hasil.values()];
}
// mapel tempat modul / sumatif ini disimpan
function mapelAsal(idIsi) {
  for (const [idMapel, w] of Object.entries(toko.isi)) {
    const semua = [...(w.modulSemua || []), ...w.modulSaya, ...w.modulBagi, ...w.sumatif, ...(w.sumatifBagi || [])];
    if (semua.some(x => x.id === idIsi)) return cariMapel(idMapel);
  }
  return null;
}
function sumatifBagiMapel(idMapel) {
  const w = toko.isi[idMapel];
  return w ? (w.sumatifBagi || []) : [];
}
// sumatif orang lain (atau milik sendiri di kelas lain) yang bisa dilihat & disalin dari mapel ini
function sumatifGrup(idMapel) {
  const mp = cariMapel(idMapel);
  if (!mp) return [];
  const sendiri = new Set(sumatifMapel(idMapel).map(s => s.id));
  const hasil = new Map();
  for (const x of [mp, ...mapelSegrup(mp)]) {
    for (const s of [...sumatifMapel(x.id), ...sumatifBagiMapel(x.id)]) {
      if (!sendiri.has(s.id) && !hasil.has(s.id)) hasil.set(s.id, s);
    }
  }
  return [...hasil.values()].sort((a, c) => (a.dibuat || 0) - (c.dibuat || 0));
}
// modul / sumatif yang boleh diubah dari mapel ini: punya sendiri DAN disimpan di mapel ini
function bisaDiubahDi(idMapel, x, daftar) {
  return milikSaya(x) && daftar.some(y => y.id === x.id);
}

// UAS bersama satu grup di satu semester (id dokumennya sama kayak lembar nilai: "2026-2027_Ganjil")
function uasGrup(gid, sem) {
  return (toko.uas[gid] || []).find(u => u.id === idLembarNilai(sem)) || null;
}
function usulanGrup(gid, sem) {
  return (toko.usulan[gid] || []).filter(u => samaSemester(u, sem));
}

// ---- dari perangkat admin: catat grup tiap mapel & daftar pengampu tiap grup ----
let jadwalSinkron = null;
function sinkronGrup() {
  if (!sayaKurikulum() || !toko.mapelSiap || !toko.grupSiap || !toko.kelasSiap || !toko.santriSiap) return;
  clearTimeout(jadwalSinkron);
  jadwalSinkron = setTimeout(jalankanSinkronGrup, 300);
}
function jalankanSinkronGrup() {
  if (!sayaKurikulum()) return;
  const b = toko.backend;
  const peta = new Map();
  for (const m of toko.mapel) {
    const gid = idGrup(m);
    if (m.grup !== gid) b.tulis(`mapel/${m.id}`, tanpaId({ ...m, grup: gid })).catch(gagalSimpan);
    if (!peta.has(gid)) peta.set(gid, { nama: m.nama, jenjang: m.jenjang, tingkat: tingkatKelas(m.kelas), pengampu: new Set() });
    (m.pengampu || []).forEach(u => peta.get(gid).pengampu.add(u));
  }
  // kelas: pengampu semua mapel di kelas itu, dan tiap santri dicatat kelasnya
  const petaKelas = new Map();
  const tambahKelas = (jenjang, kelas) => {
    const id = idKelas(jenjang, kelas);
    if (!petaKelas.has(id)) petaKelas.set(id, { jenjang, kelas, pengampu: new Set() });
    return petaKelas.get(id);
  };
  for (const m of toko.mapel) (m.pengampu || []).forEach(u => tambahKelas(m.jenjang, m.kelas).pengampu.add(u));
  for (const s of toko.santri) {
    if (santriKeluar(s)) continue;   // lulus / pindah: kelasId-nya memang sengaja dicopot
    tambahKelas(s.jenjang, s.kelas);
    const id = idKelas(s.jenjang, s.kelas);
    if (s.kelasId !== id) b.tulis(`santri/${s.id}`, tanpaId({ ...s, kelasId: id })).catch(gagalSimpan);
  }
  for (const id of toko.kelasGagal ? [] : new Set([...petaKelas.keys(), ...toko.kelas.map(k => k.id)])) {
    const lama = dataKelas(id);
    const x = petaKelas.get(id);
    const baru = x ? { jenjang: x.jenjang, kelas: x.kelas, pengampu: [...x.pengampu].sort() } : { ...tanpaId(lama), pengampu: [] };
    if (!lama || JSON.stringify([lama.jenjang, lama.kelas, lama.pengampu]) !== JSON.stringify([baru.jenjang, baru.kelas, baru.pengampu])) {
      b.tulis(`kelas/${id}`, baru).catch(gagalSimpan);
    }
  }

  const semuaId = new Set([...peta.keys(), ...toko.grup.map(g => g.id)]);
  for (const gid of semuaId) {
    const lama = dataGrup(gid);
    const x = peta.get(gid);
    const pengampu = x ? [...x.pengampu].sort() : [];
    // koordinator yang udah nggak ngampu di grup ini dilepas
    const koordinator = lama && lama.koordinator && pengampu.includes(lama.koordinator) ? lama.koordinator : null;
    const baru = {
      ...(lama ? tanpaId(lama) : {}),
      ...(x ? { nama: x.nama, jenjang: x.jenjang, tingkat: x.tingkat } : {}),
      pengampu, koordinator
    };
    if (!lama || JSON.stringify([lama.nama, lama.jenjang, lama.tingkat, lama.pengampu, lama.koordinator || null]) !==
                 JSON.stringify([baru.nama, baru.jenjang, baru.tingkat, baru.pengampu, baru.koordinator])) {
      b.tulis(`grup/${gid}`, baru).catch(gagalSimpan);
    }
  }
}
