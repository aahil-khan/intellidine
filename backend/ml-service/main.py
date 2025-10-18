from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
import joblib
import numpy as np
from datetime import datetime
import os

app = FastAPI()

# Load trained model if available
MODEL_PATH = os.getenv("MODEL_PATH", "discount_model.pkl")
model = None
if os.path.exists(MODEL_PATH):
    try:
        model = joblib.load(MODEL_PATH)
    except Exception:
        model = None


class PredictionRequest(BaseModel):
    tenant_id: str
    context: dict


class PredictionResponse(BaseModel):
    item_id: str
    discount_percentage: int
    confidence: float
    features: dict


@app.post("/predict", response_model=List[PredictionResponse])
async def predict_discounts(request: PredictionRequest):
    try:
        if model is None:
            raise HTTPException(status_code=503, detail="Model not loaded")

        context = request.context
        predictions = []

        current_hour = datetime.fromisoformat(context['current_time']).hour
        day_of_week = datetime.fromisoformat(context['current_time']).weekday()
        is_weekend = day_of_week >= 5
        is_lunch_peak = 12 <= current_hour <= 14
        is_dinner_peak = 19 <= current_hour <= 22

        for inv_item in context['inventory']:
            features = np.array([[
                current_hour,
                day_of_week,
                int(is_weekend),
                int(is_lunch_peak),
                int(is_dinner_peak),
                inv_item['stock_percentage'],
                context.get('avg_sales_7_days', 100)
            ]])

            predicted_discount = float(model.predict(features)[0])
            predicted_discount = max(0, min(50, int(predicted_discount)))

            confidence = 0.75 if predicted_discount > 0 else 0.5

            if predicted_discount > 5:
                predictions.append(PredictionResponse(
                    item_id=inv_item['item_id'],
                    discount_percentage=predicted_discount,
                    confidence=confidence,
                    features={
                        'hour': current_hour,
                        'inventory_level': inv_item['stock_percentage'],
                        'is_peak': bool(is_lunch_peak or is_dinner_peak)
                    }
                ))

        return predictions

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health_check():
    return {"status": "healthy", "model_loaded": model is not None}

