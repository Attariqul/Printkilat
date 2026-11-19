import { useEffect, useMemo, useState } from 'react';
import { LogOut, RefreshCw, Search } from 'lucide-react';
import {
  formatRupiah,
  getPaymentMethodLabel,
  type OrderDetail,
  type OrderStatus,
  type ServiceTariff,
} from '../shared/printLogic';
import {
  fetchOperatorOrders,
  fetchTariffs,
  type OperatorOrdersResponse,
  type OperatorUser,
} from '../utils/api';
import { OperatorOrderDetailView } from './OperatorOrderDetailView';
import { OperatorTariffManagerView } from './OperatorTariffManagerView';
import { PaymentStatusTag, StatusBadge } from './StatusBadge';

export type OperatorTab = 'queue' | 'tariffs' | 'history';

interface OperatorPortalProps {
  operator: OperatorUser;
  onLogout: () => Promise<void>;
  onTariffsChanged: (tariffs: ServiceTariff[]) => void;
}

export function OperatorPortal({
  operator,
  onLogout,
  onTariffsChanged,
}: OperatorPortalProps) {
  const [activeTab, setActiveTab] = useState<OperatorTab>('queue');
  const [ordersData, setOrdersData] = useState<OperatorOrdersResponse>({
    orders: [],
    counts: { pending: 0, confirmed: 0, printing: 0, ready: 0, completed: 0, rejected: 0 },
  });
  const [tariffs, setTariffs] = useState<ServiceTariff[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  async function refreshAll() {
    setLoading(true);
    try {
      const [ordersRes, tariffsRes] = await Promise.all([
        fetchOperatorOrders(),
        fetchTariffs(true),
      ]);
      setOrdersData(ordersRes);
      setTariffs(tariffsRes);
      onTariffsChanged(tariffsRes.filter((t) => t.isActive));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeOrders = useMemo(() => {
    return ordersData.orders.filter((o) => {
      const isOngoing = o.status !== 'completed' && o.status !== 'rejected';
      if (!isOngoing) return false;
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        return (
          o.queueNumber.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.file.originalName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [ordersData.orders, statusFilter, searchQuery]);

  const historyOrders = useMemo(() => {
    return ordersData.orders.filter((o) => {
      const isHistory = o.status === 'completed' || o.status === 'rejected';
      if (!isHistory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        return (
          o.queueNumber.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.file.originalName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [ordersData.orders, searchQuery]);

  const selectedOrder = useMemo(
    () => ordersData.orders.find((o) => o.id === selectedOrderId) ?? null,
    [ordersData.orders, selectedOrderId]
  );

  function handleOrderUpdated(updated: OrderDetail) {
    setOrdersData((prev) => {
      const nextOrders = prev.orders.map((o) => (o.id === updated.id ? updated : o));
      return {
        orders: nextOrders,
        counts: {
          pending: nextOrders.filter((o) => o.status === 'pending').length,
          confirmed: nextOrders.filter((o) => o.status === 'confirmed').length,
          printing: nextOrders.filter((o) => o.status === 'printing').length,
          ready: nextOrders.filter((o) => o.status === 'ready').length,
          completed: nextOrders.filter((o) => o.status === 'completed').length,
          rejected: nextOrders.filter((o) => o.status === 'rejected').length,
        },
      };
    });
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      {/* Top Bar matching PDF Pages 4-6 */}
      <header className="sticky top-0 z-30 bg-[#F97316] text-white border-b border-orange-600/30">
        <div className="max-w-7xl mx-auto px-3 sm:px-8 h-14 flex items-center justify-between gap-3 sm:gap-6">
          <button
            type="button"
            onClick={() => {
              setSelectedOrderId(null);
              setActiveTab('queue');
            }}
            className="text-base sm:text-lg font-extrabold tracking-tight text-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            PrintKilat<span className="hidden sm:inline"> · Operator</span>
          </button>

          <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto" aria-label="Menu Operator">
            <button
              type="button"
              onClick={() => {
                setSelectedOrderId(null);
                setActiveTab('queue');
              }}
              className={`min-h-[36px] px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                activeTab === 'queue'
                  ? 'bg-white/20 text-white'
                  : 'text-orange-50 hover:bg-white/10'
              }`}
            >
              Antrean
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedOrderId(null);
                setActiveTab('tariffs');
              }}
              className={`min-h-[36px] px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                activeTab === 'tariffs'
                  ? 'bg-white/20 text-white'
                  : 'text-orange-50 hover:bg-white/10'
              }`}
            >
              Kelola Tarif
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedOrderId(null);
                setActiveTab('history');
              }}
              className={`min-h-[36px] px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-white/20 text-white'
                  : 'text-orange-50 hover:bg-white/10'
              }`}
            >
              Riwayat
            </button>
            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              className="min-h-[36px] px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold text-orange-50 hover:bg-white/15 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
            >
              Keluar
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-8">
        {selectedOrder ? (
          <OperatorOrderDetailView
            order={selectedOrder}
            onBack={() => setSelectedOrderId(null)}
            onOrderUpdated={handleOrderUpdated}
          />
        ) : activeTab === 'tariffs' ? (
          <OperatorTariffManagerView
            tariffs={tariffs}
            onTariffsUpdated={(updated) => {
              setTariffs(updated);
              onTariffsChanged(updated.filter((t) => t.isActive));
            }}
          />
        ) : activeTab === 'history' ? (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-[#111827]">Riwayat Pesanan</h1>
                <p className="text-sm text-slate-500">
                  Arsip pesanan selesai dan pesanan yang ditolak ({operator.name}).
                </p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari antrean atau nama..."
                  aria-label="Cari riwayat pesanan"
                  className="w-full min-h-[42px] pl-10 pr-4 py-2 rounded-xl border border-slate-300 bg-white text-sm text-[#111827] focus:border-[#EA580C] focus:outline-none"
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              {historyOrders.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  Belum ada riwayat pesanan selesai atau ditolak.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-500">
                        <th className="py-3 px-4">Antrean</th>
                        <th className="py-3 px-3">Pelanggan</th>
                        <th className="py-3 px-3">Dokumen &amp; Spesifikasi</th>
                        <th className="py-3 px-3 text-right">Total</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {historyOrders.map((o) => (
                        <tr key={o.id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4 font-mono font-bold text-[#111827] tabular-nums whitespace-nowrap">
                            {o.queueNumber}
                          </td>
                          <td className="py-3 px-3 text-slate-700">{o.customerName}</td>
                          <td className="py-3 px-3 text-slate-600">
                            <p className="font-medium text-[#111827] truncate max-w-xs">{o.file.originalName}</p>
                            <p className="text-xs text-slate-500">
                              {o.item.printTariffName} · {o.item.pageCount} hlm · {o.item.copies} rangkap
                            </p>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-semibold text-[#111827] tabular-nums whitespace-nowrap">
                            {formatRupiah(o.totalAmount)}
                          </td>
                          <td className="py-3 px-3">
                            <StatusBadge status={o.status} compact />
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedOrderId(o.id)}
                              className="min-h-[34px] px-3 py-1 rounded-lg border border-slate-300 bg-white hover:border-[#EA580C] text-xs font-semibold text-[#111827] cursor-pointer"
                            >
                              Detail
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Antrean View */
          <div className="space-y-6">
            {/* Summary Counters matching Page 6 */}
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-4" aria-label="Ringkasan antrean">
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <p className="font-mono text-3xl font-extrabold text-[#111827] tabular-nums">
                  {ordersData.counts.pending}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-600">Menunggu konfirmasi</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <p className="font-mono text-3xl font-extrabold text-[#C2410C] tabular-nums">
                  {ordersData.counts.printing + ordersData.counts.confirmed}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-600">Dikonfirmasi &amp; dicetak</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <p className="font-mono text-3xl font-extrabold text-emerald-700 tabular-nums">
                  {ordersData.counts.ready}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-600">Siap diambil</p>
              </div>
            </section>

            {/* Filter & Search Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl overflow-x-auto">
                {(
                  [
                    { id: 'all', label: 'Semua Aktif' },
                    { id: 'pending', label: 'Menunggu' },
                    { id: 'confirmed', label: 'Dikonfirmasi' },
                    { id: 'printing', label: 'Dicetak' },
                    { id: 'ready', label: 'Siap Diambil' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
                    className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                      statusFilter === tab.id
                        ? 'bg-white text-[#111827] shadow-sm'
                        : 'text-slate-600 hover:text-[#111827]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-64">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari antrean, nama, file..."
                    aria-label="Cari pesanan di antrean"
                    className="w-full min-h-[42px] pl-10 pr-4 py-2 rounded-xl border border-slate-300 bg-white text-sm text-[#111827] focus:border-[#EA580C] focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void refreshAll()}
                  aria-label="Segarkan daftar antrean"
                  className="min-h-[42px] min-w-[42px] px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-700 cursor-pointer"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Active Queue Table */}
            <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              {loading && ordersData.orders.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">Memuat antrean cetak...</div>
              ) : activeOrders.length === 0 ? (
                <div className="p-10 text-center space-y-2">
                  <p className="text-sm font-semibold text-[#111827]">
                    Tidak ada pesanan aktif pada filter ini.
                  </p>
                  <p className="text-xs text-slate-500">
                    Pesanan baru dari pelanggan akan muncul otomatis di daftar ini.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-500">
                        <th className="py-3 px-4">Antrean</th>
                        <th className="py-3 px-3">Pelanggan</th>
                        <th className="py-3 px-3">Dokumen &amp; Spesifikasi</th>
                        <th className="py-3 px-3">Pembayaran</th>
                        <th className="py-3 px-3 text-right">Total</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {activeOrders.map((o) => (
                        <tr key={o.id} className="hover:bg-[#FEFBE8]/50 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-[#111827] tabular-nums whitespace-nowrap">
                            {o.queueNumber}
                          </td>
                          <td className="py-3.5 px-3">
                            <p className="font-semibold text-[#111827]">{o.customerName}</p>
                            {o.customerPhone && (
                              <p className="text-xs text-slate-500 font-mono">{o.customerPhone}</p>
                            )}
                          </td>
                          <td className="py-3.5 px-3">
                            <p className="font-medium text-[#111827] truncate max-w-[240px]">
                              {o.file.originalName}
                            </p>
                            <p className="text-xs text-slate-500">
                              {o.item.colorMode || o.item.printTariffName} {o.item.paperSize ?? ''} ·{' '}
                              {o.item.pageCount} hlm · {o.item.copies} rangkap · {o.item.bindTariffName}
                            </p>
                          </td>
                          <td className="py-3.5 px-3">
                            <div className="space-y-1">
                              <PaymentStatusTag status={o.payment.status} />
                              <p className="text-[11px] text-slate-500">
                                {getPaymentMethodLabel(o.payment.method)}
                              </p>
                            </div>
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono font-bold text-[#111827] tabular-nums whitespace-nowrap">
                            {formatRupiah(o.totalAmount)}
                          </td>
                          <td className="py-3.5 px-3">
                            <StatusBadge status={o.status} compact />
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedOrderId(o.id)}
                              className="min-h-[36px] px-3.5 py-1.5 rounded-lg bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-semibold whitespace-nowrap cursor-pointer"
                            >
                              Proses
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {/* Logout Confirmation Modal matching Page 6 */}
      {showLogoutModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-modal-title"
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-5">
            <div className="h-11 w-11 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-[#EA580C]">
              <LogOut className="h-5 w-5" aria-hidden="true" />
            </div>

            <div>
              <h2 id="logout-modal-title" className="text-lg font-bold text-[#111827]">
                Keluar dari akun operator?
              </h2>
              <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                Anda perlu masuk lagi dengan email dan kata sandi untuk mengelola antrean. Pesanan yang sedang berjalan tidak terpengaruh.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="min-h-[42px] px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-sm font-semibold text-slate-700 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowLogoutModal(false);
                  await onLogout();
                }}
                className="min-h-[42px] px-5 py-2 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white text-sm font-semibold cursor-pointer"
              >
                Ya, keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
