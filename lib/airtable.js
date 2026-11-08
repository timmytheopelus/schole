const BASE = process.env.AIRTABLE_BASE_ID || 'appnbezea6uZzlSeS';
const API = 'https://api.airtable.com/v0/' + BASE;

async function call(path, init = {}) {
  const res = await fetch(API + path, {
    ...init,
    cache: 'no-store',
    headers: { Authorization: 'Bearer ' + process.env.AIRTABLE_TOKEN, 'Content-Type': 'application/json', ...(init.headers || {}) }
  });
  if (!res.ok) throw new Error('Airtable ' + res.status + ': ' + (await res.text()).slice(0, 300));
  return res.json();
}

// Ambil semua record (semua halaman). Filter dijalankan oleh Airtable (filterByFormula).
export async function listAll(table, { filter, fields }) {
  const out = [];
  let offset;
  do {
    const body = { returnFieldsByFieldId: true, pageSize: 100, ...(filter ? { filterByFormula: filter } : {}), ...(fields ? { fields } : {}), ...(offset ? { offset } : {}) };
    const j = await call('/' + table + '/listRecords', { method: 'POST', body: JSON.stringify(body) });
    out.push(...j.records);
    offset = j.offset;
  } while (offset);
  return out;
}
export async function getOne(table, id, fields) {
  const q = new URLSearchParams({ returnFieldsByFieldId: 'true' });
  (fields || []).forEach((f) => q.append('fields[]', f));
  return call('/' + table + '/' + id + '?' + q.toString());
}
export async function updateOne(table, id, fields) {
  return call('/' + table + '/' + id, { method: 'PATCH', body: JSON.stringify({ fields, returnFieldsByFieldId: true }) });
}

// Escape untuk teks di dalam formula Airtable
export const q = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
