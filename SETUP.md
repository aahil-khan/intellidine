Setup Guide (Windows + Docker Desktop)

Prerequisites

- Windows 10/11 with WSL2 enabled
- Docker Desktop with WSL2 backend
- Node.js 20.x LTS + npm 10
- Python 3.11+ (for ML service)
- Git

Steps

1) Clone and prepare env

git clone <your-repo-url>
cd Intellidine
cp .env.example .env

2) Configure environment variables in .env

- DATABASE_URL, DB_PASSWORD (compose uses ${DB_PASSWORD})
- JWT_SECRET
- MSG91_AUTH_KEY, MSG91_SENDER_ID
- RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
- GRAFANA_PASSWORD

3) Start infrastructure and services

docker compose up -d --build

4) Initialize database schema with Prisma

docker compose exec api-gateway npx prisma migrate deploy

5) Health checks

- Postgres: docker compose logs postgres
- Redis: docker compose logs redis
- Kafka: docker compose logs kafka
- ML: curl http://localhost:8000/health

Windows Notes

- Ensure Docker Desktop uses WSL2 and has enough RAM/CPU (≥ 6GB RAM, 4 CPUs recommended).
- If ports are in use, edit docker-compose.yml mappings as needed.

Next

- See TASKS.md for items that require your input (domains, secrets, providers).

Auth Mode (headers locally, cookies in production)

- Configure AUTH_MODE in ENV.example/.env:
  - AUTH_MODE=header (local dev): clients send Authorization: Bearer <jwt>
  - AUTH_MODE=cookie (prod): backend sets httpOnly, Secure cookie (SameSite=Lax/None)
- Switch strategy:
  - API checks process.env.AUTH_MODE to select guard/middleware
  - In cookie mode, set cookie on login with HttpOnly + Secure + domain=.${API_DOMAIN}
  - In header mode, do not set cookies; return token in JSON
  - Frontend uses VITE_API_URL and conditionally sends credentials only in cookie mode

