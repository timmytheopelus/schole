'use client';
import { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import '../auth.css';

// Pesan yang ramah untuk galat bawaan next-auth
const PESAN = {
  AccessDenied: 'Akun Google ini tidak diizinkan masuk. Hubungi sekretariat Schole.',
  OAuthAccountNotLinked: 'Email ini sudah dipakai dengan cara masuk lain. Gunakan cara masuk yang sama seperti sebelumnya.',
  Configuration: 'Aplikasi belum selesai dikonfigurasi. Hubungi sekretariat Schole.',
  CredentialsSignin: 'Email atau password salah. Jika belum punya password, gunakan Masuk dengan Google atau Lupa password.',
  TooMany: 'Terlalu banyak percobaan. Tunggu sekitar 15 menit, atau gunakan Lupa password.',
  default: 'Gagal masuk. Coba lagi, atau hubungi sekretariat Schole jika berulang.'
};

export default function Login() {
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [resetOk, setResetOk] = useState(false);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const e = p.get('error');
    if (e) setError(PESAN[e] || PESAN.default);
    if (p.get('reset')) setResetOk(true);
  }, []);

  async function masuk(ev) {
    ev.preventDefault();
    setError(''); setBusy(true);
    const r = await signIn('credentials', { email, password, redirect: false });
    setBusy(false);
    if (r?.error) setError(PESAN[r.error] || PESAN.default);
    else window.location.href = '/portal';
  }

  return (
    <main className="auth">
      <div className="auth-card">
        <a className="auth-brand" href="/"><img src="/logo-bpk.png" alt="" height="44" style={{ height: 44, width: 'auto' }} /><b>Schole</b></a>
        <h1>Masuk</h1>
        <p>Masuk dengan akun Google atau dengan email dan password.</p>
        {resetOk && <div className="msg-ok" role="status">Password sudah diubah. Silakan masuk dengan password baru.</div>}
        {error && <div className="msg-err" role="alert">{error}</div>}
        <button type="button" className="btn-alt" onClick={() => signIn('google', { callbackUrl: '/portal' })}>
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.7 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 6.9-10 6.9-17.5z"/><path fill="#FBBC05" d="M10.4 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.9-4.7l-7.8-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.8-6.1z"/><path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2 1.4-4.7 2.3-7.7 2.3-6.3 0-11.7-4.1-13.6-9.8l-7.8 6.1C6.5 42.6 14.6 48 24 48z"/></svg>
          Masuk dengan Google
        </button>
        <div className="sep">atau dengan email</div>
        <form onSubmit={masuk}>
          <div className="fld"><label htmlFor="email">Email</label><input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="fld"><label htmlFor="password">Password</label><input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          <button className="btn-main" disabled={busy}>{busy ? 'Memeriksa...' : 'Masuk'}</button>
        </form>
        <div className="links"><a href="/lupa-password">Lupa password?</a><span>Belum punya akun? <a href="/daftar">Daftar</a></span></div>
        <p style={{ fontSize: 14 }}>Butuh bantuan? Hubungi sekretariat: sekretariat@karismatikkatolikbandung.org</p>
      </div>
    </main>
  );
}
