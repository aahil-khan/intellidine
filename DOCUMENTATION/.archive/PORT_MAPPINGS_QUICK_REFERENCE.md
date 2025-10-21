# IntelliDine Service Port Mappings - Quick Reference

## Current Service Ports

### ✅ Public-Facing Services (Can be exposed)
```
API Gateway          → localhost:3100  (✅ ROUTE TO TUNNEL - Primary)
ML Service           → localhost:8000  (✅ ROUTE TO TUNNEL - If needed)
```

### 🔒 Internal Microservices (Route via API Gateway)
```
Auth Service         → localhost:3101  (Via 3100)
Order Service        → localhost:3102  (Via 3100)
Menu Service         → localhost:3103  (Via 3100)
Inventory Service    → localhost:3104  (Via 3100)
Payment Service      → localhost:3105  (Via 3100)
Notification Service → localhost:3106  (Via 3100)
Analytics Service    → localhost:3107  (Via 3100)
Discount Engine      → localhost:3108  (Via 3100)
```

### 🚫 Internal Infrastructure (NEVER expose)
```
PostgreSQL           → localhost:5443  (❌ DO NOT EXPOSE)
Redis                → localhost:6380  (❌ DO NOT EXPOSE)
Prometheus           → localhost:9090  (❌ DO NOT EXPOSE)
Grafana              → localhost:3009  (❌ DO NOT EXPOSE)
Kafka                → localhost:9092  (❌ DO NOT EXPOSE)
Zookeeper            → localhost:2181  (❌ DO NOT EXPOSE)
Nginx                → localhost:81    (Internal only)
```

---

## Cloudflare Tunnel Configuration

### Recommended Routes
```yaml
api.intellidine.com        → http://localhost:3100
api-staging.intellidine.com → http://localhost:3100
```

### Optional Direct Routes (Advanced)
```yaml
orders.api.intellidine.com   → http://localhost:3102
menu.api.intellidine.com     → http://localhost:3103
payments.api.intellidine.com → http://localhost:3105
ml.api.intellidine.com       → http://localhost:8000
```

---

## Postman Configuration

### Base URLs
- **Local Dev**: `http://localhost:3100`
- **Production**: `https://api.intellidine.com`

### Individual Service URLs (Local)
```json
{
  "base_url": "http://localhost:3100",
  "auth_service_url": "http://localhost:3101",
  "order_service_url": "http://localhost:3102",
  "menu_service_url": "http://localhost:3103",
  "inventory_service_url": "http://localhost:3104",
  "payment_service_url": "http://localhost:3105",
  "notification_service_url": "http://localhost:3106",
  "analytics_service_url": "http://localhost:3107",
  "discount_engine_url": "http://localhost:3108",
  "ml_service_url": "http://localhost:8000"
}
```

---

## Health Check URLs

### Local Testing
```bash
# API Gateway
curl http://localhost:3100/health

# Individual services
curl http://localhost:3101/health  # Auth
curl http://localhost:3102/health  # Orders
curl http://localhost:3103/health  # Menu
curl http://localhost:3104/health  # Inventory
curl http://localhost:3105/health  # Payments
curl http://localhost:3106/health  # Notifications
curl http://localhost:3107/health  # Analytics
curl http://localhost:3108/health  # Discount
curl http://localhost:8000/docs    # ML Service (Swagger)
```

### Production Testing
```bash
curl https://api.intellidine.com/health
```

---

## Security Rules

| Port | Expose? | Reason |
|------|---------|--------|
| 3100 | ✅ Yes | Main API Gateway |
| 8000 | ✅ Maybe | ML service (if needed) |
| 3101-3108 | ❌ No | Microservices (use via gateway) |
| 5443 | ❌ No | Database (CRITICAL - never expose) |
| 6380 | ❌ No | Cache (CRITICAL - never expose) |
| 9090 | ❌ No | Prometheus (internal metrics) |
| 3009 | ❌ No | Grafana (internal dashboards) |
| 9092 | ❌ No | Kafka (event bus - internal only) |

---

## Docker Compose Service Mapping

```
Container Name              Port → Host Port
intellidine-api-gateway     3100 → 3100
intellidine-auth-service    3101 → 3101
intellidine-order-service   3102 → 3102
intellidine-menu-service    3103 → 3103
intellidine-inventory-service 3104 → 3104
intellidine-payment-service 3105 → 3105
intellidine-notification-service 3106 → 3106
intellidine-analytics-service 3107 → 3107
intellidine-discount-engine 3108 → 3108
intellidine-ml-service      8000 → 8000
intellidine-postgres        5432 → 5443 (internal)
intellidine-redis           6379 → 6380 (internal)
intellidine-prometheus      9090 → 9090 (internal)
intellidine-grafana         3000 → 3009 (internal)
intellidine-kafka           9092 → 9092 (internal)
intellidine-zookeeper       2181 → 2181 (internal)
intellidine-nginx           80   → 81   (internal)
```

---

## Files Updated

✅ **Intellidine-Environments.postman_environments.json**
✅ **local.env.postman.json**
✅ **Intellidine-API-Collection.postman_collection.json**
✅ **CLOUDFLARE_TUNNEL_SETUP.md** (New - Complete setup guide)
✅ **PORT_MAPPINGS_QUICK_REFERENCE.md** (This file - Quick lookup)

---

## TL;DR - What to Route to Cloudflare Tunnel

**ROUTE:**
- ✅ `api.intellidine.com` → `localhost:3100` (API Gateway - ALL traffic)

**OPTIONALLY ROUTE:**
- `ml.api.intellidine.com` → `localhost:8000` (ML service)

**NEVER ROUTE:**
- ❌ Database (5443)
- ❌ Redis (6380)  
- ❌ Prometheus (9090)
- ❌ Grafana (3009)
- ❌ Kafka (9092)
- ❌ Individual microservices (3101-3108) - use via gateway instead

---

## Quick Setup Commands

```bash
# 1. Install cloudflared
curl -L --output cloudflared.tgz https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.tgz
tar -xzf cloudflared.tgz && sudo mv cloudflared /usr/local/bin/

# 2. Authenticate
cloudflared tunnel login

# 3. Create tunnel
cloudflared tunnel create intellidine-prod

# 4. Route domain
cloudflared tunnel route dns intellidine-prod api.intellidine.com

# 5. Start tunnel
cloudflared tunnel run intellidine-prod

# 6. Install as service (optional)
sudo cloudflared service install
sudo systemctl start cloudflared
```

