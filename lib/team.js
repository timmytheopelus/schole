import { H } from './config';

const arr = (v) => (Array.isArray(v) ? v : v == null || v === '' ? [] : [v]).flat().filter((x) => x != null && x !== '').map((x) => (typeof x === 'object' ? x.name || x.email || '' : String(x)));
const digits = (s) => String(s || '').replace(/\D/g, '');
export function normHp(s) {
  let d = digits(s);
  if (!d) return '';
  if (d.startsWith('0')) d = '62' + d.slice(1);
  return d;
}

// Satu sel di Airtable bisa berisi beberapa orang sekaligus, dipisah koma:
//   "Nama A-+62812...-Kota, Nama B-+62813...-Kota"
// Nama boleh mengandung koma (mis. "Romo X, PR.-+62...-Bandung"), jadi pemisah entri
// hanya dikenali setelah pola "-nomor telepon-kota".
const ENTRY = /([^]*?)\s*-\s*(\+?\d[\d\s]{6,}\d)(?:\s*-\s*([^,]*))?\s*(?:,|$)/g;
const clean = (s) => String(s || '').replace(/["“”]/g, '').replace(/\s+/g, ' ').trim();

export function parsePeople(str) {
  const t = clean(str);
  if (!t) return [];
  const out = [];
  const re = new RegExp(ENTRY.source, 'g');
  let m;
  while ((m = re.exec(t)) && m[0] !== '') {
    const nama = clean(m[1]);
    if (nama) out.push({ nama, hp: normHp(m[2]), kota: clean(m[3]) });
  }
  // Tanpa pola nomor telepon: anggap seluruh teks sebagai satu nama
  return out.length ? out : [{ nama: t, hp: '', kota: '' }];
}
// Tetap tersedia untuk pemanggil lama: satu orang saja
export const parsePerson = (str) => parsePeople(str)[0] || { nama: '', hp: '', kota: '' };

const waNum = (u) => normHp(String(u || '').replace(/^.*wa\.me\//, ''));

const ROLES = [['Mentor', H.tMentor, H.wMentor], ['Co-Mentor', H.tCo, H.wCo], ['Pendamping Teknis', H.tTek, H.wTek], ['Pengolah Data', H.tOlah, H.wOlah]];
const keyOf = (o) => o.hp || o.nama.toLowerCase();

// Tim pendamping satu peserta (dibaca dari lookup LMSHeader yang bersumber dari tabel Kelompok).
// Setiap orang hanya muncul sekali; jika sama-sama terdaftar sebagai Mentor dan Co-Mentor, peran Mentor yang dipakai.
export function teamOf(f) {
  const out = [];
  const seen = new Set();
  for (const [peran, tf, wf] of ROLES) {
    const names = arr(f[tf]); const was = arr(f[wf]);
    names.forEach((n, i) => {
      const people = parsePeople(n);
      people.forEach((p) => {
        if (!p.nama) return;
        // Nomor dari kolom WA hanya dipercaya jika sel ini berisi satu orang (urutan terjamin)
        const hp = (people.length === 1 && waNum(was[i] || was[0])) || p.hp;
        const o = { peran, nama: p.nama, kota: p.kota, hp };
        const k = keyOf(o);
        if (seen.has(k) || seen.has(o.nama.toLowerCase())) return;
        seen.add(k); seen.add(o.nama.toLowerCase());
        out.push(o);
      });
    });
  }
  return out;
}

// Nama mentor (dan co-mentor) saja, tanpa nomor telepon, untuk tampilan tabel
export function mentorNames(f) {
  const t = teamOf(f).filter((o) => o.peran === 'Mentor' || o.peran === 'Co-Mentor').map((o) => o.nama);
  if (t.length) return t;
  return [...new Set(parsePeople(f[H.mentor]).map((p) => p.nama).filter(Boolean))];
}

export const kelompokOf = (f) => arr(f[H.kelompok])[0] || '';

// "Kelompok 12 (4|A)" -> { nama: 'Kelompok 12', jumlah: 4, kode: 'A' }
export function parseKelompok(label) {
  const m = String(label || '').match(/^(.*?)\s*\((\d+)\s*\|\s*([^)]*)\)\s*$/);
  return m ? { nama: m[1].trim(), jumlah: parseInt(m[2], 10), kode: m[3].trim() } : { nama: String(label || ''), jumlah: null, kode: '' };
}
