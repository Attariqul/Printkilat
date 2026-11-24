import { signInWithPopup, signOut, type User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore';
import { PDFDocument } from 'pdf-lib';
import {
  auth,
  BOOTSTRAPPED_ADMIN_EMAIL,
  db,
  googleAuthProvider,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import {
  buildTrackingCode,
  calculateChunkCount,
  calculateOrderTotal,
  canTransitionStatus,
  FILE_CHUNK_RAW_BYTES,
  formatQueueNumber,
  getJakartaDateYYYYMMDD,
  getStatusLabel,
  slugifyTariffId,
  validateOrderPaymentInput,
  validateUploadMeta,
  type ColorMode,
  type OrderDetail,
  type OrderStatus,
  type OrderStatusLogItem,
  type PaperSize,
  type PaymentMethod,
  type PaymentSettings,
  type ServiceTariff,
  type TariffCategory,
} from '../shared/printLogic';

export interface OperatorUser {
  id: string;
  email: string;
  name: string;
  role?: string;
}

export interface OperatorWhitelistItem {
  email: string;
  name: string;
  role: 'operator' | 'owner';
  createdAt: string;
}

export interface OperatorOrdersResponse {
  orders: OrderDetail[];
  counts: {
    pending: number;
    confirmed: number;
    printing: number;
    ready: number;
    completed: number;
    rejected: number;
  };
}

export interface CreateOrderInput {
  file: File;
  printTariffId: string;
  bindTariffId: string | null;
  pageCount: number;
  copies: number;
  paymentMethod: PaymentMethod;
  notes: string;
  customerName: string;
  customerPhone: string;
  proofFile?: File | null;
}

export interface SavePaymentSettingsInput {
  qrEnabled: boolean;
  qrLabel: string;
  qrFile?: File | null;
  removeQrImage?: boolean;
  existingQrImageBase64?: string | null;
  existingQrImageMimeType?: string | null;
  existingQrImageOriginalName?: string | null;
  bankEnabled: boolean;
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
  paymentNote: string;
}

export interface OperatorProofDetail {
  blobUrl: string;
  originalName: string;
  mimeType: string;
}

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  qrEnabled: true,
  qrLabel: 'QRIS Gerai PrintKilat',
  qrImageBase64: null,
  qrImageMimeType: null,
  qrImageOriginalName: null,
  bankEnabled: true,
  bankName: 'BCA',
  bankAccountNumber: '7710-4429-18',
  bankAccountHolder: 'Gerai Fotokopi Kampus',
  paymentNote: 'Unggah foto/screenshot bukti bayar agar pesanan langsung dikonfirmasi operator.',
  updatedAt: new Date(0).toISOString(),
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function formatReadableError(err: unknown, fallback = 'Terjadi kesalahan.'): string {
  if (!(err instanceof Error)) return fallback;
  const msg = err.message || '';

  if (msg.includes('auth/unauthorized-domain')) {
    const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'domain ini';
    return `Domain (${currentHost}) belum didaftarkan di Firebase. Silakan tambahkan "${currentHost}" di Firebase Console -> Authentication -> Settings -> Authorized domains.`;
  }
  if (msg.includes('auth/popup-closed-by-user')) {
    return 'Jendela masuk Google ditutup sebelum proses selesai. Silakan coba klik tombol masuk kembali.';
  }
  if (msg.includes('auth/network-request-failed')) {
    return 'Gagal terhubung ke server autentikasi Firebase. Periksa koneksi internet Anda.';
  }

  try {
    const parsed = JSON.parse(msg) as { error?: string };
    if (parsed && typeof parsed.error === 'string') {
      if (parsed.error.toLowerCase().includes('missing or insufficient permissions')) {
        return 'Akses ditolak oleh aturan keamanan database. Pastikan bukti bayar/kode/akun operator Anda valid.';
      }
      return parsed.error;
    }
  } catch {
    // Plain error message
  }
  return msg || fallback;
}

interface CanonicalTariffSeed {
  id: string;
  name: string;
  category: TariffCategory;
  paperSize: PaperSize;
  colorMode: ColorMode;
  price: number;
}

const CANONICAL_DEFAULT_TARIFFS: CanonicalTariffSeed[] = [
  {
    id: 'cetak-bw-a4',
    name: 'Print Hitam Putih A4',
    category: 'cetak',
    paperSize: 'A4',
    colorMode: 'BW',
    price: 500,
  },
  {
    id: 'cetak-color-a4',
    name: 'Print Warna A4',
    category: 'cetak',
    paperSize: 'A4',
    colorMode: 'Color',
    price: 1500,
  },
  {
    id: 'cetak-bw-f4',
    name: 'Print Hitam Putih F4',
    category: 'cetak',
    paperSize: 'F4',
    colorMode: 'BW',
    price: 600,
  },
  {
    id: 'cetak-color-f4',
    name: 'Print Warna F4',
    category: 'cetak',
    paperSize: 'F4',
    colorMode: 'Color',
    price: 2000,
  },
  {
    id: 'jilid-tanpa',
    name: 'Tanpa jilid',
    category: 'jilid',
    paperSize: null,
    colorMode: null,
    price: 0,
  },
  {
    id: 'jilid-lakban',
    name: 'Jilid Lakban',
    category: 'jilid',
    paperSize: null,
    colorMode: null,
    price: 3000,
  },
  {
    id: 'jilid-spiral',
    name: 'Jilid Spiral',
    category: 'jilid',
    paperSize: null,
    colorMode: null,
    price: 8000,
  },
];

function timestampToIso(value: unknown): string {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (typeof value === 'string' && value) {
    return value;
  }
  return new Date().toISOString();
}

function mapTariffDoc(id: string, data: DocumentData): ServiceTariff {
  return {
    id,
    name: String(data.name ?? ''),
    category: (data.category === 'jilid' ? 'jilid' : 'cetak') as TariffCategory,
    paperSize: (data.paperSize === 'A4' || data.paperSize === 'F4' ? data.paperSize : null) as PaperSize,
    colorMode: (data.colorMode === 'BW' || data.colorMode === 'Color' ? data.colorMode : null) as ColorMode,
    price: Number(data.price ?? 0),
    isActive: Boolean(data.isActive),
    updatedAt: timestampToIso(data.updatedAt),
  };
}

function mapPaymentSettingsDoc(data: DocumentData): PaymentSettings {
  return {
    qrEnabled: typeof data.qrEnabled === 'boolean' ? data.qrEnabled : true,
    qrLabel: typeof data.qrLabel === 'string' ? data.qrLabel : DEFAULT_PAYMENT_SETTINGS.qrLabel,
    qrImageBase64: typeof data.qrImageBase64 === 'string' && data.qrImageBase64 ? data.qrImageBase64 : null,
    qrImageMimeType: typeof data.qrImageMimeType === 'string' && data.qrImageMimeType ? data.qrImageMimeType : null,
    qrImageOriginalName:
      typeof data.qrImageOriginalName === 'string' && data.qrImageOriginalName ? data.qrImageOriginalName : null,
    bankEnabled: typeof data.bankEnabled === 'boolean' ? data.bankEnabled : true,
    bankName: typeof data.bankName === 'string' ? data.bankName : DEFAULT_PAYMENT_SETTINGS.bankName,
    bankAccountNumber:
      typeof data.bankAccountNumber === 'string'
        ? data.bankAccountNumber
        : DEFAULT_PAYMENT_SETTINGS.bankAccountNumber,
    bankAccountHolder:
      typeof data.bankAccountHolder === 'string'
        ? data.bankAccountHolder
        : DEFAULT_PAYMENT_SETTINGS.bankAccountHolder,
    paymentNote: typeof data.paymentNote === 'string' && data.paymentNote ? data.paymentNote : null,
    updatedAt: timestampToIso(data.updatedAt),
  };
}

function normalizePaymentMethod(raw: unknown): PaymentMethod {
  if (raw === 'qr') return 'qr';
  if (raw === 'transfer') return 'transfer';
  return 'cash';
}

function mapOrderDoc(id: string, data: DocumentData, customerPhone: string | null = null): OrderDetail {
  const item = (data.item ?? {}) as DocumentData;
  const file = (data.file ?? {}) as DocumentData;
  const payment = (data.payment ?? {}) as DocumentData;
  const rawLogs = Array.isArray(data.statusLogs) ? data.statusLogs : [];

  const statusLogs: OrderStatusLogItem[] = rawLogs.map((entry, idx) => {
    const log = (entry ?? {}) as DocumentData;
    return {
      id: typeof log.id === 'string' || typeof log.id === 'number' ? log.id : idx + 1,
      fromStatus: (log.fromStatus ?? null) as OrderStatus | null,
      toStatus: (log.toStatus ?? 'pending') as OrderStatus,
      note: typeof log.note === 'string' ? log.note : null,
      changedByName: typeof log.changedByName === 'string' ? log.changedByName : null,
      createdAt: timestampToIso(log.createdAt),
    };
  });

  return {
    id,
    queueNumber: String(data.queueNumber ?? ''),
    trackingCode: String(data.trackingCode ?? id),
    customerName: String(data.customerName ?? 'Pelanggan Tamu'),
    customerPhone,
    status: (data.status ?? 'pending') as OrderStatus,
    rejectionReason: typeof data.rejectionReason === 'string' ? data.rejectionReason : null,
    notes: typeof data.notes === 'string' ? data.notes : null,
    totalAmount: Number(data.totalAmount ?? 0),
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
    fileExpiresAt: timestampToIso(data.fileExpiresAt),
    item: {
      printTariffId: String(item.printTariffId ?? ''),
      printTariffName: String(item.printTariffName ?? ''),
      paperSize: (item.paperSize === 'A4' || item.paperSize === 'F4' ? item.paperSize : null) as PaperSize,
      colorMode: (item.colorMode === 'BW' || item.colorMode === 'Color' ? item.colorMode : null) as ColorMode,
      printUnitPrice: Number(item.printUnitPrice ?? 0),
      pageCount: Number(item.pageCount ?? 1),
      copies: Number(item.copies ?? 1),
      bindTariffId: typeof item.bindTariffId === 'string' ? item.bindTariffId : null,
      bindTariffName: String(item.bindTariffName ?? 'Tanpa jilid'),
      bindUnitPrice: Number(item.bindUnitPrice ?? 0),
      subtotalPrint: Number(item.subtotalPrint ?? 0),
      subtotalBind: Number(item.subtotalBind ?? 0),
    },
    file: {
      originalName: String(file.originalName ?? 'dokumen'),
      mimeType: String(file.mimeType ?? 'application/octet-stream'),
      fileSizeBytes: Number(file.fileSizeBytes ?? 0),
      detectedPages: typeof file.detectedPages === 'number' ? file.detectedPages : null,
      chunkCount: typeof file.chunkCount === 'number' ? file.chunkCount : undefined,
      deletedAt: file.deletedAt ? timestampToIso(file.deletedAt) : null,
    },
    payment: {
      method: normalizePaymentMethod(payment.method),
      status:
        payment.status === 'paid' || payment.status === 'pending_verification'
          ? payment.status
          : 'unpaid',
      hasProof: Boolean(payment.hasProof),
      proofOriginalName: typeof payment.proofOriginalName === 'string' ? payment.proofOriginalName : null,
      verifiedAt: payment.verifiedAt ? timestampToIso(payment.verifiedAt) : null,
    },
    statusLogs,
  };
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function prepareImagePayload(file: File, label = 'Gambar'): Promise<{
  originalName: string;
  mimeType: string;
  dataBase64: string;
}> {
  if (!file.type.startsWith('image/')) {
    throw new ApiError(`${label} harus berupa berkas gambar (JPG, PNG, WebP).`, 400);
  }
  const rawBytes = new Uint8Array(await file.arrayBuffer());
  const rawBase64 = uint8ArrayToBase64(rawBytes);

  if (rawBase64.length <= 720000) {
    return {
      originalName: file.name.slice(0, 255),
      mimeType: file.type || 'image/jpeg',
      dataBase64: rawBase64,
    };
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error(`Gagal membaca ${label.toLowerCase()}.`));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error(`${label} tidak dapat diproses.`));
    el.src = dataUrl;
  });

  const maxDim = 1280;
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new ApiError(`Browser gagal memproses kompresi ${label.toLowerCase()}.`, 400);
  }
  ctx.drawImage(img, 0, 0, width, height);

  let quality = 0.85;
  let compressedBase64 = '';
  while (quality >= 0.35) {
    const outUrl = canvas.toDataURL('image/jpeg', quality);
    const commaIdx = outUrl.indexOf(',');
    compressedBase64 = commaIdx >= 0 ? outUrl.slice(commaIdx + 1) : outUrl;
    if (compressedBase64.length <= 720000) break;
    quality -= 0.12;
  }

  if (!compressedBase64 || compressedBase64.length > 740000) {
    throw new ApiError(`Ukuran ${label.toLowerCase()} terlalu besar setelah kompresi.`, 400);
  }

  return {
    originalName: file.name.slice(0, 255),
    mimeType: 'image/jpeg',
    dataBase64: compressedBase64,
  };
}

