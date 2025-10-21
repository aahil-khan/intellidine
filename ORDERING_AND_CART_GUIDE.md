# Ordering System & QR-Based Ordering Guide - Intellidine

## Overview

Intellidine uses a **QR code-based table ordering system** with **direct order creation** (no persistent shopping cart). Customers scan a QR code at their table, browse the menu, and place orders that are immediately sent to the kitchen.

**Architecture**: 
- 📱 QR codes link to table-specific ordering pages
- 🛒 Temporary session-based cart (in-memory, not persisted)
- 🎫 Orders created immediately (not drafted)
- 👥 Multi-user (customer + staff) ordering

---

## System Overview

### Key Components

| Component | Purpose | Port |
|-----------|---------|------|
| **Menu Service** | Browse menu items, categories | 3102 |
| **Order Service** | Create, update, cancel orders | 3104 |
| **Discount Engine** | Apply dynamic pricing, discounts | 3106 |
| **Inventory Service** | Track item stock levels | 3105 |
| **Frontend (React)** | QR code linking, menu UI, cart UI | 3000 |
| **API Gateway** | Route requests to services | 3100 |

### High-Level User Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Restaurant Table (QR Code)                    │
│                                                                  │
│    ┌──────────────────────────────────────────────────────┐    │
│    │  Scan QR → https://intellidine.app/table/TABLE-001  │    │
│    └──────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
          ┌───────────────────────────────────────┐
          │     Frontend (React, Port 3000)       │
          │                                       │
          │ 1. User identifies table from URL    │
          │ 2. Fetches menu items                │
          │ 3. Displays categories & items       │
          │ 4. Manages temporary cart in state   │
          └───────────────────────────────────────┘
                              │
                    ┌─────────┴──────────┐
                    │                    │
          ┌─────────▼─────────┐  ┌──────▼────────────┐
          │  Menu Service     │  │  Inventory Svc    │
          │  - List items     │  │  - Stock levels   │
          │  - Categories     │  │  - Availability   │
          └───────────────────┘  └───────────────────┘
                    ▲                    ▲
                    │                    │
          ┌─────────┴────────────────────┘
          │
          │ User adds items to cart & clicks "Place Order"
          │
          ▼
    ┌──────────────────────────┐
    │   Discount Engine (3106) │
    │                          │
    │ 1. Get items from cart   │
    │ 2. Call ML Service       │
    │ 3. Calculate discounts   │
    │ 4. Return final prices   │
    └──────────────┬───────────┘
                   │
                   ▼
    ┌──────────────────────────┐
    │   Order Service (3104)   │
    │                          │
    │ POST /api/orders         │
    │                          │
    │ 1. Validate items exist  │
    │ 2. Calculate totals      │
    │ 3. Create order record   │
    │ 4. Emit order.created    │
    │    Kafka event           │
    └──────────────┬───────────┘
                   │
    ┌──────────────┴──────────────────────┐
    │                                     │
    ▼                                     ▼
 Kitchen Display    ┌──────────────────────────┐
 System (KDS)       │  Kafka Order Event       │
                    │  Consumed by:            │
                    │  - Notification Service  │
                    │  - Analytics Service     │
                    │  - Inventory Service     │
                    └──────────────────────────┘
```

---

## QR Code System

### QR Code Generation

Each restaurant table gets a unique QR code linking to a URL pattern:

```
https://intellidine.app/table/{TABLE_ID}?tenant_id={TENANT_ID}

Example:
https://intellidine.app/table/tbl-001?tenant_id=11111111-1111-1111-1111-111111111111
```

### QR Code Storage

QR codes are:
1. **Generated** when tables are created via staff dashboard
2. **Stored** in the database (Table model)
3. **Printed** as physical stickers on table placemats
4. **Scanned** by customers using phone camera

### Table Model (Database)

```prisma
model Table {
  id           String   @id @default(uuid())
  tenant_id    String
  table_number Int          // Table 1, 2, 3, etc.
  capacity     Int          // Seats: 2, 4, 6, 8
  qr_code_url  String       // Generated QR code image URL
  created_at   DateTime @default(now())

  tenant Tenant  @relation(fields: [tenant_id], references: [id])
  orders Order[]

  @@unique([tenant_id, table_number])
}
```

### QR Code Data Flow

```
1. Staff creates table in dashboard
   └─> POST /api/tables/create
   └─> Body: { table_number: 1, capacity: 4, tenant_id: "..." }

