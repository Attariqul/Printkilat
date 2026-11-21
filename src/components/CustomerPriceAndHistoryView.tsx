import { ArrowLeft, BookOpen, Printer } from 'lucide-react';
import { formatRupiah, type ServiceTariff } from '../shared/printLogic';

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