export async function detectPdfPagesInBrowser(file: File): Promise<number | null> {
  if (!file.name.toLowerCase().endsWith('.pdf')) return null;
  try {
    const buf = await file.arrayBuffer();
    const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
    const count = doc.getPageCount();
    return count > 0 ? count : null;
  } catch {
    return null;
  }
}

async function ensureCanonicalDefaultTariffs(): Promise<void> {
  const batch = writeBatch(db);
  for (const t of CANONICAL_DEFAULT_TARIFFS) {
    const ref = doc(db, 'tariffs', t.id);
    batch.set(ref, {
      name: t.name,
      category: t.category,
      paperSize: t.paperSize,
      colorMode: t.colorMode,
      price: t.price,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'tariffs');
  }
}

function sortTariffs(list: ServiceTariff[]): ServiceTariff[] {
  return [...list].sort((a, b) => {
    if (a.category !== b.category) {
      return a.category === 'cetak' ? -1 : 1;
    }
    return a.price - b.price;
  });
}

export async function fetchTariffs(all = false): Promise<ServiceTariff[]> {
  try {
    const tariffsCol = collection(db, 'tariffs');
    const q = all ? tariffsCol : query(tariffsCol, where('isActive', '==', true));
    let snap = await getDocs(q);

    if (snap.empty) {
      const allCheck = all ? snap : await getDocs(query(tariffsCol, where('isActive', '==', true)));
      if (allCheck.empty) {
        await ensureCanonicalDefaultTariffs();
        snap = await getDocs(q);
      }
    }

    const mapped = snap.docs.map((d) => mapTariffDoc(d.id, d.data()));
    return sortTariffs(mapped);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'tariffs');
  }
}

