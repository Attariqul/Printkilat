import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import express, { type Request, type Response } from 'express';
import multer from 'multer';
import { PDFDocument } from 'pdf-lib';
import {
  calculateOrderTotal,
  canTransitionStatus,
  MAX_UPLOAD_BYTES,
  validateUploadMeta,
  type OrderDetail,
  type OrderStatus,
  type PaymentMethod,
} from '../src/shared/printLogic.ts';
import {
  clearOperatorCookie,
  getOperatorFromRequest,
  requireOperatorAuth,
  setOperatorCookie,
  signOperatorToken,
  verifyPassword,
  type OperatorSessionPayload,
} from './auth.ts';
import {
  generateUniqueTrackingCode,
  getDb,
  getJakartaDateYYYYMMDD,
  getOrderById,
  getOrderByTrackingCode,
  getTariffById,
  listAllOrders,
  listTariffs,
  nextQueueNumberForDate,
  PROTECTED_UPLOADS_DIR,
} from './db.ts';

type AuthedRequest = Request & { operator?: OperatorSessionPayload };

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(PROTECTED_UPLOADS_DIR, { recursive: true });
    cb(null, PROTECTED_UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.bin';
    const prefix = file.fieldname === 'payment_proof' ? 'proof' : 'doc';
    cb(null, `${prefix}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}${ext}`);
  },
});

const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
  },
});

function safeUnlink(storedName: string | undefined): void {
  if (!storedName) return;
  const fullPath = path.join(PROTECTED_UPLOADS_DIR, path.basename(storedName));
  if (fs.existsSync(fullPath)) {
    try {
      fs.unlinkSync(fullPath);
    } catch {
      // Ignore cleanup error
    }
  }
}

async function detectPdfPageCount(filePath: string): Promise<number | null> {
  try {
    const buffer = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const count = pdfDoc.getPageCount();
    return count > 0 ? count : null;
  } catch {
    return null;
  }
}

