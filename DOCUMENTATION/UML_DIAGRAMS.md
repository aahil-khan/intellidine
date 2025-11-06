# IntelliDine — UML Diagrams & Architecture

This document contains comprehensive UML diagrams for the IntelliDine system, including system collaboration, sequence diagrams, and class diagrams.

---

## 1. System Collaboration Diagram (Component Overview)

```plantuml
@startuml IntelliDine_System_Collaboration
!define AWSPUML https://raw.githubusercontent.com/awslabs/aws-icons-for-plantuml/v14.0/dist
skinparam componentBackgroundColor #f0f0f0
skinparam componentBorderColor #333333

package "Frontend" {
  component [Customer App\n(Mobile Web)] as CustomerApp
  component [Staff App\n(Kitchen Display)] as StaffApp
}

package "API Gateway" {
  component [API Gateway\n(Port 3100)] as Gateway
}

package "Microservices" {
  component [Auth Service\n(3101)] as AuthService
  component [Menu Service\n(3103)] as MenuService
  component [Order Service\n(3102)] as OrderService
  component [Payment Service\n(3105)] as PaymentService
  component [Inventory Service\n(3104)] as InventoryService
  component [Notification Service\n(3106)] as NotificationService
  component [Analytics Service\n(3107)] as AnalyticsService
  component [Discount Engine\n(3108)] as DiscountEngine
  component [ML Service\n(8000)] as MLService
}

package "Data & Messaging" {
  component [PostgreSQL\n(5432)] as DB
  component [Redis\n(6379)] as Cache
  component [Kafka\n(9092)] as MessageQueue
}

package "Monitoring" {
  component [Prometheus\n(9090)] as Prometheus
  component [Grafana\n(3009)] as Grafana
}

CustomerApp --> Gateway: HTTPS\nJWT Token
StaffApp --> Gateway: HTTPS\nJWT Token

Gateway --> AuthService: Route /api/auth
Gateway --> MenuService: Route /api/menu
Gateway --> OrderService: Route /api/orders
Gateway --> PaymentService: Route /api/payments
Gateway --> InventoryService: Route /api/inventory
Gateway --> NotificationService: Route /api/notifications
Gateway --> DiscountEngine: Route /api/discounts
Gateway --> AnalyticsService: Route /api/analytics

AuthService --> DB: Query/Update
AuthService --> Cache: Session Store
MenuService --> DB: Query
MenuService --> Cache: Menu Cache
OrderService --> DB: Query/Update
OrderService --> MessageQueue: Publish Events
PaymentService --> DB: Query/Update
PaymentService --> MessageQueue: Publish Events
InventoryService --> DB: Query/Update
InventoryService --> MessageQueue: Publish/Consume
NotificationService --> MessageQueue: Consume Events
AnalyticsService --> DB: Aggregate
AnalyticsService --> MessageQueue: Consume Events
DiscountEngine --> MLService: Predict Discounts
DiscountEngine --> DB: Rules Storage

Prometheus --> Gateway: Scrape Metrics
Prometheus --> AuthService: Scrape Metrics
Prometheus --> OrderService: Scrape Metrics
Grafana --> Prometheus: Query

@enduml
```

---

## 2. Customer Order Creation Sequence Diagram

