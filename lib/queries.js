import { listAll, q } from './airtable';
import { T, H, D, EV, BAB, isShdr } from './config';

// Syarat akses: mentor hanya melihat peserta yang Email Mentor-nya sama dengan email login; superadmin melihat semua.
const mentorCond = (user, field) => (user.viewAll ? null : `FIND(${q(user.email)}, {${field}})>0`);
const and = (...c) => { const x = c.filter(Boolean); return x.length === 1 ? x[0] : `AND(${x.join(',')})`; };

export async function listTc(user) {
  if (user.viewAll) {
    const r = await listAll(T.event, { fields: [EV.nama, EV.status] });
    const rank = (s) => (/berlangsung/i.test(s) ? 0 : /selesai/i.test(s) ? 2 : 1);
    return r.map((x) => ({ nama: x.fields[EV.nama], status: x.fields[EV.status] || '' })).filter((x) => x.nama).sort((a, b) => rank(a.status) - rank(b.status));
  }
  const r = await listAll(T.header, { filter: mentorCond(user, 'Email Mentor'), fields: [H.tc] });
  return [...new Set(r.map((x) => x.fields[H.tc]).filter(Boolean))].map((nama) => ({ nama, status: '' }));
}

const HFIELDS = Object.values(H);
export async function listHeaders(user, tc, extra) {
  const filter = and(`{Nama TC}=${q(tc)}`, mentorCond(user, 'Email Mentor'), extra);
  return listAll(T.header, { filter, fields: HFIELDS });
}
export async function listDetails(user, tc, extra) {
  const filter = and(`{Nama TC}=${q(tc)}`, mentorCond(user, 'Mentor Email'), extra);
  return listAll(T.detail, { filter, fields: Object.values(D) });
}
// Saring bab yang dinilai. Program non-SHDR tidak disaring (babnya diturunkan dari data).
export const babIn = (tc) => (tc && !isShdr(tc) ? null : `OR(${BAB.map((b) => `{Bab}=${q(b)}`).join(',')})`);
export const sel = (v) => (v && typeof v === 'object' ? v.name : v);

// TC tempat email ini menjadi mentor (selalu dibatasi email, juga untuk superadmin)
export async function listMentorTc(email) {
  const r = await listAll(T.header, { filter: `FIND(${q(email)}, {Email Mentor})>0`, fields: [H.tc, H.status] });
  const m = {};
  for (const x of r) { const n = x.fields[H.tc]; if (!n) continue; (m[n] ||= { nama: n, total: 0, lulus: 0 }).total++; if (sel(x.fields[H.status]) === 'Lulus') m[n].lulus++; }
  return Object.values(m);
}
// Keikutsertaan email ini sebagai peserta
export async function listLearnerTc(email) {
  const r = await listAll(T.header, { filter: `{Email Peserta}=${q(email)}`, fields: [H.tc, H.status, H.nonton, H.dinilai, H.mentor] });
  return r.map((x) => ({ id: x.id, nama: x.fields[H.tc] || '', status: sel(x.fields[H.status]) || 'Peserta Aktif', nonton: x.fields[H.nonton] || 0, dinilai: x.fields[H.dinilai] || 0, mentor: x.fields[H.mentor] || '' }));
}
