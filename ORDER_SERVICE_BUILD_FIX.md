# 🔧 Order Service Build Fix - Shared Auth Issue

**Problem**: Order Service can't find `@shared/auth` during Docker build  
**Cause**: TypeScript path mapping resolution during build  
**Solution**: Below are 3 quick fixes to try on your server

---

## ⚡ QUICK FIX #1: Rebuild with BuildKit (Fastest)

```bash
cd /opt/intellidine  # or wherever you cloned it

# Enable BuildKit for better caching
export DOCKER_BUILDKIT=1

# Rebuild just the order service
docker-compose build --no-cache order-service

# Then start it
docker-compose up -d
```

**Why this works**: BuildKit handles multi-stage builds better and uses better caching strategies.

---

## ⚡ QUICK FIX #2: Clear Docker Cache and Rebuild All

```bash
cd /opt/intellidine

# Stop all containers
docker-compose down

# Remove all unused images
docker system prune -a --force

# Rebuild everything
docker-compose up -d --build

# Wait 3-5 minutes for all services to start
```

**Why this works**: Sometimes Docker cache gets corrupted. A clean rebuild forces fresh compilation.

---

## ⚡ QUICK FIX #3: Fix tsconfig.json Path (If other fixes fail)

The issue might be that the path resolution is too strict. Let's relax it:

```bash
# On your server, edit order-service tsconfig
nano /opt/intellidine/backend/order-service/tsconfig.json
```

**Find this section:**
```json
"paths": {
  "@shared/auth": ["../shared/auth"]
},
```

**Replace with:**
```json
"paths": {
  "@shared/auth": ["../shared/auth", "../shared/auth/index.ts"]
},
```

**Then rebuild:**
```bash
docker-compose down
docker-compose up -d --build
```

---

## 📋 CHECK WHAT'S HAPPENING

**To see the actual build error:**

```bash
# View all service logs
docker-compose logs order-service

# Or watch logs in real-time while building
docker-compose up order-service --build 2>&1 | tee build.log
```

**Look for errors like:**
- `Cannot find module '@shared/auth'`
- `ENOENT: no such file or directory`
- `Compilation error in tsconfig`

---

## 🔍 VERIFY THE FIX

After any fix, run these checks:

```bash
# 1. Check all services running
docker-compose ps

# 2. Check order service specifically
docker inspect intellidine-order-service | grep Status

# 3. Check order service logs
docker-compose logs order-service | tail -20

# 4. Test health endpoint (should return 200)
curl http://localhost:3002/health

# 5. Test creating an order (full test)
curl -X POST 'http://localhost:3002/api/orders' \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"table_id":"1","items":[{"menu_item_id":"item_001","quantity":1}]}'
```

---

## ✅ EXPECTED SUCCESS STATE

When it works:

```bash
$ docker-compose ps
NAME                      COMMAND                 STATUS
intellidine-order-service   "docker-entrypoint..." Up 2 minutes (healthy) ✅
```

And this should return 200:
```bash
$ curl http://localhost:3002/health
{"status":"ok"}
```

---

## 🚨 IF NOTHING WORKS

Try the **nuclear option** - rebuild from scratch:

```bash
cd /opt/intellidine

# Stop everything
docker-compose down -v

# Clean up completely
docker system prune -a --force --volumes

# Remove .cache
rm -rf backend/order-service/dist backend/order-service/.eslintrc.js

# Git reset to ensure clean state (CAREFUL - loses local changes)
git reset --hard HEAD

# Fresh rebuild
docker-compose up -d --build

# Wait 5 minutes, then check
docker-compose ps
```

---

## 📞 NEED LOGS?

Send me the output of:

```bash
# Get full build logs
docker-compose build --no-cache order-service 2>&1 > order-service-build.log
cat order-service-build.log

# Get runtime logs
docker-compose logs order-service > order-service-runtime.log
cat order-service-runtime.log

# Get all services status
docker-compose ps

# Get docker events (run while rebuilding)
docker events --filter service=intellidine-order-service
```

---

## 🎯 Try This RIGHT NOW

```bash
# Step 1: Go to your intellidine directory
cd /opt/intellidine

# Step 2: Enable BuildKit and rebuild
export DOCKER_BUILDKIT=1
docker-compose build --no-cache order-service

# Step 3: Watch the output for errors
# If it says "Successfully tagged" - you're good!

# Step 4: Start it
docker-compose up -d order-service

# Step 5: Check if it's running
docker-compose ps order-service

# Step 6: Test it
curl http://localhost:3002/health
```

---

**Report back with:**
1. What fix you tried (1, 2, or 3)
2. Any error messages from the build
3. Output of `docker-compose ps`
4. Output of `curl http://localhost:3002/health`

I'll help you from there!
