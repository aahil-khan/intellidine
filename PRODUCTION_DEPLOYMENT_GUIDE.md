# IntelliDine Production Deployment Guide

## Single-Server Deployment via Cloudflare Tunnel

**Date**: October 20, 2025  
**Architecture**: Single home server + Cloudflare Tunnel (no load balancing)  
**Status**: Ready for deployment

---

## ⚠️ PRE-DEPLOYMENT CHECKLIST

### Critical Issues to Address Before Production

#### 1. Console Logging Statements (15 instances)
**Priority**: HIGH  
**Files affected**:
- `backend/payment-service/src/services/razorpay.service.ts` (2 console.log)
- `backend/payment-service/src/kafka/payment.producer.ts` (5 console.log)
- `backend/inventory-service/src/main.ts` (2 console/console.error)
- `backend/notification-service/src/main.ts` (1 console.log)
- `backend/api-gateway/src/main.ts` (7 console.log)

**Action Required**: Replace with `Logger` from `@nestjs/common`

**Example Fix**:
```typescript
// Before:
console.log('Payment processed:', paymentId);

// After:
this.logger.log('Payment processed: ' + paymentId);
```

#### 2. XXX Documentation Placeholders (3 instances)
**Priority**: MEDIUM  
**Location**: `backend/inventory-service/src/app.controller.ts` (lines 93, 198, 232)

**Action Required**: Replace with proper JSDoc comments

#### 3. Environment Variables
**Priority**: HIGH  
**Action Required**: Create `.env.production` with:

```env
NODE_ENV=production
LOG_LEVEL=info

# Database
DATABASE_URL=postgresql://admin:secure_password@localhost:5432/intellidine

# JWT
JWT_SECRET=generate-a-secure-random-string-min-32-chars
JWT_EXPIRY=24h

# Services
AUTH_SERVICE_URL=http://localhost:3001
MENU_SERVICE_URL=http://localhost:3002
ORDER_SERVICE_URL=http://localhost:3003
PAYMENT_SERVICE_URL=http://localhost:3004
INVENTORY_SERVICE_URL=http://localhost:3005
NOTIFICATION_SERVICE_URL=http://localhost:3006
ANALYTICS_SERVICE_URL=http://localhost:3007
DISCOUNT_SERVICE_URL=http://localhost:3008

# Razorpay (if using payment processing)
RAZORPAY_KEY_ID=your_production_key_id
RAZORPAY_KEY_SECRET=your_production_secret

# Kafka (if using message queue)
KAFKA_BROKERS=localhost:9092

# Monitoring
ENABLE_HEALTH_CHECKS=true
HEALTH_CHECK_INTERVAL=30000
```

#### 4. Database Migrations
**Priority**: HIGH  
**Action Required**: Run before first deployment

```bash
cd backend
npx prisma migrate deploy
npx prisma db seed  # Optional: seed with initial data
```

---

## 📋 Deployment Architecture

### Single Server Setup
```
Home Server
├── Docker Engine
├── Docker Compose (9 services + PostgreSQL)
├── Cloudflare Tunnel (tunnel.cloudflare.com)
└── HTTPS via Cloudflare (automatic SSL)

Port Mapping (internal):
├── API Gateway: 3000
├── Auth Service: 3001
├── Menu Service: 3002
├── Order Service: 3003
├── Payment Service: 3004
├── Inventory Service: 3005
├── Notification Service: 3006
├── Analytics Service: 3007
├── Discount Engine: 3008
└── PostgreSQL: 5432
```

### External Access (via Cloudflare Tunnel)
```
Client → HTTPS://api.yourdomain.com (Cloudflare)
        → Cloudflare Tunnel (encrypted)
        → Home Server:3000 (API Gateway)
        → Internal Services (3001-3008)
```

---

## 🚀 Deployment Steps

### Step 1: Install Prerequisites on Home Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### Step 2: Clone Repository

```bash
# On home server
cd ~
git clone https://github.com/yourusername/intellidine.git
cd intellidine
```

### Step 3: Set Environment Variables

```bash
# Create production environment file
cp .env.example .env.production

# Edit with production values
nano .env.production

# Important values to set:
# - JWT_SECRET: Generate with: openssl rand -base64 32
# - DATABASE_URL: Connect to PostgreSQL
# - Service URLs: All pointing to localhost:PORT
```

### Step 4: Start Services with Docker Compose

