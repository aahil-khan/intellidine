import pandas as pd
import numpy as np
from xgboost import XGBRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
import joblib


def prepare_features(df: pd.DataFrame):
  df['hour'] = pd.to_datetime(df['timestamp']).dt.hour
  df['day_of_week_num'] = pd.to_datetime(df['timestamp']).dt.dayofweek
  df['is_weekend'] = (df['day_of_week_num'] >= 5).astype(int)
  df['is_lunch_peak'] = ((df['hour'] >= 12) & (df['hour'] <= 14)).astype(int)
  df['is_dinner_peak'] = ((df['hour'] >= 19) & (df['hour'] <= 22)).astype(int)

  df['inventory_level'] = np.random.uniform(40, 100, len(df))
  df['avg_sales_last_7_days'] = np.random.uniform(50, 150, len(df))

  feature_columns = [
    'hour', 'day_of_week_num', 'is_weekend',
    'is_lunch_peak', 'is_dinner_peak',
    'inventory_level', 'avg_sales_last_7_days'
  ]

  return df[feature_columns], df['discount_applied']


def train_model():
  df = pd.read_csv('synthetic_restaurant_data.csv')

  X, y = prepare_features(df)
  X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

  model = XGBRegressor(
    n_estimators=100,
    max_depth=5,
    learning_rate=0.1,
    objective='reg:squarederror',
    random_state=42
  )

  model.fit(X_train, y_train)

  y_pred = model.predict(X_test)
  mae = mean_absolute_error(y_test, y_pred)
  r2 = r2_score(y_test, y_pred)
  print(f"Model Performance:\nMAE: {mae:.2f}%\nR²: {r2:.4f}")

  joblib.dump(model, 'discount_model.pkl')
  print("Model saved successfully")

  return model


if __name__ == '__main__':
  train_model()

