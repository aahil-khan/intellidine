# 🚨 ORDER SERVICE BUILD ERROR - QUICK REFERENCE

## The Problem
Order Service can't find shared auth imports during Docker build on your server.

---

## 🔥 TRY THIS FIRST (Most likely to work)

```bash
cd /opt/intellidine
export DOCKER_BUILDKIT=1
docker-compose build --no-cache order-service
docker-compose up -d
docker-compose ps
curl http://localhost:3002/health
```

**If that works**: Done! ✅

**If not**: Continue below...

---

## Plan B: Full Reset

```bash
docker-compose down
docker system prune -a --force
docker-compose up -d --build
# Wait 5 minutes
docker-compose ps
```

---

## Plan C: Check the Error

```bash
# See what's failing
docker-compose logs order-service | tail -50

# Or rebuild and watch live
docker-compose up order-service --build 2>&1 | grep -i error
```

---

## Plan D: Manual Fix (if error shows path issues)

Edit: `/opt/intellidine/backend/order-service/tsconfig.json`

Change paths from:
```json
"@shared/auth": ["../shared/auth"]
```

To:
```json
"@shared/auth": ["../shared/auth", "../shared/auth/index.ts"]
```

Then rebuild:
```bash
docker-compose down
docker-compose up -d --build
```

---

## How to Know It Worked

```bash
docker-compose ps | grep order-service
# Should show: Up X minutes (healthy) ✅

curl http://localhost:3002/health
# Should return: {"status":"ok"} ✅
```

---

## Report Back With

1. Which plan you tried (A, B, C, or D)
2. Any error output from logs
3. Result of `docker-compose ps`
4. Result of `curl http://localhost:3002/health`

---

See **ORDER_SERVICE_BUILD_FIX.md** for detailed troubleshooting.
