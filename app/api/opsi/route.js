import { NextResponse } from 'next/server';
import { listAll } from '@/lib/airtable';
import { BPN, SIGNUP as S, JENIS_PD } from '@/lib/config';

export const dynamic = 'force-dynamic';
const TTL = 10 * 60 * 1000;
const cache = {};
async function cached(key, load) {
  const c = cache[key];
  if (c && Date.now() - c.t < TTL) return c.v;
  const v = await load();
  cache[key] = { t: Date.now(), v };
  return v;
}
const byName = (a, b) => a.nama.localeCompare(b.nama, 'id');

// Daftar pilihan untuk form sign up (data master BPN). Hanya nama dan ID.
export async function GET(req) {
  const u = new URL(req.url);
  const jenis = u.searchParams.get('jenis');
  const ku = u.searchParams.get('ku') || '';
  try {
    if (jenis === 'keuskupan') {
      const v = await cached('ku', async () => (await listAll(BPN.bpk, { base: S.base, fields: [BPN.bpkNama] })).map((r) => ({ id: r.id, nama: String(r.fields[BPN.bpkNama] || '').trim() })).filter((x) => x.nama).sort(byName));
      return NextResponse.json({ items: v });
    }
    if (jenis === 'kota') {
      const v = await cached('kota', async () => (await listAll(S.kota, { base: S.base, fields: [S.kota_f.nama, S.kota_f.prov] })).map((r) => ({ id: r.id, nama: String(r.fields[S.kota_f.nama] || '').trim(), prov: String(r.fields[S.kota_f.prov] || '').trim() })).filter((x) => x.nama).sort(byName));
      return NextResponse.json({ items: v });
    }
    if (jenis === 'komunitas') {
      const v = await cached('pd', async () => (await listAll(S.pdpkk, { base: S.base, fields: [S.pd.nama, S.pd.ku] })).map((r) => ({ id: r.id, nama: String(r.fields[S.pd.nama] || '').trim(), ku: (r.fields[S.pd.ku] || [])[0] || '' })).filter((x) => x.nama).sort(byName));
      return NextResponse.json({ items: ku ? v.filter((x) => x.ku === ku) : v, jenisPd: JENIS_PD });
    }
    if (jenis === 'paroki') {
      const v = await cached('par', async () => (await listAll(S.paroki, { base: S.base, fields: [S.par.nama, S.par.ku] })).map((r) => ({ id: r.id, nama: String(r.fields[S.par.nama] || '').trim(), ku: (r.fields[S.par.ku] || [])[0] || '' })).filter((x) => x.nama).sort(byName));
      return NextResponse.json({ items: ku ? v.filter((x) => x.ku === ku) : v });
    }
    return NextResponse.json({ error: 'Jenis tidak dikenal' }, { status: 400 });
  } catch (e) {
    console.error('opsi', e.message);
    return NextResponse.json({ error: 'Daftar belum bisa dimuat. Coba lagi.' }, { status: 502 });
  }
}
