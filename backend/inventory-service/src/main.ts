import 'reflect-metadata';
import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT ? Number(process.env.PORT) : 3004;

  app.enableCors({ origin: true, credentials: true });

  await app.listen(port, () => {
    console.log(
      `\n✅ Inventory Service running on http://localhost:${port}/api/inventory/health\n`,
    );
  });
}

bootstrap().catch((error) => {
  console.error('❌ Failed to start Inventory Service:', error);
  process.exit(1);
});

