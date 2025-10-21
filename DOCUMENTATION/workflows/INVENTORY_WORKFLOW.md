# Inventory Workflow - Complete Guide

**Timeline**: Throughout day → Stock updates → Low stock alerts  
**Services Involved**: Inventory Service, Order Service, Notification Service, Menu Service  
**Key Actors**: Kitchen staff, managers, suppliers

---

## Overview

This workflow describes **how inventory flows** from morning stock check through order-based deductions to low stock alerts and reordering.

---

## 6:00 AM - Morning Stock Check

### Manager Opens System

```
Manager logs in to staff portal
Navigates to: Inventory → Stock Levels
```

### Get All Stock Levels

**Manager Action**: View current inventory

```bash
GET /api/inventory/stock
Headers:
  Authorization: Bearer <manager_token>
  X-Tenant-ID: 11111111-1111-1111-1111-111111111111

Response:
{
  "success": true,
  "data": [
    {
      "id": "inv-123",
      "ingredient": "Chicken Breast",
      "unit": "kg",
      "current_stock": 45.5,
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
      "current_stock": 15.3,
      "min_stock_level": 5,
      "max_stock_level": 20,
      "expiry_date": "2024-11-15",
      "status": "NORMAL",
      "cost_per_unit": 450
    }
  ]
}
```

### Manager Reviews

```
✓ Chicken Breast: 45.5 kg (NORMAL - can handle today)
✓ Butter: 15.3 kg (NORMAL)
✓ Tomato Puree: 8.2 kg (NORMAL)
✓ All items above minimum levels
✓ No items expiring today

Status: ✅ All good to open for service
```

---

## 7:08 PM - First Order Creates Stock Deduction

### Order Created with Items

**Customer Order**:
```
Order #XYZ placed:
- 2x Butter Chicken (uses 0.4 kg chicken breast)
- 3x Naan (uses 0.75 kg flour)
```

**Order Service publishes Kafka event**: `order.created`

```json
{
  "event": "order.created",
  "order_id": "order-xyz",
  "items": [
    {
      "menu_item_id": "item-123",
      "name": "Butter Chicken",
      "quantity": 2,
      "ingredients": [
        {
          "ingredient_id": "inv-123",
          "name": "Chicken Breast",
          "quantity_required": 0.2,
          "unit": "kg"
        },
        {
          "ingredient_id": "inv-126",
          "name": "Tomato Puree",
          "quantity_required": 0.05,
          "unit": "kg"
        }
      ]
    }
  ]
}
```

### Inventory Service Consumes Event

**Inventory Service Processing**:

```
1. Receive order.created event

2. Parse ingredients needed:
   - Chicken Breast: 0.4 kg (2 orders × 0.2)
   - Tomato Puree: 0.1 kg (2 orders × 0.05)
   - Butter: 0.04 kg (from Butter Chicken recipe)

3. For each ingredient, fetch current stock:
   SELECT current_stock FROM inventory WHERE id = 'inv-123'
   → 45.5 kg

4. Calculate new stock:
   new_stock = 45.5 - 0.4 = 45.1 kg

5. Update PostgreSQL:
   UPDATE inventory
   SET current_stock = 45.1,
       updated_at = now()
   WHERE id = 'inv-123'

6. Record stock movement for audit:
   INSERT INTO stock_movements (
     inventory_id, movement_type, quantity_change,
     previous_stock, new_stock, reason, reference_id
   ) VALUES (
     'inv-123', 'DEDUCTED', -0.4,
     45.5, 45.1, 'USED_IN_ORDERS', 'order-xyz'
   )

7. Update Redis cache:
   SET inventory:inv-123:stock 45.1

8. Check if below minimum:
   min_stock = 5
   new_stock = 45.1
   45.1 > 5? YES ✓
   → No alert needed

9. Return success
```

### Similar Deductions for Other Ingredients

```
Tomato Puree:
- Previous: 8.2 kg
- Deducted: 0.1 kg
- New: 8.1 kg ✓ (still > 5 min)

Butter:
- Previous: 15.3 kg
- Deducted: 0.04 kg
- New: 15.26 kg ✓ (still > 5 min)

All ingredients okay!
```

