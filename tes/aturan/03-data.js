// =====================================================
grup("Baca jawaban AI");
{
  const bahan = { untuk: "modul", pilihan: [{ nomor: 1, id: "p1" }, { nomor: 2, id: "p2" }], bacaan: [{ id: "b1" }] };
  const satu = (s, b = bahan) => bacaJawabanAI(JSON.stringify({ soal: [s] }), b)[0];
  const kunciTeks = (d) => d.pilihan[d.kunci];
  const pg = (o) => ({ jenis: "PG", teks: "Ibu kota?", pilihan: ["Bandung", "Jakarta", "Surabaya", "Medan"], ...o });
  const gagalnya = (teks) => { try { bacaJawabanAI(teks, bahan); return "nggak gagal"; } catch (e) { return e.message; } };

  harap("kunci angka", kunciTeks(satu(pg({ kunci: 1 }))), "Jakarta");
  harap("kunci huruf", kunciTeks(satu(pg({ kunci: "B" }))), "Jakarta");
  harap("kunci huruf kecil + spasi", kunciTeks(satu(pg({ kunci: " b " }))), "Jakarta");
  harap("kunci berupa teks jawabannya", kunciTeks(satu(pg({ kunci: "Surabaya" }))), "Surabaya");
  harap("kunci jelas → nggak ditandai ragu", satu(pg({ kunci: 1 })).ragu, false);
  const ngawur = satu(pg({ kunci: 9 }));
  harap("kunci di luar pilihan → ditandai ragu", ngawur.ragu, true);
  harap("kunci di luar pilihan → jadi A dulu", ngawur.kunci, 0);
  harap("kunci teks yang nggak ada di pilihan → ragu", satu(pg({ kunci: "Bogor" })).ragu, true);
  // B1: pilihan kosong di depan dibuang, kuncinya harus ikut geser
  const kosongDepan = satu(pg({ pilihan: ["", "Benar", "Salah", "Ragu"], kunci: 1 }));
  harap("pilihan kosong di depan: kunci angka tetap nunjuk jawaban yang sama", kunciTeks(kosongDepan), "Benar");
  harap("pilihan kosong di depan: nggak ditandai ragu", kosongDepan.ragu, false);
  harap("pilihan kosong di depan: kunci huruf tetap nunjuk jawaban yang sama", kunciTeks(satu(pg({ pilihan: ["", "Benar", "Salah"], kunci: "B" }))), "Benar");
  harap("pilihan kosong di tengah: kunci sesudahnya ikut geser", kunciTeks(satu(pg({ pilihan: ["a", "", "b", "c"], kunci: 3 }))), "c");
  harap("kunci nunjuk pilihan yang kosong → ragu", satu(pg({ pilihan: ["a", "", "b"], kunci: 1 })).ragu, true);
  harap("awalan \"A. \" di pilihan dibuang", satu(pg({ pilihan: ["A. Bandung", "B) Jakarta"] })).pilihan.slice(0, 2).join("|"), "Bandung|Jakarta");
  harap("lebih dari 5 pilihan dipotong jadi 5", satu(pg({ pilihan: ["1", "2", "3", "4", "5", "6"] })).pilihan.length, 5);
  harap("pilihan selalu 5 kotak", satu(pg({ pilihan: ["a", "b"] })).pilihan.length, 5);
  harap("cuma 1 pilihan terisi → jadi esai", satu(pg({ pilihan: ["a", ""] })).jenis, "Esai");
  const esai = satu({ jenis: "Esai", teks: "Jelaskan!", pilihan: ["a", "b"], kunci: "Jawabannya x" });
  harap("jenis esai tetap esai walau ada pilihan", esai.jenis, "Esai");
  harap("pedoman esai boleh dari kolom kunci", esai.pedoman, "Jawabannya x");
  harap("pertemuan ke-2 → id pertemuannya", satu(pg({ pertemuan: 2 })).pertemuanId, "p2");
  harap("pertemuan yang nggak ada → kosong", satu(pg({ pertemuan: 7 })).pertemuanId, null);
  harap("bacaan ke-1 → id bacaannya", satu(pg({ bacaan: 1 })).bacaanId, "b1");
  harap("buat ujian: pertemuan nggak dipakai", satu(pg({ pertemuan: 1 }), { ...bahan, untuk: "ujian" }).pertemuanId, null);
  harap("dibungkus ```json dan ada kalimat pembuka", bacaJawabanAI("Ini soalnya:\n```json\n" + JSON.stringify({ soal: [pg({ kunci: 0 })] }) + "\n```", bahan).length, 1);
  harap("langsung daftar [...] tanpa {soal}", bacaJawabanAI(JSON.stringify([pg(), pg()]), bahan).length, 2);
  harap("pakai nama kolom lain (questions / pertanyaan / opsi)", bacaJawabanAI(JSON.stringify({ questions: [{ pertanyaan: "P?", opsi: ["x", "y"], kunci: 1 }] }), bahan)[0].pilihan[1], "y");
  harap("item rusak / tanpa teks dilewati", bacaJawabanAI(JSON.stringify({ soal: [null, 5, { teks: "" }, pg()] }), bahan).length, 1);
  harap("JSON rusak → JAWABAN_RUSAK", gagalnya('{"soal": [ {"teks": "a"'), "JAWABAN_RUSAK");
  harap("bukan JSON sama sekali → JAWABAN_RUSAK", gagalnya("Maaf, saya tidak bisa."), "JAWABAN_RUSAK");
  harap("nggak ada soal → JAWABAN_KOSONG", gagalnya('{"soal": []}'), "JAWABAN_KOSONG");
  harap("hasilnya lolos rapikanSoal tanpa berubah kunci", rapikanSoal({ ...kosongDepan, id: "x" }).kunci, kosongDepan.kunci);
}

