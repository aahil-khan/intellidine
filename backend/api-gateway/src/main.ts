import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const prismaService = app.get(PrismaService);
  app.enableShutdownHooks();

  app.enableCors({
    origin: true,
    credentials: true,
  });

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port, () => {
    console.log(`API Gateway running on port ${port}`);
    console.log('Routing:');
    console.log('  /api/auth/* → auth-service:3001');
    console.log('  /api/menu/* → menu-service:3003');
    console.log('  /api/orders/* → order-service:3002');
    console.log('  /api/inventory/* → inventory-service:3004');
    console.log('  /api/payments/* → payment-service:3005');
    console.log('  /api/notifications/* → notification-service:3006');
  });
}
bootstrap();