// Membuat link survei pribadi. Pakai: SURVEY_SECRET=... node scripts/survei-link.mjs "email@mentor.com" "Nama Mentor" https://domain-anda.vercel.app
import crypto from 'crypto';
const [email, nama, host = 'https://DOMAIN-ANDA.vercel.app'] = process.argv.slice(2);
const secret = process.env.SURVEY_SECRET || process.env.NEXTAUTH_SECRET;
if (!email || !nama || !secret) { console.error('Isi email, nama mentor, dan SURVEY_SECRET'); process.exit(1); }
const body = Buffer.from(JSON.stringify({ e: email.toLowerCase(), n: nama })).toString('base64url');
const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url').slice(0, 32);
console.log(host + '/survei/' + body + '.' + sig);
