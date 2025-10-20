IntelliDine: Product Requirements Document (PRD)
Phase 1 - MVP Development Specification
Version: 1.0
Date: October 17, 2025
Team: The Neutral Team (TNT)
Purpose: Complete technical specification for Cursor AI-assisted development

1. EXECUTIVE SUMMARY
IntelliDine is a microservices-based restaurant management SaaS platform designed to optimize operations through QR-based ordering, intelligent inventory management, and AI-powered dynamic pricing. Phase 1 delivers a Simple, Lovable, Complete MVP supporting 10 restaurants with 50-100 concurrent users each.

Core Features (Phase 1)
Customer QR ordering with SMS OTP verification

Kitchen Display System (KDS) with real-time updates

Manager dashboard with menu & inventory management

Rule-based discount engine with ML shadow mode

Hybrid payment system (Razorpay + Cash)

Basic analytics dashboard

Multi-tenant architecture with RBAC

Real-time notifications via Socket.io

2. TECHNICAL ARCHITECTURE
2.1 System Architecture
text
Frontend (Vercel) → Nginx → API Gateway → Microservices → PostgreSQL/Redis/Kafka
2.2 Microservices
API Gateway (Port 3000) - Request routing, JWT validation

Auth Service (Port 3001) - Authentication, OTP, RBAC

Order Service (Port 3002) - Order lifecycle management

Menu Service (Port 3003) - Menu CRUD, caching

Inventory Service (Port 3004) - Inventory tracking, auto-deduction

Payment Service (Port 3005) - Razorpay integration, cash payments

Notification Service (Port 3006) - Socket.io real-time updates

Analytics Service (Port 3007) - Data aggregation, reporting

Discount Engine (Port 3008) - Rule evaluation, ML integration

ML Service (Port 8000) - Python/FastAPI, XGBoost predictions

3. TECHNOLOGY STACK
Backend
Runtime: Node.js 20.x LTS

Framework: NestJS 10.x (TypeScript)

ORM: Prisma 5.x

Database: PostgreSQL 15.x + PgBouncer

Cache: Redis 7.x (ioredis client)

Message Queue: Apache Kafka 3.x (KafkaJS)

Real-time: Socket.io 4.x

Auth: JWT + bcrypt

Validation: class-validator, class-transformer

ML Stack
Runtime: Python 3.11+

Framework: FastAPI

ML Library: XGBoost

Data: Pandas, NumPy

Synthetic Data: Faker

Frontend
Framework: React 18.x + TypeScript

Build Tool: Vite 5.x

State: Zustand

UI: Tailwind CSS + Shadcn UI

HTTP: Axios

Real-time: Socket.io Client

QR: html5-qrcode

Charts: Recharts

Infrastructure
Containers: Docker + Docker Swarm

Reverse Proxy: Nginx

SSL: Let's Encrypt

CI/CD: GitHub Actions

Monitoring: Prometheus + Grafana

Logging: Loki + Promtail

Tracing: Jaeger

External Services
SMS: MSG91 (OTP)

Payment: Razorpay (UPI/Cards)

Frontend Host: Vercel

Backend Host: Ubuntu home server

4. DATABASE SCHEMA (Prisma)
text
// Complete schema for implementation

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ========== TENANTS & USERS ==========

model Tenant {
  id              String   @id @default(uuid())
  name            String
  address         String
  contact         String
  owner_email     String
  operating_hours Json
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt
  is_active       Boolean  @default(true)

  tables         Table[]
  users          User[]
  menu_items     MenuItem[]
  orders         Order[]
  inventory      Inventory[]
  pricing_rules  PricingRule[]

  @@map("tenants")
}

model User {
  id                String   @id @default(uuid())
  tenant_id         String?
  username          String   @unique
  email             String   @unique
  password_hash     String
  role              Role
  is_temp_password  Boolean  @default(false)
  is_active         Boolean  @default(true)
  created_at        DateTime @default(now())
  updated_at        DateTime @updatedAt

  tenant Tenant? @relation(fields: [tenant_id], references: [id])

  @@map("users")
}

enum Role {
  SUPER_ADMIN
  MANAGER
  KITCHEN_STAFF
  WAITER
}

model Customer {
  id           String   @id @default(uuid())
  phone_number String   @unique
  name         String?
  created_at   DateTime @default(now())
  updated_at   DateTime @updatedAt

  orders Order[]

  @@map("customers")
}

model OtpVerification {
  id           String   @id @default(uuid())
  phone_number String
  otp_hash     String
  created_at   DateTime @default(now())
  expires_at   DateTime
  verified     Boolean  @default(false)

  @@index([phone_number, expires_at])
  @@map("otp_verifications")
}

// ========== TABLES ==========

