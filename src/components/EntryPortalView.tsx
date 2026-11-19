import { useState, type FormEvent } from 'react';
import { ArrowRight, Lock, Printer, UserCheck } from 'lucide-react';

interface EntryPortalViewProps {
  onContinueAsGuest: () => void;
  onOperatorLogin: (email: string, password: string) => Promise<void>;
  initialFocusOperator?: boolean;
}

export function EntryPortalView({
  onContinueAsGuest,
  onOperatorLogin,
  initialFocusOperator = false,
}: EntryPortalViewProps) {
  const [email, setEmail] = useState(initialFocusOperator ? 'operator@printkilat.id' : '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('Email dan kata sandi wajib diisi.');
      return;
    }
    setSubmitting(true);
    try {
      await onOperatorLogin(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal masuk sebagai operator.');
    } finally {
      setSubmitting(false);
    }
  }

  function fillDemoCredentials() {
    setEmail('operator@printkilat.id');
    setPassword('printkilat123');
    setError(null);
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

            <div className="mt-8">
              <button
                type="button"
                onClick={onContinueAsGuest}
                className="w-full min-h-[48px] px-6 py-3 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-semibold text-base flex items-center justify-center gap-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#EA580C] cursor-pointer"
              >
                <span>Lanjut sebagai Tamu</span>
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </section>

          {/* Divider on mobile only */}
          <div className="flex items-center gap-3 lg:hidden px-2" aria-hidden="true">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-medium text-slate-500">khusus petugas</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {/* Operator Fotokopi Login Card */}
          <section
            aria-labelledby="operator-heading"
            className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <Lock className="h-4 w-4 text-[#EA580C]" aria-hidden="true" />
                  <span>Khusus Petugas Gerai</span>
                </div>
                <button
                  type="button"
                  onClick={fillDemoCredentials}
                  className="text-xs font-semibold text-[#C2410C] hover:underline py-1 px-1.5 cursor-pointer"
                >
                  Isi akun demo
                </button>
              </div>

              <h2 id="operator-heading" className="text-xl font-bold text-[#111827] tracking-tight">
                Operator fotokopi
              </h2>

              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <div>
                  <label htmlFor="operator-email" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Email
                  </label>
                  <input
                    id="operator-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="operator@printkilat.id"
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-[#111827] placeholder:text-slate-400 focus:border-[#EA580C] focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>

                <div>
                  <label htmlFor="operator-password" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Kata sandi
                  </label>
                  <input
                    id="operator-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi"
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-[#111827] placeholder:text-slate-400 focus:border-[#EA580C] focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>

                {error && (
                  <p role="alert" className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full min-h-[48px] px-5 py-2.5 rounded-xl border-2 border-[#EA580C] text-[#C2410C] hover:bg-orange-50 font-semibold text-sm transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {submitting ? 'Memverifikasi...' : 'Masuk sebagai Operator'}
                </button>
              </form>
            </div>

            <p className="mt-5 text-xs text-slate-500">
              Demo petugas: <span className="font-mono text-slate-700">operator@printkilat.id</span> · sandi{' '}
              <span className="font-mono text-slate-700">printkilat123</span>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
