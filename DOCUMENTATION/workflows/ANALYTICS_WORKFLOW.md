# Manager Analytics & Reporting Workflow

**Timeline**: Daily end-of-service → Weekly/monthly reviews → Business decisions  
**Services Involved**: Analytics Service, Prometheus, Grafana  
**Key Actors**: Restaurant manager, owner

---

## Overview

This workflow describes **how managers use analytics data** to understand business performance, identify trends, and make operational decisions.

---

## 10:00 PM - End of Service Dashboard

### Manager Views Daily Summary

**Manager Action**: Open dashboard

```
GET /api/analytics/dashboard?date=2024-10-22

Response:
{
  "summary": {
    "total_orders": 156,
    "total_revenue": 187500,
    "average_order_value": 1202,
    "total_customers": 89,
    "avg_items_per_order": 3.2,
    "service_hours": 4,  // 5-9 PM
    "peak_hour": "7-8 PM with 45 orders"
  }
}
```

### Daily Dashboard Display

```
Manager sees:

┌────────────────────────────────────┐
│ SPICE ROUTE - DAILY REPORT         │
│ October 22, 2024                   │
├────────────────────────────────────┤
│ Revenue:                           │
│ ├─ Total: ₹187,500 📈             │
│ ├─ Avg Order: ₹1,202              │
│ ├─ Target: ₹150,000               │
│ └─ Performance: +25% vs target ✓   │
├────────────────────────────────────┤
│ Orders:                            │
│ ├─ Total Orders: 156              │
│ ├─ Unique Customers: 89           │
│ ├─ Repeat Customers: 18           │
│ └─ New Customers: 71              │
├────────────────────────────────────┤
│ Payment Methods:                   │
│ ├─ Online (Razorpay): ₹95,000 51% │
│ ├─ Cash: ₹92,500 49%              │
├────────────────────────────────────┤
│ Top Dishes:                        │
│ 1. Butter Chicken (34 orders)     │
│ 2. Paneer Tikka (28 orders)       │
│ 3. Naan (52 orders)               │
│ 4. Biryani (22 orders)            │
│ 5. Samosa (18 orders)             │
├────────────────────────────────────┤
│ Operational Metrics:               │
│ ├─ Avg Cook Time: 13 mins         │
│ ├─ Dishes Wasted: ₹225            │
│ ├─ Wastage %: 0.12%               │
│ └─ Staff Efficiency: 95%          │
└────────────────────────────────────┘
```

### Manager Insights

Manager immediately sees:
- ✓ Revenue +25% above target
- ✓ Payment split: 50% online, 50% cash (healthy mix)
- ✓ Top dish: Butter Chicken (good margin)
- ✓ Low wastage: only 0.12% (excellent)
- ✓ High efficiency: 95%

**Action**: No immediate action needed, excellent performance!

---

## Analysis 1: Peak Hour Optimization

### View Hour-by-Hour Breakdown

```
Manager clicks: "View Hour Details"

GET /api/analytics/dashboard/breakdown?type=hourly&date=2024-10-22

Response:
{
  "hourly_breakdown": [
    {
      "hour": "5:00 PM - 6:00 PM",
      "orders": 12,
      "revenue": 14400,
      "avg_wait_time": 8,
      "status": "SLOW"
    },
    {
      "hour": "6:00 PM - 7:00 PM",
      "orders": 28,
      "revenue": 32500,
      "avg_wait_time": 12,
      "status": "MODERATE"
    },
    {
      "hour": "7:00 PM - 8:00 PM",
      "orders": 65,
      "revenue": 78000,
      "avg_wait_time": 14,
      "status": "PEAK"
    },
    {
      "hour": "8:00 PM - 9:00 PM",
      "orders": 51,
      "revenue": 62600,
      "avg_wait_time": 13,
      "status": "HIGH"
    }
  ]
}
```

### Manager Observations

```
Peak hour: 7:00 PM - 8:00 PM
├─ 65 orders (42% of daily total)
├─ ₹78,000 revenue (42% of daily)
├─ 14-min avg wait time (acceptable)
├─ Kitchen efficiency: 95%
│
Opportunity:
├─ If we added 1 more chef at peak → +10% throughput
├─ Could serve 71 orders instead of 65
├─ +₹7,800 additional revenue
│
Decision:
├─ Peak hour staffing: Adequate for current demand
├─ Consider hiring if growth continues
└─ Monitor next week for trends
```

---

## Analysis 2: Customer Segmentation

### View Customer Breakdown

```
GET /api/analytics/customers?date=2024-10-22

Response:
{
  "customer_segments": {
    "high_value": 12,      // Spent >₹2000 each
    "medium_value": 34,    // Spent ₹1000-2000
    "low_value": 43        // Spent <₹1000
  },
  "customer_types": {
    "new_customers": 71,
    "returning_customers": 18,
    "vip_customers": 2
  },
  "retention_rate": 0.20   // 20% of customers ordered before
}
```

