# Cloudflare Tunnel Setup Guide for IntelliDine

## Overview
This guide covers routing IntelliDine services through a Cloudflare Tunnel for secure external API access.

---

## Service Port Mappings

| Service | Port | Description | Route |
|---------|------|-------------|-------|
| **API Gateway** | 3100 | Main entry point (recommended) | ✅ Route |
| Auth Service | 3101 | Authentication/JWT | Via Gateway |
| Order Service | 3102 | Order management | Via Gateway |
| Menu Service | 3103 | Menu/Items | Via Gateway |
| Inventory Service | 3104 | Stock management | Via Gateway |
| Payment Service | 3105 | Payment processing | Via Gateway |
| Notification Service | 3106 | Webhooks/Notifications | Via Gateway |
| Analytics Service | 3107 | Analytics & Reports | Via Gateway |
| Discount Engine | 3108 | Discount calculations | Via Gateway |
| ML Service | 8000 | ML/Recommendation engine | ✅ Route (if needed) |
| PostgreSQL | 5443 | Database (⚠️ DO NOT expose) | ❌ Do NOT Route |
| Redis | 6380 | Cache (⚠️ DO NOT expose) | ❌ Do NOT Route |
| Prometheus | 9090 | Metrics (internal only) | ❌ Do NOT Route |
| Grafana | 3009 | Dashboards (internal only) | ❌ Do NOT Route |

---

## Recommended Cloudflare Tunnel Configuration

### Option 1: Single API Gateway Route (RECOMMENDED)
This is the simplest and most secure approach. All API traffic flows through the API Gateway (port 3100).

**cloudflared config.yml:**
```yaml
tunnel: intellidine-prod
credentials-file: /root/.cloudflared/credentials.json

ingress:
  # Public API routes
  - hostname: api.intellidine.com
    service: http://localhost:3100
    
  - hostname: api-staging.intellidine.com
    service: http://localhost:3100
    
  # Catch-all
  - service: http_status:404
```

**Benefits:**
- ✅ Single entry point
- ✅ All traffic centralized
- ✅ Easier to manage rate limiting/security
- ✅ Better for load balancing
- ✅ Services remain internal
- ✅ Reduced attack surface

**Setup Steps:**
```bash
# 1. Install cloudflared
curl -L --output cloudflared.tgz https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.tgz
tar -xzf cloudflared.tgz && sudo mv cloudflared /usr/local/bin/

# 2. Authenticate with Cloudflare
cloudflared tunnel login

# 3. Create tunnel
cloudflared tunnel create intellidine-prod

# 4. Create config file at ~/.cloudflared/config.yml
# (paste config above)

# 5. Route domain
cloudflared tunnel route dns intellidine-prod api.intellidine.com

# 6. Start tunnel
cloudflared tunnel run intellidine-prod

# For production (as service):
sudo cloudflared service install
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
```

---

### Option 2: Multiple Routes (For Direct Microservice Access)
If you need direct access to specific services (e.g., for mobile apps consuming individual services):

**cloudflared config.yml:**
```yaml
tunnel: intellidine-prod
credentials-file: /root/.cloudflared/credentials.json

ingress:
  # Primary API Gateway (all traffic by default)
  - hostname: api.intellidine.com
    service: http://localhost:3100
    
  # Staging
  - hostname: api-staging.intellidine.com
    service: http://localhost:3100
    
  # Direct service access (optional)
  - hostname: orders.api.intellidine.com
    service: http://localhost:3102
    
  - hostname: menu.api.intellidine.com
    service: http://localhost:3103
    
  - hostname: payments.api.intellidine.com
    service: http://localhost:3105
    
  - hostname: ml.api.intellidine.com
    service: http://localhost:8000
    
  # Catch-all
  - service: http_status:404
```

**⚠️ Cautions:**
- Harder to manage across multiple services
- Each service needs its own CORS/auth configuration
- Not recommended for production (unless services are independent)

---

## Postman Configuration (Updated)

### Local Development Environment (Port 3100 via API Gateway)
```json
{
  "base_url": "http://localhost:3100",
  "api_gateway_url": "http://localhost:3100",
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

### Production Environment (via Cloudflare Tunnel)
```json
{
  "base_url": "https://api.intellidine.com",
  "api_gateway_url": "https://api.intellidine.com",
  "auth_service_url": "https://api.intellidine.com",
  "order_service_url": "https://api.intellidine.com",
  "menu_service_url": "https://api.intellidine.com",
  "inventory_service_url": "https://api.intellidine.com",
  "payment_service_url": "https://api.intellidine.com",
  "notification_service_url": "https://api.intellidine.com",
  "analytics_service_url": "https://api.intellidine.com",
  "discount_engine_url": "https://api.intellidine.com",
  "ml_service_url": "https://api.intellidine.com"
}
```

---

## API Gateway Routing (Internal Microservice Delegation)

The API Gateway (port 3100) must route requests to internal services. Example NestJS configuration:

**api-gateway/src/main.ts or gateway.module.ts:**
```typescript
// Route all /api/orders/* to order-service:3102
@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
  ],
})
export class GatewayModule {
  constructor(private httpService: HttpService) {}

