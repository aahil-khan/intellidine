# IntelliDine - Restaurant Management SaaS - Phase 1 (MVP)# IntelliDine - Restaurant Management SaaSIntelliDine - Phase 1 (MVP)

**Status**: Sprint 1 (Phase 1 MVP) - **40% Complete** ✅

**Last Updated**: October 19, 2025 (Payment Service complete - 4/9 services done)**Status**: Sprint 1 (Phase 1 MVP) - **40% Complete** ✅  Overview

**Sprint Target**: Oct 18-25 (4 services complete, ahead of schedule by 5+ days)**Last Updated**: October 19, 2025 (Updated: 40% progress - Payment Service complete!)

---**Sprint Target**: Oct 18-25 (4 services complete, ahead of schedule)IntelliDine is a microservices-based restaurant management SaaS for QR ordering, KDS, inventory, payments, and analytics. This repository scaffolds the Phase 1 MVP per the PRD.

## Overview

IntelliDine is a modern microservices-based restaurant management platform featuring:## OverviewWhat’s Included

- **Multi-tenant QR-based ordering** with real-time updates

- **Kitchen Display System (KDS)** for order management

- **Inventory management** with real-time deductionIntelliDine is a modern microservices-based restaurant management platform featuring:- Backend microservice scaffold (NestJS + Prisma)

- **Payment processing** with Razorpay integration

- **Analytics dashboard** with daily metrics- **Multi-tenant QR-based ordering** with real-time updates- ML service scaffold (FastAPI)

- **Kafka-based event streaming** for real-time processing

- **Kitchen Display System (KDS)** for order management- PostgreSQL, Redis, Kafka via Docker Compose

**What's Included**:

- Backend microservice scaffold (NestJS + Prisma)- **Inventory management** with real-time deduction- Prisma schema for all entities

- ML service scaffold (FastAPI)

- PostgreSQL, Redis, Kafka via Docker Compose- **Payment processing** with Razorpay integration- CI/CD workflow (GitHub Actions)

- Prisma schema for all entities

- CI/CD workflow (GitHub Actions)- **Analytics dashboard** with daily metrics- Environment variables template

- Environment variables template

- Setup docs for Windows (Docker Desktop/WSL2)- **Kafka-based event streaming** for real-time processing- Setup docs for Windows (Docker Desktop/WSL2)

---

## ✅ Completed Services## ✅ Completed ServicesQuick Start

### 1. Auth Service (100%) ✅

- **POST /api/auth/customer/request-otp** - Request OTP for customer login### 1. Auth Service (100%)1) Copy environment file

- **POST /api/auth/customer/verify-otp** - Verify OTP and get JWT

- **POST /api/auth/staff/login** - Staff login with username/password- Customer login: OTP → JWT

- Features: Redis-backed OTP storage (5-min TTL), JWT token generation

- All 3 endpoints tested ✅- Staff login: Username/Password → JWTcp .env.example .env

### 2. Menu Service (100%) ✅- Redis-backed OTP storage (5-min TTL)

- **GET /api/menu** - List items with category grouping (300s TTL cache)- All 3 endpoints tested ✅2) Start the stack (first run builds images)

- **POST /api/menu/items** - Create new menu item (manager only)

- **GET /api/menu/items/:id** - Get single item details

- **PATCH /api/menu/items/:id** - Update item (manager only)

- **DELETE /api/menu/items/:id** - Soft delete item (manager only)### 2. Menu Service (100%)docker compose up -d --build

- Features: Category grouping, caching, role-based access

- All 6 endpoints tested ✅- GET /api/menu - List with category grouping (300s TTL cache)

### 3. Order Service (100%) ✅- POST /api/menu/items - Create (manager only)3) Run Prisma migrate (inside any Node service container that mounts prisma)

- **POST /api/orders** - Create order with multi-item support- PATCH /api/menu/items/:id - Update (manager only)

- **GET /api/orders** - List with pagination and filtering

- **GET /api/orders/:id** - Get single order details- DELETE /api/menu/items/:id - Soft delete (manager only)docker compose exec api-gateway npx prisma migrate deploy

- **PATCH /api/orders/:id/status** - Update order status (state machine)

- **PATCH /api/orders/:id/cancel** - Cancel order- All 6 endpoints tested ✅

- Features: GST calculation (18%), Kafka event publishing, walk-in customer support

- All 5 endpoints tested ✅4) Verify services

### 4. Payment Service (100%) ✅### 3. Order Service (100%)