2. Table Service generates QR code
   └─> Creates URL: /table/tbl-001
   └─> Calls QR library to generate image
   └─> Stores URL in table.qr_code_url

3. Staff prints QR code
   └─> Downloads image from /assets/qr/tbl-001.png
   └─> Prints on label/placard

4. Customer scans QR
   └─> Opens https://intellidine.app/table/tbl-001
   └─> Frontend extracts table_id from URL
   └─> Loads menu for that table's tenant
```

---

## No Persistent Cart Architecture

### Important: Why NO Persistent Shopping Cart?

**Traditional E-commerce**: 
- Carts persisted in database
- Users browse, abandon, come back later
- Sessions last hours/days

**Restaurant UX**:
- Session lasts 30-60 minutes (meal duration)
- All items ordered immediately
- Cart abandoned = table left
- No need for database persistence

### Cart Implementation (Frontend Only)

**Location**: React component state

```typescript
// Frontend cart management (React)
import { useState } from 'react';

export function OrderPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  
  const addToCart = (item: MenuItem) => {
    setCart([...cart, { 
      menu_item_id: item.id, 
      quantity: 1,
      price_at_order: item.price 
    }]);
  };
  
  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };
  
  const updateQuantity = (index: number, qty: number) => {
    const updated = [...cart];
    updated[index].quantity = qty;
    setCart(updated);
  };
  
  const placeOrder = async () => {
    // Send cart to backend
    const response = await fetch('/api/orders?tenant_id=...', {
      method: 'POST',
      body: JSON.stringify({
        table_id: tableId,
        customer_id: customerId,  // Optional
        items: cart  // Array of items from state
      })
    });
    
    // Order created immediately, cart cleared
    if (response.ok) {
      setCart([]);  // Clear cart
      showSuccess('Order placed!');
    }
  };
}
```

### Session Storage (Optional Enhancement)

For cases where customer needs to pause and resume:

```typescript
// Optional: Save cart to browser's sessionStorage
const saveCartToSession = () => {
  sessionStorage.setItem('intellidine_cart', JSON.stringify(cart));
};

const restoreCartFromSession = () => {
  const saved = sessionStorage.getItem('intellidine_cart');
  if (saved) setCart(JSON.parse(saved));
};

// This persists cart across page refreshes but NOT across devices/days
```

---

## Order Creation Flow

### Endpoint: Create Order

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
      price_at_order: 280  // Optional: use current menu price if not provided
    },
    {
      menu_item_id: "item_003",
      quantity: 1,
      special_instructions: "No onions"
    }
  ]
}
```

### Response: Order Created

```json
{
  "id": "ord-12345",
  "tenant_id": "11111111-1111-1111-1111-111111111111",
  "customer_id": "cust-12345",
  "table_number": 1,
  "status": "PENDING",
  "subtotal": 560.00,
  "gst": 100.80,
  "total": 660.80,
  "items": [
    {
      "id": "oi-001",
      "item_id": "item_001",
      "quantity": 2,
      "unit_price": 280.00,
      "subtotal": 560.00,
      "special_requests": "Extra spice"
    },
    {
      "id": "oi-002",
      "item_id": "item_003",
      "quantity": 1,
      "unit_price": 200.00,
      "subtotal": 200.00,
      "special_requests": "No onions"
    }
  ],
  "created_at": "2025-10-22T19:45:30Z",
  "updated_at": "2025-10-22T19:45:30Z"
}
```

---

## Order Processing Pipeline

### Step 1: Validation (Order Service)

