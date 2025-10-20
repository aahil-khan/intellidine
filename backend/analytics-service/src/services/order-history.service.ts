import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface OrderCompletedEvent {
  orderId: string;
  tenantId: string;
  customerId: string;
  items: Array<{
    itemId: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
  subtotal: number;
  gst: number;
  total: number;
  timestamp: Date;
}

/**
 * Order History Service
 * 
 * Tracks all completed orders for analytics.
 * Consumes order.completed events from Kafka and stores in OrderHistory.
 */
@Injectable()
export class OrderHistoryService {
  private readonly logger = new Logger(OrderHistoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record a completed order in order history
   * Called when order.completed event is received
   */
  async recordOrder(event: OrderCompletedEvent): Promise<void> {
    try {
      await this.prisma.orderHistory.create({
        data: {
          tenant_id: event.tenantId,
          order_id: event.orderId,
          customer_id: event.customerId,
          items: event.items,
          subtotal: event.subtotal,
          total: event.total,
          timestamp: event.timestamp,
        },
      });

      this.logger.debug(
        `Recorded order history: ${event.orderId} for tenant ${event.tenantId}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to record order history: ${error?.message}`,
        error?.stack,
      );
      throw error;
    }
  }

  /**
   * Get all orders for a tenant within a date range
   */
  async getTenantOrders(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ) {
    return this.prisma.orderHistory.findMany({
      where: {
        tenant_id: tenantId,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
    });
  }

  /**
   * Get order count for a tenant on a specific date
   */
  async getOrderCountByDate(tenantId: string, date: Date): Promise<number> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const count = await this.prisma.orderHistory.count({
      where: {
        tenant_id: tenantId,
        timestamp: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    return count;
  }

  /**
   * Get total revenue for a tenant on a specific date
   */
  async getRevenueByDate(tenantId: string, date: Date): Promise<number> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const result = await this.prisma.orderHistory.aggregate({
      where: {
        tenant_id: tenantId,
        timestamp: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      _sum: {
        total: true,
      },
    });

    return result._sum.total?.toNumber() || 0;
  }

  /**
   * Get average order value for a tenant on a specific date
   */
  async getAverageOrderValueByDate(tenantId: string, date: Date): Promise<number> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const result = await this.prisma.orderHistory.aggregate({
      where: {
        tenant_id: tenantId,
        timestamp: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      _avg: {
        total: true,
      },
    });

    return result._avg.total?.toNumber() || 0;
  }
}