```plantuml
@startuml Customer_Order_Flow
actor Customer
participant "Customer\nPhone" as Phone
participant "API Gateway" as Gateway
participant "Auth Service" as Auth
participant "Order Service" as Order
participant "Menu Service" as Menu
participant "Discount Engine" as Discount
participant "Kafka" as Kafka
participant "Notification\nService" as Notif
participant "Analytics\nService" as Analytics
database "PostgreSQL" as DB
database "Redis" as Redis

Customer ->> Phone: 1. Scans QR at Table
Phone ->> Auth: 2. POST /api/auth/customer/request-otp\n{phone: "9876543210", tenant_id from QR}
Auth ->> Redis: Generate OTP (5 min expiry)
Auth ->> Auth: Send SMS via Twilio/SNS
Auth -->> Phone: OTP sent

Customer ->> Phone: 3. Enter OTP in app
Phone ->> Auth: 4. POST /api/auth/customer/verify-otp\n{phone, otp}
Auth ->> Redis: Verify OTP
Auth ->> DB: Fetch/Create Customer
Auth ->> Auth: Generate JWT\n{sub: customer_id, type: "customer"}
Auth -->> Phone: 5. JWT Token + expires_at

Phone ->> Menu: 6. GET /api/menu/categories\n?tenant_id=...
Menu ->> Redis: Check cache
alt Cache Hit
  Menu -->> Phone: Categories (cached)
else Cache Miss
  Menu ->> DB: SELECT categories WHERE tenant_id
  Menu ->> Redis: Cache for 1 hour
  Menu -->> Phone: Categories
end

Phone ->> Menu: 7. GET /api/menu/items?category_id=...\n?tenant_id=...
Menu ->> DB: SELECT menu_items WHERE category_id, tenant_id
Menu -->> Phone: Items with prices

Customer ->> Phone: 8. Add items to cart & review

Phone ->> Discount: 9. POST /api/discounts/apply\n{items: [...], tenant_id: ...}
Discount ->> MLService: Call ML for predictions\n(time, demand, inventory)
Discount -->> Phone: Discount %

Phone ->> Order: 10. POST /api/orders?tenant_id=...\n{table_id, items: [{id, qty}]}
Order ->> Menu: Verify items exist
Order ->> DB: Create order record
Order ->> Order: Calculate totals\n(subtotal + GST + discount)
Order ->> Kafka: Publish: order.created\n{order_id, items, total, tenant_id}
Order -->> Phone: 11. Order confirmation\n{order_id, total, ETA}

Kafka ->> Notif: 12a. Consume order.created
Notif ->> Notif: Send SMS: "Order received"

Kafka ->> Analytics: 12b. Consume order.created
Analytics ->> DB: Record order metrics

Kafka ->> InventoryService: 12c. Consume order.created
InventoryService ->> DB: Reserve stock for items

Phone ->> Order: 13. Poll: GET /api/orders/{order_id}\n?tenant_id=...
Order ->> DB: SELECT order WHERE id, tenant_id
Order -->> Phone: 14. {status: "PENDING", ETA: "15 mins"}

@enduml
```

---

## 3. Order Preparation & Payment Sequence Diagram

```plantuml
@startuml Kitchen_Payment_Flow
actor Staff as Kitchen
actor Customer
participant "Kitchen\nDisplay" as KDS
participant "API Gateway" as Gateway
participant "Order Service" as Order
participant "Payment Service" as Payment
participant "Kafka" as Kafka
participant "Notification\nService" as Notif
database "PostgreSQL" as DB
participant "Razorpay" as Razorpay

Kitchen ->> KDS: 1. Opens app
KDS ->> Order: GET /api/orders?status=PENDING\n?tenant_id=...
Order ->> DB: SELECT orders WHERE status, tenant_id
Order -->> KDS: 2. Pending orders [order-1, order-2, ...]

KDS ->> KDS: 3. Display orders on kitchen screen

Kitchen ->> KDS: 4. Start cooking order-1
KDS ->> Order: PATCH /api/orders/{order_id}/status\n?tenant_id=...\n{status: "PREPARING"}
Order ->> DB: UPDATE order status = "PREPARING"
Order ->> Kafka: Publish: order.status_changed\n{order_id, status: "PREPARING"}
Order -->> KDS: Status updated

Kafka ->> Notif: Consume order.status_changed
Notif ->> Customer: 5. SMS: "Your order is being prepared"

Kitchen ->> KDS: 6. Food ready, mark complete
KDS ->> Order: PATCH /api/orders/{order_id}/status\n{status: "READY"}
Order ->> DB: UPDATE order status = "READY"
Order ->> Kafka: Publish: order.status_changed\n{order_id, status: "READY"}

Kafka ->> Notif: Consume
Notif ->> Customer: 7. SMS: "Your order is ready!"

Customer ->> Phone: 8. Clicks "Pay"
Phone ->> Payment: POST /api/payments/create-razorpay-order\n?tenant_id=...\n{order_id, amount: 719.80}
Payment ->> Razorpay: Create order (₹719.80)
Razorpay -->> Payment: razorpay_order_id
Payment -->> Phone: 9. Razorpay modal data

Phone ->> Razorpay: 10. Customer enters card details
Razorpay ->> Razorpay: Process payment
Razorpay ->> Payment: 11. Webhook: payment.authorized\n{razorpay_order_id, razorpay_payment_id, signature}

Payment ->> Payment: Verify signature
Payment ->> DB: Create payment record\n{order_id, status: "COMPLETED", method: "card"}
Payment ->> Kafka: Publish: payment.completed\n{order_id, amount, method}
Payment -->> Razorpay: Webhook response: OK

Kafka ->> Order: Consume payment.completed
Order ->> DB: UPDATE order status = "COMPLETED"
Order ->> Kafka: Publish: order.completed

Kafka ->> Analytics: Consume: order.completed + payment.completed
Analytics ->> DB: Update revenue metrics

Kafka ->> Notif: Consume
Notif ->> Customer: 12. SMS: "Payment received. Thank you!"

Phone -->> Customer: 13. Order complete ✓

@enduml
```

