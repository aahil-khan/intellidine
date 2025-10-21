import { Controller, Get, Param, Query } from '@nestjs/common';
import { OrderHistoryService } from './services/order-history.service';
import { DailyMetricsService } from './services/daily-metrics.service';

/**
 * Analytics Controller
 * 
 * Provides REST endpoints for analytics data:
 * - Health check
 * - Daily metrics
 * - Recent metrics
 * - Date range metrics
 * - Order history
 */
@Controller('/api/analytics')
export class AppController {
  constructor(
    private readonly orderHistoryService: OrderHistoryService,
    private readonly dailyMetricsService: DailyMetricsService,
  ) {}

  /**
   * Health check endpoint
   */
  @Get('/health')
  health() {
    return {
      status: 'ok',
      service: 'analytics-service',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Alias endpoint: daily-metrics
   * Maps to /metrics/daily for Postman compatibility
   * GET /api/analytics/daily-metrics?tenantId=...&date=...
   */
  @Get('/daily-metrics')
  async getDailyMetricsAlias(
    @Query('tenant_id') tenantId: string,
    @Query('tenantId') tenantIdAlt: string,
    @Query('date') dateStr?: string,
  ) {
    const tid = tenantId || tenantIdAlt;
    const date = dateStr ? new Date(dateStr) : new Date();

    const metrics = await this.dailyMetricsService.getDailyMetrics(tid, date);

    if (!metrics) {
      return this.dailyMetricsService.calculateDailyMetrics(tid, date);
    }

    return {
      data: metrics,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Alias endpoint: order-trends
   * Maps to /metrics/range for Postman compatibility
   * GET /api/analytics/order-trends?tenant_id=...&startDate=...&endDate=...
   */
  @Get('/order-trends')
  async getOrderTrendsAlias(
    @Query('tenant_id') tenantId: string,
    @Query('startDate') startDateStr: string,
    @Query('endDate') endDateStr: string,
  ) {
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    const metrics = await this.dailyMetricsService.getMetricsRange(
      tenantId,
      startDate,
      endDate,
    );

    return {
      data: metrics,
      meta: {
        timestamp: new Date().toISOString(),
        period: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0],
        },
      },
    };
  }

  /**
   * Alias endpoint: top-items
   * Returns top selling items for a date range
   * GET /api/analytics/top-items?tenant_id=...&limit=10&startDate=...&endDate=...
   */
  @Get('/top-items')
  async getTopItemsAlias(
    @Query('tenant_id') tenantId: string,
    @Query('limit') limitStr?: string,
    @Query('startDate') startDateStr?: string,
    @Query('endDate') endDateStr?: string,
  ) {
    const limit = parseInt(limitStr || '10', 10);
    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    const orders = await this.orderHistoryService.getTenantOrders(
      tenantId,
      startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      endDate || new Date(),
    );

    // Calculate top items from orders
    const itemCount: Record<string, { menuItemId: string; quantity: number; revenue: number }> = {};

    orders.forEach((order: any) => {
      if (order.items) {
        order.items.forEach((item: any) => {
          if (!itemCount[item.menuItemId]) {
            itemCount[item.menuItemId] = {
              menuItemId: item.menuItemId,
              quantity: 0,
              revenue: 0,
            };
          }
          itemCount[item.menuItemId].quantity += item.quantity;
          itemCount[item.menuItemId].revenue += item.quantity * item.price;
        });
      }
    });

    const topItems = Object.values(itemCount)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, limit);

    return {
      data: topItems,
      meta: {
        timestamp: new Date().toISOString(),
        period: {
          start: (startDate || new Date()).toISOString().split('T')[0],
          end: (endDate || new Date()).toISOString().split('T')[0],
        },
        totalItems: topItems.length,
      },
    };
  }

  /**
   * Get daily metrics for a specific date
   * Query params:
   *   - tenantId: Tenant identifier (required)
   *   - date: Date in YYYY-MM-DD format (default: today)
   */
  @Get('/metrics/daily')
  async getDailyMetrics(
    @Query('tenantId') tenantId: string,
    @Query('date') dateStr?: string,
  ) {
    const date = dateStr ? new Date(dateStr) : new Date();

    const metrics = await this.dailyMetricsService.getDailyMetrics(
      tenantId,
      date,
    );

    if (!metrics) {
      // If no metrics exist yet, calculate them on-the-fly
      return this.dailyMetricsService.calculateDailyMetrics(tenantId, date);
    }

    return {
      data: metrics,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Get recent metrics for last N days
   * Query params:
   *   - tenantId: Tenant identifier (required)
   *   - days: Number of days (default: 7)
   */
  @Get('/metrics/recent')
  async getRecentMetrics(
    @Query('tenantId') tenantId: string,
    @Query('days') daysStr?: string,
  ) {
    const days = daysStr ? parseInt(daysStr, 10) : 7;

    const metrics = await this.dailyMetricsService.getRecentMetrics(
      tenantId,
      days,
    );

    return {
      data: metrics,
      meta: {
        timestamp: new Date().toISOString(),
        totalDays: metrics.length,
      },
    };
  }

  /**
   * Get metrics for a date range
   * Query params:
   *   - tenantId: Tenant identifier (required)
   *   - startDate: Start date in YYYY-MM-DD format (required)
   *   - endDate: End date in YYYY-MM-DD format (required)
   */
  @Get('/metrics/range')
  async getMetricsRange(
    @Query('tenantId') tenantId: string,
    @Query('startDate') startDateStr: string,
    @Query('endDate') endDateStr: string,
  ) {
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    const metrics = await this.dailyMetricsService.getMetricsRange(
      tenantId,
      startDate,
      endDate,
    );

    return {
      data: metrics,
      meta: {
        timestamp: new Date().toISOString(),
        daysRequested: Math.ceil(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
        ),
        daysFilled: metrics.length,
      },
    };
  }

  /**
   * Get aggregated metrics for a date range
   * Query params:
   *   - tenantId: Tenant identifier (required)
   *   - startDate: Start date in YYYY-MM-DD format (required)
   *   - endDate: End date in YYYY-MM-DD format (required)
   */
  @Get('/metrics/aggregated')
  async getAggregatedMetrics(
    @Query('tenantId') tenantId: string,
    @Query('startDate') startDateStr: string,
    @Query('endDate') endDateStr: string,
  ) {
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    const metrics = await this.dailyMetricsService.getAggregatedMetrics(
      tenantId,
      startDate,
      endDate,
    );

    return {
      data: metrics,
      meta: {
        timestamp: new Date().toISOString(),
        period: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0],
        },
      },
    };
  }

  /**
   * Get order history for a date range
   * Query params:
   *   - tenantId: Tenant identifier (required)
   *   - startDate: Start date in YYYY-MM-DD format (required)
   *   - endDate: End date in YYYY-MM-DD format (required)
   */
  @Get('/orders/history')
  async getOrderHistory(
    @Query('tenantId') tenantId: string,
    @Query('startDate') startDateStr: string,
    @Query('endDate') endDateStr: string,
  ) {
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    const orders = await this.orderHistoryService.getTenantOrders(
      tenantId,
      startDate,
      endDate,
    );

    return {
      data: orders,
      meta: {
        timestamp: new Date().toISOString(),
        count: orders.length,
        period: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0],
        },
      },
    };
  }
}


