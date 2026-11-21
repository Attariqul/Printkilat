import { useEffect, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileText,
  Maximize2,
  X,
} from 'lucide-react';
import {
  ALLOWED_TRANSITIONS,
  formatFileSize,
  formatRupiah,
  getPaymentMethodLabel,
  getStatusLabel,
  requiresPaymentProof,
  type OrderDetail,
  type OrderStatus,
} from '../shared/printLogic';
import {
  ApiError,
  downloadOperatorOrderFile,
  fetchOperatorProofDetail,
  formatReadableError,
  markOperatorOrderPaid,
  updateOperatorOrderStatus,
  type OperatorProofDetail,
} from '../utils/api';
import { PaymentStatusTag, StatusBadge } from './StatusBadge';

interface OperatorOrderDetailViewProps {
  order: OrderDetail;
  onBack: () => void;
  onOrderUpdated: (updated: OrderDetail) => void;
  onSessionExpired: () => void;
}

export function OperatorOrderDetailView({
  order,
  onBack,
  onOrderUpdated,
  onSessionExpired,
}: OperatorOrderDetailViewProps) {
  const nextOptions = ALLOWED_TRANSITIONS[order.status].filter((s) => s !== 'rejected');
  const canReject = ALLOWED_TRANSITIONS[order.status].includes('rejected');

  const [selectedNextStatus, setSelectedNextStatus] = useState<OrderStatus | ''>(
    nextOptions[0] ?? ''
  );
  const [rejectionReason, setRejectionReason] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [downloadingFile, setDownloadingFile] = useState(false);
  const [proofDetail, setProofDetail] = useState<OperatorProofDetail | null>(null);
  const [loadingProof, setLoadingProof] = useState(false);
  const [proofError, setProofError] = useState<string | null>(null);
  const [showProofLightbox, setShowProofLightbox] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const valid = ALLOWED_TRANSITIONS[order.status].filter((s) => s !== 'rejected');
    setSelectedNextStatus(valid[0] ?? '');
    setRejectionReason('');
  }, [order.id, order.status]);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    setProofDetail(null);
    setProofError(null);
    setShowProofLightbox(false);

    if (order.payment.hasProof) {
      setLoadingProof(true);
      void fetchOperatorProofDetail(order.id)
        .then((detail) => {
          if (!active) {
            URL.revokeObjectURL(detail.blobUrl);
            return;
          }
          objectUrl = detail.blobUrl;
          setProofDetail(detail);
        })
        .catch((err) => {
          if (!active) return;
          if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
            onSessionExpired();
            return;
          }
          setProofError(formatReadableError(err, 'Gagal memuat pratinjau bukti pembayaran.'));
        })
        .finally(() => {
          if (active) setLoadingProof(false);
        });
    } else {
      setLoadingProof(false);
    }

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [order.id, order.payment.method, order.payment.hasProof, onSessionExpired]);

  async function handleStatusSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedNextStatus) return;
    setError(null);
    setFeedback(null);
    setSavingStatus(true);
    try {
      const updated = await updateOperatorOrderStatus(order.id, {
        status: selectedNextStatus,
      });
      onOrderUpdated(updated);
      setFeedback(`Status diperbarui menjadi ${getStatusLabel(updated.status)}.`);
    } catch (err) {
      setError(formatReadableError(err, 'Gagal memperbarui status.'));
    } finally {
      setSavingStatus(false);
    }
  }

  async function handleRejectOrder() {
    setError(null);
    setFeedback(null);
    if (rejectionReason.trim().length < 3) {
      setError('Alasan penolakan wajib diisi minimal 3 karakter.');
      return;
    }
    setSavingStatus(true);
    try {
      const updated = await updateOperatorOrderStatus(order.id, {
        status: 'rejected',
        rejectionReason: rejectionReason.trim(),
      });
      onOrderUpdated(updated);
      setFeedback('Pesanan ditolak dan alasan telah dicatat.');
    } catch (err) {
      setError(formatReadableError(err, 'Gagal menolak pesanan.'));
    } finally {
      setSavingStatus(false);
    }
  }

  async function handleMarkPaid() {
    setError(null);
    setFeedback(null);
    setSavingPayment(true);
    try {
      const updated = await markOperatorOrderPaid(order.id);
      onOrderUpdated(updated);
      setFeedback('Pembayaran ditandai Lunas.');
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        onSessionExpired();
        return;
      }
      setError(formatReadableError(err, 'Gagal memperbarui status pembayaran.'));
    } finally {
      setSavingPayment(false);
    }
  }

  async function handleDownloadFile() {
    setError(null);
    setDownloadingFile(true);
    try {
      await downloadOperatorOrderFile(order.id, order.file.originalName);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        onSessionExpired();
        return;
      }
      setError(formatReadableError(err, 'Gagal mengunduh berkas.'));
    } finally {
      setDownloadingFile(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Breadcrumb Back + Title */}
      <div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#C2410C] hover:underline py-1 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Kembali ke antrean</span>
        </button>

        <div className="mt-2 flex items-center gap-3 flex-wrap">
          <h1 className="font-mono text-2xl sm:text-3xl font-extrabold text-[#111827] tabular-nums">
            {order.queueNumber}
          </h1>
          <StatusBadge status={order.status} />
          <span className="text-xs font-mono text-slate-500">
            Kode Lacak: {order.trackingCode}
          </span>
        </div>
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
        {/* Left Details Column */}
        <div className="lg:col-span-6 space-y-4">
          <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
            <dl className="divide-y divide-slate-100 text-sm">
              <div className="py-3 first:pt-0 flex justify-between gap-4">
                <dt className="text-slate-500">Pelanggan</dt>
                <dd className="font-semibold text-[#111827] text-right">
                  {order.customerName}
                  {order.customerPhone ? ` · ${order.customerPhone}` : ''}
                </dd>
              </div>
              <div className="py-3 flex justify-between gap-4">
                <dt className="text-slate-500">File</dt>
                <dd className="font-semibold text-[#111827] text-right break-all">
                  {order.file.originalName} · {formatFileSize(order.file.fileSizeBytes)}
                </dd>
              </div>
              <div className="py-3 flex justify-between gap-4">
                <dt className="text-slate-500">Spesifikasi</dt>
                <dd className="font-semibold text-[#111827] text-right">
                  {order.item.colorMode || order.item.printTariffName} {order.item.paperSize ?? ''} ·{' '}
                  {order.item.pageCount} hlm · {order.item.copies} rangkap
                </dd>
              </div>
              <div className="py-3 flex justify-between gap-4">
                <dt className="text-slate-500">Jilid</dt>
                <dd className="font-semibold text-[#111827] text-right">{order.item.bindTariffName}</dd>
              </div>
              <div className="py-3 flex justify-between gap-4">
                <dt className="text-slate-500">Catatan</dt>
                <dd className="font-semibold text-[#111827] text-right">{order.notes || '—'}</dd>
              </div>
              <div className="py-3 last:pb-0 flex justify-between items-baseline gap-4">
                <dt className="font-bold text-[#111827]">Total</dt>
                <dd className="font-mono text-xl font-extrabold text-[#C2410C] tabular-nums">
                  {formatRupiah(order.totalAmount)}
                </dd>
              </div>
            </dl>
          </section>

          <div className="flex flex-wrap items-center gap-3">
            {order.file.deletedAt ? (
              <span className="text-xs font-medium text-slate-500">
                Berkas telah dihapus otomatis sesuai retensi 7 hari.
              </span>
            ) : (
              <button
                type="button"
                disabled={downloadingFile}
                onClick={handleDownloadFile}
                className="min-h-[44px] px-4 py-2.5 rounded-xl border border-[#EA580C] bg-white hover:bg-orange-50 text-sm font-semibold text-[#C2410C] inline-flex items-center gap-2 transition-colors disabled:opacity-60 cursor-pointer"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                <span>{downloadingFile ? 'Mengunduh...' : 'Unduh file'}</span>
              </button>
            )}
          </div>

          <div className="rounded-xl bg-[#FEFBE8] border border-[#FDE68A] p-3.5 text-xs font-medium text-amber-950 flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-[#D97706] shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              Cocokkan jumlah halaman pada file ({order.file.detectedPages ?? order.item.pageCount} hlm terdeteksi) dengan pesanan sebelum mengubah status ke Sedang Dicetak.
            </span>
          </div>
        </div>

        {/* Right Actions Column */}
        <div className="lg:col-span-6 space-y-5">
          {/* Payment Card */}
          <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-bold text-[#111827]">Pembayaran</h2>
              <PaymentStatusTag status={order.payment.status} />
            </div>

            <p className="text-sm text-slate-600">
              Metode: <span className="font-semibold text-[#111827]">{getPaymentMethodLabel(order.payment.method)}</span>
            </p>

            {(requiresPaymentProof(order.payment.method) || order.payment.hasProof) && (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 space-y-3">
                {order.payment.hasProof ? (
                  loadingProof ? (
                    <div className="min-h-[120px] flex items-center justify-center">
                      <p className="text-xs text-slate-500">Memuat pratinjau bukti pembayaran...</p>
                    </div>
                  ) : proofError ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
                      {proofError}
                    </div>
                  ) : proofDetail ? (
                    <div className="space-y-3">
                      <div className="flex justify-center bg-white rounded-lg border border-slate-200 p-2">
                        <img
                          src={proofDetail.blobUrl}
                          alt={`Bukti pembayaran ${order.queueNumber}`}
                          className="max-h-64 w-auto rounded object-contain"
                        />
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-medium text-slate-600 truncate max-w-[200px]">
                          {proofDetail.originalName}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setShowProofLightbox(true)}
                            className="min-h-[34px] px-3 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-[#111827] inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Perbesar</span>
                          </button>
                          <a
                            href={proofDetail.blobUrl}
                            download={proofDetail.originalName}
                            className="min-h-[34px] px-3 py-1 rounded-lg border border-[#EA580C] bg-white hover:bg-orange-50 text-xs font-semibold text-[#C2410C] inline-flex items-center gap-1.5"
                          >
                            <Download className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Unduh Bukti</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  ) : null
                ) : (
                  <div className="text-center text-xs text-slate-500 py-6 space-y-1">
                    <FileText className="h-6 w-6 mx-auto text-slate-400" aria-hidden="true" />
                    <p>Pratinjau bukti pembayaran belum diunggah pelanggan</p>
                  </div>
                )}
              </div>
            )}

            {order.payment.status !== 'paid' ? (
              <button
                type="button"
                disabled={savingPayment}
                onClick={handleMarkPaid}
                className="w-full min-h-[46px] px-5 py-2.5 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-semibold text-sm transition-colors disabled:opacity-60 cursor-pointer"
              >
                {savingPayment ? 'Memproses...' : 'Tandai lunas'}
              </button>
            ) : (
              <p className="text-xs font-semibold text-emerald-700">
                Pembayaran sudah terverifikasi lunas.
              </p>
            )}
          </section>

          {/* Status Transition Card */}
          <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4">
            <h2 className="text-base font-bold text-[#111827]">Ubah status</h2>

            {nextOptions.length > 0 ? (
              <form onSubmit={handleStatusSubmit} className="space-y-3">
                <label htmlFor="next-status-select" className="block text-xs font-semibold text-slate-600">
                  Status berikutnya
                </label>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <select
                    id="next-status-select"
                    value={selectedNextStatus}
                    onChange={(e) => setSelectedNextStatus(e.target.value as OrderStatus)}
                    className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm font-medium text-[#111827] focus:border-[#EA580C] focus:outline-none"
                  >
                    {nextOptions.map((st) => (
                      <option key={st} value={st}>
                        {getStatusLabel(st)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={savingStatus}
                    className="min-h-[44px] px-5 py-2 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-semibold text-sm whitespace-nowrap shrink-0 transition-colors disabled:opacity-60 cursor-pointer"
                  >
                    {savingStatus ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </form>
            ) : (
              <p className="text-sm text-slate-600">
                Pesanan berada pada status akhir (<span className="font-semibold text-[#111827]">{getStatusLabel(order.status)}</span>).
              </p>
            )}

            {canReject && (
              <div className="pt-4 border-t border-slate-100 space-y-2.5">
                <label htmlFor="rejection-reason-input" className="block text-xs font-semibold text-slate-600">
                  Alasan penolakan (wajib jika ditolak)
                </label>
                <input
                  id="rejection-reason-input"
                  type="text"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Contoh: file rusak atau tidak terbaca"
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-[#111827] placeholder:text-slate-400 focus:border-red-500 focus:outline-none"
                />
                <button
                  type="button"
                  disabled={savingStatus}
                  onClick={handleRejectOrder}
                  className="min-h-[42px] px-4 py-2 rounded-xl border border-red-300 text-red-700 hover:bg-red-50 font-semibold text-sm transition-colors disabled:opacity-60 cursor-pointer"
                >
                  Tolak pesanan
                </button>
              </div>
            )}

            {order.status === 'rejected' && order.rejectionReason && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-800">
                <span className="font-bold">Alasan ditolak:</span> {order.rejectionReason}
              </div>
            )}
          </section>
        </div>
      </div>

      {showProofLightbox && proofDetail && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="proof-lightbox-title"
          onClick={() => setShowProofLightbox(false)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full p-4 sm:p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 id="proof-lightbox-title" className="text-sm sm:text-base font-bold text-[#111827]">
                  Bukti Pembayaran · {order.queueNumber}
                </h3>
                <p className="text-xs text-slate-500 truncate">{proofDetail.originalName}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowProofLightbox(false)}
                aria-label="Tutup pratinjau bukti pembayaran"
                className="min-h-[38px] min-w-[38px] rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-2 flex items-center justify-center max-h-[75vh] overflow-auto">
              <img
                src={proofDetail.blobUrl}
                alt={`Bukti pembayaran ${order.queueNumber}`}
                className="max-h-[70vh] w-auto rounded object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
