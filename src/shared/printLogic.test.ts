import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTrackingCode,
  calculateChunkCount,
  calculateOrderTotal,
  canTransitionStatus,
  FILE_CHUNK_RAW_BYTES,
  formatFileSize,
  formatQueueNumber,
  formatRupiah,
  getJakartaDateYYYYMMDD,
  getPaymentMethodLabel,
  getShortStatusLabel,
  getStatusLabel,
  getStatusStepIndex,
  requiresPaymentProof,
  slugifyTariffId,
  validateOrderPaymentInput,
  validateUploadMeta,
} from './printLogic';

test('calculateOrderTotal computes exact formula (printRate * pages * copies) + (bindRate * copies)', () => {
  const res = calculateOrderTotal({
    printRate: 500,
    pages: 12,
    copies: 2,
    bindRate: 3000,
  });
  assert.equal(res.printSubtotal, 12000);
  assert.equal(res.bindSubtotal, 6000);
  assert.equal(res.total, 18000);

  const singleCopy = calculateOrderTotal({
    printRate: 1500,
    pages: 10,
    copies: 1,
    bindRate: 0,
  });
  assert.equal(singleCopy.total, 15000);
});

test('calculateOrderTotal rejects invalid pages, copies, or negative tariffs', () => {
  assert.throws(() => calculateOrderTotal({ printRate: 500, pages: 0, copies: 1, bindRate: 0 }));
  assert.throws(() => calculateOrderTotal({ printRate: 500, pages: 5, copies: 0, bindRate: 0 }));
  assert.throws(() => calculateOrderTotal({ printRate: -100, pages: 5, copies: 1, bindRate: 0 }));
});

test('formatRupiah formats Indonesian currency cleanly', () => {
  assert.equal(formatRupiah(15000), 'Rp 15.000');
  assert.equal(formatRupiah(0), 'Rp 0');
});

test('formatQueueNumber produces PK-YYYYMMDD-NNN format', () => {
  assert.equal(formatQueueNumber('2026-11-19', 1), 'PK-20261119-001');
  assert.equal(formatQueueNumber('20261119', 42), 'PK-20261119-042');
  assert.throws(() => formatQueueNumber('2026', 1));
});

test('buildTrackingCode returns PK-TRK-XXXXXXXX using unambiguous characters', () => {
  const code = buildTrackingCode([0, 1, 2, 3, 4, 5, 6, 7]);
  assert.match(code, /^PK-TRK-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/);
});

test('canTransitionStatus enforces workflow state machine and rejection reason', () => {
  assert.equal(canTransitionStatus('pending', 'confirmed').ok, true);
  assert.equal(canTransitionStatus('confirmed', 'printing').ok, true);
  assert.equal(canTransitionStatus('printing', 'ready').ok, true);
  assert.equal(canTransitionStatus('ready', 'completed').ok, true);

  // Skipping stages is not allowed
  assert.equal(canTransitionStatus('pending', 'ready').ok, false);
  assert.equal(canTransitionStatus('completed', 'ready').ok, false);

  // Rejection requires reason
  assert.equal(canTransitionStatus('pending', 'rejected', '').ok, false);
  assert.equal(canTransitionStatus('pending', 'rejected', 'File corrupt').ok, true);
});

test('getStatusStepIndex maps progression and rejected state', () => {
  assert.equal(getStatusStepIndex('pending'), 0);
  assert.equal(getStatusStepIndex('completed'), 4);
  assert.equal(getStatusStepIndex('rejected'), -1);
});

test('validateUploadMeta validates extensions and 20MB limit', () => {
  assert.equal(validateUploadMeta('Makalah_Dummy.pdf', 1024 * 1024).ok, true);
  assert.equal(validateUploadMeta('Skripsi.DOCX', 5 * 1024 * 1024).ok, true);
  assert.equal(validateUploadMeta('virus.exe', 1024).ok, false);
  assert.equal(validateUploadMeta('huge.pdf', 21 * 1024 * 1024).ok, false);
  assert.equal(validateUploadMeta('empty.pdf', 0).ok, false);
});

test('calculateChunkCount stays within Firestore 60 chunk limit up to 20MB', () => {
  assert.equal(calculateChunkCount(1024), 1);
  assert.equal(calculateChunkCount(FILE_CHUNK_RAW_BYTES + 1), 2);
  const chunksAt20Mb = calculateChunkCount(20 * 1024 * 1024);
  assert.equal(chunksAt20Mb <= 60, true);
});

