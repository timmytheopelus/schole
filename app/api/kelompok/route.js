import { currentUser } from '@/lib/auth';
import { listHeaders, sel } from '@/lib/queries';
import { H } from '@/lib/config';
import { teamOf, kelompokOf, parseKelompok } from '@/lib/team';

const GROUP_ROLES = ['Mentor', 'Co-Mentor'];
const sig = (tim) => tim.map((o) => o.hp || o.nama).sort().join('|');

// Tabel pengelompokan: kelompok -> mentor/co-mentor dan pesertanya. Superadmin dan Pengamat.
// Pendamping Teknis dan Pengolah Data yang sama untuk semua kelompok ditampilkan sekali di `timBersama`.
export async function GET(req) {
  const u = await currentUser();
  if (!u || u.blocked || !u.viewAll) return Response.json({ error: 'forbidden' }, { status: 403 });
  const tc = new URL(req.url).searchParams.get('tc');
  if (!tc) return Response.json({ kelompok: [], timBersama: [] });
  try {
    const heads = await listHeaders(u, tc);
    const by = {};
    for (const h of heads) {
      const f = h.fields;
      const k = kelompokOf(f) || 'Tanpa kelompok';
      const g = (by[k] ||= { kelompok: k, ...parseKelompok(k), tim: [], peserta: [] });
      const t = teamOf(f);
      if (g.tim.length < t.length) g.tim = t;
      g.peserta.push({ id: h.id, nama: f[H.nama] || '', ku: f[H.ku] || '', hp: f[H.hp] || '', status: sel(f[H.status]) || 'Peserta Aktif' });
    }
    const groups = Object.values(by);
    // Tim pendukung yang identik di setiap kelompok -> satu bagian bersama
    const support = (g) => g.tim.filter((o) => !GROUP_ROLES.includes(o.peran));
    let timBersama = [];
    if (groups.length > 1) {
      const first = sig(support(groups[0]));
      if (first && groups.every((g) => sig(support(g)) === first)) timBersama = support(groups[0]);
    }
    if (timBersama.length) groups.forEach((g) => { g.tim = g.tim.filter((o) => GROUP_ROLES.includes(o.peran)); });

    const num = (s) => parseInt(String(s).match(/\d+/)?.[0] || '9999', 10);
    groups.sort((a, b) => num(a.kelompok) - num(b.kelompok) || a.kelompok.localeCompare(b.kelompok));
    groups.forEach((g) => {
      g.peserta.sort((a, b) => (!a.nama) - (!b.nama) || a.nama.localeCompare(b.nama));
      g.dropout = g.peserta.filter((x) => x.status === 'Drop Out').length;
      g.lulus = g.peserta.filter((x) => x.status === 'Lulus').length;
    });
    return Response.json({ kelompok: groups, timBersama });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}
