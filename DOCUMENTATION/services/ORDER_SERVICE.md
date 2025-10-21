# Order Service - Complete Guide

**Port**: 3104  
**Language**: TypeScript (NestJS)  
**Database**: PostgreSQL  
**Responsibility**: Creating, tracking, and managing orders from placement to completion

---

## What Order Service Does

The Order Service is the **heart of Intellidine**. It handles everything related to orders:

- ✅ Create new orders (validate items, calculate totals)
- ✅ Track order status through lifecycle (PENDING → COMPLETED)
- ✅ Store order items with prices captured at order time
- ✅ Handle order modifications (add/remove items)
- ✅ Cancel orders with refund logic
- ✅ Calculate GST (18% for India)
- ✅ Publish events to Kafka (order.created, order.status_changed)

---

## Order Lifecycle

### The 7 States of an Order

```
PENDING
  ↓ (Kitchen starts cooking)
PREPARING
  ↓ (Kitchen finishes)
READY
  ↓ (Waiter delivers to table)
SERVED
  ↓ (Customer pays)
COMPLETED ✅

Alternative path:
CANCELLED (can happen from any state)
```

### State Machine Rules

```typescript
// Only these transitions are allowed:
PENDING → PREPARING (kitchen starts)
PENDING → CANCELLED (order cancelled before cooking)

PREPARING → READY (cooking done)
PREPARING → CANCELLED (realized made mistake)

READY → SERVED (delivered to customer)
READY → CANCELLED (extreme cases only)

SERVED → COMPLETED (payment received)
SERVED → CANCELLED (very rare, might refund)

COMPLETED → (can't change - order done)
CANCELLED → (can't change - order done)
```

---

## Creating an Order

### Step 1: Frontend sends cart items

```typescript
POST /api/orders?tenant_id=11111111-1111-1111-1111-111111111111

Headers:
  Authorization: Bearer <jwt_token>
  Content-Type: application/json

Body: {
  table_id: "tbl-001",
  customer_id: "cust-12345",  // Optional (walk-in if not provided)
  items: [
    {
      menu_item_id: "item_001",
      quantity: 2,
      special_instructions: "Extra spice",
      price_at_order: 280  // Optional (use current price if not provided)
    },
    {
      menu_item_id: "item_005",
      quantity: 1,
      special_instructions: "No onions"
    }
  ]
}
```

### Step 2: Order Service validates

```typescript
// 1. Verify tenant exists
const tenant = await db.tenant.findUnique({ id: tenant_id });
if (!tenant) throw new BadRequestException("Invalid tenant");

// 2. Verify all menu items exist
const items = await db.menuItem.findMany({
  where: {
    id: { in: dto.items.map(i => i.menu_item_id) },
    tenant_id: tenant_id,
    is_deleted: false
  }
});
if (items.length !== dto.items.length) {
  throw new BadRequestException("One or more items not found");
}

// 3. Verify customer exists (or create walk-in)
if (!customer_id) {
  const walkIn = await db.customer.create({
    data: {
      phone_number: `walk-in-${Date.now()}`,
      name: "Walk-in Customer"
    }
  });
  customer_id = walkIn.id;
}
```

### Step 3: Calculate totals

```typescript
// Calculate subtotal (item price × quantity)
let subtotal = 0;
for (const item of items) {
  const itemPrice = item.price_at_order || menuItem.price;
  const itemTotal = itemPrice * item.quantity;
  subtotal += itemTotal;
}

// Apply GST (18% for India)
const gst = subtotal * 0.18;
const total = subtotal + gst;

// Example:
// Items: 2×₹280 (Paneer) + 1×₹50 (Naan) = ₹610
// GST (18%): ₹109.80
// Total: ₹719.80
```

### Step 4: Get ML discount recommendation

```typescript
// Call Discount Engine for dynamic pricing
const discountResponse = await discountEngine.getDiscounts({
  items: dto.items,
  tenant_id: tenant_id,
  current_time: new Date()
});

// Response includes discount % for each item
// Example: item_001 gets 15% discount (₹280 → ₹238)
```

