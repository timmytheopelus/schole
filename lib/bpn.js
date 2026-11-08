import { listAll, q } from './airtable';
import { BPN } from './config';

const P = BPN.p;
const chunk = (a, n) => { const o = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; };
const one = (v) => (Array.isArray(v) ? v[0] : v);
const txt = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v.name : Array.isArray(v) ? v.map((x) => (x && x.name) || x).join(', ') : v);

let bpkCache = null;
export async function keuskupanMap() {
  if (bpkCache && Date.now() - bpkCache.t < 10 * 60 * 1000) return bpkCache.m;
  const r = await listAll(BPN.bpk, { base: BPN.base, fields: [BPN.bpkNama] });
  const m = {}; r.forEach((x) => { m[x.id] = String(x.fields[BPN.bpkNama] || '').trim(); });
  bpkCache = { t: Date.now(), m };
  return m;
}

export function shapePerson(r, kmap) {
  const f = r.fields;
  const ku = (f[P.ku] || []).map((id) => kmap[id]).filter(Boolean).join(', ');
  const wa = String(f[P.wa] || '').replace(/\D/g, '');
  return {
    id: r.id, nama: f[P.nama] || '', panggilan: f[P.panggilan] || '', email: String(f[P.email] || '').toLowerCase(), wa: wa.startsWith('0') ? '62' + wa.slice(1) : wa,
    jk: txt(f[P.jk]) || '', usia: f[P.usia] ?? null, kelUsia: txt(f[P.kelUsia]) || '', ku, kategori: txt(f[P.kategori]) || '',
    spes: (f[P.spes] || []).map((x) => (typeof x === 'object' ? x.name : x)), alamat: f[P.alamat] || '',
    baptis: txt(f[P.baptis]) || '', krisma: txt(f[P.krisma]) || ''
  };
}

const PF = Object.values(P);
// Profil BPN berdasarkan email (huruf kecil)
export async function personsByEmail(emails) {
  const kmap = await keuskupanMap();
  const out = {};
  for (const c of chunk([...new Set(emails.filter(Boolean))], 25)) {
    const filter = `OR(${c.map((e) => `LOWER({Email})=${q(e)}`).join(',')})`;
    const r = await listAll(BPN.person, { base: BPN.base, filter, fields: PF });
    r.forEach((x) => { const s = shapePerson(x, kmap); if (s.email && !out[s.email]) out[s.email] = s; });
  }
  return out;
}
export async function personsByIds(ids) {
  const kmap = await keuskupanMap();
  const out = [];
  for (const c of chunk(ids, 30)) {
    const r = await listAll(BPN.person, { base: BPN.base, filter: `OR(${c.map((i) => `RECORD_ID()=${q(i)}`).join(',')})`, fields: PF });
    r.forEach((x) => out.push(shapePerson(x, kmap)));
  }
  return out;
}