---

## 4. Core Entity Class Diagram

```plantuml
@startuml Core_Entity_Classes
skinparam classBackgroundColor #f9f9f9
skinparam classBorderColor #333333
skinparam classAttributeIconSize 0

class Tenant {
  - id: UUID [PK]
  - name: String
  - email: String
  - phone: String
  - address: String
  - owner_id: UUID
  - is_active: Boolean
  - created_at: DateTime
  - updated_at: DateTime
  --
  + getId(): UUID
  + getName(): String
  + isActive(): Boolean
}

class User {
  - id: UUID [PK]
  - tenant_id: UUID [FK]
  - username: String [UNIQUE]
  - email: String [UNIQUE]
  - password_hash: String
  - role: Enum (MANAGER|KITCHEN_STAFF|WAITER)
  - is_active: Boolean
  - created_at: DateTime
  --
  + getId(): UUID
  + getTenantId(): UUID
  + getRole(): Role
  + verifyPassword(pwd: String): Boolean
}

class Customer {
  - id: UUID [PK]
  - phone_number: String [UNIQUE]
  - name: String
  - email: String
  - total_orders: Int
  - total_spent: Decimal
  - created_at: DateTime
  --
  + getId(): UUID
  + getPhoneNumber(): String
  + getTotalOrders(): Int
}

class Table {
  - id: UUID [PK]
  - tenant_id: UUID [FK]
  - table_number: Int
  - capacity: Int
  - qr_code_url: String
  - is_active: Boolean
  --
  + getId(): UUID
  + getTenantId(): UUID
  + getQRCodeUrl(): String
  + getCapacity(): Int
}

class MenuCategory {
  - id: String [PK]
  - tenant_id: UUID [FK]
  - name: String
  - description: String
  - display_order: Int
  --
  + getId(): String
  + getName(): String
  + getDisplayOrder(): Int
}

class MenuItem {
  - id: UUID [PK]
  - tenant_id: UUID [FK]
  - category_id: String [FK]
  - name: String
  - description: String
  - price: Decimal
  - cost_price: Decimal
  - discount_percentage: Decimal
  - is_available: Boolean
  - prep_time_minutes: Int
  - dietary_tags: String[]
  - image_url: String
  --
  + getId(): UUID
  + getName(): String
  + getPrice(): Decimal
  + getPrepTime(): Int
  + isAvailable(): Boolean
}

class Order {
  - id: UUID [PK]
  - tenant_id: UUID [FK]
  - customer_id: UUID [FK]
  - table_id: UUID [FK]
  - status: Enum (PENDING|PREPARING|READY|SERVED|COMPLETED|CANCELLED)
  - subtotal: Decimal
  - tax: Decimal
  - discount: Decimal
  - total_amount: Decimal
  - created_at: DateTime
  - completed_at: DateTime
  --
  + getId(): UUID
  + getTenantId(): UUID
  + getStatus(): OrderStatus
  + getTotal(): Decimal
  + canTransitionTo(status: OrderStatus): Boolean
  + calculateTax(): Decimal
}

class OrderItem {
  - id: UUID [PK]
  - order_id: UUID [FK]
  - menu_item_id: UUID [FK]
  - quantity: Int
  - unit_price: Decimal
  - subtotal: Decimal
  --
  + getId(): UUID
  + getOrderId(): UUID
  + getQuantity(): Int
  + getPrice(): Decimal
}

class Payment {
  - id: UUID [PK]
  - tenant_id: UUID [FK]
  - order_id: UUID [FK]
  - method: Enum (RAZORPAY|CASH)
  - amount: Decimal
  - status: Enum (PENDING|COMPLETED|FAILED|REFUNDED)
  - razorpay_order_id: String
  - razorpay_payment_id: String
  - transaction_id: String
  - created_at: DateTime
  --
  + getId(): UUID
  + getOrderId(): UUID
  + getAmount(): Decimal
  + getStatus(): PaymentStatus
  + isSuccessful(): Boolean
}

class Inventory {
  - id: UUID [PK]
  - tenant_id: UUID [FK]
  - item_name: String
  - quantity: Decimal
  - unit: String (KG|LITER|PIECE)
  - reorder_level: Decimal
  - cost_price: Decimal
  - expiry_date: DateTime
  - last_updated: DateTime
  --
  + getId(): UUID
  + getTenantId(): UUID
  + getQuantity(): Decimal
  + isLowStock(): Boolean
  + deduct(amount: Decimal): void
}

class OTPVerification {
  - id: UUID [PK]
  - phone_number: String
  - otp_hash: String
  - expires_at: DateTime
  - attempts: Int
  - verified_at: DateTime
  --
  + getId(): UUID
  + getPhoneNumber(): String
  + isExpired(): Boolean
  + isVerified(): Boolean
}

' Relationships
Tenant "1" -- "many" User: owns
Tenant "1" -- "many" Table: has
Tenant "1" -- "many" MenuItem: owns menu
Tenant "1" -- "many" Order: receives
Tenant "1" -- "many" Inventory: manages
Tenant "1" -- "many" Payment: processes

User "1" -- "many" Order: creates/updates

MenuItem "1" -- "many" OrderItem: added to

MenuCategory "1" -- "many" MenuItem: contains

Table "1" -- "many" Order: serves

Customer "1" -- "many" Order: places
Order "1" -- "many" OrderItem: contains
Order "1" -- "1" Payment: triggers

Inventory "1" -- "1" MenuItem: tracks stock

@enduml
```

