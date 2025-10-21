# Staff User Setup Guide

## Quick Start - Pre-seeded Users

IntelliDine comes with 3 pre-seeded staff users that are automatically created when you run the database migrations and seed.

### Default Staff Credentials

**Manager Account**
```
Username: manager1
Email: manager@spiceroute.com
Password: Password@123
Role: MANAGER
ID: 22222222-2222-2222-2222-222222222222
```

**Chef Account**
```
Username: chef1
Email: chef@spiceroute.com
Password: Password@123
Role: KITCHEN_STAFF
ID: 33333333-3333-3333-3333-333333333333
```

**Waiter Account**
```
Username: waiter1
Email: waiter@spiceroute.com
Password: Password@123
Role: WAITER
ID: 44444444-4444-4444-4444-444444444444
```

---

## Initial Setup

### 1. Run Database Migrations

```bash
cd backend

# Run Prisma migrations (creates tables)
npx prisma migrate dev --name initial

# This will:
# ✅ Create all database tables
# ✅ Seed default data (tenant, tables, menu items, inventory)
# ✅ Create 3 staff users with pre-seeded passwords
```

### 2. Verify Users Created

```bash
# Connect to PostgreSQL
psql -h localhost -U admin -d intellidine

# Check users were created
SELECT id, username, email, role, is_active FROM users;
```

You should see:
```
                  id                  | username |          email           |     role     | is_active
--------------------------------------+----------+------------------------|---------------+----------
 22222222-2222-2222-2222-222222222222 | manager1 | manager@spiceroute.com | MANAGER      | t
 33333333-3333-3333-3333-333333333333 | chef1    | chef@spiceroute.com    | KITCHEN_STAFF | t
 44444444-4444-4444-4444-444444444444 | waiter1  | waiter@spiceroute.com  | WAITER       | t
```

### 3. Test Login

```bash
# Start the services
docker-compose up

# Test manager login
curl -X POST http://localhost:3100/api/auth/staff/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "manager1",
    "password": "Password@123",
    "tenant_id": "11111111-1111-1111-1111-111111111111"
  }'

# Response should include access_token:
# {
#   "success": true,
#   "data": {
#     "access_token": "eyJhbGc...",
#     "expires_at": "2025-10-22T18:00:00Z",
#     "user": {
#       "id": "22222222-...",
#       "username": "manager1",
#       "email": "manager@spiceroute.com",
#       "role": "MANAGER"
#     }
#   }
# }
```

---

## Create Additional Staff Users

If you need to add more staff users, use the interactive creation script:

```bash
cd backend

# Run the interactive script
npm run create-staff-user

# Prompts will ask for:
# 1. Username
# 2. Email
# 3. Password
# 4. Role (1=MANAGER, 2=KITCHEN_STAFF, 3=WAITER)

# Example:
# Enter username: john_manager
# Enter email: john@spiceroute.com
# Enter password (min 8 chars): SecurePass123!
# Select role:
#   1. MANAGER
#   2. KITCHEN_STAFF
#   3. WAITER
# Enter role number (1-3): 1

# ✅ Staff user created successfully!
```

---

## Integration with Frontend

### Use in Postman

The production Postman collection includes these credentials:
- Update `staff_username` to one of the seeded users (manager1, chef1, waiter1)
- Update `staff_password` to `Password@123`
- Click "Staff - Login" request
- JWT token automatically extracted for subsequent requests

### Use in Frontend App

1. **Login Form**
   ```typescript
   interface LoginRequest {
     username: string;
     password: string;
     tenant_id: string;
   }

   async function loginStaff(username: string, password: string) {
     const response = await fetch(
       'https://intellidine-api.aahil-khan.tech/api/auth/staff/login',
       {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           username,
           password,
           tenant_id: '11111111-1111-1111-1111-111111111111',
         }),
       }
     );

     const data = await response.json();
     if (data.success) {
       localStorage.setItem('token', data.data.access_token);
       localStorage.setItem('user', JSON.stringify(data.data.user));
       return data.data;
     } else {
       throw new Error(data.data.message);
     }
   }
   ```

2. **Test Credentials for QA**
   | Role | Username | Password | Purpose |
   |------|----------|----------|---------|
   | Manager | manager1 | Password@123 | Full access, reporting |
   | Chef | chef1 | Password@123 | Kitchen orders, prep |
   | Waiter | waiter1 | Password@123 | Table orders, payments |

---

## Password Management

### Change Password (Staff)
```bash
# Connect to database
psql -h localhost -U admin -d intellidine

# Update password (example: new password "NewPass@456")
UPDATE users 
SET password_hash = crypt('NewPass@456', gen_salt('bf'))
WHERE username = 'manager1';
```

### Reset to Default
```bash
# All staff users reset to "Password@123"
UPDATE users 
SET password_hash = crypt('Password@123', gen_salt('bf'))
WHERE role IN ('MANAGER', 'KITCHEN_STAFF', 'WAITER');
```

---

## Production Considerations

⚠️ **IMPORTANT FOR PRODUCTION**

1. **Change Default Passwords**
   - Do NOT use "Password@123" in production
   - Generate strong passwords (min 12 chars, mixed case, numbers, special chars)
   - Use the `create-staff-user` script to create actual staff accounts

2. **Update Seed Data**
   - Remove default credentials from `backend/prisma/seed.sql`
   - Create production seed with real staff information
   - Never commit real passwords to version control

3. **Environment-Specific Seeds**
   ```bash
   # Development seed (pre-seeded credentials for testing)
   backend/prisma/seed.dev.sql

   # Production seed (no default users, manual creation required)
   backend/prisma/seed.prod.sql
   ```

4. **Two-Factor Authentication** (Future)
   - Consider adding 2FA for staff accounts
   - Implement device fingerprinting
   - Session timeout after inactivity

---

## Troubleshooting

### Staff Login Not Working

**Error**: `{"success": false, "error": "InvalidCredentials"}`

**Possible Causes**:
1. User not created yet - run migrations
   ```bash
   npx prisma migrate dev --name initial
   ```

2. Wrong password
   - Default is `Password@123`
   - Check user exists: `SELECT * FROM users WHERE username = 'manager1';`

3. User not active
   ```sql
   -- Activate user
   UPDATE users SET is_active = true WHERE username = 'manager1';
   ```

4. Wrong tenant_id
   - Default tenant_id is `11111111-1111-1111-1111-111111111111`
   - Check: `SELECT id FROM tenants;`

### Password Hash Issues

If password hashes are not correct in seed.sql:

```bash
# Option 1: Use bcrypt online generator
# Visit: https://bcrypt-generator.com/
# Enter password: Password@123
# Copy the hash and update seed.sql

# Option 2: Generate via script (requires bcrypt installed)
npm install bcrypt
node -e "require('bcrypt').hash('Password@123', 10, (err, hash) => console.log(hash))"
```

---

## Additional Resources

- **API Documentation**: See `FRONTEND_INTEGRATION_GUIDE.md`
- **Auth Flow Details**: See `CODEBASE_ARCHITECTURE.md` - Authentication & Authorization section
- **Database Schema**: See `CODEBASE_ARCHITECTURE.md` - Database Architecture section

---

**Last Updated**: October 22, 2025  
**Status**: Ready for Frontend Integration
