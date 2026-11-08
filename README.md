# Schole Portal

## Halaman
- `/` landing page publik (Masuk dan Daftar mengarah ke halaman di bawah).
- `/login` masuk dengan Google atau email dan password. `/lupa-password` meminta tautan reset lewat email, `/reset-password` membuat password baru.
- `/daftar` sign up: biodata lengkap ditulis ke master data umat BPN (tabel **M-Person**), termasuk keuskupan, paroki, kota, komunitas (M-PDPKK). Paroki dan komunitas yang belum ada bisa ditambah baru dari form.
- `/portal` aplikasi mentor dan superadmin (dulunya di `/`).

Akun hasil sign up dibuat **tidak aktif** di tabel Akses Portal Schole. Superadmin menyetujuinya dengan mencentang **Aktif** (menu Pengguna atau langsung di Airtable).

Aplikasi mentor dan superadmin untuk Training Course. Data dan aturan ada di Airtable (base **Schole**); aplikasi hanya membaca dan menulis lewat API.

## Fitur
- **Mentor** (login Google): lihat peserta miliknya per program (TC), ubah status (Aktif/Lulus/Drop Out), nilai tiap bab (Siap mengajar / Perlu pendampingan; di Airtable tersimpan sebagai "Boleh mengajar" / "Boleh mengajar, didampingi") dengan catatan, kirim WA lewat tautan wa.me.
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
   - Login email dan reset password: `RESEND_API_KEY` dan `MAIL_FROM` (mis. `Schole <no-reply@domainanda.org>`, domain harus terverifikasi di Resend). Tanpa ini email reset tidak terkirim.
3. Deploy.

## Kolom Airtable untuk login email dan sign up
Tabel **Akses Portal Schole** (base BPN PKKI) perlu kolom berikut (nama harus persis):
- `Password Hash` (Single line text)
- `Reset Token Hash` (Single line text)
- `Reset Berlaku Sampai` (Number, 0 desimal)
- `ID M-Person (BPN)` (Single line text)

Password disimpan sebagai hash scrypt, token reset disimpan sebagai hash dan berlaku 1 jam. Token Airtable harus boleh menulis ke tabel M-Person, M-PDPKK, M-Paroki, dan Akses Portal Schole di base BPN PKKI.

Mentor dikenali dari email Google yang sama dengan **Email Mentor** di Airtable.

## Level akses
Tabel **Akses Portal Schole** (base BPN PKKI) menyimpan pengguna dan levelnya:
- **Superadmin**: semua fitur, rekap, unduh Excel, kelola pengguna (menu Pengguna).
- **Mentor**: hanya peserta miliknya (dicocokkan lewat Email Mentor di Schole).
- **Pengamat**: lihat peserta, rekap dan unduh Excel; tidak bisa mengubah.
Aktif tidak dicentang = ditolak masuk. Mentor tanpa baris di tabel tetap bisa masuk sebagai Mentor.
`SUPERADMIN_EMAILS` di Vercel tetap berlaku sebagai cadangan agar tidak ada yang terkunci.
Token Airtable harus punya akses ke base Schole **dan** base BPN PKKI.

## Catatan data (hasil audit 8 Nov 2026)
- **Lulus tanpa penilaian bab**: 110 peserta TC SHDR BPN PKKI berstatus Lulus tetapi 0 bab dinilai. Status ini diimpor pada 24 Juli 2026 beserta teks di *Keterangan Kelulusan*, sebelum kolom *Izin Mengajar* dipakai. Aplikasi menampilkannya sebagai "data historis", bukan galat. Kolom *Cek Kelulusan* di Airtable tetap menandainya.
- **Drop Out dengan 9/9 video**: 32 peserta. Alasannya ada di *Keterangan Kelulusan* (mis. mengundurkan diri, tidak mengerjakan tugas) dan kini ditampilkan di detail peserta dan tabel Rekap.
- **Sel mentor berisi beberapa orang** ("Nama-+62...-Kota, Nama2-+62...-Kota"): dipecah di `lib/team.js`. Orang yang sama sebagai Mentor dan Co-Mentor hanya tampil sekali.
- **Bab per program**: daftar bab tetap hanya untuk program yang namanya memuat "SHDR". Program lain memakai bab dari datanya; program kosong menampilkan empty state.
- **Lihat sebagai mentor** tetap bisa mengedit data mentor tersebut, tetapi perubahan dicatat atas nama Superadmin yang sedang melihat (bukan mentor).
- Alamat halaman menyimpan menu dan program (`?m=peserta&tc=...`); pilihan program terakhir diingat di browser.
- Opsional: `NEXT_PUBLIC_ADMIN_CONTACT` (mis. email/WA admin) ditampilkan di halaman login.
