import { currentUser } from '@/lib/auth';
import { getOne } from '@/lib/airtable';
import { BPN } from '@/lib/config';
import { personsByIds } from '@/lib/bpn';

// Pengajar terdaftar pada satu modul: nama, keuskupan, spesialisasi bab
export async function GET(req, { params }) {
  const u = await currentUser();
  if (!u || u.blocked || !u.admin) return Response.json({ error: 'forbidden' }, { status: 403 });
  try {
    const m = await getOne(BPN.modul, params.id, [BPN.m.nama, BPN.m.pengajar], BPN.base);
    const ids = m.fields[BPN.m.pengajar] || [];
    const pengajar = ids.length ? await personsByIds(ids) : [];
    pengajar.sort((a, b) => a.nama.localeCompare(b.nama));
    return Response.json({ nama: m.fields[BPN.m.nama] || '', jumlah: pengajar.length, pengajar });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}
