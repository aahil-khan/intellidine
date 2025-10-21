# ML Service Guide - Intellidine

## Overview

The **ML Service** is a Python-based FastAPI microservice that uses **XGBoost machine learning** to predict optimal discount percentages for menu items. It runs intelligent demand-based pricing in real-time to maximize revenue and manage inventory.

**Service Port**: 8000
**Language**: Python 3.10+
**ML Framework**: XGBoost + scikit-learn

---

## Problem It Solves

### Revenue Optimization Challenge
Restaurants face a classic pricing dilemma:
- **Peak hours** (lunch 12-2 PM, dinner 7-10 PM): High demand, no discounts needed
- **Off-peak hours** (3-5 PM, 10 AM-12 PM): Low demand, items risk not selling
- **Excess inventory**: Perishable items near end-of-day expiry need clearing

### The ML Solution
The ML service automatically recommends:
- **No discount** during peak demand
- **5-10% discount** during mild off-peak periods
- **15% discount** when inventory is moderate with low demand
- **20-25% discount** for critical inventory situations

**Result**: Maximize table turnover during peak hours, minimize waste during off-peak times.

---

## Architecture

### System Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     API Gateway (Port 3100)                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │
        ┌─────────────────────┴──────────────────────┐
        │                                            │
┌──────▼──────────────┐                  ┌──────────▼─────────┐
│   Order Service     │                  │  Discount Engine   │
│   (Port 3104)       │                  │   (Port 3106)      │
│                     │                  │                    │
│ - Create orders     │                  │ - Pricing rules    │
│ - Manage cart       │                  │ - Dynamic pricing  │
│ - Status tracking   │                  │                    │
└──────┬──────────────┘                  └────────────────────┘
       │                                          │
       │ Needs discount prediction               │
       └──────────────────┬──────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   ML Service          │
              │   (Port 8000, Python) │
              │                       │
              │  XGBoost Model        │
              │  - Demand predictor   │
              │  - Discount optimizer │
              │  - Confidence scoring │
              └───────────────────────┘