test('slugifyTariffId generates clean URL-safe Firestore document IDs', () => {
  assert.equal(slugifyTariffId('Print Warna A3!', 'm1'), 'print-warna-a3-m1');
  assert.match(slugifyTariffId('   '), /^tarif/);
});

test('validateOrderPaymentInput requires payment proof for qr and transfer but not cash', () => {
  assert.equal(requiresPaymentProof('cash'), false);
  assert.equal(requiresPaymentProof('qr'), true);
  assert.equal(requiresPaymentProof('transfer'), true);

  assert.equal(validateOrderPaymentInput('cash', false).ok, true);
  assert.equal(validateOrderPaymentInput('qr', false).ok, false);
  assert.equal(validateOrderPaymentInput('transfer', false).ok, false);
  assert.equal(validateOrderPaymentInput('qr', true).ok, true);
  assert.equal(validateOrderPaymentInput('transfer', true).ok, true);

  assert.equal(getPaymentMethodLabel('qr'), 'QR / QRIS');
  assert.equal(getPaymentMethodLabel('transfer'), 'Transfer Bank');
});

test('getJakartaDateYYYYMMDD returns YYYYMMDD string format', () => {
  const d = new Date('2026-11-22T02:00:00Z');
  const str = getJakartaDateYYYYMMDD(d);
  assert.equal(str.length, 8);
  assert.match(str, /^[0-9]{8}$/);
});

test('formatFileSize formats bytes, KB, and MB accurately', () => {
  assert.equal(formatFileSize(0), '0 KB');
  assert.equal(formatFileSize(-100), '0 KB');
  assert.equal(formatFileSize(500), '1 KB');
  assert.equal(formatFileSize(1024), '1 KB');
  assert.equal(formatFileSize(150 * 1024), '150 KB');
  assert.equal(formatFileSize(1024 * 1024), '1,0 MB');
  assert.equal(formatFileSize(5 * 1024 * 1024), '5,0 MB');
});

test('canTransitionStatus enforces complete state machine and terminal states', () => {
  // Valid forward paths
  assert.equal(canTransitionStatus('pending', 'confirmed').ok, true);
  assert.equal(canTransitionStatus('confirmed', 'printing').ok, true);
  assert.equal(canTransitionStatus('printing', 'ready').ok, true);
  assert.equal(canTransitionStatus('ready', 'completed').ok, true);

  // Valid rejection from active states with reason >= 3 chars
  assert.equal(canTransitionStatus('pending', 'rejected', 'Alasan penolakan').ok, true);
  assert.equal(canTransitionStatus('confirmed', 'rejected', 'Alasan penolakan').ok, true);
  assert.equal(canTransitionStatus('printing', 'rejected', 'Alasan penolakan').ok, true);

  // Ready cannot be rejected
  assert.equal(canTransitionStatus('ready', 'rejected', 'Alasan penolakan').ok, false);

  // Terminal states cannot transition to anything
  assert.equal(canTransitionStatus('completed', 'pending').ok, false);
  assert.equal(canTransitionStatus('completed', 'confirmed').ok, false);
  assert.equal(canTransitionStatus('completed', 'rejected').ok, false);
  assert.equal(canTransitionStatus('rejected', 'pending').ok, false);
  assert.equal(canTransitionStatus('rejected', 'confirmed').ok, false);

  // Same status transition rejected
  assert.equal(canTransitionStatus('pending', 'pending').ok, false);
});

test('formatQueueNumber handles varied sequence numbers correctly', () => {
  assert.equal(formatQueueNumber('20261122', 1), 'PK-20261122-001');
  assert.equal(formatQueueNumber('20261122', 99), 'PK-20261122-099');
  assert.equal(formatQueueNumber('20261122', 100), 'PK-20261122-100');
  assert.equal(formatQueueNumber('20261122', 1234), 'PK-20261122-1234');
});

test('getStatusLabel and getShortStatusLabel provide friendly Indonesian labels for all statuses', () => {
  const statuses = ['pending', 'confirmed', 'printing', 'ready', 'completed', 'rejected'] as const;
  for (const st of statuses) {
    assert.equal(typeof getStatusLabel(st), 'string');
    assert.equal(getStatusLabel(st).length > 0, true);
    assert.equal(typeof getShortStatusLabel(st), 'string');
    assert.equal(getShortStatusLabel(st).length > 0, true);
  }
});
