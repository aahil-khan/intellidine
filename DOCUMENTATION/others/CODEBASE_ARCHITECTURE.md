# IntelliDine Codebase Architecture & Deep Dive

**Version**: 1.0  
**Last Updated**: October 2025  
**Status**: Production Ready

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [System Architecture](#system-architecture)
3. [Microservices Overview](#microservices-overview)
4. [Communication Patterns](#communication-patterns)
5. [Authentication & Authorization](#authentication--authorization)
6. [Database Architecture](#database-architecture)
7. [Event-Driven Architecture](#event-driven-architecture)
8. [Multi-Tenancy Implementation](#multi-tenancy-implementation)
9. [Monitoring & Observability](#monitoring--observability)
10. [Deployment Architecture](#deployment-architecture)
11. [API Gateway](#api-gateway)
12. [Performance & Scaling](#performance--scaling)

---

## Tech Stack

### Backend
- **Runtime**: Node.js 20 (Alpine Linux)
- **Framework**: NestJS 10 (TypeScript-first)
- **Database**: PostgreSQL 15 (Relational data)
- **Cache**: Redis 7 (Sessions, caching)
- **Message Queue**: Apache Kafka 7.5.0 (Event streaming)
- **ORM**: Prisma 5 (Database access & migrations)

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Reverse Proxy**: Nginx
- **Monitoring**: Prometheus + Grafana
- **Tunneling**: Cloudflare Tunnel (for production)

### Development & Testing
- **Language**: TypeScript 5
- **Testing**: Jest
- **Package Manager**: npm
- **Version Control**: Git

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend Applications                       │
│         (Web & Mobile - intellidine.aahil-khan.tech)           │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                    HTTPS / JWT Token
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│              API Gateway (intellidine-api.aahil-khan.tech)       │
│  - Single entry point for all requests                          │
│  - Request routing to backend services                          │
│  - Response wrapping & error handling                           │
│  - CORS handling                                                │
└──────────────────────────┬──────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┬─────────────────┐
        │                  │                  │                 │
        ▼                  ▼                  ▼                 ▼
    Auth Service      Menu Service      Order Service    Payment Service
    (Port 3101)       (Port 3103)        (Port 3102)      (Port 3105)
        │                  │                  │                 │
        └──────────────────┴──────────────────┴─────────────────┘
                           │
                    Shared PostgreSQL Database
                    (Tenant-Isolated Data)
                           │
        ┌──────────────────┼──────────────────┬─────────────────┐
        │                  │                  │                 │
        ▼                  ▼                  ▼                 ▼
   Inventory Svc    Notification Svc    Analytics Svc   Discount Engine
   (Port 3104)      (Port 3106)         (Port 3107)     (Port 3108)
        │                  │                  │
        │                  └──────────┬───────┘
        │                             │
        │                    Apache Kafka Queue
        │                    (Event Streaming)
        │                             │
        └─────────────────────────────┘

Cache & Sessions: Redis (Port 6379)
```

### Key Principles

1. **Single Entry Point**: All external requests go through API Gateway
2. **Service Isolation**: Each service has its own responsibility
3. **Shared Database**: Multi-tenancy enforced at application level
4. **Asynchronous Processing**: Kafka for non-blocking operations
5. **Scalability**: Services can be scaled independently

---

## Microservices Overview

### 1. **API Gateway** (Port 3100/3000)
**Responsibility**: Route all external requests to appropriate services

**Key Features**:
- Request routing based on path patterns
- Response wrapping in consistent format
- CORS handling
- Health check aggregation
- Route listing endpoint

**Routing Rules**:
```
GET  /health              → Aggregate health from all services
GET  /routes              → List all available routes
POST /api/auth/*          → Auth Service
GET  /api/menu/*          → Menu Service
POST /api/orders/*        → Order Service
GET  /api/payments/*      → Payment Service
GET  /api/inventory/*     → Inventory Service
POST /api/notifications/* → Notification Service
GET  /api/analytics/*     → Analytics Service
POST /api/discounts/*     → Discount Engine
```

**Ports Mapping**:
- Gateway: 3000 (localhost) / 3100 (Docker)
- Production: `intellidine-api.aahil-khan.tech`

---

### 2. **Auth Service** (Port 3101)
**Responsibility**: Customer authentication, staff login, JWT token generation

**Authentication Flows**:

#### Customer OTP Flow
```
1. Request OTP
   POST /api/auth/customer/request-otp
   Body: { phone: "9876543210", tenant_id: "11111111-..." }
   Response: { message: "OTP sent", expires_at: "2025-10-22T10:00:00Z" }

2. Verify OTP
   POST /api/auth/customer/verify-otp
   Body: { phone: "9876543210", otp: "123456", tenant_id: "11111111-..." }
   Response: { 
     access_token: "eyJhbGc...", 
     expires_at: "2025-10-22T18:00:00Z",
     user: { id: "...", phone_number: "9876543210" }
   }
```

#### Staff Login Flow
```
POST /api/auth/staff/login
Body: { username: "manager1", password: "Password@123", tenant_id: "11111111-..." }
Response: { 
  access_token: "eyJhbGc...", 
  expires_at: "2025-10-22T18:00:00Z",
  user: { id: "...", username: "manager1", email: "...", role: "MANAGER" }
}
```

**Pre-seeded Staff Users** ✅:
- Username: `manager1` | Password: `Password@123` | Role: `MANAGER`
- Username: `kitchen_staff1` | Password: `Password@123` | Role: `KITCHEN_STAFF`
- Username: `waiter1` | Password: `Password@123` | Role: `WAITER`
- All linked to tenant: `11111111-1111-1111-1111-111111111111` (Spice Route)

**Key Components**:
- OTP Service: Generates, stores, verifies OTPs via MSG91
- JWT Utils: Token generation (8hr expiry)
- Password Hashing: bcrypt with salt rounds
- Session Management: Redis-based token validation

**Database**:
- `customers` table: phone_number (unique)
- `users` table: username, email, role, password_hash
- `otp_verifications` table: phone_number, otp_hash, expires_at

---

### 3. **Menu Service** (Port 3103)
**Responsibility**: Menu item management, categories, availability

**Key Operations**:
- Get menu items (paginated)
- Get single item details
- Create menu item
- Update price/availability
- Delete menu item (soft delete)
- Filter by category

**Database**:
- `categories` table: name, display_order
- `menu_items` table: tenant_id, category_id, name, price, cost_price, discount_percentage, is_available

**Key Features**:
- Multi-tenant isolation (tenant_id in all queries)
- Soft deletes for audit trail
- Redis caching for menu lists
- Price history tracking

---

### 4. **Order Service** (Port 3102)
**Responsibility**: Order creation, status management, order history

**Order Workflow**:
```
1. Create Order
   Items selected → Calculate total → Create order record
   Status: "pending"

2. Payment Processing
   Order → Payment Service → Order status: "paid"

3. Kitchen Preparation
   Status: "preparing"

4. Completion
   Status: "completed"

5. Cancellation (anytime before completion)
   Status: "cancelled"
```

**Database**:
- `orders` table: customer_id, table_id, status, total_amount, tax, discount
- `order_items` table: order_id, menu_item_id, quantity, price
- `order_status_history` table: audit trail

**Key Features**:
- Order status tracking
- Item-level pricing (captured at order time)
- Multi-tenant isolation
- Kafka event publishing (order created, completed)

---

### 5. **Payment Service** (Port 3105)
**Responsibility**: Payment processing via Razorpay & cash

**Payment Methods**:
- **Razorpay**: Online payment processing (UPI, cards, wallets)
- **Cash**: On-premise cash handling

**Razorpay Flow**:
```
1. Create Razorpay Order
   POST /api/payments/create-razorpay-order
   Body: { order_id, amount, tenant_id }
   Response: { razorpay_order_id, ... }

2. Client-side Payment (JavaScript SDK)
   Razorpay.open({ key, order_id, ... })

3. Verify Payment
   POST /api/payments/verify-razorpay
   Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
   Validates signature using Razorpay secret
```

**Database**:
- `payments` table: order_id, tenant_id, amount, method, status, razorpay_order_id, razorpay_payment_id

**Key Features**:
- Signature verification for Razorpay
- Kafka event publishing (payment succeeded/failed)
- Payment statistics API (daily revenue)

---

### 6. **Inventory Service** (Port 3104)
**Responsibility**: Stock management, reorder alerts, inventory tracking

**Key Features**:
- Stock quantity tracking
- Reorder level alerts
- Expiry date tracking
- Low stock notifications (via Kafka)

**Database**:
- `inventory` table: tenant_id, item_name, category, quantity, unit, reorder_level, cost_price, expiry_date

**Workflow**:
1. Create inventory item with reorder level
2. Update quantity as items are used
3. Trigger notification when below reorder level
4. Track expiry dates

---

### 7. **Notification Service** (Port 3106)
**Responsibility**: Real-time notifications via WebSocket + Kafka events

**Notification Types**:
- Order status updates
- Payment confirmations
- Inventory alerts
- Kitchen display system
- Customer notifications

**Technology Stack**:
- Socket.io for WebSocket connections
- Kafka consumer for events
- Redis for connection management

**Key Features**:
- Real-time message delivery
- Connection statistics
- Multi-room support (by tenant/kitchen/table)
- Automatic reconnection handling

---

### 8. **Analytics Service** (Port 3107)
**Responsibility**: Business metrics, trends, reporting

**Key Metrics**:
- Daily revenue
- Order count & trends
- Top selling items
- Peak hours
- Customer behavior patterns

**Database**:
- Aggregated views on orders, payments, menu items

**Key Features**:
- Time-series data
- Trend analysis
- Revenue forecasting (future)

---

### 9. **Discount Engine** (Port 3108)
**Responsibility**: Discount rule evaluation and application

**Discount Types**:
- Percentage-based (e.g., 10% off)
- Fixed amount (e.g., ₹50 off)
- Time-based (happy hour specials)
- Volume-based (buy 2 get discount)

**Evaluation**:
```
1. Receive order details
2. Match against discount rules
3. Calculate applicable discounts
4. Return discount amount & breakdown
```

**Database**:
- `pricing_rules` table: discount rules, conditions, percentage/amount

---

### 10. **ML Service** (Port 8000)
**Responsibility**: Predictive models for business intelligence

**Models** (Pending):
- Demand forecasting
- Customer churn prediction
- Menu recommendation
- Optimal pricing

**Technology**: Python with scikit-learn/TensorFlow

---

## Communication Patterns

### 1. **Synchronous (HTTP REST)**
**Used for**: Immediate responses required

**Pattern**:
```
Client → API Gateway → Service → Database → Response
         (routes)
```

**Examples**:
- Get menu items
- Create order
- Verify payment
- Update inventory

**Latency**: 10-100ms

---

### 2. **Asynchronous (Kafka)**
**Used for**: Non-blocking operations, event streaming

**Pattern**:
```
Service A publishes event to Kafka topic
                    ↓
        Kafka broker persists message
                    ↓
Service B, C, D consume and process event
```

**Events Published**:
1. **order.created** - New order placed
2. **order.completed** - Order ready/finished
3. **order.cancelled** - Order cancelled
4. **payment.succeeded** - Payment confirmed
5. **payment.failed** - Payment failed
6. **inventory.low_stock** - Stock below reorder level
7. **customer.created** - New customer registered

**Consumers**:
- Notification Service → Sends notifications
- Analytics Service → Records metrics
- Inventory Service → Updates stock
- Order Service → Updates order status

**Benefits**:
- Decoupled services
- Non-blocking operations
- Reliable event delivery
- Easy to add new consumers

---

### 3. **Session Management**
**Technology**: Redis

**Usage**:
```
Auth Service generates JWT → Stores in Redis (8 hours TTL)
Service validates token → Checks Redis
Token expires → Redis auto-deletes
```

**Keys**:
```
session:${userId}:${token}
```

---

## Authentication & Authorization

### JWT Structure
```
Header: {
  "alg": "HS256",
  "typ": "JWT"
}

Payload: {
  "userId": "customer_123",
  "role": "customer",
  "iat": 1697969280,
  "exp": 1697987280,  // 8 hours later
  "tenant_id": "11111111-1111-1111-1111-111111111111"
}

Signature: HMACSHA256(secret_key)
```

### Role-Based Access Control

**Roles**:
- `SUPER_ADMIN`: Full system access
- `MANAGER`: Restaurant management
- `KITCHEN_STAFF`: Order preparation
- `WAITER`: Table service
- `CUSTOMER`: Customer portal

**Guard Implementation**:
```typescript
@UseGuards(JwtGuard, RolesGuard)
@RequireRole('MANAGER')
async deleteMenuItem() {
  // Only managers can delete menu items
}
```

### Multi-Tenant Isolation

**Principle**: Every request includes `tenant_id` in:
1. JWT token (tenant_id claim)
2. X-Tenant-ID header
3. Request body

**Enforcement**:
```typescript
// Every query includes tenant_id filter
const items = await db.menu_items.findMany({
  where: {
    tenant_id: req.user.tenant_id,  // Always filtered by tenant
    is_deleted: false
  }
});
```

**Security**:
- Tenant cannot access another tenant's data
- Tenant_id validated at middleware level
- JWT signed with secret (cannot be forged)

---

## Database Architecture

### ER Diagram

```
Tenants
├─ id (PK, UUID)
├─ name
├─ contact
├─ owner_email
└─ is_active

  ├── Users (via tenant_id)
  │   ├─ id (PK, UUID)
  │   ├─ tenant_id (FK)
  │   ├─ username (UNIQUE)
  │   ├─ email (UNIQUE)
  │   ├─ password_hash
  │   ├─ role (ENUM)
  │   └─ is_active
  │
  ├── Customers (Global)
  │   ├─ id (PK, UUID)
  │   ├─ phone_number (UNIQUE)
  │   ├─ name
  │   └─ Orders (1:N)
  │
  ├── Tables (via tenant_id)
  │   ├─ id (PK, UUID)
  │   ├─ tenant_id (FK)
  │   ├─ table_number
  │   ├─ capacity
  │   └─ Orders (1:N)
  │
  ├── MenuItems (via tenant_id)
  │   ├─ id (PK, UUID)
  │   ├─ tenant_id (FK)
  │   ├─ category_id (FK)
  │   ├─ name
  │   ├─ price
  │   ├─ cost_price
  │   ├─ discount_percentage
  │   └─ is_available
  │
  ├── Categories
  │   ├─ id (PK, String)
  │   ├─ name
  │   └─ display_order
  │
  ├── Orders (via tenant_id)
  │   ├─ id (PK, UUID)
  │   ├─ tenant_id (FK)
  │   ├─ customer_id (FK)
  │   ├─ table_id (FK)
  │   ├─ status (ENUM)
  │   ├─ total_amount
  │   ├─ tax
  │   ├─ discount
  │   ├─ OrderItems (1:N)
  │   └─ Payments (1:1)
  │
  ├── Inventory (via tenant_id)
  │   ├─ id (PK, UUID)
  │   ├─ tenant_id (FK)
  │   ├─ item_name
  │   ├─ quantity
  │   ├─ reorder_level
  │   └─ expiry_date
  │
  └── Payments (via tenant_id)
      ├─ id (PK, UUID)
      ├─ tenant_id (FK)
      ├─ order_id (FK)
      ├─ method (ENUM)
      ├─ status (ENUM)
      └─ razorpay_order_id
```

### Key Indexes

```sql
-- Frequently queried columns
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_orders_tenant_id ON orders(tenant_id);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_menu_items_tenant_id ON menu_items(tenant_id);
CREATE INDEX idx_inventory_tenant_id ON inventory(tenant_id);
```

### Seeding

**File**: `backend/prisma/seed.sql`

**Default Data** ✅:
- Tenant: "Spice Route" (ID: 11111111-1111-1111-1111-111111111111)
- Tables: 5 tables (capacity 2-6)
- Categories: Appetizers, Main Course, Sides, Desserts
- Menu Items: 5 sample items (biryani, dal, butter chicken, etc.)
- Inventory: 3 stock items (paneer, chicken, flour)
- **Staff Users** ✅ (NEW):
  - manager1 (Password@123) - MANAGER
  - kitchen_staff1 (Password@123) - KITCHEN_STAFF
  - waiter1 (Password@123) - WAITER

**Migration**:
```bash
npx prisma migrate dev --name initial
# Runs all .sql files in migrations/
# Automatically creates staff users
```

**All Users Ready for Testing** ✅

---

## Event-Driven Architecture

### Kafka Topics

**Topic**: `orders`
```json
{
  "event": "order.created",
  "order_id": "uuid",
  "tenant_id": "uuid",
  "customer_id": "uuid",
  "items": [...],
  "total_amount": 450.50,
  "timestamp": "2025-10-22T10:30:00Z"
}
```

**Consumers**:
- Notification Service → Notify customer
- Analytics Service → Record metric
- Discount Engine → Check eligibility

---

**Topic**: `inventory`
```json
{
  "event": "inventory.low_stock",
  "item_name": "Paneer",
  "current_quantity": 2.5,
  "reorder_level": 5.0,
  "tenant_id": "uuid",
  "timestamp": "2025-10-22T10:30:00Z"
}
```

**Consumers**:
- Notification Service → Alert manager
- Analytics Service → Track trends

---

**Topic**: `payments`
```json
{
  "event": "payment.succeeded",
  "payment_id": "uuid",
  "order_id": "uuid",
  "amount": 450.50,
  "method": "razorpay",
  "tenant_id": "uuid",
  "timestamp": "2025-10-22T10:30:00Z"
}
```

---

## Multi-Tenancy Implementation

### Tenant Isolation

**Model**: Database-level isolation with table-level filtering

```
                   ┌─────────────────┐
                   │  PostgreSQL DB  │
                   │  (intellidine)  │
                   └────────┬────────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
        Tenant A        Tenant B       Tenant C
    (Spice Route)  (Biryani House)  (Pizza Palace)
            │               │               │
     All data filtered  All data filtered   ...
     by tenant_id       by tenant_id
```

### Enforcement Points

1. **Middleware Level** - Validates tenant_id in JWT
   ```typescript
   // Extracts tenant_id from token
   req.user.tenant_id = "11111111-..."
   ```

2. **Service Level** - Filters all queries
   ```typescript
   const items = await db.menuItem.findMany({
     where: {
       tenant_id: req.user.tenant_id  // Always included
     }
   });
   ```

3. **Request Level** - Validates tenant_id in body/params
   ```typescript
   // Mismatch rejected
   if (req.body.tenant_id !== req.user.tenant_id) {
     throw new ForbiddenException("Tenant mismatch");
   }
   ```

### Benefits

- **Data Privacy**: Each tenant completely isolated
- **Multi-tenant Scaling**: Single database, multiple tenants
- **Cost Efficient**: Shared infrastructure
- **Security**: No data leakage between tenants

---

## Monitoring & Observability

### Prometheus Setup

**Container**: `intellidine-prometheus` (Port 9090)

**Configuration**: `monitoring/prometheus/prometheus.yml`

**Current Status**: 🔴 PARTIALLY SETUP
- Prometheus running
- Scrapes Prometheus metrics
- Service metrics endpoints: NOT YET EXPOSED

**To Enable Service Metrics**:

1. Add Prometheus client library to services:
   ```bash
   npm install @nestjs/metrics prom-client
   ```

2. Enable metrics endpoint in each service:
   ```typescript
   import { PrometheusModule } from '@nestjs/metrics';
   
   @Module({
     imports: [PrometheusModule.register()],
   })
   export class AppModule {}
   ```

3. Update prometheus.yml:
   ```yaml
   scrape_configs:
     - job_name: 'api-gateway'
       static_configs:
         - targets: ['api-gateway:3100']
       metrics_path: '/metrics'
   
     - job_name: 'auth-service'
       static_configs:
         - targets: ['auth-service:3101']
       metrics_path: '/metrics'
     
     # ... repeat for all services
   ```

4. Restart Prometheus:
   ```bash
   docker-compose restart prometheus
   ```

### Grafana Dashboard

**Container**: `intellidine-grafana` (Port 3009)

**Access**:
- URL: `http://localhost:3009`
- Username: `admin`
- Password: `${GRAFANA_PASSWORD}` (from .env)

**Current Status**: 🟡 RUNNING BUT NO DASHBOARDS

**Setup Steps**:

#### 1. Add Prometheus Data Source
```
1. Login to Grafana
2. Menu → Configuration → Data Sources
3. Click "Add data source"
4. Select "Prometheus"
5. URL: http://prometheus:9090
6. Click "Save & Test"
```

#### 2. Create Dashboard

**Option A: Quick Dashboard (Manual)**
```
1. Menu → Create → Dashboard
2. Click "Add panel"
3. Select Prometheus as data source
4. Write PromQL query:
   - Total requests: sum(rate(http_requests_total[5m]))
   - Response time: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
5. Set refresh interval (30s)
6. Save dashboard
```

**Option B: Import Dashboard (Recommended)**
```
1. Visit grafana.com/grafana/dashboards
2. Search "NestJS" or "Node.js"
3. Copy dashboard ID (e.g., 11074)
4. In Grafana: Menu → Create → Import
5. Paste ID, select Prometheus data source
6. Import
```

### Key Metrics to Monitor

#### Application Metrics
```
1. HTTP Requests
   - Total requests: http_requests_total
   - Request rate: rate(http_requests_total[5m])
   - Success rate: rate(http_requests_total{status="200"}[5m])

2. Response Time (Latency)
   - P50: histogram_quantile(0.50, http_request_duration_seconds)
   - P95: histogram_quantile(0.95, http_request_duration_seconds)
   - P99: histogram_quantile(0.99, http_request_duration_seconds)

3. Errors
   - Error rate: rate(http_requests_total{status=~"5.."}[5m])
   - 404s: rate(http_requests_total{status="404"}[5m])

4. Database Connections
   - Active connections: db_pool_size
   - Query time: db_query_duration_seconds
```

#### Business Metrics
```
1. Orders
   - Orders per minute: rate(orders_created_total[1m])
   - Average order value: orders_total_amount / orders_total_count

2. Revenue
   - Revenue per hour: rate(revenue_total[1h])
   - Revenue by payment method

3. Inventory
   - Items below reorder level
   - Stock usage rate
```

### PromQL Query Examples

```promql
# Average response time by endpoint
avg(rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])) by (endpoint)

# Orders created per minute
rate(orders_created_total[1m])

# Database connection pool utilization
db_pool_active / db_pool_max

# Error rate
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])

# Top 10 slowest endpoints
topk(10, rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m]))
```

### Alerting Rules (Future)

```yaml
groups:
  - name: application
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate detected"

      - alert: HighLatency
        expr: histogram_quantile(0.95, http_request_duration_seconds) > 1
        for: 10m
        annotations:
          summary: "P95 latency above 1 second"

      - alert: LowInventory
        expr: inventory_quantity < inventory_reorder_level
        for: 1m
        annotations:
          summary: "Item below reorder level"
```

### Logging Strategy

**Current**: NestJS Logger (console output)

```typescript
// Replaced console.log with Logger
import { Logger } from '@nestjs/common';

export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  async createOrder(dto) {
    this.logger.log(`Creating order for tenant: ${dto.tenant_id}`);
    this.logger.debug(`Order details: ${JSON.stringify(dto)}`);
    
    try {
      // Business logic
    } catch (error) {
      this.logger.error(`Failed to create order: ${error.message}`, error.stack);
    }
  }
}
```

**Future**: ELK Stack (Elasticsearch + Logstash + Kibana)
- Centralized log aggregation
- Full-text search
- Real-time analysis
- Long-term retention

---

## Deployment Architecture

### Development (Local)
```
Docker Compose
├─ PostgreSQL (localhost:5432)
├─ Redis (localhost:6379)
├─ Kafka (localhost:9092)
├─ API Gateway (localhost:3100)
├─ Services (localhost:3101-3108)
├─ Prometheus (localhost:9090)
└─ Grafana (localhost:3009)
```

### Production (Home Server via Cloudflare Tunnel)
```
Internet
  ↓
Cloudflare Edge Network
  ↓
Cloudflare Tunnel (Ingress)
  ↓
Home Server Network
  ├─ Docker Compose Stack
  ├─ All services in Docker containers
  ├─ Shared PostgreSQL database
  ├─ Data volumes for persistence
  └─ Reverse proxy (Nginx)
  
Domain: intellidine-api.aahil-khan.tech
  ↓
API Gateway (internal)
  ↓
Backend Services (internal)
```

### Docker Compose Services

```yaml
services:
  postgres:      # Port 5443 (mapped from 5432)
  redis:         # Port 6380 (mapped from 6379)
  kafka:         # Port 9092
  zookeeper:     # Port 2181
  prometheus:    # Port 9090
  grafana:       # Port 3009
  nginx:         # Port 81 (reverse proxy)
  api-gateway:   # Port 3100
  auth-service:  # Port 3101
  order-service: # Port 3102
  menu-service:  # Port 3103
  inventory-service: # Port 3104
  payment-service:   # Port 3105
  notification-service: # Port 3106
  analytics-service: # Port 3107
  discount-engine:   # Port 3108
  ml-service:        # Port 8000
```

**Volume Persistence**:
```
- postgres_data:      Database files
- redis_data:         Cache data
- prometheus_data:    Metrics history
- grafana_data:       Dashboards & config
```

---

## API Gateway

### Purpose
Single entry point for all frontend requests with intelligent routing

### Request Flow

```
1. Frontend makes request
   GET https://intellidine-api.aahil-khan.tech/api/menu/items
   Header: Authorization: Bearer <JWT>

2. API Gateway receives request
   - Validates CORS origin
   - Parses route: /api/menu/items
   - Extracts path: /items

3. Route matching
   /api/menu/* → menu-service:3103

4. Forward request
   GET http://menu-service:3103/items
   (Maintains headers, body, query params)

5. Service processes & responds
   { status: 200, data: [...] }

6. Gateway wraps response
   { success: true, data: [...], timestamp: "..." }

7. Send to frontend
```

### Response Format

**Success**:
```json
{
  "success": true,
  "data": { /* service response */ },
  "message": "Success",
  "timestamp": "2025-10-22T10:30:00Z"
}
```

**Error**:
```json
{
  "success": false,
  "error": "InvalidCredentials",
  "message": "Invalid phone or password",
  "timestamp": "2025-10-22T10:30:00Z",
  "status_code": 401
}
```

### Error Handling

**Gateway Responsibilities**:
1. Catch service errors
2. Map to standard HTTP status codes
3. Wrap errors consistently
4. Return meaningful messages

**HTTP Status Codes**:
- 200 OK - Success
- 201 Created - Resource created
- 400 Bad Request - Invalid input
- 401 Unauthorized - Missing/invalid auth
- 403 Forbidden - Insufficient permissions
- 404 Not Found - Resource not found
- 500 Internal Server Error - Server error

### Health Checks

**Aggregate Health**:
```
GET /health
Response: {
  status: "healthy",
  services: {
    "auth-service": "up",
    "menu-service": "up",
    "order-service": "up",
    ...
  }
}
```

**Individual Service Health**:
```
GET /api/menu/health
Response: { status: 'ok', service: 'menu-service' }
```

---

## Performance & Scaling

### Current Optimizations

1. **Database**:
   - Indexes on frequently queried columns (tenant_id, user_id)
   - Connection pooling (Prisma)
   - Query optimization (N+1 prevention)

2. **Caching**:
   - Redis for menu lists (TTL: 1 hour)
   - Session caching (JWT validation)
   - Redis for Kafka consumer groups

3. **Asynchronous Processing**:
   - Kafka for non-critical operations
   - Order creation doesn't wait for notifications
   - Inventory updates async

4. **Container Optimization**:
   - Alpine Linux (small image size)
   - Multi-stage Docker builds
   - Resource limits set

### Scaling Strategies

#### Horizontal Scaling (Add more containers)
```bash
# Scale order-service to 3 instances
docker-compose up -d --scale order-service=3

# Load balancer (Nginx) distributes traffic
# Services share same PostgreSQL database
```

#### Vertical Scaling (Increase resources)
```yaml
# docker-compose.yml
order-service:
  resources:
    limits:
      cpus: '2'      # 2 CPU cores
      memory: 2G     # 2GB RAM
    reservations:
      cpus: '1'
      memory: 1G
```

#### Database Optimization
```sql
-- Add indexes for common queries
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_tenant_id_status ON orders(tenant_id, status);

-- Partition large tables (future)
CREATE TABLE orders_2025_01 PARTITION OF orders
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

### Bottleneck Analysis

**Current Bottlenecks**:
1. Shared PostgreSQL database - All services compete for connections
2. Single Redis instance - Cache contention
3. Synchronous API calls - Waiting for service responses

**Future Solutions**:
1. Database replication & read replicas
2. Redis Cluster for distributed caching
3. API caching layer (Varnish/CDN)
4. gRPC for inter-service communication

---

## Summary

IntelliDine is a modern, scalable microservices architecture built with NestJS and PostgreSQL. Key characteristics:

- ✅ **Multi-tenant SaaS** - Isolated data per restaurant
- ✅ **Event-driven** - Decoupled services via Kafka
- ✅ **API-first** - REST JSON API
- ✅ **Real-time** - WebSocket notifications
- ✅ **Production-ready** - Error handling, logging, monitoring
- ✅ **Scalable** - Horizontal & vertical scaling options
- ✅ **Secure** - JWT auth, role-based access, tenant isolation

---

**For questions or to add additional services, refer to individual service READMEs in `backend/*/` directories.**
