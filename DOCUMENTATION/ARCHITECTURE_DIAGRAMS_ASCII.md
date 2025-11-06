# IntelliDine — Architecture & Class Diagrams (ASCII & Reference)

Quick visual reference for IntelliDine's system design. For detailed PlantUML diagrams, see `DOCUMENTATION/UML_DIAGRAMS.md`.

---

## 1. System Component Diagram (High Level)

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLIENT APPLICATIONS                          │
│  ┌────────────────────┐              ┌─────────────────────┐   │
│  │ Customer Phone App │              │  Staff KDS (Browser)│   │
│  │ (Mobile Web)       │              │  (Kitchen Display)  │   │
│  └────────┬───────────┘              └──────────┬──────────┘   │
└───────────┼──────────────────────────────────────┼────────────────┘
            │                                      │
            │ JWT Token + tenant_id (query)        │ JWT Token + tenant_id (from token)
            │                                      │
┌───────────▼──────────────────────────────────────▼────────────────┐
│                     API GATEWAY (3100)                             │
│    Routes requests to appropriate microservice based on path      │
└───────────┬──────────────────────────────────────────────────────┘
            │
    ┌───────┼────────────┬────────────┬────────────┬──────────┬────────┐
    │       │            │            │            │          │        │
    ▼       ▼            ▼            ▼            ▼          ▼        ▼
┌──────┐┌──────┐┌──────┐┌──────┐┌──────────┐┌──────────┐┌─────────┐┌────┐
│Auth  ││Menu  ││Order ││Payment││Inventory ││Discount ││Analytics││Notif│
│3101  ││3103  ││3102  ││3105   ││3104      ││3108     ││3107     ││3106 │
└──┬───┘└──┬───┘└──┬───┘└──┬───┘└───┬──────┘└───┬─────┘└────┬────┘└──┬──┘
   │       │       │       │        │           │          │         │
   │       │       │       │        │           │          │         │
   └───────┴───────┴───────┴────────┼───────────┴──────────┴─────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
   ┌─────────┐                 ┌────────┐                 ┌──────────┐
   │PostgreSQL│                 │ Redis  │                 │  Kafka   │
   │(5432)    │                 │(6379)  │                 │ (9092)   │
   └─────────┘                 └────────┘                 └──────────┘
        ▲                           ▲                           │
        │ Persistent Data           │ Sessions & Cache          │ Event Stream
        │ Multi-tenant Queries      │ OTP, JWT Validation       │ order.created
        │                           │                           │ payment.completed
        │                           │                           │ inventory.low_stock
```

---

## 2. Authentication Flow — Customer vs Staff

```
╔════════════════════════════════════════════════════════════════╗
║              CUSTOMER AUTHENTICATION (OTP-Based)              ║
╚════════════════════════════════════════════════════════════════╝

   Customer                Frontend                Auth Service
       │                     │                           │
       │  Scans QR           │                           │
       ├────────────────────►│                           │
       │  (URL contains      │  POST /api/auth/          │
       │   tenant_id)        │  customer/request-otp     │
       │                     ├──────────────────────────►│
       │                     │  {phone, tenant_id}       │
       │                     │                           │
       │                     │  ◀─ OTP sent via SMS ──┐  │
       │                     │                         │  │
       │  Receives SMS       │◀────────────────────────┘  │
       │◄────────────────────┤                           │
       │  with OTP           │                           │
       │                     │                           │
       │  Enters OTP (123456)│                           │
       ├────────────────────►│                           │
       │                     │  POST /api/auth/          │
       │                     │  customer/verify-otp      │
       │                     ├──────────────────────────►│
       │                     │  {phone, otp}             │
       │                     │                           │
       │                     │◀─ JWT Token ─────────────┤
       │◄────────────────────┤  (no tenant_id in JWT)    │
       │  Stores JWT         │                           │
       │                     │                           │
       │ Makes Request       │                           │
       │ /api/orders         │                           │
       ├────────────────────►│                           │
       │  ?tenant_id=X       │  + Authorization header   │
       │  (from QR URL)      ├──────────────────────────►│
       │                     │                           │
       │                     │◀─ Order Created ──────────┤
       │◄────────────────────┤                           │
       │  Order confirmation │                           │

