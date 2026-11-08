import { listAll, q } from './airtable';
import { T, H, D, EV, BAB } from './config';

// Syarat akses: mentor hanya melihat peserta yang Email Mentor-nya sama dengan email login; superadmin melihat semua.
const mentorCond = (user, field) => (user.viewAll ? null : `FIND(${q(user.email)}, {${field}})>0`);
const and = (...c) => { const x = c.filter(Boolean); return x.length === 1 ? x[0] : `AND(${x.join(',')})`; };

export async function listTc(user) {
  if (user.viewAll) {
    const r = await listAll(T.event, { fields: [EV.nama, EV.status] });
    return r.map((x) => ({ nama: x.fields[EV.nama], status: x.fields[EV.status] || '' })).filter((x) => x.nama);
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
export const babIn = () => `OR(${BAB.map((b) => `{Bab}=${q(b)}`).join(',')})`;
export const sel = (v) => (v && typeof v === 'object' ? v.name : v);