// =====================================================
grup("Hitung nilai akhir");
{
  const dekat = (a, b) => a !== null && Math.abs(a - b) < 1e-9;
  ctx.toko = { bobot: {} };   // bobot belum diatur admin → bawaan
  const kolom = [["k1", "tugas"], ["k2", "uh"], ["k3", "uh"], ["k4", "uts"], ["k5", "uas"], ["k6", "keaktifan"]]
    .map(([id, kelompok]) => ({ id, kelompok, label: id }));
  const lembarN = (nilai, hadir = {}) => ({ kolom, nilai: { s1: nilai }, hadir: { s1: hadir.s1 } });
  const lengkap = { k1: 80, k2: 70, k3: 90, k4: 75, k5: 70 };
  const umum = { jenjang: "Paket B", jenis: "umum" }, diniah = { jenjang: "Paket B", jenis: "diniah" };

  const h = hitungNilai(lembarN(lengkap), "s1", umum);
  harap("rata-rata per kelompok (UH 70 & 90 → 80)", h.per.uh, 80);
  harap("nilai harian = rata-rata tugas + UH", h.harian, 80);
  boleh("umum bawaan: 20·80 + 30·80 + 20·75 + 30·70 = 76", dekat(h.akhir, 76));
  const tanpaUAS = hitungNilai(lembarN({ ...lengkap, k5: undefined }), "s1", umum).akhir;
  boleh("UAS belum ada: bobotnya dibagi ke yang ada (5500/70)", dekat(tanpaUAS, 5500 / 70));
  const d = hitungNilai({ ...lembarN({ ...lengkap, k6: 100 }), hadir: { s1: { hadir: 18, sakit: 1, izin: 1 } } }, "s1", diniah);
  harap("kehadiran 18 dari 20 = 90", d.per.kehadiran, 90);
  boleh("diniah bawaan (pakai keaktifan & kehadiran) = 78,5", dekat(d.akhir, 78.5));
  const rusak = hitungNilai({ ...lembarN(lengkap), hadir: { s1: { hadir: "<b>", sakit: "2", izin: -3 } } }, "s1", diniah);
  harap("isian kehadiran rusak jadi angka >= 0", JSON.stringify(rusak.hadir), JSON.stringify({ hadir: 0, sakit: 2, izin: 0 }));
  harap("nilai berupa teks nggak ikut dihitung", hitungNilai(lembarN({ k1: "80", k2: 60 }), "s1", umum).per.tugas, null);
  harap("nilai di luar 0–100 dari database dibuang (UH 1000 & 90 → 90)", hitungNilai(lembarN({ k2: 1000, k3: 90 }), "s1", umum).per.uh, 90);
  harap("nilaiSah: 0, 100, 75,5 dihitung terisi", [0, 100, 75.5].every(nilaiSah), true);
  harap("nilaiSah: 1000, -5, teks \"80\", NaN, null nggak dihitung terisi", [1000, -5, "80", NaN, null, undefined].some(nilaiSah), false);
  harap("nilai negatif dibuang", hitungNilai(lembarN({ k1: -5 }), "s1", umum).per.tugas, null);
  harap("belum ada nilai sama sekali → akhir kosong", hitungNilai(lembarN({}), "s1", umum).akhir, null);
  harap("lembar belum ada → akhir kosong", hitungNilai(null, "s1", umum).akhir, null);
  ctx.toko = { bobot: { "Paket B": { umum: { tugas: 50, uh: 50, uts: 0, uas: 0, keaktifan: 0, kehadiran: 0 } } } };
  boleh("bobot atur admin per jenjang dipakai (tugas 50, UH 50 → 80)", dekat(hitungNilai(lembarN(lengkap), "s1", umum).akhir, 80));
  boleh("jenjang lain tetap pakai bobot bawaan", dekat(hitungNilai(lembarN(lengkap), "s1", { ...umum, jenjang: "Paket C" }).akhir, 76));
  ctx.toko = { bobot: { umum: { tugas: 100, uh: 0, uts: 0, uas: 0 } } };
  boleh("bobot data lama (belum per jenjang) tetap kebaca", dekat(hitungNilai(lembarN(lengkap), "s1", umum).akhir, 80));
}

