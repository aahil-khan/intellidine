# Complete Order Workflow - Step by Step

This document traces **exactly** what happens from the moment a customer scans a QR code to when they finish eating and pay. Every service involved, every API call, every database query.

---

## 🎯 The Complete Journey (With Timestamps)

### 7:00 PM - Customer Arrives at Restaurant

```
Customer walks in, sits at Table 5
Restaurant has table QR codes pointing to:
  https://intellidine.app/table/tbl-005?tenant_id=11111111-1111-1111-1111-111111111111
```

---

### 7:01 PM - Customer Scans QR Code

```
Customer pulls out phone → Opens camera → Scans QR at table

Mobile browser navigates to:
  https://intellidine.app/table/tbl-005?tenant_id=11111111-1111-1111-1111-111111111111

Frontend extracts from URL:
  table_id = "tbl-005"
  tenant_id = "11111111-1111-1111-1111-111111111111"

Frontend shows: "Welcome! Getting your menu..."
```

---

### 7:01:05 PM - Get OTP (Authentication)

**Frontend Action**:
```
Frontend calls:
  POST /api/auth/customer/otp
  
Headers:
  Content-Type: application/json

Body:
{
  "phone_number": "9876543210"
}
```

**API Gateway**:
```
1. Routes request to Auth Service (port 3101)
2. No JWT required yet (public endpoint)
3. Records request for logging
```

**Auth Service Process**:
```
1. Generate 6-digit OTP: "123456"
2. Hash OTP with bcrypt (store hash, not plain OTP)
3. Store in PostgreSQL:
   INSERT INTO otp_verifications 
   VALUES {
     phone_number: "9876543210",
     otp_hash: "$2b$10$...",  // bcrypt hash
     created_at: 2025-10-22 19:01:05,
     expires_at: 2025-10-22 19:06:05,  // 5 min expiry
     verified: false
   }

4. Cache in Redis (for instant validation):
   SET otp:9876543210 $2b$10$... EX 300

5. Send SMS:
   POST to SNS/Twilio
   Message: "Your Intellidine OTP is 123456. Valid for 5 minutes."

6. Return response
```

**Frontend Response**:
```json
{
  "success": true,
  "message": "OTP sent to 9876543210",
  "phone_masked": "987****3210",
  "expires_in": 300
}
```

**Frontend UI**:
```
Shows OTP input field
"Enter the 6-digit code sent to 987****3210"
Countdown timer: 5:00
```

---

### 7:02 PM - Customer Enters OTP

**Customer Types**: 123456

**Frontend Action**:
```
Frontend calls:
  POST /api/auth/customer/verify-otp
  
Body:
{
  "phone_number": "9876543210",
  "otp": "123456"
}
```

**Auth Service Process**:
```
1. Retrieve OTP hash from Redis:
   GET otp:9876543210
   → Returns: $2b$10$...

2. Compare submitted OTP with stored hash:
   bcrypt.compare("123456", "$2b$10$...")
   → true ✓

3. Check if expired:
   expire_time > now
   → true ✓

4. Find or create Customer record:
   SELECT * FROM customers 
   WHERE phone_number = "9876543210"
   
   If doesn't exist:
     INSERT INTO customers 
     VALUES {
       id: uuid(),
       phone_number: "9876543210",
       name: null,
       created_at: now()
     }
   
   customer_id = "cust-abc123"

5. Create JWT token:
   Token payload:
   {
     sub: "cust-abc123",
     phone: "9876543210",
     role: "CUSTOMER",
     tenant_id: "11111111-1111-1111-1111-111111111111",
     iat: 1729611625,
     exp: 1729640225  // 8 hours later
   }
   
   Sign with secret: jwt.sign(payload, SECRET)
   Token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

6. Store session in Redis:
   SET session:cust-abc123 <jwt_token> EX 28800
   // 8 hour expiry

7. Update OTP as verified:
   UPDATE otp_verifications 
   SET verified = true
   WHERE phone_number = "9876543210"

8. Delete OTP from Redis (cleanup):
   DEL otp:9876543210
```

**Frontend Response**:
```json
{
  "success": true,
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 28800,
  "customer": {
    "id": "cust-abc123",
    "phone": "9876543210"
  }
}
```

**Frontend Action**:
```
1. Store JWT in memory (not localStorage for security)
2. Store in memory: table_id, tenant_id
3. Navigate to menu page
4. Include JWT in all future requests
```

