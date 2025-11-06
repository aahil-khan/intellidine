# IntelliDine — UML Diagrams

## Diagrams Generated

### 1. System Collaboration Diagram
**File**: `IntelliDine_System_Collaboration.svg`  
**Size**: 36 KB  
**Description**: Shows how all 10 microservices, data stores (PostgreSQL, Redis, Kafka), and monitoring systems interact with each other.

**Key Components**:
- Frontend applications (Customer & Staff)
- API Gateway (entry point)
- 10 Microservices (Auth, Menu, Order, Payment, Inventory, Notification, Analytics, Discount, ML, API Gateway)
- Data layer (PostgreSQL, Redis, Kafka)
- Monitoring (Prometheus, Grafana)

**View this diagram to understand**:
- Which services talk to which databases
- Event flow through Kafka
- Dependency relationships
- Data persistence patterns

---

### 2. Class Diagram
**File**: `IntelliDine_Class_Diagram.svg`  
**Size**: 51 KB  
**Description**: Entity-relationship diagram showing all database models, attributes, and relationships.

**Key Entities**:
- **Tenant** - Restaurant (multi-tenant SaaS)
- **User** - Staff users (with roles)
- **Customer** - Global customer records
- **Table** - Restaurant tables (with QR codes)
- **MenuItem** - Menu items with pricing
- **MenuCategory** - Categories for organization
- **Order** - Customer orders (state machine)
- **OrderItem** - Individual items in orders
- **Payment** - Payment records (Razorpay or cash)
- **Inventory** - Stock levels
- **OTPVerification** - Authentication records

**Relationships Shown**:
- Tenant → Users (one-to-many)
- Tenant → Tables, MenuItems, Orders, Payments, Inventory
- Customer → Orders (one-to-many)
- Order → OrderItems (one-to-many)
- Order → Payment (one-to-one)
- MenuCategory → MenuItems

**View this diagram to understand**:
- Database schema structure
- Entity relationships and cardinality
- Primary/foreign key relationships
- How tenant_id enforces multi-tenancy

---

## How to View

### Online (Easy - No Installation)
1. Open `IntelliDine_System_Collaboration.svg` in your browser
2. Open `IntelliDine_Class_Diagram.svg` in your browser

### In Documentation
These diagrams are referenced in:
- `DOCUMENTATION/SYSTEM_OVERVIEW.md`
- `DOCUMENTATION/ARCHITECTURE_AT_A_GLANCE.md`
- `DOCUMENTATION/UML_DIAGRAMS.md`

### Generate PNG/PDF (Advanced)
```bash
# PNG format
plantuml -tpng 01_system_collaboration.puml 04_class_diagram.puml

# PDF format
plantuml -tpdf 01_system_collaboration.puml 04_class_diagram.puml
```

---

## Key Insights from Diagrams

### Multi-Tenancy (from Class Diagram)
Every entity except `Customer` and `OTPVerification` has `tenant_id` field:
```
Tenant
├── User (tenant_id)
├── Table (tenant_id)
├── MenuItem (tenant_id)
├── Order (tenant_id)
├── Payment (tenant_id)
└── Inventory (tenant_id)
```

This ensures complete data isolation between restaurants.

### Event-Driven Architecture (from Collaboration Diagram)
Services don't call each other directly:
```
Order Service → Kafka Topic "order.created"
                    ↓
    ├── Notification Service (sends SMS)
    ├── Analytics Service (records metric)
    ├── Inventory Service (reserves stock)
    └── Kitchen Display (shows order)
```

### Order State Machine (from Class Diagram)
```
Order.status: PENDING → PREPARING → READY → SERVED → COMPLETED
                    (or CANCELLED from any state)
```

---

## Generated Files

```
DOCUMENTATION/diagrams/
├── 01_system_collaboration.puml     (source)
├── IntelliDine_System_Collaboration.svg (rendered)
├── 04_class_diagram.puml            (source)
└── IntelliDine_Class_Diagram.svg    (rendered)
```

---

**Generated**: November 6, 2025  
**PlantUML Version**: 1.2020.02  
**Format**: SVG (scalable, works in all browsers)
