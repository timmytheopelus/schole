import { H } from './config';

const arr = (v) => (Array.isArray(v) ? v : v == null || v === '' ? [] : [v]).flat().filter((x) => x != null && x !== '').map((x) => (typeof x === 'object' ? x.name || x.email || '' : String(x)));
const digits = (s) => String(s || '').replace(/\D/g, '');
export function normHp(s) {
  let d = digits(s);
  if (!d) return '';
  if (d.startsWith('0')) d = '62' + d.slice(1);
  return d;
}
// "Nama-+62812...-Kota"  ->  { nama, hp, kota }
export function parsePerson(str) {
  const t = String(str || '').trim();
  const m = t.match(/^(.*?)\s*-\s*(\+?\d[\d\s-]*\d)(?:-\s*(\D*))?$/);
  if (!m) return { nama: t, hp: '', kota: '' };
  return { nama: m[1].trim(), hp: normHp(m[2]), kota: (m[3] || '').trim() };
}
const waNum = (u) => normHp(String(u || '').replace(/^.*wa\.me\//, ''));

const ROLES = [['Mentor', H.tMentor, H.wMentor], ['Co-Mentor', H.tCo, H.wCo], ['Pendamping Teknis', H.tTek, H.wTek], ['Pengolah Data', H.tOlah, H.wOlah]];
// Tim pendamping satu peserta (dibaca dari lookup LMSHeader yang bersumber dari tabel Kelompok)
export function teamOf(f) {
  const out = [];
  for (const [peran, tf, wf] of ROLES) {
    const names = arr(f[tf]); const was = arr(f[wf]);
    names.forEach((n, i) => {
      const p = parsePerson(n);
      if (!p.nama) return;
      out.push({ peran, nama: p.nama, kota: p.kota, hp: waNum(was[i] || was[0]) || p.hp });
    });
  }
  return out;
}
export const kelompokOf = (f) => arr(f[H.kelompok])[0] || '';