export async function fetchPaymentSettings(): Promise<PaymentSettings> {
  try {
    const snap = await getDoc(doc(db, 'settings', 'payment'));
    if (!snap.exists()) {
      return DEFAULT_PAYMENT_SETTINGS;
    }
    return mapPaymentSettingsDoc(snap.data());
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'settings/payment');
  }
}

export async function savePaymentSettings(
  input: SavePaymentSettingsInput
): Promise<PaymentSettings> {
  if (!input.qrEnabled && !input.bankEnabled) {
    throw new ApiError('Aktifkan minimal satu opsi pembayaran non-tunai (QR atau Rekening Bank).', 400);
  }
  if (input.bankEnabled && (!input.bankName.trim() || !input.bankAccountNumber.trim() || !input.bankAccountHolder.trim())) {
    throw new ApiError('Nama bank, nomor rekening, dan atas nama wajib diisi jika Transfer Bank aktif.', 400);
  }

  let qrImageBase64 = input.removeQrImage ? null : input.existingQrImageBase64 ?? null;
  let qrImageMimeType = input.removeQrImage ? null : input.existingQrImageMimeType ?? null;
  let qrImageOriginalName = input.removeQrImage ? null : input.existingQrImageOriginalName ?? null;

  if (input.qrFile) {
    const img = await prepareImagePayload(input.qrFile, 'Gambar QR pembayaran');
    qrImageBase64 = img.dataBase64;
    qrImageMimeType = img.mimeType;
    qrImageOriginalName = img.originalName;
  }

  const payload = {
    qrEnabled: Boolean(input.qrEnabled),
    qrLabel: (input.qrLabel.trim() || 'QRIS Gerai PrintKilat').slice(0, 100),
    qrImageBase64,
    qrImageMimeType,
    qrImageOriginalName,
    bankEnabled: Boolean(input.bankEnabled),
    bankName: input.bankName.trim().slice(0, 60),
    bankAccountNumber: input.bankAccountNumber.trim().slice(0, 60),
    bankAccountHolder: input.bankAccountHolder.trim().slice(0, 100),
    paymentNote: input.paymentNote.trim().slice(0, 300) || null,
    updatedAt: serverTimestamp(),
  };

  try {
    const ref = doc(db, 'settings', 'payment');
    await setDoc(ref, payload);
    const refreshed = await getDoc(ref);
    if (refreshed.exists()) {
      return mapPaymentSettingsDoc(refreshed.data());
    }
    return mapPaymentSettingsDoc({ ...payload, updatedAt: new Date().toISOString() });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'settings/payment');
  }
}

