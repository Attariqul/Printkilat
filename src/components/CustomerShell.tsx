import type { ReactNode } from 'react';
import { Clock, FilePlus2, Home, ReceiptText } from 'lucide-react';

export type CustomerTab = 'home' | 'order' | 'track' | 'tariffs' | 'history';

interface CustomerShellProps {
  activeTab: CustomerTab;
  onNavigate: (tab: CustomerTab) => void;
  onExitToGate: () => void;
  hideBottomNav?: boolean;
  children: ReactNode;
}

export function CustomerShell({
  activeTab,
  onNavigate,
  onExitToGate,
  hideBottomNav = false,
  children,
}: CustomerShellProps) {
  return (
    <div className="min-h-screen bg-[#FFFDF9] flex flex-col">
      {/* Top Navigation Bar (Desktop 3-zone contract, compact mobile top bar) */}
      <header className="sticky top-0 z-30 bg-[#F97316] text-white border-b border-orange-600/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-14 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="text-lg font-extrabold tracking-tight text-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            PrintKilat
          </button>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-orange-50" aria-label="Menu Pelanggan">
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'home' ? 'border-white text-white font-semibold' : 'border-transparent hover:text-white'
              }`}
            >
              Beranda
            </button>
            <button
              type="button"
              onClick={() => onNavigate('order')}
              className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'order' ? 'border-white text-white font-semibold' : 'border-transparent hover:text-white'
              }`}
            >
              Buat Pesanan
            </button>
            <button
              type="button"
              onClick={() => onNavigate('track')}
              className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'track' ? 'border-white text-white font-semibold' : 'border-transparent hover:text-white'
              }`}
            >
              Lacak Pesanan
            </button>
            <button
              type="button"
              onClick={() => onNavigate('tariffs')}
              className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'tariffs' ? 'border-white text-white font-semibold' : 'border-transparent hover:text-white'
              }`}
            >
              Daftar Harga
            </button>
            <button
              type="button"
              onClick={() => onNavigate('history')}
              className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'history' ? 'border-white text-white font-semibold' : 'border-transparent hover:text-white'
              }`}
            >
              Riwayat
            </button>
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={onExitToGate}
              className="min-h-[36px] px-3.5 py-1.5 rounded-lg border border-white/40 text-xs font-semibold text-white hover:bg-white/15 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Keluar
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={`flex-1 ${hideBottomNav ? 'pb-32 md:pb-12' : 'pb-24 md:pb-12'}`}>
        {children}
      </main>

      {/* Thumb-Friendly Mobile Bottom Tab Bar (< 64px, fits within 15% sticky cap) */}
      {!hideBottomNav && (
        <nav
          aria-label="Navigasi Bawah"
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200"
        >
          <div className="grid grid-cols-4 h-16 items-center">
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium cursor-pointer ${
                activeTab === 'home' ? 'text-[#C2410C] font-semibold' : 'text-slate-600'
              }`}
            >
              <Home className="h-5 w-5" aria-hidden="true" />
              <span>Beranda</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('order')}
              className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium cursor-pointer ${
                activeTab === 'order' ? 'text-[#C2410C] font-semibold' : 'text-slate-600'
              }`}
            >
              <FilePlus2 className="h-5 w-5" aria-hidden="true" />
              <span>Pesan</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('track')}
              className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium cursor-pointer ${
                activeTab === 'track' ? 'text-[#C2410C] font-semibold' : 'text-slate-600'
              }`}
            >
              <Clock className="h-5 w-5" aria-hidden="true" />
              <span>Lacak</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('tariffs')}
              className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium cursor-pointer ${
                activeTab === 'tariffs' || activeTab === 'history' ? 'text-[#C2410C] font-semibold' : 'text-slate-600'
              }`}
            >
              <ReceiptText className="h-5 w-5" aria-hidden="true" />
              <span>Tarif</span>
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
