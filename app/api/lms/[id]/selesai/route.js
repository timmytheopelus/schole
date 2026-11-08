import { currentUser } from '@/lib/auth';
import { createOne } from '@/lib/airtable';
import { ownHeader, journey } from '@/lib/lms';
import { T, D, DET_LINK } from '@/lib/config';

// "Selesai menonton": hanya untuk video yang sedang giliran. Membuat satu baris LMS Detail.
export async function POST(req, { params }) {
  const u = await currentUser();
  if (!u || u.blocked) return Response.json({ error: 'unauthorized' }, { status: 401 });
  if (u.viewingAs) return Response.json({ error: 'Mode lihat sebagai hanya untuk melihat' }, { status: 403 });
  const { p } = await req.json();
  try {
    const h = await ownHeader(u, params.id);
    const j = await journey(h);
    const it = j.items.find((x) => x.id === p);
    if (!it) return Response.json({ error: 'Video tidak ditemukan' }, { status: 404 });
    if (it.state === 'done') return Response.json({ ok: true, sudah: true });
    if (it.state === 'locked') return Response.json({ error: 'Selesaikan video sebelumnya dulu' }, { status: 403 });
    const f = { [D.header]: [params.id], [DET_LINK.pengajaran]: [p], [D.status]: 'Selesai Menonton' };
    if (it.materi) f[DET_LINK.materi] = [it.materi];
    await createOne(T.detail, f);
    return Response.json({ ok: true });
  } catch (e) { return Response.json({ error: e.message }, { status: e.status || 500 }); }
}