```typescript
async createOrder(tenantId: string, dto: CreateOrderDto) {
  // 1. Verify tenant exists
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new BadRequestException('Invalid tenant');

  // 2. Verify all items exist in menu
  const items = await prisma.menuItem.findMany({
    where: {
      id: { in: dto.items.map(i => i.menu_item_id) },
      tenant_id: tenantId,
      is_deleted: false
    }
  });
  if (items.length !== dto.items.length) {
    throw new BadRequestException('One or more items not found');
  }

  // 3. Verify customer exists (or create walk-in)
  let customerId = dto.customer_id;
  if (!customerId) {
    const walkIn = await prisma.customer.create({
      data: {
        phone_number: `walk-in-${Date.now()}`,
        name: 'Walk-in Customer'
      }
    });
    customerId = walkIn.id;
  }

  // Continue...
}
```

### Step 2: Calculate Totals (Order Service)

```typescript
// Calculate subtotal
let subtotal = 0;
for (const item of dto.items) {
  const menuItem = itemMap.get(item.menu_item_id);
  const itemPrice = item.price_at_order || menuItem.price;
  const itemTotal = itemPrice * item.quantity;
  subtotal += itemTotal;
}

// Apply GST (18% for India)
const gst = subtotal * 0.18;
const total = subtotal + gst;
```

### Step 3: Apply Discounts (Discount Engine)

Before creating order, Discount Engine is called:

```typescript
// In Order Service, before saving to database
const discountResponse = await discountEngine.getDiscounts({
  items: dto.items,
  tenant_id: tenantId
});

// Update items with discount if applicable
const discountedItems = dto.items.map(item => ({
  ...item,
  applied_discount: discountResponse.get(item.menu_item_id)
}));

// Recalculate totals with discounts
```

### Step 4: Create Order Record (Database)

```typescript
const order = await prisma.order.create({
  data: {
    tenant_id: tenantId,
    table_number: parseInt(dto.table_id),
    customer_id: customerId,
    status: 'PENDING',
    subtotal: new Decimal(subtotal),
    gst: new Decimal(gst),
    total: new Decimal(total),
    items: {
      create: orderItems.map(item => ({
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

### Step 5: Emit Event (Kafka)

```typescript
// Publish to Kafka
await kafkaProducer.send({
  topic: 'order.created',
  messages: [{
    key: order.id,
    value: JSON.stringify({
      event_type: 'order.created',
      order_id: order.id,
      tenant_id: tenantId,
      items: order.items,
      timestamp: new Date()
    })
  }]
});
```

### Step 6: Downstream Consumers

**Kafka event consumed by**:

| Service | Action |
|---------|--------|
| **Notification Service** | Send order received SMS/notification |
| **Inventory Service** | Reserve stock, update availability |
| **Analytics Service** | Record order, update metrics |
| **Kitchen Display System** | Display order on screens |

---

## Cart Item Structure

### Frontend (React State)

```typescript
interface CartItem {
  menu_item_id: string;
  quantity: number;
  special_instructions?: string;
  price_at_order?: number;  // Captured at add time
}
```

### Order Request Format

```typescript
interface CreateOrderDto {
  table_id: string;
  customer_id?: string;  // Optional
  items: {
    menu_item_id: string;
    quantity: number;
    special_instructions?: string;
    price_at_order?: number;
  }[];
}
```

### Examples

**Example 1: Simple 2-item order**
```json
{
  "table_id": "tbl-001",
  "items": [
    { "menu_item_id": "item_001", "quantity": 2 },
    { "menu_item_id": "item_003", "quantity": 1 }
  ]
}
```

**Example 2: Order with special instructions**
```json
{
  "table_id": "tbl-002",
  "customer_id": "cust-789",
  "items": [
    {
      "menu_item_id": "item_004",
      "quantity": 1,
      "special_instructions": "Extra spice, no onions"
    },
    {
      "menu_item_id": "item_005",
      "quantity": 3,
      "special_instructions": "Butter on the side"
    }
  ]
}
```

---

## Multi-User Ordering Scenarios

### Scenario 1: Single Customer (Typical)

```
1. Customer scans QR at Table 1
2. Browses menu (no login required)
3. Adds items to cart
4. Places order
5. Order sent to kitchen
6. Kitchen starts preparing
```

### Scenario 2: Multiple Customers (Same Table)

```
1. Party of 4 at Table 2
2. Each person scans QR independently
3. Each adds items to SEPARATE carts (different browser sessions)
4. Each person places their own order
5. 4 separate orders created (tied to Table 2)
6. Kitchen receives 4 orders, same table