---

## 5. Service Architecture & Dependencies Diagram

```plantuml
@startuml Service_Dependencies
skinparam componentBackgroundColor #e1f5ff
skinparam componentBorderColor #01579b

package "Core Services" {
  component [Auth Service] as Auth {
    - JWT Generation
    - OTP Management
    - Session Management
  }
  
  component [Menu Service] as Menu {
    - Menu Browsing
    - Category Management
    - Item Availability
  }
  
  component [Order Service] as Order {
    - Order Creation
    - Status Management
    - Order History
  }
}

package "Business Services" {
  component [Payment Service] as Payment {
    - Razorpay Integration
    - Cash Handling
    - Payment Tracking
  }
  
  component [Inventory Service] as Inventory {
    - Stock Management
    - Low Stock Alerts
    - Deduction on Order
  }
  
  component [Discount Engine] as Discount {
    - Pricing Rules
    - ML Predictions
    - Promotion Logic
  }
}

package "Supporting Services" {
  component [Notification Service] as Notif {
    - SMS/Email Alerts
    - Order Updates
    - Real-time WebSocket
  }
  
  component [Analytics Service] as Analytics {
    - Metrics Collection
    - Trend Analysis
    - Reporting
  }
}

package "ML & Intelligence" {
  component [ML Service] as ML {
    - Discount Prediction
    - Demand Forecasting
    - Anomaly Detection
  }
}

' Dependencies
Auth --|> Auth: exports JwtGuard\nTenantGuard\nSharedAuthModule

Order --> Auth: uses JwtGuard\nTenantGuard
Order --> Menu: verifies items
Order --> Inventory: reserves stock
Order ..> Discount: queries discount
Order ..> Kafka: publishes\norder.created\norder.status_changed

Payment --> Auth: uses JwtGuard\nTenantGuard
Payment ..> Kafka: publishes\npayment.completed

Inventory --> Auth: uses JwtGuard
Inventory ..> Kafka: publishes\ninventory.low_stock\nconumes order.created

Menu --> Auth: uses JwtGuard
Menu --> Redis: caches menu

Discount --> ML: calls for predictions
Discount --> Auth: uses JwtGuard

Notif ..> Kafka: consumes all events
Notif --> Auth: uses JwtGuard

Analytics ..> Kafka: consumes all events
Analytics --> Auth: uses JwtGuard

' External Dependencies
Payment --> Razorpay: webhook\nverification

Auth --> Redis: session storage\nOTP cache

Auth --> SMS: Twilio/SNS

Order --> DB: persistence
Payment --> DB: persistence
Inventory --> DB: persistence
Menu --> DB: persistence
Analytics --> DB: aggregation

@enduml
```

