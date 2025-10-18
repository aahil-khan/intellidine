IntelliDine Build Log

Context

- PRD: `PRD.md` (Phase 1 MVP: QR ordering, KDS, inventory, payments, analytics, ML shadow mode)
- Tech: NestJS + Prisma + Postgres + Redis + Kafka; React frontend; FastAPI ML; Docker; Nginx; CI/CD.

Decisions Confirmed with Stakeholder

- Domains: API `intellidine-api.aahil-khan.tech`, App `intellidine.aahil-khan.tech` (placeholders for now)
- Auth mode: headers for local dev; switchable to httpOnly cookies in prod via `AUTH_MODE`
- Timezone: `Asia/Kolkata`
- Seed: small Indian restaurant ("Spice Route")

Environment & Config

- `ENV.example`: includes DB/Redis/Kafka/JWT/MSG91/Razorpay, domains, timezone, and `AUTH_MODE`
- `SETUP.md`: documents Windows+Docker setup and auth switching (header ↔ cookie)
- `docker-compose.yml`: Postgres, Redis, Kafka, API gateway, Auth, ML, Prometheus, Grafana, Nginx
- `monitoring/prometheus/prometheus.yml`: baseline
- CI/CD: `.github/workflows/deploy.yml` with SSH deploy placeholder

Database (Prisma)

- `backend/prisma/schema.prisma`: full schema per PRD (tenants, users, menu, orders, payments, inventory, discount, analytics)
- `backend/prisma/seed.sql`: Spice Route tenant, tables, categories, menu items, inventory

Services Implemented (Skeletons)

- API Gateway (NestJS): `backend/api-gateway` with health endpoint; Dockerfile
- Auth Service (NestJS): `backend/auth-service` with health endpoint; Dockerfile
- ML Service (FastAPI): `backend/ml-service` with `main.py`, `generate_synthetic_data.py`, `train_model.py`, Dockerfile
- Nginx reverse proxy: `infrastructure/nginx` with domain placeholders

How to Run (Local)

1) copy envs and start
   - copy `ENV.example` to `.env`
   - `docker compose up -d --build`
2) prisma migrate
   - `docker compose exec api-gateway npx prisma migrate deploy`
3) health checks
   - API: `curl http://localhost/health` and `:3000/health`
   - Auth: `curl http://localhost:3001/health`
   - ML: `curl http://localhost:8000/health`

Auth Switching Strategy

- `AUTH_MODE=header`: return JWT in JSON; clients send `Authorization: Bearer <jwt>`
- `AUTH_MODE=cookie`: set HttpOnly+Secure cookie; validate via cookie middleware; FE uses `credentials: 'include'`

Next Up (Per PRD)

1) Core services scaffolding (NestJS):
   - Order, Menu, Inventory, Payment (with Kafka client wiring where relevant)
2) Remaining services scaffolding:
   - Notification (Socket.io), Analytics, Discount Engine
3) API Gateway routing contracts and DTO validation stubs aligned to PRD’s API specs
4) Prisma client wiring in services; minimal endpoints (health + stub routes)
5) Nginx TLS (Let’s Encrypt) and prod `AUTH_MODE=cookie` CORS/cookie settings
6) Frontend scaffold (Vite+React) and basic Menu page wiring

Notes

- Keep PRD alignment for endpoints (`/api/auth/customer/*`, `/api/menu`, `/api/orders`, `/api/payments/*`)
- Add Kafka topics: `order.created`, etc., when implementing order flow
- Add Redis caching for menu and analytics as per PRD

