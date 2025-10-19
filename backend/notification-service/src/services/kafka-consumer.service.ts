import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Kafka, Consumer, logLevel } from 'kafkajs';
import { SocketBroadcastService } from './socket-broadcast.service';

@Injectable()
export class KafkaConsumerService implements OnModuleInit {
  private readonly logger = new Logger(KafkaConsumerService.name);
  private kafka: Kafka;
  private consumer: Consumer;
  private isConnected = false;

  constructor(private readonly broadcastService: SocketBroadcastService) {
    const kafkaBroker = process.env.KAFKA_BROKER || 'kafka:9092';
    this.kafka = new Kafka({
      clientId: 'notification-service',
      brokers: [kafkaBroker],
      logLevel: logLevel.ERROR,
    });
    this.consumer = this.kafka.consumer({ groupId: 'notification-service' });
  }

  async onModuleInit() {
    try {
      await this.connectConsumer();
      await this.subscribeToTopics();
    } catch (error) {
      this.logger.error('Failed to initialize Kafka consumer', error);
    }
  }

  private async connectConsumer() {
    try {
      await this.consumer.connect();
      this.isConnected = true;
      this.logger.log('Kafka consumer connected');
    } catch (error) {
      this.logger.error('Failed to connect Kafka consumer', error);
      // Retry connection after 5 seconds
      setTimeout(() => this.connectConsumer(), 5000);
    }
  }

  private async subscribeToTopics() {
    if (!this.isConnected) {
      this.logger.warn('Consumer not connected, skipping subscription');
      return;
    }

    try {
      await this.consumer.subscribe({ topics: ['orders', 'payments', 'inventory'] });
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const event = JSON.parse(message.value.toString());
            this.logger.debug(`Received event from ${topic}: ${message.key}`);

            switch (topic) {
              case 'orders':
                await this.handleOrderEvent(event);
                break;
              case 'payments':
                await this.handlePaymentEvent(event);
                break;
              case 'inventory':
                await this.handleInventoryEvent(event);
                break;
            }
          } catch (error) {
            this.logger.error(`Error processing message from ${topic}`, error);
          }
        },
      });

      this.logger.log('Kafka consumer subscribed to topics: orders, payments, inventory');
    } catch (error) {
      this.logger.error('Failed to subscribe to topics', error);
    }
  }

  private async handleOrderEvent(event: any) {
    const { event_type, data } = event;
    const { tenant_id, order_id, customer_id } = data;

    this.logger.debug(`Processing order event: ${event_type}`);

    switch (event_type) {
      case 'order.created':
        // Broadcast to kitchen
        this.broadcastService.broadcastKitchenEvent(tenant_id, 'order_received', {
          order_id,
          items: data.items,
          special_instructions: data.special_instructions,
          created_at: data.created_at,
        });
        break;

      case 'order.status_changed':
        // Broadcast to customer and orders room
        this.broadcastService.broadcastOrderEvent(
          tenant_id,
          'status_changed',
          {
            order_id,
            status: data.status,
            updated_at: data.updated_at,
          },
        );
        this.broadcastService.broadcastToCustomer(tenant_id, customer_id, 'order_status', {
          order_id,
          status: data.status,
        });
        break;

      case 'order.ready':
        // Broadcast kitchen ready event
        this.broadcastService.broadcastKitchenEvent(tenant_id, 'order_ready', {
          order_id,
          ready_at: data.ready_at,
        });
        // Notify customer
        this.broadcastService.broadcastToCustomer(tenant_id, customer_id, 'order_ready', {
          order_id,
        });
        break;

      case 'order.cancelled':
        // Broadcast cancellation to all
        this.broadcastService.broadcastOrderEvent(tenant_id, 'cancelled', {
          order_id,
          reason: data.reason,
        });
        this.broadcastService.broadcastManagerEvent(tenant_id, 'alert', {
          type: 'order_cancelled',
          order_id,
          reason: data.reason,
        });
        break;
    }
  }

  private async handlePaymentEvent(event: any) {
    const { event_type, data } = event;
    const { tenant_id, order_id, customer_id } = data;

    this.logger.debug(`Processing payment event: ${event_type}`);

    switch (event_type) {
      case 'payment.confirmed':
        // Broadcast to managers
        this.broadcastService.broadcastManagerEvent(
          tenant_id,
          'payment_confirmed',
          {
            order_id,
            amount: data.amount,
            payment_method: data.payment_method,
            confirmed_at: data.confirmed_at,
          },
        );
        // Notify customer
        this.broadcastService.broadcastToCustomer(tenant_id, customer_id, 'payment_confirmed', {
          order_id,
          amount: data.amount,
        });
        break;

      case 'payment.failed':
        // Notify customer of payment failure
        this.broadcastService.broadcastToCustomer(tenant_id, customer_id, 'payment_failed', {
          order_id,
          reason: data.reason,
        });
        break;
    }
  }

  private async handleInventoryEvent(event: any) {
    const { event_type, data } = event;
    const { tenant_id } = data;

    this.logger.debug(`Processing inventory event: ${event_type}`);

    switch (event_type) {
      case 'inventory.low_stock':
        // Alert managers
        this.broadcastService.broadcastManagerEvent(tenant_id, 'inventory_low', {
          item_id: data.item_id,
          item_name: data.item_name,
          current_quantity: data.current_quantity,
          min_threshold: data.min_threshold,
        });
        break;

      case 'inventory.out_of_stock':
        // Alert managers
        this.broadcastService.broadcastManagerEvent(tenant_id, 'alert', {
          type: 'inventory_out_of_stock',
          item_id: data.item_id,
          item_name: data.item_name,
        });
        break;

      case 'inventory.updated':
        // Broadcast to menu service (if needed)
        this.broadcastService.broadcastToTenant(tenant_id, 'inventory_updated', {
          item_id: data.item_id,
          new_quantity: data.new_quantity,
        });
        break;
    }
  }

  async disconnect() {
    try {
      if (this.isConnected) {
        await this.consumer.disconnect();
        this.isConnected = false;
        this.logger.log('Kafka consumer disconnected');
      }
    } catch (error) {
      this.logger.error('Error disconnecting Kafka consumer', error);
    }
  }
}
