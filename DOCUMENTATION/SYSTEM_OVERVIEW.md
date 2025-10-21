# System Overview - Intellidine

## 🎯 What is Intellidine?

**Intellidine** is a **SaaS restaurant ordering system** that lets customers order food from their table using QR codes and helps restaurants manage operations from kitchen to payment.

**Key Innovation**: AI-powered dynamic pricing that optimizes revenue by suggesting discounts based on demand patterns and inventory levels.

---

## 📊 Architecture at a Glance

```
┌──────────────────────────────────────────────────────────────────┐
│                        CUSTOMERS (Mobile Web)                     │
│  Scan QR → Browse Menu → Add to Cart → Place Order → Pay         │
└──────────────┬───────────────────────────────────────────────────┘
               │
               ▼
    ┌─────────────────────────────┐
    │  API Gateway (Port 3100)    │
    │  - Route requests           │
    │  - JWT validation           │
    │  - Rate limiting            │
    └─────────────────────────────┘
               │
    ┌──────────┼──────────┬──────────────┬──────────────┬──────────────┐
    │          │          │              │              │              │
    ▼          ▼          ▼              ▼              ▼              ▼
┌────────┐┌─────────┐┌────────┐┌──────────┐┌──────────┐┌─────────┐
│ Auth   ││ Menu    ││ Order  ││ Payment  ││ Discount ││Inventory│
│Service ││Service  ││Service ││Service   ││Engine   ││Service  │
│3101    ││3102     ││3104    ││3107      ││3106     ││3105     │
│        ││         ││        ││          ││         ││         │
│OTP     ││Browse   ││Create  ││Razorpay  ││ML Price ││Reserve  │
│Staff   ││Items    ││Track   ││Cash      ││Rules    ││Stock    │
│Login   ││         ││        ││          ││         ││         │
└────────┘└─────────┘└────────┘└──────────┘└─────────┘└─────────┘
    ▲          ▲          ▲              ▲              ▲         
    │          │          │              │              │         
    └──────────┴──────────┴──────────────┴──────────────┘         
               │
               ▼
    ┌─────────────────────────────┐
    │  PostgreSQL (Port 5432)     │
    │  - Persistent data          │
    │  - Multi-tenant             │
    │  - 11 tables                │
    └─────────────────────────────┘
               │
    ┌──────────┼──────────┐
    │          │          │
    ▼          ▼          ▼
┌────────┐┌────────┐┌──────────┐
│ Redis  ││ Kafka  ││Prometheus│
│3006    ││9092    ││9090      │
│        ││        ││          │
│OTP     ││Events  ││Metrics   │
│Cache   ││Queue   ││          │
└────────┘└────────┘└──────────┘
```

---

## 🏢 10 Microservices Explained

### 1. 🔐 Auth Service (Port 3101)

**What it does**: Authenticates users (customers via OTP, staff via username/password)

**Key Features**:
- Customer OTP generation (SMS via Twilio/SNS)
- Staff login with JWT tokens
- Session management in Redis
- Token expiry (8 hours)

**Real Scenario**:
```
Customer arrives:
1. Opens phone camera → scans QR at table
2. Frontend calls: POST /api/auth/customer/otp
   Body: { phone_number: "9876543210" }
3. Auth Service generates 6-digit OTP
4. SMS sent: "Your Intellidine OTP is 123456. Valid for 5 min"
5. Customer enters OTP in app
6. Frontend verifies: POST /api/auth/customer/verify-otp
   Body: { phone_number, otp: "123456" }
7. Auth Service returns JWT token (8hr expiry)
8. Frontend stores token, uses for all future requests
```

**Endpoints**:
- `POST /api/auth/customer/otp` - Generate OTP
- `POST /api/auth/customer/verify-otp` - Verify & get JWT
- `POST /api/auth/staff/login` - Staff login
- `POST /api/auth/logout` - Invalidate session

---

### 2. 📋 Menu Service (Port 3102)

**What it does**: Manages restaurant menu (items, categories, pricing, dietary info)

