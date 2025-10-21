# Payment Workflow - Complete Guide

**Timeline**: After order placement → Payment completion → Order status update  
**Services Involved**: Payment Service, Order Service, Notification Service, Analytics Service  
**Integration Points**: Razorpay API, SMS gateway, database  

---

## Overview

This workflow describes **how payment flows** from customer clicking "Pay" to order confirmation and kitchen display update.

---

## Scenario 1: Online Payment (Razorpay)

### 7:08 PM - Customer Clicks "Pay Now"

```
Frontend State:
{
  "order_id": "order-xyz",
  "total_amount": 1250,
  "items": [
    { "name": "Butter Chicken", "quantity": 2, "price": 350 },
    { "name": "Naan", "quantity": 3, "price": 50 }
  ],
  "subtotal": 1200,
  "discount": 0,
  "tax": 50,
  "final_total": 1250
}

Customer clicks: "Pay with Razorpay"
```

### 7:08:02 PM - Initiate Razorpay Order

**Frontend Action**: Call payment initiation API

```bash
POST /api/payments/initiate
Headers:
  Authorization: Bearer eyJhbGciOi...
  X-Tenant-ID: 11111111-1111-1111-1111-111111111111
  Content-Type: application/json

Body:
{
  "order_id": "order-xyz",
  "amount": 1250,
  "currency": "INR",
  "customer_email": "customer@example.com",
  "customer_phone": "9876543210",
  "description": "Order XYZ at Spice Route"
}
```

**API Gateway**: Routes to Payment Service (port 3103)

**Payment Service Processing**:

```
1. Receive request
2. Validate order exists via Order Service
   GET /orders/order-xyz
   → Response: Order status PENDING, amount 1250
   
3. Create Razorpay order via API
   POST https://api.razorpay.com/v1/orders
   Body:
   {
     "amount": 125000,           // in paise
     "currency": "INR",
     "receipt": "order-xyz",
     "notes": {
       "order_id": "order-xyz",
       "tenant_id": "11111111-1111-1111-1111-111111111111"
     }
   }
   
   Response:
   {
     "id": "order_29QQoUBi66xm2f",
     "entity": "order",
     "amount": 125000,
     "status": "created",
     "created_at": 1729604882
   }

4. Store in PostgreSQL (payments table)
   INSERT INTO payments (
     order_id, razorpay_order_id, amount, status, created_at
   ) VALUES (
     'order-xyz', 'order_29QQoUBi66xm2f', 1250, 'INITIATED', now()
   )

5. Cache in Redis for quick lookup
   SET payment:order-xyz <order_data> EX 1800

6. Return to frontend
   {
     "razorpay_order_id": "order_29QQoUBi66xm2f",
     "key_id": "rzp_live_XXXXXXXXXXXX",
     "amount": 1250,
     "currency": "INR"
   }
```

**Frontend Receives**: Razorpay order ID + API key

### 7:08:05 PM - Show Razorpay Popup

```
Frontend displays Razorpay payment popup:
- Card/UPI/Wallet payment options
- Customer enters details
- Razorpay handles encryption
- No sensitive data touches our server
```

### 7:08:30 PM - Customer Completes Payment

```
Customer enters:
- Card number: 4111111111111111
- Expiry: 12/25
- CVV: 123

Razorpay processes:
✓ Payment authorized
✓ Money charged
✓ Returns to frontend with:
  - razorpay_order_id
  - razorpay_payment_id: "pay_29QQoUBi66xm2f"
  - razorpay_signature: "9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a3d"
```

### 7:08:35 PM - Frontend Verifies Payment

**Frontend Action**: Call payment verification API

```bash
POST /api/payments/verify
Headers:
  Authorization: Bearer eyJhbGciOi...
  Content-Type: application/json

Body:
{
  "order_id": "order-xyz",
  "razorpay_order_id": "order_29QQoUBi66xm2f",
  "razorpay_payment_id": "pay_29QQoUBi66xm2f",
  "razorpay_signature": "9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a3d"
}
```

**Payment Service Processing**:

```
1. Receive verification request

2. Generate signature to verify payment
   secret = process.env.RAZORPAY_SECRET
   key_to_sign = order_id + "|" + payment_id
   generated_signature = SHA256(key_to_sign, secret)
   
   generated_signature = "9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a3d"
   received_signature = "9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a3d"
   
   ✓ Signatures match → Payment genuine

3. Call Razorpay verification API (double-check)
   GET https://api.razorpay.com/v1/payments/pay_29QQoUBi66xm2f
   
   Response:
   {
     "id": "pay_29QQoUBi66xm2f",
     "entity": "payment",
     "amount": 125000,
     "status": "captured",
     "order_id": "order_29QQoUBi66xm2f"
   }
   
   ✓ Status is "captured" → Money received

4. Update payment in PostgreSQL
   UPDATE payments
   SET status = 'COMPLETED', verified_at = now()
   WHERE order_id = 'order-xyz'

5. Update payment in Redis
   SET payment:order-xyz:status COMPLETED

6. Trigger Kafka event: payment.completed
   {
     "event": "payment.completed",
     "order_id": "order-xyz",
     "amount": 1250,
     "payment_method": "RAZORPAY",
     "timestamp": "2024-10-22T19:08:35Z"
   }

7. Return success to frontend
   {
     "success": true,
     "data": {
       "transaction_id": "txn-abc123",
       "order_id": "order-xyz",
       "status": "COMPLETED",
       "amount": 1250
     }
   }
```

