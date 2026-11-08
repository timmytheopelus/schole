'use client';
import { useState } from 'react';
import '../auth.css';

export default function ResetPassword() {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function simpan(ev) {
    ev.preventDefault();
    setErr('');
    if (pw !== pw2) return setErr('Kedua password harus sama.');
    const p = new URLSearchParams(window.location.search);
    setBusy(true);
    try {
      const r = await fetch('/api/password/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: p.get('email') || '', token: p.get('token') || '', password: pw }) });
      const j = await r.json();
      if (r.ok) window.location.href = '/login?reset=1';
      else setErr(j.error || 'Belum bisa diproses.');
    } catch (e) { setErr('Belum bisa terhubung. Coba lagi.'); }
    setBusy(false);
  }
  return (
    <main className="auth">
      <div className="auth-card">
        <a className="auth-brand" href="/"><img src="/logo-bpk.png" alt="" style={{ height: 44, width: 'auto' }} /><b>Schole</b></a>
        <h1>Buat password baru</h1>
        <p>Pilih password minimal 8 karakter.</p>
        {err && <div className="msg-err" role="alert">{err}</div>}
        <form onSubmit={simpan}>
          <div className="fld"><label htmlFor="pw">Password baru</label><input id="pw" type="password" autoComplete="new-password" minLength={8} required value={pw} onChange={(e) => setPw(e.target.value)} /></div>
          <div className="fld"><label htmlFor="pw2">Ulangi password</label><input id="pw2" type="password" autoComplete="new-password" minLength={8} required value={pw2} onChange={(e) => setPw2(e.target.value)} /></div>
          <button className="btn-main" disabled={busy}>{busy ? 'Menyimpan...' : 'Simpan password'}</button>
        </form>
        <div className="links"><a href="/lupa-password">Minta tautan baru</a><a href="/login">Kembali ke Masuk</a></div>
      </div>
    </main>
  );
}