model Table {
  id           String   @id @default(uuid())
  tenant_id    String
  table_number Int
  capacity     Int
  qr_code_url  String
  created_at   DateTime @default(now())

  tenant Tenant  @relation(fields: [tenant_id], references: [id])
  orders Order[]

  @@unique([tenant_id, table_number])
  @@map("tables")
}

// ========== MENU ==========

model Category {
  id            String     @id @default(uuid())
  name          String
  display_order Int        @default(0)
  created_at    DateTime   @default(now())

  menu_items MenuItem[]

  @@map("categories")
}

model MenuItem {
  id                  String   @id @default(uuid())
  tenant_id           String
  category_id         String
  name                String
  description         String?
  image_url           String?
  price               Decimal  @db.Decimal(10, 2)
  cost_price          Decimal? @db.Decimal(10, 2)
  original_price      Decimal? @db.Decimal(10, 2)
  discount_percentage Int      @default(0)
  dietary_tags        String[]
  preparation_time    Int
  is_available        Boolean  @default(true)
  is_deleted          Boolean  @default(false)
  created_at          DateTime @default(now())
  updated_at          DateTime @updatedAt

  tenant             Tenant             @relation(fields: [tenant_id], references: [id])
  category           Category           @relation(fields: [category_id], references: [id])
  order_items        OrderItem[]
  pricing_history    PricingHistory[]
  recipe_ingredients RecipeIngredient[]

  @@index([tenant_id, is_available, is_deleted])
  @@map("menu_items")
}

model PricingHistory {
  id             String   @id @default(uuid())
  item_id        String
  old_price      Decimal  @db.Decimal(10, 2)
  new_price      Decimal  @db.Decimal(10, 2)
  discount_percent Int     @default(0)
  reason         String?
  changed_by     String
  changed_at     DateTime @default(now())

  item MenuItem @relation(fields: [item_id], references: [id])

  @@map("pricing_history")
}

// ========== ORDERS ==========

model Order {
  id          String      @id @default(uuid())
  tenant_id   String
  customer_id String
  table_number Int
  status      OrderStatus @default(PENDING)
  subtotal    Decimal     @db.Decimal(10, 2)
  gst         Decimal     @db.Decimal(10, 2)
  total       Decimal     @db.Decimal(10, 2)
  created_at  DateTime    @default(now())
  updated_at  DateTime    @updatedAt

  tenant         Tenant              @relation(fields: [tenant_id], references: [id])
  customer       Customer            @relation(fields: [customer_id], references: [id])
  table          Table?              @relation(fields: [tenant_id, table_number], references: [tenant_id, table_number])
  items          OrderItem[]
  status_history OrderStatusHistory[]
  payment        Payment?

  @@index([tenant_id, status, created_at])
  @@map("orders")
}

enum OrderStatus {
  PENDING
  PREPARING
  READY
  SERVED
  COMPLETED
  CANCELLED
  AWAITING_CASH_PAYMENT
}

model OrderItem {
  id               String  @id @default(uuid())
  order_id         String
  item_id          String
  quantity         Int
  unit_price       Decimal @db.Decimal(10, 2)
  subtotal         Decimal @db.Decimal(10, 2)
  special_requests String?

  order Order    @relation(fields: [order_id], references: [id])
  item  MenuItem @relation(fields: [item_id], references: [id])

  @@map("order_items")
}

model OrderStatusHistory {
  id         String      @id @default(uuid())
  order_id   String
  status     OrderStatus
  changed_at DateTime    @default(now())
  changed_by String?

  order Order @relation(fields: [order_id], references: [id])

  @@map("order_status_history")
}

// ========== PAYMENTS ==========

model Payment {
  id                  String        @id @default(uuid())
  order_id            String        @unique
  amount              Decimal       @db.Decimal(10, 2)
  payment_method      PaymentMethod
  status              PaymentStatus @default(PENDING)
  razorpay_order_id   String?
  razorpay_payment_id String?
  amount_received     Decimal?      @db.Decimal(10, 2)
  change_given        Decimal?      @db.Decimal(10, 2)
  confirmed_by        String?
  confirmed_at        DateTime?
  created_at          DateTime      @default(now())

  order Order @relation(fields: [order_id], references: [id])

  @@map("payments")
}

enum PaymentMethod {
  RAZORPAY
  CASH
}

enum PaymentStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}

model CashPayment {
  id              String   @id @default(uuid())
  payment_id      String
  order_id        String
  amount_received Decimal  @db.Decimal(10, 2)
  change_given    Decimal  @db.Decimal(10, 2)
  collected_by    String
  timestamp       DateTime @default(now())

  @@map("cash_payments")
}

// ========== INVENTORY ==========

