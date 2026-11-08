// ID tabel dan field Airtable (base Schole). Semua data & aturan hidup di Airtable; aplikasi hanya membaca/menulis.
export const T = { header: 'tblZhieD2iLA6xSxa', detail: 'tblHdbfsd6vT0pxp5', event: 'tbl0za6Jpd54jM4z0' };

export const H = {
  status: 'flduH9BDju7FUNYjp', nama: 'fldl4SuNiiBEQLyo3', ku: 'fldIMpXTWOpqZpVrR', email: 'fldl95vg3BSSkSue2', emailPeserta: 'fldWYrEa3TbJ7IxTd',
  mentor: 'fld2cse2eUl2w187O', tc: 'fldGcKUaAeeoPZgxu', hp: 'flddEP7L1ZYEIyv1X', usia: 'fld8Cs7XJPc3nFm1X',
  nonton: 'fldd9jbr734By3Qk6', dinilai: 'fldpGgN8hWjwx3qS1', boleh: 'fldHhejUuScbu6FOZ', damping: 'fldZnfwVe2R5CWm1q',
  catatanKurang: 'fld16sCfyzTBi4oKP', cekLulus: 'fldD0mYOUxom6gIVy', keterangan: 'fldj6YOewD5NFPGMK', submittedBy: 'fldTHg4rNfufnw7nM'
};
export const D = {
  header: 'fldRkmZ12W4cP91mD', bab: 'fld4X9x4KzYGOu2MQ', izin: 'fldTAah7HCLKZnRfP', catatan: 'fldOObWbyRktdb76x',
  oleh: 'fldaKsOuzJX8qioG6', tgl: 'fldx4LMEZ0BMpMEe9', status: 'fldHE0iiUherGR6Y7', tugas: 'fldxH6GUVnBC6xR4R',
  ku: 'fldoLuMU93kbzMjVo', tc: 'fld3B0rzyHumf2mNa', email: 'fldiSoaLqTkmA30Ln', cek: 'fldL6923mdGKHurbp'
};
export const EV = { nama: 'fldeIzGCfTUgmiSKx', status: 'fldqiwDGC93u9GE0C' };

export const STATUS = ['Peserta Aktif', 'Lulus', 'Drop Out'];
export const IZIN = ['Boleh mengajar', 'Boleh mengajar, didampingi'];
// Bab yang dinilai mentor (sesuai keputusan: Bab 0 Pendahuluan + Bab 1-7; Benang Merah tidak dinilai)
export const BAB = ['SHDR-Bab 0 Pendahuluan', 'SHDR-Bab 1', 'SHDR-Bab 2', 'SHDR-Bab 3', 'SHDR-Bab 4', 'SHDR-Bab 5', 'SHDR-Bab 6', 'SHDR-Bab 7'];
export const babLabel = (b) => b.replace(/^SHDR-/, '');

// Tabel akses pengguna (base BPN PKKI)
export const ACCESS = {
  base: process.env.ACCESS_BASE_ID || 'appG76IeTvWetH0FJ',
  table: process.env.ACCESS_TABLE_ID || 'tblBXSBKPODD7unQt',
  f: { email: 'flduCghI5kHmmDwML', nama: 'fldkY7XoC1ZKvPZNY', level: 'fldyHgZuQMHAbnzsr', aktif: 'fldHmu0l83TCfqVVC', catatan: 'fld4GjMx0r1cMVdnh', oleh: 'flddUOLr1Rh6hlUl1', tgl: 'fld8CJOWJoW4em3H3' }
};
export const LEVEL = ['Superadmin', 'Mentor', 'Pengamat'];