export async function createOrder(input: CreateOrderInput): Promise<OrderDetail> {
  const fileCheck = validateUploadMeta(input.file.name, input.file.size);
  if (!fileCheck.ok) {
    throw new ApiError(fileCheck.error ?? 'Berkas tidak valid.', 400);
  }
  if (!Number.isInteger(input.pageCount) || input.pageCount < 1 || input.pageCount > 2000) {
    throw new ApiError('Jumlah halaman harus antara 1 hingga 2000.', 400);
  }
  if (!Number.isInteger(input.copies) || input.copies < 1 || input.copies > 200) {
    throw new ApiError('Jumlah rangkap harus antara 1 hingga 200.', 400);
  }

  const paymentValidation = validateOrderPaymentInput(
    input.paymentMethod,
    Boolean(input.proofFile)
  );
  if (!paymentValidation.ok) {
    throw new ApiError(paymentValidation.error ?? 'Bukti pembayaran wajib diunggah.', 400);
  }

  let printTariffData: ServiceTariff;
  let bindTariffData: ServiceTariff | null = null;

  try {
    const printSnap = await getDoc(doc(db, 'tariffs', input.printTariffId));
    if (!printSnap.exists()) {
      throw new ApiError('Layanan cetak tidak ditemukan.', 400);
    }
    printTariffData = mapTariffDoc(printSnap.id, printSnap.data());

    if (input.bindTariffId) {
      const bindSnap = await getDoc(doc(db, 'tariffs', input.bindTariffId));
      if (bindSnap.exists()) {
        bindTariffData = mapTariffDoc(bindSnap.id, bindSnap.data());
      }
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    handleFirestoreError(err, OperationType.GET, `tariffs/${input.printTariffId}`);
  }

  const pricing = calculateOrderTotal({
    printRate: printTariffData.price,
    pages: input.pageCount,
    copies: input.copies,
    bindRate: bindTariffData?.price ?? 0,
  });

  const detectedPages = await detectPdfPagesInBrowser(input.file);
  const rawBuffer = new Uint8Array(await input.file.arrayBuffer());
  const chunkCount = calculateChunkCount(rawBuffer.byteLength);
  if (chunkCount < 1 || chunkCount > 60) {
    throw new ApiError('Ukuran berkas melebihi batas chunk penyimpanan.', 400);
  }

  const chunksBase64: string[] = [];
  for (let i = 0; i < chunkCount; i++) {
    const start = i * FILE_CHUNK_RAW_BYTES;
    const end = Math.min(rawBuffer.byteLength, start + FILE_CHUNK_RAW_BYTES);
    chunksBase64.push(uint8ArrayToBase64(rawBuffer.subarray(start, end)));
  }

  let proofPayload: { originalName: string; mimeType: string; dataBase64: string } | null = null;
  if ((input.paymentMethod === 'qr' || input.paymentMethod === 'transfer') && input.proofFile) {
    proofPayload = await prepareImagePayload(input.proofFile, 'Bukti pembayaran');
  }

  const randomBytes = new Uint8Array(8);
  crypto.getRandomValues(randomBytes);
  const trackingCode = buildTrackingCode(randomBytes);
  const dateKey = getJakartaDateYYYYMMDD();

  let queueNumber = '';
  try {
    const counterRef = doc(db, 'counters', dateKey);
    queueNumber = await runTransaction(db, async (tx) => {
      const snap = await tx.get(counterRef);
      const nextSeq = snap.exists() ? Number(snap.data().lastSeq ?? 0) + 1 : 1;
      tx.set(counterRef, {
        dateKey,
        lastSeq: nextSeq,
        updatedAt: serverTimestamp(),
      });
      return formatQueueNumber(dateKey, nextSeq);
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `counters/${dateKey}`);
  }

  const cleanName = (input.customerName.trim() || 'Pelanggan Tamu').slice(0, 100);
  const cleanPhone = input.customerPhone.trim().slice(0, 40) || null;
  const cleanNotes = input.notes.trim().slice(0, 500) || null;
  const expiresAt = Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const nowIso = new Date().toISOString();

  const orderDocPayload = {
    queueNumber,
    trackingCode,
    customerName: cleanName,
    status: 'pending',
    rejectionReason: null,
    notes: cleanNotes,
    totalAmount: pricing.total,
    item: {
      printTariffId: printTariffData.id,
      printTariffName: printTariffData.name,
      paperSize: printTariffData.paperSize,
      colorMode: printTariffData.colorMode,
      printUnitPrice: printTariffData.price,
      pageCount: input.pageCount,
      copies: input.copies,
      bindTariffId: bindTariffData?.id ?? null,
      bindTariffName: bindTariffData?.name ?? 'Tanpa jilid',
      bindUnitPrice: bindTariffData?.price ?? 0,
      subtotalPrint: pricing.printSubtotal,
      subtotalBind: pricing.bindSubtotal,
    },
    file: {
      originalName: input.file.name.slice(0, 255),
      mimeType: (input.file.type || 'application/octet-stream').slice(0, 150),
      fileSizeBytes: rawBuffer.byteLength,
      detectedPages,
      chunkCount,
      deletedAt: null,
    },
    payment: {
      method: input.paymentMethod,
      status: proofPayload ? 'pending_verification' : 'unpaid',
      hasProof: Boolean(proofPayload),
      proofOriginalName: proofPayload ? proofPayload.originalName : null,
      verifiedAt: null,
    },
    statusLogs: [
      {
        id: 1,
        fromStatus: null,
        toStatus: 'pending',
        note: 'Pesanan diterima dari pelanggan',
        changedByName: cleanName,
        createdAt: nowIso,
      },
    ],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    fileExpiresAt: expiresAt,
  };

  try {
    const headerBatch = writeBatch(db);
    headerBatch.set(doc(db, 'orders', trackingCode), orderDocPayload);
    headerBatch.set(doc(db, 'orders', trackingCode, 'private', 'contact'), {
      customerPhone: cleanPhone,
      createdAt: serverTimestamp(),
    });
    if (proofPayload) {
      headerBatch.set(doc(db, 'orders', trackingCode, 'proof', 'main'), {
        originalName: proofPayload.originalName,
        mimeType: proofPayload.mimeType,
        dataBase64: proofPayload.dataBase64,
        updatedAt: serverTimestamp(),
      });
    }
    await headerBatch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `orders/${trackingCode}`);
  }

  const CHUNKS_PER_BATCH = 4;
  for (let start = 0; start < chunksBase64.length; start += CHUNKS_PER_BATCH) {
    const chunkBatch = writeBatch(db);
    const end = Math.min(chunksBase64.length, start + CHUNKS_PER_BATCH);
    for (let idx = start; idx < end; idx++) {
      const chunkDocId = `chunk_${String(idx).padStart(3, '0')}`;
      chunkBatch.set(doc(db, 'orders', trackingCode, 'fileChunks', chunkDocId), {
        chunkIndex: idx,
        dataBase64: chunksBase64[idx],
        createdAt: serverTimestamp(),
      });
    }
    try {
      await chunkBatch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `orders/${trackingCode}/fileChunks`);
    }
  }

  try {
    const createdSnap = await getDoc(doc(db, 'orders', trackingCode));
    if (createdSnap.exists()) {
      return mapOrderDoc(createdSnap.id, createdSnap.data(), cleanPhone);
    }
  } catch {
    // Fallback
  }

  return mapOrderDoc(
    trackingCode,
    {
      ...orderDocPayload,
      createdAt: nowIso,
      updatedAt: nowIso,
      fileExpiresAt: expiresAt.toDate().toISOString(),
    },
    cleanPhone
  );
}

