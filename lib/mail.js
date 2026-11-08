// Kirim email lewat Resend (REST). Isi RESEND_API_KEY dan MAIL_FROM (domain terverifikasi) di Vercel.
export async function sendMail({ to, subject, html, text }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) { console.warn('RESEND_API_KEY belum diisi: email tidak dikirim ke', to); return false; }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.MAIL_FROM || 'Schole <onboarding@resend.dev>', to: [to], subject, html, text })
  });
  if (!res.ok) { console.error('Gagal kirim email', res.status, (await res.text()).slice(0, 200)); return false; }
  return true;
}
