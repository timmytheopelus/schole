import { currentUser } from '@/lib/auth';
import { getOne, updateOne } from '@/lib/airtable';
import { ACCESS, LEVEL } from '@/lib/config';

const f = ACCESS.f;

// Ubah level, status aktif, nama atau catatan pengguna. Superadmin tidak bisa menurunkan/memblokir dirinya sendiri.
export async function PATCH(req, { params }) {
  const u = await currentUser();
  if (!u || u.blocked || !u.admin) return Response.json({ error: 'forbidden' }, { status: 403 });
  const b = await req.json();
  const fields = {};
  if (b.level !== undefined) { if (!LEVEL.includes(b.level)) return Response.json({ error: 'Level tidak valid' }, { status: 400 }); fields[f.level] = b.level; }
  if (b.aktif !== undefined) fields[f.aktif] = !!b.aktif;
  if (b.nama !== undefined) fields[f.nama] = String(b.nama).trim();
  if (b.catatan !== undefined) fields[f.catatan] = String(b.catatan);
  if (!Object.keys(fields).length) return Response.json({ error: 'Tidak ada perubahan' }, { status: 400 });
  try {
    const rec = await getOne(ACCESS.table, params.id, [f.email], ACCESS.base).catch(() => null);
    const target = String(rec?.fields?.[f.email] || '').toLowerCase();
    if (target === u.email && ((fields[f.level] && fields[f.level] !== 'Superadmin') || fields[f.aktif] === false)) {
      return Response.json({ error: 'Anda tidak bisa menurunkan atau memblokir akun sendiri' }, { status: 422 });
    }
    fields[f.oleh] = u.email; fields[f.tgl] = new Date().toISOString();
    await updateOne(ACCESS.table, params.id, fields, ACCESS.base);
    return Response.json({ ok: true });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}
