import { NextResponse } from 'next/server';
import { akunByEmail, updateAkun, AK } from '@/lib/akun';
import { hashPassword, passwordValid, sha256, safeEqual } from '@/lib/password';
import { tooMany, hit, clientIp } from '@/lib/throttle';

export const dynamic = 'force-dynamic';
const BAD = { error: 'Tautan tidak valid atau sudah kedaluwarsa. Minta tautan baru lewat Lupa password.' };

export async function POST(req) {
  let b = {};
  try { b = await req.json(); } catch (e) { /* kosong */ }
  const email = String(b.email || '').trim().toLowerCase();
  const token = String(b.token || '');
  const password = String(b.password || '');
  if (!passwordValid(password)) return NextResponse.json({ error: 'Password minimal 8 karakter.' }, { status: 400 });
  const k = 'reset-ip:' + clientIp(req);
  if (tooMany(k, 10, 15 * 60 * 1000)) return NextResponse.json({ error: 'Terlalu banyak percobaan. Coba lagi nanti.' }, { status: 429 });
  hit(k, 15 * 60 * 1000);
  try {
    const row = email && token ? await akunByEmail(email) : null;
    const hashed = row?.fields[AK.resetHash];
    const exp = Number(row?.fields[AK.resetExp] || 0);
    if (!row || !hashed || exp < Date.now() || !safeEqual(hashed, sha256(token))) return NextResponse.json(BAD, { status: 400 });
    await updateAkun(row.id, { [AK.pw]: await hashPassword(password), [AK.resetHash]: '', [AK.resetExp]: null });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('reset', e.message);
    return NextResponse.json({ error: 'Belum bisa memproses saat ini. Hubungi sekretariat.' }, { status: 500 });
  }
}
