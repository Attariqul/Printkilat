import { useState } from 'react';
import { ArrowRight, Clock, LockKeyhole, Printer, QrCode, ReceiptText } from 'lucide-react';
import type { CustomerTab } from './CustomerShell';
import { QrAccessModal } from './QrCodeDisplay';

interface CustomerHomeViewProps {
  onNavigate: (tab: CustomerTab) => void;
}

export function CustomerHomeView({ onNavigate }: CustomerHomeViewProps) {
  const [qrOpen, setQrOpen] = useState(false);

  return (
    <div>
      {/* Energetic Orange Greeting Header */}
      <section className="bg-[#F97316] text-white px-4 sm:px-8 pt-4 pb-10">
        <div className="max-w-6xl mx-auto">
          <p className="text-sm font-medium text-orange-100">Halo, Pelanggan</p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Mau apa hari ini?
          </h1>
        </div>
      </section>

      {/* Main Content Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 -mt-5 space-y-8">
        {/* Primary Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => onNavigate('order')}
            className="text-left bg-white rounded-2xl border-2 border-[#EA580C] p-5 sm:p-6 shadow-sm hover:bg-[#FEFBE8] transition-colors flex items-start gap-4 cursor-pointer group"
          >
            <div className="h-12 w-12 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center shrink-0 text-[#EA580C]">
              <Printer className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-[#111827]">Buat pesanan cetak</h2>
                <ArrowRight
                  className="h-5 w-5 text-[#EA580C] shrink-0 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </div>
              <p className="mt-1 text-sm text-slate-600">
                Unggah file, pilih spesifikasi, lihat estimasi harga otomatis.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('track')}
            className="text-left bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm hover:border-orange-300 hover:bg-orange-50/40 transition-colors flex items-start gap-4 cursor-pointer group"
          >
            <div className="h-12 w-12 rounded-xl bg-[#FEFBE8] border border-[#FDE68A] flex items-center justify-center shrink-0 text-[#C2410C]">
              <Clock className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-[#111827]">Cek status pesanan</h2>
                <ArrowRight
                  className="h-5 w-5 text-slate-400 group-hover:text-[#EA580C] shrink-0 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </div>
              <p className="mt-1 text-sm text-slate-600">
                Lihat nomor antrean dan progres cetak dengan kode pelacakan khususmu.
              </p>
            </div>
          </button>
        </div>

        {/* Privacy Info + Quick Secondary Links */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <section className="lg:col-span-8 space-y-3" aria-labelledby="tracking-privacy-heading">
            <h2 id="tracking-privacy-heading" className="text-sm font-bold tracking-wide text-slate-500">
              Privasi &amp; Pelacakan Pesanan
            </h2>
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-[#FEFBE8] border border-[#FDE68A] flex items-center justify-center shrink-0 text-[#C2410C]">
                  <LockKeyhole className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-[#111827]">
                    Dilindungi kode khusus pelacakan
                  </p>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Demi menjaga privasi dokumen, daftar pesanan tidak ditampilkan secara terbuka. Status pesanan hanya dapat diperiksa di menu <span className="font-semibold text-[#111827]">Cek status pesanan</span> dengan memasukkan kode khusus (<span className="font-mono">PK-TRK-...</span>) atau scan QR struk.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('track')}
                className="min-h-[42px] px-4 py-2 rounded-xl border border-[#EA580C] text-[#C2410C] hover:bg-orange-50 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
              >
                Masukkan Kode Khusus
              </button>
            </div>
          </section>

          <aside className="lg:col-span-4 space-y-3">
            <h2 className="text-sm font-bold tracking-wide text-slate-500">
              Pintasan cepat
            </h2>
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => onNavigate('tariffs')}
                className="w-full min-h-[48px] px-4 py-3 bg-white rounded-xl border border-slate-200 hover:border-orange-300 text-sm font-semibold text-[#111827] flex items-center justify-between gap-2 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <ReceiptText className="h-4 w-4 text-[#EA580C]" aria-hidden="true" />
                  <span>Daftar harga</span>
                </span>
                <ArrowRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => setQrOpen(true)}
                className="w-full min-h-[48px] px-4 py-3 bg-white rounded-xl border border-slate-200 hover:border-orange-300 text-sm font-semibold text-[#111827] flex items-center justify-between gap-2 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <QrCode className="h-4 w-4 text-[#EA580C]" aria-hidden="true" />
                  <span>QR Code Akses Cepat</span>
                </span>
                <ArrowRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
              </button>
            </div>

            <div className="rounded-xl bg-[#FEFBE8] border border-[#FDE68A] p-4 text-xs text-slate-700 space-y-1">
              <p className="font-semibold text-[#111827]">Jam Operasional Gerai Kampus</p>
              <p>Senin–Sabtu · 07.30–20.00 WIB</p>
              <p className="text-slate-600">Gedung Pusat Mahasiswa Lt. 1, Sektor Barat</p>
            </div>
          </aside>
        </div>
      </div>

      <QrAccessModal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        targetPath="/tamu"
      />
    </div>
  );
}
