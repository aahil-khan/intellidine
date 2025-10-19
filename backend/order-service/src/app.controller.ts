import { Controller, Get, Post, Patch, Query, Body, Param, HttpStatus, HttpCode, BadRequestException, UseGuards, Logger } from '@nestjs/common';
import { OrderService } from './services/order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { ListOrdersQueryDto } from './dto/list-orders.dto';
import { JwtGuard, TenantGuard, RequireRole } from '@shared/auth';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(private readonly orderService: OrderService) {}

  /**
   * Health check endpoint
   */
  @Get('/health')
  health() {
    return { status: 'ok', service: 'order-service' };
  }

  /**
   * Create a new order (any user - customer or staff)
   * POST /api/orders?tenant_id=...
   * Headers: Authorization: Bearer <token>
   * Body: { table_id, items: [{ menu_item_id, quantity }], ... }
   * Auth: REQUIRED (JWT + Tenant validation)
   */
  @UseGuards(JwtGuard, TenantGuard)
  @Post('/api/orders')
  @HttpCode(HttpStatus.CREATED)
  async createOrder(@Query('tenant_id') tenantId: string, @Body() createOrderDto: CreateOrderDto) {
    return this.orderService.createOrder(tenantId, createOrderDto);
  }

  /**
   * Get single order by ID (auth required)
   * GET /api/orders/:id?tenant_id=...
   * Headers: Authorization: Bearer <token>
   * Auth: REQUIRED (JWT + Tenant validation)
   */
  @UseGuards(JwtGuard, TenantGuard)
  @Get('/api/orders/:id')
  async getOrder(@Param('id') orderId: string) {
    return this.orderService.getOrder(orderId);
  }

  /**
   * List orders for a tenant with filtering and pagination (auth required)
   * GET /api/orders?tenant_id=...&status=...&page=1&limit=20
   * Headers: Authorization: Bearer <token>
   * Auth: REQUIRED (JWT + Tenant validation)
   */
  @UseGuards(JwtGuard, TenantGuard)
  @Get('/api/orders')
  async listOrders(@Query('tenant_id') tenantId: string, @Query() queryDto: ListOrdersQueryDto) {
    queryDto.tenant_id = tenantId;
    return this.orderService.listOrders(tenantId, queryDto);
  }

  /**
   * Update order status with state machine validation (staff only)
   * PATCH /api/orders/:id/status?tenant_id=...
   * Headers: Authorization: Bearer <token>
   * Body: { status: "CONFIRMED"|"PREPARING"|"READY"|"SERVED"|"COMPLETED"|"CANCELLED", notes?: string }
   * Auth: REQUIRED (JWT + Staff role + Tenant validation)
   */
  @UseGuards(JwtGuard, TenantGuard)
  @RequireRole(['staff'])
  @Patch('/api/orders/:id/status')
  async updateOrderStatus(
    @Param('id') orderId: string,
    @Query('tenant_id') tenantId: string,
    @Body() updateStatusDto: UpdateOrderStatusDto,
  ) {
    return this.orderService.updateOrderStatus(orderId, tenantId, updateStatusDto);
  }

  /**
   * Cancel an order (staff only)
   * PATCH /api/orders/:id/cancel?tenant_id=...
   * Headers: Authorization: Bearer <token>
   * Body: { reason?: string }
   * Auth: REQUIRED (JWT + Staff role + Tenant validation)
   */
  @UseGuards(JwtGuard, TenantGuard)
  @RequireRole(['staff'])
  @Patch('/api/orders/:id/cancel')
  async cancelOrder(@Param('id') orderId: string, @Query('tenant_id') tenantId: string, @Body() body: any) {
    return this.orderService.cancelOrder(orderId, tenantId, body?.reason);
  }
}

