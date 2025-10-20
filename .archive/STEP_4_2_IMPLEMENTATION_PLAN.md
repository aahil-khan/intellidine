# Step 4.2 Implementation - Postman Collection Generation

**Status:** 🚀 READY TO START  
**Phase:** API Documentation Generation  
**Objective:** Create production-grade Postman collection with all endpoints

---

## What We Have ✅

- ✅ 9 Microservices fully tested (69/69 tests passing)
- ✅ All TypeScript errors fixed (0 errors)
- ✅ Path aliases properly configured
- ✅ API endpoints fully implemented and tested
- ✅ Authentication guards in place (JWT, Tenant, Role-based)
- ✅ Services running with Docker Compose

---

## What We're Building 🎯

**Postman Collection** with:

1. **50+ API Endpoints** across 9 services
2. **3 Environment Configurations** (dev, staging, production)
3. **Full Request/Response Examples** for each endpoint
4. **Authentication Workflows** (Customer OTP → JWT, Staff Login)
5. **Multi-Tenant Validation** (X-Tenant-ID header)
6. **Error Scenarios** (400, 401, 403, 404, 500 responses)
7. **Pre-request & Test Scripts** for automation

---

## Endpoints by Service

### 1️⃣ **Auth Service** - 3 endpoints
- POST `/api/auth/customer/request-otp` - Request OTP
- POST `/api/auth/customer/verify-otp` - Verify OTP & get JWT  
- POST `/api/auth/staff/login` - Staff login

### 2️⃣ **Menu Service** - 6 endpoints
- GET `/api/menu` - List menu with categories
- POST `/api/menu/items` - Create menu item
- GET `/api/menu/items/:id` - Get item details
- PATCH `/api/menu/items/:id` - Update item
- DELETE `/api/menu/items/:id` - Delete item
- GET `/health` - Health check

### 3️⃣ **Order Service** - 5 endpoints
- POST `/api/orders` - Create order
- GET `/api/orders` - List orders
- GET `/api/orders/:id` - Get order details
- PATCH `/api/orders/:id/status` - Update status
- PATCH `/api/orders/:id/cancel` - Cancel order

### 4️⃣ **Payment Service** - 7 endpoints
- POST `/api/payments/create-razorpay-order` - Create payment
- POST `/api/payments/verify-razorpay` - Verify payment
- POST `/api/payments/confirm-cash` - Record cash payment
- GET `/api/payments/:payment_id` - Get payment details
- GET `/api/payments` - List payments
- GET `/api/payments/stats/daily` - Payment statistics
- GET `/health` - Health check

### 5️⃣ **Inventory Service** - 5 endpoints
- POST `/api/inventory/items` - Create inventory
- GET `/api/inventory/items` - List inventory
- PATCH `/api/inventory/items/:id` - Update inventory
- GET `/api/inventory/alerts` - Get low stock alerts
- GET `/api/inventory/stats` - Inventory statistics

### 6️⃣ **Analytics Service** - 4 endpoints
- GET `/api/analytics/order-history` - Order history
- GET `/api/analytics/daily-metrics` - Daily metrics
- GET `/api/analytics/order-trends` - Order trends
- GET `/api/analytics/top-items` - Top selling items

### 7️⃣ **Notification Service** - 2 endpoints
- GET `/api/notifications/stats` - Connection stats
- GET `/api/notifications/health` - Health check
- WebSocket `/` - Real-time notifications (Socket.io)

### 8️⃣ **Discount Engine** - 3 endpoints
- POST `/api/discounts/apply` - Apply discount rules
- GET `/api/discounts/rules` - List discount rules
- GET `/health` - Health check

### 9️⃣ **API Gateway** - 2 endpoints
- GET `/health` - Aggregate health
- GET `/routes` - List all routes

---

## Implementation Tasks

### Phase 1: Base Collection Structure
- [ ] Create Postman collection JSON with all 50+ endpoints
- [ ] Define request/response schemas
- [ ] Add descriptions and documentation
- [ ] Setup authorization headers

### Phase 2: Environment Setup
- [ ] Development environment (localhost with test data)
- [ ] Staging environment (staging URLs)
- [ ] Production environment (prod URLs)
- [ ] Authentication token variables

### Phase 3: Request Examples
- [ ] Add example request bodies for each POST/PATCH
- [ ] Add example response bodies
- [ ] Include validation examples
- [ ] Add error response examples

### Phase 4: Authentication Workflows
- [ ] Customer login flow (OTP → JWT)
- [ ] Staff login flow
- [ ] JWT token management
- [ ] Multi-tenant header setup

### Phase 5: Testing & Validation
- [ ] Test all endpoints with sample data
- [ ] Verify multi-tenant isolation
- [ ] Check error responses
- [ ] Validate JWT refresh flows

---

## Postman Collection Format

