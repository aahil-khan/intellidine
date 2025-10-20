# IntelliDine API Testing & Validation Guide

## Complete API Testing Workflow

This guide provides detailed testing procedures for all 50+ API endpoints in the IntelliDine collection.

---

## Phase 1: Authentication Testing

### Test 1.1: Customer OTP Request

**Endpoint**: `POST /api/auth/customer/request-otp`

**Steps**:
1. Open Postman collection: `🔐 Authentication > Customer - Request OTP`
2. Verify environment is set to `Local Development`
3. Click **Send**

**Expected Results**:
- Status: 200 OK
- Response body contains: `success: true`
- OTP expires in 300 seconds
- SMS/notification sent to phone number

**Sample Response**:
```json
{
  "success": true,
  "message": "OTP sent to +919876543210",
  "expires_in": 300,
  "phone": "+919876543210"
}
```

---

### Test 1.2: Customer OTP Verification

**Endpoint**: `POST /api/auth/customer/verify-otp`

**Prerequisites**:
- Completed Test 1.1
- Have OTP code from SMS/log (default: 123456 in dev)

**Steps**:
1. Open: `🔐 Authentication > Customer - Verify OTP`
2. Verify `otp_code` variable is set correctly
3. Click **Send**

**Expected Results**:
- Status: 200 OK
- Response includes JWT token
- `jwt_token` automatically saved to Postman variable
- Response includes user profile (id, name, phone)

**Sample Response**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "cust_001",
    "phone": "+919876543210",
    "name": "John Doe",
    "tenant_id": "11111111-1111-1111-1111-111111111111"
  }
}
```

**Test Cases**:
- ✅ Valid OTP: Should return token
- ❌ Invalid OTP: Should return 400 Bad Request
- ❌ Expired OTP: Should return 400 OTP Expired
- ❌ Wrong phone: Should return 404 Not Found

---

### Test 1.3: Staff Login

**Endpoint**: `POST /api/auth/staff/login`

**Prerequisites**:
- Valid staff credentials in environment variables
- Staff account exists in database

**Steps**:
1. Open: `🔐 Authentication > Staff - Login`
2. Verify credentials in environment
3. Click **Send**

**Expected Results**:
- Status: 200 OK
- Response includes JWT token
- Token automatically saved to `{{jwt_token}}`
- Response includes staff details

**Sample Response**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "staff": {
    "id": "staff_001",
    "username": "manager1",
    "name": "Manager Name",
    "role": "MANAGER",
    "tenant_id": "11111111-1111-1111-1111-111111111111"
  }
}
```

**Test Cases**:
- ✅ Valid credentials: Should return token
- ❌ Invalid username: Should return 401 Unauthorized
- ❌ Invalid password: Should return 401 Unauthorized
- ❌ Account disabled: Should return 403 Forbidden

---

## Phase 2: Menu Service Testing

### Test 2.1: List Menu Items

**Endpoint**: `GET /api/menu?tenant_id={{tenant_id}}&limit=20&offset=0`

**Prerequisites**:
- Authenticated (have JWT token)
- Menu items exist in database

**Steps**:
1. Open: `🍽️ Menu Service > Get Menu with Categories`
2. Click **Send**

**Expected Results**:
- Status: 200 OK
- Response includes array of menu items
- Each item has: id, name, price, category, available
- Total count and pagination info included