---

## 7:15 PM - Second Order, Low Stock Alert

### Another Large Order

```
Order #ABC placed:
- 5x Butter Chicken (1.0 kg chicken breast needed)
- 8x Naan (2.0 kg flour needed)

Inventory deductions:
- Chicken Breast: 45.1 - 1.0 = 44.1 kg ✓
- Flour: 18.5 - 2.0 = 16.5 kg ✓
```

### 7:45 PM - Multiple Orders Throughout Evening

```
7:20 PM - Order DEF: Chicken -0.3, Tomato -0.06
         Stock: Chicken 44.8 kg ✓, Tomato 8.04 kg ✓

7:25 PM - Order GHI: Chicken -0.5, Butter -0.08
         Stock: Chicken 44.3 kg ✓, Butter 15.18 kg ✓

7:30 PM - Order JKL: Chicken -0.4, Tomato -0.1, Flour -1.5
         Stock: Chicken 43.9 kg ✓, Tomato 7.94 kg ✓, Flour 15.0 kg ✓

7:35 PM - Order MNO: Chicken -0.8, Flour -2.0
         Stock: Chicken 43.1 kg ✓, Flour 13.0 kg ✓

7:40 PM - Order PQR: Tomato -0.15
         Stock: Tomato 7.79 kg ✓

7:45 PM - Order STU: Tomato -0.2
         Stock: Tomato 7.59 kg... Wait!
         
         Check: Is Tomato 7.59 < min 5? NO
         But getting close to minimum
```

### 7:50 PM - Stock Falls Below Threshold

```
Order VWX placed:
- 8x Tomato-based curry dish
- Tomato Puree needed: 0.4 kg

Inventory deduction:
- Before: 7.59 kg
- After: 7.59 - 0.4 = 7.19 kg

Wait, that's still above minimum (5 kg)...

Let's say next order needs 1.5 kg:
- Before: 7.19 kg
- After: 7.19 - 1.5 = 5.69 kg ✓

Next order needs 1.0 kg:
- Before: 5.68 kg
- After: 5.68 - 1.0 = 4.68 kg
- This is BELOW minimum (5)! 🚨

Alert triggered!
```

### Inventory Service Detects Low Stock

**Inventory Service**:

```
1. After deduction, stock = 4.68 kg
2. Check against min_stock_level = 5 kg
3. Condition: stock < min_stock? YES 🚨

4. Publish Kafka event: inventory.low_stock
   {
     "event": "inventory.low_stock",
     "inventory_id": "inv-126",
     "ingredient": "Tomato Puree",
     "current_stock": 4.68,
     "min_stock_level": 5,
     "max_stock_level": 20,
     "reorder_quantity": 10,
     "cost_per_unit": 120,
     "cost_impact": 1200,
     "timestamp": "2024-10-22T19:52:00Z"
   }

5. Update status in database:
   UPDATE inventory
   SET status = 'LOW_STOCK'
   WHERE id = 'inv-126'
```

---

## 8:00 PM - Manager Receives Low Stock Alert

### Notification Service Processes Event

**Notification Service receives**: `inventory.low_stock`

```
1. Parse event data
2. Create notification:
   - Type: LOW_STOCK_ALERT
   - Recipient: manager1
   - Channel: SMS + Email
3. Format message:
   "ALERT: Tomato Puree stock low (4.68 kg). 
    Min required: 5 kg. 
    Reorder qty: 10 kg. Cost: ₹1,200"
```

### SMS Sent to Manager

```
SMS via Twilio:
To: +919876543210 (manager's phone)

Message:
"ALERT: Tomato Puree stock critically low (4.68 kg). 
Please reorder immediately. Need: 10 kg. ₹1,200"

Delivery time: ~2 seconds
```

### Email to Manager

