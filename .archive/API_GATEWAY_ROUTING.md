# API Gateway Routing Configuration

## Overview
The API Gateway (port 3100) acts as a reverse proxy, routing all incoming requests to the appropriate microservices. This centralizes all external traffic through a single entry point.

## Service Discovery via Docker Compose Network

When running via Docker Compose, services communicate using their container names as hostnames on the shared network. The API Gateway routes requests like this:

```
External Request (port 3100)
        ↓
    API Gateway (localhost:3100)
        ↓
    Routes to internal service based on path
        ↓
    Internal microservice (via docker-compose network)
        ↓
    Response sent back to client
```

---

## Routing Rules by Service

### Authentication Routes
```
POST   /api/auth/customer/request-otp          → auth-service:3101
POST   /api/auth/customer/verify-otp           → auth-service:3101
POST   /api/auth/staff/login                   → auth-service:3101
POST   /api/auth/staff/logout                  → auth-service:3101
GET    /api/auth/verify-token                  → auth-service:3101
```

### Order Service Routes
```
POST   /api/orders                             → order-service:3102
GET    /api/orders                             → order-service:3102
GET    /api/orders/:id                         → order-service:3102
PUT    /api/orders/:id                         → order-service:3102
DELETE /api/orders/:id                         → order-service:3102
POST   /api/orders/:id/status                  → order-service:3102
```

### Menu Service Routes
```
GET    /api/menus                              → menu-service:3103
GET    /api/menus/:id                          → menu-service:3103
GET    /api/menu-items                         → menu-service:3103
GET    /api/menu-items/:id                     → menu-service:3103
POST   /api/menu-items                         → menu-service:3103
```

### Inventory Service Routes
```
GET    /api/inventory                          → inventory-service:3104
GET    /api/inventory/:id                      → inventory-service:3104
PUT    /api/inventory/:id                      → inventory-service:3104
POST   /api/inventory/check-stock              → inventory-service:3104
```

### Payment Service Routes
```
POST   /api/payments                           → payment-service:3105
GET    /api/payments/:id                       → payment-service:3105
POST   /api/payments/:id/confirm               → payment-service:3105
GET    /api/payments/status/:status            → payment-service:3105
```

### Notification Service Routes
```
POST   /api/notifications/send                 → notification-service:3106
GET    /api/notifications                      → notification-service:3106
POST   /api/webhooks/payment-status            → notification-service:3106
POST   /api/webhooks/order-update              → notification-service:3106
```

### Analytics Service Routes
```
GET    /api/analytics/orders                   → analytics-service:3107
GET    /api/analytics/revenue                  → analytics-service:3107
GET    /api/analytics/popular-items            → analytics-service:3107
GET    /api/reports/:type                      → analytics-service:3107
```

### Discount Engine Routes
```
POST   /api/discounts/calculate                → discount-engine:3108
GET    /api/discounts                          → discount-engine:3108
POST   /api/discounts                          → discount-engine:3108
PUT    /api/discounts/:id                      → discount-engine:3108
```

### ML Service Routes
```
GET    /api/ml/recommendations                 → ml-service:8000
POST   /api/ml/recommendations                 → ml-service:8000
GET    /api/ml/health                          → ml-service:8000
```

---

## Example NestJS Gateway Implementation

### api-gateway/src/app.module.ts
```typescript
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AuthProxyController } from './controllers/auth.proxy.controller';
import { OrderProxyController } from './controllers/order.proxy.controller';
// ... other proxy controllers

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
  ],
  controllers: [
    AuthProxyController,
    OrderProxyController,
    // ... other proxy controllers
  ],
})
export class AppModule {}
```

