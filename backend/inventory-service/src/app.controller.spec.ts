import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { InventoryService } from './services/inventory.service';

describe('InventoryService - AppController', () => {
  let controller: AppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        { provide: InventoryService, useValue: {} },
      ],
    }).compile();

    controller = module.get<AppController>(AppController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return health status', () => {
    const result = controller.getHealth();
    expect(result).toHaveProperty('status');
  });
});
