import { currentUser } from '@/lib/auth';
import { listAll } from '@/lib/airtable';
import { BPN } from '@/lib/config';
import { sel } from '@/lib/queries';

// Daftar modul berjenjang dari BPN (M-Modul Berjenjang)
export async function GET() {
  const u = await currentUser();
  if (!u || u.blocked || !u.admin) return Response.json({ error: 'forbidden' }, { status: 403 });
  try {
    const r = await listAll(BPN.modul, { base: BPN.base, fields: Object.values(BPN.m) });
    const modul = r.map((x) => ({ id: x.id, nama: x.fields[BPN.m.nama] || '', tahap: (sel(x.fields[BPN.m.tahap]) || '').trim(), jumlah: x.fields[BPN.m.jumlah] || (x.fields[BPN.m.pengajar] || []).length })).filter((x) => x.nama);
    modul.sort((a, b) => a.tahap.localeCompare(b.tahap) || a.nama.localeCompare(b.nama));
    return Response.json({ modul });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}