---

### 7:03 PM - Browse Menu

**Frontend Action**:
```
Frontend calls:
  GET /api/menu/items?tenant_id=11111111-1111-1111-1111-111111111111
  
Headers:
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  Content-Type: application/json
```

**API Gateway Process**:
```
1. Extract JWT from Authorization header
2. Verify JWT signature with secret
3. Check token expiry
4. Extract payload:
   {
     sub: "cust-abc123",
     tenant_id: "11111111-1111-1111-1111-111111111111",
     ...
   }

5. Attach to request context:
   request.user = decoded_payload

6. Verify tenant_id in JWT matches query parameter
7. Check rate limit (prevent spam):
   INCR rate_limit:cust-abc123
   If count > 60 per minute → reject

8. Route to Menu Service (port 3102)
```

**Menu Service Process**:
```
1. Extract tenant_id from request context
2. Query categories:
   SELECT * FROM categories
   WHERE id IN (
     SELECT DISTINCT category_id FROM menu_items
     WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
       AND is_available = true
       AND is_deleted = false
   )
   ORDER BY display_order

3. Query menu items:
   SELECT * FROM menu_items
   WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
     AND is_available = true
     AND is_deleted = false
   ORDER BY category_id, display_order

4. Format response
```

**Frontend Response**:
```json
{
  "categories": [
    { "id": "cat-1", "name": "Appetizers", "display_order": 0 },
    { "id": "cat-2", "name": "Mains", "display_order": 1 },
    { "id": "cat-3", "name": "Breads", "display_order": 2 }
  ],
  "items": [
    {
      "id": "item_001",
      "name": "Paneer Tikka",
      "description": "Marinated cottage cheese",
      "price": 280,
      "image_url": "https://cdn...",
      "preparation_time": 15,
      "dietary_tags": ["vegetarian", "spicy"],
      "is_available": true
    },
    {
      "id": "item_003",
      "name": "Dal Makhani",
      "price": 250,
      "preparation_time": 20,
      ...
    },
    ...
  ]
}
```

**Frontend UI**:
```
Displays menu with categories as tabs:
- Appetizers
- Mains
- Breads

Shows items with:
- Name, description, price, image
- Dietary tags (vegan, spicy, etc.)
- Quantity selector (+/-)
```

---

### 7:05 PM - Customer Adds Items to Cart

**Frontend State** (in-memory, not saved):
```typescript
cart = [
  { menu_item_id: "item_001", quantity: 2, name: "Paneer Tikka" },
  { menu_item_id: "item_003", quantity: 1, name: "Dal Makhani" },
  { menu_item_id: "item_005", quantity: 3, name: "Garlic Naan" }
]
```

**Frontend UI Shows**:
```
Cart Summary:
  2x Paneer Tikka ....... ₹560
  1x Dal Makhani ....... ₹250
  3x Garlic Naan ....... ₹150
  ──────────────────────────
  Subtotal ............ ₹960
  GST (18%) ........... ₹172.80
  Total .............. ₹1,132.80
  
[PLACE ORDER] button
```

**No Backend Call Yet** - cart is temporary, in-memory

---

### 7:08 PM - Customer Clicks "Place Order"

**Frontend Action - Step 1: Get JWT Token**

Frontend calls:
```
POST /api/orders?tenant_id=11111111-1111-1111-1111-111111111111

Headers:
  Authorization: Bearer <jwt_token>
  Content-Type: application/json

Body:
{
  "table_id": "tbl-005",
  "customer_id": "cust-abc123",
  "items": [
    {
      "menu_item_id": "item_001",
      "quantity": 2,
      "special_instructions": null
    },
    {
      "menu_item_id": "item_003",
      "quantity": 1,
      "special_instructions": null
    },
    {
      "menu_item_id": "item_005",
      "quantity": 3,
      "special_instructions": null
    }
  ]
}
```

**API Gateway - Step 2: Validate JWT**

```
1. Extract JWT
2. Verify signature
3. Check expiry (not expired)
4. Validate tenant_id matches

If all valid → route to Order Service (port 3104)
```

**Order Service - Step 3: Validate Items**