### 7:08:40 PM - Kafka Event: payment.completed

```
Event published to Kafka topic: payment-events

Consumers listening:

1. Order Service consumes
   → Updates order.payment_status = PAID
   → Updates order.overall_status = CONFIRMED
   → Publishes: order.confirmed event

2. Notification Service consumes
   → Sends SMS: "Payment confirmed for order #XYZ. ₹1,250"
   → Updates notification status: SENT

3. Analytics Service consumes
   → Logs revenue metric
   → Records payment method: RAZORPAY
   → Updates daily revenue counter
```

### 7:08:45 PM - Order Sent to Kitchen

**Order Service Processing**:

```
After payment.completed received:

1. Fetch order from PostgreSQL
   SELECT * FROM orders WHERE id = 'order-xyz'

2. Update order status
   UPDATE orders
   SET payment_status = 'PAID',
       overall_status = 'CONFIRMED',
       confirmed_at = now()
   WHERE id = 'order-xyz'

3. Publish Kafka event: order.confirmed
   {
     "event": "order.confirmed",
     "order_id": "order-xyz",
     "total_amount": 1250,
     "items": [
       { "menu_item_id": "item-123", "quantity": 2, "name": "Butter Chicken" }
     ],
     "timestamp": "2024-10-22T19:08:45Z"
   }

4. Update cache
   SET order:order-xyz:status CONFIRMED
```

**Kitchen Display System receives**: Order appears on screen

```
Kitchen Display shows:
┌─────────────────────────────┐
│ ORDER #XYZ                  │
│ Table 5                     │
│ 2x Butter Chicken           │
│ 3x Naan                     │
├─────────────────────────────┤
│ STATUS: NEW ORDER           │
│ EST. TIME: 15 mins          │
│ PRIORITY: NORMAL            │
└─────────────────────────────┘

Sound/Alert: "New order!"
```

### 7:08:50 PM - Customer Notification

**Notification Service sends SMS**:

```
SMS Content:
"Your Intellidine order #XYZ has been confirmed! 
Amount: ₹1,250 (paid via online). 
Est. ready time: 15 mins. 
Table 5."

Delivery via Twilio:
POST https://api.twilio.com/2010-04-01/Accounts/AC.../Messages.json
Body:
{
  "From": "+1234567890",
  "To": "+919876543210",
  "Body": "Your Intellidine order #XYZ has been confirmed!..."
}

Response: SMS queued, ID: SM...
Customer receives SMS in 1-3 seconds
```

---

## Scenario 2: Cash Payment

### 7:08 PM - Customer Selects "Pay at Counter"

```
Frontend: Customer selects payment method = CASH
Proceeds to order summary
Clicks: "Place Order (Pay at Counter)"
```

### 7:08:05 PM - Order Created with Cash Payment

**Frontend Action**: Create order with payment_method = CASH

```bash
POST /api/orders
Headers:
  Authorization: Bearer <token>
Body:
{
  "items": [...],
  "payment_method": "CASH",
  "special_requests": "..."
}
```

**Order Service Creates Order**:

```
1. Validate items
2. Calculate total: 1250
3. Create order record
   INSERT INTO orders (...) VALUES (
     order_id = 'order-xyz',
     payment_status = 'PENDING',
     payment_method = 'CASH',
     overall_status = 'CONFIRMED'
   )
4. Publish Kafka event: order.created
   → Kitchen sees order
   → Discount Engine calculates discount
   → Inventory deducts stock
```

### 7:08:10 PM - Order to Kitchen (Without Payment)

```
Kitchen Display shows:
┌─────────────────────────────┐
│ ORDER #XYZ                  │
│ Table 5                     │
│ 2x Butter Chicken           │
│ 3x Naan                     │
├─────────────────────────────┤
│ STATUS: NEW ORDER           │
│ PAYMENT: CASH DUE           │
│ EST. TIME: 15 mins          │
└─────────────────────────────┘
```

### 7:25 PM - Order Ready

Kitchen marks order as READY
→ Customer called to pick up

### 7:27 PM - Customer Arrives

```
Customer arrives at counter with order number
Waiter verifies order
Prepares to process payment
```

### 7:27:05 PM - Mark Payment Received

**Waiter/Manager Action**: Process cash payment

```bash
PATCH /api/payments/:payment_id/mark-received
Headers:
  Authorization: Bearer <staff_token>
Body:
{
  "payment_received": true,
  "amount": 1250,
  "method": "CASH"
}
```

**Payment Service**:

```
1. Find payment record
   SELECT * FROM payments WHERE order_id = 'order-xyz'

2. Update payment status
   UPDATE payments
   SET status = 'COMPLETED',
       payment_received_at = now(),
       payment_received_by = 'waiter1'
   WHERE order_id = 'order-xyz'

3. Publish Kafka event: payment.completed
   (same as online payment flow)

4. Notification Service sends SMS
   "Thank you for your order at Spice Route!"
```