**Key Features**:
- Menu categories (Appetizers, Mains, Sides, Desserts, Drinks)
- Menu items with descriptions, images, prices
- Dietary tags (vegan, gluten-free, spicy, etc.)
- Preparation time per item

**Data Structure**:
```
Category
├── Menu Item 1 (Paneer Tikka, ₹280, 15 min prep)
├── Menu Item 2 (Butter Chicken, ₹380, 20 min prep)
└── Menu Item 3 (Garlic Naan, ₹50, 5 min prep)
```

**Real Scenario**:
```
Customer opens phone:
1. Frontend calls: GET /api/menu/categories?tenant_id=...
   Response: [
     { id: "cat-1", name: "Appetizers", items: 8 },
     { id: "cat-2", name: "Mains", items: 12 },
     { id: "cat-3", name: "Bread", items: 4 }
   ]

2. User clicks "Mains"
3. Frontend calls: GET /api/menu/items?category_id=cat-2
   Response: [
     {
       id: "item_001",
       name: "Paneer Tikka",
       price: 280,
       description: "Marinated cottage cheese, grilled",
       image: "...",
       tags: ["vegetarian", "spicy"],
       prep_time: 15
     },
     ...
   ]
```

**Endpoints**:
- `GET /api/menu/categories` - List all categories
- `GET /api/menu/items?category_id=...` - Items in category
- `POST /api/menu/items` - Add new item (staff only)
- `PATCH /api/menu/items/{id}` - Update item (staff only)

---

### 3. 🛒 Order Service (Port 3104)

**What it does**: Handles order creation, tracking, and status updates

**Key Features**:
- Create orders (items + table + customer)
- Track order status (PENDING → PREPARING → READY → SERVED → COMPLETED)
- Store order items with prices captured at order time
- Handle order modifications & cancellations
- Calculate GST (18%)

**Order Lifecycle**:
```
Customer places order (PENDING)
          ↓
Kitchen starts cooking (PREPARING)
          ↓
Kitchen finishes (READY)
          ↓
Waiter delivers (SERVED)
          ↓
Customer pays (COMPLETED)
          ↓
Order done ✅
```

**Real Scenario**:
```
1. Customer places order (2 Paneer Tikka, 1 Naan):
   POST /api/orders?tenant_id=...
   Body: {
     "table_id": "tbl-001",
     "items": [
       { "menu_item_id": "item_001", "quantity": 2 },
       { "menu_item_id": "item_005", "quantity": 1 }
     ]
   }

2. Order Service:
   - Validates items exist
   - Calculates: Subtotal ₹610, GST ₹109.80, Total ₹719.80
   - Creates order in database (status: PENDING)
   - Publishes Kafka event: order.created

3. Multiple systems react:
   - Kitchen Display System: Shows order
   - Notification Service: Sends "Order received" SMS
   - Inventory Service: Reserves stock
   - Analytics: Records sale

4. Staff marks as PREPARING when they start cooking

5. Customer checks order status:
   GET /api/orders/{order_id}?tenant_id=...
   Response: { status: "PREPARING", estimated_time: "15 mins" }

6. When ready, staff updates:
   PATCH /api/orders/{order_id}/status
   Body: { status: "READY" }

7. Customer gets notification: "Your order is ready!"
```

**Endpoints**:
- `POST /api/orders` - Create order
- `GET /api/orders/{id}` - Get order details
- `GET /api/orders?status=...` - List orders
- `PATCH /api/orders/{id}/status` - Update status (staff)
- `PATCH /api/orders/{id}/cancel` - Cancel order (staff)

---

### 4. 💳 Payment Service (Port 3107)

**What it does**: Processes payments (online via Razorpay or cash)

**Key Features**:
- Razorpay integration for card/UPI payments
- Cash payment handling
- Payment status tracking
- Change management for cash payments

