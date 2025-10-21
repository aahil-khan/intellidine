Your Action Items

Provide Secrets and Configuration

- Database: choose a strong DB_PASSWORD for Postgres
- JWT: provide JWT_SECRET and desired JWT_EXPIRY
- SMS (MSG91): provide MSG91_AUTH_KEY and sender ID
- Payments (Razorpay): provide RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET
- Monitoring: provide GRAFANA_PASSWORD

Infrastructure Decisions

- Domain names for API and frontend (e.g., api.intellidine.app, app.intellidine.app)
- Production server host details (SSH) for CI deploy
  - SERVER_HOST, SERVER_USER, SSH_PRIVATE_KEY (as GitHub Actions secrets)
- SSL via reverse proxy (Nginx/LetsEncrypt) – confirm target host

Dev Workflow

- Confirm Node.js 20 and Python 3.11 usage across contributors
- Confirm code style: ESLint + Prettier configs to be added

Product Decisions (MVP Scope Clarifications)

- Tenant onboarding flow details (fields in onboarding form)
- OTP SMS template content and rate limits
- Initial menu categories and sample items for seed
- Discount rules to preconfigure (for rule engine baseline)

Frontend Hosting

- Vercel project slug and environment variables (VITE_API_URL)

Answer These Questions

1) What production domain(s) should we use for API and frontend?
2) Do you already have MSG91 and Razorpay credentials? If yes, share test keys first.
3) Do you want JWT in httpOnly cookies (per PRD) or Authorization headers for local dev?
4) What regions/timezone should be default for analytics aggregations?
5) What initial tenant(s) and sample data should we seed for demo?

