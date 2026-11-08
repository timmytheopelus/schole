import { currentUser } from '@/lib/auth';
import { listAll, createOne, q } from '@/lib/airtable';
import { ACCESS, LEVEL } from '@/lib/config';
import { personsByEmail } from '@/lib/bpn';

const f = ACCESS.f;
const shape = (r) => ({ id: r.id, email: r.fields[f.email] || '', nama: r.fields[f.nama] || '', level: r.fields[f.level]?.name || r.fields[f.level] || 'Mentor', aktif: !!r.fields[f.aktif], catatan: r.fields[f.catatan] || '' });

export async function GET() {
  const u = await currentUser();
  if (!u || u.blocked || !u.admin) return Response.json({ error: 'forbidden' }, { status: 403 });
  try {
    const rows = await listAll(ACCESS.table, { base: ACCESS.base, fields: Object.values(f) });
    const users = rows.map(shape).sort((a, b) => a.email.localeCompare(b.email));
    let profil = {};
    try { profil = await personsByEmail(users.map((x) => x.email.toLowerCase())); } catch (e) { profil = {}; }
    return Response.json({ users: users.map((x) => ({ ...x, profil: profil[x.email.toLowerCase()] || null })) });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}

export async function POST(req) {
  const u = await currentUser();
  if (!u || u.blocked || !u.admin) return Response.json({ error: 'forbidden' }, { status: 403 });
  const b = await req.json();
  const email = String(b.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: 'Email tidak valid' }, { status: 400 });
  if (!LEVEL.includes(b.level)) return Response.json({ error: 'Level tidak valid' }, { status: 400 });
  try {
    const dup = await listAll(ACCESS.table, { base: ACCESS.base, filter: `LOWER({Email})=${q(email)}`, fields: [f.email] });
    if (dup.length) return Response.json({ error: 'Email sudah terdaftar' }, { status: 409 });
    const r = await createOne(ACCESS.table, { [f.email]: email, [f.nama]: String(b.nama || '').trim(), [f.level]: b.level, [f.aktif]: true, [f.catatan]: String(b.catatan || ''), [f.oleh]: u.email, [f.tgl]: new Date().toISOString() }, ACCESS.base);
    return Response.json({ user: shape(r) });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}
