# Schole Portal

Aplikasi mentor dan superadmin untuk Training Course. Data dan aturan ada di Airtable (base **Schole**); aplikasi hanya membaca dan menulis lewat API.

## Fitur
- **Mentor** (login Google): lihat peserta miliknya per program (TC), ubah status (Aktif/Lulus/Drop Out), nilai tiap bab (Boleh mengajar / Boleh mengajar, didampingi) dengan catatan, kirim WA lewat tautan wa.me.
- **Superadmin**: rekap per TC, per keuskupan, tabel peserta, filter keuskupan dan bab, unduh Excel.

## Perubahan Airtable (sudah dibuat)
Tabel **LMS Detail**: `Izin Mengajar`, `Catatan Mentor`, `Dinilai Oleh`, `Tanggal Dinilai`, `Cek Catatan` (validasi), `Flag Dinilai/Boleh/Didampingi/Catatan Kurang`, `Bab`, `Keuskupan`, `Nama TC`, `Mentor Email`, `Tugas Terkumpul`, lookup `Status Kepesertaan (from LMSHeader)`.
Tabel **LMSHeader**: rollup `Jumlah Bab Dinilai/Boleh Mengajar/Didampingi/Catatan Kurang`, formula `Cek Kelulusan`, `Nama Peserta`, `Keuskupan`, `Email Mentor`, `Nama Mentor`, `Nama TC`.

Karena rollup dan formula dihitung Airtable, data yang diinput manual di Airtable ikut tampil benar di aplikasi. Kolom `Cek Catatan` dan `Cek Kelulusan` menandai data yang melanggar aturan, termasuk yang diisi manual.

## Deploy (Vercel)
1. Import repo ini di Vercel.
2. Isi Environment Variables sesuai `.env.example`:
   - `AIRTABLE_TOKEN`: Personal Access Token dengan scope `data.records:read` dan `data.records:write`, akses base Schole.
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: OAuth client Google. Redirect URI: `https://<domain>/api/auth/callback/google`.
   - `NEXTAUTH_SECRET` (acak, mis. `openssl rand -base64 32`), `NEXTAUTH_URL` (URL produksi).
   - `SUPERADMIN_EMAILS`: email superadmin, pisahkan dengan koma.
3. Deploy.

Mentor dikenali dari email Google yang sama dengan **Email Mentor** di Airtable.

## Level akses
Tabel **Akses Portal Schole** (base BPN PKKI) menyimpan pengguna dan levelnya:
- **Superadmin**: semua fitur, rekap, unduh Excel, kelola pengguna (menu Pengguna).
- **Mentor**: hanya peserta miliknya (dicocokkan lewat Email Mentor di Schole).
- **Pengamat**: lihat peserta, rekap dan unduh Excel; tidak bisa mengubah.
Aktif tidak dicentang = ditolak masuk. Mentor tanpa baris di tabel tetap bisa masuk sebagai Mentor.
`SUPERADMIN_EMAILS` di Vercel tetap berlaku sebagai cadangan agar tidak ada yang terkunci.
Token Airtable harus punya akses ke base Schole **dan** base BPN PKKI.
