-- Seed: Small Indian restaurant (Spice Route)

-- Tenant
INSERT INTO tenants (id, name, address, contact, owner_email, operating_hours, created_at, updated_at, is_active)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Spice Route',
  'MG Road, Bengaluru',
  '+91-9876543210',
  'owner@spiceroute.example',
  '{"mon_fri": "11:00-23:00", "sat_sun": "11:00-23:30"}',
  NOW(), NOW(), TRUE
)
ON CONFLICT (id) DO NOTHING;

-- Staff Users
-- Password: Password@123 (hashed with bcrypt, 10 rounds)
-- These are default test credentials, CHANGE IN PRODUCTION
INSERT INTO users (id, tenant_id, username, email, password_hash, role, is_temp_password, is_active, created_at, updated_at)
VALUES
  (
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'manager1',
    'manager@spiceroute.com',
    '$2b$10$VbcPfEUxsheSvMt37.HGgOF7mAmaB0CGcyvbW9juJXwOzaisoW8Ie',
    'MANAGER',
    FALSE,
    TRUE,
    NOW(),
    NOW()
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    'chef1',
    'chef@spiceroute.com',
    '$2b$10$VbcPfEUxsheSvMt37.HGgOF7mAmaB0CGcyvbW9juJXwOzaisoW8Ie',
    'KITCHEN_STAFF',
    FALSE,
    TRUE,
    NOW(),
    NOW()
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    '11111111-1111-1111-1111-111111111111',
    'waiter1',
    'waiter@spiceroute.com',
    '$2b$10$VbcPfEUxsheSvMt37.HGgOF7mAmaB0CGcyvbW9juJXwOzaisoW8Ie',
    'WAITER',
    FALSE,
    TRUE,
    NOW(),
    NOW()
  )
ON CONFLICT DO NOTHING;

-- Tables (1-10)
INSERT INTO tables (id, tenant_id, table_number, capacity, qr_code_url, created_at)
VALUES
  (uuid_generate_v4(), '11111111-1111-1111-1111-111111111111', 1, 4, 'https://qr.local/1', NOW()),
  (uuid_generate_v4(), '11111111-1111-1111-1111-111111111111', 2, 4, 'https://qr.local/2', NOW()),
  (uuid_generate_v4(), '11111111-1111-1111-1111-111111111111', 3, 2, 'https://qr.local/3', NOW()),
  (uuid_generate_v4(), '11111111-1111-1111-1111-111111111111', 4, 2, 'https://qr.local/4', NOW()),
  (uuid_generate_v4(), '11111111-1111-1111-1111-111111111111', 5, 6, 'https://qr.local/5', NOW())
ON CONFLICT DO NOTHING;

-- Categories
INSERT INTO categories (id, name, display_order, created_at)
VALUES
  ('c-app', 'Appetizers', 1, NOW()),
  ('c-main', 'Main Course', 2, NOW()),
  ('c-side', 'Sides', 3, NOW()),
  ('c-des', 'Desserts', 4, NOW())
ON CONFLICT (id) DO NOTHING;

-- Menu items (subset)
INSERT INTO menu_items (
  id, tenant_id, category_id, name, description, image_url, price, cost_price, original_price,
  discount_percentage, dietary_tags, preparation_time, is_available, is_deleted, created_at, updated_at
) VALUES
  ('item_001', '11111111-1111-1111-1111-111111111111', 'c-app', 'Paneer Tikka', 'Smoked cottage cheese skewers', NULL, 280, 150, 280, 0, '{"veg"}', 15, TRUE, FALSE, NOW(), NOW()),
  ('item_003', '11111111-1111-1111-1111-111111111111', 'c-main', 'Dal Makhani', 'Creamy black lentils', NULL, 250, 90, 250, 0, '{"veg"}', 20, TRUE, FALSE, NOW(), NOW()),
  ('item_004', '11111111-1111-1111-1111-111111111111', 'c-main', 'Butter Chicken', 'Tomato-butter gravy', NULL, 380, 170, 380, 0, '{"non-veg"}', 25, TRUE, FALSE, NOW(), NOW()),
  ('item_005', '11111111-1111-1111-1111-111111111111', 'c-side', 'Garlic Naan', 'Leavened bread with garlic', NULL, 50, 12, 50, 0, '{"veg"}', 6, TRUE, FALSE, NOW(), NOW()),
  ('item_006', '11111111-1111-1111-1111-111111111111', 'c-des', 'Gulab Jamun', 'Reduced milk dumplings', NULL, 120, 35, 120, 0, '{"veg"}', 8, TRUE, FALSE, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Inventory
INSERT INTO inventory (id, tenant_id, item_name, category, quantity, unit, reorder_level, cost_price, expiry_date, created_at, updated_at)
VALUES
  (uuid_generate_v4(), '11111111-1111-1111-1111-111111111111', 'Paneer', 'Dairy', 10.000, 'kg', 2.000, 300.00, NOW() + INTERVAL '7 days', NOW(), NOW()),
  (uuid_generate_v4(), '11111111-1111-1111-1111-111111111111', 'Chicken', 'Meat', 15.000, 'kg', 3.000, 250.00, NOW() + INTERVAL '5 days', NOW(), NOW()),
  (uuid_generate_v4(), '11111111-1111-1111-1111-111111111111', 'Flour', 'Grocery', 50.000, 'kg', 10.000, 40.00, NULL, NOW(), NOW())
ON CONFLICT DO NOTHING;

