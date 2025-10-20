import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { OrderService } from './services/order.service';

describe('OrderService - AppController', () => {
  let controller: AppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        { provide: OrderService, useValue: {} },
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