  @Get('orders/*')
  @Post('orders/*')
  forwardToOrderService(@Req() req: Request) {
    return this.httpService.request({
      method: req.method as any,
      url: `http://order-service:3102${req.path}`,
      data: req.body,
      headers: req.headers,
    }).toPromise();
  }

  // Similar routing for other services...
}
```

---

## Nginx Configuration (Optional - For Load Balancing)

If you want to add Nginx in front of the API Gateway:

**nginx.conf:**
```nginx
upstream api_gateway {
    server localhost:3100 weight=1 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

server {
    listen 80;
    server_name api.intellidine.local;

    location / {
        proxy_pass http://api_gateway;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Rate limiting (optional)
        limit_req zone=api burst=100 nodelay;
    }
}

# Rate limiting zone
limit_req_zone $binary_remote_addr zone=api:10m rate=50r/s;
```

---

## Security Best Practices

### ✅ DO

1. **Use API Gateway as single entry point** - Simplifies security management
2. **Enable Cloudflare DDoS protection** - Built into tunnel
3. **Use JWT authentication** - Already configured in auth-service
4. **Enable rate limiting** - At Cloudflare or Nginx level
5. **Use HTTPS only** - Cloudflare enforces this
6. **IP allowlisting** (optional) - Restrict to known clients
7. **Monitor traffic** - Via Prometheus/Grafana
8. **Rotate credentials regularly** - Cloudflare tokens, API keys

### ❌ DON'T

1. **Don't expose database** (PostgreSQL:5443) - CRITICAL ⚠️
2. **Don't expose Redis** (6380) - CRITICAL ⚠️
3. **Don't expose Prometheus** (9090) - Internal metrics
4. **Don't expose Grafana** (3009) - Internal dashboards
5. **Don't use HTTP** - Always use HTTPS
6. **Don't share Cloudflare credentials** - Keep tokens secret
7. **Don't route individual microservices** - Unless absolutely necessary

---

## Testing the Tunnel

### Local Testing
```bash
# Test API Gateway
curl http://localhost:3100/health

# Test specific service (if not routed through gateway)
curl http://localhost:3102/health  # Order service
```

### Production Testing (via Cloudflare)
```bash
# Test tunnel connectivity
curl https://api.intellidine.com/health

# Test with authentication
curl -X POST https://api.intellidine.com/api/auth/customer/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210", "tenant_id": "test-tenant"}'
```

---

## Monitoring & Debugging

### Check Tunnel Status
```bash
cloudflared tunnel list
cloudflared tunnel info intellidine-prod
```

### View Tunnel Logs
```bash
journalctl -u cloudflared -f  # If running as service
# Or
cloudflared tunnel run intellidine-prod  # Direct output
```

### Cloudflare Dashboard
1. Go to `dash.cloudflare.com`
2. Select domain
3. Navigate to **Traffic** > **Analytics**
4. Check **Caching & Performance** metrics

---

## Emergency Rollback

If tunnel fails, services are still accessible locally:

```bash
# Stop tunnel
sudo systemctl stop cloudflared

# Services still accessible internally
curl http://localhost:3100/health  # Still works

# External access down until tunnel restarts
sudo systemctl start cloudflared
```

---

## Summary

| Aspect | Recommendation |
|--------|-----------------|
| **Primary Route** | API Gateway (port 3100) ✅ |
| **Secondary Route** | ML Service (port 8000) if needed |
| **Never Route** | PostgreSQL, Redis, Prometheus, Grafana |
| **Domain** | api.intellidine.com → localhost:3100 |
| **Staging Domain** | api-staging.intellidine.com → localhost:3100 |
| **Security** | JWT + Rate Limiting + Cloudflare DDoS |
| **Monitoring** | Prometheus + Grafana (internal) |

---

## Files Updated

✅ **Intellidine-Environments.postman_environments.json** - Updated with new port mappings
✅ **local.env.postman.json** - Updated with new port mappings
✅ **Intellidine-API-Collection.postman_collection.json** - Updated with new port mappings

---

## Next Steps

1. **Install & Configure Cloudflare Tunnel** - Follow Option 1 setup
2. **Update API Gateway routes** - Ensure all services routed correctly
3. **Test endpoints** - Use updated Postman collection
4. **Set up monitoring** - Monitor tunnel health
5. **Enable security features** - Rate limiting, DDoS protection
