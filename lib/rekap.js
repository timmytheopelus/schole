import { listHeaders, listDetails, babIn, sel } from './queries';
import { listAll, q } from './airtable';
import { T, H, D, babsFor } from './config';
import { mentorNames, kelompokOf } from './team';

const STATUSES = ['Peserta Aktif', 'Lulus', 'Drop Out'];
const blank = () => ({ 'Peserta Aktif': 0, Lulus: 0, 'Drop Out': 0, total: 0 });
export const statusOf = (h) => sel(h.fields[H.status]) || 'Peserta Aktif';

// Satu-satunya tempat hitungan status dibuat, dipakai oleh rekap per TC maupun ringkasan semua TC,
// supaya angka di kedua tampilan selalu sama.
export function tally(heads) {
  const sum = blank();
  for (const h of heads) {
    const st = statusOf(h);
    sum[st] = (sum[st] || 0) + 1;
    sum.total++;
  }
  return sum;
}

// Rekap superadmin. Penyaringan (TC, keuskupan, bab) dijalankan oleh Airtable lewat filterByFormula,
// berdasarkan field teks di tabel (Keuskupan, Bab, Nama TC), sehingga hasilnya selalu mengikuti isi tabel.
export async function buildRekap(user, { tc, ku, bab }) {
  const kuCond = ku ? `{Keuskupan}=${q(ku)}` : null;
  const heads = await listHeaders(user, tc, kuCond);
  // Program tanpa peserta: tidak perlu mengambil detail apa pun
  const dets = heads.length
    ? await listDetails(user, tc, [babIn(tc), kuCond, bab ? `{Bab}=${q(bab)}` : null].filter(Boolean).reduce((a, c) => (a ? `AND(${a},${c})` : c), ''))
    : [];

  const sum = tally(heads);
  const perKu = {};
  const perKel = {};
  let lulusTanpaNilai = 0;
  const rows = heads.map((h) => {
    const f = h.fields;
    const st = statusOf(h);
    const k = f[H.ku] || 'Tanpa keuskupan';
    (perKu[k] ||= { ku: k, ...blank() });
    perKu[k][st]++; perKu[k].total++;
    const kel = kelompokOf(f);
    if (kel) { (perKel[kel] ||= { kelompok: kel, ...blank() }); perKel[kel][st]++; perKel[kel].total++; }
    const dinilai = f[H.dinilai] || 0;
    if (st === 'Lulus' && dinilai === 0) lulusTanpaNilai++;
    return { id: h.id, nama: f[H.nama] || '', ku: k, mentor: mentorNames(f).join(', '), status: st, nonton: f[H.nonton] || 0, dinilai, ket: st === 'Drop Out' ? String(f[H.keterangan] || '').trim().slice(0, 160) : '' };
  });

  const babs = babsFor(tc, dets.map((d) => d.fields[D.bab]));
  const perBab = Object.fromEntries(babs.map((b) => [b, { bab: b, nonton: 0, tugas: 0, boleh: 0, damping: 0 }]));
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
  const babRow = bab ? perBab[bab] || null : null;
  if (bab) rows.forEach((r) => { r.babSelesai = doneInBab.has(r.id); });

  // Kelompok berisiko: separuh anggotanya atau lebih Drop Out (minimal 2 orang)
  const risiko = Object.values(perKel).filter((g) => g['Drop Out'] >= 2 && g['Drop Out'] / g.total >= 0.5).sort((a, b) => b['Drop Out'] / b.total - a['Drop Out'] / a.total || b['Drop Out'] - a['Drop Out']);

  // Peserta tanpa nama diletakkan di akhir daftar
  rows.sort((a, b) => (!a.nama) - (!b.nama) || a.nama.localeCompare(b.nama));
  return { sum, perKu: Object.values(perKu).sort((a, b) => b.total - a.total), perBab: Object.values(perBab), babs, babRow, rows, lulusTanpaNilai, tanpaNama: rows.filter((r) => !r.nama).length, risiko };
}

// Ringkasan semua TC (tab "Per TC"). Memakai tally() yang sama dengan buildRekap.
export async function tcOverview() {
  const heads = await listAll(T.header, { fields: [H.tc, H.status] });
  const by = {};
  for (const h of heads) (by[h.fields[H.tc] || '-'] ||= []).push(h);
  return Object.entries(by).map(([nama, hs]) => ({ nama, ...tally(hs) }));
}

export { STATUSES };