export async function trackOrder(trackingCode: string): Promise<OrderDetail> {
  const clean = trackingCode.trim().toUpperCase();
  if (!/^PK-TRK-[A-Z0-9]{4,24}$/.test(clean)) {
    throw new ApiError('Format kode pelacakan tidak valid. Contoh: PK-TRK-XXXXXXXX.', 400);
  }
  try {
    const snap = await getDoc(doc(db, 'orders', clean));
    if (!snap.exists()) {
      throw new ApiError('Pesanan tidak ditemukan. Periksa kembali kode khusus Anda.', 404);
    }
    return mapOrderDoc(snap.id, snap.data(), null);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    handleFirestoreError(err, OperationType.GET, `orders/${clean}`);
  }
}

export async function uploadTransferProof(trackingCode: string, file: File): Promise<OrderDetail> {
  const clean = trackingCode.trim().toUpperCase();
  if (!/^PK-TRK-[A-Z0-9]{4,24}$/.test(clean)) {
    throw new ApiError('Kode pelacakan tidak valid.', 400);
  }
  const proofPayload = await prepareImagePayload(file, 'Bukti pembayaran');

  try {
    const orderRef = doc(db, 'orders', clean);
    const snap = await getDoc(orderRef);
    if (!snap.exists()) {
      throw new ApiError('Pesanan tidak ditemukan.', 404);
    }
    const existingData = snap.data();
    if (existingData.status === 'completed' || existingData.status === 'rejected') {
      throw new ApiError('Pesanan sudah selesai atau ditolak sehingga bukti tidak dapat diubah.', 400);
    }
    if (existingData.payment?.status === 'paid') {
      throw new ApiError('Pembayaran sudah diverifikasi lunas.', 400);
    }

    const method = existingData.payment?.method === 'qr' ? 'qr' : 'transfer';

    await setDoc(doc(db, 'orders', clean, 'proof', 'main'), {
      originalName: proofPayload.originalName,
      mimeType: proofPayload.mimeType,
      dataBase64: proofPayload.dataBase64,
      updatedAt: serverTimestamp(),
    });

    await updateDoc(orderRef, {
      payment: {
        method,
        status: 'pending_verification',
        hasProof: true,
        proofOriginalName: proofPayload.originalName,
        verifiedAt: null,
      },
      updatedAt: serverTimestamp(),
    });

    const refreshed = await getDoc(orderRef);
    return mapOrderDoc(refreshed.id, refreshed.data() ?? existingData, null);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    handleFirestoreError(err, OperationType.UPDATE, `orders/${clean}`);
  }
}