**Real Scenario - Online Payment**:
```
1. Order complete, customer clicks "Pay Online"
2. Frontend calls: POST /api/payments/razorpay-order
   Body: { order_id: "ord-123", amount: 719.80 }

3. Payment Service:
   - Creates Razorpay order
   - Returns order_id + payment_key

4. Frontend opens Razorpay checkout modal
   - Customer enters card details
   - Pays ₹719.80

5. Payment Service receives webhook from Razorpay:
   - Verifies payment signature
   - Updates payment status: COMPLETED
   - Publishes Kafka event: payment.completed

6. Order Service reacts:
   - Updates order status: COMPLETED
   - Order finalized ✅
```

**Real Scenario - Cash Payment**:
```
1. Order ready, customer wants to pay cash
2. Staff opens app: GET /api/payments/{order_id}

3. Payment dialog shows:
   - Total: ₹719.80
   - Amount received: [input field]

4. Staff enters amount received (e.g., ₹750)
5. Staff clicks "Confirm"
6. Payment Service calculates:
   - Amount received: ₹750
   - Change to give: ₹30.20

7. Payment recorded, order completed
```

**Endpoints**:
- `POST /api/payments/razorpay-order` - Create online payment
- `POST /api/payments/verify` - Verify Razorpay payment
- `POST /api/payments/cash` - Record cash payment
- `GET /api/payments/{order_id}` - Check payment status

---

### 5. 🎯 Discount Engine (Port 3106)

**What it does**: Applies dynamic pricing based on demand and inventory

**Key Features**:
- Calls ML Service for discount predictions
- Stores pricing rules (manual overrides)
- Applies discounts automatically to orders
- Tracks discount history

**Real Scenario**:
```
1. It's 8 PM (dinner peak), inventory 85% full
   → ML says: "No discount needed" (0%)

2. It's 3 PM (off-peak), Paneer Tikka inventory 22%
   → ML says: "Critical inventory" (22% discount)
   → Price: ₹280 → ₹218

3. Order Service creates order with:
   - Original price: ₹280
   - Discount applied: 22%
   - Final price: ₹218

4. Customer gets discount automatically!
```

**Integration**:
- Called before order creation
- Uses ML Service predictions
- Discount applied transparently to customer

---

### 6. 📦 Inventory Service (Port 3105)

**What it does**: Tracks ingredient stock and menu item availability

**Key Features**:
- Track ingredient quantities & reorder levels
- Link recipes to menu items
- Reserve stock when order placed
- Update stock when order completed
- Alert when stock low

**Real Scenario**:
```
Stock tracking:
- Paneer (Cottage Cheese): 10 kg in stock, min 5 kg
- Butter: 3 kg in stock, min 2 kg
- Tomato: 25 kg in stock, min 10 kg

When order placed (2 Paneer Tikka):
1. Order Service emits: order.created
2. Inventory Service receives event
3. Looks up recipe: Paneer Tikka needs 150g Paneer
4. Calculates: 2 × 150g = 300g needed
5. Reserves 300g from 10 kg
6. Updates: Paneer now 9.7 kg

When stock drops below minimum:
- Alert sent to manager: "Paneer low stock (4.2 kg remaining)"
```

**Endpoints**:
- `GET /api/inventory/status?items=...` - Check stock
- `POST /api/inventory/adjust` - Manual adjustment (staff)
- `GET /api/inventory/alerts` - Low stock warnings
- `POST /api/inventory/recipes` - Define recipe ingredients

---

### 7. 🔔 Notification Service (Port 3103)

**What it does**: Sends notifications to customers and staff

**Key Features**:
- SMS notifications via SNS/Twilio
- Order status updates
- Payment confirmations
- Low stock alerts

**Real Scenario**:
```
Customer journey notifications:

7:30 PM - Order placed:
→ SMS: "Order received! 2 Paneer Tikka, 1 Naan. ETA 15 mins."

7:35 PM - Kitchen starts:
→ SMS: "Your order is being prepared. ETA 12 mins."

7:45 PM - Ready:
→ SMS: "Your order is ready! Please collect from table."

7:50 PM - Paid:
→ SMS: "Payment received. Thank you for dining!"
```

