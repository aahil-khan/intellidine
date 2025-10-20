# Authentication & Authorization Guide

## Overview

IntelliDine uses JWT (JSON Web Tokens) for stateless authentication across all microservices. This guide explains the auth flow and how to protect endpoints.

## Authentication Flows

### 1. Customer OTP Flow

**Step 1: Request OTP**
```bash
POST /api/auth/customer/request-otp
Content-Type: application/json

{
  "phone": "+919876543210"
}

Response:
{
  "message": "OTP sent successfully",
  "expires_at": "2025-10-19T19:34:38.651Z"
}
```

**Step 2: Verify OTP & Get JWT**
```bash
POST /api/auth/customer/verify-otp
Content-Type: application/json

{
  "phone": "+919876543210",
  "otp": "615375"
}

Response:
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_at": "2025-10-20T19:29:50.000Z",
  "user": {
    "id": "customer-uuid",
    "phone_number": "+919876543210"
  }
}
```

### 2. Staff Login Flow

```bash
POST /api/auth/staff/login
Content-Type: application/json

{
  "username": "manager1",
  "password": "password123"
}

Response:
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

## Using JWT Tokens

### Include Token in Requests

All authenticated requests must include the JWT token in the Authorization header:

```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Example:
```bash
POST /api/orders?tenant_id=11111111-1111-1111-1111-111111111111
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "table_id": "5",
  "items": [
    {
      "menu_item_id": "item_001",
      "quantity": 2,
      "special_instructions": "Extra spicy"
    }
  ]
}
```

## JWT Token Structure

The JWT payload contains:
```json
{
  "userId": "user-uuid",
  "phone_number": "+919876543210",  // For customers
  "username": "manager1",            // For staff
  "email": "manager@example.com",
  "role": "MANAGER",                 // SUPER_ADMIN, MANAGER, KITCHEN_STAFF, WAITER
  "tenant_id": "tenant-uuid",
  "iat": 1729371650,
  "exp": 1729458050
}
```

## Token Expiration

- **Expiry Time**: 24 hours from issuance
- **Expired Response**: 401 Unauthorized
- **Solution**: Request a new token by logging in again

## Role-Based Access Control (RBAC)

### Available Roles

```
SUPER_ADMIN       - Full system access
MANAGER           - Restaurant owner/manager access (create/update menu, view analytics)
KITCHEN_STAFF     - Kitchen operations (view orders, update order status)
WAITER            - Table service (create orders, view tables)
CUSTOMER          - Customer access (view menu, create orders, view own orders)
```

### Protecting Endpoints by Role

In controllers:
```typescript
import { UseGuards } from '@nestjs/common';
import { JwtGuard } from '../guards/jwt.guard';
import { RequireRole } from '../decorators/require-role.decorator';

@Controller('api/menu')
@UseGuards(JwtGuard)
export class MenuController {
  @Post('/items')
  @RequireRole('MANAGER')
  async createMenuItem(@Body() dto: CreateMenuItemDto) {
    // Only managers can create menu items
  }

  @Patch('/items/:id')
  @RequireRole('MANAGER')
  async updateMenuItem(@Param('id') id: string, @Body() dto: UpdateMenuItemDto) {
    // Only managers can update menu items
  }
}
```

### Protecting Endpoints by Tenant

The tenant_id must be included in every request as a query parameter:

```bash
GET /api/orders?tenant_id=11111111-1111-1111-1111-111111111111
```

- Requests without tenant_id: **400 Bad Request**
- Requests with mismatched tenant_id in token: **401 Unauthorized**

## Middleware & Guards

### JwtGuard

Location: `backend/auth-service/src/guards/jwt.guard.ts`

Validates JWT token from Authorization header. Apply with:
```typescript
@UseGuards(JwtGuard)
```

### RolesGuard

Location: `backend/auth-service/src/guards/roles.guard.ts`

Validates user role matches required role. Apply with:
```typescript
@RequireRole('MANAGER')
```

### AuthMiddleware

Location: `backend/auth-service/src/middleware/auth.middleware.ts`

Global middleware for:
- JWT token validation
- Tenant ID verification
- Public endpoint exemption

## Public Endpoints (No Auth Required)

These endpoints do NOT require authentication:
- `GET /health` - Service health check
- `POST /api/auth/customer/request-otp`
- `POST /api/auth/customer/verify-otp`
- `POST /api/auth/staff/login`

## Common Auth Errors

| Status | Error | Solution |
|--------|-------|----------|
| 400 | `tenant_id query parameter is required` | Include `?tenant_id=...` in URL |
| 401 | `Missing or invalid Authorization header` | Include `Authorization: Bearer <token>` |
| 401 | `Invalid or expired token` | Get a new token by logging in |
| 401 | `Tenant ID mismatch` | Ensure token tenant_id matches request tenant_id |
| 403 | `Insufficient permissions` | User role doesn't allow this action |

## Environment Variables

Configure in `.env`:
```
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRY=24h
```

## Next Steps

1. **Implement SharedAuthModule**: Copy auth middleware to all services
2. **Add @UseGuards**: Apply JwtGuard to all protected routes
3. **Test Auth Flow**: Use curl examples to verify token generation and validation
4. **Monitor Tokens**: Log token usage for debugging

## References

- JWT Specification: https://tools.ietf.org/html/rfc7519
- NestJS Auth Guide: https://docs.nestjs.com/security/authentication
- RBAC Best Practices: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
