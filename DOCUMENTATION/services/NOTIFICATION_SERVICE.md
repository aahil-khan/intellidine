# Notification Service - Complete Guide

**Port**: 3106  
**Language**: TypeScript (NestJS)  
**Database**: PostgreSQL + Redis Cache  
**Message Queue**: Kafka (events subscription)  
**External Services**: Twilio/SNS (SMS), SendGrid (Email)  
**Responsibility**: Send notifications, manage communication channels

---

## What Notification Service Does

Notification Service is the **communication hub**:

- ✅ Send OTP via SMS
- ✅ Send order status updates (SMS/Email)
- ✅ Alert customers of order readiness
- ✅ Notify managers of low stock
- ✅ Send promotional messages
- ✅ Track notification delivery

---

## Notification Types

### OTP Notification (SMS)

```
Event: auth.otp_requested
Triggered by: Auth Service

Content:
"Your Intellidine OTP is: 123456. Valid for 5 minutes. Do not share with anyone."

Delivery: SMS via Twilio
Response time: 1-3 seconds
Success rate: 98%+
```

### Order Status Updates

```
Trigger 1: order.created
Content: "Order #XYZ placed! Est. ready in 15 mins. Order total: ₹1,250"

Trigger 2: order.status_changed to READY
Content: "Your order #XYZ is ready! Come pick it up at your table."

Trigger 3: payment.completed
Content: "Payment received for order #XYZ. Thank you for ordering!"

Trigger 4: order.cancelled
Content: "Your order #XYZ has been cancelled. Refund of ₹1,250 initiated."

Delivery: SMS + Optional Email
```

### Low Stock Alert (Manager Only)

```
Event: inventory.low_stock
Triggered by: Inventory Service

Content: "ALERT: Butter stock low (2.3 kg). Min required: 5 kg. Reorder quantity: 10 kg"

Delivery: SMS (instant) + Email (digest)
Recipient: manager1@restaurant.com, manager phone
```

---

## Kafka Event Processing

### Subscribed Events

```
Notification Service listens to:

1. auth.otp_requested
   → Send OTP SMS

2. order.created
   → Send order confirmation

3. order.status_changed
   → Send status update (PREPARING, READY, SERVED)

4. payment.completed
   → Send payment confirmation

5. inventory.low_stock
   → Alert manager

6. order.cancelled
   → Send cancellation notice

7. payment.refunded
   → Send refund confirmation
```

### Event Processing Flow

```
1. Kafka message received
2. Parse event data
3. Determine notification type + recipient
4. Format message (SMS/Email)
5. Send via external provider
6. Log delivery status
7. Retry if failed (exponential backoff)
```

---

## Database Schema

```typescript
model Notification {
  id                      String   @id @default(uuid())
  tenant_id               String
  recipient_type          RecipientType
  recipient_id            String
  recipient_email         String?
  recipient_phone         String?
  notification_type       NotificationType
  title                   String
  message                 String
  channel                 Channel[]
  status                  NotificationStatus
  event_id                String?
  created_at              DateTime @default(now())
  sent_at                 DateTime?
  read_at                 DateTime?

  delivery_logs DeliveryLog[]

  @@index([tenant_id])
  @@index([status])
  @@index([created_at])
  @@map("notifications")
}

enum RecipientType {
  CUSTOMER
  MANAGER
  STAFF
}

enum NotificationType {
  OTP
  ORDER_CONFIRMATION
  ORDER_STATUS_UPDATE
  ORDER_READY
  PAYMENT_CONFIRMATION
  LOW_STOCK_ALERT
  PROMOTIONAL
}

enum Channel {
  SMS
  EMAIL
  PUSH_NOTIFICATION
}

enum NotificationStatus {
  QUEUED
  SENDING
  SENT
  FAILED
  RETRYING
  DELIVERED
}

model DeliveryLog {
  id                      String   @id @default(uuid())
  notification_id         String
  channel                 Channel
  provider                String
  provider_message_id     String?
  status                  String
  error_message           String?
  retry_count             Int      @default(0)
  created_at              DateTime @default(now())

  notification Notification @relation(fields: [notification_id], references: [id])

  @@index([notification_id])
  @@map("delivery_logs")
}

model NotificationTemplate {
  id                      String   @id @default(uuid())
  tenant_id               String
  notification_type       NotificationType
  channel                 Channel
  template_name           String
  subject                 String?
  body                    String
  variables               String[]
  created_at              DateTime @default(now())

  @@unique([tenant_id, notification_type, channel])
  @@map("notification_templates")
}
```

---

