import { cookies } from 'next/headers';
import { realUser } from '@/lib/auth';
import { listAll } from '@/lib/airtable';
import { ACCESS } from '@/lib/config';

const guard = async () => { const u = await realUser(); return u && !u.blocked && u.admin ? u : null; };

export async function GET() {
  if (!(await guard())) return Response.json({ error: 'forbidden' }, { status: 403 });
  const f = ACCESS.f;
  try {
    const r = await listAll(ACCESS.table, { base: ACCESS.base, filter: `AND({Level Akses}='Mentor',{Aktif})`, fields: [f.email, f.nama] });
    const mentors = r.map((x) => ({ email: String(x.fields[f.email] || '').toLowerCase(), nama: x.fields[f.nama] || '' })).filter((x) => x.email).sort((a, b) => (a.nama || a.email).localeCompare(b.nama || b.email));
    return Response.json({ mentors });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}
export async function POST(req) {
  if (!(await guard())) return Response.json({ error: 'forbidden' }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  const email = String(b.email || '').trim().toLowerCase();
  if (!email.includes('@')) return Response.json({ error: 'Email tidak valid' }, { status: 400 });
  cookies().set('schole_viewas', email, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 8 });
  return Response.json({ ok: true });
}
export async function DELETE() {
  cookies().set('schole_viewas', '', { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 0 });
  return Response.json({ ok: true });
}
