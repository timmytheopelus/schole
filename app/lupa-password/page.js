'use client';
import { useState } from 'react';
import '../auth.css';

export default function LupaPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  async function kirim(ev) {
    ev.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const r = await fetch('/api/password/forgot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      const j = await r.json();
      setMsg(r.ok ? { ok: true, t: j.pesan } : { ok: false, t: j.error || 'Belum bisa diproses.' });
    } catch (e) { setMsg({ ok: false, t: 'Belum bisa terhubung. Coba lagi.' }); }
    setBusy(false);
  }
  return (
    <main className="auth">
      <div className="auth-card">
        <a className="auth-brand" href="/"><img src="/logo-bpk.png" alt="" style={{ height: 44, width: 'auto' }} /><b>Schole</b></a>
        <h1>Lupa password</h1>
        <p>Masukkan email akun Anda. Kami kirim tautan untuk membuat password baru. Tautan berlaku 1 jam.</p>
        {msg && <div className={msg.ok ? 'msg-ok' : 'msg-err'} role={msg.ok ? 'status' : 'alert'}>{msg.t}</div>}
        <form onSubmit={kirim}>
          <div className="fld"><label htmlFor="email">Email</label><input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <button className="btn-main" disabled={busy}>{busy ? 'Mengirim...' : 'Kirim tautan reset'}</button>
        </form>
        <div className="links"><a href="/login">Kembali ke Masuk</a><a href="/daftar">Daftar akun</a></div>
      </div>
    </main>
  );
}
