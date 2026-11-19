import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import {
  buildTrackingCode,
  calculateOrderTotal,
  formatQueueNumber,
  type ColorMode,
  type OrderDetail,
  type OrderStatus,
  type OrderStatusLogItem,
  type PaperSize,
  type PaymentMethod,
  type PaymentStatus,
  type ServiceTariff,
  type TariffCategory,
} from '../src/shared/printLogic.ts';
import { hashPassword } from './auth.ts';

export const DATA_DIR = path.resolve(process.cwd(), 'data');
export const PROTECTED_UPLOADS_DIR = path.resolve(process.cwd(), 'protected_uploads');
export const DB_PATH = path.join(DATA_DIR, 'printkilat.db');

let dbInstance: DatabaseSync | null = null;

export function ensureDirectories(): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(PROTECTED_UPLOADS_DIR, { recursive: true });
}

export function getDb(): DatabaseSync {
  if (!dbInstance) {
    ensureDirectories();
    dbInstance = new DatabaseSync(DB_PATH);
    dbInstance.exec('PRAGMA foreign_keys = ON;');
    dbInstance.exec('PRAGMA journal_mode = WAL;');
    initSchema(dbInstance);
  }
  return dbInstance;
}

function initSchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS operators (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('operator', 'owner')),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS service_tariffs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL CHECK (category IN ('cetak', 'jilid')),
      paper_size TEXT CHECK (paper_size IN ('A4', 'F4') OR paper_size IS NULL),
      color_mode TEXT CHECK (color_mode IN ('BW', 'Color') OR color_mode IS NULL),
      price INTEGER NOT NULL CHECK (price >= 0),
      is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      queue_number TEXT NOT NULL UNIQUE,
      tracking_code TEXT NOT NULL UNIQUE,
      customer_name TEXT NOT NULL,
      customer_phone TEXT,
      status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'printing', 'ready', 'completed', 'rejected')),
      rejection_reason TEXT,
      notes TEXT,
      total_amount INTEGER NOT NULL CHECK (total_amount >= 0),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      file_expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
      print_tariff_id INTEGER NOT NULL REFERENCES service_tariffs(id),
      print_tariff_name TEXT NOT NULL,
      paper_size TEXT CHECK (paper_size IN ('A4', 'F4') OR paper_size IS NULL),
      color_mode TEXT CHECK (color_mode IN ('BW', 'Color') OR color_mode IS NULL),
      print_unit_price INTEGER NOT NULL CHECK (print_unit_price >= 0),
      page_count INTEGER NOT NULL CHECK (page_count > 0),
      copies INTEGER NOT NULL CHECK (copies > 0),
      bind_tariff_id INTEGER REFERENCES service_tariffs(id),
      bind_tariff_name TEXT NOT NULL,
      bind_unit_price INTEGER NOT NULL CHECK (bind_unit_price >= 0),
      subtotal_print INTEGER NOT NULL CHECK (subtotal_print >= 0),
      subtotal_bind INTEGER NOT NULL CHECK (subtotal_bind >= 0)
    );

    CREATE TABLE IF NOT EXISTS order_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
      original_name TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size_bytes INTEGER NOT NULL CHECK (file_size_bytes > 0),
      detected_pages INTEGER CHECK (detected_pages IS NULL OR detected_pages > 0),
      deleted_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payment_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
      method TEXT NOT NULL CHECK (method IN ('cash', 'transfer')),
      status TEXT NOT NULL CHECK (status IN ('unpaid', 'pending_verification', 'paid')),
      proof_stored_name TEXT,
      proof_original_name TEXT,
      verified_by INTEGER REFERENCES operators(id),
      verified_at TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS order_status_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      from_status TEXT CHECK (from_status IN ('pending', 'confirmed', 'printing', 'ready', 'completed', 'rejected') OR from_status IS NULL),
      to_status TEXT NOT NULL CHECK (to_status IN ('pending', 'confirmed', 'printing', 'ready', 'completed', 'rejected')),
      note TEXT,
      changed_by INTEGER REFERENCES operators(id),
      created_at TEXT NOT NULL
    );
  `);
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

export function nextQueueNumberForDate(db: DatabaseSync, dateYYYYMMDD: string): string {
  const prefix = `PK-${dateYYYYMMDD}-`;
  const row = db
    .prepare('SELECT queue_number FROM orders WHERE queue_number LIKE ? ORDER BY queue_number DESC LIMIT 1')
    .get(`${prefix}%`) as { queue_number?: string } | undefined;

  let nextSeq = 1;
  if (row?.queue_number) {
    const tail = row.queue_number.slice(prefix.length);
    const parsed = Number.parseInt(tail, 10);
    if (Number.isFinite(parsed) && parsed >= 1) {
      nextSeq = parsed + 1;
    }
  }
  return formatQueueNumber(dateYYYYMMDD, nextSeq);
}

export function generateUniqueTrackingCode(db: DatabaseSync): string {
  const checkStmt = db.prepare('SELECT id FROM orders WHERE tracking_code = ?');
  for (let attempt = 0; attempt < 15; attempt++) {
    const candidate = buildTrackingCode(crypto.randomBytes(8));
    if (!checkStmt.get(candidate)) {
      return candidate;
    }
  }
  throw new Error('Gagal menghasilkan kode pelacakan unik.');
}

async function createSamplePdfBuffer(title: string, pageCount: number): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (let i = 1; i <= pageCount; i++) {
    const page = pdfDoc.addPage([595, 842]);
    page.drawText('PrintKilat — Berkas Contoh Mahasiswa', {
      x: 56,
      y: 770,
      size: 16,
      font,
      color: rgb(0.95, 0.45, 0.08),
    });
    page.drawText(`Dokumen: ${title}`, {
      x: 56,
      y: 735,
      size: 12,
      font: bodyFont,
      color: rgb(0.07, 0.09, 0.15),
    });
    page.drawText(`Halaman ${i} dari ${pageCount}`, {
      x: 56,
      y: 710,
      size: 11,
      font: bodyFont,
      color: rgb(0.35, 0.38, 0.44),
    });
  }

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}

function createSampleProofSvgBuffer(queueNumber: string, amountLabel: string): Buffer {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="240" viewBox="0 0 420 240">
  <rect width="420" height="240" rx="16" fill="#FEFBE8" stroke="#FDE68A" stroke-width="2"/>
  <rect x="20" y="20" width="380" height="44" rx="8" fill="#F97316"/>
  <text x="36" y="48" font-family="sans-serif" font-size="16" font-weight="bold" fill="#FFFFFF">Bukti Transfer QRIS Kampus</text>
  <text x="36" y="102" font-family="sans-serif" font-size="13" fill="#4B5563">Referensi Pesanan</text>
  <text x="36" y="124" font-family="monospace" font-size="16" font-weight="bold" fill="#111827">${queueNumber}</text>
  <text x="36" y="164" font-family="sans-serif" font-size="13" fill="#4B5563">Nominal Transfer</text>
  <text x="36" y="190" font-family="sans-serif" font-size="22" font-weight="bold" fill="#C2410C">${amountLabel}</text>
  <text x="275" y="190" font-family="sans-serif" font-size="12" font-weight="bold" fill="#15803D">TERKIRIM</text>
</svg>`;
  return Buffer.from(svg, 'utf8');
}

