# Payment Service - Complete Guide

**Port**: 3103  
**Language**: TypeScript (NestJS)  
**Database**: PostgreSQL  
**External Services**: Razorpay API  
**Responsibility**: Payment processing, transaction tracking, refunds, payment method handling

---

## What Payment Service Does

Payment Service handles **all money transactions**:

- ✅ Process online payments (Razorpay integration)
- ✅ Handle cash payments (on-delivery)
- ✅ Payment status tracking
- ✅ Refund processing
- ✅ Transaction history
- ✅ Payment verification
- ✅ Failed payment recovery

---

## Payment Methods

### 1. Online Payment (Razorpay)

```json
{
  "method": "RAZORPAY",
  "razorpay_order_id": "order_29QQoUBi66xm2f",
  "razorpay_payment_id": "pay_29QQoUBi66xm2f",
  "razorpay_signature": "9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a3d"
}
```

### 2. Cash Payment

```json
{
  "method": "CASH",
  "cash_amount": 1250
}
```

---

## Payment Flow

### Step 1: Initiate Razorpay Payment

```
POST /api/payments/initiate

Headers:
Authorization: Bearer <jwt_token>

Body:
{
  "order_id": "order-xyz",
  "amount": 1250,
  "currency": "INR",
  "customer_email": "customer@example.com",
  "customer_phone": "9876543210"
}

Response:
{
  "success": true,
  "data": {
    "razorpay_order_id": "order_29QQoUBi66xm2f",
    "amount": 1250,
    "currency": "INR",
    "customer": {
      "name": "John Doe",
      "email": "customer@example.com",
      "phone": "9876543210"
    },
    "key_id": "rzp_live_XXXXXXXXXXXX"
  }
}
```

**Backend Process**:
1. Validate order exists and is unpaid
2. Create Razorpay order via API
3. Store order ID in PostgreSQL
4. Return Razorpay order ID to frontend
5. Frontend shows Razorpay payment popup

### Step 2: Verify Razorpay Payment

```
POST /api/payments/verify

Headers:
Authorization: Bearer <jwt_token>

Body:
{
  "order_id": "order-xyz",
  "razorpay_order_id": "order_29QQoUBi66xm2f",
  "razorpay_payment_id": "pay_29QQoUBi66xm2f",
  "razorpay_signature": "9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a3d"
}

Response:
{
  "success": true,
  "data": {
    "transaction_id": "txn-abc123",
    "order_id": "order-xyz",
    "amount": 1250,
    "status": "COMPLETED",
    "method": "RAZORPAY",
    "payment_id": "pay_29QQoUBi66xm2f",
    "verified_at": "2024-10-22T19:30:45Z"
  }
}
```

**Backend Process**:
1. Generate signature from order ID + payment ID + secret
2. Compare with submitted signature
3. If matches → payment genuine
4. Query Razorpay API for double confirmation
5. Update order status to PAID
6. Record transaction in PostgreSQL
7. Trigger order.paid Kafka event

### Step 3: Handle Cash Payment

```
POST /api/payments/cash

Headers:
Authorization: Bearer <jwt_token>

Body:
{
  "order_id": "order-xyz",
  "amount": 1250
}

Response:
{
  "success": true,
  "data": {
    "transaction_id": "txn-xyz789",
    "order_id": "order-xyz",
    "amount": 1250,
    "status": "PENDING",
    "method": "CASH",
    "notes": "Payment due at pickup/delivery"
  }
}
```

**Backend Process**:
1. Create transaction record with status PENDING
2. Store cash payment note
3. Order stays unpaid in Order Service
4. Waiter/Manager marks as paid after cash received
5. Trigger payment.completed when marked paid

---

## Refund Processing

### Initiate Refund

```
POST /api/payments/refunds

Headers:
Authorization: Bearer <jwt_token>
X-Tenant-ID: 11111111-1111-1111-1111-111111111111

Body:
{
  "transaction_id": "txn-abc123",
  "reason": "Customer requested cancellation",
  "amount": 1250
}

Response:
{
  "success": true,
  "data": {
    "refund_id": "refund-123",
    "transaction_id": "txn-abc123",
    "amount": 1250,
    "status": "INITIATED",
    "reason": "Customer requested cancellation",
    "created_at": "2024-10-22T20:15:00Z"
  }
}
```

**Backend Process**:
1. Find original payment transaction
2. Verify can be refunded (not already refunded)
3. Call Razorpay refund API
4. Store refund record in PostgreSQL
5. Send SMS notification to customer
6. Trigger payment.refunded Kafka event

### Track Refund Status

```
GET /api/payments/refunds/refund-123

Response:
{
  "success": true,
  "data": {
    "refund_id": "refund-123",
    "razorpay_refund_id": "rfnd_29QQoUBi66xm2f",
    "transaction_id": "txn-abc123",
    "amount": 1250,
    "status": "COMPLETED",
    "processed_at": "2024-10-22T20:25:30Z"
  }
}
```

---

## Database Schema

