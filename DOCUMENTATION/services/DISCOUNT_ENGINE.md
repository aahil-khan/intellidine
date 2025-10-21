# Discount Engine - Complete Guide

**Port**: 3104  
**Language**: Python (Flask)  
**Database**: PostgreSQL  
**ML Model**: XGBoost (Discount Prediction)  
**Responsibility**: Calculate discounts, predict customer offers, apply promotional rules

---

## What Discount Engine Does

Discount Engine is the **intelligent pricing system**:

- ✅ Calculate ML-predicted discounts per order
- ✅ Apply promotional rules (BOGO, seasonal, etc)
- ✅ Track discount history
- ✅ Validate discount codes
- ✅ Generate customer-specific offers
- ✅ A/B test discount strategies

---

## ML Discount Prediction

### How It Works

The Discount Engine uses **XGBoost model** to predict optimal discount per order:

```
Input Features:
1. Total amount (INR)
2. Order items count
3. Day of week
4. Time of day
5. Customer loyalty (order count)
6. Customer avg spend
7. Order frequency
8. Last order days ago
9. Dish category (vegetarian/non-veg)
10. Cuisine type
11. Is weekend/holiday

Model Output:
Discount class: 0%, 5%, 10%, 15%, or 20%
Confidence: 0.0-1.0

Decision Rule:
If confidence > 0.7 → apply predicted discount
If confidence < 0.7 → apply rule-based discount
```

### Real-Time Prediction

```
POST /api/discounts/predict

Body:
{
  "order_id": "order-xyz",
  "total_amount": 1250,
  "items_count": 4,
  "customer_id": "cust-abc",
  "day_of_week": "FRIDAY",
  "hour_of_day": 19,
  "customer_order_count": 15,
  "customer_avg_spend": 1100,
  "customer_order_frequency_days": 5
}

Response:
{
  "success": true,
  "data": {
    "discount_percentage": 10,
    "discount_amount": 125,
    "confidence": 0.85,
    "reason": "ML predicted optimal discount based on customer behavior",
    "model_version": "v2.1",
    "prediction_time_ms": 8
  }
}
```

**Backend Process**:
1. Feature engineering (extract from order data)
2. Load XGBoost model from memory
3. Make prediction (8-10ms)
4. Check confidence threshold
5. If confident → use ML prediction
6. If not confident → fallback to rules
7. Return discount percentage

### Model Performance

```
Accuracy: ~79%
Precision: 0.81
Recall: 0.77
ROC-AUC: 0.84

Test on 10,000 orders:
- 79% predictions match expected discount
- 15% under-predict (give more discount)
- 6% over-predict (give less discount)

Latency: 8-12ms per prediction
Memory: 25MB model size
```

---

## Promotional Rules

### Rule-Based Discount

```python
RULES = [
    {
        "name": "FRIDAY_NIGHT",
        "condition": {
            "day": "FRIDAY",
            "hour": [18, 19, 20, 21]
        },
        "discount": 10
    },
    {
        "name": "BOGO_MAIN_COURSE",
        "condition": {
            "items": ["MAIN_COURSE"],
            "min_items": 2
        },
        "discount": 15
    },
    {
        "name": "LOYALTY_5_ORDERS",
        "condition": {
            "order_count": {"min": 5}
        },
        "discount": 5
    },
    {
        "name": "SEASONAL_DIWALI",
        "condition": {
            "date_range": ["2024-10-31", "2024-11-05"]
        },
        "discount": 20
    }
]
```

### Apply Discount Code

```
POST /api/discounts/apply-code

Body:
{
  "order_id": "order-xyz",
  "discount_code": "WELCOME20",
  "total_amount": 1250
}

Response:
{
  "success": true,
  "data": {
    "code": "WELCOME20",
    "discount_percentage": 20,
    "discount_amount": 250,
    "applicable": true,
    "reason": "New customer promotional code",
    "usage_count": 1,
    "max_uses": 100
  }
}
```

---

## Discount Strategy Workflow

### Step 1: Check ML Prediction

```
Order comes in → Discount Engine checks
1. Extract features from order
2. Run XGBoost prediction
3. Get discount_percentage + confidence
4. If confidence > 0.7 → use this discount
5. If confidence < 0.7 → go to Step 2
```

### Step 2: Check Promotional Rules

```
If ML not confident:
1. Check date/time based rules (FRIDAY_NIGHT)
2. Check cart rules (BOGO)
3. Check customer rules (LOYALTY)
4. Return best matching rule discount
```

### Step 3: Apply Final Discount

```
Discount applied to Order:
- Original total: 1250
- Discount: 10% (125)
- Final total: 1125
- Sent to Payment Service
```

---

## Database Schema

```typescript
model DiscountPrediction {
  id                        String   @id @default(uuid())
  order_id                  String   @unique
  customer_id               String
  total_amount              Decimal
  predicted_discount_pct    Int
  predicted_discount_amt    Decimal
  ml_confidence             Float
  ml_model_version          String
  prediction_time_ms        Int
  applied_discount_pct      Int
  applied_discount_amt      Decimal
  discount_reason           String
  created_at                DateTime @default(now())

  @@index([customer_id])
  @@index([created_at])
  @@map("discount_predictions")
}

model DiscountCode {
  id                        String   @id @default(uuid())
  tenant_id                 String
  code                      String   @unique
  discount_percentage       Int
  description               String?
  is_active                 Boolean  @default(true)
  valid_from                DateTime
  valid_until               DateTime
  max_uses                  Int?
  current_uses              Int      @default(0)
  created_at                DateTime @default(now())

  @@unique([tenant_id, code])
  @@index([valid_until])
  @@map("discount_codes")
}

model DiscountRule {
  id                        String   @id @default(uuid())
  tenant_id                 String
  name                      String
  discount_percentage       Int
  condition_json            Json
  is_active                 Boolean  @default(true)
  priority                  Int      @default(0)
  created_at                DateTime @default(now())

  @@index([tenant_id])
  @@index([priority])
  @@map("discount_rules")
}
```

