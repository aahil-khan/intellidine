import { Controller, Post, Get, Patch, Body, Param, Query, Logger } from '@nestjs/common';
import { InventoryService } from './services/inventory.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { DeductInventoryDto } from './dto/deduct-inventory.dto';

@Controller('/api/inventory')
export class AppController {
  private logger = new Logger('InventoryController');

  constructor(private inventoryService: InventoryService) {}

  /**
   * Health Check
   */
  @Get('/health')
  getHealth() {
    return {
      status: 'ok',
      service: 'inventory-service',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Create Inventory Item
   * POST /api/inventory/items
   */
  @Post('/items')
  async createInventory(@Body() createInventoryDto: CreateInventoryDto) {
    this.logger.log(`📦 Creating inventory item: ${createInventoryDto.item_name}`);

    try {
      const inventory = await this.inventoryService.createInventory(createInventoryDto);

      return {
        status: 'ok',
        data: inventory,
        message: `✅ Inventory item created: ${inventory.item_name}`,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`❌ Error creating inventory: ${err.message}`);
      return {
        status: 'error',
        message: err.message,
        code: 'CREATE_INVENTORY_ERROR',
      };
    }
  }

  /**
   * Get Inventory Item by ID
   * GET /api/inventory/items/:id
   */
  @Get('/items/:id')
  async getInventory(@Param('id') id: string) {
    this.logger.log(`📦 Fetching inventory: ${id}`);

    try {
      const inventory = await this.inventoryService.getInventoryById(id);

      if (!inventory) {
        return {
          status: 'error',
          message: 'Inventory not found',
          code: 'NOT_FOUND',
        };
      }

      return {
        status: 'ok',
        data: inventory,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`❌ Error fetching inventory: ${err.message}`);
      return {
        status: 'error',
        message: err.message,
        code: 'FETCH_INVENTORY_ERROR',
      };
    }
  }

  /**
   * List Inventory Items
   * GET /api/inventory/items?tenant_id=XXX&limit=20&offset=0
   */
  @Get('/items')
  async listInventory(
    @Query('tenant_id') tenantId: string,
    @Query('limit') limit: string = '20',
    @Query('offset') offset: string = '0',
  ) {
    this.logger.log(`📦 Listing inventory for tenant: ${tenantId}`);

    try {
      const result = await this.inventoryService.listInventory(
        tenantId,
        parseInt(limit),
        parseInt(offset),
      );

      return {
        status: 'ok',
        data: result,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`❌ Error listing inventory: ${err.message}`);
      return {
        status: 'error',
        message: err.message,
        code: 'LIST_INVENTORY_ERROR',
      };
    }
  }

  /**
   * Update Inventory Item
   * PATCH /api/inventory/items/:id
   */
  @Patch('/items/:id')
  async updateInventory(
    @Param('id') id: string,
    @Body() updateInventoryDto: UpdateInventoryDto,
  ) {
    this.logger.log(`📦 Updating inventory: ${id}`);

    try {
      const inventory = await this.inventoryService.updateInventory(id, updateInventoryDto);

      return {
        status: 'ok',
        data: inventory,
        message: '✅ Inventory updated',
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`❌ Error updating inventory: ${err.message}`);
      return {
        status: 'error',
        message: err.message,
        code: 'UPDATE_INVENTORY_ERROR',
      };
    }
  }

  /**
   * Deduct Inventory (Manual)
   * PATCH /api/inventory/deduct
   */
  @Patch('/deduct')
  async deductInventory(@Body() deductInventoryDto: DeductInventoryDto) {
    this.logger.log(`📦 Deducting inventory: ${deductInventoryDto.quantity} units`);

    try {
      const inventory = await this.inventoryService.deductInventory(
        deductInventoryDto.inventory_id,
        deductInventoryDto.quantity,
      );

      return {
        status: 'ok',
        data: inventory,
        message: `✅ Deducted ${deductInventoryDto.quantity} units`,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`❌ Error deducting inventory: ${err.message}`);
      return {
        status: 'error',
        message: err.message,
        code: 'DEDUCT_INVENTORY_ERROR',
      };
    }
  }

  /**
   * Get Reorder Alerts
   * GET /api/inventory/alerts?tenant_id=XXX
   */
  @Get('/alerts')
  async getReorderAlerts(@Query('tenant_id') tenantId: string) {
    this.logger.log(`🚨 Fetching reorder alerts for tenant: ${tenantId}`);

    try {
      const alerts = await this.inventoryService.getReorderAlerts(tenantId);

      return {
        status: 'ok',
        data: {
          alerts,
          total_alerts: alerts.length,
          urgent: alerts.filter((a) => a.alert_status === 'URGENT').length,
        },
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`❌ Error fetching alerts: ${err.message}`);
      return {
        status: 'error',
        message: err.message,
        code: 'FETCH_ALERTS_ERROR',
      };
    }
  }

  /**
   * Get Inventory Statistics
   * GET /api/inventory/stats?tenant_id=XXX
   */
  @Get('/stats')
  async getInventoryStats(@Query('tenant_id') tenantId: string) {
    this.logger.log(`📊 Fetching inventory stats for tenant: ${tenantId}`);

    try {
      const stats = await this.inventoryService.getInventoryStats(tenantId);

      return {
        status: 'ok',
        data: stats,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`❌ Error fetching stats: ${err.message}`);
      return {
        status: 'error',
        message: err.message,
        code: 'FETCH_STATS_ERROR',
      };
    }
  }
}

