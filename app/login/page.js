'use client';
import { signIn } from 'next-auth/react';
export default function Login() {
  return (
    <main className="login">
      <div className="logo">σ</div>
      <h1>Schole</h1>
      <p>Masuk dengan email Google yang terdaftar sebagai mentor.</p>
      <button className="btn primary" onClick={() => signIn('google', { callbackUrl: '/' })}>Masuk dengan Google</button>
    </main>
  );
}
