'use client';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { signOut } from 'next-auth/react';
import { IZIN, IZIN_LABEL, STATUS, LEVEL, babLabel } from '@/lib/config';

const ST = { 'Peserta Aktif': ['Aktif', 'sa', '●'], Lulus: ['Lulus', 'sl', '✓'], 'Drop Out': ['Drop Out', 'sd', '✕'] };
// Status tidak hanya dibedakan warna: ada simbol di setiap chip
const Chip = ({ s }) => <span className={'chip ' + (ST[s]?.[1] || 'sx')}><span aria-hidden="true">{ST[s]?.[2] ? ST[s][2] + ' ' : ''}</span>{ST[s]?.[0] || s}</span>;

// Rapikan huruf besar/kecil hanya untuk tampilan (data sumber tidak diubah)
const fmtNama = (n) => String(n || '').trim().split(/\s+/).filter(Boolean).map((w) => {
  if (w === w.toLowerCase()) return w.charAt(0).toUpperCase() + w.slice(1);
  if (w === w.toUpperCase() && w.replace(/[^A-Za-z]/g, '').length > 3) return w.charAt(0) + w.slice(1).toLowerCase();
  return w;
}).join(' ');
const nm = (p) => (p.nama ? fmtNama(p.nama) : '(Tanpa nama)');
const initials = (n) => fmtNama(n).split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
// "Kelompok 12 (4|A)" -> "Kelompok 12"
const kelNama = (s) => String(s || '').replace(/\s*\(\d+\s*\|[^)]*\)\s*$/, '');

