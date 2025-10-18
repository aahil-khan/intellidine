FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN pip install --no-cache-dir fastapi uvicorn[standard] joblib numpy pandas xgboost scikit-learn faker

COPY main.py /app/main.py
COPY train_model.py /app/train_model.py
COPY generate_synthetic_data.py /app/generate_synthetic_data.py

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

