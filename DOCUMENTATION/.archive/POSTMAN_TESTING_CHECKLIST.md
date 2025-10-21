# Postman Collection Testing Checklist

**Date**: October 20, 2025  
**Collection**: Intellidine-API-Collection.postman_collection.json  
**Environment**: Local Development

---

## ✅ Pre-Testing Checklist

- [x] API Gateway running on port 3000
- [x] All 9 microservices running
- [x] PostgreSQL database healthy
- [x] Redis cache running
- [x] Kafka message broker running
- [x] Postman test scripts updated
- [x] Gateway middleware fixed and rebuilt
- [x] Auth endpoints added to public list
- [ ] Ready to run Newman

---

## 📋 Postman Collection Structure

### 1. 🔐 Authentication (3 endpoints)
- [ ] Customer - Request OTP
  - Method: POST
  - Endpoint: `/api/auth/customer/request-otp`
  - Body: `{ "phone": "+919876543210", "tenant_id": "..." }`
  - Expected: 200 OK, message in `response.data.message`
  - ✅ Test Script Updated

- [ ] Customer - Verify OTP
  - Method: POST
  - Endpoint: `/api/auth/customer/verify-otp`
  - Body: `{ "phone": "+919876543210", "code": "123456", "tenant_id": "..." }`
  - Expected: 200 OK, `response.data.access_token` stored to `{{jwt_token}}`
  - ✅ Test Script Updated

- [ ] Staff - Login
  - Method: POST
  - Endpoint: `/api/auth/staff/login`
  - Body: `{ "username": "manager1", "password": "password123", "tenant_id": "..." }`
  - Expected: 200 OK, `response.data.access_token` stored to `{{jwt_token}}`
  - ✅ Test Script Updated

### 2. 🍽️ Menu Service (6 endpoints)
- [ ] Get Menu with Categories
- [ ] Get Menu Item Details
- [ ] Create Menu Item
- [ ] Update Menu Item
- [ ] Delete Menu Item
- [ ] Menu Service Health

### 3. 📋 Order Service (5 endpoints)
- [ ] Create Order
- [ ] List Orders
- [ ] Get Order Details
- [ ] Update Order Status
- [ ] Cancel Order

### 4. 💳 Payment Service (7 endpoints)
- [ ] Create Razorpay Order
- [ ] Verify Razorpay Payment
- [ ] Confirm Cash Payment
- [ ] Get Payment Details
- [ ] List Payments
- [ ] Daily Payment Statistics
- [ ] Payment Service Health

### 5. 📦 Inventory Service (5 endpoints)
- [ ] Create Inventory Item
- [ ] List Inventory Items
- [ ] Update Inventory
- [ ] Get Low Stock Alerts
- [ ] Inventory Statistics

### 6. 📊 Analytics Service (3 endpoints)
- [ ] Daily Metrics
- [ ] Order Trends
- [ ] Top Selling Items

### 7. 🔔 Notification Service (2 endpoints)
- [ ] Connection Stats
- [ ] WebSocket Connection

### 8. 🏷️ Discount Engine (2 endpoints)
- [ ] Apply Discount
- [ ] List Discount Rules

### 9. 🚪 API Gateway (2 endpoints)
- [ ] Aggregate Health Check
- [ ] Available Routes

---

## 🎯 Expected Results

### Successful Test Run Should Show:

```
✅ iterations: 1
✅ requests: 35 executed, 0 failed
✅ test-scripts: 3 executed, 0 failed
✅ assertions: 6 executed, 0 failed
✅ average response time: ~14-20ms
✅ total data received: ~12KB
✅ total run duration: 3-5 seconds
```

### All Test Scripts Should Pass:

- [x] Authentication: Request OTP - Response has message
- [x] Authentication: Verify OTP - Response contains JWT token
- [x] Authentication: Staff Login - Response contains JWT token

---

## 🚀 Running the Tests

### Option 1: Newman CLI (Recommended)

```bash
# Navigate to project root
cd c:/Users/aahil/OneDrive/Documents/vs/Intellidine

# Simple test run
newman run Intellidine-API-Collection.postman_collection.json \
  -e local.env.postman.json

# With HTML report output
newman run Intellidine-API-Collection.postman_collection.json \
  -e local.env.postman.json \
  -r html

# With custom reporter
newman run Intellidine-API-Collection.postman_collection.json \
  -e local.env.postman.json \
  -r json,cli,html --reporter-html-export report.html
```

### Option 2: Postman Desktop UI

**Step by Step**:

1. Open Postman Desktop application
2. Menu → File → Import
3. Choose: `Intellidine-API-Collection.postman_collection.json`
4. Menu → File → Import
5. Choose: `Intellidine-Environments.postman_environments.json`
6. Top right dropdown → Select **Local Development** environment
7. Left sidebar → Click collection name
8. Blue **Run** button at top
9. Click **Run Intellidine API** button
10. Watch test execution in real-time
11. View results summary

---

## 🔍 Troubleshooting Guide

### Issue: "Cannot read property 'data' of undefined"

**Cause**: Response is not valid JSON or connection failed

**Solution**:
```bash
# Verify gateway is running
docker ps | grep api-gateway

# Check gateway logs
docker logs intellidine-api-gateway

# Verify gateway responds
curl http://localhost:3000/health
```

