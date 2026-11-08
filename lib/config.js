// ID tabel dan field Airtable (base Schole). Semua data & aturan hidup di Airtable; aplikasi hanya membaca/menulis.
export const T = { header: 'tblZhieD2iLA6xSxa', detail: 'tblHdbfsd6vT0pxp5', event: 'tbl0za6Jpd54jM4z0' };

export const H = {
  status: 'flduH9BDju7FUNYjp', nama: 'fldl4SuNiiBEQLyo3', ku: 'fldIMpXTWOpqZpVrR', email: 'fldl95vg3BSSkSue2', emailPeserta: 'fldWYrEa3TbJ7IxTd',
  mentor: 'fld2cse2eUl2w187O', tc: 'fldGcKUaAeeoPZgxu', hp: 'flddEP7L1ZYEIyv1X', usia: 'fld8Cs7XJPc3nFm1X',
  nonton: 'fldd9jbr734By3Qk6', dinilai: 'fldpGgN8hWjwx3qS1', boleh: 'fldHhejUuScbu6FOZ', damping: 'fldZnfwVe2R5CWm1q',
  catatanKurang: 'fld16sCfyzTBi4oKP', cekLulus: 'fldD0mYOUxom6gIVy', keterangan: 'fldj6YOewD5NFPGMK', submittedBy: 'fldTHg4rNfufnw7nM',
  kelompok: 'fld8TfBelMkpt3byj', tMentor: 'fldagk20LJvm5wjnt', tCo: 'fld6ijlC0XU8rXoeL', tTek: 'fldfnS3QfgEftDEi8', tOlah: 'fldHM747L35Ark0rD',
  wMentor: 'fldr0KrObiOAEdXGz', wCo: 'fldBp0nsC5TOE5NFn', wTek: 'fldXaPRr3xiipet7G', wOlah: 'fld65ljmSoLSVSUY6'
};
export const HEV = 'fldPK70LzNQzsKnw1', HDET = 'fldxME5Jftq8f07RC';
export const D = {
  header: 'fldRkmZ12W4cP91mD', bab: 'fld4X9x4KzYGOu2MQ', izin: 'fldTAah7HCLKZnRfP', catatan: 'fldOObWbyRktdb76x',
  oleh: 'fldaKsOuzJX8qioG6', tgl: 'fldx4LMEZ0BMpMEe9', status: 'fldHE0iiUherGR6Y7', tugas: 'fldxH6GUVnBC6xR4R',
  ku: 'fldoLuMU93kbzMjVo', tc: 'fld3B0rzyHumf2mNa', email: 'fldiSoaLqTkmA30Ln', cek: 'fldL6923mdGKHurbp'
};
export const EV = { nama: 'fldeIzGCfTUgmiSKx', status: 'fldqiwDGC93u9GE0C' };

export const STATUS = ['Peserta Aktif', 'Lulus', 'Drop Out'];
// Nilai di Airtable (tidak diubah agar rumus tetap jalan) dan label yang dilihat pengguna
export const IZIN = ['Boleh mengajar', 'Boleh mengajar, didampingi'];
export const IZIN_LABEL = ['Siap mengajar', 'Perlu pendampingan'];
// Bab yang dinilai mentor (sesuai keputusan: Bab 0 Pendahuluan + Bab 1-7; Benang Merah tidak dinilai)
export const BAB = ['SHDR-Bab 0 Pendahuluan', 'SHDR-Bab 1', 'SHDR-Bab 2', 'SHDR-Bab 3', 'SHDR-Bab 4', 'SHDR-Bab 5', 'SHDR-Bab 6', 'SHDR-Bab 7'];
export const babLabel = (b) => String(b || '').replace(/^[A-Z]{2,6}-/, '');
// Daftar bab di atas khusus modul SHDR. Program lain (mis. MYS) memakai bab dari datanya sendiri.
export const isShdr = (tc) => /SHDR/i.test(String(tc || ''));
const urutBab = (b) => (/pendahuluan/i.test(b) ? 0 : /bab\s*(\d+)/i.exec(b) ? parseInt(/bab\s*(\d+)/i.exec(b)[1], 10) : 100);
// Bab yang dinilai untuk satu program: SHDR memakai daftar tetap; program lain diturunkan dari data (tanpa "Benang Merah")
export function babsFor(tc, fromData = []) {
  if (isShdr(tc)) return BAB;
  return [...new Set(fromData.filter((b) => b && !/benang\s*merah/i.test(b)))].sort((a, b) => urutBab(a) - urutBab(b) || a.localeCompare(b));
}

