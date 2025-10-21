# Menu Service - Complete Guide

**Port**: 3102  
**Language**: TypeScript (NestJS)  
**Database**: PostgreSQL + Redis Cache  
**Responsibility**: Restaurant menus, menu items, categories, availability, pricing

---

## What Menu Service Does

The Menu Service manages **everything food-related**:

- ✅ Store restaurant menus with multiple categories
- ✅ Manage menu items (name, description, price, images)
- ✅ Item availability (in-stock vs out-of-stock)
- ✅ Item variants (sizes, add-ons, customizations)
- ✅ Category organization (Appetizers, Mains, Desserts, etc)
- ✅ Pricing rules per tenant (multi-restaurant support)
- ✅ Menu versions (different menus for breakfast/lunch/dinner)
- ✅ Caching for fast retrieval

---

## Menu Structure

### Get All Menu Items

```
GET /api/menu/items?category=MAIN_COURSE

Response:
{
  "success": true,
  "data": [
    {
      "id": "item-123",
      "name": "Butter Chicken",
      "description": "Tender chicken in rich tomato-based gravy",
      "price": 350,
      "category": "MAIN_COURSE",
      "image_url": "https://cdn.example.com/butter-chicken.jpg",
      "is_vegetarian": false,
      "is_available": true,
      "preparation_time_minutes": 15,
      "variants": [
        {
          "id": "var-1",
          "name": "Size",
          "options": ["Half", "Full", "Extra Large"]
        },
        {
          "id": "var-2",
          "name": "Spice Level",
          "options": ["Mild", "Medium", "Hot", "Extra Hot"]
        }
      ],
      "allergens": ["dairy", "gluten"],
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### Get Menu Item Details

```
GET /api/menu/items/item-123

Response:
{
  "success": true,
  "data": {
    "id": "item-123",
    "tenant_id": "11111111-1111-1111-1111-111111111111",
    "name": "Butter Chicken",
    "description": "Tender chicken in rich tomato-based gravy with cream",
    "price": 350,
    "category": "MAIN_COURSE",
    "image_url": "https://cdn.example.com/butter-chicken.jpg",
    "is_vegetarian": false,
    "is_available": true,
    "preparation_time_minutes": 15,
    "nutritional_info": {
      "calories": 420,
      "protein_g": 25,
      "carbs_g": 18,
      "fat_g": 22
    },
    "variants": [
      {
        "id": "var-1",
        "name": "Size",
        "is_required": true,
        "options": [
          {
            "name": "Half",
            "price_modifier": 0
          },
          {
            "name": "Full",
            "price_modifier": 0
          },
          {
            "name": "Extra Large",
            "price_modifier": 100
          }
        ]
      }
    ],
    "allergens": ["dairy", "gluten"],
    "tags": ["spicy", "popular", "bestseller"]
  }
}
```

### Get Categories

```
GET /api/menu/categories

Response:
{
  "success": true,
  "data": [
    {
      "id": "cat-1",
      "name": "Appetizers",
      "display_order": 1,
      "icon_url": "https://cdn.example.com/appetizers.png",
      "item_count": 12
    },
    {
      "id": "cat-2",
      "name": "Main Course",
      "display_order": 2,
      "icon_url": "https://cdn.example.com/main.png",
      "item_count": 18
    },
    {
      "id": "cat-3",
      "name": "Breads",
      "display_order": 3,
      "icon_url": "https://cdn.example.com/breads.png",
      "item_count": 8
    }
  ]
}
```

---

## Menu Item Operations (Staff Only)

### Create Menu Item

```
POST /api/menu/items

Headers:
Authorization: Bearer <jwt_token>
X-Tenant-ID: 11111111-1111-1111-1111-111111111111

Body:
{
  "name": "Paneer Tikka",
  "description": "Indian cheese marinated in yogurt and spices",
  "price": 280,
  "category": "APPETIZERS",
  "is_vegetarian": true,
  "preparation_time_minutes": 12,
  "image_url": "https://cdn.example.com/paneer-tikka.jpg",
  "variants": [
    {
      "name": "Serving",
      "options": ["4 pieces", "6 pieces", "8 pieces"]
    }
  ]
}

Response:
{
  "success": true,
  "data": {
    "id": "item-456",
    "name": "Paneer Tikka",
    "price": 280,
    "is_available": true,
    "created_at": "2024-10-22T14:30:00Z"
  }
}
```

### Update Item Availability

```
PATCH /api/menu/items/item-123/availability

Headers:
Authorization: Bearer <jwt_token>
X-Tenant-ID: 11111111-1111-1111-1111-111111111111

Body:
{
  "is_available": false,
  "reason": "Ingredient out of stock"
}

Response:
{
  "success": true,
  "data": {
    "id": "item-123",
    "name": "Butter Chicken",
    "is_available": false,
    "updated_at": "2024-10-22T15:00:00Z"
  }
}
```

### Update Item Price

```
PATCH /api/menu/items/item-123/price

Headers:
Authorization: Bearer <jwt_token>
X-Tenant-ID: 11111111-1111-1111-1111-111111111111

Body:
{
  "price": 380,
  "effective_from": "2024-11-01"
}