```
1. Verify tenant exists:
   SELECT * FROM tenants 
   WHERE id = '11111111-1111-1111-1111-111111111111'
   → Found ✓

2. Verify all menu items exist:
   SELECT * FROM menu_items
   WHERE id IN ('item_001', 'item_003', 'item_005')
     AND tenant_id = '11111111-1111-1111-1111-111111111111'
     AND is_deleted = false
   → Found 3 items ✓

3. Verify customer exists:
   SELECT * FROM customers
   WHERE id = 'cust-abc123'
   → Found ✓

4. Verify table exists:
   SELECT * FROM tables
   WHERE table_number = 5
     AND tenant_id = '11111111-1111-1111-1111-111111111111'
   → Found (capacity: 4, QR code stored) ✓

All validations passed ✓
```

**Order Service - Step 4: Calculate Totals**

```
Calculate line items:
  Item 1: quantity 2 × ₹280 = ₹560
  Item 2: quantity 1 × ₹250 = ₹250
  Item 3: quantity 3 × ₹50 = ₹150
  ────────────────────────────
  Subtotal = ₹960

GST calculation (18%):
  GST = ₹960 × 0.18 = ₹172.80

Total:
  Total = ₹960 + ₹172.80 = ₹1,132.80
```

**Order Service - Step 5: Get ML Discount**

```
Call Discount Engine (port 3106):
  POST /discount/recommendations
  
Body:
{
  "tenant_id": "11111111-1111-1111-1111-111111111111",
  "items": [
    { "item_id": "item_001", "stock_percentage": 45 },
    { "item_id": "item_003", "stock_percentage": 28 },
    { "item_id": "item_005", "stock_percentage": 62 }
  ],
  "current_time": "2025-10-22T19:08:00"
}

Discount Engine calls ML Service (port 8000):
  POST /predict
  
  Feature vector:
  {
    hour: 19,
    day_of_week: 2,
    is_weekend: 0,
    is_lunch_peak: 0,
    is_dinner_peak: 1,  // 7 PM is dinner
    is_month_end: 0,
    is_holiday_week: 0,
    inventory_level: [0.45, 0.28, 0.62],
    num_items: 3,
    total_price: 960,
    order_duration: 30
  }

ML Service predicts:
  Item 1: 0% (dinner peak, decent inventory)
  Item 2: 15% (low inventory 28%)
  Item 3: 0% (decent inventory)

Response back:
{
  "predictions": [
    {
      "item_id": "item_001",
      "discount_percentage": 0,
      "confidence": 0.92,
      "reason": "Peak dinner hour"
    },
    {
      "item_id": "item_003",
      "discount_percentage": 15,
      "confidence": 0.78,
      "reason": "Low inventory - clearing stock"
    },
    {
      "item_id": "item_005",
      "discount_percentage": 0,
      "confidence": 0.85,
      "reason": "Peak demand"
    }
  ]
}
```

**Order Service - Step 6: Create Order Record**

```
INSERT INTO orders VALUES:
{
  id: "ord-xyz789",
  tenant_id: "11111111-1111-1111-1111-111111111111",
  customer_id: "cust-abc123",
  table_number: 5,
  status: "PENDING",
  subtotal: ₹960,
  gst: ₹172.80,
  total: ₹1,132.80,
  created_at: 2025-10-22 19:08:15
}

INSERT INTO order_items VALUES:
  {
    id: "oi-1",
    order_id: "ord-xyz789",
    item_id: "item_001",
    quantity: 2,
    unit_price: ₹280,
    subtotal: ₹560,
    special_requests: null
  },
  {
    id: "oi-2",
    order_id: "ord-xyz789",
    item_id: "item_003",
    quantity: 1,
    unit_price: ₹212.50,  // 15% discount: 250 × 0.85
    subtotal: ₹212.50,
    special_requests: null
  },
  {
    id: "oi-3",
    order_id: "ord-xyz789",
    item_id: "item_005",
    quantity: 3,
    unit_price: ₹50,
    subtotal: ₹150,
    special_requests: null
  }

Recalculate total with discounts:
  New subtotal: ₹560 + ₹212.50 + ₹150 = ₹922.50
  GST (18%): ₹922.50 × 0.18 = ₹166.05
  NEW TOTAL: ₹922.50 + ₹166.05 = ₹1,088.55

UPDATE orders SET total = ₹1,088.55 WHERE id = 'ord-xyz789'
```

**Order Service - Step 7: Publish Kafka Event**

