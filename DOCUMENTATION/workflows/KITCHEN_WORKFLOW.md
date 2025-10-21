# Kitchen Staff Workflow - Complete Guide

**Timeline**: Order arrives on kitchen display → Preparation → Status updates → Order served  
**Services Involved**: Order Service, Notification Service  
**Key Actors**: Kitchen staff, chefs, order tracker

---

## Overview

This workflow describes **how kitchen staff process orders** from receiving to serving, with real-time status updates throughout preparation.

---

## 7:08 PM - Order Arrives on Kitchen Display

### New Order Notification

```
Kitchen Display System (KDS) at:
- Kitchen counter
- Tablet/monitor showing orders
- Sound alert: Beep! Beep!

Display shows new order:
┌─────────────────────────────┐
│ 🔴 NEW ORDER                │
├─────────────────────────────┤
│ ORDER #XYZ                  │
│ Table 5                     │
├─────────────────────────────┤
│ 2x Butter Chicken (15 mins) │
│ 3x Naan (10 mins)           │
│ Special Req: Extra spicy    │
├─────────────────────────────┤
│ Total: ₹1,250               │
│ Payment: PAID ✓             │
│                             │
│ STATUS: RECEIVED            │
│ [START COOKING]             │
└─────────────────────────────┘

Sound: "New order! Table 5!"
Staff immediately know:
✓ Order number: XYZ
✓ Table number: 5
✓ What to cook
✓ Estimated times
✓ Payment confirmed
```

### Kitchen Staff Action: Start Cooking

**Kitchen staff** clicks or taps: **[START COOKING]** button

```
Action initiates:
POST /api/orders/order-xyz/status-update

Headers:
  Authorization: Bearer <kitchen_staff_token>
  X-Tenant-ID: 11111111-1111-1111-1111-111111111111

Body:
{
  "new_status": "PREPARING",
  "notes": "Started cooking - 2 Butter Chicken, 3 Naan"
}
```

---

## 7:08:05 PM - Order Status Updated to PREPARING

### Order Service Updates Status

```
1. Receive status update request
2. Validate:
   - Order exists? ✓
   - Is staff authorized? ✓
   - Valid status transition? RECEIVED → PREPARING ✓
3. Update database:
   UPDATE orders
   SET overall_status = 'PREPARING',
       status_updated_at = now(),
       started_by = 'kitchen_staff1'
   WHERE id = 'order-xyz'
4. Publish Kafka event: order.status_changed
   {
     "event": "order.status_changed",
     "order_id": "order-xyz",
     "from_status": "RECEIVED",
     "to_status": "PREPARING",
     "updated_by": "kitchen_staff1",
     "timestamp": "2024-10-22T19:08:05Z"
   }
```

### Notification Service Publishes Alert

```
Event subscribers:
1. Customer notified
2. Kitchen display updates
3. Waiter/manager dashboard updates
```

### Customer Receives SMS

**Notification Service**:
```
SMS: "Your order #XYZ at Spice Route is being prepared.
Est. ready in 15 minutes. 🍳"

Sent via Twilio: 1-3 seconds
Customer sees food is being cooked ✓
```

### Kitchen Display Updates

```
Order on display changes:

Before:
┌─────────────────────────────┐
│ 🔴 NEW ORDER                │
│ [START COOKING]             │
└─────────────────────────────┘

After:
┌─────────────────────────────┐
│ 🟡 PREPARING                │
│ Started at 7:08 PM          │
│ Est. ready: 7:23 PM         │
│ 15 minutes remaining        │
│ [READY] [CANCEL]            │
└─────────────────────────────┘

Color change: Red → Yellow
Staff know: Order is actively being cooked
```

---

## 7:08:30 PM - Kitchen Starts Cooking Individual Items

### Timeline of Preparation

