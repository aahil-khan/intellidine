import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PrismaService } from './prisma.service';
import { InventoryService } from './services/inventory.service';
import { InventoryConsumer } from './kafka/inventory.consumer';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [PrismaService, InventoryService, InventoryConsumer],
})
export class AppModule {}

