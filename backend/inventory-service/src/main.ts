import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('InventoryService');
  const port = process.env.PORT ? Number(process.env.PORT) : 3004;

  app.enableCors({ origin: true, credentials: true });

  await app.listen(port, () => {
    logger.log(
      `✅ Inventory Service running on http://localhost:${port}/api/inventory/health`,
    );
  });
}

bootstrap().catch((error) => {
  const logger = new Logger('InventoryService');
  logger.error('❌ Failed to start Inventory Service:', error);
  process.exit(1);
});