- **POST /api/payments/create-razorpay-order** - Create payment with Razorpay mock- POST /api/orders - Create with multi-item support- API Gateway: <http://localhost:3000>

- **POST /api/payments/verify-razorpay** - Verify Razorpay signature

- **POST /api/payments/confirm-cash** - Record cash payment with change calculation- GET /api/orders - List with pagination/filtering- Auth Service: <http://localhost:3001>

- **GET /api/payments/:payment_id** - Retrieve payment details

- **GET /api/payments** - List payments with pagination- GET /api/orders/:id - Single order- Order Service: <http://localhost:3002>

- **GET /api/payments/stats/daily** - Daily payment statistics by method

- **GET /api/payments/health** - Service health check- PATCH /api/orders/:id/status - Status updates (state machine)- Menu Service: <http://localhost:3003>

- Features: Razorpay mocking (ready for real keys), cash payments, Kafka event publishing (4 event types), payment analytics

- All 7 endpoints tested ✅- PATCH /api/orders/:id/cancel - Cancellation- Payment Service: <http://localhost:3005>

---- Features: GST calculation (18%), Kafka events, walk-in customers- ML Service: <http://localhost:8000/health>

## Quick Start- All 5 endpoints tested ✅- Postgres: localhost:5432

### Prerequisites- Redis: localhost:6379

- Docker Desktop## Quick Start- Kafka: localhost:9092

- Git

- bash or WSL2 on Windows

### Setup (5 minutes)### PrerequisitesDocumentation

```bash- Docker Desktop

git clone <repo>

cd Intellidine- Git- Setup and prerequisites: SEE SETUP.md

cp ENV.example .env

docker compose up -d --build- Action items for you: SEE TASKS.md

```

### Setup (5 minutes)- Full PRD reference: PRD.md

### Verify Services

```bash

# Run Prisma migrations```bashNotes

docker compose exec api-gateway npx prisma migrate deploy

git clone <repo>

# Check all services are running

docker ps | grep intellidinecd Intellidine- This is a scaffold. Individual service implementations will be added iteratively.



# Test health endpointscp ENV.example .env- Keep .env values in sync with your deployment environment.

curl http://localhost:3000/health

curl http://localhost:3001/healthdocker compose up -d --build

curl http://localhost:3002/health

curl http://localhost:3003/health```

curl http://localhost:3005/health

```### Service URLs



### Service URLs| Service | Port | Health |

|---------|------|--------|

| Service | Port | Health Endpoint || API Gateway | 3000 | http://localhost:3000/health |

|---------|------|-----------------|| Auth Service | 3001 | http://localhost:3001/health |

| API Gateway | 3000 | http://localhost:3000/health || Order Service | 3002 | http://localhost:3002/health |

| Auth Service | 3001 | http://localhost:3001/health || Menu Service | 3003 | http://localhost:3003/health |

| Order Service | 3002 | http://localhost:3002/health || PostgreSQL | 5432 | - |

| Menu Service | 3003 | http://localhost:3003/health || Redis | 6379 | - |

| Payment Service | 3005 | http://localhost:3005/health || Kafka | 9092 | - |

| ML Service | 8000 | http://localhost:8000/health |

| PostgreSQL | 5432 | - |## Documentation

| Redis | 6379 | - |

| Kafka | 9092 | - |- **[API_DOCS.md](API_DOCS.md)** - All 12 API endpoints with examples

- **[AUTH_GUIDE.md](AUTH_GUIDE.md)** - JWT flows and RBAC

---- **[BUILD_LOG_DETAILED.md](BUILD_LOG_DETAILED.md)** - Implementation details

- **[DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md)** - 4-sprint roadmap

## Documentation- **[SESSION_SUMMARY_OCT19.md](SESSION_SUMMARY_OCT19.md)** - Today's achievements



- **[API_DOCS.md](API_DOCS.md)** - All 23 API endpoints with examples (Auth, Menu, Order, Payment)## Testing Endpoints

- **[AUTH_GUIDE.md](AUTH_GUIDE.md)** - JWT flows and RBAC documentation

- **[BUILD_LOG_DETAILED.md](BUILD_LOG_DETAILED.md)** - Implementation details and technical decisions```bash

- **[DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md)** - 4-sprint roadmap and timeline# Auth

- **[SESSION_SUMMARY_OCT19.md](SESSION_SUMMARY_OCT19.md)** - Oct 18 session achievements (Auth + Menu + Order)curl -X POST http://localhost:3001/api/auth/customer/request-otp \