---

## Model Training Pipeline

### Data Preparation

```
1. Collect historical orders (6 months)
2. Feature extraction per order
3. Label: what discount was actually applied
4. Create training dataset (10,000 orders)
5. Split: 80% train, 10% validation, 10% test
```

### Feature Engineering

```python
features = {
    "total_amount": order.total,
    "items_count": len(order.items),
    "day_of_week": order.created_at.weekday(),
    "hour_of_day": order.created_at.hour,
    "customer_order_count": customer.total_orders,
    "customer_avg_spend": customer.avg_spend,
    "order_frequency_days": (now - customer.last_order).days,
    "has_vegetarian": 1 if any(v for v in items),
    "has_dessert": 1 if any(d for d in items),
    "cuisine_type": menu_item.cuisine,
    "is_weekend": 1 if day in [5, 6] else 0
}
```

### Model Training

```python
from xgboost import XGBClassifier
import numpy as np

# Prepare data
X_train, X_test, y_train, y_test = train_test_split(...)

# Train model
model = XGBClassifier(
    n_estimators=100,
    max_depth=6,
    learning_rate=0.1,
    random_state=42
)
model.fit(X_train, y_train)

# Evaluate
accuracy = model.score(X_test, y_test)
print(f"Accuracy: {accuracy:.2%}")

# Save model
model.save_model('discount_model.bin')
```

---

## Endpoints Summary

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| `POST` | `/api/discounts/predict` | Get ML discount prediction | Internal |
| `POST` | `/api/discounts/apply-code` | Apply discount code | JWT |
| `GET` | `/api/discounts/rules` | List active rules | JWT + MANAGER |
| `POST` | `/api/discounts/rules` | Create discount rule | JWT + MANAGER |
| `POST` | `/api/discounts/codes` | Create discount code | JWT + MANAGER |

---

## Real-World Scenarios

### Scenario 1: Weekend Order with ML Discount

```
Friday 7:08 PM - Customer orders 1250:
1. Order Service calls Discount Engine
2. Features extracted:
   - amount: 1250
   - day: FRIDAY
   - hour: 19
   - customer_orders: 12
   - customer_avg_spend: 1100
3. XGBoost predicts: 10% discount, confidence 0.87
4. Confidence > 0.7 → Apply ML prediction
5. Discount applied: 125 INR
6. Order total: 1125 INR
7. Recorded in database for model feedback
```

### Scenario 2: New Customer with Promotional Code

```
Tuesday 7:00 PM - New customer (1st order):
1. Order Service calls Discount Engine
2. ML prediction: 5% (confidence 0.62, low)
3. Confidence < 0.7 → Check rules
4. Customer applies: "WELCOME20" code
5. Code valid, discount: 20%
6. Final: 20% discount (250 INR)
7. Order total: 1000 INR
```

### Scenario 3: Loyalty Discount

```
Saturday 7:15 PM - Loyal customer (50+ orders):
1. Order Service calls Discount Engine
2. ML predicts: 10% (confidence 0.79)
3. Rules check: LOYALTY_VETERAN = 15%
4. Compare: ML (10%) vs RULE (15%)
5. Priority: ML prediction wins (higher confidence)
6. Apply: 10% discount
7. Customer happy, order placed
```

---

## Performance Characteristics

- **ML prediction**: 8-12ms (model inference)
- **Rule matching**: 5-10ms (rule engine)
- **Code validation**: 3-5ms (database lookup)
- **Model accuracy**: ~79% on real data
- **Model size**: 25MB (loaded in memory)

---

## Testing Discount Engine

```bash
# Get ML discount prediction
curl -X POST http://localhost:3104/api/discounts/predict \
  -H "Content-Type: application/json" \
  -d '{
    "total_amount": 1250,
    "items_count": 4,
    "customer_id": "cust-abc",
    "day_of_week": "FRIDAY",
    "hour_of_day": 19
  }'

# Apply discount code
curl -X POST http://localhost:3104/api/discounts/apply-code \
  -H "Authorization: Bearer <token>" \
  -d '{
    "order_id": "order-xyz",
    "discount_code": "WELCOME20",
    "total_amount": 1250
  }'

# Create promotion rule
curl -X POST http://localhost:3104/api/discounts/rules \
  -H "Authorization: Bearer <token>" \
  -d '{
    "name": "FRIDAY_SPECIAL",
    "discount_percentage": 15,
    "condition_json": {
      "day": "FRIDAY",
      "hour": [18, 19, 20, 21]
    }
  }'
```

---

**See Also**:
- [SYSTEM_OVERVIEW.md](../SYSTEM_OVERVIEW.md) - Discount Engine in architecture
- [ORDER_SERVICE.md](./ORDER_SERVICE.md) - Discount application in orders
