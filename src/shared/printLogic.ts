export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'printing'
  | 'ready'
  | 'completed'
  | 'rejected';

export type PaymentMethod = 'cash' | 'qr' | 'transfer';
export type PaymentStatus = 'unpaid' | 'pending_verification' | 'paid';
export type TariffCategory = 'cetak' | 'jilid';
export type PaperSize = 'A4' | 'F4' | null;
export type ColorMode = 'BW' | 'Color' | null;

export interface ServiceTariff {
  id: string;
  name: string;
  category: TariffCategory;
  paperSize: PaperSize;
  colorMode: ColorMode;
  price: number;
  isActive: boolean;
  updatedAt: string;
}

export interface PaymentSettings {
  qrEnabled: boolean;
  qrLabel: string;
  qrImageBase64: string | null;
  qrImageMimeType: string | null;
  qrImageOriginalName: string | null;
  bankEnabled: boolean;
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
  paymentNote: string | null;
  updatedAt: string;
}

export interface OrderStatusLogItem {
  id: string | number;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  note: string | null;
  changedByName: string | null;
  createdAt: string;
}

export interface OrderDetail {
  id: string;
  queueNumber: string;
  trackingCode: string;
  customerName: string;
  customerPhone: string | null;
  status: OrderStatus;
  rejectionReason: string | null;
  notes: string | null;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  fileExpiresAt: string;
  item: {
    printTariffId: string;
    printTariffName: string;
    paperSize: PaperSize;
    colorMode: ColorMode;
    printUnitPrice: number;
    pageCount: number;
    copies: number;
    bindTariffId: string | null;
    bindTariffName: string;
    bindUnitPrice: number;
    subtotalPrint: number;
    subtotalBind: number;
  };
  file: {
    originalName: string;
    mimeType: string;
    fileSizeBytes: number;
    detectedPages: number | null;
    chunkCount?: number;
    deletedAt: string | null;
  };
  payment: {
    method: PaymentMethod;
    status: PaymentStatus;
    hasProof: boolean;
    proofOriginalName: string | null;
    verifiedAt: string | null;
  };
  statusLogs: OrderStatusLogItem[];
}

export interface PricingInput {
  printRate: number;
  pages: number;
  copies: number;
  bindRate: number;
}

export interface PricingBreakdown {
  printSubtotal: number;
  bindSubtotal: number;
  total: number;
}

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
export const FILE_CHUNK_RAW_BYTES = 450 * 1024;
export const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx'] as const;

export const ORDER_STEPS: readonly OrderStatus[] = [
  'pending',
  'confirmed',
  'printing',
  'ready',
  'completed',
];

export const ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ['confirmed', 'rejected'],
  confirmed: ['printing', 'rejected'],
  printing: ['ready', 'rejected'],
  ready: ['completed'],
  completed: [],
  rejected: [],
};

export function calculateOrderTotal(input: PricingInput): PricingBreakdown {
  const { printRate, pages, copies, bindRate } = input;
  if (!Number.isFinite(printRate) || printRate < 0) {
    throw new Error('Tarif cetak tidak valid.');
  }
  if (!Number.isFinite(bindRate) || bindRate < 0) {
    throw new Error('Tarif jilid tidak valid.');
  }
  if (!Number.isInteger(pages) || pages < 1) {
    throw new Error('Jumlah halaman minimal 1.');
  }
  if (!Number.isInteger(copies) || copies < 1) {
    throw new Error('Jumlah rangkap minimal 1.');
  }

  const printSubtotal = Math.round(printRate) * pages * copies;
  const bindSubtotal = Math.round(bindRate) * copies;
  return {
    printSubtotal,
    bindSubtotal,
    total: printSubtotal + bindSubtotal,
  };
}

export function formatRupiah(amount: number): string {
  const rounded = Math.round(Number.isFinite(amount) ? amount : 0);
  return 'Rp ' + rounded.toLocaleString('id-ID');
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

export function getJakartaDateYYYYMMDD(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find((p) => p.type === 'year')?.value ?? '2026';
  const month = parts.find((p) => p.type === 'month')?.value ?? '01';
  const day = parts.find((p) => p.type === 'day')?.value ?? '01';
  return `${year}${month}${day}`;
}

export function formatQueueNumber(dateYYYYMMDD: string, sequence: number): string {
  const cleanDate = dateYYYYMMDD.replace(/[^0-9]/g, '').slice(0, 8);
  if (cleanDate.length !== 8) {
    throw new Error('Format tanggal antrean harus YYYYMMDD.');
  }
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new Error('Nomor urut antrean minimal 1.');
  }
  return `PK-${cleanDate}-${String(sequence).padStart(3, '0')}`;
}

