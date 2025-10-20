import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PrismaService } from './prisma.service';
import { OrderHistoryService } from './services/order-history.service';
import { DailyMetricsService } from './services/daily-metrics.service';
import { KafkaConsumerService } from './services/kafka-consumer.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [
    PrismaService,
    OrderHistoryService,
    DailyMetricsService,
    KafkaConsumerService,
  ],
})
export class AppModule {}