### Step 5: Create order record

```typescript
const order = await db.order.create({
  data: {
    id: uuid(),  // Generate order ID
    tenant_id: tenant_id,
    table_number: parseInt(dto.table_id),
    customer_id: customer_id,
    status: "PENDING",  // Starting status
    subtotal: new Decimal(subtotal),
    gst: new Decimal(gst),
    total: new Decimal(total),
    created_at: new Date(),
    items: {
      create: items.map(item => ({
        item_id: item.menu_item_id,
        quantity: item.quantity,
        unit_price: item.price_at_order,
        subtotal: item.price_at_order * item.quantity,
        special_requests: item.special_instructions
      }))
    }
  },
  include: { items: true }
});
```

### Step 6: Publish Kafka event

```typescript
await kafkaProducer.send({
  topic: "order.created",
  messages: [{
    key: order.id,
    value: JSON.stringify({
      event_type: "order.created",
      order_id: order.id,
      tenant_id: tenant_id,
      table_number: order.table_number,
      items: order.items,
      total: order.total,
      timestamp: new Date()
    })
  }]
});

// Multiple systems react to this event:
// - Notification Service: Send SMS
// - Analytics Service: Record sale
// - Inventory Service: Reserve stock
// - Kitchen Display: Show order
```

### Step 7: Return response

```typescript
Response: {
  id: "ord-98765",
  tenant_id: "11111111-1111-1111-1111-111111111111",
  customer_id: "cust-12345",
  table_number: 1,
  status: "PENDING",
  subtotal: 610.00,
  gst: 109.80,
  total: 719.80,
  items: [
    {
      id: "oi-001",
      item_id: "item_001",
      quantity: 2,
      unit_price: 280.00,
      subtotal: 560.00,
      special_requests: "Extra spice"
    },
    {
      id: "oi-002",
      item_id: "item_005",
      quantity: 1,
      unit_price: 50.00,
      subtotal: 50.00,
      special_requests: "No onions"
    }
  ],
  created_at: "2025-10-22T19:45:30Z",
  updated_at: "2025-10-22T19:45:30Z"
}
```

---

## Getting Order Details

### Endpoint: Get Single Order

```typescript
GET /api/orders/{order_id}?tenant_id=11111111-1111-1111-1111-111111111111

Headers:
  Authorization: Bearer <jwt_token>

Response:
{
  id: "ord-98765",
  status: "PREPARING",  // Current status
  total: 719.80,
  items: [...],
  created_at: "...",
  updated_at: "...",
  status_history: [
    { status: "PENDING", changed_at: "2025-10-22T19:45:30Z" },
    { status: "PREPARING", changed_at: "2025-10-22T19:45:45Z" }
  ]
}
```

### Endpoint: List Orders

```typescript
GET /api/orders?tenant_id=...&status=PENDING&page=1&limit=20

Query parameters:
  - status: Filter by status (PENDING, PREPARING, READY, SERVED, COMPLETED)
  - page: Pagination page number
  - limit: Items per page
  - from_date: Filter orders created after date
  - to_date: Filter orders created before date

Response:
{
  data: [
    { id, status, total, table_number, ... },
    { id, status, total, table_number, ... }
  ],
  pagination: {
    page: 1,
    limit: 20,
    total: 142,
    total_pages: 8
  }
}
```

---

## Updating Order Status

### Staff marks order as "Preparing"

```typescript
PATCH /api/orders/{order_id}/status?tenant_id=...

Headers:
  Authorization: Bearer <staff_jwt>
  Content-Type: application/json

Body: {
  status: "PREPARING",
  notes: "Started cooking"  // Optional
}

Authentication required:
  - User must be staff (MANAGER or KITCHEN_STAFF)
  - Tenant ID in JWT must match query param
  - User must have permission to update orders

Backend validation:
  - Current status must allow transition to new status
  - Example: Can't go from COMPLETED → PREPARING

Response:
{
  id: "ord-98765",
  status: "PREPARING",
  status_history: [
    { status: "PENDING", changed_at: "..." },
    { status: "PREPARING", changed_at: "..." }
  ]
}
```

