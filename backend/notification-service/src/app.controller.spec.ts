import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { SocketBroadcastService } from './services/socket-broadcast.service';
import { KafkaConsumerService } from './services/kafka-consumer.service';

describe('NotificationService - AppController', () => {
  let controller: AppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        { provide: SocketBroadcastService, useValue: { getConnectedClientsCount: () => 0 } },
        { provide: KafkaConsumerService, useValue: {} },
      ],
    }).compile();

    controller = module.get<AppController>(AppController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return health status', () => {
    const result = controller.health();
    expect(result).toHaveProperty('status');
  });

  it('should return stats', () => {
    const result = controller.getStats();
    expect(result).toHaveProperty('service', 'notification-service');
  });
});