╔════════════════════════════════════════════════════════════════╗
║            STAFF AUTHENTICATION (Username/Password)           ║
╚════════════════════════════════════════════════════════════════╝

   Staff                   Frontend                Auth Service
      │                      │                           │
      │  Opens Staff App     │                           │
      ├─────────────────────►│                           │
      │                      │  POST /api/auth/          │
      │                      │  staff/login              │
      │                      ├──────────────────────────►│
      │                      │  {username, password,     │
      │                      │   tenant_id}              │
      │                      │                           │
      │                      │  Verify credentials       │
      │                      │  Check roles in DB        │
      │                      │                           │
      │                      │◀─ JWT Token ─────────────┤
      │◄─────────────────────┤  (with tenant_id, role)   │
      │  Stores JWT          │                           │
      │                      │                           │
      │ Makes Request        │                           │
      │ /api/orders          │                           │
      ├─────────────────────►│                           │
      │  (tenant_id auto-    │  + Authorization header   │
      │   extracted from JWT)├──────────────────────────►│
      │                      │                           │
      │                      │◀─ List Orders ────────────┤
      │◄─────────────────────┤  (all orders for tenant)   │
      │  Kitchen Display     │                           │
```

---

## 3. Order Creation Sequence Flow

```
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│ Customer │   │ Frontend │   │ API Gw   │   │ Services │   │Database  │
└─────┬────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘
      │             │              │              │              │
      │ Scan QR     │              │              │              │
      ├────────────►│              │              │              │
      │ (extract    │              │              │              │
      │  tenant_id) │              │              │              │
      │             │              │              │              │
      │             │ GET /api/    │              │              │
      │             │ menu/items   │              │              │
      │             ├─────────────►│              │              │
      │             │              │ Route to    │              │
      │             │              │ Menu Service│              │
      │             │              ├────────────►│              │
      │             │              │             │ WHERE        │
      │             │              │             │ tenant_id=X  │
      │             │              │             ├─────────────►│
      │             │              │             │◄─────────────┤
      │             │              │◄────────────┤ Menu Items   │
      │             │◄─────────────┤              │              │
      │◄────────────┤ [Items]      │              │              │
      │             │              │              │              │
      │ Select Items│              │              │              │
      │ & Add Cart  │              │              │              │
      ├────────────►│              │              │              │
      │             │              │              │              │
      │             │ POST /api/   │              │              │
      │             │ orders       │              │              │
      │             │ ?tenant_id=X │              │              │
      │             ├─────────────►│              │              │
      │             │ {items: [..]}│ Route to    │              │
      │             │ Bearer JWT   │ Order Service              │
      │             │              ├────────────►│              │
      │             │              │             │ Verify items │
      │             │              │             │ (Menu Svc)   │
      │             │              │             │ Calculate    │
      │             │              │             │ totals       │
      │             │              │             ├─────────────►│
      │             │              │             │ INSERT order │
      │             │              │             │◄─────────────┤
      │             │              │             │ Kafka:      │
      │             │              │             │ order.created
      │             │              │◄────────────┤              │
      │             │◄─────────────┤ Order ID    │              │
      │◄────────────┤ Order        │ Total       │              │
      │ Confirm     │ Confirmation │ Status      │              │
      │ Order ID    │              │             │              │
      │ Display ETA │              │             │              │
