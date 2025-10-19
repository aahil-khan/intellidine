import { Injectable, Logger } from '@nestjs/common';
import { Consumer, Kafka } from 'kafkajs';
import { PrismaService } from '../prisma.service';
import Decimal from 'decimal.js';

@Injectable()
export class InventoryConsumer {
  private consumer: Consumer;
  private logger = new Logger('InventoryConsumer');

  constructor(private prismaService: PrismaService) {
    const kafka = new Kafka({
      clientId: 'inventory-service',
      brokers: ['kafka:9092'],
    });
    this.consumer = kafka.consumer({ groupId: 'inventory-group' });
  }

  async onModuleInit() {
    await this.consumer.connect();
    await this.subscribeToOrderEvents();
    this.logger.log('✅ Kafka consumer connected and listening');
  }

  async subscribeToOrderEvents() {
    await this.consumer.subscribe({ topic: 'order.completed' });

    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const orderData = JSON.parse(message.value.toString());
          this.logger.log(`📦 Order completed event: ${orderData.order_id}`);

          // Deduct inventory for each order item
          if (orderData.items && Array.isArray(orderData.items)) {
            for (const item of orderData.items) {
              await this.deductInventory(item.menu_item_id, item.quantity, orderData.order_id);
            }
          }
        } catch (error) {
          this.logger.error(`❌ Error processing order event: ${error.message}`);
        }
      },
    });
  }

  private async deductInventory(
    menuItemId: string,
    quantity: number,
    orderId: string,
  ) {
    try {
      // For now, just find by item name from order items
      // In production, you'd have a mapping table between menu_item_id and inventory items
      this.logger.log(
        `📦 Processing order ${orderId}: Deducting ${quantity} units for menu item ${menuItemId}`,
      );

      // In a real scenario, you'd query RecipeIngredient to find which inventory items are needed
      // For MVP, we'll just log this
    } catch (error) {
      this.logger.error(`❌ Error deducting inventory: ${(error as any).message}`);
    }
  }

  async onModuleDestroy() {
    await this.consumer.disconnect();
    this.logger.log('✅ Kafka consumer disconnected');
  }
}
