from fastapi import FastAPI, HTTPException # type: ignore
from pydantic import BaseModel # type: ignore
from typing import List, Optional
import joblib
import numpy as np
from datetime import datetime
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Intellidine ML Service", version="1.0.0")

# Load trained model if available
MODEL_PATH = os.getenv("MODEL_PATH", "discount_model.pkl")
FEATURES_PATH = os.getenv("FEATURES_PATH", "feature_names.pkl")

model = None
feature_names = None

try:
    if os.path.exists(MODEL_PATH):
        model = joblib.load(MODEL_PATH)
        logger.info(f"✅ Model loaded from {MODEL_PATH}")
except Exception as e:
    logger.warning(f"⚠️  Could not load model: {e}")

try:
    if os.path.exists(FEATURES_PATH):
        feature_names = joblib.load(FEATURES_PATH)
        logger.info(f"✅ Feature names loaded from {FEATURES_PATH}")
except Exception:
    feature_names = [
        'hour', 'day_of_week', 'is_weekend', 'is_lunch_peak', 'is_dinner_peak',
        'is_month_end', 'is_holiday_week', 'inventory_level', 'num_items', 
        'total_price', 'order_duration'
    ]


class PredictionRequest(BaseModel):
    tenant_id: str
    current_time: datetime
    inventory: List[dict]  # [{"item_id": "item_001", "stock_percentage": 50, "price": 280}]
    avg_sales_7_days: float = 100.0


class DiscountPrediction(BaseModel):
    item_id: str
    discount_percentage: int  # 0, 5, 10, 15, 20, 25
    confidence: float  # 0.0-1.0
    reason: str  # Why this discount was recommended


class PredictionResponse(BaseModel):
    tenant_id: str
    predictions: List[DiscountPrediction]
    model_loaded: bool
    timestamp: datetime


def get_discount_for_class(class_id: int) -> int:
    """Convert class to discount percentage."""
    discount_map = {
        0: 0,    # No discount
        1: 7,    # Small (average of 5-10%)
        2: 15,   # Medium
        3: 22,   # Large (average of 20-25%)
    }
    return discount_map.get(class_id, 0)


def get_reason(class_id: int, inventory_level: float, hour: int, is_peak: bool) -> str:
    """Provide reasoning for the discount."""
    if class_id == 0:
        return "Peak demand - no discount needed"
    elif class_id == 1:
        return "Off-peak with moderate inventory"
    elif class_id == 2:
        return "Low inventory - clearing stock" if inventory_level < 50 else "Off-peak incentive"
    else:  # class_id == 3
        return "Critical inventory levels" if inventory_level < 30 else "Strong off-peak opportunity"


@app.post("/predict", response_model=PredictionResponse)
async def predict_discounts(request: PredictionRequest):
    """
    Predict optimal discounts for inventory items based on current context.
    
    Returns:
    - item_id: The menu item to discount
    - discount_percentage: Recommended discount (0, 5-10, 15, 20-25)
    - confidence: Model confidence in this prediction (0.0-1.0)
    - reason: Human-readable reason for the discount
    """
    try:
        if model is None:
            raise HTTPException(status_code=503, detail="ML Model not loaded - run training first")

        # Extract time features
        current_hour = request.current_time.hour
        day_of_week = request.current_time.weekday()
        is_weekend = int(day_of_week >= 5)
        is_lunch_peak = int(12 <= current_hour <= 14)
        is_dinner_peak = int(19 <= current_hour <= 22)
        is_month_end = int(request.current_time.day >= 25)
        is_holiday_week = int(request.current_time.month in [11, 12])  # Festival season
        is_peak = is_lunch_peak or is_dinner_peak

        predictions = []

        for item in request.inventory:
            try:
                # Prepare feature vector
                features = np.array([[
                    current_hour / 23.0,           # Normalized hour
                    day_of_week,
                    is_weekend,
                    is_lunch_peak,
                    is_dinner_peak,
                    is_month_end,
                    is_holiday_week,
                    item.get('stock_percentage', 50) / 100.0,  # Normalized inventory
                    item.get('num_items', 1),      # Avg items in order
                    min(item.get('price', 200) / 1000, 1.0),  # Normalized price
                    30 / 45.0,                     # Avg order duration normalized
                ]])

                # Get prediction
                predicted_class = int(model.predict(features)[0])
                
                # Get prediction probabilities for confidence
                probabilities = model.predict_proba(features)[0]
                confidence = float(probabilities[predicted_class])

                discount_percentage = get_discount_for_class(predicted_class)
                reason = get_reason(predicted_class, item.get('stock_percentage', 50), current_hour, is_peak)

                # Only recommend non-zero discounts if confidence > 0.4
                if discount_percentage == 0 or confidence > 0.4:
                    predictions.append(DiscountPrediction(
                        item_id=item.get('item_id', f"item_{predictions.__len__()}"),
                        discount_percentage=discount_percentage,
                        confidence=confidence,
                        reason=reason
                    ))

            except Exception as e:
                logger.error(f"Error predicting for item {item.get('item_id')}: {e}")
                continue

        return PredictionResponse(
            tenant_id=request.tenant_id,
            predictions=predictions,
            model_loaded=True,
            timestamp=datetime.now()
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "service": "ML Discount Predictor",
        "version": "1.0.0"
    }


@app.get("/model/info")
async def model_info():
    """Get information about the loaded model."""
    if model is None:
        return {"status": "Model not loaded", "trained": False}
    
    return {
        "status": "Model loaded",
        "trained": True,
        "model_type": "XGBoost Classifier",
        "classes": ["No Discount (0%)", "Small Discount (5-10%)", "Medium Discount (15%)", "Large Discount (20-25%)"],
        "features": feature_names,
        "n_estimators": model.n_estimators if hasattr(model, 'n_estimators') else None,
    }


@app.post("/train")
async def trigger_training():
    """
    Trigger model retraining (development only).
    In production, this should be scheduled/triggered via CI/CD.
    """
    try:
        import subprocess
        result = subprocess.run(['python', 'train_model.py'], capture_output=True, text=True, timeout=300)
        
        if result.returncode == 0:
            # Reload the model
            global model, feature_names
            model = joblib.load(MODEL_PATH)
            feature_names = joblib.load(FEATURES_PATH)
            return {
                "status": "Training completed successfully",
                "output": result.stdout
            }
        else:
            return {
                "status": "Training failed",
                "error": result.stderr
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training error: {str(e)}")

