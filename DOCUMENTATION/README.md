# Intellidine Complete System Documentation

## Welcome! 👋

This folder contains **comprehensive documentation** about everything happening in Intellidine. If you're new to the project or want to understand how systems work together, **start here**.

---

## 📚 Documentation Structure

### Main Overview
- **[SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md)** - High-level architecture, data flow, and system interactions
- **[ARCHITECTURE_AT_A_GLANCE.md](./ARCHITECTURE_AT_A_GLANCE.md)** - One-page reference (tables, diagrams, patterns)

### Individual Service Guides
Each microservice has detailed documentation:

1. **[API_GATEWAY.md](./services/API_GATEWAY.md)** - Request routing, rate limiting, authentication validation
2. **[AUTH_SERVICE.md](./services/AUTH_SERVICE.md)** - Customer OTP, staff login, JWT tokens, session management
3. **[MENU_SERVICE.md](./services/MENU_SERVICE.md)** - Menu items, categories, pricing, dietary tags
4. **[ORDER_SERVICE.md](./services/ORDER_SERVICE.md)** - Order creation, status tracking, order items
5. **[PAYMENT_SERVICE.md](./services/PAYMENT_SERVICE.md)** - Razorpay integration, cash payments, payment status
6. **[INVENTORY_SERVICE.md](./services/INVENTORY_SERVICE.md)** - Stock management, recipe ingredients, low stock alerts
7. **[DISCOUNT_ENGINE.md](./services/DISCOUNT_ENGINE.md)** - Dynamic pricing, ML integration, pricing rules
8. **[NOTIFICATION_SERVICE.md](./services/NOTIFICATION_SERVICE.md)** - SMS alerts, order notifications, customer updates
9. **[ANALYTICS_SERVICE.md](./services/ANALYTICS_SERVICE.md)** - Metrics collection, reporting, dashboards
10. **[ML_SERVICE.md](./services/ML_SERVICE.md)** - XGBoost discount prediction, model training

### Cross-Cutting Concerns
- **[DATABASE.md](./DATABASE.md)** - Schema, relationships, indexes, migrations
- **[KAFKA_EVENTS.md](./KAFKA_EVENTS.md)** - Event topics, consumers, event flow
- **[AUTHENTICATION.md](./AUTHENTICATION.md)** - JWT tokens, OTP verification, staff login
- **[MULTI_TENANCY.md](./MULTI_TENANCY.md)** - Tenant isolation, data boundaries

### Common Workflows
- **[ORDERING_WORKFLOW.md](./workflows/ORDERING_WORKFLOW.md)** - Complete order lifecycle from QR scan to completion
- **[PAYMENT_WORKFLOW.md](./workflows/PAYMENT_WORKFLOW.md)** - Payment processing, refunds, cash vs online
- **[DISCOUNT_APPLICATION.md](./workflows/DISCOUNT_APPLICATION.md)** - How ML discounts are calculated and applied
- **[INVENTORY_WORKFLOW.md](./workflows/INVENTORY_WORKFLOW.md)** - Stock updates, reservations, adjustments

### Architecture & Design
- **[UML_DIAGRAMS.md](./UML_DIAGRAMS.md)** - Comprehensive PlantUML diagrams (collaboration, sequence, class, database)
- **[ARCHITECTURE_DIAGRAMS_ASCII.md](./ARCHITECTURE_DIAGRAMS_ASCII.md)** - Visual ASCII diagrams of system components, flows, and relationships
- **[diagrams/](./diagrams/)** - Rendered SVG diagrams:
  - `IntelliDine_System_Collaboration.svg` - System components & interactions
  - `IntelliDine_Class_Diagram.svg` - Database entities & relationships

### Quick References
- **[API_ENDPOINTS.md](./API_ENDPOINTS.md)** - All 35+ endpoints with examples
- **[ERROR_CODES.md](./ERROR_CODES.md)** - Error handling, status codes, troubleshooting
- **[GLOSSARY.md](./GLOSSARY.md)** - Terms, acronyms, definitions

---

## 🚀 Quick Start Paths

### "I'm a Frontend Developer"
1. Read [SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md) (5 min)
2. Read [API_ENDPOINTS.md](./API_ENDPOINTS.md) (10 min)
3. Bookmark [ORDERING_WORKFLOW.md](./workflows/ORDERING_WORKFLOW.md)
4. Check individual service docs as needed

### "I'm a Backend Developer"
1. Start with [SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md)
2. Read the relevant service docs for what you're working on
3. Check [DATABASE.md](./DATABASE.md) for schema
4. Review [KAFKA_EVENTS.md](./KAFKA_EVENTS.md) for event flows

### "I'm a DevOps/Operations Engineer"
1. Read [SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md)
2. Check deployment setup in root README.md
3. Review all service documentation for dependencies
4. Monitor sections in each service doc

### "I'm Managing This Project"
1. Read [SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md)
2. Check [ORDERING_WORKFLOW.md](./workflows/ORDERING_WORKFLOW.md) for customer journey
3. Review [GLOSSARY.md](./GLOSSARY.md) to understand terminology
4. Check individual service docs for technical debt notes

---

## 📖 File Descriptions

