import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';

@Injectable()
export class PaymentProducer implements OnModuleInit, OnModuleDestroy {
  private kafka: Kafka;
  private producer: Producer;

  async onModuleInit() {
    this.kafka = new Kafka({
      clientId: 'payment-service',
      brokers: [process.env.KAFKA_BROKER || 'kafka:9092'],
    });

    this.producer = this.kafka.producer();
    await this.producer.connect();
    console.log('✓ Kafka Producer (Payment Service) connected');
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
  }

  // Publish payment.created event
  async publishPaymentCreated(paymentData: {
    payment_id: string;
    order_id: string;
    tenant_id: string;
    amount: number;
    method: string;
    razorpay_order_id?: string;
  }) {
    await this.producer.send({
      topic: 'payment.created',
      messages: [
        {
          key: paymentData.order_id,
          value: JSON.stringify(paymentData),
          timestamp: Date.now().toString(),
        },
      ],
    });

    console.log(`[Kafka] Published payment.created: ${paymentData.payment_id}`);
  }

  // Publish payment.completed event (triggers order status update & inventory deduction)
  async publishPaymentCompleted(paymentData: {
    payment_id: string;
    order_id: string;
    tenant_id: string;
    amount: number;
    method: string;
    razorpay_payment_id?: string;
  }) {
    await this.producer.send({
      topic: 'payment.completed',
      messages: [
        {
          key: paymentData.order_id,
          value: JSON.stringify(paymentData),
          timestamp: Date.now().toString(),
        },
      ],
    });

    console.log(`[Kafka] Published payment.completed: ${paymentData.payment_id}`);
  }

  // Publish payment.failed event
  async publishPaymentFailed(paymentData: {
    payment_id: string;
    order_id: string;
    tenant_id: string;
    reason: string;
  }) {
    await this.producer.send({
      topic: 'payment.failed',
      messages: [
        {
          key: paymentData.order_id,
          value: JSON.stringify(paymentData),
          timestamp: Date.now().toString(),
        },
      ],
    });

    console.log(`[Kafka] Published payment.failed: ${paymentData.payment_id}`);
  }

  // Publish payment.refund event
  async publishPaymentRefund(paymentData: {
    payment_id: string;
    order_id: string;
    tenant_id: string;
    amount: number;
    reason: string;
  }) {
    await this.producer.send({
      topic: 'payment.refund',
      messages: [
        {
          key: paymentData.order_id,
          value: JSON.stringify(paymentData),
          timestamp: Date.now().toString(),
        },
      ],
    });

    console.log(`[Kafka] Published payment.refund: ${paymentData.payment_id}`);
  }
}
