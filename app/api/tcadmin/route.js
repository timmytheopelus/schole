import { currentUser } from '@/lib/auth';
import { listAll, createOne, q } from '@/lib/airtable';
import { T, EVF } from '@/lib/config';

// Daftar TC yang ada (untuk dipakai sebagai acuan salin Materi TC) dan pembuatan TC baru.
export async function GET() {
  const u = await currentUser();
  if (!u || u.blocked || !u.admin) return Response.json({ error: 'forbidden' }, { status: 403 });
  try {
    const r = await listAll(T.event, { fields: Object.values(EVF) });
    const events = r.map((x) => ({ id: x.id, nama: x.fields[EVF.nama] || '', mulai: x.fields[EVF.mulai] || '', selesai: x.fields[EVF.selesai] || '', materi: (x.fields[EVF.materi] || []).length }))
      .filter((x) => x.nama).sort((a, b) => String(b.mulai).localeCompare(String(a.mulai)));
    return Response.json({ events });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}

export async function POST(req) {
  const u = await currentUser();
  if (!u || u.blocked || !u.admin) return Response.json({ error: 'forbidden' }, { status: 403 });
  if (u.viewingAs) return Response.json({ error: 'Tidak bisa dalam mode lihat sebagai' }, { status: 403 });
  const b = await req.json();
  const nama = String(b.nama || '').trim();
  const date = /^\d{4}-\d{2}-\d{2}$/;
  if (!nama) return Response.json({ error: 'Nama TC wajib diisi' }, { status: 400 });
  if (!date.test(b.mulai || '') || !date.test(b.selesai || '')) return Response.json({ error: 'Tanggal mulai dan selesai wajib diisi' }, { status: 400 });
  if (b.selesai < b.mulai) return Response.json({ error: 'Tanggal selesai harus setelah tanggal mulai' }, { status: 400 });
  try {
    const dup = await listAll(T.event, { filter: `{EventTC}=${q(nama)}`, fields: [EVF.nama] });
    if (dup.length) return Response.json({ error: 'Nama TC sudah ada' }, { status: 409 });
    let materi = [];
    if (b.salinDari) {
      const ref = await listAll(T.event, { filter: `RECORD_ID()=${q(b.salinDari)}`, fields: [EVF.materi] });
      materi = ref[0]?.fields[EVF.materi] || [];
    }
    const fields = { [EVF.nama]: nama, [EVF.mulai]: b.mulai, [EVF.selesai]: b.selesai };
    if (materi.length) fields[EVF.materi] = materi;
    const r = await createOne(T.event, fields);
    return Response.json({ ok: true, id: r.id, materi: materi.length });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}