export async function resolveOperatorFromFirebaseUser(
  user: User | null
): Promise<OperatorUser | null> {
  if (!user || !user.emailVerified) return null;

  if (user.email && user.email.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase()) {
    return {
      id: user.uid,
      email: user.email,
      name: user.displayName || 'Admin PrintKilat',
      role: 'owner',
    };
  }

  try {
    const opSnap = await getDoc(doc(db, 'operators', user.uid));
    if (opSnap.exists()) {
      const data = opSnap.data();
      return {
        id: user.uid,
        email: String(data.email ?? user.email ?? ''),
        name: String(data.name ?? user.displayName ?? 'Operator Gerai'),
        role: String(data.role ?? 'operator'),
      };
    }
  } catch {
    // continue to whitelist check
  }

  if (user.email) {
    try {
      const cleanEmail = user.email.trim().toLowerCase();
      const wlSnap = await getDoc(doc(db, 'operator_whitelist', cleanEmail));
      if (wlSnap.exists()) {
        const data = wlSnap.data();
        return {
          id: user.uid,
          email: String(data.email ?? user.email ?? cleanEmail),
          name: String(data.name ?? user.displayName ?? 'Operator Gerai'),
          role: String(data.role ?? 'operator'),
        };
      }
    } catch {
      return null;
    }
  }

  return null;
}

export async function operatorLoginWithGoogle(): Promise<OperatorUser> {
  const cred = await signInWithPopup(auth, googleAuthProvider);
  const operator = await resolveOperatorFromFirebaseUser(cred.user);
  if (!operator) {
    await signOut(auth);
    throw new ApiError(
      `Akun ${cred.user.email ?? 'Google'} belum terdaftar sebagai operator gerai PrintKilat.`,
      403
    );
  }
  return operator;
}

export async function operatorLogout(): Promise<void> {
  await signOut(auth);
}