Note: Each browser tab = separate session = separate cart
```

### Scenario 3: Staff Creating Order (For Delivery/Takeout)

```
1. Staff scans QR from kiosk (not a table QR, a staff/pos QR)
2. Access ordering interface
3. Select customer (phone number lookup)
4. Add items
5. Choose "Takeout" option
6. Place order
7. Payment collected at counter
```

### Scenario 4: Staff Modifying Order (After Placement)

```
1. Order placed: Table 3, 2 Paneer Tikka
2. Customer asks: "Can you add 1 Naan?"
3. Staff opens order details
4. PATCH /api/orders/{id}/items
5. Add new item to order
6. Order updated, kitchen re-receives updated list
```

---

## Authentication & Authorization

### Customer (QR-based Ordering)

```
1. No login required (anonymous)
2. Table ID extracted from URL
3. Session tied to table ID + browser session
4. Automatic JWT created via guest token endpoint

Endpoint: POST /api/auth/guest
Response: { access_token, expires_in: 28800 }
```

### Staff (POS System)

```
1. Staff login required
2. Username: manager1 (or kitchen_staff1, waiter1)
3. Password: Password@123
4. JWT token returned
5. Full access to orders, items, customers

Endpoint: POST /api/auth/staff/login
Response: { access_token, expires_in: 28800 }
```

---

## Order Status Lifecycle

### State Machine

```
┌─────────┐
│ PENDING │  <- Order placed by customer
└────┬────┘
     │
     ▼
┌──────────────┐
│  PREPARING   │  <- Kitchen starts cooking
└────┬────────┘
     │
     ▼
┌───────┐
│ READY │  <- Plated, ready to serve
└───┬───┘
    │
    ▼
┌────────┐
│ SERVED │  <- Delivered to table
└───┬────┘
    │
    ▼
┌───────────┐
│ COMPLETED │  <- Payment received, order done
└───────────┘

Parallel: CANCELLED (from any state)
```

### Status Update Endpoint

```
PATCH /api/orders/{order_id}/status?tenant_id=...

Headers:
  Authorization: Bearer <staff_token>

Body: {
  status: "PREPARING",  // Must be valid transition
  notes: "5 mins estimated"  // Optional
}

Response: { id, status: "PREPARING", ... }
```

---

## Integration Points

### 1. Menu Service Integration

```typescript
// Frontend fetches menu
GET /api/menu/items?tenant_id=...&category=appetizer

Response: [
  {
    id: "item_001",
    name: "Paneer Tikka",
    price: 280,
    description: "Marinated cheese cubes",
    image_url: "...",
    is_available: true,
    preparation_time: 15
  },
  ...
]
```

### 2. Inventory Service Integration

```typescript
// Frontend checks stock before showing items
GET /api/inventory/status?tenant_id=...&items=[item_001,item_002]

Response: {
  item_001: { available: true, quantity: 45 },
  item_002: { available: false, quantity: 0 }
}
```

### 3. Discount Engine Integration

```typescript
// Before creating order, get ML discounts
POST /api/discount/recommendations

Body: {
  tenant_id: "...",
  items: [
    { item_id: "item_001", current_price: 280 }
  ]
}

Response: {
  item_001: {
    discount_percentage: 15,
    final_price: 238,
    reason: "Off-peak inventory clearing"
  }
}
```

---

## API Endpoints Summary

### Customer Endpoints (Guest/Anonymous)

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| `GET` | `/api/menu/items?tenant_id=...` | Browse menu | Guest |
| `GET` | `/api/menu/categories` | Get categories | Guest |
| `POST` | `/api/orders?tenant_id=...` | Create order | Guest |
| `GET` | `/api/orders/{id}?tenant_id=...` | View order status | Guest |

### Staff Endpoints

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| `POST` | `/api/auth/staff/login` | Staff login | None |
| `PATCH` | `/api/orders/{id}/status?tenant_id=...` | Update order | Manager+ |
| `PATCH` | `/api/orders/{id}/cancel?tenant_id=...` | Cancel order | Manager+ |
| `GET` | `/api/orders?tenant_id=...&status=PENDING` | List pending | Manager+ |

---

## Real-World Example: Placing an Order

### Complete User Journey

**User**: Priya at Table 5

```
1️⃣ Scans QR Code
   └─> URL: https://intellidine.app/table/tbl-005?tenant_id=11111111-1111-1111-1111-111111111111

