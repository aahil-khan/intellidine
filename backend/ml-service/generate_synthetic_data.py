import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from faker import Faker

fake = Faker()


def generate_restaurant_data(num_days: int = 365) -> pd.DataFrame:
  """Generate synthetic restaurant order data with realistic discount patterns."""

  menu_items = [
    {'id': 'item_001', 'name': 'Paneer Tikka', 'price': 280, 'category': 'appetizer', 'popularity': 0.15, 'perishable': True},
    {'id': 'item_002', 'name': 'Chicken Wings', 'price': 320, 'category': 'appetizer', 'popularity': 0.12, 'perishable': True},
    {'id': 'item_003', 'name': 'Dal Makhani', 'price': 250, 'category': 'main', 'popularity': 0.18, 'perishable': True},
    {'id': 'item_004', 'name': 'Butter Chicken', 'price': 380, 'category': 'main', 'popularity': 0.20, 'perishable': True},
    {'id': 'item_005', 'name': 'Garlic Naan', 'price': 50, 'category': 'side', 'popularity': 0.25, 'perishable': True},
    {'id': 'item_006', 'name': 'Gulab Jamun', 'price': 120, 'category': 'dessert', 'popularity': 0.10, 'perishable': True},
  ]

  start_date = datetime.now() - timedelta(days=num_days)
  orders = []

  for day in range(num_days):
    current_date = start_date + timedelta(days=day)
    is_weekend = current_date.weekday() >= 5
    is_month_end = current_date.day >= 25
    is_holiday_week = current_date.month in [12, 11]  # Festival season

    base_orders_per_day = 80 if not is_weekend else 104
    base_orders_per_day *= 1.3 if is_month_end else 1.0
    base_orders_per_day *= 1.2 if is_holiday_week else 1.0

    for hour in range(11, 23):
      is_lunch_peak = 12 <= hour <= 14
      is_dinner_peak = 19 <= hour <= 22
      is_peak = is_lunch_peak or is_dinner_peak
      
      orders_this_hour = int(base_orders_per_day / 12 * (1.5 if is_peak else 0.6))

      for _ in range(orders_this_hour):
        timestamp = current_date.replace(hour=hour, minute=np.random.randint(0, 60))

        num_items = np.random.choice([1, 2, 3, 4], p=[0.4, 0.35, 0.20, 0.05])
        selected_items = np.random.choice(
          menu_items,
          size=num_items,
          replace=False,
          p=[item['popularity'] for item in menu_items]
        )

        # Realistic inventory levels (simulated as stock percentage)
        low_inventory_chance = 0.15 if not is_peak else 0.05
        inventory_level = np.random.choice([20, 35, 50, 70, 85, 95], p=[low_inventory_chance, 0.15, 0.2, 0.25, 0.2, 0.05])

        # Smart discount logic based on real patterns:
        # 1. Low inventory + off-peak = higher discount probability
        # 2. Peak hours = rarely discounted
        # 3. Month-end/holidays = more aggressive discounts
        # 4. Weekend off-peak = moderate discounts

        discount_applied = 0
        
        if is_peak:
          # Almost never discount during peak
          discount_applied = 0 if np.random.random() > 0.95 else np.random.choice([5, 10])
        else:
          # Off-peak discounting logic
          discount_prob = 0.35  # Base 35% chance
          
          # Increase discount if inventory is low
          if inventory_level < 30:
            discount_prob += 0.35
          elif inventory_level < 50:
            discount_prob += 0.15
          
          # More discounts on weekends
          if is_weekend:
            discount_prob += 0.1
          
          # More discounts at month-end
          if is_month_end:
            discount_prob += 0.15
          
          discount_prob = min(0.85, discount_prob)  # Cap at 85%
          
          if np.random.random() < discount_prob:
            # Discount amount varies by inventory level
            if inventory_level < 30:
              discount_applied = int(np.random.choice([15, 20, 25], p=[0.3, 0.5, 0.2]))
            elif inventory_level < 50:
              discount_applied = int(np.random.choice([10, 15, 20], p=[0.4, 0.4, 0.2]))
            else:
              discount_applied = int(np.random.choice([5, 10, 15], p=[0.5, 0.35, 0.15]))

        total_price = sum(item['price'] for item in selected_items)
        final_price = total_price * (1 - discount_applied / 100)

        orders.append({
          'hour': hour,
          'day_of_week': current_date.weekday(),
          'is_weekend': int(is_weekend),
          'is_lunch_peak': int(is_lunch_peak),
          'is_dinner_peak': int(is_dinner_peak),
          'is_month_end': int(is_month_end),
          'is_holiday_week': int(is_holiday_week),
          'inventory_level': inventory_level,
          'num_items': num_items,
          'total_price': total_price,
          'discount_applied': int(discount_applied),  # This is our target: 0, 5, 10, 15, 20, 25
          'final_price': final_price,
          'order_duration': int(np.random.randint(20, 45)),
        })

  return pd.DataFrame(orders)


if __name__ == "__main__":
  df = generate_restaurant_data(180)
  df.to_csv('synthetic_restaurant_data.csv', index=False)
  print(f"Generated {len(df)} synthetic orders")

