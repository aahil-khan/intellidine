import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { OrderHistoryService } from './order-history.service';
import { Decimal } from '@prisma/client/runtime/library';

export interface DailyMetricsResult {
  date: Date;
  totalOrders: number;
  totalRevenue: Decimal;
  avgOrderValue: Decimal;
}

/**
 * Daily Metrics Service
 * 
 * Aggregates daily metrics for a tenant.
 * Calculates KPIs like total orders, revenue, and average order value.
 */
@Injectable()
export class DailyMetricsService {
  private readonly logger = new Logger(DailyMetricsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orderHistoryService: OrderHistoryService,
  ) {}

  /**
   * Calculate and store daily metrics for a specific date
   */
  async calculateDailyMetrics(tenantId: string, date: Date): Promise<DailyMetricsResult> {
    try {
      // Get date without time component
      const dateOnly = new Date(date);
      dateOnly.setHours(0, 0, 0, 0);

      // Calculate metrics
      const totalOrders = await this.orderHistoryService.getOrderCountByDate(
        tenantId,
        dateOnly,
      );

      const totalRevenue = await this.orderHistoryService.getRevenueByDate(
        tenantId,
        dateOnly,
      );

      const avgOrderValue =
        totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Upsert daily metrics (create if not exists, update if exists)
      const metrics = await this.prisma.dailyMetrics.upsert({
        where: {
          tenant_id_date: {
            tenant_id: tenantId,
            date: dateOnly,
          },
        },
        update: {
          total_orders: totalOrders,
          total_revenue: new Decimal(totalRevenue),
          avg_order_value: new Decimal(avgOrderValue),
        },
        create: {
          tenant_id: tenantId,
          date: dateOnly,
          total_orders: totalOrders,
          total_revenue: new Decimal(totalRevenue),
          avg_order_value: new Decimal(avgOrderValue),
        },
      });

      this.logger.log(
        `Calculated daily metrics for ${tenantId} on ${dateOnly.toISOString()}: ${totalOrders} orders, ${totalRevenue} revenue`,
      );

      return {
        date: metrics.date,
        totalOrders: metrics.total_orders,
        totalRevenue: metrics.total_revenue,
        avgOrderValue: metrics.avg_order_value,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to calculate daily metrics: ${error?.message}`,
        error?.stack,
      );
      throw error;
    }
  }

  /**
   * Get daily metrics for a tenant on a specific date
   */
  async getDailyMetrics(tenantId: string, date: Date): Promise<DailyMetricsResult | null> {
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    const metrics = await this.prisma.dailyMetrics.findUnique({
      where: {
        tenant_id_date: {
          tenant_id: tenantId,
          date: dateOnly,
        },
      },
    });

    return metrics ? {
      date: metrics.date,
      totalOrders: metrics.total_orders,
      totalRevenue: metrics.total_revenue,
      avgOrderValue: metrics.avg_order_value,
    } : null;
  }

  /**
   * Get metrics for a date range (useful for trending)
   */
  async getMetricsRange(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<DailyMetricsResult[]> {
    const metrics = await this.prisma.dailyMetrics.findMany({
      where: {
        tenant_id: tenantId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    return metrics.map((m: any) => ({
      date: m.date,
      totalOrders: m.total_orders,
      totalRevenue: m.total_revenue,
      avgOrderValue: m.avg_order_value,
    }));
  }

  /**
   * Get metrics for a specific number of recent days
   */
  async getRecentMetrics(tenantId: string, days: number = 7): Promise<DailyMetricsResult[]> {
    const endDate = new Date();
    endDate.setHours(0, 0, 0, 0);

    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - (days - 1));

    return this.getMetricsRange(tenantId, startDate, endDate);
  }

  /**
   * Get aggregated metrics for a date range
   */
  async getAggregatedMetrics(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalOrders: number;
    totalRevenue: number;
    avgOrderValue: number;
    daysWithOrders: number;
  }> {
    const result = await this.prisma.dailyMetrics.aggregate({
      where: {
        tenant_id: tenantId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        total_orders: true,
        total_revenue: true,
      },
      _avg: {
        avg_order_value: true,
      },
      _count: true,
    });

    const totalOrders = result._sum.total_orders || 0;
    const totalRevenue = result._sum.total_revenue?.toNumber() || 0;
    const daysWithOrders = result._count;

    return {
      totalOrders,
      totalRevenue,
      avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      daysWithOrders,
    };
  }
}
