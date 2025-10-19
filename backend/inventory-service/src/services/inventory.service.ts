import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateInventoryDto } from '../dto/create-inventory.dto';
import { UpdateInventoryDto } from '../dto/update-inventory.dto';
import { v4 as uuidv4 } from 'uuid';
import Decimal from 'decimal.js';

@Injectable()
export class InventoryService {
  private logger = new Logger('InventoryService');

  constructor(private prismaService: PrismaService) {}

  async createInventory(createInventoryDto: CreateInventoryDto) {
    try {
      const inventory = await this.prismaService.inventory.create({
        data: {
          id: uuidv4(),
          item_name: createInventoryDto.item_name,
          quantity: createInventoryDto.quantity,
          reorder_level: createInventoryDto.reorder_level,
          unit: createInventoryDto.unit || 'pieces',
          category: 'general',
          tenant_id: createInventoryDto.tenant_id,
        },
      });

      this.logger.log(`✅ Created inventory: ${inventory.item_name} (${inventory.id})`);
      return inventory;
    } catch (error) {
      this.logger.error(`❌ Error creating inventory: ${(error as Error).message}`);
      throw error;
    }
  }

  async updateInventory(id: string, updateInventoryDto: UpdateInventoryDto) {
    try {
      const inventory = await this.prismaService.inventory.update({
        where: { id },
        data: {
          ...updateInventoryDto,
        },
      });

      this.logger.log(`✅ Updated inventory: ${inventory.item_name}`);
      return inventory;
    } catch (error) {
      this.logger.error(`❌ Error updating inventory: ${(error as Error).message}`);
      throw error;
    }
  }

  async getInventoryById(id: string) {
    try {
      const inventory = await this.prismaService.inventory.findUnique({
        where: { id },
      });

      if (!inventory) {
        this.logger.warn(`⚠️ Inventory not found: ${id}`);
        return null;
      }

      return inventory;
    } catch (error) {
      this.logger.error(`❌ Error fetching inventory: ${(error as Error).message}`);
      throw error;
    }
  }

  async listInventory(tenantId: string, limit: number = 20, offset: number = 0) {
    try {
      const [inventories, total] = await Promise.all([
        this.prismaService.inventory.findMany({
          where: { tenant_id: tenantId },
          take: limit,
          skip: offset,
          orderBy: { created_at: 'desc' },
        }),
        this.prismaService.inventory.count({
          where: { tenant_id: tenantId },
        }),
      ]);

      return {
        inventories,
        pagination: { limit, offset, total },
      };
    } catch (error) {
      this.logger.error(`❌ Error listing inventory: ${(error as Error).message}`);
      throw error;
    }
  }

  async getReorderAlerts(tenantId: string) {
    try {
      const alerts = await this.prismaService.inventory.findMany({
        where: {
          tenant_id: tenantId,
        },
      });

      const reorderAlerts = alerts
        .filter((inv) => new Decimal(inv.quantity).lte(new Decimal(inv.reorder_level)))
        .map((inv) => ({
          id: inv.id,
          inventory_id: inv.id,
          item_name: inv.item_name,
          current_quantity: new Decimal(inv.quantity).toNumber(),
          reorder_level: new Decimal(inv.reorder_level).toNumber(),
          alert_status: new Decimal(inv.quantity).lt(new Decimal(inv.reorder_level)) ? 'URGENT' : 'WARNING',
          created_at: inv.updated_at,
        }));

      return reorderAlerts;
    } catch (error) {
      this.logger.error(`❌ Error fetching reorder alerts: ${(error as Error).message}`);
      throw error;
    }
  }

  async getInventoryStats(tenantId: string) {
    try {
      const inventories = await this.prismaService.inventory.findMany({
        where: { tenant_id: tenantId },
      });

      const itemsBelowReorder = inventories.filter((inv) =>
        new Decimal(inv.quantity).lte(new Decimal(inv.reorder_level)),
      );
      const urgentAlerts = inventories.filter((inv) =>
        new Decimal(inv.quantity).lt(new Decimal(inv.reorder_level)),
      );
      const warningAlerts = inventories.filter((inv) => {
        const qty = new Decimal(inv.quantity);
        const reorder = new Decimal(inv.reorder_level);
        return qty.lte(reorder) && qty.gte(reorder.mul(0.5));
      });

      const totalQuantity = inventories.reduce(
        (sum, inv) => sum + new Decimal(inv.quantity).toNumber(),
        0,
      );

      return {
        total_items: inventories.length,
        items_below_reorder_level: itemsBelowReorder.length,
        total_quantity: totalQuantity,
        urgent_alerts: urgentAlerts.length,
        warning_alerts: warningAlerts.length,
      };
    } catch (error) {
      this.logger.error(`❌ Error fetching inventory stats: ${(error as Error).message}`);
      throw error;
    }
  }

  async deductInventory(inventoryId: string, quantity: number) {
    try {
      const inventory = await this.prismaService.inventory.findUnique({
        where: { id: inventoryId },
      });

      if (!inventory) {
        throw new Error(`Inventory not found: ${inventoryId}`);
      }

      const currentQty = new Decimal(inventory.quantity);
      const qtyToDeduct = new Decimal(quantity);
      const newQuantity = Decimal.max(0, currentQty.minus(qtyToDeduct)).toNumber();

      const updated = await this.prismaService.inventory.update({
        where: { id: inventoryId },
        data: {
          quantity: newQuantity,
        },
      });

      this.logger.log(
        `✅ Deducted ${quantity} from ${inventory.item_name}. New quantity: ${newQuantity}`,
      );

      // Create reorder alert if below threshold
      const newQtyDecimal = new Decimal(newQuantity);
      const reorderLevel = new Decimal(inventory.reorder_level);
      if (newQtyDecimal.lte(reorderLevel)) {
        this.logger.warn(
          `🚨 URGENT: ${inventory.item_name} below reorder level! Current: ${newQuantity}`,
        );
      }

      return updated;
    } catch (error) {
      this.logger.error(`❌ Error deducting inventory: ${(error as Error).message}`);
      throw error;
    }
  }
}
