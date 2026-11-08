import GoogleProvider from 'next-auth/providers/google';
import { getServerSession } from 'next-auth';

export const authOptions = {
  providers: [GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID || '', clientSecret: process.env.GOOGLE_CLIENT_SECRET || '' })],
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET
};

const admins = () => (process.env.SUPERADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

export async function currentUser() {
  const s = await getServerSession(authOptions);
  const email = s?.user?.email?.toLowerCase();
  if (!email) return null;
  return { email, name: s.user.name || email, admin: admins().includes(email) };
}
