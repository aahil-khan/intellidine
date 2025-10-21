import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { PrismaService } from './prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('APIGateway');

  const prismaService = app.get(PrismaService);
  app.enableShutdownHooks();

  // Enable JSON body parsing with increased limit for large payloads
  app.use(require('express').json({ limit: '10mb' }));
  app.use(require('express').urlencoded({ limit: '10mb', extended: true }));

  app.enableCors({
    origin: true,
    credentials: true,
  });

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port, () => {
    logger.log(`API Gateway running on port ${port}`);
    logger.log('Routing:');
    logger.log('  /api/auth/* → auth-service:3101');
    logger.log('  /api/menu/* → menu-service:3103');
    logger.log('  /api/orders/* → order-service:3102');
    logger.log('  /api/inventory/* → inventory-service:3104');
    logger.log('  /api/payments/* → payment-service:3105');
    logger.log('  /api/notifications/* → notification-service:3106');
    logger.log('  /api/analytics/* → analytics-service:3107');
    logger.log('  /api/discounts/* → discount-engine:3108');
  });
}
bootstrap();