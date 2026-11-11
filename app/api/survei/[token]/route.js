import { readToken, loadFor, savePerson, DEADLINE, LOCK } from '@/lib/survey';

export const dynamic = 'force-dynamic';
const bad = (m, s) => Response.json({ error: m }, { status: s });

export async function GET(req, { params }) {
  const who = readToken(params.token);
  if (!who) return bad('Link tidak valid', 401);
  try {
    const peserta = await loadFor(who);
    return Response.json({ mentor: who.nama, email: who.email, deadline: DEADLINE, lock: LOCK, peserta });
  } catch (e) { return bad(e.message, 500); }
}

// Body: { aksi: 'simpan' | 'kirim', items: [{ id, keputusan, bab: [{ id, izin, catatan }] }] }
export async function POST(req, { params }) {
  const who = readToken(params.token);
  if (!who) return bad('Link tidak valid', 401);
  const { aksi, items } = await req.json();
  if (!['simpan', 'kirim'].includes(aksi) || !Array.isArray(items)) return bad('Permintaan tidak valid', 400);
  try {
    const own = await loadFor(who);
    const byId = Object.fromEntries(own.map((p) => [p.id, p]));
    const kirim = aksi === 'kirim';
    if (kirim) for (const p of own) { if (!(items.find((i) => i.id === p.id) || {}).keputusan && !p.keputusan) return bad('Tentukan keputusan untuk ' + p.nama, 422); }
    let n = 0;
    for (const it of items) {
      const p = byId[it.id];
      if (!p) return bad('Peserta bukan milik Anda', 403);
      if (LOCK && p.terkirim) continue;
      n += await savePerson(who, p, it, false);
    }
    if (kirim) for (const p of own) { if (LOCK && p.terkirim) continue; n += await savePerson(who, p, items.find((i) => i.id === p.id) || { id: p.id, keputusan: p.keputusan, bab: p.bab }, true); }
    return Response.json({ ok: true, ditulis: n });
  } catch (e) { return bad(e.message, e.status || 500); }
}
