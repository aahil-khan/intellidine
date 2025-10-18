import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from faker import Faker

fake = Faker()


def generate_restaurant_data(num_days: int = 180) -> pd.DataFrame:
  """Generate synthetic restaurant order data for training."""

  menu_items = [
    {'id': 'item_001', 'name': 'Paneer Tikka', 'price': 280, 'category': 'appetizer', 'popularity': 0.15},
    {'id': 'item_002', 'name': 'Chicken Wings', 'price': 320, 'category': 'appetizer', 'popularity': 0.12},
    {'id': 'item_003', 'name': 'Dal Makhani', 'price': 250, 'category': 'main', 'popularity': 0.18},
    {'id': 'item_004', 'name': 'Butter Chicken', 'price': 380, 'category': 'main', 'popularity': 0.20},
    {'id': 'item_005', 'name': 'Garlic Naan', 'price': 50, 'category': 'side', 'popularity': 0.25},
    {'id': 'item_006', 'name': 'Gulab Jamun', 'price': 120, 'category': 'dessert', 'popularity': 0.10},
  ]

  start_date = datetime.now() - timedelta(days=num_days)
  orders = []

  for day in range(num_days):
    current_date = start_date + timedelta(days=day)
    is_weekend = current_date.weekday() >= 5

    base_orders_per_day = 80 if not is_weekend else 104

    for hour in range(11, 23):
      is_peak = (12 <= hour <= 14) or (19 <= hour <= 22)
      orders_this_hour = int(base_orders_per_day / 12 * (1.5 if is_peak else 0.7))

      for _ in range(orders_this_hour):
        timestamp = current_date.replace(hour=hour, minute=np.random.randint(0, 60))

        num_items = np.random.choice([1, 2, 3, 4], p=[0.4, 0.35, 0.20, 0.05])
        selected_items = np.random.choice(
          menu_items,
          size=num_items,
          replace=False,
          p=[item['popularity'] for item in menu_items]
        )

        discount_applied = 0
        if not is_peak and np.random.random() < 0.2:
          discount_applied = int(np.random.choice([10, 15, 20]))

        total_price = sum(item['price'] for item in selected_items)
        final_price = total_price * (1 - discount_applied / 100)

        orders.append({
          'order_id': f'order_{len(orders)}',
          'timestamp': timestamp.isoformat(),
          'day_of_week': timestamp.strftime('%A'),
          'hour': hour,
          'is_weekend': is_weekend,
          'is_peak': is_peak,
          'items': [item['id'] for item in selected_items],
          'total_price': total_price,
          'discount_applied': discount_applied,
          'final_price': final_price,
          'order_duration': int(np.random.randint(20, 45)),
        })

  return pd.DataFrame(orders)


if __name__ == "__main__":
  df = generate_restaurant_data(180)
  df.to_csv('synthetic_restaurant_data.csv', index=False)
  print(f"Generated {len(df)} synthetic orders")