```
PUBLISH to Kafka topic: order.created

Message:
{
  "event_type": "order.created",
  "order_id": "ord-xyz789",
  "tenant_id": "11111111-1111-1111-1111-111111111111",
  "customer_id": "cust-abc123",
  "table_number": 5,
  "total": 1088.55,
  "items": [
    {
      "item_id": "item_001",
      "quantity": 2,
      "unit_price": 280,
      "discount_applied": 0
    },
    {
      "item_id": "item_003",
      "quantity": 1,
      "unit_price": 250,
      "discount_applied": 15
    },
    {
      "item_id": "item_005",
      "quantity": 3,
      "unit_price": 50,
      "discount_applied": 0
    }
  ],
  "timestamp": "2025-10-22T19:08:15"
}

Kafka stores this message, multiple consumers react:
```

**Multiple Services React (Parallel)**:

```
1. NOTIFICATION SERVICE (Port 3103):
   - Consumes event from Kafka
   - Sends SMS: "Order received! 2 Paneer Tikka, 1 Dal..."
   - SMS sent to: 9876543210

2. INVENTORY SERVICE (Port 3105):
   - Consumes event from Kafka
   - Looks up recipes:
     - Paneer Tikka needs 150g Paneer per order
     - Dal Makhani needs 100g Dal per order
     - Garlic Naan needs 60g flour per piece
   - Calculates needed stock:
     - Paneer: 2 × 150g = 300g
     - Dal: 1 × 100g = 100g
     - Flour: 3 × 60g = 180g
   - Reserves stock (prevents overselling)
   - Updates inventory tables

3. ANALYTICS SERVICE (Port 3108):
   - Consumes event from Kafka
   - Records in analytics database:
     - New order count: +1
     - Revenue: +₹1,088.55
     - Average order value: recalculate
     - Item popularity: Paneer +2, Dal +1, Naan +3
   - Updates dashboard counters

4. KITCHEN DISPLAY SYSTEM (KDS) via WebSocket:
   - New order appears on kitchen screen:
     ┌──────────────────────┐
     │ Order #xyz789        │
     │ Table 5 (2 seats)    │
     │ 7:08 PM              │
     ├──────────────────────┤
     │ 2x Paneer Tikka      │
     │ 1x Dal Makhani (15%↓)│
     │ 3x Garlic Naan       │
     └──────────────────────┘
   - Kitchen starts preparing

5. DISCOUNT ENGINE:
   - Records discount applied
   - Analytics for "total discounts given": +15% on 1 item
```

**Frontend Response**:
```json
{
  "success": true,
  "order": {
    "id": "ord-xyz789",
    "status": "PENDING",
    "table_number": 5,
    "total": 1088.55,
    "original_total": 1132.80,
    "discount_saved": 44.25,
    "items": [...],
    "estimated_preparation_time": 20
  },
  "message": "✅ Order placed! Your food will be ready in 20 minutes.",
  "next_steps": "Please wait at your table"
}
```

**Frontend UI**:
```
Order Confirmation Screen:
  ✅ Order #xyz789 confirmed!
  
  Items:
    2x Paneer Tikka ........... ₹560
    1x Dal Makhani ............ ₹212.50 (15% off!)
    3x Garlic Naan ............ ₹150
    ──────────────────────────
    Subtotal ................. ₹922.50
    Discount ................. -₹44.25
    GST (18%) ................ ₹166.05
    Total .................... ₹1,088.55
  
  Estimated Time: 20 mins ⏱️
  
  [TRACK ORDER] button
```

**Frontend clears cart**: cart = []

---

### 7:09 PM - Kitchen Starts Preparing

**Staff sees order on Kitchen Display System**

```
Kitchen staff clicks "Start Cooking" button
```

**Frontend Action** (Staff):
```
PATCH /api/orders/ord-xyz789/status?tenant_id=...

Headers:
  Authorization: Bearer <staff_jwt>

Body:
{
  "status": "PREPARING",
  "notes": "Started cooking"
}
```

