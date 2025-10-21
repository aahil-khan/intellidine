# Auth Service - Complete Guide

**Port**: 3101  
**Language**: TypeScript (NestJS)  
**Database**: PostgreSQL + Redis  
**Responsibility**: Customer OTP authentication, staff login, JWT token management

---

## What Auth Service Does

The Auth Service is the **gatekeeper** of Intellidine. It handles:

- ✅ Generate OTP codes for customers (SMS via SNS/Twilio)
- ✅ Verify OTP and create JWT tokens
- ✅ Staff login with username/password
- ✅ JWT token generation & validation
- ✅ Session management in Redis
- ✅ Token refresh & logout
- ✅ Role-based authorization (CUSTOMER, MANAGER, KITCHEN_STAFF, WAITER)

---

## Customer Authentication Flow (OTP)

### Step 1: Request OTP

```
POST /api/auth/customer/otp

Body:
{
  "phone_number": "9876543210"
}

Response:
{
  "success": true,
  "message": "OTP sent to 9876543210",
  "expires_in": 300
}
```

**Backend Process**:
1. Generate 6-digit OTP: "123456"
2. Hash with bcrypt (never store plain OTP)
3. Store in PostgreSQL (otp_verifications table)
4. Cache in Redis for fast lookup
5. Send SMS via SNS/Twilio
6. Return success message

### Step 2: Verify OTP & Get JWT

```
POST /api/auth/customer/verify-otp

Body:
{
  "phone_number": "9876543210",
  "otp": "123456"
}

Response:
{
  "success": true,
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 28800,
  "customer": {
    "id": "cust-abc123",
    "phone": "9876543210"
  }
}
```

**Backend Process**:
1. Retrieve OTP hash from Redis
2. Compare submitted OTP with stored hash using bcrypt
3. Verify not expired
4. Find or create Customer record
5. Generate JWT token (8-hour expiry)
6. Store session in Redis
7. Mark OTP as verified
8. Return JWT token

---

## Staff Authentication Flow

### Login

```
POST /api/auth/staff/login

Body:
{
  "username": "manager1",
  "password": "Password@123",
  "tenant_id": "11111111-1111-1111-1111-111111111111"
}

Response:
{
  "success": true,
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 28800,
  "user": {
    "id": "user-123",
    "username": "manager1",
    "role": "MANAGER",
    "tenant_id": "11111111-1111-1111-1111-111111111111"
  }
}
```

**Backend Process**:
1. Find user by username in PostgreSQL
2. Verify password hash with bcrypt
3. Verify user is_active = true
4. Verify tenant_id matches
5. Generate JWT with role included
6. Store session in Redis
7. Return JWT token & user info

---

## JWT Token Structure

### Token Payload

```json
{
  "sub": "user-or-customer-id",
  "tenant_id": "11111111-1111-1111-1111-111111111111",
  "phone": "9876543210",
  "role": "CUSTOMER",
  "username": null,
  "iat": 1729611625,
  "exp": 1729640225
}
```

### Token Usage

Every request includes JWT in Authorization header:

```
GET /api/orders
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**API Gateway validates**:
1. Signature (prevent tampering)
2. Expiry (not expired)
3. Tenant ID (matches request)

---

## Database Schema

```typescript
model User {
  id                String   @id @default(uuid())
  tenant_id         String?
  username          String   @unique
  email             String   @unique
  password_hash     String
  role              Role
  is_temp_password  Boolean  @default(false)
  is_active         Boolean  @default(true)
  created_at        DateTime @default(now())
  updated_at        DateTime @updatedAt

  tenant Tenant? @relation(fields: [tenant_id], references: [id])

  @@map("users")
}

enum Role {
  SUPER_ADMIN
  MANAGER
  KITCHEN_STAFF
  WAITER
}

model OtpVerification {
  id           String   @id @default(uuid())
  phone_number String
  otp_hash     String
  created_at   DateTime @default(now())
  expires_at   DateTime
  verified     Boolean  @default(false)

  @@index([phone_number, expires_at])
  @@map("otp_verifications")
}
```

---

## Redis Session Storage

### Customer Session

```
SET session:cust-abc123 <jwt_token> EX 28800
// 8-hour expiry

When API called with JWT:
GET session:cust-abc123
→ Validates token still valid
```

### OTP Cache

```
SET otp:9876543210 <bcrypt_hash> EX 300
// 5-minute expiry

When OTP verified:
GET otp:9876543210
→ Compare submitted OTP with stored hash
DEL otp:9876543210
→ Cleanup after verification
```

---

## Endpoints Summary

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| `POST` | `/api/auth/customer/otp` | Request OTP | None |
| `POST` | `/api/auth/customer/verify-otp` | Verify OTP & get JWT | None |
| `POST` | `/api/auth/staff/login` | Staff login | None |
| `POST` | `/api/auth/logout` | Logout (invalidate session) | JWT |
| `POST` | `/api/auth/refresh` | Refresh JWT token | JWT (expiring) |

---

## Pre-seeded Staff Users

Pre-loaded in database:

| Username | Password | Role | Tenant |
|----------|----------|------|--------|
| manager1 | Password@123 | MANAGER | Spice Route (111...) |
| kitchen_staff1 | Password@123 | KITCHEN_STAFF | Spice Route (111...) |
| waiter1 | Password@123 | WAITER | Spice Route (111...) |

**Note**: Passwords are bcrypt hashed in database, never stored in plain text.

---

## Common Issues & Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| "Invalid OTP" | Wrong code entered | Check SMS, user can retry (5 attempts max) |
| "OTP expired" | More than 5 minutes passed | Request new OTP |
| "User not found" | Username doesn't exist | Create staff user first |
| "Invalid credentials" | Wrong password | Check caps lock, try again |
| "Token expired" | 8 hours passed | User needs to login again or refresh |

---

## Testing Auth Service

### Test Customer OTP Flow

```bash
# 1. Request OTP
curl -X POST http://localhost:3100/api/auth/customer/otp \
  -H "Content-Type: application/json" \
  -d '{"phone_number":"9876543210"}'

# Response: OTP sent to SMS

# 2. Verify OTP (use OTP from SMS)
curl -X POST http://localhost:3100/api/auth/customer/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number":"9876543210",
    "otp":"123456"
  }'

# Response: JWT token
```

### Test Staff Login

```bash
curl -X POST http://localhost:3100/api/auth/staff/login \
  -H "Content-Type: application/json" \
  -d '{
    "username":"manager1",
    "password":"Password@123",
    "tenant_id":"11111111-1111-1111-1111-111111111111"
  }'

# Response: JWT token with MANAGER role
```

---

## Performance Characteristics

- **OTP generation**: 50-80ms
- **OTP verification**: 100-150ms (bcrypt hash check)
- **Staff login**: 150-200ms (database lookup + hash check)
- **JWT validation**: 5-10ms (cached, very fast)

---

**See Also**:
- [SYSTEM_OVERVIEW.md](../SYSTEM_OVERVIEW.md) - Auth flow diagrams
- [ORDERING_WORKFLOW.md](../workflows/ORDERING_WORKFLOW.md) - OTP usage in context
