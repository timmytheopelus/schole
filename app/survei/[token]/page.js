'use client';
import { useEffect, useMemo, useState } from 'react';
import '../survei.css';

const IZIN = ['Boleh mengajar', 'Boleh mengajar, didampingi'];
const LABEL = { lulus: 'Lulus', tidak: 'Tidak lulus', mundur: 'Mundur' };
const babLabel = (b) => String(b || '').replace(/^[A-Z]{2,6}-/, '');
const wib = (d) => new Date(d).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Jakarta' }) + ' WIB';

export default function Survei({ params }) {
  const token = params.token;
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [st, setSt] = useState({});     // id -> { keputusan, bab: { babId: {izin, catatan} } }
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const [done, setDone] = useState(false);

  const load = async () => {
    try {
      const r = await fetch('/api/survei/' + token, { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Gagal memuat');
      setData(j);
      const s = {};
      j.peserta.forEach((p) => { s[p.id] = { keputusan: p.keputusan, bab: Object.fromEntries(p.bab.map((b) => [b.id, { izin: b.izin, catatan: b.catatan }])) }; });
      setSt(s);
    } catch (e) { setErr(e.message); }
  };
  useEffect(() => { load(); }, []);

  const locked = (p) => data?.lock && !!p.terkirim;
  const dirty = (p) => {
    const s = st[p.id]; if (!s || locked(p)) return false;
    if (s.keputusan !== p.keputusan) return true;
    return s.keputusan === 'lulus' && p.bab.some((b) => { const x = s.bab[b.id]; return x && ((x.izin || null) !== (b.izin || null) || (x.catatan || '').trim() !== (b.catatan || '').trim()); });
  };
  const items = () => data.peserta.filter((p) => !locked(p)).map((p) => ({ id: p.id, keputusan: st[p.id].keputusan, bab: p.bab.map((b) => ({ id: b.id, izin: st[p.id].bab[b.id].izin, catatan: st[p.id].bab[b.id].catatan })) }));
  const nDirty = data ? data.peserta.filter(dirty).length : 0;
  const nBelum = data ? data.peserta.filter((p) => !locked(p) && !st[p.id]?.keputusan).length : 0;

  const check = (kirim) => {
    for (const p of data.peserta) {
      if (locked(p)) continue;
      const s = st[p.id];
      if (s.keputusan === 'lulus') {
        for (const b of p.bab) { const x = s.bab[b.id]; if (x.izin === IZIN[1] && !(x.catatan || '').trim()) return 'Memo wajib diisi untuk ' + babLabel(b.bab) + ' (' + p.nama + ') karena perlu didampingi.'; }
        if (kirim && !p.bab.some((b) => s.bab[b.id].izin)) return 'Centang minimal 1 bab yang lulus untuk ' + p.nama + '.';
      }
      if (kirim && !s.keputusan) return 'Tentukan keputusan untuk ' + p.nama + '.';
    }
    return '';
  };
  const submit = async (aksi) => {
    const v = check(aksi === 'kirim'); setConfirm(false);
    if (v) { setMsg({ bad: true, t: v }); return; }
    setBusy(aksi); setMsg(null);
    try {
      const r = await fetch('/api/survei/' + token, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ aksi, items: items() }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Gagal menyimpan');
      await load();
      if (aksi === 'kirim') { setDone(true); window.scrollTo(0, 0); } else setMsg({ bad: false, t: 'Tersimpan. Anda boleh menutup halaman dan melanjutkan nanti.' });
    } catch (e) { setMsg({ bad: true, t: e.message + ' Muat ulang halaman untuk melihat kondisi terbaru.' }); }
    setBusy('');
  };

  if (err) return <main className="sv"><div className="sv-card"><h1>Link tidak bisa dibuka</h1><p className="sv-sub">{err}. Minta link baru ke sekretariat.</p></div></main>;
  if (!data) return <main className="sv"><p className="sv-sub">Memuat peserta…</p></main>;
  if (done) return (
    <main className="sv">
      <div className="sv-card"><h1>Terima kasih, {data.mentor}</h1><p className="sv-sub">Isian Anda sudah dikirim ke sistem. {data.lock ? 'Isian terkunci dan tidak bisa diubah lagi.' : 'Mode uji coba: Anda masih bisa membuka link ini untuk mengubah.'}</p>
        <button className="sv-btn" onClick={() => setDone(false)}>Lihat daftar peserta</button></div>
    </main>
  );

  const late = Date.now() > new Date(data.deadline).getTime();
  const group = (peran, judul, sub) => {
    const list = data.peserta.filter((p) => p.peran === peran);
    if (!list.length) return null;
    return (
      <section className="sv-group" key={peran}>
        <div><h2>{judul} <span>({list.length})</span></h2><p className="sv-sub">{sub}</p></div>
        {list.map((p) => <Kartu key={p.id} p={p} s={st[p.id]} lock={locked(p)} set={(x) => { setMsg(null); setSt((o) => ({ ...o, [p.id]: x })); }} />)}
      </section>
    );
  };

  return (
    <main className="sv">
      <header>
        <h1>Survei Kelulusan Peserta</h1>
        <p className="sv-sub">Shalom, {data.mentor}. Untuk tiap peserta pilih Lulus, Tidak lulus, atau Mundur. Boleh disimpan dulu dan dilanjutkan nanti; bila semua sudah terisi tekan Kirim.</p>
        <div className={'sv-dead' + (late ? ' late' : '')}>{late ? 'Batas waktu sudah lewat. Mohon segera isi dan kirim.' : 'Survei ditunggu paling lambat ' + wib(data.deadline) + '.'}</div>
      </header>
      {group('mentor', 'Peserta sebagai Mentor', 'Anda mentor utama untuk peserta berikut.')}
      {group('co', 'Peserta sebagai Co-Mentor', 'Anda co-mentor untuk peserta berikut.')}
      {confirm && <div className="sv-card sv-confirm"><b>Kirim sekarang?</b><p>Sistem akan menerima pemberitahuan bahwa Anda sudah selesai.{data.lock ? ' Setelah dikirim, isian tidak bisa diubah lagi.' : ''}</p>
        <div className="sv-row"><button className="sv-btn primary" onClick={() => submit('kirim')}>Ya, kirim</button><button className="sv-btn" onClick={() => setConfirm(false)}>Batal</button></div></div>}
      <div className="sv-bar">
        <div className="sv-bt">
          <b className={msg?.bad ? 'bad' : nDirty ? 'warn' : ''}>{msg ? msg.t : nDirty ? nDirty + ' peserta belum disimpan. Tekan Simpan.' : 'Tidak ada perubahan.'}</b>
          {nBelum > 0 && <span>Kirim aktif setelah semua peserta ditentukan (masih {nBelum}).</span>}
        </div>
        <div className="sv-row">
          <button className="sv-btn" disabled={!nDirty || !!busy} onClick={() => submit('simpan')}>{busy === 'simpan' ? 'Menyimpan…' : 'Simpan'}</button>
          <button className="sv-btn primary" disabled={nBelum > 0 || !!busy} onClick={() => { const v = check(true); if (v) setMsg({ bad: true, t: v }); else setConfirm(true); }}>{busy === 'kirim' ? 'Mengirim…' : 'Kirim'}</button>
        </div>
      </div>
    </main>
  );
}

function Kartu({ p, s, lock, set }) {
  const nLulus = Object.values(s.bab).filter((b) => b.izin).length;
  const upd = (id, patch) => set({ ...s, bab: { ...s.bab, [id]: { ...s.bab[id], ...patch } } });
  return (
    <article className={'sv-card' + (lock ? ' lock' : '')}>
      <div><h3>{p.nama}</h3><p className="sv-sub">{[p.usia ? 'Usia ' + p.usia + ' th' : '', p.ku ? 'Keuskupan ' + p.ku : ''].filter(Boolean).join(' · ') || 'Usia dan keuskupan belum tercatat'}</p></div>
      {p.terkirim && <span className="sv-chip">{lock ? 'Terkirim' : 'Sudah terkirim (uji coba: masih bisa diedit)'}</span>}
      <p className="sv-saved">Tersimpan: <b>{p.status}</b> · {p.dinilai} bab lulus · {p.nonton}/9 video</p>
      <div className="sv-prog" role="progressbar" aria-label="Progress menonton" aria-valuenow={Math.min(9, p.nonton)} aria-valuemax="9"><i style={{ width: Math.min(100, (p.nonton / 9) * 100) + '%' }} /></div>
      <div className="sv-seg" role="group" aria-label={'Keputusan ' + p.nama}>
        {['lulus', 'tidak', 'mundur'].map((k) => (
          <button key={k} className={k} disabled={lock} aria-pressed={s.keputusan === k} onClick={() => set({ ...s, keputusan: s.keputusan === k ? null : k })}>{LABEL[k]}</button>
        ))}
      </div>
      {s.keputusan === 'lulus' && (
        <div className="sv-bab">
          <p className="sv-sub">Centang bab yang lulus ({nLulus} dari {p.bab.length}), lalu tulis memo.</p>
          {p.bab.length === 0 && <p className="sv-sub">Peserta ini belum punya baris bab di sistem.</p>}
          {p.bab.map((b) => { const x = s.bab[b.id]; const on = !!x.izin; const damp = x.izin === IZIN[1]; return (
            <div className="sv-b" key={b.id}>
              <label className="sv-chk"><input type="checkbox" disabled={lock} checked={on} onChange={(e) => upd(b.id, { izin: e.target.checked ? IZIN[0] : null })} /><span>{babLabel(b.bab)}</span></label>
              {on && <label className="sv-chk small"><input type="checkbox" disabled={lock} checked={damp} onChange={(e) => upd(b.id, { izin: e.target.checked ? IZIN[1] : IZIN[0] })} /><span>Perlu didampingi<small>Centang ini jika peserta dirasa masih perlu didampingi dahulu 1-2x oleh pengajar senior sebelum turun ke seminar.</small></span></label>}
              {on && <textarea disabled={lock} rows={2} value={x.catatan} placeholder={damp ? 'Memo wajib diisi' : 'Memo (boleh dikosongkan)'} aria-label={'Memo ' + babLabel(b.bab)} onChange={(e) => upd(b.id, { catatan: e.target.value })} />}
            </div>); })}
        </div>
      )}
    </article>
  );
}
