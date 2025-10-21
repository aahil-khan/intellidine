# Missing Implementations & API Gaps

**Generated**: October 22, 2025  
**Status**: Work in progress

---

## Summary

Out of 35+ documented API endpoints, the following are **NOT FULLY IMPLEMENTED**:

| Service | Issues | Impact |
|---------|--------|--------|
| Analytics Service | Routes return 404 (not exposed at gateway) | 🔴 Critical |
| Discount Engine | Routes use wrong path prefix | 🔴 Critical |
| Menu Service | POST/PATCH/DELETE return 401 (auth issue) | 🟡 High |
| Order Service | POST/PATCH return 401 (auth issue) | 🟡 High |
| Inventory Service | Most endpoints return 401 (auth issue) | 🟡 High |
| API Gateway | `/routes` endpoint missing | 🟢 Low |

---

## Detailed Breakdown

### 1. ✅ Auth Service - FULLY WORKING

**Postman Results**:
- ✅ `POST /api/auth/customer/request-otp` → 200 OK
- ✅ `POST /api/auth/customer/verify-otp` → 200 OK
- ✅ `POST /api/auth/staff/login` → 200 OK

**Implementation Status**: Complete ✅

---

### 2. ✅ Payment Service - FULLY WORKING

**Postman Results**:
- ✅ `GET /api/payments/health` → 200 OK
- ✅ `GET /api/payments` (list) → 200 OK
- ⚠️ `POST /api/payments/create-razorpay-order` → 401 (auth required)
- ⚠️ `POST /api/payments/verify-razorpay` → 401 (auth required)
- ⚠️ `POST /api/payments/confirm-cash` → 401 (auth required)
- ⚠️ `GET /api/payments/stats/daily` → 401 (auth required)
- ⚠️ `GET /api/payments/:payment_id` → 401 (auth required)

**Code Status**: All endpoints IMPLEMENTED ✅

**Issue**: 401 errors are EXPECTED (auth-protected endpoints need valid JWT token)

**Resolution**: This is correct behavior - endpoints are protected. ✅

---

### 3. ❌ Analytics Service - NOT EXPOSED AT GATEWAY

**Postman Results**:
- ❌ `GET /api/analytics/daily-metrics` → 404 Not Found
- ❌ `GET /api/analytics/order-trends` → 404 Not Found
- ❌ `GET /api/analytics/top-items` → 404 Not Found

**Code Status**: Service HAS these endpoints implemented:
```typescript
// In analytics-service/src/app.controller.ts:
@Get('/metrics/daily')        // ✅ Implemented
@Get('/metrics/recent')       // ✅ Implemented
@Get('/metrics/range')        // ✅ Implemented
@Get('/metrics/aggregated')   // ✅ Implemented
@Get('/orders/history')       // ✅ Implemented
```

**PROBLEM**: Postman is calling `/daily-metrics`, `/order-trends`, `/top-items` but the service only exposes `/metrics/daily`, `/metrics/recent`, etc.

**Issue Identified**: Two possible causes:
1. Service routing not configured in API Gateway for `analytics`
2. Endpoint path mismatch with Postman collection

**api-gateway/src/gateway/service-router.ts** analysis:
```typescript
private services: Record<string, ServiceConfig> = {
  auth: { ... },
  menu: { ... },
  orders: { ... },
  inventory: { ... },
  payments: { ... },
  notifications: { ... },
  // ❌ MISSING: analytics, discount, ml
};
```

**Resolution Needed**:
1. Add `analytics` service to gateway routing
2. Create alias endpoints for Postman collection compatibility, OR
3. Update Postman collection to use correct paths

---

### 4. ❌ Discount Engine - NOT EXPOSED AT GATEWAY

**Postman Results**:
- ❌ `GET /api/discounts/rules` → 404 Not Found
- ❌ `POST /api/discounts/apply` → 404 Not Found

**Code Status**: Service HAS these endpoints:
```typescript
// In discount-engine/src/app.controller.ts (@Controller('api/discount')):
@Get('/rules')        // ✅ Implemented
@Post('/evaluate')    // ✅ Implemented
@Get('/stats')        // ✅ Implemented
@Get('/templates')    // ✅ Implemented
@Post('/simulate')    // ✅ Implemented
```