### Workflow: Complete Status Transitions

```
7:30 PM - Customer places order
  Status: PENDING
  Kitchen sees order on screen

7:35 PM - Kitchen starts cooking
  Staff clicks "Start Cooking"
  Status: PENDING → PREPARING
  Kafka event: order.status_changed
  Customer SMS: "Order being prepared"

7:50 PM - Kitchen finishes
  Staff clicks "Ready"
  Status: PREPARING → READY
  Kafka event: order.status_changed
  Customer SMS: "Order ready! Come get it"

7:52 PM - Waiter delivers
  Staff clicks "Serve"
  Status: READY → SERVED
  Kafka event: order.status_changed
  Shows: "Please pay at counter" or payment link

8:00 PM - Payment received
  Staff confirms payment
  Status: SERVED → COMPLETED
  Kafka event: order.status_changed
  Customer SMS: "Thank you!"
  Analytics: Order finalized
```

---

## Cancelling Orders

### Cancel Before Preparation

```typescript
PATCH /api/orders/{order_id}/cancel?tenant_id=...

Body: {
  reason: "Customer requested"
}

Scenarios:
  1. Customer changes mind (2 min after ordering)
     - Status: PENDING → CANCELLED ✓ (easy)
  
  2. Kitchen hasn't started yet
     - Status: PENDING → CANCELLED ✓ (easy)
  
  3. Kitchen just started (1 min into preparation)
     - Status: PREPARING (with <2 min elapsed)
     - Can still cancel, might waste some ingredients

  4. Order is READY (plated)
     - Status: READY → CANCELLED (hard)
     - Food needs to be discarded
     - Might offer as complimentary sample
```

### Refund Logic

```typescript
if (cancellation_reason === "restaurant_error") {
  // Restaurant's fault - full refund
  refund_amount = order.total;
} else if (order.status === "PENDING") {
  // Not started - full refund
  refund_amount = order.total;
} else if (order.status === "PREPARING") {
  // Started - 50% refund (partial ingredients used)
  refund_amount = order.total * 0.5;
} else if (order.status === "READY" || order.status === "SERVED") {
  // Already prepared - no refund (offer as sample)
  refund_amount = 0;
}
```

---

## Order Items

### Order Item Structure

```typescript
OrderItem {
  id: string
  order_id: string
  item_id: string               // Link to MenuItem
  quantity: number              // How many
  unit_price: Decimal          // Price per item (captured at order time)
  subtotal: Decimal            // unit_price × quantity
  special_requests: string     // "Extra spice", "No onions", etc.
}
```

### Modifying Items (Add/Remove)

```typescript
// Add item to existing order
POST /api/orders/{order_id}/items

Body: {
  menu_item_id: "item_005",
  quantity: 1,
  special_instructions: "Butter on side"
}

Validation:
  - Only allow if order status is PENDING or PREPARING
  - Don't allow modifications after READY (already plated)

Response:
  - Item added
  - Order total recalculated
  - Kitchen display updated
  - Customer notified

---

// Remove item from existing order
DELETE /api/orders/{order_id}/items/{item_id}

Validation:
  - Only if status PENDING or PREPARING
  - Item must exist in this order

Response:
  - Item removed
  - Total refunded
  - Kitchen display updated
```

---

## Database Schema

