import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { OrderHistoryService, OrderCompletedEvent } from './order-history.service';
import { DailyMetricsService } from './daily-metrics.service';

/**
 * Kafka Consumer Service
 * 
 * Listens to order.completed events from Kafka and:
 * 1. Records order history for analytics
 * 2. Triggers daily metrics update if needed
 */
@Injectable()
export class KafkaConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaConsumerService.name);
  private kafka: Kafka;
  private consumer: Consumer;

  constructor(
    private readonly orderHistoryService: OrderHistoryService,
    private readonly dailyMetricsService: DailyMetricsService,
  ) {
    this.kafka = new Kafka({
      clientId: 'analytics-service',
      brokers: [process.env.KAFKA_BROKER || 'kafka:9092'],
    });

    this.consumer = this.kafka.consumer({ groupId: 'analytics-service-group' });
  }

  async onModuleInit() {
    try {
      await this.consumer.connect();
      this.logger.log('Kafka consumer connected');

      // Subscribe to order events topic
      await this.consumer.subscribe({
        topic: 'orders',
        fromBeginning: false,
      });

      // Start consuming messages
      await this.consumer.run({
        eachMessage: this.handleMessage.bind(this),
      });

      this.logger.log('Kafka consumer started listening to orders topic');
    } catch (error: any) {
      this.logger.error(`Failed to initialize Kafka consumer: ${error?.message}`);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.consumer.disconnect();
    this.logger.log('Kafka consumer disconnected');
  }

  /**
   * Handle incoming Kafka messages
   */
  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    try {
      const { topic, partition, message } = payload;
      
      this.logger.debug(
        `Received message on ${topic}[${partition}]: ${message.key}`,
      );

      const eventType = message.key?.toString();
      const eventData = JSON.parse(message.value?.toString() || '{}');

      // Handle order.completed events
      if (eventType === 'order.completed') {
        await this.handleOrderCompleted(eventData);
      }
    } catch (error: any) {
      this.logger.error(
        `Error processing Kafka message: ${error?.message}`,
        error?.stack,
      );
      // Don't rethrow - continue processing other messages
    }
  }

  /**
   * Handle order.completed event
   */
  private async handleOrderCompleted(eventData: any): Promise<void> {
    try {
      const event: OrderCompletedEvent = {
        orderId: eventData.orderId || eventData.order_id,
        tenantId: eventData.tenantId || eventData.tenant_id,
        customerId: eventData.customerId || eventData.customer_id,
        items: eventData.items || [],
        subtotal: parseFloat(eventData.subtotal || 0),
        gst: parseFloat(eventData.gst || 0),
        total: parseFloat(eventData.total || 0),
        timestamp: new Date(eventData.timestamp || Date.now()),
      };

      // Record in order history
      await this.orderHistoryService.recordOrder(event);

      // Trigger daily metrics calculation
      await this.dailyMetricsService.calculateDailyMetrics(
        event.tenantId,
        event.timestamp,
      );

      this.logger.debug(
        `Successfully processed order.completed event: ${event.orderId}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to handle order.completed event: ${error?.message}`,
        error?.stack,
      );
      throw error;
    }
  }
}
