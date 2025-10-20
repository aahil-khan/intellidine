import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('NotificationService');
  
  // Enable WebSocket with Socket.io
  app.useWebSocketAdapter(new IoAdapter(app));
  
  const port = process.env.PORT ? Number(process.env.PORT) : 3006;
  
  app.enableCors({
    origin: true,
    credentials: true,
  });

  await app.listen(port, () => {
    logger.log(`Notification Service running on port ${port}`);
  });
}

bootstrap();

