import { currentUser } from '@/lib/auth';
import { getOne, listAll, q } from '@/lib/airtable';
import { T, H, D, BAB } from '@/lib/config';
import { sel } from '@/lib/queries';

// Progres belajar peserta sendiri (hanya baca). Baris header harus milik email yang login.
export async function GET(req, { params }) {
  const u = await currentUser();
  if (!u || u.blocked) return Response.json({ error: 'unauthorized' }, { status: 401 });
  try {
    const h = await getOne(T.header, params.id, [...Object.values(H), 'fldxME5Jftq8f07RC']);
    if ((h.fields[H.emailPeserta] || '').toLowerCase() !== u.email) return Response.json({ error: 'Bukan data Anda' }, { status: 403 });
    const ids = h.fields['fldxME5Jftq8f07RC'] || [];
    const dets = ids.length ? await listAll(T.detail, { filter: `OR(${ids.map((i) => `RECORD_ID()=${q(i)}`).join(',')})`, fields: Object.values(D) }) : [];
    const by = {};
    for (const d of dets) {
      const bab = d.fields[D.bab]; if (!BAB.includes(bab)) continue;
      const cur = by[bab];
      if (!cur || (d.fields[D.izin] && !cur.izin)) by[bab] = { izin: sel(d.fields[D.izin]) || null, catatan: d.fields[D.catatan] || '', tugas: !!d.fields[D.tugas] };
    }
    const f = h.fields;
    return Response.json({ tc: f[H.tc], status: sel(f[H.status]) || 'Peserta Aktif', mentor: f[H.mentor] || '', nonton: f[H.nonton] || 0, keterangan: f[H.keterangan] || '',
      bab: BAB.map((b) => ({ bab: b, ...(by[b] || { izin: null, catatan: '', tugas: false, belum: true }) })) });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}
