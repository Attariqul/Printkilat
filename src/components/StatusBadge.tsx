import {
  CheckCircle2,
  Clock,
  FileCheck2,
  PackageCheck,
  Printer,
  XCircle,
} from 'lucide-react';
import {
  getShortStatusLabel,
  getStatusLabel,
  type OrderStatus,
  type PaymentStatus,
} from '../shared/printLogic';

interface StatusBadgeProps {
  status: OrderStatus;
  compact?: boolean;
}

export function StatusBadge({ status, compact = false }: StatusBadgeProps) {
  const label = compact ? getShortStatusLabel(status) : getStatusLabel(status);

  switch (status) {
    case 'pending':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#FEFBE8] border border-[#FDE68A] px-2.5 py-1 text-xs font-semibold text-amber-900 whitespace-nowrap shrink-0">
          <Clock className="h-3.5 w-3.5 text-[#D97706]" aria-hidden="true" />
          {label}
        </span>
      );
    case 'confirmed':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-orange-50 border border-orange-200 px-2.5 py-1 text-xs font-semibold text-orange-900 whitespace-nowrap shrink-0">
          <FileCheck2 className="h-3.5 w-3.5 text-[#EA580C]" aria-hidden="true" />
          {label}
        </span>
      );
    case 'printing':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-orange-100 border border-orange-300 px-2.5 py-1 text-xs font-semibold text-[#9A3412] whitespace-nowrap shrink-0">
          <Printer className="h-3.5 w-3.5 text-[#EA580C]" aria-hidden="true" />
          {label}
        </span>
      );
    case 'ready':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-semibold text-emerald-800 whitespace-nowrap shrink-0">
          <PackageCheck className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
          {label}
        </span>
      );
    case 'completed':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 whitespace-nowrap shrink-0">
          <CheckCircle2 className="h-3.5 w-3.5 text-slate-600" aria-hidden="true" />
          {label}
        </span>
      );
    case 'rejected':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-800 whitespace-nowrap shrink-0">
          <XCircle className="h-3.5 w-3.5 text-red-600" aria-hidden="true" />
          {label}
        </span>
      );
  }
}

export function PaymentStatusTag({ status }: { status: PaymentStatus }) {
  if (status === 'paid') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-semibold text-emerald-800 whitespace-nowrap shrink-0">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
        Lunas
      </span>
    );
  }
  if (status === 'pending_verification') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#FEFBE8] border border-[#FDE68A] px-2.5 py-1 text-xs font-semibold text-amber-900 whitespace-nowrap shrink-0">
        <Clock className="h-3.5 w-3.5 text-[#D97706]" aria-hidden="true" />
        Menunggu verifikasi
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 whitespace-nowrap shrink-0">
      <Clock className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
      Bayar di gerai
    </span>
  );
}