### api-gateway/src/controllers/auth.proxy.controller.ts
```typescript
import { Controller, All, Req, Res } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Request, Response } from 'express';

@Controller('api/auth')
export class AuthProxyController {
  constructor(private httpService: HttpService) {}

  @All('*')
  async proxy(@Req() req: Request, @Res() res: Response) {
    try {
      const targetUrl = `http://auth-service:3101${req.originalUrl.replace('/api/auth', '')}`;
      
      const response = await this.httpService
        .request({
          method: req.method as any,
          url: targetUrl,
          data: req.body,
          headers: {
            ...req.headers,
            'X-Forwarded-For': req.ip,
            'X-Forwarded-Proto': 'http',
          },
        })
        .toPromise();

      res.status(response.status).send(response.data);
    } catch (error) {
      res.status(error.response?.status || 500).send(
        error.response?.data || { error: 'Service unavailable' }
      );
    }
  }
}
```

### api-gateway/src/controllers/order.proxy.controller.ts
```typescript
import { Controller, All, Req, Res } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Request, Response } from 'express';

@Controller('api/orders')
export class OrderProxyController {
  constructor(private httpService: HttpService) {}

  @All('*')
  async proxy(@Req() req: Request, @Res() res: Response) {
    try {
      const targetUrl = `http://order-service:3102${req.originalUrl.replace('/api/orders', '')}`;
      
      const response = await this.httpService
        .request({
          method: req.method as any,
          url: targetUrl,
          data: req.body,
          headers: {
            ...req.headers,
            'X-Forwarded-For': req.ip,
            'X-Forwarded-Proto': 'http',
          },
        })
        .toPromise();

      res.status(response.status).send(response.data);
    } catch (error) {
      res.status(error.response?.status || 500).send(
        error.response?.data || { error: 'Service unavailable' }
      );
    }
  }
}
```

---

## Alternative: Using http-proxy-middleware

### api-gateway/src/main.ts
```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { createProxyMiddleware } from 'http-proxy-middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Health check
  app.use('/health', (req, res) => {
    res.json({ status: 'ok', service: 'api-gateway' });
  });

  // Service routing
  app.use(
    '/api/auth',
    createProxyMiddleware({
      target: 'http://auth-service:3101',
      changeOrigin: true,
      pathRewrite: {
        '^/api/auth': '',
      },
    })
  );

  app.use(
    '/api/orders',
    createProxyMiddleware({
      target: 'http://order-service:3102',
      changeOrigin: true,
      pathRewrite: {
        '^/api/orders': '',
      },
    })
  );

  app.use(
    '/api/menus',
    createProxyMiddleware({
      target: 'http://menu-service:3103',
      changeOrigin: true,
      pathRewrite: {
        '^/api/menus': '',
      },
    })
  );

  app.use(
    '/api/inventory',
    createProxyMiddleware({
      target: 'http://inventory-service:3104',
      changeOrigin: true,
      pathRewrite: {
        '^/api/inventory': '',
      },
    })
  );

  app.use(
    '/api/payments',
    createProxyMiddleware({
      target: 'http://payment-service:3105',
      changeOrigin: true,
      pathRewrite: {
        '^/api/payments': '',
      },
    })
  );

  app.use(
    '/api/notifications',
    createProxyMiddleware({
      target: 'http://notification-service:3106',
      changeOrigin: true,
      pathRewrite: {
        '^/api/notifications': '',
      },
    })
  );

  app.use(
    '/api/analytics',
    createProxyMiddleware({
      target: 'http://analytics-service:3107',
      changeOrigin: true,
      pathRewrite: {
        '^/api/analytics': '',
      },
    })
  );

  app.use(
    '/api/discounts',
    createProxyMiddleware({
      target: 'http://discount-engine:3108',
      changeOrigin: true,
      pathRewrite: {
        '^/api/discounts': '',
      },
    })
  );

  app.use(
    '/api/ml',
    createProxyMiddleware({
      target: 'http://ml-service:8000',
      changeOrigin: true,
      pathRewrite: {
        '^/api/ml': '',
      },
    })
  );

  await app.listen(3100, '0.0.0.0');
  console.log('API Gateway listening on port 3100');
}

