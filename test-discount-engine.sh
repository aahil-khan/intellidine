#!/bin/bash

# Discount Engine Testing Script
# Complete cURL examples for all discount engine endpoints

echo "═══════════════════════════════════════════════════════════════"
echo "          DISCOUNT ENGINE - cURL Testing Examples              "
echo "═══════════════════════════════════════════════════════════════"

BASE_URL="http://localhost:3008"

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "\n${BLUE}1. Health Check${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "curl -X GET ${BASE_URL}/api/discount/health\n"

echo -e "\n${BLUE}2. Get All Rules (default tenant)${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "curl -X GET '${BASE_URL}/api/discount/rules?tenant=default'\n"

echo -e "\n${BLUE}3. Get Discount Statistics${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "curl -X GET '${BASE_URL}/api/discount/stats?tenant=default'\n"

echo -e "\n${BLUE}4. Get Rule Templates${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "curl -X GET ${BASE_URL}/api/discount/templates\n"

echo -e "\n${BLUE}5. Simulate Discount Evaluation${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "curl -X POST '${BASE_URL}/api/discount/simulate?tenant=default'\n"

echo -e "\n${BLUE}6. Evaluate Discounts for Lunch Order${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cat << 'EOF'
curl -X POST http://localhost:3008/api/discount/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "default",
    "orderId": "order-lunch-001",
    "customerId": "cust-001",
    "customerType": "repeat",
    "orderItems": [
      {"menuItemId": "item-1", "quantity": 2, "basePrice": 300},
      {"menuItemId": "item-2", "quantity": 1, "basePrice": 250}
    ],
    "totalAmount": 850,
    "orderTime": "2025-10-20T12:00:00Z",
    "paymentMethod": "razorpay"
  }'
EOF
echo ""

echo -e "\n${BLUE}7. Evaluate Discounts for Bulk Order${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cat << 'EOF'
curl -X POST http://localhost:3008/api/discount/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "default",
    "orderId": "order-bulk-001",
    "customerId": "corp-client",
    "customerType": "vip",
    "orderItems": [
      {"menuItemId": "item-1", "quantity": 5, "basePrice": 200},
      {"menuItemId": "item-2", "quantity": 4, "basePrice": 250},
      {"menuItemId": "item-3", "quantity": 3, "basePrice": 180}
    ],
    "totalAmount": 3190,
    "orderTime": "2025-10-20T13:00:00Z",
    "paymentMethod": "razorpay"
  }'
EOF
echo ""

echo -e "\n${BLUE}8. Evaluate Discounts for Dinner Order${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cat << 'EOF'
curl -X POST http://localhost:3008/api/discount/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "default",
    "orderId": "order-dinner-001",
    "customerId": "cust-002",
    "customerType": "new",
    "orderItems": [
      {"menuItemId": "item-1", "quantity": 2, "basePrice": 400},
      {"menuItemId": "item-2", "quantity": 1, "basePrice": 350}
    ],
    "totalAmount": 1150,
    "orderTime": "2025-10-20T19:00:00Z",
    "paymentMethod": "cash"
  }'
EOF
echo ""

echo -e "\n${BLUE}9. Add Time-Based Discount Rule${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cat << 'EOF'
curl -X POST 'http://localhost:3008/api/discount/rules?tenant=default' \
  -H "Content-Type: application/json" \
  -d '{
    "type": "TIME_BASED",
    "name": "Weekend Brunch Special",
    "startHour": 10,
    "endHour": 13,
    "discountPercent": 20,
    "daysOfWeek": [0, 6],
    "active": true
  }'
EOF
echo ""

echo -e "\n${BLUE}10. Add Volume-Based Discount Rule${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cat << 'EOF'
curl -X POST 'http://localhost:3008/api/discount/rules?tenant=default' \
  -H "Content-Type: application/json" \
  -d '{
    "type": "VOLUME_BASED",
    "name": "Medium Order Discount",
    "minItems": 5,
    "maxItems": 9,
    "discountPercent": 12,
    "active": true
  }'
EOF
echo ""

echo -e "\n${BLUE}11. Add Item-Specific Discount Rule${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cat << 'EOF'
curl -X POST 'http://localhost:3008/api/discount/rules?tenant=default' \
  -H "Content-Type: application/json" \
  -d '{
    "type": "ITEM_SPECIFIC",
    "name": "Premium Pizza Special",
    "menuItemIds": ["uuid-premium-1", "uuid-premium-2"],
    "discountPercent": 15,
    "minQuantity": 1,
    "active": true
  }'
EOF
echo ""

echo -e "\n${BLUE}12. Add Customer Segment Rule${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cat << 'EOF'
curl -X POST 'http://localhost:3008/api/discount/rules?tenant=default' \
  -H "Content-Type: application/json" \
  -d '{
    "type": "CUSTOMER_SEGMENT",
    "name": "Repeat Customer Loyalty",
    "customerTypes": ["repeat"],
    "discountPercent": 10,
    "maxUsagePerCustomer": 5,
    "active": true
  }'
EOF
echo ""

echo -e "\n${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Testing Guide:${NC}"
echo -e "1. Start the discount-engine service: npm run start:dev"
echo -e "2. Copy and paste any of the above curl commands"
echo -e "3. Update IDs and values as needed for your testing"
echo -e "4. Use 'jq' for pretty JSON: curl ... | jq ."
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}\n"