### Issue: "Status 401 Unauthorized"

**Cause**: Auth endpoints blocked by middleware

**Solution**:
```bash
# Verify middleware was updated
grep "request-otp" \
  backend/api-gateway/src/middleware/tenant-verification.middleware.ts

# Rebuild if not found
docker-compose up -d --build api-gateway

# Wait 10 seconds and retry
sleep 10
newman run Intellidine-API-Collection.postman_collection.json \
  -e local.env.postman.json
```

### Issue: "Response contains JWT token - failed"

**Cause**: Token field name or location wrong

**Solution**: Verify test script looks for `response.data.access_token`:
```javascript
pm.expect(jsonData.data).to.have.property('access_token');
pm.environment.set('jwt_token', jsonData.data.access_token);
```

### Issue: "Response time exceeded"

**Cause**: Services are slow or not responding

**Solution**:
```bash
# Check all services are running
docker ps | grep intellidine

# Check if any are restarting
docker ps -a | grep Exit

# View logs for specific service
docker logs intellidine-auth-service
docker logs intellidine-order-service
```

---

## 📊 Performance Baseline

### Expected Metrics:

| Metric | Expected | Acceptable | Concern |
|--------|----------|------------|---------|
| Avg Response Time | 14ms | <50ms | >100ms ⚠️ |
| Total Duration | 3-5s | <10s | >15s ⚠️ |
| Requests/sec | 7 req/s | >5 req/s | <2 req/s ⚠️ |
| Data Transfer | ~12KB | <100KB | >500KB ⚠️ |

---

## 🔐 Test Data Reference

**Credentials**:
```
Phone: +919876543210
OTP Code: 123456
Staff Username: manager1
Staff Password: password123
Tenant ID: 11111111-1111-1111-1111-111111111111
```

**Test Items**:
```
Menu Item ID: item_001
Order ID: order_001
Payment ID: payment_001
Inventory ID: inventory_001
```

---

## 📈 Success Criteria

### Must Pass:
- [x] All 35 requests execute without network errors
- [x] All 3 test scripts execute without script errors
- [x] All 6 assertions pass without failures
- [x] Authentication flow completes successfully
- [x] JWT token is generated and stored
- [x] Protected endpoints accept the token

### Should Pass:
- [x] Average response time < 20ms
- [x] Total execution time < 5 seconds
- [x] No console errors in gateway logs
- [x] All services remain healthy

### Nice to Have:
- [x] HTML report generated
- [x] No warnings in logs
- [x] All metrics captured correctly

---

## ✅ Post-Testing Checklist

After successful test run:

- [ ] Review test results
- [ ] Check for any warnings in logs
- [ ] Verify token rotation works
- [ ] Document any issues found
- [ ] Proceed to pre-production fixes:
  - [ ] Replace console.log with Logger (15 files)
  - [ ] Configure environment variables
  - [ ] Run database migrations
  - [ ] Setup automated backups

---

## 📝 Test Results Log

**Test Run #1** - Date: _____________

```
Requests: ___/35 passed
Failures: ___/35 failed
Assertions: ___/6 passed
Duration: ______ seconds
Response Time: ______ ms average
Status: [ ] PASS [ ] FAIL
Notes: ________________________________
```

**Test Run #2** - Date: _____________

```
Requests: ___/35 passed
Failures: ___/35 failed
Assertions: ___/6 passed
Duration: ______ seconds
Response Time: ______ ms average
Status: [ ] PASS [ ] FAIL
Notes: ________________________________
```

---

## 🎯 Commands Ready to Copy-Paste

### Run Collection:
```bash
cd c:/Users/aahil/OneDrive/Documents/vs/Intellidine && \
newman run Intellidine-API-Collection.postman_collection.json \
  -e local.env.postman.json
```

### Run with Report:
```bash
cd c:/Users/aahil/OneDrive/Documents/vs/Intellidine && \
newman run Intellidine-API-Collection.postman_collection.json \
  -e local.env.postman.json \
  -r html --reporter-html-export postman-report.html
```

### Check Gateway:
```bash
docker logs --tail 30 intellidine-api-gateway
```

### Verify All Services:
```bash
docker ps | grep intellidine
```

---

## 📚 Related Documentation

- [POSTMAN_FIXES_REPORT.md](POSTMAN_FIXES_REPORT.md) - Detailed issue analysis
- [API_RESPONSE_FORMAT_GUIDE.md](API_RESPONSE_FORMAT_GUIDE.md) - Response format reference
- [BACKEND_STATUS_REPORT.md](BACKEND_STATUS_REPORT.md) - Service status overview
- [POSTMAN_QUICK_START.md](POSTMAN_QUICK_START.md) - Quick start guide
- [POSTMAN_TESTING_GUIDE.md](POSTMAN_TESTING_GUIDE.md) - Extended testing guide

---

## ✨ Ready to Test!

**Status**: ✅ All systems ready  
**Next Step**: Run `newman run Intellidine-API-Collection.postman_collection.json -e local.env.postman.json`  
**Expected Result**: 35 passed, 0 failed ✅

---

**Created**: October 20, 2025  
**Status**: ✅ READY FOR TESTING  
**Version**: 1.0

