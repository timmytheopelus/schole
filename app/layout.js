import './globals.css';
export const metadata = { title: 'Schole · Portal Mentor', description: 'Penilaian peserta Training Course' };
export const viewport = { width: 'device-width', initialScale: 1 };
export default function RootLayout({ children }) {
  return <html lang="id"><body>{children}</body></html>;
}
