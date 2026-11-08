import { currentUser } from '@/lib/auth';
import { getOne, updateOne } from '@/lib/airtable';
import { H, STATUS } from '@/lib/config';

// Ubah status kepesertaan (Peserta Aktif / Lulus / Drop Out). Lulus harus punya minimal 1 bab dinilai.
export async function PATCH(req, { params }) {
  const u = await currentUser();
  if (!u) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const { status } = await req.json();
  if (!STATUS.includes(status)) return Response.json({ error: 'Status tidak valid' }, { status: 400 });
  try {
    const rec = await getOne('tblZhieD2iLA6xSxa', params.id, [H.email, H.dinilai]);
    const emails = String(rec.fields[H.email] || '').split(',');
    if (!u.admin && !emails.includes(u.email)) return Response.json({ error: 'Bukan peserta Anda' }, { status: 403 });
    if (status === 'Lulus' && !(rec.fields[H.dinilai] > 0)) return Response.json({ error: 'Nilai minimal satu bab sebelum meluluskan' }, { status: 422 });
    const r = await updateOne('tblZhieD2iLA6xSxa', params.id, { [H.status]: status, [H.submittedBy]: u.email });
    return Response.json({ ok: true, status: status, id: r.id });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}
