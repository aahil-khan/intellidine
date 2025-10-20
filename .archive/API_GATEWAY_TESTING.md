# API Gateway Testing Guide

## Overview
The API Gateway has been successfully enhanced with:
- ✅ Complete service routing (6 services)
- ✅ Request enrichment (correlation IDs, tenant tracking)
- ✅ Response standardization (consistent format, metadata)
- ✅ Tenant verification middleware
- ✅ Error handling with proper logging

## Service Routes

### 1. Authentication Service
- **Base Path**: `/api/auth/*`
- **Routes**:
  - `POST /api/auth/register` - Register new user
  - `POST /api/auth/login` - Login user
  - `POST /api/auth/refresh` - Refresh JWT token
  - `POST /api/auth/validate` - Validate token

### 2. Menu Service
- **Base Path**: `/api/menu/*`
- **Routes**:
  - `GET /api/menu/items` - Get all menu items
  - `GET /api/menu/items/:id` - Get specific menu item
  - `POST /api/menu/items` - Create menu item (protected)
  - `PUT /api/menu/items/:id` - Update menu item (protected)
  - `DELETE /api/menu/items/:id` - Delete menu item (protected)

### 3. Order Service
- **Base Path**: `/api/orders/*`
- **Routes**:
  - `GET /api/orders` - Get all orders (protected)
  - `GET /api/orders/:id` - Get specific order (protected)
  - `POST /api/orders` - Create new order (protected)
  - `PUT /api/orders/:id` - Update order (protected)
  - `DELETE /api/orders/:id` - Cancel order (protected)

### 4. Inventory Service
- **Base Path**: `/api/inventory/*`
- **Routes**:
  - `GET /api/inventory/items` - Get inventory items
  - `GET /api/inventory/items/:id` - Get specific item
  - `POST /api/inventory/items` - Create inventory item (protected)
  - `PUT /api/inventory/items/:id` - Update item (protected)
  - `DELETE /api/inventory/items/:id` - Delete item (protected)

### 5. Payment Service
- **Base Path**: `/api/payments/*`
- **Routes**:
  - `GET /api/payments/methods` - Get payment methods
  - `POST /api/payments/process` - Process payment (protected)
  - `GET /api/payments/transactions/:id` - Get transaction (protected)
  - `POST /api/payments/refund` - Process refund (protected)

### 6. Notification Service
- **Base Path**: `/api/notifications/*`
- **Routes**:
  - `GET /api/notifications` - Get user notifications (protected)
  - `POST /api/notifications/subscribe` - Subscribe to notifications (protected)
  - `DELETE /api/notifications/:id` - Delete notification (protected)

## Response Format

### Success Response
```json
{
  "data": {
    // Actual response data
  },
  "meta": {
    "timestamp": "2025-10-19T18:48:05.170Z",
    "correlationId": "dc25ce82-2a0c-4669-b813-92a8788a6247",
    "tenantId": "tenant-001" // Optional, if applicable
  }
}
```

### Error Response
```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Service not found for path: /api/invalid/endpoint",
  "correlationId": "b8cc76d8-bd8c-44b0-a5f3-362085433c83",
  "tenantId": "tenant-001", // Optional
  "timestamp": "2025-10-19T18:48:06.231Z",
  "path": "/api/invalid/endpoint"
}
```

## Testing Results

### Route Testing Summary
| Service | Status | URL | Notes |
|---------|--------|-----|-------|
| Auth | ✅ Routing | http://auth-service:3001 | Routing verified |
| Menu | ✅ Routing | http://menu-service:3003 | Routing verified |
| Orders | ✅ Routing | http://order-service:3002 | Requires authentication |
| Inventory | ✅ Routing | http://inventory-service:3004 | Routing verified |
| Payments | ✅ Routing | http://payment-service:3005 | Routing verified |
| Notifications | ✅ Routing | http://notification-service:3006 | Routing verified |

### Health Check Endpoints
- `GET /health` - Gateway health
- `GET /services/health` - All services health status

## Middleware Stack

### 1. Request Context Middleware
- Generates unique correlation IDs
- Tracks request start time
- Adds tracing headers

### 2. Auth Middleware
- Validates JWT tokens
- Extracts user information
- Attaches user context to request

### 3. Tenant Verification Middleware
- Validates tenant ID from token or header
- Propagates tenant context
- Ensures tenant isolation

### 4. Error Handler Middleware
- Standardizes all responses
- Logs errors with context
- Adds metadata to responses

## Header Propagation

### Request Headers (Forwarded)
- `Authorization: Bearer <token>`
- `x-correlation-id` - For request tracing
- `x-tenant-id` - For tenant isolation
- `x-user-id` - User identifier
- `Content-Type` - Request content type
- `Accept` - Accepted response type

### Response Headers (Added by Gateway)
- `x-correlation-id` - Unique request ID
- `x-processed-by: api-gateway` - Gateway identifier
- `x-processing-time` - Request processing time (ms)
- `x-tenant-id` - Tenant context (if applicable)

## Next Steps

1. ✅ Complete service routing
2. ✅ Add tenant verification
3. ⏳ **Write comprehensive integration tests**
4. ⏳ Add rate limiting middleware
5. ⏳ Add request logging middleware
6. ⏳ Implement circuit breaker for services
7. ⏳ Add caching layer

## Known Limitations

- Some services don't have `/health` endpoints (auth, menu, notifications) - Can be added
- Order service requires authentication - Correct behavior
- Inventory and Payment services return degraded status - May need health endpoints

## Configuration

Environment variables (in `.env`):
```
AUTH_SERVICE_HOST=auth-service
MENU_SERVICE_HOST=menu-service
ORDER_SERVICE_HOST=order-service
INVENTORY_SERVICE_HOST=inventory-service
PAYMENT_SERVICE_HOST=payment-service
NOTIFICATION_SERVICE_HOST=notification-service
JWT_SECRET=your-jwt-secret
```

## Monitoring

All requests are logged with:
- Method and path
- Correlation ID for tracing
- User and tenant context
- Processing time
- Response status

Use correlation IDs to trace requests across all services:
```bash
docker logs intellidine-api-gateway | grep "correlation-id-here"
docker logs intellidine-auth-service | grep "correlation-id-here"
# etc.
```
