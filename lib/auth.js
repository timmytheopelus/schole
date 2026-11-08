import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { getServerSession } from 'next-auth';
import { cookies } from 'next/headers';
import { listAll, q } from './airtable';
import { ACCESS } from './config';
import { personsByEmail } from './bpn';
import { akunByEmail, AK } from './akun';
import { verifyPassword } from './password';
import { tooMany, hit, clearKey } from './throttle';

export const authOptions = {
  providers: [
    GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID || '', clientSecret: process.env.GOOGLE_CLIENT_SECRET || '' }),
    // Login email dan password. Hash tersimpan di tabel "Akses Portal Schole" (kolom Password Hash).
    CredentialsProvider({
      name: 'Email',
      credentials: { email: { label: 'Email', type: 'email' }, password: { label: 'Password', type: 'password' } },
      async authorize(c) {
        const email = String(c?.email || '').trim().toLowerCase();
        const password = String(c?.password || '');
        if (!email || !password) return null;
        const key = 'login:' + email;
        if (tooMany(key, 5, 15 * 60 * 1000)) throw new Error('TooMany');
        let row = null;
        try { row = await akunByEmail(email); } catch (e) { row = null; }
        const stored = row?.fields[AK.pw];
        const ok = stored ? await verifyPassword(password, stored) : (await verifyPassword(password, 'scrypt$AAAAAAAAAAAAAAAAAAAAAA==$' + 'A'.repeat(86) + '=='), false);
        if (!ok) { hit(key, 15 * 60 * 1000); return null; }
        clearKey(key);
        return { id: row.id, email, name: row.fields[AK.nama] || email };
      }
    })
  ],
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET
};

// Cadangan: email di SUPERADMIN_EMAILS selalu Superadmin (agar tidak terkunci)
const envAdmins = () => (process.env.SUPERADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

// Level akses dibaca dari tabel "Akses Portal Schole" (Airtable). Tanpa baris = Mentor biasa
// (data peserta tetap dibatasi lewat Email Mentor di Schole). Aktif tidak dicentang = ditolak.
async function realUser() {
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
    email, actor: email, name: row?.fields[f.nama] || s.user.name || email, level, blocked,
    admin: level === 'Superadmin',                       // kelola pengguna, semua fitur
    viewAll: level === 'Superadmin' || level === 'Pengamat', // lihat semua peserta dan rekap
    canWrite: level !== 'Pengamat'
  };
}

export { realUser };

// Superadmin dapat "melihat sebagai" mentor: cookie berisi email mentor, hanya berlaku untuk Superadmin asli.
export async function currentUser() {
  const u = await realUser();
  if (!u || u.blocked || !u.admin) return u;
  let target = '';
  try { target = (cookies().get('schole_viewas')?.value || '').toLowerCase(); } catch (e) { target = ''; }
  if (!target || target === u.email) return u;
  let name = target;
  try {
    const r = await listAll(ACCESS.table, { base: ACCESS.base, filter: `LOWER({Email})=${q(target)}`, fields: [ACCESS.f.nama] });
    name = r[0]?.fields[ACCESS.f.nama] || target;
    // Samakan dengan nama di BPN (sumber yang sama dengan menu Pengguna)
    name = (await personsByEmail([target]))[target]?.nama || name;
  } catch (e) { /* abaikan */ }
  // Boleh mengedit data mentor yang dilihat, tetapi pencatatan (Dinilai Oleh, KelulusanSubmittedBy) memakai `actor` = email Superadmin asli.
  return { email: target, actor: u.email, name, level: 'Mentor', blocked: false, admin: false, viewAll: false, canWrite: true, viewingAs: true, realName: u.name };
}