model Inventory {
  id            String   @id @default(uuid())
  tenant_id     String
  item_name     String
  category      String
  quantity      Decimal  @db.Decimal(10, 3)
  unit          String
  reorder_level Decimal  @db.Decimal(10, 3)
  cost_price    Decimal? @db.Decimal(10, 2)
  expiry_date   DateTime?
  created_at    DateTime @default(now())
  updated_at    DateTime @updatedAt

  tenant             Tenant                  @relation(fields: [tenant_id], references: [id])
  recipe_ingredients RecipeIngredient[]

  @@unique([tenant_id, item_name])
  @@index([tenant_id, quantity, reorder_level])
  @@map("inventory")
}

model RecipeIngredient {
  id                String  @id @default(uuid())
  tenant_id         String
  menu_item_id      String
  ingredient_id     String
  quantity_required Decimal @db.Decimal(10, 3)
  unit              String
  created_at        DateTime @default(now())

  menu_item  MenuItem  @relation(fields: [menu_item_id], references: [id])
  ingredient Inventory @relation(fields: [ingredient_id], references: [id])

  @@map("recipe_ingredients")
}

model InventoryAdjustment {
  id           String   @id @default(uuid())
  tenant_id    String
  item_id      String
  item_name    String
  old_quantity Decimal  @db.Decimal(10, 3)
  new_quantity Decimal  @db.Decimal(10, 3)
  reason       String
  adjusted_by  String
  timestamp    DateTime @default(now())

  @@map("inventory_adjustments")
}

// ========== DISCOUNT ENGINE ==========

model PricingRule {
  id         String   @id @default(uuid())
  tenant_id  String
  name       String
  conditions Json
  action     Json
  auto_apply Boolean  @default(false)
  is_active  Boolean  @default(true)
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  tenant Tenant @relation(fields: [tenant_id], references: [id])

  @@map("pricing_rules")
}

model DiscountSuggestion {
  id                  String   @id @default(uuid())
  tenant_id           String
  item_id             String
  suggested_discount  Int
  suggested_price     Decimal  @db.Decimal(10, 2)
  reason              String
  confidence          Decimal  @db.Decimal(3, 2)
  source              String
  status              String   @default("PENDING")
  created_at          DateTime @default(now())
  expires_at          DateTime

  @@index([tenant_id, status, expires_at])
  @@map("discount_suggestions")
}

model MlPrediction {
  id              String   @id @default(uuid())
  tenant_id       String
  item_id         String
  predicted_discount Int
  confidence      Decimal  @db.Decimal(3, 2)
  features_used   Json
  model_version   String
  created_at      DateTime @default(now())

  @@map("ml_predictions")
}

// ========== ANALYTICS ==========

model OrderHistory {
  id          String   @id @default(uuid())
  tenant_id   String
  order_id    String
  customer_id String
  items       Json
  subtotal    Decimal  @db.Decimal(10, 2)
  total       Decimal  @db.Decimal(10, 2)
  timestamp   DateTime @default(now())

  @@index([tenant_id, timestamp])
  @@map("order_history")
}

model DailyMetrics {
  id            String   @id @default(uuid())
  tenant_id     String
  date          DateTime @db.Date
  total_orders  Int      @default(0)
  total_revenue Decimal  @db.Decimal(10, 2) @default(0)
  avg_order_value Decimal @db.Decimal(10, 2) @default(0)

  @@unique([tenant_id, date])
  @@map("daily_metrics")
}
5. API SPECIFICATIONS
5.1 Authentication APIs
Request OTP
text
POST /api/auth/customer/request-otp
Content-Type: application/json

Request:
{
  "phone_number": "+919876543210",
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000"
}

Response: 200 OK
{
  "message": "OTP sent",
  "otp_id": "otp_abc123",
  "expires_at": "2025-10-17T18:35:00Z"
}
Verify OTP
text
POST /api/auth/customer/verify-otp

Request:
{
  "otp_id": "otp_abc123",
  "otp_code": "123456",
  "phone_number": "+919876543210"
}

Response: 200 OK
Set-Cookie: auth_token=<jwt>; HttpOnly; Secure

{
  "customer_id": "cust_xyz789",
  "token": "<jwt>"
}
Staff Login
text
POST /api/auth/staff/login

Request:
{
  "username": "spiceroute_admin",
  "password": "SecurePass123!"
}

Response: 200 OK
{
  "user_id": "user_123",
  "tenant_id": "550e8400...",
  "role": "MANAGER",
  "token": "<jwt>"
}
5.2 Menu APIs
Get Menu
text
GET /api/menu?tenant_id=550e8400
Cache-Control: public, max-age=300

