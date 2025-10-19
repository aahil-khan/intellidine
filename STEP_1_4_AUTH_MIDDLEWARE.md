# Step 1.4: Auth Middleware Integration - Complete Implementation

**Date**: October 19, 2025  
**Status**: ✅ COMPLETE  
**Duration**: 2 hours  
**Impact**: Sprint 1 Foundation Complete - All protected routes now enforce authentication

---

## Overview

Auth Middleware Integration applies consistent authentication and authorization patterns across all services in the IntelliDine backend. This ensures:

- ✅ **JWT-based authentication** across all protected routes
- ✅ **Multi-tenant isolation** via tenant_id validation
- ✅ **Role-based access control (RBAC)** for staff operations
- ✅ **Consistent error handling** for auth failures
- ✅ **Shared auth utilities** for all services

---

## Architecture

### Shared Auth Module (`/backend/shared/auth/`)

All authentication utilities are centralized in `backend/shared/auth/` for reuse across services:

**Files Created**:
- `jwt.utils.ts` - JWT token generation, verification, extraction
- `jwt.guard.ts` - Validates Bearer token from Authorization header
- `tenant.guard.ts` - Validates tenant_id matches JWT payload (multi-tenant isolation)
- `roles.guard.ts` - Validates user has required role (uses @RequireRole decorator)
- `current-user.decorator.ts` - Extracts user info from request
- `require-role.decorator.ts` - Marks endpoint as requiring specific role
- `index.ts` - Centralized exports

**Import Pattern** (for all services):
```typescript
import { JwtGuard, TenantGuard, RolesGuard, RequireRole, CurrentUser } from '../shared/auth';
```

### JWT Payload Structure

```typescript
interface JwtPayload {
  sub: string;              // User ID
  type: 'customer' | 'staff'; // User type
  tenant_id?: string;       // Optional (only for staff)
  iat: number;              // Issued at
  exp: number;              // Expires at
}
```

### Guard Chain Pattern

Protected routes use a two-guard pattern:

```typescript
@UseGuards(JwtGuard, TenantGuard)
@RequireRole(['staff'])  // Optional - for staff-only operations
@Post('/api/menu/items')
async createMenuItem(...) { }
```

**Guard Execution**:
1. **JwtGuard**: Validates Authorization header → extracts & verifies JWT token
2. **TenantGuard**: Validates tenant_id query parameter → matches JWT tenant_id
3. **RolesGuard** (optional): Validates user type matches required role

---

## Services Updated

### 1. Menu Service

**Protected Routes** (require JWT + Tenant validation):
- ✅ `POST /api/menu/items` - Create menu item (staff only)
- ✅ `PATCH /api/menu/items/:id` - Update menu item (staff only)
- ✅ `DELETE /api/menu/items/:id` - Delete menu item (staff only)

**Public Routes** (no auth required):
- `GET /api/menu` - List menu items
- `GET /api/menu/categories` - List categories
- `GET /api/menu/items/:id` - Get single menu item

**Changes**:
```typescript
// Before: Manual tenant_id validation
@Post('/api/menu/items')
async createMenuItem(@Query('tenant_id') tenantId: string, @Body() dto: CreateMenuItemDto) {
  if (!tenantId) throw new BadRequestException('tenant_id is required');
  // ...
}

// After: Guards handle validation automatically
@UseGuards(JwtGuard, TenantGuard)
@RequireRole(['staff'])
@Post('/api/menu/items')
async createMenuItem(@Query('tenant_id') tenantId: string, @Body() dto: CreateMenuItemDto) {
  // tenantId is validated, JWT is verified, staff role confirmed
  // ...
}
```

### 2. Order Service

**Protected Routes** (require JWT + Tenant validation):
- ✅ `POST /api/orders` - Create order (any authenticated user)
- ✅ `GET /api/orders/:id` - Get single order (auth required)
- ✅ `GET /api/orders` - List orders (auth required)
- ✅ `PATCH /api/orders/:id/status` - Update order status (staff only)
- ✅ `PATCH /api/orders/:id/cancel` - Cancel order (staff only)

**Public Routes**:
- `GET /health` - Health check

**Changes**:
- Write operations (POST, PATCH) now require JWT + staff role
- Read operations (GET) now require JWT + tenant validation
- Removed manual tenant_id validation (guards handle it)

### 3. Payment Service