export function buildTrackingCode(randomValues: Uint8Array | number[]): string {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let suffix = '';
  for (let i = 0; i < 8; i++) {
    const val = randomValues[i] ?? 0;
    suffix += alphabet[val % alphabet.length];
  }
  return `PK-TRK-${suffix}`;
}

export function calculateChunkCount(fileSizeBytes: number): number {
  if (!Number.isFinite(fileSizeBytes) || fileSizeBytes <= 0) return 0;
  return Math.ceil(fileSizeBytes / FILE_CHUNK_RAW_BYTES);
}

export function slugifyTariffId(name: string, suffix = ''): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  const cleanSuffix = suffix.replace(/[^a-zA-Z0-9_-]/g, '');
  const id = [base || 'tarif', cleanSuffix].filter(Boolean).join('-');
  return id.slice(0, 100);
}

export function requiresPaymentProof(method: PaymentMethod): boolean {
  return method === 'qr' || method === 'transfer';
}

export function validateOrderPaymentInput(
  method: PaymentMethod,
  hasProofFile: boolean
): { ok: boolean; error?: string } {
  if (requiresPaymentProof(method) && !hasProofFile) {
    return {
      ok: false,
      error:
        method === 'qr'
          ? 'Bukti pembayaran QR wajib diunggah sebelum mengirim pesanan.'
          : 'Bukti transfer bank wajib diunggah sebelum mengirim pesanan.',
    };
  }
  return { ok: true };
}

export function canTransitionStatus(
  current: OrderStatus,
  next: OrderStatus,
  rejectionReason?: string
): { ok: boolean; error?: string } {
  if (current === next) {
    return { ok: false, error: 'Status baru sama dengan status saat ini.' };
  }
  const allowed = ALLOWED_TRANSITIONS[current] ?? [];
  if (!allowed.includes(next)) {
    return {
      ok: false,
      error: `Perubahan status dari ${getStatusLabel(current)} ke ${getStatusLabel(next)} tidak diizinkan.`,
    };
  }
  if (next === 'rejected' && (!rejectionReason || rejectionReason.trim().length < 3)) {
    return {
      ok: false,
      error: 'Alasan penolakan wajib diisi (minimal 3 karakter).',
    };
  }
  return { ok: true };
}

export function getStatusLabel(status: OrderStatus): string {
  switch (status) {
    case 'pending':
      return 'Menunggu Konfirmasi';
    case 'confirmed':
      return 'Dikonfirmasi';
    case 'printing':
      return 'Sedang Dicetak';
    case 'ready':
      return 'Siap Diambil';
    case 'completed':
      return 'Selesai';
    case 'rejected':
      return 'Ditolak';
  }
}

export function getShortStatusLabel(status: OrderStatus): string {
  switch (status) {
    case 'pending':
      return 'Menunggu';
    case 'confirmed':
      return 'Dikonfirmasi';
    case 'printing':
      return 'Dicetak';
    case 'ready':
      return 'Siap Diambil';
    case 'completed':
      return 'Selesai';
    case 'rejected':
      return 'Ditolak';
  }
}

export function getPaymentMethodLabel(method: PaymentMethod): string {
  switch (method) {
    case 'cash':
      return 'Tunai di tempat';
    case 'qr':
      return 'QR / QRIS';
    case 'transfer':
      return 'Transfer Bank';
  }
}

export function getPaymentStatusLabel(status: PaymentStatus): string {
  switch (status) {
    case 'unpaid':
      return 'Belum Lunas';
    case 'pending_verification':
      return 'Menunggu Verifikasi';
    case 'paid':
      return 'Lunas';
  }
}

export function getStatusStepIndex(status: OrderStatus): number {
  if (status === 'rejected') return -1;
  return ORDER_STEPS.indexOf(status);
}

export function validateUploadMeta(
  filename: string,
  sizeBytes: number
): { ok: boolean; error?: string; extension?: string } {
  const lower = filename.trim().toLowerCase();
  const ext = ALLOWED_EXTENSIONS.find((item) => lower.endsWith(item));
  if (!ext) {
    return {
      ok: false,
      error: 'Format berkas tidak didukung. Gunakan PDF, DOC, atau DOCX.',
    };
  }
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return { ok: false, error: 'Berkas kosong atau rusak.' };
  }
  if (sizeBytes > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      error: 'Ukuran berkas melebihi batas maksimum 20 MB.',
    };
  }
  return { ok: true, extension: ext };
}
