import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { PaymentService } from './services/payment.service';
import { RazorpayService } from './services/razorpay.service';
import { PaymentProducer } from './kafka/payment.producer';

describe('Payment Service - AppController', () => {
  let controller: AppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        { provide: PaymentService, useValue: {} },
        { provide: RazorpayService, useValue: {} },
        { provide: PaymentProducer, useValue: {} },
      ],
    }).compile();

    controller = module.get<AppController>(AppController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return health status', () => {
    const result = controller.health();
    expect(result).toHaveProperty('status', 'ok');
    expect(result).toHaveProperty('service', 'payment-service');
  });
});
