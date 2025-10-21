# API Gateway - Complete Guide

**Port**: 3100  
**Language**: TypeScript (NestJS)  
**Responsibility**: Route requests to microservices, authentication, rate limiting, request validation

---

## What API Gateway Does

API Gateway is the **single entry point** for all requests:

- ✅ Route HTTP requests to correct microservice
- ✅ Validate JWT tokens
- ✅ Apply rate limiting
- ✅ Log requests
- ✅ Handle CORS
- ✅ Transform requests/responses
- ✅ Load balancing (future)

---

## Architecture

### Request Flow

```
Client Request
    ↓
API Gateway (port 3100)
    ↓
    ├─ /api/auth/* → Auth Service (3101)
    ├─ /api/menu/* → Menu Service (3102)
    ├─ /api/payments/* → Payment Service (3103)
    ├─ /api/discounts/* → Discount Engine (3104)
    ├─ /api/inventory/* → Inventory Service (3105)
    ├─ /api/notifications/* → Notification Service (3106)
    ├─ /api/analytics/* → Analytics Service (3107)
    ├─ /api/orders/* → Order Service (3108)
    └─ /api/ml/* → ML Service (8000)
    ↓
Response to Client
```

---

## Request Routing

### Auth Service Routes

```
POST   /api/auth/customer/otp              → Auth Service
POST   /api/auth/customer/verify-otp       → Auth Service
POST   /api/auth/staff/login               → Auth Service
POST   /api/auth/logout                    → Auth Service
POST   /api/auth/refresh                   → Auth Service
```

### Menu Service Routes

```
GET    /api/menu/items                     → Menu Service
GET    /api/menu/items/:id                 → Menu Service
GET    /api/menu/categories                → Menu Service
POST   /api/menu/items                     → Menu Service (MANAGER only)
PATCH  /api/menu/items/:id                 → Menu Service (MANAGER only)
PATCH  /api/menu/items/:id/availability    → Menu Service (MANAGER only)
```

### Order Service Routes

```
POST   /api/orders                         → Order Service
GET    /api/orders/:id                     → Order Service
PATCH  /api/orders/:id/status              → Order Service (STAFF only)
DELETE /api/orders/:id                     → Order Service
GET    /api/orders                         → Order Service (list)
```

### Payment Service Routes

```
POST   /api/payments/initiate              → Payment Service
POST   /api/payments/verify                → Payment Service
POST   /api/payments/cash                  → Payment Service
GET    /api/payments/:id                   → Payment Service
POST   /api/payments/refunds               → Payment Service
```

### Discount Engine Routes

```
POST   /api/discounts/predict              → Discount Engine (internal)
POST   /api/discounts/apply-code           → Discount Engine
GET    /api/discounts/rules                → Discount Engine (MANAGER)
```

### Inventory Service Routes

```
GET    /api/inventory/stock                → Inventory Service (MANAGER)
PATCH  /api/inventory/stock/:id/adjust     → Inventory Service (MANAGER)
POST   /api/inventory/wastage              → Inventory Service (MANAGER)
```

### Notification Service Routes

```
GET    /api/notifications                  → Notification Service
PATCH  /api/notifications/:id/mark-read    → Notification Service
```

### Analytics Service Routes

```
GET    /api/analytics/dashboard            → Analytics Service (MANAGER)
GET    /api/analytics/revenue              → Analytics Service (MANAGER)
GET    /api/analytics/customers            → Analytics Service (MANAGER)
```

---

## Authentication & Authorization

### JWT Validation

Every request to protected endpoints:

```
GET /api/orders
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

API Gateway:
1. Extract JWT from Authorization header
2. Verify signature with secret key
3. Check expiry
4. Validate tenant_id
5. If valid → Forward request with decoded token
6. If invalid → Return 401 Unauthorized
```

### Role-Based Access Control

```typescript
// Example: Create menu item (MANAGER only)
POST /api/menu/items
Authorization: Bearer <token_with_role_MANAGER>

API Gateway checks:
- Token valid? ✓
- Role == MANAGER? ✓
- Forward to Menu Service ✓

If role is CUSTOMER or KITCHEN_STAFF:
→ Return 403 Forbidden
```

### Role Definitions

```json
{
  "CUSTOMER": ["browse menu", "place order", "pay"],
  "MANAGER": ["manage menu", "view analytics", "manage staff"],
  "KITCHEN_STAFF": ["view orders", "update order status"],
  "WAITER": ["view orders", "manage payments", "update status"],
  "SUPER_ADMIN": ["all permissions"]
}
```

---

## Rate Limiting

### Global Rate Limit

```
Per IP address:
- 1000 requests per minute
- Burst: 50 requests per second

Headers:
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 995
X-RateLimit-Reset: 1729612234
```

### Per-Endpoint Rate Limit