// =====================================================
grup("Cetak: paket acak & kunci jawaban");
{
  const deret = (benih) => { const a = angkaAcak(benih); return [a(), a(), a()].join(","); };
  harap("benih sama → angka acak sama", deret("x-B"), deret("x-B"));
  boleh("benih beda → angka acak beda", deret("x-B") !== deret("x-C"));
  const asal = [1, 2, 3, 4, 5, 6, 7, 8];
  const hasilKocok = kocok(asal, angkaAcak("k"));
  harap("kocok: isinya tetap sama", [...hasilKocok].sort().join(), asal.join());
  harap("kocok: daftar aslinya nggak diubah", asal.join(), "1,2,3,4,5,6,7,8");

  const pilihanAsli = ["Merah", "Kuning", "Hijau", "Biru", ""];
  const items = Array.from({ length: 10 }, (_, i) => ({
    soal: { id: "s" + i, jenis: "PG", teks: "Soal " + i, pilihan: [...pilihanAsli], kunci: i % 4 },
    bacaan: i === 3 || i === 4 || i === 5 ? { id: "bc" } : null
  })).concat([{ soal: { id: "e1", jenis: "Esai", teks: "Esai", pedoman: "" }, bacaan: null }]);
  const id = (l) => l.pg.map(x => x.soal.id).join(",");
  const A = siapkanLembar(items, "A", true, "ujian1");
  harap("paket A: urutan asli", id(A), items.slice(0, 10).map(x => x.soal.id).join(","));
  harap("paket A: pilihan nggak diacak", A.pg[0].soal.pilihan.join("|"), pilihanAsli.join("|"));
  const B = siapkanLembar(items, "B", true, "ujian1");
  harap("paket B dicetak ulang → urutan sama persis", id(siapkanLembar(items, "B", true, "ujian1")), id(B));
  boleh("paket B beda urutan dari paket C", id(B) !== id(siapkanLembar(items, "C", true, "ujian1")));
  harap("paket B: semua soal tetap ada", B.pg.map(x => x.soal.id).sort().join(), items.slice(0, 10).map(x => x.soal.id).sort().join());
  const posBacaan = B.pg.map((x, i) => x.bacaan ? i : -1).filter(i => i >= 0);
  boleh("soal satu teks bacaan tetap berurutan", posBacaan[2] - posBacaan[0] === 2);
  boleh("kunci tetap nunjuk jawaban yang benar setelah pilihan diacak",
    B.pg.every(x => x.soal.pilihan[x.soal.kunci] === pilihanAsli[Number(x.soal.id.slice(1)) % 4]));
  boleh("pilihan kosong nggak ikut dicetak", B.pg.every(x => x.soal.pilihan.length === 4));
  harap("esai dipisah dari PG", B.esai.map(x => x.soal.id).join(), "e1");
  harap("tanpa acak pilihan: pilihan tetap urut", siapkanLembar(items, "B", false, "ujian1").pg[0].soal.pilihan.join("|"), pilihanAsli.join("|"));
}

// =====================================================
grup("Batas ukuran dokumen sebelum disimpan");
{
  const pesan = [];
  ctx.kabar = (t) => pesan.push(t);
  const dok = (id, kb) => ({ id, isi: "x".repeat(kb * 1024) });
  boleh("dokumen kecil boleh", muatDiDok(dok("a", 10), null, "Modul"));
  harap("dokumen kecil: nggak ada pesan", pesan.length, 0);
  tolak("dokumen baru di atas batas ditolak", muatDiDok(dok("b", 950), null, "Modul"));
  boleh("ditolak → guru dikasih tau", /TIDAK disimpan/.test(pesan.pop()));
  tolak("dokumen yang makin gede di atas batas ditolak", muatDiDok(dok("c", 950), dok("c", 920), "Modul"));
  pesan.length = 0;
  boleh("dokumen kegedean yang dikecilin tetap boleh disimpan", muatDiDok(dok("d", 950), dok("d", 990), "Modul"));
  pesan.length = 0;
  boleh("mendekati batas: boleh, tapi diingetin", muatDiDok(dok("e", 800), null, "Ujian") && /mendekati batas/.test(pesan.pop() || ""));
  muatDiDok(dok("e", 810), null, "Ujian");
  harap("pengingat mendekati batas cuma sekali per dokumen", pesan.length, 0);
}

