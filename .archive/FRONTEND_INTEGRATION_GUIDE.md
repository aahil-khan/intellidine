# Frontend Integration Guide - IntelliDine API

## Quick Start for Frontend Developers

Welcome to the IntelliDine API integration guide. This document provides everything you need to integrate your frontend application with our 9 microservices.

---

## 1. Getting Started

### Prerequisites

- Node.js 14+ or modern JavaScript environment
- Understanding of REST APIs and JWT authentication
- Postman (optional, for API testing)
- Your environment configuration (base URL, tenant ID)

### Step 1: Download Postman Collection

For API exploration before integration:

1. Download: `Intellidine-API-Collection.postman_collection.json`
2. Download: `Intellidine-Environments.postman_environments.json`
3. Import both into Postman
4. Read: `POSTMAN_QUICK_START.md`

### Step 2: Set Up Environment Variables

Create a `.env` file in your frontend project:

```
REACT_APP_API_URL=http://localhost:3000
REACT_APP_TENANT_ID=11111111-1111-1111-1111-111111111111
REACT_APP_API_TIMEOUT=30000
REACT_APP_ENV=development
```

For production:

```
REACT_APP_API_URL=https://api.intellidine.com
REACT_APP_TENANT_ID=your-production-tenant-id
REACT_APP_API_TIMEOUT=30000
REACT_APP_ENV=production
```

---

## 2. API Client Setup

### Option A: Using Axios (Recommended)

Create `src/services/api.ts`:

```typescript
import axios, { AxiosInstance, AxiosError } from 'axios';

interface ApiConfig {
  baseURL: string;
  tenantId: string;
  timeout: number;
}

class ApiClient {
  private client: AxiosInstance;
  private tenantId: string;

  constructor(config: ApiConfig) {
    this.tenantId = config.tenantId;

    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': this.tenantId,
      },
    });

    // Add JWT token to requests
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('jwt_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired, clear and redirect to login
          localStorage.removeItem('jwt_token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  public request = this.client.request;
  public get = this.client.get;
  public post = this.client.post;
  public patch = this.client.patch;
  public delete = this.client.delete;
}

export const apiClient = new ApiClient({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000',
  tenantId: process.env.REACT_APP_TENANT_ID || '',
  timeout: parseInt(process.env.REACT_APP_API_TIMEOUT || '30000'),
});
```

### Option B: Using Fetch API

```typescript
class ApiClient {
  private baseURL: string;
  private tenantId: string;
  private timeout: number;

  constructor(baseURL: string, tenantId: string, timeout: number = 30000) {
    this.baseURL = baseURL;
    this.tenantId = tenantId;
    this.timeout = timeout;
  }

  private async request(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    const url = `${this.baseURL}${endpoint}`;
    const token = localStorage.getItem('jwt_token');

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-Tenant-ID': this.tenantId,
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      if (response.status === 401) {
        localStorage.removeItem('jwt_token');
        window.location.href = '/login';
      }

      return response.json();
    } catch (error) {
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  public get(endpoint: string) {
    return this.request(endpoint, { method: 'GET' });
  }

  public post(endpoint: string, data: any) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public patch(endpoint: string, data: any) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  public delete(endpoint: string) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}
```

---

## 3. Authentication Flow

### Step 1: Customer OTP Request

```typescript
async function requestOTP(phone: string) {
  try {
    const response = await apiClient.post('/api/auth/customer/request-otp', {
      phone,
      tenant_id: process.env.REACT_APP_TENANT_ID,
    });

    if (response.data.success) {
      console.log('OTP sent. Expires in:', response.data.expires_in);
      return response.data;
    }
  } catch (error) {
    console.error('Failed to request OTP:', error);
    throw error;
  }
}
```

### Step 2: Verify OTP and Get JWT

```typescript
async function verifyOTP(phone: string, code: string) {
  try {
    const response = await apiClient.post('/api/auth/customer/verify-otp', {
      phone,
      code,
      tenant_id: process.env.REACT_APP_TENANT_ID,
    });

    if (response.data.success) {
      // Save JWT token
      localStorage.setItem('jwt_token', response.data.token);

      // Save user info
      localStorage.setItem('user', JSON.stringify(response.data.user));

      return response.data.user;
    }
  } catch (error) {
    console.error('Invalid OTP:', error);
    throw error;
  }
}
```

### Step 3: Staff Login

```typescript
async function staffLogin(username: string, password: string) {
  try {
    const response = await apiClient.post('/api/auth/staff/login', {
      username,
      password,
      tenant_id: process.env.REACT_APP_TENANT_ID,
    });

    if (response.data.success) {
      localStorage.setItem('jwt_token', response.data.token);
      localStorage.setItem('staff', JSON.stringify(response.data.staff));
      return response.data.staff;
    }
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}
```

---

## 4. Menu Management

### Get Menu Items

