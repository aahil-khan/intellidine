#!/bin/bash

# Step 4.1: Setup Jest for all services
# This script installs Jest and testing dependencies for all 9 services

set -e

SERVICES=(
  "auth-service"
  "api-gateway"
  "order-service"
  "menu-service"
  "payment-service"
  "inventory-service"
  "analytics-service"
  "discount-engine"
  "notification-service"
  "ml-service"
)

BACKEND_DIR="./backend"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  Installing Jest & Testing Dependencies for All Services      ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

TOTAL_SERVICES=${#SERVICES[@]}
COMPLETED=0

for SERVICE in "${SERVICES[@]}"; do
  COMPLETED=$((COMPLETED + 1))
  SERVICE_PATH="$BACKEND_DIR/$SERVICE"
  
  if [ ! -d "$SERVICE_PATH" ]; then
    echo "⚠️  [$COMPLETED/$TOTAL_SERVICES] Service not found: $SERVICE"
    continue
  fi
  
  echo "📦 [$COMPLETED/$TOTAL_SERVICES] Setting up Jest for: $SERVICE"
  
  cd "$SERVICE_PATH"
  
  # Install dependencies
  npm install --save-dev \
    "@types/jest@^29.5.0" \
    "@types/supertest@^2.0.12" \
    "jest@^29.5.0" \
    "ts-jest@^29.1.0" \
    "ts-loader@^9.5.0" \
    "tsconfig-paths@^4.2.0" \
    "supertest@^6.3.3" \
    2>/dev/null
  
  echo "   ✅ Jest configured for $SERVICE"
  cd - > /dev/null
done

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  Jest Setup Complete! 🎉                                       ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo "1. cd backend/[service-name]"
echo "2. npm run test          # Run tests"
echo "3. npm run test:cov      # Generate coverage report"
echo "4. npm run test:watch    # Watch mode"
echo ""