**Endpoints**:
- `POST /api/notifications/send` - Send notification (internal)
- Mostly event-driven via Kafka

---

### 8. 📊 Analytics Service (Port 3108)

**What it does**: Collects metrics and generates reports

**Key Features**:
- Track total sales, order count, revenue
- Average order value
- Popular items
- Peak hours analysis
- Staff performance

**Real Scenario**:
```
Manager checks dashboard:

Today's Summary (Oct 22, 2025):
- Total Orders: 142
- Total Revenue: ₹18,540
- Average Order Value: ₹130.56
- Top Item: Butter Chicken (28 orders)
- Peak Hour: 1-2 PM (47 orders)

Peak Hours vs Off-Peak:
- 12-2 PM (Lunch): ₹8,240 (63 orders)
- 7-10 PM (Dinner): ₹7,850 (58 orders)
- 3-5 PM (Off-peak): ₹2,450 (21 orders)
```

**Endpoints**:
- `GET /api/analytics/daily` - Daily summary
- `GET /api/analytics/items` - Item popularity
- `GET /api/analytics/peak-hours` - Peak time analysis
- `GET /api/analytics/revenue` - Revenue trends

---

### 9. 🤖 ML Service (Port 8000, Python)

**What it does**: Predicts optimal discounts using XGBoost

**Key Features**:
- Analyzes current time, inventory, demand patterns
- Recommends discount percentage (0%, 5-10%, 15%, 20-25%)
- Provides confidence scores
- Real-time predictions (5-10ms)

**Real Scenario**:
```
8:00 PM (Dinner peak, Friday, 85% inventory):
→ ML says: "0% discount" (peak demand)

3:00 PM (Off-peak, Monday, 22% inventory):
→ ML says: "22% discount" (critical inventory)

Feature vector sent to ML:
{
  hour: 15,
  day_of_week: 1,
  is_weekend: 0,
  is_lunch_peak: 0,
  is_dinner_peak: 0,
  is_month_end: 0,
  is_holiday_week: 0,
  inventory_level: 0.22,
  num_items: 2,
  total_price: 560,
  order_duration: 30
}

Output:
{
  discount_percentage: 22,
  confidence: 0.82,
  reason: "Critical inventory levels"
}
```

**Endpoints**:
- `POST /predict` - Get discount recommendations
- `GET /health` - Service health check
- `POST /train` - Retrain model (dev only)

---

### 10. 🚪 API Gateway (Port 3100)

**What it does**: Entry point for all API requests

**Key Features**:
- Route requests to correct microservice
- JWT token validation
- Rate limiting (prevent abuse)
- CORS handling
- Logging

**How it works**:
```
Request comes in: POST /api/orders
↓
API Gateway checks:
1. JWT token valid? ✓
2. Tenant ID in token matches request? ✓
3. Rate limit OK? ✓
↓
Routes to: Order Service (port 3104)
↓
Response returned to client
```

---

## 🗄️ Data Storage Layer

### PostgreSQL (Port 5432)

Persistent data storage with 11 core tables:

| Table | Purpose | Example Data |
|-------|---------|--------------|
| `tenants` | Restaurants | Spice Route, Taj Mahal |
| `users` | Staff accounts | manager1, kitchen_staff1 |
| `customers` | Customer phone records | 9876543210 |
| `menu_items` | Dish names/prices | Paneer Tikka ₹280 |
| `categories` | Menu categories | Appetizers, Mains |
| `orders` | Order records | ord-123, Status: PENDING |
| `order_items` | Items in order | 2x Paneer Tikka, 1x Naan |
| `payments` | Payment records | ord-123, ₹719.80, COMPLETED |
| `tables` | Restaurant tables | Table 1-8, QR codes |
| `inventory` | Ingredient stock | Paneer 10kg |
| `otp_verifications` | OTP history | phone, otp_hash, expires_at |

### Redis (Port 6379)

