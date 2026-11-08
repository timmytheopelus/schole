import { listHeaders, listDetails, babIn, sel } from './queries';
import { listAll, q } from './airtable';
import { T, H, D, BAB } from './config';

// Rekap superadmin. Penyaringan (TC, keuskupan, bab) dijalankan oleh Airtable lewat filterByFormula,
// berdasarkan field teks di tabel (Keuskupan, Bab, Nama TC), sehingga hasilnya selalu mengikuti isi tabel.
export async function buildRekap(user, { tc, ku, bab }) {
  const kuCond = ku ? `{Keuskupan}=${q(ku)}` : null;
  const heads = await listHeaders(user, tc, kuCond);
  const dets = await listDetails(user, tc, [babIn(), kuCond, bab ? `{Bab}=${q(bab)}` : null].filter(Boolean).reduce((a, c) => (a ? `AND(${a},${c})` : c), ''));

  const sum = { total: heads.length, 'Peserta Aktif': 0, Lulus: 0, 'Drop Out': 0 };
  const perKu = {};
  const rows = heads.map((h) => {
    const f = h.fields;
    const st = sel(f[H.status]) || 'Peserta Aktif';
    sum[st] = (sum[st] || 0) + 1;
    const k = f[H.ku] || 'Tanpa keuskupan';
    (perKu[k] ||= { ku: k, 'Peserta Aktif': 0, Lulus: 0, 'Drop Out': 0, total: 0 });
    perKu[k][st]++; perKu[k].total++;
    return { id: h.id, nama: f[H.nama] || '', ku: k, mentor: f[H.mentor] || '', status: st, nonton: f[H.nonton] || 0, dinilai: f[H.dinilai] || 0 };
  });

  const perBab = Object.fromEntries(BAB.map((b) => [b, { bab: b, nonton: 0, tugas: 0, boleh: 0, damping: 0 }]));
  const doneInBab = new Set();
  for (const d of dets) {
    const b = perBab[d.fields[D.bab]];
    if (!b) continue;
    b.nonton++;
    if (d.fields[D.tugas]) b.tugas++;
    const iz = sel(d.fields[D.izin]);
    if (iz === 'Boleh mengajar') b.boleh++;
    if (iz === 'Boleh mengajar, didampingi') b.damping++;
    doneInBab.add((d.fields[D.header] || [])[0]);
  }
  const babRow = bab ? perBab[bab] : null;
  if (bab) rows.forEach((r) => { r.babSelesai = doneInBab.has(r.id); });
  return { sum, perKu: Object.values(perKu).sort((a, b) => b.total - a.total), perBab: Object.values(perBab), babRow, rows: rows.sort((a, b) => a.nama.localeCompare(b.nama)) };
}

// Ringkasan semua TC (tab "Per TC")
export async function tcOverview() {
  const heads = await listAll(T.header, { fields: [H.tc, H.status] });
  const map = {};
  for (const h of heads) {
    const t = h.fields[H.tc] || '-';
    (map[t] ||= { nama: t, total: 0, 'Peserta Aktif': 0, Lulus: 0, 'Drop Out': 0 });
    const st = sel(h.fields[H.status]) || 'Peserta Aktif';
    map[t].total++; map[t][st]++;
  }
  return Object.values(map);
}
