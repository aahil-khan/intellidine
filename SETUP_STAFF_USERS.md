# Staff Users Setup - What You Need to Do

## Current Status
✅ Staff users seeded file created  
✅ Postman collection updated with credentials  
❌ Database migration needs to run to apply seed

## The Problem
Prisma needs to connect to PostgreSQL database to run migrations. The database runs in Docker.

## Solution: 3 Steps

### Step 1: Start Docker Containers
```bash
cd /c/Users/aahil/OneDrive/Documents/vs/Intellidine

# Start all services (PostgreSQL, Redis, Kafka, etc.)
docker-compose up -d

# Wait 10-15 seconds for PostgreSQL to be ready
# You'll see "intellidine-postgres" container starting...

# Verify PostgreSQL is running:
docker ps | grep postgres
```

**Expected Output**:
```
CONTAINER ID   IMAGE              STATUS
abc123def456   postgres:15-alpine   Up 5 seconds
```

---

### Step 2: Run Prisma Migration
```bash
cd /c/Users/aahil/OneDrive/Documents/vs/Intellidine/backend

# This will:
# 1. Create all database tables
# 2. Run seed.sql
# 3. Insert staff users (manager1, kitchen_staff1, waiter1)
npx prisma migrate dev --name initial
```

**Expected Output**:
```
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "intellidine"

✔ Created migration folder and migration_lock.toml
✔ Created migration: 20251022_initial
✔ Database synced, ready to use

PostgreSQL tables created ✅
Staff users seeded ✅
```

---

### Step 3: Verify Staff Users Created
```bash
# Option A: Using Postman
POST http://localhost:3100/api/auth/staff/login
Body: {
  "username": "manager1",
  "password": "Password@123",
  "tenant_id": "11111111-1111-1111-1111-111111111111"
}

# Option B: Using Docker PostgreSQL CLI
docker exec -it intellidine-postgres psql -U admin -d intellidine -c "SELECT username, role FROM users;"
```

**Expected Output from Option B**:
```
   username   |    role
   -----------+----------------
   manager1   | MANAGER
   kitchen_staff1 | KITCHEN_STAFF
   waiter1    | WAITER
```

---

## Troubleshooting

### Issue 1: "Database connection refused"
**Cause**: PostgreSQL container not started or not ready  
**Fix**:
```bash
# Check if container is running
docker ps | grep postgres

# If not running, start it:
docker-compose up -d postgres

# Wait 15 seconds and try again
```

---

### Issue 2: "Authentication failed for admin"
**Cause**: Database credentials incorrect or container needs rebuild  
**Fix**:
```bash
# Stop and remove all containers
docker-compose down

# Remove PostgreSQL volume (to reset database)
docker volume rm intellidine_postgres_data

# Start fresh
docker-compose up -d

# Wait 15 seconds for PostgreSQL to initialize
```

---

### Issue 3: "Migration already exists"
**Cause**: Migration was run before  
**Fix**: This is normal, just proceed to Step 3 to verify

---

## After Setup Complete

### What Happens Next?
1. ✅ Prisma creates database tables
2. ✅ Seed.sql runs automatically
3. ✅ 3 staff users created with passwords
4. ✅ Frontend team can test staff login

### Frontend Team Can Now:
```bash
# 1. Start all backend services
docker-compose up -d

# 2. Wait for all services to be healthy (2-3 minutes)
docker-compose ps

# 3. Use staff credentials to test API:
curl -X POST http://localhost:3100/api/auth/staff/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "manager1",
    "password": "Password@123",
    "tenant_id": "11111111-1111-1111-1111-111111111111"
  }'

# 4. Get JWT token and use in subsequent requests
```

---

## Staff User Credentials (Pre-seeded)

| Username | Password | Role | Email |
|----------|----------|------|-------|
| manager1 | Password@123 | MANAGER | manager@spiceroute.com |
| kitchen_staff1 | Password@123 | KITCHEN_STAFF | kitchen@spiceroute.com |
| waiter1 | Password@123 | WAITER | waiter@spiceroute.com |

**All users linked to Tenant**: `11111111-1111-1111-1111-111111111111` (Spice Route)

---

## Environment Setup

**Tenant ID** (same for all users):
```
11111111-1111-1111-1111-111111111111
```

**Customer Test Number** (for OTP flow):
```
9876543210
```

**API Base URL**:
- Local: `http://localhost:3100`
- Production: `https://intellidine-api.aahil-khan.tech`

---

## Files Modified/Created

1. **backend/prisma/seed.sql** - Staff user INSERT statements
2. **.env** - Database credentials fixed (no variable substitution)
3. **backend/.env** - Copied from root
4. **Intellidine-API-Collection-PRODUCTION.postman_collection.json** - Updated with real credentials
5. **REMAINING_WORK.md** - Updated status
6. **CODEBASE_ARCHITECTURE.md** - Updated with seeded users info

---

## Quick Reference: All Commands

```bash
# 1. Start services
docker-compose up -d

# 2. Run migration & seed
cd backend && npx prisma migrate dev --name initial

# 3. Verify users
docker exec -it intellidine-postgres psql -U admin -d intellidine -c "SELECT username, role FROM users;"

# 4. Test login (curl)
curl -X POST http://localhost:3100/api/auth/staff/login \
  -H "Content-Type: application/json" \
  -d '{"username":"manager1","password":"Password@123","tenant_id":"11111111-1111-1111-1111-111111111111"}'

# 5. View all running services
docker-compose ps

# 6. View logs
docker-compose logs -f api-gateway

# 7. Stop all services
docker-compose down

# 8. Reset database
docker-compose down -v && docker volume rm intellidine_postgres_data
```

---

**Status**: Ready for frontend team to start building! ✅

**Next**: Frontend team pulls latest code and follows FRONTEND_INTEGRATION_GUIDE.md
