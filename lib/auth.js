import GoogleProvider from 'next-auth/providers/google';
import { getServerSession } from 'next-auth';
import { listAll, q } from './airtable';
import { ACCESS } from './config';

export const authOptions = {
  providers: [GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID || '', clientSecret: process.env.GOOGLE_CLIENT_SECRET || '' })],
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET
};

// Cadangan: email di SUPERADMIN_EMAILS selalu Superadmin (agar tidak terkunci)
const envAdmins = () => (process.env.SUPERADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

// Level akses dibaca dari tabel "Akses Portal Schole" (Airtable). Tanpa baris = Mentor biasa
// (data peserta tetap dibatasi lewat Email Mentor di Schole). Aktif tidak dicentang = ditolak.
export async function currentUser() {
  const s = await getServerSession(authOptions);
  const email = s?.user?.email?.toLowerCase();
  if (!email) return null;
  const f = ACCESS.f;
  let row = null;
  try {
    const r = await listAll(ACCESS.table, { base: ACCESS.base, filter: `LOWER({Email})=${q(email)}`, fields: Object.values(f) });
    row = r[0] || null;
  } catch (e) { row = null; }
  const envAdmin = envAdmins().includes(email);
  let level = row?.fields[f.level]?.name || row?.fields[f.level] || 'Mentor';
  const aktif = row ? !!row.fields[f.aktif] : true;
  if (envAdmin) level = 'Superadmin';
  const blocked = !envAdmin && !aktif;
  return {
    email, name: row?.fields[f.nama] || s.user.name || email, level, blocked,
    admin: level === 'Superadmin',                       // kelola pengguna, semua fitur
    viewAll: level === 'Superadmin' || level === 'Pengamat', // lihat semua peserta dan rekap
    canWrite: level !== 'Pengamat'
  };
}
