'use client';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { signOut } from 'next-auth/react';
import { BAB, IZIN, IZIN_LABEL, STATUS, LEVEL, babLabel } from '@/lib/config';

const ST = { 'Peserta Aktif': ['Aktif', 'sa'], Lulus: ['Lulus', 'sl'], 'Drop Out': ['Drop Out', 'sd'] };
const Chip = ({ s }) => <span className={'chip ' + (ST[s]?.[1] || 'sx')}>{ST[s]?.[0] || s}</span>;
const initials = (n) => n.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
async function api(url, opt) {
  const r = await fetch(url, opt);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Gagal (' + r.status + ')');
  return j;
}
const Icon = ({ d }) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
const IC = { home: 'M3 11l9-8 9 8 M5 10v10h14V10', peserta: 'M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1 M9.5 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M21 19v-1a4 4 0 0 0-3-3.87 M16 4.13a3 3 0 0 1 0 5.74', rekap: 'M4 20V10 M10 20V4 M16 20v-7 M22 20H2', kelompok: 'M3 7h18 M3 12h18 M3 17h18', tc: 'M12 5v14 M5 12h14', users: 'M12 15a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1' };

export default function App({ user }) {
  const [tcs, setTcs] = useState(null);
  const [tc, setTc] = useState('');
  const [nav, setNav] = useState('beranda');
  const [saya, setSaya] = useState(null);
  const [bel, setBel] = useState(null);
  const reloadTc = () => api('/api/tc').then((j) => setTcs(j.tcs)).catch(() => {});
  const [err, setErr] = useState('');

  useEffect(() => {
    api('/api/tc').then((j) => { setTcs(j.tcs); if (j.tcs[0]) setTc(j.tcs[0].nama); }).catch((e) => setErr(e.message));
  }, []);

  return (
    <div className="shell">
      <aside>
        <div className="brand"><span className="logo">σ</span>Schole</div>
        <div className="field">
          <label className="lbl" htmlFor="tc">Program</label>
          <select id="tc" value={tc} onChange={(e) => setTc(e.target.value)}>
            {(tcs || []).map((t) => <option key={t.nama} value={t.nama}>{t.nama}</option>)}
          </select>
        </div>
        <nav aria-label="Menu utama">
          <button className={'nav' + (nav === 'beranda' || nav === 'saya' || nav === 'belajar' ? ' on' : '')} onClick={() => setNav('beranda')}><Icon d={IC.home} />Beranda</button>
          <button className={'nav' + (nav === 'peserta' ? ' on' : '')} onClick={() => setNav('peserta')} aria-current={nav === 'peserta' ? 'page' : undefined}><Icon d={IC.peserta} />Peserta</button>
          {user.viewAll && <button className={'nav' + (nav === 'rekap' ? ' on' : '')} onClick={() => setNav('rekap')} aria-current={nav === 'rekap' ? 'page' : undefined}><Icon d={IC.rekap} />Rekap</button>}
          {user.viewAll && <button className={'nav' + (nav === 'kelompok' ? ' on' : '')} onClick={() => setNav('kelompok')} aria-current={nav === 'kelompok' ? 'page' : undefined}><Icon d={IC.kelompok} />Kelompok</button>}
          {user.admin && <button className={'nav' + (nav === 'tc' ? ' on' : '')} onClick={() => setNav('tc')} aria-current={nav === 'tc' ? 'page' : undefined}><Icon d={IC.tc} />TC baru</button>}
          {user.admin && <button className={'nav' + (nav === 'pengguna' ? ' on' : '')} onClick={() => setNav('pengguna')} aria-current={nav === 'pengguna' ? 'page' : undefined}><Icon d={IC.users} />Pengguna</button>}
        </nav>
        {user.admin && <ViewAs />}
        <div className="me">
          <span className="lbl">Masuk sebagai</span>
          <span>{user.name} · {user.level}</span>
          <button className="btn" onClick={() => signOut({ callbackUrl: '/login' })}>Keluar</button>
        </div>
      </aside>
      <main className="main">
        {user.viewingAs && (
          <div className="err" role="status" style={{ background: '#FFF1E0', color: '#8A4500', display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <span>Mode lihat sebagai: <b>{user.name}</b>. Perubahan dicatat atas nama {user.actor}.</span>
            <button className="btn" onClick={async () => { await api('/api/viewas', { method: 'DELETE' }); location.reload(); }}>Keluar dari mode ini</button>
          </div>
        )}
        {err && <div className="err" role="alert">{err}</div>}
        {tcs && tcs.length === 0 && nav !== 'beranda' && nav !== 'saya' && nav !== 'belajar' && nav !== 'tc' && nav !== 'pengguna' && <div className="card"><h2 style={{ margin: 0 }}>Belum ada program</h2><p className="note" style={{ margin: 0 }}>Email {user.email} belum terdaftar sebagai mentor di Airtable.</p></div>}
        {nav === 'beranda' && <Beranda user={user} openMentor={(n) => { setTc(n); setNav('peserta'); }} openSaya={(id) => { setBel(id); setNav('belajar'); }} />}
        {nav === 'belajar' && bel && <Belajar key={bel} id={bel} back={() => setNav('beranda')} openProgres={() => { setSaya(bel); setNav('saya'); }} />}
        {nav === 'saya' && saya && <Saya id={saya} back={() => setNav('beranda')} />}
        {tc && nav === 'peserta' && <Peserta key={tc} tc={tc} canWrite={user.canWrite} />}
        {nav === 'pengguna' && user.admin && <Users me={user.email} />}
        {nav === 'tc' && user.admin && <TcAdmin onCreated={reloadTc} />}
        {tc && nav === 'kelompok' && user.viewAll && <Kelompok key={tc} tc={tc} />}
        {tc && nav === 'rekap' && user.viewAll && <Rekap tc={tc} setTc={setTc} setNav={setNav} />}
      </main>
    </div>
  );
}

/* ---------------- BERANDA ---------------- */
function ViewAs() {
  const [list, setList] = useState(null);
  const [v, setV] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => { api('/api/viewas').then((j) => setList(j.mentors)).catch((e) => setErr(e.message)); }, []);
  async function go() { try { await api('/api/viewas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: v }) }); location.reload(); } catch (e) { setErr(e.message); } }
  return (
    <div className="field">
      <label className="lbl" htmlFor="va">Lihat sebagai mentor</label>
      <select id="va" value={v} onChange={(e) => setV(e.target.value)}>
        <option value="">{list ? 'Pilih mentor…' : 'Memuat…'}</option>
        {(list || []).map((m) => <option key={m.email} value={m.email}>{m.nama || m.email}</option>)}
      </select>
      <button className="btn" disabled={!v} onClick={go} style={{ marginTop: 6 }}>Lihat tampilan</button>
      {err && <span className="note">{err}</span>}
    </div>
  );
}

function Beranda({ user, openMentor, openSaya }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { api('/api/home').then(setD).catch((e) => setErr(e.message)); }, []);
  const first = (user.name || '').split(/\s+/)[0];
  return (
    <>
      <div className="head"><div><h1>Selamat datang{first ? ', ' + first : ''}</h1><div className="subt">Pilih program untuk melihat detailnya. Sebagai peserta, buka program Anda untuk mulai belajar.</div></div></div>
      {err && <div className="err" role="alert">{err}</div>}
      {!d && !err && <p className="note">Memuat…</p>}
      {d && (
        <>
          <h2 style={{ margin: '8px 0' }}>Sebagai mentor</h2>
          {d.mentor.length === 0 && <p className="note">Anda tidak terdaftar sebagai mentor di program mana pun.</p>}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))' }}>
            {d.mentor.map((t) => (
              <button key={t.nama} className="pcard" onClick={() => openMentor(t.nama)}>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'left' }}>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{t.nama}</span>
                  <span className="note">{t.total} peserta · {t.lulus} lulus</span>
                </span>
              </button>
            ))}
          </div>
          <h2 style={{ margin: '20px 0 8px' }}>Sebagai peserta</h2>
          {d.peserta.length === 0 && <p className="note">Anda tidak terdaftar sebagai peserta di program mana pun.</p>}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))' }}>
            {d.peserta.map((t) => (
              <button key={t.id} className="pcard" onClick={() => openSaya(t.id)}>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'left' }}>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{t.nama}</span>
                  <Chip s={t.status} />
                  <span className="note">{t.nonton} video selesai · {t.dinilai} bab dinilai</span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function Saya({ id, back }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { api('/api/saya/' + id).then(setD).catch((e) => setErr(e.message)); }, [id]);
  return (
    <>
      <div className="head"><div><h1>Progres belajar saya</h1><div className="subt">{d?.tc}</div></div><button className="btn" onClick={back}>Kembali</button></div>
      {err && <div className="err" role="alert">{err}</div>}
      {!d && !err && <p className="note">Memuat…</p>}
      {d && (
        <div className="card">
          <TimPanel tim={d.tim} kelompok={d.kelompok} judul="Mentor dan tim Anda" />
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}><Chip s={d.status} />{d.mentor && <span className="note">Mentor: {d.mentor}</span>}</div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))' }}>
            <div className="stat" style={{ background: 'var(--bg)' }}><b>{d.nonton}</b>Video selesai</div>
            <div className="stat" style={{ background: 'var(--bg)' }}><b>{d.bab.filter((b) => b.tugas).length}</b>Tugas terkumpul</div>
            <div className="stat" style={{ background: '#DDF4E4', color: '#14692C' }}><b>{d.bab.filter((b) => b.izin).length}</b>Bab dinilai mentor</div>
          </div>
          {d.keterangan && <p className="note">{d.keterangan}</p>}
          <div className="babgrid">
            {d.bab.map((b) => (
              <div key={b.bab} className="bab" style={b.belum ? { opacity: .6 } : undefined}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><b>{babLabel(b.bab)}</b><span className="note">{b.belum ? 'Belum selesai menonton' : b.tugas ? 'Tugas terkumpul' : 'Tugas belum'}</span></div>
                {!b.belum && <span className="note">{b.izin ? IZIN_LABEL[IZIN.indexOf(b.izin)] : 'Belum dinilai mentor'}</span>}
                {b.catatan && <span className="note">Catatan mentor: {b.catatan}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

/* ---------------- PESERTA ---------------- */
function Peserta({ tc, canWrite }) {
  const [list, setList] = useState(null);
  const [sel, setSel] = useState(null);
  const [filter, setFilter] = useState('all');
  const [qs, setQs] = useState('');
  const [err, setErr] = useState('');
  const load = useCallback(() => api('/api/peserta?tc=' + encodeURIComponent(tc)).then((j) => { setList(j.peserta); setSel((s) => s || j.peserta[0]?.id || null); }).catch((e) => setErr(e.message)), [tc]);
  useEffect(() => { load(); }, [load]);
  const p = list?.find((x) => x.id === sel);
  const cnt = (s) => (list || []).filter((x) => x.status === s).length;
  const shown = (list || []).filter((x) => (filter === 'all' || x.status === filter) && (!qs || (x.nama + ' ' + x.ku).toLowerCase().includes(qs.toLowerCase())));
  const tabs = [['all', 'Semua', 'sx', (list || []).length], ...STATUS.map((s) => [s, ST[s][0], ST[s][1], cnt(s)])];

  return (
    <>
      <div className="head"><div><h1>Peserta</h1><div className="subt">{tc}{list ? ' · ' + list.length + ' peserta' : ''}</div></div></div>
      {err && <div className="err" role="alert">{err}</div>}
      {!list && !err && <p className="note">Memuat…</p>}
      {list && list.length === 0 && <div className="card"><h2 style={{ margin: 0 }}>Belum ada peserta</h2><p className="note" style={{ margin: 0 }}>Tidak ada peserta untuk Anda di program ini.</p></div>}
      {list && list.length > 0 && (
        <>
          <div className="ftabs" role="group" aria-label="Saring menurut status">
            {tabs.map(([k, l, cls, c]) => <button key={k} className={'ftab ' + cls + (filter === k ? ' on' : '')} aria-pressed={filter === k} onClick={() => setFilter(k)}><i />{l}<b>{c}</b></button>)}
          </div>
          <div className="split">
            <section className="plist" aria-label="Daftar peserta">
              <div className="sr"><input type="text" aria-label="Cari peserta" placeholder="Cari nama atau keuskupan" value={qs} onChange={(e) => setQs(e.target.value)} /></div>
              <div className="list">
              {shown.map((x) => (
                <button key={x.id} className={'prow ' + ST[x.status][1] + (x.id === sel ? ' on' : '')} aria-pressed={x.id === sel} onClick={() => { setSel(x.id); if (typeof window !== 'undefined' && window.innerWidth <= 720) setTimeout(() => document.getElementById('pdetail')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60); }}>
                  <span className={'pav ' + ST[x.status][1]}>{initials(x.nama)}</span>
                  <span className="nm"><b>{x.nama}</b><span>{x.ku || 'Tanpa keuskupan'} · {x.bab.filter((b) => b.izin).length}/8 bab dinilai</span></span>
                  <Chip s={x.status} />
                </button>
              ))}
              {shown.length === 0 && <p className="note" style={{ padding: 20, textAlign: 'center' }}>Tidak ada peserta yang cocok.</p>}
              </div>
            </section>
            {p && <Detail key={p.id} p={p} reload={load} canWrite={canWrite} />}
          </div>
        </>
      )}
    </>
  );
}

function Detail({ p, reload, canWrite }) {
  const [msg, setMsg] = useState('');
  const [waOpen, setWaOpen] = useState(false);
  const [tpl, setTpl] = useState('hasil');
  const [text, setText] = useState(null);
  const first = p.nama.split(/\s+/)[0];
  const tpls = {
    tugas: `Salam ${first}, mohon segera kumpulkan tugas ringkasan TC Anda ya. Terima kasih.`,
    hasil: `Salam ${first}, saya mentor Anda. Penilaian bab TC sudah saya perbarui. Mari kita diskusikan bersama.`,
    bebas: ''
  };
  const body = text ?? tpls[tpl];
  const wa = 'https://wa.me/' + p.hp + '?text=' + encodeURIComponent(body);
  const nBoleh = p.bab.filter((b) => b.izin === IZIN[0]).length;
  const nDamp = p.bab.filter((b) => b.izin === IZIN[1]).length;
  const cls = ST[p.status][1];
  const locked = p.dinilai === 0 && p.status !== 'Lulus';

  const [undo, setUndo] = useState(null);
  async function setStatus(status, isUndo) {
    setMsg('');
    const prev = p.status;
    try {
      await api('/api/peserta/' + p.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      setUndo(isUndo ? null : prev); setMsg(isUndo ? 'Perubahan dibatalkan' : 'Status langsung tersimpan: ' + ST[status][0]); reload();
    } catch (e) { setMsg(e.message); }
  }

  return (
    <section id="pdetail" className={'pdetail ' + cls} aria-label="Detail peserta" style={{ scrollMarginTop: 12 }}>
      <div className="topbar" />
      <div className="body">
        <div className="head" style={{ alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
            <span className="pav lg">{initials(p.nama)}</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
              <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.02em', lineHeight: 1.15 }}>{p.nama}</div>
              <div className="note">{p.ku}{p.usia ? ' · ' + p.usia + ' th' : ''}</div>
            </div>
          </div>
          {p.hp && <button className="btn wa" onClick={() => setWaOpen(!waOpen)} aria-expanded={waOpen}>Kirim WhatsApp</button>}
        </div>

        <TimPanel tim={p.tim} kelompok={p.kelompok} judul="Mentor dan tim" />

        {waOpen && (
          <div className="bab">
            <div className="seg" role="group" aria-label="Template pesan">
              {[['tugas', 'Tugas'], ['hasil', 'Hasil'], ['bebas', 'Bebas']].map(([k, l]) => <button key={k} className={tpl === k ? 'on' : ''} onClick={() => { setTpl(k); setText(null); }}>{l}</button>)}
            </div>
            <textarea aria-label="Isi pesan" value={body} onChange={(e) => setText(e.target.value)} />
            <a className="btn primary" href={wa} target="_blank" rel="noreferrer" style={{ alignSelf: 'flex-start' }}>Buka WhatsApp</a>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span className="lbl">Status kepesertaan</span>
          <div className="sbtns" role="group" aria-label="Status kepesertaan">
            {STATUS.map((s) => {
              const off = !canWrite || (s === 'Lulus' && locked);
              return (
                <button key={s} className={'sbtn ' + ST[s][1] + (p.status === s ? ' on' : '')} aria-pressed={p.status === s} disabled={off} onClick={() => p.status !== s && setStatus(s)}>
                  {ST[s][0]}
                  {p.status === s && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>}
                  {off && canWrite && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>}
                </button>
              );
            })}
          </div>
          {locked && <span className="note">Lulus terbuka setelah minimal satu bab dinilai.</span>}
          {msg && <span className="note" role="status" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>{msg}{undo && <button className="btn" style={{ minHeight: 36, padding: '6px 16px' }} onClick={() => setStatus(undo, true)}>Urungkan</button>}</span>}
          {p.cekLulus !== 'OK' && <div className="err">{p.cekLulus}</div>}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
            <span className="lbl">Penilaian bab</span>
            <span><b>{nBoleh + nDamp}</b> dari 8 dinilai</span>
          </div>
          <div className="pbar" aria-hidden="true">{p.bab.map((b) => <span key={b.bab} className={b.izin === IZIN[0] ? 'ok' : b.izin === IZIN[1] ? 'dp' : ''} />)}</div>
          <div className="legend">
            <span><i style={{ background: '#1F8A3B' }} />{IZIN_LABEL[0]} · {nBoleh}</span>
            <span><i style={{ background: '#C25E00' }} />{IZIN_LABEL[1]} · {nDamp}</span>
            <span><i style={{ background: '#D2D2D7' }} />Belum dinilai · {8 - nBoleh - nDamp}</span>
          </div>
        </div>

        <div className="babgrid">{p.bab.map((b) => <BabTile key={b.bab} b={b} reload={reload} canWrite={canWrite} />)}</div>
      </div>
    </section>
  );
}

function BabTile({ b, reload, canWrite }) {
  const [izin, setIzin] = useState(b.izin);
  const [note, setNote] = useState(b.catatan);
  const [msg, setMsg] = useState('');
  const dirty = izin !== b.izin || note !== b.catatan;
  const needNote = izin === IZIN[1] && !note.trim();
  async function save() {
    setMsg('');
    try { await api('/api/detail/' + b.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ izin, catatan: note }) }); setMsg('Tersimpan'); reload(); }
    catch (e) { setMsg(e.message); }
  }
  if (!b.id) return <div className="btile" style={{ opacity: .7 }}><b>{babLabel(b.bab)}</b><span className="note">Belum selesai menonton</span></div>;
  return (
    <div className={'btile' + (izin === IZIN[0] ? ' ok' : izin === IZIN[1] ? ' dp' : '')}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}><b style={{ fontSize: 16 }}>{babLabel(b.bab)}</b><span className="note">{b.tugas ? 'Tugas terkumpul' : 'Tugas belum'}</span></div>
      <div className="ibtns" role="group" aria-label={'Penilaian ' + babLabel(b.bab)}>
        <button className={'ibtn ok' + (izin === IZIN[0] ? ' on' : '')} aria-pressed={izin === IZIN[0]} disabled={!canWrite} onClick={() => setIzin(izin === IZIN[0] ? null : IZIN[0])}>{IZIN_LABEL[0]}</button>
        <button className={'ibtn dp' + (izin === IZIN[1] ? ' on' : '')} aria-pressed={izin === IZIN[1]} disabled={!canWrite} onClick={() => setIzin(izin === IZIN[1] ? null : IZIN[1])}>{IZIN_LABEL[1]}</button>
      </div>
      {izin && <textarea readOnly={!canWrite} aria-label={'Catatan ' + babLabel(b.bab)} placeholder={izin === IZIN[1] ? 'Catatan wajib diisi' : 'Catatan (opsional)'} value={note} onChange={(e) => setNote(e.target.value)} />}
      {dirty && <div style={{ display: 'flex', gap: 8 }}><button className="btn primary" disabled={needNote} onClick={save}>Simpan</button><button className="btn" onClick={() => { setIzin(b.izin); setNote(b.catatan); setMsg(''); }}>Batal</button></div>}
      {needNote && <span className="note" style={{ color: '#A35200', fontWeight: 600 }}>Isi catatan untuk menyimpan.</span>}
      {msg && <span className="note" role="status">{msg}</span>}
    </div>
  );
}

/* ---------------- REKAP (superadmin) ---------------- */
function Rekap({ tc, setTc, setNav }) {
  const [tab, setTab] = useState('tc');
  const [ku, setKu] = useState('');
  const [bab, setBab] = useState('');
  const [ov, setOv] = useState(null);
  const [data, setData] = useState(null);
  const [kuList, setKuList] = useState([]);
  const [pf, setPf] = useState('Semua');
  const [qs, setQs] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => { api('/api/rekap?overview=1').then((j) => setOv(j.tcs)).catch((e) => setErr(e.message)); }, []);
  useEffect(() => { setKu(''); setKuList([]); }, [tc]);
  useEffect(() => {
    setData(null);
    api('/api/rekap?tc=' + encodeURIComponent(tc) + '&ku=' + encodeURIComponent(ku) + '&bab=' + encodeURIComponent(bab)).then((j) => { setData(j); if (!ku) setKuList(j.perKu.map((k) => k.ku).filter((k) => k !== 'Tanpa keuskupan').sort()); }).catch((e) => setErr(e.message));
  }, [tc, ku, bab]);

  const exportUrl = '/api/export?tc=' + encodeURIComponent(tc) + '&ku=' + encodeURIComponent(ku) + '&bab=' + encodeURIComponent(bab);
  const sum = data?.sum;
  const rows = useMemo(() => (data?.rows || []).filter((r) => (pf === 'Semua' || r.status === pf) && (!qs || r.nama.toLowerCase().includes(qs.toLowerCase()))), [data, pf, qs]);
  const bars = (x) => { const t = x.total || 1; return <div className="bars"><div style={{ width: (x.Lulus / t * 100) + '%', background: '#34A853' }} /><div style={{ width: (x['Peserta Aktif'] / t * 100) + '%', background: '#0071E3' }} /><div style={{ width: (x['Drop Out'] / t * 100) + '%', background: '#E5484D' }} /></div>; };

  return (
    <>
      <div className="head">
        <div><h1>Rekap</h1><div className="subt">{tc}{ku ? ' · ' + ku : ''}{bab ? ' · ' + babLabel(bab) : ''}</div></div>
        <div className="seg" role="group" aria-label="Tampilan rekap">
          {[['tc', 'Per TC'], ['ku', 'Per keuskupan'], ['pes', 'Peserta']].map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><label className="lbl" htmlFor="f-ku">Keuskupan</label>
          <select id="f-ku" value={ku} onChange={(e) => setKu(e.target.value)} style={{ minWidth: 220 }}><option value="">Semua keuskupan</option>{kuList.map((k) => <option key={k}>{k}</option>)}</select></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><label className="lbl" htmlFor="f-bab">Bab</label>
          <select id="f-bab" value={bab} onChange={(e) => setBab(e.target.value)} style={{ minWidth: 180 }}><option value="">Semua bab</option>{BAB.map((b) => <option key={b} value={b}>{babLabel(b)}</option>)}</select></div>
        <a className="btn primary" href={exportUrl}>Unduh Excel</a>
      </div>
      {err && <div className="err" role="alert">{err}</div>}

      {sum && (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))' }}>
          <div className="stat" style={{ background: '#fff' }}><b>{sum.total}</b>Peserta</div>
          <div className="stat" style={{ background: '#DDF4E4', color: '#14692C' }}><b>{sum.Lulus}</b>Lulus</div>
          <div className="stat" style={{ background: '#E3EEFF', color: '#0B4FB3' }}><b>{sum['Peserta Aktif']}</b>Aktif</div>
          <div className="stat" style={{ background: '#FFE3E0', color: '#A3180C' }}><b>{sum['Drop Out']}</b>Drop Out</div>
          {data.babRow && <div className="stat" style={{ background: '#FFF1E0', color: '#8A4500' }}><b>{data.babRow.tugas}</b>Tugas terkumpul · {babLabel(bab)}<span style={{ fontSize: 13 }}>{data.babRow.boleh} siap mengajar · {data.babRow.damping} perlu pendampingan</span></div>}
        </div>
      )}
      {!data && !err && <p className="note">Memuat…</p>}

      {tab === 'tc' && ov && (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))' }}>
          {ov.map((t) => (
            <button key={t.nama} className="pcard" style={{ flexDirection: 'column', alignItems: 'stretch', borderRadius: 24, padding: 28, gap: 18 }} onClick={() => { setTc(t.nama); setTab('pes'); }} aria-label={'Lihat tabel peserta ' + t.nama}>
              <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><b style={{ fontSize: 19 }}>{t.nama}</b>{t.status && <span className="chip" style={{ background: 'var(--line)', color: 'var(--sub)' }}>{t.status}</span>}</span>
              {bars(t)}
              <span style={{ display: 'flex', gap: 20, alignItems: 'baseline' }}><span className="note"><b style={{ fontSize: 22, color: 'var(--ink)' }}>{t.total}</b> peserta</span><span className="note"><b style={{ fontSize: 22, color: '#14692C' }}>{t.Lulus}</b> lulus</span><span style={{ marginLeft: 'auto', color: 'var(--blue)', fontWeight: 600 }}>Lihat tabel ›</span></span>
            </button>
          ))}
        </div>
      )}

      {tab === 'ku' && data && (
        <div className="card" style={{ gap: 6 }}>
          {data.perKu.map((k) => (
            <button key={k.ku} className="rowbtn" style={{ background: ku === k.ku ? '#F0F6FE' : 'transparent' }} onClick={() => { setKu(k.ku === 'Tanpa keuskupan' ? '' : k.ku); setTab('pes'); }} aria-label={'Lihat tabel peserta ' + k.ku}>
              <span style={{ fontWeight: 500 }}>{k.ku}</span>{bars(k)}<b style={{ textAlign: 'right' }}>{k.total} ›</b>
            </button>
          ))}
        </div>
      )}

      {tab === 'pes' && data && (
        <div className="card">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            <input type="text" aria-label="Cari peserta" placeholder="Cari nama" value={qs} onChange={(e) => setQs(e.target.value)} style={{ borderRadius: 999, background: 'var(--bg)', minWidth: 200 }} />
            <div className="seg" role="group" aria-label="Filter status">{['Semua', ...STATUS].map((s) => <button key={s} className={pf === s ? 'on' : ''} onClick={() => setPf(s)}>{s === 'Peserta Aktif' ? 'Aktif' : s}</button>)}</div>
          </div>
          <div className="tbl"><div className="tin" role="table" aria-label="Daftar peserta">
            <div className="tr th" role="row"><span>Nama</span><span>Keuskupan</span><span>Mentor</span><span>Status</span><span>{bab ? babLabel(bab) : 'Video selesai'}</span></div>
            {rows.map((r) => (
              <div className="tr" role="row" key={r.id}>
                <b>{r.nama}</b><span>{r.ku}</span><span style={{ color: '#424245' }}>{r.mentor}</span><Chip s={r.status} />
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {bab ? <span className="chip" style={{ background: r.babSelesai ? '#DDF4E4' : 'var(--bg)', color: r.babSelesai ? '#14692C' : 'var(--sub)' }}>{r.babSelesai ? 'Selesai' : 'Belum'}</span>
                    : <><span style={{ flex: 1, height: 8, borderRadius: 4, background: '#F0F0F3', overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: Math.min(100, r.nonton / 9 * 100) + '%', background: '#0071E3' }} /></span><span className="note">{r.nonton}/9</span></>}
                </span>
              </div>
            ))}
          </div></div>
          {rows.length === 0 && <p className="note">Tidak ada peserta yang cocok.</p>}
          <span className="note">{rows.length} dari {data.rows.length} peserta</span>
        </div>
      )}
    </>
  );
}

/* ---------------- PENGGUNA (superadmin) ---------------- */
function Users({ me }) {
  const [users, setUsers] = useState(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({ email: '', nama: '', level: 'Mentor' });
  const [qs, setQs] = useState('');
  const [sel, setSel] = useState(null);
  const [fl, setFl] = useState({ ku: '', usia: '', jk: '', level: '', spes: '', kategori: '', aktif: '' });
  const load = useCallback(() => api('/api/users').then((j) => setUsers(j.users)).catch((e) => setErr(e.message)), []);
  useEffect(() => { load(); }, [load]);

  async function add(e) {
    e.preventDefault(); setErr(''); setMsg('');
    try { await api('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }); setForm({ email: '', nama: '', level: 'Mentor' }); setMsg('Pengguna ditambahkan'); load(); }
    catch (x) { setErr(x.message); }
  }
  async function patch(id, body) {
    setErr(''); setMsg('');
    try { await api('/api/users/' + id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); setMsg('Tersimpan'); load(); }
    catch (x) { setErr(x.message); }
  }
  const all = users || [];
  const opt = (fn) => [...new Set(all.map(fn).flat().filter(Boolean))].sort();
  const opts = { ku: opt((u) => u.profil?.ku), usia: opt((u) => u.profil?.kelUsia), jk: opt((u) => u.profil?.jk), spes: opt((u) => u.profil?.spes), kategori: opt((u) => u.profil?.kategori) };
  const rows = all.filter((u) => {
    const p = u.profil;
    if (qs && !(u.email + ' ' + u.nama + ' ' + (p?.nama || '')).toLowerCase().includes(qs.toLowerCase())) return false;
    if (fl.level && u.level !== fl.level) return false;
    if (fl.aktif && (fl.aktif === 'ya') !== u.aktif) return false;
    if (fl.ku && p?.ku !== fl.ku) return false;
    if (fl.usia && p?.kelUsia !== fl.usia) return false;
    if (fl.jk && p?.jk !== fl.jk) return false;
    if (fl.kategori && p?.kategori !== fl.kategori) return false;
    if (fl.spes && !(p?.spes || []).includes(fl.spes)) return false;
    return true;
  });
  const cur = all.find((u) => u.id === sel);
  const desc = { Superadmin: 'Semua fitur dan kelola pengguna', Mentor: 'Peserta miliknya saja', Pengamat: 'Lihat rekap dan unduh Excel' };
  const F = ({ k, label, list }) => <select aria-label={label} value={fl[k]} onChange={(e) => setFl({ ...fl, [k]: e.target.value })}><option value="">{label}</option>{list.map((x) => <option key={x}>{x}</option>)}</select>;
  const aktifFilter = Object.values(fl).some(Boolean);

  return (
    <>
      <div className="head"><div><h1>Pengguna</h1><div className="subt">Atur siapa yang boleh masuk dan apa yang boleh dilakukan</div></div></div>
      {err && <div className="err" role="alert">{err}</div>}
      {msg && <div className="note" role="status">{msg}</div>}
      <form className="card" onSubmit={add}>
        <div className="lbl">Tambah pengguna</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <input type="text" aria-label="Email Google" placeholder="Email Google" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={{ flex: '2 1 240px' }} required />
          <input type="text" aria-label="Nama" placeholder="Nama" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} style={{ flex: '1 1 180px' }} />
          <select aria-label="Level akses" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>{LEVEL.map((l) => <option key={l}>{l}</option>)}</select>
          <button className="btn primary" type="submit">Tambah</button>
        </div>
        <div className="note">{desc[form.level]}. Mentor tanpa baris di sini tetap bisa masuk lewat Email Mentor di Schole, dengan level Mentor.</div>
      </form>

      {cur && (
        <section className="card profil" aria-label="Profil pengguna">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', minWidth: 0 }}>
              <span className="pav lg">{initials(cur.profil?.nama || cur.nama || cur.email)}</span>
              <div style={{ minWidth: 0 }}><div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-.02em' }}>{cur.profil?.nama || cur.nama || cur.email}</div><div className="note" style={{ wordBreak: 'break-all' }}>{cur.email} · {cur.level}{cur.aktif ? '' : ' · nonaktif'}</div></div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {cur.profil?.wa && <a className="btn wa" href={waLink(cur.profil.wa)} target="_blank" rel="noreferrer">WhatsApp</a>}
              <button className="btn" onClick={() => setSel(null)}>Tutup</button>
            </div>
          </div>
          {!cur.profil ? <p className="note" style={{ margin: 0 }}>Email ini belum ditemukan di data BPN (M-Person), jadi profil belum tersedia. Pastikan emailnya sama dengan yang tercatat di BPN.</p> : (
            <dl className="pf">
              {[['Nama panggilan', cur.profil.panggilan], ['Keuskupan', cur.profil.ku], ['Jenis kelamin', cur.profil.jk], ['Usia', cur.profil.usia != null ? cur.profil.usia + ' th' : ''], ['Kelompok usia', cur.profil.kelUsia], ['Kategori', cur.profil.kategori],
                ['Spesialisasi pengajar SHDR', (cur.profil.spes || []).join(', ')], ['Sakramen baptis', cur.profil.baptis], ['Sakramen krisma', cur.profil.krisma], ['Alamat surat', cur.profil.alamat]].map(([k, v]) => v ? <div key={k}><dt>{k}</dt><dd>{v}</dd></div> : null)}
            </dl>
          )}
          {cur.profil && <span className="note">Data profil dibaca dari BPN dan tidak bisa diubah di sini.</span>}
        </section>
      )}

      <div className="card">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <input type="text" aria-label="Cari pengguna" placeholder="Cari email atau nama" value={qs} onChange={(e) => setQs(e.target.value)} style={{ borderRadius: 999, background: 'var(--bg)', flex: '1 1 220px', maxWidth: 320 }} />
          <F k="ku" label="Semua keuskupan" list={opts.ku} /><F k="usia" label="Semua kelompok usia" list={opts.usia} /><F k="jk" label="Jenis kelamin" list={opts.jk} />
          <F k="spes" label="Spesialisasi bab" list={opts.spes} /><F k="kategori" label="Kategori" list={opts.kategori} /><F k="level" label="Semua level" list={LEVEL} />
          <select aria-label="Status aktif" value={fl.aktif} onChange={(e) => setFl({ ...fl, aktif: e.target.value })}><option value="">Aktif dan nonaktif</option><option value="ya">Aktif</option><option value="tidak">Nonaktif</option></select>
          {aktifFilter && <button className="btn" onClick={() => setFl({ ku: '', usia: '', jk: '', level: '', spes: '', kategori: '', aktif: '' })}>Hapus filter</button>}
        </div>
        <span className="note">{users ? rows.length + ' dari ' + all.length + ' pengguna' : ''} · Klik nama untuk melihat profil dari BPN.</span>
        {!users && !err && <p className="note">Memuat…</p>}
        <div className="tbl"><div className="tin" role="table" aria-label="Daftar pengguna" style={{ minWidth: 760 }}>
          <div className="tr th" role="row" style={{ gridTemplateColumns: 'minmax(160px,1.6fr) minmax(200px,2fr) minmax(110px,1fr) 150px 90px' }}><span>Nama</span><span>Email</span><span>Keuskupan</span><span>Level</span><span>Aktif</span></div>
          {rows.map((u) => (
            <div className="tr" role="row" key={u.id} style={{ gridTemplateColumns: 'minmax(160px,1.6fr) minmax(200px,2fr) minmax(110px,1fr) 150px 90px', opacity: u.aktif ? 1 : .55 }}>
              <button className="lnk" onClick={() => { setSel(u.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>{u.profil?.nama || u.nama || u.email}</button>
              <span style={{ wordBreak: 'break-all' }}>{u.email}{u.email === me ? ' (Anda)' : ''}</span>
              <span>{u.profil?.ku || <span className="note">-</span>}</span>
              <select aria-label={'Level ' + u.email} value={u.level} onChange={(e) => patch(u.id, { level: e.target.value })}>{LEVEL.map((l) => <option key={l}>{l}</option>)}</select>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" checked={u.aktif} onChange={(e) => patch(u.id, { aktif: e.target.checked })} style={{ width: 22, height: 22 }} aria-label={'Aktif ' + u.email} /></label>
            </div>
          ))}
        </div></div>
        {users && rows.length === 0 && <p className="note">Tidak ada pengguna yang cocok.</p>}
      </div>
    </>
  );
}

/* ---------------- TIM / KELOMPOK ---------------- */
const waLink = (hp, text) => 'https://wa.me/' + hp + (text ? '?text=' + encodeURIComponent(text) : '');
const PERAN_CLS = { Mentor: 'sa', 'Co-Mentor': 'sl', 'Pendamping Teknis': 'sx', 'Pengolah Data': 'sx' };
function TimPanel({ tim, kelompok, judul }) {
  if (!tim || tim.length === 0) return null;
  return (
    <div className="timp">
      <span className="lbl">{judul || 'Tim pendamping'}{kelompok ? ' · ' + kelompok : ''}</span>
      <div className="timl">
        {tim.map((o, i) => (
          <div key={i} className="timr">
            <span className={'chip ' + (PERAN_CLS[o.peran] || 'sx')}>{o.peran}</span>
            <span className="tn"><b>{o.nama}</b>{o.kota ? <span className="note"> · {o.kota}</span> : null}</span>
            {o.hp ? <a className="btn wa sm" href={waLink(o.hp)} target="_blank" rel="noreferrer" aria-label={'WhatsApp ' + o.nama}>WhatsApp</a> : <span className="note">Tanpa nomor</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function Kelompok({ tc }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [qs, setQs] = useState('');
  useEffect(() => { setD(null); api('/api/kelompok?tc=' + encodeURIComponent(tc)).then((j) => setD(j.kelompok)).catch((e) => setErr(e.message)); }, [tc]);
  const m = qs.toLowerCase();
  const shown = (d || []).filter((g) => !m || (g.kelompok + ' ' + g.tim.map((o) => o.nama).join(' ') + ' ' + g.peserta.map((x) => x.nama + ' ' + x.ku).join(' ')).toLowerCase().includes(m));
  return (
    <>
      <div className="head"><div><h1>Kelompok</h1><div className="subt">{tc}{d ? ' · ' + d.length + ' kelompok · ' + d.reduce((a, g) => a + g.peserta.length, 0) + ' peserta' : ''}</div></div></div>
      {err && <div className="err" role="alert">{err}</div>}
      {!d && !err && <p className="note">Memuat…</p>}
      {d && <input type="text" aria-label="Cari kelompok, mentor, atau peserta" placeholder="Cari kelompok, mentor, atau peserta" value={qs} onChange={(e) => setQs(e.target.value)} style={{ borderRadius: 999, maxWidth: 420 }} />}
      {d && shown.length === 0 && <p className="note">Tidak ada yang cocok.</p>}
      {shown.map((g) => (
        <section key={g.kelompok} className="card kgrp" aria-label={g.kelompok}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'baseline' }}>
            <h2 style={{ margin: 0 }}>{g.kelompok}</h2><span className="note">{g.peserta.length} peserta</span>
          </div>
          {g.tim.length ? <TimPanel tim={g.tim} /> : <span className="note">Belum ada mentor di kelompok ini.</span>}
          <div className="kpes">
            <span className="lbl">Peserta</span>
            {g.peserta.map((x) => (
              <div key={x.id} className="timr">
                <Chip s={x.status} />
                <span className="tn"><b>{x.nama}</b><span className="note"> · {x.ku || 'Tanpa keuskupan'}</span></span>
                {x.hp ? <a className="btn wa sm" href={waLink(x.hp)} target="_blank" rel="noreferrer" aria-label={'WhatsApp ' + x.nama}>WhatsApp</a> : <span className="note">Tanpa nomor</span>}
              </div>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

/* ---------------- TC BARU & PENGAJAR ---------------- */
function TcAdmin({ onCreated }) {
  const [modul, setModul] = useState(null);
  const [events, setEvents] = useState([]);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [mid, setMid] = useState('');
  const [peng, setPeng] = useState(null);
  const [fku, setFku] = useState('');
  const [form, setForm] = useState({ nama: '', mulai: '', selesai: '', salinDari: '' });
  useEffect(() => {
    api('/api/modul').then((j) => setModul(j.modul)).catch((e) => setErr(e.message));
    api('/api/tcadmin').then((j) => setEvents(j.events)).catch((e) => setErr(e.message));
  }, []);
  const mod = (modul || []).find((x) => x.id === mid);
  function pick(id) {
    setMid(id); setPeng(null); setFku(''); setMsg('');
    const mm = (modul || []).find((x) => x.id === id);
    if (!mm) return;
    const ref = events.find((e) => e.materi > 0 && e.nama.toUpperCase().includes(mm.nama.toUpperCase().split(/[\s(]/)[0])) || events.find((e) => e.materi > 0);
    setForm((f) => ({ ...f, nama: 'TC ' + mm.nama + ' ' + new Date().getFullYear(), salinDari: ref?.id || '' }));
    api('/api/modul/' + id).then(setPeng).catch((e) => setErr(e.message));
  }
  async function create(e) {
    e.preventDefault(); setErr(''); setMsg('');
    try {
      const r = await api('/api/tcadmin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      setMsg('TC dibuat' + (r.materi ? ' dengan materi dari TC acuan.' : ' tanpa materi (belum ada TC acuan).'));
      setForm({ nama: '', mulai: '', selesai: '', salinDari: form.salinDari });
      api('/api/tcadmin').then((j) => setEvents(j.events)).catch(() => {});
      onCreated && onCreated();
    } catch (x) { setErr(x.message); }
  }
  const kus = [...new Set((peng?.pengajar || []).map((x) => x.ku).filter(Boolean))].sort();
  const pl = (peng?.pengajar || []).filter((x) => !fku || x.ku === fku);
  const grouped = {};
  (peng?.pengajar || []).forEach((x) => (x.spes || []).forEach((s) => { grouped[s] = (grouped[s] || 0) + 1; }));
  return (
    <>
      <div className="head"><div><h1>TC baru</h1><div className="subt">Buat program TC dan lihat pengajar yang terdata di BPN</div></div></div>
      {err && <div className="err" role="alert">{err}</div>}
      {msg && <div className="note" role="status" style={{ color: 'var(--green)', fontWeight: 600 }}>{msg}</div>}
      <form className="card" onSubmit={create}>
        <div className="lbl">1. Pilih modul (dari BPN)</div>
        <select aria-label="Modul berjenjang" value={mid} onChange={(e) => pick(e.target.value)}>
          <option value="">{modul ? 'Pilih modul…' : 'Memuat…'}</option>
          {(modul || []).map((m) => <option key={m.id} value={m.id}>{m.nama}{m.tahap ? ' · ' + m.tahap : ''} · {m.jumlah} pengajar</option>)}
        </select>

        {mod && (
          <div className="pgj">
            <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', flexWrap: 'wrap' }}>
              <b style={{ fontSize: 28 }}>{peng ? peng.jumlah : mod.jumlah}</b><span>pengajar terdata untuk {mod.nama}</span>
            </div>
            {!peng && <span className="note">Memuat pengajar…</span>}
            {peng && (
              <>
                {Object.keys(grouped).length > 0 && <div className="legend">{Object.entries(grouped).sort().map(([s, c]) => <span key={s}><i style={{ background: '#0A64D6' }} />{s} · {c}</span>)}</div>}
                <select aria-label="Saring keuskupan" value={fku} onChange={(e) => setFku(e.target.value)} style={{ maxWidth: 280 }}>
                  <option value="">Semua keuskupan ({kus.length})</option>
                  {kus.map((k) => <option key={k}>{k}</option>)}
                </select>
                <div className="tbl"><div className="tin" role="table" aria-label="Pengajar" style={{ minWidth: 620 }}>
                  <div className="tr th" role="row" style={{ gridTemplateColumns: 'minmax(180px,2fr) minmax(120px,1.2fr) minmax(160px,2fr) 110px' }}><span>Nama</span><span>Keuskupan</span><span>Spesialisasi bab</span><span>WA</span></div>
                  {pl.map((x) => (
                    <div className="tr" role="row" key={x.id} style={{ gridTemplateColumns: 'minmax(180px,2fr) minmax(120px,1.2fr) minmax(160px,2fr) 110px' }}>
                      <b>{x.nama}</b><span>{x.ku || '-'}</span><span>{x.spes.length ? x.spes.join(', ') : <span className="note">Belum diisi</span>}</span>
                      {x.wa ? <a className="btn wa sm" href={waLink(x.wa)} target="_blank" rel="noreferrer">WhatsApp</a> : <span className="note">-</span>}
                    </div>
                  ))}
                </div></div>
              </>
            )}
          </div>
        )}

        <div className="lbl" style={{ marginTop: 8 }}>2. Nama dan periode TC</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <input type="text" aria-label="Nama TC" placeholder="Nama TC" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} style={{ flex: '2 1 260px' }} required />
          <label className="dl">Mulai<input type="date" value={form.mulai} onChange={(e) => setForm({ ...form, mulai: e.target.value })} required /></label>
          <label className="dl">Selesai<input type="date" value={form.selesai} min={form.mulai} onChange={(e) => setForm({ ...form, selesai: e.target.value })} required /></label>
        </div>
        <div className="lbl" style={{ marginTop: 8 }}>3. Salin materi dari TC</div>
        <select aria-label="Salin materi dari TC" value={form.salinDari} onChange={(e) => setForm({ ...form, salinDari: e.target.value })}>
          <option value="">Tanpa materi</option>
          {events.map((e) => <option key={e.id} value={e.id}>{e.nama}{e.materi ? '' : ' (tanpa materi)'}</option>)}
        </select>
        <button className="btn primary" type="submit" style={{ alignSelf: 'flex-start' }}>Buat TC</button>
        <span className="note">Peserta dan kelompok ditambahkan lewat Airtable atau pendaftaran seperti biasa; TC baru langsung muncul di daftar program.</span>
      </form>
    </>
  );
}

/* ---------------- BELAJAR (LMS PESERTA) ---------------- */
let ytPromise = null;
function loadYT() {
  if (typeof window === 'undefined') return Promise.reject();
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (!ytPromise) ytPromise = new Promise((res) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev && prev(); res(window.YT); };
    const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(s);
  });
  return ytPromise;
}
const fmt = (s) => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

// Pemutar terlindungi: tanpa kontrol bawaan, lapisan penghalang klik, tidak bisa melompat maju.
function Player({ vid, review, onEnough }) {
  const box = useState(() => 'yt' + Math.random().toString(36).slice(2))[0];
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [dur, setDur] = useState(0);
  const pl = useCallback(() => (typeof window !== 'undefined' ? window['__pl_' + box] : null), [box]);
  useEffect(() => {
    let dead = false; let timer; let max = 0; let fired = false;
    loadYT().then((YT) => {
      if (dead) return;
      const p = new YT.Player(box, {
        videoId: vid, host: 'https://www.youtube-nocookie.com',
        playerVars: { controls: 0, disablekb: 1, fs: 0, modestbranding: 1, rel: 0, iv_load_policy: 3, playsinline: 1, origin: window.location.origin },
        events: {
          onReady: () => { window['__pl_' + box] = p; setReady(true); setDur(p.getDuration()); },
          onStateChange: (e) => { setPlaying(e.data === 1); if (e.data === 0 && !fired) { fired = true; onEnough(); } }
        }
      });
      timer = setInterval(() => {
        try {
          const t = p.getCurrentTime(); const d = p.getDuration(); if (!d) return;
          setPos(t); setDur(d);
          if (!review) { if (t > max + 4) p.seekTo(max, true); else max = Math.max(max, t); }
          if (!fired && d && t / d >= 0.9) { fired = true; onEnough(); }
        } catch (e) { /* belum siap */ }
      }, 500);
    }).catch(() => {});
    return () => { dead = true; clearInterval(timer); try { const p = window['__pl_' + box]; p && p.destroy(); } catch (e) { /* abaikan */ } window['__pl_' + box] = null; };
  }, [vid, box, review, onEnough]);
  const toggle = () => { const p = pl(); if (!p) return; playing ? p.pauseVideo() : p.playVideo(); };
  return (
    <div className="player" onContextMenu={(e) => e.preventDefault()}>
      <div className="vwrap"><div id={box} /><div className="vshield" onClick={toggle} aria-hidden="true" /></div>
      <div className="vctl">
        <button className="btn" onClick={toggle} disabled={!ready} aria-label={playing ? 'Jeda' : 'Putar'}>{playing ? 'Jeda' : 'Putar'}</button>
        <div className="vbar" aria-hidden="true"><i style={{ width: (dur ? Math.min(100, (pos / dur) * 100) : 0) + '%' }} /></div>
        <span className="note" style={{ minWidth: 84, textAlign: 'right' }}>{fmt(pos)} / {fmt(dur)}</span>
      </div>
    </div>
  );
}

function Belajar({ id, back, openProgres }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [selId, setSelId] = useState(null);
  const [vid, setVid] = useState('');
  const [enough, setEnough] = useState(false);
  const [busy, setBusy] = useState(false);
  const load = useCallback((pick) => api('/api/lms/' + id).then((j) => {
    setD(j);
    setSelId((s) => pick || s || (j.items.find((x) => x.state === 'current') || j.items[j.items.length - 1])?.id || null);
  }).catch((e) => setErr(e.message)), [id]);
  useEffect(() => { load(); }, [load]);
  const it = d?.items.find((x) => x.id === selId);
  useEffect(() => {
    setVid(''); setEnough(false);
    if (!selId || !it || it.state === 'locked') return;
    let dead = false;
    api('/api/lms/' + id + '/video?p=' + encodeURIComponent(selId)).then((j) => { if (!dead) setVid(j.vid); }).catch((e) => setErr(e.message));
    return () => { dead = true; };
  }, [selId, id, it?.state]); // eslint-disable-line react-hooks/exhaustive-deps
  const onEnough = useCallback(() => setEnough(true), []);
  const nDone = d ? d.items.filter((x) => x.state === 'done').length : 0;

  async function finish() {
    setBusy(true); setErr(''); setMsg('');
    try {
      await api('/api/lms/' + id + '/selesai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ p: selId }) });
      const idx = d.items.findIndex((x) => x.id === selId);
      const next = d.items[idx + 1];
      setMsg(next ? 'Tersimpan. Video berikutnya sudah terbuka.' : 'Selamat, semua video sudah selesai ditonton!');
      await load(next ? next.id : selId);
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }
  return (
    <>
      <div className="head"><div><h1>Belajar</h1><div className="subt">{d?.tc}{d ? ' · ' + nDone + ' dari ' + d.items.length + ' video selesai' : ''}</div></div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}><button className="btn" onClick={openProgres}>Penilaian mentor</button><button className="btn" onClick={back}>Kembali</button></div></div>
      {err && <div className="err" role="alert">{err}</div>}
      {!d && !err && <p className="note">Memuat…</p>}
      {d && d.items.length === 0 && <div className="card"><h2 style={{ margin: 0 }}>Belum ada video</h2><p className="note" style={{ margin: 0 }}>Materi untuk program ini belum tersedia.</p></div>}
      {d && d.items.length > 0 && (
        <>
          <div className="pbar" aria-hidden="true" style={{ gridTemplateColumns: 'repeat(' + d.items.length + ',1fr)' }}>{d.items.map((x) => <span key={x.id} className={x.state === 'done' ? 'ok' : ''} />)}</div>
          <div className="lms">
            <ol className="steps" aria-label="Perjalanan belajar">
              {d.items.map((x) => (
                <li key={x.id}>
                  <button className={'step ' + x.state + (x.id === selId ? ' on' : '')} disabled={x.state === 'locked'} onClick={() => { setSelId(x.id); setMsg(''); }} aria-current={x.id === selId ? 'step' : undefined}>
                    <span className="sn">{x.state === 'done' ? '✓' : x.state === 'locked' ? '🔒' : x.no}</span>
                    <span className="st"><b>{x.judul}</b><span className="note">{x.state === 'done' ? 'Selesai' : x.state === 'current' ? 'Sedang giliran' : 'Terkunci'}</span></span>
                  </button>
                </li>
              ))}
            </ol>
            <section className="card lmsp" aria-label="Pemutar video">
              {it && <h2 style={{ margin: 0 }}>{it.judul}</h2>}
              {it && vid && <Player key={vid + it.state} vid={vid} review={it.state === 'done'} onEnough={onEnough} />}
              {it && !vid && it.state !== 'locked' && !err && <p className="note">Memuat video…</p>}
              {it && it.state === 'current' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button className="btn primary" disabled={!enough || busy || d.readOnly} onClick={finish} style={{ alignSelf: 'flex-start', minHeight: 52, fontSize: 17 }}>Selesai menonton</button>
                  <span className="note">{d.readOnly ? 'Mode lihat sebagai: tidak bisa menyelesaikan video.' : enough ? 'Tekan tombol untuk membuka video berikutnya.' : 'Tombol aktif setelah video hampir selesai ditonton. Video tidak bisa dipercepat ke depan.'}</span>
                </div>
              )}
              {it && it.state === 'done' && <span className="note">Video ini sudah Anda selesaikan. Boleh ditonton ulang.</span>}
              {msg && <span className="note" role="status" style={{ color: 'var(--green)', fontWeight: 600 }}>{msg}</span>}
            </section>
          </div>
        </>
      )}
    </>
  );
}