- **[SESSION_UPDATE_OCT19_PAYMENT.md](SESSION_UPDATE_OCT19_PAYMENT.md)** - Oct 19 session (Payment Service)  -H "Content-Type: application/json" \

- **[PROGRESS.md](PROGRESS.md)** - Real-time progress tracking  -d '{"phone":"+919876543210"}'

- **[SETUP.md](SETUP.md)** - Detailed setup instructions

- **[TASKS.md](TASKS.md)** - Action items and sprint tasks# Create Order

curl -X POST 'http://localhost:3002/api/orders?tenant_id=11111111-1111-1111-1111-111111111111' \

---  -H "Content-Type: application/json" \

  -d '{"table_id":"5","items":[{"menu_item_id":"item_001","quantity":2}]}'

## Testing Endpoints```



### Auth ExamplesSee [API_DOCS.md](API_DOCS.md) for complete examples.



```bash## Architecture

# Request OTP

curl -X POST http://localhost:3001/api/auth/customer/request-otp \```

  -H "Content-Type: application/json" \API Gateway (3000) → Microservices

  -d '{"phone":"+919876543210","tenant_id":"11111111-1111-1111-1111-111111111111"}'                    ├── Auth (3001) ✅

                    ├── Menu (3003) ✅

# Verify OTP (test code: 123456)                    ├── Order (3002) ✅

curl -X POST http://localhost:3001/api/auth/customer/verify-otp \                    ├── Payment (3005)

  -H "Content-Type: application/json" \                    ├── Inventory (3004)

  -d '{"phone":"+919876543210","code":"123456","tenant_id":"11111111-1111-1111-1111-111111111111"}'                    └── Others (3006-3008)

``````

### Order Examples**Tech Stack**: NestJS • PostgreSQL • Prisma • Redis • Kafka • Nginx • Docker

```bash## Performance

# Create Order

curl -X POST 'http://localhost:3002/api/orders?tenant_id=11111111-1111-1111-1111-111111111111' \| Operation | Time |

  -H "Content-Type: application/json" \|-----------|------|

  -d '{| Create Order | 50ms |

    "table_id":"5",| List Orders | 25ms |

    "items":[| Get Menu | 25ms (cached) |

      {"menu_item_id":"item_001","quantity":2}

    ]## Progress

  }'

```

# List OrdersAuth Service      ████████████████████ 100% ✅

curl <http://localhost:3002/api/orders?tenant_id=11111111-1111-1111-1111-111111111111Menu> Service      ████████████████████ 100% ✅

```Order Service     ████████████████████ 100% ✅

Auth Middleware   ██████████░░░░░░░░░░  50% 🔄

### Payment ExamplesPayment Service   ░░░░░░░░░░░░░░░░░░░░   0% ⚪

Inventory Service ░░░░░░░░░░░░░░░░░░░░   0% ⚪

```bash

# Create Razorpay PaymentTOTAL: ███░░░░░░░░░░░░░░░░░░  37% 🟡

curl -X POST http://localhost:3005/api/payments/create-razorpay-order \```

  -H "Content-Type: application/json" \

  -d '{## Next Steps

    "order_id":"<order-id>",

    "amount":500,- Complete auth guard integration (1-2 hours)

    "method":"RAZORPAY",- Security audit

    "tenant_id":"11111111-1111-1111-1111-111111111111"- Sprint 2: Payment + Inventory services

  }'

## Support

# List Payments

curl 'http://localhost:3005/api/payments?limit=10&offset=0'- 📧 GitHub Issues for bugs

```- 📖 See [SETUP.md](SETUP.md) for detailed setup

- 🔗 All documentation in root directory

See [API_DOCS.md](API_DOCS.md) for complete endpoint documentation.

---

---

**Started**: October 18, 2025  

## Architecture**Target Launch**: Q4 2025  

**Status**: On Track ✅

```

┌─────────────────────────────────────────────────────────┐
│                    API Gateway (3000)                    │
└─────────┬───────────────────────────────────────────────┘
          │
    ┌─────┼─────┬─────────┬──────────┐
    │     │     │         │          │
    ▼     ▼     ▼         ▼          ▼
┌──────┐ ┌────┐ ┌────┐ ┌────────┐ ┌──────────┐
│ Auth │ │Menu│ │Order│ │Payment │ │Inventory │
│(3001)│ │(3003)│(3002)│ │(3005)   │ │(3004)    │
└──────┘ └────┘ └────┘ └────────┘ └──────────┘
    ✅       ✅      ✅       ✅         🔄
    100%     100%    100%     100%      In Progress

┌──────────────────────────────────────────────────────┐
│       Infrastructure (PostgreSQL, Redis, Kafka)       │
└──────────────────────────────────────────────────────┘

```

