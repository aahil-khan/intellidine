# API Documentation

## Base URLs

- **Development**: http://localhost:3000 (via Nginx reverse proxy)
- **Auth Service**: http://localhost:3001
- **Order Service**: http://localhost:3002
- **Menu Service**: http://localhost:3003
- **Inventory Service**: http://localhost:3004

## Authentication

All endpoints (except public ones) require:
```
Authorization: Bearer <JWT_TOKEN>
```

See [AUTH_GUIDE.md](AUTH_GUIDE.md) for details.

---

## Authentication Endpoints

### POST /api/auth/customer/request-otp

Request OTP for customer login.

**Query Parameters**: None  
**Request Body**:
```json
{
  "phone": "+919876543210"
}
```

**Response** (200 OK):
```json
{
  "message": "OTP sent successfully",
  "expires_at": "2025-10-19T19:34:38.651Z"
}
```

**Errors**:
- 400: Invalid phone number format
- 500: SMS sending failed

---

### POST /api/auth/customer/verify-otp

Verify OTP and get JWT token.

**Query Parameters**: None  
**Request Body**:
```json
{
  "phone": "+919876543210",
  "otp": "615375"
}
```

**Response** (200 OK):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_at": "2025-10-20T19:29:50.000Z",
  "user": {
    "id": "customer-uuid",
    "phone_number": "+919876543210"
  }
}
```

**Errors**:
- 400: Invalid or expired OTP
- 400: Phone not found

---

### POST /api/auth/staff/login

Staff/Manager login with username and password.

**Query Parameters**: None  
**Request Body**:
```json
{
  "username": "manager1",
  "password": "password123"
}
```

**Response** (200 OK):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_at": "2025-10-20T20:31:03.000Z",
  "user": {
    "id": "staff-uuid",
    "username": "manager1",
    "email": "manager@example.com",
    "role": "MANAGER",
    "tenant_id": "tenant-uuid"
  }
}
```

**Errors**:
- 401: Invalid credentials
- 400: User not found

---

## Order Endpoints

### POST /api/orders

Create a new order.

**Query Parameters**:
- `tenant_id` (required): Restaurant/tenant ID

**Request Body**:
```json
{
  "table_id": "5",
  "items": [
    {
      "menu_item_id": "item_001",
      "quantity": 2,
      "special_instructions": "Extra spicy"
    },
    {
      "menu_item_id": "item_005",
      "quantity": 1
    }
  ],
  "customer_id": "optional-customer-uuid",
  "special_instructions": "Extra quick prep"
}
```

**Response** (201 Created):
```json
{
  "id": "order-uuid",
  "tenant_id": "tenant-uuid",
  "table_id": "5",
  "customer_id": "customer-uuid",
  "status": "PENDING",
  "items": [
    {
      "id": "item-uuid",
      "menu_item_id": "item_001",
      "quantity": 2,
      "price_at_order": 280,
      "subtotal": 560,
      "special_instructions": "Extra spicy"
    }
  ],
  "subtotal": 610,
  "tax_amount": 109.8,
  "total": 719.8,
  "created_at": "2025-10-19T06:34:35.071Z"
}
```

**Errors**:
- 400: Missing tenant_id
- 400: Invalid menu items
- 400: Invalid customer_id

**Side Effects**:
- Kafka event: `order.created`
- Kafka event: `inventory.reserved`
- Kafka event: `payment.requested`

---

### GET /api/orders

List orders for a tenant with filtering and pagination.