```
7:08:30 - Naan section starts 3x Naan
          "Going into tandoor, 10 minutes"

7:09:00 - Sauce section starts Butter Chicken sauce
          "Onions and tomatoes going in"

7:10:00 - Protein section boils chicken
          "Raw chicken in water, 8 mins to boil"

7:15:00 - Naan ready (10 mins elapsed)
          Takes out of tandoor, puts on plate
          Kitchen staff thinks: "First item ready, mark in system"

7:16:00 - Chicken boiled
          Transfers to ghee sauce
          "Simmering now, 5 more minutes"

7:18:00 - Sauce done, chicken finalized
          "Butter chicken ready!"

7:20:00 - Final plating
          Both items ready, placed on table
          "Order complete!"
```

### Kitchen Staff Updates Items As They Complete

When Naan finishes (7:15 PM):

```
Kitchen staff clicks on dish:
"3x Naan" → taps [ITEM READY]

POST /api/orders/order-xyz/items/item-status-update

Body:
{
  "item_id": "item-456",  // Naan item
  "status": "ITEM_READY",
  "completed_at": "2024-10-22T19:15:00Z",
  "prepared_by": "chef_ravi"
}

Kitchen Display updates:
┌─────────────────────────────┐
│ 🟡 PREPARING                │
│ [✓] 3x Naan (ready)         │
│ [⏱️] 2x Butter Chicken (5m) │
│ Overall: 7 mins remaining   │
└─────────────────────────────┘
```

When Butter Chicken finishes (7:20 PM):

```
Kitchen staff marks last item ready:
POST /api/orders/order-xyz/items/item-status-update

Body:
{
  "item_id": "item-789",
  "status": "ITEM_READY",
  "completed_at": "2024-10-22T19:20:00Z",
  "prepared_by": "chef_akshay"
}

All items complete!
Order Service checks: All items marked ITEM_READY?
YES ✓ → Update order status to READY
```

---

## 7:20:05 PM - All Items Ready, Order Status → READY

### Order Service Auto-Updates Status

```
Order Service logic:
1. Check: Are ALL items in order marked ITEM_READY?
2. Query:
   SELECT COUNT(*) as total_items,
          COUNT(CASE WHEN status = 'ITEM_READY' THEN 1 END) as ready_items
   FROM order_items
   WHERE order_id = 'order-xyz'

3. Result: total_items = 2, ready_items = 2 ✓
4. All items ready!
5. Update order:
   UPDATE orders
   SET overall_status = 'READY',
       ready_at = now()
   WHERE id = 'order-xyz'
6. Publish Kafka event: order.status_changed
   {
     "event": "order.status_changed",
     "order_id": "order-xyz",
     "from_status": "PREPARING",
     "to_status": "READY",
     "timestamp": "2024-10-22T19:20:05Z"
   }
```

### Kitchen Display Shows Order Ready

```
Order display changes:

Before:
┌─────────────────────────────┐
│ 🟡 PREPARING                │
│ [✓] 3x Naan (ready)         │
│ [✓] 2x Butter Chicken (r)   │
└─────────────────────────────┘

After:
┌─────────────────────────────┐
│ 🟢 READY FOR PICKUP!        │
│ Table 5                     │
│ ORDER #XYZ                  │
│                             │
│ [✓] All items prepared      │
│ Ready time: 7:20 PM         │
│ Total time: 12 minutes      │
│                             │
│ [SERVED] [CANCEL]           │
└─────────────────────────────┘

SOUND ALERT: "Ding! Order ready for table 5!"
```

### Waiter Gets Notification

**Notification Service** publishes to waiter:

```
Dashboard or SMS alert:
"Order #XYZ ready for pickup at Table 5"

Waiter app shows:
✓ Order XYZ
✓ Table 5
✓ Ready now
✓ Tap to confirm pickup
```

### Customer Gets Alert

**SMS from Notification Service**:

```
"Your order #XYZ is ready! Please come pick it up.
🍽️ Table 5 at Spice Route"

Customer sees: Food is ready now!
```

---

## 7:22 PM - Waiter Picks Up Order

### Waiter Picks Up Food