```
/api/auth/customer/otp:
- 5 requests per minute per phone number
- Prevents OTP brute force

/api/payments/verify:
- 10 requests per minute per order_id
- Prevents payment signature attacks

Example:
Too many requests from 9876543210 to /api/auth/customer/otp
→ 429 Too Many Requests
```

---

## Request/Response Transformation

### Standard Response Format

```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2024-10-22T19:30:00Z"
}

OR

{
  "success": false,
  "error": {
    "code": "ITEM_NOT_FOUND",
    "message": "Menu item not found",
    "details": {
      "item_id": "item-123"
    }
  },
  "timestamp": "2024-10-22T19:30:00Z"
}
```

### Error Codes

```
400 Bad Request → Validation failed
401 Unauthorized → JWT invalid/expired
403 Forbidden → Insufficient permissions
404 Not Found → Resource not found
429 Too Many Requests → Rate limited
500 Internal Server Error → Service error
503 Service Unavailable → Downstream service down
```

---

## Headers Management

### Request Headers

```
Authorization: Bearer <jwt_token>
X-Tenant-ID: 11111111-1111-1111-1111-111111111111
X-Request-ID: req-abc123
Content-Type: application/json
```

### Response Headers

```
X-Request-ID: req-abc123
X-Response-Time: 125ms
X-Service: menu-service
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 995
```

---

## Database Schema

```typescript
model RequestLog {
  id                      String   @id @default(uuid())
  request_id              String   @unique
  method                  String
  path                    String
  status_code             Int
  source_ip               String
  user_id                 String?
  tenant_id               String?
  response_time_ms        Int
  request_size_bytes      Int
  response_size_bytes     Int
  created_at              DateTime @default(now())

  @@index([user_id])
  @@index([tenant_id])
  @@index([created_at])
  @@map("request_logs")
}
```

---

## Endpoints Summary

| Method | Endpoint | Purpose | Routes To |
|--------|----------|---------|-----------|
| `*` | `/api/auth/*` | Authentication | Auth Service (3101) |
| `*` | `/api/menu/*` | Menu management | Menu Service (3102) |
| `*` | `/api/payments/*` | Payments | Payment Service (3103) |
| `*` | `/api/discounts/*` | Discounts | Discount Engine (3104) |
| `*` | `/api/inventory/*` | Inventory | Inventory Service (3105) |
| `*` | `/api/notifications/*` | Notifications | Notification Service (3106) |
| `*` | `/api/analytics/*` | Analytics | Analytics Service (3107) |
| `*` | `/api/orders/*` | Orders | Order Service (3108) |
| `*` | `/api/ml/*` | ML predictions | ML Service (8000) |
| `GET` | `/health` | Health check | All services |
| `GET` | `/metrics` | Prometheus metrics | API Gateway |

---

## Real-World Scenarios

### Scenario 1: Customer Browsing Menu

```
7:01 PM: Customer requests menu
1. GET /api/menu/items (no JWT needed, public)
2. API Gateway forwards to Menu Service
3. Menu Service responds with cached items
4. API Gateway returns to client (50ms total)
```

### Scenario 2: Manager Creating Discount Rule

```
2:00 PM: Manager creates promotion
1. POST /api/discounts/rules
   Headers: Authorization: Bearer <token>
2. API Gateway extracts JWT
3. Verifies token valid ✓
4. Checks role = MANAGER ✓
5. Forwards to Discount Engine
6. Discount Engine creates rule
7. Response returned to manager
```

### Scenario 3: Rate Limit Hit

```
7:00 PM: Customer tries OTP 10 times in 1 minute
1. POST /api/auth/customer/otp
2. API Gateway tracks: 9876543210 → count 1
3. Requests 2-5: OK (count 2-5)
4. Request 6+: Count exceeds 5/min limit
5. Return 429 Too Many Requests
6. Retry-After: 40 seconds
```

---

## Performance Characteristics

- **Request routing**: 5-10ms (pure forwarding)
- **JWT validation**: 2-5ms
- **Rate limit check**: 1-3ms (Redis backed)
- **Request logging**: 10-20ms (async)
- **Total overhead**: 20-40ms per request

---

## Testing API Gateway

```bash
# Test public endpoint (no auth)
curl http://localhost:3100/api/menu/items \
  -H "X-Tenant-ID: 11111111-1111-1111-1111-111111111111"

# Test protected endpoint
curl http://localhost:3100/api/orders \
  -H "Authorization: Bearer <jwt_token>"

# Test rate limiting
for i in {1..10}; do
  curl http://localhost:3100/api/auth/customer/otp \
    -d '{"phone_number": "9876543210"}'
done
# After 5 requests: 429 Too Many Requests

# Health check
curl http://localhost:3100/health
```

---

**See Also**:
- [SYSTEM_OVERVIEW.md](../SYSTEM_OVERVIEW.md) - API Gateway in architecture
- [ORDERING_WORKFLOW.md](../workflows/ORDERING_WORKFLOW.md) - API calls traced
