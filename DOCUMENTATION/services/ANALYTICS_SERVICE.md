# Analytics Service - Complete Guide

**Port**: 3107  
**Language**: TypeScript (NestJS)  
**Database**: PostgreSQL + Time-series data  
**Message Queue**: Kafka (events subscription)  
**Monitoring**: Prometheus metrics  
**Responsibility**: Collect metrics, generate reports, track KPIs

---

## What Analytics Service Does

Analytics Service is the **insights engine**:

- ✅ Collect order metrics
- ✅ Track revenue and sales
- ✅ Monitor payment methods
- ✅ Customer analytics
- ✅ Popular dishes tracking
- ✅ Performance reports
- ✅ Prometheus metrics for monitoring

---

## Metrics Collection

### Order Metrics

```
Event: order.created
Analytics logs:
- Order ID
- Total amount
- Item count
- Category breakdown
- Customer ID
- Time of order
- Tenant ID

Aggregates:
- Total orders today
- Revenue today
- Average order value
- Orders by category
```

### Revenue Tracking

```
Event: payment.completed
Analytics logs:
- Payment amount
- Payment method
- Order ID
- Customer ID
- Timestamp
- Discount applied

Aggregates:
- Total revenue today
- Revenue by payment method (RAZORPAY, CASH)
- Average transaction value
- Payment success rate
```

### Dish Popularity

```
Event: order.created (items in order)
Analytics logs:
- Menu item ID
- Menu item name
- Quantity ordered
- Category
- Price
- Profit margin

Aggregates:
- Most ordered dishes
- Least popular dishes
- Revenue by dish
- Dish trend (trending up/down)
```

---

## Analytics Endpoints

### Dashboard Summary

```
GET /api/analytics/dashboard?date=2024-10-22

Response:
{
  "success": true,
  "data": {
    "summary": {
      "total_orders": 156,
      "total_revenue": 187500,
      "average_order_value": 1202,
      "total_customers": 89,
      "avg_items_per_order": 3.2
    },
    "revenue_breakdown": {
      "cash": 95000,
      "razorpay": 92500,
      "payment_method_distribution": {
        "CASH": 50.67,
        "RAZORPAY": 49.33
      }
    },
    "top_dishes": [
      {
        "name": "Butter Chicken",
        "quantity": 34,
        "revenue": 11900,
        "popularity_score": 0.92
      },
      {
        "name": "Paneer Tikka",
        "quantity": 28,
        "revenue": 7840,
        "popularity_score": 0.88
      }
    ],
    "order_timeline": [
      {
        "hour": 12,
        "orders": 45,
        "revenue": 52500
      },
      {
        "hour": 13,
        "orders": 38,
        "revenue": 48100
      }
    ]
  }
}
```

### Revenue Report

```
GET /api/analytics/revenue?start_date=2024-10-15&end_date=2024-10-22

Response:
{
  "success": true,
  "data": {
    "period": {
      "start": "2024-10-15",
      "end": "2024-10-22"
    },
    "total_revenue": 1312500,
    "average_daily_revenue": 164062,
    "daily_breakdown": [
      {
        "date": "2024-10-15",
        "revenue": 145000,
        "orders": 128,
        "avg_order_value": 1133
      },
      {
        "date": "2024-10-22",
        "revenue": 187500,
        "orders": 156,
        "avg_order_value": 1202
      }
    ],
    "payment_methods": {
      "cash": 665000,
      "razorpay": 647500
    },
    "growth": {
      "revenue_growth_pct": 12.5,
      "order_growth_pct": 8.2
    }
  }
}
```

### Customer Analytics

```
GET /api/analytics/customers?date=2024-10-22

Response:
{
  "success": true,
  "data": {
    "total_unique_customers": 89,
    "new_customers": 23,
    "returning_customers": 66,
    "customer_retention": 0.74,
    "customer_segments": {
      "high_value": 12,
      "medium_value": 34,
      "low_value": 43
    },
    "average_customer_lifetime_value": 4850,
    "customer_lifetime_orders": 2.8
  }
}
```

---

## Database Schema

```typescript
model OrderMetric {
  id                      String   @id @default(uuid())
  tenant_id               String
  order_id                String
  total_amount            Decimal
  discount_applied        Decimal
  item_count              Int
  category_breakdown      Json
  customer_id             String
  payment_method          String
  created_date            DateTime
  created_at              DateTime @default(now())

  @@index([tenant_id])
  @@index([created_date])
  @@index([customer_id])
  @@map("order_metrics")
}

model RevenueMetric {
  id                      String   @id @default(uuid())
  tenant_id               String
  order_id                String
  payment_amount          Decimal
  payment_method          String
  discount                Decimal
  net_revenue             Decimal
  recorded_date           DateTime
  recorded_at             DateTime @default(now())

  @@index([tenant_id])
  @@index([recorded_date])
  @@map("revenue_metrics")
}

model DishMetric {
  id                      String   @id @default(uuid())
  tenant_id               String
  menu_item_id            String
  menu_item_name          String
  quantity_sold           Int
  revenue_generated       Decimal
  category                String
  recorded_date           DateTime
  recorded_at             DateTime @default(now())

  @@index([tenant_id])
  @@index([recorded_date])
  @@index([menu_item_id])
  @@map("dish_metrics")
}

model CustomerMetric {
  id                      String   @id @default(uuid())
  tenant_id               String
  customer_id             String
  total_orders            Int
  total_spent             Decimal
  avg_order_value         Decimal
  last_order_date         DateTime
  first_order_date        DateTime
  recorded_at             DateTime @default(now())

  @@index([tenant_id])
  @@index([customer_id])
  @@map("customer_metrics")
}
```

