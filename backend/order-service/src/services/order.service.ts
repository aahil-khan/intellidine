import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { KafkaProducerService } from './kafka.producer';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderStatusDto } from '../dto/update-order-status.dto';
import { OrderResponseDto, OrderListResponseDto, OrderItemResponseDto } from '../dto/order-response.dto';
import { ListOrdersQueryDto } from '../dto/list-orders.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class OrderService {
  private readonly logger = new Logger('OrderService');

  // Order status state machine: valid status transitions
  private readonly statusTransitions: Record<string, string[]> = {
    PENDING: ['PREPARING', 'CANCELLED'],
    PREPARING: ['READY', 'CANCELLED'],
    READY: ['SERVED', 'CANCELLED'],
    SERVED: ['COMPLETED', 'CANCELLED'],
    COMPLETED: [],
    CANCELLED: [],
    AWAITING_CASH_PAYMENT: ['COMPLETED', 'CANCELLED'],
  };

  constructor(
    private readonly prismaService: PrismaService,
    private readonly kafkaProducerService: KafkaProducerService,
  ) {}

  /**
   * Create a new order
   * - Validates items exist in menu
   * - Calculates totals
   * - Reserves inventory
   * - Publishes order.created event
   */
  async createOrder(tenantId: string, createOrderDto: CreateOrderDto): Promise<OrderResponseDto> {
    try {
      // Verify tenant exists
      const tenant = await this.prismaService.tenant.findUnique({
        where: { id: tenantId },
      });

      if (!tenant) {
        throw new BadRequestException('Invalid tenant ID');
      }

      // Verify all menu items exist and get their prices
      const menuItems = await this.prismaService.menuItem.findMany({
        where: {
          id: { in: createOrderDto.items.map((item: any) => item.menu_item_id) },
          tenant_id: tenantId,
          is_deleted: false,
        },
      });

      if (menuItems.length !== createOrderDto.items.length) {
        throw new BadRequestException('One or more menu items not found');
      }

      const menuItemMap = new Map(menuItems.map((item: any) => [item.id, item]));

      // Calculate order totals
      let subtotal = 0;
      const orderItems: any[] = [];

      for (const item of createOrderDto.items) {
        const menuItem = menuItemMap.get(item.menu_item_id);
        if (!menuItem) {
          throw new BadRequestException(`Menu item ${item.menu_item_id} not found`);
        }

        const itemPrice = item.price_at_order || menuItem.price;
        const itemSubtotal = new Decimal(itemPrice).times(item.quantity);
        subtotal += itemSubtotal.toNumber();

        orderItems.push({
          item_id: item.menu_item_id,
          quantity: item.quantity,
          unit_price: itemPrice,
          subtotal: itemSubtotal.toNumber(),
          special_requests: item.special_instructions,
        });
      }

      // Calculate GST (18% default for India)
      const gstAmount = new Decimal(subtotal).times(0.18);
      const total = new Decimal(subtotal).plus(gstAmount);

      // Validate or get customer ID
      let customerId = createOrderDto.customer_id;
      if (!customerId) {
        // Create a walk-in customer for anonymous orders
        const walkInCustomer = await this.prismaService.customer.create({
          data: {
            phone_number: `walk-in-${Date.now()}`,
            name: 'Walk-in Customer',
          },
        });
        customerId = walkInCustomer.id;
      } else {
        // Verify customer exists
        const customer = await this.prismaService.customer.findUnique({
          where: { id: customerId },
        });
        if (!customer) {
          throw new BadRequestException('Invalid customer ID');
        }
      }

      // Create order in database
      const order = await this.prismaService.order.create({
        data: {
          tenant_id: tenantId,
          table_number: parseInt(createOrderDto.table_id),
          customer_id: customerId,
          status: 'PENDING',
          subtotal: new Decimal(subtotal),
          gst: gstAmount,
          total: total,
          items: {
            create: orderItems,
          },
        },
        include: {
          items: {
            include: {
              item: true,
            },
          },
        },
      });

      // Publish Kafka events
      await this.kafkaProducerService.publishOrderCreated(order.id, tenantId, {
        tableNumber: order.table_number,
        customerId: order.customer_id,
        total: order.total.toString(),
        itemCount: orderItems.length,
      });

      // Publish inventory reserved event
      const inventoryItems = orderItems.map((item: any) => ({
        inventory_item_id: item.item_id,
        quantity: item.quantity,
      }));

      await this.kafkaProducerService.publishInventoryReserved(order.id, tenantId, inventoryItems);

      // Publish payment requested event
      await this.kafkaProducerService.publishPaymentRequested(order.id, tenantId, order.total.toNumber(), 'cash');

      this.logger.log(`Order ${order.id} created successfully for tenant ${tenantId}`);
      return this.mapOrderToResponse(order);
    } catch (error) {
      this.logger.error(`Failed to create order for tenant ${tenantId}`, error);
      throw error;
    }
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId: string): Promise<OrderResponseDto> {
    const order = await this.prismaService.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            item: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    return this.mapOrderToResponse(order);
  }

  /**
   * List orders with filtering and pagination
   */
  async listOrders(tenantId: string, queryDto: ListOrdersQueryDto): Promise<{ data: OrderListResponseDto[]; total: number; page: number; limit: number }> {
    const page = queryDto.page || 1;
    const limit = Math.min(queryDto.limit || 10, 100);
    const skip = (page - 1) * limit;

    const where: any = { tenant_id: tenantId };

    if (queryDto.status) {
      where.status = queryDto.status;
    }

    if (queryDto.table_id) {
      where.table_number = parseInt(queryDto.table_id);
    }

    if (queryDto.customer_id) {
      where.customer_id = queryDto.customer_id;
    }

    // Date range filtering
    if (queryDto.date_from || queryDto.date_to) {
      where.created_at = {};
      if (queryDto.date_from) {
        where.created_at.gte = new Date(queryDto.date_from);
      }
      if (queryDto.date_to) {
        where.created_at.lte = new Date(queryDto.date_to + 'T23:59:59Z');
      }
    }

    const [orders, total] = await Promise.all([
      this.prismaService.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [queryDto.sort_by || 'created_at']: queryDto.sort_order || 'desc',
        },
        include: {
          items: true,
        },
      }),
      this.prismaService.order.count({ where }),
    ]);

    const data = orders.map((order: any) => ({
      id: order.id,
      table_id: order.table_number.toString(),
      customer_id: order.customer_id,
      status: order.status,
      total: order.total.toNumber(),
      items_count: order.items.length,
      created_at: order.created_at,
      estimated_ready_at: new Date(),
    }));

    return { data, total, page, limit };
  }

  /**
   * Update order status with state machine validation
   */
  async updateOrderStatus(orderId: string, tenantId: string, updateStatusDto: UpdateOrderStatusDto): Promise<OrderResponseDto> {
    const order = await this.prismaService.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            item: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    if (order.tenant_id !== tenantId) {
      throw new BadRequestException('Unauthorized: Order does not belong to this tenant');
    }

    // Validate status transition
    const newStatusStr = updateStatusDto.status?.toUpperCase();
    const validTransitions = this.statusTransitions[order.status] || [];
    if (!validTransitions.includes(newStatusStr)) {
      throw new BadRequestException(
        `Invalid status transition: ${order.status} -> ${newStatusStr}. Valid transitions: ${validTransitions.join(', ')}`,
      );
    }

    const oldStatus = order.status;

    // Update order with new status (using string directly - Prisma will validate)
    const updatedOrder = await this.prismaService.order.update({
      where: { id: orderId },
      data: {
        status: newStatusStr,
      } as any,
      include: {
        items: {
          include: {
            item: true,
          },
        },
      },
    });

    // Publish status changed event
    await this.kafkaProducerService.publishOrderStatusChanged(orderId, tenantId, oldStatus, newStatusStr, {
      notes: updateStatusDto.notes,
      estimatedTimeRemaining: updateStatusDto.estimated_time_remaining,
    });

    // Publish completion event if order is completed or cancelled
    if (['COMPLETED', 'CANCELLED'].includes(newStatusStr)) {
      await this.kafkaProducerService.publishOrderCompleted(orderId, tenantId, newStatusStr, {
        totalAmount: updatedOrder.total.toString(),
      });
    }

    this.logger.log(`Order ${orderId} status updated: ${oldStatus} -> ${newStatusStr}`);
    return this.mapOrderToResponse(updatedOrder);
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId: string, tenantId: string, reason?: string): Promise<OrderResponseDto> {
    return this.updateOrderStatus(orderId, tenantId, {
      status: 'CANCELLED',
      notes: reason || '',
    });
  }

  /**
   * Map Prisma order model to OrderResponseDto
   */
  private mapOrderToResponse(order: any): OrderResponseDto {
    const items: OrderItemResponseDto[] = order.items.map((item: any) => ({
      id: item.id,
      order_id: item.order_id,
      menu_item_id: item.item_id,
      quantity: item.quantity,
      price_at_order: item.unit_price.toNumber(),
      subtotal: item.subtotal.toNumber(),
      special_instructions: item.special_requests,
      created_at: new Date(),
    }));

    return {
      id: order.id,
      tenant_id: order.tenant_id,
      table_id: order.table_number.toString(),
      customer_id: order.customer_id,
      status: order.status,
      items,
      subtotal: order.subtotal.toNumber(),
      discount_amount: 0,
      discount_reason: '',
      tax_amount: order.gst.toNumber(),
      delivery_charge: 0,
      total: order.total.toNumber(),
      payment_method: 'cash',
      payment_status: 'pending',
      special_instructions: '',
      created_at: order.created_at,
      confirmed_at: undefined,
      started_at: undefined,
      ready_at: undefined,
      completed_at: undefined,
      estimated_prep_time: 15,
      estimated_ready_at: new Date(),
      notes: '',
    };
  }
}
