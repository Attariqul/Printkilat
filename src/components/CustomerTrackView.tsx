import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Clock,
  RefreshCw,
  Search,
  Upload,
} from 'lucide-react';
import {
  formatFileSize,
  formatRupiah,
  getPaymentMethodLabel,
  getShortStatusLabel,
  getStatusStepIndex,
  ORDER_STEPS,
  type OrderDetail,
} from '../shared/printLogic';
import { trackOrder, uploadTransferProof } from '../utils/api';
import { PaymentStatusTag, StatusBadge } from './StatusBadge';

interface CustomerTrackViewProps {
  initialCode?: string;
  savedCodes: string[];
  onBack: () => void;
  onCodeFound: (code: string) => void;
}

export function CustomerTrackView({
  initialCode = '',
  savedCodes,
  onBack,
  onCodeFound,
}: CustomerTrackViewProps) {
  const [codeInput, setCodeInput] = useState(initialCode || savedCodes[0] || '');
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const proofInputRef = useRef<HTMLInputElement>(null);

  async function lookupCode(codeToFetch: string) {
    const clean = codeToFetch.trim().toUpperCase();
    if (!clean) {
      setError('Masukkan kode pelacakan pesanan (contoh: PK-TRK-DEMO0002).');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const found = await trackOrder(clean);
      setOrder(found);
      onCodeFound(found.trackingCode);
    } catch (err) {
      setOrder(null);
      setError(err instanceof Error ? err.message : 'Pesanan tidak ditemukan.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initialCode) {
      setCodeInput(initialCode);
      void lookupCode(initialCode);
    } else if (savedCodes[0]) {
      setCodeInput(savedCodes[0]);
      void lookupCode(savedCodes[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void lookupCode(codeInput);
  }

  async function handleProofUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !order) return;
    setUploadingProof(true);
    setError(null);
    try {
      const updated = await uploadTransferProof(order.trackingCode, file);
      setOrder(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengunggah bukti transfer.');
    } finally {
      setUploadingProof(false);
    }
  }

  const currentStepIdx = order ? getStatusStepIndex(order.status) : -1;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 pt-6 pb-12 space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Kembali ke beranda"
          className="min-h-[44px] min-w-[44px] rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-700 cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#111827]">
            Lacak Status Pesanan
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Pantau progres cetak secara real-time menggunakan kode rahasia pelacakan.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-3"
      >
        <label htmlFor="tracking-code-input" className="block text-sm font-semibold text-[#111827]">
          Kode Pelacakan (PK-TRK-XXXXXXXX)
        </label>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search
              className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="tracking-code-input"
              type="text"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              placeholder="PK-TRK-XXXXXXXX"
              className="w-full min-h-[46px] pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 font-mono text-sm font-semibold text-[#111827] placeholder:text-slate-400 focus:border-[#EA580C] focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="min-h-[46px] px-6 py-2.5 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-semibold text-sm whitespace-nowrap shrink-0 transition-colors disabled:opacity-60 cursor-pointer"
          >
            {loading ? 'Mencari...' : 'Lacak Pesanan'}
          </button>
        </div>

        {/* Saved / Demo Tracking Code Quick Selectors */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-slate-500">Tersimpan / Contoh:</span>
          {Array.from(new Set([...savedCodes, 'PK-TRK-DEMO0001', 'PK-TRK-DEMO0002', 'PK-TRK-DEMO0003']))
            .slice(0, 4)
            .map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => {
                  setCodeInput(code);
                  void lookupCode(code);
                }}
                className="min-h-[32px] px-2.5 py-1 rounded-lg bg-[#FEFBE8] border border-[#FDE68A] hover:border-orange-400 font-mono font-semibold text-[#111827] cursor-pointer"
              >
                {code}
              </button>
            ))}
        </div>
      </form>

      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800"
        >
          {error}
        </div>
      )}

      {/* Tracking Result */}
      {order && (
        <div className="space-y-5">
          {/* Header Card & Stepper */}
          <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
              <div>
                <p className="text-xs font-semibold text-slate-500">Nomor Antrean Gerai</p>
                <div className="mt-1 flex items-center gap-3 flex-wrap">
                  <h2 className="font-mono text-2xl sm:text-3xl font-extrabold text-[#111827] tabular-nums">
                    {order.queueNumber}
                  </h2>
                  <StatusBadge status={order.status} />
                </div>
                <p className="mt-1 text-xs font-mono text-slate-500">
                  Kode Lacak: {order.trackingCode}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void lookupCode(order.trackingCode)}
                className="min-h-[42px] px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-2 self-start sm:self-center cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
                <span>Segarkan status</span>
              </button>
            </div>

            {order.status === 'rejected' ? (
              <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="text-sm text-red-900">
                  <p className="font-bold">Pesanan Ditolak Operator</p>
                  <p className="mt-1">
                    Alasan: {order.rejectionReason || 'Berkas tidak dapat diproses oleh mesin gerai.'}
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-4">Progres Pengerjaan</p>
                <ol className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                  {ORDER_STEPS.map((step, idx) => {
                    const isDone = idx < currentStepIdx;
                    const isCurrent = idx === currentStepIdx;
                    return (
                      <li
                        key={step}
                        className={`rounded-xl border p-3 transition-colors ${
                          isCurrent
                            ? 'bg-[#FEFBE8] border-[#EA580C]'
                            : isDone
                            ? 'bg-orange-50/60 border-orange-200'
                            : 'bg-slate-50/70 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                              isDone
                                ? 'bg-[#EA580C] text-white'
                                : isCurrent
                                ? 'bg-[#F97316] text-white'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {isDone ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : idx + 1}
                          </span>
                          <span
                            className={`text-xs font-bold ${
                              isCurrent || isDone ? 'text-[#111827]' : 'text-slate-500'
                            }`}
                          >
                            {getShortStatusLabel(step)}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}

            {order.status === 'ready' && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-900 font-medium">
                Dokumenmu sudah selesai dicetak dan siap diambil di meja gerai! Sebutkan nomor antrean{' '}
                <span className="font-mono font-bold">{order.queueNumber}</span> kepada petugas.
              </div>
            )}
          </section>

          {/* Detail & Payment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <h3 className="text-sm font-bold text-[#111827]">Rincian Dokumen</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Nama file</dt>
                  <dd className="font-medium text-[#111827] truncate">{order.file.originalName}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Ukuran</dt>
                  <dd className="font-mono text-[#111827]">{formatFileSize(order.file.fileSizeBytes)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Spesifikasi</dt>
                  <dd className="font-medium text-[#111827] text-right">
                    {order.item.printTariffName} · {order.item.pageCount} hlm · {order.item.copies} rangkap
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Jilid</dt>
                  <dd className="font-medium text-[#111827]">{order.item.bindTariffName}</dd>
                </div>
                {order.notes && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Catatan</dt>
                    <dd className="font-medium text-[#111827] text-right">{order.notes}</dd>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-100 flex justify-between gap-3">
                  <dt className="font-bold text-[#111827]">Total Biaya</dt>
                  <dd className="font-mono font-extrabold text-base text-[#C2410C] tabular-nums">
                    {formatRupiah(order.totalAmount)}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-[#111827]">Pembayaran &amp; Retensi</h3>
                <PaymentStatusTag status={order.payment.status} />
              </div>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Metode</dt>
                  <dd className="font-medium text-[#111827]">
                    {getPaymentMethodLabel(order.payment.method)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Bukti transfer</dt>
                  <dd className="font-medium text-[#111827]">
                    {order.payment.hasProof ? order.payment.proofOriginalName : 'Belum diunggah'}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Hapus file otomatis</dt>
                  <dd className="font-mono text-xs text-slate-600">
                    {new Date(order.fileExpiresAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </dd>
                </div>
              </dl>

              {order.payment.method === 'transfer' && order.payment.status !== 'paid' && (
                <div className="pt-2">
                  <input
                    ref={proofInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleProofUpload}
                    className="sr-only"
                  />
                  <button
                    type="button"
                    disabled={uploadingProof}
                    onClick={() => proofInputRef.current?.click()}
                    className="w-full min-h-[42px] px-4 py-2 rounded-xl border border-[#EA580C] text-[#C2410C] hover:bg-orange-50 text-xs font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Upload className="h-4 w-4" aria-hidden="true" />
                    <span>
                      {uploadingProof
                        ? 'Mengunggah...'
                        : order.payment.hasProof
                        ? 'Ganti bukti transfer'
                        : 'Unggah bukti transfer'}
                    </span>
                  </button>
                </div>
              )}

              {/* Activity log */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <p className="text-xs font-semibold text-slate-500">Log Aktivitas</p>
                <ul className="space-y-1.5 text-xs text-slate-600">
                  {order.statusLogs.map((log) => (
                    <li key={log.id} className="flex items-start gap-2">
                      <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>
                        <strong className="text-[#111827]">{getShortStatusLabel(log.toStatus)}</strong>
                        {log.note ? ` — ${log.note}` : ''} ·{' '}
                        <span className="font-mono text-slate-400">
                          {new Date(log.createdAt).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
