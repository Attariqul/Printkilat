import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

function formatFriendlyError(rawMessage: string): string {
  try {
    const parsed = JSON.parse(rawMessage) as { error?: string; operationType?: string; path?: string };
    if (parsed && typeof parsed.error === 'string') {
      if (parsed.error.toLowerCase().includes('missing or insufficient permissions')) {
        return `Akses ditolak oleh aturan keamanan database (${parsed.operationType ?? 'akses'} pada ${parsed.path ?? 'dokumen'}). Pastikan Anda menggunakan kode pelacakan yang benar atau akun operator yang sah.`;
      }
      return parsed.error;
    }
  } catch {
    // Non-JSON error
  }
  return rawMessage || 'Terjadi kesalahan tak terduga saat memproses data.';
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: formatFriendlyError(error.message),
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Uncaught application error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FFFDF9] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl border border-red-200 shadow-sm p-6 space-y-4 text-center">
            <div className="h-12 w-12 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center mx-auto text-red-600">
              <AlertTriangle className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="space-y-1.5">
              <h1 className="text-lg font-extrabold text-[#111827]">
                Terjadi Gangguan Koneksi Data
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed">{this.state.message}</p>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              <span>Muat Ulang Halaman</span>
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