2️⃣ Frontend loads
   └─> Extracts tenant_id & table_id from URL
   └─> Creates guest JWT token
   └─> Fetches menu categories

3️⃣ Priya browses menu
   └─> Sees: Appetizers, Mains, Breads, Desserts, Beverages
   └─> Clicks "Appetizers"
   └─> Menu Service returns 8 items (Paneer Tikka, Chicken Wings, etc.)

4️⃣ Adds items to cart
   ├─> Paneer Tikka × 2 (add to state)
   ├─> Garlic Naan × 3 (add to state)
   └─> Gulab Jamun × 1 (add to state)

5️⃣ Cart state (React):
   {
     items: [
       { menu_item_id: 'item_001', quantity: 2 },
       { menu_item_id: 'item_005', quantity: 3 },
       { menu_item_id: 'item_006', quantity: 1 }
     ]
   }

6️⃣ Clicks "Place Order"
   └─> Frontend calls Discount Engine for current discounts
   └─> Gets back: 15% off item_001 (low inventory)
   └─> Prepares request with discount-adjusted prices

7️⃣ Order Request Sent:
   POST /api/orders?tenant_id=11111111-1111-1111-1111-111111111111
   
   {
     "table_id": "tbl-005",
     "items": [
       {
         "menu_item_id": "item_001",
         "quantity": 2,
         "price_at_order": 238  // 280 - 15% discount
       },
       {
         "menu_item_id": "item_005",
         "quantity": 3,
         "price_at_order": 50
       },
       {
         "menu_item_id": "item_006",
         "quantity": 1,
         "price_at_order": 120
       }
     ]
   }

8️⃣ Order Service Processing:
   ├─> ✅ Validates tenant
   ├─> ✅ Validates items exist
   ├─> ✅ Calculates: Subtotal ₹896, GST ₹161.28, Total ₹1,057.28
   ├─> ✅ Creates order record (status: PENDING)
   └─> ✅ Emits Kafka event: order.created

9️⃣ Kafka Event Consumed:
   ├─> Notification Service: Sends order received SMS
   ├─> Inventory Service: Reserves ₹896 in stock
   ├─> Analytics Service: Records sale
   └─> Kitchen Display System: Shows order on screen

🔟 Frontend Response:
   {
     "id": "ord-98765",
     "table_number": 5,
     "status": "PENDING",
     "total": 1057.28,
     "estimated_prep_time": "18 mins",
     "message": "✅ Order placed! Your food will be ready in 18 minutes."
   }

   Cart cleared: []

1️⃣1️⃣ Kitchen prepares food
   └─> Mark items done one by one
   └─> Once all done, status → READY

1️⃣2️⃣ Waiter delivers to Table 5
   └─> PATCH /api/orders/ord-98765/status
   └─> { status: "SERVED" }

1️⃣3️⃣ Priya eats & pays
   └─> Payment processed
   └─> PATCH /api/orders/ord-98765/status
   └─> { status: "COMPLETED" }
```

---

## Common Use Cases

### Use Case 1: Customer Cancels Item Before Kitchen Starts

```
Order placed at 7:30 PM, status PENDING
Customer notices 2 minutes later: "Cancel the Garlic Naan"

Frontend: DELETE /api/orders/ord-98765/items/oi-002
Response: Item removed, total recalculated, kitchen NOT notified (not started yet)
```

### Use Case 2: Order Modifications Mid-Preparation

```
Order at 7:30 PM, status PENDING
At 7:35 PM, kitchen starts (status → PREPARING)
Customer: "Add 1 extra Naan please"

Staff tablet: 
  PATCH /api/orders/ord-98765/items
  { action: "add", menu_item_id: "item_005", quantity: 1 }