---

## Scenario 3: Payment Refund

### 7:15 PM - Customer Cancels Order

```
Customer changes mind
Calls waiter: "Cancel my order"
Waiter initiates cancellation in system
```

### 7:15:05 PM - Order Cancelled

**Order Service**:

```
1. Receive cancellation request
   PATCH /api/orders/order-xyz/cancel

2. Validate refund eligibility
   - Order not yet served? ✓
   - Payment completed? ✓
   - Eligible for refund? ✓

3. Update order status
   UPDATE orders
   SET overall_status = 'CANCELLED',
       cancelled_at = now(),
       cancellation_reason = 'customer_request'
   WHERE id = 'order-xyz'

4. Call Payment Service to refund
   POST /api/payments/refunds
   Body:
   {
     "order_id": "order-xyz",
     "reason": "Customer cancellation",
     "amount": 1250
   }
```

### 7:15:10 PM - Refund Processing

**Payment Service**:

```
1. Find original payment
   SELECT * FROM payments WHERE order_id = 'order-xyz'
   → razorpay_payment_id: pay_29QQoUBi66xm2f

2. Call Razorpay refund API
   POST https://api.razorpay.com/v1/payments/pay_29QQoUBi66xm2f/refund
   Body:
   {
     "amount": 125000,
     "notes": {
       "reason": "customer_cancellation",
       "order_id": "order-xyz"
     }
   }

3. Razorpay processes:
   ✓ Validates payment can be refunded
   ✓ Initiates reversal to card
   ✓ Returns refund ID: rfnd_29QQoUBi66xm2f
   ✓ Returns status: "initiated" (5-10 min processing)

4. Store refund record
   INSERT INTO refunds (
     payment_id, razorpay_refund_id, amount, 
     status, reason, created_at
   ) VALUES (
     ..., 'rfnd_29QQoUBi66xm2f', 1250, 
     'INITIATED', 'customer_cancellation', now()
   )

5. Publish Kafka event: payment.refunded
   {
     "event": "payment.refunded",
     "order_id": "order-xyz",
     "amount": 1250,
     "refund_id": "rfnd_29QQoUBi66xm2f",
     "status": "INITIATED",
     "timestamp": "2024-10-22T19:15:10Z"
   }
```

### 7:15:15 PM - Customer Notified

**Notification Service**:

```
SMS: "Your order has been cancelled. 
Refund of ₹1,250 has been initiated. 
Please check your account in 24 hours."

Email: Cancellation confirmation with refund details
```

### 7:15:20 PM - Kitchen Notified

```
Kitchen Display updates:
✗ Order XYZ CANCELLED - Do not prepare
Remove from queue
```

### Next Day - Refund Complete

```
Razorpay webhook notification:
{
  "event": "refund.completed",
  "payload": {
    "refund_id": "rfnd_29QQoUBi66xm2f",
    "status": "processed",
    "amount": 125000
  }
}

Payment Service receives webhook:
1. Find refund record
2. Update status to COMPLETED
3. Send customer SMS: "Refund processed successfully"
4. Update analytics
```

---

## Payment States Diagram

```
PENDING
  ↓
INITIATED (after initiate API called)
  ├─ Success → COMPLETED (payment verified)
  │           ↓
  │        Customer notified
  │           ↓
  │        Order to kitchen
  │
  └─ Fail → FAILED
            ↓
         Retry or different method

COMPLETED
  ├─ Refund requested → REFUND_INITIATED
  │                      ↓
  │                   REFUNDED (after 5-10 min)
  │                      ↓
  │                   Customer notified
  │
  └─ Payment stays COMPLETED (normal case)
```

---

## Error Scenarios

| Scenario | What Happens | Recovery |
|----------|--------------|----------|
| Payment declined | Razorpay returns error | Customer tries again or different card |
| Network timeout | Order stuck in INITIATED | Webhook arrives later, resolves automatically |
| Signature mismatch | Payment rejected | Security measure, prevents tampering |
| Refund API down | Refund queued | Retry automatically every 5 min |
| Double payment | Duplicate verification | Idempotent check prevents second charge |

---

## Performance Metrics

| Step | Time (ms) | Bottleneck |
|------|-----------|-----------|
| Initiate order | 200-300 | Razorpay API |
| Show popup to customer | 0-50 | Network latency |
| Customer enters details | 30-60s | User action |
| Razorpay processes | 500-2000 | Payment provider |
| Verify signature | 5-10 | Local computation |
| Update database | 50-100 | PostgreSQL write |
| Publish Kafka event | 20-40 | Message queue |
| Send SMS | 1000-3000 | SMS provider |
| **Total end-to-end** | **~2-5 seconds** | **Razorpay API** |

---

**See Also**:
- [PAYMENT_SERVICE.md](../services/PAYMENT_SERVICE.md) - Endpoint details
- [ORDER_SERVICE.md](../services/ORDER_SERVICE.md) - Order creation integration
- [ORDERING_WORKFLOW.md](./ORDERING_WORKFLOW.md) - Complete customer journey