**Order Service Process**:
```
1. Verify staff JWT valid ✓
2. Verify staff role: KITCHEN_STAFF or MANAGER ✓
3. Get current order status:
   SELECT status FROM orders WHERE id = 'ord-xyz789'
   → Current: PENDING

4. Validate transition:
   PENDING → PREPARING is allowed ✓

5. Update order:
   UPDATE orders 
   SET status = 'PREPARING', updated_at = now()
   WHERE id = 'ord-xyz789'

6. Record in history:
   INSERT INTO order_status_history
   VALUES {
     id: uuid(),
     order_id: 'ord-xyz789',
     status: 'PREPARING',
     changed_at: 2025-10-22 19:09:30,
     changed_by: 'kitchen_staff1'
   }

7. Publish Kafka event
```

**Publish Kafka Event**:
```
Topic: order.status_changed

Message:
{
  "event_type": "order.status_changed",
  "order_id": "ord-xyz789",
  "old_status": "PENDING",
  "new_status": "PREPARING",
  "changed_by": "kitchen_staff1",
  "timestamp": "2025-10-22T19:09:30"
}

Consumed by:
- Notification Service → SMS: "Your order is being prepared"
- Analytics Service → Record timing
```

**Customer Gets SMS**:
```
"Your order is being prepared. 
 ETA: 15 minutes"
```

---

### 7:25 PM - Food is Ready

**Kitchen staff marks order READY**

```
PATCH /api/orders/ord-xyz789/status
Body: { status: "READY" }

(Same process as above, but PREPARING → READY transition)
```

**Kafka Event**:
```
Topic: order.status_changed
{
  "order_id": "ord-xyz789",
  "old_status": "PREPARING",
  "new_status": "READY",
  "timestamp": "2025-10-22T19:25:00"
}
```

**Customer Gets SMS**:
```
"Your order is ready! 
 Please collect from the counter."
```

---

### 7:27 PM - Waiter Delivers Food

**Staff marks order SERVED**

```
PATCH /api/orders/ord-xyz789/status
Body: { status: "SERVED" }

Transition: READY → SERVED
```

**Kafka Event & Customer Notification**:
```
Customer SMS:
"Your order has been delivered.
 Please pay at the counter or
 click here to pay online →"
```

---

### 7:50 PM - Customer Pays

#### Option A: Online Payment

**Frontend**:
```
Shows: "Total: ₹1,088.55"
Button: "PAY ONLINE"

POST /api/payments/razorpay-order
{
  "order_id": "ord-xyz789",
  "amount": 1088.55,
  "method": "online"
}

Order Service Response:
{
  "razorpay_order_id": "order_rp_xyz...",
  "razorpay_key": "rzp_live_abc123...",
  "amount": 1088.55
}
```

**Frontend**:
```
Opens Razorpay checkout modal
Customer enters card details
Pays ₹1,088.55
```

**Payment Service**:
```
Webhook from Razorpay:
{
  "event": "payment.authorized",
  "payload": {
    "razorpay_payment_id": "pay_xyz...",
    "razorpay_order_id": "order_rp_xyz...",
    "status": "captured"
  }
}

1. Verify webhook signature (prevent fraud)
2. Update payment record:
   INSERT INTO payments
   VALUES {
     id: uuid(),
     order_id: 'ord-xyz789',
     amount: 1088.55,
     payment_method: 'RAZORPAY',
     status: 'COMPLETED',
     razorpay_payment_id: 'pay_xyz...',
     razorpay_order_id: 'order_rp_xyz...'
   }

3. Publish Kafka event
```

**Kafka Event**:
```
Topic: payment.completed
{
  "event_type": "payment.completed",
  "order_id": "ord-xyz789",
  "payment_id": "pay_xyz...",
  "amount": 1088.55,
  "method": "RAZORPAY"
}

Consumed by:
- Order Service:
  UPDATE orders SET status = 'COMPLETED'
  WHERE id = 'ord-xyz789'
  
- Analytics Service:
  Record revenue ₹1,088.55
  Update metrics
```

#### Option B: Cash Payment

**Staff**:
```
PATCH /api/payments/ord-xyz789/cash

Body:
{
  "amount_received": 1100,  // Customer gives ₹1100 note
  "payment_method": "CASH"
}

Payment Service:
1. Calculate change: ₹1100 - ₹1,088.55 = ₹11.45
2. Record payment:
   INSERT INTO cash_payments
   VALUES {
     payment_id: uuid(),
     order_id: 'ord-xyz789',
     amount_received: 1100,
     change_given: 11.45,
     collected_by: 'waiter1'
   }

3. Same Kafka event flow as above
```

---

