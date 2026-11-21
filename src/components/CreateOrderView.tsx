import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  Copy,
  Download,
  FileText,
  Image as ImageIcon,
  Minus,
  Plus,
  QrCode,
  ShieldCheck,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import {
  calculateOrderTotal,
  formatFileSize,
  formatRupiah,
  requiresPaymentProof,
  validateOrderPaymentInput,
  validateUploadMeta,
  type OrderDetail,
  type PaymentMethod,
  type PaymentSettings,
  type ServiceTariff,
} from '../shared/printLogic';
import { createOrder, detectPdfPagesInBrowser, formatReadableError } from '../utils/api';
import { QrCodeGraphic } from './QrCodeDisplay';

interface CreateOrderViewProps {
  tariffs: ServiceTariff[];
  paymentSettings: PaymentSettings;
  onBack: () => void;
  onTrackOrder: (trackingCode: string) => void;
}

export function CreateOrderView({
  tariffs,
  paymentSettings,
  onBack,
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
  const [printTariffId, setPrintTariffId] = useState<string>(() => printTariffs[0]?.id ?? '');
  const [bindTariffId, setBindTariffId] = useState<string>(() => bindTariffs[0]?.id ?? '');
  const [pageCount, setPageCount] = useState<number>(1);
  const [copies, setCopies] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [createdOrder, setCreatedOrder] = useState<OrderDetail | null>(null);
  const [copiedKey, setCopiedKey] = useState<'queue' | 'track' | 'bank' | null>(null);

  useEffect(() => {
    if (paymentMethod === 'qr' && !paymentSettings.qrEnabled) {
      setPaymentMethod(paymentSettings.bankEnabled ? 'transfer' : 'cash');
    } else if (paymentMethod === 'transfer' && !paymentSettings.bankEnabled) {
      setPaymentMethod(paymentSettings.qrEnabled ? 'qr' : 'cash');
    }
  }, [paymentMethod, paymentSettings.qrEnabled, paymentSettings.bankEnabled]);

  useEffect(() => {
    if (!printTariffId && printTariffs.length > 0) {
      setPrintTariffId(printTariffs[0].id);
    }
  }, [printTariffId, printTariffs]);

  useEffect(() => {
    if (!bindTariffId && bindTariffs.length > 0) {
      setBindTariffId(bindTariffs[0].id);
    }
  }, [bindTariffId, bindTariffs]);

  useEffect(() => {
    if (!proofFile) {
      setProofPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(proofFile);
    setProofPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [proofFile]);

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
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Bukti pembayaran harus berupa gambar (JPG, PNG, atau WebP).');
      return;
    }
    setProofFile(file);
  }

  function handleClearProof() {
    setProofFile(null);
    if (proofInputRef.current) {
      proofInputRef.current.value = '';
    }
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

    const paymentCheck = validateOrderPaymentInput(paymentMethod, Boolean(proofFile));
    if (!paymentCheck.ok) {
      setError(paymentCheck.error ?? 'Bukti pembayaran wajib diunggah.');
      return;
    }

    setSubmitting(true);
    try {
      const order = await createOrder({
        file: selectedFile,
        printTariffId: activePrintTariff.id,
        bindTariffId: activeBindTariff?.id ?? null,
        pageCount,
        copies,
        paymentMethod,
        notes: notes.trim(),
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        proofFile: requiresPaymentProof(paymentMethod) ? proofFile : null,
      });
      setCreatedOrder(order);
    } catch (err) {
      setError(formatReadableError(err, 'Gagal mengirim pesanan.'));
    } finally {
      setSubmitting(false);
    }
  }

  function copyText(text: string, key: 'queue' | 'track' | 'bank') {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  }

  if (createdOrder) {
    const trackQrUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/tamu/lacak?code=${encodeURIComponent(createdOrder.trackingCode)}`
        : `/tamu/lacak?code=${encodeURIComponent(createdOrder.trackingCode)}`;

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
                Simpan kode pelacakan rahasia atau scan QR di bawah untuk memantau progres cetak tanpa perlu login.
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
              <p className="mt-1 text-xs text-slate-600">Simpan kode ini untuk membuka status pesanan.</p>
            </div>
          </div>

          {/* QR Code Receipt Card */}
          <div className="rounded-xl bg-[#FFFDF9] border border-orange-100 p-4 flex flex-col sm:flex-row items-center gap-4">
            <QrCodeGraphic
              value={trackQrUrl}
              size={132}
              label={`QR Code lacak pesanan ${createdOrder.trackingCode}`}
            />
            <div className="text-center sm:text-left space-y-1">
              <p className="text-sm font-bold text-[#111827]">QR Code Lacak Pesanan</p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Screenshot atau scan QR Code ini dari HP lain untuk langsung membuka status antrean pesananmu tanpa perlu mengetik kode.
              </p>
              <p className="font-mono text-[11px] text-[#C2410C] break-all">{trackQrUrl}</p>
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
              onChange={(e) => setPrintTariffId(e.target.value)}
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
              onChange={(e) => setBindTariffId(e.target.value)}
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
            <div
              className={`grid gap-2.5 ${
                paymentSettings.qrEnabled && paymentSettings.bankEnabled
                  ? 'grid-cols-1 sm:grid-cols-3'
                  : paymentSettings.qrEnabled || paymentSettings.bankEnabled
                  ? 'grid-cols-1 sm:grid-cols-2'
                  : 'grid-cols-1'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setPaymentMethod('cash');
                }}
                className={`min-h-[46px] px-4 py-2.5 rounded-xl font-semibold text-sm border transition-colors cursor-pointer ${
                  paymentMethod === 'cash'
                    ? 'bg-[#EA580C] border-[#EA580C] text-white'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Tunai di tempat
              </button>

              {paymentSettings.qrEnabled && (
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setPaymentMethod('qr');
                  }}
                  className={`min-h-[46px] px-4 py-2.5 rounded-xl font-semibold text-sm border inline-flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                    paymentMethod === 'qr'
                      ? 'bg-[#EA580C] border-[#EA580C] text-white'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <QrCode className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>Bayar QR</span>
                </button>
              )}

              {paymentSettings.bankEnabled && (
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setPaymentMethod('transfer');
                  }}
                  className={`min-h-[46px] px-4 py-2.5 rounded-xl font-semibold text-sm border inline-flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                    paymentMethod === 'transfer'
                      ? 'bg-[#EA580C] border-[#EA580C] text-white'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Building2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>Transfer Bank</span>
                </button>
              )}
            </div>

            {requiresPaymentProof(paymentMethod) && (
              <div className="mt-3 rounded-xl bg-[#FEFBE8] border border-[#FDE68A] p-4 space-y-4">
                {paymentMethod === 'qr' ? (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2.5">
                      <QrCode className="h-5 w-5 text-[#C2410C] shrink-0 mt-0.5" aria-hidden="true" />
                      <div className="text-xs text-slate-700 space-y-0.5">
                        <p className="font-bold text-sm text-[#111827]">{paymentSettings.qrLabel}</p>
                        <p>Pindai kode QR di bawah lalu unggah bukti pembayarannya sebelum mengirim pesanan.</p>
                      </div>
                    </div>

                    {paymentSettings.qrImageBase64 && paymentSettings.qrImageMimeType ? (
                      <div className="rounded-xl bg-white border border-amber-200 p-4 flex flex-col items-center gap-3">
                        <img
                          src={`data:${paymentSettings.qrImageMimeType};base64,${paymentSettings.qrImageBase64}`}
                          alt={paymentSettings.qrLabel}
                          className="max-h-56 w-auto rounded-lg object-contain"
                        />
                        <a
                          href={`data:${paymentSettings.qrImageMimeType};base64,${paymentSettings.qrImageBase64}`}
                          download={paymentSettings.qrImageOriginalName || 'qr-pembayaran-printkilat.png'}
                          className="min-h-[36px] px-3.5 py-1.5 rounded-lg border border-amber-300 bg-[#FEFBE8] hover:bg-amber-100 text-xs font-semibold text-[#9A3412] inline-flex items-center gap-1.5"
                        >
                          <Download className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Unduh Gambar QR</span>
                        </a>
                      </div>
                    ) : (
                      <div className="rounded-xl bg-white border border-amber-200 p-3 text-xs text-amber-900">
                        Gambar QR statis gerai belum diunggah oleh admin. Silakan scan QR fisik di meja kasir gerai atau pilih Transfer Bank / Tunai.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <Building2 className="h-5 w-5 text-[#C2410C] shrink-0 mt-0.5" aria-hidden="true" />
                      <div className="text-xs text-slate-700 space-y-1">
                        <p className="font-bold text-sm text-[#111827]">
                          Transfer Bank {paymentSettings.bankName}
                        </p>
                        <p className="font-mono text-sm font-bold text-[#111827] tabular-nums">
                          {paymentSettings.bankAccountNumber}
                        </p>
                        <p>a.n. {paymentSettings.bankAccountHolder}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyText(paymentSettings.bankAccountNumber, 'bank')}
                      className="min-h-[36px] px-3 py-1.5 rounded-lg border border-amber-300 bg-white hover:bg-amber-50 text-xs font-semibold text-[#111827] inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      {copiedKey === 'bank' ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
                          <span>Disalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Salin</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {paymentSettings.paymentNote && (
                  <p className="text-xs text-slate-600">{paymentSettings.paymentNote}</p>
                )}

                {/* Mandatory Proof Upload */}
                <div className="pt-3 border-t border-amber-200/80 space-y-2.5">
                  <label htmlFor="proof-upload-input" className="block text-xs font-bold text-[#111827]">
                    {paymentMethod === 'qr'
                      ? 'Bukti Pembayaran QR (Wajib)'
                      : 'Bukti Transfer Bank (Wajib)'}
                  </label>
                  <input
                    ref={proofInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleProofSelect}
                    className="sr-only"
                    id="proof-upload-input"
                  />

                  {proofFile && proofPreviewUrl ? (
                    <div className="rounded-xl bg-white border border-amber-200 p-3 flex flex-col sm:flex-row items-center gap-3">
                      <img
                        src={proofPreviewUrl}
                        alt="Pratinjau bukti pembayaran"
                        className="h-20 w-20 rounded-lg border border-slate-200 object-cover shrink-0"
                      />
                      <div className="min-w-0 flex-1 text-center sm:text-left">
                        <p className="text-xs font-bold text-[#111827] truncate">{proofFile.name}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {formatFileSize(proofFile.size)} · Siap dikirim ke operator
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => proofInputRef.current?.click()}
                          className="min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-[#111827] cursor-pointer"
                        >
                          Ganti
                        </button>
                        <button
                          type="button"
                          onClick={handleClearProof}
                          aria-label="Hapus bukti pembayaran"
                          className="min-h-[36px] min-w-[36px] rounded-lg border border-red-200 bg-white hover:bg-red-50 flex items-center justify-center text-red-600 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => proofInputRef.current?.click()}
                      className="w-full min-h-[54px] px-4 py-3 rounded-xl border-2 border-dashed border-amber-300 bg-white hover:bg-amber-50/70 text-xs font-semibold text-[#111827] flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <ImageIcon className="h-4 w-4 text-[#C2410C]" aria-hidden="true" />
                      <span>
                        {paymentMethod === 'qr'
                          ? 'Unggah screenshot / foto bukti bayar QR (wajib)'
                          : 'Unggah screenshot / foto bukti transfer (wajib)'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Privacy Guarantee */}
          <div className="flex items-start gap-2.5 text-xs text-slate-500 pt-1">
            <ShieldCheck className="h-4 w-4 text-[#EA580C] shrink-0 mt-0.5" aria-hidden="true" />
            <p>
              Berkas tersimpan aman di database terproteksi, hanya dapat diakses operator gerai, dan dijadwalkan kedaluwarsa dalam 7 hari.
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
            {submitting ? 'Mengirim ke Database...' : 'Kirim Pesanan'}
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
