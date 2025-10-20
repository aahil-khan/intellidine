/**
 * Common test utilities for all services
 */

export const createMockRequest = (overrides: any = {}) => {
  return {
    headers: {
      authorization: 'Bearer test-token',
      'x-tenant-id': 'tenant-123',
      ...(overrides.headers || {}),
    },
    user: {
      id: 'user-123',
      tenant_id: 'tenant-123',
      ...(overrides.user || {}),
    },
    ...overrides,
  };
};

export const createMockResponse = () => {
  const response: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
  };
  return response;
};

export const createMockNext = () => jest.fn();

/**
 * Common mock data for tests
 */
export const MOCK_TENANT_ID = 'tenant-123';
export const MOCK_USER_ID = 'user-123';
export const MOCK_CUSTOMER_ID = 'cust-123';
export const MOCK_STAFF_ID = 'staff-123';
export const MOCK_JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

export const MOCK_CUSTOMER = {
  id: MOCK_CUSTOMER_ID,
  phone_number: '+919876543210',
  created_at: new Date(),
  updated_at: new Date(),
};

export const MOCK_USER = {
  id: MOCK_STAFF_ID,
  username: 'manager1',
  email: 'manager@restaurant.com',
  password_hash: '$2b$10$hashedpassword',
  role: 'manager',
  tenant_id: MOCK_TENANT_ID,
  created_at: new Date(),
  updated_at: new Date(),
};

export const MOCK_RESTAURANT = {
  id: MOCK_TENANT_ID,
  name: 'Test Restaurant',
  address: '123 Main St',
  phone: '+919876543210',
  created_at: new Date(),
  updated_at: new Date(),
};

export const MOCK_ORDER = {
  id: 'order-123',
  tenant_id: MOCK_TENANT_ID,
  customer_id: MOCK_CUSTOMER_ID,
  total_amount: 500,
  discount_applied: 50,
  final_amount: 450,
  status: 'completed',
  created_at: new Date(),
  updated_at: new Date(),
};

export const MOCK_MENU_ITEM = {
  id: 'item-123',
  tenant_id: MOCK_TENANT_ID,
  name: 'Biryani',
  description: 'Hyderabadi Biryani',
  price: 250,
  category: 'Main Course',
  available: true,
  created_at: new Date(),
  updated_at: new Date(),
};

export const MOCK_DISCOUNT_RULE = {
  id: 'rule-123',
  tenant_id: MOCK_TENANT_ID,
  name: 'Weekend Special',
  type: 'time_based',
  config: {
    days: ['Saturday', 'Sunday'],
    discount_percent: 10,
  },
  active: true,
  created_at: new Date(),
  updated_at: new Date(),
};
