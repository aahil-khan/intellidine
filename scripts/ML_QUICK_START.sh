#!/bin/bash

# ML Training & Deployment Quick Reference
# ==========================================

# 📊 STEP 1: Generate Synthetic Data
echo "🔧 Generating 365 days of synthetic restaurant data..."
cd backend/ml-service
python generate_synthetic_data.py
# Output: synthetic_restaurant_data.csv (10,000+ orders)

# 📈 STEP 2: Train Model
echo "🤖 Training XGBoost classifier..."
python train_model.py
# Output:
#   - discount_model.pkl (trained model)
#   - feature_names.pkl (feature reference)
#   - Console metrics (70-85% accuracy expected)

# 🚀 STEP 3: Start ML Service
echo "🌐 Starting ML service..."
docker compose up ml-service -d
# Or manually:
# pip install fastapi uvicorn xgboost scikit-learn joblib pandas numpy pydantic
# python main.py
# Service: http://localhost:8000

# ✅ STEP 4: Verify Service
echo "✅ Checking ML service health..."
curl http://localhost:8000/health
# Expected: {"status": "healthy", "model_loaded": true, ...}

# 📝 STEP 5: Get Model Info
curl http://localhost:8000/model/info
# Shows model type, classes, features, configuration

# 🧪 STEP 6: Test Predictions
echo "🧪 Testing discount predictions..."
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "tenant_1",
    "current_time": "2025-10-20T14:30:00",
    "inventory": [
      {"item_id": "item_001", "stock_percentage": 25, "price": 280},
      {"item_id": "item_003", "stock_percentage": 80, "price": 250}
    ],
    "avg_sales_7_days": 100
  }'

# Expected output:
# {
#   "tenant_id": "tenant_1",
#   "predictions": [
#     {
#       "item_id": "item_001",
#       "discount_percentage": 20,
#       "confidence": 0.82,
#       "reason": "Critical inventory levels"
#     }
#   ],
#   "model_loaded": true,
#   "timestamp": "2025-10-20T14:30:45.123456"
# }

# 🔄 STEP 7: Retrain Model (if needed)
curl -X POST http://localhost:8000/train
# Regenerates data and retrains model in background

# 📊 TESTING SCENARIOS
# ====================

# Test 1: Peak Hours (High Demand - No Discount)
echo "Test 1: Lunch Peak (12pm)"
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "tenant_1",
    "current_time": "2025-10-20T12:30:00",
    "inventory": [{"item_id": "item_001", "stock_percentage": 50, "price": 280}],
    "avg_sales_7_days": 100
  }'
# Expected: discount_percentage: 0 (no discount needed during peak)

# Test 2: Off-Peak + Low Inventory (Aggressive Discount)
echo "Test 2: Off-Peak + Low Stock (15%)"
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "tenant_1",
    "current_time": "2025-10-20T03:00:00",
    "inventory": [{"item_id": "item_001", "stock_percentage": 15, "price": 280}],
    "avg_sales_7_days": 100
  }'
# Expected: discount_percentage: 20-25 (clear old stock)

# Test 3: Weekend Late Night (Moderate Discount)
echo "Test 3: Weekend Late Night (22:30)"
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "tenant_1",
    "current_time": "2025-10-18T22:30:00",
    "inventory": [{"item_id": "item_001", "stock_percentage": 45, "price": 280}],
    "avg_sales_7_days": 100
  }'
# Expected: discount_percentage: 10-15 (moderate incentive)

# 🎯 KEY PERFORMANCE INDICATORS
# =============================

# 1. Model Accuracy: 70-85%
# 2. Per-class Performance:
#    - No Discount: ~80-85% accuracy
#    - Small Discount: ~70-75% accuracy
#    - Medium Discount: ~75-80% accuracy
#    - Large Discount: ~68-72% accuracy

# 3. Feature Importance (Top 5):
#    - inventory_level: 28.5%
#    - is_peak: 19.5%
#    - hour: 15.2%
#    - is_weekend: 11.0%
#    - is_lunch_peak: 8.3%

# 🐛 TROUBLESHOOTING
# ==================

# Issue: Model not found
# Fix: cd backend/ml-service && python generate_synthetic_data.py && python train_model.py

# Issue: Container won't start
# Fix: docker compose logs ml-service

# Issue: Predictions always 0
# Fix: Check model loading: curl http://localhost:8000/model/info

# Issue: Low accuracy (<60%)
# Fix: Regenerate data with: python generate_synthetic_data.py

# 📚 INTEGRATION WITH DISCOUNT ENGINE (Step 3.2)
# ===============================================

# The discount engine will:
# 1. Call this ML service for each order
# 2. Get predictions for each item in the order
# 3. Apply business rules (max discount, category restrictions)
# 4. Log predictions for feedback loop (shadow mode)
# 5. Return final discount to Order Service

# Next: Implement Step 3.2 - Discount Engine
