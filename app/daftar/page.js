'use client';
import { useEffect, useMemo, useState } from 'react';
import '../auth.css';

const JENIS_PD = ['PD Umum', 'PD OMK Anak (6-12th)', 'PD OMK Remaja (13-18th)', 'PD OMK Muda Mudi (18-35th blm menikah)', 'PD Keluarga Muda', 'PD Lansia', 'PD Pengusaha'];
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const BARU = '__baru__';
const load = (jenis, ku) => fetch('/api/opsi?jenis=' + jenis + (ku ? '&ku=' + ku : '')).then((r) => r.json());

function Radio({ name, value, onChange, opts }) {
  return (
    <div className="radio-row" role="radiogroup">
      {opts.map((o) => (
        <label key={o}><input type="radio" name={name} value={o} checked={value === o} onChange={() => onChange(o)} required />{o}</label>
      ))}
    </div>
  );
}

export default function Daftar() {
  const [f, setF] = useState({ nama: '', panggilan: '', jk: '', tgl: '', bln: '', thn: '', wa: '', email: '', password: '', password2: '', alamat: '', keuskupanId: '', kotaText: '', baptis: '', krisma: '', parokiSel: '', parokiBaru: '', pdSel: '', pdBaru: '', pdJenis: '', website: '' });
  const [kuList, setKuList] = useState([]);
  const [kotaList, setKotaList] = useState([]);
  const [parList, setParList] = useState([]);
  const [pdList, setPdList] = useState([]);
  const [loadErr, setLoadErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e && e.target ? e.target.value : e }));

  useEffect(() => {
    Promise.all([load('keuskupan'), load('kota')]).then(([a, b]) => { if (a.error || b.error) throw new Error(); setKuList(a.items); setKotaList(b.items); }).catch(() => setLoadErr('Daftar keuskupan dan kota belum bisa dimuat. Muat ulang halaman ini.'));
  }, []);
  useEffect(() => {
    setF((s) => ({ ...s, parokiSel: '', parokiBaru: '', pdSel: '', pdBaru: '', pdJenis: '' }));
    setParList([]); setPdList([]);
    if (!f.keuskupanId) return;
    load('paroki', f.keuskupanId).then((j) => setParList(j.items || [])).catch(() => {});
    load('komunitas', f.keuskupanId).then((j) => setPdList(j.items || [])).catch(() => {});
  }, [f.keuskupanId]);

  const kota = useMemo(() => kotaList.find((k) => (k.nama + ', ' + k.prov) === f.kotaText || k.nama === f.kotaText), [kotaList, f.kotaText]);
  const tahun = new Date().getFullYear();

  async function kirim(ev) {
    ev.preventDefault();
    setErr('');
    if (f.password !== f.password2) return setErr('Kedua password harus sama.');
    if (!kota) return setErr('Pilih kota atau kabupaten dari daftar yang muncul saat Anda mengetik.');
    const body = {
      nama: f.nama, panggilan: f.panggilan, jk: f.jk, tgl: f.tgl, bln: f.bln, thn: f.thn, wa: f.wa, email: f.email, password: f.password, alamat: f.alamat,
      keuskupanId: f.keuskupanId, kotaId: kota.id, baptis: f.baptis, krisma: f.krisma, website: f.website,
      paroki: f.parokiSel === BARU ? { baru: true, nama: f.parokiBaru } : { id: f.parokiSel },
      komunitas: f.pdSel === BARU ? { baru: true, nama: f.pdBaru, jenis: f.pdJenis } : { id: f.pdSel }
    };
    setBusy(true);
    try {
      const r = await fetch('/api/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json();
      if (r.ok) setDone(true); else setErr(j.error || 'Belum bisa diproses.');
    } catch (e) { setErr('Belum bisa terhubung. Coba lagi.'); }
    setBusy(false);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (done) {
    return (
      <main className="auth"><div className="auth-card">
        <a className="auth-brand" href="/"><img src="/logo-bpk.png" alt="" style={{ height: 44, width: 'auto' }} /><b>Schole</b></a>
        <h1>Pendaftaran diterima</h1>
        <div className="msg-ok" role="status">Terima kasih. Biodata Anda sudah masuk ke data umat. Admin akan memverifikasi akun Anda, lalu Anda bisa masuk dengan email dan password yang baru dibuat.</div>
        <p>Pertanyaan: sekretariat@karismatikkatolikbandung.org</p>
        <a className="btn-main" href="/login">Ke halaman Masuk</a>
      </div></main>
    );
  }

  return (
    <main className="auth">
      <div className="auth-card wide">
        <a className="auth-brand" href="/"><img src="/logo-bpk.png" alt="" style={{ height: 44, width: 'auto' }} /><b>Schole</b></a>
        <h1>Daftar akun</h1>
        <p>Isi biodata dengan lengkap. Data ini tersimpan di master data umat dan dipakai untuk pembinaan. Akun aktif setelah diverifikasi admin.</p>
        {loadErr && <div className="msg-err" role="alert">{loadErr}</div>}
        {err && <div className="msg-err" role="alert">{err}</div>}
        <form onSubmit={kirim}>
          <div className="hp" aria-hidden="true"><label htmlFor="website">Jangan diisi</label><input id="website" tabIndex={-1} autoComplete="off" value={f.website} onChange={set('website')} /></div>

          <fieldset>
            <legend>Identitas</legend>
            <div className="fgrid">
              <div className="fld"><label htmlFor="nama">Nama lengkap</label><input id="nama" autoComplete="name" required value={f.nama} onChange={set('nama')} /></div>
              <div className="fld"><label htmlFor="panggilan">Nama panggilan (opsional)</label><input id="panggilan" value={f.panggilan} onChange={set('panggilan')} /></div>
            </div>
            <div className="fld"><span className="lbl">Jenis kelamin</span><Radio name="jk" value={f.jk} onChange={set('jk')} opts={['Pria', 'Wanita']} /></div>
            <div className="fld">
              <span className="lbl">Tanggal lahir</span>
              <div className="fgrid" style={{ gridTemplateColumns: '1fr 2fr 1.4fr' }}>
                <select aria-label="Tanggal" required value={f.tgl} onChange={set('tgl')}><option value="">Tgl</option>{Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select>
                <select aria-label="Bulan" required value={f.bln} onChange={set('bln')}><option value="">Bulan</option>{BULAN.map((b, i) => <option key={b} value={i + 1}>{b}</option>)}</select>
                <select aria-label="Tahun" required value={f.thn} onChange={set('thn')}><option value="">Tahun</option>{Array.from({ length: tahun - 3 - 1920 + 1 }, (_, i) => tahun - 3 - i).map((y) => <option key={y} value={y}>{y}</option>)}</select>
              </div>
            </div>
            <div className="fgrid">
              <div className="fld"><label htmlFor="wa">Nomor WhatsApp</label><input id="wa" type="tel" inputMode="tel" autoComplete="tel" placeholder="0812xxxxxxx" required value={f.wa} onChange={set('wa')} /></div>
              <div className="fld"><label htmlFor="email">Email</label><input id="email" type="email" autoComplete="email" required value={f.email} onChange={set('email')} /></div>
            </div>
          </fieldset>

          <fieldset>
            <legend>Domisili dan paroki</legend>
            <div className="fld"><label htmlFor="alamat">Alamat surat</label><input id="alamat" autoComplete="street-address" required value={f.alamat} onChange={set('alamat')} /></div>
            <div className="fgrid">
              <div className="fld">
                <label htmlFor="kota">Kota / kabupaten</label>
                <input id="kota" list="kota-list" autoComplete="off" placeholder="Ketik untuk mencari" required value={f.kotaText} onChange={set('kotaText')} />
                <datalist id="kota-list">{kotaList.map((k) => <option key={k.id} value={k.nama + ', ' + k.prov} />)}</datalist>
              </div>
              <div className="fld">
                <label htmlFor="ku">Keuskupan</label>
                <select id="ku" required value={f.keuskupanId} onChange={set('keuskupanId')}><option value="">Pilih keuskupan</option>{kuList.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}</select>
              </div>
            </div>
            <div className="fld">
              <label htmlFor="paroki">Paroki</label>
              <select id="paroki" required disabled={!f.keuskupanId} value={f.parokiSel} onChange={set('parokiSel')}>
                <option value="">{f.keuskupanId ? 'Pilih paroki' : 'Pilih keuskupan dulu'}</option>
                {parList.map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}
                {f.keuskupanId && <option value={BARU}>Paroki saya belum ada, tambah baru</option>}
              </select>
              {f.parokiSel === BARU && (
                <div className="baru"><div className="fld"><label htmlFor="parbaru">Nama paroki baru</label><input id="parbaru" required value={f.parokiBaru} onChange={set('parokiBaru')} /></div><span className="hint">Paroki baru ditambahkan ke data master di keuskupan yang Anda pilih.</span></div>
              )}
            </div>
          </fieldset>

          <fieldset>
            <legend>Sakramen dan komunitas</legend>
            <div className="fgrid">
              <div className="fld"><span className="lbl">Sakramen Baptis</span><Radio name="baptis" value={f.baptis} onChange={set('baptis')} opts={['Sudah', 'Belum']} /></div>
              <div className="fld"><span className="lbl">Sakramen Krisma</span><Radio name="krisma" value={f.krisma} onChange={set('krisma')} opts={['Sudah', 'Belum']} /></div>
            </div>
            <div className="fld">
              <label htmlFor="pd">Komunitas (PD)</label>
              <select id="pd" required disabled={!f.keuskupanId} value={f.pdSel} onChange={set('pdSel')}>
                <option value="">{f.keuskupanId ? 'Pilih komunitas' : 'Pilih keuskupan dulu'}</option>
                {pdList.map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}
                {f.keuskupanId && <option value={BARU}>Komunitas saya belum ada, tambah baru</option>}
              </select>
              {f.pdSel === BARU && (
                <div className="baru">
                  <div className="fld"><label htmlFor="pdbaru">Nama komunitas baru</label><input id="pdbaru" required value={f.pdBaru} onChange={set('pdBaru')} /></div>
                  <div className="fld"><label htmlFor="pdjenis">Jenis komunitas</label><select id="pdjenis" required value={f.pdJenis} onChange={set('pdJenis')}><option value="">Pilih jenis</option>{JENIS_PD.map((j) => <option key={j} value={j}>{j}</option>)}</select></div>
                  <span className="hint">Komunitas baru ditambahkan ke data master di keuskupan yang Anda pilih.</span>
                </div>
              )}
            </div>
          </fieldset>

          <fieldset>
            <legend>Password</legend>
            <div className="fgrid">
              <div className="fld"><label htmlFor="pw">Password</label><input id="pw" type="password" autoComplete="new-password" minLength={8} required value={f.password} onChange={set('password')} /><span className="hint">Minimal 8 karakter.</span></div>
              <div className="fld"><label htmlFor="pw2">Ulangi password</label><input id="pw2" type="password" autoComplete="new-password" minLength={8} required value={f.password2} onChange={set('password2')} /></div>
            </div>
          </fieldset>

          <button className="btn-main" disabled={busy || !!loadErr}>{busy ? 'Menyimpan...' : 'Kirim pendaftaran'}</button>
        </form>
        <div className="links"><span>Sudah punya akun? <a href="/login">Masuk</a></span><a href="/">Kembali ke beranda</a></div>
      </div>
    </main>
  );
}