In-memory cache and session storage:
- **OTP codes**: 5-minute expiry
- **Sessions**: 24-hour expiry
- **Cached menu**: 1-hour expiry
- **Temporary counters**: Request tracking

### Kafka (Port 9092)

Event streaming for async communication:

**Topics** (channels):
- `order.created` - New order published
- `order.status_changed` - Status updates
- `payment.completed` - Payment confirmed
- `inventory.low_stock` - Stock alert
- `discount.applied` - Discount info

---

## 🔄 Data Flow Example: Complete Order Lifecycle

### Step 1: Customer Scans QR
```
┌─────────────────────────────────────────┐
│ Customer Phone                          │
│ Scan QR → https://intellidine.app/...  │
└────────────────┬────────────────────────┘
                 │
                 ▼
        ┌────────────────────┐
        │ Frontend (React)   │
        │ Extract table ID   │
        └────────────────────┘
```

### Step 2: Request OTP
```
Frontend:
  POST /api/auth/customer/otp
  Body: { phone_number: "9876543210" }
           │
           ├─→ API Gateway (3100)
           │    │
           └─→ Auth Service (3101)
                │
                ├─→ PostgreSQL (store OTP hash)
                ├─→ Redis (cache OTP, 5 min)
                ├─→ SNS/Twilio (send SMS)
                │
Response: "OTP sent to 9876543210"
```

### Step 3: Verify OTP, Get JWT
```
Frontend:
  POST /api/auth/customer/verify-otp
  Body: { phone_number, otp: "123456" }
           │
           ├─→ API Gateway (3100)
           │    │
           └─→ Auth Service (3101)
                │
                ├─→ Redis (verify OTP)
                ├─→ PostgreSQL (create/fetch customer)
                ├─→ Redis (store session)
                │
Response: { access_token: "eyJhbGc..." }

Frontend stores JWT, uses for future requests
```

### Step 4: Browse Menu
```
Frontend:
  GET /api/menu/items?tenant_id=...
           │
           ├─→ API Gateway (validate JWT, tenant_id)
           │    │
           └─→ Menu Service (3102)
                │
                ├─→ PostgreSQL (query menu_items)
                │
Response: [{ id, name, price, image, ... }]
```

### Step 5: Place Order
```
Frontend:
  POST /api/orders?tenant_id=...
  Body: { items: [{ menu_item_id, quantity }] }
           │
           ├─→ API Gateway (validate JWT)
           │    │
           └─→ Order Service (3104)
                │
                ├─→ Menu Service (verify items exist)
                │
                ├─→ Discount Engine (get ML discount)
                │    │
                │    └─→ ML Service (predict discount)
                │
                ├─→ PostgreSQL (create order record)
                │
                ├─→ Kafka publish: order.created
                │    │
                │    ├─→ Notification Service (send SMS)
                │    ├─→ Analytics Service (record sale)
                │    ├─→ Inventory Service (reserve stock)
                │    └─→ Kitchen Display (show order)
                │
Response: { order_id: "ord-123", total: 719.80 }
```

### Step 6: Kitchen Prepares
```
Staff app (KDS):
  1. Sees order on screen
  2. Clicks "Start Cooking"
  3. Sends: PATCH /api/orders/ord-123/status
            Body: { status: "PREPARING" }
             │
             └─→ Order Service
                  │
                  ├─→ PostgreSQL (update status)
                  │
                  ├─→ Kafka publish: order.status_changed
                  │    │
                  │    └─→ Notification Service (send SMS)
                  │
Response: ✓ Status updated
```

### Step 7: Food Ready
```
Staff marks ready:
  PATCH /api/orders/ord-123/status
  Body: { status: "READY" }
           │
           └─→ (same flow as Step 6)
              
Customer receives SMS: "Your order is ready!"
```

### Step 8: Payment
```
Customer clicks "Pay":
  1. Option 1 - Online: POST /api/payments/razorpay-order
                        → Razorpay checkout
                        → Customer pays
                        → Webhook updates status
  
  2. Option 2 - Cash: POST /api/payments/cash
                      → Staff confirms amount
                      → Change calculated

Payment Service:
  ├─→ PostgreSQL (record payment)
  ├─→ Kafka publish: payment.completed
  │    │
  │    └─→ Order Service (update status: COMPLETED)
  │
Response: Payment recorded ✓
```