Response: 200 OK
{
  "categories": [
    {
      "id": "cat_001",
      "name": "Appetizers",
      "items": [
        {
          "id": "item_001",
          "name": "Paneer Tikka",
          "price": 280,
          "discount_percentage": 0,
          "is_available": true
        }
      ]
    }
  ]
}
Create Menu Item
text
POST /api/menu/items
Authorization: Bearer <manager_jwt>

Request:
{
  "name": "Paneer Tikka",
  "category_id": "cat_001",
  "price": 280,
  "dietary_tags": ["veg"]
}

Response: 201 Created
5.3 Order APIs
Place Order
text
POST /api/orders
Authorization: Bearer <customer_jwt>

Request:
{
  "tenant_id": "550e8400...",
  "table_number": 5,
  "items": [
    {
      "item_id": "item_001",
      "quantity": 2,
      "special_requests": "Less spicy"
    }
  ]
}

Response: 201 Created
{
  "order_id": "order_789",
  "status": "PENDING",
  "total": 640.50
}
Update Order Status
text
PATCH /api/orders/:order_id/status
Authorization: Bearer <kitchen_jwt>

Request:
{
  "status": "PREPARING"
}

Response: 200 OK
5.4 Payment APIs
Create Razorpay Order
text
POST /api/payments/create-order

Request:
{
  "order_id": "order_789"
}

Response: 200 OK
{
  "razorpay_order_id": "order_MHzN8TXs9PkJqL",
  "amount": 64050,
  "key_id": "rzp_test_XXXXX"
}
Confirm Cash Payment
text
POST /api/payments/confirm-cash
Authorization: Bearer <waiter_jwt>

Request:
{
  "order_id": "order_789",
  "amount_received": 700
}

Response: 200 OK
6. IMPLEMENTATION GUIDE
6.1 Project Structure
text
intellidine/
├── backend/
│   ├── api-gateway/
│   │   ├── src/
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── auth-service/
│   ├── order-service/
│   ├── menu-service/
│   ├── inventory-service/
│   ├── payment-service/
│   ├── notification-service/
│   ├── analytics-service/
│   ├── discount-engine/
│   ├── ml-service/ (Python)
│   ├── prisma/
│   │   └── schema.prisma
│   └── docker-compose.yml
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── stores/ (Zustand)
│   │   ├── api/
│   │   └── App.tsx
│   ├── Dockerfile
│   └── package.json
├── monitoring/
│   ├── prometheus/
│   ├── grafana/
│   └── loki/
└── README.md
6.2 NestJS Service Template
typescript
// Example: Order Service Structure

// src/order/order.module.ts
import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { PrismaService } from '../prisma/prisma.service';
import { KafkaService } from '../kafka/kafka.service';

@Module({
  controllers: [OrderController],
  providers: [OrderService, PrismaService, KafkaService],
})
export class OrderModule {}

// src/order/order.service.ts
@Injectable()
export class OrderService {
  constructor(
    private prisma: PrismaService,
    private kafka: KafkaService,
  ) {}

  async createOrder(dto: CreateOrderDto): Promise<Order> {
    // 1. Validate items
    const items = await this.validateItems(dto.items);
    
    // 2. Check inventory
    const available = await this.checkInventory(dto.items);
    if (!available) throw new BadRequestException('Items unavailable');
    
    // 3. Create order
    const order = await this.prisma.order.create({
      data: {
        tenant_id: dto.tenant_id,
        customer_id: dto.customer_id,
        table_number: dto.table_number,
        status: 'PENDING',
        subtotal: this.calculateSubtotal(items),
        gst: this.calculateGST(items),
        total: this.calculateTotal(items),
        items: {
          create: dto.items.map(item => ({
            item_id: item.item_id,
            quantity: item.quantity,
            unit_price: items.find(i => i.id === item.item_id).price,
            subtotal: items.find(i => i.id === item.item_id).price * item.quantity,
            special_requests: item.special_requests,
          })),
        },
      },
      include: { items: true },
    });
    
    // 4. Publish Kafka event
    await this.kafka.publish('order.created', order);
    
    return order;
  }
}

// src/order/dto/create-order.dto.ts
import { IsUUID, IsArray, IsInt, Min, IsOptional, IsString } from 'class-validator';

export class CreateOrderDto {
  @IsUUID()
  tenant_id: string;

  @IsUUID()
  customer_id: string;

  @IsInt()
  @Min(1)
  table_number: number;

  @IsArray()
  items: OrderItemDto[];
}

export class OrderItemDto {
  @IsUUID()
  item_id: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  special_requests?: string;
}
6.3 Kafka Integration
typescript
// src/kafka/kafka.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Kafka, Producer, Consumer } from 'kafkajs';

