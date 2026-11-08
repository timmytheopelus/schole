import './landing.css';
import { LANDING_HTML } from '@/components/landing-html';

export const metadata = {
  title: 'Schole · Learning Management Platform PKK',
  description: 'Schole membantu pengurus dan pengajar PKK menyusun kelas, membagikan materi, dan memantau perkembangan peserta. Dibangun oleh BPK PKK Keuskupan Bandung bersama BPN PKK Indonesia.'
};

// Halaman utama (publik). Konten statis milik sendiri; tombol Masuk dan Daftar menuju /login dan /daftar.
export default function Landing() {
  return <div className="landing" dangerouslySetInnerHTML={{ __html: LANDING_HTML }} />;
}
