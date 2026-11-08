import { getOne, listAll, q } from './airtable';
import { T, H, D, HEV, HDET, EVF, MAT, PGJ, DET_LINK } from './config';
import { sel } from './queries';

export const ytId = (url) => {
  const m = String(url || '').match(/(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : '';
};
const urut = (j) => (/pendahuluan/i.test(j) ? 0 : /bab\s*(\d+)/i.exec(j) ? parseInt(/bab\s*(\d+)/i.exec(j)[1], 10) : 100);
const inIds = (ids) => `OR(${ids.map((i) => `RECORD_ID()=${q(i)}`).join(',')})`;

// Milik peserta yang login? Mengembalikan baris header, atau melempar error.
export async function ownHeader(u, id) {
  const h = await getOne(T.header, id, [H.emailPeserta, H.tc, HEV, HDET]);
  if ((h.fields[H.emailPeserta] || '').toLowerCase() !== u.email) { const e = new Error('Bukan data Anda'); e.status = 403; throw e; }
  return h;
}

// Perjalanan belajar: daftar video berurutan, status selesai/saat ini/terkunci. Tanpa URL.
export async function journey(h) {
  const evId = (h.fields[HEV] || [])[0];
  if (!evId) return { items: [], url: {} };
  const ev = await getOne(T.event, evId, [EVF.materi]);
  const matIds = ev.fields[EVF.materi] || [];
  let pgjIds = [];
  for (const m of matIds) { const r = await getOne(MAT.tbl, m, [MAT.pengajaran]); pgjIds.push(...(r.fields[MAT.pengajaran] || [])); }
  const pg = pgjIds.length ? await listAll(PGJ.tbl, { filter: inIds(pgjIds), fields: [PGJ.judul, PGJ.yt, PGJ.status, PGJ.materi] }) : [];
  const aktif = pg.filter((x) => !/non/i.test(sel(x.fields[PGJ.status]) || '')).filter((x) => ytId(x.fields[PGJ.yt]));
  aktif.sort((a, b) => urut(a.fields[PGJ.judul] || '') - urut(b.fields[PGJ.judul] || '') || String(a.fields[PGJ.judul]).localeCompare(String(b.fields[PGJ.judul])));
  const detIds = h.fields[HDET] || [];
  const dets = detIds.length ? await listAll(T.detail, { filter: inIds(detIds), fields: [D.status, DET_LINK.pengajaran] }) : [];
  const done = new Set();
  for (const d of dets) if (/selesai/i.test(sel(d.fields[D.status]) || '')) (d.fields[DET_LINK.pengajaran] || []).forEach((i) => done.add(i));
  let cur = false;
  const items = aktif.map((x, i) => {
    const d = done.has(x.id);
    const state = d ? 'done' : !cur ? 'current' : 'locked';
    if (!d) cur = true;
    return { id: x.id, no: i + 1, judul: x.fields[PGJ.judul] || 'Video ' + (i + 1), state, materi: (x.fields[PGJ.materi] || [])[0] || matIds[0] || null };
  });
  return { items, url: Object.fromEntries(aktif.map((x) => [x.id, x.fields[PGJ.yt]])) };
}
