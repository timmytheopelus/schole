import ExcelJS from 'exceljs';
import { currentUser } from '@/lib/auth';
import { buildRekap } from '@/lib/rekap';
import { babLabel } from '@/lib/config';

export const maxDuration = 60;

export async function GET(req) {
  const u = await currentUser();
  if (!u || u.blocked || !u.viewAll) return Response.json({ error: 'forbidden' }, { status: 403 });
  const p = new URL(req.url).searchParams;
  const tc = p.get('tc'), ku = p.get('ku') || '', bab = p.get('bab') || '';
  try {
    const r = await buildRekap(u, { tc, ku, bab });
    const wb = new ExcelJS.Workbook();
    const s1 = wb.addWorksheet('Ringkasan');
    s1.addRows([['Program', tc], ['Keuskupan', ku || 'Semua'], ['Bab', bab ? babLabel(bab) : 'Semua'], [], ['Peserta', r.sum.total], ['Lulus', r.sum.Lulus], ['Aktif', r.sum['Peserta Aktif']], ['Drop Out', r.sum['Drop Out']]]);
    s1.getColumn(1).width = 18; s1.getColumn(1).font = { bold: true };
    const s2 = wb.addWorksheet('Per Keuskupan');
    s2.addRow(['Keuskupan', 'Peserta', 'Lulus', 'Aktif', 'Drop Out']).font = { bold: true };
    r.perKu.forEach((k) => s2.addRow([k.ku, k.total, k.Lulus, k['Peserta Aktif'], k['Drop Out']]));
    s2.columns.forEach((c, i) => (c.width = i ? 11 : 28));
    const s3 = wb.addWorksheet('Per Bab');
    s3.addRow(['Bab', 'Selesai menonton', 'Tugas terkumpul', 'Siap mengajar', 'Perlu pendampingan']).font = { bold: true };
    r.perBab.forEach((b) => s3.addRow([babLabel(b.bab), b.nonton, b.tugas, b.boleh, b.damping]));
    s3.columns.forEach((c, i) => (c.width = i ? 18 : 22));
    const s4 = wb.addWorksheet('Peserta');
    s4.addRow(['Nama', 'Keuskupan', 'Mentor', 'Status', 'Video selesai', 'Bab dinilai', 'Keterangan (Drop Out)'].concat(bab ? [babLabel(bab)] : [])).font = { bold: true };
    r.rows.forEach((x) => s4.addRow([x.nama, x.ku, x.mentor, x.status, x.nonton, x.dinilai, x.ket || ''].concat(bab ? [x.babSelesai ? 'Selesai' : 'Belum'] : [])));
    [30, 20, 28, 14, 14, 12, 40, 14].forEach((w, i) => (s4.getColumn(i + 1).width = w));
    const buf = await wb.xlsx.writeBuffer();
    const name = `Rekap-${tc}-${ku || 'semua-keuskupan'}${bab ? '-' + babLabel(bab) : ''}.xlsx`.replace(/[^\w.-]+/g, '-');
    return new Response(buf, { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="${name}"` } });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}
