import { currentUser } from '@/lib/auth';
import { ownHeader, journey, ytId } from '@/lib/lms';

// Hanya ID video untuk video yang sudah terbuka (selesai atau sedang giliran). Tautan penuh tidak dikirim.
export async function GET(req, { params }) {
  const u = await currentUser();
  if (!u || u.blocked) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const p = new URL(req.url).searchParams.get('p');
  try {
    const h = await ownHeader(u, params.id);
    const j = await journey(h);
    const it = j.items.find((x) => x.id === p);
    if (!it) return Response.json({ error: 'Video tidak ditemukan' }, { status: 404 });
    if (it.state === 'locked') return Response.json({ error: 'Selesaikan video sebelumnya dulu' }, { status: 403 });
    return Response.json({ vid: ytId(j.url[p]), state: it.state }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) { return Response.json({ error: e.message }, { status: e.status || 500 }); }
}