### Step 9: Order Complete
```
Final state:
  - Order status: COMPLETED
  - Payment status: COMPLETED
  - Revenue recorded in Analytics
  - Analytics dashboard updated
  - Order history saved for future reference

✅ Complete flow finished!
```

---

## 🔐 Authentication & Authorization

### Customer (QR-Based)

```
1. Scans QR → No login required
2. Gets OTP via SMS
3. Enters OTP → Receives JWT token
4. Token valid for 8 hours
5. Can place orders, view order status
6. Cannot access admin functions
```

### Staff

```
1. Staff login: POST /api/auth/staff/login
   Body: { username: "manager1", password: "Password@123" }

2. Auth Service verifies credentials

3. Returns JWT with role: "MANAGER" | "KITCHEN_STAFF" | "WAITER"

4. Different endpoints require different roles:
   - Update order status → MANAGER or KITCHEN_STAFF
   - Manage menu items → MANAGER only
   - View analytics → MANAGER only
   - Create orders (POS) → WAITER or MANAGER
```

### Token Structure

```
JWT Token contains:
{
  sub: "user-id",
  tenant_id: "11111111-1111-1111-1111-111111111111",
  role: "MANAGER",
  phone: "9876543210",
  exp: 1729696800  // 8 hours from now
}

On every request:
1. API Gateway extracts JWT
2. Verifies signature (secret key)
3. Checks expiry
4. Validates tenant_id in token matches request
5. Validates role has permission for endpoint
6. Passes to service
```

---

## 🌍 Multi-Tenancy Architecture

### Tenant Isolation

**Problem**: Multiple restaurants use same system, must be completely isolated

**Solution**: Tenant ID on every operation

```
Restaurant 1: tenant_id = "11111111-1111-1111-1111-111111111111"
  - Menu items only for Restaurant 1
  - Orders only from Restaurant 1's tables
  - Staff can only manage Restaurant 1

Restaurant 2: tenant_id = "22222222-2222-2222-2222-222222222222"
  - Separate menu, orders, staff
  - No data mixing
```

### Enforcement

```
Every query filtered by tenant_id:

GET /api/menu/items?tenant_id=111...
→ SELECT * FROM menu_items
  WHERE tenant_id = '111...' AND is_deleted = FALSE

// No way to query across tenants
// Staff JWT includes tenant_id
// API Gateway validates tenant_id in request matches JWT
```

---

## 📡 Event-Driven Architecture (Kafka)

### Why Kafka?

Services don't call each other directly (reduces coupling):

```
❌ OLD WAY (tightly coupled):
  Order Service calls Notification Service directly
  → Notification Service down? Order Service fails

✅ NEW WAY (event-driven):
  Order Service: "An order was created!"
  → Publishes to Kafka topic: order.created
  
  Kafka stores event, any service can consume:
  ├─→ Notification Service: "Send SMS!"
  ├─→ Analytics Service: "Record sale!"
  ├─→ Inventory Service: "Reserve stock!"
  └─→ Kitchen Display: "Show on screen!"
  
  If Notification Service is down temporarily:
  → Event stays in Kafka queue
  → Notification Service catches up when it comes back online
```

### Key Events

| Event | Publisher | Subscribers |
|-------|-----------|-------------|
| `order.created` | Order Service | Notification, Analytics, Inventory, Kitchen |
| `order.status_changed` | Order Service | Notification, Analytics |
| `payment.completed` | Payment Service | Order Service, Analytics |
| `inventory.low_stock` | Inventory Service | Notification (alert manager) |
| `discount.applied` | Discount Engine | Analytics |

---

## 🚀 Real-World Scenarios

### Scenario 1: Friday Dinner Rush (Peak Time)