Response:
{
  "success": true,
  "data": {
    "id": "item-123",
    "name": "Butter Chicken",
    "price": 380,
    "price_history": [
      { "price": 350, "from": "2024-01-15", "to": "2024-10-31" },
      { "price": 380, "from": "2024-11-01", "to": null }
    ]
  }
}
```

---

## Database Schema

```typescript
model MenuItem {
  id                        String   @id @default(uuid())
  tenant_id                 String
  name                      String
  description               String?
  price                     Decimal
  category                  String
  image_url                 String?
  is_vegetarian             Boolean  @default(false)
  is_available              Boolean  @default(true)
  preparation_time_minutes  Int
  allergens                 String[] @default([])
  tags                      String[] @default([])
  created_at                DateTime @default(now())
  updated_at                DateTime @updatedAt

  variants MenuItemVariant[]
  orderItems OrderItem[]

  @@unique([tenant_id, name])
  @@index([tenant_id])
  @@index([category])
  @@map("menu_items")
}

model MenuItemVariant {
  id              String   @id @default(uuid())
  menu_item_id    String
  name            String
  is_required     Boolean  @default(false)
  display_order   Int
  created_at      DateTime @default(now())

  menu_item MenuItem @relation(fields: [menu_item_id], references: [id], onDelete: Cascade)
  options VariantOption[]

  @@map("menu_item_variants")
}

model VariantOption {
  id              String   @id @default(uuid())
  variant_id      String
  name            String
  price_modifier  Decimal  @default(0)
  display_order   Int
  created_at      DateTime @default(now())

  variant MenuItemVariant @relation(fields: [variant_id], references: [id], onDelete: Cascade)

  @@map("variant_options")
}

model MenuCategory {
  id              String   @id @default(uuid())
  tenant_id       String
  name            String
  display_order   Int
  icon_url        String?
  created_at      DateTime @default(now())

  @@unique([tenant_id, name])
  @@index([tenant_id])
  @@map("menu_categories")
}
```

---

## Caching Strategy

Menu data is heavily cached for **fast retrieval**:

```
// Cache all menu items per tenant
SET menu:tenant:<tenant_id>:items <json> EX 3600
// 1-hour expiry

// Cache categories
SET menu:tenant:<tenant_id>:categories <json> EX 3600

// Cache individual item (for detailed view)
SET menu:item:<item_id> <json> EX 1800
// 30-minute expiry

// When availability changes:
DEL menu:item:<item_id>
DEL menu:tenant:<tenant_id>:items
→ Cache invalidation - next request refetches from DB
```

### Cache Invalidation Triggers

1. **Item created** → Invalidate category list
2. **Item updated** → Invalidate item cache + category list
3. **Availability changed** → Invalidate item + list
4. **Price changed** → Invalidate item cache
5. **Category modified** → Invalidate category list

---

## Endpoints Summary

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| `GET` | `/api/menu/items` | List all items (with filters) | Optional (cached if not) |
| `GET` | `/api/menu/items/:id` | Get item details | Optional |
| `GET` | `/api/menu/categories` | List categories | Optional |
| `POST` | `/api/menu/items` | Create item | JWT + MANAGER |
| `PATCH` | `/api/menu/items/:id` | Update item | JWT + MANAGER |
| `PATCH` | `/api/menu/items/:id/availability` | Toggle availability | JWT + MANAGER |
| `PATCH` | `/api/menu/items/:id/price` | Update price | JWT + MANAGER |
| `DELETE` | `/api/menu/items/:id` | Delete item | JWT + SUPER_ADMIN |

---

## Real-World Scenarios

### Scenario 1: Frontend Loading Menu on QR Scan

```
1. Customer scans QR → gets tenant_id
2. Frontend: GET /api/menu/items?tenant_id=111...
3. Menu Service: checks Redis cache
4. Cache HIT: return 80ms
5. Cache MISS: query PostgreSQL, cache result
6. Frontend receives 60 items, displays 4 categories
```

### Scenario 2: Item Goes Out of Stock

```
1. Kitchen staff realizes Butter Chicken base finished
2. Staff calls: PATCH /api/menu/items/item-123/availability
3. Menu Service: updates PostgreSQL
4. Menu Service: invalidates Redis cache
5. Next customer to browse menu sees updated status
6. If order placed with unavailable item → Order Service rejects
```

### Scenario 3: Daily Price Update

```
Monday-Friday: Butter Chicken = 350
Saturday-Sunday: Butter Chicken = 400

1. Manager updates: PATCH /api/menu/items/item-123/price
   - Price: 350 (until Friday)
   - New effective_from: Saturday
2. Menu Service: records price history
3. On Saturday, fetches current price automatically
4. Orders created Saturday use 400 price
```

---

## Performance Characteristics

- **List all items**: 20-50ms (Redis cached)
- **Get item details**: 15-30ms (Redis cached)
- **List categories**: 10-20ms (Redis cached)
- **Create item**: 100-150ms (database write + cache invalidation)
- **Update availability**: 80-120ms (database update + cache clear)
- **Cache hit rate**: ~85-90% for typical restaurant

---

## Testing Menu Service

```bash
# Get all menu items
curl http://localhost:3100/api/menu/items \
  -H "X-Tenant-ID: 11111111-1111-1111-1111-111111111111"

# Get item details
curl http://localhost:3100/api/menu/items/item-123

# Get categories
curl http://localhost:3100/api/menu/categories

# Create item (staff only)
curl -X POST http://localhost:3100/api/menu/items \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: 11111111-1111-1111-1111-111111111111" \
  -d '{
    "name": "Biryani",
    "price": 450,
    "category": "MAIN_COURSE"
  }'
```

---

**See Also**:
- [SYSTEM_OVERVIEW.md](../SYSTEM_OVERVIEW.md) - Menu Service in architecture
- [ORDERING_WORKFLOW.md](../workflows/ORDERING_WORKFLOW.md) - Menu browsing step-by-step