@Injectable()
export class KafkaService implements OnModuleInit {
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'intellidine',
      brokers: [process.env.KAFKA_BROKER],
    });
    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: 'order-service' });
  }

  async onModuleInit() {
    await this.producer.connect();
    await this.consumer.connect();
  }

  async publish(topic: string, message: any) {
    await this.producer.send({
      topic,
      messages: [{ value: JSON.stringify(message) }],
    });
  }

  async subscribe(topic: string, callback: (message: any) => void) {
    await this.consumer.subscribe({ topic, fromBeginning: true });
    await this.consumer.run({
      eachMessage: async ({ message }) => {
        const data = JSON.parse(message.value.toString());
        callback(data);
      },
    });
  }
}
6.4 React Component Example
typescript
// frontend/src/pages/Menu.tsx
import { useEffect, useState } from 'react';
import { useMenuStore } from '@/stores/menuStore';
import { MenuItem } from '@/components/MenuItem';
import { Cart } from '@/components/Cart';

export const MenuPage = () => {
  const { menu, fetchMenu, loading } = useMenuStore();
  const [cart, setCart] = useState([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tenantId = params.get('tenant');
    const tableNumber = params.get('table');
    
    if (tenantId && tableNumber) {
      fetchMenu(tenantId);
    }
  }, []);

  const addToCart = (item) => {
    setCart([...cart, item]);
  };

  if (loading) return <div>Loading menu...</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Menu</h1>
      
      {menu.categories.map(category => (
        <div key={category.id} className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">{category.name}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {category.items.map(item => (
              <MenuItem 
                key={item.id} 
                item={item} 
                onAdd={addToCart} 
              />
            ))}
          </div>
        </div>
      ))}

      <Cart items={cart} />
    </div>
  );
};

// frontend/src/stores/menuStore.ts (Zustand)
import create from 'zustand';
import axios from 'axios';

export const useMenuStore = create((set) => ({
  menu: null,
  loading: false,
  
  fetchMenu: async (tenantId) => {
    set({ loading: true });
    const response = await axios.get(`/api/menu?tenant_id=${tenantId}`);
    set({ menu: response.data, loading: false });
  },
}));
7. ML SERVICE IMPLEMENTATION
7.1 Synthetic Data Generation
python
# ml-service/generate_synthetic_data.py
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from faker import Faker

fake = Faker()

def generate_restaurant_data(num_days=180):
    """Generate 6 months of synthetic restaurant order data"""
    
    # Menu items with popularity weights
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
        
        # Weekend has 30% more orders
        base_orders_per_day = 80 if not is_weekend else 104
        
        # Operating hours: 11 AM - 11 PM
        for hour in range(11, 23):
            # Peak hours: 12-2 PM (lunch), 7-10 PM (dinner)
            is_peak = (12 <= hour <= 14) or (19 <= hour <= 22)
            orders_this_hour = int(base_orders_per_day / 12 * (1.5 if is_peak else 0.7))
            
            for _ in range(orders_this_hour):
                timestamp = current_date.replace(hour=hour, minute=np.random.randint(0, 60))
                
                # Select items based on popularity (Pareto distribution)
                num_items = np.random.choice([1, 2, 3, 4], p=[0.4, 0.35, 0.20, 0.05])
                selected_items = np.random.choice(
                    menu_items,
                    size=num_items,
                    replace=False,
                    p=[item['popularity'] for item in menu_items]
                )
                
                # Simulate discount scenarios (20% of orders during off-peak)
                discount_applied = 0
                if not is_peak and np.random.random() < 0.2:
                    discount_applied = np.random.choice([10, 15, 20])
                
                total_price = sum(item['price'] for item in selected_items)
                final_price = total_price * (1 - discount_applied / 100)
                
                orders.append({
                    'order_id': f'order_{len(orders)}',
                    'timestamp': timestamp,
                    'day_of_week': timestamp.strftime('%A'),
                    'hour': hour,
                    'is_weekend': is_weekend,
                    'is_peak': is_peak,
                    'items': [item['id'] for item in selected_items],
                    'total_price': total_price,
                    'discount_applied': discount_applied,
                    'final_price': final_price,
                    'order_duration': np.random.randint(20, 45),  # minutes
                })
    
    return pd.DataFrame(orders)

# Generate and save
df = generate_restaurant_data(180)
df.to_csv('synthetic_restaurant_data.csv', index=False)
print(f"Generated {len(df)} synthetic orders")
7.2 XGBoost Model Training
python
# ml-service/train_model.py
import pandas as pd
import numpy as np
from xgboost import XGBRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
import joblib

