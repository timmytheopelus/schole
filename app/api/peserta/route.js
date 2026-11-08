import { currentUser } from '@/lib/auth';
import { listHeaders, listDetails, babIn, sel } from '@/lib/queries';
import { H, D, babsFor } from '@/lib/config';
import { teamOf, kelompokOf, mentorNames } from '@/lib/team';

export async function GET(req) {
  const u = await currentUser();
  if (!u || u.blocked) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const tc = new URL(req.url).searchParams.get('tc');
  if (!tc) return Response.json({ peserta: [] });
  try {
    const [heads, dets] = await Promise.all([listHeaders(u, tc), listDetails(u, tc, babIn(tc))]);
    const byHead = {};
    for (const d of dets) {
      const hid = (d.fields[D.header] || [])[0];
      if (!hid) continue;
      const bab = d.fields[D.bab];
      const cur = (byHead[hid] ||= {});
      // Jika ada duplikat bab (mis. dua baris "Bab 4"), pilih yang sudah dinilai
      if (!cur[bab] || (d.fields[D.izin] && !cur[bab].izin)) {
        cur[bab] = { id: d.id, izin: sel(d.fields[D.izin]) || null, catatan: d.fields[D.catatan] || '', tugas: !!d.fields[D.tugas] };
      }
    }
    const babs = babsFor(tc, dets.map((d) => d.fields[D.bab]));
    const peserta = heads.map((h) => {
      const f = h.fields;
      const status = sel(f[H.status]) || 'Peserta Aktif';
      const bab = babs.map((b) => ({ bab: b, ...(byHead[h.id]?.[b] || { id: null, izin: null, catatan: '', tugas: false }) }));
      const dinilai = bab.filter((b) => b.izin).length;
      return {
        id: h.id, nama: f[H.nama] || '', ku: f[H.ku] || '', mentor: mentorNames(f).join(', '), hp: f[H.hp] || '', usia: (f[H.usia] || [])[0] || null,
        kelompok: kelompokOf(f), tim: teamOf(f), status, dinilai, nonton: f[H.nonton] || 0, keterangan: String(f[H.keterangan] || '').trim(), diubahOleh: f[H.submittedBy] || '',
        // Lulus tetapi belum ada penilaian bab di Schole = status berasal dari data historis (diimpor), bukan kesalahan
        historis: status === 'Lulus' && dinilai === 0,
        bab
      };
    }).sort((a, b) => (!a.nama) - (!b.nama) || a.nama.localeCompare(b.nama));
    return Response.json({ peserta, totalBab: babs.length });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}
