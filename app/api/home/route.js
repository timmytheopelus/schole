import { currentUser } from '@/lib/auth';
import { listMentorTc, listLearnerTc } from '@/lib/queries';

export async function GET() {
  const u = await currentUser();
  if (!u || u.blocked) return Response.json({ error: 'unauthorized' }, { status: 401 });
  try {
    const [mentor, peserta] = await Promise.all([listMentorTc(u.email), listLearnerTc(u.email)]);
    return Response.json({ mentor, peserta });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}