```

---

## 4. Core Entity Relationships (Simplified Class Diagram)

```
┌─────────────────────────────────────────────────────────────────┐
│                        TENANT (Restaurant)                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ - id: UUID                                                 │ │
│  │ - name: String (e.g., "Spice Route")                       │ │
│  │ - owner_email: String                                      │ │
│  │ - is_active: Boolean                                       │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
         │
         ├─────────────────────┬─────────────────────┬────────────┐
         │                     │                     │            │
         ▼                     ▼                     ▼            ▼
    ┌─────────┐        ┌──────────┐        ┌───────────┐    ┌──────┐
    │ User    │        │ Table    │        │ MenuItem  │    │Order │
    ├─────────┤        ├──────────┤        ├───────────┤    ├──────┤
    │ id: UUID│        │ id: UUID │        │ id: UUID  │    │ id   │
    │username │        │ table_#  │        │ name      │    │tenant│
    │password │        │ capacity │        │ price     │    │cust  │
    │ role    │        │ QR code  │        │ available │    │items │
    │tenant_id│        │tenant_id │        │tenant_id  │    │total │
    └─────────┘        └──────────┘        └───────────┘    │status│
         │                   │                    │          └──────┘
         │                   │                    │               │
         │                   │                    │               ▼
         │                   │                    │          ┌─────────┐
         │                   │                    │          │OrderItem│
         │                   │                    │          ├─────────┤
         │                   │                    │          │order_id │
         │                   │                    └──────────┤menu_item│
         │                   │                               │quantity │
         │                   │                               │ price   │
         │                   │                               └─────────┘
         │                   │
         │                   └──────────────┬──────────────────┐
         │                                  │                  │
         │                                  ▼                  ▼
         │                          ┌─────────────┐     ┌──────────┐
         │                          │ Payment     │     │Inventory │
         │                          ├─────────────┤     ├──────────┤
         │                          │ id: UUID    │     │ id: UUID │
         │                          │ order_id    │     │ item_name│
         │                          │ amount      │     │ quantity │
         │                          │ method      │     │ reorder  │
         │                          │ status      │     │ tenant_id│
         │                          │ tenant_id   │     └──────────┘
         │                          └─────────────┘
         │
         └──────────────────────┐
                                ▼
                        ┌──────────────────┐
                        │ OTPVerification  │
                        ├──────────────────┤
                        │ phone_number     │
                        │ otp_hash         │
                        │ expires_at       │
                        │ attempts         │
                        └──────────────────┘

┌─────────────────────────────────────────────┐
│        Global (Not Tenant-Specific)         │
├─────────────────────────────────────────────┤
│ CUSTOMER                                    │
│  ├─ id: UUID                                │
│  ├─ phone_number: String [UNIQUE]           │
│  ├─ name: String                            │
│  ├─ total_orders: Int                       │
│  └─ total_spent: Decimal                    │
└─────────────────────────────────────────────┘
```

---

## 5. Data Flow: Order Lifecycle State Machine

```
                        ┌───────────────┐
                        │   PENDING     │
                        │ (Order Created)
                        └───────┬───────┘
                                │
                                │ Staff marks "Start Cooking"
                                ▼
                        ┌───────────────┐
                        │  PREPARING    │
                        │(Being Cooked) │
                        └───────┬───────┘
                                │
                                │ Staff marks "Ready to Serve"
                                ▼
                        ┌───────────────┐
                        │    READY      │
                        │ (At Counter)  │
                        └───────┬───────┘
                                │
                                │ Staff delivers to table
                                ▼
                        ┌───────────────┐
                        │    SERVED     │
                        │(On Table)     │
                        └───────┬───────┘
                                │
                                │ Customer/Staff marks "Completed"
                                ▼
                        ┌───────────────┐
                        │  COMPLETED    │ ◄──────┐
                        │ (Paid & Done) │        │
                        └───────────────┘        │
                                                 │
                  Any State ─────────────────────┘
                        │
                        │ Cancel Request
                        ▼
                  ┌───────────────┐
                  │  CANCELLED    │
                  │  (Not Served) │
                  └───────────────┘