def prepare_features(df):
    """Feature engineering for discount prediction"""
    
    # Time-based features
    df['hour'] = pd.to_datetime(df['timestamp']).dt.hour
    df['day_of_week_num'] = pd.to_datetime(df['timestamp']).dt.dayofweek
    df['is_weekend'] = df['day_of_week_num'] >= 5
    df['is_lunch_peak'] = ((df['hour'] >= 12) & (df['hour'] <= 14)).astype(int)
    df['is_dinner_peak'] = ((df['hour'] >= 19) & (df['hour'] <= 22)).astype(int)
    
    # Inventory simulation (would be real data in production)
    df['inventory_level'] = np.random.uniform(40, 100, len(df))
    
    # Historical sales features
    df['avg_sales_last_7_days'] = np.random.uniform(50, 150, len(df))
    
    feature_columns = [
        'hour', 'day_of_week_num', 'is_weekend',
        'is_lunch_peak', 'is_dinner_peak',
        'inventory_level', 'avg_sales_last_7_days'
    ]
    
    return df[feature_columns], df['discount_applied']

def train_model():
    # Load synthetic data
    df = pd.read_csv('synthetic_restaurant_data.csv')
    
    # Prepare features
    X, y = prepare_features(df)
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Train XGBoost model
    model = XGBRegressor(
        n_estimators=100,
        max_depth=5,
        learning_rate=0.1,
        objective='reg:squarederror',
        random_state=42
    )
    
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    
    print(f"Model Performance:")
    print(f"MAE: {mae:.2f}%")
    print(f"R²: {r2:.4f}")
    
    # Save model
    joblib.dump(model, 'discount_model.pkl')
    print("Model saved successfully")
    
    return model

if __name__ == '__main__':
    train_model()
7.3 FastAPI Service
python
# ml-service/main.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
import joblib
import numpy as np
from datetime import datetime

app = FastAPI()

# Load trained model
model = joblib.load('discount_model.pkl')

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
    """Generate discount predictions for menu items"""
    
    try:
        context = request.context
        predictions = []
        
        # Extract features from context
        current_hour = datetime.fromisoformat(context['current_time']).hour
        day_of_week = datetime.fromisoformat(context['current_time']).weekday()
        is_weekend = day_of_week >= 5
        is_lunch_peak = 12 <= current_hour <= 14
        is_dinner_peak = 19 <= current_hour <= 22
        
        # For each item in inventory
        for inv_item in context['inventory']:
            features = np.array([[
                current_hour,
                day_of_week,
                is_weekend,
                is_lunch_peak,
                is_dinner_peak,
                inv_item['stock_percentage'],
                context.get('avg_sales_7_days', 100)
            ]])
            
            # Predict discount
            predicted_discount = model.predict(features)[0]
            predicted_discount = max(0, min(50, int(predicted_discount)))  # Clamp 0-50%
            
            # Calculate confidence (dummy for now, use model.predict_proba in production)
            confidence = 0.75 if predicted_discount > 0 else 0.5
            
            if predicted_discount > 5:  # Only suggest if discount >= 5%
                predictions.append(PredictionResponse(
                    item_id=inv_item['item_id'],
                    discount_percentage=predicted_discount,
                    confidence=confidence,
                    features={
                        'hour': current_hour,
                        'inventory_level': inv_item['stock_percentage'],
                        'is_peak': is_lunch_peak or is_dinner_peak
                    }
                ))
        
        return predictions
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "healthy", "model_loaded": model is not None}
8. DEPLOYMENT CONFIGURATION
8.1 Docker Compose
text
# docker-compose.yml
version: '3.8'

services:
  # PostgreSQL
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: intellidine
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U admin"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  # Kafka & Zookeeper
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    depends_on:
      - zookeeper
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
    ports:
      - "9092:9092"

  # API Gateway
  api-gateway:
    build: ./backend/api-gateway
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://admin:${DB_PASSWORD}@postgres:5432/intellidine
      - REDIS_URL=redis://redis:6379
      - KAFKA_BROKER=kafka:9092
    depends_on:
      - postgres
      - redis
      - kafka

  # Auth Service
  auth-service:
    build: ./backend/auth-service
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=postgresql://admin:${DB_PASSWORD}@postgres:5432/intellidine
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - MSG91_AUTH_KEY=${MSG91_AUTH_KEY}
    depends_on:
      - postgres
      - redis

  # Order Service
  order-service:
    build: ./backend/order-service
    ports:
      - "3002:3002"
    environment:
      - DATABASE_URL=postgresql://admin:${DB_PASSWORD}@postgres:5432/intellidine
      - KAFKA_BROKER=kafka:9092
    depends_on:
      - postgres
      - kafka

  # Menu Service
  menu-service:
    build: ./backend/menu-service
    ports:
      - "3003:3003"
    environment:
      - DATABASE_URL=postgresql://admin:${DB_PASSWORD}@postgres:5432/intellidine
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis

  # Payment Service
  payment-service:
    build: ./backend/payment-service
    ports:
      - "3005:3005"
    environment:
      - DATABASE_URL=postgresql://admin:${DB_PASSWORD}@postgres:5432/intellidine
      - RAZORPAY_KEY_ID=${RAZORPAY_KEY_ID}
      - RAZORPAY_KEY_SECRET=${RAZORPAY_KEY_SECRET}
    depends_on:
      - postgres

  # ML Service
  ml-service:
    build: ./backend/ml-service
    ports:
      - "8000:8000"
    volumes:
      - ./backend/ml-service/models:/app/models

  # Prometheus
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./monitoring/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"

  # Grafana
  grafana:
    image: grafana/grafana:latest
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    volumes:
      - grafana_data:/var/lib/grafana
    ports:
      - "3001:3000"