```typescript
async function getMenu(limit = 20, offset = 0) {
  try {
    const response = await apiClient.get(
      `/api/menu?tenant_id=${process.env.REACT_APP_TENANT_ID}&limit=${limit}&offset=${offset}`
    );
    return response.data;
  } catch (error) {
    console.error('Failed to fetch menu:', error);
    throw error;
  }
}
```

### Get Single Item

```typescript
async function getMenuItemDetails(itemId: string) {
  try {
    const response = await apiClient.get(
      `/api/menu/items/${itemId}?tenant_id=${process.env.REACT_APP_TENANT_ID}`
    );
    return response.data.data;
  } catch (error) {
    console.error('Failed to fetch item:', error);
    throw error;
  }
}
```

### React Hook Example

```typescript
import { useState, useEffect } from 'react';

export function useMenu() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchMenu() {
      try {
        const response = await getMenu();
        setItems(response.data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    fetchMenu();
  }, []);

  return { items, loading, error };
}
```

---

## 5. Order Management

### Create Order

```typescript
interface OrderItem {
  menu_item_id: string;
  quantity: number;
}

async function createOrder(
  tableId: string,
  items: OrderItem[],
  paymentMethod: 'RAZORPAY' | 'CASH' = 'RAZORPAY'
) {
  try {
    const response = await apiClient.post('/api/orders', {
      table_id: tableId,
      items,
      payment_method: paymentMethod,
    });

    if (response.data.success) {
      return response.data.order;
    }
  } catch (error) {
    console.error('Failed to create order:', error);
    throw error;
  }
}
```

### Get Order Details

```typescript
async function getOrder(orderId: string) {
  try {
    const response = await apiClient.get(`/api/orders/${orderId}`);
    return response.data.order;
  } catch (error) {
    console.error('Failed to fetch order:', error);
    throw error;
  }
}
```

### Update Order Status

```typescript
async function updateOrderStatus(
  orderId: string,
  status: 'accepted' | 'prepared' | 'served' | 'completed'
) {
  try {
    const response = await apiClient.patch(`/api/orders/${orderId}/status`, {
      status,
    });
    return response.data.order;
  } catch (error) {
    console.error('Failed to update order:', error);
    throw error;
  }
}
```

### Cancel Order

```typescript
async function cancelOrder(orderId: string, reason: string) {
  try {
    const response = await apiClient.patch(`/api/orders/${orderId}/cancel`, {
      reason,
    });
    return response.data.order;
  } catch (error) {
    console.error('Failed to cancel order:', error);
    throw error;
  }
}
```

---

## 6. Payment Processing

### Create Razorpay Order

```typescript
async function createRazorpayOrder(orderId: string, amount: number) {
  try {
    const response = await apiClient.post('/api/payments/create-razorpay-order', {
      order_id: orderId,
      amount,
      method: 'RAZORPAY',
      tenant_id: process.env.REACT_APP_TENANT_ID,
    });

    return response.data.razorpay_order;
  } catch (error) {
    console.error('Failed to create Razorpay order:', error);
    throw error;
  }
}
```

### Verify Razorpay Payment

```typescript
interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

async function verifyRazorpayPayment(razorpayData: RazorpayResponse) {
  try {
    const response = await apiClient.post('/api/payments/verify-razorpay', {
      razorpay_order_id: razorpayData.razorpay_order_id,
      razorpay_payment_id: razorpayData.razorpay_payment_id,
      razorpay_signature: razorpayData.razorpay_signature,
    });

    if (response.data.success) {
      return response.data.payment;
    }
  } catch (error) {
    console.error('Payment verification failed:', error);
    throw error;
  }
}
```

### Confirm Cash Payment

```typescript
async function confirmCashPayment(
  orderId: string,
  amount: number,
  changeAmount: number
) {
  try {
    const response = await apiClient.post('/api/payments/confirm-cash', {
      order_id: orderId,
      amount,
      change_amount: changeAmount,
      tenant_id: process.env.REACT_APP_TENANT_ID,
    });

    return response.data.payment;
  } catch (error) {
    console.error('Failed to confirm cash payment:', error);
    throw error;
  }
}
```

---

## 7. Real-Time Notifications

### WebSocket Connection

```typescript
import io, { Socket } from 'socket.io-client';

class NotificationService {
  private socket: Socket;

  constructor(serverUrl: string, token: string) {
    this.socket = io(serverUrl, {
      auth: {
        token,
      },
      transports: ['websocket'],
    });

    this.setupListeners();
  }

  private setupListeners() {
    this.socket.on('connect', () => {
      console.log('Connected to notification service');
    });

    this.socket.on('order_update', (data) => {
      console.log('Order updated:', data);
      // Handle order update
    });

    this.socket.on('payment_received', (data) => {
      console.log('Payment received:', data);
      // Handle payment notification
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from notification service');
    });
  }

  public disconnect() {
    this.socket.disconnect();
  }
}

// Usage
const token = localStorage.getItem('jwt_token');
const notificationService = new NotificationService(
  'http://localhost:3006',
  token!
);
```

