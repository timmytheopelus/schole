import { NextResponse } from 'next/server';
import { listAll, createOne, q } from '@/lib/airtable';
import { SIGNUP as S, JENIS_PD } from '@/lib/config';
import { akunByEmail, createAkun, AK } from '@/lib/akun';
import { hashPassword, passwordValid } from '@/lib/password';
import { tooMany, hit, clientIp } from '@/lib/throttle';

export const dynamic = 'force-dynamic';
const HOUR = 60 * 60 * 1000;
const REC = /^rec[A-Za-z0-9]{14}$/;
const bad = (error, status = 400) => NextResponse.json({ error }, { status });
const clean = (v, max = 200) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

function normWa(v) {
  let d = String(v || '').replace(/\D/g, '');
  if (d.startsWith('0')) d = '62' + d.slice(1);
  else if (d.startsWith('8')) d = '62' + d;
  return d.length >= 10 && d.length <= 15 ? '+' + d : '';
}

// Cari atau buat satu record master (komunitas / paroki) milik satu keuskupan.
async function resolveLink(pick, { table, nameField, kuField, ku, extra }) {
  if (!pick) return null;
  if (pick.id) { if (!REC.test(pick.id)) throw new Error('Pilihan tidak valid'); return pick.id; }
  const nama = clean(pick.nama, 120);
  if (nama.length < 3) throw new Error('Nama baru minimal 3 huruf');
  const found = await listAll(table, { base: S.base, filter: `LOWER({${nameField.label}})=${q(nama.toLowerCase())}`, fields: [nameField.id, kuField] });
  const same = found.find((r) => (r.fields[kuField] || [])[0] === ku);
  if (same) return same.id;
  const created = await createOne(table, { [nameField.id]: nama, [kuField]: [ku], ...(extra || {}) }, S.base);
  return created.id;
}

export async function POST(req) {
  let b = {};
  try { b = await req.json(); } catch (e) { return bad('Data tidak terbaca.'); }
  if (clean(b.website)) return NextResponse.json({ ok: true }); // jebakan bot: diam-diam diterima
  const ip = 'signup:' + clientIp(req);
  if (tooMany(ip, 5, HOUR)) return bad('Terlalu banyak pendaftaran dari jaringan ini. Coba lagi nanti.', 429);

  const email = clean(b.email, 120).toLowerCase();
  const nama = clean(b.nama, 120);
  const panggilan = clean(b.panggilan, 60);
  const wa = normWa(b.wa);
  const alamat = clean(b.alamat, 300);
  const tgl = parseInt(b.tgl, 10), bln = parseInt(b.bln, 10), thn = parseInt(b.thn, 10);
  const d = new Date(thn, (bln || 0) - 1, tgl || 0);
  const errs = [];
  if (nama.length < 3) errs.push('Nama lengkap');
  if (!['Pria', 'Wanita'].includes(b.jk)) errs.push('Jenis kelamin');
  if (!(thn >= 1900 && thn <= new Date().getFullYear() - 3) || d.getDate() !== tgl || d.getMonth() !== bln - 1) errs.push('Tanggal lahir');
  if (!wa) errs.push('Nomor WhatsApp');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.push('Email');
  if (alamat.length < 5) errs.push('Alamat surat');
  if (!REC.test(b.keuskupanId || '')) errs.push('Keuskupan');
  if (!REC.test(b.kotaId || '')) errs.push('Kota / kabupaten');
  if (!['Sudah', 'Belum'].includes(b.baptis)) errs.push('Sakramen Baptis');
  if (!['Sudah', 'Belum'].includes(b.krisma)) errs.push('Sakramen Krisma');
  const pd = b.komunitas || {}; const par = b.paroki || {};
  if (!pd.id && !(pd.baru && clean(pd.nama).length >= 3)) errs.push('Komunitas');
  if (pd.baru && !JENIS_PD.includes(pd.jenis)) errs.push('Jenis komunitas');
  if (!par.id && !(par.baru && clean(par.nama).length >= 3)) errs.push('Paroki');
  if (errs.length) return bad('Lengkapi dulu: ' + errs.join(', ') + '.');
  if (!passwordValid(b.password)) return bad('Password minimal 8 karakter.');

  hit(ip, HOUR);
  try {
    if (await akunByEmail(email)) return bad('Email ini sudah punya akun. Silakan masuk, atau pakai Lupa password.', 409);
  } catch (e) {
    if (e.setup) return bad('Pendaftaran belum bisa diproses karena penyiapan data belum selesai. Hubungi sekretariat.', 503);
    console.error('signup cek akun', e.message);
    return bad('Pendaftaran belum bisa diproses. Coba lagi nanti.', 502);
  }

  try {
    const komunitasId = await resolveLink(pd.baru ? { baru: true, nama: pd.nama } : pd, { table: S.pdpkk, nameField: { id: S.pd.nama, label: 'Nama PD' }, kuField: S.pd.ku, ku: b.keuskupanId, extra: { [S.pd.jenis]: pd.jenis } });
    const parokiId = await resolveLink(par.baru ? { baru: true, nama: par.nama } : par, { table: S.paroki, nameField: { id: S.par.nama, label: 'Name' }, kuField: S.par.ku, ku: b.keuskupanId });

    // Master data umat: pakai record yang sudah ada bila email sama (tidak ditimpa), kalau belum buat baru.
    const P = S.person;
    const existing = await listAll('tbl21zOSogH7Anlu2', { base: S.base, filter: `LOWER({Email})=${q(email)}`, fields: [P.email] });
    let personId = existing[0]?.id;
    if (!personId) {
      const rec = await createOne('tbl21zOSogH7Anlu2', {
        [P.nama]: nama, ...(panggilan ? { [P.panggilan]: panggilan } : {}), [P.jk]: b.jk, [P.tgl]: tgl, [P.bln]: bln, [P.thn]: thn,
        [P.wa]: wa, [P.email]: email, [P.alamat]: alamat, [P.kota]: [b.kotaId], [P.ku]: [b.keuskupanId], [P.paroki]: [parokiId],
        [P.pd]: [komunitasId], [P.baptis]: b.baptis, [P.krisma]: b.krisma
      }, S.base);
      personId = rec.id;
    }

    await createAkun({
      [AK.email]: email, [AK.nama]: nama, [AK.level]: 'Mentor', [AK.pw]: await hashPassword(b.password), [AK.person]: personId,
      [AK.catatan]: 'Mendaftar lewat portal Schole pada ' + new Date().toISOString().slice(0, 10) + '. Menunggu verifikasi admin (centang Aktif untuk menyetujui).'
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('signup', e.message);
    return bad('Pendaftaran belum berhasil disimpan. Periksa isian, lalu coba lagi. Jika berulang, hubungi sekretariat.', 502);
  }
}
