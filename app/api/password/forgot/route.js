import { NextResponse } from 'next/server';
import { akunByEmail, updateAkun, AK } from '@/lib/akun';
import { newToken, sha256 } from '@/lib/password';
import { sendMail } from '@/lib/mail';
import { tooMany, hit, clientIp } from '@/lib/throttle';

export const dynamic = 'force-dynamic';
const HOUR = 60 * 60 * 1000;
const OK = { ok: true, pesan: 'Jika email terdaftar, tautan untuk mengatur ulang password sudah dikirim. Periksa kotak masuk dan folder spam.' };

// Selalu menjawab sama agar tidak membocorkan email mana yang terdaftar.
export async function POST(req) {
  let body = {};
  try { body = await req.json(); } catch (e) { /* kosong */ }
  const email = String(body.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'Isi email dengan benar.' }, { status: 400 });
  const kIp = 'forgot-ip:' + clientIp(req); const kMail = 'forgot:' + email;
  if (tooMany(kIp, 10, HOUR) || tooMany(kMail, 3, HOUR)) return NextResponse.json(OK);
  hit(kIp, HOUR); hit(kMail, HOUR);
  try {
    const row = await akunByEmail(email);
    if (row) {
      const token = newToken();
      await updateAkun(row.id, { [AK.resetHash]: sha256(token), [AK.resetExp]: Date.now() + HOUR });
      const base = (process.env.NEXTAUTH_URL || '').replace(/\/$/, '');
      const link = `${base}/reset-password?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
      await sendMail({
        to: email,
        subject: 'Atur ulang password Schole',
        text: `Kami menerima permintaan untuk mengatur ulang password akun Schole Anda.\n\nBuka tautan ini (berlaku 1 jam):\n${link}\n\nJika bukan Anda yang meminta, abaikan email ini.`,
        html: `<p>Kami menerima permintaan untuk mengatur ulang password akun Schole Anda.</p><p><a href="${link}">Atur ulang password</a> (berlaku 1 jam).</p><p>Jika bukan Anda yang meminta, abaikan email ini.</p>`
      });
    }
  } catch (e) { console.error('forgot', e.message); }
  return NextResponse.json(OK);
}
