# IntelliDine API Quick Start Guide

## Overview

This guide helps frontend developers quickly get started with the IntelliDine API collection. The API provides 50+ endpoints across 9 microservices for managing a multi-tenant restaurant management system.

## Prerequisites

- Postman (v10 or later) - [Download](https://www.postman.com/downloads/)
- Node.js backend services running locally or on a server
- Valid tenant credentials for testing

## Installation

### Step 1: Import the Collection

1. Open Postman
2. Click **Import** (top left)
3. Select the file: `Intellidine-API-Collection.postman_collection.json`
4. Click **Import**

### Step 2: Import Environments

1. Click **Environments** (left sidebar)
2. Click **Import**
3. Select: `Intellidine-Environments.postman_environments.json`
4. Choose your environment (Local Development, Staging, or Production)

### Step 3: Configure Your Environment

1. Select environment from top-right dropdown
2. Click the eye icon to view/edit variables:
   - `base_url`: API endpoint (e.g., http://localhost:3000)
   - `tenant_id`: Your restaurant/tenant UUID
   - `customer_phone`: Test phone number (e.g., +919876543210)
   - `staff_username`: Staff login username
   - `staff_password`: Staff login password

## Authentication Flow

### Customer Authentication (OTP)

1. **Request OTP**
   - Send customer phone number
   - Collection: `🔐 Authentication > Customer - Request OTP`
   - Returns: OTP expires in 300 seconds

2. **Verify OTP & Get JWT Token**
   - Enter OTP code received
   - Collection: `🔐 Authentication > Customer - Verify OTP`
   - The JWT token is **automatically saved** to `{{jwt_token}}` variable
   - Response includes customer user ID and profile

### Staff Authentication (Login)

1. **Staff Login**
   - Enter staff credentials (username/password)
   - Collection: `🔐 Authentication > Staff - Login`
   - JWT token is **automatically saved** to `{{jwt_token}}` variable
   - Token is valid for 24 hours

## Using the API Collection

### Multi-Tenant Header

All requests include the `X-Tenant-ID` header, which is automatically set from the `{{tenant_id}}` variable.

```
X-Tenant-ID: {{tenant_id}}
```

### Authorization Header

All authenticated requests use:

```
Authorization: Bearer {{jwt_token}}
```

### Common Request Patterns

#### GET Request with Pagination
```
GET /api/menu?tenant_id={{tenant_id}}&limit=20&offset=0
```

- `limit`: Number of records to fetch
- `offset`: Starting position for pagination

#### POST Request with Body
```
POST /api/orders
Authorization: Bearer {{jwt_token}}
X-Tenant-ID: {{tenant_id}}
Content-Type: application/json

{
  "table_id": "5",
  "items": [{"menu_item_id": "item_001", "quantity": 2}],
  "payment_method": "RAZORPAY"
}
```

## Service Endpoints

### 🔐 Authentication (Auth Service)
- **Port**: 3001
- `POST /api/auth/customer/request-otp` - Request OTP for customer
- `POST /api/auth/customer/verify-otp` - Verify OTP and get JWT
- `POST /api/auth/staff/login` - Staff login

### 🍽️ Menu Service
- **Port**: 3002
- `GET /api/menu` - List all menu items with categories
- `GET /api/menu/items/:id` - Get item details
- `POST /api/menu/items` - Create new item
- `PATCH /api/menu/items/:id` - Update item
- `DELETE /api/menu/items/:id` - Delete item
- `GET /api/menu/health` - Service health check

### 📋 Order Service
- **Port**: 3003
- `POST /api/orders` - Create new order
- `GET /api/orders` - List orders
- `GET /api/orders/:id` - Get order details
- `PATCH /api/orders/:id/status` - Update order status
- `PATCH /api/orders/:id/cancel` - Cancel order

### 💳 Payment Service
- **Port**: 3004
- `POST /api/payments/create-razorpay-order` - Create Razorpay order
- `POST /api/payments/verify-razorpay` - Verify Razorpay payment
- `POST /api/payments/confirm-cash` - Confirm cash payment
- `GET /api/payments/:id` - Get payment details
- `GET /api/payments` - List payments
- `GET /api/payments/stats/daily` - Daily payment statistics
- `GET /api/payments/health` - Service health check

### 📦 Inventory Service
- **Port**: 3005
- `POST /api/inventory/items` - Create inventory item
- `GET /api/inventory/items` - List inventory
- `PATCH /api/inventory/items/:id` - Update inventory
- `GET /api/inventory/alerts` - Get low stock alerts
- `GET /api/inventory/stats` - Get inventory statistics

### 📊 Analytics Service
- **Port**: 3007
- `GET /api/analytics/daily-metrics` - Daily performance metrics
- `GET /api/analytics/order-trends` - Order trends over time
- `GET /api/analytics/top-items` - Top selling items

### 🔔 Notification Service
- **Port**: 3006
- `GET /api/notifications/stats` - Connection statistics
- `WS /socket.io` - WebSocket for real-time notifications

### 🏷️ Discount Engine
- **Port**: 3008
- `POST /api/discounts/apply` - Apply discount to order
- `GET /api/discounts/rules` - List discount rules

### 🚪 API Gateway
- **Port**: 3000
- `GET /health` - Aggregate health check
- `GET /routes` - Available routes

## Workflow Examples

### Complete Order Workflow

1. **Authenticate**
   ```
   POST /api/auth/customer/request-otp
   → POST /api/auth/customer/verify-otp → Get {{jwt_token}}
   ```

2. **View Menu**
   ```
   GET /api/menu?limit=20
   → Select items to order
   ```

3. **Create Order**
   ```
   POST /api/orders
   Body: {table_id, items array, payment_method}
   → Get order_id
   ```

4. **Create Payment**
   ```
   POST /api/payments/create-razorpay-order
   Body: {order_id, amount, method}
   → Get Razorpay order ID
   ```

5. **Verify Payment**
   ```
   POST /api/payments/verify-razorpay
   Body: {razorpay_order_id, razorpay_payment_id, razorpay_signature}
   → Payment confirmed
   ```

6. **Check Order Status**
   ```
   GET /api/orders/{order_id}
   → View completed order
   ```

## Testing Best Practices

### Use Collections and Runners

1. Navigate to a folder (e.g., "🔐 Authentication")
2. Click the ▶️ play icon
3. Select "Run collection" to execute all requests in sequence

### Pre-request Scripts

Some requests include pre-request scripts to:
- Automatically extract JWT tokens
- Set required headers
- Generate timestamps

### Response Validation

Test scripts automatically validate:
- HTTP status codes (200, 201, 400, 401, 404, 500)
- Response JSON structure
- Required fields

Check the **Test Results** tab to see validation results.

## Common Issues & Troubleshooting

### "jwt_token is empty or undefined"
- **Solution**: Run the authentication flow first to populate the token
- Ensure you're in the correct environment
- Check that `{{jwt_token}}` is set in environment variables

### "401 Unauthorized"
- **Solution**: JWT token may have expired (24 hours)
- Re-authenticate using the login/OTP flow
- Verify X-Tenant-ID header matches tenant_id variable

### "400 Bad Request"
- Check request body JSON syntax
- Verify all required fields are present
- Compare with collection examples

### "CORS Error"
- Backend must have CORS configured
- Verify base_url matches your environment
- Check CORS headers in API Gateway

### "503 Service Unavailable"
- Verify the backend service is running on the expected port
- Check API Gateway is routing requests correctly
- Review backend logs for errors

## Data Sample Reference

### Customer Phone Numbers (for testing)
```
+919876543210 (Standard)
+919876543211 (Alternate)
+919876543212 (Test)
```

### OTP Codes (for testing)
```
123456 (Standard)
000000 (Production)
```

### Menu Item IDs (for testing)
```
item_001 - Hyderabadi Biryani
item_002 - Butter Chicken
item_003 - Paneer Tikka
item_004 - Naan
item_005 - Gulab Jamun
```

### Table IDs (for testing)
```
1, 2, 3, 4, 5, 6, 7, 8, 9, 10 (Single digit)
11-20 (Double digit)
```

## Response Examples

### Successful Order Creation (201 Created)
```json
{
  "success": true,
  "order": {
    "id": "order_001",
    "table_id": "5",
    "status": "pending",
    "total_amount": 500,
    "items": [
      {
        "menu_item_id": "item_001",
        "quantity": 2,
        "price": 250
      }
    ],
    "created_at": "2024-01-20T10:30:00Z"
  }
}
```

### Error Response (400 Bad Request)
```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Invalid menu item ID",
    "details": {
      "field": "items[0].menu_item_id",
      "reason": "Item not found"
    }
  }
}
```

### Unauthorized (401)
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired JWT token"
  }
}
```

## Performance Benchmarks

Expected response times under normal load:

| Endpoint | Response Time | Notes |
|----------|---------------|-------|
| GET /api/menu | 100-200ms | Cached, fast |
| POST /api/orders | 200-400ms | Database write |
| POST /api/payments/verify | 500-1000ms | Razorpay integration |
| GET /api/analytics/* | 300-500ms | Data aggregation |
| GET /api/inventory/stats | 150-250ms | Cached aggregation |

## Support & Documentation

### Additional Resources
- Full API documentation: See `API_DOCS.md`
- Architecture overview: See `DEVELOPMENT_PLAN.md`
- Backend setup: See `SETUP.md`
- ML service docs: See `ML_TECHNICAL_DEEP_DIVE.md`

### Getting Help
1. Check request/response in Postman console (Ctrl+Alt+C / Cmd+Option+C)
2. Review backend service logs
3. Check API Gateway routing configuration
4. Verify database connectivity and migrations

## Next Steps

1. ✅ Import collection and environments
2. ✅ Test authentication flow
3. ✅ Explore menu and order endpoints
4. ✅ Implement payment integration
5. ✅ Set up real-time notifications (WebSocket)
6. ✅ Integrate analytics dashboards
7. ✅ Deploy to production environment

---

**Last Updated**: January 20, 2024
**API Version**: 1.0
**Collection Version**: 1.0
**Status**: ✅ Production Ready
