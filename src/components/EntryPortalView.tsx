import { useState } from 'react';
import { ArrowRight, Lock, Printer, QrCode, ShieldCheck, UserCheck } from 'lucide-react';
import { formatReadableError } from '../utils/api';
import { QrAccessModal } from './QrCodeDisplay';

interface EntryPortalViewProps {
  onContinueAsGuest: () => void;
  onOperatorGoogleLogin: () => Promise<void>;
  initialFocusOperator?: boolean;
}

export function EntryPortalView({
  onContinueAsGuest,
  onOperatorGoogleLogin,
  initialFocusOperator = false,
}: EntryPortalViewProps) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  async function handleGoogleLogin() {
    setError(null);
    setSubmitting(true);
    try {
      await onOperatorGoogleLogin();
    } catch (err) {
      setError(formatReadableError(err, 'Gagal masuk dengan akun Google operator.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FFFDF9] flex flex-col">
      {/* Energetic Orange Hero Band */}
      <header className="bg-[#F97316] text-white px-5 pt-10 pb-16 sm:px-8 sm:pt-12 sm:pb-20">
        <div className="max-w-5xl mx-auto flex flex-col items-center text-center">
          <div className="h-14 w-14 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center mb-4">
            <Printer className="h-8 w-8 text-white" aria-hidden="true" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            PrintKilat
          </h1>
          <p className="mt-2 text-sm sm:text-base font-medium text-orange-50 max-w-md text-balance">
            Kirim file cetak dari kelas atau kos, ambil di gerai fotokopi kampus tanpa antre fisik.
          </p>
        </div>
      </header>

      {/* Main Role Cards */}
      <main className="flex-1 px-4 sm:px-8 -mt-9 pb-12">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Pelanggan (Guest-First) Card */}
          <section
            aria-labelledby="guest-heading"
            className="lg:col-span-7 bg-white rounded-2xl border border-orange-100 shadow-sm p-6 sm:p-8 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#C2410C] mb-2">
                <UserCheck className="h-4 w-4" aria-hidden="true" />
                <span>Akses Mahasiswa &amp; Umum</span>
              </div>
              <h2 id="guest-heading" className="text-2xl font-bold text-[#111827] tracking-tight">
                Pelanggan
              </h2>
              <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed">
                Tidak perlu daftar atau buat akun. Unggah dokumen PDF/DOCX, lihat estimasi harga otomatis, lalu simpan kode pelacakan untuk memantau progres cetak.
              </p>

              <dl className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5 border-t border-slate-100">
                <div>
                  <dt className="text-xs font-medium text-slate-500">Tanpa Daftar</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-[#111827]">Langsung Pesan</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500">Format Berkas</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-[#111827]">PDF, DOC, DOCX</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500">Privasi Aman</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-[#111827]">Hapus Otomatis 7 Hari</dd>
                </div>
              </dl>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={onContinueAsGuest}
                className="flex-1 min-h-[48px] px-6 py-3 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-semibold text-base flex items-center justify-center gap-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#EA580C] cursor-pointer"
              >
                <span>Lanjut sebagai Tamu</span>
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setQrModalOpen(true)}
                className="min-h-[48px] px-4 py-3 rounded-xl border border-slate-200 hover:border-[#EA580C] hover:bg-orange-50/50 text-sm font-semibold text-[#111827] inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <QrCode className="h-4 w-4 text-[#EA580C]" aria-hidden="true" />
                <span>Tampilkan QR</span>
              </button>
            </div>
          </section>

          {/* Divider on mobile only */}
          <div className="flex items-center gap-3 lg:hidden px-2" aria-hidden="true">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-medium text-slate-500">khusus petugas</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {/* Operator Fotokopi Google Sign-In Card */}
          <section
            aria-labelledby="operator-heading"
            className={`lg:col-span-5 bg-white rounded-2xl border shadow-sm p-6 sm:p-8 flex flex-col justify-between ${
              initialFocusOperator ? 'border-[#EA580C] ring-2 ring-orange-500/20' : 'border-slate-200'
            }`}
          >
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-2">
                <Lock className="h-4 w-4 text-[#EA580C]" aria-hidden="true" />
                <span>Khusus Petugas Gerai</span>
              </div>

              <h2 id="operator-heading" className="text-xl font-bold text-[#111827] tracking-tight">
                Operator fotokopi
              </h2>

              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Masuk menggunakan akun Google operator yang terdaftar untuk mengelola antrean cetak, memverifikasi pembayaran, dan mengatur tarif resmi gerai.
              </p>

              <div className="mt-5 rounded-xl bg-[#FEFBE8] border border-[#FDE68A] p-3.5 text-xs text-slate-700 flex items-start gap-2.5">
                <ShieldCheck className="h-4 w-4 text-[#C2410C] shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  Akses antrean pelanggan, nomor kontak, dan berkas dokumen dilindungi autentikasi Firebase &amp; aturan keamanan database.
                </span>
              </div>

              {error && (
                <p role="alert" className="mt-4 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
            </div>

            <div className="mt-6 space-y-3">
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleGoogleLogin()}
                className="w-full min-h-[48px] px-5 py-2.5 rounded-xl border-2 border-[#EA580C] text-[#C2410C] hover:bg-orange-50 font-semibold text-sm flex items-center justify-center gap-2.5 transition-colors disabled:opacity-60 cursor-pointer"
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#EA4335"
                    d="M12 10.2v3.9h5.4c-.2 1.2-1.4 3.6-5.4 3.6-3.2 0-5.9-2.7-5.9-6s2.7-6 5.9-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.1 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12s4.4 9.8 9.8 9.8c5.7 0 9.4-4 9.4-9.6 0-.6-.1-1.1-.2-1.6H12z"
                  />
                </svg>
                <span>{submitting ? 'Menghubungkan Google...' : 'Masuk dengan Google (Operator)'}</span>
              </button>
              <p className="text-[11px] text-slate-500 text-center">
                Hanya email admin/operator terdaftar yang diizinkan membuka dashboard petugas.
              </p>
            </div>
          </section>
        </div>
      </main>

      <QrAccessModal
        open={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        targetPath="/tamu"
      />
    </div>
  );
}
