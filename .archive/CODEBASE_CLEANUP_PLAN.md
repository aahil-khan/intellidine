# Codebase Error & Warning Fix Plan

## Issues Identified

### 1. Missing Type Declarations (Express)
**Services:** Auth Service  
**Issue:** Missing @types/express  
**Status:** 1 error

### 2. Shared Auth Module Resolution
**Services:** Menu, Payment, Inventory (3 services)  
**Issue:** Shared auth module missing dependencies (@nestjs/common, jsonwebtoken)  
**Status:** 7 errors per service = 21 total

### 3. Order Service Specific Issues
**Services:** Order Service  
**Issue:** 
- Missing @shared/auth import
- Type 'unknown' property access  
**Status:** 2 errors

## Fix Strategy

### Phase 1: Install Missing Dependencies
```bash
# Auth Service
npm install --save-dev @types/express

# Shared module needs dependencies
npm install @nestjs/common jsonwebtoken
npm install --save-dev @types/jsonwebtoken
```

### Phase 2: Update Shared Auth Module
Ensure `backend/shared/auth/` has proper exports and all services import correctly

### Phase 3: Fix Order Service
- Update import path for @shared/auth
- Fix type safety in order.service.ts

### Phase 4: Run TypeScript Compilation
Verify no errors remain across all services

### Phase 5: Run Full Test Suite
All 94 tests should pass

---

## Execution Timeline

- Phase 1: 10 minutes
- Phase 2: 10 minutes
- Phase 3: 15 minutes
- Phase 4: 10 minutes
- Phase 5: 30 minutes

**Total: ~75 minutes for complete cleanup**
