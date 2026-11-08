import { currentUser } from '@/lib/auth';
import { listHeaders, listDetails, babIn, sel } from '@/lib/queries';
import { H, D, BAB } from '@/lib/config';

export async function GET(req) {
  const u = await currentUser();
  if (!u) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const tc = new URL(req.url).searchParams.get('tc');
  if (!tc) return Response.json({ peserta: [] });
  try {
    const [heads, dets] = await Promise.all([listHeaders(u, tc), listDetails(u, tc, babIn())]);
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
    const peserta = heads.map((h) => {
      const f = h.fields;
      return {
        id: h.id, nama: f[H.nama] || '', ku: f[H.ku] || '', mentor: f[H.mentor] || '', hp: f[H.hp] || '', usia: (f[H.usia] || [])[0] || null,
        status: sel(f[H.status]) || 'Peserta Aktif', dinilai: f[H.dinilai] || 0, cekLulus: f[H.cekLulus] || 'OK', keterangan: f[H.keterangan] || '',
        bab: BAB.map((b) => ({ bab: b, ...(byHead[h.id]?.[b] || { id: null, izin: null, catatan: '', tugas: false }) }))
      };
    }).sort((a, b) => a.nama.localeCompare(b.nama));
    return Response.json({ peserta });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}
