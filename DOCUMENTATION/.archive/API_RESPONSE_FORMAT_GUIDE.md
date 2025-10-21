# API Response Format Guide

## Understanding the Response Wrapper

### The Problem We Found

The Postman collection had tests written expecting **direct** responses from services, but the **API Gateway wraps everything**.

```
┌─────────────────────────────────────────────────────────┐
│              What Tests Expected                         │
├─────────────────────────────────────────────────────────┤
│ POST /api/auth/customer/request-otp                     │
│ ↓                                                       │
│ { "message": "OTP sent", "expires_at": "..." }         │
│   ^^^ Raw response, no wrapper                          │
└─────────────────────────────────────────────────────────┘

                            VS

┌─────────────────────────────────────────────────────────┐
│              What Gateway Returns                        │
├─────────────────────────────────────────────────────────┤
│ POST /api/auth/customer/request-otp                     │
│ ↓                                                       │
│ {                                                       │
│   "data": {                                             │
│     "message": "OTP sent",                              │
│     "expires_at": "..."                                 │
│   },                                                    │
│   "meta": {                                             │
│     "timestamp": "2025-10-20T11:34:00.000Z",            │
│     "correlationId": "abc-123-def-456"                  │
│   }                                                     │
│ }                                                       │
│ ^^^ Wrapped by gateway, includes meta info              │
└─────────────────────────────────────────────────────────┘
```

---

## Test Script Changes

### Before (❌ Incorrect)

```javascript
pm.test('Response has success flag', function () {
    var jsonData = pm.response.json();
    
    // ❌ This fails - looking at wrong level
    pm.expect(jsonData.success).to.be.true;
});
```

### After (✅ Correct)

```javascript
pm.test('Response has message', function () {
    var jsonData = pm.response.json();
    
    // ✅ This works - accessing wrapped data
    pm.expect(jsonData.data).to.have.property('message');
    pm.expect(jsonData.data.message).to.include('OTP sent');
});
```

---

## Token Extraction Changes

### Before (❌ Incorrect)

```javascript
pm.test('Response contains JWT token', function () {
    var jsonData = pm.response.json();
    
    // ❌ Looking for wrong field name at wrong level
    pm.expect(jsonData).to.have.property('token');
    pm.environment.set('jwt_token', jsonData.token);
});
```

### After (✅ Correct)

```javascript
pm.test('Response contains JWT token', function () {
    var jsonData = pm.response.json();
    
    // ✅ Correct field name in correct location
    pm.expect(jsonData.data).to.have.property('access_token');
    pm.environment.set('jwt_token', jsonData.data.access_token);
    pm.environment.set('user_id', jsonData.data.user.id);
});
```

---

## Response Structure Mapping

### Direct Service Response (Auth Service on :3001)

```json
{
  "access_token": "eyJhbGc...",
  "expires_at": "2025-10-21T11:34:00.000Z",
  "user": {
    "id": "user-123",
    "phone_number": "+919876543210"
  }
}
```

### Gateway-Wrapped Response (API Gateway on :3000)

```json
{
  "data": {
    "access_token": "eyJhbGc...",
    "expires_at": "2025-10-21T11:34:00.000Z",
    "user": {
      "id": "user-123",
      "phone_number": "+919876543210"
    }
  },
  "meta": {
    "timestamp": "2025-10-20T11:34:00.000Z",
    "correlationId": "abc-123-def-456"
  }
}
```

### How to Access in Postman

```javascript
const response = pm.response.json();

// ❌ WRONG
response.access_token                // undefined
response.user.id                     // undefined

// ✅ CORRECT
response.data.access_token           // "eyJhbGc..."
response.data.user.id                // "user-123"
response.meta.correlationId          // "abc-123-def-456"
response.meta.timestamp              // "2025-10-20T11:34:00.000Z"
```

---

## Why This Wrapper Exists

The API Gateway middleware adds this wrapper for:

1. **Standardization**: All responses have consistent structure
2. **Correlation**: Every request can be tracked via `correlationId`
3. **Audit Trail**: Timestamp of when response was generated
4. **Error Consistency**: Same wrapper for errors too:

```json
{
  "statusCode": 400,
  "error": "BadRequestException",
  "message": "Failed to request OTP",
  "correlationId": "abc-123-def-456",
  "timestamp": "2025-10-20T11:34:00.000Z",
  "path": "/api/auth/customer/request-otp"
}
```

---

## Public Endpoints Exception

Auth endpoints are in **public endpoints** list because they don't require tenant validation:

**Before**:
```typescript
const publicEndpoints = [
  '/health',
  '/services/health',
  '/api/auth/register',
  '/api/auth/login',
  '/api/auth/refresh',
];
// ❌ request-otp and verify-otp NOT in list → 401 error
```

**After**:
```typescript
const publicEndpoints = [
  '/health',
  '/services/health',
  '/api/auth/register',
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/auth/customer/request-otp',   // ✅ Added
  '/api/auth/customer/verify-otp',    // ✅ Added
  '/api/auth/staff/login',            // ✅ Added
];
// ✅ Now allowed without tenant header
```

---

## Quick Reference Table

| Response Level | Field | Location | Access Pattern | Status |
|---|---|---|---|---|
| Wrapper | data | root | `response.data` | ✅ Use this |
| Data | access_token | data | `response.data.access_token` | ✅ Use this |
| Data | user | data | `response.data.user` | ✅ Use this |
| Wrapper | meta | root | `response.meta` | ✅ Use this |
| Meta | timestamp | meta | `response.meta.timestamp` | ✅ Reference |
| Meta | correlationId | meta | `response.meta.correlationId` | ✅ Reference |

---

## Testing Your Understanding

**Question 1**: Where do I find the JWT token?
> **Answer**: `response.data.access_token` (not `response.token`)

**Question 2**: Can I access metadata?
> **Answer**: Yes! `response.meta.timestamp`, `response.meta.correlationId`

**Question 3**: Why is my test failing with "cannot read property 'success' of undefined"?
> **Answer**: Because `jsonData.success` doesn't exist. Use `jsonData.data.message` instead.

**Question 4**: What happened to the token field name?
> **Answer**: Auth service uses `access_token`, not `token`. Fixed in Postman.

---

## Files Modified

1. ✅ `Intellidine-API-Collection.postman_collection.json`
   - Updated 3 test scripts
   - Fixed token extraction
   - Fixed response assertions

2. ✅ `backend/api-gateway/src/middleware/tenant-verification.middleware.ts`
   - Added 3 auth endpoints to public list
   - Rebuilt gateway container

---

**Status**: ✅ All fixes applied and documented  
**Ready for**: Postman collection testing  
**Next Step**: Run `newman run Intellidine-API-Collection.postman_collection.json -e local.env.postman.json`

