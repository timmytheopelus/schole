import { currentUser } from '@/lib/auth';
import { getOne, updateOne } from '@/lib/airtable';
import { D, IZIN } from '@/lib/config';

// Simpan penilaian satu bab. Catatan wajib jika "Boleh mengajar, didampingi". Boleh diubah kapan saja (juga setelah Lulus).
export async function PATCH(req, { params }) {
  const u = await currentUser();
  if (!u || u.blocked) return Response.json({ error: 'unauthorized' }, { status: 401 });
  if (!u.canWrite) return Response.json({ error: 'Level Pengamat hanya bisa melihat' }, { status: 403 });
  const { izin, catatan } = await req.json();
  if (izin !== null && !IZIN.includes(izin)) return Response.json({ error: 'Izin tidak valid' }, { status: 400 });
  const note = String(catatan || '').trim();
  if (izin === IZIN[1] && !note) return Response.json({ error: 'Catatan wajib diisi untuk "Perlu pendampingan"' }, { status: 422 });
  try {
    const rec = await getOne('tblHdbfsd6vT0pxp5', params.id, [D.email]);
    const emails = String(rec.fields[D.email] || '').split(',');
    if (!u.admin && !emails.includes(u.email)) return Response.json({ error: 'Bukan peserta Anda' }, { status: 403 });
    await updateOne('tblHdbfsd6vT0pxp5', params.id, { [D.izin]: izin, [D.catatan]: note, [D.oleh]: u.actor || u.email, [D.tgl]: new Date().toISOString() });
    return Response.json({ ok: true });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}
