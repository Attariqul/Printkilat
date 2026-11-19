import { PDFDocument } from 'pdf-lib';
import type { OrderDetail, OrderStatus, ServiceTariff } from '../shared/printLogic';

export interface OperatorUser {
  id: number;
  email: string;
  name: string;
  role?: string;
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

const GUEST_CODES_STORAGE_KEY = 'printkilat_guest_tracking_codes_v1';

export function getSavedGuestTrackingCodes(): string[] {
  try {
    const raw = localStorage.getItem(GUEST_CODES_STORAGE_KEY);
    if (!raw) return ['PK-TRK-DEMO0003'];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return ['PK-TRK-DEMO0003'];
    return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  } catch {
    return ['PK-TRK-DEMO0003'];
  }
}

export function saveGuestTrackingCode(code: string): string[] {
  const normalized = code.trim().toUpperCase();
  const existing = getSavedGuestTrackingCodes().filter((c) => c !== normalized);
  const next = [normalized, ...existing].slice(0, 15);
  try {
    localStorage.setItem(GUEST_CODES_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage quota issues
  }
  return next;
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

async function parseJson<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (data as { error?: string }).error || `Permintaan gagal (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

export async function fetchTariffs(all = false): Promise<ServiceTariff[]> {
  const res = await fetch(`/api/tariffs${all ? '?all=1' : ''}`, { credentials: 'include' });
  const data = await parseJson<{ tariffs: ServiceTariff[] }>(res);
  return data.tariffs;
}

export async function createOrder(formData: FormData): Promise<OrderDetail> {
  const res = await fetch('/api/orders', {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });
  const data = await parseJson<{ order: OrderDetail }>(res);
  return data.order;
}

export async function trackOrder(trackingCode: string): Promise<OrderDetail> {
  const res = await fetch(`/api/orders/track/${encodeURIComponent(trackingCode.trim())}`, {
    credentials: 'include',
  });
  const data = await parseJson<{ order: OrderDetail }>(res);
  return data.order;
}

export async function uploadTransferProof(trackingCode: string, file: File): Promise<OrderDetail> {
  const fd = new FormData();
  fd.append('payment_proof', file);
  const res = await fetch(`/api/orders/track/${encodeURIComponent(trackingCode.trim())}/proof`, {
    method: 'POST',
    body: fd,
    credentials: 'include',
  });
  const data = await parseJson<{ order: OrderDetail }>(res);
  return data.order;
}

export async function fetchBatchOrderSummaries(trackingCodes: string[]): Promise<OrderDetail[]> {
  if (trackingCodes.length === 0) return [];
  const res = await fetch('/api/orders/batch-summary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trackingCodes }),
    credentials: 'include',
  });
  const data = await parseJson<{ orders: OrderDetail[] }>(res);
  return data.orders;
}

export async function operatorLogin(email: string, password: string): Promise<OperatorUser> {
  const res = await fetch('/api/operator/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include',
  });
  const data = await parseJson<{ operator: OperatorUser }>(res);
  return data.operator;
}

export async function operatorLogout(): Promise<void> {
  await fetch('/api/operator/logout', { method: 'POST', credentials: 'include' });
}

export async function fetchOperatorMe(): Promise<OperatorUser | null> {
  const res = await fetch('/api/operator/me', { credentials: 'include' });
  const data = await parseJson<{ operator: OperatorUser | null }>(res);
  return data.operator;
}

export async function fetchOperatorOrders(): Promise<OperatorOrdersResponse> {
  const res = await fetch('/api/operator/orders', { credentials: 'include' });
  return parseJson<OperatorOrdersResponse>(res);
}

export async function fetchOperatorOrderDetail(id: number): Promise<OrderDetail> {
  const res = await fetch(`/api/operator/orders/${id}`, { credentials: 'include' });
  const data = await parseJson<{ order: OrderDetail }>(res);
  return data.order;
}

export async function updateOperatorOrderStatus(
  id: number,
  payload: { status: OrderStatus; rejectionReason?: string; note?: string }
): Promise<OrderDetail> {
  const res = await fetch(`/api/operator/orders/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  const data = await parseJson<{ order: OrderDetail }>(res);
  return data.order;
}

export async function markOperatorOrderPaid(id: number): Promise<OrderDetail> {
  const res = await fetch(`/api/operator/orders/${id}/payment`, {
    method: 'PATCH',
    credentials: 'include',
  });
  const data = await parseJson<{ order: OrderDetail }>(res);
  return data.order;
}

export async function createServiceTariff(payload: {
  name: string;
  category: 'cetak' | 'jilid';
  paperSize: 'A4' | 'F4' | null;
  colorMode: 'BW' | 'Color' | null;
  price: number;
  isActive: boolean;
}): Promise<ServiceTariff[]> {
  const res = await fetch('/api/tariffs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  const data = await parseJson<{ tariffs: ServiceTariff[] }>(res);
  return data.tariffs;
}

export async function updateServiceTariff(
  id: number,
  payload: {
    name: string;
    category: 'cetak' | 'jilid';
    paperSize: 'A4' | 'F4' | null;
    colorMode: 'BW' | 'Color' | null;
    price: number;
    isActive: boolean;
  }
): Promise<ServiceTariff[]> {
  const res = await fetch(`/api/tariffs/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  const data = await parseJson<{ tariffs: ServiceTariff[] }>(res);
  return data.tariffs;
}
