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
const IC = { home: 'M3 11l9-8 9 8 M5 10v10h14V10', peserta: 'M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1 M9.5 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M21 19v-1a4 4 0 0 0-3-3.87 M16 4.13a3 3 0 0 1 0 5.74', rekap: 'M4 20V10 M10 20V4 M16 20v-7 M22 20H2', users: 'M12 15a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1' };

export default function App({ user }) {
  const [tcs, setTcs] = useState(null);
  const [tc, setTc] = useState('');
  const [nav, setNav] = useState('beranda');
  const [saya, setSaya] = useState(null);
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
          <button className={'nav' + (nav === 'beranda' || nav === 'saya' ? ' on' : '')} onClick={() => setNav('beranda')}><Icon d={IC.home} />Beranda</button>
          <button className={'nav' + (nav === 'peserta' ? ' on' : '')} onClick={() => setNav('peserta')} aria-current={nav === 'peserta' ? 'page' : undefined}><Icon d={IC.peserta} />Peserta</button>
          {user.viewAll && <button className={'nav' + (nav === 'rekap' ? ' on' : '')} onClick={() => setNav('rekap')} aria-current={nav === 'rekap' ? 'page' : undefined}><Icon d={IC.rekap} />Rekap</button>}
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
        {tcs && tcs.length === 0 && nav !== 'beranda' && nav !== 'saya' && <div className="card"><h2 style={{ margin: 0 }}>Belum ada program</h2><p className="note" style={{ margin: 0 }}>Email {user.email} belum terdaftar sebagai mentor di Airtable.</p></div>}
        {nav === 'beranda' && <Beranda user={user} openMentor={(n) => { setTc(n); setNav('peserta'); }} openSaya={(id) => { setSaya(id); setNav('saya'); }} />}
        {nav === 'saya' && saya && <Saya id={saya} back={() => setNav('beranda')} />}
        {tc && nav === 'peserta' && <Peserta key={tc} tc={tc} canWrite={user.canWrite} />}
        {nav === 'pengguna' && user.admin && <Users me={user.email} />}
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
      <div className="head"><div><h1>Selamat datang{first ? ', ' + first : ''}</h1><div className="subt">Pilih program untuk melihat detailnya.</div></div></div>
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
              {shown.map((x) => (
                <button key={x.id} className={'prow ' + ST[x.status][1] + (x.id === sel ? ' on' : '')} aria-pressed={x.id === sel} onClick={() => setSel(x.id)}>
                  <span className={'pav ' + ST[x.status][1]}>{initials(x.nama)}</span>
                  <span className="nm"><b>{x.nama}</b><span>{x.ku || 'Tanpa keuskupan'} · {x.bab.filter((b) => b.izin).length}/8 bab dinilai</span></span>
                  <Chip s={x.status} />
                </button>
              ))}
              {shown.length === 0 && <p className="note" style={{ padding: 20, textAlign: 'center' }}>Tidak ada peserta yang cocok.</p>}
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

  async function setStatus(status) {
    setMsg('');
    try { await api('/api/peserta/' + p.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }); setMsg('Status disimpan'); reload(); }
    catch (e) { setMsg(e.message); }
  }

  return (
    <section className={'pdetail ' + cls} aria-label="Detail peserta">
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
          {msg && <span className="note" role="status">{msg}</span>}
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
      {dirty && <button className="btn primary" disabled={needNote} onClick={save}>Simpan</button>}
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
  const rows = (users || []).filter((u) => !qs || (u.email + ' ' + u.nama).toLowerCase().includes(qs.toLowerCase()));
  const desc = { Superadmin: 'Semua fitur dan kelola pengguna', Mentor: 'Peserta miliknya saja', Pengamat: 'Lihat rekap dan unduh Excel' };

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
      <div className="card">
        <input type="text" aria-label="Cari pengguna" placeholder="Cari email atau nama" value={qs} onChange={(e) => setQs(e.target.value)} style={{ borderRadius: 999, background: 'var(--bg)', maxWidth: 320 }} />
        {!users && !err && <p className="note">Memuat…</p>}
        <div className="tbl"><div className="tin" role="table" aria-label="Daftar pengguna" style={{ minWidth: 640 }}>
          <div className="tr th" role="row" style={{ gridTemplateColumns: 'minmax(220px,2fr) minmax(140px,1.4fr) 150px 90px' }}><span>Email</span><span>Nama</span><span>Level</span><span>Aktif</span></div>
          {rows.map((u) => (
            <div className="tr" role="row" key={u.id} style={{ gridTemplateColumns: 'minmax(220px,2fr) minmax(140px,1.4fr) 150px 90px', opacity: u.aktif ? 1 : .55 }}>
              <b style={{ wordBreak: 'break-all' }}>{u.email}{u.email === me ? ' (Anda)' : ''}</b>
              <span>{u.nama}</span>
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
