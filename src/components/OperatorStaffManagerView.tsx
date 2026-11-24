import { useEffect, useState, type FormEvent } from 'react';
import { CheckCircle2, Plus, Trash2, UserPlus, Users, Shield, ShieldCheck } from 'lucide-react';
import {
  addOperatorEmails,
  deleteOperatorEmail,
  fetchOperatorWhitelist,
  formatReadableError,
  type OperatorWhitelistItem,
} from '../utils/api';
import { BOOTSTRAPPED_ADMIN_EMAIL } from '../lib/firebase';

interface OperatorStaffManagerViewProps {
  currentAdminEmail?: string;
}

export function OperatorStaffManagerView({ currentAdminEmail }: OperatorStaffManagerViewProps) {
  const [staffList, setStaffList] = useState<OperatorWhitelistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingEmail, setDeletingEmail] = useState<string | null>(null);

  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [singleEmail, setSingleEmail] = useState('');
  const [singleName, setSingleName] = useState('');
  const [singleRole, setSingleRole] = useState<'operator' | 'owner'>('operator');
  const [bulkInput, setBulkInput] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function loadStaff() {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchOperatorWhitelist();
      setStaffList(list);
    } catch (err) {
      setError(formatReadableError(err, 'Gagal memuat daftar operator.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStaff();
  }, []);

  async function handleAddStaff(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFeedback(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const entriesToSave: { email: string; name?: string; role: 'operator' | 'owner' }[] = [];

    if (mode === 'single') {
      const cleanEmail = singleEmail.trim().toLowerCase();
      if (!cleanEmail || !emailRegex.test(cleanEmail)) {
        setError('Masukkan alamat email Google yang valid (contoh: nama@gmail.com).');
        return;
      }
      entriesToSave.push({
        email: cleanEmail,
        name: singleName.trim() || cleanEmail.split('@')[0],
        role: singleRole,
      });
    } else {
      // Bulk mode: split by newlines, commas, semicolons, or spaces
      const rawLines = bulkInput.split(/[\r\n,;\s]+/);
      const uniqueEmails = Array.from(new Set(rawLines.map((e) => e.trim().toLowerCase()).filter(Boolean)));
      const validEmails = uniqueEmails.filter((email) => emailRegex.test(email));

      if (validEmails.length === 0) {
        setError('Tidak ada alamat email valid yang ditemukan. Tempelkan daftar email yang dipisahkan baris baru atau koma.');
        return;
      }

      for (const email of validEmails) {
        entriesToSave.push({
          email,
          name: email.split('@')[0],
          role: 'operator',
        });
      }
    }

    setSaving(true);
    try {
      const updated = await addOperatorEmails(entriesToSave);
      setStaffList(updated);
      setSingleEmail('');
      setSingleName('');
      setBulkInput('');
      setFeedback(
        entriesToSave.length === 1
          ? `Akun ${entriesToSave[0].email} berhasil ditambahkan dan langsung bisa login.`
          : `${entriesToSave.length} akun operator berhasil ditambahkan secara bersamaan.`
      );
    } catch (err) {
      setError(formatReadableError(err, 'Gagal menambahkan akun operator.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(email: string) {
    if (email.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase()) {
      setError('Akun superadmin utama tidak dapat dihapus.');
      return;
    }

    if (!window.confirm(`Yakin ingin mencabut hak akses operator untuk ${email}? Pengguna ini tidak akan bisa login lagi ke dashboard.`)) {
      return;
    }

    setError(null);
    setFeedback(null);
    setDeletingEmail(email);
    try {
      const updated = await deleteOperatorEmail(email);
      setStaffList(updated);
      setFeedback(`Hak akses ${email} telah berhasil dicabut.`);
    } catch (err) {
      setError(formatReadableError(err, 'Gagal mencabut hak akses operator.'));
    } finally {
      setDeletingEmail(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-[#111827]">
          Kelola Akun Petugas Gerai
        </h1>
        <p className="text-sm text-slate-500">
          Daftarkan akun Google operator baru agar dapat langsung login mengelola antrean tanpa perlu membuka database Firebase.
        </p>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {error}
        </div>
      )}
      {feedback && (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{feedback}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form Tambah Operator (Kiri) */}
        <section className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-5">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center text-[#EA580C]">
              <UserPlus className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#111827]">Tambah Operator Baru</h2>
              <p className="text-xs text-slate-500">Akses langsung aktif saat akun disimpan</p>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setMode('single')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                mode === 'single' ? 'bg-white text-[#111827] shadow-xs' : 'text-slate-600 hover:text-[#111827]'
              }`}
            >
              Satu Akun
            </button>
            <button
              type="button"
              onClick={() => setMode('bulk')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                mode === 'bulk' ? 'bg-white text-[#111827] shadow-xs' : 'text-slate-600 hover:text-[#111827]'
              }`}
            >
              Banyak Akun (Bulk Paste)
            </button>
          </div>

          <form onSubmit={handleAddStaff} className="space-y-4">
            {mode === 'single' ? (
              <>
                <div>
                  <label htmlFor="staff-email-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Email Google Petugas <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="staff-email-input"
                    type="email"
                    value={singleEmail}
                    onChange={(e) => setSingleEmail(e.target.value)}
                    placeholder="nama.operator@gmail.com"
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-[#111827] placeholder:text-slate-400 focus:border-[#EA580C] focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    Gunakan email Google yang dipakai petugas saat klik tombol Google Sign-In.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="staff-name-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Nama / Catatan (Opsional)
                    </label>
                    <input
                      id="staff-name-input"
                      type="text"
                      value={singleName}
                      onChange={(e) => setSingleName(e.target.value)}
                      placeholder="Mis. Budi Kasir"
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-[#111827] placeholder:text-slate-400 focus:border-[#EA580C] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="staff-role-select" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Hak Akses
                    </label>
                    <select
                      id="staff-role-select"
                      value={singleRole}
                      onChange={(e) => setSingleRole(e.target.value as 'operator' | 'owner')}
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm text-[#111827] focus:border-[#EA580C] focus:outline-none"
                    >
                      <option value="operator">Operator (Petugas)</option>
                      <option value="owner">Admin (Owner)</option>
                    </select>
                  </div>
                </div>
              </>
            ) : (
              <div>
                <label htmlFor="bulk-emails-textarea" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tempelkan Daftar Email Google <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="bulk-emails-textarea"
                  rows={5}
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                  placeholder={"budi@gmail.com\nandi@gmail.com\nsiti@gmail.com"}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-xs text-[#111827] placeholder:text-slate-400 focus:border-[#EA580C] focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Dapat dipisahkan dengan baris baru (Enter), koma, atau spasi. Semua email akan ditambahkan sebagai Operator.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full min-h-[46px] px-5 py-2.5 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-semibold text-sm transition-colors disabled:opacity-60 cursor-pointer"
            >
              {saving ? 'Menyimpan...' : mode === 'single' ? 'Simpan & Beri Akses' : 'Simpan Semua Email Sekaligus'}
            </button>
          </form>
        </section>

        {/* Tabel Daftar Petugas (Kanan) */}
        <section className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-slate-500" aria-hidden="true" />
              <h2 className="text-base font-bold text-[#111827]">Daftar Operator Terdaftar</h2>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-50 text-[#C2410C] border border-orange-200">
              {staffList.length + 1} Akun
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-500">
                  <th className="py-3 px-4">Email Google</th>
                  <th className="py-3 px-3">Nama / Catatan</th>
                  <th className="py-3 px-3">Peran</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {/* Baris Superadmin Utama (Bootstrap) */}
                <tr className="bg-orange-50/30">
                  <td className="py-3.5 px-4">
                    <p className="font-semibold text-[#111827]">{BOOTSTRAPPED_ADMIN_EMAIL}</p>
                    <p className="text-[11px] text-slate-500">Superadmin Utama (Firebase Rules)</p>
                  </td>
                  <td className="py-3.5 px-3 text-slate-700 font-medium">Pemilik Gerai</td>
                  <td className="py-3.5 px-3">
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-800">
                      <ShieldCheck className="h-3 w-3 text-amber-600" />
                      Owner
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="text-xs font-medium text-slate-400">Permanen</span>
                  </td>
                </tr>

                {/* Operator Whitelist Rows */}
                {staffList.map((item) => (
                  <tr key={item.email} className="hover:bg-slate-50/60">
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-[#111827]">{item.email}</p>
                      <p className="text-[11px] text-slate-400">
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Baru'}
                      </p>
                    </td>
                    <td className="py-3.5 px-3 text-slate-700">{item.name}</td>
                    <td className="py-3.5 px-3">
                      <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${
                        item.role === 'owner'
                          ? 'bg-amber-50 border border-amber-200 text-amber-800'
                          : 'bg-blue-50 border border-blue-200 text-blue-800'
                      }`}>
                        <Shield className="h-3 w-3" />
                        {item.role === 'owner' ? 'Owner' : 'Operator'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        disabled={deletingEmail === item.email}
                        onClick={() => handleDelete(item.email)}
                        className="min-h-[32px] px-2.5 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold inline-flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer"
                        title="Cabut akses operator"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{deletingEmail === item.email ? 'Mencabut...' : 'Cabut'}</span>
                      </button>
                    </td>
                  </tr>
                ))}

                {staffList.length === 0 && !loading && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-xs text-slate-500">
                      Belum ada operator tambahan yang didaftarkan. Masukkan email di form sebelah kiri untuk menambahkan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
