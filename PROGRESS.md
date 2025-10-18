IntelliDine Progress Checklist (Phase 1)

Setup & Infra

- [x] Repo scaffold and docs (README, SETUP, TASKS)
- [x] Env templates with domains/timezone/auth toggle
- [x] Docker Compose: Postgres, Redis, Kafka, Prometheus, Grafana
- [x] Nginx reverse proxy with domain placeholders
- [x] CI/CD workflow placeholder

Database

- [x] Prisma schema per PRD
- [x] Seed data: Spice Route tenant and menu
- [ ] Prisma migrate automation in a Node script

Services (NestJS)

- [x] API Gateway skeleton
- [x] Auth Service skeleton
- [ ] Order Service skeleton
- [ ] Menu Service skeleton
- [ ] Inventory Service skeleton
- [ ] Payment Service skeleton
- [ ] Notification Service skeleton (Socket.io)
- [ ] Analytics Service skeleton
- [ ] Discount Engine skeleton

ML Service (FastAPI)

- [x] Service skeleton with health
- [x] Synthetic data generator
- [x] Training script and saved model path

Security & Auth

- [x] Documented header vs cookie auth switching
- [ ] Implement guards/middleware for both modes

Next Actions

- Scaffold remaining NestJS services and add to Compose
- Implement basic DTOs and routes per PRD
- Wire Prisma client in services
- Add Nginx TLS (Let’s Encrypt) and cookie-mode configs