Events Published per State Change:
- order.created          (PENDING)
- order.status_changed   (→ PREPARING, READY, SERVED)
- order.completed        (→ COMPLETED)
- order.cancelled        (→ CANCELLED)
```

---

## 6. Multi-Tenancy Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Single PostgreSQL Database                   │
│                        (intellidine)                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────┐  ┌──────────────────────┐             │
│  │   Tenant A (t-1)     │  │   Tenant B (t-2)     │             │
│  │  (Spice Route)       │  │  (Biryani House)     │             │
│  ├──────────────────────┤  ├──────────────────────┤             │
│  │ Users (3)            │  │ Users (2)            │             │
│  │ ├─ manager1          │  │ ├─ manager_b1        │             │
│  │ ├─ kitchen_staff1    │  │ └─ waiter_b1         │             │
│  │ └─ waiter1           │  │                      │             │
│  │                      │  │                      │             │
│  │ MenuItems (12)       │  │ MenuItems (8)        │             │
│  │ ├─ Paneer Tikka      │  │ ├─ Biryani (Chicken)│             │
│  │ ├─ Butter Chicken    │  │ ├─ Biryani (Mutton) │             │
│  │ └─ ...               │  │ └─ ...               │             │
│  │                      │  │                      │             │
│  │ Orders (142 today)   │  │ Orders (87 today)    │             │
│  │ ├─ ord-1 [COMPLETED]│  │ ├─ ord-A [READY]     │             │
│  │ ├─ ord-2 [PREPARING]│  │ ├─ ord-B [PENDING]   │             │
│  │ └─ ...               │  │ └─ ...               │             │
│  │                      │  │                      │             │
│  │ Payments (₹18,540)   │  │ Payments (₹11,250)   │             │
│  │                      │  │                      │             │
│  └──────────────────────┘  └──────────────────────┘             │
│                                                                  │
│  All Queries Include: WHERE tenant_id = 't-1' or 't-2'          │
│  No Cross-Tenant Data Leakage                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

Example Query:
```sql
SELECT * FROM orders 
WHERE tenant_id = 't-1'    -- ← ALWAYS included
AND status = 'PENDING'
AND created_at > NOW() - INTERVAL '1 day';
```

Staff JWT Token: 
{
  "sub": "user-id-xyz",
  "type": "staff",
  "tenant_id": "t-1",        -- ← Embedded in token
  "role": "MANAGER",
  "exp": 1729696800
}

Customer JWT Token:
{
  "sub": "customer-id-abc",
  "type": "customer",
  "phone": "9876543210"
  -- NO tenant_id in JWT
  -- Must pass in request: ?tenant_id=t-1
}
```

---

## 7. Request Flow with Guards & Middleware

```
Incoming Request
    │
    │ POST /api/orders?tenant_id=X
    │ Header: Authorization: Bearer <JWT>
    │
    ▼
┌──────────────────────────────────────────┐
│         API Gateway                      │
│  ├─ Route to correct service             │
│  └─ Maintain headers & auth info         │
└──────────────────────┬───────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────┐
│        Order Service Middleware           │
│  ├─ Parse JWT from Authorization header  │
│  └─ Attach to request.user                │
└──────────────────────┬───────────────────┘
                       │
                       ▼
                  ┌────────────────────┐
                  │   JwtGuard         │
                  ├────────────────────┤
                  │ Verify JWT token:  │
                  │ ├─ Check signature │
                  │ ├─ Verify expiry   │
                  │ └─ Extract payload │
                  │                    │
                  │ request.user = {   │
                  │   sub: "id",       │
                  │   type: "customer",│
                  │   phone: "..."     │
                  │ }                  │
                  │                    │
                  │ Pass? ✓ Continue   │
                  │ Fail?  ✗ 401 Unauth│
                  └────────┬───────────┘
                           │
                           ▼
                  ┌────────────────────┐
                  │   TenantGuard      │
                  ├────────────────────┤
                  │ Extract tenant_id: │
                  │ 1. From JWT        │
                  │    (if staff)      │
                  │ 2. From query      │
                  │    (if customer)   │
                  │ 3. From body       │
                  │                    │
                  │ request.tenant_id  │
                  │   = extracted_id   │
                  │                    │
                  │ Match? ✓ Continue  │
                  │ Mismatch? ✗ 403    │
                  └────────┬───────────┘
                           │
                           ▼
                  ┌────────────────────┐
                  │  RolesGuard        │
                  ├────────────────────┤
                  │ (for protected     │
                  │  endpoints)        │
                  │                    │
                  │ Check request.user │
                  │ .role matches      │
                  │ @RequireRole()     │
                  │                    │
                  │ Allowed? ✓ Continue│
                  │ Denied?  ✗ 403     │
                  └────────┬───────────┘
                           │
                           ▼
                  ┌────────────────────┐
                  │  Service Handler   │
                  │  (createOrder)     │
                  │                    │
                  │ Access validated   │
                  │ Execute business   │
                  │ logic              │
                  │                    │
                  │ Query DB with:     │
                  │ WHERE tenant_id =  │
                  │ request.tenant_id  │
                  └────────┬───────────┘
                           │
                           ▼
                    Response (200 OK)
```

