import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  FileText,
  Minus,
  Plus,
  QrCode,
  ShieldCheck,
  UploadCloud,
} from 'lucide-react';
import {
  calculateOrderTotal,
  formatFileSize,
  formatRupiah,
  validateUploadMeta,
  type OrderDetail,
  type PaymentMethod,
  type ServiceTariff,
} from '../shared/printLogic';
import { createOrder, detectPdfPagesInBrowser } from '../utils/api';

interface CreateOrderViewProps {
  tariffs: ServiceTariff[];
  onBack: () => void;
  onOrderCreated: (order: OrderDetail) => void;
  onTrackOrder: (trackingCode: string) => void;
}

export function CreateOrderView({
  tariffs,
  onBack,
  onOrderCreated,
  onTrackOrder,
}: CreateOrderViewProps) {
  const printTariffs = useMemo(
    () => tariffs.filter((t) => t.category === 'cetak' && t.isActive),
    [tariffs]
  );
  const bindTariffs = useMemo(
    () => tariffs.filter((t) => t.category === 'jilid' && t.isActive),
    [tariffs]
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const proofInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [detectedPages, setDetectedPages] = useState<number | null>(null);
  const [printTariffId, setPrintTariffId] = useState<number>(() => printTariffs[0]?.id ?? 0);
  const [bindTariffId, setBindTariffId] = useState<number>(() => bindTariffs[0]?.id ?? 0);
  const [pageCount, setPageCount] = useState<number>(1);
  const [copies, setCopies] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [proofFile, setProofFile] = useState<File | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [createdOrder, setCreatedOrder] = useState<OrderDetail | null>(null);
  const [copiedKey, setCopiedKey] = useState<'queue' | 'track' | null>(null);

  const activePrintTariff =
    printTariffs.find((t) => t.id === printTariffId) ?? printTariffs[0];
  const activeBindTariff =
    bindTariffs.find((t) => t.id === bindTariffId) ?? bindTariffs[0];

  const pricing = useMemo(() => {
    try {
      return calculateOrderTotal({
        printRate: activePrintTariff?.price ?? 0,
        pages: Math.max(1, pageCount || 1),
        copies: Math.max(1, copies || 1),
        bindRate: activeBindTariff?.price ?? 0,
      });
    } catch {
      return { printSubtotal: 0, bindSubtotal: 0, total: 0 };
    }
  }, [activePrintTariff, activeBindTariff, pageCount, copies]);

  async function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateUploadMeta(file.name, file.size);
    if (!validation.ok) {
      setError(validation.error ?? 'Berkas tidak valid.');
      setSelectedFile(null);
      setDetectedPages(null);
      return;
    }

    setSelectedFile(file);
    const pages = await detectPdfPagesInBrowser(file);
    setDetectedPages(pages);
    if (pages && pages > 0) {
      setPageCount(pages);
    }
  }

  function handleProofSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setProofFile(file);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selectedFile) {
      setError('Silakan unggah berkas dokumen (PDF, DOC, atau DOCX) terlebih dahulu.');
      return;
    }
    if (!activePrintTariff) {
      setError('Layanan cetak tidak tersedia.');
      return;
    }
    if (!Number.isInteger(pageCount) || pageCount < 1) {
      setError('Jumlah halaman minimal 1.');
      return;
    }
    if (!Number.isInteger(copies) || copies < 1) {
      setError('Jumlah rangkap minimal 1.');
      return;
    }

    const fd = new FormData();
    fd.append('file', selectedFile);
    fd.append('printTariffId', String(activePrintTariff.id));
    if (activeBindTariff) {
      fd.append('bindTariffId', String(activeBindTariff.id));
    }
    fd.append('pageCount', String(pageCount));
    fd.append('copies', String(copies));
    fd.append('paymentMethod', paymentMethod);
    fd.append('notes', notes.trim());
    fd.append('customerName', customerName.trim());
    fd.append('customerPhone', customerPhone.trim());
    if (paymentMethod === 'transfer' && proofFile) {
      fd.append('payment_proof', proofFile);
    }

    setSubmitting(true);
    try {
      const order = await createOrder(fd);
      setCreatedOrder(order);
      onOrderCreated(order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim pesanan.');
    } finally {
      setSubmitting(false);
    }
  }

  function copyText(text: string, key: 'queue' | 'track') {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  }

  if (createdOrder) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-white rounded-2xl border border-orange-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-6 w-6 text-emerald-700" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#111827]">
                Pesanan berhasil dikirim!
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Simpan kode pelacakan rahasia di bawah untuk memantau progres cetak tanpa perlu login.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl bg-[#FEFBE8] border border-[#FDE68A] p-4">
              <p className="text-xs font-semibold text-amber-900">Nomor Antrean Gerai</p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="font-mono text-xl font-bold text-[#111827] tabular-nums">
                  {createdOrder.queueNumber}
                </span>
                <button
                  type="button"
                  onClick={() => copyText(createdOrder.queueNumber, 'queue')}
                  aria-label="Salin nomor antrean"
                  className="min-h-[36px] min-w-[36px] rounded-lg border border-amber-300 bg-white flex items-center justify-center text-slate-700 hover:bg-amber-50 cursor-pointer"
                >
                  {copiedKey === 'queue' ? <Check className="h-4 w-4 text-emerald-700" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-600">Sebutkan nomor ini saat mengambil di kasir.</p>
            </div>

            <div className="rounded-xl bg-orange-50 border border-orange-200 p-4">
              <p className="text-xs font-semibold text-[#C2410C]">Kode Pelacakan Rahasia</p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="font-mono text-lg font-bold text-[#111827] tabular-nums">
                  {createdOrder.trackingCode}
                </span>
                <button
                  type="button"
                  onClick={() => copyText(createdOrder.trackingCode, 'track')}
                  aria-label="Salin kode pelacakan"
                  className="min-h-[36px] min-w-[36px] rounded-lg border border-orange-300 bg-white flex items-center justify-center text-slate-700 hover:bg-orange-100 cursor-pointer"
                >
                  {copiedKey === 'track' ? <Check className="h-4 w-4 text-emerald-700" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-600">Otomatis tersimpan di riwayat perangkat ini.</p>
            </div>
          </div>

          <dl className="border-t border-b border-slate-100 py-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Berkas</dt>
              <dd className="font-medium text-[#111827] truncate">{createdOrder.file.originalName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Spesifikasi</dt>
              <dd className="font-medium text-[#111827]">
                {createdOrder.item.printTariffName} · {createdOrder.item.pageCount} hlm · {createdOrder.item.copies} rangkap
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Jilid</dt>
              <dd className="font-medium text-[#111827]">{createdOrder.item.bindTariffName}</dd>
            </div>
            <div className="flex justify-between gap-4 pt-2 border-t border-slate-100">
              <dt className="font-semibold text-[#111827]">Total Estimasi</dt>
              <dd className="font-bold text-lg text-[#C2410C] tabular-nums">
                {formatRupiah(createdOrder.totalAmount)}
              </dd>
            </div>
          </dl>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => onTrackOrder(createdOrder.trackingCode)}
              className="flex-1 min-h-[48px] px-5 py-3 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-semibold text-sm transition-colors cursor-pointer"
            >
              Pantau Status Sekarang
            </button>
            <button
              type="button"
              onClick={onBack}
              className="min-h-[48px] px-5 py-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-sm font-semibold text-slate-700 transition-colors cursor-pointer"
            >
              Kembali ke Beranda
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-6xl mx-auto px-4 sm:px-8 pt-6 pb-8">
      {/* Sub-header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={onBack}
          aria-label="Kembali ke beranda"
          className="min-h-[44px] min-w-[44px] rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-700 cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#111827]">Buat Pesanan</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Unggah dokumen dan atur spesifikasi cetakmu.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Form Column */}
        <div className="lg:col-span-7 space-y-5 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
          {/* File Upload Dropzone */}
          <div>
            <label htmlFor="document-upload" className="block text-sm font-semibold text-[#111827] mb-2">
              Dokumen Cetak
            </label>
            <input
              ref={fileInputRef}
              id="document-upload"
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileSelect}
              className="sr-only"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`w-full min-h-[96px] rounded-xl border-2 border-dashed p-4 text-left flex items-center gap-4 transition-colors cursor-pointer ${
                selectedFile
                  ? 'border-[#EA580C] bg-[#FEFBE8]'
                  : 'border-orange-300 bg-orange-50/40 hover:bg-orange-50'
              }`}
            >
              <div className="h-12 w-12 rounded-xl bg-white border border-orange-200 flex items-center justify-center shrink-0 text-[#EA580C]">
                {selectedFile ? <FileText className="h-6 w-6" /> : <UploadCloud className="h-6 w-6" />}
              </div>
              <div className="min-w-0 flex-1">
                {selectedFile ? (
                  <>
                    <p className="text-sm font-bold text-[#111827] truncate">{selectedFile.name}</p>
                    <p className="mt-0.5 text-xs text-slate-600">
                      {detectedPages ? `${detectedPages} halaman terdeteksi · ` : ''}
                      {formatFileSize(selectedFile.size)} · ketuk untuk ganti
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-bold text-[#111827]">Pilih atau unggah dokumen</p>
                    <p className="mt-0.5 text-xs text-slate-500">PDF, DOC, DOCX · maks. 20 MB</p>
                  </>
                )}
              </div>
            </button>
          </div>

          {/* Jenis Cetak */}
          <div>
            <label htmlFor="print-type-select" className="block text-sm font-semibold text-[#111827] mb-1.5">
              Jenis cetak
            </label>
            <select
              id="print-type-select"
              value={activePrintTariff?.id ?? ''}
              onChange={(e) => setPrintTariffId(Number(e.target.value))}
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium text-[#111827] focus:border-[#EA580C] focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            >
              {printTariffs.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} · {formatRupiah(t.price)}/halaman
                </option>
              ))}
            </select>
          </div>

          {/* Halaman & Rangkap Stepper */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="page-count-input" className="block text-sm font-semibold text-[#111827] mb-1.5">
                Halaman {detectedPages ? '(otomatis)' : ''}
              </label>
              <input
                id="page-count-input"
                type="number"
                min={1}
                max={2000}
                value={pageCount}
                onChange={(e) => setPageCount(Math.max(1, Number.parseInt(e.target.value || '1', 10) || 1))}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold font-mono tabular-nums text-[#111827] focus:border-[#EA580C] focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>

            <div>
              <span id="copies-label" className="block text-sm font-semibold text-[#111827] mb-1.5">
                Rangkap
              </span>
              <div className="flex items-center gap-2" role="group" aria-labelledby="copies-label">
                <button
                  type="button"
                  aria-label="Kurangi rangkap"
                  onClick={() => setCopies((c) => Math.max(1, c - 1))}
                  className="min-h-[44px] min-w-[44px] rounded-xl border border-slate-300 bg-white hover:bg-slate-50 flex items-center justify-center text-[#111827] cursor-pointer"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <div className="flex-1 min-h-[44px] rounded-xl border border-slate-300 bg-slate-50 flex items-center justify-center font-mono font-bold text-sm tabular-nums text-[#111827]">
                  {copies}
                </div>
                <button
                  type="button"
                  aria-label="Tambah rangkap"
                  onClick={() => setCopies((c) => Math.min(200, c + 1))}
                  className="min-h-[44px] min-w-[44px] rounded-xl border border-slate-300 bg-white hover:bg-slate-50 flex items-center justify-center text-[#111827] cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Jilid */}
          <div>
            <label htmlFor="bind-type-select" className="block text-sm font-semibold text-[#111827] mb-1.5">
              Jilid
            </label>
            <select
              id="bind-type-select"
              value={activeBindTariff?.id ?? ''}
              onChange={(e) => setBindTariffId(Number(e.target.value))}
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium text-[#111827] focus:border-[#EA580C] focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            >
              {bindTariffs.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} · {formatRupiah(t.price)}
                </option>
              ))}
            </select>
          </div>

          {/* Catatan untuk operator */}
          <div>
            <label htmlFor="order-notes" className="block text-sm font-semibold text-[#111827] mb-1.5">
              Catatan untuk operator
            </label>
            <input
              id="order-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Cetak bolak-balik, sampul mika bening"
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-[#111827] placeholder:text-slate-400 focus:border-[#EA580C] focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
          </div>

          {/* Identitas Opsional */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label htmlFor="guest-name" className="block text-xs font-semibold text-slate-600 mb-1">
                Nama panggilan (opsional)
              </label>
              <input
                id="guest-name"
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Mis. Andi"
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-[#111827] focus:border-[#EA580C] focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="guest-phone" className="block text-xs font-semibold text-slate-600 mb-1">
                No. WhatsApp (opsional)
              </label>
              <input
                id="guest-phone"
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="08xx-xxxx-xxxx"
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-[#111827] focus:border-[#EA580C] focus:outline-none"
              />
            </div>
          </div>

          {/* Pembayaran */}
          <div>
            <span className="block text-sm font-semibold text-[#111827] mb-2">Pembayaran</span>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`min-h-[46px] px-4 py-2.5 rounded-xl font-semibold text-sm border transition-colors cursor-pointer ${
                  paymentMethod === 'cash'
                    ? 'bg-[#EA580C] border-[#EA580C] text-white'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Tunai di tempat
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('transfer')}
                className={`min-h-[46px] px-4 py-2.5 rounded-xl font-semibold text-sm border transition-colors cursor-pointer ${
                  paymentMethod === 'transfer'
                    ? 'bg-[#EA580C] border-[#EA580C] text-white'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Transfer / QRIS
              </button>
            </div>

            {paymentMethod === 'transfer' && (
              <div className="mt-3 rounded-xl bg-[#FEFBE8] border border-[#FDE68A] p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <QrCode className="h-5 w-5 text-[#C2410C] shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="text-xs text-slate-700 space-y-1">
                    <p className="font-semibold text-[#111827]">Rekening / QRIS Gerai PrintKilat</p>
                    <p>BCA 7710-4429-18 a.n. Gerai Fotokopi Kampus</p>
                    <p className="text-slate-500">Bukti transfer dapat diunggah sekarang atau menyusul lewat halaman Lacak.</p>
                  </div>
                </div>
                <div>
                  <input
                    ref={proofInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleProofSelect}
                    className="sr-only"
                    id="proof-upload-input"
                  />
                  <button
                    type="button"
                    onClick={() => proofInputRef.current?.click()}
                    className="min-h-[40px] px-3.5 py-2 rounded-lg border border-amber-300 bg-white text-xs font-semibold text-[#111827] hover:bg-amber-50 cursor-pointer"
                  >
                    {proofFile ? `Bukti dipilih: ${proofFile.name}` : 'Unggah bukti transfer (opsional)'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Privacy Guarantee */}
          <div className="flex items-start gap-2.5 text-xs text-slate-500 pt-1">
            <ShieldCheck className="h-4 w-4 text-[#EA580C] shrink-0 mt-0.5" aria-hidden="true" />
            <p>
              File disimpan di folder terproteksi, hanya dapat diakses operator gerai, dan dihapus otomatis setelah 7 hari.
            </p>
          </div>

          {error && (
            <p role="alert" className="text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {error}
            </p>
          )}
        </div>

        {/* Right Sticky Summary Column (Desktop) */}
        <aside className="hidden lg:block lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 sticky top-20 space-y-5">
          <h2 className="text-base font-bold text-[#111827]">Ringkasan Biaya</h2>

          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between gap-4 text-slate-600">
              <dt>
                {pageCount} hlm × {formatRupiah(activePrintTariff?.price ?? 0)} × {copies} rangkap
              </dt>
              <dd className="font-mono font-semibold text-[#111827] tabular-nums">
                {formatRupiah(pricing.printSubtotal)}
              </dd>
            </div>
            <div className="flex justify-between gap-4 text-slate-600">
              <dt>
                {activeBindTariff?.name ?? 'Tanpa jilid'} ({copies} rangkap)
              </dt>
              <dd className="font-mono font-semibold text-[#111827] tabular-nums">
                {formatRupiah(pricing.bindSubtotal)}
              </dd>
            </div>
            <div className="pt-3 border-t border-slate-200 flex items-baseline justify-between gap-4">
              <dt className="font-bold text-[#111827]">Estimasi total</dt>
              <dd className="text-2xl font-extrabold text-[#C2410C] font-mono tabular-nums">
                {formatRupiah(pricing.total)}
              </dd>
            </div>
          </dl>

          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[48px] px-6 py-3 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold text-base transition-colors disabled:opacity-60 cursor-pointer"
          >
            {submitting ? 'Mengirim Pesanan...' : 'Kirim Pesanan'}
          </button>
        </aside>
      </div>

      {/* Mobile Sticky Bottom CTA Bar (compact <= 15% viewport height) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium text-slate-500">
              {pageCount} hlm · {copies} rangkap · {activeBindTariff?.name ?? 'Tanpa jilid'}
            </p>
            <p className="text-lg font-extrabold text-[#C2410C] font-mono tabular-nums">
              {formatRupiah(pricing.total)}
            </p>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="min-h-[46px] px-6 py-2.5 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold text-sm shrink-0 transition-colors disabled:opacity-60 cursor-pointer"
          >
            {submitting ? 'Mengirim...' : 'Kirim Pesanan'}
          </button>
        </div>
      </div>
    </form>
  );
}