---

## 6. Authentication & Authorization Flow Diagram

```plantuml
@startuml Auth_Authorization_Flow
actor Customer
actor Staff
participant "Frontend" as FE
participant "API Gateway" as Gateway
participant "Auth Service" as Auth
database "PostgreSQL" as DB
database "Redis" as Redis
participant "Protected Service" as Service

== Customer Authentication ==
Customer ->> FE: 1. Scans QR (contains tenant_id)
FE ->> Auth: 2. POST /api/auth/customer/request-otp\n{phone, tenant_id}
Auth ->> Redis: Generate OTP\nkey: otp:{phone}\nvalue: hash\nTTL: 5min
Auth ->> SMS: Send "Your OTP is 123456"

Customer ->> FE: 3. Enter OTP
FE ->> Auth: 4. POST /api/auth/customer/verify-otp\n{phone, otp}
Auth ->> Redis: Verify OTP hash
Auth ->> DB: Fetch/Create Customer\ninsert if new
Auth ->> Auth: Generate JWT\npayload: {\n  sub: customer_id,\n  type: 'customer',\n  phone: '9876543210'\n}
Auth -->> FE: 5. JWT Token\n(8hr expiry)

FE ->> Redis: Store token locally

== Customer Making Request ==
Customer ->> FE: 6. Create Order
FE ->> FE: Extract tenant_id from QR URL
FE ->> Gateway: 7. POST /api/orders\nHeader: Authorization: Bearer JWT\nQuery: ?tenant_id=...
Gateway ->> Service: Forward with headers
Service ->> JwtGuard: Verify token
JwtGuard ->> Auth: Verify JWT signature
Auth -->> JwtGuard: ✓ Valid\npayload: {sub, type, phone}
JwtGuard ->> Service: request.user = payload

Service ->> TenantGuard: Validate tenant_id
TenantGuard ->> TenantGuard: Check request.user.tenant_id\n(customer has none)\nCheck query: ?tenant_id=X\n(customer provides)\nMatch succeeds ✓
TenantGuard ->> Service: request.tenant_id = X
Service ->> DB: Query WHERE tenant_id = X\nAND ... (filters by tenant)
Service -->> FE: Order created ✓

== Staff Authentication ==
Staff ->> FE: 1. Open Staff App
FE ->> Auth: 2. POST /api/auth/staff/login\n{username, password, tenant_id}
Auth ->> DB: SELECT user WHERE username, tenant_id
Auth ->> Auth: Verify password hash
Auth ->> Auth: Generate JWT\npayload: {\n  sub: user_id,\n  type: 'staff',\n  tenant_id: '...',\n  role: 'MANAGER'\n}
Auth -->> FE: 3. JWT Token\n(8hr expiry)

FE ->> Redis: Store token

== Staff Making Request ==
Staff ->> FE: 4. Update order status
FE ->> Gateway: 5. PATCH /api/orders/{id}/status\nHeader: Authorization: Bearer JWT\nQuery: ?tenant_id=... (optional for staff)
Gateway ->> Service: Forward
Service ->> JwtGuard: Verify token
JwtGuard ->> Auth: Verify JWT
Auth -->> JwtGuard: ✓ Valid\npayload: {sub, type, tenant_id, role}

JwtGuard ->> Service: request.user = payload

Service ->> TenantGuard: Validate tenant_id
TenantGuard ->> TenantGuard: Check request.user.tenant_id\n(staff has it in JWT)\nExtract = '...'
TenantGuard ->> Service: request.tenant_id = ...\nfrom token

Service ->> RolesGuard: Verify role\nRequired: 'staff'\nUser role: 'MANAGER'\nResult: ✓ Allowed
RolesGuard ->> Service: ✓ Access granted

Service ->> DB: Query WHERE\nid = {id}\nAND tenant_id = request.tenant_id\nAND ... (staff can only update own tenant)
Service -->> FE: Order status updated ✓

@enduml
```