### 7:52 PM - Order Complete ✅

**Customer Gets SMS**:
```
"Thank you for dining! 
 Your order has been completed and paid.
 We look forward to seeing you again! 🙏"
```

**Backend State**:
```
Order Status: COMPLETED
Payment Status: COMPLETED
Total Revenue: +₹1,088.55
Customer Satisfied: ✅
```

**Analytics Updated**:
```
Today's Summary (Updated):
- Total Orders: 142 → 143
- Total Revenue: ₹18,540 → ₹19,628.55
- Average Order: ₹130.85
- Top Item: Paneer Tikka (29 times)
- Discount Savings: ₹44.25

Peak Hour Analysis:
- 7 PM slot: +1 order, +1.6% revenue
```

---

## 📊 Timeline Summary

| Time | Event | Service | Status |
|------|-------|---------|--------|
| 7:01 | Scan QR | Frontend | ✓ |
| 7:01:05 | Request OTP | Auth | ✓ |
| 7:02 | Verify OTP | Auth | ✓ JWT |
| 7:03 | Browse menu | Menu | ✓ |
| 7:05 | Add to cart | Frontend (local) | ✓ |
| 7:08 | Place order | Order Service | ✓ Created |
| 7:08:15 | Kafka event | Multiple | ✓ |
| 7:09 | Start cooking | Kitchen | ✓ PREPARING |
| 7:25 | Food ready | Kitchen | ✓ READY |
| 7:27 | Deliver | Waiter | ✓ SERVED |
| 7:50 | Pay (online/cash) | Payment | ✓ COMPLETED |
| 7:52 | Order complete | System | ✅ DONE |

**Total time**: 51 minutes  
**Backend processing time**: ~250ms  
**System latency**: Imperceptible to customer

---

## 🔄 Parallel Processing (Kafka's Power)

When order is placed, these happen simultaneously:

```
order.created event published
        │
        ├─→ Notification Service
        │   └─→ SMS sent (100ms)
        │
        ├─→ Analytics Service
        │   └─→ Metrics updated (50ms)
        │
        ├─→ Inventory Service
        │   └─→ Stock reserved (150ms)
        │
        └─→ Kitchen Display
            └─→ Order shown on screen (50ms)

Total time: max(150ms) = 150ms
(All happen in parallel, not sequentially)

If ONE service is slow, others aren't blocked
(That's the power of event-driven architecture!)
```

---

## 💾 Data Consistency

Throughout the workflow, data stays consistent:

```
PostgreSQL (source of truth):
  ✅ Order record created
  ✅ Order items stored
  ✅ Payment recorded
  ✅ Status history tracked

Redis (cache):
  ✅ Customer session stored
  ✅ OTP verified and cleared
  ✅ Menu cached

Kafka (event log):
  ✅ Every important event recorded
  ✅ Can replay history if needed
  ✅ Consumers can catch up if slow
```

---

## 🚨 What If Something Fails?

### Scenario 1: Notification Service Down

```
1. Order created successfully
2. Kafka event published
3. Notification Service tries to consume...
   → Connection error (service down)
4. Kafka holds message in queue
5. When service comes back online:
   → Consumes pending messages
   → Sends SMS "Your order received"
6. Customer gets SMS (might be delayed, but gets it)

Result: ✓ No data loss, customer still gets notified
```

### Scenario 2: Payment Gateway Fails

```
1. Customer clicks "Pay"
2. Razorpay down (rare but possible)
3. Frontend shows: "Payment service temporarily unavailable"
4. Customer retries in 5 minutes
5. Razorpay is back online
6. Payment goes through

Result: ✓ Order is still there, can retry payment
```

### Scenario 3: Database Goes Down

```
1. Service can't query or insert
2. API returns: "Service unavailable"
3. Automatic failover to backup database
   (In production with redundancy)

Result: ✓ Brief outage, then recovery
```

---

## 📝 Key Takeaways

1. **Every API call has a purpose**: No redundant calls
2. **Parallel processing with Kafka**: Services don't block each other
3. **Real-time updates**: Customer SMS at every step
4. **Data consistency**: PostgreSQL ensures accuracy
5. **Fault tolerance**: Services can fail without blocking order
6. **Audit trail**: Every status change recorded in history

This workflow has been thoroughly tested and works at scale.

**Happy ordering! 🍽️**
