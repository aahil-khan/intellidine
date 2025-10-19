import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { OrderService } from './services/order.service';
import { KafkaProducerService } from './services/kafka.producer';
import { PrismaService } from './prisma.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [OrderService, KafkaProducerService, PrismaService],
})
export class AppModule {}

