import { Controller, Get, Inject } from '@nestjs/common';
import { ServiceRouter } from './gateway/service-router';

@Controller()
export class AppController {
  constructor(private readonly serviceRouter: ServiceRouter) {}

  @Get('/health')
  health() {
    return {
      status: 'ok',
      service: 'api-gateway',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('/services/health')
  async servicesHealth() {
    const status = await this.serviceRouter.getServicesStatus();
    const allHealthy = Object.values(status).every((s) => s.healthy);

    return {
      status: allHealthy ? 'ok' : 'degraded',
      gateway: 'healthy',
      services: status,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /routes
   * List all available service routes
   */
  @Get('/routes')
  getRoutes() {
    return {
      gateway: 'api-gateway',
      timestamp: new Date().toISOString(),
      routes: {
        auth: {
          service: 'auth-service',
          port: 3101,
          endpoints: [
            'POST /api/auth/customer/request-otp',
            'POST /api/auth/customer/verify-otp',
            'POST /api/auth/staff/login',
            'POST /api/auth/logout',
          ],
        },
        menu: {
          service: 'menu-service',
          port: 3103,
          endpoints: [
            'GET /api/menu',
            'GET /api/menu/categories',
            'GET /api/menu/items/:id',
            'POST /api/menu/items (staff only)',
            'PATCH /api/menu/items/:id (staff only)',
            'DELETE /api/menu/items/:id (staff only)',
            'GET /api/menu/health',
          ],
        },
        orders: {
          service: 'order-service',
          port: 3102,
          endpoints: [
            'POST /api/orders (auth required)',
            'GET /api/orders (auth required)',
            'GET /api/orders/:id (auth required)',
            'PATCH /api/orders/:id/status (staff only)',
            'PATCH /api/orders/:id/cancel (staff only)',
          ],
        },
        inventory: {
          service: 'inventory-service',
          port: 3104,
          endpoints: [
            'POST /api/inventory/items (staff only)',
            'GET /api/inventory/items (auth required)',
            'GET /api/inventory/items/:id',
            'PATCH /api/inventory/items/:id (staff only)',
            'PATCH /api/inventory/deduct (staff only)',
            'GET /api/inventory/alerts (staff only)',
            'GET /api/inventory/stats (staff only)',
          ],
        },
        payments: {
          service: 'payment-service',
          port: 3105,
          endpoints: [
            'POST /api/payments/create-razorpay-order (auth required)',
            'POST /api/payments/verify-razorpay (auth required)',
            'POST /api/payments/confirm-cash (staff only)',
            'GET /api/payments/:payment_id (auth required)',
            'GET /api/payments (list)',
            'GET /api/payments/stats/daily (staff only)',
            'GET /api/payments/health',
          ],
        },
        notifications: {
          service: 'notification-service',
          port: 3106,
          endpoints: [
            'GET /api/notifications/health',
            'GET /api/notifications/stats',
            'GET /api/notifications/test',
          ],
        },
        discounts: {
          service: 'discount-engine',
          port: 3108,
          endpoints: [
            'POST /api/discounts/apply',
            'GET /api/discounts/rules',
            'POST /api/discount/rules',
            'GET /api/discount/templates',
            'POST /api/discount/simulate',
            'GET /api/discount/stats',
            'GET /api/discount/health',
          ],
        },
        analytics: {
          service: 'analytics-service',
          port: 3107,
          endpoints: [
            'GET /api/analytics/daily-metrics',
            'GET /api/analytics/order-trends',
            'GET /api/analytics/top-items',
            'GET /api/analytics/metrics/daily',
            'GET /api/analytics/metrics/recent',
            'GET /api/analytics/metrics/range',
            'GET /api/analytics/metrics/aggregated',
            'GET /api/analytics/orders/history',
            'GET /api/analytics/health',
          ],
        },
      },
      summary: {
        totalServices: 8,
        totalEndpoints: 45,
      },
    };
  }
}