```
Waiter goes to kitchen counter
Sees order #XYZ plated and ready
Picks up plates
Carries to Table 5
Serves to customer
Asks: "Enjoy your meal!"
```

### Waiter Marks as Served

Kitchen staff or waiter taps: **[SERVED]**

```
POST /api/orders/order-xyz/status-update

Headers:
  Authorization: Bearer <waiter_token>

Body:
{
  "new_status": "SERVED",
  "notes": "Served at table",
  "served_by": "waiter_priya"
}
```

### Order Status → SERVED

```
1. Order Service updates:
   UPDATE orders
   SET overall_status = 'SERVED',
       served_at = now(),
       served_by = 'waiter_priya'
   WHERE id = 'order-xyz'

2. Publish Kafka event: order.status_changed
   {
     "event": "order.status_changed",
     "order_id": "order-xyz",
     "from_status": "READY",
     "to_status": "SERVED",
     "timestamp": "2024-10-22T19:22:00Z"
   }

3. Kitchen Display removes order:
   Order disappears from "Ready" section
   (or shows as "SERVED - Complete")
```

---

## Special Cases During Cooking

### Case 1: Item Needs Extra Time

```
7:18 PM - Chef realizes Butter Chicken needs 5 more minutes
         (cream didn't reduce enough)

Chef action:
POST /api/orders/order-xyz/notes-update

Body:
{
  "note": "Butter Chicken needs 5 more minutes - cream reducing",
  "delay_estimate": 5
}

Kitchen Display updates:
┌─────────────────────────────┐
│ ⏱️ DELAYED (5 mins extra)   │
│ Reason: Sauce reduction     │
│ New ETA: 7:25 PM            │
└─────────────────────────────┘

Notification Service notifies:
- Waiter: "XYZ delayed 5 mins - 7:25 PM ready"
- Customer: "Your order will be ready in 5 more minutes"
```

### Case 2: Item Out of Stock During Cooking

```
7:10 PM - Chef realizes Butter is running low
         "We're out of butter!"

Chef can't complete Butter Chicken without butter
Chef/Manager action:

POST /api/orders/order-xyz/item-status-update

Body:
{
  "item_id": "item-789",
  "status": "ITEM_ISSUE",
  "issue_type": "OUT_OF_STOCK",
  "message": "Butter unavailable - cannot prepare"
}

Order Service detects issue:
→ Updates order to "ON_HOLD"
→ Notifies manager & customer
→ Manager decides: refund, substitute, or wait
→ Inventory team rushes replacement butter
```

### Case 3: Kitchen Staff Cancels Order

```
7:12 PM - Customer comes to order counter
         "Cancel my order, I'm leaving!"

Waiter calls Order Service:

PATCH /api/orders/order-xyz/cancel

Body:
{
  "reason": "Customer request"
}

Order Service:
1. Check status: PREPARING
2. Safe to cancel? YES (not yet served)
3. Update order:
   UPDATE orders
   SET overall_status = 'CANCELLED',
       cancelled_at = now(),
       cancellation_reason = 'customer_request'
   WHERE id = 'order-xyz'

4. Kitchen Display removes order
   Alert: "ORDER CANCELLED #XYZ"
   (removes from active queue)

5. Chef stops cooking:
   "Forget Butter Chicken XYZ, order cancelled"

6. Payment Service issues refund
7. Notification Service sends SMS:
   "Your order has been cancelled. Refund processed."
```

### Case 4: Multiple Orders in Queue Priority

```
Kitchen Display shows queue:

[PRIORITY 1]
┌─────────────────────────────┐
│ 🔴 NEW - ORDER #PQR         │
│ Table 3 - VIP Customer      │
│ 2x Biryani (20 mins)        │
│ Priority: HIGH              │
├─────────────────────────────┤
│ [START COOKING]             │
└─────────────────────────────┘

[PRIORITY 2]
┌─────────────────────────────┐
│ 🟡 PREPARING - ORDER #XYZ   │
│ Table 5                     │
│ 2x Butter Chicken (5 mins)  │
│ Progress: 85% done          │
└─────────────────────────────┘

[PRIORITY 3]
┌─────────────────────────────┐
│ 🟡 PREPARING - ORDER #ABC   │
│ Table 2                     │
│ 3x Naan (15 mins)           │
│ Progress: 40% done          │
└─────────────────────────────┘

Chef sees: XYZ finishing soon (5 mins) = HIGH
          PQR just arrived = HIGH  
          ABC has time = MEDIUM

Chef prioritizes: Finish XYZ → Start PQR → Continue ABC
```