---

## 8. Authentication Tokens at a Glance

```
┌─────────────────────────────────────────────────────────────┐
│             JWT Token Structure (Header.Payload.Signature)  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  HEADER:                                                     │
│  {                                                           │
│    "alg": "HS256",     -- HMAC SHA-256 signature algorithm   │
│    "typ": "JWT"        -- Token type                         │
│  }                                                           │
│                                                              │
│  PAYLOAD (Customer):                                         │
│  {                                                           │
│    "sub": "cust-123",  -- Subject (Customer ID)              │
│    "type": "customer", -- User type                          │
│    "phone": "987654321",                                     │
│    "iat": 1699262400,  -- Issued at (Unix timestamp)        │
│    "exp": 1699348800   -- Expires in 8 hours                │
│  }                                                           │
│                                                              │
│  PAYLOAD (Staff):                                            │
│  {                                                           │
│    "sub": "user-456",  -- Subject (User ID)                  │
│    "type": "staff",    -- User type                          │
│    "tenant_id": "t-1", -- ← STAFF HAS THIS                   │
│    "role": "MANAGER",  -- Role (MANAGER|KITCHEN|WAITER)     │
│    "iat": 1699262400,                                        │
│    "exp": 1699348800                                         │
│  }                                                           │
│                                                              │
│  SIGNATURE:                                                  │
│  HMACSHA256(                                                 │
│    base64Url(header) + "." +                                 │
│    base64Url(payload),                                       │
│    "JWT_SECRET"        -- From environment variable          │
│  )                                                           │
│                                                              │
│  Full Token:                                                 │
│  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.                      │
│  eyJzdWIiOiI0NTYiLCJ0eXBlIjoic3RhZmYiLCJ0ZW5hbnRfaWQiOi  │
│  J0LTEiLCJyb2xlIjoiTUFOQUdFUiJ9.                             │
│  SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c               │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Request Headers                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Customer Request:                                           │
│  ├─ Authorization: Bearer <JWT_TOKEN>                       │
│  ├─ Content-Type: application/json                          │
│  └─ X-Tenant-ID: ← Optional (not required)                  │
│                                                              │
│  Query/Body:                                                 │
│  └─ tenant_id: "t-1" ← REQUIRED for customers               │
│                                                              │
│  Staff Request:                                              │
│  ├─ Authorization: Bearer <JWT_TOKEN_WITH_TENANT>          │
│  ├─ Content-Type: application/json                          │
│  └─ (tenant_id extracted from JWT)                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## How to Use These Diagrams

### For PlantUML Rendering:
1. Copy any diagram code block (between \`\`\`plantuml ... \`\`\`)
2. Paste at: http://www.plantuml.com/plantuml/uml/
3. See rendered diagram

### For ASCII Diagrams:
- Use in README.md, documentation, or terminal display
- Copy/paste ASCII boxes as-is

---

**Document Version**: 1.0  
**Last Updated**: November 6, 2025  
**Format**: PlantUML + ASCII Diagrams