volumes:
  postgres_data:
  redis_data:
  prometheus_data:
  grafana_data:
8.2 GitHub Actions CI/CD
text
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: |
          cd backend
          npm install
      
      - name: Run tests
        run: |
          cd backend
          npm test
      
      - name: Run linter
        run: |
          cd backend
          npm run lint

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /home/intellidine
            git pull origin main
            docker-compose down
            docker-compose up -d --build
            docker-compose ps
9. TESTING STRATEGY
9.1 Unit Testing (Jest)
typescript
// backend/order-service/src/order/order.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from './order.service';
import { PrismaService } from '../prisma/prisma.service';
import { KafkaService } from '../kafka/kafka.service';

describe('OrderService', () => {
  let service: OrderService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: PrismaService,
          useValue: {
            order: {
              create: jest.fn(),
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: KafkaService,
          useValue: {
            publish: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should create an order', async () => {
    const mockOrder = {
      id: 'order_123',
      tenant_id: 'tenant_1',
      status: 'PENDING',
      total: 640.50,
    };

    jest.spyOn(prisma.order, 'create').mockResolvedValue(mockOrder);

    const result = await service.createOrder({
      tenant_id: 'tenant_1',
      customer_id: 'cust_1',
      table_number: 5,
      items: [],
    });

    expect(result).toEqual(mockOrder);
    expect(prisma.order.create).toHaveBeenCalled();
  });
});
9.2 Integration Testing (Supertest)
typescript
// backend/order-service/test/order.e2e-spec.ts
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';

describe('Order API (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    // Get auth token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/staff/login')
      .send({ username: 'test', password: 'test123' });
    
    authToken = loginResponse.body.token;
  });

  it('/api/orders (POST) - should create order', () => {
    return request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        tenant_id: 'test-tenant',
        customer_id: 'test-customer',
        table_number: 5,
        items: [{ item_id: 'item_1', quantity: 2 }],
      })
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('order_id');
        expect(res.body.status).toBe('PENDING');
      });
  });

  afterAll(async () => {
    await app.close();
  });
});
9.3 Load Testing (K6)
javascript
// load-tests/order-flow.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'],   // Error rate should be below 1%
  },
};

const BASE_URL = 'https://api.intellidine.app';

