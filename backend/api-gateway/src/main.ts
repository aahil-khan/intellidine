// src/main.ts

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma.service'; // Adjust the path if necessary

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Get the PrismaService instance
  const prismaService = app.get(PrismaService);
  
  // This line is crucial! It tells NestJS to listen for shutdown signals
  // (like SIGINT or SIGTERM) and trigger the onApplicationShutdown hooks.
  app.enableShutdownHooks();

  await app.listen(3000);
}
bootstrap();