bootstrap();
```

---

## Docker Compose Network Communication

Inside Docker Compose, services communicate using their service names:

```yaml
# docker-compose.yml
services:
  api-gateway:
    ports:
      - "3100:3100"
    environment:
      AUTH_SERVICE_URL: http://auth-service:3101
      ORDER_SERVICE_URL: http://order-service:3102
      MENU_SERVICE_URL: http://menu-service:3103
      INVENTORY_SERVICE_URL: http://inventory-service:3104
      PAYMENT_SERVICE_URL: http://payment-service:3105
      NOTIFICATION_SERVICE_URL: http://notification-service:3106
      ANALYTICS_SERVICE_URL: http://analytics-service:3107
      DISCOUNT_ENGINE_URL: http://discount-engine:3108
      ML_SERVICE_URL: http://ml-service:8000

  auth-service:
    container_name: auth-service
    ports:
      - "3101:3101"
    
  order-service:
    container_name: order-service
    ports:
      - "3102:3102"
    
  # ... other services
```

---

## Error Handling & Resilience

### Circuit Breaker Pattern
```typescript
import { CircuitBreaker } from '@nestjs/bull';

@Injectable()
export class ServiceProxyFactory {
  private circuitBreakers = new Map();

  getCircuitBreaker(serviceName: string) {
    if (!this.circuitBreakers.has(serviceName)) {
      this.circuitBreakers.set(
        serviceName,
        new CircuitBreaker({
          threshold: 5,        // Fail after 5 errors
          timeout: 30000,      // Reset after 30 seconds
          fallback: () => ({ error: `${serviceName} is unavailable` }),
        })
      );
    }
    return this.circuitBreakers.get(serviceName);
  }
}
```

### Request Retry Logic
```typescript
import { HttpService } from '@nestjs/axios';
import { retry, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

async forwardRequest(url: string, options: any) {
  return this.httpService
    .request(options)
    .pipe(
      retry(3),  // Retry up to 3 times
      catchError(() => of({ status: 503, data: { error: 'Service unavailable' } }))
    )
    .toPromise();
}
```

---

## Monitoring Gateway Traffic

### Prometheus Metrics
```typescript
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

@Module({
  imports: [PrometheusModule.register()],
})
export class MonitoringModule {}
```

### Access Logs
```typescript
import { NestMiddleware } from '@nestjs/common';

@Injectable()
export class GatewayLoggingMiddleware implements NestMiddleware {
  constructor(private logger: Logger) {}

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      this.logger.log(
        `${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`
      );
    });
    next();
  }
}
```

---

## Load Balancing with Multiple Gateway Instances

If you scale the API Gateway horizontally:

```yaml
# docker-compose.yml
services:
  api-gateway-1:
    build: ./api-gateway
    ports:
      - "3100:3100"
    environment:
      NODE_ENV: production

  api-gateway-2:
    build: ./api-gateway
    ports:
      - "3101:3100"  # Different external port
    environment:
      NODE_ENV: production

  nginx-lb:  # Nginx Load Balancer
    image: nginx:latest
    ports:
      - "3100:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
```

### nginx.conf (Load Balancer)
```nginx
upstream api_gateway {
    server api-gateway-1:3100;
    server api-gateway-2:3100;
    keepalive 32;
}

server {
    listen 80;
    
    location / {
        proxy_pass http://api_gateway;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }
}
```

---

## Testing the Gateway

```bash
# Health check
curl http://localhost:3100/health

# Auth routes
curl -X POST http://localhost:3100/api/auth/customer/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210", "tenant_id": "test-tenant"}'

# Order routes
curl http://localhost:3100/api/orders

# Direct service (for comparison)
curl http://localhost:3102/health  # Order service directly
```

---

## Files for Reference

- `api-gateway/src/main.ts` - Main entry point
- `api-gateway/src/app.module.ts` - Module configuration
- `docker-compose.yml` - Service configuration
- `CLOUDFLARE_TUNNEL_SETUP.md` - External routing guide
- `PORT_MAPPINGS_QUICK_REFERENCE.md` - Quick port reference