export async function fetchOperatorOrders(): Promise<OperatorOrdersResponse> {
  try {
    const snap = await getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc')));
    const orders = await Promise.all(
      snap.docs.map(async (d) => {
        let phone: string | null = null;
        try {
          const contactSnap = await getDoc(doc(db, 'orders', d.id, 'private', 'contact'));
          if (contactSnap.exists()) {
            const val = contactSnap.data().customerPhone;
            phone = typeof val === 'string' && val.trim() ? val.trim() : null;
          }
        } catch {
          phone = null;
        }
        return mapOrderDoc(d.id, d.data(), phone);
      })
    );

    return {
      orders,
      counts: {
        pending: orders.filter((o) => o.status === 'pending').length,
        confirmed: orders.filter((o) => o.status === 'confirmed').length,
        printing: orders.filter((o) => o.status === 'printing').length,
        ready: orders.filter((o) => o.status === 'ready').length,
        completed: orders.filter((o) => o.status === 'completed').length,
        rejected: orders.filter((o) => o.status === 'rejected').length,
      },
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'orders');
  }
}

export async function updateOperatorOrderStatus(
  id: string,
  payload: { status: OrderStatus; rejectionReason?: string; note?: string }
): Promise<OrderDetail> {
  try {
    const orderRef = doc(db, 'orders', id);
    const snap = await getDoc(orderRef);
    if (!snap.exists()) {
      throw new ApiError('Pesanan tidak ditemukan.', 404);
    }
    const data = snap.data();
    const currentStatus = data.status as OrderStatus;
    const transition = canTransitionStatus(currentStatus, payload.status, payload.rejectionReason);
    if (!transition.ok) {
      throw new ApiError(transition.error ?? 'Transisi status tidak valid.', 400);
    }

    const existingLogs = Array.isArray(data.statusLogs) ? data.statusLogs : [];
    const operatorName =
      auth.currentUser?.displayName || auth.currentUser?.email || 'Operator Gerai';
    const nextLog = {
      id: existingLogs.length + 1,
      fromStatus: currentStatus,
      toStatus: payload.status,
      note:
        payload.status === 'rejected'
          ? payload.rejectionReason?.trim() || 'Ditolak operator'
          : payload.note?.trim() || `Diubah ke ${getStatusLabel(payload.status)}`,
      changedByName: operatorName,
      createdAt: new Date().toISOString(),
    };

    const nextRejection =
      payload.status === 'rejected'
        ? payload.rejectionReason?.trim() ?? null
        : data.rejectionReason ?? null;

    await updateDoc(orderRef, {
      status: payload.status,
      rejectionReason: nextRejection,
      statusLogs: [...existingLogs, nextLog],
      updatedAt: serverTimestamp(),
    });

    const refreshed = await getDoc(orderRef);
    let phone: string | null = null;
    try {
      const contactSnap = await getDoc(doc(db, 'orders', id, 'private', 'contact'));
      phone =
        typeof contactSnap.data()?.customerPhone === 'string'
          ? contactSnap.data()?.customerPhone
          : null;
    } catch {
      phone = null;
    }
    return mapOrderDoc(refreshed.id, refreshed.data() ?? data, phone);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    handleFirestoreError(err, OperationType.UPDATE, `orders/${id}`);
  }
}

export async function markOperatorOrderPaid(id: string): Promise<OrderDetail> {
  try {
    const orderRef = doc(db, 'orders', id);
    const snap = await getDoc(orderRef);
    if (!snap.exists()) {
      throw new ApiError('Pesanan tidak ditemukan.', 404);
    }
    const data = snap.data();
    const currentPayment = (data.payment ?? {}) as DocumentData;

    await updateDoc(orderRef, {
      payment: {
        method: normalizePaymentMethod(currentPayment.method),
        status: 'paid',
        hasProof: Boolean(currentPayment.hasProof),
        proofOriginalName:
          typeof currentPayment.proofOriginalName === 'string'
            ? currentPayment.proofOriginalName
            : null,
        verifiedAt: Timestamp.now(),
      },
      updatedAt: serverTimestamp(),
    });

    const refreshed = await getDoc(orderRef);
    let phone: string | null = null;
    try {
      const contactSnap = await getDoc(doc(db, 'orders', id, 'private', 'contact'));
      phone =
        typeof contactSnap.data()?.customerPhone === 'string'
          ? contactSnap.data()?.customerPhone
          : null;
    } catch {
      phone = null;
    }
    return mapOrderDoc(refreshed.id, refreshed.data() ?? data, phone);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    handleFirestoreError(err, OperationType.UPDATE, `orders/${id}`);
  }
}