```bash
# Build images (first time only)
docker-compose -f docker-compose.yml build

# Start all services
docker-compose -f docker-compose.yml up -d

# Verify all containers running
docker-compose ps

# Expected output (all RUNNING):
# api-gateway             ... running
# auth-service            ... running
# menu-service            ... running
# order-service           ... running
# payment-service         ... running
# inventory-service       ... running
# notification-service    ... running
# analytics-service       ... running
# discount-engine         ... running
# postgres                ... running
```

### Step 5: Initialize Database

```bash
# Run migrations
docker-compose exec api-gateway npx prisma migrate deploy

# Seed initial data (optional)
docker-compose exec api-gateway npx prisma db seed

# Verify database
docker-compose exec postgres psql -U admin -d intellidine -c "\dt"
```

### Step 6: Verify All Services Are Healthy

```bash
# Check API Gateway health
curl http://localhost:3000/health

# Expected response:
# {
#   "success": true,
#   "gateway": "operational",
#   "services": {
#     "auth": "healthy",
#     "menu": "healthy",
#     "order": "healthy",
#     ...
#   }
# }
```

### Step 7: Set Up Cloudflare Tunnel

#### 7a. Install Cloudflare Connector

```bash
# Download latest cloudflared
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64

# Make executable
chmod +x cloudflared-linux-amd64
sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared

# Verify
cloudflared --version
```

#### 7b. Authenticate with Cloudflare

```bash
# This opens browser to login
cloudflared tunnel login

# Verify token stored
cat ~/.cloudflared/cert.pem
```

#### 7c. Create Tunnel

```bash
# Create tunnel
cloudflared tunnel create intellidine

# You'll get:
# Tunnel ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
# Credentials stored at: ~/.cloudflared/TUNNEL_ID.json

# List tunnels to verify
cloudflared tunnel list
```

#### 7d. Configure Tunnel (config.yml)

```bash
# Create config file
mkdir -p ~/.cloudflared
nano ~/.cloudflared/config.yml
```

Add this content:
```yaml
tunnel: intellidine
credentials-file: /root/.cloudflared/TUNNEL_ID.json

ingress:
  - hostname: api.yourdomain.com
    service: http://localhost:3000
  - hostname: "*.api.yourdomain.com"
    service: http://localhost:3000
  - service: http_status:404
```

#### 7e. Test Tunnel

```bash
# Run tunnel (foreground - for testing)
cloudflared tunnel run intellidine

# In another terminal, test:
curl https://api.yourdomain.com/health
```

#### 7f: Route Domain to Tunnel

```bash
# In Cloudflare Dashboard:
# 1. Go to DNS settings
# 2. Add CNAME record:
#    Name: api
#    Target: intellidine.cfargotunnel.com
#    Proxy status: Proxied (orange cloud)
#    SSL/TLS: Full

# Test DNS resolution
nslookup api.yourdomain.com
```

#### 7g: Run Tunnel as Service

```bash
# Install as systemd service
sudo cloudflared service install

# Start service
sudo systemctl start cloudflared

# Enable on boot
sudo systemctl enable cloudflared

# Check status
sudo systemctl status cloudflared

# View logs
sudo journalctl -u cloudflared -f
```

---

## 📊 Post-Deployment Verification

### Checklist

- [ ] All 9 services running: `docker-compose ps`
- [ ] Database initialized: `docker-compose exec postgres psql -U admin -d intellidine -c "SELECT count(*) FROM pg_tables;"`
- [ ] API Gateway responding: `curl http://localhost:3000/health`
- [ ] All services healthy: Health check shows all 9 services `"healthy"`
- [ ] Cloudflare tunnel connected: `cloudflared tunnel info intellidine`
- [ ] Domain resolving: `nslookup api.yourdomain.com`
- [ ] HTTPS working: `curl -I https://api.yourdomain.com/health`
- [ ] Postman collection tests passing: Import collection and run tests

### Full End-to-End Test

```bash
# 1. Test OTP endpoint
curl -X POST https://api.yourdomain.com/api/auth/customer/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919876543210","tenant_id":"11111111-1111-1111-1111-111111111111"}'

# Expected: 200 OK with OTP sent message

# 2. Test menu endpoint (no auth required for GET)
curl https://api.yourdomain.com/api/menu?limit=5

# Expected: 200 OK with menu items

# 3. Test health endpoint
curl https://api.yourdomain.com/health

# Expected: 200 OK with all services healthy
```

---

## 🔄 Backup & Recovery

### Database Backup