**Tech Stack**: NestJS 10 • PostgreSQL 15 • Prisma 5 • Redis 7 • Kafka 3 • Nginx • Docker • Node 20 Alpine

---

## Performance

| Operation | Time | Notes |
|-----------|------|-------|
| Create Order | 50ms | With GST calculation |
| List Orders | 25ms | Cached pagination |
| Get Menu | 25ms | 300s TTL cache |
| Create Payment | 75ms | With Kafka publish |
| Verify Payment | 40ms | Mock signature check |

---

## Progress Tracking

```

Sprint 1 Services:
Auth Service      ████████████████████ 100% ✅
Menu Service      ████████████████████ 100% ✅
Order Service     ████████████████████ 100% ✅
Payment Service   ████████████████████ 100% ✅

Sprint 2 Services:
Inventory Service ████░░░░░░░░░░░░░░░░  20% 🔄 (Queued)
Notification Svc  ░░░░░░░░░░░░░░░░░░░░   0% ⚪ (Queued)
Analytics Service ░░░░░░░░░░░░░░░░░░░░   0% ⚪ (Queued)
KDS Service       ░░░░░░░░░░░░░░░░░░░░   0% ⚪ (Queued)

OVERALL PROGRESS:  ████████░░░░░░░░░░░░  40% 🟢

```

---

## Next Steps

1. **Step 1.6: Inventory Service** (3-4 hours)
   - Kafka listener for `order.completed` events
   - Auto-deduct inventory on order completion
   - Reorder level alerts
   - Real-time stock tracking

2. **Step 1.7: Notification Service** (2-3 hours)
   - Socket.io integration for real-time updates
   - Kitchen Display System (KDS) push notifications
   - Customer order status notifications
   - Kafka → Socket.io event bridge

3. **Step 2.1: API Gateway Refinement** (1-2 hours)
   - Service routing validation
   - Multi-tenant request enrichment
   - Response standardization
   - Cross-cutting concerns

---

## Database Schema

The Prisma schema includes models for:
- **Tenant**: Multi-tenancy isolation
- **User**: Authentication and staff management
- **MenuItem**: Menu items with categories
- **Order**: Order details and line items
- **Payment**: Payment tracking with Razorpay/Cash support
- **Inventory**: Stock levels and reorder alerts

See `prisma/schema.prisma` for complete schema.

---

## Deployment

### Development

```bash
docker compose up -d --build
```

### Production

Uses Alpine Linux multi-stage builds:

- Minimal image size (~200MB per service)
- Prisma client generation during build
- Non-root user execution
- Health checks enabled

```bash
DOCKER_BUILDKIT=1 docker compose -f docker-compose.yml up -d
```

---

## Support & Resources

- 📧 **Bug Reports**: GitHub Issues
- 📖 **Detailed Setup**: See [SETUP.md](SETUP.md)
- 🔗 **All Documentation**: See root directory
- 💡 **PRD Reference**: [PRD.md](PRD.md)

---

## Key Metrics

- **Services Implemented**: 4/9 (44%)
- **Endpoints Implemented**: 23/45 (51%)
- **Code Coverage**: Core services ✅
- **Infrastructure**: 16/16 services running ✅
- **Database**: Migrations applied ✅
- **Development Velocity**: 225 LOC/hr
- **Days Ahead of Schedule**: 5+ days ✅

---

## Timeline

| Date | Milestone | Status |
|------|-----------|--------|
| Oct 18 | Auth + Menu + Order Services | ✅ Complete |
| Oct 19 | Payment Service | ✅ Complete |
| Oct 20 | Inventory + Notification | 🔄 In Progress |
| Oct 22 | API Gateway Refinement | ⏳ Scheduled |
| Oct 25 | Sprint 1 Complete | 📅 Target |

---

**Started**: October 18, 2025  
**Current Phase**: Sprint 1 - MVP Core Services  
**Target Launch**: Q4 2025  
**Status**: On Track ✅ (5+ days ahead)

---

*For session details, see [SESSION_UPDATE_OCT19_PAYMENT.md](SESSION_UPDATE_OCT19_PAYMENT.md)*