**PROBLEM**: Service is mounted at `@Controller('api/discount')` but Postman tries:
- `GET /api/discounts/rules` (plural, with `/rules` path)

**Expected paths from service**:
- `GET /api/discount/rules` (singular, with `/rules` path)
- `POST /api/discount/evaluate` (not `/apply`)

**Also**: Service not registered in API Gateway router

**Resolution Needed**:
1. Add `discount` service to gateway routing
2. Fix path mismatch (`/discounts` → `/discount`)
3. Add endpoint aliases for Postman compatibility

---

### 5. ⚠️ Menu Service - PARTIAL WORKING

**Postman Results**:
- ✅ `GET /api/menu` → 200 OK
- ✅ `GET /api/menu/items/:id` → 200 OK
- ❌ `POST /api/menu/items` → 401 Unauthorized
- ❌ `PATCH /api/menu/items/:id` → 401 Unauthorized
- ❌ `DELETE /api/menu/items/:id` → 401 Unauthorized
- ❌ `GET /api/menu/health` → 404 Not Found

**Code Status**: All endpoints IMPLEMENTED ✅

```typescript
@Get('/api/menu')                  // ✅ Works (public)
@Get('/api/menu/items/:id')        // ✅ Works (public)
@Post('/api/menu/items')           // ✅ Implemented with @UseGuards(JwtGuard, TenantGuard)
@Patch('/api/menu/items/:id')      // ✅ Implemented with @UseGuards(JwtGuard, TenantGuard)
@Delete('/api/menu/items/:id')     // ✅ Implemented with @UseGuards(JwtGuard, TenantGuard)
```

**Issue**: 401 errors are EXPECTED (auth-protected endpoints need JWT token)

**Missing**: `/health` endpoint not at `/api/menu/health` path
- Service has `@Get('/health')` but Postman expects `/api/menu/health`

**Resolution**: Add dedicated health endpoint at `/api/menu/health`

---

### 6. ⚠️ Order Service - PARTIAL WORKING

**Postman Results**:
- ❌ `POST /api/orders` → 401 Unauthorized
- ❌ `GET /api/orders` → 401 Unauthorized
- ❌ `GET /api/orders/:id` → 401 Unauthorized
- ❌ `PATCH /api/orders/:id/status` → 401 Unauthorized
- ❌ `PATCH /api/orders/:id/cancel` → 401 Unauthorized

**Code Status**: All endpoints IMPLEMENTED ✅

```typescript
@Post('/api/orders')                // ✅ Implemented with @UseGuards(JwtGuard, TenantGuard)
@Get('/api/orders')                 // ✅ Implemented with @UseGuards(JwtGuard, TenantGuard)
@Get('/api/orders/:id')             // ✅ Implemented with @UseGuards(JwtGuard, TenantGuard)
@Patch('/api/orders/:id/status')    // ✅ Implemented with @UseGuards(JwtGuard, TenantGuard)
@Patch('/api/orders/:id/cancel')    // ✅ Implemented with @UseGuards(JwtGuard, TenantGuard)
```

**Issue**: 401 errors are EXPECTED (all require JWT token)

This is correct behavior - Postman collection needs valid JWT token in Authorization header.

**Resolution**: This is WORKING AS DESIGNED ✅

---

### 7. ⚠️ Inventory Service - PARTIAL WORKING

**Postman Results**:
- ❌ `POST /api/inventory/items` → 401 Unauthorized
- ❌ `GET /api/inventory/items` → 401 Unauthorized
- ❌ `PATCH /api/inventory/items/:id` → 401 Unauthorized
- ❌ `GET /api/inventory/alerts` → 401 Unauthorized
- ❌ `GET /api/inventory/stats` → 401 Unauthorized

**Code Status**: All endpoints IMPLEMENTED ✅

```typescript
@Post('/items')                // ✅ Implemented with @UseGuards(JwtGuard, TenantGuard)
@Get('/items')                 // ✅ Implemented with @UseGuards(JwtGuard, TenantGuard)
@Patch('/items/:id')           // ✅ Implemented with @UseGuards(JwtGuard, TenantGuard)
@Get('/alerts')                // ✅ Implemented with @UseGuards(JwtGuard, TenantGuard)
@Get('/stats')                 // ✅ Implemented with @UseGuards(JwtGuard, TenantGuard)
```

