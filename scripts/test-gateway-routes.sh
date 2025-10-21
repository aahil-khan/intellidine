#!/bin/bash

# API Gateway Testing Script
# Tests all 6 service routes through the API Gateway

BASE_URL="http://localhost:3000"
echo "=========================================="
echo "API Gateway Route Testing"
echo "=========================================="
echo "Base URL: $BASE_URL"
echo ""

# Test 1: Gateway Health Check
echo "1. Testing Gateway Health Endpoint:"
echo "   GET /health"
curl -s "$BASE_URL/health" | head -c 200
echo ""
echo ""

# Test 2: Services Health Check
echo "2. Testing Services Health Check:"
echo "   GET /services/health"
curl -s "$BASE_URL/services/health" | head -c 400
echo ""
echo ""

# Test 3: Auth Service
echo "3. Testing Auth Service Route:"
echo "   GET /api/auth/health"
curl -s "$BASE_URL/api/auth/health" | head -c 300
echo ""
echo ""

# Test 4: Menu Service
echo "4. Testing Menu Service Route:"
echo "   GET /api/menu/health"
curl -s "$BASE_URL/api/menu/health" | head -c 300
echo ""
echo ""

# Test 5: Order Service
echo "5. Testing Order Service Route:"
echo "   GET /api/orders/health"
curl -s "$BASE_URL/api/orders/health" | head -c 300
echo ""
echo ""

# Test 6: Inventory Service
echo "6. Testing Inventory Service Route:"
echo "   GET /api/inventory/health"
curl -s "$BASE_URL/api/inventory/health" | head -c 300
echo ""
echo ""

# Test 7: Payment Service
echo "7. Testing Payment Service Route:"
echo "   GET /api/payments/health"
curl -s "$BASE_URL/api/payments/health" | head -c 300
echo ""
echo ""

# Test 8: Notification Service
echo "8. Testing Notification Service Route:"
echo "   GET /api/notifications/health"
curl -s "$BASE_URL/api/notifications/health" | head -c 300
echo ""
echo ""

# Test 9: Invalid Route (should get 404)
echo "9. Testing Invalid Route (Expected 404):"
echo "   GET /api/invalid/endpoint"
curl -s "$BASE_URL/api/invalid/endpoint" | head -c 300
echo ""
echo ""

echo "=========================================="
echo "All tests completed!"
echo "=========================================="