```typescript
model Order {
  id            String        @id @default(uuid())
  tenant_id     String
  customer_id   String
  table_number  Int
  status        OrderStatus   @default(PENDING)
  subtotal      Decimal       @db.Decimal(10, 2)  // Before GST
  gst           Decimal       @db.Decimal(10, 2)  // 18%
  total         Decimal       @db.Decimal(10, 2)  // After GST
  created_at    DateTime      @default(now())
  updated_at    DateTime      @updatedAt

  tenant            Tenant              @relation(fields: [tenant_id], references: [id])
  customer          Customer            @relation(fields: [customer_id], references: [id])
  items             OrderItem[]         // Items in this order
  status_history    OrderStatusHistory[] // Track all status changes
  payment           Payment?            // Payment for this order

  @@index([tenant_id, status, created_at])  // Fast queries
  @@map("orders")
}

enum OrderStatus {
  PENDING           // Just created
  PREPARING         // Kitchen cooking
  READY             // Done, waiting for pickup
  SERVED            // Delivered to table
  COMPLETED         // Paid and done
  CANCELLED         // Cancelled
  AWAITING_CASH_PAYMENT  // Waiting for cash payment
}

model OrderItem {
  id                String    @id @default(uuid())
  order_id          String
  item_id           String    // FK to MenuItem
  quantity          Int
  unit_price        Decimal   @db.Decimal(10, 2)  // Captured at order time
  subtotal          Decimal   @db.Decimal(10, 2)
  special_requests  String?

  order   Order     @relation(fields: [order_id], references: [id])
  item    MenuItem  @relation(fields: [item_id], references: [id])

  @@map("order_items")
}

model OrderStatusHistory {
  id          String      @id @default(uuid())
  order_id    String
  status      OrderStatus
  changed_at  DateTime    @default(now())
  changed_by  String?     // Staff user ID

  order Order @relation(fields: [order_id], references: [id])

  @@map("order_status_history")
}
```

---

## Kafka Events Published

### Event 1: order.created

```json
{
  "event_type": "order.created",
  "order_id": "ord-98765",
  "tenant_id": "11111111-1111-1111-1111-111111111111",
  "customer_id": "cust-12345",
  "table_number": 1,
  "total": 719.80,
  "items": [
    {
      "item_id": "item_001",
      "quantity": 2,
      "unit_price": 280.00,
      "special_requests": "Extra spice"
    }
  ],
  "timestamp": "2025-10-22T19:45:30Z"
}

Consumed by:
  - Notification Service (send SMS)
  - Analytics Service (record sale)
  - Inventory Service (reserve stock)
  - Kitchen Display System (show order)
```

### Event 2: order.status_changed

```json
{
  "event_type": "order.status_changed",
  "order_id": "ord-98765",
  "tenant_id": "11111111-1111-1111-1111-111111111111",
  "old_status": "PENDING",
  "new_status": "PREPARING",
  "changed_by": "kitchen_staff1",
  "timestamp": "2025-10-22T19:45:45Z"
}

Consumed by:
  - Notification Service (send SMS update)
  - Analytics Service (track timing)
  - Customer: Real-time status update
```

### Event 3: order.items_modified

```json
{
  "event_type": "order.items_modified",
  "order_id": "ord-98765",
  "action": "added",  // or "removed"
  "item_id": "item_005",
  "quantity": 1,
  "timestamp": "2025-10-22T19:48:00Z"
}

Consumed by:
  - Kitchen Display (update order)
  - Notification Service (notify customer)
  - Analytics Service
```

---

## Real-World Examples

### Example 1: Simple Order (2 items)

```
Customer: 2 Paneer Tikka + 1 Naan

Request:
POST /api/orders?tenant_id=111...
{
  "table_id": "tbl-001",
  "items": [
    { "menu_item_id": "item_001", "quantity": 2 },
    { "menu_item_id": "item_005", "quantity": 1 }
  ]
}

Calculation:
  Item 1: 2 × ₹280 = ₹560
  Item 2: 1 × ₹50 = ₹50
  Subtotal: ₹610
  GST (18%): ₹109.80
  Total: ₹719.80

Response:
  - Order created ✓
  - Order ID: ord-98765
  - Status: PENDING
  - SMS sent to customer ✓
  - Kitchen display updated ✓
```

### Example 2: Order with Special Requests

```
Customer: 1 Butter Chicken (Extra Spice, No Onions)

Request:
POST /api/orders?tenant_id=111...
{
  "table_id": "tbl-002",
  "items": [
    {
      "menu_item_id": "item_004",
      "quantity": 1,
      "special_instructions": "Extra spice, no onions"
    }
  ]
}

Backend:
  - Menu item found ✓
  - Price: ₹380
  - No discount (peak hour)
  - Order created
  - Kitchen sees: "1x Butter Chicken - EXTRA SPICE, NO ONIONS"
```