---

## 7. Kafka Event-Driven Architecture Diagram

```plantuml
@startuml Kafka_Events
skinparam componentBackgroundColor #fff3e0
skinparam componentBorderColor #e65100

participant "Order Service" as Order
participant "Payment Service" as Payment
participant "Inventory Service" as Inventory
participant "Kafka Broker" as Kafka
participant "Notification Service" as Notif
participant "Analytics Service" as Analytics

== Order Created Event ==
Order ->> Kafka: Publish: "order.created"\n{\n  event: "order.created",\n  order_id: "ord-123",\n  tenant_id: "t-1",\n  items: [...],\n  total: 450.50,\n  timestamp\n}

Kafka ->> Notif: Consumer group: "notif-group"\noffset: latest
Notif ->> Notif: Process order.created\nSend SMS: "Order received!"

Kafka ->> Analytics: Consumer group: "analytics-group"
Analytics ->> Analytics: Record sale metric\nIncrement order count

Kafka ->> Inventory: Consumer group: "inventory-group"\noffset: latest
Inventory ->> Inventory: Reserve stock\nfor order items

== Payment Completed Event ==
Payment ->> Kafka: Publish: "payment.completed"\n{\n  event: "payment.completed",\n  payment_id: "pay-123",\n  order_id: "ord-123",\n  amount: 450.50,\n  method: "razorpay",\n  timestamp\n}

Kafka ->> Order: Consumer group: "order-group"
Order ->> Order: Update order status = COMPLETED

Kafka ->> Analytics: Consumer group: "analytics-group"
Analytics ->> Analytics: Record revenue\nIncrement total_amount

Kafka ->> Notif: Consumer group: "notif-group"
Notif ->> Notif: Send SMS: "Payment received!"

== Low Stock Alert ==
Inventory ->> Kafka: Publish: "inventory.low_stock"\n{\n  event: "inventory.low_stock",\n  item_name: "Paneer",\n  quantity: 2.5,\n  reorder_level: 5.0,\n  tenant_id: "t-1"\n}

Kafka ->> Notif: Consumer group: "notif-group"
Notif ->> Notif: Send SMS to Manager\n"⚠️ Paneer low: 2.5kg"

Kafka ->> Analytics: Consumer group: "analytics-group"
Analytics ->> Analytics: Log inventory alert\nfor reporting

@enduml
```

---

## 8. Database Schema Relationship Diagram

