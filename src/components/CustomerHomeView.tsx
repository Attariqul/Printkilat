import { ArrowRight, Clock, Printer, ReceiptText } from 'lucide-react';
import { formatRupiah, type OrderDetail } from '../shared/printLogic';
import type { CustomerTab } from './CustomerShell';
import { StatusBadge } from './StatusBadge';

interface CustomerHomeViewProps {
  activeOrders: OrderDetail[];
  loadingOrders: boolean;
  onNavigate: (tab: CustomerTab) => void;
  onOpenTrackOrder: (trackingCode: string) => void;
}

export function CustomerHomeView({
  activeOrders,
  loadingOrders,
  onNavigate,
  onOpenTrackOrder,
}: CustomerHomeViewProps) {
  const ongoingOrders = activeOrders.filter(
    (o) => o.status !== 'completed' && o.status !== 'rejected'
  );

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
                Lihat nomor antrean dan progres cetak dengan kode pelacakanmu.
              </p>
            </div>
          </button>
        </div>

        {/* Active Orders + Quick Secondary Links */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <section className="lg:col-span-8 space-y-3" aria-labelledby="active-orders-heading">
            <div className="flex items-center justify-between">
              <h2 id="active-orders-heading" className="text-sm font-bold tracking-wide text-slate-500">
                Pesanan aktif
              </h2>
              {ongoingOrders.length > 0 && (
                <span className="text-xs font-medium text-slate-500 tabular-nums">
                  {ongoingOrders.length} pesanan berjalan
                </span>
              )}
            </div>

            {loadingOrders ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 animate-pulse space-y-3">
                <div className="h-4 w-40 bg-slate-200 rounded" />
                <div className="h-3 w-56 bg-slate-100 rounded" />
              </div>
            ) : ongoingOrders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
                <p className="text-sm font-medium text-slate-700">
                  Belum ada pesanan aktif yang tersimpan di perangkat ini.
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Buat pesanan baru atau masukkan kode <span className="font-mono">PK-TRK-...</span> di menu Lacak.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {ongoingOrders.map((order) => (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => onOpenTrackOrder(order.trackingCode)}
                    className="w-full text-left bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 hover:border-orange-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-mono text-base font-bold text-[#111827] tabular-nums">
                          {order.queueNumber}
                        </span>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <span className="font-mono text-xs text-slate-500">
                          {order.trackingCode}
                        </span>
                      </div>
                      <p className="mt-1 text-xs sm:text-sm text-slate-600 truncate">
                        {order.item.colorMode || order.item.printTariffName}{' '}
                        {order.item.paperSize ?? ''} · {order.item.pageCount} hlm · {order.item.copies} rangkap ·{' '}
                        <span className="font-semibold text-[#111827] tabular-nums">
                          {formatRupiah(order.totalAmount)}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <StatusBadge status={order.status} compact />
                      <ArrowRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          <aside className="lg:col-span-4 space-y-3">
            <h2 className="text-sm font-bold tracking-wide text-slate-500">
              Pintasan cepat
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
              <button
                type="button"
                onClick={() => onNavigate('tariffs')}
                className="min-h-[48px] px-4 py-3 bg-white rounded-xl border border-slate-200 hover:border-orange-300 text-sm font-semibold text-[#111827] flex items-center justify-between gap-2 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <ReceiptText className="h-4 w-4 text-[#EA580C]" aria-hidden="true" />
                  <span>Daftar harga</span>
                </span>
                <ArrowRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('history')}
                className="min-h-[48px] px-4 py-3 bg-white rounded-xl border border-slate-200 hover:border-orange-300 text-sm font-semibold text-[#111827] flex items-center justify-between gap-2 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#EA580C]" aria-hidden="true" />
                  <span>Riwayat pesanan</span>
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
    </div>
  );
}