```

### Key Components

| Component | Purpose |
|-----------|---------|
| **main.py** | FastAPI server with `/predict`, `/train`, `/health` endpoints |
| **train_model.py** | XGBoost model training pipeline |
| **generate_synthetic_data.py** | Creates 180 days of synthetic restaurant orders for training |
| **discount_model.pkl** | Trained ML model (binary format) |
| **feature_names.pkl** | List of features the model expects |

---

## ML Model Details

### Model Type: XGBoost Classifier

**XGBoost** (Extreme Gradient Boosting) is chosen because it:
- Handles multi-class classification well (4 discount classes)
- Captures non-linear patterns (peak vs. off-peak demand)
- Provides feature importance insights
- Fast inference (~1-5ms per prediction)

### Training Configuration

```python
XGBClassifier(
    n_estimators=200,           # 200 decision trees
    max_depth=6,                # Max tree depth (prevents overfitting)
    learning_rate=0.05,         # Conservative learning rate
    subsample=0.8,              # Use 80% of samples per tree
    colsample_bytree=0.8,       # Use 80% of features per tree
    objective='multi:softmax',  # Multi-class classification
    num_class=4,                # 4 discount classes
)
```

### Features (11 Total)

The model receives 11 contextual features:

| Feature | Range | Description |
|---------|-------|-------------|
| **hour** | 0-1 (normalized) | Current hour of day (0-23) |
| **day_of_week** | 0-6 | Day of week (0=Monday, 6=Sunday) |
| **is_weekend** | 0-1 | Binary flag: is Saturday or Sunday |
| **is_lunch_peak** | 0-1 | Binary: 12 PM - 2 PM |
| **is_dinner_peak** | 0-1 | Binary: 7 PM - 10 PM |
| **is_month_end** | 0-1 | Binary: Day 25-31 |
| **is_holiday_week** | 0-1 | Binary: November or December |
| **inventory_level** | 0-1 (normalized) | Stock percentage (0-100%) |
| **num_items** | Raw count | Avg items per order (1-4) |
| **total_price** | 0-1 (normalized) | Average order value |
| **order_duration** | 0-1 (normalized) | Prep time (20-45 min) |

### Prediction Classes (Output)

The model predicts 4 discount classes:

| Class | Discount % | Scenario | Confidence Threshold |
|-------|-----------|----------|---------------------|
| **0** | 0% | Peak demand period | N/A |
| **1** | 7% (avg 5-10%) | Off-peak moderate demand | > 0.4 |
| **2** | 15% | Off-peak + low inventory | > 0.4 |
| **3** | 22% (avg 20-25%) | Critical inventory/extreme off-peak | > 0.4 |

### Model Performance (Test Set)

Typical metrics after training on 180 days of data:

```
Accuracy:  78-82% (correctly predicts discount class)
Precision: 76-80% (when it recommends discount, it's right)
Recall:    75-79% (catches most situations needing discount)
F1-Score:  76-80% (balanced precision/recall)
```

### Feature Importance (Top 5)

After training, the model ranks features by importance:

```
1. is_dinner_peak    (0.185)  - Strongest signal
2. total_price       (0.165)  - Order value matters
3. inventory_level   (0.142)  - Stock levels critical
4. hour              (0.118)  - Time of day important
5. is_lunch_peak     (0.106)  - Lunch also signals peak
```

---

## API Endpoints

### 1. Predict Discounts

**Endpoint**: `POST /predict`

**Purpose**: Get discount recommendations for current inventory

**Request Body**:
```json
{
  "tenant_id": "11111111-1111-1111-1111-111111111111",
  "current_time": "2025-10-22T19:30:00",
  "inventory": [
    {
      "item_id": "item_001",
      "stock_percentage": 45,
      "price": 280
    },
    {
      "item_id": "item_003",
      "stock_percentage": 25,
      "price": 250
    }
  ],
  "avg_sales_7_days": 120.5
}
```

**Response**:
```json
{
  "tenant_id": "11111111-1111-1111-1111-111111111111",
  "predictions": [
    {
      "item_id": "item_001",
      "discount_percentage": 7,
      "confidence": 0.68,
      "reason": "Off-peak with moderate inventory"
    },
    {
      "item_id": "item_003",
      "discount_percentage": 22,
      "confidence": 0.82,
      "reason": "Critical inventory levels"
    }
  ],
  "model_loaded": true,
  "timestamp": "2025-10-22T19:30:12.345Z"
}
```

**Integration with Discount Engine**: The Discount Engine (port 3106) calls this endpoint to get ML-recommended prices and applies them to orders.

---

### 2. Health Check

**Endpoint**: `GET /health`

**Response**:
```json
{
  "status": "healthy",
  "model_loaded": true,
  "service": "ML Discount Predictor",
  "version": "1.0.0"
}
```

---

### 3. Model Information

**Endpoint**: `GET /model/info`

**Response**:
```json
{
  "status": "Model loaded",
  "trained": true,
  "model_type": "XGBoost Classifier",
  "classes": [
    "No Discount (0%)",
    "Small Discount (5-10%)",
    "Medium Discount (15%)",
    "Large Discount (20-25%)"
  ],
  "features": [
    "hour", "day_of_week", "is_weekend", "is_lunch_peak",
    "is_dinner_peak", "is_month_end", "is_holiday_week",
    "inventory_level", "num_items", "total_price", "order_duration"
  ],
  "n_estimators": 200
}
```

---

### 4. Trigger Training (Dev Only)

**Endpoint**: `POST /train`

**Purpose**: Retrain the model with new data (runs train_model.py)

**Response**:
```json
{
  "status": "Training completed successfully",
  "output": "Model trained on 43200 synthetic orders...",
  "model_path": "discount_model.pkl",
  "feature_names_path": "feature_names.pkl"
}
```

**⚠️ Production Note**: This should be triggered via scheduled CI/CD job (nightly retraining with real restaurant data), not manually.

---

## Training Pipeline

### Step 1: Generate Synthetic Data

**File**: `generate_synthetic_data.py`

```python
python generate_synthetic_data.py
```

**Output**: `synthetic_restaurant_data.csv` (43,200 rows × 11 columns)

**What it generates**:
- 180 days of restaurant order data
- 240 synthetic orders per day (realistic volume)
- Realistic patterns:
  - 50% more orders on weekends
  - 2.5x orders during peak hours
  - 30% higher traffic at month-end
  - Holiday season (Nov-Dec) gets 20% boost
  - Low inventory correlates with discounts applied
  - Peak hours rarely have discounts

**Example sample**:
```csv
hour,day_of_week,is_weekend,is_lunch_peak,is_dinner_peak,is_month_end,is_holiday_week,inventory_level,num_items,total_price,discount_applied,final_price,order_duration
14,2,0,1,0,0,0,45,2,630,0,630,28
21,5,1,0,1,1,1,22,3,750,22,585,35
11,0,0,0,0,0,0,85,1,280,0,280,25
```

### Step 2: Train Model

**File**: `train_model.py`

```python
python train_model.py
```

**Process**:
1. Load `synthetic_restaurant_data.csv`
2. Extract features & target (discount_applied)
3. Normalize features to 0-1 range
4. Convert discount % to 4 classes
5. Split: 80% training, 20% testing (stratified)
6. Train XGBoost classifier (200 trees, depth 6)
7. Evaluate on test set (accuracy, precision, recall, F1)
8. Save model to `discount_model.pkl`
9. Save feature names to `feature_names.pkl`

**Output**:
```
✅ Model Performance Metrics:
   Accuracy:  79.45%
   Precision: 77.82%
   Recall:    76.93%
   F1-Score:  77.37%

🌟 Top Features by Importance:
   is_dinner_peak: 0.1847
   total_price: 0.1652
   inventory_level: 0.1418
   hour: 0.1183
   is_lunch_peak: 0.1061
```

### Step 3: Deploy Model

Place `discount_model.pkl` and `feature_names.pkl` in the `backend/ml-service/` directory.

When the ML service starts, it automatically loads these files:
```python
model = joblib.load("discount_model.pkl")
feature_names = joblib.load("feature_names.pkl")
```

---

## Real-Time Prediction Workflow

### When an Order is Placed

```
1. Customer order arrives at Discount Engine (port 3106)
   └─> GET /discount/recommendations?items=[item_001, item_003]

2. Discount Engine calls ML Service:
   └─> POST /predict
       {
         "tenant_id": "11111111-1111-1111-1111-111111111111",
         "current_time": "2025-10-22T19:30:00",
         "inventory": [
           {"item_id": "item_001", "stock_percentage": 45},
           {"item_id": "item_003", "stock_percentage": 25}
         ]
       }

3. ML Service predicts discounts:
   └─> Loads model from RAM (pre-loaded at startup)
   └─> Creates feature vector (11 features from current context)
   └─> Predicts class (0, 1, 2, or 3)
   └─> Calculates confidence
   └─> Returns within 5-10 milliseconds

4. Discount Engine applies recommendations:
   └─> If model says "Large Discount (22%)" for item_003
   └─> Update item price from ₹250 to ₹195 (with 22% off)
   └─> Applies to customer's order

5. Order Service creates order with discounted prices
   └─> POST /api/orders with applied_discount fields
```

---

## Production Considerations

### 1. Model Retraining Strategy

**Current**: Triggers manually via `/train` endpoint

**Recommended Production**:
- Scheduled weekly retraining (every Sunday 2 AM)
- Real restaurant data instead of synthetic data
- A/B test new model on 10% of traffic before full rollout
- Keep previous model as fallback

```bash
# Cron job example (runs every Sunday at 2 AM)
0 2 * * 0 cd /app/ml-service && python train_model.py && cp discount_model.pkl discount_model_backup.pkl
```

### 2. Model Monitoring

**Metrics to track**:
- **Prediction latency**: Should be < 10ms per call
- **Model accuracy**: Track real vs. predicted discounts
- **Confidence scores**: Alert if many low-confidence predictions
- **Revenue impact**: Measure total sales vs. baseline

### 3. Fallback Strategy

If model fails to load or returns error:
- Default to **0% discount** (safer for revenue)
- Log error to monitoring system
- Alert operations team
- Fall back to rule-based engine (hard-coded discount rules)

```python
# Fallback logic
if model is None:
    return {
        "discount_percentage": 0,
        "reason": "Model unavailable, applying conservative default"
    }
```

### 4. Data Privacy

- Model only sees aggregated inventory & time data
- No customer personal data used
- No order history or preferences
- Complies with data privacy regulations

---

## Testing the ML Service

### Local Testing

```bash
# Terminal 1: Start ML Service
cd backend/ml-service
pip install -r requirements.txt
python main.py
# Service running at http://localhost:8000

# Terminal 2: Test health endpoint
curl http://localhost:8000/health

# Test model info
curl http://localhost:8000/model/info

# Test prediction
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "11111111-1111-1111-1111-111111111111",
    "current_time": "2025-10-22T19:30:00",
    "inventory": [
      {"item_id": "item_001", "stock_percentage": 45, "price": 280}
    ]
  }'
