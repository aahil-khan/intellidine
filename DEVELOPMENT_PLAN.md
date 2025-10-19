# IntelliDine Phase 1 MVP - Comprehensive Development Plan

**Date**: October 18, 2025  
**Status**: Infrastructure Complete, Ready for Implementation  
**Target**: Complete MVP by November 8, 2025 (3 weeks)

---

## 📋 TABLE OF CONTENTS
1. [Phase Overview](#phase-overview)
2. [Detailed Implementation Steps](#detailed-implementation-steps)
3. [Sprint Breakdown](#sprint-breakdown)
4. [Testing Strategy](#testing-strategy)
5. [Deployment Readiness](#deployment-readiness)

---

## PHASE OVERVIEW

### Current State (Oct 18)
✅ Infrastructure: 16 services running  
✅ Database: Schema + migrations + seed data  
✅ Skeletons: 9 NestJS services + API Gateway  
✅ Monitoring: Prometheus + Grafana ready  

### MVP Scope (Phase 1)
- QR-based customer ordering with OTP authentication
- Kitchen Display System (KDS) real-time updates
- Manager dashboard (menu/inventory management)
- Rule-based discount engine
- Razorpay + Cash payment processing
- Analytics dashboard
- Multi-tenant RBAC architecture

### Timeline
- **Sprint 1** (Oct 18-25): Authentication + Menu + Order Core
- **Sprint 2** (Oct 25-Nov 1): Payments + Inventory + Real-time
- **Sprint 3** (Nov 1-8): Analytics + Discount Engine + Frontend
- **Sprint 4** (Nov 8-15): Testing, Optimization, Production Ready

---

## DETAILED IMPLEMENTATION STEPS

### SPRINT 1: Authentication, Menu, & Order Foundations

#### Step 1.1: Auth Service - OTP Flow (No API Keys Needed)
**Duration**: 2 days  
**No external dependencies** - can mock SMS for now

**Tasks**:
1. Create DTOs (request-otp, verify-otp, login)
   - `src/auth/dto/request-otp.dto.ts`
   - `src/auth/dto/verify-otp.dto.ts`
   - `src/auth/dto/login.dto.ts`

2. Implement OTP Service (Redis-backed)
   - Generate 6-digit OTP
   - Store in Redis with 5-min expiry
   - Generate JWT on verification

3. Create Auth Controllers
   ```
   POST /api/auth/customer/request-otp
   POST /api/auth/customer/verify-otp
   POST /api/auth/staff/login
   GET /api/auth/user (current user)
   ```

4. Implement JWT Guards
   - Bearer token validation
   - Cookie auth support (via AUTH_MODE)
   - Role-based access control (RBAC)

5. Add Bcrypt for password hashing

**Files to create**:
```
backend/auth-service/src/
├── auth.module.ts (update)
├── auth.controller.ts (update)
├── auth.service.ts (update)
├── dto/
│   ├── request-otp.dto.ts
│   ├── verify-otp.dto.ts
│   ├── login.dto.ts
│   ├── verify-response.dto.ts
│   └── login-response.dto.ts
├── guards/
│   ├── jwt.guard.ts
│   ├── roles.guard.ts
│   └── auth.guard.ts
├── decorators/
│   ├── jwt-auth.decorator.ts
│   └── roles.decorator.ts
└── services/
    └── otp.service.ts
```

**Testing**:
- Unit tests for OTP generation/verification
- Integration tests for endpoints
- Test Redis expiry

---

#### Step 1.2: Menu Service - CRUD & Caching (No API Keys)
**Duration**: 2 days

**Tasks**:
1. Create Menu DTOs
   - `CreateMenuItemDto`
   - `UpdateMenuItemDto`
   - `MenuResponseDto`
   - `CategoryDto`

2. Implement Menu Controllers
   ```
   GET /api/menu?tenant_id=... (list all categories + items)
   GET /api/menu/categories
   GET /api/menu/items/:id
   POST /api/menu/items (manager only)
   PATCH /api/menu/items/:id (manager only)
   DELETE /api/menu/items/:id (manager only)
   ```

3. Implement Menu Service with Caching
   - Query items from Prisma
   - Cache in Redis (300s TTL)
   - Invalidate cache on update/delete
   - Search/filter functionality

4. Add availability toggle
   - Mark items as available/unavailable
   - Soft delete support

**Files to create**:
```
backend/menu-service/src/
├── menu.module.ts (update)
├── menu.controller.ts (update)
├── menu.service.ts (update)
├── dto/
│   ├── create-menu-item.dto.ts
│   ├── update-menu-item.dto.ts
│   ├── menu-response.dto.ts
│   ├── category.dto.ts
│   └── get-menu.dto.ts
├── services/
│   └── cache.service.ts
└── interceptors/
    └── cache.interceptor.ts
```

**Testing**:
- Cache hit/miss scenarios
- Concurrent requests
- List performance

---

#### Step 1.3: Order Service - Core Order Flow (No API Keys)
**Duration**: 3 days

**Tasks**:
1. Create Order DTOs
   - `CreateOrderDto`
   - `OrderItemDto`
   - `UpdateOrderStatusDto`
   - `OrderResponseDto`

2. Implement Order Controllers
   ```
   POST /api/orders (customer)
   GET /api/orders/:id (customer/staff)
   GET /api/orders (manager - all, pagination)
   PATCH /api/orders/:id/status (kitchen staff)
   ```

3. Implement Order Service with Business Logic
   - Validate items available
   - Calculate totals
   - Apply basic discounts (static rules)
   - Track order status
   - Store order history

4. Implement Kafka Integration (NO external keys needed)
   - Create KafkaService
   - Publish `order.created` event
   - Publish `order.status_changed` event
   - Publish `order.completed` event

5. Inventory Integration
   - Check stock levels
   - Reserve items on order
   - Flag low inventory

**Files to create**:
```
backend/order-service/src/
├── order.module.ts (update)
├── order.controller.ts (update)
├── order.service.ts (update)
├── dto/
│   ├── create-order.dto.ts
│   ├── order-item.dto.ts
│   ├── order-response.dto.ts
│   ├── update-order-status.dto.ts
│   └── order-list.dto.ts
├── services/
│   ├── order.service.ts (update)
│   ├── order-calculator.service.ts (totals, discounts)
│   └── order-validator.service.ts
├── events/
│   ├── order.created.event.ts
│   ├── order.status-changed.event.ts
│   └── order.completed.event.ts
└── kafka/
    └── order.producer.ts
```

**Testing**:
- Order creation validation
- Status transitions
- Kafka event publishing
- Inventory deduction

---

#### Step 1.4: Implement Shared Auth Middleware
**Duration**: 1 day

**Tasks**:
1. Create API Gateway Auth Middleware
   - Extract JWT from header/cookie (based on AUTH_MODE)
   - Validate token
   - Attach user to request
   - Forward to downstream services

2. Create Service-to-Service Auth
   - Internal JWT for service calls
   - Service mesh authentication
   - Request signing

**Files to create**:
```
backend/
├── shared/
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   └── request-context.middleware.ts
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   └── require-role.decorator.ts
│   ├── guards/
│   │   ├── jwt.guard.ts
│   │   └── roles.guard.ts
│   ├── utils/
│   │   └── jwt.utils.ts
│   └── types/
│       └── request-context.types.ts
```

---

### SPRINT 2: Payments, Inventory, & Real-time

#### Step 2.1: Inventory Service (No API Keys)
**Duration**: 2 days

**Tasks**:
1. Create Inventory DTOs
   - `GetInventoryDto`
   - `AdjustInventoryDto`
   - `InventoryResponseDto`

2. Implement Inventory Controllers
   ```
   GET /api/inventory (manager - all items)
   GET /api/inventory/:item_id
   PATCH /api/inventory/:item_id (adjust quantity)
   POST /api/inventory/batch-adjust (bulk updates)
   ```

3. Implement Inventory Service
   - Track quantities by tenant
   - Deduct on order completion
   - Track reorder levels
   - Generate reorder alerts
   - Audit trail for adjustments

4. Kafka Consumer Integration
   - Listen to `order.completed` events
   - Deduct inventory automatically
   - Publish `inventory.low` events

**Files to create**:
```
backend/inventory-service/src/
├── inventory.module.ts (update)
├── inventory.controller.ts (update)
├── inventory.service.ts (update)
├── dto/
│   ├── get-inventory.dto.ts
│   ├── adjust-inventory.dto.ts
│   └── inventory-response.dto.ts
├── services/
│   └── inventory-calculator.service.ts
├── kafka/
│   └── inventory.consumer.ts
└── events/
    └── inventory.low.event.ts
```

---

#### Step 2.2: Payment Service - Cash & Razorpay Structure (Mock Razorpay)
**Duration**: 3 days

**Note**: Will mock Razorpay API for now. Integrate real keys later.

**Tasks**:
1. Create Payment DTOs
   - `CreatePaymentDto`
   - `ConfirmCashPaymentDto`
   - `PaymentResponseDto`
   - `RazorpayWebhookDto`

2. Implement Payment Controllers
   ```
   POST /api/payments/create-order (customer, returns Razorpay order details)
   POST /api/payments/verify-razorpay (customer, verifies signature)
   POST /api/payments/confirm-cash (waiter, confirms cash payment)
   GET /api/payments/:order_id (get payment status)
   POST /api/payments/webhook (Razorpay webhook - mocked)
   ```

3. Implement Payment Service (Mocked)
   - Generate order reference numbers
   - Create mock Razorpay orders (no API call)
   - Verify payment signatures (mock)
   - Record cash payments
   - Update order status to PAID

4. Payment State Machine
   - PENDING → PROCESSING → COMPLETED
   - PENDING → FAILED → RETRY
   - Handle webhooks for async confirmation

5. Kafka Integration
   - Publish `payment.completed` events
   - Publish `payment.failed` events

**Files to create**:
```
backend/payment-service/src/
├── payment.module.ts (update)
├── payment.controller.ts (update)
├── payment.service.ts (update)
├── dto/
│   ├── create-payment.dto.ts
│   ├── confirm-cash-payment.dto.ts
│   ├── payment-response.dto.ts
│   ├── razorpay-webhook.dto.ts
│   └── razorpay-response.dto.ts
├── services/
│   ├── razorpay.service.ts (mocked, no real API calls)
│   ├── cash-payment.service.ts
│   └── payment-state.service.ts
├── kafka/
│   └── payment.producer.ts
└── mocks/
    └── razorpay-mock.ts
```

---

#### Step 2.3: Notification Service - Real-time Updates (Socket.io)
**Duration**: 2 days

**Tasks**:
1. Setup Socket.io in Notification Service
   - Create Socket.io gateway
   - Implement namespaces: `/orders`, `/kitchen`, `/managers`

2. Implement Real-time Events
   ```
   order:created → broadcast to kitchen
   order:status_changed → broadcast to customer
   payment:confirmed → broadcast to customer & manager
   inventory:low → broadcast to manager
   ```

3. Create Socket Controllers
   - `/socket/subscribe` - join room
   - `/socket/unsubscribe` - leave room

4. Kafka Consumer → Socket.io Emitter
   - Listen to all order/payment/inventory events
   - Emit to connected clients via Socket.io

**Files to create**:
```
backend/notification-service/src/
├── notification.module.ts (update)
├── gateway/
│   ├── notification.gateway.ts
│   ├── orders.gateway.ts
│   ├── kitchen.gateway.ts
│   └── managers.gateway.ts
├── services/
│   ├── socket-broadcast.service.ts
│   └── kafka-consumer.service.ts
├── kafka/
│   └── notification.consumer.ts
└── dto/
    └── socket-event.dto.ts
```

---

#### Step 2.4: API Gateway - Service Routing & Request Aggregation
**Duration**: 2 days

**Tasks**:
1. Implement Service Routing
   ```
   /api/auth/* → auth-service:3001
   /api/menu/* → menu-service:3003
   /api/orders/* → order-service:3002
   /api/inventory/* → inventory-service:3004
   /api/payments/* → payment-service:3005
   /api/notifications/* → notification-service:3006
   ```

2. Request Enrichment
   - Extract user context from JWT
   - Add tenant_id to requests
   - Add correlation IDs for tracing

3. Response Standardization
   - Wrap responses in standard format
   - Error handling & mapping
   - Status code normalization

**Files to create**:
```
backend/api-gateway/src/
├── app.module.ts (update)
├── main.ts (update)
├── app.controller.ts (update)
├── gateway/
│   ├── service-router.ts
│   ├── auth.proxy.ts
│   ├── menu.proxy.ts
│   ├── order.proxy.ts
│   ├── payment.proxy.ts
│   ├── inventory.proxy.ts
│   └── notification.proxy.ts
├── middleware/
│   ├── auth.middleware.ts
│   ├── request-context.middleware.ts
│   └── error-handler.middleware.ts
└── dto/
    ├── api-response.dto.ts
    └── api-error.dto.ts
```

---

### SPRINT 3: Analytics, Discount Engine, & Frontend

#### Step 3.1: Analytics Service (No API Keys)
**Duration**: 2 days

**Tasks**:
1. Create Analytics DTOs
   - `DailyMetricsDto`
   - `AnalyticsQueryDto`
   - `RevenueReportDto`

2. Implement Analytics Controllers
   ```
   GET /api/analytics/daily-metrics?date=... (daily summary)
   GET /api/analytics/revenue?from=...&to=... (revenue trends)
   GET /api/analytics/top-items (best sellers)
   GET /api/analytics/orders-count (order volume)
   GET /api/analytics/payment-methods (payment breakdown)
   ```

3. Implement Analytics Service
   - Consume `order.completed` events
   - Aggregate daily metrics (revenue, orders, items sold)
   - Calculate KPIs (avg order value, conversion rate)
   - Store in database for historical tracking

4. Background Job - Daily Aggregation
   - Run at midnight (Asia/Kolkata)
   - Aggregate previous day's data
   - Store in `daily_metrics` table

**Files to create**:
```
backend/analytics-service/src/
├── analytics.module.ts (update)
├── analytics.controller.ts (update)
├── analytics.service.ts (update)
├── dto/
│   ├── daily-metrics.dto.ts
│   ├── analytics-query.dto.ts
│   ├── revenue-report.dto.ts
│   └── kpi.dto.ts
├── services/
│   ├── metrics-aggregator.service.ts
│   └── kpi-calculator.service.ts
├── jobs/
│   └── daily-aggregation.job.ts
├── kafka/
│   └── analytics.consumer.ts
└── queries/
    └── analytics.queries.ts
```

---

#### Step 3.2: Discount Engine (No API Keys)
**Duration**: 2 days

**Tasks**:
1. Create Discount DTOs
   - `PricingRuleDto`
   - `DiscountSuggestionDto`
   - `ApplyDiscountDto`

2. Implement Discount Controllers
   ```
   POST /api/discounts/calculate (customer, calculate discount)
   GET /api/discounts/rules (manager, view active rules)
   POST /api/discounts/rules (manager, create rule)
   GET /api/discounts/suggestions (manager, ML suggestions)
   ```

3. Implement Rule Evaluation Engine
   - Time-based rules (happy hour, lunch discount)
   - Volume-based rules (buy 2 get 20% off)
   - Item-specific rules
   - Customer tier rules (first-time customer, loyalty)

4. ML Integration (Shadow Mode)
   - Call ML service for discount suggestions
   - Log recommendations but don't apply them yet
   - Track actual vs suggested discounts

**Files to create**:
```
backend/discount-engine/src/
├── discount.module.ts (update)
├── discount.controller.ts (update)
├── discount.service.ts (update)
├── dto/
│   ├── pricing-rule.dto.ts
│   ├── discount-suggestion.dto.ts
│   ├── apply-discount.dto.ts
│   └── rule-condition.dto.ts
├── services/
│   ├── rule-engine.service.ts
│   ├── discount-calculator.service.ts
│   └── ml-integration.service.ts
├── rules/
│   ├── base.rule.ts
│   ├── time-based.rule.ts
│   ├── volume-based.rule.ts
│   ├── item-specific.rule.ts
│   └── loyalty.rule.ts
└── kafka/
    └── discount.producer.ts
```

---

#### Step 3.3: Frontend - React + Vite Scaffold (No API Keys)
**Duration**: 3 days

**Tasks**:
1. Create Vite + React Project
   ```bash
   npm create vite@latest frontend -- --template react-ts
   ```

2. Setup Core Folder Structure
   ```
   frontend/src/
   ├── pages/
   │   ├── CustomerMenu.tsx (customer ordering)
   │   ├── KDS.tsx (kitchen display)
   │   ├── ManagerDashboard.tsx (manager dashboard)
   │   ├── Analytics.tsx (analytics page)
   │   └── Login.tsx
   ├── components/
   │   ├── MenuCard.tsx
   │   ├── Cart.tsx
   │   ├── OrderStatus.tsx
   │   ├── Header.tsx
   │   └── Sidebar.tsx
   ├── stores/
   │   ├── authStore.ts (Zustand)
   │   ├── menuStore.ts (Zustand)
   │   ├── orderStore.ts (Zustand)
   │   └── cartStore.ts (Zustand)
   ├── api/
   │   ├── client.ts (Axios instance)
   │   ├── auth.api.ts
   │   ├── menu.api.ts
   │   ├── orders.api.ts
   │   └── analytics.api.ts
   ├── services/
   │   └── socket.service.ts (Socket.io client)
   ├── hooks/
   │   ├── useAuth.ts
   │   ├── useMenu.ts
   │   └── useOrders.ts
   ├── styles/
   │   ├── tailwind.css
   │   └── globals.css
   ├── App.tsx
   └── main.tsx
   ```

3. Implement Authentication Pages
   - Login page (staff)
   - OTP verification page (customer)
   - Session management

4. Implement Customer Menu Page
   - Display categories
   - Show menu items with prices
   - Add to cart functionality
   - Real-time item availability

5. Implement Shopping Cart
   - Add/remove items
   - Calculate totals
   - Apply discounts
   - Checkout flow

6. Implement KDS (Kitchen Display System)
   - Real-time order display (via Socket.io)
   - Status update buttons
   - Order timer
   - Audio alerts for new orders

7. Implement Analytics Dashboard
   - Charts for revenue, orders, top items
   - Date range filters
   - Export functionality

**Files to create**:
```
frontend/
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
├── package.json
└── src/
    ├── pages/
    │   ├── Login.tsx
    │   ├── OTPVerification.tsx
    │   ├── CustomerMenu.tsx
    │   ├── KDS.tsx
    │   ├── ManagerDashboard.tsx
    │   ├── Analytics.tsx
    │   └── NotFound.tsx
    ├── components/
    │   ├── MenuCard.tsx
    │   ├── Cart.tsx
    │   ├── OrderCard.tsx
    │   ├── Header.tsx
    │   └── Sidebar.tsx
    ├── stores/
    │   ├── authStore.ts
    │   ├── menuStore.ts
    │   ├── orderStore.ts
    │   └── cartStore.ts
    ├── api/
    │   ├── client.ts
    │   ├── auth.api.ts
    │   ├── menu.api.ts
    │   ├── orders.api.ts
    │   ├── payments.api.ts
    │   └── analytics.api.ts
    ├── services/
    │   └── socket.service.ts
    ├── hooks/
    │   ├── useAuth.ts
    │   ├── useMenu.ts
    │   ├── useOrders.ts
    │   └── useSocket.ts
    ├── types/
    │   ├── auth.types.ts
    │   ├── menu.types.ts
    │   ├── order.types.ts
    │   └── analytics.types.ts
    ├── utils/
    │   ├── formatters.ts
    │   └── validators.ts
    ├── App.tsx
    ├── main.tsx
    └── index.css
```

---

### SPRINT 4: Testing, Integration & Optimization

#### Step 4.1: Unit & Integration Tests (All Services)
**Duration**: 3 days

**Tasks**:
1. Unit Tests (Jest)
   - Service layer tests (all business logic)
   - DTO validation tests
   - Utility functions

2. Integration Tests (Supertest)
   - Controller endpoints
   - Full request/response cycles
   - Database transactions

3. Test Coverage Target: >80%

**Files**:
```
backend/{service}/test/
├── {service}.service.spec.ts
├── {service}.controller.spec.ts
└── fixtures/
    └── mock-data.ts
```

---

#### Step 4.2: API Contract Testing
**Duration**: 1 day

**Tasks**:
1. Document all API endpoints (OpenAPI/Swagger)
2. Test request/response schemas
3. Validate error responses

---

#### Step 4.3: Performance Optimization
**Duration**: 2 days

**Tasks**:
1. Database Query Optimization
   - Add indexes on frequently queried fields
   - Optimize joins
   - Query profiling

2. Caching Strategy
   - Redis caching for menu items
   - Cache invalidation on updates
   - Session caching

3. Load Testing
   - Simulate 50-100 concurrent users per restaurant
   - Identify bottlenecks
   - Optimize as needed

---

#### Step 4.4: Production Deployment
**Duration**: 2 days

**Tasks**:
1. Docker Image Optimization
   - Multi-stage builds
   - Image size reduction
   - Security scanning

2. Environment Configuration
   - Production .env setup
   - Database backups
   - Log aggregation

3. Deployment Documentation
   - Deploy scripts
   - Rollback procedures
   - Monitoring setup

---

## SPRINT BREAKDOWN

### Sprint 1: Oct 18-25 (Auth, Menu, Orders)
**Week 1 Milestones**:
- Day 1-2: Auth Service OTP flow
- Day 3-4: Menu Service CRUD + Caching
- Day 5-7: Order Service + Kafka + Inventory check

**Deliverables**:
- [ ] POST /api/auth/customer/request-otp ✓
- [ ] POST /api/auth/customer/verify-otp ✓
- [ ] GET /api/menu ✓
- [ ] POST /api/orders ✓
- [ ] PATCH /api/orders/:id/status ✓
- [ ] Kafka order events flowing ✓

---

### Sprint 2: Oct 25-Nov 1 (Payments, Inventory, Real-time)
**Week 2 Milestones**:
- Day 1-2: Inventory Service
- Day 3-5: Payment Service (mocked)
- Day 6-7: Socket.io Notifications + API Gateway routing

**Deliverables**:
- [ ] Inventory management endpoints ✓
- [ ] Payment flow (mock Razorpay) ✓
- [ ] Real-time order updates via Socket.io ✓
- [ ] API Gateway routing all services ✓

---

### Sprint 3: Nov 1-8 (Analytics, Discounts, Frontend)
**Week 3 Milestones**:
- Day 1-2: Analytics Service
- Day 3-4: Discount Engine
- Day 5-7: Frontend (React + Vite)

**Deliverables**:
- [ ] Analytics endpoints ✓
- [ ] Discount calculation ✓
- [ ] Customer menu ordering UI ✓
- [ ] KDS interface ✓
- [ ] Manager dashboard ✓

---

### Sprint 4: Nov 8-15 (Testing, Optimization, Launch Ready)
**Week 4 Milestones**:
- Day 1-2: Unit & integration tests
- Day 3-4: Performance optimization
- Day 5-7: Documentation & deployment

**Deliverables**:
- [ ] >80% test coverage ✓
- [ ] Performance benchmarks met ✓
- [ ] Production deployment ready ✓
- [ ] Documentation complete ✓

---

## TESTING STRATEGY

### Unit Tests (By Service)
```
auth-service/
├── otp.service.spec.ts (OTP generation, verification, expiry)
├── jwt.service.spec.ts (token generation, validation)
└── auth.controller.spec.ts (endpoints)

menu-service/
├── menu.service.spec.ts (CRUD, caching)
└── menu.controller.spec.ts (endpoints)

order-service/
├── order.service.spec.ts (creation, validation, totals)
├── order-calculator.spec.ts (calculations)
└── order.controller.spec.ts (endpoints)

payment-service/
├── payment.service.spec.ts (payment flow, state machine)
├── razorpay.service.spec.ts (mocked calls)
└── payment.controller.spec.ts (endpoints)

inventory-service/
├── inventory.service.spec.ts (stock tracking, deductions)
└── inventory.controller.spec.ts (endpoints)

discount-engine/
├── rule-engine.spec.ts (rule evaluation)
├── discount-calculator.spec.ts (calculations)
└── discount.controller.spec.ts (endpoints)

analytics-service/
├── metrics-aggregator.spec.ts (aggregation logic)
└── analytics.controller.spec.ts (endpoints)
```

### Integration Tests
```
e2e/
├── auth-flow.e2e.spec.ts (OTP → JWT)
├── order-flow.e2e.spec.ts (Menu → Order → Payment)
├── inventory-flow.e2e.spec.ts (Order → Inventory deduction)
├── analytics-flow.e2e.spec.ts (Events → Metrics)
└── payment-flow.e2e.spec.ts (Payment → Order status)
```

### Frontend Tests
```
frontend/__tests__/
├── pages/
│   ├── CustomerMenu.test.tsx
│   ├── KDS.test.tsx
│   └── Analytics.test.tsx
├── components/
│   ├── Cart.test.tsx
│   └── OrderStatus.test.tsx
└── stores/
    ├── authStore.test.ts
    └── cartStore.test.ts
```

---

## DEPLOYMENT READINESS

### Pre-Production Checklist
- [ ] All services building without errors
- [ ] All endpoints responding
- [ ] Database migrations working
- [ ] Kafka topics created and flowing
- [ ] Redis caching operational
- [ ] Socket.io real-time working
- [ ] Authentication guards working
- [ ] RBAC permissions correct
- [ ] Error handling comprehensive
- [ ] Logging configured
- [ ] Monitoring dashboards setup (Prometheus + Grafana)
- [ ] Load testing passed (50-100 concurrent users)
- [ ] Security headers added
- [ ] CORS configured correctly
- [ ] Rate limiting implemented
- [ ] Documentation complete
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Deployment scripts ready
- [ ] Rollback procedures documented
- [ ] Backup strategy documented

### Production Deployment Steps
1. Setup production database
2. Run Prisma migrations
3. Seed production tenant data
4. Deploy services (rolling update)
5. Verify health endpoints
6. Monitor error rates
7. Gradual traffic increase
8. Monitor performance

---

## EXTERNAL API INTEGRATIONS (To Be Done Later)

These require API keys and can be integrated after MVP:

1. **MSG91 SMS** (OTP sending)
   - Currently mocked
   - Easy swap when credentials available

2. **Razorpay Payments**
   - Currently mocked
   - Easy integration with test keys

3. **Email Service** (future)
   - SendGrid or AWS SES

4. **SMS Notifications** (future)
   - Update order status via SMS

---

## SUCCESS METRICS

### Performance
- API response time < 500ms (p95)
- Order creation < 2 seconds
- Inventory update < 1 second
- Real-time updates < 200ms latency

### Reliability
- 99.5% uptime
- Zero payment failures
- Zero data loss (Kafka persistence)
- All orders tracked

### User Experience
- Menu loads in < 2 seconds
- Ordering process < 5 clicks
- KDS updates real-time
- Analytics loads in < 3 seconds

### Code Quality
- > 80% test coverage
- < 5% error rate
- Clean architecture
- Well-documented

---

## ROLLBACK STRATEGY

If something goes wrong:
1. All services have database migrations with rollback support
2. Kafka topics retain message history
3. Redis caching is ephemeral (safe to clear)
4. Docker allows quick service restart
5. Git history for code rollback

---

## NEXT STEPS

1. **Week 1 (Oct 18-25)**: Implement Sprint 1
   - Auth Service OTP
   - Menu Service CRUD
   - Order Service core
   - Test locally

2. **Week 2 (Oct 25-Nov 1)**: Implement Sprint 2
   - Payments (mock)
   - Inventory
   - Real-time Socket.io
   - API Gateway routing

3. **Week 3 (Nov 1-8)**: Implement Sprint 3
   - Analytics
   - Discount Engine
   - Frontend UI
   - Integration testing

4. **Week 4 (Nov 8-15)**: Optimize & Deploy
   - Performance testing
   - Production deployment
   - Documentation
   - Launch!

---

**Total LOC Estimate**: ~15,000 lines  
**Estimated Developer Hours**: 200-250 hours  
**Team Size**: 1-2 developers  
**Quality Target**: Production-ready MVP

Ready to begin Sprint 1! 🚀
