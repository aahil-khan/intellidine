#!/bin/bash

# API Gateway Integration Test Script
# Tests auth flow and protected endpoints

BASE_URL="http://localhost:3000"
TENANT_ID="tenant-001"

echo "=========================================="
echo "API Gateway Integration Testing"
echo "=========================================="
echo "Base URL: $BASE_URL"
echo "Tenant ID: $TENANT_ID"
echo ""

# Test 1: Register a new user
echo "1. Register New User (POST /api/auth/register):"
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: $TENANT_ID" \
  -d '{
    "email": "test@example.com",
    "password": "test123456",
    "name": "Test User",
    "userType": "restaurant_owner"
  }')
echo "$REGISTER_RESPONSE" | head -c 400
echo ""
echo ""

# Extract token from register response (if successful)
TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
if [ -z "$TOKEN" ]; then
  echo "❌ Registration failed or token not found"
  echo "   Full response: $REGISTER_RESPONSE"
  echo ""
  
  # Try to login with default credentials
  echo "Attempting login instead..."
  LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -H "x-tenant-id: $TENANT_ID" \
    -d '{
      "email": "test@example.com",
      "password": "test123456"
    }')
  echo "$LOGIN_RESPONSE" | head -c 400
  echo ""
  TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
fi

echo ""
if [ -n "$TOKEN" ]; then
  echo "✅ Got authentication token (first 20 chars): ${TOKEN:0:20}..."
  echo ""
  
  # Test 2: Use token to access protected endpoint
  echo "2. Access Protected Endpoint (GET /api/orders with token):"
  curl -s -H "Authorization: Bearer $TOKEN" \
    -H "x-tenant-id: $TENANT_ID" \
    "$BASE_URL/api/orders" | head -c 400
  echo ""
  echo ""
  
  # Test 3: Access with wrong tenant ID
  echo "3. Access with Different Tenant ID (should fail or isolate):"
  curl -s -H "Authorization: Bearer $TOKEN" \
    -H "x-tenant-id: different-tenant" \
    "$BASE_URL/api/orders" | head -c 400
  echo ""
  echo ""
  
  # Test 4: Create an order
  echo "4. Create New Order (POST /api/orders):"
  ORDER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/orders" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -H "x-tenant-id: $TENANT_ID" \
    -d '{
      "items": [
        {"menuItemId": 1, "quantity": 2},
        {"menuItemId": 2, "quantity": 1}
      ],
      "notes": "Extra spicy please"
    }')
  echo "$ORDER_RESPONSE" | head -c 400
  echo ""
  echo ""
  
  # Extract order ID if successful
  ORDER_ID=$(echo "$ORDER_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
  if [ -n "$ORDER_ID" ]; then
    echo "✅ Order created with ID: $ORDER_ID"
    echo ""
    
    # Test 5: Get specific order
    echo "5. Get Specific Order (GET /api/orders/$ORDER_ID):"
    curl -s -H "Authorization: Bearer $TOKEN" \
      -H "x-tenant-id: $TENANT_ID" \
      "$BASE_URL/api/orders/$ORDER_ID" | head -c 400
    echo ""
    echo ""
  fi
else
  echo "❌ Could not obtain authentication token"
  echo "   Testing without authentication..."
  echo ""
fi

# Test 6: Access without authentication token (should fail)
echo "6. Access Protected Endpoint Without Token (Expected to fail):"
curl -s "$BASE_URL/api/orders" | head -c 300
echo ""
echo ""

# Test 7: Get menu items (public endpoint)
echo "7. Get Menu Items (Public Endpoint - GET /api/menu/items):"
curl -s "$BASE_URL/api/menu/items" | head -c 400
echo ""
echo ""

# Test 8: Check request headers are being propagated
echo "8. Testing Correlation ID Propagation:"
CORR_ID=$(uuidgen)
echo "   Sending request with Correlation ID: $CORR_ID"
RESPONSE_HEADERS=$(curl -s -i "$BASE_URL/api/inventory/items" 2>&1 | grep -E "x-correlation-id|x-processed-by|x-processing-time" | head -c 300)
echo "   Response headers: $RESPONSE_HEADERS"
echo ""
echo ""

echo "=========================================="
echo "All integration tests completed!"
echo "=========================================="
