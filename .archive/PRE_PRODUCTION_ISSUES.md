# Pre-Production Issues Checklist

## Issues to Fix Before Going Live

### 1. Console Logging Statements (15 instances)
**Status**: ⚠️ MUST FIX  
**Severity**: HIGH  
**Reason**: Console.log appears in production logs and should be replaced with proper Logger

#### Files & Locations

**1. payment-service/src/services/razorpay.service.ts** (2 instances)
```typescript
// TODO: Replace console.log with logger
console.log('Razorpay order created:', orderId);
console.log('Razorpay payment verified:', paymentId);
```

**2. payment-service/src/kafka/payment.producer.ts** (5 instances)
```typescript
// TODO: Replace ALL console.log statements with logger
console.log('Payment event produced');
console.log('Kafka message sent');
console.log('Retry attempt');
// ... etc
```

**3. inventory-service/src/main.ts** (2 instances)
```typescript
// TODO: Replace with Logger
console.log('Inventory service started');
console.error('Startup error');
```

**4. notification-service/src/main.ts** (1 instance)
```typescript
// TODO: Replace with Logger
console.log('WebSocket server started');
```

**5. api-gateway/src/main.ts** (7 instances)
```typescript
// TODO: Replace ALL console.log with logger
console.log('API Gateway running on port 3000');
console.log('Auth service: OK');
// ... routing logs
```

#### How to Fix

**Replace pattern**:
```typescript
// Option 1: Using NestJS Logger (in service with constructor)
private readonly logger = new Logger(ClassName);

// Then replace:
console.log('message'); 
// with:
this.logger.log('message');

// Option 2: In main.ts (using NestFactory logger)
const app = await NestFactory.create(AppModule);
const logger = new Logger('AppName');

// Then replace:
console.log('message');
// with:
logger.log('message');
```

#### Estimated Fix Time
- 30 minutes to replace all instances

---

### 2. XXX Documentation Placeholders (3 instances)
**Status**: ⚠️ SHOULD FIX  
**Severity**: MEDIUM  
**Reason**: Indicates incomplete JSDoc documentation

#### Location
**File**: `backend/inventory-service/src/app.controller.ts`

```typescript
// Lines 93, 198, 232
// TODO: Replace XXX with actual JSDoc comments
/**
 * XXX - Need proper description
 */
async someMethod() {
  // ...
}
```

#### How to Fix
Replace with proper JSDoc comments:
```typescript
/**
 * Get inventory item by ID
 * @param id The inventory item ID
 * @returns Inventory item details or 404 if not found
 */
async getInventoryItem(id: string) {
  // ...
}
```

#### Estimated Fix Time
- 10 minutes to add proper documentation

---

### 3. Environment Configuration Issues
**Status**: ⚠️ MUST FIX  
**Severity**: HIGH  
**Reason**: Production requires secure, validated environment variables

#### What's Missing

1. **JWT_SECRET**
   - Currently using default/demo value
   - Must generate secure random 32+ character string
   ```bash
   openssl rand -base64 32
   ```

2. **DATABASE_URL**
   - Must point to production PostgreSQL
   - Credentials must be secure

3. **Service URLs**
   - All internal service URLs must be configured
   - Should point to internal Docker network, not external

4. **Razorpay Credentials** (if using payments)
   - Must have production keys
   - Separate from test keys

5. **Kafka Configuration** (if using message queue)
   - Connection strings
   - Topic configurations
   - Consumer groups

#### How to Fix
```bash
# 1. Generate new JWT secret
JWT_SECRET=$(openssl rand -base64 32)
echo $JWT_SECRET

# 2. Create .env.production with all values
cp .env.example .env.production
nano .env.production

# 3. Verify variables are set
source .env.production
env | grep -E "JWT|DATABASE|SERVICE"
```

#### Estimated Fix Time
- 30 minutes to configure all variables

---

### 4. Database Initialization
**Status**: ⚠️ MUST VERIFY  
**Severity**: HIGH  
**Reason**: Production database needs proper schema and seed data

#### What's Required

1. **Run Prisma Migrations**
   ```bash
   cd backend
   npx prisma migrate deploy
   ```

2. **Seed Initial Data** (optional but recommended)
   ```bash
   npx prisma db seed
   ```

3. **Verify Schema**
   ```bash
   npx prisma db push --skip-generate
   psql -U admin -d intellidine -c "\dt"
   ```

4. **Create Admin User** (manual or seed script)
   - Email: admin@intellidine.com
   - Password: Generated & stored securely
   - Role: ADMIN

5. **Create Tenant** (for testing)
   - Tenant ID: UUID
   - Name: Your Restaurant
   - Admin user linked to tenant

#### Estimated Fix Time
- 15 minutes if migrations are ready

---

### 5. SSL/TLS Certificate Setup
**Status**: ✅ AUTOMATED (via Cloudflare)  
**Severity**: CRITICAL  
**Note**: Cloudflare handles SSL automatically, no manual cert needed