export async function downloadOperatorOrderFile(id: string, filename: string): Promise<void> {
  try {
    const orderSnap = await getDoc(doc(db, 'orders', id));
    const mimeType = String(orderSnap.data()?.file?.mimeType ?? 'application/octet-stream');

    const chunksSnap = await getDocs(
      query(collection(db, 'orders', id, 'fileChunks'), orderBy('chunkIndex', 'asc'))
    );
    if (chunksSnap.empty) {
      throw new ApiError('Data berkas tidak tersedia atau sudah dihapus.', 404);
    }

    const parts: BlobPart[] = chunksSnap.docs.map((chunkDoc) => {
      const b64 = String(chunkDoc.data().dataBase64 ?? '');
      const bytes = base64ToUint8Array(b64);
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    });

    const blob = new Blob(parts, { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    handleFirestoreError(err, OperationType.LIST, `orders/${id}/fileChunks`);
  }
}

export async function fetchOperatorProofDetail(id: string): Promise<OperatorProofDetail> {
  try {
    const proofSnap = await getDoc(doc(db, 'orders', id, 'proof', 'main'));
    if (!proofSnap.exists()) {
      throw new ApiError('Bukti pembayaran tidak ditemukan di database.', 404);
    }
    const data = proofSnap.data();
    const mimeType = String(data.mimeType ?? 'image/jpeg');
    const originalName = String(data.originalName ?? `bukti-${id}.jpg`);
    const bytes = base64ToUint8Array(String(data.dataBase64 ?? ''));
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const blob = new Blob([buffer], { type: mimeType });
    return {
      blobUrl: URL.createObjectURL(blob),
      originalName,
      mimeType,
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    handleFirestoreError(err, OperationType.GET, `orders/${id}/proof/main`);
  }
}

export async function fetchOperatorProofBlobUrl(id: string): Promise<string> {
  const detail = await fetchOperatorProofDetail(id);
  return detail.blobUrl;
}

export async function createServiceTariff(payload: {
  name: string;
  category: TariffCategory;
  paperSize: 'A4' | 'F4' | null;
  colorMode: 'BW' | 'Color' | null;
  price: number;
  isActive: boolean;
}): Promise<ServiceTariff[]> {
  const newId = slugifyTariffId(payload.name, Date.now().toString(36));
  try {
    await setDoc(doc(db, 'tariffs', newId), {
      name: payload.name.trim(),
      category: payload.category,
      paperSize: payload.category === 'cetak' ? payload.paperSize : null,
      colorMode: payload.category === 'cetak' ? payload.colorMode : null,
      price: Math.round(payload.price),
      isActive: Boolean(payload.isActive),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return await fetchTariffs(true);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `tariffs/${newId}`);
  }
}

export async function updateServiceTariff(
  id: string,
  payload: {
    name: string;
    category: TariffCategory;
    paperSize: 'A4' | 'F4' | null;
    colorMode: 'BW' | 'Color' | null;
    price: number;
    isActive: boolean;
  }
): Promise<ServiceTariff[]> {
  try {
    const ref = doc(db, 'tariffs', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      throw new ApiError('Tarif tidak ditemukan.', 404);
    }
    await updateDoc(ref, {
      name: payload.name.trim(),
      category: payload.category,
      paperSize: payload.category === 'cetak' ? payload.paperSize : null,
      colorMode: payload.category === 'cetak' ? payload.colorMode : null,
      price: Math.round(payload.price),
      isActive: Boolean(payload.isActive),
      updatedAt: serverTimestamp(),
    });
    return await fetchTariffs(true);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    handleFirestoreError(err, OperationType.UPDATE, `tariffs/${id}`);
  }
}

export async function fetchOperatorWhitelist(): Promise<OperatorWhitelistItem[]> {
  try {
    const snap = await getDocs(query(collection(db, 'operator_whitelist'), orderBy('createdAt', 'desc')));
    const items: OperatorWhitelistItem[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        email: d.id,
        name: String(data.name || d.id.split('@')[0] || 'Petugas Gerai'),
        role: (data.role === 'owner' ? 'owner' : 'operator') as 'operator' | 'owner',
        createdAt: timestampToIso(data.createdAt),
      };
    });
    return items;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'operator_whitelist');
  }
}

export async function addOperatorEmails(
  entries: { email: string; name?: string; role?: 'operator' | 'owner' }[]
): Promise<OperatorWhitelistItem[]> {
  if (entries.length === 0) return await fetchOperatorWhitelist();

  const batch = writeBatch(db);
  for (const entry of entries) {
    const cleanEmail = entry.email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) continue;
    const ref = doc(db, 'operator_whitelist', cleanEmail);
    const cleanName = (entry.name?.trim() || cleanEmail.split('@')[0] || 'Petugas Gerai').slice(0, 100);
    batch.set(ref, {
      email: cleanEmail,
      name: cleanName,
      role: entry.role || 'operator',
      createdAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
    return await fetchOperatorWhitelist();
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'operator_whitelist');
  }
}

export async function deleteOperatorEmail(email: string): Promise<OperatorWhitelistItem[]> {
  const cleanEmail = email.trim().toLowerCase();
  try {
    await deleteDoc(doc(db, 'operator_whitelist', cleanEmail));
    return await fetchOperatorWhitelist();
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `operator_whitelist/${cleanEmail}`);
  }
}
