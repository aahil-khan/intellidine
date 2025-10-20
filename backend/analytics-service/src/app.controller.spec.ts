import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { OrderHistoryService } from './services/order-history.service';
import { DailyMetricsService } from './services/daily-metrics.service';

describe('AnalyticsService - AppController', () => {
  let controller: AppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        { provide: OrderHistoryService, useValue: {} },
        { provide: DailyMetricsService, useValue: {} },
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
});