```
Time: 7:30 PM, Friday
Current inventory: 85% full (plenty of stock)
ML Model prediction: 0% discount (peak demand)

Customer places order (₹280 Paneer Tikka):
  - Price: ₹280 (no discount)
  - ML confidence: 0.95
  - Reason: "Peak dinner hour"

System's reasoning:
  - Peak time → High demand
  - Stock available → No need to discount
  - Maximize revenue → Sell at full price

Result: ✅ Restaurant captures full revenue
```

### Scenario 2: Tuesday Afternoon Slump (Off-Peak)

```
Time: 3:30 PM, Tuesday
Current inventory: 22% full (critical low stock)
ML Model prediction: 22% discount

Customer places order (₹280 Paneer Tikka):
  - Original price: ₹280
  - Discount: 22%
  - Final price: ₹218
  - ML confidence: 0.82
  - Reason: "Critical inventory levels"

System's reasoning:
  - Off-peak time → Low demand
  - Low inventory → Risk of waste
  - Apply discount → Encourage purchase
  - Sell at 22% off better than 100% waste

Result: ✅ Item sells, minimizes waste, still captures revenue
```

### Scenario 3: Payment Processing

```
Time: 8:15 PM
Customer finishes eating, clicks "Pay"

Option A - Online Payment:
  1. Razorpay checkout appears
  2. Customer pays ₹719.80 via card
  3. Razorpay returns: Payment successful
  4. Payment Service verifies & updates status
  5. Order marked COMPLETED
  6. SMS: "Thank you! Payment received."

Option B - Cash Payment:
  1. Staff enters amount received: ₹750
  2. System calculates change: ₹30.20
  3. Staff gives cash & receipt
  4. Order marked COMPLETED
  5. SMS: "Thank you! Payment received."

Either way → Order finalized, revenue recorded
```

### Scenario 4: Order Modification

```
Time: 8:10 PM
Order placed 5 minutes ago (status: PREPARING)

Customer: "Can we add 1 Garlic Naan?"

Staff tablet:
  1. Opens order details
  2. Clicks "+ Add Item"
  3. Selects "Garlic Naan"
  4. Confirms update

Backend:
  1. Adds item to order
  2. Recalculates totals (+₹50)
  3. Kafka event: order_items_added
  4. Kitchen display updates (shows new naan)
  5. Notification: "Item added to your order"

Result: ✅ Order updated, kitchen notified, total updated
```

### Scenario 5: Low Stock Alert

```
Time: 8:45 PM
Order placed: 2x Paneer Tikka

Inventory Service:
  - Before: Paneer = 2.3 kg (below min 5 kg)
  - After order: Paneer = 2.0 kg (CRITICAL)
  - Emits Kafka event: inventory.low_stock

Notification Service receives:
  - Sends SMS to manager: "⚠️ Paneer low: 2.0 kg remaining"

Manager response:
  - Calls supplier
  - Orders more Paneer
  - Status updated when stock arrives

Result: ✅ Prevents running out of critical ingredients
```

---

## ⚡ Performance Characteristics

### Response Times

| Operation | Typical Time | Max Time |
|-----------|--------------|----------|
| Browse menu (10 items) | 50ms | 200ms |
| Create order | 150ms | 500ms |
| Get ML discount | 8ms | 20ms |
| Process payment (Razorpay) | 2 sec | 5 sec |
| Update order status | 80ms | 300ms |

### Throughput

- **Peak load**: 100 concurrent orders per minute
- **Database**: 5,000 queries/second capacity
- **Kafka**: 10,000 events/second capacity
- **API Gateway**: Can route 50,000 requests/minute

### Scalability

All services are **stateless** and can run multiple instances:
```
API Gateway (3100)
  ├─→ Order Service instance 1
  ├─→ Order Service instance 2
  ├─→ Order Service instance 3
  └─→ Load balancer distributes requests
```

---

## 🔍 Error Handling

### Common Errors & Recovery