export default function () {
  // 1. Request OTP
  const otpRes = http.post(`${BASE_URL}/api/auth/customer/request-otp`, JSON.stringify({
    phone_number: '+919876543210',
    tenant_id: 'test-tenant',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(otpRes, {
    'OTP request status is 200': (r) => r.status === 200,
  });

  sleep(1);

  // 2. Get menu
  const menuRes = http.get(`${BASE_URL}/api/menu?tenant_id=test-tenant`);

  check(menuRes, {
    'Menu fetch status is 200': (r) => r.status === 200,
    'Menu has items': (r) => JSON.parse(r.body).categories.length > 0,
  });

  sleep(2);

  // 3. Place order (assuming OTP verified and token obtained)
  const token = 'mock-jwt-token'; // In real test, get from OTP verification
  
  const orderRes = http.post(`${BASE_URL}/api/orders`, JSON.stringify({
    tenant_id: 'test-tenant',
    table_number: Math.floor(Math.random() * 20) + 1,
    items: [
      { item_id: 'item_001', quantity: 2 },
      { item_id: 'item_005', quantity: 1 },
    ],
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  check(orderRes, {
    'Order creation status is 201': (r) => r.status === 201,
    'Order has order_id': (r) => JSON.parse(r.body).order_id !== undefined,
  });

  sleep(1);
}
Run with:

bash
k6 run load-tests/order-flow.js
10. SUCCESS METRICS
Phase 1 Goals
Metric	Target	Measurement
System Uptime	99.5%	Uptime Kuma monitoring
API Response Time (p95)	<500ms	Prometheus metrics
Order Processing Time	<30 seconds	Kitchen Dashboard tracking
Customer OTP Success Rate	>95%	Auth Service logs
Payment Success Rate	>98%	Payment Service logs
Concurrent Users (per restaurant)	50-100	Load testing validation
Database Query Performance	<100ms	Prisma query logs
Frontend Load Time	<3 seconds	Lighthouse scores
Test Coverage	>80%	Jest coverage reports
Zero Data Loss	100%	Kafka message persistence
11. PHASE 2 ROADMAP
Future Enhancements (Post-MVP)
Advanced Fraud Detection

Device fingerprinting

Blacklist management

No-show tracking with penalties

Split Payment

Multi-payer sessions

Individual payment tracking

Timeout handling

Loyalty Program

Points system

Tier-based rewards

Personalized discounts

Advanced ML

Demand forecasting

Real-time pricing adjustments

Full ML model rollout (exit shadow mode)

Delivery/Takeaway

Order type selection

Address management

Delivery tracking

Multi-location Management

Chain restaurant support

Centralized inventory

Cross-location analytics

Third-Party Integrations

Zomato/Swiggy order sync

Accounting software export

SMS notifications for customers

12. DEVELOPMENT CHECKLIST
Week 1-2: Setup
 Initialize Git repository

 Setup Docker development environment

 Create Prisma schema

 Run initial migration

 Setup NestJS services skeleton

 Configure Kafka topics

 Generate synthetic data (180 days)

Week 3-4: Auth & Tenant
 Implement JWT authentication

 Build OTP service (MSG91 integration)

 Create Super Admin portal

 Restaurant onboarding flow

 QR code generation

 RBAC middleware

Week 5-7: Core Order Flow
 Menu Service (CRUD + caching)

 Order Service (create, update status)

 Kitchen Dashboard UI

 Customer ordering UI

 Real-time Socket.io notifications

 Inventory availability checks

Week 8-9: Payments
 Razorpay integration

 Payment webhook handling

 Cash payment flow

 Receipt generation (PDF)

 Payment reconciliation

Week 10-11: Inventory
 Excel upload/parsing

 Manual adjustments

 Auto-deduction logic

 Low stock alerts

 Expiry tracking cron job

Week 12-13: Discount Engine
 Rule configuration UI

 Batch job scheduler

 Rule evaluation engine

 ML service (FastAPI)

 Train XGBoost model

 Shadow mode logging

 Approval workflow

Week 14-15: Analytics & Monitoring
 Analytics dashboard

 Sales reports

 Prometheus setup

 Grafana dashboards

 Loki log aggregation

 Jaeger tracing

Week 16: Testing & Deployment
 Unit tests (80% coverage)

 Integration tests

 K6 load tests

 Postman collections

 Production deployment

 SSL certificates

 GitHub Actions CI/CD

 Documentation

13. ENVIRONMENT VARIABLES
bash
# .env.example

# Database
DATABASE_URL=postgresql://admin:password@localhost:5432/intellidine

# Redis
REDIS_URL=redis://localhost:6379

# Kafka
KAFKA_BROKER=localhost:9092

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRY=8h

# SMS (MSG91)
MSG91_AUTH_KEY=your-msg91-auth-key
MSG91_SENDER_ID=INTELLD

# Payment (Razorpay)
RAZORPAY_KEY_ID=rzp_test_XXXXXX
RAZORPAY_KEY_SECRET=your-razorpay-secret

# Frontend
VITE_API_URL=https://api.intellidine.app

# Monitoring
GRAFANA_PASSWORD=admin

# Server
NODE_ENV=production
PORT=3000
14. FINAL NOTES FOR CURSOR
Code Quality Standards
Use TypeScript strict mode

Follow ESLint + Prettier configs

Write JSDoc comments for all public methods

Use Prisma for all database operations

Validate all inputs with class-validator

Handle errors with custom exception filters

Log all important events with Winston

Use environment variables for all configs

Security Checklist
✅ HTTPS only (Let's Encrypt)

✅ JWT in httpOnly cookies

✅ bcrypt password hashing (10 rounds)

✅ Rate limiting on all endpoints

✅ Input validation and sanitization

✅ SQL injection prevention (Prisma ORM)

✅ CORS configuration

✅ Helmet.js security headers

Performance Optimization
Redis caching for menu (TTL: 5 min)

Redis caching for analytics (TTL: 5 min)

Database indexes on foreign keys

Connection pooling (PgBouncer)

Lazy loading for frontend components

Image optimization (WebP format)

Gzip compression for API responses

Monitoring Alerts
API response time > 1 second

Error rate > 1%

CPU usage > 80%

Memory usage > 85%

Disk usage > 90%

Database connection pool saturation

Kafka consumer lag > 1000 messages

CONCLUSION
This PRD provides complete technical specifications for building IntelliDine Phase 1 MVP. All implementation details, database schemas, API contracts, and code examples are included for Cursor AI-assisted development.