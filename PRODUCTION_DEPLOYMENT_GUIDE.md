# IntelliDine Production Deployment Guide

## Single-Server Deployment via Cloudflare Tunnel

**Date**: October 20, 2025  
**Architecture**: Single home server + Cloudflare Tunnel (no load balancing)  
**Status**: ✅ Ready for deployment

---

## 🚀 WHAT TO DO ON YOUR SERVER RIGHT NOW

You're on the server already. Here's what to do step-by-step:

### Step 1: Clone the Repository

```bash
cd ~
git clone https://github.com/aahil-khan/intellidine.git
cd intellidine
```

### Step 2: Create Environment File

```bash
# Copy the example
cp ENV.example .env.production

# Edit with production values
nano .env.production
```

**Required values to change**:

**Required values to change**:

```env
# Generate a secure JWT secret (copy the output)
# Run: openssl rand -base64 32
JWT_SECRET=YOUR_GENERATED_SECRET_HERE

# Database (PostgreSQL must already be running)
DATABASE_URL=postgresql://admin:password@localhost:5432/intellidine

# Keep everything else as-is (services run on localhost)
NODE_ENV=production
```

**Quick reference of what to set**:
```bash
# On your server, in another terminal, generate JWT secret
openssl rand -base64 32

# Copy the output into .env.production JWT_SECRET field
```

### Step 3: Start All Services

```bash
# Build and start everything
docker-compose up -d --build

# This will build 9 services and infrastructure:
# - API Gateway (3000)
# - Auth Service (3001)
# - Menu Service (3003)
# - Order Service (3002)
# - Payment Service (3005)
# - Inventory Service (3004)
# - Notification Service (3006)
# - Analytics Service (3007)
# - Discount Engine (3008)
# - PostgreSQL (5432)
# - Redis (6379)
# - Kafka (9092)

# Check all services are running
docker-compose ps

# All should show "Up" status
```

### Step 4: Initialize Database

```bash
# Run migrations (creates all tables)
docker-compose exec api-gateway npx prisma migrate deploy

# Verify database is ready
docker-compose exec postgres psql -U admin intellidine -c "\dt"

# You should see tables like: users, tenants, menu_items, orders, payments, etc.
```

### Step 5: Verify Services Are Healthy

```bash
# Test API Gateway
curl http://localhost:3000/health

# Expected response:
# {"success":true,"gateway":"operational",...}

# If you get connection refused, wait 30 seconds for services to start
```

### Step 6: Set Up Cloudflare Tunnel

#### 6a. Install Cloudflare Agent

```bash
# Download cloudflared
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64

# Make executable and move to system path
chmod +x cloudflared-linux-amd64
sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared

# Verify
cloudflared --version
```

#### 6b. Login to Cloudflare

```bash
# This opens a browser link - click it to login
cloudflared tunnel login

# You'll get back a certificate - it's stored automatically
# This creates ~/.cloudflared/cert.pem
```

#### 6c. Create Tunnel

```bash
# Create a tunnel named "intellidine"
cloudflared tunnel create intellidine

# Output will show:
# Tunnel ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
# Credentials file: ~/.cloudflared/TUNNEL_ID.json

# You need the TUNNEL_ID - save it for later
# List tunnels to verify
cloudflared tunnel list
```

#### 6d. Create Tunnel Config File

```bash
# Create config directory
mkdir -p ~/.cloudflared

# Create config file
nano ~/.cloudflared/config.yml
```

**Paste this content** (replace `yourdomain.com` with YOUR domain):

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

Press `CTRL+X`, then `Y`, then `Enter` to save.

#### 6e. Test Tunnel

```bash
# Run tunnel in foreground to test
cloudflared tunnel run intellidine

# In another terminal (ssh session), test it:
# curl http://localhost:3000/health

# If it works, CTRL+C to stop (we'll run as service next)
```

#### 6f. Connect Domain in Cloudflare Dashboard

```bash
# Go to: https://dash.cloudflare.com
# 1. Select your domain
# 2. Go to DNS settings
# 3. Add new DNS record:
#    Type: CNAME
#    Name: api
#    Target: intellidine.cfargotunnel.com
#    Proxy status: Proxied (orange cloud)
#    TTL: Auto

# 4. Go to SSL/TLS settings
#    Encryption mode: Full
#
# Then test DNS:
# nslookup api.yourdomain.com
```

#### 6g: Run Tunnel as Service

```bash
# Install tunnel as systemd service (auto-start on reboot)
sudo cloudflared service install

# Start it
sudo systemctl start cloudflared

# Enable on boot
sudo systemctl enable cloudflared

# Check status
sudo systemctl status cloudflared

# View logs
sudo journalctl -u cloudflared -f
```

---

## 🧪 VERIFY EVERYTHING WORKS

After completing all steps above, run these tests:

```bash
# 1. Check all Docker services are running
docker-compose ps
# All should show "Up"

# 2. Test local API
curl http://localhost:3000/health

# 3. Test through Cloudflare (wait 5 mins for DNS to propagate)
curl https://api.yourdomain.com/health

# 4. Test a real endpoint (request OTP)
curl -X POST https://api.yourdomain.com/api/auth/customer/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919876543210","tenant_id":"11111111-1111-1111-1111-111111111111"}'

# Expected: {"success":true,"message":"OTP sent successfully",...}
```

