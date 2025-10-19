import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('KafkaProducerService');
  private kafka!: Kafka;
  private producer!: Producer;

  async onModuleInit() {
    try {
      this.kafka = new Kafka({
        clientId: 'order-service',
        brokers: [process.env.KAFKA_BROKER || 'kafka:9092'],
        retry: {
          initialRetryTime: 100,
          retries: 8,
        },
      });

      this.producer = this.kafka.producer();
      await this.producer.connect();
      this.logger.log('Kafka producer connected');
    } catch (error) {
      this.logger.error('Failed to connect Kafka producer', error);
    }
  }

  async onModuleDestroy() {
    if (this.producer) {
      await this.producer.disconnect();
      this.logger.log('Kafka producer disconnected');
    }
  }

  /**
   * Publish order.created event
   * Triggered when a new order is placed
   */
  async publishOrderCreated(orderId: string, tenantId: string, payload: any) {
    try {
      await this.producer.send({
        topic: 'order.created',
        messages: [
          {
            key: `${tenantId}:${orderId}`,
            value: JSON.stringify({
              orderId,
              tenantId,
              timestamp: new Date().toISOString(),
              ...payload,
            }),
          },
        ],
      });
      this.logger.log(`Published order.created for order ${orderId}`);
    } catch (error) {
      this.logger.error(`Failed to publish order.created for order ${orderId}`, error);
      throw error;
    }
  }

  /**
   * Publish order.status_changed event
   * Triggered when order status changes (e.g., PENDING -> CONFIRMED -> PREPARING)
   */
  async publishOrderStatusChanged(orderId: string, tenantId: string, oldStatus: string, newStatus: string, payload: any) {
    try {
      await this.producer.send({
        topic: 'order.status_changed',
        messages: [
          {
            key: `${tenantId}:${orderId}`,
            value: JSON.stringify({
              orderId,
              tenantId,
              oldStatus,
              newStatus,
              timestamp: new Date().toISOString(),
              ...payload,
            }),
          },
        ],
      });
      this.logger.log(`Published order.status_changed for order ${orderId}: ${oldStatus} -> ${newStatus}`);
    } catch (error) {
      this.logger.error(`Failed to publish order.status_changed for order ${orderId}`, error);
      throw error;
    }
  }

  /**
   * Publish order.completed event
   * Triggered when order is completed or cancelled
   */
  async publishOrderCompleted(orderId: string, tenantId: string, status: string, payload: any) {
    try {
      await this.producer.send({
        topic: 'order.completed',
        messages: [
          {
            key: `${tenantId}:${orderId}`,
            value: JSON.stringify({
              orderId,
              tenantId,
              status, // "COMPLETED" or "CANCELLED"
              timestamp: new Date().toISOString(),
              ...payload,
            }),
          },
        ],
      });
      this.logger.log(`Published order.completed for order ${orderId} with status ${status}`);
    } catch (error) {
      this.logger.error(`Failed to publish order.completed for order ${orderId}`, error);
      throw error;
    }
  }

  /**
   * Publish inventory.reserved event
   * Triggered when inventory items are reserved for order
   */
  async publishInventoryReserved(orderId: string, tenantId: string, items: any[]) {
    try {
      await this.producer.send({
        topic: 'inventory.reserved',
        messages: [
          {
            key: `${tenantId}:${orderId}`,
            value: JSON.stringify({
              orderId,
              tenantId,
              items, // [{ inventory_item_id, quantity }, ...]
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      });
      this.logger.log(`Published inventory.reserved for order ${orderId}`);
    } catch (error) {
      this.logger.error(`Failed to publish inventory.reserved for order ${orderId}`, error);
      throw error;
    }
  }

  /**
   * Publish payment.requested event
   * Triggered when payment is due
   */
  async publishPaymentRequested(orderId: string, tenantId: string, amount: number, paymentMethod: string) {
    try {
      await this.producer.send({
        topic: 'payment.requested',
        messages: [
          {
            key: `${tenantId}:${orderId}`,
            value: JSON.stringify({
              orderId,
              tenantId,
              amount,
              paymentMethod,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      });
      this.logger.log(`Published payment.requested for order ${orderId}`);
    } catch (error) {
      this.logger.error(`Failed to publish payment.requested for order ${orderId}`, error);
      throw error;
    }
  }
}