// Tabel akses pengguna (base BPN PKKI)
export const ACCESS = {
  base: process.env.ACCESS_BASE_ID || 'appG76IeTvWetH0FJ',
  table: process.env.ACCESS_TABLE_ID || 'tblBXSBKPODD7unQt',
  f: { email: 'flduCghI5kHmmDwML', nama: 'fldkY7XoC1ZKvPZNY', level: 'fldyHgZuQMHAbnzsr', aktif: 'fldHmu0l83TCfqVVC', catatan: 'fld4GjMx0r1cMVdnh', oleh: 'flddUOLr1Rh6hlUl1', tgl: 'fld8CJOWJoW4em3H3' }
};
export const LEVEL = ['Superadmin', 'Mentor', 'Pengamat'];

// Materi (video) dan event
export const EVF = { nama: 'fldeIzGCfTUgmiSKx', mulai: 'fldz0DCRxAKsIC3qz', selesai: 'flddNWXyw0CXPCv7X', materi: 'fld3Jom4Z3XGFxn3i' };
export const MAT = { tbl: 'tblhWOXQqB9CKexci', pengajaran: 'fldgmrtbTVfI75ASg' };
export const PGJ = { tbl: 'tbluOHUoQjIjteK4V', judul: 'fldaYBcTs6soilLJC', yt: 'fldL8NWo3ImHsZ9sr', status: 'fldF2hv3x4Ma37uvy', materi: 'fldJGdVyPZaQQAeBK' };
export const DET_LINK = { pengajaran: 'fldEkiMNNH2YDicRb', materi: 'fldz284YKI3O8tdpZ' };

// Base BPN (data profil dan modul)
export const BPN = {
  base: process.env.ACCESS_BASE_ID || 'appG76IeTvWetH0FJ',
  person: 'tbl21zOSogH7Anlu2', bpk: 'tblgj0UYB9w7UWWnv', modul: 'tblymcTBL1pjIMa4A',
  p: { nama: 'fldVU2gofcKEhWHmB', wa: 'fldGsFt4GflTXoTa0', email: 'fldhjOTrQfLGC6hWj', jk: 'fld3A1rRGfWxbuase', usia: 'fldpIbuKfSaL6uJY2', kelUsia: 'fldPImsnUJoS55OD2', ku: 'fldwJ7RnXW1nLaOcv', kategori: 'fldkvwhgXy1CgJYr1', spes: 'fldJJbI82Q4k6bVCg', alamat: 'fldZC8crJW8pETX6J', panggilan: 'fldstVCm8Oa3tyxNA', baptis: 'fldb4MKCMsEulvR7H', krisma: 'fldjg2iLicQIr7Vh3' },
  m: { nama: 'fldocxJbZYt5nn9NS', tahap: 'fld04TLxwRqpdkS1V', pengajar: 'fldgAsuDFXnBF620T', jumlah: 'fldT3PQ7F36N0CxpS' },
  bpkNama: 'fldxvUJvguk6J81mP'
};

// Sign up: tulis ke master data umat BPN (base BPN PKKI)
export const SIGNUP = {
  base: BPN.base,
  pdpkk: 'tblhmeuR1qFHxUIId', paroki: 'tblqKpvfwGtLEHnip', kota: 'tblSaXvGJJ7G1P9my',
  person: {
    nama: 'fldVU2gofcKEhWHmB', panggilan: 'fldstVCm8Oa3tyxNA', jk: 'fld3A1rRGfWxbuase', tgl: 'fld6yev36uF0pzxcu', bln: 'fldmCKGMF57RMV3tE', thn: 'fldmTqYBcGuYVkkgM',
    wa: 'fldGsFt4GflTXoTa0', email: 'fldhjOTrQfLGC6hWj', alamat: 'fldZC8crJW8pETX6J', kota: 'fld9IxSm1629bESxL', ku: 'fldwJ7RnXW1nLaOcv',
    paroki: 'fldUTfjEjaznMj8m0', pd: 'fld3CxECAgWwecw77', baptis: 'fldb4MKCMsEulvR7H', krisma: 'fldjg2iLicQIr7Vh3'
  },
  pd: { nama: 'fldzIeY3YMiHMo4ky', ku: 'fldWcO7mYhPFpFXlA', jenis: 'fldq43MYnCIKg34ts' },
  par: { nama: 'fldU7KKCH19jGvG6T', ku: 'fldD3brFiEGKFVgzT' },
  kota_f: { nama: 'fldzDMmFzXQUgTC8g', prov: 'fldmjgXiXurcORn1B' }
};
export const JENIS_PD = ['PD Umum', 'PD OMK Anak (6-12th)', 'PD OMK Remaja (13-18th)', 'PD OMK Muda Mudi (18-35th blm menikah)', 'PD Keluarga Muda', 'PD Lansia', 'PD Pengusaha'];
