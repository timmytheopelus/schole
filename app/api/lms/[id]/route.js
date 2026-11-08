import { currentUser } from '@/lib/auth';
import { ownHeader, journey } from '@/lib/lms';
import { H } from '@/lib/config';

// Perjalanan belajar peserta. Tidak pernah mengirim URL video.
export async function GET(req, { params }) {
  const u = await currentUser();
  if (!u || u.blocked) return Response.json({ error: 'unauthorized' }, { status: 401 });
  try {
    const h = await ownHeader(u, params.id);
    const j = await journey(h);
    return Response.json({ tc: h.fields[H.tc] || '', items: j.items.map(({ materi, ...x }) => x), readOnly: !!u.viewingAs });
  } catch (e) { return Response.json({ error: e.message }, { status: e.status || 500 }); }
}