| Error | Cause | Recovery |
|-------|-------|----------|
| "Invalid OTP" | Wrong code entered | User can retry (5 attempts) |
| "Table not found" | Invalid table ID in URL | Scan correct QR code |
| "Item out of stock" | Item just sold out | Show "Currently unavailable" |
| "Payment failed" | Card declined/timeout | Show retry button |
| "Order cannot be cancelled" | Already being prepared | Show "Cannot cancel" message |

### Service Failures

```
If Order Service goes down:
  ✗ New orders cannot be created
  ✓ But customers still see menu
  ✓ Staff get notification to call manually

If Notification Service goes down:
  ✗ No SMS sent immediately
  ✓ Events queued in Kafka
  ✓ Service restarts → catches up on events

If Discount Engine goes down:
  ✓ Orders still created at full price (safe default)
  ✓ Customers don't lose ability to order

If Payment Service fails:
  ✓ Order marked status "AWAITING_PAYMENT"
  ✓ Staff can manually collect payment later
```

---

## 🎯 Key Design Principles

### 1. **Stateless Services**
- Services don't store session data
- Can scale horizontally (multiple instances)
- Any instance can handle any request

### 2. **Multi-Tenancy First**
- Every operation filtered by tenant_id
- No cross-tenant data leakage possible
- Complete isolation at database level

### 3. **Event-Driven**
- Services communicate via Kafka events
- Loose coupling (services don't know each other)
- Better fault tolerance (slow service doesn't block others)

### 4. **Data Consistency**
- PostgreSQL for persistent data
- Redis for caching & sessions
- Kafka for event replay if needed

### 5. **Security**
- JWT tokens for authentication
- Role-based access control
- Tenant ID validation on every request
- No sensitive data in logs

---

## 📱 Frontend Integration Points

### What Frontend Needs to Know

1. **Endpoints**: All 35+ REST API endpoints
2. **Authentication**: How to get JWT tokens
3. **Data Models**: Order structure, payment flow
4. **Workflows**: Complete user journeys
5. **Error Handling**: What to show when failures happen

### Frontend Checklist

- ✅ Implement OTP flow (for customers)
- ✅ Display menu from Menu Service
- ✅ Implement cart (in-memory, no persistence)
- ✅ Place orders with Order Service
- ✅ Track order status in real-time
- ✅ Implement payment (Razorpay or cash)
- ✅ Handle errors gracefully
- ✅ Show discount info to user

---

## 🎓 Learning Path

**Start here**: This document (System Overview)

**Then dive into**:
1. [ORDERING_WORKFLOW.md](./workflows/ORDERING_WORKFLOW.md) - See complete flow
2. [API_ENDPOINTS.md](../API_ENDPOINTS.md) - All endpoints with examples
3. Service-specific docs for what you're building

**Reference while coding**:
- [DATABASE.md](./DATABASE.md) - Data models
- [KAFKA_EVENTS.md](./KAFKA_EVENTS.md) - Event structure

---

## 📊 Quick Statistics

- **10 Services** (9 NestJS + 1 Python ML)
- **35+ API Endpoints**
- **11 Database Tables**
- **7 Kafka Topics**
- **4 Different User Roles** (CUSTOMER, MANAGER, KITCHEN_STAFF, WAITER)
- **~5,000 Lines of Code** per service
- **100 SQL Queries/second** typical traffic
- **8-hour JWT expiry** for security

---

## ✅ System Status

**Current State**: ✅ Ready for Frontend Integration

- ✅ All microservices deployed & healthy
- ✅ Database seeded with staff users
- ✅ ML model trained & predictions working
- ✅ Authentication working (OTP + staff login)
- ✅ Order lifecycle complete
- ✅ Payment integration ready
- ✅ 35+ endpoints tested

**Blockers**: None 🎉

---

**Next Steps**:
1. Frontend team should read [ORDERING_WORKFLOW.md](./workflows/ORDERING_WORKFLOW.md)
2. Get familiar with [API_ENDPOINTS.md](../API_ENDPOINTS.md)
3. Start building React components
4. Reference individual service docs as needed

Happy building! 🚀
