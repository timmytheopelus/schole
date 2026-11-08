'use client';
import { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';

// Pesan yang ramah untuk galat bawaan next-auth
const PESAN = {
  AccessDenied: 'Akun Google ini tidak diizinkan masuk. Hubungi superadmin Schole.',
  OAuthAccountNotLinked: 'Email ini sudah dipakai dengan cara masuk lain. Gunakan akun Google yang sama seperti sebelumnya.',
  Configuration: 'Aplikasi belum selesai dikonfigurasi. Hubungi superadmin Schole.',
  default: 'Gagal masuk. Coba lagi, atau hubungi superadmin Schole jika berulang.'
};

export default function Login() {
  const [error, setError] = useState('');
  useEffect(() => {
    const e = new URLSearchParams(window.location.search).get('error');
    if (e) setError(PESAN[e] || PESAN.default);
  }, []);
  return (
    <main className="login">
      <div className="logo">σ</div>
      <h1>Schole</h1>
      <p><b>Portal Mentor Training Course</b></p>
      <p>Tempat mentor menilai peserta dan superadmin memantau rekap program. Masuk dengan email Google yang terdaftar sebagai mentor.</p>
      {error && <div className="err" role="alert" style={{ maxWidth: 380 }}>{error}</div>}
      <button className="btn primary" onClick={() => signIn('google', { callbackUrl: '/' })}>Masuk dengan Google</button>
      <p className="note">Belum terdaftar atau tidak bisa masuk? Hubungi superadmin Schole{process.env.NEXT_PUBLIC_ADMIN_CONTACT ? ': ' + process.env.NEXT_PUBLIC_ADMIN_CONTACT : ''}.</p>
    </main>
  );
}
