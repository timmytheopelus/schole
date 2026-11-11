import crypto from 'crypto';
import { listAll, getOne, updateOne, q } from './airtable';
import { T, H, D, IZIN, babsFor } from './config';
import { sel, listHeaders, listDetails, babIn } from './queries';
import { teamOf } from './team';

// Batas waktu survei (WIB)
export const DEADLINE = process.env.SURVEY_DEADLINE || '2026-11-17T18:00:00+07:00';
// Setelah "Kirim", data terkunci. Selama uji coba: SURVEY_LOCK tidak diisi = tetap bisa diedit.
export const LOCK = process.env.SURVEY_LOCK === '1';

export const KEPUTUSAN = { lulus: 'Lulus', tidak: 'Tidak Lulus', mundur: 'Mengundurkan diri' };
const AKTIF = 'Peserta Aktif';
const secret = () => process.env.SURVEY_SECRET || process.env.NEXTAUTH_SECRET || '';
const sig = (data) => crypto.createHmac('sha256', secret()).update(data).digest('base64url').slice(0, 32);

// Token link pribadi: base64url(JSON{e,n}).tandatangan. Tidak bisa dipalsukan tanpa SURVEY_SECRET.
export function makeToken(email, nama) {
  const body = Buffer.from(JSON.stringify({ e: String(email).toLowerCase(), n: nama })).toString('base64url');
  return body + '.' + sig(body);
}
export function readToken(token) {
  if (!secret()) return null;
  const [body, s] = String(token || '').split('.');
  if (!body || !s) return null;
  const want = Buffer.from(sig(body)); const got = Buffer.from(s);
  if (want.length !== got.length || !crypto.timingSafeEqual(want, got)) return null;
  try { const j = JSON.parse(Buffer.from(body, 'base64url').toString()); return j.e && j.n ? { email: j.e, nama: j.n } : null; } catch (e) { return null; }
}

const TC = process.env.SURVEY_TC || 'TC SHDR BPN PKKI';
const lc = (s) => String(s || '').toLowerCase();
const flat = (v) => (Array.isArray(v) ? v : [v]).map((x) => (x && typeof x === 'object' ? x.name || '' : String(x ?? ''))).join(' ');

const inIds = (ids) => `OR(${ids.map((i) => `RECORD_ID()=${q(i)}`).join(',')})`;
const BABS = ['SHDR-Bab 0 Pendahuluan', 'SHDR-Bab 1', 'SHDR-Bab 2', 'SHDR-Bab 3', 'SHDR-Bab 4', 'SHDR-Bab 5', 'SHDR-Bab 6', 'SHDR-Bab 7'];

// Peserta milik mentor ini (sebagai Mentor atau Co-Mentor), lengkap dengan bab dan status yang sudah tersimpan.
export async function loadFor(who) {
  const heads = await listAll(T.header, { filter: `FIND(LOWER(${q(who.nama)}), LOWER({Nama Mentor}))>0`, fields: Object.values(H).concat(['fldxME5Jftq8f07RC']) });
  const detIds = heads.flatMap((h) => h.fields['fldxME5Jftq8f07RC'] || []);
  const dets = [];
  for (let i = 0; i < detIds.length; i += 40) dets.push(...(await listAll(T.detail, { filter: inIds(detIds.slice(i, i + 40)), fields: [D.bab, D.izin, D.catatan, D.header] })));
  const byId = Object.fromEntries(dets.map((d) => [d.id, d]));
  const peserta = heads.map((h) => {
    const f = h.fields;
    const stat = sel(f[H.status]) || AKTIF;
    const keputusan = Object.keys(KEPUTUSAN).find((k) => KEPUTUSAN[k] === stat) || null;
    const co = lc(flat(f[H.tCo])).includes(lc(who.nama));
    const rows = (f['fldxME5Jftq8f07RC'] || []).map((id) => byId[id]).filter(Boolean).map((d) => ({ id: d.id, bab: d.fields[D.bab] || '', izin: sel(d.fields[D.izin]) || null, catatan: d.fields[D.catatan] || '' }))
      .filter((r) => BABS.includes(r.bab));
    rows.sort((a, b) => BABS.indexOf(a.bab) - BABS.indexOf(b.bab));
    return {
      id: h.id, nama: String(f[H.nama] || '').trim() || '(tanpa nama)', usia: (f[H.usia] || [])[0] || null, ku: f[H.ku] || '',
      peran: co ? 'co' : 'mentor', status: stat, keputusan, terkirim: String(f[H.submittedBy] || ''), nonton: f[H.nonton] || 0, dinilai: rows.filter((r) => r.izin).length, bab: rows
    };
  }).sort((a, b) => a.nama.localeCompare(b.nama));
  return peserta;
}

// Simpan satu peserta. Mengembalikan jumlah baris yang ditulis.
export async function savePerson(who, own, item, kirim) {
  const now = new Date().toISOString();
  const babOwn = new Set(own.bab.map((b) => b.id));
  if (item.keputusan && !KEPUTUSAN[item.keputusan]) throw Object.assign(new Error('Keputusan tidak valid'), { status: 400 });
  if (item.keputusan === 'lulus') {
    for (const b of item.bab || []) {
      if (b.izin && !IZIN.includes(b.izin)) throw Object.assign(new Error('Izin tidak valid'), { status: 400 });
      if (b.izin === IZIN[1] && !String(b.catatan || '').trim()) throw Object.assign(new Error('Memo wajib diisi untuk bab yang perlu didampingi (' + own.nama + ')'), { status: 422 });
    }
    if (kirim && !(item.bab || []).some((b) => b.izin)) throw Object.assign(new Error('Peserta Lulus harus punya minimal 1 bab lulus: ' + own.nama), { status: 422 });
  }
  let n = 0;
  if (item.keputusan === 'lulus') {
    for (const b of item.bab || []) {
      if (!babOwn.has(b.id)) continue;
      const cur = own.bab.find((x) => x.id === b.id);
      const izin = b.izin || null; const cat = String(b.catatan || '').trim();
      if (cur.izin === izin && String(cur.catatan || '').trim() === cat) continue;
      await updateOne(T.detail, b.id, { [D.izin]: izin, [D.catatan]: cat, [D.oleh]: who.email, [D.tgl]: now });
      n++;
    }
  }
  const status = item.keputusan ? KEPUTUSAN[item.keputusan] : AKTIF;
  const f = {};
  if (status !== own.status) f[H.status] = status;
  if (kirim) f[H.submittedBy] = who.email;
  if (Object.keys(f).length) { await updateOne(T.header, own.id, f); n++; }
  return n;
}