---

## End of Evening - Close Order

### 9:50 PM - Customer Finishes, Calls for Bill

```
Customer signals waiter: "Bill please"
Waiter goes to register
```

### Waiter Marks Order Complete

```
POST /api/orders/order-xyz/status-update

Body:
{
  "new_status": "COMPLETED",
  "notes": "Customer finished eating, bill settled",
  "completed_by": "waiter_priya",
  "paid_at": "2024-10-22T21:50:00Z"
}

Order Service:
1. Update:
   UPDATE orders
   SET overall_status = 'COMPLETED',
       completed_at = now(),
       completed_by = 'waiter_priya'
   WHERE id = 'order-xyz'

2. Publish Kafka event: order.completed
   {
     "event": "order.completed",
     "order_id": "order-xyz",
     "total_time_minutes": 102,
     "timestamp": "2024-10-22T21:50:00Z"
   }

3. Analytics Service records:
   - Order duration: 102 minutes
   - Total revenue: ₹1,250
   - Payment method: RAZORPAY
   - Customer satisfaction data
```

### Kitchen Display Archive

```
Order #XYZ marked as COMPLETED
- Removed from active queue
- Added to "Completed Orders" section
- Archived for record-keeping
- Shows in end-of-day report
```

---

## Kitchen Staff Dashboard Throughout Day

### Real-Time Order Summary

```
Dashboard shows:
┌────────────────────────────────┐
│ KITCHEN STATUS - 7:45 PM       │
├────────────────────────────────┤
│ Active Orders: 7               │
│ ├─ New (Received): 1           │
│ ├─ Preparing: 4                │
│ ├─ Ready (waiting pickup): 2   │
│                                │
│ Recent Completions:            │
│ ✓ Order #ABC (12 mins)         │
│ ✓ Order #DEF (14 mins)         │
│                                │
│ Average Cook Time: 13 mins     │
│ Efficiency: 95%                │
└────────────────────────────────┘
```

### Order History

```
Completed Orders Today:
- 7:20 PM: #XYZ (12 mins) - Table 5
- 7:25 PM: #ABC (14 mins) - Table 2
- 7:30 PM: #DEF (15 mins) - Table 8
- 7:35 PM: #GHI (11 mins) - Table 1
...
(Total: 156 orders completed today)
```

---

## Performance Metrics

| Metric | Time | Target |
|--------|------|--------|
| Order received to cooking started | 1-3 min | < 5 min |
| Cooking time (avg) | 13-15 min | < 20 min |
| Ready to served | 2-5 min | < 10 min |
| Order cancelled | < 30 sec | < 1 min |
| Item status update | < 10 sec | < 30 sec |

---

## Error Scenarios

| Issue | Detection | Action |
|-------|-----------|--------|
| Order not received by kitchen | Manual check | Resend/push notification |
| Long cooking time | Timer expires | Alert manager, check status |
| Item quality issue | Chef inspection | Cancel item, refund, substitute |
| Kitchen crashes | System monitor | Alerts all staff, manual backup |
| Order double-prepared | Validation check | Cancel duplicate, use first prep |

---

**See Also**:
- [ORDER_SERVICE.md](../services/ORDER_SERVICE.md) - Order status details
- [ORDERING_WORKFLOW.md](./ORDERING_WORKFLOW.md) - Complete customer journey
- [NOTIFICATION_SERVICE.md](../services/NOTIFICATION_SERVICE.md) - Alert system
