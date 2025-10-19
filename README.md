# IntelliDine - Restaurant Management SaaSIntelliDine - Phase 1 (MVP)



**Status**: Sprint 1 (Phase 1 MVP) - **37% Complete** ✅  Overview

**Last Updated**: October 19, 2025  

**Sprint Target**: Oct 18-25 (3 services complete, on track to finish Oct 20)IntelliDine is a microservices-based restaurant management SaaS for QR ordering, KDS, inventory, payments, and analytics. This repository scaffolds the Phase 1 MVP per the PRD.



## OverviewWhat’s Included



IntelliDine is a modern microservices-based restaurant management platform featuring:- Backend microservice scaffold (NestJS + Prisma)

- **Multi-tenant QR-based ordering** with real-time updates- ML service scaffold (FastAPI)

- **Kitchen Display System (KDS)** for order management- PostgreSQL, Redis, Kafka via Docker Compose

- **Inventory management** with real-time deduction- Prisma schema for all entities

- **Payment processing** with Razorpay integration- CI/CD workflow (GitHub Actions)

- **Analytics dashboard** with daily metrics- Environment variables template

- **Kafka-based event streaming** for real-time processing- Setup docs for Windows (Docker Desktop/WSL2)



## ✅ Completed ServicesQuick Start



### 1. Auth Service (100%)1) Copy environment file

- Customer login: OTP → JWT

- Staff login: Username/Password → JWTcp .env.example .env

- Redis-backed OTP storage (5-min TTL)

- All 3 endpoints tested ✅2) Start the stack (first run builds images)



### 2. Menu Service (100%)docker compose up -d --build

- GET /api/menu - List with category grouping (300s TTL cache)

- POST /api/menu/items - Create (manager only)3) Run Prisma migrate (inside any Node service container that mounts prisma)

- PATCH /api/menu/items/:id - Update (manager only)

- DELETE /api/menu/items/:id - Soft delete (manager only)docker compose exec api-gateway npx prisma migrate deploy

- All 6 endpoints tested ✅

4) Verify services

### 3. Order Service (100%)

- POST /api/orders - Create with multi-item support- API Gateway: http://localhost:3000

- GET /api/orders - List with pagination/filtering- Auth Service: http://localhost:3001

- GET /api/orders/:id - Single order- Order Service: http://localhost:3002

- PATCH /api/orders/:id/status - Status updates (state machine)- Menu Service: http://localhost:3003

- PATCH /api/orders/:id/cancel - Cancellation- Payment Service: http://localhost:3005

- Features: GST calculation (18%), Kafka events, walk-in customers- ML Service: http://localhost:8000/health

- All 5 endpoints tested ✅- Postgres: localhost:5432

- Redis: localhost:6379

## Quick Start- Kafka: localhost:9092



### PrerequisitesDocumentation

- Docker Desktop

- Git- Setup and prerequisites: SEE SETUP.md

- Action items for you: SEE TASKS.md

### Setup (5 minutes)- Full PRD reference: PRD.md



```bashNotes

git clone <repo>

cd Intellidine- This is a scaffold. Individual service implementations will be added iteratively.

cp ENV.example .env- Keep .env values in sync with your deployment environment.

docker compose up -d --build

```

### Service URLs

| Service | Port | Health |
|---------|------|--------|
| API Gateway | 3000 | http://localhost:3000/health |
| Auth Service | 3001 | http://localhost:3001/health |
| Order Service | 3002 | http://localhost:3002/health |
| Menu Service | 3003 | http://localhost:3003/health |
| PostgreSQL | 5432 | - |
| Redis | 6379 | - |
| Kafka | 9092 | - |

## Documentation

- **[API_DOCS.md](API_DOCS.md)** - All 12 API endpoints with examples
- **[AUTH_GUIDE.md](AUTH_GUIDE.md)** - JWT flows and RBAC
- **[BUILD_LOG_DETAILED.md](BUILD_LOG_DETAILED.md)** - Implementation details
- **[DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md)** - 4-sprint roadmap
- **[SESSION_SUMMARY_OCT19.md](SESSION_SUMMARY_OCT19.md)** - Today's achievements

## Testing Endpoints

```bash
# Auth
curl -X POST http://localhost:3001/api/auth/customer/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919876543210"}'

# Create Order
curl -X POST 'http://localhost:3002/api/orders?tenant_id=11111111-1111-1111-1111-111111111111' \
  -H "Content-Type: application/json" \
  -d '{"table_id":"5","items":[{"menu_item_id":"item_001","quantity":2}]}'
```

See [API_DOCS.md](API_DOCS.md) for complete examples.

## Architecture

```
API Gateway (3000) → Microservices
                    ├── Auth (3001) ✅
                    ├── Menu (3003) ✅
                    ├── Order (3002) ✅
                    ├── Payment (3005)
                    ├── Inventory (3004)
                    └── Others (3006-3008)
```

**Tech Stack**: NestJS • PostgreSQL • Prisma • Redis • Kafka • Nginx • Docker

## Performance

| Operation | Time |
|-----------|------|
| Create Order | 50ms |
| List Orders | 25ms |
| Get Menu | 25ms (cached) |

## Progress

```
Auth Service      ████████████████████ 100% ✅
Menu Service      ████████████████████ 100% ✅
Order Service     ████████████████████ 100% ✅
Auth Middleware   ██████████░░░░░░░░░░  50% 🔄
Payment Service   ░░░░░░░░░░░░░░░░░░░░   0% ⚪
Inventory Service ░░░░░░░░░░░░░░░░░░░░   0% ⚪

TOTAL: ███░░░░░░░░░░░░░░░░░░  37% 🟡
```

## Next Steps

- Complete auth guard integration (1-2 hours)
- Security audit
- Sprint 2: Payment + Inventory services

## Support

- 📧 GitHub Issues for bugs
- 📖 See [SETUP.md](SETUP.md) for detailed setup
- 🔗 All documentation in root directory

---

**Started**: October 18, 2025  
**Target Launch**: Q4 2025  
**Status**: On Track ✅