**Protected Routes** (require JWT + Tenant validation):
- ✅ `POST /api/payments/create-razorpay-order` - Create Razorpay order (auth required)
- ✅ `POST /api/payments/verify-razorpay` - Verify payment signature (auth required)
- ✅ `POST /api/payments/confirm-cash` - Confirm cash payment (staff only)
- ✅ `GET /api/payments/:payment_id` - Get payment details (auth required)
- ✅ `GET /api/payments/stats/daily` - Get payment stats (staff only)

**Public Routes**:
- `GET /health` - Health check

**Changes**:
- All payment operations now require authentication
- Cash confirmation restricted to staff
- Stats endpoint restricted to staff

### 4. Inventory Service

**Protected Routes** (require JWT + Tenant validation):
- ✅ `POST /api/inventory/items` - Create inventory (staff only)
- ✅ `GET /api/inventory/items` - List inventory (auth required)
- ✅ `GET /api/inventory/items/:id` - Get single item (auth required)
- ✅ `PATCH /api/inventory/items/:id` - Update inventory (staff only)
- ✅ `PATCH /api/inventory/deduct` - Deduct stock (staff only)
- ✅ `GET /api/inventory/alerts` - Get reorder alerts (staff only)
- ✅ `GET /api/inventory/stats` - Get inventory stats (staff only)

**Public Routes**:
- `GET /health` - Health check

**Changes**:
- All inventory operations now require authentication
- Write operations restricted to staff

---

## Auth Flow Examples

### Customer Creating an Order

```
1. Customer logs in (via OTP)
   POST /api/auth/customer/verify-otp
   Response: { access_token: "eyJhbGc...", user: { id: "cust123" } }

2. Customer creates order (with token)
   POST /api/orders?tenant_id=restaurant1
   Headers: Authorization: Bearer eyJhbGc...
   Body: { items: [...], ... }
   
   Flow:
   - JwtGuard validates token → attaches payload to request.user
   - TenantGuard validates tenant_id matches → attaches to request.tenant_id
   - Controller receives authenticated request
   Response: { status: 'ok', data: { order_id: "ord456" } }

3. Customer queries order
   GET /api/orders/ord456?tenant_id=restaurant1
   Headers: Authorization: Bearer eyJhbGc...
   
   Flow:
   - JwtGuard validates token
   - TenantGuard validates tenant_id matches
   - OrderService retrieves order
   Response: { status: 'ok', data: { ... } }
```

### Staff Updating Menu

```
1. Staff logs in (username/password)
   POST /api/auth/staff/login
   Response: { access_token: "eyJhbGc...", user: { id: "staff1", role: "manager" } }

2. Staff creates menu item (with token)
   POST /api/menu/items?tenant_id=restaurant1
   Headers: Authorization: Bearer eyJhbGc...
   Body: { name: "Biryani", price: 250, ... }
   
   Flow:
   - JwtGuard validates token → payload contains type: 'staff', tenant_id: 'restaurant1'
   - TenantGuard validates tenant_id matches
   - RolesGuard validates type is 'staff' (from @RequireRole decorator)
   - MenuService creates item
   Response: { status: 'ok', data: { item_id: "menu789" } }

3. Unauthorized user attempts same operation
   POST /api/menu/items?tenant_id=restaurant1
   Headers: Authorization: Bearer <customer_token>
   
   Flow:
   - JwtGuard validates token → payload contains type: 'customer'
   - RolesGuard checks type against @RequireRole(['staff'])
   - Access denied (ForbiddenException)
   Response: { 401: "Access denied. Staff role required." }
```

---

## HTTP Status Codes

| Code | Scenario | Example |
|------|----------|---------|
| 200 | Success | `GET /api/orders` with valid token |
| 201 | Created | `POST /api/orders` successfully |
| 400 | Bad Request | Missing tenant_id parameter |
| 401 | Unauthorized | Missing/invalid/expired JWT token |
| 403 | Forbidden | Valid token but insufficient role (customer trying staff operation) |
| 404 | Not Found | Resource doesn't exist |
| 500 | Server Error | Unexpected error in service |

---

## Public vs Protected Routes

### Public Routes (No Auth Required)

These endpoints are accessible without JWT token:

| Service | Endpoint | Method | Purpose |
|---------|----------|--------|---------|
| All Services | `/health` | GET | Service health check |
| Auth Service | `/api/auth/customer/request-otp` | POST | Request OTP for login |
| Auth Service | `/api/auth/customer/verify-otp` | POST | Verify OTP and get token |
| Auth Service | `/api/auth/staff/login` | POST | Staff login with password |
| Menu Service | `/api/menu` | GET | List menu items for restaurant |
| Menu Service | `/api/menu/categories` | GET | List menu categories |
| Menu Service | `/api/menu/items/:id` | GET | Get single menu item |

