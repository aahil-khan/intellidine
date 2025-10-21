# Inventory Service - Complete Guide

**Port**: 3105  
**Language**: TypeScript (NestJS)  
**Database**: PostgreSQL + Redis Cache  
**Message Queue**: Kafka (events subscription)  
**Responsibility**: Stock management, inventory tracking, low stock alerts

---

## What Inventory Service Does

Inventory Service is the **stock guardian**:

- ✅ Track ingredient stock levels
- ✅ Monitor stock expiry dates
- ✅ Alert on low stock
- ✅ Process restock orders
- ✅ Waste tracking
- ✅ Inventory reconciliation

---

## Inventory Tracking

### Get Stock Levels

```
GET /api/inventory/stock

Headers:
X-Tenant-ID: 11111111-1111-1111-1111-111111111111

Response:
{
  "success": true,
  "data": [
    {
      "id": "inv-123",
      "ingredient": "Chicken Breast",
      "unit": "kg",
      "current_stock": 15.5,
      "min_stock_level": 5,
      "max_stock_level": 50,
      "reorder_quantity": 25,
      "expiry_date": "2024-10-25",
      "status": "NORMAL",
      "cost_per_unit": 250
    },
    {
      "id": "inv-124",
      "ingredient": "Butter",
      "unit": "kg",
      "current_stock": 2.3,
      "min_stock_level": 5,
      "max_stock_level": 20,
      "reorder_quantity": 10,
      "expiry_date": "2024-11-15",
      "status": "LOW_STOCK",
      "cost_per_unit": 450
    }
  ]
}
```

### Get Single Ingredient Stock

```
GET /api/inventory/stock/inv-123

Response:
{
  "success": true,
  "data": {
    "id": "inv-123",
    "ingredient": "Chicken Breast",
    "current_stock": 15.5,
    "min_stock_level": 5,
    "max_stock_level": 50,
    "status": "NORMAL",
    "stock_history": [
      {
        "date": "2024-10-22T12:00:00Z",
        "previous": 18.5,
        "current": 15.5,
        "change": -3,
        "reason": "USED_IN_ORDERS",
        "reference": "batch-2024-10-22"
      }
    ],
    "last_updated": "2024-10-22T12:00:00Z"
  }
}
```

---

## Stock Updates

### Manual Stock Adjustment

```
PATCH /api/inventory/stock/inv-123/adjust

Headers:
Authorization: Bearer <jwt_token>
X-Tenant-ID: 11111111-1111-1111-1111-111111111111

Body:
{
  "quantity_change": 10,
  "reason": "RESTOCK",
  "notes": "New delivery from supplier"
}

Response:
{
  "success": true,
  "data": {
    "id": "inv-123",
    "ingredient": "Chicken Breast",
    "previous_stock": 15.5,
    "new_stock": 25.5,
    "change": 10,
    "adjusted_by": "manager1",
    "adjusted_at": "2024-10-22T14:30:00Z"
  }
}
```

### Record Wastage

```
POST /api/inventory/wastage

Headers:
Authorization: Bearer <jwt_token>
X-Tenant-ID: 11111111-1111-1111-1111-111111111111

Body:
{
  "ingredient_id": "inv-123",
  "quantity": 2.5,
  "reason": "EXPIRED",
  "expiry_date": "2024-10-20",
  "notes": "Chicken batch expired"
}

Response:
{
  "success": true,
  "data": {
    "wastage_id": "waste-456",
    "ingredient": "Chicken Breast",
    "quantity_wasted": 2.5,
    "cost_impact": 625,
    "recorded_by": "manager1",
    "recorded_at": "2024-10-22T15:00:00Z"
  }
}
```

---

## Automatic Stock Deduction

### From Order Creation (via Kafka)

```
Event: order.created
Payload:
{
  "order_id": "order-xyz",
  "items": [
    {
      "menu_item_id": "item-123",
      "quantity": 2,
      "ingredients": [
        {
          "ingredient_id": "inv-123",
          "quantity_required": 0.4
        }
      ]
    }
  ]
}

Inventory Service receives → Deducts stock:
- Chicken Breast: 15.5 - 0.4 = 15.1 kg
- Updates cache
- Checks if falls below min_stock_level
- If yes → sends alert
```

### Menu Item → Ingredient Mapping

```json
{
  "menu_item_id": "item-123",
  "name": "Butter Chicken",
  "ingredients": [
    {
      "ingredient_id": "inv-123",
      "name": "Chicken Breast",
      "quantity_per_serving": 0.2,
      "unit": "kg"
    },
    {
      "ingredient_id": "inv-125",
      "name": "Tomato Puree",
      "quantity_per_serving": 0.05,
      "unit": "kg"
    },
    {
      "ingredient_id": "inv-126",
      "name": "Butter",
      "quantity_per_serving": 0.02,
      "unit": "kg"
    }
  ]
}
```

---

## Database Schema