```plantuml
@startuml Database_Schema
entity Tenant {
  *id : UUID [PK]
  --
  name : String
  email : String
  owner_email : String
  is_active : Boolean
  created_at : DateTime
  updated_at : DateTime
}

entity User {
  *id : UUID [PK]
  --
  tenant_id : UUID [FK → Tenant]
  username : String [UNIQUE]
  email : String [UNIQUE]
  password_hash : String
  role : Enum
  is_active : Boolean
  created_at : DateTime
}

entity Customer {
  *id : UUID [PK]
  --
  phone_number : String [UNIQUE]
  name : String
  email : String
  total_orders : Int
  total_spent : Decimal
  created_at : DateTime
}

entity Table {
  *id : UUID [PK]
  --
  tenant_id : UUID [FK → Tenant]
  table_number : Int
  capacity : Int
  qr_code_url : String
  is_active : Boolean
}

entity MenuCategory {
  *id : String [PK]
  --
  tenant_id : UUID [FK → Tenant]
  name : String
  display_order : Int
}

entity MenuItem {
  *id : UUID [PK]
  --
  tenant_id : UUID [FK → Tenant]
  category_id : String [FK → MenuCategory]
  name : String
  price : Decimal
  cost_price : Decimal
  discount_percentage : Decimal
  is_available : Boolean
  prep_time_minutes : Int
  image_url : String
}

entity Order {
  *id : UUID [PK]
  --
  tenant_id : UUID [FK → Tenant]
  customer_id : UUID [FK → Customer]
  table_id : UUID [FK → Table]
  status : Enum
  subtotal : Decimal
  tax : Decimal
  discount : Decimal
  total_amount : Decimal
  created_at : DateTime
  completed_at : DateTime
}

entity OrderItem {
  *id : UUID [PK]
  --
  order_id : UUID [FK → Order]
  menu_item_id : UUID [FK → MenuItem]
  quantity : Int
  unit_price : Decimal
  subtotal : Decimal
}

entity Payment {
  *id : UUID [PK]
  --
  tenant_id : UUID [FK → Tenant]
  order_id : UUID [FK → Order]
  method : Enum
  amount : Decimal
  status : Enum
  razorpay_order_id : String
  razorpay_payment_id : String
  created_at : DateTime
}

entity Inventory {
  *id : UUID [PK]
  --
  tenant_id : UUID [FK → Tenant]
  item_name : String
  quantity : Decimal
  unit : String
  reorder_level : Decimal
  cost_price : Decimal
  expiry_date : DateTime
}

entity OTPVerification {
  *id : UUID [PK]
  --
  phone_number : String
  otp_hash : String
  expires_at : DateTime
  attempts : Int
  verified_at : DateTime
}

' Relationships
Tenant ||--o{ User: "has users"
Tenant ||--o{ Table: "has tables"
Tenant ||--o{ MenuCategory: "has categories"
Tenant ||--o{ MenuItem: "has menu items"
Tenant ||--o{ Order: "receives orders"
Tenant ||--o{ Payment: "processes payments"
Tenant ||--o{ Inventory: "manages stock"

MenuCategory ||--o{ MenuItem: "contains items"

Customer ||--o{ Order: "places orders"
Table ||--o{ Order: "serves orders"

Order ||--o{ OrderItem: "contains items"
MenuItem ||--o{ OrderItem: "in order items"

Order ||--|| Payment: "triggers payment"

@enduml
```

---

## Key Architectural Insights

### Multi-Tenancy Pattern
- **Tenant ID enforcement**: Every table, query, and operation is filtered by `tenant_id`
- **Data isolation**: Complete separation at application layer (not database level)
- **Staff vs. Customer**: Staff JWT contains `tenant_id`; customers pass it in request

### Authentication Strategy
```
┌─────────────────────────────────────────┐
│       Customer Authentication           │
├─────────────────────────────────────────┤
│ 1. Scan QR → Extract tenant_id from URL │
│ 2. Request OTP via phone                │
│ 3. Verify OTP → Get JWT (no tenant_id)  │
│ 4. Include tenant_id in subsequent reqs │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│        Staff Authentication             │
├─────────────────────────────────────────┤
│ 1. Login with username/password         │
│ 2. Specify tenant_id (for multi-tenant) │
│ 3. Verify credentials against DB        │
│ 4. Get JWT with tenant_id + role claim  │
│ 5. Tenant_id auto-extracted from JWT    │
└─────────────────────────────────────────┘
```

### Event-Driven Decoupling
- Services don't call each other directly
- All cross-service communication via Kafka topics
- Loose coupling enables independent scaling

### Guard & Middleware Chain
```
Request → JwtGuard (verify token) → TenantGuard (validate tenant_id) 
  → RolesGuard (check permissions) → Service Logic
```

---

## Rendering These Diagrams

**Option 1: Online PlantUML Viewer**
- Visit: http://www.plantuml.com/plantuml/uml/
- Paste the PlantUML code above

**Option 2: VS Code PlantUML Extension**
- Install: `jebbs.plantuml`
- Open this file and right-click → Show PlantUML Preview

**Option 3: Local PlantUML CLI**
```bash
sudo apt-get install plantuml
plantuml -o /tmp DOCUMENTATION/UML_DIAGRAMS.md
```

**Option 4: Generate as SVG/PNG**
```bash
plantuml -tsvg DOCUMENTATION/UML_DIAGRAMS.md
```

---

**Generated**: November 6, 2025  
**Last Updated**: November 6, 2025  
**Format**: PlantUML (ASCII UML - version control friendly)