```
Email via SendGrid:
To: manager@spiceroute.com

Subject: LOW STOCK ALERT - Tomato Puree

Body:
---
STOCK ALERT

Ingredient: Tomato Puree
Current Stock: 4.68 kg
Minimum Required: 5 kg
Reorder Quantity: 10 kg
Unit Cost: ₹120/kg
Total Cost: ₹1,200

Action Required: Order more stock immediately!

Status Last Updated: 8:00 PM
---
```

### Menu Service Informed (Optional)

```
When stock falls below critical level:
Inventory Service MAY disable menu items that require it

If restock_behavior = 'DISABLE_ITEMS':
- Disable all dishes with "Tomato Puree" ingredient
- Update Menu Service: Mark items unavailable
- Customers see "Currently unavailable" instead of dish
- Kitchen sees grayed-out items
```

---

## 8:15 AM Next Morning - Restock Delivery

### Manager Receives Delivery

```
Supplier truck arrives: 10 kg Tomato Puree
Manager verifies:
✓ Quantity: 10 kg
✓ Quality: Fresh, no damage
✓ Expiry: 2024-12-01
✓ Invoice matches order
```

### Manager Records Restock

**Manager Action**: Add stock back

```bash
PATCH /api/inventory/stock/inv-126/adjust
Headers:
  Authorization: Bearer <manager_token>
Body:
{
  "quantity_change": 10,
  "reason": "RESTOCK",
  "notes": "Delivery from Supplier XYZ, Invoice #12345"
}
```

**Inventory Service Processing**:

```
1. Find current stock
   SELECT current_stock FROM inventory WHERE id = 'inv-126'
   → 4.68 kg (still low from yesterday)

2. Calculate new stock
   new_stock = 4.68 + 10 = 14.68 kg

3. Update PostgreSQL
   UPDATE inventory
   SET current_stock = 14.68,
       status = 'NORMAL',
       updated_at = now()
   WHERE id = 'inv-126'

4. Record movement
   INSERT INTO stock_movements (
     inventory_id, movement_type, quantity_change,
     previous_stock, new_stock, reason, reference_id
   ) VALUES (
     'inv-126', 'ADDED', 10,
     4.68, 14.68, 'RESTOCK', 'invoice-12345'
   )

5. Update Redis cache
   SET inventory:inv-126:stock 14.68

6. Check if back to normal
   min_stock = 5
   new_stock = 14.68
   14.68 > 5? YES ✓
   status = NORMAL

7. Send confirmation SMS to manager
   "Stock updated: Tomato Puree now 14.68 kg. 
    Status: NORMAL"
```

### Manager Sees Update

```
Inventory page refreshes:
Before: Tomato Puree 4.68 kg ⚠️ LOW_STOCK
After:  Tomato Puree 14.68 kg ✓ NORMAL

Alert cleared! ✅
```

---

## 2:00 PM Same Day - Chef Discards Expired Stock

### Chef Finds Expired Ingredient

```
Chef cleaning kitchen storage:
"This batch of Butter expired on 2024-10-20, 
it's October 22 now. Need to throw away."

Butter on shelf: 1.5 kg package
```

### Manager Records Wastage

**Manager Action**: Log waste

```bash
POST /api/inventory/wastage
Headers:
  Authorization: Bearer <manager_token>
Body:
{
  "ingredient_id": "inv-126",
  "quantity": 1.5,
  "reason": "EXPIRED",
  "expiry_date": "2024-10-20",
  "notes": "Found in storage, disposed safely"
}
```

**Inventory Service Processing**:

```
1. Find current stock
   SELECT current_stock FROM inventory WHERE id = 'inv-126'
   → 14.68 kg

2. Deduct wastage
   new_stock = 14.68 - 1.5 = 13.18 kg

3. Update PostgreSQL
   UPDATE inventory
   SET current_stock = 13.18
   WHERE id = 'inv-126'

4. Record wastage
   INSERT INTO wastage (
     inventory_id, quantity, reason,
     cost_impact, recorded_by
   ) VALUES (
     'inv-126', 1.5, 'EXPIRED',
     180,  // 1.5 kg × ₹120/kg
     'manager1'
   )

5. Analytics Service notified
   → Records cost loss: ₹180
   → Updates daily waste report
   → Manager sees in end-of-day report

6. Send alert to manager
   "Wastage recorded: Butter 1.5 kg (expired). 
    Cost loss: ₹180"
```