### Manager Analysis

```
Customer breakdown:
├─ New: 71 customers (80%)
│  └─ Great! High customer acquisition
│
├─ Returning: 18 customers (20%)
│  └─ Low retention, need improvement!
│
└─ VIP: 2 customers
   ├─ Each spent ₹4,500
   └─ Should special attention

Concern: Only 20% retention rate (industry standard 40%)

Action Items:
1. Analyze why new customers don't return
   - Is it pricing? Quality? Experience?
   - Send feedback surveys
   
2. Create loyalty program
   - Offer "5th order = 20% off"
   - Track repeat visits
   - Target 40%+ retention

3. Personal outreach to VIP customers
   - Send thank you SMS
   - Invite for special events
   - Build relationship
```

---

## Analysis 3: Menu Performance & Optimization

### View Dish Profitability

```
GET /api/analytics/dishes

Response:
{
  "top_revenue_dishes": [
    {
      "name": "Butter Chicken",
      "orders": 34,
      "revenue": 11900,
      "cost_of_goods": 3400,
      "profit": 8500,
      "profit_margin": 71.4%
    },
    {
      "name": "Paneer Tikka",
      "orders": 28,
      "revenue": 7840,
      "cost_of_goods": 1960,
      "profit": 5880,
      "profit_margin": 75%
    }
  ],
  "lowest_margin_dishes": [
    {
      "name": "Naan",
      "orders": 52,
      "revenue": 2600,
      "cost_of_goods": 910,
      "profit": 1690,
      "profit_margin": 65%
    }
  ]
}
```

### Manager Insights

```
High Margin Items (75%+):
├─ Paneer Tikka: 75% margin ⭐
├─ Biryani: 72% margin
└─ Butter Chicken: 71% margin

Action: Promote these items
├─ Feature on QR menu (top position)
├─ Highlight on kitchen display
├─ Offer combo with naan
└─ Increase price by 5% (test market)

Low Margin Items (60-65%):
├─ Naan: 65% margin
├─ Samosa: 62% margin
└─ Even with low margins, high volume!

Strategy: Bundle Strategy
├─ Naan is side dish, always ordered
├─ Bundle with high-margin items
├─ "Butter Chicken + 2 Naan = special price"
├─ Increase basket size
└─ Improve overall profit

Decision:
├─ Keep Naan at current price (volume play)
├─ Create "Combo 1": Butter Chicken (₹350) + 2 Naan (₹50) = ₹380 total
├─ Regular: Butter Chicken ₹350 + Naan ₹25 × 2 = ₹400
└─ Combo saves customer ₹20, increases margin via volume
```

---

## 10:30 PM - Weekly Review

### Manager Views Weekly Analytics

```
GET /api/analytics/revenue?start_date=2024-10-16&end_date=2024-10-22

Response:
{
  "period": "Oct 16-22, 2024",
  "total_revenue": 1312500,
  "average_daily": 187500,
  "daily_breakdown": [
    { "date": "2024-10-16 (Tuesday)", "revenue": 145000 },
    { "date": "2024-10-17 (Wednesday)", "revenue": 156000 },
    { "date": "2024-10-18 (Thursday)", "revenue": 162000 },
    { "date": "2024-10-19 (Friday)", "revenue": 198000 },
    { "date": "2024-10-20 (Saturday)", "revenue": 210000 },
    { "date": "2024-10-21 (Sunday)", "revenue": 244500 },
    { "date": "2024-10-22 (Monday)", "revenue": 197000 }
  ],
  "trends": {
    "growth": 12.5,  // Week-over-week
    "weekend_vs_weekday": 1.42  // Weekend 42% higher
  }
}
```

### Weekly Observations

```
Revenue Trend:
┌────────────────────┐
│ ₹250k              │  🟩 Saturday ₹244k
│ ₹200k              │  🟩 Sunday ₹210k
│ ₹150k  🟩  🟩       │  🟩 Friday ₹198k
│ ₹100k  🟩  🟩  🟩   │
│ ₹50k   🟩  🟩  🟩   │
│ ₹0k                │
│  T  W  T  F  S  Su M
└────────────────────┘

Clear patterns:
├─ Weekdays: ₹145-165k
├─ Weekends: ₹210-244k (45% higher)
├─ Growth week-over-week: +12.5%
└─ Monday (today): ₹197k (above weekday avg!)

Insights:
├─ Weekend surge = celebration dining
├─ Monday high = holiday (Diwali coming)
├─ Trending: On track for 15% monthly growth
└─ Staff plans: Hire before holiday season
```

---

## Grafana Dashboard - Real-Time Monitoring

### Manager Views Prometheus Metrics