```

### Testing with Postman

Import the Intellidine Postman collection and use the **ML Service** folder:
- `GET /health` - Verify service is running
- `GET /model/info` - Check model loaded
- `POST /predict` - Test discount prediction
- `POST /train` - Retrain model (dev only)

---

## Docker Deployment

### Build

```dockerfile
FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["python", "main.py"]
```

### Run with Docker Compose

```yaml
ml-service:
  build:
    context: ./backend/ml-service
  ports:
    - "8000:8000"
  environment:
    - MODEL_PATH=discount_model.pkl
    - FEATURES_PATH=feature_names.pkl
  volumes:
    - ./backend/ml-service:/app
  depends_on:
    - discount-engine
```

---

## Integration with Other Services

### Discount Engine (Port 3106)

**Calls**: `POST /predict` when calculating order discounts

**Uses**: ML predictions to apply dynamic pricing

```typescript
// Example in Discount Engine
const mlResponse = await fetch('http://ml-service:8000/predict', {
  method: 'POST',
  body: JSON.stringify({
    tenant_id,
    current_time: new Date(),
    inventory: itemInventory,
  })
});

const { predictions } = await mlResponse.json();
// Apply predictions to order items
```

### Order Service (Port 3104)

**Receives**: Order with potential discounts from Discount Engine

**Stores**: Applied discount in database with reasoning

```typescript
// Order Service stores discount reasoning
const order = await prismaService.order.create({
  data: {
    items: orderItems.map(item => ({
      menu_item_id: item.id,
      discount_applied: item.ml_discount,
      discount_reason: item.ml_reason,  // "Critical inventory levels"
    }))
  }
});
```

---

## Troubleshooting

### Issue: Model Not Loading

**Error**: `⚠️ Could not load model`

**Causes**:
- `discount_model.pkl` not found in `/backend/ml-service/`
- File corruption during deployment
- Python joblib version mismatch

**Solution**:
```bash
# Regenerate model
cd backend/ml-service
python generate_synthetic_data.py
python train_model.py
# Files created: discount_model.pkl, feature_names.pkl
```

---

### Issue: Predictions Very Slow (> 50ms)

**Cause**: Model not in RAM, loading from disk each time

**Solution**: Ensure model is loaded at startup:
```python
# In main.py, model is loaded on startup
@app.on_event("startup")
async def load_model():
    global model, feature_names
    model = joblib.load(MODEL_PATH)
