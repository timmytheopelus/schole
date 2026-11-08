import { listAll, updateOne, createOne, q } from './airtable';
import { ACCESS } from './config';

// Kolom akun di tabel "Akses Portal Schole" diakses dengan NAMA kolom (dibuat di Airtable: lihat README).
export const AK = { email: 'Email', nama: 'Nama', level: 'Level Akses', aktif: 'Aktif', catatan: 'Catatan', pw: 'Password Hash', resetHash: 'Reset Token Hash', resetExp: 'Reset Berlaku Sampai', person: 'ID M-Person (BPN)' };
const LIST = Object.values(AK);

export async function akunByEmail(email) {
  try {
    const r = await listAll(ACCESS.table, { base: ACCESS.base, named: true, filter: `LOWER({${AK.email}})=${q(String(email).toLowerCase())}`, fields: LIST });
    return r[0] || null;
  } catch (e) {
    if (/UNKNOWN_FIELD_NAME/.test(e.message)) { const err = new Error('Kolom akun belum lengkap di Airtable (lihat README bagian Login email)'); err.setup = true; throw err; }
    throw e;
  }
}
export const updateAkun = (id, fields) => updateOne(ACCESS.table, id, fields, ACCESS.base);
export const createAkun = (fields) => createOne(ACCESS.table, fields, ACCESS.base);
