import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  Building2,
  CheckCircle2,
  QrCode,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import type { PaymentSettings } from '../shared/printLogic';
import { formatReadableError, savePaymentSettings } from '../utils/api';

interface OperatorPaymentSettingsViewProps {
  settings: PaymentSettings;
  onSettingsUpdated: (updated: PaymentSettings) => void;
}

export function OperatorPaymentSettingsView({
  settings,
  onSettingsUpdated,
}: OperatorPaymentSettingsViewProps) {
  const qrInputRef = useRef<HTMLInputElement>(null);

  const [qrEnabled, setQrEnabled] = useState(settings.qrEnabled);
  const [qrLabel, setQrLabel] = useState(settings.qrLabel);
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [qrPreviewUrl, setQrPreviewUrl] = useState<string | null>(() =>
    settings.qrImageBase64 && settings.qrImageMimeType
      ? `data:${settings.qrImageMimeType};base64,${settings.qrImageBase64}`
      : null
  );
  const [removeQrImage, setRemoveQrImage] = useState(false);

  const [bankEnabled, setBankEnabled] = useState(settings.bankEnabled);
  const [bankName, setBankName] = useState(settings.bankName);
  const [bankAccountNumber, setBankAccountNumber] = useState(settings.bankAccountNumber);
  const [bankAccountHolder, setBankAccountHolder] = useState(settings.bankAccountHolder);
  const [paymentNote, setPaymentNote] = useState(settings.paymentNote ?? '');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    setQrEnabled(settings.qrEnabled);
    setQrLabel(settings.qrLabel);
    setQrFile(null);
    setRemoveQrImage(false);
    setQrPreviewUrl(
      settings.qrImageBase64 && settings.qrImageMimeType
        ? `data:${settings.qrImageMimeType};base64,${settings.qrImageBase64}`
        : null
    );
    setBankEnabled(settings.bankEnabled);
    setBankName(settings.bankName);
    setBankAccountNumber(settings.bankAccountNumber);
    setBankAccountHolder(settings.bankAccountHolder);
    setPaymentNote(settings.paymentNote ?? '');
  }, [settings]);

  function handleQrFileChange(e: ChangeEvent<HTMLInputElement>) {
    setError(null);
    setFeedback(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Kode QR pembayaran harus berupa gambar (PNG, JPG, atau WebP).');
      return;
    }
    setQrFile(file);
    setRemoveQrImage(false);
    const reader = new FileReader();
    reader.onload = () => setQrPreviewUrl(String(reader.result || ''));
    reader.readAsDataURL(file);
  }

  function handleRemoveQr() {
    setQrFile(null);
    setQrPreviewUrl(null);
    setRemoveQrImage(true);
    setFeedback(null);
    if (qrInputRef.current) qrInputRef.current.value = '';
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFeedback(null);

    setSaving(true);
    try {
      const updated = await savePaymentSettings({
        qrEnabled,
        qrLabel,
        qrFile,
        removeQrImage,
        existingQrImageBase64: settings.qrImageBase64,
        existingQrImageMimeType: settings.qrImageMimeType,
        existingQrImageOriginalName: settings.qrImageOriginalName,
        bankEnabled,
        bankName,
        bankAccountNumber,
        bankAccountHolder,
        paymentNote,
      });
      onSettingsUpdated(updated);
      setQrFile(null);
      setFeedback('Pengaturan metode pembayaran gerai berhasil disimpan.');
    } catch (err) {
      setError(formatReadableError(err, 'Gagal menyimpan pengaturan pembayaran.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#111827]">
            Pengaturan Pembayaran Gerai
          </h1>
          <p className="text-sm text-slate-500">
            Atur 2 opsi pembayaran non-tunai (QR statis / QRIS &amp; rekening bank) yang ditampilkan saat pelanggan membuat pesanan.
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="min-h-[44px] px-6 py-2.5 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white text-sm font-semibold whitespace-nowrap shrink-0 transition-colors disabled:opacity-60 cursor-pointer"
        >
          {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
        </button>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Opsi 1: QR Pembayaran Statis */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-[#EA580C] shrink-0">
                <QrCode className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#111827]">Opsi 1 · Kode QR Pembayaran Statis</h2>
                <p className="text-xs text-slate-500">
                  Unggah gambar QRIS atau QR dompet digital gerai agar pelanggan bisa langsung memindai saat checkout.
                </p>
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#111827] cursor-pointer shrink-0 pt-1">
              <input
                type="checkbox"
                checked={qrEnabled}
                onChange={(e) => setQrEnabled(e.target.checked)}
                className="h-4 w-4 accent-[#EA580C] rounded"
              />
              <span>Aktif</span>
            </label>
          </div>

          <div>
            <label htmlFor="payment-qr-label" className="block text-xs font-semibold text-slate-600 mb-1.5">
              Nama / Label QRIS Gerai
            </label>
            <input
              id="payment-qr-label"
              type="text"
              value={qrLabel}
              onChange={(e) => setQrLabel(e.target.value)}
              placeholder="Contoh: QRIS Gerai PrintKilat Kampus"
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-[#111827] focus:border-[#EA580C] focus:outline-none"
            />
          </div>

          <div className="space-y-3">
            <span className="block text-xs font-semibold text-slate-600">Gambar QR Statis Gerai</span>
            <input
              ref={qrInputRef}
              id="static-qr-upload"
              type="file"
              accept="image/*"
              onChange={handleQrFileChange}
              className="sr-only"
            />

            {qrPreviewUrl ? (
              <div className="rounded-xl border border-orange-200 bg-[#FFFDF9] p-4 flex flex-col items-center gap-3">
                <img
                  src={qrPreviewUrl}
                  alt="Pratinjau QR pembayaran statis gerai"
                  className="max-h-60 w-auto rounded-lg border border-slate-200 bg-white p-2 object-contain"
                />
                <p className="text-xs text-slate-500 truncate max-w-full">
                  {qrFile?.name || settings.qrImageOriginalName || 'qr-pembayaran.png'}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => qrInputRef.current?.click()}
                    className="min-h-[38px] px-3.5 py-1.5 rounded-lg border border-[#EA580C] text-[#C2410C] hover:bg-orange-50 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <UploadCloud className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Ganti Gambar QR</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveQr}
                    className="min-h-[38px] px-3.5 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => qrInputRef.current?.click()}
                className="w-full min-h-[140px] rounded-xl border-2 border-dashed border-orange-300 bg-orange-50/40 hover:bg-orange-50 p-5 flex flex-col items-center justify-center gap-2 text-center transition-colors cursor-pointer"
              >
                <UploadCloud className="h-7 w-7 text-[#EA580C]" aria-hidden="true" />
                <p className="text-sm font-bold text-[#111827]">Unggah Gambar QRIS / QR Statis</p>
                <p className="text-xs text-slate-500">Format PNG, JPG, atau WebP</p>
              </button>
            )}
          </div>
        </section>

        {/* Opsi 2: Rekening Bank */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#FEFBE8] border border-[#FDE68A] flex items-center justify-center text-[#C2410C] shrink-0">
                <Building2 className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#111827]">Opsi 2 · Rekening Bank Transfer</h2>
                <p className="text-xs text-slate-500">
                  Detail rekening tujuan transfer bank yang ditampilkan kepada pelanggan.
                </p>
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#111827] cursor-pointer shrink-0 pt-1">
              <input
                type="checkbox"
                checked={bankEnabled}
                onChange={(e) => setBankEnabled(e.target.checked)}
                className="h-4 w-4 accent-[#EA580C] rounded"
              />
              <span>Aktif</span>
            </label>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="payment-bank-name" className="block text-xs font-semibold text-slate-600 mb-1.5">
                Nama Bank
              </label>
              <input
                id="payment-bank-name"
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="Contoh: BCA / BRI / Mandiri"
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-[#111827] focus:border-[#EA580C] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="payment-bank-number" className="block text-xs font-semibold text-slate-600 mb-1.5">
                Nomor Rekening
              </label>
              <input
                id="payment-bank-number"
                type="text"
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value)}
                placeholder="Contoh: 7710-4429-18"
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 font-mono text-sm font-semibold text-[#111827] focus:border-[#EA580C] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="payment-bank-holder" className="block text-xs font-semibold text-slate-600 mb-1.5">
                Atas Nama Pemilik Rekening
              </label>
              <input
                id="payment-bank-holder"
                type="text"
                value={bankAccountHolder}
                onChange={(e) => setBankAccountHolder(e.target.value)}
                placeholder="Contoh: Gerai Fotokopi Kampus"
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-[#111827] focus:border-[#EA580C] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="payment-note" className="block text-xs font-semibold text-slate-600 mb-1.5">
                Catatan untuk Pelanggan (opsional)
              </label>
              <input
                id="payment-note"
                type="text"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="Contoh: Pastikan nominal sesuai total estimasi."
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-[#111827] focus:border-[#EA580C] focus:outline-none"
              />
            </div>
          </div>
        </section>
      </div>
    </form>
  );
}