async function api(url, opt) {
  const r = await fetch(url, opt);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Gagal (' + r.status + ')');
  return j;
}
const post = (url, body, method = 'POST') => api(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const Icon = ({ d }) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
const IC = { home: 'M3 11l9-8 9 8 M5 10v10h14V10', peserta: 'M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1 M9.5 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M21 19v-1a4 4 0 0 0-3-3.87 M16 4.13a3 3 0 0 1 0 5.74', rekap: 'M4 20V10 M10 20V4 M16 20v-7 M22 20H2', kelompok: 'M3 7h18 M3 12h18 M3 17h18', tc: 'M12 5v14 M5 12h14', users: 'M12 15a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1', wa: 'M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20.5l1.7-5.2A8.5 8.5 0 1 1 21 11.5z', dl: 'M12 4v11 M7 11l5 5 5-5 M5 20h14', warn: 'M12 3l10 18H2L12 3z M12 10v5 M12 18h.01' };

// Kerangka pemuatan (skeleton) agar halaman tidak terlihat kosong saat data diambil
function Skel({ n = 4, h = 64 }) {
  return (
    <div role="status" aria-label="Memuat">
      <div className="skels" aria-hidden="true">{Array.from({ length: n }).map((_, i) => <div key={i} className="skel" style={{ height: h }} />)}</div>
      <span className="sr-only">Memuat…</span>
    </div>
  );
}

const MENU_LS = 'schole_tc';

export default function App({ user }) {
  const [tcs, setTcs] = useState(null);
  const [tc, setTc] = useState('');
  const [nav, setNav] = useState('beranda');
  const [saya, setSaya] = useState(null);
  const [bel, setBel] = useState(null);
  const [err, setErr] = useState('');
  const [menu, setMenu] = useState(false);
  const ready = useRef(false);
  const prevNav = useRef('beranda');
  const tcsRef = useRef([]);
  const can = useCallback((m) => (m === 'rekap' || m === 'kelompok' ? user.viewAll : m === 'tc' || m === 'pengguna' ? user.admin : ['beranda', 'peserta', 'saya', 'belajar'].includes(m)), [user]);
  const reloadTc = () => api('/api/tc').then((j) => { setTcs(j.tcs); tcsRef.current = j.tcs; }).catch(() => {});

  // Menu dan program disimpan di alamat halaman (?m=peserta&tc=...): bisa di-bookmark, tombol Back berfungsi, reload tidak kembali ke Beranda
  const readUrl = useCallback(() => {
    const p = new URLSearchParams(window.location.search);
    const m = p.get('m'); const id = p.get('id');
    if (m && can(m) && !((m === 'belajar' || m === 'saya') && !id)) { setNav(m); if (m === 'belajar') setBel(id); if (m === 'saya') setSaya(id); } else setNav('beranda');
    const want = p.get('tc');
    if (want && tcsRef.current.some((t) => t.nama === want)) setTc(want);
  }, [can]);

  useEffect(() => {
    api('/api/tc').then((j) => {
      setTcs(j.tcs); tcsRef.current = j.tcs;
      let want = new URLSearchParams(window.location.search).get('tc');
      if (!want) { try { want = window.localStorage.getItem(MENU_LS); } catch (e) { want = ''; } }
      // Pilihan terakhir diingat; jika belum ada, pakai program yang sedang berlangsung (bukan sekadar yang pertama)
      const pick = j.tcs.find((t) => t.nama === want) || j.tcs.find((t) => /berlangsung/i.test(t.status)) || j.tcs[0];
      if (pick) setTc(pick.nama);
    }).catch((e) => setErr(e.message)).finally(() => { readUrl(); ready.current = true; });
    const onPop = () => readUrl();
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [readUrl]);

  useEffect(() => {
    if (!ready.current) return;
    const p = new URLSearchParams(); p.set('m', nav); if (tc) p.set('tc', tc);
    const id = nav === 'belajar' ? bel : nav === 'saya' ? saya : ''; if (id) p.set('id', id);
    const qs = '?' + p.toString();
    if (qs !== window.location.search) window.history[prevNav.current === nav ? 'replaceState' : 'pushState'](null, '', qs);
    prevNav.current = nav;
    try { if (tc) window.localStorage.setItem(MENU_LS, tc); } catch (e) { /* abaikan */ }
  }, [nav, tc, bel, saya]);

  const go = (m) => { setNav(m); setMenu(false); };
  const item = (m, label, ic, hide) => !hide && <button className={'nav' + (nav === m || (m === 'beranda' && (nav === 'saya' || nav === 'belajar')) ? ' on' : '')} onClick={() => go(m)} aria-current={nav === m ? 'page' : undefined}><Icon d={IC[ic]} />{label}</button>;

  return (
    <div className="shell">
      <aside>
        <div className="atop">
          <div className="brand"><span className="logo">σ</span><span className="bt">Schole</span></div>
          <div className="field progf">
            <label className="lbl" htmlFor="tc">Program</label>
            <select id="tc" value={tc} onChange={(e) => setTc(e.target.value)}>
              {(tcs || []).map((t) => <option key={t.nama} value={t.nama}>{t.nama}</option>)}
            </select>
          </div>
          <button className="menubtn" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-controls="akun" aria-label="Menu akun"><span className="pav sx">{initials(user.name)}</span></button>
        </div>
        <nav aria-label="Menu utama">
          {item('beranda', 'Beranda', 'home')}
          {item('peserta', 'Peserta', 'peserta')}
          {item('rekap', 'Rekap', 'rekap', !user.viewAll)}
          {item('kelompok', 'Kelompok', 'kelompok', !user.viewAll)}
          {item('tc', 'TC baru', 'tc', !user.admin)}
          {item('pengguna', 'Pengguna', 'users', !user.admin)}
        </nav>
        <div className={'me' + (menu ? ' open' : '')} id="akun">
          {user.admin && <ViewAs />}
          <span className="lbl">Masuk sebagai</span>
          <span>{user.name} · {user.level}</span>
          <button className="btn" onClick={() => signOut({ callbackUrl: '/login' })}>Keluar akun</button>
        </div>
      </aside>
      <main className="main">
        {user.viewingAs && (
          <div className="banner" role="status">
            <span>Mode lihat sebagai <b>{user.name}</b>. Hanya untuk melihat: data tidak bisa diubah dari tampilan ini. Akun asli: {user.actor}.</span>
            <button className="btn" onClick={async () => { await api('/api/viewas', { method: 'DELETE' }); window.location.href = '/'; }}>Keluar dari mode lihat</button>
          </div>
        )}
        {err && <div className="err" role="alert">{err}</div>}
        {tcs && tcs.length === 0 && ['peserta', 'rekap', 'kelompok'].includes(nav) && <div className="card"><h2 style={{ margin: 0 }}>Belum ada program</h2><p className="note" style={{ margin: 0 }}>Email {user.email} belum terdaftar sebagai mentor di Airtable.</p></div>}
        {nav === 'beranda' && <Beranda user={user} openMentor={(n) => { setTc(n); go('peserta'); }} openRekap={(n) => { setTc(n); go('rekap'); }} openPeserta={(n) => { setTc(n); go('peserta'); }} openSaya={(id) => { setBel(id); go('belajar'); }} />}
        {nav === 'belajar' && bel && <Belajar key={bel} id={bel} back={() => go('beranda')} openProgres={() => { setSaya(bel); go('saya'); }} />}
        {nav === 'saya' && saya && <Saya id={saya} back={() => go('beranda')} />}
        {tc && nav === 'peserta' && <Peserta key={tc} tc={tc} canWrite={user.canWrite} />}
        {nav === 'pengguna' && user.admin && <Users me={user.email} />}
        {nav === 'tc' && user.admin && <TcAdmin onCreated={reloadTc} />}
        {tc && nav === 'kelompok' && user.viewAll && <Kelompok key={tc} tc={tc} />}
        {tc && nav === 'rekap' && user.viewAll && <Rekap tc={tc} setTc={setTc} />}
      </main>
    </div>
  );
}

/* ---------------- LIHAT SEBAGAI MENTOR ---------------- */
function ViewAs() {
  const [list, setList] = useState(null);
  const [v, setV] = useState('');
  const [qs, setQs] = useState('');
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { api('/api/viewas').then((j) => setList(j.mentors)).catch((e) => setErr(e.message)); }, []);
  async function go() { try { await post('/api/viewas', { email: v }); window.location.href = '/'; } catch (e) { setErr(e.message); } }
  const m = qs.trim().toLowerCase();
  const matches = (list || []).filter((x) => !m || (x.nama + ' ' + x.email).toLowerCase().includes(m)).slice(0, 8);
  return (
    <div className="field vafield">
      <label className="lbl" htmlFor="va">Lihat sebagai mentor</label>
      <input id="va" type="text" role="combobox" aria-expanded={open} aria-controls="va-list" autoComplete="off" placeholder={list ? 'Cari nama mentor…' : 'Memuat…'} value={qs}
        onFocus={() => setOpen(true)} onChange={(e) => { setQs(e.target.value); setV(''); setOpen(true); }} />
      {open && matches.length > 0 && (
        <ul id="va-list" role="listbox" className="cbx">
          {matches.map((x) => <li key={x.email} role="option" aria-selected={v === x.email}><button type="button" onClick={() => { setV(x.email); setQs(x.nama || x.email); setOpen(false); }}>{x.nama || x.email}<span className="note">{x.email}</span></button></li>)}
        </ul>
      )}
      <button className="btn" disabled={!v} onClick={go} style={{ marginTop: 6 }}>Lihat tampilan</button>
      {err && <span className="note">{err}</span>}
    </div>
  );
}

/* ---------------- BERANDA ---------------- */
const BarsOf = ({ x }) => {
  const t = x.total || 1;
  const txt = `Lulus ${x.Lulus}, Aktif ${x['Peserta Aktif']}, Drop Out ${x['Drop Out']}`;
  return (
    <div className="bars" role="img" aria-label={txt} title={txt}>
      <div title={'Lulus ' + x.Lulus} style={{ width: (x.Lulus / t * 100) + '%', background: '#34A853' }} />
      <div title={'Aktif ' + x['Peserta Aktif']} style={{ width: (x['Peserta Aktif'] / t * 100) + '%', background: '#0071E3' }} />
      <div title={'Drop Out ' + x['Drop Out']} style={{ width: (x['Drop Out'] / t * 100) + '%', background: '#E5484D' }} />
    </div>
  );
};
const BarLegend = () => (
  <div className="legend" aria-label="Keterangan warna">
    <span><i style={{ background: '#34A853' }} />✓ Lulus</span><span><i style={{ background: '#0071E3' }} />● Aktif</span><span><i style={{ background: '#E5484D' }} />✕ Drop Out</span>
  </div>
);

function Beranda({ user, openMentor, openRekap, openPeserta, openSaya }) {
  const [d, setD] = useState(null);
  const [ov, setOv] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { api('/api/home').then(setD).catch((e) => setErr(e.message)); }, []);
  useEffect(() => { if (user.viewAll) api('/api/rekap?overview=1').then((j) => setOv(j.tcs)).catch(() => setOv([])); }, [user.viewAll]);
  const first = (user.name || '').split(/\s+/)[0];
  const none = d && d.mentor.length === 0 && d.peserta.length === 0;
  return (
    <>
      <div className="head"><div><h1>Selamat datang{first ? ', ' + first : ''}</h1><div className="subt">Pilih program <abbr title="Training Course">TC</abbr> (Training Course) untuk melihat detailnya.</div></div></div>
      {err && <div className="err" role="alert">{err}</div>}
      {user.viewAll && (
        <>
          <h2 style={{ margin: '8px 0 0' }}>Ringkasan program</h2>
          {!ov && <Skel n={2} h={150} />}
          {ov && ov.length === 0 && <p className="note">Belum ada program.</p>}
          {ov && ov.length > 0 && <BarLegend />}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))' }}>
            {(ov || []).map((t) => (
              <div key={t.nama} className="card" style={{ gap: 14 }}>
                <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}><b style={{ fontSize: 18 }}>{t.nama}</b>{t.status && <span className="chip sx">{t.status}</span>}</span>
                <BarsOf x={t} />
                <div className="mini"><span><b>{t.total}</b> peserta</span><span className="sa"><b>{t['Peserta Aktif']}</b> aktif</span><span className="sl"><b>{t.Lulus}</b> lulus</span><span className="sd"><b>{t['Drop Out']}</b> drop out</span></div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><button className="btn primary" onClick={() => openRekap(t.nama)}>Rekap</button><button className="btn" onClick={() => openPeserta(t.nama)}>Peserta</button></div>
              </div>
            ))}
          </div>
        </>
      )}
      {!d && !err && <Skel n={2} />}
      {d && d.mentor.length > 0 && (
        <>
          <h2 style={{ margin: '8px 0' }}>Sebagai mentor</h2>
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
        </>
      )}
      {d && d.peserta.length > 0 && (
        <>
          <h2 style={{ margin: '20px 0 8px' }}>Sebagai peserta</h2>
          <p className="note" style={{ margin: 0 }}>Buka program Anda untuk mulai belajar.</p>
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
      {none && !user.viewAll && <div className="card"><p style={{ margin: 0 }}>Email {user.email} belum terdaftar sebagai mentor atau peserta di program mana pun. Jika ini keliru, hubungi superadmin Schole.</p></div>}
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
      {!d && !err && <Skel n={3} h={90} />}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><b>{babLabel(b.bab)}</b>{b.belum ? <span className="note">Belum selesai menonton</span> : <TugasTag ok={b.tugas} />}</div>
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

// Status tugas: teks + simbol, tidak hanya abu-abu kecil
const TugasTag = ({ ok }) => <span className={'tg ' + (ok ? 'ok' : 'no')}><span aria-hidden="true">{ok ? '✓' : '○'}</span> {ok ? 'Tugas terkumpul' : 'Tugas belum'}</span>;

/* ---------------- PESERTA ---------------- */
const PAGE = 50;
const SORTS = { nama: 'Nama', status: 'Status', progres: 'Progres bab' };
const stRank = { 'Peserta Aktif': 0, Lulus: 1, 'Drop Out': 2 };

function progresText(x, total) {
  if (x.historis) return 'Lulus · penilaian bab belum diisi';
  return x.dinilai + '/' + total + ' bab dinilai';
}

function Peserta({ tc, canWrite }) {
  const [list, setList] = useState(null);
  const [total, setTotal] = useState(8);
  const [sel, setSel] = useState(null);
  const [filter, setFilter] = useState('all');
  const [kuF, setKuF] = useState('');
  const [sort, setSort] = useState('nama');
  const [qs, setQs] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [err, setErr] = useState('');
  const load = useCallback(() => api('/api/peserta?tc=' + encodeURIComponent(tc)).then((j) => { setErr(''); setList(j.peserta); setTotal(j.totalBab || 8); setSel((s) => s || j.peserta[0]?.id || null); }).catch((e) => setErr(e.message)), [tc]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setLimit(PAGE); }, [filter, kuF, sort, qs]);
  const p = list?.find((x) => x.id === sel);
  const cnt = (s) => (list || []).filter((x) => x.status === s).length;
  const kus = useMemo(() => [...new Set((list || []).map((x) => x.ku).filter(Boolean))].sort(), [list]);
  const shown = useMemo(() => {
    const m = qs.toLowerCase();
    const r = (list || []).filter((x) => (filter === 'all' || x.status === filter) && (!kuF || x.ku === kuF) && (!m || (x.nama + ' ' + x.ku).toLowerCase().includes(m)));
    if (sort === 'status') r.sort((a, b) => stRank[a.status] - stRank[b.status] || (!a.nama) - (!b.nama) || a.nama.localeCompare(b.nama));
    if (sort === 'progres') r.sort((a, b) => b.dinilai - a.dinilai || (!a.nama) - (!b.nama) || a.nama.localeCompare(b.nama));
    return r;
  }, [list, filter, kuF, sort, qs]);
  const tabs = [['all', 'Semua', 'sx', (list || []).length], ...STATUS.map((s) => [s, ST[s][0], ST[s][1], cnt(s)])];

  // Di layar sempit, daftar dan detail bertumpuk: bawa pengguna ke detail setelah memilih
  const pick = (id) => {
    setSel(id);
    setTimeout(() => {
      const el = document.getElementById('pdetail'); if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.top > window.innerHeight * 0.6 || r.bottom < 0) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  return (
    <>
      <div className="head"><div><h1>Peserta</h1><div className="subt">{tc}{list ? ' · ' + list.length + ' peserta' : ''}</div></div></div>
      {err && <div className="err" role="alert">{err}</div>}
      {!list && !err && <Skel n={6} h={64} />}
      {list && list.length === 0 && <div className="card"><h2 style={{ margin: 0 }}>Belum ada peserta</h2><p className="note" style={{ margin: 0 }}>Tidak ada peserta untuk Anda di program ini.</p></div>}
      {list && list.length > 0 && (
        <>
          <div className="ftabs" role="group" aria-label="Saring menurut status">
            {tabs.map(([k, l, cls, c]) => <button key={k} className={'ftab ' + cls + (filter === k ? ' on' : '')} aria-pressed={filter === k} onClick={() => setFilter(k)}><i />{l}<b>{c}</b></button>)}
          </div>
          <div className="split">
            <section className="plist" aria-label="Daftar peserta">
              <div className="sr">
                <input type="text" aria-label="Cari peserta" placeholder="Cari nama atau keuskupan" value={qs} onChange={(e) => setQs(e.target.value)} />
                <div className="srow">
                  <label className="sl2"><span className="lbl">Keuskupan</span><select value={kuF} onChange={(e) => setKuF(e.target.value)}><option value="">Semua</option>{kus.map((k) => <option key={k}>{k}</option>)}</select></label>
                  <label className="sl2"><span className="lbl">Urutkan</span><select value={sort} onChange={(e) => setSort(e.target.value)}>{Object.entries(SORTS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
                </div>
              </div>
              <div className="list">
                {shown.slice(0, limit).map((x) => (
                  <button key={x.id} className={'prow ' + ST[x.status][1] + (x.id === sel ? ' on' : '')} aria-pressed={x.id === sel} onClick={() => pick(x.id)}>
                    <span className={'pav ' + ST[x.status][1]}>{initials(x.nama)}</span>
                    <span className="nm"><b>{x.nama ? fmtNama(x.nama) : <><span aria-hidden="true">⚠ </span>(Tanpa nama)</>}</b><span>{x.ku || 'Tanpa keuskupan'} · {progresText(x, total)}</span></span>
                    <Chip s={x.status} />
                  </button>
                ))}
                {shown.length === 0 && <p className="note" style={{ padding: 20, textAlign: 'center' }}>Tidak ada peserta yang cocok.</p>}
                {shown.length > limit && <button className="more" onClick={() => setLimit(limit + PAGE)}>Tampilkan {Math.min(PAGE, shown.length - limit)} lagi · {shown.length - limit} belum tampil</button>}
              </div>
            </section>
            {p && <Detail key={p.id} p={p} total={total} reload={load} canWrite={canWrite} />}
          </div>
        </>
      )}
    </>
  );
}

function Detail({ p, total, reload, canWrite }) {
  const [msg, setMsg] = useState({ t: '', bad: false });
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState(null);
  const [waOpen, setWaOpen] = useState(false);
  const [tpl, setTpl] = useState('hasil');
  const [text, setText] = useState(null);
  const nama = nm(p);
  const first = nama.split(/\s+/)[0];
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
    setPending(null); setSaving(true); setMsg({ t: '', bad: false });
    const prev = p.status;
    try {
      await post('/api/peserta/' + p.id, { status }, 'PATCH');
      setUndo(isUndo ? null : prev); setMsg({ t: (isUndo ? 'Perubahan dibatalkan. ' : '') + 'Tersimpan: status ' + ST[status][0], bad: false }); reload();
    } catch (e) { setMsg({ t: 'Gagal menyimpan: ' + e.message, bad: true }); }
    setSaving(false);
  }
  // Drop Out, dan mengubah status Lulus, harus dikonfirmasi lebih dulu
  const choose = (s) => { if (s === p.status) return; if (s === 'Drop Out' || p.status === 'Lulus') setPending(s); else setStatus(s); };

  return (
    <section id="pdetail" className={'pdetail ' + cls} aria-label="Detail peserta" style={{ scrollMarginTop: 72 }}>
      <div className="topbar" />
      <div className="body">
        <div className="head" style={{ alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
            <span className="pav lg">{initials(p.nama)}</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
              <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.02em', lineHeight: 1.15 }}>{nama}</div>
              <div className="note">{p.ku || 'Tanpa keuskupan'}{p.usia ? ' · ' + p.usia + ' th' : ''}</div>
            </div>
          </div>
          {p.hp && <button className="btn wa" onClick={() => setWaOpen(!waOpen)} aria-expanded={waOpen}>Kirim WhatsApp</button>}
        </div>

        {!p.nama && <div className="info warn"><b>Data belum lengkap.</b> Peserta ini belum punya nama di Airtable. Lengkapi datanya di sumber agar muncul dengan benar di semua daftar.</div>}

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
              const lock = s === 'Lulus' && locked;
              const off = !canWrite || saving;
              return (
                <button key={s} className={'sbtn ' + ST[s][1] + (p.status === s ? ' on' : '') + (lock ? ' locked' : '')} aria-pressed={p.status === s}
                  disabled={off} aria-disabled={lock || undefined} aria-describedby={lock ? 'lulus-why' : undefined} title={lock ? 'Lulus terbuka setelah minimal satu bab dinilai' : undefined}
                  onClick={() => { if (!lock) choose(s); }}>
                  {ST[s][0]}
                  {p.status === s && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>}
                  {lock && canWrite && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>}
                </button>
              );
            })}
          </div>
          {locked && <span id="lulus-why" className="note">Lulus terbuka setelah minimal satu bab dinilai.</span>}
          {!canWrite && <span className="note">Tampilan ini hanya untuk melihat; status tidak bisa diubah.</span>}
          {pending && (
            <div className="confirm" role="alertdialog" aria-label="Konfirmasi ubah status">
              <span>Ubah status <b>{nama}</b> dari <b>{ST[p.status][0]}</b> menjadi <b>{ST[pending][0]}</b>? Perubahan langsung tersimpan di Airtable dan dicatat atas nama Anda.</span>
              <span style={{ display: 'flex', gap: 8 }}><button className="btn primary" onClick={() => setStatus(pending)}>Ya, ubah</button><button className="btn" onClick={() => setPending(null)}>Batal</button></span>
            </div>
          )}
          {saving && <span className="note" role="status">Menyimpan…</span>}
          {msg.t && <span className={'note' + (msg.bad ? ' bad' : '')} role={msg.bad ? 'alert' : 'status'} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>{msg.t}{undo && !msg.bad && <button className="btn" style={{ minHeight: 36, padding: '6px 16px' }} onClick={() => setStatus(undo, true)}>Urungkan</button>}</span>}
          {p.diubahOleh && <span className="note">Status terakhir diubah oleh {p.diubahOleh}</span>}
          {p.historis && <div className="info"><b>Status Lulus dari data historis.</b> Lulus ini tercatat sebelum penilaian bab dipakai di Schole, jadi belum ada bab yang dinilai. Ini bukan kesalahan; isi penilaian di bawah bila diperlukan.</div>}
        </div>

        {(p.keterangan || p.status === 'Drop Out') && (
          <div className="ket">
            <span className="lbl">{p.status === 'Drop Out' ? 'Alasan dan keterangan' : 'Keterangan kelulusan'}</span>
            {p.keterangan ? <p>{p.keterangan}</p> : <p className="note">Belum ada keterangan alasan Drop Out. Tambahkan di kolom Keterangan Kelulusan di Airtable.</p>}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
            <span className="lbl">Penilaian bab</span>
            <span><b>{nBoleh + nDamp}</b> dari {total} dinilai</span>
          </div>
          <div className="pbar" aria-hidden="true">{p.bab.map((b) => <span key={b.bab} className={b.izin === IZIN[0] ? 'ok' : b.izin === IZIN[1] ? 'dp' : ''} />)}</div>
          <div className="legend">
            <span><i style={{ background: '#1F8A3B' }} />{IZIN_LABEL[0]} · {nBoleh}</span>
            <span><i style={{ background: '#C25E00' }} />{IZIN_LABEL[1]} · {nDamp}</span>
            <span><i style={{ background: '#D2D2D7' }} />Belum dinilai · {total - nBoleh - nDamp}</span>
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
  const [msg, setMsg] = useState({ t: '', bad: false });
  const [busy, setBusy] = useState(false);
  const dirty = izin !== b.izin || note !== b.catatan;
  const needNote = izin === IZIN[1] && !note.trim();
  async function save() {
    setMsg({ t: '', bad: false }); setBusy(true);
    try { await post('/api/detail/' + b.id, { izin, catatan: note }, 'PATCH'); setMsg({ t: 'Tersimpan', bad: false }); reload(); }
    catch (e) { setMsg({ t: 'Gagal menyimpan: ' + e.message, bad: true }); }
    setBusy(false);
  }
  if (!b.id) return <div className="btile" style={{ opacity: .7 }}><b>{babLabel(b.bab)}</b><span className="note">Belum selesai menonton</span></div>;
  return (
    <div className={'btile' + (izin === IZIN[0] ? ' ok' : izin === IZIN[1] ? ' dp' : '')}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}><b style={{ fontSize: 16 }}>{babLabel(b.bab)}</b><TugasTag ok={b.tugas} /></div>
      <div className="ibtns" role="group" aria-label={'Penilaian ' + babLabel(b.bab)}>
        <button className={'ibtn ok' + (izin === IZIN[0] ? ' on' : '')} aria-pressed={izin === IZIN[0]} disabled={!canWrite} onClick={() => setIzin(izin === IZIN[0] ? null : IZIN[0])}>{izin === IZIN[0] ? '✓ ' : ''}{IZIN_LABEL[0]}</button>
        <button className={'ibtn dp' + (izin === IZIN[1] ? ' on' : '')} aria-pressed={izin === IZIN[1]} disabled={!canWrite} onClick={() => setIzin(izin === IZIN[1] ? null : IZIN[1])}>{izin === IZIN[1] ? '✓ ' : ''}{IZIN_LABEL[1]}</button>
      </div>
      {izin && <textarea readOnly={!canWrite} aria-label={'Catatan ' + babLabel(b.bab)} placeholder={izin === IZIN[1] ? 'Catatan wajib diisi' : 'Catatan (opsional)'} value={note} onChange={(e) => setNote(e.target.value)} />}
      {dirty && <div style={{ display: 'flex', gap: 8 }}><button className="btn primary" disabled={needNote || busy} onClick={save}>{busy ? 'Menyimpan…' : 'Simpan'}</button><button className="btn" disabled={busy} onClick={() => { setIzin(b.izin); setNote(b.catatan); setMsg({ t: '', bad: false }); }}>Batal</button></div>}
      {needNote && <span className="note" style={{ color: '#A35200', fontWeight: 600 }}>Isi catatan untuk menyimpan.</span>}
      {msg.t && <span className={'note' + (msg.bad ? ' bad' : '')} role={msg.bad ? 'alert' : 'status'}>{msg.t}</span>}
    </div>
  );
}

/* ---------------- REKAP ---------------- */
function Rekap({ tc, setTc }) {
  const [tab, setTab] = useState('tc');
  const [ku, setKu] = useState('');
  const [bab, setBab] = useState('');
  const [ov, setOv] = useState(null);
  const [data, setData] = useState(null);
  const [kuList, setKuList] = useState([]);
  const [pf, setPf] = useState('Semua');
  const [qs, setQs] = useState('');
  const [err, setErr] = useState('');
  const [dl, setDl] = useState('');

  useEffect(() => { api('/api/rekap?overview=1').then((j) => setOv(j.tcs)).catch((e) => setErr(e.message)); }, []);
  useEffect(() => { setKu(''); setBab(''); setKuList([]); }, [tc]);
  useEffect(() => {
    // Permintaan lama dibatalkan agar tidak menimpa hasil yang lebih baru, dan galat lama tidak menahan tampilan
    let dead = false;
    setData(null); setErr('');
    api('/api/rekap?tc=' + encodeURIComponent(tc) + '&ku=' + encodeURIComponent(ku) + '&bab=' + encodeURIComponent(bab))
      .then((j) => { if (dead) return; setData(j); if (!ku) setKuList(j.perKu.map((k) => k.ku).filter((k) => k !== 'Tanpa keuskupan').sort()); })
      .catch((e) => { if (!dead) setErr(e.message); });
    return () => { dead = true; };
  }, [tc, ku, bab]);

  const exportUrl = '/api/export?tc=' + encodeURIComponent(tc) + '&ku=' + encodeURIComponent(ku) + '&bab=' + encodeURIComponent(bab);
  async function unduh() {
    setDl('Menyiapkan file…'); setErr('');
    try {
      const r = await fetch(exportUrl);
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Gagal mengunduh (' + r.status + ')');
      const blob = await r.blob();
      const name = (/filename="([^"]+)"/.exec(r.headers.get('Content-Disposition') || '') || [])[1] || 'rekap.xlsx';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
    } catch (e) { setErr(e.message); }
    setDl('');
  }

  const sum = data?.sum;
  const kosong = !!data && sum.total === 0;
  const rows = useMemo(() => (data?.rows || []).filter((r) => (pf === 'Semua' || r.status === pf) && (!qs || r.nama.toLowerCase().includes(qs.toLowerCase()))), [data, pf, qs]);
  // Kartu program yang sedang dibuka memakai angka dari rekap di bawah supaya kedua tampilan selalu sama
  const ovShown = ov && ov.map((t) => (t.nama === tc && data && !ku && !bab ? { ...t, ...data.sum } : t));
  const perhatian = data && !kosong && (data.risiko.length > 0 || data.lulusTanpaNilai > 0 || data.tanpaNama > 0);

  return (
    <>
      <div className="head">
        <div><h1>Rekap</h1><div className="subt">{tc}{ku ? ' · ' + ku : ''}{bab ? ' · ' + babLabel(bab) : ''}</div></div>
        <div className="seg" role="group" aria-label="Tampilan rekap">
          {[['tc', 'Per TC'], ['ku', 'Per keuskupan'], ['pes', 'Peserta']].map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} aria-pressed={tab === k} onClick={() => setTab(k)}>{l}</button>)}
        </div>
      </div>

      <div className="filters">
        <div className="fcol"><label className="lbl" htmlFor="f-ku">Keuskupan</label>
          <select id="f-ku" value={ku} onChange={(e) => setKu(e.target.value)}><option value="">Semua keuskupan</option>{kuList.map((k) => <option key={k}>{k}</option>)}</select></div>
        {(data?.babs || []).length > 0 && <div className="fcol"><label className="lbl" htmlFor="f-bab">Bab</label>
          <select id="f-bab" value={bab} onChange={(e) => setBab(e.target.value)}><option value="">Semua bab</option>{data.babs.map((b) => <option key={b} value={b}>{babLabel(b)}</option>)}</select></div>}
        <button className="btn dlbtn" onClick={unduh} disabled={!!dl || kosong}><Icon d={IC.dl} />{dl || 'Unduh Excel'}</button>
      </div>
      {err && <div className="err" role="alert">{err}</div>}

      {!data && !err && <Skel n={3} h={90} />}
      {kosong && (
        <div className="card"><h2 style={{ margin: 0 }}>{ku ? 'Tidak ada peserta dari keuskupan ini' : 'Belum ada data untuk TC ini'}</h2><p className="note" style={{ margin: 0 }}>{ku ? 'Pilih "Semua keuskupan" untuk melihat seluruh peserta.' : 'Peserta dan kelompok ditambahkan lewat pendaftaran atau Airtable. Rekap muncul setelah ada peserta.'}</p></div>
      )}

      {sum && !kosong && (
        <div className="stats">
          <div className="stat" style={{ background: '#fff' }}><b>{sum.total}</b>Peserta</div>
          <div className="stat" style={{ background: '#DDF4E4', color: '#14692C' }}><b>{sum.Lulus}</b>✓ Lulus</div>
          <div className="stat" style={{ background: '#E3EEFF', color: '#0B4FB3' }}><b>{sum['Peserta Aktif']}</b>● Aktif</div>
          <div className="stat" style={{ background: '#FFE3E0', color: '#A3180C' }}><b>{sum['Drop Out']}</b>✕ Drop Out</div>
          {data.babRow && <div className="stat wide" style={{ background: '#FFF1E0', color: '#8A4500' }}><b>{data.babRow.tugas}</b>Tugas terkumpul · {babLabel(bab)}<span style={{ fontSize: 13 }}>{data.babRow.boleh} siap mengajar · {data.babRow.damping} perlu pendampingan</span></div>}
        </div>
      )}

      {tab === 'tc' && !ov && !err && <Skel n={2} h={150} />}
      {tab === 'tc' && ovShown && (
        <>
          <BarLegend />
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))' }}>
            {ovShown.map((t) => (
              <button key={t.nama} className="pcard tccard" onClick={() => { setTc(t.nama); setTab('pes'); }} aria-label={'Lihat tabel peserta ' + t.nama}>
                <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><b style={{ fontSize: 19 }}>{t.nama}</b>{t.status && <span className="chip sx">{t.status}</span>}</span>
                <BarsOf x={t} />
                <span className="tcnums"><span className="note"><b style={{ fontSize: 22, color: 'var(--ink)' }}>{t.total}</b> peserta</span><span className="note"><b style={{ fontSize: 22, color: '#14692C' }}>{t.Lulus}</b> lulus</span><span className="go">Lihat tabel ›</span></span>
              </button>
            ))}
          </div>
        </>
      )}

      {tab === 'tc' && perhatian && (
        <div className="card">
          <h2 style={{ margin: 0 }}>Perlu perhatian · {tc}</h2>
          <ul className="attn">
            {data.risiko.map((g) => <li key={g.kelompok}><b>{kelNama(g.kelompok)}</b>: {g['Drop Out']} dari {g.total} peserta Drop Out.</li>)}
            {data.lulusTanpaNilai > 0 && <li>{data.lulusTanpaNilai} peserta berstatus Lulus belum punya penilaian bab di Schole. Statusnya berasal dari data historis, bukan kesalahan sistem.</li>}
            {data.tanpaNama > 0 && <li>{data.tanpaNama} peserta belum punya nama di data. Lengkapi di Airtable.</li>}
          </ul>
        </div>
      )}

      {tab === 'ku' && data && !kosong && (
        <div className="card" style={{ gap: 6 }}>
          <BarLegend />
          {data.perKu.map((k) => (
            <button key={k.ku} className="rowbtn" style={{ background: ku === k.ku ? '#F0F6FE' : 'transparent' }} onClick={() => { setKu(k.ku === 'Tanpa keuskupan' ? '' : k.ku); setTab('pes'); }} aria-label={'Lihat tabel peserta ' + k.ku}>
              <span style={{ fontWeight: 500 }}>{k.ku}</span><BarsOf x={k} /><b style={{ textAlign: 'right' }}>{k.total} <span className="note" style={{ fontWeight: 400 }}>peserta</span> ›</b>
            </button>
          ))}
        </div>
      )}

      {tab === 'pes' && data && !kosong && (
        <div className="card">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            <input type="text" aria-label="Cari peserta" placeholder="Cari nama" value={qs} onChange={(e) => setQs(e.target.value)} style={{ borderRadius: 999, background: 'var(--bg)', minWidth: 200 }} />
            <div className="seg" role="group" aria-label="Filter status">{['Semua', ...STATUS].map((s) => <button key={s} className={pf === s ? 'on' : ''} aria-pressed={pf === s} onClick={() => setPf(s)}>{s === 'Peserta Aktif' ? 'Aktif' : s}</button>)}</div>
          </div>
          <div className="tbl"><div className="tin rr" role="table" aria-label="Daftar peserta">
            <div className="tr rr th" role="row"><span>Nama</span><span>Keuskupan</span><span>Mentor</span><span>Status</span><span>{bab ? babLabel(bab) : 'Video selesai'}</span></div>
            {rows.map((r) => (
              <div className="tr rr" role="row" key={r.id}>
                <div className="c-n"><b>{r.nama ? fmtNama(r.nama) : <><span aria-hidden="true">⚠ </span>(Tanpa nama)</>}</b>{r.status === 'Drop Out' && <small className="note">{r.ket ? 'Alasan: ' + r.ket : 'Tanpa keterangan alasan'}</small>}</div>
                <span className="c-k">{r.ku}</span>
                <span className="c-m" style={{ color: '#424245' }}>{r.mentor || '-'}</span>
                <span className="c-s"><Chip s={r.status} /></span>
                <span className="c-p" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {bab ? <span className="chip" style={{ background: r.babSelesai ? '#DDF4E4' : 'var(--bg)', color: r.babSelesai ? '#14692C' : 'var(--sub)' }}>{r.babSelesai ? '✓ Selesai' : 'Belum'}</span>
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
const LEVEL_DESC = { Superadmin: 'Semua fitur dan kelola pengguna', Mentor: 'Hanya peserta miliknya', Pengamat: 'Lihat peserta dan rekap, unduh Excel; tidak bisa mengubah' };
const EMPTY_FL = { ku: '', usia: '', jk: '', level: '', spes: '', kategori: '', aktif: '' };

function Users({ me }) {
  const [users, setUsers] = useState(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({ email: '', nama: '', level: 'Mentor' });
  const [qs, setQs] = useState('');
  const [sel, setSel] = useState(null);
  const [fl, setFl] = useState(EMPTY_FL);
  const [limit, setLimit] = useState(PAGE);
  const [pend, setPend] = useState(null);
  const [undo, setUndo] = useState(null);
  const load = useCallback(() => api('/api/users').then((j) => setUsers(j.users)).catch((e) => setErr(e.message)), []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setLimit(PAGE); }, [qs, fl]);

  async function add(e) {
    e.preventDefault(); setErr(''); setMsg('');
    try { await post('/api/users', form); setForm({ email: '', nama: '', level: 'Mentor' }); setMsg('Pengguna ditambahkan'); load(); }
    catch (x) { setErr(x.message); }
  }
  async function patch(id, body, undoBody) {
    setErr(''); setMsg(''); setUndo(null);
    try { await post('/api/users/' + id, body, 'PATCH'); setMsg('Tersimpan'); setUndo(undoBody ? { id, body: undoBody } : null); load(); }
    catch (x) { setErr('Gagal menyimpan: ' + x.message); }
  }
  // Perubahan level atau status aktif harus dikonfirmasi lebih dulu
  const ask = (u, field, to) => setPend({ id: u.id, nama: u.profil?.nama || u.nama || u.email, field, from: field === 'level' ? u.level : u.aktif, to });
  async function confirm() {
    const p = pend; setPend(null);
    await patch(p.id, { [p.field]: p.to }, { [p.field]: p.from });
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
  const nFilter = Object.values(fl).filter(Boolean).length;
  const F = ({ k, label, all: allLabel, list }) => <label className="fl"><span className="lbl">{label}</span><select value={fl[k]} onChange={(e) => setFl({ ...fl, [k]: e.target.value })}><option value="">{allLabel}</option>{list.map((x) => <option key={x}>{x}</option>)}</select></label>;
  const GRID = 'minmax(160px,1.6fr) minmax(200px,2fr) minmax(110px,1fr) 150px 90px';
  const pendText = pend && (pend.field === 'level'
    ? (pend.to === 'Superadmin' ? `Jadikan ${pend.nama} Superadmin? Ia akan mendapat semua fitur dan bisa mengelola pengguna lain.` : `Ubah level ${pend.nama} dari ${pend.from} menjadi ${pend.to}?`)
    : (pend.to ? `Aktifkan kembali ${pend.nama}?` : `Nonaktifkan ${pend.nama}? Ia tidak akan bisa masuk ke Schole.`));

  return (
    <>
      <div className="head"><div><h1>Pengguna</h1><div className="subt">Atur siapa yang boleh masuk dan apa yang boleh dilakukan</div></div></div>
      {err && <div className="err" role="alert">{err}</div>}
      {msg && <div className="note" role="status" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>{msg}{undo && <button className="btn" style={{ minHeight: 36, padding: '6px 16px' }} onClick={() => patch(undo.id, undo.body)}>Urungkan</button>}</div>}
      <form className="card" onSubmit={add}>
        <div className="lbl">Tambah pengguna</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <input type="text" aria-label="Email Google" placeholder="Email Google" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={{ flex: '2 1 240px' }} required />
          <input type="text" aria-label="Nama" placeholder="Nama" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} style={{ flex: '1 1 180px' }} />
          <select aria-label="Level akses" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>{LEVEL.map((l) => <option key={l}>{l}</option>)}</select>
          <button className="btn primary" type="submit">Tambah</button>
        </div>
        <div className="note">{LEVEL_DESC[form.level]}. Mentor tanpa baris di sini tetap bisa masuk lewat Email Mentor di Schole, dengan level Mentor.</div>
        <details className="note"><summary>Arti tiap level</summary><dl className="roles">{LEVEL.map((l) => <div key={l}><dt>{l}</dt><dd>{LEVEL_DESC[l]}</dd></div>)}</dl></details>
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
        <input type="text" aria-label="Cari pengguna" placeholder="Cari email atau nama" value={qs} onChange={(e) => setQs(e.target.value)} style={{ borderRadius: 999, background: 'var(--bg)', maxWidth: 360 }} />
        <details className="fdet" open={nFilter > 0 || undefined}>
          <summary>Filter{nFilter ? ` (${nFilter} aktif)` : ''}</summary>
          <div className="fgrid">
            <F k="ku" label="Keuskupan" all="Semua keuskupan" list={opts.ku} /><F k="usia" label="Kelompok usia" all="Semua kelompok usia" list={opts.usia} /><F k="jk" label="Jenis kelamin" all="Semua" list={opts.jk} />
            <F k="spes" label="Spesialisasi bab" all="Semua spesialisasi" list={opts.spes} /><F k="kategori" label="Kategori (mis. Awam, Bruder)" all="Semua kategori" list={opts.kategori} /><F k="level" label="Level akses" all="Semua level" list={LEVEL} />
            <label className="fl"><span className="lbl">Status aktif</span><select value={fl.aktif} onChange={(e) => setFl({ ...fl, aktif: e.target.value })}><option value="">Aktif dan nonaktif</option><option value="ya">Aktif</option><option value="tidak">Nonaktif</option></select></label>
          </div>
          {nFilter > 0 && <button className="btn" onClick={() => setFl(EMPTY_FL)}>Hapus filter</button>}
        </details>
        <span className="note">{users ? rows.length + ' dari ' + all.length + ' pengguna' : ''} · Klik nama untuk melihat profil dari BPN.</span>
        {pend && (
          <div className="confirm" role="alertdialog" aria-label="Konfirmasi perubahan">
            <span>{pendText}</span>
            <span style={{ display: 'flex', gap: 8 }}><button className="btn primary" onClick={confirm}>Ya, ubah</button><button className="btn" onClick={() => setPend(null)}>Batal</button></span>
          </div>
        )}
        {!users && !err && <Skel n={8} h={52} />}
        {users && (
          <div className="tbl"><div className="tin" role="table" aria-label="Daftar pengguna" style={{ minWidth: 760 }}>
            <div className="tr th" role="row" style={{ gridTemplateColumns: GRID }}><span>Nama</span><span>Email</span><span>Keuskupan</span><span>Level</span><span>Aktif</span></div>
            {rows.slice(0, limit).map((u) => (
              <div className="tr" role="row" key={u.id} style={{ gridTemplateColumns: GRID, opacity: u.aktif ? 1 : .55 }}>
                <button className="lnk" onClick={() => { setSel(u.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>{u.profil?.nama || u.nama || u.email}</button>
                <span style={{ wordBreak: 'break-all' }}>{u.email}{u.email === me ? ' (Anda)' : ''}</span>
                <span>{u.profil?.ku || <span className="note">-</span>}</span>
                <select aria-label={'Level ' + u.email} title={LEVEL_DESC[u.level]} value={u.level} onChange={(e) => ask(u, 'level', e.target.value)}>{LEVEL.map((l) => <option key={l}>{l}</option>)}</select>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 44 }}><input type="checkbox" checked={u.aktif} onChange={(e) => ask(u, 'aktif', e.target.checked)} style={{ width: 24, height: 24 }} aria-label={'Aktif ' + u.email} /></label>
              </div>
            ))}
          </div></div>
        )}
        {users && rows.length > limit && <button className="more" onClick={() => setLimit(limit + PAGE)}>Tampilkan {Math.min(PAGE, rows.length - limit)} lagi · {rows.length - limit} belum tampil</button>}
        {users && rows.length === 0 && <p className="note">Tidak ada pengguna yang cocok.</p>}
      </div>
    </>
  );
}

/* ---------------- TIM / KELOMPOK ---------------- */
const waLink = (hp, text) => 'https://wa.me/' + hp + (text ? '?text=' + encodeURIComponent(text) : '');
const PERAN_CLS = { Mentor: 'sa', 'Co-Mentor': 'sl', 'Pendamping Teknis': 'sx', 'Pengolah Data': 'sx' };
// Di layar sempit tombol WhatsApp menjadi ikon kecil di sisi kanan baris
const WaBtn = ({ hp, nama }) => hp
  ? <a className="btn wa sm waico" href={waLink(hp)} target="_blank" rel="noreferrer" aria-label={'WhatsApp ' + nama}><Icon d={IC.wa} /><span className="t">WhatsApp</span></a>
  : <span className="note">Tanpa nomor</span>;

function TimPanel({ tim, kelompok, judul }) {
  if (!tim || tim.length === 0) return null;
  return (
    <div className="timp">
      <span className="lbl">{judul || 'Tim pendamping'}{kelompok ? ' · ' + kelNama(kelompok) : ''}</span>
      <div className="timl">
        {tim.map((o, i) => (
          <div key={i} className="timr">
            <span className={'chip ' + (PERAN_CLS[o.peran] || 'sx')}>{o.peran}</span>
            <span className="tn"><b>{o.nama}</b>{o.kota ? <span className="note"> · {o.kota}</span> : null}</span>
            <WaBtn hp={o.hp} nama={o.nama} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Kelompok({ tc }) {
  const [d, setD] = useState(null);
  const [bersama, setBersama] = useState([]);
  const [err, setErr] = useState('');
  const [qs, setQs] = useState('');
  const [sf, setSf] = useState('');
  const [kuF, setKuF] = useState('');
  useEffect(() => { setD(null); api('/api/kelompok?tc=' + encodeURIComponent(tc)).then((j) => { setD(j.kelompok); setBersama(j.timBersama || []); }).catch((e) => setErr(e.message)); }, [tc]);
  const m = qs.toLowerCase();
  const kus = useMemo(() => [...new Set((d || []).flatMap((g) => g.peserta.map((x) => x.ku)).filter(Boolean))].sort(), [d]);
  const shown = (d || []).map((g) => {
    const text = (g.kelompok + ' ' + g.tim.map((o) => o.nama).join(' ')).toLowerCase();
    const peserta = g.peserta.filter((x) => (!sf || x.status === sf) && (!kuF || x.ku === kuF) && (!m || text.includes(m) || (x.nama + ' ' + x.ku).toLowerCase().includes(m)));
    return { ...g, peserta, semua: g.peserta.length };
  }).filter((g) => g.peserta.length > 0);
  const filtering = !!(m || sf || kuF);
  return (
    <>
      <div className="head"><div><h1>Kelompok</h1><div className="subt">{tc}{d ? ' · ' + d.length + ' kelompok · ' + d.reduce((a, g) => a + g.peserta.length, 0) + ' peserta' : ''}</div></div></div>
      {err && <div className="err" role="alert">{err}</div>}
      {!d && !err && <Skel n={6} h={64} />}
      {d && (
        <div className="filters">
          <div className="fcol grow"><label className="lbl" htmlFor="k-q">Cari</label><input id="k-q" type="text" placeholder="Kelompok, mentor, atau peserta" value={qs} onChange={(e) => setQs(e.target.value)} style={{ borderRadius: 999 }} /></div>
          <div className="fcol"><label className="lbl" htmlFor="k-s">Status</label><select id="k-s" value={sf} onChange={(e) => setSf(e.target.value)}><option value="">Semua status</option>{STATUS.map((s) => <option key={s} value={s}>{ST[s][0]}</option>)}</select></div>
          <div className="fcol"><label className="lbl" htmlFor="k-k">Keuskupan</label><select id="k-k" value={kuF} onChange={(e) => setKuF(e.target.value)}><option value="">Semua keuskupan</option>{kus.map((k) => <option key={k}>{k}</option>)}</select></div>
        </div>
      )}
      {d && bersama.length > 0 && <div className="card"><TimPanel tim={bersama} judul="Tim pendukung untuk semua kelompok" /></div>}
      {d && shown.length === 0 && <p className="note">Tidak ada yang cocok.</p>}
      {shown.map((g) => {
        const risiko = g.dropout >= 2 && g.dropout / g.semua >= 0.5;
        return (
          <details key={g.kelompok} className="card kgrp" open={filtering || undefined}>
            <summary>
              <span className="kt"><b>{g.nama || g.kelompok}</b>{g.kode ? <span className="note"> · Kode {g.kode}</span> : null}</span>
              <span className="kmeta"><span className="note">{g.semua} peserta</span>{g.dropout > 0 && <span className={'chip sd' + (risiko ? ' risk' : '')}>{risiko ? '⚠ ' : ''}{g.dropout} Drop Out</span>}</span>
            </summary>
            {g.tim.length ? <TimPanel tim={g.tim} /> : <span className="note">Belum ada mentor di kelompok ini.</span>}
            <div className="kpes">
              <span className="lbl">Peserta</span>
              {g.peserta.map((x) => (
                <div key={x.id} className="timr">
                  <Chip s={x.status} />
                  <span className="tn"><b>{x.nama ? fmtNama(x.nama) : <><span aria-hidden="true">⚠ </span>(Tanpa nama)</>}</b><span className="note"> · {x.ku || 'Tanpa keuskupan'}</span></span>
                  <WaBtn hp={x.hp} nama={nm(x)} />
                </div>
              ))}
            </div>
          </details>
        );
      })}
    </>
  );
}

/* ---------------- TC BARU & PENGAJAR ---------------- */
// Tanggal diketik dd/mm/yyyy (format Indonesia) dan diubah ke yyyy-mm-dd untuk Airtable
const maskTgl = (v) => { const d = v.replace(/\D/g, '').slice(0, 8); return d.length > 4 ? d.slice(0, 2) + '/' + d.slice(2, 4) + '/' + d.slice(4) : d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d; };
function toIso(s) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s); if (!m) return '';
  const [, dd, mm, yy] = m; const dt = new Date(Date.UTC(+yy, +mm - 1, +dd));
  return dt.getUTCFullYear() === +yy && dt.getUTCMonth() === +mm - 1 && dt.getUTCDate() === +dd ? `${yy}-${mm}-${dd}` : '';
}

function TcAdmin({ onCreated }) {
  const [modul, setModul] = useState(null);
  const [events, setEvents] = useState([]);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [mid, setMid] = useState('');
  const [peng, setPeng] = useState(null);
  const [fku, setFku] = useState('');
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
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
  const iso = { mulai: toIso(form.mulai), selesai: toIso(form.selesai) };
  const eMulai = form.mulai && !iso.mulai ? 'Tanggal tidak valid. Gunakan format hh/bb/tttt, mis. 31/12/2026.' : '';
  const eSelesai = form.selesai && !iso.selesai ? 'Tanggal tidak valid. Gunakan format hh/bb/tttt.' : iso.mulai && iso.selesai && iso.selesai < iso.mulai ? 'Tanggal selesai harus sama dengan atau setelah tanggal mulai.' : '';
  const valid = form.nama.trim() && iso.mulai && iso.selesai && !eMulai && !eSelesai;
  const ref = events.find((e) => e.id === form.salinDari);
  const dup = events.some((e) => e.nama.trim().toLowerCase() === form.nama.trim().toLowerCase());

  function tinjau(e) { e.preventDefault(); setErr(''); setMsg(''); if (valid && !dup) setReview(true); }
  async function create() {
    setErr(''); setMsg(''); setBusy(true);
    try {
      const r = await post('/api/tcadmin', { ...form, mulai: iso.mulai, selesai: iso.selesai });
      setMsg('TC "' + form.nama.trim() + '" berhasil dibuat' + (r.materi ? ' dengan materi dari TC acuan.' : ' tanpa materi (belum ada TC acuan).'));
      setForm({ nama: '', mulai: '', selesai: '', salinDari: form.salinDari }); setReview(false);
      api('/api/tcadmin').then((j) => setEvents(j.events)).catch(() => {});
      onCreated && onCreated();
    } catch (x) { setErr('Gagal membuat TC: ' + x.message); setReview(false); }
    setBusy(false);
  }
  const kus = [...new Set((peng?.pengajar || []).map((x) => x.ku).filter(Boolean))].sort();
  const pl = (peng?.pengajar || []).filter((x) => !fku || x.ku === fku);
  const grouped = {};
  (peng?.pengajar || []).forEach((x) => (x.spes || []).forEach((s) => { grouped[s] = (grouped[s] || 0) + 1; }));
  return (
    <>
      <div className="head"><div><h1>TC baru</h1><div className="subt">Buat program <abbr title="Training Course">TC</abbr> (Training Course) dan lihat pengajar yang terdata di BPN</div></div></div>
      {err && <div className="err" role="alert">{err}</div>}
      {msg && <div className="info ok" role="status">{msg}</div>}
      <form className="card" onSubmit={tinjau}>
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
        <div className="frow">
          <label className="dl wide2">Nama TC<input type="text" placeholder="Nama TC" value={form.nama} onChange={(e) => { setReview(false); setForm({ ...form, nama: e.target.value }); }} required /></label>
          <label className="dl">Mulai<input type="text" inputMode="numeric" placeholder="hh/bb/tttt" value={form.mulai} onChange={(e) => { setReview(false); setForm({ ...form, mulai: maskTgl(e.target.value) }); }} aria-invalid={!!eMulai} aria-describedby="e-mulai" required />{eMulai && <span id="e-mulai" className="ferr" role="alert">{eMulai}</span>}</label>
          <label className="dl">Selesai<input type="text" inputMode="numeric" placeholder="hh/bb/tttt" value={form.selesai} onChange={(e) => { setReview(false); setForm({ ...form, selesai: maskTgl(e.target.value) }); }} aria-invalid={!!eSelesai} aria-describedby="e-selesai" required />{eSelesai && <span id="e-selesai" className="ferr" role="alert">{eSelesai}</span>}</label>
        </div>
        {dup && form.nama.trim() && <span className="ferr" role="alert">Sudah ada program dengan nama ini. Gunakan nama lain.</span>}
        <div className="lbl" style={{ marginTop: 8 }}>3. Salin materi dari TC</div>
        <select aria-label="Salin materi dari TC" value={form.salinDari} onChange={(e) => { setReview(false); setForm({ ...form, salinDari: e.target.value }); }}>
          <option value="">Tanpa materi</option>
          {events.map((e) => <option key={e.id} value={e.id}>{e.nama}{e.materi ? '' : ' (tanpa materi)'}</option>)}
        </select>

        {!review && <button className="btn primary" type="submit" disabled={!valid || dup} style={{ alignSelf: 'flex-start' }}>Tinjau sebelum membuat</button>}
        {review && (
          <div className="confirm" role="alertdialog" aria-label="Konfirmasi pembuatan TC">
            <span>Buat program baru di data sungguhan?<br /><b>{form.nama.trim()}</b><br />Periode {form.mulai} sampai {form.selesai}<br />Materi: {ref ? 'disalin dari ' + ref.nama : 'tanpa materi'}</span>
            <span style={{ display: 'flex', gap: 8 }}><button type="button" className="btn primary" disabled={busy} onClick={create}>{busy ? 'Membuat…' : 'Ya, buat TC'}</button><button type="button" className="btn" disabled={busy} onClick={() => setReview(false)}>Ubah</button></span>
          </div>
        )}
        <span className="note">Peserta dan kelompok ditambahkan terpisah, lewat pendaftaran atau data BPN. TC baru langsung muncul di daftar program.</span>
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
