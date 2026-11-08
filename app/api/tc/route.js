import { currentUser } from '@/lib/auth';
import { listTc } from '@/lib/queries';

export async function GET() {
  const u = await currentUser();
  if (!u || u.blocked) return Response.json({ error: 'unauthorized' }, { status: 401 });
  try { return Response.json({ tcs: await listTc(u) }); } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}