```json
{
  "info": {
    "name": "Intellidine API",
    "description": "Multi-tenant restaurant management system",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    { "key": "base_url", "value": "http://localhost:3000" },
    { "key": "jwt_token", "value": "" },
    { "key": "tenant_id", "value": "11111111-1111-1111-1111-111111111111" },
    { "key": "phone", "value": "+919876543210" },
    { "key": "otp_code", "value": "123456" }
  ],
  "item": [
    {
      "name": "🔐 Authentication",
      "item": [
        {
          "name": "Customer - Request OTP",
          "request": {
            "method": "POST",
            "header": [{ "key": "Content-Type", "value": "application/json" }],
            "body": {
              "mode": "raw",
              "raw": "{\"phone\": \"{{phone}}\", \"tenant_id\": \"{{tenant_id}}\"}"
            },
            "url": { "raw": "{{base_url}}/api/auth/customer/request-otp" }
          }
        }
      ]
    }
  ]
}
```

---

## Quick Start Guide for Frontend Team

### Step 1: Import Collection
1. Open Postman
2. Click "Import"
3. Upload `Intellidine-API-Collection.json`

### Step 2: Select Environment
1. Top-right dropdown → Select "Development"
2. Or switch to "Staging" / "Production" as needed

### Step 3: Get JWT Token
1. Go to "Authentication" → "Customer - Request OTP"
2. Click Send → Get OTP
3. Go to "Authentication" → "Customer - Verify OTP"
4. Replace OTP code with `123456`
5. Click Send → Copy JWT token from response
6. Set as variable: `{{jwt_token}}`

### Step 4: Start Testing
1. Try "Menu" → "Get Menu"
2. Try "Orders" → "Create Order"
3. Explore other endpoints

---

## Authentication Flow Examples

### 🟢 Customer Flow
```
1. POST /api/auth/customer/request-otp
   Input: { phone: "+919876543210", tenant_id: "..." }
   Output: { success: true, otp_id: "..." }

2. POST /api/auth/customer/verify-otp
   Input: { phone: "+919876543210", code: "123456", tenant_id: "..." }
   Output: { success: true, token: "jwt_token", user: {...} }

3. Use token for all requests:
   Header: Authorization: Bearer jwt_token
```

### 🟢 Staff Flow
```
1. POST /api/auth/staff/login
   Input: { username: "manager1", password: "password123", tenant_id: "..." }
   Output: { success: true, token: "jwt_token", user: {...} }

2. Use token for all requests:
   Header: Authorization: Bearer jwt_token
```

---

## Error Response Templates

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Invalid phone number format",
  "error": "BadRequestException"
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Invalid or expired JWT token",
  "error": "UnauthorizedException"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "You don't have permission to perform this action",
  "error": "ForbiddenException"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Menu item not found",
  "error": "NotFoundException"
}
```

### 500 Internal Server Error
```json
{
  "statusCode": 500,
  "message": "Internal server error occurred",
  "error": "InternalServerErrorException"
}
```

---

## Sample Data for Testing

### Test Tenant
```
tenant_id: 11111111-1111-1111-1111-111111111111
name: Test Restaurant
address: 123 Main St
phone: +919876543210
```

### Test Customer
```
phone: +919876543210
otp_code: 123456 (always works in mock)
```

### Test Staff
```
username: manager1
password: password123
role: manager
```

### Test Menu Items
```
1. Biryani
   - price: 250
   - category: Main Course
   
2. Dosa
   - price: 50
   - category: Breakfast
   
3. Chole Bhature
   - price: 80
   - category: North Indian
```

---

## Pre-request Scripts (Optional)

### Auto-increment Order ID
```javascript
const orderId = parseInt(pm.environment.get("order_id") || "0") + 1;
pm.environment.set("order_id", orderId.toString());
pm.request.body.raw = pm.request.body.raw.replace("{{order_id}}", orderId);
```

### Extract JWT from Response
```javascript
if (pm.response.code === 200) {
  const jsonData = pm.response.json();
  pm.environment.set("jwt_token", jsonData.token);
  pm.environment.set("user_id", jsonData.user.id);
}
```

---

## Collection Export

**File name:** `Intellidine-API-Collection.json`  
**Format:** Postman Collection v2.1  
**Size:** ~150-200 KB  
**Includes:**
- 50+ endpoints fully documented
- 3 environment configurations
- Request/response examples
- Pre-request scripts
- Test assertions

---

## Delivery Checklist

- [ ] Collection JSON file created and validated
- [ ] All 50+ endpoints documented
- [ ] Request bodies with valid examples
- [ ] Response schemas documented
- [ ] 3 environments configured
- [ ] Authentication workflows tested
- [ ] Multi-tenant headers configured
- [ ] Error responses documented
- [ ] Pre-request scripts working
- [ ] Test scripts validating responses
- [ ] README with setup instructions
- [ ] Ready for frontend team handoff

---

## Timeline

**Total time for this phase:** 2-3 hours

- Phase 1 (Base Structure): 30 mins
- Phase 2 (Environments): 20 mins
- Phase 3 (Examples): 45 mins
- Phase 4 (Auth Workflows): 30 mins
- Phase 5 (Testing): 45 mins

---

## Success Criteria ✅

- ✅ All 50+ endpoints documented
- ✅ Working authentication flow
- ✅ Sample requests for every CRUD operation
- ✅ Error responses documented
- ✅ Multi-tenant isolation verified
- ✅ Ready for frontend team integration
- ✅ Frontend can start building UI immediately

---

*Plan Created: October 20, 2025*  
*Ready to proceed with implementation*
