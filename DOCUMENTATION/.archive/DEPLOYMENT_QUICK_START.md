# 🚀 IntelliDine Production Deployment - Quick Start

**You're on the server. Here's exactly what to do:**

---

## ✅ STEP-BY-STEP INSTRUCTIONS

### Step 1: Clone Repository
```bash
cd ~
git clone https://github.com/aahil-khan/intellidine.git
cd intellidine
```

### Step 2: Create Environment File
```bash
cp ENV.example .env.production
nano .env.production
```

**Only change these 3 values:**
```env
JWT_SECRET=<run: openssl rand -base64 32>
DATABASE_URL=postgresql://admin:password@localhost:5432/intellidine
NODE_ENV=production
```

### Step 3: Start Services (with Docker)
```bash
docker-compose up -d --build
```

**Wait 2-3 minutes for everything to start**

### Step 4: Initialize Database
```bash
docker-compose exec api-gateway npx prisma migrate deploy
```

### Step 5: Verify Services Working
```bash
# Should return healthy status
curl http://localhost:3000/health
```

### Step 6: Set Up Cloudflare Tunnel

```bash
# Install cloudflared
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
chmod +x cloudflared-linux-amd64
sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared

# Login (opens browser link)
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create intellidine

# Create config file
nano ~/.cloudflared/config.yml
```

**Paste this into config.yml** (replace `yourdomain.com`):
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

### Step 7: Run Tunnel

```bash
# Test it first
cloudflared tunnel run intellidine

# If it works, press CTRL+C to stop

# Run as service (auto-start on reboot)
sudo cloudflared service install
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
```

### Step 8: Connect Domain in Cloudflare Dashboard

1. Go to **https://dash.cloudflare.com**
2. Select your domain
3. Go to **DNS** → Add new record:
   - Type: **CNAME**
   - Name: **api**
   - Target: **intellidine.cfargotunnel.com**
   - Proxy: **Proxied** (orange cloud)
4. Go to **SSL/TLS** → Set mode to **Full**

### Step 9: Test Everything

```bash
# Wait 5 minutes for DNS to propagate, then:

# Test through tunnel
curl https://api.yourdomain.com/health

# Test auth endpoint
curl -X POST https://api.yourdomain.com/api/auth/customer/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919876543210","tenant_id":"11111111-1111-1111-1111-111111111111"}'
```

---

## 📋 CHECKLIST

- [x] Git cloned
- [x] `.env.production` created with JWT_SECRET
- [x] `docker-compose up -d --build` running
- [ ] `curl http://localhost:3000/health` returns 200
- [ ] `npx prisma migrate deploy` completed
- [ ] cloudflared installed
- [ ] Tunnel created (`cloudflared tunnel list` shows intellidine)
- [ ] Config file created
- [ ] DNS CNAME record added (api → intellidine.cfargotunnel.com)
- [ ] SSL/TLS set to Full
- [ ] `curl https://api.yourdomain.com/health` returns 200 ✅

---

## 🆘 IF SOMETHING BREAKS

```bash
# View service logs
docker-compose logs api-gateway

# Restart everything
docker-compose restart

# Or rebuild
docker-compose down
docker-compose up -d --build

# Check tunnel status
sudo systemctl status cloudflared

# View tunnel logs
sudo journalctl -u cloudflared -f
```

---

## 📊 VERIFY FINAL STATE

Run all these and they should all work:

```bash
# Local check
curl http://localhost:3000/health

# DNS check
nslookup api.yourdomain.com

# HTTPS check (after DNS propagates)
curl https://api.yourdomain.com/health

# Service status
docker-compose ps

# Database check
docker-compose exec postgres psql -U admin intellidine -c "\dt"
```

---

## ✨ YOU'RE DONE!

Your API is now live at: **https://api.yourdomain.com**

All 35 endpoints are ready:
- ✅ Authentication (OTP + JWT)
- ✅ Menu Management
- ✅ Order Management
- ✅ Payment Processing
- ✅ Inventory Tracking
- ✅ Notifications
- ✅ Analytics

**See PRODUCTION_DEPLOYMENT_GUIDE.md for detailed troubleshooting**

---

**Updated**: October 20, 2025