**Query Parameters**:
- `tenant_id` (required): Restaurant/tenant ID
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `status` (optional): Filter by status (PENDING, PREPARING, READY, SERVED, COMPLETED, CANCELLED)
- `table_id` (optional): Filter by table number
- `customer_id` (optional): Filter by customer
- `date_from` (optional): ISO date string (YYYY-MM-DD)
- `date_to` (optional): ISO date string (YYYY-MM-DD)
- `sort_by` (optional): Field to sort by (created_at, status, total)
- `sort_order` (optional): asc or desc (default: desc)

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": "order-uuid",
      "table_id": "5",
      "customer_id": "customer-uuid",
      "status": "PENDING",
      "total": 719.8,
      "items_count": 2,
      "created_at": "2025-10-19T06:34:35.071Z"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 10
}
```

**Errors**:
- 400: Missing tenant_id
- 400: Invalid page/limit values

---

### GET /api/orders/:id

Get a single order by ID.

**Query Parameters**: None  
**Response** (200 OK):
```json
{
  "id": "order-uuid",
  "tenant_id": "tenant-uuid",
  "table_id": "5",
  "customer_id": "customer-uuid",
  "status": "PENDING",
  "items": [
    {
      "id": "item-uuid",
      "menu_item_id": "item_001",
      "quantity": 2,
      "price_at_order": 280,
      "subtotal": 560
    }
  ],
  "subtotal": 610,
  "tax_amount": 109.8,
  "total": 719.8,
  "created_at": "2025-10-19T06:34:35.071Z"
}
```

**Errors**:
- 404: Order not found

---

### PATCH /api/orders/:id/status

Update order status with state machine validation.

**Query Parameters**:
- `tenant_id` (required): Restaurant/tenant ID

**Request Body**:
```json
{
  "status": "PREPARING",
  "notes": "Kitchen started"
}
```

**Response** (200 OK):
```json
{
  "id": "order-uuid",
  "status": "PREPARING",
  "items": [...],
  "total": 719.8
}
```

**Status Transitions**:
```
PENDING → PREPARING
PREPARING → READY
READY → SERVED
SERVED → COMPLETED
[ANY] → CANCELLED
```

**Errors**:
- 400: Invalid status transition
- 400: Missing tenant_id
- 401: Order belongs to different tenant
- 404: Order not found

**Side Effects**:
- Kafka event: `order.status_changed`
- Kafka event: `order.completed` (if status = COMPLETED or CANCELLED)

---

### PATCH /api/orders/:id/cancel

Cancel an order.

**Query Parameters**:
- `tenant_id` (required): Restaurant/tenant ID

**Request Body**:
```json
{
  "notes": "Customer cancelled"
}
```

**Response** (200 OK):
```json
{
  "id": "order-uuid",
  "status": "CANCELLED",
  "items": [...],
  "total": 719.8
}
```

**Errors**:
- 400: Missing tenant_id
- 401: Order belongs to different tenant
- 404: Order not found

---

## Menu Endpoints

### GET /api/menu

List all menu items grouped by category with caching.

**Query Parameters**:
- `tenant_id` (required): Restaurant/tenant ID
- `category_id` (optional): Filter by category
- `search` (optional): Search by name

**Response** (200 OK):
```json
{
  "categories": [
    {
      "id": "category-uuid",
      "name": "Appetizers",
      "items": [
        {
          "id": "item_001",
          "name": "Paneer Tikka",
          "price": 280,
          "description": "Grilled paneer",
          "is_available": true
        }
      ]
    }
  ],
  "cached": true,
  "cache_ttl_remaining": 240
}
```

**Caching**:
- TTL: 300 seconds (5 minutes)
- Invalidated on: POST, PATCH, DELETE

---

### POST /api/menu/items

Create a new menu item (Manager only).

**Query Parameters**:
- `tenant_id` (required): Restaurant/tenant ID

**Request Body**:
```json
{
  "category_id": "category-uuid",
  "name": "Butter Chicken",
  "description": "Creamy butter chicken curry",
  "price": 380,
  "cost_price": 150,
  "preparation_time": 20,
  "dietary_tags": ["non-vegetarian", "gluten-free"]
}
```

**Response** (201 Created):
```json
{
  "id": "item-uuid",
  "tenant_id": "tenant-uuid",
  "name": "Butter Chicken",
  "price": 380,
  "is_available": true
}
```

**Errors**:
- 401: Unauthorized (not a manager)
- 400: Missing required fields

**Side Effects**:
- Clears menu cache for the tenant

---

### PATCH /api/menu/items/:id

Update a menu item (Manager only).

**Query Parameters**:
- `tenant_id` (required): Restaurant/tenant ID

**Request Body**:
```json
{
  "price": 420,
  "is_available": false
}
```

**Response** (200 OK):
```json
{
  "id": "item-uuid",
  "name": "Butter Chicken",
  "price": 420,
  "is_available": false
}
```

---

### DELETE /api/menu/items/:id

Soft delete a menu item (Manager only).

**Query Parameters**:
- `tenant_id` (required): Restaurant/tenant ID

**Response** (204 No Content)

---

## Health Check Endpoints

### GET /health

Service health check (no auth required).

**Response** (200 OK):
```json
{
  "status": "ok",
  "service": "order-service",
  "timestamp": "2025-10-19T07:00:00.000Z"
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Bad Request"
}
```

Common status codes:
- **200**: OK
- **201**: Created
- **204**: No Content (success with no response body)
- **400**: Bad Request
- **401**: Unauthorized
- **403**: Forbidden
- **404**: Not Found
- **500**: Internal Server Error

---

## Rate Limiting

Currently no rate limiting. Will be implemented in Sprint 2.

---

## Webhooks & Events

Orders emit Kafka events for real-time processing:
- `order.created`: When order is created
- `order.status_changed`: When order status changes
- `order.completed`: When order is completed or cancelled
- `inventory.reserved`: When inventory is reserved
- `payment.requested`: When payment is needed

---

## Testing with curl

### Get authentication token
```bash
curl -X POST http://localhost:3001/api/auth/customer/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919876543210"}'
```

### Create an order
```bash
curl -X POST 'http://localhost:3002/api/orders?tenant_id=11111111-1111-1111-1111-111111111111' \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "table_id":"5",
    "items":[{"menu_item_id":"item_001","quantity":2}]
  }'
```

---

## Last Updated

October 19, 2025 - Step 1.3 Complete
