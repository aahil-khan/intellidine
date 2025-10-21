# Frontend Integration Guide - IntelliDine API

**Version**: 1.0  
**API Status**: ✅ PRODUCTION READY  
**Last Updated**: October 2025  
**Frontend Team Start Date**: Immediately

---

## 🚀 Quick Start (5 minutes)

### 1. API Endpoint
```
Production: https://intellidine-api.aahil-khan.tech
Development: http://localhost:3000
```

### 2. Test Authentication
```bash
# Request OTP for any phone number
curl -X POST https://intellidine-api.aahil-khan.tech/api/auth/customer/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"9876543210","tenant_id":"11111111-1111-1111-1111-111111111111"}'

# Response will include OTP (visible in development console)
```

### 3. Import Postman Collection
- Download: `Intellidine-API-Collection-PRODUCTION.postman_collection.json`
- Open Postman → Import → Select file
- Start testing with "Customer - Request OTP"

✅ **You're ready to start!**

---

## 📋 Table of Contents

1. [API Overview](#api-overview)
2. [Authentication](#authentication)
3. [Complete API Reference](#complete-api-reference)
4. [Error Handling](#error-handling)
5. [Frontend SDK Setup](#frontend-sdk-setup)
6. [Code Examples](#code-examples)
7. [WebSocket Integration](#websocket-integration)
8. [Common Issues](#common-issues)
9. [Testing Guide](#testing-guide)

---

## API Overview

### 35 Total Endpoints Across 8 Resources

| Resource | Endpoints | Status |
|----------|-----------|--------|
| 🔐 Authentication | 3 | ✅ Ready |
| 🍽️ Menu | 6 | ✅ Ready |
| 📋 Orders | 5 | ✅ Ready |
| 💳 Payment | 7 | ✅ Ready |
| 📦 Inventory | 5 | ✅ Ready |
| 📊 Analytics | 3 | ✅ Ready |
| 🔔 Notifications | 2 | ✅ Ready |
| 🏷️ Discount | 2 | ✅ Ready |
| **Total** | **35** | **✅ Ready** |

### Features Included

✅ Multi-tenant support (restaurant isolation)  
✅ JWT authentication (8-hour expiry)  
✅ Role-based access (CUSTOMER, STAFF, MANAGER)  
✅ Pagination on all list endpoints  
✅ Real-time notifications (WebSocket)  
✅ Event-driven architecture (Kafka)  
✅ Error handling with consistent format  
✅ CORS enabled for frontend domains  

---

## Authentication

### Customer Flow (OTP-Based)

**Best for**: Customer mobile app, web ordering

#### Step 1: Request OTP
```http
POST /api/auth/customer/request-otp
Content-Type: application/json

{
  "phone": "9876543210",
  "tenant_id": "11111111-1111-1111-1111-111111111111"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "message": "OTP sent to your phone",
    "expires_at": "2025-10-22T11:30:00Z"
  }
}
```

**Error** (400):
```json
{
  "success": false,
  "error": "InvalidPhone",
  "message": "Phone number format invalid"
}
```

#### Step 2: Verify OTP & Get Token
```http
POST /api/auth/customer/verify-otp
Content-Type: application/json

{
  "phone": "9876543210",
  "otp": "123456",
  "tenant_id": "11111111-1111-1111-1111-111111111111"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_at": "2025-10-22T19:30:00Z",
    "user": {
      "id": "cust_12345",
      "phone_number": "9876543210"
    }
  }
}
```

**Store JWT**:
```typescript
const { access_token } = response.data.data;
localStorage.setItem('auth_token', access_token);
```

---

### Staff Flow (Username/Password)

**Best for**: Kitchen staff, managers, admin panel

#### Staff Login
```http
POST /api/auth/staff/login
Content-Type: application/json

{
  "username": "manager1",
  "password": "password123",
  "tenant_id": "11111111-1111-1111-1111-111111111111"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_at": "2025-10-22T19:30:00Z",
    "user": {
      "id": "staff_12345",
      "username": "manager1",
      "email": "manager@restaurant.com",
      "role": "MANAGER",
      "tenant_id": "11111111-1111-1111-1111-111111111111"
    }
  }
}
```

---

### Using JWT Token

**All subsequent requests must include**:
```http
GET /api/menu
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
X-Tenant-ID: 11111111-1111-1111-1111-111111111111
```

**Token Expiry**: 8 hours  
**Refresh**: Re-authenticate (no refresh token endpoint)  
**Storage**: localStorage (secure for development, httpOnly cookie for production)

---

## Complete API Reference

### 🔐 Authentication (3 endpoints)

#### POST /api/auth/customer/request-otp
Request OTP for customer login
- **Auth**: None
- **Body**: `{ phone, tenant_id }`
- **Response**: `{ message, expires_at }`

#### POST /api/auth/customer/verify-otp
Verify OTP and get JWT token
- **Auth**: None
- **Body**: `{ phone, otp, tenant_id }`
- **Response**: `{ access_token, expires_at, user }`

#### POST /api/auth/staff/login
Staff login with credentials
- **Auth**: None
- **Body**: `{ username, password, tenant_id }`
- **Response**: `{ access_token, expires_at, user }`

---

### 🍽️ Menu Service (6 endpoints)

#### GET /api/menu
Get menu items with categories
- **Auth**: Bearer token required
- **Query Params**: 
  - `tenant_id` (required)
  - `limit` (optional, default: 20, max: 100)
  - `offset` (optional, default: 0)
- **Response**: `{ data: MenuItem[], total: number }`

**MenuItem Object**:
```json
{
  "id": "item_001",
  "name": "Paneer Tikka",
  "description": "Smoked cottage cheese skewers",
  "price": 280,
  "cost_price": 150,
  "category": "Appetizers",
  "discount_percentage": 0,
  "dietary_tags": ["vegetarian"],
  "is_available": true,
  "preparation_time": 15
}
```

#### GET /api/menu/items/{item_id}
Get single menu item details
- **Auth**: Bearer token required
- **Path Params**: `item_id` (string)
- **Query Params**: `tenant_id`
- **Response**: `{ data: MenuItem }`

#### POST /api/menu/items
Create menu item (Manager only)
- **Auth**: Bearer token + Manager role
- **Body**: `{ name, description, price, cost_price, category, dietary_tags }`
- **Response**: `{ data: MenuItem }`

#### PATCH /api/menu/items/{item_id}
Update menu item (Manager only)
- **Auth**: Bearer token + Manager role
- **Body**: `{ price?, description?, is_available? }`
- **Response**: `{ data: MenuItem }`

#### DELETE /api/menu/items/{item_id}
Delete menu item (Manager only)
- **Auth**: Bearer token + Manager role
- **Response**: `{ data: { id, deleted: true } }`

#### GET /api/menu/health
Health check
- **Auth**: None
- **Response**: `{ status: "ok", service: "menu-service" }`

---

### 📋 Order Service (5 endpoints)

#### POST /api/orders
Create new order
- **Auth**: Bearer token required
- **Body**:
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
- **Response**:
```json
{
  "success": true,
  "data": {
    "id": "order_123",
    "status": "pending",
    "items": [...],
    "total_amount": 450.50,
    "tax": 50.00,
    "discount": 0,
    "created_at": "2025-10-22T10:30:00Z"
  }
}
```

#### GET /api/orders
List all orders (paginated)
- **Auth**: Bearer token required
- **Query Params**: 
  - `tenant_id` (required)
  - `limit` (optional, default: 10)
  - `offset` (optional, default: 0)
- **Response**: `{ data: Order[], total: number }`

#### GET /api/orders/{order_id}
Get order details
- **Auth**: Bearer token required
- **Query Params**: `tenant_id`
- **Response**: `{ data: Order }`

#### PATCH /api/orders/{order_id}/status
Update order status (Staff only)
- **Auth**: Bearer token + Staff role
- **Body**: `{ status: "preparing" | "completed" | "ready" }`
- **Response**: `{ data: Order }`

#### PATCH /api/orders/{order_id}/cancel
Cancel order (before completion)
- **Auth**: Bearer token required
- **Body**: `{ reason: "Customer requested" }`
- **Response**: `{ data: Order }`

---

### 💳 Payment Service (7 endpoints)

#### POST /api/payments/create-razorpay-order
Create Razorpay order for payment
- **Auth**: Bearer token required
- **Body**:
```json
{
  "order_id": "order_123",
  "amount": 450.50,
  "method": "RAZORPAY",
  "tenant_id": "11111111-..."
}
```
- **Response**:
```json
{
  "success": true,
  "data": {
    "razorpay_order_id": "order_DBJOWzybf0sJbb",
    "amount": 450.50,
    "currency": "INR"
  }
}
```

**Frontend**: Use Razorpay SDK
```html
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>

<script>
const options = {
  key: "YOUR_RAZORPAY_KEY",
  amount: 45050, // in paise
  currency: "INR",
  name: "IntelliDine",
  order_id: "order_DBJOWzybf0sJbb",
  handler: function(response) {
    // Send verification to backend
    verifyPayment(response);
  }
};
const rzp = new Razorpay(options);
rzp.open();
</script>
```

#### POST /api/payments/verify-razorpay
Verify payment signature
- **Auth**: Bearer token required
- **Body**:
```json
{
  "razorpay_order_id": "order_DBJOWzybf0sJbb",
  "razorpay_payment_id": "pay_DBJOWzybf0sJbb",
  "razorpay_signature": "9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a3d"
}
```
- **Response**: `{ data: { status: "success" } }`

#### POST /api/payments/confirm-cash
Confirm cash payment (no online processing)
- **Auth**: Bearer token required
- **Body**:
```json
{
  "order_id": "order_123",
  "amount": 450.50,
  "change_amount": 0,
  "tenant_id": "11111111-..."
}
```
- **Response**: `{ data: Payment }`

#### GET /api/payments/{payment_id}
Get payment details
- **Auth**: Bearer token required
- **Response**: `{ data: Payment }`

#### GET /api/payments
List all payments
- **Auth**: Bearer token required
- **Query Params**: `tenant_id, limit, offset`
- **Response**: `{ data: Payment[], total: number }`

#### GET /api/payments/stats/daily
Daily payment statistics
- **Auth**: Bearer token required
- **Response**:
```json
{
  "success": true,
  "data": {
    "date": "2025-10-22",
    "total_revenue": 5250.75,
    "total_transactions": 12,
    "success_count": 11,
    "failed_count": 1,
    "average_transaction": 437.56
  }
}
```

#### GET /api/payments/health
Health check
- **Auth**: None
- **Response**: `{ status: "ok", service: "payment-service" }`

---

### 📦 Inventory Service (5 endpoints)

#### POST /api/inventory/items
Create inventory item
- **Auth**: Bearer token + Manager role
- **Body**:
```json
{
  "menu_item_id": "item_001",
  "quantity": 100,
  "reorder_level": 20,
  "tenant_id": "11111111-..."
}
```
- **Response**: `{ data: InventoryItem }`

#### GET /api/inventory/items
List inventory
- **Auth**: Bearer token required
- **Query Params**: `tenant_id`
- **Response**: `{ data: InventoryItem[] }`

#### PATCH /api/inventory/items/{item_id}
Update inventory quantity
- **Auth**: Bearer token required
- **Body**: `{ quantity, reorder_level }`
- **Response**: `{ data: InventoryItem }`

#### GET /api/inventory/alerts
Get low stock alerts
- **Auth**: Bearer token required
- **Query Params**: `tenant_id`
- **Response**:
```json
{
  "success": true,
  "data": [
    {
      "item_name": "Paneer",
      "current_quantity": 2.5,
      "reorder_level": 5.0,
      "status": "LOW_STOCK"
    }
  ]
}
```

#### GET /api/inventory/stats
Inventory statistics
- **Auth**: Bearer token required
- **Query Params**: `tenant_id`
- **Response**:
```json
{
  "success": true,
  "data": {
    "total_items": 15,
    "low_stock_count": 3,
    "total_value": 25000.00,
    "expiring_soon": 2
  }
}
```

---

### 📊 Analytics Service (3 endpoints)

#### GET /api/analytics/daily-metrics
Daily business metrics
- **Auth**: Bearer token required
- **Query Params**: `tenant_id, date (YYYY-MM-DD)`
- **Response**:
```json
{
  "success": true,
  "data": {
    "date": "2025-10-22",
    "total_orders": 45,
    "total_revenue": 15250.75,
    "average_order_value": 338.91,
    "peak_hour": "13:00-14:00",
    "total_customers": 32
  }
}
```

#### GET /api/analytics/order-trends
Order trends over time
- **Auth**: Bearer token required
- **Query Params**: `tenant_id, days (7|30|90)`
- **Response**:
```json
{
  "success": true,
  "data": [
    { "date": "2025-10-22", "orders": 45, "revenue": 15250.75 },
    { "date": "2025-10-21", "orders": 38, "revenue": 12890.50 }
  ]
}
```

#### GET /api/analytics/top-items
Top selling menu items
- **Auth**: Bearer token required
- **Query Params**: `tenant_id, limit (default: 10), days (7|30|90)`
- **Response**:
```json
{
  "success": true,
  "data": [
    {
      "item_id": "item_001",
      "name": "Paneer Tikka",
      "quantity_sold": 156,
      "revenue": 43680.00,
      "rank": 1
    }
  ]
}
```

---

### 🔔 Notifications (2 endpoints)

#### GET /api/notifications/stats
Connection statistics
- **Auth**: Bearer token required
- **Response**:
```json
{
  "success": true,
  "data": {
    "active_connections": 12,
    "total_messages": 452,
    "rooms": ["kitchen_1", "table_5", "manager"]
  }
}
```

#### WebSocket Connection
See [WebSocket Integration](#websocket-integration) section below

---

### 🏷️ Discount Engine (2 endpoints)

#### POST /api/discounts/apply
Apply discount to order
- **Auth**: Bearer token required
- **Body**: `{ order_id, tenant_id }`
- **Response**:
```json
{
  "success": true,
  "data": {
    "discount_amount": 50.00,
    "discount_percentage": 10,
    "final_amount": 400.50
  }
}
```

#### GET /api/discounts/rules
List discount rules
- **Auth**: Bearer token required
- **Query Params**: `tenant_id`
- **Response**: `{ data: DiscountRule[] }`

---

## Error Handling

### Standard Error Response Format

**All errors follow this structure**:
```json
{
  "success": false,
  "error": "ErrorCode",
  "message": "Human readable error message",
  "status_code": 400,
  "timestamp": "2025-10-22T10:30:00Z"
}
```

### Error Codes

| Code | HTTP Status | Meaning | Action |
|------|-------------|---------|--------|
| `InvalidInput` | 400 | Missing/invalid required field | Check request body |
| `InvalidPhone` | 400 | Phone format invalid | Validate phone format |
| `InvalidOtp` | 401 | OTP incorrect or expired | Request new OTP |
| `Unauthorized` | 401 | Missing/invalid JWT token | Re-authenticate |
| `InvalidCredentials` | 401 | Wrong username/password | Retry with correct credentials |
| `Forbidden` | 403 | Insufficient permissions (role) | Use account with proper role |
| `NotFound` | 404 | Resource doesn't exist | Check ID/parameters |
| `ConflictError` | 409 | Duplicate entry (username exists) | Use different value |
| `TenantMismatch` | 403 | Tenant ID mismatch | Check tenant_id |
| `RateLimited` | 429 | Too many requests | Wait and retry |
| `InternalError` | 500 | Server error | Contact support |

### Error Handling in Frontend

```typescript
// TypeScript example
interface ApiError {
  success: false;
  error: string;
  message: string;
  status_code: number;
}

async function handleApiCall(promise: Promise<Response>) {
  try {
    const response = await promise;
    
    if (!response.ok) {
      const error: ApiError = await response.json();
      
      switch (error.error) {
        case 'InvalidOtp':
          showError('OTP is incorrect. Please try again.');
          break;
        case 'Unauthorized':
          // JWT expired - redirect to login
          redirectToLogin();
          break;
        case 'RateLimited':
          showError('Too many requests. Please wait a moment.');
          break;
        default:
          showError(error.message || 'An error occurred');
      }
      return null;
    }
    
    return await response.json();
  } catch (error) {
    showError('Network error. Please check your connection.');
    return null;
  }
}
```

---

## Frontend SDK Setup

### Installation

#### Option 1: Using npm (Recommended)

```bash
npm install @intellidine/api-client
```

#### Option 2: Manual HTTP Client (Axios/Fetch)

```bash
npm install axios
```

---

### TypeScript Client Setup

**File**: `src/api/client.ts`

```typescript
import axios, { AxiosInstance } from 'axios';

interface ApiConfig {
  baseURL: string;
  tenantId: string;
}

export class IntelliDineClient {
  private client: AxiosInstance;
  private tenantId: string;

  constructor(config: ApiConfig) {
    this.tenantId = config.tenantId;
    this.client = axios.create({
      baseURL: config.baseURL,
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': this.tenantId,
      },
    });

    // Add JWT token to requests
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle token expiry
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Authentication
  async requestOtp(phone: string) {
    return this.client.post('/api/auth/customer/request-otp', {
      phone,
      tenant_id: this.tenantId,
    });
  }

  async verifyOtp(phone: string, otp: string) {
    return this.client.post('/api/auth/customer/verify-otp', {
      phone,
      otp,
      tenant_id: this.tenantId,
    });
  }

  async staffLogin(username: string, password: string) {
    return this.client.post('/api/auth/staff/login', {
      username,
      password,
      tenant_id: this.tenantId,
    });
  }

  // Menu
  async getMenu(limit = 20, offset = 0) {
    return this.client.get('/api/menu', {
      params: { tenant_id: this.tenantId, limit, offset },
    });
  }

  async getMenuItem(itemId: string) {
    return this.client.get(`/api/menu/items/${itemId}`, {
      params: { tenant_id: this.tenantId },
    });
  }

  // Orders
  async createOrder(tableId: string, items: any[], paymentMethod: string) {
    return this.client.post('/api/orders', {
      table_id: tableId,
      items,
      payment_method: paymentMethod,
    });
  }

  async getOrders(limit = 10, offset = 0) {
    return this.client.get('/api/orders', {
      params: { tenant_id: this.tenantId, limit, offset },
    });
  }

  async getOrder(orderId: string) {
    return this.client.get(`/api/orders/${orderId}`, {
      params: { tenant_id: this.tenantId },
    });
  }

  async updateOrderStatus(orderId: string, status: string) {
    return this.client.patch(`/api/orders/${orderId}/status`, { status });
  }

  async cancelOrder(orderId: string, reason: string) {
    return this.client.patch(`/api/orders/${orderId}/cancel`, { reason });
  }

  // Payments
  async createRazorpayOrder(orderId: string, amount: number) {
    return this.client.post('/api/payments/create-razorpay-order', {
      order_id: orderId,
      amount,
      method: 'RAZORPAY',
      tenant_id: this.tenantId,
    });
  }

  async verifyRazorpayPayment(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string
  ) {
    return this.client.post('/api/payments/verify-razorpay', {
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
    });
  }

  async confirmCashPayment(orderId: string, amount: number) {
    return this.client.post('/api/payments/confirm-cash', {
      order_id: orderId,
      amount,
      change_amount: 0,
      tenant_id: this.tenantId,
    });
  }

  async getPaymentStats() {
    return this.client.get('/api/payments/stats/daily');
  }

  // Analytics
  async getDailyMetrics(date?: string) {
    return this.client.get('/api/analytics/daily-metrics', {
      params: { tenant_id: this.tenantId, date },
    });
  }

  async getOrderTrends(days = 7) {
    return this.client.get('/api/analytics/order-trends', {
      params: { tenant_id: this.tenantId, days },
    });
  }

  async getTopItems(limit = 10, days = 7) {
    return this.client.get('/api/analytics/top-items', {
      params: { tenant_id: this.tenantId, limit, days },
    });
  }
}

// Usage in your app
export const api = new IntelliDineClient({
  baseURL: process.env.REACT_APP_API_URL || 'https://intellidine-api.aahil-khan.tech',
  tenantId: '11111111-1111-1111-1111-111111111111',
});
```

---

## Code Examples

### React Component Example: Login with OTP

```typescript
// src/pages/Login.tsx
import React, { useState } from 'react';
import { api } from '../api/client';

export function LoginPage() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.requestOtp(phone);
      if (response.data.success) {
        setStep('otp');
        alert(`OTP sent! In development, check console for OTP value.`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to request OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.verifyOtp(phone, otp);
      if (response.data.success) {
        const { access_token } = response.data.data;
        localStorage.setItem('auth_token', access_token);
        window.location.href = '/menu'; // Redirect to main app
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'phone') {
    return (
      <form onSubmit={handleRequestOtp}>
        <h1>Login to IntelliDine</h1>
        
        <input
          type="tel"
          placeholder="Enter your phone number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          pattern="[0-9]{10}"
          required
          disabled={loading}
        />

        {error && <p style={{ color: 'red' }}>{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? 'Sending OTP...' : 'Request OTP'}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleVerifyOtp}>
      <h1>Enter OTP</h1>
      <p>OTP sent to {phone}</p>

      <input
        type="text"
        placeholder="Enter 6-digit OTP"
        value={otp}
        onChange={(e) => setOtp(e.target.value.slice(0, 6))}
        maxLength={6}
        pattern="[0-9]{6}"
        required
        disabled={loading}
      />

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <button type="submit" disabled={loading}>
        {loading ? 'Verifying...' : 'Verify OTP'}
      </button>

      <button
        type="button"
        onClick={() => {
          setStep('phone');
          setOtp('');
        }}
      >
        Change Phone Number
      </button>
    </form>
  );
}
```

### React Component Example: Menu Display

```typescript
// src/pages/Menu.tsx
import React, { useState, useEffect } from 'react';
import { api } from '../api/client';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  is_available: boolean;
}

export function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cart, setCart] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    fetchMenu();
  }, []);

  const fetchMenu = async () => {
    try {
      setLoading(true);
      const response = await api.getMenu(50, 0); // Get first 50 items
      if (response.data.success) {
        setItems(response.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load menu');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (itemId: string) => {
    setCart((prev) => ({
      ...prev,
      [itemId]: (prev[itemId] || 0) + 1,
    }));
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => {
      const newCart = { ...prev };
      if (newCart[itemId] > 1) {
        newCart[itemId]--;
      } else {
        delete newCart[itemId];
      }
      return newCart;
    });
  };

  if (loading) return <div>Loading menu...</div>;
  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;

  return (
    <div>
      <h1>Menu</h1>

      <div className="menu-grid">
        {items.map((item) => (
          <div key={item.id} className="menu-card">
            <h3>{item.name}</h3>
            <p>{item.description}</p>
            <p className="category">{item.category}</p>
            <p className="price">₹{item.price}</p>

            {item.is_available ? (
              <div className="cart-controls">
                <button onClick={() => removeFromCart(item.id)}>−</button>
                <span>{cart[item.id] || 0}</span>
                <button onClick={() => addToCart(item.id)}>+</button>
              </div>
            ) : (
              <p style={{ color: 'red' }}>Out of stock</p>
            )}
          </div>
        ))}
      </div>

      {Object.keys(cart).length > 0 && (
        <button onClick={() => handleCheckout(cart)}>
          Proceed to Checkout ({Object.values(cart).reduce((a, b) => a + b, 0)} items)
        </button>
      )}
    </div>
  );
}

async function handleCheckout(cart: { [key: string]: number }) {
  // Create order with cart items
  const items = Object.entries(cart).map(([itemId, quantity]) => ({
    menu_item_id: itemId,
    quantity,
  }));

  try {
    const response = await api.createOrder('1', items, 'RAZORPAY');
    if (response.data.success) {
      const { id: orderId } = response.data.data;
      // Proceed to payment
      window.location.href = `/payment?order=${orderId}`;
    }
  } catch (error) {
    alert('Failed to create order');
  }
}
```

---

## WebSocket Integration

### Real-Time Notifications

**Socket.io setup**:

```typescript
// src/services/notifications.ts
import io from 'socket.io-client';

const socket = io(process.env.REACT_APP_API_URL || 'https://intellidine-api.aahil-khan.tech', {
  auth: {
    token: localStorage.getItem('auth_token'),
  },
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
});

// Listen for notifications
socket.on('order:updated', (data) => {
  console.log('Order updated:', data);
  // Update UI with order status
});

socket.on('notification:message', (data) => {
  console.log('Notification:', data);
  // Show toast notification
});

export default socket;
```

**Join a room** (e.g., for kitchen display):

```typescript
// Join kitchen room to get all orders
socket.emit('join', {
  room: 'kitchen_1',
  tenant_id: '11111111-...',
});

// Receive order created events
socket.on('order:created', (order) => {
  console.log('New order:', order);
  // Display on kitchen screen
});
```

---

## Common Issues

### Issue 1: "Unauthorized" on every request

**Problem**: JWT token not being sent

**Solution**:
```typescript
// Make sure this header is being sent:
Authorization: Bearer <your_jwt_token>

// Check localStorage:
console.log(localStorage.getItem('auth_token'));

// If empty, re-authenticate:
await api.requestOtp('9876543210');
```

---

### Issue 2: "TenantMismatch" error

**Problem**: Tenant ID in JWT doesn't match request

**Solution**:
```typescript
// Verify tenant ID matches:
const token = localStorage.getItem('auth_token');
console.log(decodeJWT(token)); // Check tenant_id claim

// Include in requests:
{
  "X-Tenant-ID": "11111111-1111-1111-1111-111111111111"
}
```

---

### Issue 3: CORS errors

**Problem**: Frontend domain not whitelisted

**Status**: All domains allowed in development (CORS: true)

**Production**: Contact backend team to whitelist your domain

---

### Issue 4: OTP not received

**Problem**: OTP generation issue or phone validation

**Solution**:
- In **development**: OTP is printed to server console
- In **production**: Sent via MSG91 SMS
- Test with: `9876543210` or `7777777777`

---

## Testing Guide

### Using Postman Collection

**Steps**:
1. Import `Intellidine-API-Collection-PRODUCTION.postman_collection.json`
2. Set `base_url` variable to `https://intellidine-api.aahil-khan.tech`
3. Execute "Customer - Request OTP" (any phone number)
4. Copy OTP from response
5. Execute "Customer - Verify OTP" with OTP
6. JWT token auto-stored and used in next requests

### Manual Testing with cURL

```bash
# Step 1: Request OTP
curl -X POST https://intellidine-api.aahil-khan.tech/api/auth/customer/request-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "9876543210",
    "tenant_id": "11111111-1111-1111-1111-111111111111"
  }'

# Step 2: Verify OTP (use OTP from response)
curl -X POST https://intellidine-api.aahil-khan.tech/api/auth/customer/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "9876543210",
    "otp": "123456",
    "tenant_id": "11111111-1111-1111-1111-111111111111"
  }'

# Step 3: Get menu (use JWT from response)
curl -X GET 'https://intellidine-api.aahil-khan.tech/api/menu?tenant_id=11111111-1111-1111-1111-111111111111&limit=10' \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-Tenant-ID: 11111111-1111-1111-1111-111111111111"
```

---

## Environment Setup

### React App (.env)

```env
# .env
REACT_APP_API_URL=https://intellidine-api.aahil-khan.tech
REACT_APP_TENANT_ID=11111111-1111-1111-1111-111111111111
REACT_APP_RAZORPAY_KEY=YOUR_RAZORPAY_PUBLIC_KEY
```

### Vue App (.env)

```env
VUE_APP_API_URL=https://intellidine-api.aahil-khan.tech
VUE_APP_TENANT_ID=11111111-1111-1111-1111-111111111111
```

### Angular App (environment.ts)

```typescript
export const environment = {
  production: false,
  apiUrl: 'https://intellidine-api.aahil-khan.tech',
  tenantId: '11111111-1111-1111-1111-111111111111',
  razorpayKey: 'YOUR_RAZORPAY_PUBLIC_KEY'
};
```

---

## Troubleshooting Checklist

- [ ] API is accessible at `https://intellidine-api.aahil-khan.tech/health`
- [ ] Postman collection can authenticate and get JWT
- [ ] All 35 endpoints responding (check in Postman)
- [ ] CORS headers present (check browser DevTools)
- [ ] JWT token stored in localStorage after auth
- [ ] Phone number format is 10 digits (Indian format)
- [ ] Tenant ID is correctly set in X-Tenant-ID header
- [ ] No console errors (check browser DevTools)
- [ ] Network requests showing in DevTools
- [ ] API response format matches examples

---

## Support & Questions

**For API Issues**:
- Check `CODEBASE_ARCHITECTURE.md` for system design
- Check `REMAINING_WORK.md` for known limitations
- Check error code in response

**For Frontend Integration**:
- Reference `CODE_EXAMPLES` section above
- Check `error-handling` patterns

**Contact**: Backend team lead

---

## API Status Dashboard

```
✅ Production: https://intellidine-api.aahil-khan.tech/health
✅ Development: http://localhost:3000/health
✅ Services Health: https://intellidine-api.aahil-khan.tech/services/health
✅ Monitoring: http://localhost:3009 (Grafana)
```

**Last Updated**: October 22, 2025  
**Version**: 1.0 MVP  
**Status**: Production Ready ✅

---

**Happy Building! 🚀**
