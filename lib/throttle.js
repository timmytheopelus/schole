// Pembatas percobaan sederhana (per instance server). Cukup untuk meredam tebak password dan spam form.
const store = new Map();
export function tooMany(key, max, windowMs) {
  const now = Date.now();
  const e = store.get(key);
  if (!e || now - e.t > windowMs) return false;
  return e.n >= max;
}
export function hit(key, windowMs) {
  const now = Date.now();
  const e = store.get(key);
  if (!e || now - e.t > windowMs) store.set(key, { n: 1, t: now });
  else e.n += 1;
  if (store.size > 5000) { for (const [k, v] of store) if (now - v.t > windowMs) store.delete(k); }
}
export const clearKey = (key) => store.delete(key);
export const clientIp = (req) => (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
