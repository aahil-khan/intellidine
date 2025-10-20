import pandas as pd
import numpy as np
from xgboost import XGBClassifier # type: ignore
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, classification_report, confusion_matrix
from sklearn.preprocessing import LabelEncoder
import joblib
import warnings

warnings.filterwarnings('ignore')


def prepare_features(df: pd.DataFrame):
  """Prepare features with proper scaling and encoding."""
  
  # Features that are already numeric and scaled
  feature_columns = [
    'hour',
    'day_of_week',
    'is_weekend',
    'is_lunch_peak',
    'is_dinner_peak',
    'is_month_end',
    'is_holiday_week',
    'inventory_level',
    'num_items',
    'total_price',
    'order_duration',
  ]

  X = df[feature_columns].copy()
  
  # Normalize numeric features to 0-1 range for better model performance
  X['hour'] = X['hour'] / 23.0
  X['inventory_level'] = X['inventory_level'] / 100.0
  X['total_price'] = X['total_price'] / X['total_price'].max()
  X['order_duration'] = X['order_duration'] / 45.0
  
  # Target: Convert discount to classes
  # Class 0: No discount (0%)
  # Class 1: Small discount (5-10%)
  # Class 2: Medium discount (15%)
  # Class 3: Large discount (20-25%)
  y = df['discount_applied'].apply(lambda x: 
    0 if x == 0
    else 1 if x <= 10
    else 2 if x == 15
    else 3
  )
  
  return X, y


def train_model():
  """Train XGBoost classifier for discount prediction."""
  
  print("📊 Loading synthetic restaurant data...")
  df = pd.read_csv('synthetic_restaurant_data.csv')
  print(f"   Total orders: {len(df):,}")
  print(f"   Discount distribution:\n{df['discount_applied'].value_counts().sort_index()}")

  print("\n🔧 Preparing features...")
  X, y = prepare_features(df)
  print(f"   Features shape: {X.shape}")
  print(f"   Target distribution: {y.value_counts().sort_index().to_dict()}")

  print("\n✂️  Splitting data (80% train, 20% test)...")
  X_train, X_test, y_train, y_test = train_test_split(
    X, y, 
    test_size=0.2, 
    random_state=42,
    stratify=y  # Ensure same class distribution in train/test
  )
  print(f"   Train set: {len(X_train):,} | Test set: {len(X_test):,}")

  print("\n🤖 Training XGBoost classifier...")
  model = XGBClassifier(
    n_estimators=200,           # More trees for better learning
    max_depth=6,                # Slightly deeper for complex patterns
    learning_rate=0.05,         # Lower rate for more stable learning
    subsample=0.8,              # Use 80% of samples per tree
    colsample_bytree=0.8,       # Use 80% of features per tree
    objective='multi:softmax',  # Multi-class classification
    num_class=4,                # 4 discount classes
    random_state=42,
    verbosity=1,
    eval_metric='mlogloss'      # Multi-class loss metric
  )

  model.fit(X_train, y_train, verbose=False)

  print("\n📈 Evaluating model...")
  y_pred = model.predict(X_test)
  
  accuracy = accuracy_score(y_test, y_pred)
  precision_macro = precision_score(y_test, y_pred, average='macro', zero_division=0)
  recall_macro = recall_score(y_test, y_pred, average='macro', zero_division=0)
  f1_macro = f1_score(y_test, y_pred, average='macro', zero_division=0)
  
  print(f"\n✅ Model Performance Metrics:")
  print(f"   Accuracy:  {accuracy*100:.2f}%")
  print(f"   Precision: {precision_macro*100:.2f}%")
  print(f"   Recall:    {recall_macro*100:.2f}%")
  print(f"   F1-Score:  {f1_macro*100:.2f}%")
  
  print(f"\n📋 Per-class metrics:")
  print(classification_report(y_test, y_pred, 
    target_names=['No Discount', 'Small (5-10%)', 'Medium (15%)', 'Large (20-25%)'],
    zero_division=0))
  
  print(f"\n🔄 Confusion Matrix:")
  cm = confusion_matrix(y_test, y_pred)
  print(cm)
  
  # Feature importance
  print(f"\n🌟 Top Features by Importance:")
  feature_names = [
    'hour', 'day_of_week', 'is_weekend', 'is_lunch_peak', 'is_dinner_peak',
    'is_month_end', 'is_holiday_week', 'inventory_level', 'num_items', 
    'total_price', 'order_duration'
  ]
  importances = model.feature_importances_
  for name, importance in sorted(zip(feature_names, importances), key=lambda x: x[1], reverse=True)[:5]:
    print(f"   {name}: {importance:.4f}")

  print("\n💾 Saving model...")
  joblib.dump(model, 'discount_model.pkl')
  
  # Also save the feature names for prediction time
  joblib.dump(feature_names, 'feature_names.pkl')
  
  print("✨ Model training complete!")
  print(f"\n📊 Final Metrics Summary:")
  print(f"   Overall Accuracy: {accuracy*100:.2f}%")
  print(f"   Model Performance: {'🟢 EXCELLENT (>80%)' if accuracy > 0.8 else '🟡 GOOD (70-80%)' if accuracy > 0.7 else '🔴 POOR (<70%)'}")
  
  return model, accuracy


if __name__ == '__main__':
  train_model()

