/**
 * API Gateway Controller Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { ServiceRouter } from './gateway/service-router';

describe('API Gateway - AppController', () => {
  let controller: AppController;
  let serviceRouter: ServiceRouter;

  const mockServiceRouter = {
    getServicesStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: ServiceRouter,
          useValue: mockServiceRouter,
        },
      ],
    }).compile();

    controller = module.get<AppController>(AppController);
    serviceRouter = module.get<ServiceRouter>(ServiceRouter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return health status', () => {
      const result = controller.health();

      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('service', 'api-gateway');
      expect(result).toHaveProperty('timestamp');
      expect(typeof result.timestamp).toBe('string');
    });
  });

  describe('GET /services/health', () => {
    it('should return all services healthy', async () => {
      const mockStatus = {
        'auth-service': { healthy: true, url: 'http://auth-service:3001' },
        'order-service': { healthy: true, url: 'http://order-service:3002' },
        'menu-service': { healthy: true, url: 'http://menu-service:3003' },
        'payment-service': { healthy: true, url: 'http://payment-service:3004' },
        'inventory-service': { healthy: true, url: 'http://inventory-service:3005' },
        'discount-engine': { healthy: true, url: 'http://discount-engine:3006' },
      };

      jest.spyOn(serviceRouter, 'getServicesStatus').mockResolvedValue(mockStatus);

      const result = await controller.servicesHealth();

      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('gateway', 'healthy');
      expect(result).toHaveProperty('services');
      expect(result).toHaveProperty('timestamp');
      expect(Object.keys(result.services).length).toBe(6);
    });

    it('should return degraded status when service is unhealthy', async () => {
      const mockStatus = {
        'auth-service': { healthy: true, url: 'http://auth-service:3001' },
        'order-service': { healthy: false, url: 'http://order-service:3002' },
        'menu-service': { healthy: true, url: 'http://menu-service:3003' },
        'payment-service': { healthy: true, url: 'http://payment-service:3004' },
        'inventory-service': { healthy: true, url: 'http://inventory-service:3005' },
        'discount-engine': { healthy: true, url: 'http://discount-engine:3006' },
      };

      jest.spyOn(serviceRouter, 'getServicesStatus').mockResolvedValue(mockStatus);

      const result = await controller.servicesHealth();

      expect(result).toHaveProperty('status', 'degraded');
      expect(result).toHaveProperty('gateway', 'healthy');
      expect(result.services['order-service'].healthy).toBe(false);
    });

    it('should handle service status check error gracefully', async () => {
      jest
        .spyOn(serviceRouter, 'getServicesStatus')
        .mockRejectedValue(new Error('Connection timeout'));

      await expect(controller.servicesHealth()).rejects.toThrow('Connection timeout');
    });
  });
});
