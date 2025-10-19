import { Controller, Get, Post, Patch, Query, Body, Param, HttpStatus, HttpCode, BadRequestException } from '@nestjs/common';
import { OrderService } from './services/order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { ListOrdersQueryDto } from './dto/list-orders.dto';

@Controller()
export class AppController {
  constructor(private readonly orderService: OrderService) {}

  /**
   * Health check endpoint
   */
  @Get('/health')
  health() {
    return { status: 'ok', service: 'order-service' };
  }

  /**
   * Create a new order
   * POST /api/orders?tenant_id={tenant_id}
   * Body: { table_id, items: [{ menu_item_id, quantity }], ... }
   */
  @Post('/api/orders')
  @HttpCode(HttpStatus.CREATED)
  async createOrder(@Query('tenant_id') tenantId: string, @Body() createOrderDto: CreateOrderDto) {
    if (!tenantId) {
      throw new BadRequestException('tenant_id query parameter is required');
    }
    return this.orderService.createOrder(tenantId, createOrderDto);
  }

  /**
   * Get single order by ID
   * GET /api/orders/:id
   */
  @Get('/api/orders/:id')
  async getOrder(@Param('id') orderId: string) {
    return this.orderService.getOrder(orderId);
  }

  /**
   * List orders for a tenant with filtering and pagination
   * GET /api/orders?tenant_id={tenant_id}&status={status}&page={page}&limit={limit}
   */
  @Get('/api/orders')
  async listOrders(@Query('tenant_id') tenantId: string, @Query() queryDto: ListOrdersQueryDto) {
    if (!tenantId) {
      throw new BadRequestException('tenant_id query parameter is required');
    }
    queryDto.tenant_id = tenantId;
    return this.orderService.listOrders(tenantId, queryDto);
  }

  /**
   * Update order status with state machine validation
   * PATCH /api/orders/:id/status?tenant_id={tenant_id}
   * Body: { status: "CONFIRMED"|"PREPARING"|"READY"|"SERVED"|"COMPLETED"|"CANCELLED", notes?: string }
   */
  @Patch('/api/orders/:id/status')
  async updateOrderStatus(
    @Param('id') orderId: string,
    @Query('tenant_id') tenantId: string,
    @Body() updateStatusDto: UpdateOrderStatusDto,
  ) {
    if (!tenantId) {
      throw new BadRequestException('tenant_id query parameter is required');
    }
    return this.orderService.updateOrderStatus(orderId, tenantId, updateStatusDto);
  }

  /**
   * Cancel an order
   * PATCH /api/orders/:id/cancel?tenant_id={tenant_id}
   * Body: { reason?: string }
   */
  @Patch('/api/orders/:id/cancel')
  async cancelOrder(@Param('id') orderId: string, @Query('tenant_id') tenantId: string, @Body() body: any) {
    if (!tenantId) {
      throw new BadRequestException('tenant_id query parameter is required');
    }
    return this.orderService.cancelOrder(orderId, tenantId, body?.reason);
  }
}

