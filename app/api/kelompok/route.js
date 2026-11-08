import { currentUser } from '@/lib/auth';
import { listHeaders, sel } from '@/lib/queries';
import { H } from '@/lib/config';
import { teamOf, kelompokOf } from '@/lib/team';

// Tabel pengelompokan: kelompok -> tim pendamping (Mentor, Co-Mentor, dsb.) dan pesertanya. Superadmin dan Pengamat.
export async function GET(req) {
  const u = await currentUser();
  if (!u || u.blocked || !u.viewAll) return Response.json({ error: 'forbidden' }, { status: 403 });
  const tc = new URL(req.url).searchParams.get('tc');
  if (!tc) return Response.json({ kelompok: [] });
  try {
    const heads = await listHeaders(u, tc);
    const by = {};
    for (const h of heads) {
      const f = h.fields;
      const k = kelompokOf(f) || 'Tanpa kelompok';
      const g = (by[k] ||= { kelompok: k, tim: teamOf(f), peserta: [] });
      if (g.tim.length < teamOf(f).length) g.tim = teamOf(f);
      g.peserta.push({ id: h.id, nama: f[H.nama] || '', ku: f[H.ku] || '', hp: f[H.hp] || '', status: sel(f[H.status]) || 'Peserta Aktif' });
    }
    const num = (s) => parseInt(String(s).match(/\d+/)?.[0] || '9999', 10);
    const kelompok = Object.values(by).sort((a, b) => num(a.kelompok) - num(b.kelompok) || a.kelompok.localeCompare(b.kelompok));
    kelompok.forEach((g) => g.peserta.sort((a, b) => a.nama.localeCompare(b.nama)));
    return Response.json({ kelompok });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}
