import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import App from '@/components/App';

export const dynamic = 'force-dynamic';
export default async function Home() {
  const u = await currentUser();
  if (!u) redirect('/login');
  return <App user={u} />;
}
