const BASE = process.env.AIRTABLE_BASE_ID || 'appnbezea6uZzlSeS';
const api = (base) => 'https://api.airtable.com/v0/' + (base || BASE);

async function call(path, init = {}, base) {
  const res = await fetch(api(base) + path, {
    ...init,
    cache: 'no-store',
    headers: { Authorization: 'Bearer ' + process.env.AIRTABLE_TOKEN, 'Content-Type': 'application/json', ...(init.headers || {}) }
  });
  if (!res.ok) throw new Error('Airtable ' + res.status + ': ' + (await res.text()).slice(0, 300));
  return res.json();
}

// Ambil semua record (semua halaman). Filter dijalankan oleh Airtable (filterByFormula).
export async function listAll(table, { filter, fields, base }) {
  const out = [];
  let offset;
  do {
    const body = { returnFieldsByFieldId: true, pageSize: 100, ...(filter ? { filterByFormula: filter } : {}), ...(fields ? { fields } : {}), ...(offset ? { offset } : {}) };
    const j = await call('/' + table + '/listRecords', { method: 'POST', body: JSON.stringify(body) }, base);
    out.push(...j.records);
    offset = j.offset;
  } while (offset);
  return out;
}
// Airtable "Get record" tidak mendukung parameter fields[] (menghasilkan 422), jadi dibaca lewat listRecords + RECORD_ID().
export async function getOne(table, id, fields, base) {
  const body = { returnFieldsByFieldId: true, pageSize: 1, filterByFormula: `RECORD_ID()='${String(id).replace(/'/g, '')}'`, ...(fields && fields.length ? { fields } : {}) };
  const j = await call('/' + table + '/listRecords', { method: 'POST', body: JSON.stringify(body) }, base);
  if (!j.records[0]) { const e = new Error('Data tidak ditemukan'); e.status = 404; throw e; }
  return j.records[0];
}
export async function updateOne(table, id, fields, base) {
  return call('/' + table + '/' + id, { method: 'PATCH', body: JSON.stringify({ fields }) }, base);
}
export async function createOne(table, fields, base) {
  return call('/' + table, { method: 'POST', body: JSON.stringify({ fields }) }, base);
}

// Escape untuk teks di dalam formula Airtable
export const q = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