### Protected Routes (Auth Required)

All other endpoints require `Authorization: Bearer <token>` header.

---

## Testing Auth Integration

### Test 1: Health Check (Public)

```bash
curl -X GET http://localhost:3003/health
# Response: 200 OK
# { "status": "ok", "service": "menu-service" }
```

### Test 2: List Menu Items (Public)

```bash
curl -X GET "http://localhost:3003/api/menu?tenant_id=550e8400"
# Response: 200 OK
# { "status": "ok", "data": [...] }
```

### Test 3: Create Menu Item (Protected - NO TOKEN)

```bash
curl -X POST http://localhost:3003/api/menu/items?tenant_id=550e8400 \
  -H "Content-Type: application/json" \
  -d '{ "name": "Biryani", "price": 250 }'
# Response: 401 Unauthorized
# { "message": "Missing authorization header" }
```

### Test 4: Create Menu Item (Protected - WITH TOKEN)

```bash
# Step 1: Get token via OTP login
TOKEN=$(curl -X POST http://localhost:3001/api/auth/customer/verify-otp \
  -H "Content-Type: application/json" \
  -d '{ "phone": "+919876543210", "otp": "123456" }' | jq -r '.access_token')

# Step 2: Create menu item with token
curl -X POST http://localhost:3003/api/menu/items?tenant_id=550e8400 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{ "name": "Biryani", "price": 250, "category_id": "cat1" }'
# Response: 201 Created (if staff) or 403 Forbidden (if customer)
```

### Test 5: Create Menu Item (Protected - CUSTOMER TOKEN)

```bash
# Using customer token
curl -X POST http://localhost:3003/api/menu/items?tenant_id=550e8400 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <customer_token>" \
  -d '{ "name": "Biryani", "price": 250, "category_id": "cat1" }'
# Response: 403 Forbidden
# { "message": "Access denied. Staff role required." }
```

### Test 6: Tenant Mismatch (Protected - WRONG TENANT)

```bash
# Staff token for tenant "restaurant1" but request for "restaurant2"
curl -X POST http://localhost:3003/api/menu/items?tenant_id=restaurant2 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <staff_token_for_restaurant1>" \
  -d '{ "name": "Biryani", "price": 250, "category_id": "cat1" }'
# Response: 401 Unauthorized
# { "message": "Tenant ID mismatch. Access denied." }
```

---

## Implementation Checklist

- [x] Create shared auth module with guards/decorators
- [x] Update Menu Service with auth guards
- [x] Update Order Service with auth guards
- [x] Update Payment Service with auth guards
- [x] Update Inventory Service with auth guards
- [x] Remove manual tenant_id validation (guards handle it)
- [x] Add proper JSDoc comments for auth requirements
- [x] Document public vs protected routes
- [x] Add auth examples for each service
- [x] Test all endpoints with/without auth tokens

---

## Error Messages

### Missing Authorization Header
```
Status: 401 Unauthorized
{
  "statusCode": 401,
  "message": "Missing authorization header"
}
```

### Invalid Token Format
```
Status: 401 Unauthorized
{
  "statusCode": 401,
  "message": "Invalid authorization header format. Expected: Bearer <token>"
}
```

### Expired/Invalid Token
```
Status: 401 Unauthorized
{
  "statusCode": 401,
  "message": "JWT verification failed: Token expired"
}
```

### Tenant ID Mismatch
```
Status: 401 Unauthorized
{
  "statusCode": 401,
  "message": "Tenant ID mismatch. Access denied."
}
```

### Insufficient Role
```
Status: 403 Forbidden
{
  "statusCode": 403,
  "message": "Access denied. Staff role required."
}
```

### Missing Tenant ID
```
Status: 400 Bad Request
{
  "statusCode": 400,
  "message": "tenant_id is required (query param or body)"
}
```

---

## What's Next

**Sprint 1 Complete** ✅ with auth middleware integration. 

**Ready for Sprint 2**:
1. Step 2.3: Socket.io Notifications - Real-time push updates
2. Step 2.4: API Gateway Refinement - Service routing optimization

---

## References

- `/backend/shared/auth/index.ts` - Shared auth exports
- `/backend/auth-service/src/utils/jwt.utils.ts` - JWT token handling
- `/backend/menu-service/src/app.controller.ts` - Example protected routes
- `/backend/order-service/src/app.controller.ts` - Order auth implementation
- `/backend/payment-service/src/app.controller.ts` - Payment auth implementation
- `/backend/inventory-service/src/app.controller.ts` - Inventory auth implementation