```

---

### Issue: All Predictions Return 0% Discount

**Cause**: Model confidence too low, or feature scaling issue

**Check**:
```bash
curl http://localhost:8000/model/info
# Verify model_loaded: true

# Test with known peak time (should return 0%)
POST /predict
{
  "current_time": "2025-10-22T13:00:00",  // Lunch peak
  "inventory": [
    {"item_id": "item_001", "stock_percentage": 85, "price": 280}
  ]
}
# Expected: discount_percentage: 0
```

---

## Future Enhancements

1. **Real-time feedback loop**: Update model daily with actual order data
2. **Customer segmentation**: Different discounts for new vs. loyal customers
3. **Menu item popularity**: Predict demand for specific items
4. **Weather integration**: Adjust for rainy days, holidays
5. **Competitor pricing**: Factor in nearby restaurants
6. **Supply chain integration**: Link to supplier data for inventory costs
7. **Multi-day planning**: Forecast next 7 days of inventory needs
8. **Causal inference**: Measure impact of each discount on total revenue

---

## Summary

The **ML Service** provides intelligent, real-time discount recommendations using XGBoost to:
- ✅ Maximize peak-hour revenue (no unnecessary discounts)
- ✅ Minimize waste during off-peak times
- ✅ Clear excess inventory strategically
- ✅ Improve overall restaurant profitability
- ✅ Data-driven decision making

**Key Metrics**:
- Model Accuracy: ~79%
- Prediction Latency: 5-10ms
- Training Time: 30 seconds
- 11 Input Features
- 4 Discount Classes
