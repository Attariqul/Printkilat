import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTrackingCode,
  calculateOrderTotal,
  canTransitionStatus,
  formatQueueNumber,
  formatRupiah,
  getStatusStepIndex,
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