### Wastage Appears in Reports

```
End-of-day wastage report:
- Expired items: ₹180
- Damaged items: ₹45
- Total waste today: ₹225

Manager reviews:
"Tomato Puree expired too much yesterday. 
Need better ordering strategy."
```

---

## Stock Status States

```
NORMAL
├─ Stock > min_stock_level
├─ Availability: Available ✓
└─ Menu items: Enabled ✓

    ↓ (Order placed, stock depletes)

LOW_STOCK
├─ Stock < min_stock_level AND > 0
├─ Status: ⚠️ ALERT SENT
├─ Availability: Available (unless disabled)
├─ Menu items: Enabled (unless disabled)
└─ Manager SMS: SENT

    ↓ (More orders, stock further depletes)

CRITICAL
├─ Stock ≈ 0 kg
├─ Status: 🚨 CRITICAL
└─ Menu items: DISABLED
    (Chef can't receive more orders for this dish)

    ↓ (Restock delivery arrives)

NORMAL
├─ Stock back above minimum
└─ Menu items: RE-ENABLED ✓
```

---

## Inventory Reservation (Advanced)

### Optional: Pre-Reserve Stock for Large Orders

```
If large event/catering order:

1. Customer orders: 50x Butter Chicken (needs 10 kg chicken)
2. Current stock: 12 kg
3. System could reserve: 10 kg for this order
4. Remaining available: 2 kg (for regular customers)

Stock movements:
- Available: 12 kg
- Reserved: 10 kg
- Available for new orders: 2 kg

If order cancelled:
- Reservation released
- Available increases back to 12 kg
```

---

## Real-Time Inventory Dashboard

### Manager Views Live Updates

```
POST /api/inventory/stock (with live updates)

Manager's dashboard shows:
┌─────────────────────────────────────────┐
│ LIVE INVENTORY TRACKER                  │
├─────────────────────────────────────────┤
│ Ingredient        │ Stock    │ Status   │
├─────────────────────────────────────────┤
│ Chicken Breast    │ 35.2 kg  │ ✓ OK     │
│ Butter            │ 12.1 kg  │ ✓ OK     │
│ Tomato Puree      │ 3.2 kg   │ ⚠️ LOW   │
│ Paneer            │ 8.5 kg   │ ✓ OK     │
│ Flour             │ 25.0 kg  │ ✓ OK     │
├─────────────────────────────────────────┤
│ Last updated: 2 seconds ago              │
│ Orders processing: 3 active              │
└─────────────────────────────────────────┘

Auto-refreshes every 10 seconds
Shows real-time deductions as orders come in
```

---

## Error Scenarios

| Scenario | Detection | Action |
|----------|-----------|--------|
| Stock goes negative | Never (validations prevent) | Order rejected before creation |
| Duplicate stock adjustment | Idempotency checks | Only applies once |
| Expired stock ordered | Expiry date check | Item marked unavailable |
| Supplier sends wrong quantity | Manager verifies | Adjust recorded quantity |
| Network fails during deduction | Kafka retry logic | Automatic retry every 5 min |

---

## Performance Metrics

| Operation | Time (ms) | Notes |
|-----------|-----------|-------|
| Get all stock | 50-100 | Redis cached |
| Get single ingredient | 10-30 | Redis cached |
| Deduct stock (order) | 100-150 | DB write + cache update |
| Record wastage | 80-120 | DB write |
| Adjust stock (restock) | 100-150 | DB write + SMS |
| Low stock alert | 50-80 | Kafka publish |
| SMS delivery | 1000-3000 | External provider |

---

**See Also**:
- [INVENTORY_SERVICE.md](../services/INVENTORY_SERVICE.md) - Detailed endpoints
- [ORDERING_WORKFLOW.md](./ORDERING_WORKFLOW.md) - Complete order journey
- [ANALYTICS_SERVICE.md](../services/ANALYTICS_SERVICE.md) - Wastage reporting
