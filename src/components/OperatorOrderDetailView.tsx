import { useEffect, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileText,
} from 'lucide-react';
import {
  ALLOWED_TRANSITIONS,
  formatFileSize,
  formatRupiah,
  getPaymentMethodLabel,
  getStatusLabel,
  type OrderDetail,
  type OrderStatus,
} from '../shared/printLogic';
import { markOperatorOrderPaid, updateOperatorOrderStatus } from '../utils/api';
import { PaymentStatusTag, StatusBadge } from './StatusBadge';

interface OperatorOrderDetailViewProps {
  order: OrderDetail;
  onBack: () => void;
  onOrderUpdated: (updated: OrderDetail) => void;
}

export function OperatorOrderDetailView({
  order,
  onBack,
  onOrderUpdated,
}: OperatorOrderDetailViewProps) {
  const nextOptions = ALLOWED_TRANSITIONS[order.status].filter((s) => s !== 'rejected');
  const canReject = ALLOWED_TRANSITIONS[order.status].includes('rejected');

  const [selectedNextStatus, setSelectedNextStatus] = useState<OrderStatus | ''>(
    nextOptions[0] ?? ''
  );
  const [rejectionReason, setRejectionReason] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const valid = ALLOWED_TRANSITIONS[order.status].filter((s) => s !== 'rejected');
    setSelectedNextStatus(valid[0] ?? '');
    setRejectionReason('');
  }, [order.id, order.status]);

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
      setError(err instanceof Error ? err.message : 'Gagal memperbarui status.');
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
      setError(err instanceof Error ? err.message : 'Gagal menolak pesanan.');
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
      setError(err instanceof Error ? err.message : 'Gagal memperbarui status pembayaran.');
    } finally {
      setSavingPayment(false);
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
              <a
                href={`/api/operator/orders/${order.id}/file`}
                download={order.file.originalName}
                className="min-h-[44px] px-4 py-2.5 rounded-xl border border-[#EA580C] bg-white hover:bg-orange-50 text-sm font-semibold text-[#C2410C] inline-flex items-center gap-2 transition-colors"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                <span>Unduh file</span>
              </a>
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

            {order.payment.method === 'transfer' && (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 flex items-center justify-center min-h-[120px]">
                {order.payment.hasProof ? (
                  <img
                    src={`/api/operator/orders/${order.id}/proof`}
                    alt={`Bukti transfer ${order.queueNumber}`}
                    className="max-h-52 w-auto rounded-lg object-contain"
                  />
                ) : (
                  <div className="text-center text-xs text-slate-500 py-4 space-y-1">
                    <FileText className="h-6 w-6 mx-auto text-slate-400" aria-hidden="true" />
                    <p>Pratinjau bukti transfer belum diunggah pelanggan</p>
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
    </div>
  );
}