### SYSTEM_OVERVIEW.md (20-30 min read)
**What you'll learn**:
- ✅ All 10 services and what they do
- ✅ How services talk to each other
- ✅ Data flow from customer order to kitchen display
- ✅ Multi-tenancy implementation
- ✅ Event-driven architecture with Kafka
- ✅ Authentication flows (OTP vs staff login)
- ✅ Database schema at high level

### Service Documentation (each 10-20 min)
Each service file includes:
- **What it does** - Purpose and responsibilities
- **Key endpoints** - REST API with examples
- **Data models** - Prisma schema relevant to service
- **Kafka events** - What it publishes/consumes
- **Dependencies** - Other services it calls
- **Error handling** - Common issues and solutions
- **Use cases** - Real-world scenarios
- **Testing** - How to test the service

### Workflow Documentation (15-30 min each)
Each workflow file traces:
- **Step-by-step** - Exact sequence of operations
- **Service interactions** - Which services are involved
- **Data transformations** - How data changes through flow
- **Event publishing** - What Kafka events are emitted
- **Error scenarios** - What can go wrong and recovery
- **Examples** - Real customer scenarios with data

---

## 🎯 Key Concepts to Understand

### Multi-Tenancy
Intellidine is **SaaS** - many restaurants use the same system, completely isolated:
- Each restaurant has a `tenant_id` (UUID)
- All data filtered by `tenant_id` at database level
- Staff can only access their restaurant's data
- Customers only see their restaurant's menu

### Stateless Services
All services are **stateless** for scalability:
- No session data stored in services
- Everything stored in PostgreSQL + Redis
- Can run multiple instances behind load balancer
- Any instance can handle any request

### Event-Driven
Services communicate asynchronously via **Kafka**:
- `order.created` → triggers Notification, Analytics, Kitchen
- `payment.completed` → updates order status
- `inventory.low_stock` → alerts management

### ML Integration
XGBoost model predicts optimal discounts:
- Real-time predictions based on current context
- Considers time of day, inventory, demand patterns
- Applied automatically to every order
- No extra API call visible to customer

---

## 🔍 File Sizes & Read Time

| File | Size | Read Time |
|------|------|-----------|
| SYSTEM_OVERVIEW.md | ~3000 lines | 30 min |
| API_ENDPOINTS.md | ~2000 lines | 15 min |
| ORDERING_WORKFLOW.md | ~1500 lines | 20 min |
| Individual Service | ~500-800 lines | 10-15 min each |
| DATABASE.md | ~1000 lines | 15 min |
| KAFKA_EVENTS.md | ~800 lines | 10 min |

**Total documentation**: ~15,000 lines
**If you read everything**: ~3-4 hours
**Recommended first reading**: 1-2 hours (SYSTEM_OVERVIEW + your role-specific docs)

---

## ⚡ TL;DR (2 Minutes)

**Intellidine is a restaurant ordering system** with:

🍽️ **For Customers**:
- Scan QR code at table
- Browse menu via phone
- Add items to cart
- Place order (instantly sent to kitchen)
- Pay online or cash

👨‍💼 **For Restaurant Staff**:
- See orders on kitchen display
- Update order status (preparing → ready → served)
- Manage inventory & menu
- Process payments
- View analytics

🤖 **For Backend**:
- 10 microservices (each ~500-700 lines)
- PostgreSQL + Redis + Kafka
- Multi-tenant SaaS architecture
- JWT authentication
- ML-based discount prediction

📱 **For Frontend**:
- React app at port 3000
- Uses 35+ REST endpoints
- Real-time order updates
- Mobile-first design

---

## 🛠️ How to Use This Documentation

### Finding Something Specific

**"I need to add a new menu item field"**
→ Check `MENU_SERVICE.md` for endpoints, then `DATABASE.md` for schema

**"Why is my discount not being applied?"**
→ Read `DISCOUNT_APPLICATION.md` workflow, check `DISCOUNT_ENGINE.md` service

**"What happens when customer clicks 'Place Order'?"**
→ Read `ORDERING_WORKFLOW.md` step-by-step with exact service calls

**"How do I test the payment flow?"**
→ Check `PAYMENT_SERVICE.md` for endpoints and `PAYMENT_WORKFLOW.md` for full flow

### Keep Files Open

Bookmark these 3 while developing:
1. `SYSTEM_OVERVIEW.md` - Reference architecture
2. `API_ENDPOINTS.md` - All endpoint signatures
3. Your service-specific file (e.g., `ORDER_SERVICE.md`)

---

## 📞 Questions?

Each service file has:
- **Common Issues** section with troubleshooting
- **Examples** with actual request/response JSON
- **Related Files** - links to other relevant documentation

If something isn't clear:
1. Check the related service's README
2. Look in GLOSSARY.md for term definitions
3. Search workflow files for your use case

---

## 📝 Maintaining This Documentation

When updating code:
1. Update the service's .md file
2. Update KAFKA_EVENTS.md if events change
3. Update DATABASE.md if schema changes
4. Add new workflow files for major features
5. Update this README with new file descriptions

---

**Last Updated**: October 22, 2025
**System Version**: 1.0
**Frontend Integration Ready**: ✅ YES

Happy documenting! 📚
