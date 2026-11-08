import { scrypt, randomBytes, timingSafeEqual, createHash } from 'crypto';

const KEYLEN = 64;
const derive = (pw, salt) => new Promise((resolve, reject) => scrypt(pw, salt, KEYLEN, { N: 16384, r: 8, p: 1 }, (e, k) => (e ? reject(e) : resolve(k))));

export const passwordValid = (pw) => typeof pw === 'string' && pw.length >= 8 && pw.length <= 128;

export async function hashPassword(pw) {
  const salt = randomBytes(16);
  const key = await derive(pw, salt);
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(pw, stored) {
  const [alg, s, k] = String(stored || '').split('$');
  if (alg !== 'scrypt' || !s || !k) return false;
  const want = Buffer.from(k, 'base64');
  const got = await derive(pw, Buffer.from(s, 'base64'));
  return want.length === got.length && timingSafeEqual(want, got);
}

export const newToken = () => randomBytes(32).toString('base64url');
export const sha256 = (s) => createHash('sha256').update(String(s)).digest('hex');
export function safeEqual(a, b) {
  const x = Buffer.from(String(a)); const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}