#### Verification Checklist
- [ ] Cloudflare DNS CNAME created
- [ ] SSL/TLS mode set to "Full"
- [ ] HTTPS endpoints responding
- [ ] Test with: `curl -I https://api.yourdomain.com`

---

### 6. Monitoring & Logging Setup
**Status**: ⚠️ RECOMMENDED  
**Severity**: MEDIUM  
**Reason**: Production needs visibility into system health

#### What's Recommended

1. **Application Logging**
   - Configure LOG_LEVEL=info in production
   - Ensure logs are captured (journalctl or Docker logs)
   - Set up log retention/rotation

2. **Health Checks**
   - Monitor: `GET /health` every 30 seconds
   - Alert if any service returns unhealthy

3. **Error Tracking** (Optional)
   - Consider Sentry or similar for error tracking
   - Currently using basic console logging

4. **Performance Monitoring**
   - Response time metrics
   - Database query performance
   - Uptime tracking

#### Estimated Setup Time
- 1 hour for full monitoring setup

---

### 7. Authentication & Security
**Status**: ✅ IMPLEMENTED  
**Severity**: CRITICAL  
**Verification Needed**

#### Checklist
- [ ] JWT authentication working
- [ ] Multi-tenant isolation enforced
- [ ] API keys (if used) secured
- [ ] Rate limiting configured (Cloudflare)
- [ ] CORS properly configured
- [ ] No sensitive data in logs
- [ ] HTTPS enforced (automatic via Cloudflare)

---

### 8. Backup Strategy
**Status**: ⚠️ MUST IMPLEMENT  
**Severity**: CRITICAL  
**Reason**: Production data loss prevention

#### What's Required

1. **Automated Database Backups**
   ```bash
   # Add to crontab (runs daily at 2 AM)
   0 2 * * * /home/user/intellidine/backup-db.sh
   ```

2. **Backup Script**
   ```bash
   #!/bin/bash
   BACKUP_DIR="/home/user/backups"
   DATE=$(date +%Y%m%d_%H%M%S)
   docker-compose exec postgres pg_dump -U admin intellidine > $BACKUP_DIR/intellidine_$DATE.sql
   # Keep last 30 days
   find $BACKUP_DIR -name "*.sql" -mtime +30 -delete
   ```

3. **Backup Verification**
   - Monthly test restore from backup
   - Document restore procedure

#### Estimated Setup Time
- 20 minutes

---

### 9. Performance Optimization
**Status**: ⚠️ OPTIONAL BUT RECOMMENDED  
**Severity**: LOW  
**For Future**: Can be done post-launch

#### Suggestions
- Enable database query caching
- Add Redis for session/cache storage
- Optimize JWT payload
- Configure database connection pooling
- Add API response compression (via Cloudflare)

---

### 10. Deployment Pipeline
**Status**: ⚠️ OPTIONAL  
**Severity**: MEDIUM  
**For Future**: Automate deployments

#### What Could Help
- GitHub Actions for CI/CD
- Automated testing on push
- Auto-deploy to staging
- Manual approval for production
- Rollback capability

---

## 📋 MUST FIX BEFORE LAUNCH (Priority Order)

1. **Console Logging** (15 instances) - 30 mins
2. **Environment Variables** (JWT_SECRET, DATABASE_URL, etc.) - 30 mins
3. **Database Migrations** - 15 mins
4. **Verify SSL/TLS** - 10 mins
5. **Backup Strategy** - 20 mins
6. **Security Verification** - 15 mins

**Total Time Estimate**: ~2 hours

---

## ✅ NICE TO HAVE (Before Launch)

1. **XXX Documentation** - 10 mins
2. **Monitoring Setup** - 1 hour
3. **Log Rotation** - 15 mins
4. **Performance Testing** - 1 hour

**Total Time Estimate**: ~2.5 hours

---

## 🚀 LAUNCH BLOCKERS

**Cannot launch without:**
- ❌ Console logging replaced with Logger
- ❌ Proper environment variables set
- ❌ Database migrations run
- ❌ Backup strategy in place

**Can launch with:**
- ✅ XXX documentation still present (optional fix)
- ✅ No advanced monitoring (can add later)
- ✅ Basic logging (can enhance later)

---

## Timeline

**Today (Before any testing)**:
1. Replace console logging → 30 mins
2. Fix environment variables → 30 mins
3. Verify database setup → 15 mins
4. Test locally → 1 hour
5. Fix any issues → 30 mins

**Before deployment**:
6. Final security check → 15 mins
7. Backup strategy setup → 20 mins
8. Deploy to home server → 1 hour

**Total: ~4 hours to production ready**

---

**Last Updated**: October 20, 2025  
**Status**: Ready for immediate action  
**Created by**: AI Assistant  