export async function seedInitialDataIfEmpty(): Promise<void> {
  const db = getDb();

  // 1. Seed default operator if none exists
  const opCount = db.prepare('SELECT COUNT(*) as cnt FROM operators').get() as { cnt: number };
  let operatorId = 1;
  if (opCount.cnt === 0) {
    const { hash, salt } = hashPassword('printkilat123');
    const res = db
      .prepare(
        `INSERT INTO operators (email, name, password_hash, password_salt, role, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        'operator@printkilat.id',
        'Raka Pratama',
        hash,
        salt,
        'operator',
        new Date().toISOString()
      );
    operatorId = Number(res.lastInsertRowid);
  } else {
    const firstOp = db.prepare('SELECT id FROM operators LIMIT 1').get() as { id: number };
    operatorId = firstOp.id;
  }

  // 2. Seed service tariffs if empty
  const tariffCount = db.prepare('SELECT COUNT(*) as cnt FROM service_tariffs').get() as { cnt: number };
  if (tariffCount.cnt === 0) {
    const now = new Date().toISOString();
    const insertTariff = db.prepare(
      `INSERT INTO service_tariffs (name, category, paper_size, color_mode, price, is_active, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    insertTariff.run('Print hitam-putih A4', 'cetak', 'A4', 'BW', 500, 1, now);
    insertTariff.run('Print hitam-putih F4', 'cetak', 'F4', 'BW', 500, 1, now);
    insertTariff.run('Print warna A4', 'cetak', 'A4', 'Color', 1500, 1, now);
    insertTariff.run('Print warna F4', 'cetak', 'F4', 'Color', 1750, 1, now);
    insertTariff.run('Tanpa jilid', 'jilid', null, null, 0, 1, now);
    insertTariff.run('Jilid lakban', 'jilid', null, null, 3000, 1, now);
    insertTariff.run('Jilid spiral', 'jilid', null, null, 8000, 1, now);
  }

  // 3. Seed demo orders if empty
  const orderCount = db.prepare('SELECT COUNT(*) as cnt FROM orders').get() as { cnt: number };
  if (orderCount.cnt === 0) {
    const tariffs = listTariffs(true);
    const bwA4 = tariffs.find((t) => t.name === 'Print hitam-putih A4') ?? tariffs[0];
    const colorA4 = tariffs.find((t) => t.name === 'Print warna A4') ?? tariffs[0];
    const noBind = tariffs.find((t) => t.name === 'Tanpa jilid') ?? tariffs[4];
    const lakban = tariffs.find((t) => t.name === 'Jilid lakban') ?? tariffs[5];
    const spiral = tariffs.find((t) => t.name === 'Jilid spiral') ?? tariffs[6];

    const todayStr = getJakartaDateYYYYMMDD();
    const now = Date.now();
    const expiresAt = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();

    const demos: Array<{
      queueNumber: string;
      trackingCode: string;
      customerName: string;
      customerPhone: string | null;
      status: OrderStatus;
      notes: string | null;
      printTariff: ServiceTariff;
      bindTariff: ServiceTariff;
      pages: number;
      copies: number;
      fileName: string;
      method: PaymentMethod;
      paymentStatus: PaymentStatus;
      withProof?: boolean;
      minutesAgo: number;
    }> = [
      {
        queueNumber: formatQueueNumber(todayStr, 1),
        trackingCode: 'PK-TRK-DEMO0001',
        customerName: 'Nadia Putri',
        customerPhone: '0812-3456-7890',
        status: 'pending',
        notes: 'Mohon cek margin halaman lampiran',
        printTariff: bwA4,
        bindTariff: noBind,
        pages: 10,
        copies: 1,
        fileName: 'Makalah_Sistem_Informasi.pdf',
        method: 'cash',
        paymentStatus: 'unpaid',
        minutesAgo: 8,
      },
      {
        queueNumber: formatQueueNumber(todayStr, 2),
        trackingCode: 'PK-TRK-DEMO0002',
        customerName: 'Bima Pratama',
        customerPhone: '0857-9911-2233',
        status: 'printing',
        notes: 'Sampul warna depan, jilid spiral rapi',
        printTariff: bwA4,
        bindTariff: spiral,
        pages: 45,
        copies: 3,
        fileName: 'Modul_Dummy.pdf',
        method: 'transfer',
        paymentStatus: 'pending_verification',
        withProof: true,
        minutesAgo: 22,
      },
      {
        queueNumber: formatQueueNumber(todayStr, 3),
        trackingCode: 'PK-TRK-DEMO0003',
        customerName: 'Tamu Kampus',
        customerPhone: null,
        status: 'ready',
        notes: 'Cetak bolak-balik',
        printTariff: bwA4,
        bindTariff: lakban,
        pages: 12,
        copies: 2,
        fileName: 'Proposal_Skripsi_Bab1.pdf',
        method: 'cash',
        paymentStatus: 'unpaid',
        minutesAgo: 45,
      },
      {
        queueNumber: formatQueueNumber(todayStr, 4),
        trackingCode: 'PK-TRK-DEMO0004',
        customerName: 'Siti Rahma',
        customerPhone: '0813-8877-4455',
        status: 'completed',
        notes: null,
        printTariff: colorA4,
        bindTariff: noBind,
        pages: 8,
        copies: 1,
        fileName: 'Slide_Kewirausahaan.pdf',
        method: 'cash',
        paymentStatus: 'paid',
        minutesAgo: 120,
      },
    ];

    for (const demo of demos) {
      const createdIso = new Date(now - demo.minutesAgo * 60 * 1000).toISOString();
      const updatedIso = new Date(now - Math.max(1, demo.minutesAgo - 4) * 60 * 1000).toISOString();
      const pricing = calculateOrderTotal({
        printRate: demo.printTariff.price,
        pages: demo.pages,
        copies: demo.copies,
        bindRate: demo.bindTariff.price,
      });

      const storedPdfName = `seed_${demo.queueNumber}_${crypto.randomUUID().slice(0, 8)}.pdf`;
      const pdfBuffer = await createSamplePdfBuffer(demo.fileName, demo.pages);
      fs.writeFileSync(path.join(PROTECTED_UPLOADS_DIR, storedPdfName), pdfBuffer);

      let proofStoredName: string | null = null;
      let proofOriginalName: string | null = null;
      if (demo.withProof) {
        proofStoredName = `proof_${demo.queueNumber}.svg`;
        proofOriginalName = `Bukti_Transfer_${demo.queueNumber}.svg`;
        const amountLabel = `Rp ${pricing.total.toLocaleString('id-ID')}`;
        fs.writeFileSync(
          path.join(PROTECTED_UPLOADS_DIR, proofStoredName),
          createSampleProofSvgBuffer(demo.queueNumber, amountLabel)
        );
      }

      const orderRes = db
        .prepare(
          `INSERT INTO orders (queue_number, tracking_code, customer_name, customer_phone, status, rejection_reason, notes, total_amount, created_at, updated_at, file_expires_at)
           VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?)`
        )
        .run(
          demo.queueNumber,
          demo.trackingCode,
          demo.customerName,
          demo.customerPhone,
          demo.status,
          demo.notes,
          pricing.total,
          createdIso,
          updatedIso,
          expiresAt
        );
      const orderId = Number(orderRes.lastInsertRowid);

      db.prepare(
        `INSERT INTO order_items (order_id, print_tariff_id, print_tariff_name, paper_size, color_mode, print_unit_price, page_count, copies, bind_tariff_id, bind_tariff_name, bind_unit_price, subtotal_print, subtotal_bind)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        orderId,
        demo.printTariff.id,
        demo.printTariff.name,
        demo.printTariff.paperSize,
        demo.printTariff.colorMode,
        demo.printTariff.price,
        demo.pages,
        demo.copies,
        demo.bindTariff.id,
        demo.bindTariff.name,
        demo.bindTariff.price,
        pricing.printSubtotal,
        pricing.bindSubtotal
      );

      db.prepare(
        `INSERT INTO order_files (order_id, original_name, stored_name, mime_type, file_size_bytes, detected_pages, deleted_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NULL, ?)`
      ).run(
        orderId,
        demo.fileName,
        storedPdfName,
        'application/pdf',
        pdfBuffer.length,
        demo.pages,
        createdIso
      );

      db.prepare(
        `INSERT INTO payment_records (order_id, method, status, proof_stored_name, proof_original_name, verified_by, verified_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        orderId,
        demo.method,
        demo.paymentStatus,
        proofStoredName,
        proofOriginalName,
        demo.paymentStatus === 'paid' ? operatorId : null,
        demo.paymentStatus === 'paid' ? updatedIso : null,
        updatedIso
      );

      const logStmt = db.prepare(
        `INSERT INTO order_status_logs (order_id, from_status, to_status, note, changed_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      );
      logStmt.run(orderId, null, 'pending', 'Pesanan diterima sistem', null, createdIso);
      if (demo.status !== 'pending') {
        logStmt.run(orderId, 'pending', 'confirmed', 'Berkas terverifikasi operator', operatorId, createdIso);
      }
      if (demo.status === 'printing' || demo.status === 'ready' || demo.status === 'completed') {
        logStmt.run(orderId, 'confirmed', 'printing', 'Sedang diproses di mesin cetak', operatorId, updatedIso);
      }
      if (demo.status === 'ready' || demo.status === 'completed') {
        logStmt.run(orderId, 'printing', 'ready', 'Hasil cetak & jilid siap diambil di meja gerai', operatorId, updatedIso);
      }
      if (demo.status === 'completed') {
        logStmt.run(orderId, 'ready', 'completed', 'Pesanan telah diambil dan lunas', operatorId, updatedIso);
      }
    }
  }
}

export function listTariffs(includeInactive = false): ServiceTariff[] {
  const db = getDb();
  const rows = db
    .prepare(
      includeInactive
        ? 'SELECT * FROM service_tariffs ORDER BY category ASC, id ASC'
        : 'SELECT * FROM service_tariffs WHERE is_active = 1 ORDER BY category ASC, id ASC'
    )
    .all() as Array<{
    id: number;
    name: string;
    category: TariffCategory;
    paper_size: PaperSize;
    color_mode: ColorMode;
    price: number;
    is_active: number;
    updated_at: string;
  }>;

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category,
    paperSize: r.paper_size,
    colorMode: r.color_mode,
    price: r.price,
    isActive: r.is_active === 1,
    updatedAt: r.updated_at,
  }));
}

export function getTariffById(id: number): ServiceTariff | null {
  const db = getDb();
  const r = db.prepare('SELECT * FROM service_tariffs WHERE id = ?').get(id) as
    | {
        id: number;
        name: string;
        category: TariffCategory;
        paper_size: PaperSize;
        color_mode: ColorMode;
        price: number;
        is_active: number;
        updated_at: string;
      }
    | undefined;
  if (!r) return null;
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    paperSize: r.paper_size,
    colorMode: r.color_mode,
    price: r.price,
    isActive: r.is_active === 1,
    updatedAt: r.updated_at,
  };
}

function hydrateOrderRow(db: DatabaseSync, orderRow: Record<string, unknown>): OrderDetail {
  const orderId = Number(orderRow.id);
  const itemRow = db
    .prepare('SELECT * FROM order_items WHERE order_id = ?')
    .get(orderId) as Record<string, unknown>;
  const fileRow = db
    .prepare('SELECT * FROM order_files WHERE order_id = ?')
    .get(orderId) as Record<string, unknown>;
  const payRow = db
    .prepare('SELECT * FROM payment_records WHERE order_id = ?')
    .get(orderId) as Record<string, unknown>;
  const logRows = db
    .prepare(
      `SELECT l.*, o.name as operator_name
       FROM order_status_logs l
       LEFT JOIN operators o ON o.id = l.changed_by
       WHERE l.order_id = ?
       ORDER BY l.id ASC`
    )
    .all(orderId) as Array<Record<string, unknown>>;

  const statusLogs: OrderStatusLogItem[] = logRows.map((l) => ({
    id: Number(l.id),
    fromStatus: (l.from_status as OrderStatus | null) ?? null,
    toStatus: l.to_status as OrderStatus,
    note: (l.note as string | null) ?? null,
    changedByName: (l.operator_name as string | null) ?? null,
    createdAt: String(l.created_at),
  }));

  return {
    id: orderId,
    queueNumber: String(orderRow.queue_number),
    trackingCode: String(orderRow.tracking_code),
    customerName: String(orderRow.customer_name),
    customerPhone: (orderRow.customer_phone as string | null) ?? null,
    status: orderRow.status as OrderStatus,
    rejectionReason: (orderRow.rejection_reason as string | null) ?? null,
    notes: (orderRow.notes as string | null) ?? null,
    totalAmount: Number(orderRow.total_amount),
    createdAt: String(orderRow.created_at),
    updatedAt: String(orderRow.updated_at),
    fileExpiresAt: String(orderRow.file_expires_at),
    item: {
      printTariffId: Number(itemRow.print_tariff_id),
      printTariffName: String(itemRow.print_tariff_name),
      paperSize: (itemRow.paper_size as PaperSize) ?? null,
      colorMode: (itemRow.color_mode as ColorMode) ?? null,
      printUnitPrice: Number(itemRow.print_unit_price),
      pageCount: Number(itemRow.page_count),
      copies: Number(itemRow.copies),
      bindTariffId: itemRow.bind_tariff_id ? Number(itemRow.bind_tariff_id) : null,
      bindTariffName: String(itemRow.bind_tariff_name),
      bindUnitPrice: Number(itemRow.bind_unit_price),
      subtotalPrint: Number(itemRow.subtotal_print),
      subtotalBind: Number(itemRow.subtotal_bind),
    },
    file: {
      originalName: String(fileRow.original_name),
      mimeType: String(fileRow.mime_type),
      fileSizeBytes: Number(fileRow.file_size_bytes),
      detectedPages: fileRow.detected_pages ? Number(fileRow.detected_pages) : null,
      deletedAt: (fileRow.deleted_at as string | null) ?? null,
    },
    payment: {
      method: payRow.method as PaymentMethod,
      status: payRow.status as PaymentStatus,
      hasProof: Boolean(payRow.proof_stored_name),
      proofOriginalName: (payRow.proof_original_name as string | null) ?? null,
      verifiedAt: (payRow.verified_at as string | null) ?? null,
    },
    statusLogs,
  };
}

export function getOrderById(id: number): OrderDetail | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined;
  if (!row) return null;
  return hydrateOrderRow(db, row);
}

export function getOrderByTrackingCode(trackingCode: string): OrderDetail | null {
  const db = getDb();
  const row = db
    .prepare('SELECT * FROM orders WHERE UPPER(tracking_code) = UPPER(?)')
    .get(trackingCode.trim()) as Record<string, unknown> | undefined;
  if (!row) return null;
  return hydrateOrderRow(db, row);
}

export function listAllOrders(): OrderDetail[] {
  const db = getDb();
  const rows = db
    .prepare('SELECT * FROM orders ORDER BY created_at DESC, id DESC')
    .all() as Array<Record<string, unknown>>;
  return rows.map((row) => hydrateOrderRow(db, row));
}

export function cleanupExpiredFiles(): number {
  const db = getDb();
  const nowIso = new Date().toISOString();
  const expired = db
    .prepare(
      `SELECT f.id, f.stored_name
       FROM order_files f
       JOIN orders o ON o.id = f.order_id
       WHERE f.deleted_at IS NULL AND o.file_expires_at <= ?`
    )
    .all(nowIso) as Array<{ id: number; stored_name: string }>;

  let removedCount = 0;
  for (const row of expired) {
    const filePath = path.join(PROTECTED_UPLOADS_DIR, path.basename(row.stored_name));
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch {
        // Ignore if file already absent
      }
    }
    db.prepare('UPDATE order_files SET deleted_at = ? WHERE id = ?').run(nowIso, row.id);
    removedCount++;
  }
  return removedCount;
}
