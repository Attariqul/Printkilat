import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Copy, Download, Printer, QrCode, X } from 'lucide-react';

interface QrCodeGraphicProps {
  value: string;
  size?: number;
  label?: string;
}

export function QrCodeGraphic({ value, size = 220, label = 'QR Code PrintKilat' }: QrCodeGraphicProps) {
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    let active = true;
    void QRCode.toDataURL(value, {
      width: size,
      margin: 2,
      color: {
        dark: '#111827',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (active) setDataUrl(url);
      })
      .catch(() => {
        if (active) setDataUrl('');
      });
    return () => {
      active = false;
    };
  }, [value, size]);

  if (!dataUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-xs text-slate-500"
      >
        Membuat QR...
      </div>
    );
  }

  return (
    <img
      src={dataUrl}
      alt={label}
      width={size}
      height={size}
      className="rounded-xl border border-slate-200 bg-white p-2 block"
    />
  );
}

interface QrAccessModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  targetPath?: string;
}

export function QrAccessModal({
  open,
  onClose,
  title = 'Scan QR Code Akses PrintKilat',
  subtitle = 'Pelanggan cukup arahkan kamera HP ke QR Code ini untuk langsung membuka layanan cetak tanpa mengetik alamat website.',
  targetPath = '/tamu',
}: QrAccessModalProps) {
  const [copied, setCopied] = useState(false);
  const [pngUrl, setPngUrl] = useState('');

  const fullUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${targetPath}`
      : `https://printkilat.app${targetPath}`;

  useEffect(() => {
    if (!open) return;
    let active = true;
    void QRCode.toDataURL(fullUrl, {
      width: 640,
      margin: 3,
      color: { dark: '#111827', light: '#FFFFFF' },
      errorCorrectionLevel: 'H',
    }).then((url) => {
      if (active) setPngUrl(url);
    });
    return () => {
      active = false;
    };
  }, [open, fullUrl]);

  if (!open) return null;

  function handleCopy() {
    navigator.clipboard?.writeText(fullUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  function handleDownloadPng() {
    if (!pngUrl) return;
    const a = document.createElement('a');
    a.href = pngUrl;
    a.download = 'qr-printkilat-gerai.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-modal-title"
    >
      <div className="bg-white rounded-2xl border border-orange-200 shadow-2xl max-w-md w-full p-6 space-y-5 relative">
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup modal QR Code"
          className="absolute right-4 top-4 min-h-[36px] min-w-[36px] rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 flex items-center justify-center cursor-pointer"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="flex items-start gap-3 pr-8">
          <div className="h-10 w-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-[#EA580C] shrink-0">
            <QrCode className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 id="qr-modal-title" className="text-lg font-extrabold text-[#111827]">
              {title}
            </h2>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">{subtitle}</p>
          </div>
        </div>

        <div className="rounded-2xl bg-[#FFFDF9] border border-orange-100 p-5 flex flex-col items-center text-center space-y-3">
          <QrCodeGraphic value={fullUrl} size={220} label={`QR Code menuju ${fullUrl}`} />
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-[#C2410C] uppercase tracking-wider">
              PrintKilat · Gerai Kampus
            </p>
            <p className="font-mono text-[11px] text-slate-500 break-all">{fullUrl}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Tersalin' : 'Salin Link'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPng}
            disabled={!pngUrl}
            className="min-h-[42px] px-3 py-2 rounded-xl border border-[#EA580C] text-[#C2410C] hover:bg-orange-50 text-xs font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Unduh PNG</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="min-h-[42px] px-3 py-2 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Cetak</span>
          </button>
        </div>
      </div>
    </div>
  );
}
