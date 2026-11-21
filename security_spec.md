# PrintKilat Firestore Security Specification (Phase 0)

## Data Invariants
1. **Tariff Integrity**: Only verified operators (`isOperator()`) can create, edit, or deactivate entries in `/tariffs/{tariffId}`. Guests can only read active tariffs.
2. **Strict Guest Order Isolation**: Guests cannot list `/orders` (`allow list: if isOperator()`). A guest can only read a single `/orders/{trackingCode}` document by providing the exact secret `trackingCode` ID (`PK-TRK-...`).
3. **Order Creation Immutability**: New orders created by guests must start in `status == 'pending'`, with `rejectionReason == null`, valid referenced `printTariffId`, bounded `pageCount` (1..2000) and `copies` (1..200), server timestamps (`createdAt == request.time && updatedAt == request.time`), and `trackingCode == docId`.
4. **PII Isolation**: Customer phone number is isolated in `/orders/{trackingCode}/private/contact`, readable only by verified operators.
5. **Document & Proof Protection**: Document file chunks (`/orders/{trackingCode}/fileChunks/{chunkId}`) and payment proof images (`/orders/{trackingCode}/proof/{proofId}`) are readable only by verified operators.
6. **State Locking & Tiered Updates**: Guests can only update `payment` (uploading transfer proof while order is non-terminal and unpaid). Only verified operators can transition order status or mark payment `paid`.

## Dirty Dozen Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **List Orders Scraping**: Unauthenticated guest calls `getDocs(collection(db, 'orders'))` -> DENIED (`allow list: if isOperator()`).
2. **Ghost Field Injection on Order Create**: Guest creates `/orders/PK-TRK-TEST1234` with extra `isAdmin: true` -> DENIED (`hasOnly` check).
3. **Self-Approved Status on Create**: Guest creates order with `status: 'ready'` or `payment.status: 'paid'` -> DENIED (`status == 'pending'`, `payment.status != 'paid'`).
4. **Timestamp Forgery on Create**: Guest sends client timestamp `createdAt: Timestamp(2020-01-01)` -> DENIED (`createdAt == request.time`).
5. **Poisoned Document ID**: Guest attempts create at `/orders/../../tariffs/evil` or 500-char ID -> DENIED (`isValidTrackingCode`).
6. **Orphaned Tariff Reference**: Guest creates order referencing nonexistent `printTariffId: 'fake-id'` -> DENIED (`exists(/databases/.../tariffs/...)`).
7. **Guest Status Escalation on Update**: Guest updates `/orders/PK-TRK-TEST1234` changing `status: 'completed'` -> DENIED (`affectedKeys().hasOnly(['payment', 'updatedAt'])`).
8. **Guest Total Amount Tampering**: Guest updates `/orders/PK-TRK-TEST1234` changing `totalAmount: 0` -> DENIED.
9. **Post-Terminal Mutation**: Guest attempts payment proof upload after `status == 'completed'` or `'rejected'` -> DENIED.
10. **PII Snooping with Tracking Code**: Guest reads `/orders/PK-TRK-TEST1234/private/contact` -> DENIED (`isOperator()` only).
11. **Document Download by Guest**: Guest reads `/orders/PK-TRK-TEST1234/fileChunks/0` -> DENIED (`isOperator()` only).
12. **Privilege Escalation on Operators/Tariffs**: Unverified or non-admin user attempts write to `/operators/{uid}` or `/tariffs/{id}` -> DENIED.
