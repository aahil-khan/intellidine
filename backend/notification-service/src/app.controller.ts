import { Controller, Get, Query } from '@nestjs/common';
import { SocketBroadcastService } from './services/socket-broadcast.service';
import { KafkaConsumerService } from './services/kafka-consumer.service';

@Controller()
export class AppController {
  constructor(
    private readonly broadcastService: SocketBroadcastService,
    private readonly kafkaConsumer: KafkaConsumerService,
  ) {}

  @Get('/health')
  health() {
    return {
      status: 'ok',
      service: 'notification-service',
      connectedClients: this.broadcastService.getConnectedClientsCount(),
    };
  }

  @Get('/notifications/stats')
  getStats() {
    return {
      service: 'notification-service',
      connectedClients: this.broadcastService.getConnectedClientsCount(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('/notifications/test')
  testBroadcast(@Query('tenant_id') tenantId: string) {
    if (!tenantId) {
      return { error: 'tenant_id query parameter required' };
    }

    this.broadcastService.broadcastOrderEvent(tenantId, 'created', {
      order_id: 'test-order-' + Date.now(),
      customer_id: 'test-customer',
      items: [{ item_id: 'item-1', quantity: 2 }],
      total_amount: 499.99,
      created_at: new Date().toISOString(),
    });

    return {
      message: 'Test broadcast sent',
      tenantId,
      timestamp: new Date().toISOString(),
    };
  }
}