## Endpoints Summary

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| `POST` | `/api/notifications/send` | Send manual notification | JWT + MANAGER |
| `GET` | `/api/notifications` | List notifications | JWT |
| `GET` | `/api/notifications/:id` | Get notification | JWT |
| `PATCH` | `/api/notifications/:id/mark-read` | Mark as read | JWT |
| `GET` | `/api/notifications/templates` | List templates | JWT + MANAGER |
| `POST` | `/api/notifications/templates` | Create template | JWT + ADMIN |

---

## Real-World Scenarios

### Scenario 1: Complete Order Journey Notifications

```
7:08 PM: Customer places order
→ Notification Service receives: order.created
→ SMS sent: "Order #12345 placed! Est. ready in 15 mins. Total: ₹1,250"
→ Status: DELIVERED

7:10 PM: Order marked as PREPARING
→ Notification Service receives: order.status_changed
→ SMS sent: "Your order is being prepared..."
→ Status: DELIVERED

7:23 PM: Order marked as READY
→ Notification Service receives: order.status_changed
→ SMS sent: "Your order is ready! Come pick it up at Table 5."
→ Status: DELIVERED

7:25 PM: Payment completed via Razorpay
→ Notification Service receives: payment.completed
→ SMS sent: "Payment confirmed for order #12345. Thank you!"
→ Status: DELIVERED
```

### Scenario 2: Low Stock Alert to Manager

```
12:30 PM: Stock falls below threshold
→ Inventory Service publishes: inventory.low_stock
→ Notification Service receives event
→ Alert created for manager1
→ SMS: "ALERT: Butter stock low (2.3 kg). Min: 5 kg. Reorder: 10 kg"
→ Email: Digest sent to manager@restaurant.com
→ Status: DELIVERED
```

### Scenario 3: OTP Delivery

```
7:00 PM: Customer scans QR and opens app
→ Auth Service generates OTP: 123456
→ Publishes: auth.otp_requested
→ Notification Service receives event
→ SMS sent via Twilio: "Your Intellidine OTP is: 123456. Valid for 5 mins."
→ Twilio confirmation: Message ID accepted
→ Status: DELIVERED
```

---

## External Provider Integration

### Twilio SMS

```
Configuration:
- Account SID: AC...
- Auth Token: (stored in env)
- From Number: +1234567890

Example SMS delivery:
POST https://api.twilio.com/2010-04-01/Accounts/AC.../Messages.json
Body:
{
  "From": "+1234567890",
  "To": "+919876543210",
  "Body": "Your Intellidine OTP is: 123456"
}

Response:
{
  "sid": "SM...",
  "status": "queued",
  "date_sent": "2024-10-22T19:08:30Z"
}
```

### SendGrid Email

```
Configuration:
- API Key: SG...
- From Email: orders@intellidine.com

Example Email:
POST https://api.sendgrid.com/v3/mail/send
Body:
{
  "personalizations": [{
    "to": [{"email": "customer@example.com"}]
  }],
  "from": {"email": "orders@intellidine.com"},
  "subject": "Order #12345 Confirmation",
  "html": "<h1>Order Confirmed!</h1><p>Your order will be ready in 15 minutes.</p>"
}
```

---

## Retry Strategy

### Exponential Backoff

```
Failure 1: Retry after 2 seconds
Failure 2: Retry after 4 seconds (2^2)
Failure 3: Retry after 8 seconds (2^3)
Failure 4: Retry after 16 seconds (2^4)
Failure 5: Retry after 32 seconds (2^5)
Max attempts: 5 retries
Max wait time: 2 minutes total

After 5 failures:
- Mark as FAILED
- Send alert to admin
- Log error for debugging
```

---

## Performance Characteristics

- **SMS delivery**: 1-3 seconds (external)
- **Email delivery**: 2-5 seconds (external)
- **Kafka event processing**: 50-100ms
- **Notification queuing**: 5-10ms
- **Database logging**: 20-40ms

---

## Testing Notification Service

```bash
# Send manual notification
curl -X POST http://localhost:3106/api/notifications/send \
  -H "Authorization: Bearer <token>" \
  -d '{
    "recipient_id": "cust-abc",
    "notification_type": "PROMOTIONAL",
    "message": "50% off on weekend orders!"
  }'

# Get notifications
curl http://localhost:3106/api/notifications \
  -H "Authorization: Bearer <token>"

# Mark as read
curl -X PATCH http://localhost:3106/api/notifications/notif-123/mark-read \
  -H "Authorization: Bearer <token>"
```

---

**See Also**:
- [SYSTEM_OVERVIEW.md](../SYSTEM_OVERVIEW.md) - Notification Service in architecture
- [ORDERING_WORKFLOW.md](../workflows/ORDERING_WORKFLOW.md) - Notifications in customer journey