```typescript
model Inventory {
  id                      String   @id @default(uuid())
  tenant_id               String
  ingredient_name         String
  unit                    String
  current_stock           Decimal
  min_stock_level         Decimal
  max_stock_level         Decimal
  reorder_quantity        Decimal
  cost_per_unit           Decimal
  supplier_id             String?
  expiry_date             DateTime?
  created_at              DateTime @default(now())
  updated_at              DateTime @updatedAt

  tenant Tenant @relation(fields: [tenant_id], references: [id])
  movements StockMovement[]
  wastages Wastage[]

  @@unique([tenant_id, ingredient_name])
  @@index([tenant_id])
  @@index([expiry_date])
  @@map("inventory")
}

model StockMovement {
  id                      String   @id @default(uuid())
  inventory_id            String
  movement_type           MovementType
  quantity_change         Decimal
  previous_stock          Decimal
  new_stock               Decimal
  reason                  String
  reference_id            String?
  created_by              String?
  created_at              DateTime @default(now())

  inventory Inventory @relation(fields: [inventory_id], references: [id])

  @@index([inventory_id])
  @@index([created_at])
  @@map("stock_movements")
}

enum MovementType {
  ADDED
  DEDUCTED
  ADJUSTED
  TRANSFERRED
}

model Wastage {
  id                      String   @id @default(uuid())
  inventory_id            String
  quantity                Decimal
  reason                  String
  cost_impact             Decimal
  recorded_by             String
  recorded_at             DateTime @default(now())

  inventory Inventory @relation(fields: [inventory_id], references: [id])

  @@index([inventory_id])
  @@map("wastage_records")
}
```

---

## Kafka Events

### Subscribe to: order.created

```
When order placed with items:
Inventory Service deducts stock proportionally
Checks low stock alerts
Publishes: inventory.low_stock event
```

### Publish: inventory.low_stock

```
Event:
{
  "event": "inventory.low_stock",
  "data": {
    "ingredient_id": "inv-124",
    "ingredient": "Butter",
    "current_stock": 2.3,
    "min_stock_level": 5,
    "required_restock": 10
  }
}

Consumers:
- Notification Service → sends SMS to manager
- Order Service → may disable related menu items
```

---

## Endpoints Summary

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| `GET` | `/api/inventory/stock` | List all stock | JWT + MANAGER |
| `GET` | `/api/inventory/stock/:id` | Get stock details | JWT + MANAGER |
| `PATCH` | `/api/inventory/stock/:id/adjust` | Manual adjustment | JWT + MANAGER |
| `POST` | `/api/inventory/wastage` | Record wastage | JWT + MANAGER |
| `GET` | `/api/inventory/wastage` | View wastage records | JWT + MANAGER |
| `GET` | `/api/inventory/alerts` | Low stock alerts | JWT + MANAGER |

---

## Real-World Scenarios

### Scenario 1: Stock Deduction on Order

```
7:08 PM - Customer orders Butter Chicken (qty 2):
1. Order Service creates order
2. Publishes: order.created event
3. Inventory Service receives event
4. Reads menu_item → ingredients mapping
5. Deducts:
   - Chicken Breast: 0.4 kg
   - Tomato Puree: 0.1 kg
   - Butter: 0.04 kg
6. Updates PostgreSQL + Redis
7. Checks: Butter now 2.26 kg (below 5 min)
8. Publishes: inventory.low_stock
9. Notification Service gets alert
10. SMS sent to manager: "Butter stock low (2.26 kg)"
```

### Scenario 2: Manager Records Delivery

```
10:00 AM - Manager receives chicken delivery:
1. Scans invoice: 25 kg Chicken Breast
2. Calls: PATCH /api/inventory/stock/inv-123/adjust
3. quantity_change: +25, reason: RESTOCK
4. Inventory Service updates:
   - Previous: 12.3 kg
   - New: 37.3 kg
   - Status: NORMAL (above min 5)
5. Invalidates cache
6. Logs movement for audit
```

### Scenario 3: Chef Discards Expired Stock

```
2:00 PM - Chef finds expired butter:
1. Calls: POST /api/inventory/wastage
2. ingredient_id: inv-126 (Butter)
3. quantity: 1.5 kg
4. reason: EXPIRED
5. Inventory Service:
   - Deducts 1.5 kg from stock
   - Records cost impact: 675 INR
   - Updates stock movement log
   - Triggers low stock alert
   - Sends SMS to manager
```

---

## Performance Characteristics

- **Get stock list**: 50-100ms (cached)
- **Get single stock**: 20-40ms (cached)
- **Adjust stock**: 100-150ms (DB write + cache update)
- **Kafka event processing**: 50-80ms (deduction + alert)
- **Cache hit rate**: 90%+ for typical restaurant

---

## Testing Inventory Service

```bash
# Get all stock
curl http://localhost:3100/api/inventory/stock \
  -H "Authorization: Bearer <token>" \
  -H "X-Tenant-ID: 11111111-1111-1111-1111-111111111111"

# Get single ingredient
curl http://localhost:3100/api/inventory/stock/inv-123 \
  -H "Authorization: Bearer <token>"

# Adjust stock
curl -X PATCH http://localhost:3100/api/inventory/stock/inv-123/adjust \
  -H "Authorization: Bearer <token>" \
  -d '{
    "quantity_change": 10,
    "reason": "RESTOCK"
  }'

# Record wastage
curl -X POST http://localhost:3100/api/inventory/wastage \
  -H "Authorization: Bearer <token>" \
  -d '{
    "ingredient_id": "inv-123",
    "quantity": 2.5,
    "reason": "EXPIRED"
  }'
```

---

**See Also**:
- [SYSTEM_OVERVIEW.md](../SYSTEM_OVERVIEW.md) - Inventory in architecture
- [ORDER_SERVICE.md](./ORDER_SERVICE.md) - Stock deduction integration