```
Open Grafana Dashboard:
http://localhost:3000/dashboard

Displayed Metrics:

1. Revenue Gauge
   Current: ₹187,500
   Target: ₹150,000
   Status: 125% ✓ (beating target)

2. Orders Line Chart (24-hour)
   Y-axis: Order count
   X-axis: Time
   Peak: 7 PM (65 orders)
   Trend: Climbing 5-9 PM

3. Average Order Value Trend
   Current: ₹1,202
   Previous week: ₹1,180
   Growth: +1.9%

4. Payment Method Breakdown (Pie)
   Razorpay: 51%
   Cash: 49%
   Ratio: Balanced

5. Top 5 Dishes (Bar Chart)
   Butter Chicken: 34
   Paneer Tikka: 28
   Naan: 52
   Biryani: 22
   Samosa: 18

6. Kitchen Efficiency
   Avg Cook Time: 13 min
   Orders On-Time: 95%
   Quality Issues: 0.5%
```

---

## Month-End Report (Last Day of Month)

### Generate Monthly Analytics

```
GET /api/analytics/revenue?start_date=2024-10-01&end_date=2024-10-31

Response:
{
  "month": "October 2024",
  "total_revenue": 5625000,
  "total_orders": 4850,
  "avg_daily_revenue": 181451,
  "growth_vs_september": 22.5,
  
  "top_performing_days": [
    { "date": "2024-10-26 (Saturday)", "revenue": 298500 },
    { "date": "2024-10-27 (Sunday)", "revenue": 325000 },
    { "date": "2024-10-28 (Monday)", "revenue": 287500 }
  ],
  
  "customer_metrics": {
    "total_unique_customers": 2450,
    "repeat_customers": 820,
    "retention_rate": 0.33,
    "avg_customer_ltv": 2295
  },
  
  "operational_metrics": {
    "avg_cook_time": 13.2,
    "on_time_delivery": 96.2,
    "customer_complaints": 12,
    "waste_percentage": 0.11
  },
  
  "inventory_metrics": {
    "total_wastage_cost": 4850,
    "stockouts": 3,
    "reorders": 28
  }
}
```

### Manager Creates Action Plan

```
October Performance Summary:

✓ SUCCESSES:
├─ Revenue: ₹5.625M (22.5% growth YoY)
├─ Orders: 4,850 (steady throughput)
├─ On-time delivery: 96.2% (excellent)
├─ Customer complaints: Only 12 (0.25%)
├─ Waste: 0.11% (minimal loss)
└─ Repeat customers: 33% (improving!)

⚠️ AREAS TO IMPROVE:
├─ 3 stockouts (rare items, acceptable)
├─ Retention: 33% (target 40%)
├─ Staff: Need 2 more chefs for winter surge
└─ Marketing: Need awareness campaign

🎯 NOVEMBER ACTION PLAN:

1. Retention Focus
   ├─ Launch loyalty program
   ├─ Send repeat customer SMS
   ├─ Create referral incentive
   └─ Target: 40% retention

2. Staffing
   ├─ Hire 2 chefs (training starts now)
   ├─ Cross-train waiters
   ├─ Prepare for Diwali surge (+30% expected)
   └─ Schedule: In place by Nov 1

3. Menu Optimization
   ├─ Highlight high-margin items (Paneer Tikka)
   ├─ Create 2 new combo offers
   ├─ Test ₹5-10 price increases on premium items
   └─ Monitor profit impact

4. Inventory Management
   ├─ Review 3 stockouts
   ├─ Improve supplier communication
   ├─ Implement auto-reorder thresholds
   └─ Target: Zero stockouts

5. Marketing
   ├─ Launch Instagram ads
   ├─ Email campaign to lapsed customers
   ├─ Promote Diwali special menu
   └─ Budget: ₹10,000/month
```

---

## Real-Time Alerts

### What Triggers Alerts

Manager's phone gets SMS if:

```
1. Revenue falls 30% below expected
   "Revenue alert: Expected ₹20k by 8 PM, got ₹14k"
   
2. Wait time exceeds threshold
   "Wait time alert: 25 min average (target 15 min)"
   
3. Order cancellation rate spikes
   "Cancellation alert: 8% today (normal 2%)"
   
4. Kitchen efficiency drops
   "Efficiency alert: 89% on-time (target 95%)"
   
5. Payment failures spike
   "Payment alert: 5% failure rate (target <1%)"
```

---

## Performance Benchmarks

| Metric | Target | October | Status |
|--------|--------|---------|--------|
| Daily Revenue | ₹150k+ | ₹181k | ✓ +21% |
| Average Order Value | ₹1,100+ | ₹1,160 | ✓ +5% |
| On-Time Delivery | 95%+ | 96.2% | ✓ Good |
| Customer Retention | 40%+ | 33% | ⚠️ Below |
| Waste Percentage | <0.2% | 0.11% | ✓ Excellent |
| Repeat Customers | 30%+ | 33% | ✓ Good |

---

**See Also**:
- [ANALYTICS_SERVICE.md](../services/ANALYTICS_SERVICE.md) - API endpoints
- [SYSTEM_OVERVIEW.md](../SYSTEM_OVERVIEW.md) - Monitoring setup
