import { currentUser } from '@/lib/auth';
import { buildRekap, tcOverview } from '@/lib/rekap';
import { listTc } from '@/lib/queries';

export async function GET(req) {
  const u = await currentUser();
  if (!u || u.blocked) return Response.json({ error: 'unauthorized' }, { status: 401 });
  if (!u.viewAll) return Response.json({ error: 'forbidden' }, { status: 403 });
  const p = new URL(req.url).searchParams;
  try {
    if (p.get('overview')) {
      const [counts, tcs] = await Promise.all([tcOverview(), listTc(u)]);
      const byName = Object.fromEntries(counts.map((c) => [c.nama, c]));
      return Response.json({ tcs: tcs.map((t) => ({ ...t, ...(byName[t.nama] || { total: 0, 'Peserta Aktif': 0, Lulus: 0, 'Drop Out': 0 }) })) });
    }
    return Response.json(await buildRekap(u, { tc: p.get('tc'), ku: p.get('ku') || '', bab: p.get('bab') || '' }));
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}