---

## 8. Analytics Integration

### Get Daily Metrics

```typescript
async function getDailyMetrics() {
  try {
    const response = await apiClient.get(
      `/api/analytics/daily-metrics?tenant_id=${process.env.REACT_APP_TENANT_ID}`
    );
    return response.data.metrics;
  } catch (error) {
    console.error('Failed to fetch metrics:', error);
    throw error;
  }
}
```

### Get Top Items

```typescript
async function getTopItems(limit = 10) {
  try {
    const response = await apiClient.get(
      `/api/analytics/top-items?tenant_id=${process.env.REACT_APP_TENANT_ID}&limit=${limit}`
    );
    return response.data.items;
  } catch (error) {
    console.error('Failed to fetch top items:', error);
    throw error;
  }
}
```

---

## 9. Error Handling

### Common Error Codes

```typescript
const ERROR_CODES = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  BAD_REQUEST: 400,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

async function handleApiError(error: any) {
  if (error.response?.status === ERROR_CODES.UNAUTHORIZED) {
    // Clear token and redirect to login
    localStorage.removeItem('jwt_token');
    window.location.href = '/login';
  } else if (error.response?.status === ERROR_CODES.BAD_REQUEST) {
    const errorMessage = error.response?.data?.error?.message;
    console.error('Bad request:', errorMessage);
  } else if (error.response?.status === ERROR_CODES.SERVICE_UNAVAILABLE) {
    console.error('Service unavailable. Please try again later.');
  } else {
    console.error('Unexpected error:', error);
  }
}
```

---

## 10. Testing Integration

### Postman Testing

1. Import the collection from `Intellidine-API-Collection.postman_collection.json`
2. Set up environment variables
3. Run requests through the "🔐 Authentication" folder first
4. Test each service folder in sequence

### API Response Validation

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

function isSuccessResponse<T>(
  response: any
): response is ApiResponse<T> & { data: T } {
  return response.success === true && response.data !== undefined;
}
```

---

## 11. Best Practices

### 1. Token Management

```typescript
const TOKEN_EXPIRY_BUFFER = 300000; // 5 minutes

function isTokenExpiring() {
  const expiryTime = localStorage.getItem('token_expiry');
  if (!expiryTime) return true;

  return Date.now() > parseInt(expiryTime) - TOKEN_EXPIRY_BUFFER;
}

function refreshTokenIfNeeded() {
  if (isTokenExpiring()) {
    // Re-authenticate
    window.location.href = '/login';
  }
}
```

### 2. Request Debouncing

```typescript
import { debounce } from 'lodash';

const debouncedSearch = debounce(async (query: string) => {
  const results = await searchMenuItems(query);
  // Update UI
}, 300);
```

### 3. Caching

```typescript
class CacheService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private TTL = 60000; // 1 minute

  set(key: string, data: any) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  get(key: string) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }
}
```

### 4. Error Retry Logic

```typescript
async function retryRequest(
  fn: () => Promise<any>,
  retries = 3,
  delay = 1000
) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
    }
  }
}
```

---

## 12. Environment Configuration

### Development

```
REACT_APP_API_URL=http://localhost:3000
REACT_APP_TENANT_ID=11111111-1111-1111-1111-111111111111
REACT_APP_DEBUG=true
```

### Staging

```
REACT_APP_API_URL=https://api-staging.intellidine.com
REACT_APP_TENANT_ID=staging-tenant-id
REACT_APP_DEBUG=true
```

### Production

```
REACT_APP_API_URL=https://api.intellidine.com
REACT_APP_TENANT_ID=production-tenant-id
REACT_APP_DEBUG=false
```

---

## 13. Troubleshooting

### CORS Issues

Ensure backend has CORS configured:

```
Allowed Origins: http://localhost:3000, https://intellidine.com
Allowed Methods: GET, POST, PATCH, DELETE
Allowed Headers: Authorization, X-Tenant-ID, Content-Type
```

### Token Expiration

- Tokens expire after 24 hours
- Implement automatic re-authentication
- Store refresh logic in a utility service

### Service Timeout

If requests timeout:

1. Increase timeout in API client (from 30s to 60s)
2. Check backend logs
3. Verify network connectivity
4. Check service health: `GET /health`

---

## 14. Support Resources

- API Documentation: `API_DOCS.md`
- Quick Start Guide: `POSTMAN_QUICK_START.md`
- Testing Guide: `POSTMAN_TESTING_GUIDE.md`
- Backend Setup: `SETUP.md`

---

**Last Updated**: January 20, 2024
**API Version**: 1.0
**Frontend Integration Status**: ✅ Ready

**Questions?** Contact the backend team or refer to the comprehensive documentation.