**Issue**: 401 errors are EXPECTED (all require JWT token)

This is correct behavior.

**Resolution**: This is WORKING AS DESIGNED ✅

---

### 8. ❌ Notification Service - PARTIAL ENDPOINT

**Postman Results**:
- ❌ `GET /api/notifications/stats` → 404 Not Found

**Code Status**: Endpoint EXISTS but path mismatch:

```typescript
@Controller()  // Root controller
@Get('/health')              // ✅ Implemented
@Get('/notifications/stats') // ✅ Implemented
```

**Issue**: Controller is at root, so endpoint is:
- Service exposes: `GET /notifications/stats`
- Postman expects: `GET /api/notifications/stats` (with /api prefix)
- Gateway routes: all `/api/*` requests

**Actually this should work if gateway is routing correctly.**

**Need to check**: If gateway has `notifications` service registered. Let me verify...

From `service-router.ts`:
```typescript
notifications: {
  name: 'notification-service',
  host: process.env.NOTIFICATION_SERVICE_HOST || 'notification-service',
  port: 3106,
},
```

Service IS registered. So when request comes to `GET /api/notifications/stats`:
1. Gateway receives it
2. Parses `/api/notifications/stats` → service = `notifications`
3. Forwards to `http://notification-service:3106/api/notifications/stats`

**Issue**: Service only exposes `/notifications/stats` (no `/api` prefix)

Controller at root with route `/notifications/stats` means:
- Service listens at: `localhost:3106/notifications/stats`

But gateway forwards to: `http://notification-service:3106/api/notifications/stats`

**Resolution**: Either:
1. Change controller `@Controller('/api/notifications')` and use `@Get('/stats')`
2. Or make gateway remove `/api` prefix before forwarding

---

### 9. ❌ API Gateway - Missing `/routes` Endpoint

**Postman Result**:
- ❌ `GET /routes` → 404 Not Found

**Code Status**: Not implemented

The gateway has `/health` but no `/routes` endpoint to list available routes.

**Resolution**: Add `GET /routes` endpoint that returns available service routes.

---

## Implementation Priority

### 🔴 CRITICAL (Block API usage)

1. **Add Analytics service to gateway router**
   - File: `backend/api-gateway/src/gateway/service-router.ts`
   - Task: Add analytics to services map
   - Status: Start here

2. **Add Discount Engine service to gateway router**
   - File: `backend/api-gateway/src/gateway/service-router.ts`
   - Task: Add discount to services map
   - Status: Start here

3. **Fix Notification Service controller routing**
   - File: `backend/notification-service/src/app.controller.ts`
   - Task: Add `/api` prefix to controller or route
   - Status: Start here

### 🟡 HIGH (Improve UX)

4. **Add Analytics alias endpoints**
   - File: `backend/analytics-service/src/app.controller.ts`
   - Task: Add `/daily-metrics`, `/order-trends`, `/top-items` endpoints
   - Status: Nice to have after routing works

5. **Add Discount alias endpoints**
   - File: `backend/discount-engine/src/app.controller.ts`
   - Task: Add `/apply` endpoint (alias for `/evaluate`)
   - Status: Nice to have

6. **Add Menu health endpoint**
   - File: `backend/menu-service/src/app.controller.ts`
   - Task: Add `/api/menu/health` endpoint
   - Status: Nice to have

### 🟢 LOW (Polish)

7. **Add API Gateway `/routes` endpoint**
   - File: `backend/api-gateway/src/app.controller.ts`
   - Task: Add GET /routes endpoint
   - Status: Documentation aid

---

## JWT Token Status

⚠️ Note: Many 401 errors are **CORRECT AND EXPECTED**. They indicate:
- Endpoint is protected (requires valid JWT)
- Test must provide `Authorization: Bearer <valid_jwt_token>`
- This is secure-by-design

To test authenticated endpoints, first:
1. Call `POST /api/auth/customer/request-otp` → get OTP
2. Call `POST /api/auth/customer/verify-otp` → get JWT token
3. Use JWT token in `Authorization` header for subsequent requests

---

## Next Steps

1. Fix critical routing issues (Analytics, Discount, Notifications)
2. Test all endpoints with proper JWT tokens
3. Add alias endpoints for Postman compatibility
4. Update API documentation with correct paths
