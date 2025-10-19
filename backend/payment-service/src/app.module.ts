import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PaymentService } from './services/payment.service';
import { RazorpayService } from './services/razorpay.service';
import { PaymentProducer } from './kafka/payment.producer';
import { PrismaService } from './prisma.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [PaymentService, RazorpayService, PaymentProducer, PrismaService],
})
export class AppModule {}