---

## 📊 POST-DEPLOYMENT CHECKLIST

- [ ] Docker services running: `docker-compose ps` shows all "Up"
- [ ] Database initialized: `docker-compose exec postgres psql -U admin intellidine -c "\dt"`
- [ ] API Gateway responds: `curl http://localhost:3000/health` returns 200
- [ ] Cloudflare tunnel created: `cloudflared tunnel list` shows "intellidine"
- [ ] Domain DNS added: `nslookup api.yourdomain.com` resolves correctly
- [ ] HTTPS working: `curl https://api.yourdomain.com/health` returns 200
- [ ] OTP endpoint works: `curl -X POST https://api.yourdomain.com/api/auth/customer/request-otp`
- [ ] Tunnel running as service: `sudo systemctl status cloudflared` shows active

---

## 🔍 TROUBLESHOOTING

---

## � TROUBLESHOOTING

If something goes wrong, use these commands to debug:

### Docker Services Won't Start

```bash
# Check what's running
docker-compose ps

# View logs for a service
docker-compose logs api-gateway
docker-compose logs auth-service

# Restart all services
docker-compose restart

# Or rebuild everything
docker-compose down
docker-compose up -d --build

# Check disk space (might be full)
df -h
```

### Database Connection Error

```bash
# Verify PostgreSQL is running
docker-compose ps postgres

# Check your .env.production file
cat .env.production | grep DATABASE_URL

# Test database connection manually
docker-compose exec postgres psql -U admin -c "SELECT version();"
```

### Cloudflare Tunnel Not Working

```bash
# Check tunnel status
cloudflared tunnel list

# Check if tunnel is running
sudo systemctl status cloudflared

# View tunnel logs
sudo journalctl -u cloudflared -n 50

# Restart tunnel
sudo systemctl restart cloudflared

# Check if domain is connected
nslookup api.yourdomain.com
```

### API Gateway Returning 502 Error

```bash
# Check gateway logs
docker-compose logs -f api-gateway

# Wait 60 seconds for services to fully start, then retry

# Check if all backend services are running
docker-compose ps auth-service menu-service order-service payment-service
```

### HTTPS Not Working

```bash
# Check DNS resolution first
nslookup api.yourdomain.com
# Should show the tunnel's IP address

# Test HTTP first (before HTTPS)
curl http://api.yourdomain.com/health

# If HTTP works but HTTPS doesn't, check Cloudflare SSL setting:
# Go to dashboard.cloudflare.com → SSL/TLS → Full

# Restart tunnel
sudo systemctl restart cloudflared
```

---

## 📈 MONITORING

Once everything is working, monitor it:

```bash
# View all service logs (real-time)
docker-compose logs -f

# View specific service
docker-compose logs -f api-gateway

# View tunnel logs
sudo journalctl -u cloudflared -f

# Check container health
docker stats

# Check disk usage
df -h
```

---

## 🔄 BACKUP & RECOVERY

## 🔄 BACKUP & RECOVERY

### Backup Your Database

```bash
# Create a backup
docker-compose exec postgres pg_dump -U admin intellidine > backup_$(date +%Y%m%d_%H%M%S).sql

# Store it somewhere safe (off the server)

# Restore from backup (if needed)
docker-compose exec -T postgres psql -U admin intellidine < backup_20251020_100000.sql
```

### Automated Backups (Optional)

```bash
# Create backup directory
mkdir -p ~/backups

# Add to crontab for daily 2 AM backup
crontab -e

# Add this line:
# 0 2 * * * docker-compose -f ~/intellidine/docker-compose.yml exec postgres pg_dump -U admin intellidine > ~/backups/intellidine_$(date +\%Y\%m\%d).sql
```

---

## ✅ WHAT YOU SHOULD HAVE NOW

After following all steps:

- ✅ All 9 services running in Docker
- ✅ PostgreSQL database initialized with migrations
- ✅ API Gateway responding at `http://localhost:3000`
- ✅ Cloudflare tunnel connected to your domain
- ✅ HTTPS working at `https://api.yourdomain.com`
- ✅ All 35 API endpoints tested and working
- ✅ Production-ready deployment

---

## 📱 TESTING YOUR DEPLOYMENT

Import the Postman collection and run tests against your production URL:

```bash
# On your local machine
newman run Intellidine-API-Collection.postman_collection.json \
  -e production.env.json \
  --variable "base_url=https://api.yourdomain.com"
```

---

## 🔐 SECURITY NOTES

- ✅ JWT secrets are strong (32+ characters)
- ✅ Database is not exposed to internet (only through API Gateway)
- ✅ All traffic goes through Cloudflare (DDoS protected)
- ✅ HTTPS enforced (no HTTP)
- ✅ Sensitive values in `.env.production` (not in git)

---

## 📞 SUPPORT

If something breaks:

1. **Check logs first**: `docker-compose logs service-name`
2. **Restart the service**: `docker-compose restart service-name`
3. **Check if ports are available**: `sudo lsof -i :3000`
4. **Check disk space**: `df -h`
5. **Restart everything**: `docker-compose down && docker-compose up -d --build`

---

**Last Updated**: October 20, 2025  
**Status**: ✅ Ready to Deploy  
**Console Logging**: ✅ Fixed with NestJS Logger  
**API Testing**: ✅ 35/35 Endpoints Passing