Result: New item appended, kitchen sees UPDATED order on screen
Total increased by ₹50
```

### Use Case 3: Wrong Item Prepared (Staff Cancels Order)

```
Order placed, kitchen prepares
Realization: Order had "No Onions" but prepared with onions
Staff cancels:

  PATCH /api/orders/ord-98765/status
  { status: "CANCELLED", notes: "Prepared incorrectly" }

Result:
  - Order marked CANCELLED
  - Inventory replenished
  - Customer refunded
  - New order created (corrected)
```

### Use Case 4: Takeout Order (No QR)

```
Customer calls: "I want to order 2 Butter Chicken"
Staff logs in as Waiter (username: waiter1, password: Password@123)
Staff creates order manually:

  POST /api/orders?tenant_id=...
  {
    "table_id": "takeout-counter",  // Not a table QR
    "customer_id": "cust-xxx",
    "items": [
      { "menu_item_id": "item_004", "quantity": 2 }
    ]
  }

Result: Order created for takeout
Kitchen prepares, staff packages, customer picks up
```

---

## Performance Optimization

### Caching Strategy

```typescript
// Menu items cached for 1 hour
GET /api/menu/items
Cache-Control: max-age=3600

// Inventory cached for 5 minutes (updates frequently)
GET /api/inventory/status
Cache-Control: max-age=300

// Cart NOT cached (always fresh from browser state)
```

### Database Indexes

```prisma
// Fast order lookups
@@index([tenant_id, status, created_at])

// Fast item availability checks
@@index([tenant_id, is_available, is_deleted])

// Fast inventory queries
@@index([tenant_id, quantity, reorder_level])
```

---

## Security Considerations

### 1. Table ID Isolation

- Table IDs are UUIDs (not sequential/guessable)
- Customer can only access their own table's menu
- No cross-table data leakage

### 2. Tenant Isolation

- All queries filtered by tenant_id
- Database enforces multi-tenancy at row level
- Staff cannot access other tenant's data

### 3. Guest Authentication

- Anonymous users get limited JWT (guest role)
- Can only create orders, view order status
- Cannot access admin functions

---

## Testing Order Creation

### Using Postman

```
1. Create Order
   POST http://localhost:3100/api/orders?tenant_id=11111111-1111-1111-1111-111111111111
   
   Headers:
     Authorization: Bearer <guest_token>
     Content-Type: application/json
   
   Body:
   {
     "table_id": "tbl-001",
     "items": [
       {
         "menu_item_id": "item_001",
         "quantity": 2
       }
     ]
   }

2. Get Order Status
   GET http://localhost:3100/api/orders/ord-12345?tenant_id=11111111-1111-1111-1111-111111111111
   
   Response shows: PENDING → PREPARING → READY → SERVED → COMPLETED

3. Update Status (Staff)
   PATCH http://localhost:3100/api/orders/ord-12345/status?tenant_id=11111111-1111-1111-1111-111111111111
   
   Headers:
     Authorization: Bearer <staff_token>
   
   Body:
   {
     "status": "PREPARING"
   }
```

---

## Summary

### Key Takeaways

✅ **QR-based ordering**: Scan code at table, immediate access to menu
✅ **No persistent cart**: Frontend state only (no database cart tables)
✅ **Direct order creation**: Place order → immediately sent to kitchen
✅ **Multi-user**: Each browser session = separate cart
✅ **Dynamic pricing**: ML service applies discounts automatically
✅ **Real-time tracking**: Order status updates via Kafka events
✅ **Staff control**: Modifications, cancellations by staff/manager
✅ **Inventory sync**: Stock reserved immediately on order creation

### Ordering Flow (TL;DR)

1. Customer scans QR → Gets table-specific menu
2. Adds items to temporary (in-memory) cart
3. Clicks "Place Order" → Frontend sends cart items to Order Service
4. Order Service validates, calculates totals, applies ML-predicted discounts
5. Creates order record in database (status: PENDING)
6. Emits Kafka event for kitchen, notifications, analytics
7. Kitchen sees order, prepares food
8. Staff updates status: PREPARING → READY → SERVED → COMPLETED
9. Order done, revenue recorded