```typescript
model Payment {
  id                      String   @id @default(uuid())
  order_id                String   @unique
  tenant_id               String
  amount                  Decimal
  currency                String   @default("INR")
  payment_method          PaymentMethod
  status                  PaymentStatus
  
  // Razorpay specific
  razorpay_order_id       String?
  razorpay_payment_id     String?
  razorpay_signature      String?
  
  // Cash specific
  cash_notes              String?
  cash_received_by        String?
  cash_received_at        DateTime?
  
  // General
  created_at              DateTime @default(now())
  verified_at             DateTime?
  updated_at              DateTime @updatedAt

  order Order @relation(fields: [order_id], references: [id])
  refunds Refund[]

  @@index([order_id])
  @@index([status])
  @@index([tenant_id])
  @@map("payments")
}

enum PaymentMethod {
  RAZORPAY
  CASH
  UPI
  CARD
}

enum PaymentStatus {
  PENDING
  INITIATED
  COMPLETED
  FAILED
  REFUNDED
}

model Refund {
  id                      String   @id @default(uuid())
  payment_id              String
  tenant_id               String
  amount                  Decimal
  reason                  String
  status                  RefundStatus
  
  razorpay_refund_id      String?
  
  created_at              DateTime @default(now())
  processed_at            DateTime?
  updated_at              DateTime @updatedAt

  payment Payment @relation(fields: [payment_id], references: [id])

  @@index([payment_id])
  @@index([status])
  @@map("refunds")
}

enum RefundStatus {
  INITIATED
  PROCESSING
  COMPLETED
  FAILED
}
```

---

## Razorpay Integration

### Webhook Handling

Razorpay sends webhooks for payment events:

```
POST /api/payments/webhooks/razorpay

Webhook Event: payment.authorized
Body:
{
  "event": "payment.authorized",
  "payload": {
    "payment": {
      "id": "pay_29QQoUBi66xm2f",
      "order_id": "order_29QQoUBi66xm2f",
      "amount": 125000,
      "status": "authorized"
    }
  }
}

→ Payment Service verifies webhook signature
→ Updates transaction status
→ Triggers Kafka event
```

---

## Endpoints Summary

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| `POST` | `/api/payments/initiate` | Create Razorpay order | JWT |
| `POST` | `/api/payments/verify` | Verify payment signature | JWT |
| `POST` | `/api/payments/cash` | Record cash payment | JWT |
| `GET` | `/api/payments/:id` | Get payment details | JWT |
| `POST` | `/api/payments/refunds` | Initiate refund | JWT + MANAGER |
| `GET` | `/api/payments/refunds/:id` | Get refund status | JWT |
| `POST` | `/api/payments/webhooks/razorpay` | Razorpay webhook | Signature verification |

---

## Real-World Scenarios

### Scenario 1: Customer Pays Online via Razorpay

```
1. 7:08 PM: Customer clicks "Pay Now"
2. Frontend calls: POST /api/payments/initiate
3. Payment Service creates Razorpay order
4. Returns razorpay_order_id to frontend
5. Frontend opens Razorpay payment popup
6. Customer enters card/UPI details
7. Razorpay processes payment
8. Customer sees "Payment Successful"
9. Frontend calls: POST /api/payments/verify
10. Payment Service verifies signature with Razorpay
11. Order marked as PAID
12. Kafka event triggers order.paid
13. Kitchen receives order
```

### Scenario 2: Customer Pays with Cash

```
1. 7:08 PM: Customer selects "Pay at Counter"
2. Frontend calls: POST /api/payments/cash
3. Payment Service creates transaction (PENDING)
4. Order shows payment status as CASH_PENDING
5. 7:30 PM: Customer arrives at counter
6. Waiter marks payment received
7. Payment Service updates transaction to COMPLETED
8. Kafka event triggers payment.completed
```

### Scenario 3: Customer Requests Refund

```
1. Order created at 7:08 PM, paid 1250
2. At 7:15 PM: Customer cancels order
3. Order Service calls: POST /api/payments/refunds
4. Payment Service calls Razorpay refund API
5. Refund initiated (5-10 min processing)
6. Customer receives SMS: "Refund initiated, check in 24hrs"
7. Next day: Razorpay webhook confirms refund
8. Refund status shows COMPLETED
9. Customer sees 1250 back in account
```

---

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| "Invalid signature" | Tampered payment | Reject payment, user retries |
| "Order not found" | Invalid order ID | Return 404, check order ID |
| "Payment already verified" | Double submission | Return success (idempotent) |
| "Razorpay API down" | External service down | Retry with exponential backoff |
| "Refund failed" | Razorpay issue | Mark as FAILED, retry later |

---

## Performance Characteristics

- **Initiate payment**: 200-300ms (Razorpay API call)
- **Verify payment**: 150-200ms (signature check + verification)
- **Cash payment recording**: 50-80ms
- **Refund initiation**: 250-350ms (Razorpay API call)
- **Webhook processing**: 100-150ms

---

## Testing Payment Service

```bash
# Initiate Razorpay payment
curl -X POST http://localhost:3100/api/payments/initiate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "order-xyz",
    "amount": 1250,
    "customer_phone": "9876543210"
  }'

# Record cash payment
curl -X POST http://localhost:3100/api/payments/cash \
  -H "Authorization: Bearer <token>" \
  -d '{
    "order_id": "order-xyz",
    "amount": 1250
  }'

# Verify payment
curl -X POST http://localhost:3100/api/payments/verify \
  -H "Authorization: Bearer <token>" \
  -d '{
    "razorpay_order_id": "order_29QQoUBi66xm2f",
    "razorpay_payment_id": "pay_29QQoUBi66xm2f",
    "razorpay_signature": "9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a3d"
  }'
```

---

**See Also**:
- [SYSTEM_OVERVIEW.md](../SYSTEM_OVERVIEW.md) - Payment flow in architecture
- [ORDER_SERVICE.md](./ORDER_SERVICE.md) - Order payment integration
