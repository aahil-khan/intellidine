## IntelliDine — Copilot / AI Assistant Instructions

This file is a short, actionable guide for AI coding agents (Copilot-style) to be immediately productive in this repository.

1) Big picture (one-liner)
- IntelliDine is a multi-tenant, event-driven restaurant SaaS composed of ~10 microservices (mostly NestJS + one Python ML service), a shared Postgres DB, Redis, and Kafka. See `DOCUMENTATION/SYSTEM_OVERVIEW.md` and `DOCUMENTATION/others/CODEBASE_ARCHITECTURE.md` for long-form context.

2) Important directories & files (first-place-to-look)
- `backend/` — all services live here (each service has its own `package.json`, `tsconfig.json`, `src/`).
- `backend/prisma/` — Prisma schema, migrations and `seed.sql` (DB model source of truth).
- `DOCUMENTATION/` — system overview, individual service guides, workflows (use these before making cross-service changes).
- `postman collections/` — API examples used for verification.
- `docker-compose.yml` — local/dev stack orchestration (what to run locally).

3) Key patterns and conventions
- Multi-tenancy: every request and DB query is filtered by `tenant_id`. 
  - **For customers**: tenant_id is embedded in the QR code URL at the table; frontend extracts it and includes in requests: `?tenant_id=...` or `{ tenant_id: ... }`.
  - **For staff**: tenant_id is in JWT token (`token.tenant_id`); TenantGuard extracts automatically.
  - Always validate tenant_id consistency: staff cannot request data from wrong tenant.
- Auth: OTP for customers (JWT has no tenant_id) and username/password for staff (JWT includes tenant_id). JWT contains `sub` (user id), `type` ('customer'|'staff'), and optionally `tenant_id` (staff only). Token expiry ~24 hours.
- Event-driven: services publish/consume Kafka topics (e.g., `order.created`, `payment.completed`, `inventory.low_stock`). Prefer publishing events instead of tight RPC for cross-cutting concerns.
- Data model authority: Prisma schema in `backend/prisma/schema.prisma` is authoritative. Use `npx prisma migrate` for DB changes.
- Services are stateless: configuration and secrets via `.env`. Avoid storing state in service instances.
- **JWT_SECRET required**: Every service using `JwtGuard`/`JwtModule` must have `JWT_SECRET` set in environment (or docker-compose.yml). Otherwise token verification fails.

4) Developer workflows (explicit commands)
- Start full local stack: `docker compose up -d --build` from repo root.
- Apply DB migrations (run inside API Gateway container):
  - `docker compose exec api-gateway npx prisma migrate deploy`
- Run unit tests per service: `cd backend/<service> && npm test` (uses Jest).
- Run Postman collection (verify API): `newman run "postman collections/Intellidine-API-Collection.postman_collection.json" -e "postman collections/local.env.postman.json"`.

5) Coding conventions & quick examples
- NestJS + TypeScript: controllers -> services -> repositories pattern. Use Guards for auth and Roles.
- Tenant-check example (follow existing code): always include `where: { tenant_id: req.user.tenant_id }` in DB queries.
- Event publish example: when creating an order, Order Service publishes `order.created` to Kafka; do not call Notification or Inventory directly.

6) Integration & external dependencies to watch
- Razorpay (payments) — verify webhook signature in `payment-service`.
- SMS / notifications (Twilio/SNS) — used by `notification-service` and `auth-service` for OTPs.
- Kafka topics and consumer groups — check `docker-compose.yml` for broker configuration and `DOCUMENTATION/KAFKA_EVENTS.md` for payload shapes.

7) Quick troubleshooting pointers
- If "Invalid or expired token" errors: check that service has `JWT_SECRET` env var set (must match auth-service secret). Rebuild container if env var just added.
- If "Missing tenant_id for user" warnings: 
  - **For customers**: QR code URL should encode tenant_id (e.g., `https://app.com/order/tenant/abc-123`); frontend extracts it and passes `?tenant_id=abc-123` in requests.
  - **For staff**: JWT token should already contain tenant_id; no action needed (or validate if passing custom tenant_id).
  - If neither: customer needs to pass tenant_id explicitly (usually from QR code); staff login should include tenant_id in JWT.
- If notifications are missing: check Kafka consumer offsets and `notification-service` logs.
- If OTPs fail: check Redis connectivity (OTP TTL is short) and SMS provider credentials in `.env`.
- If tenant data seems missing: ensure JWT `tenant_id` is present (for staff) and request `tenant_id` matches token.

8) Where to add tests & small PR guidance
- Add unit tests in the service's `src/` under `__tests__` (Jest). Add integration tests that hit the service HTTP endpoints and assert Kafka events when relevant.
- For DB changes: update `prisma/schema.prisma`, create migration, update `seed.sql` if new seed data required.

9) When modifying multiple services
- Update docs in `DOCUMENTATION/` alongside code. For cross-service behavior changes (events, payloads, auth), add an entry to `DOCUMENTATION/others/CODEBASE_ARCHITECTURE.md` and update the relevant service readmes under `DOCUMENTATION/services/`.

10) Useful references (paths in repo)
- System overview: `DOCUMENTATION/SYSTEM_OVERVIEW.md`
- Codebase architecture: `DOCUMENTATION/others/CODEBASE_ARCHITECTURE.md`
- UML diagrams (PlantUML): `DOCUMENTATION/UML_DIAGRAMS.md`
- Architecture ASCII diagrams: `DOCUMENTATION/ARCHITECTURE_DIAGRAMS_ASCII.md`
- Prisma schema & seed: `backend/prisma/schema.prisma`, `backend/prisma/seed.sql`
- Docker compose (local): `docker-compose.yml`
- Postman collections: `postman collections/`
- Workflows (ORDERING, PAYMENT, INVENTORY, KITCHEN): `DOCUMENTATION/workflows/`

If anything above is unclear or you'd like a different level of detail (e.g., endpoint examples, Kafka payload schemas, or a short checklist for making cross-service changes), tell me which section to expand and I will iterate.
