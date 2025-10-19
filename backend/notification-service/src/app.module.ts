import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { NotificationGateway } from './gateway/notification.gateway';
import { SocketBroadcastService } from './services/socket-broadcast.service';
import { KafkaConsumerService } from './services/kafka-consumer.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [
    NotificationGateway,
    SocketBroadcastService,
    KafkaConsumerService,
  ],
})
export class AppModule {}