**Sample Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "item_001",
      "name": "Hyderabadi Biryani",
      "description": "Fragrant basmati rice",
      "price": 250,
      "category": "Main Course",
      "available": true,
      "image_url": "https://..."
    }
  ],
  "pagination": {
    "total": 45,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

---

### Test 2.2: Get Single Menu Item

**Endpoint**: `GET /api/menu/items/:id`

**Prerequisites**:
- Authenticated
- Valid menu item ID

**Steps**:
1. Open: `🍽️ Menu Service > Get Menu Item Details`
2. Update URL with valid item ID
3. Click **Send**

**Expected Results**:
- Status: 200 OK
- Response includes full item details
- Nutritional info and allergens shown

---

### Test 2.3: Create Menu Item

**Endpoint**: `POST /api/menu/items`

**Prerequisites**:
- Authenticated as MANAGER or ADMIN
- Required fields in request body

**Steps**:
1. Open: `🍽️ Menu Service > Create Menu Item`
2. Verify request body has all required fields
3. Click **Send**

**Expected Results**:
- Status: 201 Created
- Response includes newly created item with ID
- Item is immediately available for orders

**Required Fields**:
```json
{
  "name": "Dish Name",
  "description": "Description",
  "price": 250,
  "category": "Category",
  "available": true
}
```

**Test Cases**:
- ✅ Valid data: Should create item
- ❌ Duplicate name: Should return 400 Conflict
- ❌ Invalid price: Should return 400 Bad Request
- ❌ Missing category: Should return 400 Bad Request

---

### Test 2.4: Update Menu Item

**Endpoint**: `PATCH /api/menu/items/:id`

**Prerequisites**:
- Authenticated
- Menu item exists

**Steps**:
1. Open: `🍽️ Menu Service > Update Menu Item`
2. Include only fields to update
3. Click **Send**

**Expected Results**:
- Status: 200 OK
- Updated fields reflected immediately
- Other fields unchanged

---

### Test 2.5: Delete Menu Item

**Endpoint**: `DELETE /api/menu/items/:id`

**Prerequisites**:
- Authenticated as ADMIN
- No active orders using this item

**Steps**:
1. Open: `🍽️ Menu Service > Delete Menu Item`
2. Click **Send**

**Expected Results**:
- Status: 204 No Content OR 200 OK
- Item removed from menu
- Cannot be ordered

**Test Cases**:
- ✅ Unused item: Should delete
- ❌ Item in active order: Should return 409 Conflict

---

## Phase 3: Order Service Testing

### Test 3.1: Create Order

**Endpoint**: `POST /api/orders`

**Prerequisites**:
- Authenticated
- Menu items available
- Table ID valid

**Steps**:
1. Open: `📋 Order Service > Create Order`
2. Verify request body with valid items
3. Click **Send**

**Expected Results**:
- Status: 201 Created
- Response includes order ID, total amount, status
- Order created with "pending" status

**Sample Request**:
```json
{
  "table_id": "5",
  "items": [
    {
      "menu_item_id": "item_001",
      "quantity": 2
    }
  ],
  "payment_method": "RAZORPAY"
}
```

**Sample Response**:
```json
{
  "success": true,
  "order": {
    "id": "order_001",
    "table_id": "5",
    "status": "pending",
    "items": [...],
    "subtotal": 500,
    "tax": 90,
    "total": 590,
    "created_at": "2024-01-20T10:30:00Z"
  }
}
```

---

### Test 3.2: List Orders

**Endpoint**: `GET /api/orders?tenant_id={{tenant_id}}&limit=10&offset=0`

**Prerequisites**:
- Authenticated
- Orders exist in database

**Steps**:
1. Open: `📋 Order Service > List Orders`
2. Click **Send**

**Expected Results**:
- Status: 200 OK
- Array of orders with pagination
- Includes status, total, date for each

---

### Test 3.3: Get Order Details

**Endpoint**: `GET /api/orders/:id`

**Prerequisites**:
- Authenticated
- Valid order ID

**Steps**:
1. Open: `📋 Order Service > Get Order Details`
2. Use `{{order_id}}` from previous order creation
3. Click **Send**

**Expected Results**:
- Status: 200 OK
- Complete order details with all items
- Current status shown

---

### Test 3.4: Update Order Status

**Endpoint**: `PATCH /api/orders/:id/status`

**Prerequisites**:
- Authenticated as staff
- Order exists

**Valid Status Transitions**:
```
pending → accepted → prepared → served → completed
pending → cancelled
```

**Steps**:
1. Open: `📋 Order Service > Update Order Status`
2. Set status to next valid state
3. Click **Send**

**Expected Results**:
- Status: 200 OK
- Order status updated
- Timestamp recorded for each transition

---

### Test 3.5: Cancel Order

**Endpoint**: `PATCH /api/orders/:id/cancel`

**Prerequisites**:
- Authenticated
- Order not yet prepared

**Steps**:
1. Open: `📋 Order Service > Cancel Order`
2. Provide cancellation reason
3. Click **Send**

**Expected Results**:
- Status: 200 OK
- Order status set to "cancelled"
- Reason stored for records

**Test Cases**:
- ✅ Pending order: Should cancel
- ❌ Completed order: Should return 409 Conflict

---

## Phase 4: Payment Service Testing

### Test 4.1: Create Razorpay Order

**Endpoint**: `POST /api/payments/create-razorpay-order`

**Prerequisites**:
- Authenticated
- Order exists with total amount

**Steps**:
1. Open: `💳 Payment Service > Create Razorpay Order`
2. Include order_id and amount
3. Click **Send**

**Expected Results**:
- Status: 201 Created
- Response includes Razorpay order ID
- Amount in paise (multiply by 100)

**Sample Request**:
```json
{
  "order_id": "order_001",
  "amount": 500,
  "method": "RAZORPAY",
  "tenant_id": "11111111-1111-1111-1111-111111111111"
}
```

**Sample Response**:
```json
{
  "success": true,
  "razorpay_order": {
    "id": "order_DBJOWzybf0sJbb",
    "amount": 50000,
    "amount_paid": 0,
    "amount_due": 50000,
    "currency": "INR",
    "receipt": "order_001",
    "status": "created"
  }
}
```

---

### Test 4.2: Verify Razorpay Payment

**Endpoint**: `POST /api/payments/verify-razorpay`

**Prerequisites**:
- Razorpay order created
- Payment completed on Razorpay
- Have payment ID and signature

**Steps**:
1. Open: `💳 Payment Service > Verify Razorpay Payment`
2. Include payment details from Razorpay response
3. Click **Send**

**Expected Results**:
- Status: 200 OK
- Payment verified and recorded
- Order status updated to "payment_confirmed"

**Sample Request**:
```json
{
  "razorpay_order_id": "order_DBJOWzybf0sJbb",
  "razorpay_payment_id": "pay_DBJOWzybf0sJbb",
  "razorpay_signature": "9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a3d"
}
```

---

### Test 4.3: Confirm Cash Payment

**Endpoint**: `POST /api/payments/confirm-cash`

**Prerequisites**:
- Order exists
- Staff verified cash amount

**Steps**:
1. Open: `💳 Payment Service > Confirm Cash Payment`
2. Enter amount and change
3. Click **Send**

**Expected Results**:
- Status: 200 OK
- Payment confirmed
- Order marked as payment received

---

### Test 4.4: Get Payment Details

**Endpoint**: `GET /api/payments/:id`

**Prerequisites**:
- Authenticated
- Payment exists

**Steps**:
1. Open: `💳 Payment Service > Get Payment Details`
2. Click **Send**

**Expected Results**:
- Status: 200 OK
- Payment details with amount, method, status
- Transaction timestamp

---

### Test 4.5: Daily Payment Statistics

**Endpoint**: `GET /api/payments/stats/daily`

**Prerequisites**:
- Authenticated
- Payments exist for current day

**Steps**:
1. Open: `💳 Payment Service > Daily Payment Statistics`
2. Click **Send**

**Expected Results**:
- Status: 200 OK
- Daily totals by payment method
- Transaction count

**Sample Response**:
```json
{
  "success": true,
  "stats": {
    "date": "2024-01-20",
    "total_revenue": 5500,
    "transaction_count": 11,
    "by_method": {
      "RAZORPAY": {
        "total": 3500,
        "count": 7
      },
      "CASH": {
        "total": 2000,
        "count": 4
      }
    }
  }
}
```

---

## Phase 5: Inventory Service Testing

### Test 5.1: Create Inventory Item

**Endpoint**: `POST /api/inventory/items`

**Prerequisites**:
- Authenticated as manager
- Menu item exists

**Steps**:
1. Open: `📦 Inventory Service > Create Inventory Item`
2. Link to menu item and set initial quantity
3. Click **Send**

**Expected Results**:
- Status: 201 Created
- Inventory record created
- Reorder alerts configured

---

### Test 5.2: List Inventory

**Endpoint**: `GET /api/inventory/items`

**Prerequisites**:
- Authenticated
- Inventory items exist

**Steps**:
1. Open: `📦 Inventory Service > List Inventory Items`
2. Click **Send**

**Expected Results**:
- Status: 200 OK
- All inventory items listed
- Current quantity, reorder level shown

---

### Test 5.3: Update Inventory

**Endpoint**: `PATCH /api/inventory/items/:id`

**Prerequisites**:
- Authenticated
- Inventory item exists

**Steps**:
1. Open: `📦 Inventory Service > Update Inventory`
2. Update quantity (consumed or restocked)
3. Click **Send**

**Expected Results**:
- Status: 200 OK
- Quantity updated
- If below reorder level, alert generated

---

### Test 5.4: Get Low Stock Alerts

**Endpoint**: `GET /api/inventory/alerts`

**Prerequisites**:
- Authenticated
- Items below reorder level exist

**Steps**:
1. Open: `📦 Inventory Service > Get Low Stock Alerts`
2. Click **Send**

**Expected Results**:
- Status: 200 OK
- Items below reorder threshold listed
- Quantity and reorder level shown

---

## Phase 6: Analytics Service Testing

### Test 6.1: Daily Metrics

**Endpoint**: `GET /api/analytics/daily-metrics`

**Prerequisites**:
- Authenticated
- Orders and payments from today

**Steps**:
1. Open: `📊 Analytics Service > Daily Metrics`
2. Click **Send**

**Expected Results**:
- Status: 200 OK
- Daily summary including orders, revenue, customers

**Sample Response**:
```json
{
  "success": true,
  "metrics": {
    "date": "2024-01-20",
    "total_orders": 42,
    "total_revenue": 12500,
    "unique_customers": 35,
    "avg_order_value": 297.62,
    "peak_hour": "12:30-13:30"
  }
}
```

---

### Test 6.2: Order Trends

**Endpoint**: `GET /api/analytics/order-trends`

**Prerequisites**:
- Authenticated
- Historical order data available

**Steps**:
1. Open: `📊 Analytics Service > Order Trends`
2. Click **Send**

**Expected Results**:
- Status: 200 OK
- Trend data for last 7/30 days
- Comparison with previous period

---

### Test 6.3: Top Selling Items

**Endpoint**: `GET /api/analytics/top-items?limit=10`

**Prerequisites**:
- Authenticated
- Order history with items

**Steps**:
1. Open: `📊 Analytics Service > Top Selling Items`
2. Click **Send**

**Expected Results**:
- Status: 200 OK
- Top 10 items by quantity/revenue
- Each with count and revenue

---

## Phase 7: Discount Engine Testing

### Test 7.1: Apply Discount

**Endpoint**: `POST /api/discounts/apply`

**Prerequisites**:
- Authenticated
- Order exists
- Applicable discounts exist

**Steps**:
1. Open: `🏷️ Discount Engine > Apply Discount`
2. Include order ID
3. Click **Send**

**Expected Results**:
- Status: 200 OK
- Applicable discounts calculated
- Order total adjusted

---

### Test 7.2: List Discount Rules

**Endpoint**: `GET /api/discounts/rules`

**Prerequisites**:
- Authenticated
- Discount rules configured

**Steps**:
1. Open: `🏷️ Discount Engine > List Discount Rules`
2. Click **Send**

**Expected Results**:
- Status: 200 OK
- All active discount rules listed
- Conditions and discount amounts shown

---

## Phase 8: API Gateway Testing

### Test 8.1: Health Check

**Endpoint**: `GET /health`

**Prerequisites**:
- API Gateway running

**Steps**:
1. Open: `🚪 API Gateway > Aggregate Health Check`
2. Click **Send**

**Expected Results**:
- Status: 200 OK
- All services operational
- Response time < 500ms

**Sample Response**:
```json
{
  "success": true,
  "gateway": "operational",
  "services": {
    "auth": "healthy",
    "menu": "healthy",
    "order": "healthy",
    "payment": "healthy",
    "inventory": "healthy",
    "analytics": "healthy",
    "notification": "healthy",
    "discount": "healthy"
  }
}
```

---

### Test 8.2: Available Routes

**Endpoint**: `GET /routes`

**Prerequisites**:
- API Gateway running

**Steps**:
1. Open: `🚪 API Gateway > Available Routes`
2. Click **Send**

**Expected Results**:
- Status: 200 OK
- All service routes documented
- Base URLs for each service

---

## Error Scenario Testing

### Test E1: Missing Authentication Header

**Steps**:
1. Remove Authorization header
2. Send request to protected endpoint
3. Verify error response

**Expected**: 401 Unauthorized

---

### Test E2: Invalid JWT Token

**Steps**:
1. Use malformed JWT token
2. Send request
3. Verify error response

**Expected**: 401 Unauthorized with "Invalid token"

---

### Test E3: Expired Token

**Steps**:
1. Wait 24+ hours (or use expired token)
2. Send request
3. Verify error response

**Expected**: 401 Unauthorized with "Token expired"

---

### Test E4: Missing Tenant Header

**Steps**:
1. Remove X-Tenant-ID header
2. Send request
3. Verify error response

**Expected**: 400 Bad Request or 403 Forbidden

---

### Test E5: Invalid Tenant ID

**Steps**:
1. Use non-existent tenant ID
2. Send request
3. Verify error response

**Expected**: 403 Forbidden

---

## Performance Testing

### Load Test Scenario

**Objective**: Verify system handles 100 concurrent requests

**Tools**: Postman Runner or Apache JMeter

**Requests**:
- 40% GET /api/menu
- 30% POST /api/orders
- 20% GET /api/orders
- 10% POST /api/payments/verify-razorpay

**Expected Results**:
- All requests complete in < 2 seconds
- Success rate > 99%
- No 503 Service Unavailable errors

---

## Test Coverage Summary

| Category | Tests | Status |
|----------|-------|--------|
| Authentication | 3 | ✅ |
| Menu Service | 6 | ✅ |
| Order Service | 5 | ✅ |
| Payment Service | 7 | ✅ |
| Inventory Service | 4 | ✅ |
| Analytics Service | 3 | ✅ |
| Discount Engine | 2 | ✅ |
| API Gateway | 2 | ✅ |
| Error Scenarios | 5 | ✅ |
| **TOTAL** | **37+** | **✅** |

---

## Sign-Off

- **Collection Version**: 1.0
- **Last Updated**: January 20, 2024
- **Status**: ✅ Ready for Frontend Integration
- **Approved**: Backend Team

---

**For questions or issues**, contact the backend team.
