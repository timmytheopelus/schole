import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import App from '@/components/App';

export const dynamic = 'force-dynamic';

const REQUIRED = ['AIRTABLE_TOKEN', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL', 'SUPERADMIN_EMAILS'];

export default async function Home() {
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length) {
    return (
      <main className="login">
        <div className="logo">σ</div>
        <h1>Hampir siap</h1>
        <p>Variabel konfigurasi berikut belum diisi di Vercel (Settings → Environment Variables), lalu Redeploy:</p>
        <p style={{ fontFamily: 'ui-monospace, monospace', color: 'var(--ink)', lineHeight: 1.8 }}>{missing.join(' · ')}</p>
      </main>
    );
  }
  const u = await currentUser();
  if (!u) redirect('/login');
  return <App user={u} />;
}