---

## Kafka Event Processing

### Events Consumed

```
1. order.created
   → Log order metrics
   → Update customer metrics

2. payment.completed
   → Log revenue metric
   → Update payment method distribution

3. order.cancelled
   → Deduct from daily totals
   → Update churn metrics

4. order.items_modified
   → Recalculate metrics
   → Update dish popularity
```

### Real-time Dashboard Update

```
Every 30 seconds:
Analytics calculates:
- Current hour metrics
- Running total for day
- Trending dishes
- Payment success rate
Broadcasts via WebSocket to dashboard
```

---

## Prometheus Metrics

### Exposed Metrics

```
# HELP intellidine_orders_total Total orders created
# TYPE intellidine_orders_total counter
intellidine_orders_total{tenant_id="111..."} 156

# HELP intellidine_revenue_total Total revenue in INR
# TYPE intellidine_revenue_total counter
intellidine_revenue_total{tenant_id="111..."} 187500

# HELP intellidine_avg_order_value Average order value
# TYPE intellidine_avg_order_value gauge
intellidine_avg_order_value{tenant_id="111..."} 1202

# HELP intellidine_dishes_sold Total dishes sold
# TYPE intellidine_dishes_sold counter
intellidine_dishes_sold{tenant_id="111...", dish="Butter Chicken"} 34

# HELP intellidine_payment_success_rate Payment success rate
# TYPE intellidine_payment_success_rate gauge
intellidine_payment_success_rate{tenant_id="111..."} 0.985
```

### Grafana Dashboard

Visualizations:
- Revenue trend (line chart)
- Orders by hour (bar chart)
- Top dishes (pie chart)
- Payment methods (donut chart)
- Customer segments (scatter)

---

## Endpoints Summary

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| `GET` | `/api/analytics/dashboard` | Daily dashboard | JWT + MANAGER |
| `GET` | `/api/analytics/revenue` | Revenue report | JWT + MANAGER |
| `GET` | `/api/analytics/customers` | Customer analytics | JWT + MANAGER |
| `GET` | `/api/analytics/dishes` | Dish popularity | JWT + MANAGER |
| `GET` | `/api/analytics/trends` | Trend analysis | JWT + MANAGER |
| `GET` | `/api/analytics/metrics` | Prometheus metrics | No Auth (internal) |

---

## Real-World Scenarios

### Scenario 1: End of Day Summary

```
10:00 PM - Manager views daily summary:
1. Calls: GET /api/analytics/dashboard?date=2024-10-22
2. Analytics Service queries last 24 hours
3. Returns:
   - Total orders: 156
   - Revenue: ₹187,500
   - Avg order: ₹1,202
   - Top dish: Butter Chicken (34 orders)
   - Payment: Cash 50%, Razorpay 50%
4. Manager reviews performance vs target
```

### Scenario 2: Weekly Revenue Trend

```
Monday - Manager views weekly performance:
1. Calls: GET /api/analytics/revenue?start=10-15&end=10-22
2. Returns:
   - Week revenue: ₹1,312,500
   - Daily average: ₹164,062
   - Growth vs previous week: +12.5%
   - Best day: Sunday (₹187,500)
   - Payment method breakdown
3. Manager identifies Sunday = peak day
```

### Scenario 3: Prometheus Scrape

```
Every 1 minute - Prometheus server scrapes metrics:
1. GET http://localhost:3107/metrics
2. Receives all counters and gauges
3. Stores time-series data
4. Grafana dashboard updates
5. Manager sees live trends in dashboard
```

---

## Performance Characteristics

- **Dashboard query**: 500-800ms (aggregates from database)
- **Revenue report**: 1-2 seconds (date range query)
- **Customer analytics**: 800ms-1s
- **Metrics exposition**: 100-150ms (Prometheus)
- **Real-time update**: Every 30 seconds via WebSocket

---

## Testing Analytics Service

```bash
# Get dashboard summary
curl http://localhost:3107/api/analytics/dashboard?date=2024-10-22 \
  -H "Authorization: Bearer <token>"

# Get revenue report
curl http://localhost:3107/api/analytics/revenue \
  ?start_date=2024-10-15&end_date=2024-10-22 \
  -H "Authorization: Bearer <token>"

# Get customer analytics
curl http://localhost:3107/api/analytics/customers \
  -H "Authorization: Bearer <token>"

# Get Prometheus metrics
curl http://localhost:3107/metrics
```

---

**See Also**:
- [SYSTEM_OVERVIEW.md](../SYSTEM_OVERVIEW.md) - Analytics in architecture
- Prometheus config: `monitoring/prometheus/prometheus.yml`
