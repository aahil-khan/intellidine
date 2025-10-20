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