export function createApiRouter(): express.Router {
  const router = express.Router();

  // --- PUBLIC / CUSTOMER ROUTES ---

  router.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'PrintKilat' });
  });

  router.get('/tariffs', (req, res) => {
    const includeInactive = req.query.all === '1' && Boolean(getOperatorFromRequest(req));
    res.json({ tariffs: listTariffs(includeInactive) });
  });

  router.post(
    '/orders',
    (req, res, next) => {
      uploadMiddleware.fields([
        { name: 'file', maxCount: 1 },
        { name: 'payment_proof', maxCount: 1 },
      ])(req, res, (err: unknown) => {
        if (err) {
          if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
            res.status(400).json({ error: 'Ukuran berkas melebihi batas maksimum 20 MB.' });
            return;
          }
          res.status(400).json({ error: 'Gagal memproses unggahan berkas.' });
          return;
        }
        next();
      });
    },
    async (req: Request, res: Response) => {
      const files = req.files as Record<string, Express.Multer.File[]> | undefined;
      const docFile = files?.file?.[0];
      const proofFile = files?.payment_proof?.[0];

      if (!docFile) {
        if (proofFile) safeUnlink(proofFile.filename);
        res.status(400).json({ error: 'Berkas dokumen wajib diunggah (PDF, DOC, atau DOCX).' });
        return;
      }

      const metaCheck = validateUploadMeta(docFile.originalname, docFile.size);
      if (!metaCheck.ok) {
        safeUnlink(docFile.filename);
        if (proofFile) safeUnlink(proofFile.filename);
        res.status(400).json({ error: metaCheck.error });
        return;
      }

      if (proofFile) {
        const proofExt = path.extname(proofFile.originalname).toLowerCase();
        if (!['.png', '.jpg', '.jpeg', '.webp', '.svg'].includes(proofExt)) {
          safeUnlink(docFile.filename);
          safeUnlink(proofFile.filename);
          res.status(400).json({ error: 'Bukti transfer harus berupa gambar (PNG, JPG, WEBP).' });
          return;
        }
      }

      try {
        const printTariffId = Number(req.body.printTariffId);
        const bindTariffId = req.body.bindTariffId ? Number(req.body.bindTariffId) : null;
        const pages = Number(req.body.pageCount);
        const copies = Number(req.body.copies);
        const paymentMethod = (req.body.paymentMethod === 'transfer' ? 'transfer' : 'cash') as PaymentMethod;
        const customerName = String(req.body.customerName || '').trim() || 'Pelanggan Tamu';
        const customerPhone = String(req.body.customerPhone || '').trim() || null;
        const notes = String(req.body.notes || '').trim() || null;

        const printTariff = getTariffById(printTariffId);
        if (!printTariff || !printTariff.isActive || printTariff.category !== 'cetak') {
          safeUnlink(docFile.filename);
          if (proofFile) safeUnlink(proofFile.filename);
          res.status(400).json({ error: 'Jenis cetak yang dipilih tidak tersedia.' });
          return;
        }

        let bindTariff = bindTariffId ? getTariffById(bindTariffId) : null;
        if (bindTariffId && (!bindTariff || !bindTariff.isActive || bindTariff.category !== 'jilid')) {
          safeUnlink(docFile.filename);
          if (proofFile) safeUnlink(proofFile.filename);
          res.status(400).json({ error: 'Opsi jilid yang dipilih tidak tersedia.' });
          return;
        }

        const pricing = calculateOrderTotal({
          printRate: printTariff.price,
          pages,
          copies,
          bindRate: bindTariff ? bindTariff.price : 0,
        });

        let detectedPages: number | null = null;
        if (metaCheck.extension === '.pdf') {
          detectedPages = await detectPdfPageCount(docFile.path);
        }

        const db = getDb();
        const now = new Date();
        const nowIso = now.toISOString();
        const expiresIso = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
        const dateYYYYMMDD = getJakartaDateYYYYMMDD(now);

        let createdOrderId = 0;
        db.exec('BEGIN IMMEDIATE');
        try {
          const queueNumber = nextQueueNumberForDate(db, dateYYYYMMDD);
          const trackingCode = generateUniqueTrackingCode(db);

          const orderRes = db
            .prepare(
              `INSERT INTO orders (queue_number, tracking_code, customer_name, customer_phone, status, rejection_reason, notes, total_amount, created_at, updated_at, file_expires_at)
               VALUES (?, ?, ?, ?, 'pending', NULL, ?, ?, ?, ?, ?)`
            )
            .run(
              queueNumber,
              trackingCode,
              customerName,
              customerPhone,
              notes,
              pricing.total,
              nowIso,
              nowIso,
              expiresIso
            );
          createdOrderId = Number(orderRes.lastInsertRowid);

          db.prepare(
            `INSERT INTO order_items (order_id, print_tariff_id, print_tariff_name, paper_size, color_mode, print_unit_price, page_count, copies, bind_tariff_id, bind_tariff_name, bind_unit_price, subtotal_print, subtotal_bind)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).run(
            createdOrderId,
            printTariff.id,
            printTariff.name,
            printTariff.paperSize,
            printTariff.colorMode,
            printTariff.price,
            pages,
            copies,
            bindTariff ? bindTariff.id : null,
            bindTariff ? bindTariff.name : 'Tanpa jilid',
            bindTariff ? bindTariff.price : 0,
            pricing.printSubtotal,
            pricing.bindSubtotal
          );

          db.prepare(
            `INSERT INTO order_files (order_id, original_name, stored_name, mime_type, file_size_bytes, detected_pages, deleted_at, created_at)
             VALUES (?, ?, ?, ?, ?, ?, NULL, ?)`
          ).run(
            createdOrderId,
            docFile.originalname,
            docFile.filename,
            docFile.mimetype || 'application/octet-stream',
            docFile.size,
            detectedPages,
            nowIso
          );

          const initialPayStatus =
            paymentMethod === 'transfer' && proofFile
              ? 'pending_verification'
              : paymentMethod === 'transfer'
              ? 'pending_verification'
              : 'unpaid';

          db.prepare(
            `INSERT INTO payment_records (order_id, method, status, proof_stored_name, proof_original_name, verified_by, verified_at, updated_at)
             VALUES (?, ?, ?, ?, ?, NULL, NULL, ?)`
          ).run(
            createdOrderId,
            paymentMethod,
            initialPayStatus,
            proofFile ? proofFile.filename : null,
            proofFile ? proofFile.originalname : null,
            nowIso
          );

          db.prepare(
            `INSERT INTO order_status_logs (order_id, from_status, to_status, note, changed_by, created_at)
             VALUES (?, NULL, 'pending', 'Pesanan dikirim pelanggan', NULL, ?)`
          ).run(createdOrderId, nowIso);

          db.exec('COMMIT');
        } catch (txErr) {
          db.exec('ROLLBACK');
          throw txErr;
        }

        const created = getOrderById(createdOrderId);
        res.status(201).json({ order: created });
      } catch (err) {
        safeUnlink(docFile.filename);
        if (proofFile) safeUnlink(proofFile.filename);
        const msg = err instanceof Error ? err.message : 'Gagal membuat pesanan cetak.';
        res.status(400).json({ error: msg });
      }
    }
  );

  router.get('/orders/track/:trackingCode', (req, res) => {
    const code = String(req.params.trackingCode || '').trim();
    if (!code) {
      res.status(400).json({ error: 'Kode pelacakan wajib diisi.' });
      return;
    }
    const order = getOrderByTrackingCode(code);
    if (!order) {
      res.status(404).json({ error: 'Pesanan dengan kode pelacakan tersebut tidak ditemukan.' });
      return;
    }
    res.json({ order });
  });

  router.post(
    '/orders/track/:trackingCode/proof',
    (req, res, next) => {
      uploadMiddleware.single('payment_proof')(req, res, (err: unknown) => {
        if (err) {
          res.status(400).json({ error: 'Gagal mengunggah bukti transfer (maks. 20 MB).' });
          return;
        }
        next();
      });
    },
    (req, res) => {
      const code = String(req.params.trackingCode || '').trim();
      const order = getOrderByTrackingCode(code);
      if (!order) {
        if (req.file) safeUnlink(req.file.filename);
        res.status(404).json({ error: 'Pesanan tidak ditemukan.' });
        return;
      }
      if (!req.file) {
        res.status(400).json({ error: 'File bukti transfer wajib dipilih.' });
        return;
      }
      const ext = path.extname(req.file.originalname).toLowerCase();
      if (!['.png', '.jpg', '.jpeg', '.webp', '.svg'].includes(ext)) {
        safeUnlink(req.file.filename);
        res.status(400).json({ error: 'Bukti transfer harus berupa gambar (PNG, JPG, WEBP).' });
        return;
      }

      const db = getDb();
      const existing = db
        .prepare('SELECT proof_stored_name FROM payment_records WHERE order_id = ?')
        .get(order.id) as { proof_stored_name: string | null } | undefined;
      if (existing?.proof_stored_name) {
        safeUnlink(existing.proof_stored_name);
      }

      const nowIso = new Date().toISOString();
      db.prepare(
        `UPDATE payment_records
         SET method = 'transfer',
             status = CASE WHEN status = 'paid' THEN 'paid' ELSE 'pending_verification' END,
             proof_stored_name = ?,
             proof_original_name = ?,
             updated_at = ?
         WHERE order_id = ?`
      ).run(req.file.filename, req.file.originalname, nowIso, order.id);

      res.json({ order: getOrderById(order.id) });
    }
  );

  router.post('/orders/batch-summary', (req, res) => {
    const codes = Array.isArray(req.body?.trackingCodes) ? req.body.trackingCodes : [];
    const results = codes
      .slice(0, 20)
      .map((c: unknown) => getOrderByTrackingCode(String(c || '')))
      .filter((item: OrderDetail | null): item is OrderDetail => Boolean(item));
    res.json({ orders: results });
  });

  // --- OPERATOR AUTH ROUTES ---

  router.post('/operator/login', (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!email || !password) {
      res.status(400).json({ error: 'Email dan kata sandi wajib diisi.' });
      return;
    }

    const db = getDb();
    const op = db
      .prepare('SELECT * FROM operators WHERE LOWER(email) = ?')
      .get(email) as
      | {
          id: number;
          email: string;
          name: string;
          password_hash: string;
          password_salt: string;
          role: string;
        }
      | undefined;

    if (!op || !verifyPassword(password, op.password_hash, op.password_salt)) {
      res.status(401).json({ error: 'Email atau kata sandi operator salah.' });
      return;
    }

    const token = signOperatorToken({
      operatorId: op.id,
      email: op.email,
      name: op.name,
    });
    setOperatorCookie(res, token);
    res.json({
      operator: {
        id: op.id,
        email: op.email,
        name: op.name,
        role: op.role,
      },
    });
  });

  router.post('/operator/logout', (_req, res) => {
    clearOperatorCookie(res);
    res.json({ ok: true });
  });

  router.get('/operator/me', (req, res) => {
    const session = getOperatorFromRequest(req);
    if (!session) {
      res.json({ operator: null });
      return;
    }
    res.json({
      operator: {
        id: session.operatorId,
        email: session.email,
        name: session.name,
      },
    });
  });

  // --- PROTECTED OPERATOR WORKSPACE ROUTES ---

  router.get('/operator/orders', requireOperatorAuth, (_req, res) => {
    const orders = listAllOrders();
    const counts = {
      pending: orders.filter((o) => o.status === 'pending').length,
      confirmed: orders.filter((o) => o.status === 'confirmed').length,
      printing: orders.filter((o) => o.status === 'printing').length,
      ready: orders.filter((o) => o.status === 'ready').length,
      completed: orders.filter((o) => o.status === 'completed').length,
      rejected: orders.filter((o) => o.status === 'rejected').length,
    };
    res.json({ orders, counts });
  });

  router.get('/operator/orders/:id', requireOperatorAuth, (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: 'ID pesanan tidak valid.' });
      return;
    }
    const order = getOrderById(id);
    if (!order) {
      res.status(404).json({ error: 'Pesanan tidak ditemukan.' });
      return;
    }
    res.json({ order });
  });

  router.patch('/operator/orders/:id/status', requireOperatorAuth, (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    const order = getOrderById(id);
    if (!order) {
      res.status(404).json({ error: 'Pesanan tidak ditemukan.' });
      return;
    }

    const nextStatus = req.body?.status as OrderStatus;
    const rejectionReason = typeof req.body?.rejectionReason === 'string' ? req.body.rejectionReason.trim() : '';
    const note = typeof req.body?.note === 'string' ? req.body.note.trim() : '';

    const check = canTransitionStatus(order.status, nextStatus, rejectionReason);
    if (!check.ok) {
      res.status(400).json({ error: check.error });
      return;
    }

    const db = getDb();
    const nowIso = new Date().toISOString();
    const operatorId = req.operator?.operatorId ?? null;

    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare(
        `UPDATE orders
         SET status = ?,
             rejection_reason = ?,
             updated_at = ?
         WHERE id = ?`
      ).run(
        nextStatus,
        nextStatus === 'rejected' ? rejectionReason : order.rejectionReason,
        nowIso,
        order.id
      );

      db.prepare(
        `INSERT INTO order_status_logs (order_id, from_status, to_status, note, changed_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(
        order.id,
        order.status,
        nextStatus,
        nextStatus === 'rejected' ? rejectionReason : note || null,
        operatorId,
        nowIso
      );

      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }

    res.json({ order: getOrderById(order.id) });
  });

  router.patch('/operator/orders/:id/payment', requireOperatorAuth, (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    const order = getOrderById(id);
    if (!order) {
      res.status(404).json({ error: 'Pesanan tidak ditemukan.' });
      return;
    }

    const db = getDb();
    const nowIso = new Date().toISOString();
    const operatorId = req.operator?.operatorId ?? null;

    db.prepare(
      `UPDATE payment_records
       SET status = 'paid',
           verified_by = ?,
           verified_at = ?,
           updated_at = ?
       WHERE order_id = ?`
    ).run(operatorId, nowIso, nowIso, order.id);

    res.json({ order: getOrderById(order.id) });
  });

  router.get('/operator/orders/:id/file', requireOperatorAuth, (req, res) => {
    const id = Number(req.params.id);
    const db = getDb();
    const row = db
      .prepare('SELECT original_name, stored_name, mime_type, deleted_at FROM order_files WHERE order_id = ?')
      .get(id) as
      | { original_name: string; stored_name: string; mime_type: string; deleted_at: string | null }
      | undefined;

    if (!row || row.deleted_at) {
      res.status(404).json({ error: 'Berkas sudah dihapus atau kedaluwarsa.' });
      return;
    }

    const filePath = path.join(PROTECTED_UPLOADS_DIR, path.basename(row.stored_name));
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Berkas fisik tidak ditemukan di penyimpanan.' });
      return;
    }

    res.download(filePath, row.original_name);
  });

  router.get('/operator/orders/:id/proof', requireOperatorAuth, (req, res) => {
    const id = Number(req.params.id);
    const db = getDb();
    const row = db
      .prepare('SELECT proof_stored_name, proof_original_name FROM payment_records WHERE order_id = ?')
      .get(id) as { proof_stored_name: string | null; proof_original_name: string | null } | undefined;

    if (!row?.proof_stored_name) {
      res.status(404).json({ error: 'Bukti transfer tidak tersedia.' });
      return;
    }

    const filePath = path.join(PROTECTED_UPLOADS_DIR, path.basename(row.proof_stored_name));
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Berkas bukti transfer tidak ditemukan.' });
      return;
    }

    res.sendFile(filePath);
  });

  router.post('/tariffs', requireOperatorAuth, (req, res) => {
    const name = String(req.body?.name || '').trim();
    const category = req.body?.category === 'jilid' ? 'jilid' : 'cetak';
    const paperSize = category === 'cetak' ? (req.body?.paperSize === 'F4' ? 'F4' : 'A4') : null;
    const colorMode = category === 'cetak' ? (req.body?.colorMode === 'Color' ? 'Color' : 'BW') : null;
    const price = Number(req.body?.price);
    const isActive = req.body?.isActive === false ? 0 : 1;

    if (!name || name.length < 2) {
      res.status(400).json({ error: 'Nama layanan minimal 2 karakter.' });
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      res.status(400).json({ error: 'Tarif tidak boleh negatif.' });
      return;
    }

    const db = getDb();
    const nowIso = new Date().toISOString();
    const insert = db
      .prepare(
        `INSERT INTO service_tariffs (name, category, paper_size, color_mode, price, is_active, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(name, category, paperSize, colorMode, Math.round(price), isActive, nowIso);

    const created = getTariffById(Number(insert.lastInsertRowid));
    res.status(201).json({ tariff: created, tariffs: listTariffs(true) });
  });

  router.put('/tariffs/:id', requireOperatorAuth, (req, res) => {
    const id = Number(req.params.id);
    const existing = getTariffById(id);
    if (!existing) {
      res.status(404).json({ error: 'Layanan tarif tidak ditemukan.' });
      return;
    }

    const name = String(req.body?.name || '').trim();
    const category = req.body?.category === 'jilid' ? 'jilid' : 'cetak';
    const paperSize = category === 'cetak' ? (req.body?.paperSize === 'F4' ? 'F4' : 'A4') : null;
    const colorMode = category === 'cetak' ? (req.body?.colorMode === 'Color' ? 'Color' : 'BW') : null;
    const price = Number(req.body?.price);
    const isActive = req.body?.isActive === false ? 0 : 1;

    if (!name || name.length < 2) {
      res.status(400).json({ error: 'Nama layanan minimal 2 karakter.' });
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      res.status(400).json({ error: 'Tarif tidak boleh negatif.' });
      return;
    }

    const db = getDb();
    const nowIso = new Date().toISOString();
    db.prepare(
      `UPDATE service_tariffs
       SET name = ?, category = ?, paper_size = ?, color_mode = ?, price = ?, is_active = ?, updated_at = ?
       WHERE id = ?`
    ).run(name, category, paperSize, colorMode, Math.round(price), isActive, nowIso, id);

    res.json({ tariff: getTariffById(id), tariffs: listTariffs(true) });
  });

  return router;
}
