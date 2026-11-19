import { ArrowLeft, ArrowRight, BookOpen, Printer } from 'lucide-react';
import { formatRupiah, type OrderDetail, type ServiceTariff } from '../shared/printLogic';
import { StatusBadge } from './StatusBadge';

interface CustomerPriceListViewProps {
  tariffs: ServiceTariff[];
  onBack: () => void;
  onStartOrder: () => void;
}

export function CustomerPriceListView({
  tariffs,
  onBack,
  onStartOrder,
}: CustomerPriceListViewProps) {
  const printList = tariffs.filter((t) => t.category === 'cetak' && t.isActive);
  const bindList = tariffs.filter((t) => t.category === 'jilid' && t.isActive);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 pt-6 pb-12 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#111827]">Daftar Harga Gerai</h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Tarif resmi cetak dan jilid yang berlaku saat ini.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onStartOrder}
          className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Buat Pesanan Sekarang
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center text-[#EA580C]">
              <Printer className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2 className="text-base font-bold text-[#111827]">Layanan Cetak (per halaman)</h2>
          </div>

          <ul className="divide-y divide-slate-100">
            {printList.map((item) => (
              <li key={item.id} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#111827]">{item.name}</p>
                  <p className="text-xs text-slate-500">
                    Kertas {item.paperSize ?? '-'} · {item.colorMode === 'Color' ? 'Berwarna' : 'Hitam Putih'}
                  </p>
                </div>
                <span className="font-mono text-sm font-bold text-[#C2410C] tabular-nums whitespace-nowrap">
                  {formatRupiah(item.price)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-[#FEFBE8] border border-[#FDE68A] flex items-center justify-center text-[#C2410C]">
              <BookOpen className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2 className="text-base font-bold text-[#111827]">Layanan Jilid (per rangkap)</h2>
          </div>

          <ul className="divide-y divide-slate-100">
            {bindList.map((item) => (
              <li key={item.id} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#111827]">{item.name}</p>
                  <p className="text-xs text-slate-500">Finishing rapi per rangkap dokumen</p>
                </div>
                <span className="font-mono text-sm font-bold text-[#C2410C] tabular-nums whitespace-nowrap">
                  {formatRupiah(item.price)}
                </span>
              </li>
            ))}
          </ul>

          <div className="rounded-xl bg-[#FEFBE8] border border-[#FDE68A] p-3.5 text-xs text-slate-700">
            Rumus estimasi: <span className="font-semibold">(Tarif Cetak × Halaman × Rangkap) + (Tarif Jilid × Rangkap)</span>
          </div>
        </section>
      </div>
    </div>
  );
}

interface CustomerHistoryViewProps {
  orders: OrderDetail[];
  onBack: () => void;
  onTrackOrder: (trackingCode: string) => void;
  onStartOrder: () => void;
}

export function CustomerHistoryView({
  orders,
  onBack,
  onTrackOrder,
  onStartOrder,
}: CustomerHistoryViewProps) {
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
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#111827]">Riwayat Pesanan</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Daftar pesanan yang dibuat atau dilacak dari perangkat ini.
          </p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
          <p className="text-sm font-semibold text-[#111827]">Belum ada riwayat pesanan tersimpan.</p>
          <p className="text-xs text-slate-500">
            Mulai buat pesanan cetak pertama Anda dalam hitungan detik.
          </p>
          <button
            type="button"
            onClick={onStartOrder}
            className="mt-2 min-h-[44px] px-5 py-2.5 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white text-sm font-semibold cursor-pointer"
          >
            Buat Pesanan Cetak
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <button
              key={order.id}
              type="button"
              onClick={() => onTrackOrder(order.trackingCode)}
              className="w-full text-left bg-white rounded-2xl border border-slate-200 hover:border-orange-300 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors cursor-pointer"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-mono font-bold text-base text-[#111827] tabular-nums">
                    {order.queueNumber}
                  </span>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span className="font-mono text-xs text-slate-500">{order.trackingCode}</span>
                </div>
                <p className="mt-1 text-sm text-slate-700 truncate">{order.file.originalName}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {order.item.printTariffName} · {order.item.pageCount} hlm · {order.item.copies} rangkap ·{' '}
                  <span className="font-mono font-semibold text-[#111827] tabular-nums">
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
    </div>
  );
}
