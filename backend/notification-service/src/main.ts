import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable WebSocket with Socket.io
  app.useWebSocketAdapter(new IoAdapter(app));
  
  const port = process.env.PORT ? Number(process.env.PORT) : 3006;
  
  app.enableCors({
    origin: true,
    credentials: true,
  });

  await app.listen(port, () => {
    console.log(`Notification Service running on port ${port}`);
  });
}

bootstrap();

