IntelliDine - Phase 1 (MVP)

Overview

IntelliDine is a microservices-based restaurant management SaaS for QR ordering, KDS, inventory, payments, and analytics. This repository scaffolds the Phase 1 MVP per the PRD.

What’s Included

- Backend microservice scaffold (NestJS + Prisma)
- ML service scaffold (FastAPI)
- PostgreSQL, Redis, Kafka via Docker Compose
- Prisma schema for all entities
- CI/CD workflow (GitHub Actions)
- Environment variables template
- Setup docs for Windows (Docker Desktop/WSL2)

Quick Start

1) Copy environment file

cp .env.example .env

2) Start the stack (first run builds images)

docker compose up -d --build

3) Run Prisma migrate (inside any Node service container that mounts prisma)

docker compose exec api-gateway npx prisma migrate deploy

4) Verify services

- API Gateway: http://localhost:3000
- Auth Service: http://localhost:3001
- Order Service: http://localhost:3002
- Menu Service: http://localhost:3003
- Payment Service: http://localhost:3005
- ML Service: http://localhost:8000/health
- Postgres: localhost:5432
- Redis: localhost:6379
- Kafka: localhost:9092

Documentation

- Setup and prerequisites: SEE SETUP.md
- Action items for you: SEE TASKS.md
- Full PRD reference: PRD.md

Notes

- This is a scaffold. Individual service implementations will be added iteratively.
- Keep .env values in sync with your deployment environment.