```bash
# Backup database
docker-compose exec postgres pg_dump -U admin intellidine > intellidine_backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
docker-compose exec -T postgres psql -U admin intellidine < intellidine_backup_20251020_120000.sql

# Automated backup (add to crontab)
0 2 * * * docker-compose -f ~/intellidine/docker-compose.yml exec postgres pg_dump -U admin intellidine > ~/backups/intellidine_$(date +\%Y\%m\%d).sql
```

### Service Recovery

```bash
# If a service crashes, restart it
docker-compose restart service-name

# If entire stack fails, restart all
docker-compose restart

# Force rebuild and restart
docker-compose down
docker-compose up -d --build
```

---

## 📈 Monitoring

### Health Endpoints

Monitor these endpoints continuously:

```bash
# API Gateway health
curl -s https://api.yourdomain.com/health | jq .

# Service-specific health
curl -s https://api.yourdomain.com/api/auth/health
curl -s https://api.yourdomain.com/api/menu/health
curl -s https://api.yourdomain.com/api/payments/health
curl -s https://api.yourdomain.com/api/inventory/health
curl -s https://api.yourdomain.com/api/analytics/health
```

### Logs

```bash
# View all service logs
docker-compose logs -f

# Specific service logs
docker-compose logs -f api-gateway
docker-compose logs -f auth-service
docker-compose logs -f payment-service

# View Cloudflare tunnel logs
sudo journalctl -u cloudflared -f
```

### Resource Monitoring

```bash
# Check container resource usage
docker stats

# Check disk space
df -h

# Check PostgreSQL connections
docker-compose exec postgres psql -U admin intellidine -c "SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;"
```

---

## 🚨 Troubleshooting

### Service Won't Start

```bash
# Check logs
docker-compose logs api-gateway

# Common issues:
# 1. Port already in use: sudo lsof -i :3000
# 2. Database not ready: Wait 10s before starting services
# 3. Out of memory: docker system prune
```

### Database Connection Error

```bash
# Verify PostgreSQL is running
docker-compose ps postgres

# Check connection string in .env.production
cat .env.production | grep DATABASE_URL

# Test connection
docker-compose exec postgres psql -U admin -c "SELECT version();"
```

### Cloudflare Tunnel Issues

```bash
# Check tunnel status
cloudflared tunnel info intellidine

# Restart tunnel
sudo systemctl restart cloudflared

# Check for errors
sudo journalctl -u cloudflared -n 50

# Verify config
cat ~/.cloudflared/config.yml
```

### HTTPS Not Working

```bash
# Verify DNS resolution
nslookup api.yourdomain.com

# Test Cloudflare SSL
curl -v https://api.yourdomain.com/health

# Check Cloudflare Dashboard:
# - SSL/TLS mode should be "Full"
# - Origin server certificate is valid
```

---

## 📝 Important Notes

1. **JWT Secret**: Generate a NEW one for production (minimum 32 characters)
   ```bash
   openssl rand -base64 32
   ```

2. **Console Logging**: Must be fixed before going live (see PRE-DEPLOYMENT section)

3. **Database Backups**: Set up automated backups (see Backup & Recovery section)

4. **Monitoring**: Set up alerts for service health checks

5. **Rate Limiting**: Consider adding rate limiting via Cloudflare or API Gateway

6. **CORS**: Verify CORS settings match your frontend domain in Cloudflare

7. **Environment Variables**: NEVER commit `.env.production` to git

8. **SSL Certificates**: Handled automatically by Cloudflare (no manual setup needed)

---

## 🔐 Security Checklist

- [ ] JWT secret is strong (32+ characters, random)
- [ ] Database password is strong
- [ ] No hardcoded secrets in code
- [ ] `.env.production` is in `.gitignore`
- [ ] Cloudflare SSL/TLS set to "Full"
- [ ] API authentication required for protected endpoints
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Database backups automated
- [ ] Logs are persistent and monitored
- [ ] Cloudflare DDoS protection enabled
- [ ] Zero Trust Network (optional but recommended)

---

## 📞 Support & Rollback

### If Deployment Fails

1. Stop all services: `docker-compose down`
2. Check logs: `docker-compose logs`
3. Verify environment variables: `cat .env.production`
4. Check disk space: `df -h`
5. Restart and check each service individually

### Rollback Procedure

```bash
# Rollback to previous version
git checkout previous-tag
docker-compose down
docker-compose up -d --build

# Restore database from backup
docker-compose exec -T postgres psql -U admin intellidine < intellidine_backup.sql
```

---

**Created**: October 20, 2025  
**Status**: Ready for Deployment  
**Next Steps**: Fix console logging → Start local testing → Deploy to home server