### Example 3: Order Modification

```
Order placed: Table 5, 2 Paneer Tikka (pending)
Customer: "Can we add 1 Garlic Naan?"

Staff action:
POST /api/orders/ord-98765/items
{
  "menu_item_id": "item_005",
  "quantity": 1
}

Backend:
  - Item added to order
  - Old subtotal: ₹560 (2×₹280)
  - New subtotal: ₹560 + ₹50 = ₹610
  - Old total: ₹651.20
  - New total: ₹719.80
  - Kitchen display updated: "ITEM ADDED: 1x Garlic Naan"
  - Customer SMS: "Item added! New total: ₹719.80"
```

### Example 4: Order Cancellation

```
Scenario: Customer cancels order 2 minutes after placing

Request:
PATCH /api/orders/ord-98765/cancel
{ "reason": "Changed mind" }

Backend validation:
  - Order status: PENDING ✓
  - Less than 5 min old ✓
  - Can cancel

Action:
  - Status: PENDING → CANCELLED
  - Refund: Full ₹719.80 (nothing started)
  - Kitchen display: Order removed
  - Customer SMS: "Order cancelled. Refund processed."
  - Inventory: Stock unreserved
```

---

## API Endpoints Summary

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| `POST` | `/api/orders` | Create order | Customer/Staff |
| `GET` | `/api/orders/{id}` | Get order details | Customer/Staff |
| `GET` | `/api/orders` | List orders | Staff |
| `PATCH` | `/api/orders/{id}/status` | Update status | Staff |
| `PATCH` | `/api/orders/{id}/cancel` | Cancel order | Staff |
| `POST` | `/api/orders/{id}/items` | Add item | Staff |
| `DELETE` | `/api/orders/{id}/items/{item_id}` | Remove item | Staff |

---

## Common Issues & Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| "Menu item not found" | Item doesn't exist or deleted | Check item ID, ensure item is active |
| "Invalid table ID" | Table doesn't exist | Verify table number from QR code |
| "Cannot update status" | Invalid transition (e.g., COMPLETED → PREPARING) | Check state machine rules |
| "Discount not applied" | ML Service temporarily down | Orders still created at full price (safe default) |
| "Order creation slow" (>500ms) | Database slow or Kafka producer backup | Check DB connection, Kafka queue |

---

## Testing Order Service

### Test 1: Create Simple Order

```bash
curl -X POST http://localhost:3100/api/orders?tenant_id=11111111-1111-1111-1111-111111111111 \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "table_id": "tbl-001",
    "items": [
      { "menu_item_id": "item_001", "quantity": 2 }
    ]
  }'
```

### Test 2: Update Order Status

```bash
curl -X PATCH http://localhost:3100/api/orders/ord-123/status?tenant_id=11111111-1111-1111-1111-111111111111 \
  -H "Authorization: Bearer <staff_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "PREPARING"
  }'
```

### Test 3: Get Order

```bash
curl -X GET http://localhost:3100/api/orders/ord-123?tenant_id=11111111-1111-1111-1111-111111111111 \
  -H "Authorization: Bearer <jwt_token>"
```

---

## Performance Characteristics

- **Create order**: 150-200ms (includes validation, discount calculation, DB write)
- **Update status**: 80-120ms (simple update)
- **Get order**: 50-80ms (cache hit), 150-200ms (cold read)
- **List orders**: 200-300ms (depends on filters and page size)

---

**See Also**:
- [ORDERING_WORKFLOW.md](../workflows/ORDERING_WORKFLOW.md) - Complete customer journey
- [DATABASE.md](../DATABASE.md) - Schema relationships
- [KAFKA_EVENTS.md](../KAFKA_EVENTS.md) - Event structure
- [PAYMENT_SERVICE.md](./PAYMENT_SERVICE.md) - Payment integration
